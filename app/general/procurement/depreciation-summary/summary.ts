// รวมยอดค่าเสื่อมราคาของทั้งทะเบียน แยกตามหมวดครุภัณฑ์ สำหรับปีงบประมาณหนึ่ง ๆ
//
// ใช้สูตรชุดเดียวกับหน้าคำนวณรายตัว (calc.ts / gfmis.ts) ไม่ได้เขียนสูตรใหม่
// ยอดรวมในรายงานนี้จึงตรงกับที่เปิดดูทีละรายการเสมอ
import { buildSchedule, isDepreciable, capitalThreshold } from '../depreciation/calc'
import { computeGfmis } from '../depreciation/gfmis'

export type Basis = 'daily' | 'gfmis'

/** ครุภัณฑ์หนึ่งรายการจาก /api/v1/equipment/depreciation-year */
export interface YearAsset {
  noid: string
  /** ทะเบียนบางรายการไม่ได้กรอกชื่อไว้ ค่าที่ได้จาก API จึงเป็น null ได้ */
  names: string | null
  perunits: number | null
  expired: number | null
  receive: string | null
  assetcatid: number | null
  assetcatname: string | null
}

export interface CategoryRow {
  key: string
  assetcatid: number | null
  category: string
  count: number      // จำนวนรายการที่ยังคิดค่าเสื่อมในปีงบนี้
  cost: number       // ราคาทุนรวม
  opening: number    // ค่าเสื่อมสะสมยกมาต้นปีงบ
  expense: number    // ค่าเสื่อมประจำปีงบนี้
  closing: number    // ค่าเสื่อมสะสมปลายปีงบ
  nbv: number        // มูลค่าสุทธิปลายปีงบ
}

/** ครุภัณฑ์รายตัวที่ถูกนับเข้ารายงาน */
export interface AssetDetailRow {
  key: string
  noid: string
  names: string
  category: string
  receive: string
  cost: number
  opening: number    // ค่าเสื่อมสะสมยกมาต้นปีงบ
  expense: number    // ค่าเสื่อมปีงบนี้
  closing: number    // ค่าเสื่อมสะสมปลายปีงบ
  remaining: number  // ค่าเสื่อมที่ยังไม่เกิด — คิดต่อได้อีกเท่านี้จนเหลือมูลค่าซาก
  nbv: number
}

export interface SummaryResult {
  rows: CategoryRow[]
  total: CategoryRow
  /** รายการครุภัณฑ์ที่ถูกนับเข้ารายงาน (เรียงตามค่าเสื่อมปีนี้จากมากไปน้อย) */
  details: AssetDetailRow[]
  /**
   * รายการที่ไม่ถูกนับในรายงาน — ทั้งของที่ปีงบนี้ไม่มีค่าเสื่อมแล้ว
   * และของที่ไม่เข้าเงื่อนไขการคำนวณ (ดูรายตัวได้จาก listExcluded)
   */
  skipped: number
}

/**
 * ครุภัณฑ์ที่คิดค่าเสื่อมครบแล้ว — มูลค่าสุทธิเหลือเท่าราคาซาก (ปกติ 1 บาท)
 * ถ้าเรียกแบบ includeActive จะมีของที่ยังคิดค่าเสื่อมอยู่ปนมาด้วย (ดูที่ finished)
 */
export interface ResidualDetailRow {
  key: string
  noid: string
  names: string
  category: string
  receive: string
  cost: number
  closing: number     // ค่าเสื่อมสะสมทั้งหมด = ราคาทุน - ราคาซาก
  expense: number     // ค่าเสื่อมที่เกิดในปีงบที่เลือก (0 ถ้าคิดครบไปก่อนแล้ว)
  nbv: number         // มูลค่าสุทธิ ณ สิ้นปีงบที่เลือก (= ราคาซาก ถ้าคิดครบแล้ว)
  /** ปีงบที่คิดค่าเสื่อมครบ — ถ้ายังคิดอยู่ คือปีงบที่จะครบในอนาคต */
  finishedFy: number
  /** true = คิดครบแล้ว ณ สิ้นปีงบที่เลือก · false = ยังคิดค่าเสื่อมอยู่ */
  finished: boolean
  /** ค่าเสื่อมที่ยังคิดได้อีกจนเหลือราคาซาก (0 ถ้าคิดครบแล้ว) */
  remaining: number
}

