'use client'
import { useState, useMemo } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, ConfigProvider, App,
  DatePicker, Select, Button, Modal, Space, Spin, theme
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, FilePdfOutlined,
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
  ClockCircleOutlined, CalendarOutlined
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import dynamic from 'next/dynamic'
import Navbar from '@/app/components/Navbar'
import type { AttendanceDayRecord, AttendanceEmployee, AttendanceReportData } from '@/app/components/AttendancePDF'

const { Title, Text } = Typography

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

// ─── Mock data patterns (keyed by "YYYY-MM-D") ───────────────────────────────
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
  const year  = selectedMonth.year()
  const month = selectedMonth.month() + 1
  const count = selectedMonth.daysInMonth()
  const records: AttendanceDayRecord[] = []

  for (let d = 1; d <= count; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const date    = dayjs(dateStr)
    const dow     = date.day()
    const isWeekend = dow === 0 || dow === 6
    const key     = `${year}-${month}-${d}`
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
      // Normal working day — vary slightly per day
      const inMin  = 20 + (d * 7  % 10)         // 08:20–08:29
      const outMin = 30 + (d * 11 % 20)         // 16:30–16:49
      const hrs    = 8 + (outMin - inMin) / 60
      rec = {
        date: dateStr, dayNum: d, dayShort: THAI_DAYS_SHORT[dow],
        status: 'normal',
        checkIn:   `08:${String(inMin).padStart(2, '0')}`,
        checkOut:  `16:${String(outMin).padStart(2, '0')}`,
        workHours: Math.round(hrs * 10) / 10,
      }
    }

    records.push(rec)
  }

  return records
}

// ─── Summary calc ─────────────────────────────────────────────────────────────
function calcSummary(records: AttendanceDayRecord[]) {
  const work   = records.filter(r => r.status !== 'holiday')
  const normal = work.filter(r => r.status === 'normal').length
  const late   = work.filter(r => r.status === 'late').length
  const absent = work.filter(r => r.status === 'absent').length
  const leave  = work.filter(r => r.status.startsWith('leave')).length
  const totalHrs = records.reduce((a, r) => a + (r.workHours ?? 0), 0)
  return {
    workDays:      work.length,
    normalDays:    normal,
    lateDays:      late,
    absentDays:    absent,
    leaveDays:     leave,
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
  const [selectedMonth,  setSelectedMonth]  = useState<Dayjs>(dayjs('2026-04-01'))
  const [selectedEmpId,  setSelectedEmpId]  = useState<string>('EMP-001')
  const [pdfOpen,        setPdfOpen]        = useState(false)

  const employee = MOCK_EMPLOYEES.find(e => e.id === selectedEmpId)!
  const records  = useMemo(() => generateRecords(selectedMonth), [selectedMonth])
  const summary  = useMemo(() => calcSummary(records), [records])

  const monthLabel = `${THAI_MONTHS[selectedMonth.month() + 1]} พ.ศ. ${selectedMonth.year() + 543}`

  const reportData: AttendanceReportData = { employee, monthLabel, records, summary }

  // ── Table columns ───────────────────────────────────────────────────────────
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
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบงานบุคคล</> },
            { title: 'เวลาเข้าออกงาน' },
          ]}
          className="mb-6"
        />

        {/* Title */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Title level={2} className="text-primary m-0">บันทึกเวลาเข้า–ออกงาน</Title>
            <Text type="secondary">ติดตามประวัติการเข้างานรายวัน · {monthLabel}</Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<FilePdfOutlined />}
            onClick={() => setPdfOpen(true)}
            style={{ background: '#006a5a', borderColor: '#006a5a' }}
          >
            พิมพ์รายงาน PDF
          </Button>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────────── */}
        <Card variant="borderless" className="mb-6 shadow-sm">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
            <div>
              <Text style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>พนักงาน</Text>
              <Select
                value={selectedEmpId}
                onChange={setSelectedEmpId}
                style={{ width: 240 }}
                options={MOCK_EMPLOYEES.map(e => ({ value: e.id, label: `${e.name} (${e.id})` }))}
              />
            </div>
            <div>
              <Text style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>เดือน–ปี</Text>
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={v => v && setSelectedMonth(v)}
                format={(v) => `${THAI_MONTHS[v.month() + 1]} พ.ศ. ${v.year() + 543}`}
                style={{ width: 200 }}
                allowClear={false}
              />
            </div>
            <div style={{ paddingBottom: 0 }}>
              <Text style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                ตำแหน่ง / หน่วยงาน
              </Text>
              <Text style={{ fontSize: 13, color: '#e2e8f0' }}>
                {employee.position} · {employee.department}
              </Text>
            </div>
          </div>
        </Card>


        {/* ── Attendance Table ───────────────────────────────────────────────── */}
        <Card
          variant="borderless"
          className="rounded-xl"
          style={{ background: 'linear-gradient(135deg, #082820 0%, #0d1f1c 100%)', borderTop: '3px solid #006a5a' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <Title level={5} className="m-0">{employee.name}</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>ประวัติการเข้างาน · {monthLabel} · {summary.workDays} วันทำงาน</Text>
            </div>
            <Space>
              <Tag icon={<CheckCircleOutlined />} color="success">ปกติ {summary.normalDays}</Tag>
              <Tag icon={<ClockCircleOutlined />} color="warning">สาย {summary.lateDays}</Tag>
              <Tag icon={<CloseCircleOutlined />} color="error">ขาด {summary.absentDays}</Tag>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={records}
            rowKey="date"
            pagination={false}
            size="small"
            scroll={{ x: 750 }}
            rowClassName={(r) => r.status === 'holiday' ? 'opacity-50' : ''}
          />
        </Card>

        {/* ── PDF Modal ─────────────────────────────────────────────────────── */}
        <Modal
          title={
            <Space>
              <FilePdfOutlined style={{ color: '#006a5a' }} />
              <span>รายงานการเข้า–ออกงาน · {employee.name} · {monthLabel}</span>
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
          fontFamily: 'var(--font-sarabun)',
        },
      }}
    >
      <App>
        <TimeAttendanceContent />
      </App>
    </ConfigProvider>
  )
}
