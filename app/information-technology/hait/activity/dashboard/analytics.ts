// Dashboard บันทึกกิจกรรม IT — ส่วนคำนวณ (ไม่ผูกกับ React)
// ทุกฟังก์ชันรับชุดบันทึกที่ผ่านตัวกรอง (เดือน/เจ้าหน้าที่/ระบบ/ลักษณะงาน) แล้ว ตัวเลขทุกส่วนของหน้าจึงตรงกัน
import dayjs from 'dayjs'
import type { ActivityLog, Nature } from '../types'

export const DAY_START = 8
export const DAY_END = 17

/** บันทึกที่เตรียมฟิลด์ช่วยคำนวณไว้แล้ว (แปลงวันที่/เวลาครั้งเดียว ไม่ต้อง parse ซ้ำทุกกราฟ) */
export type Rec = ActivityLog & { ymd: string; ym: string; dow: number; startMin: number; endMin: number }

const toMin = (t: string) => {
  const [h, m] = (t || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const prepare = (logs: ActivityLog[]): Rec[] => logs.map(l => {
  const d = dayjs(l.log_date)
  return { ...l, ymd: d.format('YYYY-MM-DD'), ym: d.format('YYYY-MM'), dow: d.day(), startMin: toMin(l.start_time), endMin: toMin(l.end_time) }
})

// ── ตัวกรอง ─────────────────────────────────────────────────────────────────
export interface DashFilter { month: string | null; staff: number | null; system: string | null; nature: Nature | null }
export const NO_FILTER: DashFilter = { month: null, staff: null, system: null, nature: null }

export const applyFilter = (recs: Rec[], f: DashFilter) => recs.filter(r =>
  (f.month == null || r.ym === f.month)
  && (f.staff == null || r.staff_id === f.staff)
  && (f.system == null || r.system_code === f.system)
  && (f.nature == null || r.activity_nature === f.nature))

export const NATURES: Nature[] = ['reactive', 'proactive', 'neutral']
export const NATURE_LABEL: Record<Nature, string> = { reactive: 'เชิงรับ', proactive: 'เชิงรุก', neutral: 'งานกลาง' }

// ── ปีงบ / เดือน ────────────────────────────────────────────────────────────
const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export const fiscalYearOf = (d: dayjs.Dayjs) => d.year() + (d.month() >= 9 ? 1 : 0) + 543

/** 12 เดือนของปีงบ (ต.ค.–ก.ย.) เป็น YYYY-MM */
export const fyMonths = (fyBE: number) => Array.from({ length: 12 }, (_, i) =>
  dayjs(`${fyBE - 544}-10-01`).add(i, 'month').format('YYYY-MM'))

/** "ต.ค. 69" */
export const monthLabel = (ym: string, long = false) => {
  const [y, m] = ym.split('-').map(Number)
  return long ? `${TH_MONTH[m - 1]} ${y + 543}` : `${TH_MONTH[m - 1]} ${String(y + 543).slice(-2)}`
}

export const parseYm = (ym: string) => dayjs(`${ym}-01`)
export const prevMonth = (ym: string) => parseYm(ym).subtract(1, 'month').format('YYYY-MM')

// ── ตัวเลขสรุป ──────────────────────────────────────────────────────────────
export interface Kpis {
  n: number
  minutes: number
  days: number              // วันที่มีบันทึก
  staffCount: number
  avgStaffDayMin: number    // นาทีที่บันทึกเฉลี่ยต่อคนต่อวันที่บันทึก
  nature: Record<Nature, number>  // นาที
  reactivePct: number       // % ของเวลา
  unplanned: number         // จำนวนงานที่ไม่ได้มาจากแผน (โทร/walk-in/ไลน์ ...)
  unplannedPct: number
  urgent: number
  urgentPct: number
  urgentAvgMin: number
  open: number
  oldestOpenDays: number
  openOver7: number
}

const pct = (n: number, d: number) => (d > 0 ? (n * 100) / d : 0)
export const ageDays = (ymd: string, today = dayjs()) => today.startOf('day').diff(dayjs(ymd), 'day')

export const kpis = (recs: Rec[]): Kpis => {
  const minutes = recs.reduce((s, r) => s + r.minutes_used, 0)
  const nature = { reactive: 0, proactive: 0, neutral: 0 } as Record<Nature, number>
  recs.forEach(r => { if (r.activity_nature in nature) nature[r.activity_nature] += r.minutes_used })
  const staffDays = new Set(recs.map(r => `${r.staff_id}|${r.ymd}`)).size
  const unplanned = recs.filter(r => r.source_is_planned !== true).length
  const urgent = recs.filter(r => r.priority_code === 'urgent')
  const open = recs.filter(r => !r.is_closed)
  const ages = open.map(r => ageDays(r.ymd))
  return {
    n: recs.length,
    minutes,
    days: new Set(recs.map(r => r.ymd)).size,
    staffCount: new Set(recs.map(r => r.staff_id)).size,
    avgStaffDayMin: staffDays ? minutes / staffDays : 0,
    nature,
    reactivePct: pct(nature.reactive, minutes),
    unplanned,
    unplannedPct: pct(unplanned, recs.length),
    urgent: urgent.length,
    urgentPct: pct(urgent.length, recs.length),
    urgentAvgMin: urgent.length ? urgent.reduce((s, r) => s + r.minutes_used, 0) / urgent.length : 0,
    open: open.length,
    oldestOpenDays: ages.length ? Math.max(...ages) : 0,
    openOver7: ages.filter(a => a > 7).length,
  }
}

// ── แยกตามมิติ (ชั่วโมงแยกลักษณะงาน) ─────────────────────────────────────────
export interface NatureRow {
  key: string
  name: string
  n: number
  minutes: number
  nature: Record<Nature, number>  // นาที
  urgent: number
}

const groupNature = (recs: Rec[], keyOf: (r: Rec) => string, nameOf: (r: Rec) => string): NatureRow[] => {
  const acc = new Map<string, NatureRow>()
  for (const r of recs) {
    const k = keyOf(r)
    let a = acc.get(k)
    if (!a) acc.set(k, a = { key: k, name: nameOf(r), n: 0, minutes: 0, nature: { reactive: 0, proactive: 0, neutral: 0 }, urgent: 0 })
    a.n++
    a.minutes += r.minutes_used
    if (r.activity_nature in a.nature) a.nature[r.activity_nature] += r.minutes_used
    if (r.priority_code === 'urgent') a.urgent++
  }
  return [...acc.values()].sort((x, y) => y.minutes - x.minutes)
}

/** รายเดือนในปีงบ ตั้งแต่เดือนแรกถึงเดือนสุดท้ายที่มีบันทึก — เดือนว่างตรงกลางเป็น 0 ให้เห็นช่วงที่ขาด
 *  (ตัดหัว/ท้ายที่ว่างออก ไม่งั้นปีงบที่เพิ่งเริ่มบันทึกจะเหลือแท่งเดียวท่ามกลางเดือนว่าง) */
export const monthly = (recs: Rec[], fyBE: number): NatureRow[] => {
  const g = new Map(groupNature(recs, r => r.ym, r => r.ym).map(r => [r.key, r]))
  const all = fyMonths(fyBE)
  const has = all.map(ym => g.has(ym))
  const first = has.indexOf(true)
  if (first < 0) return []
  return all.slice(first, has.lastIndexOf(true) + 1)
    .map(ym => g.get(ym) ?? { key: ym, name: ym, n: 0, minutes: 0, nature: { reactive: 0, proactive: 0, neutral: 0 }, urgent: 0 })
    .map(r => ({ ...r, name: monthLabel(r.key) }))
}

export const bySystem = (recs: Rec[]) => groupNature(recs, r => r.system_code, r => r.system_name)

/** ประเภทกิจกรรม — ประเภทหนึ่งมีลักษณะงานเดียว */
export const byType = (recs: Rec[]) => groupNature(recs, r => r.type_code, r => r.type_name_th)
  .map(r => ({ ...r, kind: NATURES.find(n => r.nature[n] > 0) ?? 'neutral' as Nature }))

export interface StaffRow extends NatureRow {
  id: number
  days: number
  avgDayMin: number
  reactivePct: number
  open: number
  topType: string
}

export const byStaff = (recs: Rec[]): StaffRow[] => groupNature(recs, r => String(r.staff_id), r => r.staff_name).map(row => {
  const mine = recs.filter(r => String(r.staff_id) === row.key)
  const days = new Set(mine.map(r => r.ymd)).size
  const types = byType(mine)
  return {
    ...row,
    id: Number(row.key),
    days,
    avgDayMin: days ? row.minutes / days : 0,
    reactivePct: pct(row.nature.reactive, row.minutes),
    open: mine.filter(r => !r.is_closed).length,
    topType: types[0]?.name ?? '-',
  }
})

// ── ช่วงเวลา × วันในสัปดาห์ ─────────────────────────────────────────────────
export const DOW_LABEL = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

/** ชั่วโมงงานที่ทับแต่ละช่วงชั่วโมง (นับตามนาทีที่ทับจริง — งาน 08:00–08:30 ก็นับในช่อง 08:00) */
export const heat = (recs: Rec[]) => {
  const weekend = recs.some(r => r.dow === 0 || r.dow === 6)
  const days = weekend ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5]
  const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)
  const minutes = days.map(() => hours.map(() => 0))
  const tasks = days.map(() => hours.map(() => 0))
  for (const r of recs) {
    const di = days.indexOf(r.dow)
    if (di < 0) continue
    hours.forEach((h, hi) => {
      const overlap = Math.min(r.endMin, (h + 1) * 60) - Math.max(r.startMin, h * 60)
      if (overlap > 0) { minutes[di][hi] += overlap; tasks[di][hi]++ }
    })
  }
  return { days, hours, minutes, tasks }
}

