'use client'
import React, { useState, useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Badge, Button,
  Select, Segmented, Avatar, Tooltip, Progress, Divider, Row, Col, Statistic
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, ClockCircleOutlined, ToolOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, UserOutlined, CalendarOutlined,
  RightOutlined
} from '@ant-design/icons'
import { FaWrench, FaTachometerAlt, FaBriefcaseMedical, FaDesktop, FaFire } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { useRouter } from 'next/navigation'

const { Title, Text } = Typography

// ─── Shared mock data (referenced by work-order page too) ─────────────────────
export const MOCK_WORK_ORDERS = [
  { id: 'WO-2026-001', reqId: 'REQ-2026-002', type: 'medical',      assetNo: 'MED-65-001', assetName: 'เครื่อง ECG 12 Leads Nihon Kohden',     department: 'งานห้องผ่าตัด',    location: 'OR 1',             urgency: 'critical', status: 'waiting_parts', tech: 'นายวิชัย เครื่องมือดี',  createdDate: '2026-04-01', daysOpen: 12, laborHours: 3, laborCost: 900,  partsCost: 15000, totalCost: 15900, prId: 'PR-2026-001', symptom: 'เครื่องไม่แสดงผล กราฟ ECG หายไป ต้องเปลี่ยน electrode module', diagnosis: 'Electrode module เสื่อมสภาพ ต้องสั่งอะไหล่จาก Nihon Kohden' },
  { id: 'WO-2026-002', reqId: 'REQ-2026-004', type: 'maintenance',  assetNo: 'ก.002-67-001', assetName: 'เครื่องปรับอากาศ Daikin 18000 BTU',   department: 'งานการพยาบาล OPD', location: 'ห้องตรวจโรค OPD 1', urgency: 'urgent',   status: 'in_progress',   tech: 'นายสมศักดิ์ แอร์เย็น', createdDate: '2026-04-05', daysOpen: 8,  laborHours: 5, laborCost: 1500, partsCost: 0,     totalCost: 1500,  prId: undefined,      symptom: 'แอร์ไม่เย็น น้ำหยด ส่งกลิ่นเหม็น', diagnosis: 'น้ำยาแอร์รั่ว ต้องเติมและซ่อมท่อ' },
  { id: 'WO-2026-003', reqId: 'REQ-2026-005', type: 'it',           assetNo: 'IT-67-005',  assetName: 'HP LaserJet Enterprise M507dn',         department: 'งานพัสดุ',         location: 'ห้องพัสดุ ชั้น 1',  urgency: 'normal',   status: 'waiting_parts', tech: 'นายเทคโน สมาร์ท',      createdDate: '2026-04-07', daysOpen: 6,  laborHours: 1, laborCost: 300,  partsCost: 2400,  totalCost: 2700,  prId: 'PR-2026-002',  symptom: 'เครื่องพิมพ์กระดาษติดทุกครั้ง', diagnosis: 'Fuser unit เสีย ต้องเปลี่ยน' },
  { id: 'WO-2026-004', reqId: 'REQ-2026-006', type: 'maintenance',  assetNo: '',           assetName: 'ท่อประปาชั้น 2 รั่ว',                  department: 'งานผู้ป่วยใน IPD', location: 'Ward A ชั้น 2',      urgency: 'urgent',   status: 'in_progress',   tech: 'นายสมศักดิ์ แอร์เย็น', createdDate: '2026-04-08', daysOpen: 5,  laborHours: 4, laborCost: 1200, partsCost: 800,   totalCost: 2000,  prId: undefined,      symptom: 'ท่อน้ำรั่วใต้อ่างล้างมือ', diagnosis: 'ข้อต่อท่อเสื่อมสภาพ เปลี่ยนข้อต่อใหม่' },
  { id: 'WO-2026-005', reqId: 'REQ-2026-001', type: 'maintenance',  assetNo: 'ก.005-67-002', assetName: 'กล้อง CCTV Hikvision 2MP',           department: 'งานรักษาความปลอดภัย', location: 'ประตูทางเข้าหลัก', urgency: 'normal',   status: 'pending',       tech: undefined,              createdDate: '2026-04-10', daysOpen: 3,  laborHours: 0, laborCost: 0,    partsCost: 0,     totalCost: 0,     prId: undefined,      symptom: 'กล้องภาพไม่ชัด มีหมอก', diagnosis: undefined },
  { id: 'WO-2026-006', reqId: 'REQ-2026-003', type: 'it',           assetNo: 'IT-67-001',  assetName: 'DELL OptiPlex 7090 SFF',               department: 'งานการเงินและบัญชี', location: 'ห้องการเงิน ชั้น 2', urgency: 'normal',  status: 'done',          tech: 'นายเทคโน สมาร์ท',      createdDate: '2026-04-03', daysOpen: 0,  laborHours: 2, laborCost: 600,  partsCost: 0,     totalCost: 600,   prId: undefined,      symptom: 'เครื่องช้า เปิดโปรแกรมนานมาก', diagnosis: 'RAM เต็ม ล้างข้อมูลชั่วคราว ติดตั้ง SSD เพิ่ม', completedDate: '2026-04-06' },
  { id: 'WO-2026-007', reqId: 'REQ-2026-007', type: 'medical',      assetNo: 'MED-66-003', assetName: 'Infusion Pump Baxter SIGMA Spectrum',  department: 'งานผู้ป่วยใน IPD', location: 'Ward B ชั้น 3',      urgency: 'urgent',   status: 'pending',       tech: undefined,              createdDate: '2026-04-11', daysOpen: 2,  laborHours: 0, laborCost: 0,    partsCost: 0,     totalCost: 0,     prId: undefined,      symptom: 'ปั๊มส่งเสียง alarm ตลอดเวลา ค่าที่แสดงผิดปกติ', diagnosis: undefined },
  { id: 'WO-2026-008', reqId: 'REQ-2026-008', type: 'medical',      assetNo: 'MED-65-001', assetName: 'Patient Monitor Mindray MEC-1200',     department: 'งาน ICU',          location: 'ICU ชั้น 4',          urgency: 'critical', status: 'done',          tech: 'นายวิชัย เครื่องมือดี',  createdDate: '2026-03-28', daysOpen: 0,  laborHours: 6, laborCost: 1800, partsCost: 5500,  totalCost: 7300,  prId: undefined,      symptom: 'จอแสดงผลดับ', diagnosis: 'เปลี่ยน display module', completedDate: '2026-04-02' },
]

