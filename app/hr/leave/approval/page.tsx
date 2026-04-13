'use client'
import { useState } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, ConfigProvider, App,
  Button, Modal, Form, Input, Steps, Timeline, Descriptions,
  Row, Col, Divider, Space, Alert, Select, Badge, Calendar, Segmented, theme
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  HomeOutlined, FileTextOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, AuditOutlined,
  EyeOutlined, UserOutlined, CalendarOutlined, UnorderedListOutlined
} from '@ant-design/icons'
import { FaUmbrellaBeach, FaUserMd, FaBriefcase, FaBaby, FaCheckDouble } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography

type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'waiting'

interface ApprovalStep {
  level: string
  actor: string
  status: ApprovalStatus
  timestamp?: string
  note?: string
}

interface LeaveApprovalRequest {
  id: string
  employeeName: string
  shortName: string      // ชื่อสั้นสำหรับแสดงบนปฏิทิน
  department: string
  position: string
  leaveType: string
  startISO: string       // YYYY-MM-DD
  endISO: string
  totalDays: number
  reason: string
  color: string          // สีประจำตัวบนปฏิทิน
  approvalChain: ApprovalStep[]
}

// ─── Helper: สถานะรวม ───────────────────────────────────────────────────────
const getOverall = (chain: ApprovalStep[]): ApprovalStatus => {
  if (chain.some(s => s.status === 'rejected')) return 'rejected'
  if (chain.every(s => s.status === 'approved')) return 'approved'
  return 'pending'
}

const getCurrentStep = (chain: ApprovalStep[]): number => {
  const idx = chain.findIndex(s => s.status === 'pending')
  return idx === -1 ? chain.length : idx
}

const isOnLeave = (date: Dayjs, r: LeaveApprovalRequest) => {
  const d = date.format('YYYY-MM-DD')
  return d >= r.startISO && d <= r.endISO
}

const fmtThai = (iso: string) =>
  dayjs(iso).locale('th').format('DD/MM/') + String(dayjs(iso).year() + 543)

// ─── Mock Data ───────────────────────────────────────────────────────────────
const COLORS = ['#006a5a','#3b82f6','#f59e0b','#7c3aed','#ef4444','#ec4899','#14b8a6','#f97316']