export interface ResidualResult {
  rows: CategoryRow[]
  total: CategoryRow
  details: ResidualDetailRow[]
  /** รายการที่ยังไม่ถึงวันคิดค่าเสื่อม ข้อมูลไม่พอคำนวณ หรือไม่เข้าเงื่อนไข */
  notCounted: number
  /** จำนวนที่คิดครบแล้ว / ที่ยังคิดอยู่ (ที่ยังคิดอยู่มีเฉพาะเมื่อเรียกแบบ includeActive) */
  finishedCount: number
  activeCount: number
}

const NO_CATEGORY = 'ไม่ระบุหมวด'

/** ครุภัณฑ์ที่ไม่เข้าเงื่อนไขการคำนวณค่าเสื่อม — แยกดูเพื่อไล่แก้ข้อมูลต้นทาง */
export interface ExcludedDetailRow {
  key: string
  noid: string
  names: string
  category: string
  receive: string
  cost: number
  lifeYears: number | null
  /** เกณฑ์มูลค่าที่ใช้กับวันรับของรายการนี้ — null = ไม่มีวันที่รับ จึงตัดสินไม่ได้ */
  threshold: number | null
  reason: 'BELOW_THRESHOLD' | 'NO_RECEIVE' | 'NO_COST' | 'NO_LIFE'
}

export const EXCLUDED_REASON: Record<ExcludedDetailRow['reason'], string> = {
  BELOW_THRESHOLD: 'ราคาต่ำกว่าเกณฑ์ครุภัณฑ์',
  NO_RECEIVE: 'ไม่มีวันที่รับ',
  NO_COST: 'ไม่มีราคาต่อหน่วย',
  NO_LIFE: 'ไม่มีอายุการใช้งาน',
}

/**
 * รายการที่คิดค่าเสื่อมให้ไม่ได้หรือไม่ต้องคิด — ไม่เกี่ยวกับปีงบที่เลือก
 *
 * ต่างจาก `skipped` ของรายงานหลัก ซึ่งเป็นของที่เข้าเงื่อนไขทุกอย่างแล้ว
 * แต่ปีงบที่เลือกไม่มีค่าเสื่อมเกิดขึ้น (ยังไม่ได้รับของ หรือคิดครบไปแล้ว)
 */
export function listExcluded(assets: YearAsset[]): {
  rows: ExcludedDetailRow[]
  belowThresholdCost: number
  byReason: Record<ExcludedDetailRow['reason'], number>
} {
  const rows: ExcludedDetailRow[] = []
  const byReason: Record<ExcludedDetailRow['reason'], number> = {
    BELOW_THRESHOLD: 0, NO_RECEIVE: 0, NO_COST: 0, NO_LIFE: 0,
  }
  let belowThresholdCost = 0

  for (const a of assets) {
    const cost = Number(a.perunits)
    const life = Number(a.expired)
    const hasCost = Number.isFinite(cost) && cost > 0
    const hasLife = Number.isFinite(life) && life > 0

    let reason: ExcludedDetailRow['reason'] | null = null
    if (!hasCost) reason = 'NO_COST'
    else if (!a.receive) reason = 'NO_RECEIVE'
    else if (!isDepreciable(cost, a.receive)) reason = 'BELOW_THRESHOLD'
    else if (!hasLife) reason = 'NO_LIFE'
    if (!reason) continue

    if (reason === 'BELOW_THRESHOLD') belowThresholdCost += cost
    byReason[reason] += 1
    rows.push({
      key: `${a.noid}|${rows.length}`,
      noid: a.noid,
      names: a.names ?? '',
      category: a.assetcatname?.trim() || NO_CATEGORY,
      receive: a.receive ?? '',
      cost: hasCost ? cost : 0,
      lifeYears: hasLife ? life : null,
      threshold: a.receive ? capitalThreshold(a.receive) : null,
      reason,
    })
  }

  // เรียงตามมูลค่าจากมากไปน้อย ของที่มีนัยสำคัญจะได้อยู่หน้าแรก
  rows.sort((x, y) => y.cost - x.cost)
  return { rows, belowThresholdCost, byReason }
}

