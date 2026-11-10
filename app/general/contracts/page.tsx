'use client'
// หน้ารวมระบบคืนหลักประกันสัญญา: ทางเข้าหน้าจอของแต่ละหน่วยงาน + งานของฉัน + ภาพรวม + กฎ
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Row, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FaBoxOpen, FaBuilding, FaCalendarCheck, FaClipboardCheck, FaCogs, FaCoins, FaFileContract, FaSignature, FaTools } from 'react-icons/fa'
import Link from 'next/link'
import dayjs from 'dayjs'
import EChart from '@/app/components/EChart'
import { useThemeMode } from '@/app/components/ThemeProvider'
import {
  api, cardStyle, ContractDrawer, ContractPage, DueTag, fmtMoney, GUARANTEE_TYPES, StatCard, TASK_DUTIES, type ContractMe, type ScreenKey,
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
// ขั้นของสัญญาเรียงตามลำดับงานจริง ตั้งแต่พัสดุยังไม่ตั้งวันหมดประกันจนคืนหลักประกันแล้ว
const STAGES: { key: string; label: string }[] = [
  { key: 'no_t', label: 'ยังไม่ตั้งวันหมดประกัน' },
  { key: 'warranty', label: 'อยู่ในระยะประกัน' },
  { key: 'expired', label: 'หมดประกัน รอเสนอคืน' },
  { key: 'pending', label: 'เสนอคืน รออนุมัติ' },
  { key: 'approved', label: 'อนุมัติแล้ว รอจ่ายคืน' },
  { key: 'returned', label: 'คืนหลักประกันแล้ว' },
]
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const short = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n))
// สีสถานะ ใช้เฉพาะกราฟที่บอกสถานะ และมีคำกำกับใน legend เสมอ
const STATUS_COLOR = { normal: '#0d9488', near: '#f59e0b', overdue: '#dc2626' }