// ── ที่มาของงาน ─────────────────────────────────────────────────────────────
export const bySource = (recs: Rec[]) => {
  const acc = new Map<string, { key: string; name: string; planned: boolean; n: number; minutes: number }>()
  for (const r of recs) {
    const k = r.source_code
    let a = acc.get(k)
    if (!a) acc.set(k, a = { key: k, name: r.source_name || k, planned: r.source_is_planned === true, n: 0, minutes: 0 })
    a.n++
    a.minutes += r.minutes_used
  }
  return [...acc.values()].sort((x, y) => y.n - x.n)
}

// ── งานค้าง / ครุภัณฑ์ซ่อมซ้ำ ────────────────────────────────────────────────
/** รหัสครุภัณฑ์ที่ใช้ได้ — ข้อมูลจริงมีคนกรอก "-" แทนว่าไม่มีรหัส (นับรวมกันจะกลายเป็นครุภัณฑ์ซ่อมซ้ำอันดับ 1) */
export const realAssetCode = (code: string | null) => !!code && /[0-9A-Za-zก-๙]/.test(code)

export const openTasks = (recs: Rec[]) => recs.filter(r => !r.is_closed)
  .map(r => ({ ...r, age: ageDays(r.ymd) }))
  .sort((a, b) => b.age - a.age)

