'use client'
import React, { useState, useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button,
  Table, Row, Col, Select, Segmented, Statistic, Divider, Progress
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, RiseOutlined, FallOutlined
} from '@ant-design/icons'
import { FaChartBar, FaWrench, FaBriefcaseMedical, FaDesktop, FaFileExport } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { MOCK_WORK_ORDERS } from '../dashboard/page'

const { Title, Text } = Typography

const MONTH_OPTIONS = [
  { label: 'เมษายน 2569',  value: '2026-04' },
  { label: 'มีนาคม 2569',  value: '2026-03' },
  { label: 'กุมภาพันธ์ 2569', value: '2026-02' },
]

// Mock additional month data for charts
const MONTHLY_COST = [
  { month: 'ต.ค.',  labor: 8200,  parts: 12000 },
  { month: 'พ.ย.',  labor: 6800,  parts: 8500  },
  { month: 'ธ.ค.',  labor: 9100,  parts: 22000 },
  { month: 'ม.ค.',  labor: 7400,  parts: 5000  },
  { month: 'ก.พ.',  labor: 11000, parts: 18000 },
  { month: 'มี.ค.', labor: 6200,  parts: 9000  },
  { month: 'เม.ย.', labor: 5700,  parts: 15000 },
]

const DEPT_COSTS = [
  { dept: 'งานห้องผ่าตัด',           total: 22900, count: 2, color: '#ef4444' },
  { dept: 'งาน ICU',                  total: 7300,  count: 1, color: '#f59e0b' },
  { dept: 'งานการพยาบาล OPD',        total: 1500,  count: 1, color: '#3b82f6' },
  { dept: 'งานผู้ป่วยใน IPD',        total: 2000,  count: 1, color: '#8b5cf6' },
  { dept: 'งานพัสดุ',                 total: 2700,  count: 1, color: '#06b6d4' },
  { dept: 'งานการเงินและบัญชี',       total: 600,   count: 1, color: '#10b981' },
  { dept: 'งานรักษาความปลอดภัย',      total: 0,     count: 1, color: '#64748b' },
]

const TYPE_BREAKDOWN = [
  { type: 'เครื่องมือแพทย์',  count: 4, cost: 23200, color: '#ef4444', icon: <FaBriefcaseMedical /> },
  { type: 'ซ่อมบำรุงทั่วไป', count: 3, cost: 3500,  color: '#f59e0b', icon: <FaWrench /> },
  { type: 'คอมพิวเตอร์ IT',   count: 2, cost: 3300,  color: '#a78bfa', icon: <FaDesktop /> },
]

const TOP_ASSETS = MOCK_WORK_ORDERS
  .filter(w => w.totalCost > 0)
  .sort((a, b) => b.totalCost - a.totalCost)
  .slice(0, 5)