/** ครุภัณฑ์ที่จะคิดค่าเสื่อมครบในปีงบนั้น ๆ — ใช้วางแผนจัดหาทดแทน/ซ่อมบำรุง */
export interface ExpiryBucket {
  fyBE: number
  count: number
  /** ราคาทุนรวมของของที่จะครบในปีนั้น = กรอบงบที่ต้องเตรียมถ้าจะทดแทนทั้งหมด */
  cost: number
  /** มูลค่าสุทธิ ณ สิ้นปีงบที่เลือก ของของกลุ่มนั้น */
  nbv: number
}

export interface ExpiryItem {
  key: string
  noid: string
  names: string
  category: string
  cost: number
  nbv: number
  finishFy: number
  /** เหลืออีกกี่ปีงบจะคิดค่าเสื่อมครบ (0 = ครบในปีงบที่เลือก) */
  yearsLeft: number
}

/**
 * ครุภัณฑ์ที่อายุการใช้งานจะครบภายใน `aheadYears` ปีงบข้างหน้า
 *
 * นับจากปีงบสุดท้ายของตารางค่าเสื่อม (= วันที่ครบอายุการใช้งาน) ไม่ใช่จากวันรับ
 * เพื่อให้ตรงกับตัวเลขที่รายงานหน้าเดียวกันแสดงอยู่
 */
export function upcomingExpiry(
  assets: YearAsset[],
  fyBE: number,
  basis: Basis,
  residual = 1,
  aheadYears = 5,
): { buckets: ExpiryBucket[]; items: ExpiryItem[]; beyond: number; beyondCost: number } {
  const byFy = new Map<number, ExpiryBucket>()
  const items: ExpiryItem[] = []
  const asOf = `${fyBE - 543}-09-30`
  // ของที่ยังคิดค่าเสื่อมอยู่แต่จะครบเลยช่วงที่ขอ — บอกไว้ให้รู้ว่ากราฟไม่ได้ครบทุกตัว
  let beyond = 0
  let beyondCost = 0

  for (const a of assets) {
    const cost = Number(a.perunits)
    const lifeYears = Number(a.expired)
    if (!a.receive || !Number.isFinite(cost) || cost <= 0) continue
    if (!Number.isFinite(lifeYears) || lifeYears <= 0) continue
    if (!isDepreciable(cost, a.receive)) continue

    const rows = (basis === 'gfmis'
      ? computeGfmis({ cost, lifeYears, receive: a.receive, residual }, asOf)?.rows
      : buildSchedule({ cost, lifeYears, receive: a.receive, residual, mode: 'daily' })?.rows) ?? []
    const finishFy = rows[rows.length - 1]?.fyBE
    if (finishFy == null) continue
    // สนใจเฉพาะของที่จะครบในปีงบที่เลือกหรือถัดไปไม่เกินช่วงที่กำหนด
    if (finishFy < fyBE) continue
    if (finishFy > fyBE + aheadYears) { beyond++; beyondCost += cost; continue }

    const upto = rows.filter(r => r.fyBE <= fyBE)
    const nbv = upto.length ? upto[upto.length - 1].nbv : cost

    let b = byFy.get(finishFy)
    if (!b) { b = { fyBE: finishFy, count: 0, cost: 0, nbv: 0 }; byFy.set(finishFy, b) }
    b.count += 1
    b.cost += cost
    b.nbv += nbv

    items.push({
      key: `${a.noid}|${items.length}`,
      noid: a.noid,
      names: a.names ?? '',
      category: a.assetcatname?.trim() || NO_CATEGORY,
      cost,
      nbv,
      finishFy,
      yearsLeft: finishFy - fyBE,
    })
  }

  // เติมปีที่ไม่มีของให้ครบช่วง เพื่อให้แกนของกราฟเดินต่อเนื่อง
  const buckets: ExpiryBucket[] = []
  for (let y = fyBE; y <= fyBE + aheadYears; y++) {
    buckets.push(byFy.get(y) ?? { fyBE: y, count: 0, cost: 0, nbv: 0 })
  }
  items.sort((x, y) => x.finishFy - y.finishFy || y.cost - x.cost)
  return { buckets, items, beyond, beyondCost }
}

