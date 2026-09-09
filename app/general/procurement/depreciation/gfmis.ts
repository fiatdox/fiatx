// การคำนวณค่าเสื่อมราคาแบบ GFMIS — เกณฑ์นับเดือน (กรมบัญชีกลาง)
//
// กติกาเดือนแรก
//   รับของวันที่ 1–15  -> นับเดือนที่รับเป็นเดือนเต็ม เริ่มคิดเดือนนั้นเลย
//   รับของวันที่ 16–31 -> ยกยอดไปเริ่มคิดเดือนถัดไป
//
// ค่าเสื่อมต่อเดือน = ราคาทุน / (อายุการใช้งาน x 12)
// เดือนที่คิดแล้ว = นับเฉพาะเดือนที่ผ่านไปครบทั้งเดือน ณ วันที่ที่ระบุ
//
// ตัวอย่างตรวจสอบ: ราคา 10,000 รับ 2023-11-16 อายุ 5 ปี ณ 2026-09-30
//   รับวันที่ 16 -> เริ่มคิด ธ.ค. 2023 -> ถึง ก.ย. 2026 = 34 เดือน
//   34 x (10,000/60) = 5,666.67  คงเหลือ 26 เดือน = 4,333.33

export interface GfmisParams {
  cost: number
  lifeYears: number
  receive: string       // YYYY-MM-DD
  residual?: number     // ปกติ GFMIS ไม่กันราคาซาก (ค่าเริ่มต้น 0)
}

export interface GfmisFyRow {
  fyBE: number
  months: number        // จำนวนเดือนที่คิดค่าเสื่อมในปีงบนี้
  from: string          // YYYY-MM เดือนแรกที่คิดในปีงบนี้
  to: string            // YYYY-MM เดือนสุดท้าย
  amount: number
  accumulated: number
  nbv: number
}

export interface GfmisResult {
  startsNextMonth: boolean  // true = รับวันที่ 16-31 จึงยกยอดไปเดือนถัดไป
  receiveDay: number
  startMonth: string        // YYYY-MM เดือนแรกที่เริ่มคิด
  endMonth: string          // YYYY-MM เดือนสุดท้ายของอายุการใช้งาน
  perMonth: number
  totalMonths: number
  usedMonths: number
  remainingMonths: number
  accumulated: number       // ค่าเสื่อมที่ใช้ไปแล้ว
  remaining: number         // ค่าเสื่อมที่ยังไม่เกิด
  nbv: number
  rows: GfmisFyRow[]
}

/** ดัชนีเดือนแบบนับต่อเนื่อง เพื่อบวกลบเดือนได้ตรง ๆ */
const monthIndex = (year: number, month0: number) => year * 12 + month0
const fromIndex = (idx: number) => ({ year: Math.floor(idx / 12), month0: idx % 12 })
const fmtMonth = (idx: number) => {
  const { year, month0 } = fromIndex(idx)
  return `${year}-${String(month0 + 1).padStart(2, '0')}`
}

/** ปีงบประมาณ (ค.ศ.) ของเดือนนั้น — ตั้งแต่ ต.ค. นับเป็นปีงบถัดไป */
const fyOfMonth = (idx: number) => {
  const { year, month0 } = fromIndex(idx)
  return month0 >= 9 ? year + 1 : year
}

/** วันสุดท้ายของเดือน */
const lastDayOfMonth = (year: number, month0: number) => new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()

export function computeGfmis(p: GfmisParams, asOf: string): GfmisResult | null {
  const { cost, lifeYears, receive, residual = 0 } = p
  if (!Number.isFinite(cost) || cost <= 0) return null
  if (!Number.isFinite(lifeYears) || lifeYears <= 0) return null
  if (!receive || !asOf) return null

  const rec = new Date(`${receive.slice(0, 10)}T00:00:00Z`)
  const at = new Date(`${asOf.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(rec.getTime()) || Number.isNaN(at.getTime())) return null

  const receiveDay = rec.getUTCDate()
  const startsNextMonth = receiveDay >= 16

  const startIdx = monthIndex(rec.getUTCFullYear(), rec.getUTCMonth()) + (startsNextMonth ? 1 : 0)
  const totalMonths = Math.round(lifeYears * 12)
  const endIdx = startIdx + totalMonths - 1

  const base = Math.max(cost - residual, 0)
  const perMonth = base / totalMonths

  // เดือนที่คิดแล้ว = เดือนที่ผ่านไปครบทั้งเดือน ณ วันที่ที่ระบุ
  // เดือนของ asOf จะถูกนับก็ต่อเมื่อ asOf เป็นวันสุดท้ายของเดือนนั้นแล้ว
  const atIdx = monthIndex(at.getUTCFullYear(), at.getUTCMonth())
  const atMonthComplete = at.getUTCDate() >= lastDayOfMonth(at.getUTCFullYear(), at.getUTCMonth())
  const lastCountedIdx = atMonthComplete ? atIdx : atIdx - 1

  const usedMonths = Math.min(Math.max(lastCountedIdx - startIdx + 1, 0), totalMonths)
  const remainingMonths = totalMonths - usedMonths

  // เดือนสุดท้ายรับเศษ เพื่อให้สะสมครบเท่าฐานพอดีตอนหมดอายุ
  const accumulated = usedMonths >= totalMonths ? base : perMonth * usedMonths

  // แยกตามปีงบประมาณ
  const rows: GfmisFyRow[] = []
  let acc = 0
  for (let i = startIdx; i <= endIdx; ) {
    const fy = fyOfMonth(i)
    const groupStart = i
    while (i <= endIdx && fyOfMonth(i) === fy) i++
    const months = i - groupStart
    let amount = perMonth * months
    if (acc + amount > base) amount = base - acc
    acc += amount
    rows.push({
      fyBE: fy + 543,
      months,
      from: fmtMonth(groupStart),
      to: fmtMonth(i - 1),
      amount,
      accumulated: acc,
      nbv: cost - acc,
    })
  }
  // กันเศษทศนิยมค้าง — ปีสุดท้ายรับส่วนต่างที่เหลือ
  const last = rows[rows.length - 1]
  if (last && acc < base) {
    last.amount += base - acc
    last.accumulated = base
    last.nbv = cost - base
  }

  return {
    startsNextMonth,
    receiveDay,
    startMonth: fmtMonth(startIdx),
    endMonth: fmtMonth(endIdx),
    perMonth,
    totalMonths,
    usedMonths,
    remainingMonths,
    accumulated,
    remaining: base - accumulated,
    nbv: cost - accumulated,
    rows,
  }
}
