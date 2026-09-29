// การคำนวณค่าเสื่อมราคาแบบเส้นตรง (straight-line) ตามปีงบประมาณไทย
//
// ยืนยันจากข้อมูลจริงในตาราง deprecia แล้วว่าใช้วิธีเส้นตรง:
//   คอลัมน์ deprec (อัตราต่อปี %) = 100 / expired (อายุการใช้งานเป็นปี) ในเกือบทุกแถว
//
// ปีงบประมาณไทย = 1 ต.ค. ถึง 30 ก.ย. — ปีงบ (พ.ศ.) ของวันที่ 30 ก.ย. ปีนั้น

export type ProrateMode = 'daily' | 'monthly' | 'full'

// ── เกณฑ์มูลค่าขั้นต่ำที่ต้องคิดค่าเสื่อมราคา ────────────────────────────────
//
// ของที่ราคาต่ำกว่าเกณฑ์ถือเป็นวัสดุ ตัดเป็นค่าใช้จ่ายทั้งจำนวนในปีที่ได้มา
// ไม่ต้องคิดค่าเสื่อมและไม่นับเป็นครุภัณฑ์ในรายงาน
//
// เกณฑ์ขยับจาก 5,000 เป็น 10,000 บาท ตั้งแต่ต้นปีงบ 2563 (1 ต.ค. 2562)
// จึงต้องดูวันที่รับของเป็นตัวตัดสิน ไม่ใช่ใช้เกณฑ์เดียวกับทุกรายการ
export const CAPITAL_RULE_FROM = '2019-10-01'   // 1 ต.ค. 2562 = วันแรกของปีงบ 2563
export const CAPITAL_MIN_FROM_2563 = 10_000
export const CAPITAL_MIN_BEFORE_2563 = 5_000

/** มูลค่าขั้นต่ำที่ใช้กับของที่รับวันนั้น */
export const capitalThreshold = (receive: string): number =>
  receive.slice(0, 10) >= CAPITAL_RULE_FROM ? CAPITAL_MIN_FROM_2563 : CAPITAL_MIN_BEFORE_2563

/** ราคาถึงเกณฑ์ครุภัณฑ์ที่ต้องคิดค่าเสื่อมหรือไม่ (ราคาต่อหน่วย) */
export const isDepreciable = (cost: number, receive: string | null | undefined): boolean => {
  if (!receive || !Number.isFinite(cost)) return false
  return cost >= capitalThreshold(receive)
}

export interface ScheduleRow {
  fyBE: number        // ปีงบประมาณ พ.ศ.
  from: string        // วันเริ่มคิดในปีงบนี้ (YYYY-MM-DD)
  to: string          // วันสุดท้ายที่คิดในปีงบนี้
  days: number        // จำนวนวันที่คิด
  amount: number      // ค่าเสื่อมของปีงบนี้
  accumulated: number // ค่าเสื่อมสะสมถึงสิ้นปีงบนี้
  nbv: number         // มูลค่าสุทธิตามบัญชีปลายปีงบ
}

export interface ScheduleResult {
  rows: ScheduleRow[]
  perYear: number        // ค่าเสื่อมเต็มปี
  ratePercent: number    // อัตราค่าเสื่อมต่อปี (%)
  depreciableBase: number // ฐานที่นำมาคิด = ราคาทุน - ราคาซาก
  endDate: string        // วันสุดท้ายของอายุการใช้งาน
}

const MS_PER_DAY = 86_400_000

