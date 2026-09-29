'use client'
import { useState, useMemo, useEffect } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, Select, Space, Button, Empty,
  Segmented, DatePicker, Checkbox, Alert, Avatar, Divider,
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, CalendarOutlined, FilterOutlined,
  ClearOutlined, TeamOutlined, ScissorOutlined,
} from '@ant-design/icons'
import { FaFileExcel, FaRegCalendarCheck, FaRegClipboard } from 'react-icons/fa'
import dayjs, { Dayjs } from 'dayjs'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'
import EChart from '@/app/components/EChart'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

// ─── ปีงบประมาณ ───────────────────────────────────────────────────────────────
// ปีงบ พ.ศ. 2569 = 1 ต.ค. 2568 (ค.ศ. 2025) ถึง 30 ก.ย. 2569 (ค.ศ. 2026)
const fyStart = (fy: number) => dayjs(`${fy - 544}-10-01`)
const fyEnd = (fy: number) => dayjs(`${fy - 543}-09-30`)
const currentFY = () => {
  const now = dayjs()
  return now.month() >= 9 ? now.year() + 544 : now.year() + 543
}
const fyLabel = (fy: number) => `พ.ศ. ${fy} (${fy - 544}/${fy - 543})`

type PeriodKey = 'H1' | 'H2' | 'FULL' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'CUSTOM'

/** ช่วงวันที่ของรอบการดู — เดือนนับตามปีงบ (ต.ค. = เดือนที่ 1) */
const periodRange = (fy: number, key: PeriodKey): [Dayjs, Dayjs] => {
  const s = fyStart(fy)
  const monthWindow = (fromMonth: number, months: number): [Dayjs, Dayjs] => [
    s.add(fromMonth, 'month').startOf('month'),
    s.add(fromMonth + months, 'month').startOf('month').subtract(1, 'day'),
  ]
  switch (key) {
    case 'H1': return monthWindow(0, 6)
    case 'H2': return monthWindow(6, 6)
    case 'Q1': return monthWindow(0, 3)
    case 'Q2': return monthWindow(3, 3)
    case 'Q3': return monthWindow(6, 3)
    case 'Q4': return monthWindow(9, 3)
    default: return [s, fyEnd(fy)]
  }
}

const PERIOD_MAIN = [
  { value: 'H1', label: 'รอบที่ 1 (ต.ค. – มี.ค.)' },
  { value: 'H2', label: 'รอบที่ 2 (เม.ย. – ก.ย.)' },
  { value: 'FULL', label: 'ทั้งปีงบประมาณ' },
]
const PERIOD_QUARTER = [
  { value: 'Q1', label: 'ไตรมาส 1' },
  { value: 'Q2', label: 'ไตรมาส 2' },
  { value: 'Q3', label: 'ไตรมาส 3' },
  { value: 'Q4', label: 'ไตรมาส 4' },
]

const PERIOD_LABEL: Record<PeriodKey, string> = {
  H1: 'รอบที่ 1 (ต.ค. – มี.ค.)', H2: 'รอบที่ 2 (เม.ย. – ก.ย.)', FULL: 'ทั้งปีงบประมาณ',
  Q1: 'ไตรมาส 1', Q2: 'ไตรมาส 2', Q3: 'ไตรมาส 3', Q4: 'ไตรมาส 4', CUSTOM: 'กำหนดช่วงเอง',
}

const beDate = (d: Dayjs) => `${d.format('DD/MM/')}${d.year() + 543}`

// ─── ประเภทการลา ──────────────────────────────────────────────────────────────
/** ชื่อในฐานข้อมูลขึ้นต้นด้วย "การลา" ทุกตัว — ตัดออกให้หัวตารางสั้นลง */
const shortLeaveType = (name: string) => {
  const n = (name || '').replace(/^การลา/, '').trim()
  return n || 'ไม่ระบุ'
}