/** ยอดของครุภัณฑ์หนึ่งรายการในปีงบที่ต้องการ — null = ปีนั้นไม่มีค่าเสื่อม */
function amountsFor(
  asset: YearAsset,
  fyBE: number,
  basis: Basis,
  residual: number,
): { cost: number; opening: number; expense: number; closing: number; nbv: number } | null {
  const cost = Number(asset.perunits)
  const lifeYears = Number(asset.expired)
  if (!asset.receive || !Number.isFinite(cost) || cost <= 0) return null
  if (!Number.isFinite(lifeYears) || lifeYears <= 0) return null

  let row: { amount: number; accumulated: number; nbv: number } | undefined
  if (basis === 'gfmis') {
    const g = computeGfmis({ cost, lifeYears, receive: asset.receive, residual }, `${fyBE - 543}-09-30`)
    row = g?.rows.find(r => r.fyBE === fyBE)
  } else {
    const d = buildSchedule({ cost, lifeYears, receive: asset.receive, residual, mode: 'daily' })
    row = d?.rows.find(r => r.fyBE === fyBE)
  }

  // ไม่มีแถวของปีงบนี้ = ปีนั้นไม่มีค่าเสื่อมเกิดขึ้น (ยังไม่ได้รับของ หรือคิดครบไปแล้ว)
  if (!row) return null
  return {
    cost,
    opening: row.accumulated - row.amount,
    expense: row.amount,
    closing: row.accumulated,
    nbv: row.nbv,
  }
}

/**
 * ครุภัณฑ์ที่คิดค่าเสื่อมครบแล้ว ณ สิ้นปีงบที่เลือก (มูลค่าสุทธิเหลือเท่าราคาซาก)
 *
 * นับรวมทั้งของที่คิดครบไปตั้งแต่ปีก่อน ๆ และของที่เพิ่งคิดครบในปีงบนี้
 * ของที่คิดครบไปก่อนแล้วจะไม่ปรากฏในรายงานหลัก เพราะปีนั้นไม่มีค่าเสื่อมเกิดขึ้น
 * แต่ยังเป็นทรัพย์สินที่ถือครองอยู่และต้องแสดงในทะเบียน จึงแยกดูได้ที่นี่
 *
 * includeActive = true จะเอาของที่ยังคิดค่าเสื่อมอยู่มาด้วย พร้อมปีงบที่จะคิดครบ
 * ในอนาคต (เช่น รับ 27/12/2564 อายุ 5 ปี จะครบปีงบ 2570) กลายเป็นทะเบียนรวม
 * ทั้งหมดที่ถือครองอยู่ ไม่ใช่เฉพาะของที่เหลือราคาซาก
 */