const toUTC = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`)
const iso = (d: Date) => d.toISOString().slice(0, 10)

/** ปีงบประมาณ (ค.ศ.) ของวันที่ — ตั้งแต่ 1 ต.ค. นับเป็นปีงบถัดไป */
const fyOf = (d: Date) => (d.getUTCMonth() >= 9 ? d.getUTCFullYear() + 1 : d.getUTCFullYear())
const fyStart = (fy: number) => new Date(Date.UTC(fy - 1, 9, 1))
const fyEnd = (fy: number) => new Date(Date.UTC(fy, 8, 30))

/** จำนวนวันแบบนับรวมวันแรกและวันสุดท้าย */
const dayCount = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / MS_PER_DAY) + 1

const addYears = (d: Date, n: number) => {
  const x = new Date(d)
  x.setUTCFullYear(x.getUTCFullYear() + n)
  return x
}

/** ยอดค่าเสื่อมของช่วง [from, to] ที่อยู่ในปีงบ fy ตามวิธีคิดที่เลือก */
function windowAmount(fy: number, from: Date, to: Date, perYear: number, mode: ProrateMode): number {
  if (to < from) return 0
  if (mode === 'full') return perYear
  if (mode === 'monthly') {
    const months =
      (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      (to.getUTCMonth() - from.getUTCMonth()) + 1
    return perYear * (months / 12)
  }
  return perYear * (dayCount(from, to) / dayCount(fyStart(fy), fyEnd(fy)))
}

export interface DepreciationParams {
  cost: number
  lifeYears: number
  receive: string
  residual?: number
  mode?: ProrateMode
}

/** ค่าคงที่ที่ใช้ร่วมกันของสินทรัพย์หนึ่งชิ้น — คืน null ถ้าข้อมูลไม่พอคำนวณ */
function basis(p: DepreciationParams) {
  const { cost, lifeYears, receive, residual = 1 } = p
  if (!Number.isFinite(cost) || cost <= 0) return null
  if (!Number.isFinite(lifeYears) || lifeYears <= 0) return null
  if (!receive) return null
  const start = toUTC(receive)
  if (Number.isNaN(start.getTime())) return null
  const endAll = addYears(start, lifeYears)
  endAll.setUTCDate(endAll.getUTCDate() - 1)
  const depreciableBase = Math.max(cost - residual, 0)
  return { start, endAll, depreciableBase, perYear: depreciableBase / lifeYears }
}

export interface AsOfResult {
  asOf: string
  accumulated: number   // ค่าเสื่อมสะสมถึงวันนั้น
  nbv: number           // มูลค่าสุทธิตามบัญชี ณ วันนั้น
  fullyDepreciated: boolean
  beforeStart: boolean  // วันที่เลือกอยู่ก่อนวันรับ ยังไม่เริ่มคิด
}

/**
 * ค่าเสื่อมสะสม ณ วันที่ใดก็ได้ (ไม่จำเป็นต้องเป็นสิ้นปีงบ)
 * คิดปีงบที่ยังไม่จบแบบตามสัดส่วนของวิธีที่เลือก
 */
export function accumulatedAsOf(p: DepreciationParams, asOf: string): AsOfResult | null {
  const b = basis(p)
  if (!b) return null
  const at = toUTC(asOf)
  if (Number.isNaN(at.getTime())) return null

  if (at < b.start) {
    return { asOf, accumulated: 0, nbv: p.cost, fullyDepreciated: false, beforeStart: true }
  }

  // ครบอายุการใช้งานแล้ว = คิดค่าเสื่อมเต็มฐานเสมอ
  // ไม่คำนวณจากสัดส่วนวัน เพราะผลรวมสัดส่วนอาจไม่ลงตัวพอดีเมื่อเจอปีอธิกสุรทิน
  if (at >= b.endAll) {
    return {
      asOf,
      accumulated: b.depreciableBase,
      nbv: p.cost - b.depreciableBase,
      fullyDepreciated: true,
      beforeStart: false,
    }
  }

  const limit = at < b.endAll ? at : b.endAll
  const mode = p.mode ?? 'daily'
  let acc = 0

  for (let fy = fyOf(b.start); fy <= fyOf(limit); fy++) {
    const from = new Date(Math.max(b.start.getTime(), fyStart(fy).getTime()))
    const to = new Date(Math.min(limit.getTime(), fyEnd(fy).getTime()))
    acc += windowAmount(fy, from, to, b.perYear, mode)
    if (acc >= b.depreciableBase) { acc = b.depreciableBase; break }
  }

  return {
    asOf,
    accumulated: acc,
    nbv: p.cost - acc,
    fullyDepreciated: acc >= b.depreciableBase - 1e-9,
    beforeStart: false,
  }
}

/** ค่าเสื่อมที่เกิดขึ้นระหว่างช่วง [from, to] — ใช้ปิดงบรายเดือน/รายไตรมาส */
export function expenseBetween(p: DepreciationParams, from: string, to: string): number | null {
  const dayBefore = toUTC(from)
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1)
  const a = accumulatedAsOf(p, iso(dayBefore))
  const b = accumulatedAsOf(p, to)
  if (!a || !b) return null
  return Math.max(b.accumulated - a.accumulated, 0)
}

/**
 * สร้างตารางค่าเสื่อมราคารายปีงบประมาณ
 * ปีสุดท้ายจะถูกปัดเศษให้ค่าเสื่อมสะสมเท่ากับฐานพอดี มูลค่าสุทธิจึงลงเอยที่ราคาซากเป๊ะ
 */
export function buildSchedule(opts: {
  cost: number
  lifeYears: number
  receive: string
  residual?: number
  mode?: ProrateMode
}): ScheduleResult | null {
  const { cost, lifeYears, receive, residual = 1, mode = 'daily' } = opts
  if (!Number.isFinite(cost) || cost <= 0) return null
  if (!Number.isFinite(lifeYears) || lifeYears <= 0) return null
  if (!receive) return null

  const start = toUTC(receive)
  if (Number.isNaN(start.getTime())) return null

  // วันสุดท้ายของอายุการใช้งาน = ครบ n ปีนับจากวันรับ แล้วถอยหลัง 1 วัน
  const endAll = addYears(start, lifeYears)
  endAll.setUTCDate(endAll.getUTCDate() - 1)

  const depreciableBase = Math.max(cost - residual, 0)
  const perYear = depreciableBase / lifeYears

  const rows: ScheduleRow[] = []
  let accumulated = 0

  for (let fy = fyOf(start); fy <= fyOf(endAll); fy++) {
    const from = new Date(Math.max(start.getTime(), fyStart(fy).getTime()))
    const to = new Date(Math.min(endAll.getTime(), fyEnd(fy).getTime()))
    const days = dayCount(from, to)

    let amount = windowAmount(fy, from, to, perYear, mode)

    // กันคิดเกินฐาน — ปีสุดท้ายรับเศษที่เหลือทั้งหมด
    if (accumulated + amount > depreciableBase) amount = depreciableBase - accumulated
    accumulated += amount

    rows.push({
      fyBE: fy + 543,
      from: iso(from),
      to: iso(to),
      days,
      amount,
      accumulated,
      nbv: cost - accumulated,
    })

    if (accumulated >= depreciableBase - 1e-9) break
  }

  // ผลรวมสัดส่วนวันของแต่ละปีงบไม่ลงตัวเป็นจำนวนปีพอดีเมื่อมีปีอธิกสุรทินคั่น
  // เช่น รับ 11 พ.ย. 65 อายุ 5 ปี -> ปีแรก 324/365 + ปีสุดท้าย 41/366 = 0.9997 ไม่ใช่ 1
  // ปีสุดท้ายจึงต้องรับส่วนต่างไว้ ไม่งั้นมูลค่าสุทธิจะไม่ลงที่ราคาซาก (ค้างเกินอยู่ไม่กี่สตางค์)
  const last = rows[rows.length - 1]
  if (last && accumulated < depreciableBase) {
    last.amount += depreciableBase - accumulated
    last.accumulated = depreciableBase
    last.nbv = cost - depreciableBase
    accumulated = depreciableBase
  }

  return {
    rows,
    perYear,
    ratePercent: 100 / lifeYears,
    depreciableBase,
    endDate: iso(endAll),
  }
}

/** ปีงบประมาณ พ.ศ. ปัจจุบัน */
export const currentFyBE = (today = new Date()) =>
  (today.getMonth() >= 9 ? today.getFullYear() + 1 : today.getFullYear()) + 543

// ── การแสดงวันที่ ────────────────────────────────────────────────────────────
// ข้อมูลในระบบเก็บเป็น ค.ศ. (YYYY-MM-DD) ทั้งหมด แปลงเป็น พ.ศ. ตอนแสดงผลเท่านั้น
// จะได้ไม่ปนกันระหว่างค่าที่เอาไปคำนวณ/เรียงลำดับ กับค่าที่ผู้ใช้เห็น
const TH_MONTH_ABBR = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

/** 2021-10-01 → 01/10/2564 */
export const thaiDate = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${Number(y) + 543}`
}

/** 2021-10 หรือ 2021-10-01 → ต.ค. 2564 */
export const thaiMonth = (ym: string | null | undefined): string => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const i = Number(m) - 1
  if (!y || !TH_MONTH_ABBR[i]) return ym
  return `${TH_MONTH_ABBR[i]} ${Number(y) + 543}`
}

export const money = (v: number) =>
  v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