const mockData: LeaveApprovalRequest[] = [
  {
    id: 'LV-202604001',
    employeeName: 'นางสาวสมศรี ใจดีงาม',
    shortName: 'สมศรี',
    department: 'งานการพยาบาล OPD',
    position: 'พยาบาลวิชาชีพชำนาญการ',
    leaveType: 'ลาป่วย',
    startISO: '2026-04-14',
    endISO:   '2026-04-15',
    totalDays: 2,
    reason: 'ไข้หวัดใหญ่ มีใบรับรองแพทย์แนบ',
    color: COLORS[0],
    approvalChain: [
      { level: 'หัวหน้าหน่วยงาน', actor: 'นางมณีรัตน์ หัวหน้าพยาบาล',              status: 'approved', timestamp: '10/04/2569 09:30', note: 'อนุมัติ' },
      { level: 'หัวหน้ากลุ่มงาน', actor: 'นพ.วิสุทธิ์ ผู้อำนวยการด้านการแพทย์',   status: 'pending' },
      { level: 'หัวหน้าภารกิจ',   actor: 'นพ.สมชาย ผู้อำนวยการโรงพยาบาล',        status: 'waiting' },
    ]
  },
  {
    id: 'LV-202604002',
    employeeName: 'นายวิชัย กล้าดี',
    shortName: 'วิชัย',
    department: 'งานเวชระเบียน',
    position: 'เจ้าพนักงานเวชสถิติ',
    leaveType: 'ลาพักผ่อน',
    startISO: '2026-04-20',
    endISO:   '2026-04-24',
    totalDays: 5,
    reason: 'พักผ่อนประจำปี ท่องเที่ยวกับครอบครัว',
    color: COLORS[1],
    approvalChain: [
      { level: 'หัวหน้าหน่วยงาน', actor: 'นางสาวสุดา หัวหน้าเวชระเบียน',           status: 'approved', timestamp: '09/04/2569 14:00' },
      { level: 'หัวหน้ากลุ่มงาน', actor: 'นายสมศักดิ์ ผู้จัดการฝ่ายบริหาร',        status: 'approved', timestamp: '10/04/2569 08:45' },
      { level: 'หัวหน้าภารกิจ',   actor: 'นพ.สมชาย ผู้อำนวยการโรงพยาบาล',        status: 'pending' },
    ]
  },
  {
    id: 'LV-202604003',
    employeeName: 'นางสาวจิตรา รักการงาน',
    shortName: 'จิตรา',
    department: 'งานการเงิน',
    position: 'นักวิชาการเงินและบัญชี',
    leaveType: 'ลากิจ',
    startISO: '2026-04-12',
    endISO:   '2026-04-12',
    totalDays: 1,
    reason: 'ติดต่อราชการส่วนตัวที่จังหวัด',
    color: COLORS[2],
    approvalChain: [
      { level: 'หัวหน้าหน่วยงาน', actor: 'นายสมบัติ หัวหน้าการเงิน',               status: 'rejected', timestamp: '08/04/2569 10:15', note: 'ช่วงนั้นติดงานปิดงบ ขอเลื่อนวันได้หรือไม่' },
      { level: 'หัวหน้ากลุ่มงาน', actor: 'นายสมศักดิ์ ผู้จัดการฝ่ายบริหาร',        status: 'waiting' },
      { level: 'หัวหน้าภารกิจ',   actor: 'นพ.สมชาย ผู้อำนวยการโรงพยาบาล',        status: 'waiting' },
    ]
  },
  {
    id: 'LV-202603001',
    employeeName: 'นางรัตนา มีสุข',
    shortName: 'รัตนา',
    department: 'งานห้องผ่าตัด',
    position: 'พยาบาลวิชาชีพ',
    leaveType: 'ลาคลอด',
    startISO: '2026-03-01',
    endISO:   '2026-05-29',
    totalDays: 90,
    reason: 'ลาคลอดบุตรตามสิทธิ์ราชการ',
    color: COLORS[3],
    approvalChain: [
      { level: 'หัวหน้าหน่วยงาน', actor: 'นางมณีรัตน์ หัวหน้าพยาบาล',              status: 'approved', timestamp: '20/02/2569 09:00' },
      { level: 'หัวหน้ากลุ่มงาน', actor: 'นพ.วิสุทธิ์ ผู้อำนวยการด้านการแพทย์',   status: 'approved', timestamp: '21/02/2569 11:30' },
      { level: 'หัวหน้าภารกิจ',   actor: 'นพ.สมชาย ผู้อำนวยการโรงพยาบาล',        status: 'approved', timestamp: '22/02/2569 08:00' },
    ]
  },
  // เพิ่มข้อมูลเสริมให้ปฏิทินดูมีชีวิตชีวา
  {
    id: 'LV-202604004',
    employeeName: 'นายอนุชา สุขใจ',
    shortName: 'อนุชา',
    department: 'งานการพยาบาล OPD',
    position: 'พยาบาลวิชาชีพ',
    leaveType: 'ลาพักผ่อน',
    startISO: '2026-04-21',
    endISO:   '2026-04-23',
    totalDays: 3,
    reason: 'พักผ่อนประจำปี',
    color: COLORS[4],
    approvalChain: [
      { level: 'หัวหน้าหน่วยงาน', actor: 'นางมณีรัตน์ หัวหน้าพยาบาล', status: 'approved', timestamp: '11/04/2569 10:00' },
      { level: 'หัวหน้ากลุ่มงาน', actor: 'นพ.วิสุทธิ์ ผู้อำนวยการด้านการแพทย์', status: 'pending' },
      { level: 'หัวหน้าภารกิจ',   actor: 'นพ.สมชาย ผู้อำนวยการโรงพยาบาล', status: 'waiting' },
    ]
  },
  {
    id: 'LV-202604005',
    employeeName: 'นางสาวพิมพ์ใจ ดีเลิศ',
    shortName: 'พิมพ์ใจ',
    department: 'งานเวชระเบียน',
    position: 'เจ้าพนักงานสาธารณสุข',
    leaveType: 'ลาป่วย',
    startISO: '2026-04-22',
    endISO:   '2026-04-22',
    totalDays: 1,
    reason: 'ปวดหัว มีไข้ต่ำ',
    color: COLORS[5],
    approvalChain: [
      { level: 'หัวหน้าหน่วยงาน', actor: 'นางสาวสุดา หัวหน้าเวชระเบียน', status: 'approved', timestamp: '22/04/2569 07:30' },
      { level: 'หัวหน้ากลุ่มงาน', actor: 'นายสมศักดิ์ ผู้จัดการฝ่ายบริหาร', status: 'approved', timestamp: '22/04/2569 08:00' },
      { level: 'หัวหน้าภารกิจ',   actor: 'นพ.สมชาย ผู้อำนวยการโรงพยาบาล', status: 'approved', timestamp: '22/04/2569 09:00' },
    ]
  },
  {
    id: 'LV-202604006',
    employeeName: 'นายธนกร มั่นคง',
    shortName: 'ธนกร',
    department: 'งานการเงิน',
    position: 'นักวิชาการเงินและบัญชี',
    leaveType: 'ลากิจ',
    startISO: '2026-04-17',
    endISO:   '2026-04-18',
    totalDays: 2,
    reason: 'ธุระส่วนตัวด่วน',
    color: COLORS[6],
    approvalChain: [
      { level: 'หัวหน้าหน่วยงาน', actor: 'นายสมบัติ หัวหน้าการเงิน', status: 'approved', timestamp: '15/04/2569 14:00' },
      { level: 'หัวหน้ากลุ่มงาน', actor: 'นายสมศักดิ์ ผู้จัดการฝ่ายบริหาร', status: 'pending' },
      { level: 'หัวหน้าภารกิจ',   actor: 'นพ.สมชาย ผู้อำนวยการโรงพยาบาล', status: 'waiting' },
    ]
  },
]