export function summarizeFullyDepreciated(
  assets: YearAsset[],
  fyBE: number,
  basis: Basis,
  residual = 1,
  includeActive = false,
): ResidualResult {
  const byCat = new Map<string, CategoryRow>()
  const details: ResidualDetailRow[] = []
  let notCounted = 0
  let finishedCount = 0
  let activeCount = 0
  const asOf = `${fyBE - 543}-09-30`
  // เผื่อเศษทศนิยมจากการหาร ไม่งั้นของที่เหลือ 1.0000001 บาทจะหลุดออกไป
  const EPS = 0.005

  for (const a of assets) {
    const cost = Number(a.perunits)
    const lifeYears = Number(a.expired)
    if (!a.receive || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(lifeYears) || lifeYears <= 0) {
      notCounted++
      continue
    }

    // ต่ำกว่าเกณฑ์มูลค่าครุภัณฑ์ = เป็นวัสดุ ไม่คิดค่าเสื่อม จึงไม่ใช่ของที่ "คิดครบแล้ว"
    if (!isDepreciable(cost, a.receive)) { notCounted++; continue }

    // ทั้งสองเกณฑ์คืนตารางตลอดอายุการใช้งาน (เลยปีงบที่เลือกไปด้วย)
    // จึงต้องตัดเฉพาะถึงปีงบที่เลือก ไม่งั้นของที่จะครบในอนาคตจะถูกนับว่าครบแล้ว
    const all = basis === 'gfmis'
      ? computeGfmis({ cost, lifeYears, receive: a.receive, residual }, asOf)?.rows
      : buildSchedule({ cost, lifeYears, receive: a.receive, residual, mode: 'daily' })?.rows
    const rowsAll = all ?? []
    const upto = rowsAll.filter(r => r.fyBE <= fyBE)
    const last = upto[upto.length - 1]

    // ยังไม่ถึงวันเริ่มคิดค่าเสื่อมในปีงบที่เลือก (เกณฑ์ GFMIS เลื่อนเดือนแรกไปเดือนถัดไป
    // ของที่รับปลายเดือน ก.ย. จึงยังไม่มีแถวของปีงบนี้) — ยังเป็นทรัพย์สินที่ถือครองอยู่
    // จึงต้องอยู่ในทะเบียนด้วยยอดตั้งต้น ไม่ใช่หายไปจากรายงาน
    const notStarted = !last
    if (notStarted && !includeActive) { notCounted++; continue }
    if (notStarted && !rowsAll.length) { notCounted++; continue }

    const finished = last ? last.nbv <= residual + EPS : false
    // ของที่ยังคิดค่าเสื่อมอยู่ เอาเข้ารายงานเฉพาะเมื่อขอมาแบบ includeActive
    if (!finished && !includeActive) continue
    if (finished) finishedCount++
    else activeCount++

    const category = a.assetcatname?.trim() || NO_CATEGORY
    const key = `${a.assetcatid ?? 'x'}|${category}`
    let row = byCat.get(key)
    if (!row) {
      row = {
        key, assetcatid: a.assetcatid, category,
        count: 0, cost: 0, opening: 0, expense: 0, closing: 0, nbv: 0,
      }
      byCat.set(key, row)
    }

    // ค่าเสื่อมของปีงบที่เลือก — มีเฉพาะเมื่อแถวสุดท้ายเป็นปีนั้นจริง
    // (ของที่คิดครบไปก่อนแล้ว และของที่ยังไม่เริ่มคิด จะเป็น 0)
    const expense = last && last.fyBE === fyBE ? last.amount : 0
    const closing = last ? last.accumulated : 0
    const nbv = last ? last.nbv : cost
    details.push({
      key: `${a.noid}|${details.length}`,
      noid: a.noid,
      names: a.names ?? '',
      category,
      receive: a.receive,
      cost,
      closing,
      expense,
      nbv,
      // ของที่ยังคิดอยู่ ใช้ปีงบสุดท้ายของตารางทั้งชุด = ปีที่จะคิดครบในอนาคต
      finishedFy: finished && last ? last.fyBE : (rowsAll[rowsAll.length - 1]?.fyBE ?? fyBE),
      finished,
      // ปัดเศษทศนิยมหลักที่ 3 ทิ้ง กัน floating point ทำให้ติดลบจิ๋ว ๆ
      remaining: Math.max(Math.round((cost - residual - closing) * 100) / 100, 0),
    })

    row.count += 1
    row.cost += cost
    row.opening += closing - expense
    row.expense += expense
    row.closing += closing
    row.nbv += nbv
  }

  const rows = [...byCat.values()].sort((x, y) => {
    if (x.assetcatid == null) return 1
    if (y.assetcatid == null) return -1
    return x.assetcatid - y.assetcatid
  })

  const total = rows.reduce<CategoryRow>((t, r) => ({
    ...t,
    count: t.count + r.count,
    cost: t.cost + r.cost,
    opening: t.opening + r.opening,
    expense: t.expense + r.expense,
    closing: t.closing + r.closing,
    nbv: t.nbv + r.nbv,
  }), {
    key: 'total', assetcatid: null, category: 'รวมทั้งสิ้น',
    count: 0, cost: 0, opening: 0, expense: 0, closing: 0, nbv: 0,
  })

  details.sort((a, b) => b.finishedFy - a.finishedFy || b.cost - a.cost)

  return { rows, total, details, notCounted, finishedCount, activeCount }
}

