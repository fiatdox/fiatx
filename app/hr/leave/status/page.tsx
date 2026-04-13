'use client'
import { useState, useMemo } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, ConfigProvider, App,
  Select, Row, Col, Space, theme, Tabs, Button, Empty, Segmented
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, PrinterOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons'
import { FaUmbrellaBeach, FaUserMd, FaBriefcase, FaBaby, FaChartBar, FaUsers, FaMedal } from 'react-icons/fa'
import dayjs from 'dayjs'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeaveRecord {
  id: string
  employeeName: string
  department: string   // หน่วยงาน
  group: string        // กลุ่มงาน
  mission: string      // ภารกิจ
  leaveType: string
  startDate: string    // YYYY-MM-DD
  endDate: string
  totalDays: number
  status: 'approved' | 'pending' | 'rejected'
}

// ─── Fiscal Year Helpers ──────────────────────────────────────────────────────
// FY BE 2569 = Oct 2025 (CE) to Sep 2026 (CE)
const toFY = (d: string) => {
  const m = dayjs(d).month() // 0-based, Jan=0
  const y = dayjs(d).year()
  return m >= 9 ? y + 544 : y + 543
}
// Fiscal month: Oct=1, Nov=2, Dec=3, Jan=4 … Sep=12
const toFiscalMonth = (d: string) => {
  const m = dayjs(d).month()
  return m >= 9 ? m - 8 : m + 4
}

const FISCAL_MONTHS = [
  { value: 0,  label: 'ทั้งปีงบประมาณ' },
  { value: 1,  label: 'ตุลาคม (เดือน 1)' },
  { value: 2,  label: 'พฤศจิกายน (เดือน 2)' },
  { value: 3,  label: 'ธันวาคม (เดือน 3)' },
  { value: 4,  label: 'มกราคม (เดือน 4)' },
  { value: 5,  label: 'กุมภาพันธ์ (เดือน 5)' },
  { value: 6,  label: 'มีนาคม (เดือน 6)' },
  { value: 7,  label: 'เมษายน (เดือน 7)' },
  { value: 8,  label: 'พฤษภาคม (เดือน 8)' },
  { value: 9,  label: 'มิถุนายน (เดือน 9)' },
  { value: 10, label: 'กรกฎาคม (เดือน 10)' },
  { value: 11, label: 'สิงหาคม (เดือน 11)' },
  { value: 12, label: 'กันยายน (เดือน 12)' },
]

const LEAVE_TYPES = ['ลาป่วย', 'ลาพักผ่อน', 'ลากิจ', 'ลาคลอด', 'อื่นๆ']

const leaveTypeColor: Record<string, string> = {
  'ลาป่วย': 'volcano', 'ลาพักผ่อน': 'green',
  'ลากิจ': 'blue',     'ลาคลอด': 'magenta', 'อื่นๆ': 'default',
}

