'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card, Typography, Row, Col, Tag, Space, Select, Table, Empty, Progress, Checkbox, Alert, Spin, Tooltip, Segmented,
  DatePicker
} from 'antd'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import {
  HomeOutlined, FileTextOutlined, FilterOutlined, SafetyCertificateOutlined, WarningOutlined,
  ClockCircleOutlined, TeamOutlined, InfoCircleOutlined, AuditOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import dayjs, { type Dayjs } from 'dayjs'
import Navbar from '@/app/components/Navbar'
import EChart from '@/app/components/EChart'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography

// ─── ข้อมูลจาก API (/api/v1/hr/leave-analytics) ─────────────────────────────
interface Req {
  id: number
  user_id: number
  employee_name: string
  user_type_name: string
  gender: string | null
  mission_name: string
  group_name: string
  submajor_name: string
  leave_type_code: string
  leave_type_name: string
  requires_document: boolean
  requires_document_after_days: number | null
  start_date: string
  end_date: string
  total_days: string | number
  status: string
  created_at: string
  reason: string | null
  has_document: boolean
  day_check_status: 'VERIFIED' | 'ADJUSTED' | null
  current_step: number | null
  chain_steps: number
  first_action_at: string | null
  last_action_at: string | null
  rule_days: number
  count_working_days_only: boolean
  /** เสาร์ / อาทิตย์ / วันหยุดราชการในช่วงใบลา (เฉพาะประเภทที่นับวันทำการ) */
  off_days: { date: string; kind: 'SAT' | 'SUN' | 'HOLIDAY'; name?: string }[]
}
interface ApprovalStep {
  request_id: number
  step: number
  approver_id: number
  approver_name: string
  level_name: string
  unit_name: string | null
  is_acting: boolean
  arrived_at: string
  acted_at: string | null
  action: 'APPROVED' | 'REJECTED' | null
}
interface StaffRow { mission_name: string; group_name: string; submajor_name: string; user_type_name: string; headcount: number }
interface Payload {
  fiscal_year: number
  fiscal_years: number[]
  active_staff: number
  requests: Req[]
  staff: StaffRow[]
  approval_steps: ApprovalStep[]
  annual_balances: { user_id: number; carried_in: string | number; entitled: string | number; used: string | number }[]
}

// ─── ค่าคงที่ ────────────────────────────────────────────────────────────────
const currentFY = () => {
  const now = dayjs()
  return now.month() >= 9 ? now.year() + 544 : now.year() + 543
}
const FISCAL_MONTHS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.']
const WEEKDAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
// สีประจำประเภท — ชุดเดียวกับหน้าสรุปการลาและประวัติการลาเจ้าหน้าที่ (สีตามประเภท ไม่ตามอันดับ)
const TYPE_COLOR: Record<string, string> = {
  ANNUAL: '#6366f1', SICK: '#22c55e', PERS: '#f59e0b', MAT: '#ec4899', PAT: '#0ea5e9',
  ORDAIN: '#a16207', MIL: '#64748b', STUDY: '#8b5cf6', INTL: '#14b8a6', FOLLOW: '#e11d48', REHAB: '#84cc16',
}
const SEQ = '#0d9488' // สีเดียวสำหรับกราฟขนาด (ไม่ใช่ประเภท)
const AXIS = { color: '#94a3b8', fontSize: 11 }
const SPLIT = { lineStyle: { opacity: 0.15 } }
// นับเฉพาะใบที่มีผล — ไม่อนุมัติ / ยกเลิกแล้ว ไม่นับวันลา
const ACTIVE = ['APPROVED', 'PENDING', 'CANCEL_PENDING']
const PENDING_AGING_DAYS = 7
// ── Bradford Factor ──
const isBradfordType = (r: Req) => r.leave_type_code === 'SICK' || r.leave_type_code === 'PERS'
/** ระหว่างวันสิ้นสุดใบก่อนกับวันเริ่มใบถัดไป มีแต่เสาร์-อาทิตย์ (หรือติดกัน/ซ้อนกัน) = ขาดงานต่อเนื่อง */
const onlyWeekendBetween = (prevEnd: Dayjs, nextStart: Dayjs) => {
  for (let d = prevEnd.add(1, 'day'); d.isBefore(nextStart, 'day'); d = d.add(1, 'day')) {
    if (d.day() !== 0 && d.day() !== 6) return false
  }
  return true
}
interface BradfordRow {
  id: number
  name: string
  group: string
  spells: number
  days: number
  score: number
  /** การลาทุกประเภทในช่วงที่ดู (แสดงในรายละเอียด) */
  recs: Req[]
  /** ใบป่วย/กิจ → อยู่ในครั้งที่เท่าไร */
  spellOf: Map<number, number>
  /** จำนวนใบป่วย/กิจที่ถูกรวมเข้ากับครั้งก่อนเพราะลาต่อเนื่อง */
  merged: number
}

// ── ตัวชี้วัดการอนุมัติของหัวหน้า ──
const SLA_HOURS = 72 // เป้าหมาย: ดำเนินการภายใน 3 วันนับจากใบมาถึงคิว
const FAST_HOURS = 24
type Grade = 'GOOD' | 'IMPROVE' | 'WATCH'
const GRADE_META: Record<Grade, { label: string; color: string; rank: number }> = {
  WATCH: { label: 'ต้องติดตาม', color: 'error', rank: 0 },
  IMPROVE: { label: 'ควรปรับปรุง', color: 'warning', rank: 1 },
  GOOD: { label: 'ดี', color: 'success', rank: 2 },
}
const GRADE_RULE = `ต้องติดตาม = มีใบที่ถึงวันลาแล้วยังไม่อนุมัติ หรือค้างเกิน 7 วัน · ควรปรับปรุง = ดำเนินการภายใน 3 วันไม่ถึง 70% หรือมัธยฐานเกิน 3 วัน · ดี = นอกเหนือจากนี้`
const fmtWait = (h: number) => (h < 24 ? `${nf(Math.round(h))} ชม.` : `${nf(round2(h / 24))} วัน`)
interface ApproverKpi {
  id: number
  name: string
  roles: string[]
  received: number
  acted: number
  approved: number
  rejected: number
  medianH: number
  /** มัธยฐานเวลาที่ใช้ทุกขั้นที่มาถึง — ขั้นที่กดแล้วใช้เวลาจริง ขั้นที่ยังค้างใช้เวลาที่รอมาจนถึงตอนนี้ */
  responseH: number
  fastPct: number
  slaPct: number
  waiting: number
  oldestH: number
  waitingPastStart: number
  lateApproved: number
  grade: Grade
  waitingItems: { step: ApprovalStep; req: Req; waitH: number }[]
}

const LEAD_BUCKETS = ['ยื่นหลังวันลา', 'วันเดียวกัน', 'ล่วงหน้า 1–6 วัน', 'ล่วงหน้า 7–29 วัน', 'ล่วงหน้า 30 วันขึ้นไป']

const round2 = (n: number) => Math.round(n * 100) / 100
const nf = (n: number) => round2(n).toLocaleString('th-TH', { maximumFractionDigits: 2 })
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)
const beShort = (v: string) => { const d = dayjs(v); return `${d.format('D/M/')}${d.year() + 543}` }
const shortType = (n: string) => n.replace(/^การลา/, '')
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// ─── ช่วงเวลาที่ดู ────────────────────────────────────────────────────────────
type PeriodKey = 'FULL' | 'H1' | 'H2' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'CUSTOM'
const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'FULL', label: 'ทั้งปีงบ' },
  { value: 'Q1', label: 'ไตรมาส 1 (ต.ค.–ธ.ค.)' }, { value: 'Q2', label: 'ไตรมาส 2 (ม.ค.–มี.ค.)' },
  { value: 'Q3', label: 'ไตรมาส 3 (เม.ย.–มิ.ย.)' }, { value: 'Q4', label: 'ไตรมาส 4 (ก.ค.–ก.ย.)' },
  { value: 'H1', label: 'ครึ่งปีแรก (ต.ค.–มี.ค.)' }, { value: 'H2', label: 'ครึ่งปีหลัง (เม.ย.–ก.ย.)' },
  { value: 'CUSTOM', label: 'กำหนดช่วงวันที่เอง' },
]
const fyStart = (fy: number) => dayjs(`${fy - 544}-10-01`)
const periodRange = (fy: number, key: PeriodKey): [Dayjs, Dayjs] => {
  const s = fyStart(fy)
  const win = (m: number, n: number): [Dayjs, Dayjs] => [s.add(m, 'month'), s.add(m + n, 'month').subtract(1, 'day')]
  switch (key) {
    case 'Q1': return win(0, 3)
    case 'Q2': return win(3, 3)
    case 'Q3': return win(6, 3)
    case 'Q4': return win(9, 3)
    case 'H1': return win(0, 6)
    case 'H2': return win(6, 6)
    default: return win(0, 12)
  }
}