/**
 * คอลัมน์หลักของรายงาน — ตายตัว 3 ประเภทที่ใช้บ่อยที่สุด ที่เหลือรวมเป็น "ลาอื่น ๆ"
 * ตั้งใจให้คอลัมน์คงที่ทุกครั้ง แม้รอบที่เลือกจะไม่มีการลาประเภทนั้นเลย
 * จะได้เทียบข้ามรอบ/ข้ามหน่วยได้ และหัวตารางไม่ขยับไปมา
 * จับกลุ่มด้วย code ของประเภทการลา ไม่ใช่ชื่อไทย เพราะชื่ออาจถูกแก้ทีหลัง
 */
const BUCKETS = [
  { key: 'ANNUAL', label: 'ลาพักผ่อน', color: '#6366f1' },
  { key: 'SICK', label: 'ลาป่วย', color: '#22c55e' },
  { key: 'PERS', label: 'ลากิจส่วนตัว', color: '#f59e0b' },
  { key: 'OTHER', label: 'ลาอื่น ๆ', color: '#94a3b8' },
] as const

type BucketKey = typeof BUCKETS[number]['key']

const bucketOf = (code: string): BucketKey =>
  code === 'ANNUAL' || code === 'SICK' || code === 'PERS' ? code : 'OTHER'


const STATUS_MAP: Record<string, 'approved' | 'pending' | 'rejected'> = {
  APPROVED: 'approved', REJECTED: 'rejected', CANCELLED: 'rejected',
  PENDING: 'pending', CANCEL_PENDING: 'pending',
}

// ─── ข้อมูลจาก API ────────────────────────────────────────────────────────────
interface ApiRow {
  id: number
  user_id: number
  employee_name: string
  position_name: string | null
  user_type_name: string | null
  submajor_name: string | null
  major_name: string | null
  mission_name: string | null
  leave_type_name: string
  leave_type_code: string
  start_date: string
  end_date: string
  total_days: string | number
  status: string
}

interface Rec {
  id: number
  userId: number
  name: string
  position: string
  userType: string
  unit: string
  leaveType: string
  bucket: BucketKey
  start: Dayjs
  end: Dayjs
  days: number
  status: 'approved' | 'pending' | 'rejected'
}

const toRec = (r: ApiRow): Rec => ({
  id: r.id,
  userId: Number(r.user_id),
  name: (r.employee_name || '').trim() || `ผู้ใช้ #${r.user_id}`,
  position: r.position_name?.trim() || 'ไม่ระบุ',
  userType: r.user_type_name?.trim() || 'ไม่ระบุ',
  unit: r.submajor_name?.trim() || r.major_name?.trim() || r.mission_name?.trim() || 'ไม่ระบุ',
  leaveType: shortLeaveType(r.leave_type_name),
  bucket: bucketOf(String(r.leave_type_code ?? '')),
  start: dayjs(r.start_date),
  end: dayjs(r.end_date),
  days: Number(r.total_days) || 0,
  status: STATUS_MAP[String(r.status).toUpperCase()] ?? 'pending',
})

const round2 = (n: number) => Math.round(n * 100) / 100
const nf = (n: number) => round2(n).toLocaleString('th-TH', { maximumFractionDigits: 2 })

/**
 * จำนวนวันของใบลาที่ "ตกอยู่ในรอบ"
 * ใบที่คร่อมรอยต่อจะถูกเฉลี่ยตามสัดส่วนวันที่ทับกับรอบ ไม่ใช่นับทั้งใบ
 * ไม่งั้นใบเดียวจะถูกนับเต็มทั้งสองรอบ และยอดรวมรายปีจะเกินความจริง
 * (ติ๊ก "นับแบบเต็มใบ" เพื่อกลับไปนับทั้งใบให้รอบที่ใบเริ่มต้น)
 */
const daysInWindow = (r: Rec, from: Dayjs, to: Dayjs, fullBill: boolean): number => {
  const span = r.end.diff(r.start, 'day') + 1
  const ovStart = r.start.isAfter(from) ? r.start : from
  const ovEnd = r.end.isBefore(to) ? r.end : to
  const overlap = ovEnd.diff(ovStart, 'day') + 1
  if (overlap <= 0) return 0
  if (fullBill || overlap >= span || span <= 0) return r.days
  return round2((r.days * overlap) / span)
}

