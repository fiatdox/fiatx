// การคำนวณค่าเสื่อมราคาแบบ GFMIS — เกณฑ์นับเดือน (กรมบัญชีกลาง)
//
// กติกาเดือนแรก
//   รับของวันที่ 1–15  -> นับเดือนที่รับเป็นเดือนเต็ม เริ่มคิดเดือนนั้นเลย
//   รับของวันที่ 16–31 -> ยกยอดไปเริ่มคิดเดือนถัดไป
//
// กติกาเดือนสุดท้าย — ใช้เงื่อนไขเดียวกับเดือนแรก
//   วันที่คิดถึงเป็นวันที่ 1–15  -> เดือนนั้นยังไม่นับ ยอดยังคงอยู่กับปีงบเดิม
//   วันที่คิดถึงเป็นวันที่ 16–31 -> ปัดขึ้นเป็นเดือนเต็ม (ถ้าเป็นเดือน ต.ค. ก็ขึ้นปีงบใหม่)
//
// ค่าเสื่อมต่อเดือน = ราคาทุน / (อายุการใช้งาน x 12)
//   คิดจาก "ราคาทุนเต็ม" ไม่หักราคาซาก เพื่อให้ยอดต่อเดือนตรงกับที่ GFMIS ใช้
//   แล้วไปหยุดที่ราคาซากในเดือนสุดท้ายแทน (แถวสุดท้ายจึงเหลือมูลค่าสุทธิ 1 บาท)
//
// ตัวอย่างตรวจสอบ: ราคา 10,000 รับ 2023-11-16 อายุ 5 ปี ณ 2026-09-30
//   รับวันที่ 16 -> เริ่มคิด ธ.ค. 2023 -> ถึง ก.ย. 2026 = 34 เดือน
//   34 x (10,000/60) = 5,666.67  คงเหลือ 26 เดือน = 4,333.33

export interface GfmisParams {
  cost: number
  lifeYears: number
  receive: string       // YYYY-MM-DD
  residual?: number     // มูลค่าคงเหลือเมื่อหมดอายุ ตามระเบียบพัสดุคือ 1 บาท
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
  asOfDay: number           // วันที่ของวันที่คิดถึง
  countsAsOfMonth: boolean  // true = วันที่ 16-31 จึงปัดขึ้นนับเดือนนั้นเต็มเดือน
  lastCountedMonth: string  // YYYY-MM เดือนสุดท้ายที่นับให้ ('' = ยังไม่มีเดือนไหนนับ)
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

  // ยอดต่อเดือนคิดจากราคาทุนเต็ม — ราคาซากไปหักเอาที่เดือนสุดท้าย
  const perMonth = cost / totalMonths
  // เพดานค่าเสื่อมสะสม: คิดได้มากสุดเท่านี้ ที่เหลือคือมูลค่าซากที่ต้องคงไว้
  const cap = Math.max(cost - residual, 0)

  // เดือนสุดท้ายใช้กติกาเดียวกับเดือนแรก — ตัดที่วันที่ 15
  //   1–15  = ยังไม่ครบเดือน ไม่นับ (ยอดยังอยู่กับปีงบเดิม)
  //   16–31 = ปัดขึ้นเป็นเดือนเต็ม
  const atIdx = monthIndex(at.getUTCFullYear(), at.getUTCMonth())
  const asOfDay = at.getUTCDate()
  const countsAsOfMonth = asOfDay >= 16
  const lastCountedIdx = countsAsOfMonth ? atIdx : atIdx - 1

  const usedMonths = Math.min(Math.max(lastCountedIdx - startIdx + 1, 0), totalMonths)
  const remainingMonths = totalMonths - usedMonths

  // เดือนสุดท้ายรับเศษ เพื่อให้สะสมชนเพดานพอดีตอนหมดอายุ (เหลือมูลค่าซากไว้)
  const accumulated = usedMonths >= totalMonths ? cap : Math.min(perMonth * usedMonths, cap)

  // แยกตามปีงบประมาณ
  const rows: GfmisFyRow[] = []
  let acc = 0
  for (let i = startIdx; i <= endIdx; ) {
    const fy = fyOfMonth(i)
    const groupStart = i
    while (i <= endIdx && fyOfMonth(i) === fy) i++
    const months = i - groupStart
    let amount = perMonth * months
    if (acc + amount > cap) amount = cap - acc
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
  if (last && acc < cap) {
    last.amount += cap - acc
    last.accumulated = cap
    last.nbv = cost - cap
  }

  return {
    startsNextMonth,
    receiveDay,
    asOfDay,
    countsAsOfMonth,
    lastCountedMonth: usedMonths > 0 ? fmtMonth(startIdx + usedMonths - 1) : '',
    startMonth: fmtMonth(startIdx),
    endMonth: fmtMonth(endIdx),
    perMonth,
    totalMonths,
    usedMonths,
    remainingMonths,
    accumulated,
    remaining: cap - accumulated,
    nbv: cost - accumulated,
    rows,
  }
}
