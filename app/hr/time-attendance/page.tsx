'use client'
import { useState, useMemo } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, ConfigProvider, App,
  DatePicker, Select, Button, Modal, Space, Spin, theme, Row, Col, Tooltip
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, FilePdfOutlined,
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
  ClockCircleOutlined, CalendarOutlined, FilterOutlined,
  ClearOutlined
} from '@ant-design/icons'
import { FaUsersCog, FaUserClock, FaFilter } from 'react-icons/fa'
import dayjs, { Dayjs } from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import dynamic from 'next/dynamic'
import Navbar from '@/app/components/Navbar'
import type { AttendanceDayRecord, AttendanceEmployee, AttendanceReportData } from '@/app/components/AttendancePDF'

dayjs.extend(isBetween)

const { Title, Text } = Typography
const { RangePicker } = DatePicker

// ─── Lazy-load PDF viewer (no SSR) ───────────────────────────────────────────
const AttendancePDFViewer = dynamic(
  () => import('@/app/components/AttendancePDF'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Spin size="large" />
        <Text type="secondary">กำลังสร้าง PDF...</Text>
      </div>
    ),
  }
)

// ─── Constants ────────────────────────────────────────────────────────────────
const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_MONTHS = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

const MOCK_EMPLOYEES: AttendanceEmployee[] = [
  { id: 'EMP-001', name: 'นายสมชาย ใจดี',        position: 'นักทรัพยากรบุคคล',         department: 'งาน HR',            group: 'กลุ่มอำนวยการ' },
  { id: 'EMP-002', name: 'นางสาวสมศรี ใจดีงาม',  position: 'พยาบาลวิชาชีพชำนาญการ',   department: 'งานการพยาบาล OPD', group: 'กลุ่มการพยาบาล' },
  { id: 'EMP-003', name: 'นายวิชัย กล้าดี',       position: 'เจ้าพนักงานเวชสถิติ',      department: 'งานเวชระเบียน',    group: 'กลุ่มบริการสุขภาพ' },
  { id: 'EMP-004', name: 'นางรัตนา มีสุข',        position: 'พยาบาลวิชาชีพ',           department: 'งานห้องผ่าตัด',   group: 'กลุ่มการพยาบาล' },
  { id: 'EMP-005', name: 'นายธนกร มั่นคง',        position: 'นักวิชาการเงินและบัญชี',   department: 'งานการเงิน',       group: 'กลุ่มอำนวยการ' },
]

// ─── Mock data patterns ──────────────────────────────────────────────────────
type StatusType = AttendanceDayRecord['status']

const SPECIAL: Record<string, Partial<AttendanceDayRecord>> = {
  '2026-4-3':  { status: 'late',            checkIn: '08:52', checkOut: '17:10', lateMinutes: 22,  workHours: 7.7, remark: 'รถติด' },
  '2026-4-6':  { status: 'holiday',         remark: 'วันจักรี' },
  '2026-4-8':  { status: 'leave-sick',      remark: 'ลาป่วย มีใบรับรองแพทย์' },
  '2026-4-9':  { status: 'leave-sick',      remark: 'ลาป่วย ต่อเนื่อง' },
  '2026-4-13': { status: 'holiday',         remark: 'วันสงกรานต์' },
  '2026-4-14': { status: 'holiday',         remark: 'วันสงกรานต์' },
  '2026-4-15': { status: 'holiday',         remark: 'วันสงกรานต์' },
  '2026-4-17': { status: 'late',            checkIn: '09:15', checkOut: '17:45', lateMinutes: 45,  workHours: 7.3, remark: '' },
  '2026-4-23': { status: 'leave-vacation',  remark: 'ลาพักผ่อน' },
  '2026-4-24': { status: 'leave-vacation',  remark: 'ลาพักผ่อน' },
  '2026-4-28': { status: 'absent',          remark: 'ขาดงาน ไม่แจ้งล่วงหน้า' },
}

