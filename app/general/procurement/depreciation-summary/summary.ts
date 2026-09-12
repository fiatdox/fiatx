// รวมยอดค่าเสื่อมราคาของทั้งทะเบียน แยกตามหมวดครุภัณฑ์ สำหรับปีงบประมาณหนึ่ง ๆ
//
// ใช้สูตรชุดเดียวกับหน้าคำนวณรายตัว (calc.ts / gfmis.ts) ไม่ได้เขียนสูตรใหม่
// ยอดรวมในรายงานนี้จึงตรงกับที่เปิดดูทีละรายการเสมอ
import { buildSchedule } from '../depreciation/calc'
import { computeGfmis } from '../depreciation/gfmis'

export type Basis = 'daily' | 'gfmis'

/** ครุภัณฑ์หนึ่งรายการจาก /api/v1/equipment/depreciation-year */
export interface YearAsset {
  noid: string
  names: string
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
  /** รายการที่ผ่านตัวกรองมาแต่ปีงบนี้ไม่มีค่าเสื่อมแล้ว — ไม่ถูกนับในรายงาน */
  skipped: number
}

const NO_CATEGORY = 'ไม่ระบุหมวด'

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
      names: a.names,
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