type WOStatus = 'pending' | 'in_progress' | 'waiting_parts' | 'done'
type WOType = 'all' | 'maintenance' | 'medical' | 'it'
type UrgencyKey = 'normal' | 'urgent' | 'critical'

const STATUS_COLS: { key: WOStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'pending',       label: 'รอรับงาน',       color: '#64748b', icon: <ClockCircleOutlined /> },
  { key: 'in_progress',   label: 'กำลังซ่อม',      color: '#2563eb', icon: <ToolOutlined /> },
  { key: 'waiting_parts', label: 'รออะไหล่',        color: '#d97706', icon: <ExclamationCircleOutlined /> },
  { key: 'done',          label: 'เสร็จแล้ว',       color: '#16a34a', icon: <CheckCircleOutlined /> },
]

const URGENCY: Record<UrgencyKey, { label: string; color: string }> = {
  normal:   { label: 'ปกติ',    color: 'default'  },
  urgent:   { label: 'ด่วน',    color: 'warning'  },
  critical: { label: 'ด่วนมาก', color: 'error'    },
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  maintenance: <FaWrench   style={{ color: '#f59e0b' }} />,
  medical:     <FaBriefcaseMedical style={{ color: '#ef4444' }} />,
  it:          <FaDesktop  style={{ color: '#a78bfa' }} />,
}

const TYPE_OPTIONS = [
  { label: 'ทั้งหมด',          value: 'all' },
  { label: 'ซ่อมบำรุงทั่วไป', value: 'maintenance' },
  { label: 'เครื่องมือแพทย์',  value: 'medical' },
  { label: 'คอมพิวเตอร์ IT',   value: 'it' },
]