// ─── Record generator ─────────────────────────────────────────────────────────
function generateRecords(selectedMonth: Dayjs): AttendanceDayRecord[] {
  const year = selectedMonth.year()
  const month = selectedMonth.month() + 1
  const count = selectedMonth.daysInMonth()
  const records: AttendanceDayRecord[] = []

  for (let d = 1; d <= count; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const date = dayjs(dateStr)
    const dow = date.day()
    const isWeekend = dow === 0 || dow === 6
    const key = `${year}-${month}-${d}`
    const special = SPECIAL[key]

    let rec: AttendanceDayRecord

    if (isWeekend && !special) {
      rec = {
        date: dateStr, dayNum: d, dayShort: THAI_DAYS_SHORT[dow],
        status: 'holiday',
        remark: dow === 6 ? 'วันเสาร์' : 'วันอาทิตย์',
      }
    } else if (special) {
      rec = {
        date: dateStr, dayNum: d, dayShort: THAI_DAYS_SHORT[dow],
        status: 'normal',
        ...special,
      } as AttendanceDayRecord
    } else {
      const inMin = 20 + (d * 7 % 10)
      const outMin = 30 + (d * 11 % 20)
      const hrs = 8 + (outMin - inMin) / 60
      rec = {
        date: dateStr, dayNum: d, dayShort: THAI_DAYS_SHORT[dow],
        status: 'normal',
        checkIn: `08:${String(inMin).padStart(2, '0')}`,
        checkOut: `16:${String(outMin).padStart(2, '0')}`,
        workHours: Math.round(hrs * 10) / 10,
      }
    }
    records.push(rec)
  }
  return records
}

// ─── Summary calc ─────────────────────────────────────────────────────────────
function calcSummary(records: AttendanceDayRecord[]) {
  const work = records.filter(r => r.status !== 'holiday')
  const normal = work.filter(r => r.status === 'normal').length
  const late = work.filter(r => r.status === 'late').length
  const absent = work.filter(r => r.status === 'absent').length
  const leave = work.filter(r => r.status.startsWith('leave')).length
  const totalHrs = records.reduce((a, r) => a + (r.workHours ?? 0), 0)
  return {
    workDays: work.length,
    normalDays: normal,
    lateDays: late,
    absentDays: absent,
    leaveDays: leave,
    totalWorkHours: Math.round(totalHrs * 10) / 10,
  }
}

