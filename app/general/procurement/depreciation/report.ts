// สร้างข้อมูลรายงาน "ทะเบียนคุมทรัพย์สิน" จากผลการคำนวณของแต่ละแท็บ
// แท็บรายปีงบประมาณ (เกณฑ์รายวัน) กับแท็บ GFMIS (เกณฑ์นับเดือน) ใช้แบบฟอร์มเดียวกัน
// ต่างกันแค่ที่มาของแถว
import type { AssetRegisterData, AssetRegisterRow } from '@/app/components/AssetRegisterPDF'
import { money, accumulatedAsOf, type ScheduleResult } from './calc'
import { computeGfmis, type GfmisResult } from './gfmis'

const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

/** 2020-05-15 → 15 พ.ค. 2563 */
export function thaiDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${TH_MONTH[m - 1]} ${y + 543}`
}

/** 2023-11 → วันสุดท้ายของเดือนนั้นในรูปแบบไทย */
function thaiEndOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${last} ${TH_MONTH[m - 1]} ${y + 543}`
}

/** ล้างข้อความจากทะเบียน: อัญประกาศค้างหัวท้าย (address01) และ CR/LF ค้างกลางชื่อ (hsrotypename) */
const cleanText = (v: string | null | undefined) =>
  (v ?? '').replace(/^["']+|["']+$/g, '').replace(/\s+/g, ' ').trim()

/** อัตราค่าเสื่อม: 20 ไม่ใช่ 20.00 แต่ 16.67 ต้องเห็นทศนิยม */
const rateText = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))

/** ข้อมูลครุภัณฑ์เท่าที่ทะเบียนมี — ช่องที่ทะเบียนไม่ได้เก็บจะเว้นว่างในรายงาน */
export interface ReportAsset {
  noid: string
  names: string
  models: string
  locates: string
  fy: string
  docno: string
  notes: string
  companyname: string
  companyaddress: string | null
  companytel: string | null
  moneytype: string | null
  acquiremethod: string | null
  perunits: number | null
  receive: string | null
  expired: number | null
  assetcatname: string | null   // catdesc จากตาราง assetcat = หมวดครุภัณฑ์
  subtypename: string | null    // hsro_subtype = ประเภทครุภัณฑ์
}

/** ผู้ที่กดพิมพ์ — ดึงจากคุกกี้ user_data (name = pname+fname+lname ที่ backend ประกอบมาแล้ว) */
export interface PreparedBy {
  name?: string
  position?: string
}

const baseHeader = (asset: ReportAsset, by?: PreparedBy): Omit<AssetRegisterData, 'rows'> => ({
  orgName: 'โรงพยาบาลพะเยา',
  deptName: asset.locates || '',
  assetType: cleanText(asset.subtypename),
  assetCategory: cleanText(asset.assetcatname),
  assetCode: asset.noid || '',
  itemName: cleanText(asset.names),
  spec: asset.notes || '',
  model: asset.models || '',
  responsible: asset.locates || '',
  vendor: asset.companyname || '',
  address: cleanText(asset.companyaddress),
  phone: cleanText(asset.companytel),
  moneyType: cleanText(asset.moneytype),
  acquireMethod: cleanText(asset.acquiremethod),
  fiscalYear: asset.fy || '',
  preparedBy: by?.name || '',
  preparedByPosition: by?.position || '',
})

/** แถวแรกของทะเบียน = รายการที่ได้มา (ยังไม่มีค่าเสื่อม) */
const acquisitionRow = (asset: ReportAsset, ratePercent: number): AssetRegisterRow => ({
  date: thaiDate(asset.receive),
  docno: asset.docno || '',
  item: asset.names || '',
  qty: '1',
  unitPrice: asset.perunits != null ? money(Number(asset.perunits)) : '',
  total: asset.perunits != null ? money(Number(asset.perunits)) : '',
  life: asset.expired != null ? String(asset.expired) : '',
  rate: rateText(ratePercent),
  yearAmount: '-',
  accumulated: '-',
  nbv: asset.perunits != null ? money(Number(asset.perunits)) : '',
  note: '',
})

// ─── แท็บรายปีงบประมาณ (เกณฑ์รายวัน) ────────────────────────────────────────
export function buildFyReport(opts: {
  asset: ReportAsset
  result: ScheduleResult
  lifeYears: number
  currentFyBE: number
  preparedBy?: PreparedBy
}): AssetRegisterData {
  const { asset, result, lifeYears, currentFyBE, preparedBy } = opts

  const rows: AssetRegisterRow[] = [acquisitionRow({ ...asset, expired: lifeYears }, result.ratePercent)]

  for (const r of result.rows) {
    const fullYear = r.from.endsWith('-10-01') && r.to.endsWith('-09-30')
    rows.push({
      date: thaiDate(r.to),
      item: fullYear ? 'คำนวณ 1 ปี' : `คำนวณ ${r.days} วัน`,
      yearAmount: money(r.amount),
      accumulated: money(r.accumulated),
      nbv: money(r.nbv),
      highlight: r.fyBE === currentFyBE,
    })
  }

  return { ...baseHeader(asset, preparedBy), rows }
}

