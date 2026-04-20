'use client'
import React from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button,
  Timeline, Descriptions, Statistic, Row, Col, Divider, Table
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, ToolOutlined, ShoppingCartOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ArrowLeftOutlined
} from '@ant-design/icons'
import { FaHistory, FaWrench, FaBriefcaseMedical } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { useRouter, useParams } from 'next/navigation'
import { MOCK_WORK_ORDERS } from '../../../maintenance/dashboard/page'

const { Title, Text } = Typography

// Mock asset registry
const ASSET_DB: Record<string, { assetNo: string; name: string; type: string; department: string; location: string; purchaseDate: string; purchasePrice: number; warranty: string }> = {
  'MED-65-001': { assetNo: 'MED-65-001', name: 'เครื่อง ECG 12 Leads Nihon Kohden ECG-2150', type: 'เครื่องมือตรวจหัวใจ', department: 'งานห้องผ่าตัด', location: 'OR 1', purchaseDate: '2565-10-01', purchasePrice: 280000, warranty: '2565-10-01 ถึง 2568-09-30' },
  'MED-65-002': { assetNo: 'MED-65-002', name: 'เครื่องกระตุ้นหัวใจ Zoll AED Plus', type: 'เครื่องช่วยชีวิต', department: 'งานอุบัติเหตุ ER', location: 'ER ห้องฉุกเฉิน', purchaseDate: '2565-04-15', purchasePrice: 95000, warranty: 'หมดประกัน' },
  'IT-67-001':  { assetNo: 'IT-67-001',  name: 'DELL OptiPlex 7090 SFF', type: 'คอมพิวเตอร์ตั้งโต๊ะ', department: 'งานการเงินและบัญชี', location: 'ห้องการเงิน ชั้น 2', purchaseDate: '2567-02-20', purchasePrice: 35000, warranty: '2567-02-20 ถึง 2570-02-19' },
  'ก.002-67-001': { assetNo: 'ก.002-67-001', name: 'เครื่องปรับอากาศ Daikin 18000 BTU', type: 'เครื่องปรับอากาศ', department: 'งานการพยาบาล OPD', location: 'ห้องตรวจโรค OPD 1', purchaseDate: '2567-11-05', purchasePrice: 42000, warranty: 'หมดประกัน' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  done:          { label: 'ปิดงานแล้ว',  color: 'success',    dotColor: '#16a34a' },
  in_progress:   { label: 'กำลังซ่อม',  color: 'processing', dotColor: '#3b82f6' },
  waiting_parts: { label: 'รออะไหล่',   color: 'warning',    dotColor: '#d97706' },
  pending:       { label: 'รอรับงาน',   color: 'default',    dotColor: '#64748b' },
}

const TYPE_LABEL: Record<string, string> = { maintenance: 'ซ่อมบำรุงทั่วไป', medical: 'เครื่องมือแพทย์', it: 'คอมพิวเตอร์ IT' }

export default function AssetHistoryPage() {
  const router = useRouter()
  const params = useParams()
  const assetId = decodeURIComponent(params.id as string)

  const asset = ASSET_DB[assetId]
  const history = MOCK_WORK_ORDERS.filter(w => w.assetNo === assetId)
  const totalRepairCost = history.reduce((s, w) => s + w.totalCost, 0)
  const totalLabor = history.reduce((s, w) => s + w.laborCost, 0)
  const totalParts = history.reduce((s, w) => s + w.partsCost, 0)
  const repairCount = history.length

  const columns = [
    { title: 'เลขที่ใบงาน', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600, cursor: 'pointer' }} onClick={() => router.push(`/general/maintenance/work-order/${v}`)}>{v}</Text> },
    { title: 'วันที่',      dataIndex: 'createdDate', key: 'date', width: 110,
      render: (v: string) => <Text style={{ color: '#94a3b8' }}>{v}</Text> },
    { title: 'อาการ / ปัญหา', dataIndex: 'symptom', key: 'symptom',
      render: (v: string) => <Text style={{ color: '#e2e8f0', fontSize: 13 }} ellipsis={{ tooltip: v }}>{v}</Text> },
    { title: 'การวินิจฉัย', dataIndex: 'diagnosis', key: 'diag',
      render: (v?: string) => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{v ?? '—'}</Text> },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 120,
      render: (v: string) => <Tag color={STATUS_CONFIG[v]?.color}>{STATUS_CONFIG[v]?.label}</Tag> },
    { title: 'ค่าใช้จ่าย', dataIndex: 'totalCost', key: 'cost', width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
  ]

  const costRatio = asset ? Math.round((totalRepairCost / asset.purchasePrice) * 100) : 0

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { href: '/general/maintenance/dashboard', title: 'Dashboard งานซ่อม' },
            { title: `ประวัติซ่อม: ${assetId}` },
          ]} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
            <FaHistory style={{ fontSize: 22, color: '#FF6500' }} />
            <Title level={4} style={{ margin: 0, color: '#f1f5f9' }}>ประวัติการซ่อมบำรุง</Title>
            <Tag color="orange" style={{ fontSize: 13 }}>{assetId}</Tag>
          </div>

          {asset ? (
            <>
              {/* Asset Info */}
              <Card style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
                styles={{ body: { padding: '16px 20px' } }}>
                <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small"
                  labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}>
                  <Descriptions.Item label="ชื่อครุภัณฑ์" span={2}><Text style={{ fontWeight: 600, fontSize: 14 }}>{asset.name}</Text></Descriptions.Item>
                  <Descriptions.Item label="ประเภท">{asset.type}</Descriptions.Item>
                  <Descriptions.Item label="หน่วยงาน">{asset.department}</Descriptions.Item>
                  <Descriptions.Item label="สถานที่">{asset.location}</Descriptions.Item>
                  <Descriptions.Item label="วันที่จัดซื้อ">{asset.purchaseDate}</Descriptions.Item>
                  <Descriptions.Item label="ราคาจัดซื้อ">
                    <Text style={{ color: '#60a5fa' }}>฿{asset.purchasePrice.toLocaleString()}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="ประกัน">
                    <Text style={{ color: asset.warranty === 'หมดประกัน' ? '#ef4444' : '#6ee7b7' }}>{asset.warranty}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* KPI Row */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                  { label: 'จำนวนครั้งที่ซ่อม',    value: repairCount,                     suffix: 'ครั้ง', color: '#FF6500' },
                  { label: 'ค่าซ่อมรวมทั้งหมด',     value: `฿${totalRepairCost.toLocaleString()}`, color: '#a78bfa' },
                  { label: 'ค่าแรงรวม',             value: `฿${totalLabor.toLocaleString()}`,      color: '#60a5fa' },
                  { label: 'ค่าอะไหล่รวม',           value: `฿${totalParts.toLocaleString()}`,      color: '#f59e0b' },
                  { label: '% ค่าซ่อม/ราคาซื้อ',    value: `${costRatio}%`,                        color: costRatio > 50 ? '#ef4444' : '#6ee7b7' },
                ].map(c => (
                  <Col key={c.label} xs={12} sm={8} md={4}>
                    <Card size="small" style={{ background: '#1e293b', borderTop: `3px solid ${c.color}`, border: `1px solid ${c.color}33` }}>
                      <Text style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>{c.label}</Text>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.value}</div>
                    </Card>
                  </Col>
                ))}
              </Row>

              {costRatio > 50 && (
                <Card size="small" style={{ background: '#450a0a', border: '1px solid #ef4444', marginBottom: 16 }}>
                  <Text style={{ color: '#fca5a5' }}>
                    ⚠️ ค่าซ่อมสะสมเกิน 50% ของราคาจัดซื้อ — ควรพิจารณาจัดหาใหม่ทดแทน
                  </Text>
                </Card>
              )}

              {/* History Table */}
              <Card title="รายการใบงานซ่อมทั้งหมด"
                style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
                styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
                {history.length > 0
                  ? <Table dataSource={history} columns={columns} rowKey="id" size="small" pagination={false} scroll={{ x: 800 }} />
                  : <div style={{ textAlign: 'center', padding: 32, color: '#475569' }}>ยังไม่มีประวัติการซ่อม</div>
                }
              </Card>

              {/* Timeline */}
              <Card title={<span><FaHistory style={{ marginRight: 6 }} />Timeline การซ่อม</span>}
                style={{ background: '#1e293b', border: '1px solid #334155' }}
                styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
                {history.length > 0 ? (
                  <Timeline
                    items={[...history].reverse().map(w => ({
                      color: STATUS_CONFIG[w.status]?.dotColor ?? '#64748b',
                      children: (
                        <div style={{ paddingBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                            <Text style={{ color: '#FF6500', fontWeight: 600, cursor: 'pointer' }}
                              onClick={() => router.push(`/general/maintenance/work-order/${w.id}`)}>
                              {w.id}
                            </Text>
                            <Tag color={STATUS_CONFIG[w.status]?.color} style={{ fontSize: 10 }}>
                              {STATUS_CONFIG[w.status]?.label}
                            </Tag>
                            <Text style={{ color: '#64748b', fontSize: 11 }}>{w.createdDate}</Text>
                          </div>
                          <Text style={{ color: '#fbbf24', fontSize: 13, display: 'block' }}>{w.symptom}</Text>
                          {w.diagnosis && <Text style={{ color: '#94a3b8', fontSize: 12 }}>→ {w.diagnosis}</Text>}
                          {w.totalCost > 0 && (
                            <Text style={{ color: '#a78bfa', fontSize: 12, display: 'block' }}>
                              ค่าใช้จ่าย: ฿{w.totalCost.toLocaleString()} (แรง ฿{w.laborCost.toLocaleString()} + อะไหล่ ฿{w.partsCost.toLocaleString()})
                            </Text>
                          )}
                          {w.prId && <Tag color="gold" style={{ fontSize: 10, marginTop: 4 }}>🛒 {w.prId}</Tag>}
                        </div>
                      )
                    }))}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 32, color: '#475569' }}>ยังไม่มีประวัติ</div>
                )}
              </Card>
            </>
          ) : (
            <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Text style={{ color: '#64748b', fontSize: 16 }}>ไม่พบข้อมูลครุภัณฑ์: {assetId}</Text>
                <br />
                <Button style={{ marginTop: 16 }} onClick={() => router.back()}>กลับ</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </ConfigProvider>
  )
}