/** จำนวนวันในช่วง a..b — นับเฉพาะจันทร์–ศุกร์ เมื่อประเภทนับวันทำการ */
const weighDays = (a: Dayjs, b: Dayjs, workingOnly: boolean) => {
  let n = 0
  for (let d = a; !d.isAfter(b, 'day'); d = d.add(1, 'day')) {
    if (!workingOnly || (d.day() !== 0 && d.day() !== 6)) n++
  }
  return n
}
/**
 * วันลาของใบที่ตกอยู่ในช่วง [from, to]
 * ใบที่คร่อมช่วง (คร่อมเดือน / ไตรมาส / ปีงบ) แบ่งตามสัดส่วนวัน — วันทำการสำหรับประเภทนับวันทำการ วันปฏิทินสำหรับที่เหลือ
 * (ลาเฉพาะเสาร์-อาทิตย์ของผู้ปฏิบัติงานเป็นเวร ไม่มีวันทำการให้แบ่ง ใช้วันปฏิทินแทน)
 * fullBill = นับทั้งใบให้ช่วงที่ใบเริ่มลา
 */
const allocate = (r: Req, from: Dayjs, to: Dayjs, fullBill: boolean): number => {
  const s = dayjs(r.start_date), e = dayjs(r.end_date), days = Number(r.total_days)
  if (e.isBefore(from, 'day') || s.isAfter(to, 'day')) return 0
  if (!s.isBefore(from, 'day') && !e.isAfter(to, 'day')) return days
  if (fullBill) return s.isBefore(from, 'day') ? 0 : days
  const a = s.isBefore(from, 'day') ? from : s, b = e.isAfter(to, 'day') ? to : e
  let total = weighDays(s, e, r.count_working_days_only), part = weighDays(a, b, r.count_working_days_only)
  if (total === 0) { total = weighDays(s, e, false); part = weighDays(a, b, false) }
  return total > 0 ? round2((days * part) / total) : 0
}
const crossesMonth = (r: Req) => !dayjs(r.start_date).isSame(dayjs(r.end_date), 'month')

// ─── ประเด็นที่ HR ควรตรวจ ────────────────────────────────────────────────────
type IssueKey = 'days' | 'doc' | 'late' | 'aging'
const ISSUE_META: Record<IssueKey, { label: string; hint: string; color: string }> = {
  days: { label: 'จำนวนวันไม่ตรงกฎการนับ', hint: 'จำนวนวันในใบไม่ตรงกับที่นับได้ตามประเภท (วันทำการ/วันปฏิทิน) และ HR ยังไม่ตรวจ', color: 'orange' },
  doc: { label: 'ไม่มีเอกสารแนบตามเงื่อนไข', hint: 'ประเภทที่ต้องแนบเอกสาร (ตามที่ตั้งไว้ในกำหนดสิทธิ์การลา) แต่ใบนี้ไม่มีไฟล์แนบ', color: 'red' },
  late: { label: 'ยื่นหลังวันเริ่มลา', hint: 'ลาพักผ่อน / ลากิจส่วนตัว ที่ยื่นหลังวันเริ่มลา (ระเบียบให้ยื่นล่วงหน้า)', color: 'gold' },
  aging: { label: `ค้างอนุมัติเกิน ${PENDING_AGING_DAYS} วัน`, hint: `ยื่นมาแล้วเกิน ${PENDING_AGING_DAYS} วันยังไม่อนุมัติครบ`, color: 'purple' },
}
interface IssueRow { r: Req; keys: IssueKey[] }

const OFF_LABEL = { SAT: 'ส.', SUN: 'อา.', HOLIDAY: '' } as const
/** อธิบายว่าทำไมจำนวนวันในใบไม่ตรงกฎนับวันทำการ — คาบเกี่ยวเสาร์-อาทิตย์ / วันหยุดราชการ */
const dayMismatchNote = (r: Req) => {
  const days = Number(r.total_days)
  if (days < r.rule_days) return { text: `ใบระบุน้อยกว่าวันทำการ ${nf(r.rule_days - days)} วัน`, detail: '' }
  const weekend = r.off_days.filter(o => o.kind !== 'HOLIDAY')
  const holiday = r.off_days.filter(o => o.kind === 'HOLIDAY')
  if (!weekend.length && !holiday.length) return { text: `ใบระบุมากกว่าวันทำการ ${nf(days - r.rule_days)} วัน`, detail: '' }
  const parts = [
    weekend.length && `เสาร์-อาทิตย์ ${weekend.length} วัน`,
    holiday.length && `วันหยุดราชการ ${holiday.length} วัน`,
  ].filter(Boolean).join(' · ')
  const detail = r.off_days.map(o => `${o.kind === 'HOLIDAY' ? o.name ?? 'วันหยุดราชการ' : OFF_LABEL[o.kind]} ${beShort(o.date)}`).join(', ')
  return { text: `คาบเกี่ยว${parts}`, detail: `${detail} — ถ้าเป็นวันที่มีเวร จำนวนวันในใบถูกต้อง` }
}
const issuesOf = (r: Req, today: dayjs.Dayjs): IssueKey[] => {
  const out: IssueKey[] = []
  const days = Number(r.total_days)
  if (!r.day_check_status && r.rule_days > 0 && r.rule_days !== days) out.push('days')
  if (r.requires_document && !r.has_document && days > (r.requires_document_after_days ?? 0)) out.push('doc')
  if (['ANNUAL', 'PERS'].includes(r.leave_type_code) && dayjs(r.created_at).isAfter(dayjs(r.start_date), 'day')) out.push('late')
  if (r.status === 'PENDING' && today.diff(dayjs(r.created_at), 'day') > PENDING_AGING_DAYS) out.push('aging')
  return out
}

// ─── ชิ้นส่วน UI ─────────────────────────────────────────────────────────────
const Kpi = ({ label, value, sub, tone }: { label: string; value: string; sub?: React.ReactNode; tone?: string }) => (
  <Card variant="borderless" className="h-full shadow-sm" styles={{ body: { padding: 16 } }}>
    <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
    <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.25, color: tone }}>{value}</div>
    {sub && <Text type="secondary" style={{ fontSize: 12 }}>{sub}</Text>}
  </Card>
)

const Section = ({ title, extra, children }: { title: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }) => (
  <Card variant="borderless" className="h-full shadow-sm" title={<span style={{ fontSize: 14 }}>{title}</span>} extra={extra}>
    {children}
  </Card>
)