export function summarizeByCategory(
  assets: YearAsset[],
  fyBE: number,
  basis: Basis,
  residual = 1,
): SummaryResult {
  const byCat = new Map<string, CategoryRow>()
  const details: AssetDetailRow[] = []
  let skipped = 0

  for (const a of assets) {
    // เกณฑ์มูลค่าขั้นต่ำมาก่อนการคำนวณ — ของที่ต่ำกว่าเกณฑ์ตัดเป็นค่าใช้จ่ายไปแล้ว
    // ไม่มีค่าเสื่อมและไม่อยู่ในยอดทรัพย์สินของรายงานนี้
    const rawCost = Number(a.perunits)
    if (a.receive && Number.isFinite(rawCost) && rawCost > 0 && !isDepreciable(rawCost, a.receive)) {
      skipped++
      continue
    }

    const v = amountsFor(a, fyBE, basis, residual)
    if (!v) { skipped++; continue }

    const category = a.assetcatname?.trim() || NO_CATEGORY
    const key = `${a.assetcatid ?? 'x'}|${category}`
    let row = byCat.get(key)
    if (!row) {
      row = {
        key, assetcatid: a.assetcatid, category,
        count: 0, cost: 0, opening: 0, expense: 0, closing: 0, nbv: 0,
      }
      byCat.set(key, row)
    }
    details.push({
      key: `${a.noid}|${details.length}`,
      noid: a.noid,
      names: a.names ?? '',
      category,
      receive: a.receive ?? '',
      cost: v.cost,
      opening: v.opening,
      expense: v.expense,
      closing: v.closing,
      // คิดค่าเสื่อมต่อได้อีกเท่านี้จนมูลค่าสุทธิเหลือเท่าราคาซาก (ปกติ 1 บาท)
      // ปัดเศษทศนิยมหลักที่ 3 ทิ้ง เพราะ floating point ทำให้เหลือค่าติดลบจิ๋ว ๆ ได้
      remaining: Math.max(Math.round((v.cost - residual - v.closing) * 100) / 100, 0),
      nbv: v.nbv,
    })

    row.count += 1
    row.cost += v.cost
    row.opening += v.opening
    row.expense += v.expense
    row.closing += v.closing
    row.nbv += v.nbv
  }

  // เรียงตามรหัสหมวด หมวดที่ไม่ระบุไว้ท้ายสุด
  const rows = [...byCat.values()].sort((x, y) => {
    if (x.assetcatid == null) return 1
    if (y.assetcatid == null) return -1
    return x.assetcatid - y.assetcatid
  })

  const total = rows.reduce<CategoryRow>((t, r) => ({
    ...t,
    count: t.count + r.count,
    cost: t.cost + r.cost,
    opening: t.opening + r.opening,
    expense: t.expense + r.expense,
    closing: t.closing + r.closing,
    nbv: t.nbv + r.nbv,
  }), {
    key: 'total', assetcatid: null, category: 'รวมทั้งสิ้น',
    count: 0, cost: 0, opening: 0, expense: 0, closing: 0, nbv: 0,
  })

  details.sort((a, b) => b.expense - a.expense)

  return { rows, total, details, skipped }
}