// ─── แท็บ GFMIS (เกณฑ์นับเดือน) ─────────────────────────────────────────────
export function buildGfmisReport(opts: {
  asset: ReportAsset
  gfmis: GfmisResult
  lifeYears: number
  currentFyBE: number
  preparedBy?: PreparedBy
}): AssetRegisterData {
  const { asset, gfmis, lifeYears, currentFyBE, preparedBy } = opts
  const ratePercent = lifeYears > 0 ? 100 / lifeYears : 0

  const rows: AssetRegisterRow[] = [acquisitionRow({ ...asset, expired: lifeYears }, ratePercent)]

  for (const r of gfmis.rows) {
    rows.push({
      date: thaiEndOfMonth(r.to),
      item: r.months === 12 ? 'คำนวณ 1 ปี' : `คำนวณ ${r.months} เดือน`,
      yearAmount: money(r.amount),
      accumulated: money(r.accumulated),
      nbv: money(r.nbv),
      highlight: r.fyBE === currentFyBE,
    })
  }

  return { ...baseHeader(asset, preparedBy), rows }
}

// ─── รายงานรายงวด — แตกเป็นรายเดือน ─────────────────────────────────────────
//
// หน้าสรุปค่าเสื่อมตามงวดต้องตรวจทานทีละเดือนว่าเดือนไหนคิดไปเท่าไร
// ทะเบียนชุดนี้จึงไม่ได้ไล่เป็นปีงบเหมือนสองแบบข้างบน แต่ไล่เป็นเดือนภายในงวด
// โดยคิดจากค่าเสื่อมสะสม ณ สิ้นเดือนก่อนหน้า เทียบกับสิ้นเดือนนั้น
// (สูตรเดียวกับที่ตารางสรุปของหน้านั้นใช้ ยอดจึงกระทบกันได้)

const pad2 = (n: number) => String(n).padStart(2, '0')
const isoOf = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`
const lastDayOf = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** วันก่อนหน้าวันที่ระบุ (YYYY-MM-DD) */
const prevDay = (isoDate: string): string => {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

const accAt = (
  cost: number, lifeYears: number, receive: string, residual: number,
  basis: 'daily' | 'gfmis', asOf: string,
): number => {
  if (basis === 'gfmis') {
    const g = computeGfmis({ cost, lifeYears, receive, residual }, asOf)
    return g ? g.accumulated : 0
  }
  const d = accumulatedAsOf({ cost, lifeYears, receive, residual, mode: 'daily' }, asOf)
  return d ? d.accumulated : 0
}

export function buildMonthlyReport(opts: {
  asset: ReportAsset
  cost: number
  lifeYears: number
  residual: number
  basis: 'daily' | 'gfmis'
  from: string          // วันแรกของงวด (YYYY-MM-DD)
  to: string            // วันสุดท้ายของงวด (YYYY-MM-DD)
  preparedBy?: PreparedBy
}): AssetRegisterData {
  const { asset, cost, lifeYears, residual, basis, from, to, preparedBy } = opts
  const ratePercent = lifeYears > 0 ? 100 / lifeYears : 0
  const receive = asset.receive ?? ''

  const rows: AssetRegisterRow[] = [acquisitionRow({ ...asset, expired: lifeYears }, ratePercent)]

  // ยอดยกมา ณ วันก่อนเริ่มงวด — ให้เห็นว่าก่อนงวดนี้คิดไปแล้วเท่าไร
  const openAt = prevDay(from)
  const opening = accAt(cost, lifeYears, receive, residual, basis, openAt)
  rows.push({
    date: thaiDate(openAt),
    item: 'ยอดยกมาต้นงวด',
    yearAmount: '-',
    accumulated: money(opening),
    nbv: money(cost - opening),
  })

  // ไล่ทีละเดือนภายในงวด เดือนหัวท้ายตัดตามขอบงวดจริง
  let prevAcc = opening
  let totalExpense = 0
  let y = Number(from.slice(0, 4))
  let m = Number(from.slice(5, 7))
  while (isoOf(y, m, 1) <= to.slice(0, 10)) {
    const monthStart = isoOf(y, m, 1)
    const monthEnd = isoOf(y, m, lastDayOf(y, m))
    const segFrom = monthStart < from ? from : monthStart
    const segTo = monthEnd > to ? to : monthEnd
    const acc = accAt(cost, lifeYears, receive, residual, basis, segTo)
    const amount = Math.max(acc - prevAcc, 0)
    const partial = segFrom !== monthStart || segTo !== monthEnd
    rows.push({
      date: thaiDate(segTo),
      item: partial
        ? `คำนวณ ${thaiDate(segFrom)} – ${thaiDate(segTo)}`
        : `คำนวณเดือน ${thaiEndOfMonth(`${y}-${pad2(m)}`).split(' ').slice(1).join(' ')}`,
      yearAmount: money(amount),
      accumulated: money(acc),
      nbv: money(cost - acc),
      highlight: amount > 0.005,
    })
    totalExpense += amount
    prevAcc = acc
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }

  rows.push({
    date: thaiDate(to),
    item: 'รวมค่าเสื่อมในงวด',
    yearAmount: money(totalExpense),
    accumulated: money(prevAcc),
    nbv: money(cost - prevAcc),
  })

  return { ...baseHeader(asset, preparedBy), rows }
}