// ─── Status Tag ───────────────────────────────────────────────────────────────
const statusTag = (s: StatusType) => {
  const map: Record<StatusType, [string, React.ReactNode]> = {
    normal:           ['success',  <CheckCircleOutlined key="s" />],
    late:             ['warning',  <ClockCircleOutlined key="s" />],
    absent:           ['error',    <CloseCircleOutlined key="s" />],
    'leave-sick':     ['volcano',  <WarningOutlined key="s" />],
    'leave-vacation': ['blue',     <CalendarOutlined key="s" />],
    'leave-personal': ['cyan',     <FileTextOutlined key="s" />],
    holiday:          ['default',  null],
  }
  const labels: Record<StatusType, string> = {
    normal: 'ปกติ', late: 'สาย', absent: 'ขาดงาน',
    'leave-sick': 'ลาป่วย', 'leave-vacation': 'ลาพักผ่อน',
    'leave-personal': 'ลากิจ', holiday: 'วันหยุด',
  }
  const [color, icon] = map[s]
  return <Tag color={color} icon={icon}>{labels[s]}</Tag>
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const TimeAttendanceContent = () => {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs('2026-04-01'))
  const [selectedEmpId, setSelectedEmpId] = useState<string>('EMP-001')
  const [filterGroup, setFilterGroup] = useState<string | null>(null)
  const [filterDept, setFilterDept] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)

  // Unique filter options
  const groupOptions = Array.from(new Set(MOCK_EMPLOYEES.map(e => e.group)))
  const deptOptions = Array.from(new Set(MOCK_EMPLOYEES.map(e => e.department)))

  // Filtered employee list for select
  const filteredEmpList = MOCK_EMPLOYEES.filter(e => {
    if (filterGroup && e.group !== filterGroup) return false
    if (filterDept && e.department !== filterDept) return false
    return true
  })

  const employee = MOCK_EMPLOYEES.find(e => e.id === selectedEmpId)!
  const allRecords = useMemo(() => generateRecords(selectedMonth), [selectedMonth])

  // Filter records by date range
  const records = useMemo(() => {
    if (!dateRange) return allRecords
    const [start, end] = dateRange
    return allRecords.filter(r => {
      const d = dayjs(r.date)
      return d.isBetween(start.startOf('day'), end.endOf('day'), 'day', '[]')
    })
  }, [allRecords, dateRange])

  const summary = useMemo(() => calcSummary(records), [records])
  const monthLabel = `${THAI_MONTHS[selectedMonth.month() + 1]} พ.ศ. ${selectedMonth.year() + 543}`

  const activeFilterCount = [filterGroup, filterDept, dateRange].filter(Boolean).length

  const clearAllFilters = () => {
    setFilterGroup(null)
    setFilterDept(null)
    setDateRange(null)
  }

  // Date range label for PDF
  const dateRangeLabel = dateRange
    ? `${dateRange[0].format('D')} - ${dateRange[1].format('D')} ${monthLabel}`
    : undefined

  const reportData: AttendanceReportData = { employee, monthLabel, dateRangeLabel, records, summary }

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = [
    { title: 'วันทำงาน', value: summary.workDays, suffix: 'วัน', icon: <CalendarOutlined />, color: '#006a5a' },
    { title: 'มาปกติ', value: summary.normalDays, suffix: 'วัน', icon: <CheckCircleOutlined />, color: '#22c55e' },
    { title: 'มาสาย', value: summary.lateDays, suffix: 'วัน', icon: <ClockCircleOutlined />, color: '#f59e0b' },
    { title: 'ขาดงาน', value: summary.absentDays, suffix: 'วัน', icon: <CloseCircleOutlined />, color: '#ef4444' },
    { title: 'วันลา', value: summary.leaveDays, suffix: 'วัน', icon: <FileTextOutlined />, color: '#3b82f6' },
    { title: 'ชั่วโมงรวม', value: summary.totalWorkHours, suffix: 'ชม.', icon: <ClockCircleOutlined />, color: '#7c3aed' },
  ]

  // ── Table columns ───────────────────────────────────────────────────────
  const columns = [
    {
      title: 'วันที่', key: 'date', width: 90,
      render: (_: any, r: AttendanceDayRecord) => (
        <span style={{ color: r.status === 'holiday' ? '#64748b' : undefined }}>
          {r.dayNum} · <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.dayShort}</span>
        </span>
      ),
    },
    {
      title: 'เข้างาน', dataIndex: 'checkIn', key: 'checkIn', align: 'center' as const, width: 90,
      render: (v: string, r: AttendanceDayRecord) => (
        <span style={{ color: r.status === 'late' ? '#d97706' : undefined, fontWeight: r.status === 'late' ? 600 : undefined }}>
          {v ?? '—'}
        </span>
      ),
    },
    {
      title: 'ออกงาน', dataIndex: 'checkOut', key: 'checkOut', align: 'center' as const, width: 90,
      render: (v: string) => v ?? '—',
    },
    {
      title: 'ชม.ทำงาน', dataIndex: 'workHours', key: 'workHours', align: 'center' as const, width: 90,
      render: (v: number) => v != null ? <Tag color="geekblue">{v.toFixed(1)} ชม.</Tag> : '—',
    },
    {
      title: 'สาย (นาที)', dataIndex: 'lateMinutes', key: 'lateMinutes', align: 'center' as const, width: 100,
      render: (v: number) => v ? <Tag color="warning">{v} นาที</Tag> : '—',
    },
    {
      title: 'สถานะ', dataIndex: 'status', key: 'status', align: 'center' as const, width: 120,
      render: (v: StatusType) => statusTag(v),
    },
    {
      title: 'หมายเหตุ', dataIndex: 'remark', key: 'remark',
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
  ]

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-200" style={{ minHeight: '100dvh' }}>
      <Navbar />
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto">

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: 'เวลาเข้าออกงาน' },
          ]}
          className="mb-4"
        />

        {/* ── Header Banner ── */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)',
            border: 'none',
            borderRadius: 16,
            marginBottom: 24,
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={14}>
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center rounded-2xl"
                  style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <FaUserClock className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>บันทึกเวลาเข้า–ออกงาน</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                    ติดตามประวัติการเข้างานรายวัน · {monthLabel}
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={10}>
              <div className="flex gap-3 md:justify-end flex-wrap">
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={() => setPdfOpen(true)}
                  size="large"
                  style={{ backgroundColor: '#fff', color: '#006a5a', border: 'none', fontWeight: 600 }}
                >
                  พิมพ์ PDF
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        {/* ── Stats Cards ── */}
        <Row gutter={[12, 12]} className="mb-6">
          {stats.map((stat, i) => (
            <Col xs={12} sm={8} md={4} key={i}>
              <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: '16px 14px' } }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 42, height: 42, backgroundColor: `${stat.color}18`, color: stat.color, fontSize: 18 }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{stat.title}</Text>
                    <div>
                      <Text strong style={{ fontSize: 24, lineHeight: 1.1 }}>{stat.value}</Text>
                      <Text type="secondary" style={{ fontSize: 11, marginLeft: 3 }}>{stat.suffix}</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Main Table Card ── */}
        <Card
          style={{ borderRadius: 12, border: 'none' }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Toolbar */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-3">
              <div className="flex items-center gap-3">
                <Text strong style={{ fontSize: 16 }}>ข้อมูลการเข้างาน</Text>
                <Tag color="#006a5a" style={{ borderRadius: 12, fontSize: 12, padding: '0 10px' }}>
                  {records.length} วัน
                </Tag>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedEmpId}
                  onChange={setSelectedEmpId}
                  style={{ width: 260 }}
                  options={filteredEmpList.map(e => ({ value: e.id, label: `${e.name} (${e.id})` }))}
                  showSearch
                  optionFilterProp="label"
                  placeholder="เลือกพนักงาน"
                />
                <DatePicker
                  picker="month"
                  value={selectedMonth}
                  onChange={v => { if (v) { setSelectedMonth(v); setDateRange(null) } }}
                  format={(v) => `${THAI_MONTHS[v.month() + 1]} ${v.year() + 543}`}
                  style={{ width: 170 }}
                  allowClear={false}
                />
                <Tooltip title="ตัวกรองเพิ่มเติม">
                  <Button
                    icon={<FaFilter />}
                    onClick={() => setShowFilters(!showFilters)}
                    type={showFilters || activeFilterCount > 0 ? 'primary' : 'default'}
                  >
                    กรอง {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </Button>
                </Tooltip>
              </div>
            </div>

            {/* Filter Row */}
            {showFilters && (
              <div
                className="flex items-center gap-3 flex-wrap p-4 rounded-xl mb-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Text type="secondary" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>กรองตาม:</Text>
                <Select
                  placeholder="กลุ่มงาน"
                  value={filterGroup}
                  onChange={(val) => {
                    setFilterGroup(val)
                    // Reset employee if current one is no longer in filtered list
                    const newList = MOCK_EMPLOYEES.filter(e => {
                      if (val && e.group !== val) return false
                      if (filterDept && e.department !== filterDept) return false
                      return true
                    })
                    if (newList.length > 0 && !newList.find(e => e.id === selectedEmpId)) {
                      setSelectedEmpId(newList[0].id)
                    }
                  }}
                  allowClear
                  style={{ minWidth: 180 }}
                  options={groupOptions.map(v => ({ label: v, value: v }))}
                />
                <Select
                  placeholder="หน่วยงาน"
                  value={filterDept}
                  onChange={(val) => {
                    setFilterDept(val)
                    const newList = MOCK_EMPLOYEES.filter(e => {
                      if (filterGroup && e.group !== filterGroup) return false
                      if (val && e.department !== val) return false
                      return true
                    })
                    if (newList.length > 0 && !newList.find(e => e.id === selectedEmpId)) {
                      setSelectedEmpId(newList[0].id)
                    }
                  }}
                  allowClear
                  style={{ minWidth: 180 }}
                  options={deptOptions.map(v => ({ label: v, value: v }))}
                />
                <RangePicker
                  value={dateRange}
                  onChange={(val) => setDateRange(val as [Dayjs, Dayjs] | null)}
                  format="DD/MM/YYYY"
                  placeholder={['วันเริ่มต้น', 'วันสิ้นสุด']}
                  style={{ minWidth: 250 }}
                />
                {activeFilterCount > 0 && (
                  <Button type="link" size="small" onClick={clearAllFilters} danger icon={<ClearOutlined />}>
                    ล้างทั้งหมด
                  </Button>
                )}
              </div>
            )}

            {/* Employee Info Strip */}
            <div
              className="flex items-center gap-6 flex-wrap px-4 py-3 rounded-lg mt-2"
              style={{ backgroundColor: 'rgba(0,106,90,0.08)', border: '1px solid rgba(0,106,90,0.15)' }}
            >
              <div className="flex items-center gap-2">
                <Text type="secondary" style={{ fontSize: 12 }}>ชื่อ:</Text>
                <Text strong style={{ fontSize: 14 }}>{employee.name}</Text>
              </div>
              <div className="flex items-center gap-2">
                <Text type="secondary" style={{ fontSize: 12 }}>ตำแหน่ง:</Text>
                <Text style={{ fontSize: 13 }}>{employee.position}</Text>
              </div>
              <div className="flex items-center gap-2">
                <Text type="secondary" style={{ fontSize: 12 }}>หน่วยงาน:</Text>
                <Tag color="cyan" style={{ margin: 0, borderRadius: 4 }}>{employee.department}</Tag>
              </div>
              <div className="flex items-center gap-2">
                <Text type="secondary" style={{ fontSize: 12 }}>กลุ่มงาน:</Text>
                <Tag style={{ margin: 0, borderRadius: 4 }}>{employee.group}</Tag>
              </div>
            </div>
          </div>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={records}
            rowKey="date"
            pagination={false}
            size="small"
            scroll={{ x: 750 }}
            rowClassName={(r) => r.status === 'holiday' ? 'opacity-50' : ''}
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          />
        </Card>

        {/* ── PDF Modal ── */}
        <Modal
          title={
            <Space>
              <FilePdfOutlined style={{ color: '#006a5a' }} />
              <span>รายงานการเข้า–ออกงาน · {employee.name} · {dateRangeLabel || monthLabel}</span>
            </Space>
          }
          open={pdfOpen}
          onCancel={() => setPdfOpen(false)}
          footer={null}
          width="85%"
          styles={{ body: { padding: '16px 0 0', display: 'flex', flexDirection: 'column', minHeight: 580 } }}
          destroyOnHidden
        >
          <AttendancePDFViewer data={reportData} />
        </Modal>
      </div>
    </div>
  )
}

// ─── Page Wrapper ─────────────────────────────────────────────────────────────
export default function TimeAttendancePage() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#006a5a',
          borderRadius: 8,
        },
        components: {
          App: { colorBgBase: 'transparent' },
        },
      }}
    >
      <App style={{ background: 'transparent' }}>
        <TimeAttendanceContent />
      </App>
    </ConfigProvider>
  )
}
