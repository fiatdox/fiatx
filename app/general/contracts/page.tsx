'use client'
// หน้ารวมระบบคืนหลักประกันสัญญา: ทางเข้าหน้าจอของแต่ละหน่วยงาน + งานของฉัน + ภาพรวม + กฎ
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Row, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FaBoxOpen, FaBuilding, FaCalendarCheck, FaClipboardCheck, FaCogs, FaCoins, FaFileContract, FaSignature, FaTools } from 'react-icons/fa'
import Link from 'next/link'
import {
  api, cardStyle, ContractDrawer, ContractPage, DueTag, fmtMoney, TASK_DUTIES, type ContractMe, type ScreenKey,
} from './contractShared'

const { Text } = Typography

const SCREENS: { key: ScreenKey; href: string; title: string; owner: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'procurement', href: '/general/contracts/procurement', title: 'พัสดุ', owner: 'กลุ่มงานพัสดุ', desc: 'ทะเบียนสัญญา ผู้รับจ้าง แฟ้มเอกสาร ติดตามชำรุด ทำบันทึกเสนอคืน', icon: <FaBoxOpen /> },
  { key: 'finance', href: '/general/contracts/finance', title: 'การเงิน', owner: 'กลุ่มงานการเงิน', desc: 'ทะเบียนหลักประกัน วันหมดอายุหนังสือค้ำประกัน จ่ายคืน วางทรัพย์ ส่งคลัง', icon: <FaCoins /> },
  { key: 'vendors', href: '/general/contracts/vendors', title: 'ผู้รับจ้างและเจ้าหนี้', owner: 'พัสดุดูแลทะเบียน · การเงินบันทึกหนี้', desc: 'เคยรับงานอะไร เป็นเจ้าหนี้เท่าไร ค้างจ่ายเท่าไร', icon: <FaBuilding /> },
  { key: 'inspection', href: '/general/contracts/inspection', title: 'กรรมการตรวจรับ / ผู้ควบคุมงาน', owner: 'ผู้ได้รับมอบหมายรายสัญญา', desc: 'บันทึกผลตรวจตามรอบและตรวจรอบสุดท้าย', icon: <FaClipboardCheck /> },
  { key: 'custodian', href: '/general/contracts/custodian', title: 'ผู้ครอบครองพัสดุ', owner: 'ผู้ได้รับมอบหมายรายสัญญา', desc: 'ดูวันหมดประกันและแจ้งความชำรุดระหว่างประกัน', icon: <FaTools /> },
  { key: 'approval', href: '/general/contracts/approval', title: 'หัวหน้าหน่วยงาน / ผู้รับมอบอำนาจ', owner: 'ผอ. หรือผู้อนุมัติของสัญญา', desc: 'ดูสรุปหน้าเดียวแล้วอนุมัติหรือส่งกลับเรื่องคืนหลักประกัน', icon: <FaSignature /> },
  { key: 'executive', href: '/general/contracts/executive', title: 'ผู้บริหาร', owner: 'ผอ. และหัวหน้ากลุ่มภารกิจ', desc: 'ดูวันหมดประกันของทุกสัญญา', icon: <FaCalendarCheck /> },
  { key: 'settings', href: '/general/contracts/settings', title: 'ตั้งค่าเริ่มต้น', owner: 'ผู้ดูแลระบบเป็นผู้แก้', desc: 'ระยะประกันเริ่มต้น จำนวนวันคืนหลักประกัน และกำหนดวันอื่น ๆ', icon: <FaCogs /> },
]