// ─── หน้า ─────────────────────────────────────────────────────────────────────
const LeaveAnalyticsContent = () => {
  const [fy, setFy] = useState(currentFY())
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mission, setMission] = useState<string | null>(null)
  const [group, setGroup] = useState<string | null>(null)
  const [submajor, setSubmajor] = useState<string | null>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [withPending, setWithPending] = useState(true)
  const [period, setPeriod] = useState<PeriodKey>('FULL')
  const [custom, setCustom] = useState<[Dayjs, Dayjs] | null>(null)
  const [fullBill, setFullBill] = useState(false)
  const [issueFilter, setIssueFilter] = useState<IssueKey | 'all'>('all')

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      try {
        const j = await (await fetch(`/api/v1/hr/leave-analytics?fiscal_year=${fy}`)).json()
        if (!alive) return
        if (j?.success) { setData(j.data); setError(null) } else { setData(null); setError(j?.message ?? 'โหลดข้อมูลไม่สำเร็จ') }
      } catch {
        if (alive) { setData(null); setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [fy])

  const today = useMemo(() => dayjs(), [])
  const all = useMemo(() => data?.requests ?? [], [data])
  const staff = useMemo(() => data?.staff ?? [], [data])

  // ── ช่วงที่ดู ──
  const [from, to] = useMemo<[Dayjs, Dayjs]>(
    () => (period === 'CUSTOM' && custom ? custom : periodRange(fy, period)), [fy, period, custom])

  // ── ตัวเลือกหน่วยงานแบบลำดับชั้น: ภารกิจ → กลุ่มงาน → หน่วยงาน (จากทะเบียนบุคลากร + ใบลา) ──
  const orgRows = useMemo(() => [
    ...staff.map(x => ({ m: x.mission_name, g: x.group_name, s: x.submajor_name, t: x.user_type_name })),
    ...all.map(r => ({ m: r.mission_name, g: r.group_name, s: r.submajor_name, t: r.user_type_name })),
  ], [staff, all])
  const opts = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, 'th')).map(v => ({ value: v, label: v }))
  const missionOptions = useMemo(() => opts(orgRows.map(x => x.m)), [orgRows])
  const groupOptions = useMemo(() => opts(orgRows.filter(x => !mission || x.m === mission).map(x => x.g)), [orgRows, mission])
  const submajorOptions = useMemo(() => opts(orgRows
    .filter(x => (!mission || x.m === mission) && (!group || x.g === group)).map(x => x.s)), [orgRows, mission, group])
  const typeOptions = useMemo(() => opts(orgRows.map(x => x.t)), [orgRows])

  const inOrg = useCallback((x: { mission_name: string; group_name: string; submajor_name: string; user_type_name: string }) =>
    (!mission || x.mission_name === mission) && (!group || x.group_name === group)
    && (!submajor || x.submajor_name === submajor) && (!userType || x.user_type_name === userType),
  [mission, group, submajor, userType])

  // ใบลาที่คาบเกี่ยวช่วงที่ดู + อยู่ในหน่วยงานที่เลือก · counted = ใบที่มีผล (± รออนุมัติ)
  const scoped = useMemo(() => all.filter(r =>
    inOrg(r) && !dayjs(r.end_date).isBefore(from, 'day') && !dayjs(r.start_date).isAfter(to, 'day')),
  [all, inOrg, from, to])
  const counted = useMemo(() => scoped.filter(r =>
    withPending ? ACTIVE.includes(r.status) : r.status === 'APPROVED'), [scoped, withPending])
  /** วันลาของใบในช่วงที่ดู (แบ่งสัดส่วนใบที่คร่อมช่วง) */
  const daysIn = useMemo(() => {
    const m = new Map<number, number>()
    counted.forEach(r => m.set(r.id, allocate(r, from, to, fullBill)))
    return m
  }, [counted, from, to, fullBill])
  const dIn = useCallback((r: Req) => daysIn.get(r.id) ?? 0, [daysIn])
  const headcount = useMemo(() => staff.filter(inOrg).reduce((a, x) => a + Number(x.headcount), 0), [staff, inOrg])
  const straddle = useMemo(() => ({
    period: counted.filter(r => dayjs(r.start_date).isBefore(from, 'day') || dayjs(r.end_date).isAfter(to, 'day')).length,
    month: counted.filter(crossesMonth).length,
  }), [counted, from, to])

  // ── ตัวเลขสรุป ──
  const kpi = useMemo(() => {
    const days = counted.reduce((a, r) => a + dIn(r), 0)
    const people = new Set(counted.map(r => r.user_id)).size
    const checkable = scoped.filter(r => ACTIVE.includes(r.status))
    const checked = checkable.filter(r => r.day_check_status).length
    const adjusted = checkable.filter(r => r.day_check_status === 'ADJUSTED').length
    const pending = scoped.filter(r => r.status === 'PENDING').length
    const approved = scoped.filter(r => r.status === 'APPROVED' && r.first_action_at && r.last_action_at)
    const turnaround = median(approved.map(r => Math.max(0, dayjs(r.last_action_at).diff(dayjs(r.created_at), 'hour') / 24)))
    return { requests: counted.length, days, people, checkable: checkable.length, checked, adjusted, pending, turnaround }
  }, [counted, scoped, dIn])

  // ── ประเด็นที่ควรตรวจ ──
  const issues = useMemo(() => scoped
    .filter(r => ACTIVE.includes(r.status))
    .map(r => ({ r, keys: issuesOf(r, today) }))
    .filter(x => x.keys.length > 0), [scoped, today])
  const issueCount = useMemo(() => {
    const m: Record<IssueKey, number> = { days: 0, doc: 0, late: 0, aging: 0 }
    issues.forEach(x => x.keys.forEach(k => { m[k]++ }))
    return m
  }, [issues])
  const issueRows = useMemo(() => (issueFilter === 'all' ? issues : issues.filter(x => x.keys.includes(issueFilter)))
    .sort((a, b) => b.keys.length - a.keys.length || dayjs(a.r.start_date).valueOf() - dayjs(b.r.start_date).valueOf()), [issues, issueFilter])

  // ── ประเภทที่มีในข้อมูล (เรียงตามวันลารวม) ──
  const typesInData = useMemo(() => {
    const m = new Map<string, { name: string; days: number }>()
    counted.forEach(r => {
      const x = m.get(r.leave_type_code) ?? { name: shortType(r.leave_type_name), days: 0 }
      x.days += dIn(r); m.set(r.leave_type_code, x)
    })
    return [...m.entries()].filter(([, t]) => t.days > 0).sort((a, b) => b[1].days - a[1].days)
  }, [counted, dIn])

  // ── กราฟ: วันลารายเดือนแยกประเภท (stacked) ──
  const months = useMemo(() => {
    const out: { label: string; from: Dayjs; to: Dayjs }[] = []
    for (let m = from.startOf('month'); !m.isAfter(to, 'day'); m = m.add(1, 'month')) {
      const a = m.isBefore(from, 'day') ? from : m, e = m.endOf('month'), b = e.isAfter(to, 'day') ? to : e
      out.push({ label: `${FISCAL_MONTHS[(m.month() + 3) % 12]} ${String(m.year() + 543).slice(2)}`, from: a, to: b.startOf('day') })
    }
    return out
  }, [from, to])
  const monthOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${nf(v)} วัน` },
    legend: { top: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
    grid: { left: 44, right: 12, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: months.map(m => m.label), axisLabel: AXIS },
    yAxis: { type: 'value', axisLabel: AXIS, splitLine: SPLIT },
    series: typesInData.map(([code, t]) => ({
      name: t.name, type: 'bar', stack: 'days', barMaxWidth: 28,
      itemStyle: { color: TYPE_COLOR[code] ?? '#94a3b8', borderColor: 'transparent', borderWidth: 1 },
      emphasis: { focus: 'series' },
      data: months.map(mo => round2(counted
        .filter(r => r.leave_type_code === code)
        .reduce((a, r) => a + allocate(r, mo.from, mo.to, fullBill), 0))),
    })),
  }), [counted, typesInData, months, fullBill])

  // ── กราฟ: วันเริ่มลาป่วยตามวันในสัปดาห์ ──
  const sickByWeekday = useMemo(() => {
    const c = Array(7).fill(0)
    counted.filter(r => r.leave_type_code === 'SICK').forEach(r => { c[(dayjs(r.start_date).day() + 6) % 7]++ })
    return c as number[]
  }, [counted])
  const weekdayOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${nf(v)} ใบ` },
    grid: { left: 36, right: 12, top: 16, bottom: 28 },
    xAxis: { type: 'category', data: WEEKDAYS, axisLabel: AXIS },
    yAxis: { type: 'value', minInterval: 1, axisLabel: AXIS, splitLine: SPLIT },
    series: [{
      type: 'bar', barMaxWidth: 36, data: sickByWeekday,
      itemStyle: { color: TYPE_COLOR.SICK, borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', color: '#94a3b8', fontSize: 11 },
    }],
  }), [sickByWeekday])
  const sickTotal = sickByWeekday.reduce((a, b) => a + b, 0)
  const monFriShare = pct(sickByWeekday[0] + sickByWeekday[4], sickByWeekday.slice(0, 5).reduce((a, b) => a + b, 0))

  // ── กราฟ: อัตราวันลาต่อคนรายกลุ่มงาน ──
  const [rateType, setRateType] = useState<'ALL' | 'SICK' | 'ANNUAL' | 'PERS'>('ALL')
  const rateLevel: 'group' | 'submajor' = group ? 'submajor' : 'group'
  const unitRate = useMemo(() => {
    const key = (x: { group_name: string; submajor_name: string }) => (rateLevel === 'submajor' ? x.submajor_name : x.group_name)
    const head = new Map<string, number>()
    staff.filter(inOrg).forEach(x => head.set(key(x), (head.get(key(x)) ?? 0) + Number(x.headcount)))
    const days = new Map<string, number>()
    counted.filter(r => rateType === 'ALL' || r.leave_type_code === rateType)
      .forEach(r => { const g = key(r); days.set(g, (days.get(g) ?? 0) + dIn(r)) })
    return [...days.entries()]
      .map(([g, d]) => ({ g, d, h: head.get(g) ?? 0 }))
      .filter(x => x.h >= 5) // กลุ่มเล็กกว่า 5 คน อัตราผันผวนเกินจะเทียบ
      .map(x => ({ ...x, rate: round2(x.d / x.h) }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 15)
  }, [counted, staff, inOrg, rateType, rateLevel, dIn])
  const unitOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (p: { dataIndex: number }[]) => {
        const x = [...unitRate].reverse()[p[0].dataIndex]
        return `${x.g}<br/>เฉลี่ย <b>${nf(x.rate)}</b> วัน/คน<br/>วันลารวม ${nf(x.d)} วัน · บุคลากร ${nf(x.h)} คน`
      },
    },
    grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', axisLabel: AXIS, splitLine: SPLIT },
    yAxis: {
      type: 'category', data: [...unitRate].reverse().map(x => x.g),
      axisLabel: { ...AXIS, width: 190, overflow: 'truncate' },
    },
    series: [{
      type: 'bar', barMaxWidth: 16, data: [...unitRate].reverse().map(x => x.rate),
      itemStyle: { color: rateType === 'ALL' ? SEQ : TYPE_COLOR[rateType], borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: '#94a3b8', fontSize: 11, formatter: (p: { value: number }) => nf(p.value) },
    }],
  }), [unitRate, rateType])

  // ── กราฟ: ระยะเวลายื่นล่วงหน้าของลาพักผ่อน ──
  const leadOption = useMemo(() => {
    const c = Array(5).fill(0)
    counted.filter(r => r.leave_type_code === 'ANNUAL').forEach(r => {
      const d = dayjs(r.start_date).startOf('day').diff(dayjs(r.created_at).startOf('day'), 'day')
      c[d < 0 ? 0 : d === 0 ? 1 : d < 7 ? 2 : d < 30 ? 3 : 4]++
    })
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${nf(v)} ใบ` },
      grid: { left: 36, right: 12, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: LEAD_BUCKETS, axisLabel: { ...AXIS, interval: 0, fontSize: 10 } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: AXIS, splitLine: SPLIT },
      series: [{
        type: 'bar', barMaxWidth: 40,
        data: c.map((v, i) => ({ value: v, itemStyle: { color: i === 0 ? '#ef4444' : TYPE_COLOR.ANNUAL, borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 11 },
      }],
    }
  }, [counted])

  // ── การใช้สิทธิ์ลาพักผ่อน (ยอดที่ใช้ไป / สิทธิ์ทั้งหมด) ──
  const usage = useMemo(() => {
    const b = data?.annual_balances ?? []
    const buckets = [0, 0, 0, 0, 0] // 0% · 1–25 · 26–50 · 51–75 · 76–100+
    let sumUsed = 0, sumAvail = 0
    b.forEach(x => {
      const avail = Number(x.carried_in) + Number(x.entitled), used = Number(x.used)
      if (avail <= 0) return
      sumUsed += used; sumAvail += avail
      const p = (used / avail) * 100
      buckets[p === 0 ? 0 : p <= 25 ? 1 : p <= 50 ? 2 : p <= 75 ? 3 : 4]++
    })
    return { buckets, people: buckets.reduce((a, c) => a + c, 0), rate: pct(sumUsed, sumAvail), sumUsed, sumAvail }
  }, [data])
  const usageOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${nf(v)} คน` },
    grid: { left: 40, right: 12, top: 16, bottom: 28 },
    xAxis: { type: 'category', data: ['ยังไม่ใช้', '1–25%', '26–50%', '51–75%', '76–100%'], axisLabel: AXIS },
    yAxis: { type: 'value', minInterval: 1, axisLabel: AXIS, splitLine: SPLIT },
    series: [{
      type: 'bar', barMaxWidth: 40, data: usage.buckets,
      itemStyle: { color: TYPE_COLOR.ANNUAL, borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', color: '#94a3b8', fontSize: 11 },
    }],
  }), [usage])

  // ── Bradford Factor: ความถี่การลาป่วย/ลากิจ (S² × D) ──
  // ครั้ง (spell) = ช่วงขาดงานต่อเนื่อง — ใบที่ต่อกัน (คั่นด้วยเสาร์-อาทิตย์ หรือคั่นด้วยการลาประเภทอื่น เช่น ป่วย → พักผ่อน → กิจ)
  // นับเป็นครั้งเดียว ไม่งั้นการพักฟื้นยาวช่วงเดียวที่ใช้หลายประเภทจะถูกนับเป็นลาบ่อย
  const bradford = useMemo(() => {
    const byUser = new Map<number, Req[]>()
    counted.forEach(r => { const l = byUser.get(r.user_id); if (l) l.push(r); else byUser.set(r.user_id, [r]) })
    const out: BradfordRow[] = []
    byUser.forEach((all, id) => {
      const recs = [...all].sort((a, b) => dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf())
      if (!recs.some(isBradfordType)) return
      let spells = 0, days = 0, blockEnd: Dayjs | null = null, blockCounted = false
      const spellOf = new Map<number, number>()
      recs.forEach(r => {
        const s = dayjs(r.start_date), e = dayjs(r.end_date)
        if (!blockEnd || !onlyWeekendBetween(blockEnd, s)) { blockCounted = false } // เริ่มช่วงใหม่
        if (isBradfordType(r)) {
          if (!blockCounted) { spells++; blockCounted = true }
          days += dIn(r)
          spellOf.set(r.id, spells)
        }
        if (!blockEnd || e.isAfter(blockEnd)) blockEnd = e
      })
      out.push({
        id, name: recs[0].employee_name, group: recs[0].group_name ?? '-',
        spells, days: round2(days), score: round2(spells * spells * days), recs, spellOf,
        merged: recs.filter(isBradfordType).length - spells,
      })
    })
    return out.sort((a, b) => b.score - a.score)
  }, [counted, dIn])
  const bradfordWatch = bradford.filter(x => x.score >= 125).length

  // ── ตัวชี้วัดการอนุมัติของหัวหน้า (ใบของบุคลากรในหน่วยงาน/ช่วงที่เลือก) ──
  const stepsInScope = useMemo(() => {
    const ids = new Set(scoped.map(r => r.id))
    return (data?.approval_steps ?? []).filter(st => ids.has(st.request_id))
  }, [data, scoped])
  const approvers = useMemo<ApproverKpi[]>(() => {
    const reqOf = new Map(scoped.map(r => [r.id, r]))
    const now = dayjs()
    const by = new Map<number, ApprovalStep[]>()
    stepsInScope.forEach(st => {
      const list = by.get(st.approver_id)
      if (list) list.push(st); else by.set(st.approver_id, [st])
    })
    return [...by.entries()].map(([id, list]) => {
      const acted = list.filter(x => x.acted_at)
      // ข้อมูลที่โอนจากระบบเดิมบางใบเวลากดก่อนเวลายื่น — ปัดเป็น 0
      const hrs = acted.map(x => Math.max(0, dayjs(x.acted_at).diff(dayjs(x.arrived_at), 'minute') / 60))
      const waitingItems = list.filter(x => !x.acted_at).map(x => ({
        step: x, req: reqOf.get(x.request_id)!, waitH: Math.max(0, now.diff(dayjs(x.arrived_at), 'minute') / 60),
      })).sort((a, b) => b.waitH - a.waitH)
      const waitingPastStart = waitingItems.filter(w => !dayjs(w.req.start_date).isAfter(now, 'day')).length
      const lateApproved = acted.filter(x => x.action === 'APPROVED' && dayjs(x.acted_at).isAfter(dayjs(reqOf.get(x.request_id)!.start_date), 'day')).length
      const medianH = median(hrs)
      const slaPct = pct(hrs.filter(h => h <= SLA_HOURS).length, hrs.length)
      const oldestH = waitingItems[0]?.waitH ?? 0
      const grade: Grade = waitingPastStart > 0 || oldestH > 7 * 24 ? 'WATCH'
        : (hrs.length > 0 && (slaPct < 70 || medianH > SLA_HOURS)) ? 'IMPROVE' : 'GOOD'
      return {
        id, name: list[0].approver_name,
        roles: [...new Set(list.map(x => `${x.level_name}${x.unit_name ? ` ${x.unit_name}` : ''}${x.is_acting ? ' (รักษาการ)' : ''}`))],
        received: list.length, acted: acted.length,
        approved: acted.filter(x => x.action === 'APPROVED').length, rejected: acted.filter(x => x.action === 'REJECTED').length,
        medianH, responseH: median([...hrs, ...waitingItems.map(w => w.waitH)]),
        fastPct: pct(hrs.filter(h => h <= FAST_HOURS).length, hrs.length), slaPct,
        waiting: waitingItems.length, oldestH, waitingPastStart, lateApproved, grade, waitingItems,
      }
    }).sort((a, b) => GRADE_META[a.grade].rank - GRADE_META[b.grade].rank || b.waitingPastStart - a.waitingPastStart || b.oldestH - a.oldestH)
  }, [scoped, stepsInScope])
  const approverTotals = useMemo(() => {
    const hrs = stepsInScope.filter(x => x.acted_at).map(x => Math.max(0, dayjs(x.acted_at).diff(dayjs(x.arrived_at), 'minute') / 60))
    return {
      medianH: median(hrs), slaPct: pct(hrs.filter(h => h <= SLA_HOURS).length, hrs.length),
      waiting: approvers.reduce((a, x) => a + x.waiting, 0),
      pastStart: approvers.reduce((a, x) => a + x.waitingPastStart, 0),
      watch: approvers.filter(x => x.grade === 'WATCH').length,
      improve: approvers.filter(x => x.grade === 'IMPROVE').length,
    }
  }, [stepsInScope, approvers])
  const [approverSort, setApproverSort] = useState<'median' | 'waiting'>('median')
  const approverChartRows = useMemo(() => (approverSort === 'median'
    ? [...approvers].sort((a, b) => b.responseH - a.responseH)
    : approvers.filter(x => x.waiting > 0).sort((a, b) => b.waiting - a.waiting)).slice(0, 15), [approvers, approverSort])
  const approverOption = useMemo(() => {
    const rows = [...approverChartRows].reverse()
    const isMedian = approverSort === 'median'
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (p: { dataIndex: number }[]) => {
          const x = rows[p[0].dataIndex]
          return `${x.name}<br/>เวลาที่ใช้ต่อขั้น (มัธยฐาน รวมใบที่ค้าง) <b>${fmtWait(x.responseH)}</b>`
            + `<br/>เฉพาะที่กดแล้ว ${x.acted ? `${fmtWait(x.medianH)} · ภายใน 3 วัน ${x.slaPct}%` : 'ยังไม่ได้กด'}`
            + `<br/>ดำเนินการ ${nf(x.acted)} ขั้น · ค้างอยู่ ${nf(x.waiting)} ใบ`
        },
      },
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: AXIS, splitLine: SPLIT, name: isMedian ? 'วัน' : 'ใบ', nameTextStyle: AXIS },
      yAxis: { type: 'category', data: rows.map(x => x.name), axisLabel: { ...AXIS, width: 170, overflow: 'truncate' } },
      series: [{
        type: 'bar', barMaxWidth: 16,
        data: rows.map(x => (isMedian ? round2(x.responseH / 24) : x.waiting)),
        itemStyle: { color: isMedian ? SEQ : '#f59e0b', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 11, formatter: (p: { value: number }) => nf(p.value) },
        ...(isMedian ? {
          markLine: {
            symbol: 'none', silent: true, data: [{ xAxis: SLA_HOURS / 24 }],
            lineStyle: { color: '#ef4444', type: 'dashed' }, label: { formatter: 'เป้า 3 วัน', color: '#ef4444', fontSize: 11 },
          },
        } : {}),
      }],
    }
  }, [approverChartRows, approverSort])

  const fyOptions = [...new Set([currentFY(), fy, ...(data?.fiscal_years ?? [])])].sort((a, b) => b - a)
    .map(y => ({ value: y, label: `ปีงบ ${y}` }))

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-6">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบบริหารการลา</> },
            { title: 'Dashboard การลา' },
          ]}
          className="mb-4"
        />
        <div className="mb-4">
          <Title level={3} className="m-0">Dashboard วิเคราะห์การลา</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ภาพรวมการลาทั้งองค์กร การตรวจสอบของงานทรัพยากรบุคคล และรูปแบบการลาที่ควรติดตาม (เฉพาะงาน HR / ผู้ดูแลระบบ)
          </Text>
        </div>

        {/* ── ตัวกรอง ── */}
        <Card variant="borderless" className="shadow-sm" style={{ marginBottom: 16 }} styles={{ body: { padding: 14 } }}>
          <div className="flex flex-wrap items-center gap-3">
            <Text type="secondary" style={{ fontSize: 12 }}><FilterOutlined /> กรองข้อมูล</Text>
            <Select value={fy} onChange={v => { setFy(v); setCustom(null); if (period === 'CUSTOM') setPeriod('FULL') }} options={fyOptions} style={{ width: 130 }} />
            <Select value={period} onChange={setPeriod} options={PERIODS} style={{ width: 200 }} />
            {period === 'CUSTOM' && (
              <DatePicker.RangePicker
                value={custom} onChange={v => setCustom(v && v[0] && v[1] ? [v[0].startOf('day'), v[1].startOf('day')] : null)}
                format={d => `${d.format('DD/MM/')}${d.year() + 543}`} allowClear
                minDate={fyStart(fy)} maxDate={fyStart(fy).add(12, 'month').subtract(1, 'day')}
                defaultPickerValue={[fyStart(fy), fyStart(fy)]}
              />
            )}
            <Checkbox checked={withPending} onChange={e => setWithPending(e.target.checked)}>นับรวมใบที่รออนุมัติ</Checkbox>
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
              ช่วงที่ดู {`${from.format('D/M/')}${from.year() + 543}`} – {`${to.format('D/M/')}${to.year() + 543}`}
              {' '}({nf(to.diff(from, 'day') + 1)} วัน)
            </Text>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Select
              value={mission} onChange={v => { setMission(v ?? null); setGroup(null); setSubmajor(null) }} allowClear showSearch
              placeholder="กลุ่มภารกิจ (ทั้งหมด)" style={{ minWidth: 220 }} options={missionOptions}
            />
            <Select
              value={group} onChange={v => { setGroup(v ?? null); setSubmajor(null) }} allowClear showSearch
              placeholder="กลุ่มงาน (ทั้งหมด)" style={{ minWidth: 240 }} options={groupOptions}
            />
            <Select
              value={submajor} onChange={v => setSubmajor(v ?? null)} allowClear showSearch
              placeholder="หน่วยงาน (ทั้งหมด)" style={{ minWidth: 240 }} options={submajorOptions}
            />
            <Select
              value={userType} onChange={v => setUserType(v ?? null)} allowClear placeholder="ประเภทบุคลากร (ทั้งหมด)"
              style={{ minWidth: 200 }} options={typeOptions}
            />
          </div>
          {straddle.month > 0 || straddle.period > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-3" style={{ fontSize: 12 }}>
              <Text type="secondary">
                <InfoCircleOutlined /> ใบลาคร่อมเดือน {nf(straddle.month)} ใบ
                {straddle.period > 0 && <> · คร่อมช่วงที่เลือก {nf(straddle.period)} ใบ</>}
                {' '}— {fullBill ? 'นับทั้งใบให้เดือน/ช่วงที่เริ่มลา' : 'แบ่งวันลาตามสัดส่วนวันที่ตกในแต่ละเดือน/ช่วง'}
              </Text>
              <Checkbox checked={fullBill} onChange={e => setFullBill(e.target.checked)}>นับทั้งใบที่เดือนเริ่มลา</Checkbox>
            </div>
          ) : null}
        </Card>

        {error && <Alert style={{ marginBottom: 16 }} type="error" showIcon title={error} />}

        <Spin spinning={loading}>
          {/* ── ตัวเลขสรุป ── */}
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={12} md={8} xl={4}><Kpi label="ใบลาที่นับ" value={nf(kpi.requests)} sub={withPending ? 'อนุมัติแล้ว + รออนุมัติ' : 'เฉพาะที่อนุมัติแล้ว'} /></Col>
            <Col xs={12} md={8} xl={4}><Kpi label="วันลารวม" value={nf(kpi.days)} sub="วัน" /></Col>
            <Col xs={12} md={8} xl={4}>
              <Kpi label="บุคลากรที่ลา" value={nf(kpi.people)}
                sub={headcount ? `${pct(kpi.people, headcount)}% ของบุคลากรปัจจุบัน ${nf(headcount)} คน` : undefined} />
            </Col>
            <Col xs={12} md={8} xl={4}><Kpi label="เฉลี่ยต่อคนที่ลา" value={nf(kpi.people ? kpi.days / kpi.people : 0)} sub="วัน/คน" /></Col>
            <Col xs={12} md={8} xl={4}>
              <Kpi label="HR ตรวจวันลาแล้ว" value={`${pct(kpi.checked, kpi.checkable)}%`} tone="#10b981"
                sub={`${nf(kpi.checked)} จาก ${nf(kpi.checkable)} ใบ · แก้จำนวนวัน ${nf(kpi.adjusted)} ใบ`} />
            </Col>
            <Col xs={12} md={8} xl={4}>
              <Kpi label="รออนุมัติ" value={nf(kpi.pending)} tone="#f59e0b"
                sub={`ใช้เวลาอนุมัติครบ (มัธยฐาน) ${nf(kpi.turnaround)} วัน`} />
            </Col>
          </Row>

          {/* ── การตรวจสอบของงาน HR ── */}
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} xl={8}>
              <Section title={<><SafetyCertificateOutlined className="mr-2" />ความคืบหน้าการตรวจวันลา</>}>
                <Progress
                  percent={pct(kpi.checked, kpi.checkable)}
                  success={{ percent: pct(kpi.checked - kpi.adjusted, kpi.checkable) }}
                  strokeColor="#3b82f6"
                />
                <div className="mt-2 flex flex-col gap-1" style={{ fontSize: 13 }}>
                  <span><Tag color="success" style={{ marginInlineEnd: 6 }}>ถูกต้อง</Tag>{nf(kpi.checked - kpi.adjusted)} ใบ</span>
                  <span><Tag color="processing" style={{ marginInlineEnd: 6 }}>แก้จำนวนวัน</Tag>{nf(kpi.adjusted)} ใบ</span>
                  <span><Tag style={{ marginInlineEnd: 6 }}>ยังไม่ตรวจ</Tag>{nf(kpi.checkable - kpi.checked)} ใบ</span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {(Object.keys(ISSUE_META) as IssueKey[]).map(k => (
                    <Tooltip key={k} title={ISSUE_META[k].hint}>
                      <div className="flex items-center justify-between" style={{ cursor: 'help' }}>
                        <span><WarningOutlined style={{ marginInlineEnd: 6, color: 'var(--app-text-3)' }} />{ISSUE_META[k].label}</span>
                        <Tag color={issueCount[k] ? ISSUE_META[k].color : 'default'} style={{ marginInlineEnd: 0 }}>{nf(issueCount[k])} ใบ</Tag>
                      </div>
                    </Tooltip>
                  ))}
                </div>
                <div className="mt-4">
                  <Link href="/hr/leave/staff-history">ไปตรวจที่หน้าประวัติการลาเจ้าหน้าที่ →</Link>
                </div>
              </Section>
            </Col>
            <Col xs={24} xl={16}>
              <Section
                title={<><WarningOutlined className="mr-2" />ใบลาที่ควรตรวจ ({nf(issueRows.length)} ใบ)</>}
                extra={
                  <Select
                    size="small" value={issueFilter} onChange={setIssueFilter} style={{ width: 210 }}
                    options={[{ value: 'all', label: 'ทุกประเด็น' }, ...(Object.keys(ISSUE_META) as IssueKey[]).map(k => ({ value: k, label: ISSUE_META[k].label }))]}
                  />
                }
              >
                <Table<IssueRow>
                  size="small" rowKey={x => x.r.id} dataSource={issueRows}
                  pagination={{ pageSize: 8, showSizeChanger: false, showTotal: t => `${nf(t)} ใบ` }}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: <Empty description="ไม่มีใบลาที่ต้องตรวจ" /> }}
                  columns={[
                    {
                      title: 'ชื่อเจ้าหน้าที่', key: 'name', width: 200,
                      render: (_: unknown, x: IssueRow) => (
                        <div style={{ lineHeight: 1.3 }}>
                          <Text strong style={{ fontSize: 13 }}>{x.r.employee_name}</Text>
                          <div><Text type="secondary" style={{ fontSize: 11 }}>{x.r.group_name ?? '-'}</Text></div>
                        </div>
                      ),
                    },
                    {
                      title: 'ประเภท', key: 'type', width: 130,
                      render: (_: unknown, x: IssueRow) => (
                        <Space size={6}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: TYPE_COLOR[x.r.leave_type_code] ?? '#94a3b8' }} />
                          <Text style={{ fontSize: 13 }}>{shortType(x.r.leave_type_name)}</Text>
                        </Space>
                      ),
                    },
                    {
                      title: 'วันที่ลา', key: 'date', width: 170,
                      render: (_: unknown, x: IssueRow) => (
                        <div style={{ lineHeight: 1.3, fontSize: 13 }}>
                          {x.r.start_date === x.r.end_date ? beShort(x.r.start_date) : `${beShort(x.r.start_date)} – ${beShort(x.r.end_date)}`}
                          <div><Text type="secondary" style={{ fontSize: 11 }}>ยื่น {beShort(x.r.created_at)}</Text></div>
                        </div>
                      ),
                    },
                    {
                      title: 'วัน', key: 'days', width: 90, align: 'center' as const,
                      render: (_: unknown, x: IssueRow) => (
                        <div style={{ lineHeight: 1.3 }}>
                          <Text strong>{nf(Number(x.r.total_days))}</Text>
                          {x.keys.includes('days') && <div><Text type="secondary" style={{ fontSize: 11 }}>กฎนับ {nf(x.r.rule_days)}</Text></div>}
                        </div>
                      ),
                    },
                    {
                      title: 'ประเด็น', key: 'issues',
                      render: (_: unknown, x: IssueRow) => {
                        const note = x.keys.includes('days') ? dayMismatchNote(x.r) : null
                        return (
                          <div style={{ lineHeight: 1.4 }}>
                            <Space size={4} wrap>
                              {x.keys.map(k => <Tag key={k} color={ISSUE_META[k].color} style={{ marginInlineEnd: 0 }}>{ISSUE_META[k].label}</Tag>)}
                            </Space>
                            {note && (
                              <div>
                                <Tooltip title={note.detail || undefined}>
                                  <Text type="secondary" style={{ fontSize: 12, cursor: note.detail ? 'help' : undefined }}>
                                    {note.text}
                                    {note.detail && <> ({x.r.off_days.slice(0, 3).map(o => `${o.kind === 'HOLIDAY' ? 'หยุด' : OFF_LABEL[o.kind]} ${dayjs(o.date).format('D/M')}`).join(', ')}{x.r.off_days.length > 3 ? ', …' : ''})</>}
                                  </Text>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        )
                      },
                    },
                  ]}
                />
              </Section>
            </Col>
          </Row>

          {/* ── ตัวชี้วัดการอนุมัติของหัวหน้า ── */}
          <Card style={{ marginBottom: 16 }}
            variant="borderless" className="shadow-sm"
            title={<span style={{ fontSize: 14 }}><AuditOutlined className="mr-2" />ตัวชี้วัดการอนุมัติของหัวหน้า</span>}
            extra={
              <Tooltip title={GRADE_RULE}><Text type="secondary" style={{ fontSize: 12, cursor: 'help' }}><InfoCircleOutlined /> เกณฑ์ประเมิน</Text></Tooltip>
            }
          >
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={12} md={8} xl={4}><Kpi label="ผู้อนุมัติ" value={nf(approvers.length)} sub="คนที่มีใบลาเข้าคิวในช่วงนี้" /></Col>
              <Col xs={12} md={8} xl={4}><Kpi label="เวลาตอบสนอง (มัธยฐาน)" value={fmtWait(approverTotals.medianH)} sub="นับจากใบมาถึงคิวจนกด" /></Col>
              <Col xs={12} md={8} xl={4}>
                <Kpi label="ดำเนินการภายใน 3 วัน" value={`${approverTotals.slaPct}%`}
                  tone={approverTotals.slaPct >= 80 ? '#10b981' : approverTotals.slaPct >= 60 ? '#f59e0b' : '#ef4444'} sub="ของขั้นอนุมัติที่กดแล้ว" />
              </Col>
              <Col xs={12} md={8} xl={4}><Kpi label="ใบที่ค้างอยู่ในคิว" value={nf(approverTotals.waiting)} tone="#f59e0b" sub="รอหัวหน้ากด ณ ตอนนี้" /></Col>
              <Col xs={12} md={8} xl={4}>
                <Kpi label="ถึงวันลาแล้วยังไม่อนุมัติ" value={nf(approverTotals.pastStart)} tone={approverTotals.pastStart ? '#ef4444' : undefined}
                  sub="ผู้ลาไม่รู้ผลก่อนวันลา" />
              </Col>
              <Col xs={12} md={8} xl={4}>
                <Kpi label="หัวหน้าที่ต้องติดตาม" value={nf(approverTotals.watch)} tone={approverTotals.watch ? '#ef4444' : undefined}
                  sub={`ควรปรับปรุง ${nf(approverTotals.improve)} คน`} />
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} xl={10}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Text strong style={{ fontSize: 13 }}>{approverSort === 'median' ? 'ใช้เวลาต่อขั้นนานที่สุด (มัธยฐาน รวมใบค้าง, วัน)' : 'ใบค้างในคิวมากที่สุด'}</Text>
                  <Segmented
                    size="small" value={approverSort} onChange={v => setApproverSort(v as typeof approverSort)}
                    options={[{ value: 'median', label: 'ความเร็ว' }, { value: 'waiting', label: 'ใบค้าง' }]}
                  />
                </div>
                {approverChartRows.length
                  ? <EChart option={approverOption} height={Math.max(200, approverChartRows.length * 26 + 30)} />
                  : <Empty description={approverSort === 'median' ? 'ยังไม่มีใบลาเข้าคิวหัวหน้าในช่วงนี้' : 'ไม่มีใบค้างในคิว'} />}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <InfoCircleOutlined /> วัดหัวหน้าทุกคนในทุกขั้นของสายอนุมัติ — ขั้นที่ยังไม่กดนับเวลาที่รอมาจนถึงตอนนี้ จึงเห็นคนที่ทำให้ใบค้างแม้ยังไม่เคยกด · เส้นประ = เป้าหมาย 3 วัน
                </Text>
              </Col>
              <Col xs={24} xl={14}>
                <Table<ApproverKpi>
                  size="small" rowKey="id" dataSource={approvers}
                  pagination={{ pageSize: 8, showSizeChanger: false, showTotal: t => `${nf(t)} คน` }}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: <Empty description="ไม่มีข้อมูลการอนุมัติ" /> }}
                  expandable={{
                    rowExpandable: x => x.waiting > 0,
                    expandedRowRender: x => (
                      <Table
                        size="small" rowKey={w => `${w.step.request_id}-${w.step.step}`} pagination={false}
                        dataSource={x.waitingItems}
                        columns={[
                          { title: 'ผู้ลา', key: 'n', render: (_: unknown, w: ApproverKpi['waitingItems'][number]) => <Text style={{ fontSize: 13 }}>{w.req.employee_name}</Text> },
                          { title: 'ประเภท', key: 't', render: (_: unknown, w: ApproverKpi['waitingItems'][number]) => <Text style={{ fontSize: 13 }}>{shortType(w.req.leave_type_name)}</Text> },
                          {
                            title: 'วันที่ลา', key: 'd',
                            render: (_: unknown, w: ApproverKpi['waitingItems'][number]) => (
                              <Space size={6}>
                                <Text style={{ fontSize: 13 }}>{w.req.start_date === w.req.end_date ? beShort(w.req.start_date) : `${beShort(w.req.start_date)} – ${beShort(w.req.end_date)}`}</Text>
                                {!dayjs(w.req.start_date).isAfter(dayjs(), 'day') && <Tag color="error" style={{ marginInlineEnd: 0 }}>ถึงวันลาแล้ว</Tag>}
                              </Space>
                            ),
                          },
                          { title: 'ขั้น', key: 's', align: 'center' as const, render: (_: unknown, w: ApproverKpi['waitingItems'][number]) => w.step.step },
                          {
                            title: 'รอมาแล้ว', key: 'w', align: 'center' as const,
                            render: (_: unknown, w: ApproverKpi['waitingItems'][number]) => (
                              <Text strong style={{ color: w.waitH > SLA_HOURS ? '#ef4444' : undefined }}>{fmtWait(w.waitH)}</Text>
                            ),
                          },
                        ]}
                      />
                    ),
                  }}
                  columns={[
                    {
                      title: 'ผู้อนุมัติ', key: 'name', width: 230,
                      render: (_: unknown, x: ApproverKpi) => (
                        <div style={{ lineHeight: 1.3 }}>
                          <Text strong style={{ fontSize: 13 }}>{x.name}</Text>
                          <div><Text type="secondary" style={{ fontSize: 11 }}>{x.roles.join(' · ')}</Text></div>
                        </div>
                      ),
                    },
                    {
                      title: 'ผลประเมิน', key: 'grade', width: 110, align: 'center' as const,
                      render: (_: unknown, x: ApproverKpi) => <Tag color={GRADE_META[x.grade].color} style={{ marginInlineEnd: 0 }}>{GRADE_META[x.grade].label}</Tag>,
                    },
                    {
                      title: 'ได้รับ / กดแล้ว', key: 'acted', width: 110, align: 'center' as const,
                      render: (_: unknown, x: ApproverKpi) => <Text style={{ fontSize: 13 }}>{nf(x.received)} / {nf(x.acted)}</Text>,
                    },
                    {
                      title: 'ไม่อนุมัติ', key: 'rej', width: 90, align: 'center' as const,
                      render: (_: unknown, x: ApproverKpi) => x.rejected
                        ? <Text style={{ fontSize: 13 }}>{nf(x.rejected)} <Text type="secondary" style={{ fontSize: 11 }}>({pct(x.rejected, x.acted)}%)</Text></Text>
                        : <Text type="secondary">-</Text>,
                    },
                    {
                      title: 'มัธยฐาน', key: 'med', width: 90, align: 'center' as const,
                      sorter: (a: ApproverKpi, b: ApproverKpi) => a.medianH - b.medianH,
                      render: (_: unknown, x: ApproverKpi) => x.acted
                        ? <Text strong style={{ fontSize: 13, color: x.medianH > SLA_HOURS ? '#ef4444' : undefined }}>{fmtWait(x.medianH)}</Text>
                        : <Text type="secondary">-</Text>,
                    },
                    {
                      title: 'ภายใน 3 วัน', key: 'sla', width: 130,
                      sorter: (a: ApproverKpi, b: ApproverKpi) => a.slaPct - b.slaPct,
                      render: (_: unknown, x: ApproverKpi) => x.acted
                        ? <Progress percent={x.slaPct} size="small" strokeColor={x.slaPct >= 80 ? '#10b981' : x.slaPct >= 60 ? '#f59e0b' : '#ef4444'} />
                        : <Text type="secondary">-</Text>,
                    },
                    {
                      title: 'ค้างอยู่', key: 'wait', width: 120, align: 'center' as const,
                      sorter: (a: ApproverKpi, b: ApproverKpi) => a.waiting - b.waiting,
                      render: (_: unknown, x: ApproverKpi) => x.waiting ? (
                        <div style={{ lineHeight: 1.3 }}>
                          <Text strong style={{ fontSize: 13 }}>{nf(x.waiting)} ใบ</Text>
                          <div><Text type="secondary" style={{ fontSize: 11 }}>นานสุด {fmtWait(x.oldestH)}</Text></div>
                        </div>
                      ) : <Text type="secondary">-</Text>,
                    },
                    {
                      title: <Tooltip title="ใบที่ถึงวันลาแล้วแต่ยังรอหัวหน้าคนนี้กด">ถึงวันลาแล้ว</Tooltip>, key: 'past', width: 100, align: 'center' as const,
                      sorter: (a: ApproverKpi, b: ApproverKpi) => a.waitingPastStart - b.waitingPastStart,
                      render: (_: unknown, x: ApproverKpi) => x.waitingPastStart
                        ? <Tag color="error" style={{ marginInlineEnd: 0 }}>{nf(x.waitingPastStart)} ใบ</Tag> : <Text type="secondary">-</Text>,
                    },
                    {
                      title: <Tooltip title="อนุมัติหลังจากวันเริ่มลาไปแล้ว">อนุมัติหลังวันลา</Tooltip>, key: 'late', width: 110, align: 'center' as const,
                      render: (_: unknown, x: ApproverKpi) => x.lateApproved
                        ? <Text style={{ fontSize: 13 }}>{nf(x.lateApproved)} ใบ</Text> : <Text type="secondary">-</Text>,
                    },
                  ]}
                />
              </Col>
            </Row>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined /> นับใบของบุคลากรตามหน่วยงาน/ช่วงที่เลือก · ใบมาถึงคิว = ขั้นแรกนับจากวันยื่น ขั้นถัดไปนับจากเวลาที่ขั้นก่อนหน้ากด
              · กดแถวที่มีใบค้างเพื่อดูรายการ
            </Text>
          </Card>

          {/* ── แนวโน้ม ── */}
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} xl={16}>
              <Section title={`วันลารายเดือน แยกประเภท${fullBill ? '' : ' (แบ่งใบที่คร่อมเดือนตามสัดส่วน)'}`}>
                {counted.length ? <EChart option={monthOption} height={320} /> : <Empty description="ไม่มีข้อมูล" />}
              </Section>
            </Col>
            <Col xs={24} xl={8}>
              <Section title="สัดส่วนวันลาแยกประเภท">
                {typesInData.length ? (
                  <div className="flex flex-col gap-3">
                    {typesInData.map(([code, t]) => (
                      <div key={code}>
                        <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                          <Space size={6}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: TYPE_COLOR[code] ?? '#94a3b8' }} />
                            {t.name}
                          </Space>
                          <Text strong>{nf(t.days)} วัน <Text type="secondary" style={{ fontSize: 12 }}>({pct(t.days, kpi.days)}%)</Text></Text>
                        </div>
                        <Progress percent={pct(t.days, kpi.days)} showInfo={false} strokeColor={TYPE_COLOR[code] ?? '#94a3b8'} size="small" />
                      </div>
                    ))}
                  </div>
                ) : <Empty description="ไม่มีข้อมูล" />}
              </Section>
            </Col>
          </Row>

          {/* ── รูปแบบการลา ── */}
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} xl={12}>
              <Section title="วันเริ่มลาป่วย ตามวันในสัปดาห์">
                {sickTotal ? (
                  <>
                    <EChart option={weekdayOption} height={260} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <InfoCircleOutlined /> ลาป่วยที่เริ่มวันจันทร์หรือศุกร์ {monFriShare}% ของวันทำการ
                      (ถ้ากระจายเท่ากันจะอยู่ราว 40%) — สูงกว่ามากอาจเป็นการลาต่อวันหยุด ควรดูรายบุคคลประกอบ
                    </Text>
                  </>
                ) : <Empty description="ไม่มีการลาป่วย" />}
              </Section>
            </Col>
            <Col xs={24} xl={12}>
              <Section title="การยื่นลาพักผ่อนล่วงหน้า">
                <EChart option={leadOption} height={260} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <InfoCircleOutlined /> นับจากวันที่ยื่นถึงวันเริ่มลา — แท่งสีแดงคือยื่นหลังวันที่ลาไปแล้ว
                </Text>
              </Section>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} xl={14}>
              <Section
                title={<><TeamOutlined className="mr-2" />วันลาเฉลี่ยต่อบุคลากร ราย{rateLevel === 'submajor' ? 'หน่วยงานใน' + group : 'กลุ่มงาน'} (15 อันดับ)</>}
                extra={
                  <Segmented
                    size="small" value={rateType} onChange={v => setRateType(v as typeof rateType)}
                    options={[{ value: 'ALL', label: 'ทุกประเภท' }, { value: 'SICK', label: 'ป่วย' }, { value: 'PERS', label: 'กิจ' }, { value: 'ANNUAL', label: 'พักผ่อน' }]}
                  />
                }
              >
                {unitRate.length ? <EChart option={unitOption} height={Math.max(220, unitRate.length * 26 + 20)} /> : <Empty description="ไม่มีข้อมูล" />}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <InfoCircleOutlined /> วันลารวมในช่วงที่ดู ÷ จำนวนบุคลากรปัจจุบัน (ไม่รวม{rateLevel === 'submajor' ? 'หน่วยงาน' : 'กลุ่ม'}ที่มีน้อยกว่า 5 คน)
                </Text>
              </Section>
            </Col>
            <Col xs={24} xl={10}>
              <Section title="การใช้สิทธิ์ลาพักผ่อน">
                {usage.people ? (
                  <>
                    <div className="mb-2" style={{ fontSize: 13 }}>
                      ใช้ไปแล้ว <Text strong>{nf(usage.sumUsed)}</Text> จากสิทธิ์รวม {nf(usage.sumAvail)} วัน
                      (<Text strong>{usage.rate}%</Text>) · {nf(usage.people)} คน
                    </div>
                    <EChart option={usageOption} height={230} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <InfoCircleOutlined /> สัดส่วนวันที่ใช้ต่อสิทธิ์ทั้งหมด (ยกมา + ปีนี้) ของแต่ละคน — ช่วยวางแผนวันลาสะสมปลายปีงบ
                    </Text>
                  </>
                ) : <Empty description="ยังไม่มียอดวันลาพักผ่อนของปีงบนี้" />}
              </Section>
            </Col>
          </Row>

          {/* ── Bradford Factor ── */}
          <Section
            title={<><ClockCircleOutlined className="mr-2" />ความถี่การลาป่วย / ลากิจ รายบุคคล (Bradford Factor)</>}
            extra={<Tag color={bradfordWatch ? 'warning' : 'default'} style={{ marginInlineEnd: 0 }}>คะแนนตั้งแต่ 125 · {nf(bradfordWatch)} คน</Tag>}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              คะแนน = (จำนวนครั้งที่ลา)² × จำนวนวันลาป่วย/ลากิจรวม — ลาบ่อยครั้งละสั้น ๆ คะแนนสูงกว่าลายาวครั้งเดียว
              · ลาต่อเนื่องกัน (คั่นด้วยเสาร์-อาทิตย์ หรือลาประเภทอื่น เช่น ป่วย → พักผ่อน → กิจ) นับเป็นครั้งเดียว
              ใช้เป็นสัญญาณเพื่อพูดคุยดูแล ไม่ใช่เกณฑ์ลงโทษ (เกณฑ์อ้างอิงทั่วไป: 125 เฝ้าดู · 450 ควรพูดคุย)
            </Text>
            <Table style={{ marginTop: 12 }}
              size="small" rowKey="id" dataSource={bradford.slice(0, 50)}
              expandable={{
                expandRowByClick: true,
                expandedRowRender: (x: BradfordRow) => {
                  const recs = x.recs
                  return (
                    <div>
                      {x.merged > 0 && (
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                          <InfoCircleOutlined /> ลาป่วย/ลากิจ {nf(x.recs.filter(isBradfordType).length)} ใบ นับเป็น {nf(x.spells)} ครั้ง เพราะมี {nf(x.merged)} ใบที่ลาต่อเนื่องจากครั้งก่อน
                        </Text>
                      )}
                      <Table<Req>
                        size="small" rowKey="id" pagination={false} dataSource={recs}
                        onRow={r => ({ style: isBradfordType(r) ? undefined : { opacity: 0.55 } })}
                        columns={[
                          {
                            title: 'ครั้งที่', key: 'no', width: 70, align: 'center' as const,
                            render: (_: unknown, r: Req) => isBradfordType(r)
                              ? <Text strong>{x.spellOf.get(r.id)}</Text>
                              : <Tooltip title="ไม่นับในคะแนน (นับเฉพาะลาป่วย / ลากิจ)"><Text type="secondary">-</Text></Tooltip>,
                          },
                          {
                            title: 'ประเภท', key: 'type', width: 150,
                            render: (_: unknown, r: Req) => (
                              <Space size={6}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: TYPE_COLOR[r.leave_type_code] ?? '#94a3b8' }} />
                                <Text style={{ fontSize: 13 }}>{shortType(r.leave_type_name)}</Text>
                              </Space>
                            ),
                          },
                          {
                            title: 'วันที่ลา', key: 'date', width: 260,
                            render: (_: unknown, r: Req) => (
                              <span style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                                {r.start_date === r.end_date ? beShort(r.start_date) : `${beShort(r.start_date)} – ${beShort(r.end_date)}`}
                                <Text type="secondary" style={{ fontSize: 11, marginInlineStart: 6 }}>({WEEKDAYS[(dayjs(r.start_date).day() + 6) % 7]})</Text>
                              </span>
                            ),
                          },
                          {
                            title: 'วันลา', key: 'days', width: 80, align: 'center' as const,
                            render: (_: unknown, r: Req) => {
                              const d = dIn(r), full = Number(r.total_days)
                              return d === full ? <Text strong>{nf(full)}</Text> : (
                                <Tooltip title={`ทั้งใบ ${nf(full)} วัน — นับในช่วงที่ดู ${nf(d)} วัน`}><Text strong>{nf(d)}*</Text></Tooltip>
                              )
                            },
                          },
                          {
                            title: 'ห่างจากใบก่อน', key: 'gap', width: 120, align: 'center' as const,
                            render: (_: unknown, r: Req, i: number) => {
                              if (i === 0) return <Text type="secondary">-</Text>
                              const prevEnd = recs.slice(0, i).reduce((m, p) => (dayjs(p.end_date).isAfter(m) ? dayjs(p.end_date) : m), dayjs(recs[0].end_date))
                              if (onlyWeekendBetween(prevEnd, dayjs(r.start_date))) return <Tag color="processing" style={{ marginInlineEnd: 0 }}>ต่อเนื่อง</Tag>
                              const gap = dayjs(r.start_date).diff(prevEnd, 'day') - 1
                              return <Text style={{ fontSize: 13, color: gap <= 7 ? '#f59e0b' : undefined }}>{nf(gap)} วัน</Text>
                            },
                          },
                          { title: 'เหตุผล', key: 'reason', render: (_: unknown, r: Req) => r.reason ? <Text style={{ fontSize: 13, maxWidth: 300 }} ellipsis={{ tooltip: r.reason }}>{r.reason}</Text> : <Text type="secondary">-</Text> },
                          {
                            title: 'เอกสาร', key: 'doc', width: 70, align: 'center' as const,
                            render: (_: unknown, r: Req) => r.has_document ? <Tag color="success" style={{ marginInlineEnd: 0 }}>มี</Tag> : <Text type="secondary">-</Text>,
                          },
                          {
                            title: 'สถานะ', key: 'status', width: 120, align: 'center' as const,
                            render: (_: unknown, r: Req) => r.status === 'APPROVED'
                              ? <Tag color="success" style={{ marginInlineEnd: 0 }}>อนุมัติแล้ว</Tag>
                              : <Tag color="warning" style={{ marginInlineEnd: 0 }}>{r.status === 'CANCEL_PENDING' ? 'รออนุมัติยกเลิก' : 'รออนุมัติ'}</Tag>,
                          },
                        ]}
                      />
                    </div>
                  )
                },
              }}
              pagination={{ pageSize: 10, showSizeChanger: false, showTotal: () => `แสดง 50 อันดับแรก จาก ${nf(bradford.length)} คน` }}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: <Empty description="ไม่มีการลาป่วย / ลากิจ" /> }}
              columns={[
                { title: 'ลำดับ', key: 'no', width: 64, align: 'center' as const, render: (_: unknown, __: unknown, i: number) => <Text type="secondary">{i + 1}</Text> },
                { title: 'ชื่อเจ้าหน้าที่', dataIndex: 'name', key: 'name', width: 220, render: (t: string) => <Text strong style={{ fontSize: 13 }}>{t}</Text> },
                { title: 'กลุ่มงาน', dataIndex: 'group', key: 'group', width: 240, render: (t: string) => <Text style={{ fontSize: 13 }}>{t}</Text> },
                { title: 'จำนวนครั้ง', dataIndex: 'spells', key: 'spells', width: 100, align: 'center' as const },
                { title: 'วันลารวม', dataIndex: 'days', key: 'days', width: 100, align: 'center' as const, render: (v: number) => nf(v) },
                {
                  title: 'คะแนน', dataIndex: 'score', key: 'score', width: 110, align: 'center' as const,
                  render: (v: number) => (
                    <Tag color={v >= 450 ? 'error' : v >= 125 ? 'warning' : 'default'} style={{ marginInlineEnd: 0, minWidth: 56, textAlign: 'center' }}>
                      {nf(v)}
                    </Tag>
                  ),
                },
              ]}
            />
          </Section>
        </Spin>
      </div>
    </div>
  )
}

const LeaveDashboardPage = () => (
  <AppThemeProvider colorPrimary="#10b981">
    <LeaveAnalyticsContent />
  </AppThemeProvider>
)

export default LeaveDashboardPage
