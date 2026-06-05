'use client'
import React, { useMemo, useState } from 'react'
import {
  Card, Typography, Breadcrumb, Row, Col,
  Tag, Space, Select, Tabs, Table, Empty, Divider, Segmented, Progress
} from 'antd'
import {
  HomeOutlined, UserOutlined, CalendarOutlined, TrophyOutlined,
  TeamOutlined, BarChartOutlined
} from '@ant-design/icons'
import {
  FaUsersCog, FaUmbrellaBeach, FaUserMd, FaBriefcase, FaBaby, FaHeartbeat,
  FaChartPie, FaCalendarCheck
} from 'react-icons/fa'
import dayjs from 'dayjs'
import Navbar from '../../../components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import EChart from '../../../components/EChart'

const { Title, Text } = Typography

// ─── Types ──────────────────────────────────────────────────────────────
interface LeaveRecord {
  id: string
  employeeName: string
  position: string
  department: string
  group: string
  mission: string
  leaveType: string
  startDate: string
  endDate: string
  totalDays: number
  status: 'approved' | 'pending' | 'rejected'
}

// ─── Constants ──────────────────────────────────────────────────────────
const LEAVE_TYPES = ['ลาป่วย', 'ลาพักผ่อน', 'ลากิจ', 'ลาคลอด', 'ลาอุปสมบท', 'ลาศึกษา']

const TYPE_META: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  'ลาป่วย':      { color: '#f97316', bg: '#fb923c22', icon: <FaUserMd /> },
  'ลาพักผ่อน':   { color: '#22c55e', bg: '#22c55e22', icon: <FaUmbrellaBeach /> },
  'ลากิจ':       { color: '#3b82f6', bg: '#3b82f622', icon: <FaBriefcase /> },
  'ลาคลอด':      { color: '#ec4899', bg: '#ec489922', icon: <FaBaby /> },
  'ลาอุปสมบท':   { color: '#a855f7', bg: '#a855f722', icon: <FaHeartbeat /> },
  'ลาศึกษา':     { color: '#06b6d4', bg: '#06b6d422', icon: <FaCalendarCheck /> },
}

const MISSIONS = ['ภารกิจด้านการแพทย์', 'ภารกิจด้านการพยาบาล', 'ภารกิจด้านบริการ', 'ภารกิจด้านอำนวยการ']
const GROUPS = [
  'กลุ่มงานการพยาบาล', 'กลุ่มงานเวชกรรม', 'กลุ่มงานเภสัชกรรม',
  'กลุ่มงานเทคนิคการแพทย์', 'กลุ่มงานทันตกรรม', 'กลุ่มงานเวชศาสตร์ครอบครัว',
  'กลุ่มงานบริการสุขภาพ', 'กลุ่มงานอำนวยการ', 'กลุ่มงานการเงินและบัญชี',
]
const DEPARTMENTS = [
  'งานการพยาบาลผู้ป่วยใน', 'งานการพยาบาล OPD', 'งานการพยาบาลผู้ป่วยหนัก',
  'งานห้องผ่าตัด', 'งานห้องคลอด', 'งานอุบัติเหตุฉุกเฉิน',
  'งานเภสัชกรรม IPD', 'งานเภสัชกรรม OPD', 'งานทันตกรรม',
  'งานชันสูตรโรคกลาง', 'งานเวชระเบียน', 'งานการเงิน',
  'งานบุคลากร', 'งานพัสดุ', 'งานสารสนเทศ',
]
const POSITIONS = [
  'พยาบาลวิชาชีพ', 'นักวิชาการสาธารณสุข', 'นายแพทย์', 'เภสัชกร',
  'นักเทคนิคการแพทย์', 'ทันตแพทย์', 'เจ้าพนักงานสาธารณสุข',
  'นักจัดการงานทั่วไป', 'พนักงานช่วยเหลือคนไข้', 'พนักงานทั่วไป',
]