const HubCharts = ({ s }: { s: any }) => {
  const { mode } = useThemeMode()
  const theme = mode === 'dark' ? 'dark' : 'light'
  const charts = s.charts ?? { stages: [], expiry: [], by_type: [] }

  const stageData = STAGES.map(x => ({ ...x, n: charts.stages.find((r: any) => r.stage === x.key)?.n ?? 0 }))
  // 12 เดือนนับจากเดือนนี้ + กองแรก = เลยวันหมดประกันแล้วแต่ยังไม่คืน
  const now = dayjs()
  const months = [{ key: 'past', label: 'เลยกำหนดแล้ว' }, ...Array.from({ length: 12 }, (_, i) => {
    const d = now.add(i, 'month')
    return { key: d.format('YYYY-MM'), label: `${TH_MONTHS[d.month()]} ${String(d.year() + 543).slice(2)}` }
  })].map(m => {
    const r = charts.expiry.find((x: any) => x.month === m.key)
    return { ...m, amount: r?.amount ?? 0, contracts: r?.contracts ?? 0 }
  })
  const duties = (s.by_duty ?? []).map((d: any) => ({ label: TASK_DUTIES[d.duty] ?? d.duty, normal: d.open - d.near - d.overdue, near: d.near, overdue: d.overdue }))
  const types = (charts.by_type as any[]).map(t => ({ label: GUARANTEE_TYPES[t.guarantee_type] ?? t.guarantee_type, amount: t.amount, n: t.n })).sort((a, b) => b.amount - a.amount)

  const axisCommon = { axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { opacity: 0.3 } } }
  const hbar = (cats: string[], data: any[], fmt: (v: number) => string, tip: (i: number) => string) => ({
    backgroundColor: 'transparent',
    grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any[]) => tip(p[0].dataIndex) },
    xAxis: { type: 'value', ...axisCommon, splitNumber: 3, minInterval: 1, axisLabel: { fontSize: 11, formatter: fmt } },
    yAxis: { type: 'category', data: cats, inverse: true, axisLabel: { fontSize: 11 } },
    series: [{ type: 'bar', barMaxWidth: 18, itemStyle: { color: '#0891b2', borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', fontSize: 11, formatter: (p: any) => p.value > 0 ? fmt(p.value) : '' }, data }],
  })
  const card = (title: string, sub: string, option: any, empty: boolean, height = 260) => (
    <Card size="small" title={title} style={{ ...cardStyle, height: '100%' }}>
      <Text type="secondary" style={{ fontSize: 12 }}>{sub}</Text>
      {empty ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีข้อมูล" style={{ padding: '48px 0' }} /> : <EChart theme={theme} height={height} option={option} />}
    </Card>
  )

  return (
    <Row gutter={[12, 12]} className="mb-4">
      <Col xs={24} lg={12}>{card('สัญญาแยกตามขั้นตอน', 'ไม่นับสัญญาที่ยกเลิก', hbar(stageData.map(x => x.label), stageData.map(x => x.n), v => String(v), i => `${stageData[i].label}<br/><b>${stageData[i].n}</b> ฉบับ`), stageData.every(x => x.n === 0))}</Col>
      <Col xs={24} lg={12}>{card('หลักประกันที่ต้องคืน ตามเดือนหมดประกัน', '12 เดือนข้างหน้า และที่เลยวันหมดประกันแล้วแต่ยังไม่คืน', {
        backgroundColor: 'transparent',
        grid: { left: 8, right: 8, top: 20, bottom: 8, containLabel: true },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any[]) => { const m = months[p[0].dataIndex]; return `${m.label}<br/><b>${fmtMoney(m.amount)}</b> บาท · ${m.contracts} สัญญา` } },
        xAxis: { type: 'category', data: months.map(m => m.label), axisLabel: { fontSize: 10, interval: 0, rotate: 45 } },
        yAxis: { type: 'value', ...axisCommon, axisLabel: { fontSize: 11, formatter: short } },
        series: [{
          type: 'bar', barMaxWidth: 22,
          label: { show: true, position: 'top', fontSize: 10, formatter: (p: any) => months[p.dataIndex].contracts ? `${months[p.dataIndex].contracts}` : '' },
          data: months.map(m => ({ value: m.amount, itemStyle: { color: m.key === 'past' ? STATUS_COLOR.overdue : '#0891b2', borderRadius: [4, 4, 0, 0] } })),
        }],
      }, months.every(m => m.contracts === 0))}</Col>
      <Col xs={24} lg={12}>{card('งานค้างแยกตามผู้รับผิดชอบ', 'จำนวนงานที่ยังเปิดอยู่ของสัญญาที่ดำเนินการ', {
        backgroundColor: 'transparent',
        legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
        grid: { left: 8, right: 16, top: 8, bottom: 32, containLabel: true },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'value', minInterval: 1, ...axisCommon },
        yAxis: { type: 'category', data: duties.map((d: any) => d.label), inverse: true, axisLabel: { fontSize: 11 } },
        series: ([['normal', 'ปกติ'], ['near', 'ใกล้กำหนด'], ['overdue', 'เกินกำหนด']] as const).map(([k, name]) => ({
          name, type: 'bar', stack: 'tasks', barMaxWidth: 18, itemStyle: { color: STATUS_COLOR[k], borderColor: 'transparent', borderWidth: 1 },
          label: { show: true, fontSize: 10, color: '#fff', formatter: (p: any) => p.value > 0 ? p.value : '' },
          data: duties.map((d: any) => d[k]),
        })),
      }, duties.length === 0)}</Col>
      <Col xs={24} lg={12}>{card('หลักประกันที่ถือไว้ แยกตามประเภท', 'ยอดเงินและจำนวนฉบับที่ยังไม่คืน', hbar(types.map(t => t.label), types.map(t => t.amount), short, i => `${types[i].label}<br/><b>${fmtMoney(types[i].amount)}</b> บาท · ${types[i].n} ฉบับ`), types.length === 0)}</Col>
    </Row>
  )
}

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
          <Col xs={12} md={6}><StatCard title="สัญญาที่ยังดำเนินการ" value={s.contracts.active} unit="ฉบับ" note={`คืนหลักประกันแล้ว ${s.contracts.returned} ฉบับ`} /></Col>
          <Col xs={12} md={6}><StatCard title="หลักประกัน (บาท)" value={fmtMoney(s.money.held)} note="ถือไว้ ยังไม่คืนผู้รับจ้าง" /></Col>
          <Col xs={12} md={6}><StatCard title="เกินกำหนดคืน (บาท)" value={fmtMoney(s.money.overdue_amount)} note="เลยกำหนดคืนแล้ว" danger={s.money.overdue_amount > 0} /></Col>
          <Col xs={12} md={6}><StatCard title="คืนทันกำหนด" value={s.kpi.total ? `${s.kpi.on_time}/${s.kpi.total}` : '—'} unit={s.kpi.total ? 'ฉบับ' : undefined} note="จากที่คืนแล้วทั้งหมด" /></Col>
        </Row>
      )}
      {s && s.money.expiring > 0 && <Alert className="mb-4" type="warning" showIcon title={`หนังสือค้ำประกัน ${s.money.expiring} ฉบับหมดอายุก่อนวันหมดประกัน + ${data.rules.guarantee_margin_days} วัน — ควรเรียกต่ออายุ`} />}
      {s && s.contracts.no_t > 0 && <Alert className="mb-4" type="info" showIcon title={`มี ${s.contracts.no_t} สัญญาที่พัสดุยังไม่ได้ตั้งวันหมดประกัน — ระบบจึงยังไม่สร้างงานให้`} />}
      {s && <HubCharts s={s} />}

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