// ─── Role-based scope options ─────────────────────────────────────────────────
const SCOPE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  hr: [],
  mission: [
    { value: 'ภารกิจด้านการแพทย์',   label: 'ภารกิจด้านการแพทย์' },
    { value: 'ภารกิจด้านบริการ',     label: 'ภารกิจด้านบริการ' },
    { value: 'ภารกิจด้านอำนวยการ',   label: 'ภารกิจด้านอำนวยการ' },
  ],
  group: [
    { value: 'กลุ่มการพยาบาล',      label: 'กลุ่มการพยาบาล' },
    { value: 'กลุ่มบริการสุขภาพ',   label: 'กลุ่มบริการสุขภาพ' },
    { value: 'กลุ่มอำนวยการ',       label: 'กลุ่มอำนวยการ' },
  ],
  unit: [
    { value: 'งานการพยาบาล OPD',    label: 'งานการพยาบาล OPD' },
    { value: 'งานห้องผ่าตัด',       label: 'งานห้องผ่าตัด' },
    { value: 'งานเวชระเบียน',       label: 'งานเวชระเบียน' },
    { value: 'งานการเงิน',          label: 'งานการเงิน' },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  hr: 'งาน HR (ดูทั้งหมด)',
  mission: 'หัวหน้าภารกิจ',
  group: 'หัวหน้ากลุ่มงาน',
  unit: 'หัวหน้าหน่วยงาน',
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const allRecords: LeaveRecord[] = [
  // FY 2569 — Oct 2025 (เดือน 1)
  { id:'LV-202510001', employeeName:'สมศรี ใจดีงาม',   department:'งานการพยาบาล OPD', group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาป่วย',    startDate:'2025-10-05', endDate:'2025-10-07', totalDays:3,  status:'approved' },
  { id:'LV-202510002', employeeName:'อนุชา สุขใจ',     department:'งานการพยาบาล OPD', group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาพักผ่อน', startDate:'2025-10-20', endDate:'2025-10-24', totalDays:5,  status:'approved' },
  { id:'LV-202510003', employeeName:'วิชัย กล้าดี',    department:'งานเวชระเบียน',    group:'กลุ่มบริการสุขภาพ', mission:'ภารกิจด้านบริการ',    leaveType:'ลากิจ',     startDate:'2025-10-08', endDate:'2025-10-09', totalDays:2,  status:'approved' },
  // FY 2569 — Nov 2025 (เดือน 2)
  { id:'LV-202511001', employeeName:'วิชัย กล้าดี',    department:'งานเวชระเบียน',    group:'กลุ่มบริการสุขภาพ', mission:'ภารกิจด้านบริการ',    leaveType:'ลาพักผ่อน', startDate:'2025-11-01', endDate:'2025-11-05', totalDays:5,  status:'approved' },
  { id:'LV-202511002', employeeName:'จิตรา รักการงาน', department:'งานการเงิน',       group:'กลุ่มอำนวยการ',     mission:'ภารกิจด้านอำนวยการ',  leaveType:'ลากิจ',     startDate:'2025-11-15', endDate:'2025-11-15', totalDays:1,  status:'approved' },
  { id:'LV-202511003', employeeName:'รัตนา มีสุข',     department:'งานห้องผ่าตัด',   group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาป่วย',    startDate:'2025-11-20', endDate:'2025-11-21', totalDays:2,  status:'approved' },
  // FY 2569 — Dec 2025 (เดือน 3)
  { id:'LV-202512001', employeeName:'รัตนา มีสุข',     department:'งานห้องผ่าตัด',   group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาป่วย',    startDate:'2025-12-10', endDate:'2025-12-12', totalDays:3,  status:'approved' },
  { id:'LV-202512002', employeeName:'ธนกร มั่นคง',     department:'งานการเงิน',       group:'กลุ่มอำนวยการ',     mission:'ภารกิจด้านอำนวยการ',  leaveType:'ลาพักผ่อน', startDate:'2025-12-25', endDate:'2025-12-26', totalDays:2,  status:'approved' },
  { id:'LV-202512003', employeeName:'พิมพ์ใจ ดีเลิศ',  department:'งานเวชระเบียน',    group:'กลุ่มบริการสุขภาพ', mission:'ภารกิจด้านบริการ',    leaveType:'ลาป่วย',    startDate:'2025-12-20', endDate:'2025-12-20', totalDays:1,  status:'approved' },
  // FY 2569 — Jan 2026 (เดือน 4)
  { id:'LV-202601001', employeeName:'สมศรี ใจดีงาม',   department:'งานการพยาบาล OPD', group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลากิจ',     startDate:'2026-01-08', endDate:'2026-01-08', totalDays:1,  status:'approved' },
  { id:'LV-202601002', employeeName:'พิมพ์ใจ ดีเลิศ',  department:'งานเวชระเบียน',    group:'กลุ่มบริการสุขภาพ', mission:'ภารกิจด้านบริการ',    leaveType:'ลาป่วย',    startDate:'2026-01-20', endDate:'2026-01-21', totalDays:2,  status:'approved' },
  // FY 2569 — Feb 2026 (เดือน 5)
  { id:'LV-202602001', employeeName:'รัตนา มีสุข',     department:'งานห้องผ่าตัด',   group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาคลอด',    startDate:'2026-02-01', endDate:'2026-04-30', totalDays:89, status:'approved' },
  { id:'LV-202602002', employeeName:'ธนกร มั่นคง',     department:'งานการเงิน',       group:'กลุ่มอำนวยการ',     mission:'ภารกิจด้านอำนวยการ',  leaveType:'ลาป่วย',    startDate:'2026-02-10', endDate:'2026-02-11', totalDays:2,  status:'approved' },
  // FY 2569 — Mar 2026 (เดือน 6)
  { id:'LV-202603001', employeeName:'อนุชา สุขใจ',     department:'งานการพยาบาล OPD', group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาป่วย',    startDate:'2026-03-05', endDate:'2026-03-06', totalDays:2,  status:'approved' },
  { id:'LV-202603002', employeeName:'วิชัย กล้าดี',    department:'งานเวชระเบียน',    group:'กลุ่มบริการสุขภาพ', mission:'ภารกิจด้านบริการ',    leaveType:'ลากิจ',     startDate:'2026-03-20', endDate:'2026-03-20', totalDays:1,  status:'rejected' },
  // FY 2569 — Apr 2026 (เดือน 7, ปัจจุบัน)
  { id:'LV-202604001', employeeName:'สมศรี ใจดีงาม',   department:'งานการพยาบาล OPD', group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาป่วย',    startDate:'2026-04-14', endDate:'2026-04-15', totalDays:2,  status:'pending' },
  { id:'LV-202604002', employeeName:'วิชัย กล้าดี',    department:'งานเวชระเบียน',    group:'กลุ่มบริการสุขภาพ', mission:'ภารกิจด้านบริการ',    leaveType:'ลาพักผ่อน', startDate:'2026-04-20', endDate:'2026-04-24', totalDays:5,  status:'pending' },
  { id:'LV-202604003', employeeName:'จิตรา รักการงาน', department:'งานการเงิน',       group:'กลุ่มอำนวยการ',     mission:'ภารกิจด้านอำนวยการ',  leaveType:'ลากิจ',     startDate:'2026-04-12', endDate:'2026-04-12', totalDays:1,  status:'rejected' },
  { id:'LV-202604004', employeeName:'อนุชา สุขใจ',     department:'งานการพยาบาล OPD', group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาพักผ่อน', startDate:'2026-04-21', endDate:'2026-04-23', totalDays:3,  status:'pending' },
  { id:'LV-202604005', employeeName:'พิมพ์ใจ ดีเลิศ',  department:'งานเวชระเบียน',    group:'กลุ่มบริการสุขภาพ', mission:'ภารกิจด้านบริการ',    leaveType:'ลาป่วย',    startDate:'2026-04-22', endDate:'2026-04-22', totalDays:1,  status:'approved' },
  { id:'LV-202604006', employeeName:'ธนกร มั่นคง',     department:'งานการเงิน',       group:'กลุ่มอำนวยการ',     mission:'ภารกิจด้านอำนวยการ',  leaveType:'ลากิจ',     startDate:'2026-04-17', endDate:'2026-04-18', totalDays:2,  status:'pending' },
  // FY 2568 — ข้อมูลปีที่แล้ว
  { id:'LV-202410001', employeeName:'สมศรี ใจดีงาม',   department:'งานการพยาบาล OPD', group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาพักผ่อน', startDate:'2024-10-10', endDate:'2024-10-11', totalDays:2,  status:'approved' },
  { id:'LV-202410002', employeeName:'อนุชา สุขใจ',     department:'งานการพยาบาล OPD', group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลาป่วย',    startDate:'2024-11-12', endDate:'2024-11-13', totalDays:2,  status:'approved' },
  { id:'LV-202501001', employeeName:'วิชัย กล้าดี',    department:'งานเวชระเบียน',    group:'กลุ่มบริการสุขภาพ', mission:'ภารกิจด้านบริการ',    leaveType:'ลาป่วย',    startDate:'2025-01-05', endDate:'2025-01-07', totalDays:3,  status:'approved' },
  { id:'LV-202506001', employeeName:'จิตรา รักการงาน', department:'งานการเงิน',       group:'กลุ่มอำนวยการ',     mission:'ภารกิจด้านอำนวยการ',  leaveType:'ลาพักผ่อน', startDate:'2025-06-15', endDate:'2025-06-19', totalDays:5,  status:'approved' },
  { id:'LV-202508001', employeeName:'รัตนา มีสุข',     department:'งานห้องผ่าตัด',   group:'กลุ่มการพยาบาล',    mission:'ภารกิจด้านการแพทย์',  leaveType:'ลากิจ',     startDate:'2025-08-10', endDate:'2025-08-10', totalDays:1,  status:'approved' },
]

const fmtDate = (d: string) =>
  dayjs(d).format('DD/MM/') + String(dayjs(d).year() + 543)

const statusTag = (s: string) => {
  if (s === 'approved') return <Tag icon={<CheckCircleOutlined />} color="success">อนุมัติ</Tag>
  if (s === 'rejected') return <Tag icon={<CloseCircleOutlined />} color="error">ไม่อนุมัติ</Tag>
  return <Tag icon={<ClockCircleOutlined />} color="warning">รออนุมัติ</Tag>
}

// ─── Main Content ─────────────────────────────────────────────────────────────
const LeaveSummaryPageContent = () => {
  const [fiscalYear, setFiscalYear]     = useState(2569)
  const [fiscalMonth, setFiscalMonth]   = useState(0)    // 0 = ทั้งปี
  const [role, setRole]                 = useState('hr')
  const [scope, setScope]               = useState<string | null>(null)
  const [topType, setTopType]           = useState('รวมทั้งหมด')

  // เมื่อเปลี่ยนบทบาทให้ reset scope
  const handleRoleChange = (val: string) => {
    setRole(val)
    setScope(null)
  }

  // ── Filter records ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allRecords.filter(r => {
      if (toFY(r.startDate) !== fiscalYear) return false
      if (fiscalMonth !== 0 && toFiscalMonth(r.startDate) !== fiscalMonth) return false
      if (role === 'mission' && scope && r.mission !== scope) return false
      if (role === 'group'   && scope && r.group   !== scope) return false
      if (role === 'unit'    && scope && r.department !== scope) return false
      return true
    })
  }, [fiscalYear, fiscalMonth, role, scope])

  const approved = useMemo(() => filtered.filter(r => r.status === 'approved'), [filtered])

  // ── Summary stats ─────────────────────────────────────────────────────────
  const sumDays = (type: string) =>
    approved.filter(r => r.leaveType === type).reduce((a, r) => a + r.totalDays, 0)

  const sickDays      = sumDays('ลาป่วย')
  const vacationDays  = sumDays('ลาพักผ่อน')
  const personalDays  = sumDays('ลากิจ')
  const maternityDays = sumDays('ลาคลอด')
  const totalDays     = approved.reduce((a, r) => a + r.totalDays, 0)
  const totalRequests = filtered.length
  const pendingCount  = filtered.filter(r => r.status === 'pending').length
  const rejectedCount = filtered.filter(r => r.status === 'rejected').length

  // ── Pivot: department × leaveType ─────────────────────────────────────────
  const departments = useMemo(
    () => Array.from(new Set(filtered.map(r => r.department))).sort(),
    [filtered]
  )

  const pivotData = useMemo(() =>
    departments.map(dept => {
      const deptRows = approved.filter(r => r.department === dept)
      const row: Record<string, any> = { key: dept, department: dept }
      let total = 0
      LEAVE_TYPES.forEach(lt => {
        const d = deptRows.filter(r => r.leaveType === lt).reduce((a, r) => a + r.totalDays, 0)
        row[lt] = d || 0
        total += d
      })
      row['รวม'] = total
      return row
    })
  , [departments, approved])

  const pivotColumns = [
    {
      title: 'หน่วยงาน', dataIndex: 'department', key: 'department',
      fixed: 'left' as const,
      render: (t: string) => <Text strong>{t}</Text>
    },
    ...LEAVE_TYPES.map(lt => ({
      title: <Tag color={leaveTypeColor[lt]}>{lt}</Tag>,
      dataIndex: lt, key: lt, align: 'center' as const,
      render: (v: number) => v > 0 ? <span className="font-semibold">{v}</span> : <span className="text-slate-500">—</span>
    })),
    {
      title: 'รวมทั้งสิ้น', dataIndex: 'รวม', key: 'รวม', align: 'center' as const,
      render: (v: number) => <Tag color="geekblue">{v} วัน</Tag>
    }
  ]

  // ── Per-person summary ────────────────────────────────────────────────────
  const employees = useMemo(
    () => Array.from(new Set(filtered.map(r => r.employeeName))).sort(),
    [filtered]
  )

  const personData = useMemo(() =>
    employees.map(name => {
      const recs = approved.filter(r => r.employeeName === name)
      const dept = allRecords.find(r => r.employeeName === name)?.department ?? '—'
      const row: Record<string, any> = { key: name, employeeName: name, department: dept }
      let total = 0
      LEAVE_TYPES.forEach(lt => {
        const d = recs.filter(r => r.leaveType === lt).reduce((a, r) => a + r.totalDays, 0)
        row[lt] = d || 0
        total += d
      })
      row['รวม'] = total
      return row
    })
  , [employees, approved])

  const personColumns = [
    {
      title: 'ชื่อ-สกุล', dataIndex: 'employeeName', key: 'employeeName',
      render: (t: string) => <Text strong>{t}</Text>
    },
    {
      title: 'หน่วยงาน', dataIndex: 'department', key: 'department',
      render: (t: string) => <Text type="secondary">{t}</Text>
    },
    ...LEAVE_TYPES.map(lt => ({
      title: <Tag color={leaveTypeColor[lt]}>{lt}</Tag>,
      dataIndex: lt, key: lt, align: 'center' as const,
      render: (v: number) => v > 0 ? <span className="font-semibold">{v}</span> : <span className="text-slate-500">—</span>
    })),
    {
      title: 'รวม', dataIndex: 'รวม', key: 'รวม', align: 'center' as const,
      render: (v: number) => <Tag color="geekblue">{v} วัน</Tag>
    }
  ]

  // ── All-records table ─────────────────────────────────────────────────────
  const detailColumns = [
    {
      title: 'เลขที่ใบลา', dataIndex: 'id', key: 'id',
      render: (t: string) => <Text className="font-medium text-teal-400 text-xs">{t}</Text>
    },
    { title: 'ชื่อ-สกุล', dataIndex: 'employeeName', key: 'employeeName' },
    {
      title: 'หน่วยงาน', dataIndex: 'department', key: 'department',
      render: (t: string) => <Text type="secondary" className="text-sm">{t}</Text>
    },
    {
      title: 'ประเภทการลา', dataIndex: 'leaveType', key: 'leaveType',
      render: (t: string) => <Tag color={leaveTypeColor[t]}>{t}</Tag>
    },
    {
      title: 'ช่วงวันที่ลา', key: 'date',
      render: (_: any, r: LeaveRecord) => (
        <span className="text-sm">{fmtDate(r.startDate)} – {fmtDate(r.endDate)}</span>
      )
    },
    {
      title: 'จำนวน', dataIndex: 'totalDays', key: 'totalDays', align: 'center' as const,
      render: (v: number) => <Tag color="geekblue">{v} วัน</Tag>
    },
    {
      title: 'สถานะ', dataIndex: 'status', key: 'status', align: 'center' as const,
      render: statusTag
    },
  ]

  const fyLabel = `1 ต.ค. ${fiscalYear - 1} – 30 ก.ย. ${fiscalYear}`
  const periodLabel = fiscalMonth === 0
    ? `ปีงบประมาณ ${fiscalYear} (${fyLabel})`
    : `${FISCAL_MONTHS.find(m => m.value === fiscalMonth)?.label?.replace(/ \(.*\)/, '')} ปีงบ ${fiscalYear}`

  const scopeLabel = role === 'hr'
    ? 'ทุกหน่วยงาน'
    : scope
      ? `${ROLE_LABELS[role]}: ${scope}`
      : `${ROLE_LABELS[role]}: (ทั้งหมด)`

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบงานบุคคล</> },
            { title: 'สรุปรายการลา' },
          ]}
          className="mb-6"
        />

        {/* Page Title */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div>
            <Title level={2} className="text-primary m-0">สรุปรายการลา</Title>
            <Text type="secondary">{periodLabel} · {scopeLabel}</Text>
          </div>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            พิมพ์รายงาน
          </Button>
        </div>

        {/* ── Filter Bar ───────────────────────────────────────────────────── */}
        <Card variant="borderless" className="mb-6 shadow-sm">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
            <div>
              <Text style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>ปีงบประมาณ</Text>
              <Select
                value={fiscalYear}
                onChange={setFiscalYear}
                style={{ width: 130 }}
                options={[
                  { value: 2569, label: 'พ.ศ. 2569' },
                  { value: 2568, label: 'พ.ศ. 2568' },
                ]}
              />
            </div>
            <div>
              <Text style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>ช่วงเดือน</Text>
              <Select
                value={fiscalMonth}
                onChange={setFiscalMonth}
                style={{ width: 220 }}
                options={FISCAL_MONTHS}
              />
            </div>
            <div>
              <Text style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>มุมมอง / บทบาท</Text>
              <Select
                value={role}
                onChange={handleRoleChange}
                style={{ width: 200 }}
                options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </div>
            {role !== 'hr' && (
              <div>
                <Text style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  {role === 'mission' ? 'ภารกิจ' : role === 'group' ? 'กลุ่มงาน' : 'หน่วยงาน'}
                </Text>
                <Select
                  value={scope}
                  onChange={setScope}
                  allowClear
                  placeholder="(ทั้งหมด)"
                  style={{ width: 220 }}
                  options={SCOPE_OPTIONS[role]}
                />
              </div>
            )}
          </div>
        </Card>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <Row gutter={[12, 12]} className="mb-3">
          {[
            { label: 'ลาพักผ่อน',  value: vacationDays,  icon: <FaUmbrellaBeach />, gradient: 'linear-gradient(to right, #064e3b, #059669)' },
            { label: 'ลาป่วย',     value: sickDays,      icon: <FaUserMd />,        gradient: 'linear-gradient(to right, #7c2d12, #ea580c)' },
            { label: 'ลากิจ',      value: personalDays,  icon: <FaBriefcase />,     gradient: 'linear-gradient(to right, #1e3a5f, #3b82f6)' },
            { label: 'ลาคลอดบุตร', value: maternityDays, icon: <FaBaby />,          gradient: 'linear-gradient(to right, #581c87, #a855f7)' },
          ].map(({ label, value, icon, gradient }) => (
            <Col xs={12} md={6} key={label}>
              <Card
                variant="borderless"
                className="rounded-xl"
                styles={{ body: { padding: '12px 16px' } }}
                style={{ background: gradient, boxShadow: '0 2px 10px rgba(0,0,0,0.3)', transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)' }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                      {value} <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.75)' }}>วัน</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{label} (อนุมัติ)</span>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>


        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <Tabs
          defaultActiveKey="pivot"
          type="card"
          items={[
            {
              key: 'pivot',
              label: <span style={{ color: '#34d399' }}><FaChartBar className="inline mr-2" />สรุปรายหน่วยงาน</span>,
              children: (
                <Card variant="borderless" className="rounded-xl" style={{ background: 'linear-gradient(135deg, #082820 0%, #0d1f1c 100%)', borderTop: '3px solid #006a5a' }}>
                  <Title level={5} className="mb-4">
                    จำนวนวันลา (เฉพาะที่อนุมัติแล้ว) จำแนกตามหน่วยงานและประเภท
                  </Title>
                  {pivotData.length === 0
                    ? <Empty description="ไม่มีข้อมูลในช่วงที่เลือก" />
                    : (
                      <Table
                        columns={pivotColumns}
                        dataSource={[
                          ...pivotData,
                          // แถวรวม
                          (() => {
                            const total: Record<string, any> = { key: '__total', department: 'รวมทั้งสิ้น' }
                            let grand = 0
                            LEAVE_TYPES.forEach(lt => {
                              const d = pivotData.reduce((a, r) => a + (r[lt] || 0), 0)
                              total[lt] = d
                              grand += d
                            })
                            total['รวม'] = grand
                            return total
                          })()
                        ]}
                        rowKey="key"
                        pagination={false}
                        scroll={{ x: 700 }}
                        rowClassName={(r) => r.key === '__total' ? 'font-bold bg-slate-700' : ''}
                      />
                    )
                  }
                </Card>
              )
            },
            {
              key: 'person',
              label: <span style={{ color: '#60a5fa' }}><FaUsers className="inline mr-2" />สรุปรายบุคคล</span>,
              children: (
                <Card variant="borderless" className="rounded-xl" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1a30 100%)', borderTop: '3px solid #2563eb' }}>
                  <Title level={5} className="mb-4">
                    จำนวนวันลา (เฉพาะที่อนุมัติแล้ว) จำแนกตามบุคลากร
                  </Title>
                  {personData.length === 0
                    ? <Empty description="ไม่มีข้อมูลในช่วงที่เลือก" />
                    : (
                      <Table
                        columns={personColumns}
                        dataSource={personData}
                        rowKey="key"
                        pagination={{ pageSize: 15, showTotal: (t) => `ทั้งหมด ${t} คน` }}
                        scroll={{ x: 800 }}
                      />
                    )
                  }
                </Card>
              )
            },
            {
              key: 'detail',
              label: <span style={{ color: '#94a3b8' }}><FileTextOutlined className="mr-2" />รายการทั้งหมด</span>,
              children: (
                <Card variant="borderless" className="rounded-xl" style={{ background: 'linear-gradient(135deg, #131b2a 0%, #161e2c 100%)', borderTop: '3px solid #475569' }}>
                  <div className="flex justify-between items-center mb-4">
                    <Title level={5} className="m-0">รายการขอลาทั้งหมด ({filtered.length} รายการ)</Title>
                    <Space>
                      <Tag icon={<CheckCircleOutlined />} color="success">
                        อนุมัติ {approved.length}
                      </Tag>
                      <Tag icon={<ClockCircleOutlined />} color="warning">
                        รออนุมัติ {pendingCount}
                      </Tag>
                      <Tag icon={<CloseCircleOutlined />} color="error">
                        ไม่อนุมัติ {rejectedCount}
                      </Tag>
                    </Space>
                  </div>
                  {filtered.length === 0
                    ? <Empty description="ไม่มีข้อมูลในช่วงที่เลือก" />
                    : (
                      <Table
                        columns={detailColumns}
                        dataSource={filtered}
                        rowKey="id"
                        pagination={{
                          pageSize: 10,
                          showTotal: (t) => `ทั้งหมด ${t} รายการ`
                        }}
                        scroll={{ x: 900 }}
                      />
                    )
                  }
                </Card>
              )
            },
            {
              key: 'top100',
              label: <span style={{ color: '#fbbf24' }}><FaMedal className="inline mr-2" />Top 100 ลาบ่อย</span>,
              children: (() => {
                const TOP_TYPES = ['รวมทั้งหมด', 'ลากิจ', 'ลาพักผ่อน', 'ลาป่วย', 'ลาคลอด']
                const sortKey = topType === 'รวมทั้งหมด' ? 'รวม' : topType
                const top100 = [...personData]
                  .sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0))
                  .slice(0, 100)
                  .map((r, i) => ({ ...r, rank: i + 1 }))

                const MEDAL_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }

                const top100Columns = [
                  {
                    title: '#', dataIndex: 'rank', key: 'rank', width: 52, align: 'center' as const,
                    render: (rank: number) => (
                      <span style={{
                        fontWeight: 700,
                        fontSize: rank <= 3 ? 16 : 13,
                        color: MEDAL_COLORS[rank] ?? '#94a3b8',
                      }}>
                        {rank <= 3 ? '🏅' : ''}{rank}
                      </span>
                    )
                  },
                  {
                    title: 'ชื่อ-สกุล', dataIndex: 'employeeName', key: 'employeeName',
                    render: (t: string, r: any) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{t}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.department}</div>
                      </div>
                    )
                  },
                  {
                    title: <Tag color="blue">ลากิจ</Tag>,
                    dataIndex: 'ลากิจ', key: 'ลากิจ', align: 'center' as const,
                    render: (v: number) => v > 0
                      ? <Tag color="blue">{v} วัน</Tag>
                      : <span className="text-slate-500">—</span>
                  },
                  {
                    title: <Tag color="green">ลาพักผ่อน</Tag>,
                    dataIndex: 'ลาพักผ่อน', key: 'ลาพักผ่อน', align: 'center' as const,
                    render: (v: number) => v > 0
                      ? <Tag color="green">{v} วัน</Tag>
                      : <span className="text-slate-500">—</span>
                  },
                  {
                    title: <Tag color="volcano">ลาป่วย</Tag>,
                    dataIndex: 'ลาป่วย', key: 'ลาป่วย', align: 'center' as const,
                    render: (v: number) => v > 0
                      ? <Tag color="volcano">{v} วัน</Tag>
                      : <span className="text-slate-500">—</span>
                  },
                  {
                    title: <Tag color="magenta">ลาคลอด</Tag>,
                    dataIndex: 'ลาคลอด', key: 'ลาคลอด', align: 'center' as const,
                    render: (v: number) => v > 0
                      ? <Tag color="magenta">{v} วัน</Tag>
                      : <span className="text-slate-500">—</span>
                  },
                  {
                    title: 'รวม', dataIndex: 'รวม', key: 'รวม', align: 'center' as const,
                    render: (v: number) => <Tag color="geekblue" style={{ fontWeight: 700 }}>{v} วัน</Tag>
                  },
                ]

                return (
                  <Card variant="borderless" className="rounded-xl" style={{ background: 'linear-gradient(135deg, #1e1408 0%, #1a1208 100%)', borderTop: '3px solid #d97706' }}>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                      <div>
                        <Title level={5} className="m-0">Top 100 บุคลากรที่ลามากที่สุด</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          เรียงตามวันลาที่อนุมัติแล้ว · {personData.length} คนในช่วงที่เลือก
                        </Text>
                      </div>
                      <div>
                        <Text style={{ fontSize: 12, color: '#94a3b8', marginRight: 8 }}>เรียงตาม:</Text>
                        <Segmented
                          value={topType}
                          onChange={v => setTopType(v as string)}
                          options={TOP_TYPES}
                          size="small"
                        />
                      </div>
                    </div>
                    {top100.length === 0
                      ? <Empty description="ไม่มีข้อมูลในช่วงที่เลือก" />
                      : (
                        <Table
                          columns={top100Columns}
                          dataSource={top100}
                          rowKey="key"
                          pagination={{ pageSize: 20, showTotal: t => `แสดง ${t} รายการ` }}
                          scroll={{ x: 750 }}
                          rowClassName={(_, i) => i < 3 ? 'font-semibold' : ''}
                        />
                      )
                    }
                  </Card>
                )
              })()
            },
          ]}
        />
      </div>
    </div>
  )
}

// ─── Page Wrapper ─────────────────────────────────────────────────────────────
const LeaveSummaryPage = () => (
  <ConfigProvider
    theme={{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#006a5a',
        borderRadius: 8,
        fontFamily: 'var(--font-sarabun)',
      },
    }}
  >
    <App>
      <LeaveSummaryPageContent />
    </App>
  </ConfigProvider>
)

export default LeaveSummaryPage
