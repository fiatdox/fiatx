'use client'
import React, { useState, useMemo } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Row, Col, Table,
  Tag, Select, Button, Progress, Statistic, Tooltip, Divider, Badge,
  theme, Space, Input
} from 'antd'
import {
  HomeOutlined, FundOutlined, DotChartOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, SyncOutlined, SearchOutlined,
  ClearOutlined, RiseOutlined, FallOutlined, MinusOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import EChart from '@/app/components/EChart'

const { Title, Text } = Typography

// ---- Types ----
interface KPI {
  id: number
  kpiName: string
  department: string
  unit: string
  target: number
  actual: number
  fiscalYear: number
  quarter: 1 | 2 | 3 | 4
  description: string
  trend: 'up' | 'down' | 'stable'
}

// ---- Mock Data ----
const kpiData: KPI[] = [
  // Q1/2568
  { id: 1,  kpiName: 'ร้อยละแผนยุทธศาสตร์ที่ดำเนินการแล้วเสร็จตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 80, actual: 85, fiscalYear: 2568, quarter: 1, description: 'โครงการที่ดำเนินการแล้วเสร็จตามกรอบเวลาที่กำหนด', trend: 'up' },
  { id: 2,  kpiName: 'จำนวนโครงการที่ผ่านการประเมิน PDCA', department: 'งานพัฒนาคุณภาพ', unit: 'โครงการ', target: 10, actual: 8, fiscalYear: 2568, quarter: 1, description: 'โครงการพัฒนาคุณภาพที่ผ่านวงจร PDCA ครบถ้วน', trend: 'stable' },
  { id: 3,  kpiName: 'ร้อยละความพึงพอใจผู้ใช้ระบบ IT', department: 'งานเทคโนโลยีสารสนเทศ', unit: '%', target: 85, actual: 88, fiscalYear: 2568, quarter: 1, description: 'ผลสำรวจความพึงพอใจผู้ใช้งานระบบสารสนเทศ', trend: 'up' },
  { id: 4,  kpiName: 'จำนวนครั้งกิจกรรมสุขศึกษาในชุมชน', department: 'งานสุขศึกษา', unit: 'ครั้ง', target: 12, actual: 10, fiscalYear: 2568, quarter: 1, description: 'กิจกรรมให้ความรู้ด้านสุขภาพแก่ประชาชนในชุมชน', trend: 'stable' },
  { id: 5,  kpiName: 'ปริมาณขยะติดเชื้อที่กำจัดถูกต้อง', department: 'งานสิ่งแวดล้อม', unit: '%', target: 100, actual: 100, fiscalYear: 2568, quarter: 1, description: 'สัดส่วนขยะติดเชื้อที่ผ่านกระบวนการกำจัดตามมาตรฐาน', trend: 'stable' },
  { id: 6,  kpiName: 'ร้อยละการเบิกจ่ายงบประมาณตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 75, actual: 60, fiscalYear: 2568, quarter: 1, description: 'สัดส่วนการเบิกจ่ายงบประมาณเทียบกับแผนที่กำหนด', trend: 'down' },

  // Q2/2568
  { id: 7,  kpiName: 'ร้อยละแผนยุทธศาสตร์ที่ดำเนินการแล้วเสร็จตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 80, actual: 72, fiscalYear: 2568, quarter: 2, description: 'โครงการที่ดำเนินการแล้วเสร็จตามกรอบเวลาที่กำหนด', trend: 'down' },
  { id: 8,  kpiName: 'จำนวนโครงการที่ผ่านการประเมิน PDCA', department: 'งานพัฒนาคุณภาพ', unit: 'โครงการ', target: 10, actual: 11, fiscalYear: 2568, quarter: 2, description: 'โครงการพัฒนาคุณภาพที่ผ่านวงจร PDCA ครบถ้วน', trend: 'up' },
  { id: 9,  kpiName: 'ร้อยละ Uptime ของระบบ HIS', department: 'งานเทคโนโลยีสารสนเทศ', unit: '%', target: 99, actual: 99.5, fiscalYear: 2568, quarter: 2, description: 'ความพร้อมใช้งานของระบบ HIS ตลอด 24 ชั่วโมง', trend: 'up' },
  { id: 10, kpiName: 'จำนวนครั้งกิจกรรมสุขศึกษาในชุมชน', department: 'งานสุขศึกษา', unit: 'ครั้ง', target: 12, actual: 14, fiscalYear: 2568, quarter: 2, description: 'กิจกรรมให้ความรู้ด้านสุขภาพแก่ประชาชนในชุมชน', trend: 'up' },
  { id: 11, kpiName: 'ร้อยละน้ำเสียที่ผ่านการบำบัดได้มาตรฐาน', department: 'งานสิ่งแวดล้อม', unit: '%', target: 100, actual: 96, fiscalYear: 2568, quarter: 2, description: 'น้ำเสียที่ผ่านระบบบำบัดและมีค่าตามมาตรฐาน', trend: 'down' },
  { id: 12, kpiName: 'ร้อยละการเบิกจ่ายงบประมาณตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 75, actual: 78, fiscalYear: 2568, quarter: 2, description: 'สัดส่วนการเบิกจ่ายงบประมาณเทียบกับแผนที่กำหนด', trend: 'up' },

  // Q3/2568
  { id: 13, kpiName: 'ร้อยละแผนยุทธศาสตร์ที่ดำเนินการแล้วเสร็จตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 80, actual: 90, fiscalYear: 2568, quarter: 3, description: 'โครงการที่ดำเนินการแล้วเสร็จตามกรอบเวลาที่กำหนด', trend: 'up' },
  { id: 14, kpiName: 'จำนวนโครงการที่ผ่านการประเมิน PDCA', department: 'งานพัฒนาคุณภาพ', unit: 'โครงการ', target: 10, actual: 5, fiscalYear: 2568, quarter: 3, description: 'โครงการพัฒนาคุณภาพที่ผ่านวงจร PDCA ครบถ้วน', trend: 'down' },
  { id: 15, kpiName: 'ร้อยละความพึงพอใจผู้ใช้ระบบ IT', department: 'งานเทคโนโลยีสารสนเทศ', unit: '%', target: 85, actual: 82, fiscalYear: 2568, quarter: 3, description: 'ผลสำรวจความพึงพอใจผู้ใช้งานระบบสารสนเทศ', trend: 'down' },
  { id: 16, kpiName: 'จำนวนครั้งกิจกรรมสุขศึกษาในชุมชน', department: 'งานสุขศึกษา', unit: 'ครั้ง', target: 12, actual: 12, fiscalYear: 2568, quarter: 3, description: 'กิจกรรมให้ความรู้ด้านสุขภาพแก่ประชาชนในชุมชน', trend: 'stable' },
  { id: 17, kpiName: 'ปริมาณขยะติดเชื้อที่กำจัดถูกต้อง', department: 'งานสิ่งแวดล้อม', unit: '%', target: 100, actual: 98, fiscalYear: 2568, quarter: 3, description: 'สัดส่วนขยะติดเชื้อที่ผ่านกระบวนการกำจัดตามมาตรฐาน', trend: 'stable' },

  // Q4/2568
  { id: 18, kpiName: 'ร้อยละแผนยุทธศาสตร์ที่ดำเนินการแล้วเสร็จตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 80, actual: 93, fiscalYear: 2568, quarter: 4, description: 'โครงการที่ดำเนินการแล้วเสร็จตามกรอบเวลาที่กำหนด', trend: 'up' },
  { id: 19, kpiName: 'จำนวนโครงการที่ผ่านการประเมิน PDCA', department: 'งานพัฒนาคุณภาพ', unit: 'โครงการ', target: 10, actual: 10, fiscalYear: 2568, quarter: 4, description: 'โครงการพัฒนาคุณภาพที่ผ่านวงจร PDCA ครบถ้วน', trend: 'up' },
  { id: 20, kpiName: 'ร้อยละ Uptime ของระบบ HIS', department: 'งานเทคโนโลยีสารสนเทศ', unit: '%', target: 99, actual: 99.8, fiscalYear: 2568, quarter: 4, description: 'ความพร้อมใช้งานของระบบ HIS ตลอด 24 ชั่วโมง', trend: 'up' },
  { id: 21, kpiName: 'ร้อยละน้ำเสียที่ผ่านการบำบัดได้มาตรฐาน', department: 'งานสิ่งแวดล้อม', unit: '%', target: 100, actual: 100, fiscalYear: 2568, quarter: 4, description: 'น้ำเสียที่ผ่านระบบบำบัดและมีค่าตามมาตรฐาน', trend: 'up' },
  { id: 22, kpiName: 'ร้อยละการเบิกจ่ายงบประมาณตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 75, actual: 45, fiscalYear: 2568, quarter: 4, description: 'สัดส่วนการเบิกจ่ายงบประมาณเทียบกับแผนที่กำหนด', trend: 'down' },
]

// ---- Helpers ----
const departments = [...new Set(kpiData.map(k => k.department))].sort()
const fiscalYears = [...new Set(kpiData.map(k => k.fiscalYear))].sort((a, b) => b - a)

const getAchievePct = (kpi: KPI): number => {
  if (kpi.target === 0) return 100
  return Math.round((kpi.actual / kpi.target) * 100)
}

const getStatus = (pct: number): { label: string; color: string; tagColor: string; icon: React.ReactNode } => {
  if (pct >= 100) return { label: 'บรรลุเป้า', color: '#10b981', tagColor: 'success', icon: <CheckCircleOutlined /> }
  if (pct >= 75)  return { label: 'ใกล้เป้า',  color: '#3b82f6', tagColor: 'processing', icon: <SyncOutlined /> }
  if (pct >= 50)  return { label: 'เสี่ยง',    color: '#f59e0b', tagColor: 'warning', icon: <WarningOutlined /> }
  return               { label: 'ไม่บรรลุ',  color: '#ef4444', tagColor: 'error', icon: <CloseCircleOutlined /> }
}

const getTrendIcon = (trend: KPI['trend']) => {
  if (trend === 'up')     return <RiseOutlined style={{ color: '#10b981' }} />
  if (trend === 'down')   return <FallOutlined style={{ color: '#ef4444' }} />
  return <MinusOutlined style={{ color: '#94a3b8' }} />
}

// ---- Page Component ----
const KPIPageContent = () => {
  const [filterDept, setFilterDept] = useState<string>('')
  const [filterYear, setFilterYear] = useState<number | null>(2568)
  const [filterQ, setFilterQ] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => kpiData.filter(k => {
    if (filterDept && k.department !== filterDept) return false
    if (filterYear && k.fiscalYear !== filterYear) return false
    if (filterQ && k.quarter !== filterQ) return false
    if (search && !k.kpiName.toLowerCase().includes(search.toLowerCase()) && !k.department.includes(search)) return false
    return true
  }), [filterDept, filterYear, filterQ, search])

  const total = filtered.length
  const achieved = filtered.filter(k => getAchievePct(k) >= 100).length
  const nearTarget = filtered.filter(k => { const p = getAchievePct(k); return p >= 75 && p < 100 }).length
  const atRisk = filtered.filter(k => { const p = getAchievePct(k); return p >= 50 && p < 75 }).length
  const missed = filtered.filter(k => getAchievePct(k) < 50).length
  const overallPct = total > 0 ? Math.round(filtered.reduce((s, k) => s + getAchievePct(k), 0) / total) : 0

  // ---- Chart aggregations ----
  const byDept = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>()
    filtered.forEach(k => {
      const pct = getAchievePct(k)
      const e = map.get(k.department) || { sum: 0, count: 0 }
      e.sum += pct; e.count += 1
      map.set(k.department, e)
    })
    return Array.from(map.entries())
      .map(([dept, v]) => ({ dept, avg: Math.round(v.sum / v.count), count: v.count }))
      .sort((a, b) => a.avg - b.avg)
  }, [filtered])

  const trendByQ = useMemo(() => {
    const base = kpiData.filter(k => {
      if (filterDept && k.department !== filterDept) return false
      if (filterYear && k.fiscalYear !== filterYear) return false
      if (search && !k.kpiName.toLowerCase().includes(search.toLowerCase()) && !k.department.includes(search)) return false
      return true
    })
    return [1, 2, 3, 4].map(q => {
      const items = base.filter(k => k.quarter === q)
      const avg = items.length > 0 ? Math.round(items.reduce((s, k) => s + getAchievePct(k), 0) / items.length) : null
      return { q, avg, count: items.length }
    })
  }, [filterDept, filterYear, search])

  const topKpis = useMemo(() => {
    const map = new Map<string, KPI>()
    filtered.forEach(k => {
      const ex = map.get(k.kpiName)
      if (!ex || k.quarter > ex.quarter) map.set(k.kpiName, k)
    })
    return Array.from(map.values())
      .map(k => ({ name: k.kpiName, short: k.kpiName.length > 28 ? k.kpiName.slice(0, 28) + '…' : k.kpiName, pct: getAchievePct(k), unit: k.unit, target: k.target, actual: k.actual }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 8)
  }, [filtered])

  const clearFilters = () => {
    setFilterDept('')
    setFilterYear(null)
    setFilterQ(null)
    setSearch('')
  }

  const columns = [
    {
      title: 'ตัวชี้วัด (KPI)',
      dataIndex: 'kpiName',
      key: 'kpiName',
      render: (name: string, r: KPI) => (
        <div>
          <Text strong className="text-sm leading-snug block">{name}</Text>
          <Text type="secondary" className="text-xs">{r.description}</Text>
        </div>
      ),
    },
    {
      title: 'หน่วยงาน',
      dataIndex: 'department',
      key: 'department',
      width: 180,
      render: (d: string) => <Tag color="geekblue">{d}</Tag>,
    },
    {
      title: 'ไตรมาส',
      dataIndex: 'quarter',
      key: 'quarter',
      width: 90,
      render: (q: number) => <Tag>Q{q}</Tag>,
    },
    {
      title: 'เป้าหมาย',
      dataIndex: 'target',
      key: 'target',
      width: 100,
      render: (t: number, r: KPI) => <Text>{t} {r.unit}</Text>,
    },
    {
      title: 'ผลงาน',
      dataIndex: 'actual',
      key: 'actual',
      width: 100,
      render: (a: number, r: KPI) => <Text strong>{a} {r.unit}</Text>,
    },
    {
      title: 'ความสำเร็จ',
      key: 'achieve',
      width: 160,
      render: (_: any, r: KPI) => {
        const pct = getAchievePct(r)
        const st = getStatus(pct)
        return (
          <div>
            <div className="flex justify-between items-center mb-1">
              <Text strong style={{ color: st.color }}>{pct}%</Text>
              {getTrendIcon(r.trend)}
            </div>
            <Progress
              percent={Math.min(pct, 100)}
              showInfo={false}
              strokeColor={st.color}
              railColor="#334155"
              size="small"
            />
          </div>
        )
      },
    },
    {
      title: 'สถานะ',
      key: 'status',
      width: 110,
      render: (_: any, r: KPI) => {
        const pct = getAchievePct(r)
        const st = getStatus(pct)
        return <Tag icon={st.icon} color={st.tagColor}>{st.label}</Tag>
      },
    },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/hss/strategy', title: <><FundOutlined /> HSS ยุทธศาสตร์</> },
            { title: <><DotChartOutlined /> KPI Dashboard</> },
          ]}
          className="mb-6"
        />

        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Title level={2} style={{ color: '#34d399', margin: 0 }}>KPI Dashboard</Title>
            <Text type="secondary">ติดตามตัวชี้วัดความสำเร็จ — แยกตามหน่วยงาน ปีงบประมาณ และไตรมาส</Text>
          </div>

          {/* Filter Bar */}
          <Card variant="borderless" className="mb-6 shadow-sm" style={{ borderRadius: 12, borderLeft: '4px solid #34d399' }}>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <Text type="secondary" className="text-xs block mb-1">หน่วยงาน</Text>
                <Select
                  placeholder="ทุกหน่วยงาน"
                  value={filterDept || undefined}
                  onChange={v => setFilterDept(v ?? '')}
                  allowClear
                  style={{ width: 200 }}
                  options={departments.map(d => ({ label: d, value: d }))}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs block mb-1">ปีงบประมาณ</Text>
                <Select
                  placeholder="ทุกปี"
                  value={filterYear ?? undefined}
                  onChange={v => setFilterYear(v ?? null)}
                  allowClear
                  style={{ width: 120 }}
                  options={fiscalYears.map(y => ({ label: `ปี ${y}`, value: y }))}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs block mb-1">ไตรมาส</Text>
                <Select
                  placeholder="ทุกไตรมาส"
                  value={filterQ ?? undefined}
                  onChange={v => setFilterQ(v ?? null)}
                  allowClear
                  style={{ width: 130 }}
                  options={[
                    { label: 'ไตรมาส 1 (ต.ค.–ธ.ค.)', value: 1 },
                    { label: 'ไตรมาส 2 (ม.ค.–มี.ค.)', value: 2 },
                    { label: 'ไตรมาส 3 (เม.ย.–มิ.ย.)', value: 3 },
                    { label: 'ไตรมาส 4 (ก.ค.–ก.ย.)', value: 4 },
                  ]}
                />
              </div>
              <div>
                <Text type="secondary" className="text-xs block mb-1">ค้นหา</Text>
                <Input
                  placeholder="ชื่อ KPI หรือหน่วยงาน..."
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  allowClear
                  style={{ width: 220 }}
                />
              </div>
              <Button icon={<ClearOutlined />} onClick={clearFilters}>ล้างตัวกรอง</Button>
              <Text type="secondary" className="text-xs self-end pb-1">
                แสดง <Text strong>{filtered.length}</Text> / {kpiData.length} ตัวชี้วัด
              </Text>
            </div>
          </Card>

          {/* Summary Cards */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={12} sm={8} lg={4}>
              <Card variant="borderless" className="text-center shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #64748b' }}>
                <Statistic title="KPI ทั้งหมด" value={total} />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card variant="borderless" className="text-center shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #10b981' }}>
                <Statistic
                  title="บรรลุเป้า"
                  value={achieved}
                  suffix={<Text style={{ fontSize: 12, color: '#10b981' }}>รายการ</Text>}
                  styles={{ content: { color: '#10b981' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card variant="borderless" className="text-center shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #3b82f6' }}>
                <Statistic
                  title="ใกล้เป้า"
                  value={nearTarget}
                  suffix={<Text style={{ fontSize: 12, color: '#3b82f6' }}>รายการ</Text>}
                  styles={{ content: { color: '#3b82f6' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card variant="borderless" className="text-center shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #f59e0b' }}>
                <Statistic
                  title="เสี่ยง"
                  value={atRisk}
                  suffix={<Text style={{ fontSize: 12, color: '#f59e0b' }}>รายการ</Text>}
                  styles={{ content: { color: '#f59e0b' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card variant="borderless" className="text-center shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #ef4444' }}>
                <Statistic
                  title="ไม่บรรลุ"
                  value={missed}
                  suffix={<Text style={{ fontSize: 12, color: '#ef4444' }}>รายการ</Text>}
                  styles={{ content: { color: '#ef4444' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card variant="borderless" className="text-center shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #34d399' }}>
                <Statistic
                  title="ภาพรวม"
                  value={overallPct}
                  suffix="%"
                  styles={{ content: { color: overallPct >= 80 ? '#10b981' : overallPct >= 60 ? '#f59e0b' : '#ef4444' } }}
                />
              </Card>
            </Col>
          </Row>

          {/* Overall Progress Bar */}
          <Card variant="borderless" className="mb-6 shadow-sm" style={{ borderRadius: 12 }}>
            <div className="flex items-center gap-4">
              <Text strong className="shrink-0">ภาพรวมความสำเร็จ</Text>
              <div className="flex-1">
                <Progress
                  percent={overallPct}
                  strokeColor={overallPct >= 80 ? '#10b981' : overallPct >= 60 ? '#f59e0b' : '#ef4444'}
                  railColor="#334155"
                  format={p => <Text strong style={{ color: overallPct >= 80 ? '#10b981' : overallPct >= 60 ? '#f59e0b' : '#ef4444' }}>{p}%</Text>}
                />
              </div>
              <div className="flex gap-4 shrink-0 text-xs">
                <span className="flex items-center gap-1"><Badge color="#10b981" /> บรรลุ ≥100%</span>
                <span className="flex items-center gap-1"><Badge color="#3b82f6" /> ใกล้เป้า 75–99%</span>
                <span className="flex items-center gap-1"><Badge color="#f59e0b" /> เสี่ยง 50–74%</span>
                <span className="flex items-center gap-1"><Badge color="#ef4444" /> ไม่บรรลุ &lt;50%</span>
              </div>
            </div>
          </Card>

          {/* Charts Row 1: Status donut + Department avg bar */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={8}>
              <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}>
                <Title level={5} style={{ color: '#34d399', margin: 0, marginBottom: 8 }}>การกระจายสถานะ KPI</Title>
                <Text type="secondary" className="text-xs block mb-2">สัดส่วนตามระดับความสำเร็จ</Text>
                <EChart height={280} option={{
                  backgroundColor: 'transparent',
                  tooltip: {
                    trigger: 'item',
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    textStyle: { color: '#e2e8f0' },
                    formatter: (p: { name: string; value: number; percent: number }) =>
                      `${p.name}<br/>${p.value} รายการ (${p.percent}%)`,
                  },
                  title: [
                    { text: 'ภาพรวม', left: 'center', top: '38%', textStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 400 } },
                    { text: overallPct + '%', left: 'center', top: '46%',
                      textStyle: { color: overallPct >= 80 ? '#10b981' : overallPct >= 60 ? '#f59e0b' : '#ef4444', fontSize: 24, fontWeight: 700 } },
                    { text: total + ' KPI', left: 'center', top: '60%', textStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 400 } },
                  ],
                  legend: {
                    bottom: 0,
                    left: 'center',
                    textStyle: { color: '#94a3b8', fontSize: 11 },
                    itemWidth: 10,
                    itemHeight: 10,
                  },
                  series: [{
                    type: 'pie',
                    radius: ['52%', '76%'],
                    center: ['50%', '46%'],
                    avoidLabelOverlap: true,
                    itemStyle: { borderColor: '#1e293b', borderWidth: 2 },
                    label: { show: false },
                    labelLine: { show: false },
                    data: [
                      { name: 'บรรลุเป้า', value: achieved, itemStyle: { color: '#10b981' } },
                      { name: 'ใกล้เป้า', value: nearTarget, itemStyle: { color: '#3b82f6' } },
                      { name: 'เสี่ยง', value: atRisk, itemStyle: { color: '#f59e0b' } },
                      { name: 'ไม่บรรลุ', value: missed, itemStyle: { color: '#ef4444' } },
                    ].filter(d => d.value > 0),
                  }],
                }} />
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}>
                <Title level={5} style={{ color: '#34d399', margin: 0, marginBottom: 8 }}>ความสำเร็จเฉลี่ยตามหน่วยงาน</Title>
                <Text type="secondary" className="text-xs block mb-2">เปอร์เซ็นต์ความสำเร็จเฉลี่ยจาก KPI ในแต่ละหน่วยงาน</Text>
                <EChart height={Math.max(220, byDept.length * 44 + 60)} option={{
                  backgroundColor: 'transparent',
                  grid: { left: 160, right: 80, top: 20, bottom: 30 },
                  tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    textStyle: { color: '#e2e8f0' },
                    formatter: (params: { dataIndex: number }[]) => {
                      const d = byDept[params[0].dataIndex]
                      return `<b>${d.dept}</b><br/>เฉลี่ย: ${d.avg}%<br/>จำนวน: ${d.count} KPI`
                    },
                  },
                  xAxis: {
                    type: 'value',
                    max: (v: { max: number }) => Math.max(120, Math.ceil(v.max / 10) * 10),
                    axisLabel: { color: '#94a3b8', formatter: '{value}%' },
                    splitLine: { lineStyle: { color: '#334155' } },
                  },
                  yAxis: {
                    type: 'category',
                    data: byDept.map(d => d.dept),
                    axisLabel: { color: '#e2e8f0', fontSize: 12 },
                    axisLine: { lineStyle: { color: '#334155' } },
                    axisTick: { show: false },
                  },
                  series: [{
                    type: 'bar',
                    barWidth: 22,
                    data: byDept.map(d => ({
                      value: d.avg,
                      itemStyle: {
                        color: d.avg >= 100 ? '#10b981' : d.avg >= 75 ? '#3b82f6' : d.avg >= 50 ? '#f59e0b' : '#ef4444',
                        borderRadius: [0, 6, 6, 0],
                      },
                    })),
                    label: {
                      show: true,
                      position: 'right',
                      color: '#e2e8f0',
                      fontSize: 11,
                      formatter: (p: { dataIndex: number }) => `${byDept[p.dataIndex].avg}%  (${byDept[p.dataIndex].count})`,
                    },
                    markLine: {
                      symbol: 'none',
                      silent: true,
                      lineStyle: { color: '#34d399', type: 'dashed', width: 1.5 },
                      label: { color: '#34d399', fontSize: 10, formatter: 'เป้า 100%' },
                      data: [{ xAxis: 100 }],
                    },
                  }],
                }} />
              </Card>
            </Col>
          </Row>

          {/* Charts Row 2: Quarterly trend + Top KPIs */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={12}>
              <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}>
                <Title level={5} style={{ color: '#34d399', margin: 0, marginBottom: 8 }}>แนวโน้มความสำเร็จรายไตรมาส</Title>
                <Text type="secondary" className="text-xs block mb-2">ความสำเร็จเฉลี่ย Q1–Q4 (ไม่รวมตัวกรองไตรมาส)</Text>
                <EChart height={300} option={{
                  backgroundColor: 'transparent',
                  grid: { left: 50, right: 30, top: 30, bottom: 40 },
                  tooltip: {
                    trigger: 'axis',
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    textStyle: { color: '#e2e8f0' },
                    formatter: (params: { dataIndex: number; value: number | null }[]) => {
                      const i = params[0].dataIndex
                      const d = trendByQ[i]
                      return `<b>ไตรมาส ${d.q}</b><br/>เฉลี่ย: ${d.avg ?? '-'}%<br/>จำนวน: ${d.count} KPI`
                    },
                  },
                  xAxis: {
                    type: 'category',
                    data: trendByQ.map(t => `Q${t.q}`),
                    axisLabel: { color: '#94a3b8', fontSize: 12 },
                    axisLine: { lineStyle: { color: '#334155' } },
                  },
                  yAxis: {
                    type: 'value',
                    name: '%',
                    nameTextStyle: { color: '#94a3b8' },
                    axisLabel: { color: '#94a3b8', formatter: '{value}%' },
                    splitLine: { lineStyle: { color: '#334155' } },
                  },
                  series: [{
                    type: 'line',
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 10,
                    data: trendByQ.map(t => t.avg),
                    connectNulls: true,
                    itemStyle: { color: '#34d399' },
                    lineStyle: { width: 3, color: '#34d399' },
                    areaStyle: {
                      color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                          { offset: 0, color: 'rgba(52,211,153,0.4)' },
                          { offset: 1, color: 'rgba(52,211,153,0.02)' },
                        ],
                      },
                    },
                    label: {
                      show: true,
                      position: 'top',
                      color: '#e2e8f0',
                      fontSize: 11,
                      formatter: (p: { value: number | null }) => p.value == null ? '' : p.value + '%',
                    },
                    markLine: {
                      symbol: 'none',
                      silent: true,
                      lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 },
                      label: { color: '#f59e0b', fontSize: 10, formatter: 'เป้า 100%' },
                      data: [{ yAxis: 100 }],
                    },
                  }],
                }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}>
                <Title level={5} style={{ color: '#34d399', margin: 0, marginBottom: 8 }}>KPI ที่ต้องเฝ้าระวัง (Bottom 8)</Title>
                <Text type="secondary" className="text-xs block mb-2">ตัวชี้วัดที่มีความสำเร็จต่ำสุดจากผลล่าสุดของแต่ละรายการ</Text>
                <EChart height={Math.max(260, topKpis.length * 32 + 60)} option={{
                  backgroundColor: 'transparent',
                  grid: { left: 8, right: 90, top: 20, bottom: 30, containLabel: true },
                  tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    textStyle: { color: '#e2e8f0' },
                    formatter: (params: { dataIndex: number }[]) => {
                      const k = topKpis[params[0].dataIndex]
                      return `<b>${k.name}</b><br/>ผลงาน: ${k.actual} ${k.unit}<br/>เป้าหมาย: ${k.target} ${k.unit}<br/>ความสำเร็จ: <b>${k.pct}%</b>`
                    },
                  },
                  xAxis: {
                    type: 'value',
                    max: (v: { max: number }) => Math.max(120, Math.ceil(v.max / 10) * 10),
                    axisLabel: { color: '#94a3b8', formatter: '{value}%' },
                    splitLine: { lineStyle: { color: '#334155' } },
                  },
                  yAxis: {
                    type: 'category',
                    inverse: true,
                    data: topKpis.map(k => k.short),
                    axisLabel: { color: '#e2e8f0', fontSize: 11, width: 200, overflow: 'truncate' },
                    axisLine: { lineStyle: { color: '#334155' } },
                    axisTick: { show: false },
                  },
                  series: [{
                    type: 'bar',
                    barWidth: 16,
                    data: topKpis.map(k => ({
                      value: k.pct,
                      itemStyle: {
                        color: k.pct >= 100 ? '#10b981' : k.pct >= 75 ? '#3b82f6' : k.pct >= 50 ? '#f59e0b' : '#ef4444',
                        borderRadius: [0, 4, 4, 0],
                      },
                    })),
                    label: {
                      show: true,
                      position: 'right',
                      color: '#e2e8f0',
                      fontSize: 11,
                      formatter: (p: { dataIndex: number }) => `${topKpis[p.dataIndex].pct}%`,
                    },
                    markLine: {
                      symbol: 'none',
                      silent: true,
                      lineStyle: { color: '#34d399', type: 'dashed', width: 1.5 },
                      data: [{ xAxis: 100 }],
                    },
                  }],
                }} />
              </Card>
            </Col>
          </Row>

          {/* KPI Table */}
          <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
            <div className="flex items-center justify-between mb-4">
              <Title level={5} style={{ color: '#34d399', margin: 0 }}>รายละเอียดตัวชี้วัด</Title>
              {(filterDept || filterYear || filterQ) && (
                <Space>
                  {filterDept && <Tag color="geekblue">{filterDept}</Tag>}
                  {filterYear && <Tag color="purple">ปี {filterYear}</Tag>}
                  {filterQ && <Tag color="cyan">Q{filterQ}</Tag>}
                </Space>
              )}
            </div>
            <Table
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t => `ทั้งหมด ${t} รายการ` }}
              scroll={{ x: 'max-content' }}
              size="middle"
              locale={{ emptyText: 'ไม่พบข้อมูลตามเงื่อนไขที่เลือก' }}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function KPIPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#10b981', borderRadius: 8 } }}>
      <App>
        <KPIPageContent />
      </App>
    </ConfigProvider>
  )
}