export default function MaintenanceReportsPage() {
  const [monthFilter, setMonthFilter] = useState('2026-04')
  const [viewType, setViewType] = useState('cost')

  const allWOs = MOCK_WORK_ORDERS
  const doneWOs = allWOs.filter(w => w.status === 'done')
  const totalCost = allWOs.reduce((s, w) => s + w.totalCost, 0)
  const avgCost = doneWOs.length ? Math.round(totalCost / doneWOs.length) : 0
  const totalLaborHours = allWOs.reduce((s, w) => s + w.laborHours, 0)
  const maxDept = [...DEPT_COSTS].sort((a, b) => b.total - a.total)[0]

  const maxMonthCost = Math.max(...MONTHLY_COST.map(m => m.labor + m.parts))

  const deptTotal = DEPT_COSTS.reduce((s, d) => s + d.total, 0)

  const assetColumns = [
    { title: '#', key: 'rank', width: 40, render: (_: any, __: any, i: number) =>
      <Text style={{ color: i < 3 ? ['#FFD700','#C0C0C0','#CD7F32'][i] : '#64748b', fontWeight: 700 }}>{i+1}</Text> },
    { title: 'ครุภัณฑ์', key: 'asset', render: (_: any, r: typeof TOP_ASSETS[0]) => (
      <div><div style={{ fontWeight: 500, color: '#e2e8f0' }}>{r.assetName}</div>
        {r.assetNo && <Text style={{ fontSize: 11, color: '#64748b' }}>{r.assetNo}</Text>}
      </div>)},
    { title: 'หน่วยงาน',  dataIndex: 'department',  key: 'dept',  width: 180,
      render: (v: string) => <Text style={{ fontSize: 12, color: '#94a3b8' }}>{v}</Text> },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 120,
      render: (v: string) => {
        const m: Record<string, string> = { done: 'success', in_progress: 'processing', waiting_parts: 'warning', pending: 'default' }
        const l: Record<string, string> = { done: 'เสร็จแล้ว', in_progress: 'กำลังซ่อม', waiting_parts: 'รออะไหล่', pending: 'รอรับงาน' }
        return <Tag color={m[v]}>{l[v]}</Tag>
      }},
    { title: 'ค่าใช้จ่าย', dataIndex: 'totalCost', key: 'cost', width: 120, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 700 }}>฿{v.toLocaleString()}</Text> },
  ]

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { href: '/general/maintenance/dashboard', title: 'Dashboard งานซ่อม' },
            { title: 'รายงานค่าซ่อมบำรุง' },
          ]} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FaChartBar style={{ fontSize: 24, color: '#FF6500' }} />
              <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>รายงานค่าซ่อมบำรุง</Title>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Select options={MONTH_OPTIONS} value={monthFilter} onChange={setMonthFilter} style={{ width: 160 }} />
              <Button icon={<FaFileExport style={{ marginRight: 4 }} />}>ส่งออก Excel</Button>
            </div>
          </div>

          {/* KPI Cards */}
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            {[
              { label: 'ค่าซ่อมรวมเดือนนี้', value: `฿${totalCost.toLocaleString()}`, sub: `${allWOs.length} ใบงาน`, color: '#FF6500', trend: '+12%' },
              { label: 'ค่าเฉลี่ยต่อใบงาน',  value: `฿${avgCost.toLocaleString()}`,   sub: `${doneWOs.length} งานปิดแล้ว`, color: '#a78bfa', trend: '-5%' },
              { label: 'ชั่วโมงแรงงานรวม',   value: `${totalLaborHours} ชม.`,           sub: 'ทุกประเภทงาน',   color: '#60a5fa', trend: '+8%' },
              { label: 'หน่วยงานค่าใช้จ่ายสูง', value: maxDept.dept.substring(0, 12) + '…', sub: `฿${maxDept.total.toLocaleString()}`, color: '#ef4444', trend: '' },
            ].map(c => (
              <Col key={c.label} xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#1e293b', borderTop: `3px solid ${c.color}`, border: `1px solid ${c.color}33` }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{c.label}</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: c.color, margin: '4px 0' }}>{c.value}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#64748b', fontSize: 11 }}>{c.sub}</Text>
                    {c.trend && <Text style={{ color: c.trend.startsWith('+') ? '#ef4444' : '#6ee7b7', fontSize: 11 }}>{c.trend}</Text>}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={16}>
            {/* Monthly bar chart (manual) */}
            <Col xs={24} lg={14}>
              <Card title="ค่าซ่อมบำรุงรายเดือน (ปีงบประมาณ 2569)"
                style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
                styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, padding: '0 8px' }}>
                  {MONTHLY_COST.map(m => {
                    const total = m.labor + m.parts
                    const pct = Math.round((total / maxMonthCost) * 100)
                    const laborPct = Math.round((m.labor / total) * 100)
                    return (
                      <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>฿{Math.round(total / 1000)}k</Text>
                        <div style={{ width: '100%', height: `${pct}%`, minHeight: 4, borderRadius: '3px 3px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                          <div style={{ background: '#f59e0b', height: `${100 - laborPct}%`, minHeight: 2 }} />
                          <div style={{ background: '#3b82f6', height: `${laborPct}%`, minHeight: 2 }} />
                        </div>
                        <Text style={{ fontSize: 10, color: '#64748b' }}>{m.month}</Text>
                      </div>
                    )
                  })}
                </div>
                <Divider style={{ borderColor: '#334155', margin: '8px 0' }} />
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: 2 }} />
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>ค่าแรง</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 2 }} />
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>ค่าอะไหล่</Text>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Right panels */}
            <Col xs={24} lg={10}>
              {/* By Type */}
              <Card title="แยกตามประเภทงาน"
                style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
                styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
                {TYPE_BREAKDOWN.map(t => (
                  <div key={t.type} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: t.color }}>{t.icon}</span>
                        <Text style={{ fontSize: 13 }}>{t.type}</Text>
                        <Tag style={{ fontSize: 10 }}>{t.count} ใบงาน</Tag>
                      </div>
                      <Text style={{ color: t.color, fontWeight: 600 }}>฿{t.cost.toLocaleString()}</Text>
                    </div>
                    <Progress percent={Math.round((t.cost / totalCost) * 100)} strokeColor={t.color} trailColor="#334155" size="small" />
                  </div>
                ))}
              </Card>
            </Col>
          </Row>

          {/* By Department */}
          <Card title="ค่าซ่อมบำรุงแยกตามหน่วยงาน"
            style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
            styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DEPT_COSTS.map(d => (
                <div key={d.dept} style={{ flex: '1 1 280px', background: '#0f172a', borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${d.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13 }}>{d.dept}</Text>
                    <Text style={{ color: d.color, fontWeight: 700 }}>฿{d.total.toLocaleString()}</Text>
                  </div>
                  <Progress percent={deptTotal > 0 ? Math.round((d.total / deptTotal) * 100) : 0} strokeColor={d.color} trailColor="#334155" size="small" showInfo={false} />
                  <Text style={{ fontSize: 11, color: '#64748b' }}>{d.count} ใบงาน</Text>
                </div>
              ))}
            </div>
          </Card>

          {/* Top assets by cost */}
          <Card title="Top 5 ครุภัณฑ์ค่าซ่อมสูงสุด"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
            styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
            <Table dataSource={TOP_ASSETS} columns={assetColumns} rowKey="id" size="small" pagination={false} />
          </Card>
        </div>
      </div>
    </ConfigProvider>
  )
}