// Map department → group/mission
const DEPT_TO_GROUP: Record<string, { group: string; mission: string }> = {
  'งานการพยาบาลผู้ป่วยใน':    { group: 'กลุ่มงานการพยาบาล', mission: 'ภารกิจด้านการพยาบาล' },
  'งานการพยาบาล OPD':         { group: 'กลุ่มงานการพยาบาล', mission: 'ภารกิจด้านการพยาบาล' },
  'งานการพยาบาลผู้ป่วยหนัก':   { group: 'กลุ่มงานการพยาบาล', mission: 'ภารกิจด้านการพยาบาล' },
  'งานห้องผ่าตัด':            { group: 'กลุ่มงานการพยาบาล', mission: 'ภารกิจด้านการพยาบาล' },
  'งานห้องคลอด':              { group: 'กลุ่มงานการพยาบาล', mission: 'ภารกิจด้านการพยาบาล' },
  'งานอุบัติเหตุฉุกเฉิน':       { group: 'กลุ่มงานเวชกรรม',   mission: 'ภารกิจด้านการแพทย์' },
  'งานเภสัชกรรม IPD':         { group: 'กลุ่มงานเภสัชกรรม', mission: 'ภารกิจด้านบริการ' },
  'งานเภสัชกรรม OPD':         { group: 'กลุ่มงานเภสัชกรรม', mission: 'ภารกิจด้านบริการ' },
  'งานทันตกรรม':              { group: 'กลุ่มงานทันตกรรม',  mission: 'ภารกิจด้านบริการ' },
  'งานชันสูตรโรคกลาง':         { group: 'กลุ่มงานเทคนิคการแพทย์', mission: 'ภารกิจด้านบริการ' },
  'งานเวชระเบียน':            { group: 'กลุ่มงานบริการสุขภาพ', mission: 'ภารกิจด้านบริการ' },
  'งานการเงิน':               { group: 'กลุ่มงานการเงินและบัญชี', mission: 'ภารกิจด้านอำนวยการ' },
  'งานบุคลากร':               { group: 'กลุ่มงานอำนวยการ',  mission: 'ภารกิจด้านอำนวยการ' },
  'งานพัสดุ':                 { group: 'กลุ่มงานอำนวยการ',  mission: 'ภารกิจด้านอำนวยการ' },
  'งานสารสนเทศ':              { group: 'กลุ่มงานอำนวยการ',  mission: 'ภารกิจด้านอำนวยการ' },
}

const FIRST_NAMES = ['สมศรี','อนุชา','วิชัย','จิตรา','รัตนา','ธนกร','พิมพ์ใจ','สุภาพ','มาลี','นพดล','กรรณิการ์','ปิยะ','ศิริพร','ประวิทย์','วราภรณ์','สมชาย','สุดา','อภิชาติ','นันทา','พงษ์ศักดิ์','จันทร์จิรา','ภานุมาศ','สุวรรณ','ปริศนา','ธีรพงษ์','อรอุมา','ไพศาล','กชกร','ยุทธนา','พัชรินทร์','สุริยา','เจษฎา','รุ่งทิวา','ชลธิชา','ดวงใจ','สาวิตรี','พรเทพ','ทินกร','รัชนีกร','พีรพล','สมพร','สุนิสา','อัจฉรา','ภูมิ','พิทักษ์','สิริพร','กิตติศักดิ์','ทรงพล','วรรณวิภา','สมคิด']
const LAST_NAMES = ['ใจดีงาม','สุขใจ','กล้าดี','รักการงาน','มีสุข','มั่นคง','ดีเลิศ','รุ่งโรจน์','พรหมจักร','ทองสุข','แสงทอง','สาลี','พงศ์ไพบูลย์','เจริญสุข','ศรีสุวรรณ','บุญมี','พิทักษ์ชน','สิริสวัสดิ์','คงเจริญ','พัฒนพงษ์']