// ─── Tag Helpers ──────────────────────────────────────────────────────────────
const leaveTypeColor: Record<string, string> = {
  'ลาป่วย': 'volcano', 'ลาพักผ่อน': 'green', 'ลากิจ': 'blue', 'ลาคลอด': 'magenta',
}
const leaveTypeIcon: Record<string, React.ReactNode> = {
  'ลาป่วย':     <FaUserMd className="inline mr-1" />,
  'ลาพักผ่อน': <FaUmbrellaBeach className="inline mr-1" />,
  'ลากิจ':     <FaBriefcase className="inline mr-1" />,
  'ลาคลอด':   <FaBaby className="inline mr-1" />,
}

const statusTag = (s: ApprovalStatus) => {
  if (s === 'approved') return <Tag icon={<CheckCircleOutlined />} color="success">อนุมัติ</Tag>
  if (s === 'rejected') return <Tag icon={<CloseCircleOutlined />} color="error">ไม่อนุมัติ</Tag>
  if (s === 'pending')  return <Tag icon={<ClockCircleOutlined />} color="warning">รออนุมัติ</Tag>
  return <Tag color="default">รอคิว</Tag>
}

const overallTag = (s: ApprovalStatus) => {
  if (s === 'approved') return <Tag color="success">อนุมัติครบทุกระดับ</Tag>
  if (s === 'rejected') return <Tag icon={<CloseCircleOutlined />} color="error">ไม่อนุมัติ</Tag>
  return <Tag icon={<ClockCircleOutlined />} color="processing">อยู่ระหว่างอนุมัติ</Tag>
}