const numCell = (v: unknown, color?: string) => {
  const n = Number(v) || 0
  return n === 0
    ? <span style={{ color: 'var(--app-text-3)' }}>-</span>
    : <span style={{ fontWeight: 600, color }}>{nf(n)}</span>
}

const overlaps = (r: Rec, from: Dayjs, to: Dayjs) =>
  !r.end.isBefore(from, 'day') && !r.start.isAfter(to, 'day')

const straddles = (r: Rec, from: Dayjs, to: Dayjs) =>
  overlaps(r, from, to) && (r.start.isBefore(from, 'day') || r.end.isAfter(to, 'day'))

// ─── หน้า ─────────────────────────────────────────────────────────────────────
const LeaveSummaryContent = () => {
  const [rows, setRows] = useState<Rec[]>([])
  const [loading, setLoading] = useState(true)
  const [canSeeAll, setCanSeeAll] = useState(false)

  const [fy, setFy] = useState(currentFY())
  const [period, setPeriod] = useState<PeriodKey>('FULL')
  const [custom, setCustom] = useState<[Dayjs, Dayjs] | null>(null)
  const [fullBill, setFullBill] = useState(false)
  // ตั้งต้นให้ "รวมใบที่รออนุมัติ" — ใบส่วนใหญ่ในระบบยังไม่ผ่านครบทุกขั้น
  // ถ้าตั้งต้นเป็นเฉพาะที่อนุมัติแล้ว คนที่เพิ่งยื่นจะเปิดมาเจอหน้าว่างแล้วนึกว่าใบหาย
  // ฝ่ายบุคคลที่ต้องการยอดทางการค่อยติ๊กออกเพื่อนับเฉพาะที่อนุมัติแล้ว
  const [withPending, setWithPending] = useState(true)
  const [unit, setUnit] = useState<string | null>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [showStraddle, setShowStraddle] = useState(false)

  const [from, to] = useMemo<[Dayjs, Dayjs]>(
    () => (period === 'CUSTOM' && custom ? custom : periodRange(fy, period)),
    [fy, period, custom],
  )

  // ดึงข้อมูลคลุมทั้งปีงบเสมอ (แม้ดูแค่ไตรมาส) เพื่อให้สลับรอบแล้วไม่ต้องรอโหลดใหม่ทุกครั้ง
  const fetchFrom = useMemo(() => {
    const a = fyStart(fy)
    return (from.isBefore(a) ? from : a).format('YYYY-MM-DD')
  }, [fy, from])
  const fetchTo = useMemo(() => {
    const b = fyEnd(fy)
    return (to.isAfter(b) ? to : b).format('YYYY-MM-DD')
  }, [fy, to])

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ from: fetchFrom, to: fetchTo })
        const json = await (await fetch(`/api/v1/hr/leave-requests/summary?${qs}`)).json()
        if (!alive) return
        setRows(json?.success && Array.isArray(json.data) ? json.data.map(toRec) : [])
        setCanSeeAll(Boolean(json?.scope?.can_see_all))
      } catch {
        if (alive) setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [fetchFrom, fetchTo])

  // ── กรองตามรอบ + สถานะ ────────────────────────────────────────────────────
  const inPeriod = useMemo(
    () => rows.filter(r =>
      overlaps(r, from, to) && (withPending ? r.status !== 'rejected' : r.status === 'approved'),
    ),
    [rows, from, to, withPending],
  )

  const unitOptions = useMemo(
    () => [...new Set(inPeriod.map(r => r.unit))].sort((a, b) => a.localeCompare(b, 'th')),
    [inPeriod],
  )
  const typeOptions = useMemo(
    () => [...new Set(inPeriod.map(r => r.userType))].sort((a, b) => a.localeCompare(b, 'th')),
    [inPeriod],
  )

  const filtered = useMemo(
    () => inPeriod.filter(r => (!unit || r.unit === unit) && (!userType || r.userType === userType)),
    [inPeriod, unit, userType],
  )

  const straddling = useMemo(() => inPeriod.filter(r => straddles(r, from, to)), [inPeriod, from, to])

  /** ใบที่ยังไม่ผ่านครบทุกขั้นแต่ถูกนับรวมอยู่ — ต้องบอกให้เห็น ไม่ใช่ปนเงียบ ๆ ในยอดรวม */
  const pendingInView = useMemo(
    () => filtered.filter(r => r.status === 'pending').length,
    [filtered],
  )

  // ── สถิติรวม ───────────────────────────────────────────────────────────────
  const totalDays = useMemo(
    () => round2(filtered.reduce((a, r) => a + daysInWindow(r, from, to, fullBill), 0)),
    [filtered, from, to, fullBill],
  )
  const peopleInPeriod = useMemo(() => new Set(inPeriod.map(r => r.userId)).size, [inPeriod])
  const peopleShown = useMemo(() => new Set(filtered.map(r => r.userId)).size, [filtered])

  // ── จำนวนวันรวมของแต่ละคอลัมน์หลัก ────────────────────────────────────────
  const daysByBucket = useMemo(() => {
    const m = new Map<BucketKey, number>(BUCKETS.map(b => [b.key, 0]))
    filtered.forEach(r => m.set(r.bucket, (m.get(r.bucket) ?? 0) + daysInWindow(r, from, to, fullBill)))
    return m
  }, [filtered, from, to, fullBill])

  // ── ตารางรายบุคคล ──────────────────────────────────────────────────────────
  interface PersonRow {
    key: number
    name: string
    position: string
    userType: string
    unit: string
    recs: Rec[]
    totalCount: number
    totalDays: number
    [k: string]: unknown
  }

  const personRows = useMemo<PersonRow[]>(() => {
    const byUser = new Map<number, Rec[]>()
    filtered.forEach(r => {
      const list = byUser.get(r.userId)
      if (list) list.push(r); else byUser.set(r.userId, [r])
    })
    return [...byUser.entries()].map(([userId, recs]) => {
      const row: PersonRow = {
        key: userId,
        name: recs[0].name,
        position: recs[0].position,
        userType: recs[0].userType,
        unit: recs[0].unit,
        recs: [...recs].sort((a, b) => a.start.valueOf() - b.start.valueOf()),
        totalCount: recs.length,
        totalDays: round2(recs.reduce((a, r) => a + daysInWindow(r, from, to, fullBill), 0)),
      }
      BUCKETS.forEach(b => {
        const of = recs.filter(r => r.bucket === b.key)
        row[`c_${b.key}`] = of.length
        row[`d_${b.key}`] = round2(of.reduce((a, r) => a + daysInWindow(r, from, to, fullBill), 0))
      })
      return row
    }).sort((a, b) => b.totalDays - a.totalDays || a.name.localeCompare(b.name, 'th'))
  }, [filtered, from, to, fullBill])

  const columns = useMemo(() => ([
    {
      title: 'ชื่อ-สกุล', dataIndex: 'name', key: 'name', fixed: 'left' as const, width: 230,
      render: (t: string) => (
        <Space size={8}>
          <Avatar size={24} style={{ background: 'var(--app-surface-2, #334155)', fontSize: 12 }}>
            {t.replace(/^(นาย|นาง|นางสาว|น\.ส\.|ดร\.|พญ\.|นพ\.|ทพ\.|ภก\.)\s*/, '').charAt(0)}
          </Avatar>
          <Text strong>{t}</Text>
        </Space>
      ),
    },
    {
      title: 'ตำแหน่ง', dataIndex: 'position', key: 'position', width: 180,
      render: (t: string) => <Text type="secondary" style={{ fontSize: 13 }}>{t}</Text>,
    },
    {
      title: 'ประเภท', dataIndex: 'userType', key: 'userType', width: 150, align: 'center' as const,
      render: (t: string) => <Tag color="blue" style={{ marginInlineEnd: 0 }}>{t}</Tag>,
    },
    {
      title: 'สังกัด', dataIndex: 'unit', key: 'unit', width: 220,
      render: (t: string) => <Text style={{ fontSize: 13 }}>{t}</Text>,
    },
    // คอลัมน์หลัก — จำนวนวันรวมของแต่ละประเภท (ครั้งดูได้ในแถวที่กางออก)
    ...BUCKETS.map(b => ({
      title: (
        <span style={{ color: b.color }}>
          {b.label}<br />
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 400 }}>วัน</Text>
        </span>
      ),
      dataIndex: `d_${b.key}`,
      key: b.key,
      width: 110,
      align: 'center' as const,
      sorter: (x: PersonRow, y: PersonRow) => Number(x[`d_${b.key}`]) - Number(y[`d_${b.key}`]),
      render: (v: unknown) => numCell(v, b.color),
    })),
    {
      title: 'รวมทั้งหมด', key: 'total',
      children: [
        {
          title: 'ครั้ง', dataIndex: 'totalCount', key: 'totalCount', width: 72, align: 'center' as const,
          render: (v: unknown) => <Text strong>{nf(Number(v))}</Text>,
        },
        {
          title: 'วัน', dataIndex: 'totalDays', key: 'totalDays', width: 80, align: 'center' as const,
          render: (v: unknown) => <Text strong style={{ color: 'var(--ant-color-primary, #10b981)' }}>{nf(Number(v))}</Text>,
        },
      ],
    },
  ]), [])

  // ── กราฟ ───────────────────────────────────────────────────────────────────
  const donutOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', valueFormatter: (v: number) => `${nf(v)} วัน` },
    legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      avoidLabelOverlap: true, label: { show: false },
      data: BUCKETS
        .filter(b => (daysByBucket.get(b.key) ?? 0) > 0)
        .map(b => ({
          name: b.label, value: round2(daysByBucket.get(b.key) ?? 0), itemStyle: { color: b.color },
        })),
    }],
  }), [daysByBucket])

  const barOption = useMemo(() => {
    const units = [...new Set(filtered.map(r => r.unit))]
    const totals = new Map<string, number>()
    filtered.forEach(r => totals.set(r.unit, (totals.get(r.unit) ?? 0) + daysInWindow(r, from, to, fullBill)))
    const ordered = units.sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0)).slice(0, 25)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${nf(v)} วัน` },
      legend: { top: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
      grid: { left: 48, right: 16, top: 34, bottom: 120 },
      xAxis: {
        type: 'category', data: ordered,
        axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 35, interval: 0, width: 110, overflow: 'truncate' },
      },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { opacity: 0.15 } } },
      series: BUCKETS.map(b => ({
        name: b.label, type: 'bar', itemStyle: { color: b.color, borderRadius: [3, 3, 0, 0] },
        data: ordered.map(u => round2(
          filtered.filter(r => r.unit === u && r.bucket === b.key)
            .reduce((a, r) => a + daysInWindow(r, from, to, fullBill), 0),
        )),
      })),
    }
  }, [filtered, from, to, fullBill])

  // ── ส่งออก Excel ───────────────────────────────────────────────────────────
  const exportExcel = () => {
    const data = personRows.map(p => {
      const o: Record<string, string | number> = {
        'ชื่อ-สกุล': p.name, 'ตำแหน่ง': p.position, 'ประเภทเจ้าหน้าที่': p.userType, 'สังกัด': p.unit,
      }
      BUCKETS.forEach(b => {
        o[`${b.label} (ครั้ง)`] = Number(p[`c_${b.key}`]) || 0
        o[`${b.label} (วัน)`] = Number(p[`d_${b.key}`]) || 0
      })
      o['รวม (ครั้ง)'] = p.totalCount
      o['รวม (วัน)'] = p.totalDays
      return o
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `ปีงบ ${fy}`)
    XLSX.writeFile(wb, `สรุปการลา_ปีงบ${fy}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`)
  }

  const clearFilters = () => { setUnit(null); setUserType(null) }
  const isCurrentFY = fy === currentFY()
  const rangeDays = to.diff(from, 'day') + 1

  const statCards = [
    { label: 'จำนวนคนที่ลา', value: nf(peopleShown), unit: 'คน', sub: PERIOD_LABEL[period], color: '#8b5cf6', icon: <TeamOutlined /> },
    { label: 'จำนวนครั้งที่ลา', value: nf(filtered.length), unit: 'รายการ', sub: withPending ? 'รวมที่รออนุมัติ' : 'เฉพาะที่อนุมัติแล้ว', color: '#22c55e', icon: <FaRegClipboard /> },
    { label: 'วันลารวมทั้งหมด', value: nf(totalDays), unit: 'วัน', sub: fullBill ? 'นับใบคร่อมรอบแบบเต็มใบ' : 'นับเฉพาะวันที่ตกอยู่ในรอบ', color: '#0ea5e9', icon: <FaRegCalendarCheck /> },
  ]

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-6">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบบริหารการลา</> },
            { title: 'สรุปการลาตามปีงบประมาณ' },
          ]}
          className="mb-4"
        />

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={3} className="m-0">สรุปการลาตามปีงบประมาณ</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {canSeeAll ? 'ทั้งองค์กร' : 'เฉพาะขอบเขตที่ท่านมีสิทธิ์ดู'} · ปีงบประมาณ {fyLabel(fy)}
            </Text>
          </div>
          <Tag icon={<CalendarOutlined />} color="processing" style={{ fontSize: 13, padding: '4px 10px' }}>
            {beDate(from)} – {beDate(to)} <Text type="secondary" style={{ fontSize: 11 }}>({rangeDays} วัน)</Text>
          </Tag>
        </div>

        {/* ── เลือกรอบการดู ──────────────────────────────────────────────── */}
        <Card variant="borderless" className="mb-3 shadow-sm" styles={{ body: { padding: 14 } }}>
          <div className="flex flex-wrap items-center gap-3">
            <Text type="secondary" style={{ fontSize: 12 }}><CalendarOutlined /> รอบการดู</Text>
            <Segmented
              value={period === 'CUSTOM' ? '' : period}
              onChange={v => { setPeriod(v as PeriodKey); setCustom(null) }}
              options={PERIOD_MAIN}
            />
            <Segmented
              value={period === 'CUSTOM' ? '' : period}
              onChange={v => { setPeriod(v as PeriodKey); setCustom(null) }}
              options={PERIOD_QUARTER}
            />
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div className="flex flex-wrap items-center gap-3">
            <Text type="secondary" style={{ fontSize: 12 }}>ปีงบประมาณ</Text>
            <Select
              value={fy}
              onChange={setFy}
              style={{ width: 190 }}
              options={Array.from({ length: 6 }, (_, i) => currentFY() + 1 - i)
                .map(y => ({ value: y, label: fyLabel(y) }))}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>กำหนดช่วงเอง</Text>
            <RangePicker
              value={custom}
              onChange={v => {
                if (v && v[0] && v[1]) { setCustom([v[0], v[1]]); setPeriod('CUSTOM') }
                else { setCustom(null); setPeriod('FULL') }
              }}
              format="DD/MM/YYYY"
              allowClear
            />
            <Button
              size="small"
              disabled={isCurrentFY && period === 'FULL'}
              onClick={() => { setFy(currentFY()); setPeriod('FULL'); setCustom(null) }}
            >
              ปีปัจจุบัน
            </Button>
            <Checkbox checked={fullBill} onChange={e => setFullBill(e.target.checked)}>
              <span style={{ fontSize: 12 }}>นับใบลาคร่อมรอบแบบเต็มใบ</span>
            </Checkbox>
            <Checkbox checked={withPending} onChange={e => setWithPending(e.target.checked)}>
              <span style={{ fontSize: 12 }}>
                รวมใบที่รออนุมัติ
                {withPending && pendingInView > 0 && (
                  <Tag color="warning" style={{ marginInlineStart: 6, marginInlineEnd: 0, fontSize: 11 }}>
                    นับอยู่ {nf(pendingInView)} รายการ
                  </Tag>
                )}
              </span>
            </Checkbox>
          </div>
        </Card>

        {/* ── ใบลาที่คร่อมรอยต่อของรอบ ───────────────────────────────────── */}
        {straddling.length > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<ScissorOutlined />}
            className="mb-3"
            title={
              <span style={{ fontSize: 13 }}>
                มีใบลา <b>{straddling.length}</b> รายการที่คร่อมรอยต่อของรอบนี้ —{' '}
                {fullBill ? 'กำลังนับทั้งใบ (ยอดรวมอาจซ้ำกับรอบข้างเคียง)' : 'นับเฉพาะวันที่ตกอยู่ในรอบ'}
                <Button type="link" size="small" onClick={() => setShowStraddle(s => !s)}>
                  {showStraddle ? 'ซ่อน' : 'ดูรายการ'}
                </Button>
              </span>
            }
            description={showStraddle ? (
              <div style={{ maxHeight: 190, overflow: 'auto', fontSize: 12 }}>
                {straddling.map(r => (
                  <div key={r.id} className="flex flex-wrap gap-2 py-0.5">
                    <span style={{ minWidth: 170 }}>{r.name}</span>
                    <Tag color="default" style={{ marginInlineEnd: 0 }}>{r.leaveType}</Tag>
                    <span>{beDate(r.start)} – {beDate(r.end)}</span>
                    <Text type="secondary">
                      ทั้งใบ {nf(r.days)} วัน → นับในรอบ {nf(daysInWindow(r, from, to, fullBill))} วัน
                    </Text>
                  </div>
                ))}
              </div>
            ) : null}
          />
        )}

        {/* ── ตัวกรอง ─────────────────────────────────────────────────────── */}
        <Card variant="borderless" className="mb-4 shadow-sm" styles={{ body: { padding: 14 } }}>
          <div className="flex flex-wrap items-center gap-3">
            <Text type="secondary" style={{ fontSize: 12 }}><FilterOutlined /> กรองข้อมูล</Text>
            <Select
              value={unit} onChange={setUnit} allowClear showSearch
              placeholder="สังกัด (ทั้งหมด)" style={{ minWidth: 260 }}
              options={unitOptions.map(v => ({ value: v, label: v }))}
            />
            <Select
              value={userType} onChange={setUserType} allowClear
              placeholder="ประเภทเจ้าหน้าที่ (ทั้งหมด)" style={{ minWidth: 220 }}
              options={typeOptions.map(v => ({ value: v, label: v }))}
            />
            <Button
              type="text" size="small" icon={<ClearOutlined />}
              disabled={!unit && !userType}
              onClick={clearFilters}
            >
              ล้างตัวกรอง
            </Button>
            <div className="ml-auto">
              <Text type="secondary" style={{ fontSize: 12 }}>
                แสดง <b style={{ color: 'var(--ant-color-primary, #10b981)' }}>{nf(peopleShown)}</b> / {nf(peopleInPeriod)} คน
              </Text>
            </div>
          </div>
        </Card>

        {/* ── การ์ดสถิติ ──────────────────────────────────────────────────── */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {statCards.map(c => (
            <Card key={c.label} variant="borderless" className="rounded-xl shadow-sm" styles={{ body: { padding: 18 } }}>
              <div className="flex items-start justify-between">
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{c.label}</Text>
                  <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.2, color: c.color }}>{c.value}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{c.unit} — {c.sub}</Text>
                </div>
                <span style={{
                  color: c.color, background: `${c.color}1f`, borderRadius: 10,
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{c.icon}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* ── กราฟ ────────────────────────────────────────────────────────── */}
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card variant="borderless" className="rounded-xl shadow-sm lg:col-span-1"
            title={<span style={{ fontSize: 13 }}>วันลารวมแยกตามประเภท</span>}>
            {filtered.length === 0
              ? <Empty description="ไม่มีข้อมูลในรอบนี้" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              : <EChart option={donutOption} height={280} />}
          </Card>
          <Card variant="borderless" className="rounded-xl shadow-sm lg:col-span-2"
            title={<span style={{ fontSize: 13 }}>วันลารวมแยกตามสังกัด {unitOptions.length > 25 && <Text type="secondary" style={{ fontSize: 11 }}>(25 อันดับแรก)</Text>}</span>}>
            {filtered.length === 0
              ? <Empty description="ไม่มีข้อมูลในรอบนี้" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              : <EChart option={barOption} height={280} />}
          </Card>
        </div>

        {/* ── ตารางรายบุคคล ───────────────────────────────────────────────── */}
        <Card
          variant="borderless"
          className="rounded-xl shadow-sm"
          title={
            <div>
              <span style={{ fontSize: 15, fontWeight: 600 }}>สรุปการลารายบุคคล — ปีงบประมาณ พ.ศ. {fy}</span>
              <Text type="secondary" style={{ fontSize: 12, marginInlineStart: 8 }}>
                {PERIOD_LABEL[period]} · {beDate(from)} – {beDate(to)}
              </Text>
            </div>
          }
          extra={
            <Space>
              <Tag>{nf(personRows.length)} คน</Tag>
              <Button
                type="primary" ghost icon={<FaFileExcel />}
                disabled={personRows.length === 0}
                onClick={exportExcel}
              >
                Export Excel
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={personRows}
            loading={loading}
            rowKey="key"
            size="small"
            bordered
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 25, showSizeChanger: true, showTotal: t => `ทั้งหมด ${nf(t)} คน` }}
            locale={{ emptyText: <Empty description="ไม่มีข้อมูลการลาในรอบที่เลือก" /> }}
            expandable={{
              expandedRowRender: (p: PersonRow) => (
                <div style={{ fontSize: 12, paddingInlineStart: 8 }}>
                  {p.recs.map(r => (
                    <div key={r.id} className="flex flex-wrap items-center gap-2 py-0.5">
                      <Tag color="default" style={{ marginInlineEnd: 0 }}>{r.leaveType}</Tag>
                      <span>{beDate(r.start)} – {beDate(r.end)}</span>
                      <Text type="secondary">{nf(r.days)} วัน</Text>
                      {straddles(r, from, to) && (
                        <Tag color="warning" style={{ marginInlineEnd: 0 }}>
                          คร่อมรอบ · นับ {nf(daysInWindow(r, from, to, fullBill))} วัน
                        </Tag>
                      )}
                      {r.status === 'pending' && <Tag color="warning" style={{ marginInlineEnd: 0 }}>รออนุมัติ</Tag>}
                    </div>
                  ))}
                </div>
              ),
            }}
            summary={() => personRows.length === 0 ? null : (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ fontWeight: 700 }}>
                  <Table.Summary.Cell index={0} colSpan={5}>รวมทั้งสิ้น</Table.Summary.Cell>
                  {BUCKETS.map((b, i) => (
                    <Table.Summary.Cell key={b.key} index={5 + i} align="center">
                      <span style={{ color: b.color }}>{nf(daysByBucket.get(b.key) ?? 0)}</span>
                    </Table.Summary.Cell>
                  ))}
                  <Table.Summary.Cell index={5 + BUCKETS.length} align="center">
                    {nf(filtered.length)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6 + BUCKETS.length} align="center">
                    {nf(totalDays)}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </Card>
      </div>
    </div>
  )
}

const LeaveSummaryPage = () => (
  <AppThemeProvider colorPrimary="#10b981">
    <LeaveSummaryContent />
  </AppThemeProvider>
)

export default LeaveSummaryPage