export interface AssetRow { key: string; n: number; minutes: number; systems: string[]; last: string; logs: Rec[] }

/** ครุภัณฑ์ที่มีงานเชิงรับ (ซ่อม/แก้ปัญหา) ตั้งแต่ 2 ครั้ง — ตัวเลือกให้วางแผนเปลี่ยน/อัปเกรด */
export const repeatAssets = (recs: Rec[]): AssetRow[] => {
  const acc = new Map<string, Rec[]>()
  recs.filter(r => realAssetCode(r.asset_code) && r.activity_nature === 'reactive').forEach(r => {
    const k = r.asset_code!.trim()
    acc.set(k, [...(acc.get(k) ?? []), r])
  })
  return [...acc.entries()].filter(([, l]) => l.length >= 2).map(([key, l]) => ({
    key, n: l.length, minutes: l.reduce((s, r) => s + r.minutes_used, 0),
    systems: [...new Set(l.map(r => r.system_name))],
    last: l.map(r => r.ymd).sort().at(-1)!,
    logs: [...l].sort((a, b) => b.ymd.localeCompare(a.ymd)),
  })).sort((a, b) => b.n - a.n || b.minutes - a.minutes)
}

// ── ความครบของการบันทึก (หลักฐาน HAIT) ─────────────────────────────────────
export interface FieldFill { key: string; label: string; have: number; total: number; pct: number; note?: string }

export const recording = (recs: Rec[]): FieldFill[] => {
  const f = (key: string, label: string, base: Rec[], ok: (r: Rec) => boolean, note?: string): FieldFill => {
    const have = base.filter(ok).length
    return { key, label, have, total: base.length, pct: pct(have, base.length), note }
  }
  const maint = recs.filter(r => r.type_code === 'maintenance')
  return [
    f('outcome', 'ผลลัพธ์ของงาน', recs, r => !!r.outcome?.trim()),
    f('location', 'สถานที่', recs, r => !!r.location?.trim()),
    f('asset', 'รหัสครุภัณฑ์ (งานซ่อมบำรุง)', maint, r => realAssetCode(r.asset_code), 'ใช้หาครุภัณฑ์ที่ซ่อมซ้ำ (ไม่นับ "-")'),
    f('ticket', 'เลข Ticket', recs, r => !!r.ticket_id?.trim(), 'ใช้โยงกับระบบแจ้งซ่อม'),
  ]
}

// ── ข้อค้นพบสำคัญ (แบบย่อ) ──────────────────────────────────────────────────
export type FindingAction = { kind: 'filter'; patch: Partial<DashFilter> } | { kind: 'scroll'; target: string }
export interface Finding { key: string; tone: 'info' | 'warn' | 'good'; title: string; detail: string; action?: FindingAction }

const fmt = (n: number, d = 0) => n.toLocaleString('th-TH', { maximumFractionDigits: d, minimumFractionDigits: d })
const hrs = (min: number) => `${fmt(min / 60, min >= 600 ? 0 : 1)} ชม.`