// ─── Generate rich mock data ───────────────────────────────────────────
function makeRecords(): LeaveRecord[] {
  // deterministic pseudo-random
  let seed = 42
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]

  // Build a stable employee roster (~80 employees)
  const employees = Array.from({ length: 80 }).map((_, i) => {
    const dept = pick(DEPARTMENTS)
    const meta = DEPT_TO_GROUP[dept]
    return {
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      position: pick(POSITIONS),
      department: dept,
      group: meta.group,
      mission: meta.mission,
    }
  })

  const records: LeaveRecord[] = []
  let counter = 1

  // FY 2569 (Oct 2025 – Sep 2026): heavy data
  // FY 2568 (Oct 2024 – Sep 2025): lighter
  // FY 2567 (Oct 2023 – Sep 2024): minimal
  const fyConfig = [
    { startCY: 2025, count: 220 }, // FY 2569
    { startCY: 2024, count: 140 }, // FY 2568
    { startCY: 2023, count: 70 },  // FY 2567
  ]

  for (const fy of fyConfig) {
    for (let i = 0; i < fy.count; i++) {
      const emp = pick(employees)
      const monthOffset = Math.floor(rand() * 12) // 0..11 from Oct
      const monthCY = monthOffset < 3 ? 9 + monthOffset : monthOffset - 3 // Oct=9
      const year = monthOffset < 3 ? fy.startCY : fy.startCY + 1
      const day = 1 + Math.floor(rand() * 27)
      const start = dayjs(`${year}-${String(monthCY + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)

      const r = rand()
      let leaveType: string
      let totalDays: number
      if (r < 0.42)      { leaveType = 'ลาป่วย';     totalDays = 1 + Math.floor(rand() * 3) }
      else if (r < 0.72) { leaveType = 'ลาพักผ่อน';  totalDays = 1 + Math.floor(rand() * 5) }
      else if (r < 0.88) { leaveType = 'ลากิจ';      totalDays = 1 + Math.floor(rand() * 2) }
      else if (r < 0.94) { leaveType = 'ลาคลอด';    totalDays = 60 + Math.floor(rand() * 30) }
      else if (r < 0.97) { leaveType = 'ลาอุปสมบท'; totalDays = 7 + Math.floor(rand() * 14) }
      else               { leaveType = 'ลาศึกษา';   totalDays = 5 + Math.floor(rand() * 30) }

      const end = start.add(totalDays - 1, 'day')
      const sRand = rand()
      const status: LeaveRecord['status'] = sRand < 0.85 ? 'approved' : sRand < 0.95 ? 'pending' : 'rejected'

      records.push({
        id: `LV-${start.format('YYYYMM')}${String(counter++).padStart(3, '0')}`,
        employeeName: emp.name,
        position: emp.position,
        department: emp.department,
        group: emp.group,
        mission: emp.mission,
        leaveType,
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
        totalDays,
        status,
      })
    }
  }
  return records
}

// FY helper: BE 2569 covers Oct 2025–Sep 2026
const toFY = (d: string) => {
  const m = dayjs(d).month()
  const y = dayjs(d).year()
  return m >= 9 ? y + 544 : y + 543
}
const toFiscalMonth = (d: string) => {
  const m = dayjs(d).month()
  return m >= 9 ? m - 8 : m + 4
}
const FISCAL_MONTH_LABELS = ['ต.ค.','พ.ย.','ธ.ค.','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.']

// ─── Page ─────────────────────────────────────────────────────────────
const ALL_RECORDS = makeRecords()

const PageContent = () => {
  const [fiscalYear, setFiscalYear] = useState(2569)
  const [mission, setMission] = useState<string | undefined>()
  const [group, setGroup] = useState<string | undefined>()
  const [department, setDepartment] = useState<string | undefined>()
  const [breakdown, setBreakdown] = useState<'department' | 'group' | 'mission'>('department')

  // ── Filter ──
  const filtered = useMemo(() => ALL_RECORDS.filter(r => {
    if (toFY(r.startDate) !== fiscalYear) return false
    if (mission && r.mission !== mission) return false
    if (group && r.group !== group) return false
    if (department && r.department !== department) return false
    return r.status === 'approved'
  }), [fiscalYear, mission, group, department])

  // Available group/department options narrow with filters
  const availGroups = useMemo(() => {
    const set = new Set(ALL_RECORDS
      .filter(r => !mission || r.mission === mission)
      .map(r => r.group))
    return Array.from(set).sort()
  }, [mission])

  const availDepartments = useMemo(() => {
    const set = new Set(ALL_RECORDS
      .filter(r => (!mission || r.mission === mission) && (!group || r.group === group))
      .map(r => r.department))
    return Array.from(set).sort()
  }, [mission, group])

  // ── KPI: by leave type ──
  const totalDays = filtered.reduce((s, r) => s + r.totalDays, 0)
  const totalRequests = filtered.length
  const uniqueEmployees = new Set(filtered.map(r => r.employeeName)).size

  const typeAgg = useMemo(() => {
    return LEAVE_TYPES.map(t => {
      const rs = filtered.filter(r => r.leaveType === t)
      return {
        type: t,
        days: rs.reduce((s, r) => s + r.totalDays, 0),
        requests: rs.length,
      }
    })
  }, [filtered])

  // ── Pie: leave types ──
  const pieOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> วัน ({d}%)' },
    legend: { bottom: 0, textStyle: { color: 'var(--app-text-2)', fontSize: 11 }, type: 'scroll' },
    series: [{
      type: 'pie',
      radius: ['50%', '78%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: 'var(--app-bg)', borderWidth: 2 },
      label: { color: 'var(--app-text)', formatter: '{b}\n{c} วัน', fontSize: 11 },
      data: typeAgg.filter(x => x.days > 0).map(x => ({
        name: x.type, value: x.days,
        itemStyle: { color: TYPE_META[x.type].color }
      })),
    }],
  }), [typeAgg])

  // ── Stacked bar: by fiscal month × type ──
  const monthOption = useMemo(() => {
    const series = LEAVE_TYPES.map(t => ({
      name: t, type: 'bar', stack: 'all',
      itemStyle: { color: TYPE_META[t].color, borderRadius: [0, 0, 0, 0] },
      barMaxWidth: 32,
      data: Array.from({ length: 12 }).map((_, m) =>
        filtered.filter(r => r.leaveType === t && toFiscalMonth(r.startDate) === m + 1)
          .reduce((s, r) => s + r.totalDays, 0)),
    }))
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, textStyle: { color: 'var(--app-text-2)', fontSize: 11 } },
      grid: { left: 8, right: 16, top: 16, bottom: 40, containLabel: true },
      xAxis: { type: 'category', data: FISCAL_MONTH_LABELS, axisLabel: { color: 'var(--app-text-2)' } },
      yAxis: { type: 'value', axisLabel: { color: 'var(--app-text-2)' } },
      series,
    }
  }, [filtered])

  // ── Horizontal bar: breakdown by department/group/mission ──
  const breakdownOption = useMemo(() => {
    const keyOf = (r: LeaveRecord) =>
      breakdown === 'department' ? r.department : breakdown === 'group' ? r.group : r.mission
    const map = new Map<string, number>()
    filtered.forEach(r => map.set(keyOf(r), (map.get(keyOf(r)) ?? 0) + r.totalDays))
    const entries = Array.from(map.entries()).sort((a, b) => a[1] - b[1])
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => `${p[0].name}<br/><b>${p[0].value}</b> วัน` },
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: 'var(--app-text-2)' } },
      yAxis: { type: 'category', data: entries.map(e => e[0]), axisLabel: { color: 'var(--app-text-2)', fontSize: 11 } },
      series: [{
        type: 'bar',
        data: entries.map(e => e[1]),
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [{ offset: 0, color: '#0d9488' }, { offset: 1, color: '#22c55e' }] },
        },
        label: { show: true, position: 'right', color: 'var(--app-text)', fontWeight: 600 },
        barMaxWidth: 22,
      }],
    }
  }, [filtered, breakdown])

  // ── TOP 20 per leave type ──
  const top20ByType = useMemo(() => {
    const result: Record<string, { name: string; position: string; department: string; days: number; count: number }[]> = {}
    LEAVE_TYPES.forEach(t => {
      const map = new Map<string, { name: string; position: string; department: string; days: number; count: number }>()
      filtered.filter(r => r.leaveType === t).forEach(r => {
        const k = r.employeeName + '|' + r.department
        const cur = map.get(k)
        if (cur) { cur.days += r.totalDays; cur.count += 1 }
        else map.set(k, { name: r.employeeName, position: r.position, department: r.department, days: r.totalDays, count: 1 })
      })
      result[t] = Array.from(map.values()).sort((a, b) => b.days - a.days).slice(0, 20)
    })
    return result
  }, [filtered])

  const topMaxByType = useMemo(() =>
    Object.fromEntries(Object.entries(top20ByType).map(([k, v]) => [k, v[0]?.days ?? 0])),
  [top20ByType])

  const top20Columns = (type: string) => [
    {
      title: 'ลำดับ', key: 'rank', width: 70, align: 'center' as const,
      render: (_: any, __: any, idx: number) => {
        const medals = ['#fbbf24', 'var(--app-text-2)', '#f97316']
        if (idx < 3) return <Tag color={medals[idx]} style={{ fontWeight: 700 }}>#{idx + 1}</Tag>
        return <Text type="secondary">#{idx + 1}</Text>
      }
    },
    {
      title: 'ชื่อ-สกุล', dataIndex: 'name', key: 'name',
      render: (t: string) => <Text strong>{t}</Text>
    },
    {
      title: 'ตำแหน่ง', dataIndex: 'position', key: 'position',
      render: (t: string) => <Text type="secondary">{t}</Text>
    },
    {
      title: 'หน่วยงาน', dataIndex: 'department', key: 'department',
      render: (t: string) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>
    },
    {
      title: 'จำนวนครั้ง', dataIndex: 'count', key: 'count', align: 'center' as const, width: 100,
      render: (v: number) => <Tag>{v}</Tag>
    },
    {
      title: 'รวม (วัน)', dataIndex: 'days', key: 'days', align: 'right' as const, width: 220,
      render: (v: number) => {
        const max = topMaxByType[type] || 1
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Progress percent={Math.round((v / max) * 100)} showInfo={false} size="small"
                strokeColor={TYPE_META[type].color} />
            </div>
            <Text strong style={{ color: TYPE_META[type].color, minWidth: 48, textAlign: 'right' }}>{v}</Text>
          </div>
        )
      }
    },
  ]

  return (
    <div className="min-h-screen w-full bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: 'การลา' },
            { title: 'Dashboard การลา' },
          ]}
          className="mb-4"
        />

        {/* Header banner */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #006a5a 0%, #0d9488 50%, #14b8a6 100%)',
            border: 'none',
            borderRadius: 16,
            marginBottom: 16,
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={14}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-2xl"
                  style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}>
                  <FaChartPie className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>Dashboard การลา</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                    วิเคราะห์ข้อมูลการลาของบุคลากร แยกตามหน่วยงาน กลุ่มงาน และปีงบประมาณ
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={10}>
              <Row gutter={[8, 8]}>
                <Col xs={12}>
                  <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>คำขอที่อนุมัติ</div>
                    <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                      {totalRequests} <span style={{ fontSize: 12, fontWeight: 400 }}>รายการ</span>
                    </div>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>บุคลากรที่ใช้สิทธิ์</div>
                    <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                      {uniqueEmployees} <span style={{ fontSize: 12, fontWeight: 400 }}>คน</span>
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* Filters */}
        <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>ปีงบประมาณ</Text>
              <Select
                value={fiscalYear}
                onChange={setFiscalYear}
                className="w-full mt-1"
                options={[
                  { value: 2569, label: 'ปีงบประมาณ 2569' },
                  { value: 2568, label: 'ปีงบประมาณ 2568' },
                  { value: 2567, label: 'ปีงบประมาณ 2567' },
                ]}
                suffixIcon={<CalendarOutlined />}
              />
            </Col>
            <Col xs={24} md={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>กลุ่มภารกิจ</Text>
              <Select
                value={mission}
                onChange={(v) => { setMission(v); setGroup(undefined); setDepartment(undefined) }}
                placeholder="ทั้งหมด"
                allowClear
                className="w-full mt-1"
                options={MISSIONS.map(m => ({ value: m, label: m }))}
              />
            </Col>
            <Col xs={24} md={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>กลุ่มงาน</Text>
              <Select
                value={group}
                onChange={(v) => { setGroup(v); setDepartment(undefined) }}
                placeholder="ทั้งหมด"
                allowClear
                showSearch
                className="w-full mt-1"
                options={availGroups.map(g => ({ value: g, label: g }))}
              />
            </Col>
            <Col xs={24} md={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>หน่วยงาน</Text>
              <Select
                value={department}
                onChange={setDepartment}
                placeholder="ทั้งหมด"
                allowClear
                showSearch
                className="w-full mt-1"
                options={availDepartments.map(d => ({ value: d, label: d }))}
              />
            </Col>
          </Row>
        </Card>

        {/* KPI per leave type */}
        <Row gutter={[12, 12]} className="mb-4">
          {typeAgg.map(t => (
            <Col xs={12} md={8} lg={4} key={t.type}>
              <Card
                variant="borderless"
                style={{ borderRadius: 12, borderLeft: `3px solid ${TYPE_META[t.type].color}` }}
                styles={{ body: { padding: 16 } }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-xl"
                    style={{ width: 40, height: 40, background: TYPE_META[t.type].bg, color: TYPE_META[t.type].color, fontSize: 18 }}>
                    {TYPE_META[t.type].icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{t.type}</Text>
                    <div className="flex items-baseline gap-1">
                      <Text strong style={{ fontSize: 22, lineHeight: 1, color: TYPE_META[t.type].color }}>{t.days}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>วัน</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{t.requests} ครั้ง</Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Row: pie + month stacked */}
        <Row gutter={[12, 12]} className="mb-4">
          <Col xs={24} lg={9}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #14b8a6' }}
              title={<Space><FaChartPie style={{ color: '#14b8a6' }} /><span>สัดส่วนวันลาตามประเภท</span></Space>}
              extra={<Tag color="#14b8a6">{totalDays} วัน</Tag>}
            >
              {totalDays > 0 ? <EChart option={pieOption} height={340} /> : <Empty description="ไม่มีข้อมูล" />}
            </Card>
          </Col>
          <Col xs={24} lg={15}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #0d9488' }}
              title={<Space><BarChartOutlined style={{ color: '#0d9488' }} /><span>วันลารายเดือน (ปีงบประมาณ {fiscalYear})</span></Space>}
            >
              {totalDays > 0 ? <EChart option={monthOption} height={340} /> : <Empty description="ไม่มีข้อมูล" />}
            </Card>
          </Col>
        </Row>

        {/* Breakdown chart */}
        <Card
          variant="borderless"
          style={{ borderRadius: 12, borderLeft: '4px solid #006a5a', marginBottom: 16 }}
          title={
            <Space>
              <TeamOutlined style={{ color: '#006a5a' }} />
              <span>วันลาแยกตาม</span>
              <Segmented
                value={breakdown}
                onChange={(v) => setBreakdown(v as any)}
                options={[
                  { label: 'หน่วยงาน', value: 'department' },
                  { label: 'กลุ่มงาน', value: 'group' },
                  { label: 'กลุ่มภารกิจ', value: 'mission' },
                ]}
              />
            </Space>
          }
        >
          {totalDays > 0 ? (
            <EChart option={breakdownOption} height={breakdown === 'department' ? 480 : 320} />
          ) : <Empty description="ไม่มีข้อมูล" />}
        </Card>

        {/* TOP 20 per leave type */}
        <Card
          variant="borderless"
          style={{ borderRadius: 12, borderLeft: '4px solid #f59e0b' }}
          title={<Space><TrophyOutlined style={{ color: '#f59e0b' }} /><span>TOP 20 บุคลากรที่ใช้วันลามากที่สุด — แยกตามประเภท</span></Space>}
        >
          <Tabs
            items={LEAVE_TYPES.map(t => ({
              key: t,
              label: (
                <span style={{ color: TYPE_META[t].color }}>
                  <span style={{ marginRight: 6 }}>{TYPE_META[t].icon}</span>
                  {t}
                  <Tag color={TYPE_META[t].color} style={{ marginLeft: 6 }}>
                    {top20ByType[t].length}
                  </Tag>
                </span>
              ),
              children: top20ByType[t].length === 0 ? (
                <Empty description={`ไม่มีข้อมูล${t}`} />
              ) : (
                <Table
                  size="small"
                  rowKey={(r) => r.name + r.department}
                  dataSource={top20ByType[t]}
                  columns={top20Columns(t) as any}
                  pagination={false}
                  scroll={{ x: 760 }}
                />
              )
            }))}
          />
        </Card>
      </div>
    </div>
  )
}

export default function LeaveDashboardPage() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PageContent />
    </AppThemeProvider>
  )
}