export default function MaintenanceDashboard() {
  const [filterType, setFilterType] = useState<WOType>('all')
  const router = useRouter()

  const filtered = useMemo(() =>
    filterType === 'all' ? MOCK_WORK_ORDERS : MOCK_WORK_ORDERS.filter(w => w.type === filterType),
    [filterType]
  )

  const counts = useMemo(() => ({
    pending:       MOCK_WORK_ORDERS.filter(w => w.status === 'pending').length,
    in_progress:   MOCK_WORK_ORDERS.filter(w => w.status === 'in_progress').length,
    waiting_parts: MOCK_WORK_ORDERS.filter(w => w.status === 'waiting_parts').length,
    done:          MOCK_WORK_ORDERS.filter(w => w.status === 'done').length,
    critical:      MOCK_WORK_ORDERS.filter(w => w.urgency === 'critical').length,
    totalCost:     MOCK_WORK_ORDERS.reduce((s, w) => s + w.totalCost, 0),
  }), [])

  const byStatus = (status: WOStatus) => filtered.filter(w => w.status === status)

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { title: <><FaTachometerAlt style={{ marginRight: 4 }} />Dashboard งานซ่อม</> },
          ]} />

          <div className="flex items-center gap-3 mb-6">
            <FaTachometerAlt style={{ fontSize: 26, color: '#FF6500' }} />
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>Dashboard ภาพรวมงานซ่อมบำรุง</Title>
          </div>

          {/* Summary stats */}
          <Row gutter={[12, 12]} className="mb-6">
            {[
              { label: 'รอรับงาน',    value: counts.pending,       color: '#64748b', icon: <ClockCircleOutlined /> },
              { label: 'กำลังซ่อม',   value: counts.in_progress,   color: '#3b82f6', icon: <ToolOutlined /> },
              { label: 'รออะไหล่',    value: counts.waiting_parts, color: '#f59e0b', icon: <ExclamationCircleOutlined /> },
              { label: 'เสร็จแล้ว',   value: counts.done,          color: '#22c55e', icon: <CheckCircleOutlined /> },
              { label: 'งานวิกฤต',    value: counts.critical,      color: '#ef4444', icon: <FaFire /> },
              { label: 'ค่าใช้จ่าย (฿)', value: counts.totalCost.toLocaleString(), color: '#a78bfa', icon: null },
            ].map(c => (
              <Col key={c.label} xs={12} sm={8} md={4}>
                <Card size="small" style={{ background: '#1e293b', border: `1px solid ${c.color}33`, borderTop: `3px solid ${c.color}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: c.color, fontSize: 16 }}>{c.icon}</span>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>{c.label}</Text>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Filter + Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Segmented
              options={TYPE_OPTIONS}
              value={filterType}
              onChange={v => setFilterType(v as WOType)}
            />
            <Button type="primary" onClick={() => router.push('/general/maintenance/work-order')}>
              ดูรายการทั้งหมด
            </Button>
          </div>

          {/* Kanban */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
            {STATUS_COLS.map(col => {
              const cards = byStatus(col.key)
              return (
                <div key={col.key}>
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: `${col.color}22`, borderRadius: 8, borderLeft: `3px solid ${col.color}` }}>
                    <span style={{ color: col.color }}>{col.icon}</span>
                    <Text style={{ fontWeight: 600, color: col.color }}>{col.label}</Text>
                    <Badge count={cards.length} style={{ background: col.color, marginLeft: 'auto' }} />
                  </div>

                  {/* Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cards.map(wo => (
                      <Card
                        key={wo.id}
                        size="small"
                        hoverable
                        onClick={() => router.push(`/general/maintenance/work-order/${wo.id}`)}
                        style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer' }}
                        styles={{ body: { padding: '10px 12px' } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <Text style={{ fontSize: 11, color: '#FF6500', fontWeight: 600 }}>{wo.id}</Text>
                          <Tag color={URGENCY[wo.urgency as UrgencyKey].color} style={{ fontSize: 10, margin: 0 }}>
                            {URGENCY[wo.urgency as UrgencyKey].label}
                          </Tag>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          {TYPE_ICON[wo.type]}
                          <Text style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }} ellipsis>
                            {wo.assetName}
                          </Text>
                        </div>

                        {wo.assetNo && (
                          <Text style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4 }}>
                            {wo.assetNo}
                          </Text>
                        )}

                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 8 }} ellipsis>
                          {wo.department} · {wo.location}
                        </Text>

                        <Divider style={{ margin: '6px 0', borderColor: '#334155' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {wo.tech ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Avatar size={16} icon={<UserOutlined />} style={{ background: '#FF6500' }} />
                              <Text style={{ fontSize: 10, color: '#94a3b8' }}>{wo.tech.split(' ')[0]}</Text>
                            </div>
                          ) : (
                            <Tag color="default" style={{ fontSize: 10, margin: 0 }}>ยังไม่มอบหมาย</Tag>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CalendarOutlined style={{ fontSize: 10, color: '#64748b' }} />
                            <Text style={{ fontSize: 10, color: wo.daysOpen > 7 ? '#ef4444' : '#64748b' }}>
                              {wo.daysOpen > 0 ? `${wo.daysOpen} วัน` : 'วันนี้'}
                            </Text>
                          </div>
                        </div>

                        {wo.prId && (
                          <div style={{ marginTop: 6 }}>
                            <Tag color="gold" style={{ fontSize: 10 }}>🛒 {wo.prId}</Tag>
                          </div>
                        )}

                        {wo.totalCost > 0 && (
                          <div style={{ marginTop: 4, textAlign: 'right' }}>
                            <Text style={{ fontSize: 10, color: '#a78bfa' }}>
                              ฿{wo.totalCost.toLocaleString()}
                            </Text>
                          </div>
                        )}
                      </Card>
                    ))}

                    {cards.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
                        ไม่มีงาน
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}