const TASK_LINK: Record<string, string> = {
  procurement: '/general/contracts/procurement', finance: '/general/contracts/finance', committee: '/general/contracts/inspection', custodian: '/general/contracts/custodian', approver: '/general/contracts/approval',
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const Overview = ({ me }: { me: ContractMe }) => {
  const { message } = App.useApp()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api('overview'))
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const visible = SCREENS.filter(s => me.screens[s.key])
  const s = data?.summary
  const dutyRows: any[] = s?.by_duty ?? []
  const taskCols: ColumnsType<any> = [
    { title: 'งาน', dataIndex: 'title', render: (v: string, r: any) => <><div>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.contract_no} · {r.project_name}</Text></> },
    { title: 'หน้าที่', dataIndex: 'duty', width: 160, render: (v: string) => TASK_DUTIES[v] },
    { title: 'กำหนด', dataIndex: 'due_date', width: 210, render: (v: string, r: any) => <DueTag state={r.due_state} date={v} /> },
    { title: '', width: 150, align: 'right', render: (_: unknown, r: any) => (
      <>
        <Button size="small" type="link" onClick={() => setOpenId(r.contract_id)}>ดูสัญญา</Button>
        <Link href={TASK_LINK[r.duty] ?? '#'}><Button size="small">ไปหน้างาน</Button></Link>
      </>
    ) },
  ]

  return (
    <>
      <Row gutter={[12, 12]} className="mb-4">
        {visible.map(x => (
          <Col xs={24} sm={12} lg={8} key={x.key}>
            <Link href={x.href} style={{ display: 'block', height: '100%' }}>
              <Card hoverable style={{ ...cardStyle, height: '100%' }} styles={{ body: { padding: 16 } }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: '#0891b2', fontSize: 18, display: 'inline-flex' }} aria-hidden>{x.icon}</span>
                  <Text strong style={{ fontSize: 15 }}>{x.title}</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{x.owner}</Text>
                <Text style={{ fontSize: 13 }}>{x.desc}</Text>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
      {visible.length === 0 && (
        <Alert className="mb-4" type="info" showIcon title="ยังไม่มีสัญญาที่มอบหมายให้คุณ"
          description="หน้าจอจะเปิดให้เมื่ออยู่กลุ่มงานพัสดุหรือการเงิน เป็นผู้บริหาร หรือเมื่อพัสดุมอบหมายหน้าที่ในสัญญาให้" />
      )}

      {s && (
        <Row gutter={[12, 12]} className="mb-4">
          <Col xs={12} md={6}><Card style={cardStyle}><Statistic title="สัญญาที่ยังดำเนินการ" value={s.contracts.active} suffix="ฉบับ" /></Card></Col>
          <Col xs={12} md={6}><Card style={cardStyle}><Statistic title="หลักประกันที่ถือไว้" value={fmtMoney(s.money.held)} suffix="บาท" /></Card></Col>
          <Col xs={12} md={6}><Card style={cardStyle}><Statistic title="หลักประกันเกินกำหนดคืน" value={fmtMoney(s.money.overdue_amount)} suffix="บาท" /></Card></Col>
          <Col xs={12} md={6}><Card style={cardStyle}><Statistic title="คืนทันกำหนด" value={s.kpi.total ? `${s.kpi.on_time}/${s.kpi.total}` : '—'} suffix={s.kpi.total ? 'ฉบับ' : ''} /></Card></Col>
        </Row>
      )}
      {s && s.money.expiring > 0 && <Alert className="mb-4" type="warning" showIcon title={`หนังสือค้ำประกัน ${s.money.expiring} ฉบับหมดอายุก่อนวันหมดประกัน + ${data.rules.guarantee_margin_days} วัน — ควรเรียกต่ออายุ`} />}
      {s && s.contracts.no_t > 0 && <Alert className="mb-4" type="info" showIcon title={`มี ${s.contracts.no_t} สัญญาที่พัสดุยังไม่ได้ตั้งวันหมดประกัน — ระบบจึงยังไม่สร้างงานให้`} />}

      {visible.length > 0 && (
        <Card className="mb-4" title={`งานของฉัน (${data?.tasks?.length ?? 0})`} style={cardStyle} styles={{ body: { padding: 12 } }}>
          <Table size="small" rowKey="id" loading={loading} columns={taskCols} dataSource={data?.tasks ?? []} pagination={{ pageSize: 10, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีงานค้าง" /> }} />
        </Card>
      )}

      {s && (
        <Card className="mb-4" title="งานค้างแยกตามผู้รับผิดชอบ" style={cardStyle} styles={{ body: { padding: 12 } }}>
          <Table size="small" rowKey="duty" pagination={false} dataSource={dutyRows} scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีงานค้าง" /> }}
            columns={[
              { title: 'ผู้รับผิดชอบ', dataIndex: 'duty', render: (v: string) => TASK_DUTIES[v] },
              { title: 'งานเปิดอยู่', dataIndex: 'open', align: 'right' },
              { title: 'ใกล้กำหนด', dataIndex: 'near', align: 'right' },
              { title: 'เกินกำหนด', dataIndex: 'overdue', align: 'right', render: (v: number) => v > 0 ? <Tag color="error">{v}</Tag> : 0 },
            ]} />
        </Card>
      )}

      <ContractDrawer id={openId} onClose={() => setOpenId(null)} />
    </>
  )
}

export default function ContractsHomePage() {
  return (
    <ContractPage title="สัญญาและหลักประกัน" icon={<FaFileContract />} subtitle="ติดตามการคืนหลักประกันสัญญา แยกหน้าจอตามหน่วยงานและหน้าที่">
      {me => <Overview me={me} />}
    </ContractPage>
  )
}