export const findings = (recs: Rec[], k: Kpis, prev: Kpis | null, f: DashFilter): Finding[] => {
  const out: Finding[] = []
  if (!recs.length) return out
  const systems = bySystem(recs)

  // 1) สัดส่วนงานเชิงรับ (เวลาไปกับการแก้ปัญหา) — ยิ่งสูงยิ่งมีเวลาพัฒนาน้อย
  if (f.nature == null) {
    const diff = prev && prev.n > 0 ? k.reactivePct - prev.reactivePct : null
    out.push({
      key: 'reactive', tone: k.reactivePct >= 40 ? 'warn' : k.reactivePct <= 25 ? 'good' : 'info',
      title: `งานเชิงรับ ${fmt(k.reactivePct)}% ของเวลา`,
      detail: diff != null && Math.abs(diff) >= 1
        ? `${diff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${fmt(Math.abs(diff))} จุดจากเดือนก่อน`
        : `${hrs(k.nature.reactive)} · เชิงรุก ${fmt(pct(k.nature.proactive, k.minutes))}%`,
      action: { kind: 'filter', patch: { nature: 'reactive' } },
    })
  }

  // 2) ระบบที่กินเวลาแก้ปัญหามากสุด
  const pain = [...systems].sort((a, b) => b.nature.reactive - a.nature.reactive)[0]
  if (pain && pain.nature.reactive > 0 && f.system == null) {
    out.push({
      key: 'pain', tone: 'warn',
      title: `${pain.name}: แก้ปัญหา ${hrs(pain.nature.reactive)}`,
      detail: `${fmt(pct(pain.nature.reactive, k.nature.reactive))}% ของงานเชิงรับ${pain.urgent ? ` · ด่วน ${fmt(pain.urgent)} งาน` : ''}`,
      action: { kind: 'filter', patch: { system: pain.key } },
    })
  }

  // 3) งานขัดจังหวะ (ไม่ได้มาจากแผน)
  const src = bySource(recs).filter(s => !s.planned)[0]
  out.push({
    key: 'unplanned', tone: k.unplannedPct >= 70 ? 'warn' : 'info',
    title: `งานไม่ได้วางแผน ${fmt(k.unplannedPct)}%`,
    detail: src ? `มาจาก${src.name}มากสุด ${fmt(pct(src.n, k.n))}%` : `${fmt(k.unplanned)} งาน`,
  })

  // 4) งานค้าง
  if (k.open > 0) {
    out.push({
      key: 'open', tone: k.openOver7 > 0 ? 'warn' : 'info',
      title: `งานยังไม่ปิด ${fmt(k.open)} งาน`,
      detail: `ค้างนานสุด ${fmt(k.oldestOpenDays)} วัน${k.openOver7 ? ` · เกิน 7 วัน ${fmt(k.openOver7)} งาน` : ''}`,
      action: { kind: 'scroll', target: 'act-open' },
    })
  }

  // 5) ครุภัณฑ์ซ่อมซ้ำ
  const assets = repeatAssets(recs)
  if (assets.length) {
    out.push({
      key: 'assets', tone: 'warn',
      title: `ครุภัณฑ์ซ่อมซ้ำ ${fmt(assets.length)} รายการ`,
      detail: `มากสุด ${assets[0].key} ${fmt(assets[0].n)} ครั้ง`,
      action: { kind: 'scroll', target: 'act-assets' },
    })
  }

  // 6) ภาระงานไม่สมดุล — เทียบชั่วโมงที่บันทึกกับค่ามัธยฐานของทีม (อย่างน้อย 3 คน)
  if (f.staff == null) {
    const staff = byStaff(recs)
    if (staff.length >= 3) {
      const sorted = staff.map(s => s.minutes).sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      const top = staff[0]
      const ratio = median > 0 ? top.minutes / median : 0
      if (ratio >= 1.5) {
        out.push({
          key: 'load', tone: 'warn',
          title: `ภาระงานสูงสุด ${fmt(ratio, 1)}× ค่ามัธยฐาน`,
          detail: `${top.name} ${hrs(top.minutes)} (${fmt(top.days)} วัน)`,
          action: { kind: 'filter', patch: { staff: top.id } },
        })
      }
    }
  }

  // 7) การบันทึกผลลัพธ์ (หลักฐานประกอบการประเมิน HAIT)
  const outcome = recording(recs)[0]
  if (outcome.pct < 80) {
    out.push({
      key: 'record', tone: 'warn',
      title: `บันทึกผลลัพธ์แค่ ${fmt(outcome.pct)}%`,
      detail: 'หลักฐาน HAIT ไม่ครบ',
      action: { kind: 'scroll', target: 'act-record' },
    })
  }
  return out
}