// ─── Main Component ───────────────────────────────────────────────────────────
const LeaveApprovalContent = () => {
  const { message } = App.useApp()
  const [requests, setRequests] = useState<LeaveApprovalRequest[]>(mockData)
  const [selected, setSelected] = useState<LeaveApprovalRequest | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [view, setView] = useState<string>('list')
  const [calMonth, setCalMonth] = useState<Dayjs>(dayjs('2026-04-01'))
  const [rejectForm] = Form.useForm()

  const nowStr = () =>
    new Date().toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const openDetail = (record: LeaveApprovalRequest) => {
    setSelected(record)
    setRejectMode(false)
    rejectForm.resetFields()
  }

  const updateSelected = (patch: Partial<LeaveApprovalRequest>) => {
    if (!selected) return
    const next = { ...selected, ...patch }
    setRequests(prev => prev.map(r => r.id === next.id ? next : r))
    setSelected(next)
  }

  const handleApprove = () => {
    if (!selected) return
    const idx = selected.approvalChain.findIndex(s => s.status === 'pending')
    if (idx === -1) return
    const newChain = selected.approvalChain.map((s, i) => {
      if (i === idx) return { ...s, status: 'approved' as ApprovalStatus, timestamp: nowStr(), note: 'อนุมัติ' }
      if (i === idx + 1 && s.status === 'waiting') return { ...s, status: 'pending' as ApprovalStatus }
      return s
    })
    updateSelected({ approvalChain: newChain })
    message.success(`อนุมัติในระดับ "${selected.approvalChain[idx].level}" เรียบร้อยแล้ว`)
    setRejectMode(false)
  }

  const handleReject = () => {
    rejectForm.validateFields().then(values => {
      if (!selected) return
      const idx = selected.approvalChain.findIndex(s => s.status === 'pending')
      if (idx === -1) return
      const newChain = selected.approvalChain.map((s, i) =>
        i === idx ? { ...s, status: 'rejected' as ApprovalStatus, timestamp: nowStr(), note: values.reason } : s
      )
      updateSelected({ approvalChain: newChain })
      rejectForm.resetFields()
      setRejectMode(false)
      message.error('ปฏิเสธคำขอลาเรียบร้อยแล้ว')
    })
  }

  const displayed = requests.filter(r =>
    filterStatus === 'all' ? true : getOverall(r.approvalChain) === filterStatus
  )

  const summary = {
    pending:  requests.filter(r => getOverall(r.approvalChain) === 'pending').length,
    approved: requests.filter(r => getOverall(r.approvalChain) === 'approved').length,
    rejected: requests.filter(r => getOverall(r.approvalChain) === 'rejected').length,
  }

  // ─── Calendar: events on each cell ─────────────────────────────────────────
  const cellRender = (date: Dayjs) => {
    if (date.month() !== calMonth.month()) return null
    const onLeave = requests.filter(r => isOnLeave(date, r))
    if (!onLeave.length) return null
    return (
      <div className="flex flex-col gap-0.5 mt-0.5">
        {onLeave.map(r => (
          <div
            key={r.id}
            style={{
              backgroundColor: r.color,
              borderRadius: 3,
              padding: '1px 5px',
              fontSize: 10,
              color: '#fff',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              cursor: 'pointer',
            }}
            onClick={(e) => { e.stopPropagation(); openDetail(r) }}
            title={`${r.employeeName} — ${r.leaveType}`}
          >
            {r.shortName}
          </div>
        ))}
      </div>
    )
  }

  // เพื่อนร่วมงานที่ลาทับช่วงเวลาเดียวกัน (ใช้ใน modal)
  const getOverlapping = (target: LeaveApprovalRequest) =>
    requests.filter(r =>
      r.id !== target.id &&
      r.department === target.department &&   // เฉพาะหน่วยงานเดียวกัน
      r.startISO <= target.endISO &&
      r.endISO >= target.startISO
    )

  // ─── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'เลขที่ใบลา', dataIndex: 'id', key: 'id',
      render: (v: string, r: LeaveApprovalRequest) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: r.color, flexShrink: 0, display: 'inline-block' }} />
          <Text style={{ color: '#6ee7b7', fontWeight: 600 }}>{v}</Text>
        </span>
      ),
    },
    { title: 'ผู้ขอลา',   dataIndex: 'employeeName', key: 'employeeName' },
    { title: 'หน่วยงาน', dataIndex: 'department',   key: 'department' },
    {
      title: 'ประเภท', dataIndex: 'leaveType', key: 'leaveType',
      render: (v: string) => <Tag color={leaveTypeColor[v] ?? 'default'}>{leaveTypeIcon[v]}{v}</Tag>,
    },
    {
      title: 'ช่วงวันที่', key: 'date',
      render: (_: any, r: LeaveApprovalRequest) => (
        <span>{fmtThai(r.startISO)} – {fmtThai(r.endISO)} <Badge count={`${r.totalDays} วัน`} color="#006a5a" /></span>
      ),
    },
    { title: 'หน.หน่วยงาน', key: 's1', align: 'center' as const, render: (_: any, r: LeaveApprovalRequest) => statusTag(r.approvalChain[0].status) },
    { title: 'หน.กลุ่มงาน', key: 's2', align: 'center' as const, render: (_: any, r: LeaveApprovalRequest) => statusTag(r.approvalChain[1].status) },
    { title: 'หน.ภารกิจ',  key: 's3', align: 'center' as const, render: (_: any, r: LeaveApprovalRequest) => statusTag(r.approvalChain[2].status) },
    { title: 'ภาพรวม', key: 'overall', render: (_: any, r: LeaveApprovalRequest) => overallTag(getOverall(r.approvalChain)) },
    {
      title: 'จัดการ', key: 'action', align: 'center' as const, width: 100,
      render: (_: any, record: LeaveApprovalRequest) => (
        <Button size="small" type="primary" icon={<EyeOutlined />} onClick={() => openDetail(record)}>พิจารณา</Button>
      ),
    },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบงานบุคคล</> },
            { title: 'สถานะอนุมัติการลา' },
          ]}
          className="mb-6"
        />

        <div className="mb-6">
          <Title level={2} className="text-primary m-0">สถานะอนุมัติการลา</Title>
          <Text type="secondary">ตรวจสอบและดำเนินการอนุมัติใบลาบุคลากรตามลำดับชั้น</Text>
        </div>

        {/* Summary cards */}
        <Row gutter={[12, 12]} className="mb-6">
          {[
            { label: 'อยู่ระหว่างอนุมัติ', count: summary.pending,  filter: 'pending',  icon: <ClockCircleOutlined />,  gradient: 'linear-gradient(to right, #78350f, #d97706)' },
            { label: 'อนุมัติครบแล้ว',     count: summary.approved, filter: 'approved', icon: <CheckCircleOutlined />,  gradient: 'linear-gradient(to right, #003d33, #006a5a)' },
            { label: 'ไม่อนุมัติ',          count: summary.rejected, filter: 'rejected', icon: <CloseCircleOutlined />, gradient: 'linear-gradient(to right, #7f1d1d, #dc2626)' },
          ].map((s, i) => (
            <Col xs={24} sm={8} key={i}>
              <Card
                variant="borderless"
                className="rounded-xl cursor-pointer"
                styles={{ body: { padding: '14px 18px' } }}
                onClick={() => setFilterStatus(filterStatus === s.filter ? 'all' : s.filter)}
                style={{
                  background: s.gradient,
                  boxShadow: filterStatus === s.filter
                    ? '0 6px 24px rgba(0,0,0,0.45)'
                    : '0 2px 8px rgba(0,0,0,0.25)',
                  transform: filterStatus === s.filter ? 'translateY(-2px)' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.85)' }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{s.count}</div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{s.label}</span>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* View toggle + filter */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Text type="secondary">กรองสถานะ:</Text>
            <Select
              value={filterStatus} onChange={setFilterStatus} style={{ width: 200 }}
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'pending', label: 'อยู่ระหว่างอนุมัติ' },
                { value: 'approved', label: 'อนุมัติครบแล้ว' },
                { value: 'rejected', label: 'ไม่อนุมัติ' },
              ]}
            />
          </div>
          <Segmented
            value={view}
            onChange={v => setView(v as string)}
            options={[
              { label: <span><UnorderedListOutlined className="mr-1" />รายการ</span>, value: 'list' },
              { label: <span><CalendarOutlined className="mr-1" />ปฏิทิน</span>,  value: 'calendar' },
            ]}
          />
        </div>

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <Card variant="borderless" className="rounded-xl">
            <Table
              columns={columns} dataSource={displayed} rowKey="id"
              pagination={{ pageSize: 10, showTotal: t => `ทั้งหมด ${t} รายการ` }}
              scroll={{ x: 1350 }}
            />
          </Card>
        )}

        {/* ── CALENDAR VIEW ── */}
        {view === 'calendar' && (
          <Row gutter={16}>
            <Col xs={24} xl={18}>
              <Card variant="borderless" className="rounded-xl overflow-hidden">
                <Calendar
                  value={calMonth}
                  onPanelChange={v => setCalMonth(v)}
                  cellRender={cellRender}
                  style={{ background: 'transparent' }}
                />
              </Card>
            </Col>

            {/* Legend */}
            <Col xs={24} xl={6}>
              <Card variant="borderless" className="rounded-xl" title={<Text strong>ผู้ลาในเดือนนี้</Text>}>
                {requests
                  .filter(r => {
                    const mStart = calMonth.startOf('month').format('YYYY-MM-DD')
                    const mEnd   = calMonth.endOf('month').format('YYYY-MM-DD')
                    return r.startISO <= mEnd && r.endISO >= mStart
                  })
                  .map(r => (
                    <div
                      key={r.id}
                      className="flex items-start gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openDetail(r)}
                    >
                      <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: r.color, flexShrink: 0, marginTop: 3 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.employeeName}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {r.leaveType} · {fmtThai(r.startISO)}–{fmtThai(r.endISO)}
                        </div>
                        <div style={{ marginTop: 2 }}>{overallTag(getOverall(r.approvalChain))}</div>
                      </div>
                    </div>
                  ))
                }
                {requests.filter(r => {
                  const mStart = calMonth.startOf('month').format('YYYY-MM-DD')
                  const mEnd   = calMonth.endOf('month').format('YYYY-MM-DD')
                  return r.startISO <= mEnd && r.endISO >= mStart
                }).length === 0 && (
                  <Text type="secondary">ไม่มีการลาในเดือนนี้</Text>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </div>

      {/* ─── Modal พิจารณา ─── */}
      <Modal
        title={<span style={{ color: '#6ee7b7' }}><AuditOutlined className="mr-2" />พิจารณาใบลา: {selected?.id}</span>}
        open={!!selected}
        onCancel={() => { setSelected(null); setRejectMode(false) }}
        width="80%"
        footer={null}
      >
        {selected && (() => {
          const overall    = getOverall(selected.approvalChain)
          const step       = getCurrentStep(selected.approvalChain)
          const pendingIdx = selected.approvalChain.findIndex(s => s.status === 'pending')
          const canAct     = pendingIdx !== -1
          const overlapping = getOverlapping(selected)

          return (
            <div className="mt-4">
              {/* Steps */}
              <Steps
                current={step}
                status={overall === 'rejected' ? 'error' : overall === 'approved' ? 'finish' : 'process'}
                items={selected.approvalChain.map(s => ({ title: s.level, description: s.actor }))}
                className="mb-6"
              />

              {/* Details */}
              <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small" className="mb-4">
                <Descriptions.Item label="ผู้ขอลา"><UserOutlined className="mr-1" />{selected.employeeName}</Descriptions.Item>
                <Descriptions.Item label="หน่วยงาน">{selected.department}</Descriptions.Item>
                <Descriptions.Item label="ตำแหน่ง">{selected.position}</Descriptions.Item>
                <Descriptions.Item label="ประเภทการลา">
                  <Tag color={leaveTypeColor[selected.leaveType] ?? 'default'}>{leaveTypeIcon[selected.leaveType]}{selected.leaveType}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="วันที่ลา">{fmtThai(selected.startISO)} – {fmtThai(selected.endISO)}</Descriptions.Item>
                <Descriptions.Item label="จำนวนวัน">
                  <Text style={{ color: '#6ee7b7', fontWeight: 700 }}>{selected.totalDays} วัน</Text>
                </Descriptions.Item>
                <Descriptions.Item label="เหตุผล" span={3}>{selected.reason}</Descriptions.Item>
              </Descriptions>

              {/* ── ปฏิทินช่วงวันลา + เพื่อนร่วมงาน ── */}
              <Divider style={{ borderColor: '#334155' }}>
                <CalendarOutlined className="mr-2" />เปรียบเทียบวันลากับเพื่อนร่วมงาน
              </Divider>

              {overlapping.length > 0 ? (
                <>
                  <Alert
                    title={`มีเจ้าหน้าที่ ${overlapping.length} คน ลาทับช่วงเวลาเดียวกัน`}
                    type="warning"
                    showIcon
                    className="mb-4"
                  />
                  {/* Visual date strip */}
                  <div className="mb-4 overflow-x-auto">
                    {(() => {
                      const start  = dayjs(selected.startISO)
                      const end    = dayjs(selected.endISO)
                      // แสดงช่วง ±3 วันรอบๆ
                      const dispStart = start.subtract(3, 'day')
                      const dispEnd   = end.add(3, 'day')
                      const days: Dayjs[] = []
                      let cur = dispStart
                      while (!cur.isAfter(dispEnd)) { days.push(cur); cur = cur.add(1, 'day') }
                      const allPeople = [selected, ...overlapping]
                      return (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ borderCollapse: 'collapse', minWidth: days.length * 44 }}>
                            <thead>
                              <tr>
                                <td style={{ width: 120, fontSize: 11, color: '#94a3b8', paddingRight: 8, whiteSpace: 'nowrap' }}>ชื่อเจ้าหน้าที่</td>
                                {days.map(d => (
                                  <td key={d.format('YYYYMMDD')} style={{ width: 40, textAlign: 'center', fontSize: 10, color: '#94a3b8', padding: '2px 2px 6px' }}>
                                    <div style={{ fontWeight: d.isSame(dayjs(), 'day') ? 700 : 400 }}>{d.format('D')}</div>
                                    <div style={{ color: '#475569', fontSize: 9 }}>{['อา','จ','อ','พ','พฤ','ศ','ส'][d.day()]}</div>
                                  </td>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {allPeople.map(p => (
                                <tr key={p.id}>
                                  <td style={{ fontSize: 11, color: p.id === selected.id ? '#fff' : '#cbd5e1', paddingRight: 8, fontWeight: p.id === selected.id ? 700 : 400, whiteSpace: 'nowrap' }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: p.color, marginRight: 5 }} />
                                    {p.shortName}
                                  </td>
                                  {days.map(d => {
                                    const onL = isOnLeave(d, p)
                                    const isSel = p.id === selected.id
                                    return (
                                      <td key={d.format('YYYYMMDD')} style={{ padding: '2px', textAlign: 'center' }}>
                                        {onL && (
                                          <div style={{
                                            height: 22,
                                            borderRadius: 4,
                                            backgroundColor: p.color,
                                            opacity: isSel ? 1 : 0.6,
                                            border: isSel ? `2px solid ${p.color}` : 'none',
                                            boxShadow: isSel ? `0 0 6px ${p.color}60` : 'none',
                                          }} />
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </div>

                  {/* รายชื่อที่ทับ */}
                  <div className="flex flex-col gap-2">
                    {overlapping.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: r.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 13 }}>{r.employeeName}</Text>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{r.department}</Text>
                        </div>
                        <Tag color={leaveTypeColor[r.leaveType] ?? 'default'} style={{ fontSize: 11 }}>{r.leaveType}</Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>{fmtThai(r.startISO)}–{fmtThai(r.endISO)}</Text>
                        {overallTag(getOverall(r.approvalChain))}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Alert title="ไม่มีเพื่อนร่วมงานลาทับช่วงเวลาเดียวกัน" type="success" showIcon className="mb-2" />
              )}

              {/* Timeline */}
              <Divider style={{ borderColor: '#334155' }}>ประวัติการอนุมัติ</Divider>
              <Timeline
                items={selected.approvalChain.map(s => ({
                  color: s.status === 'approved' ? 'green' : s.status === 'rejected' ? 'red' : s.status === 'pending' ? 'blue' : 'gray',
                  children: (
                    <div>
                      <Text strong>{s.level}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{s.timestamp}</Text>
                      <div><Text type="secondary">{s.actor}</Text><span className="mx-2">—</span>{statusTag(s.status)}</div>
                      {s.note && s.note !== 'อนุมัติ' && <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 2 }}>{s.note}</div>}
                    </div>
                  ),
                }))}
              />

              {/* Action Zone */}
              <Divider style={{ borderColor: '#334155' }}>การดำเนินการ</Divider>

              {canAct && !rejectMode && (
                <Alert
                  title={`รอการพิจารณา: ${selected.approvalChain[pendingIdx].level}`}
                  description={`ผู้อนุมัติ: ${selected.approvalChain[pendingIdx].actor}`}
                  type="warning" showIcon className="mb-0"
                  action={
                    <Space direction="vertical">
                      <Button block type="primary" icon={<CheckCircleOutlined />} onClick={handleApprove}>อนุมัติ</Button>
                      <Button block danger icon={<CloseCircleOutlined />} onClick={() => setRejectMode(true)}>ไม่อนุมัติ</Button>
                    </Space>
                  }
                />
              )}

              {canAct && rejectMode && (
                <Form form={rejectForm} layout="vertical">
                  <Form.Item name="reason" label="เหตุผลที่ไม่อนุมัติ" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
                    <Input.TextArea rows={3} placeholder="ระบุเหตุผล..." />
                  </Form.Item>
                  <Space>
                    <Button danger icon={<CloseCircleOutlined />} onClick={handleReject}>ยืนยันการปฏิเสธ</Button>
                    <Button onClick={() => setRejectMode(false)}>ยกเลิก</Button>
                  </Space>
                </Form>
              )}

              {!canAct && overall === 'approved' && <Alert title="อนุมัติครบทุกระดับแล้ว" type="success" showIcon />}
              {!canAct && overall === 'rejected' && (
                <Alert
                  title="คำขอนี้ถูกปฏิเสธ"
                  description={selected.approvalChain.find(s => s.status === 'rejected')?.note}
                  type="error" showIcon
                />
              )}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

const LeaveApprovalPage = () => (
  <ConfigProvider
    theme={{
      algorithm: theme.darkAlgorithm,
      token: { colorPrimary: '#006a5a', borderRadius: 8, fontFamily: 'var(--font-sarabun)' },
    }}
  >
    <App>
      <LeaveApprovalContent />
    </App>
  </ConfigProvider>
)

export default LeaveApprovalPage
