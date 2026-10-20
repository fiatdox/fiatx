// รายงานครุภัณฑ์แยกตามหน่วยงาน (ทะเบียน V2) — ส่วนที่ไม่ผูกกับ React
// แยกไว้ให้ทดสอบกับข้อมูลจริงได้โดยไม่ต้องเปิดหน้าเว็บ
import * as XLSX from 'xlsx'
import { money, thaiDate } from '../depreciation/calc'
import type { AssetByDeptGroup, AssetByDeptItem } from './pdfReport'

/** ค่าของตัวเลือก "ทั้งหมด" ในตัวกรอง */
export const ALL = '__all__'
export const NO_DEPT = 'ไม่ระบุหน่วยงาน'
export const NO_CAT = 'ไม่ระบุหมวด'

/** แถวดิบจาก API — เก็บเป็นรหัส ชื่อต้องเปิดจากตารางคำอธิบาย */
export interface RawAsset {
  noid: string
  noid_old: string | null
  numbers: number | null
  assetcatid: number | null
  typeid: number | null
  subtypeid: string | null
  code_bps: string | null
  names: string | null
  models: string | null
  receive: string | null
  fy: number | null
  locates: string | null
  divs: string | null
  docno: string | null
  company: number | null
  kmoney: string | null
  tmoney: string | null
  perunits: number | null
  deprec: number | null
  expired: number | null
  gf: string | null
  notes: string | null
  iscode: string | null
}

export interface Lookups {
  category: Record<string, string>
  type: Record<string, string>
  subtype: Record<string, string>
  kind: Record<string, string>
  supplier: Record<string, { name: string | null; address: string | null; phone: string | null }>
  moneyType: Record<string, string>
  acquireMethod: Record<string, string>
  status: Record<string, string>
  department: Record<string, string>
}

/** แถวที่เปิดชื่อครบแล้ว — ใช้ทั้งในตารางและในไฟล์ Excel */
export interface Asset {
  seq: number
  noid: string
  noidOld: string
  numbers: number | null
  catId: string
  category: string
  typeId: string
  typeName: string
  subtypeId: string
  subtypeName: string
  codeBps: string
  kindName: string
  names: string
  models: string
  receive: string | null
  fy: string
  locates: string
  divs: string
  department: string
  docno: string
  supplierName: string
  supplierAddress: string
  supplierPhone: string
  moneyType: string
  acquireMethod: string
  price: number
  lifeYears: number | null
  rate: number | null
  gf: string
  notes: string
  status: string
}

export interface DeptRow {
  seq: number
  divs: string
  department: string
  count: number
  total: number
}

const str = (v: unknown) => (v == null ? '' : String(v).trim())

// เปิดรหัสเป็นชื่อด้วยตารางคำอธิบาย — คีย์ของตารางเป็นสตริงเสมอ จึงแปลงรหัสเป็นสตริงก่อนเปิด
export const resolve = (r: RawAsset, L: Lookups): Omit<Asset, 'seq'> => {
  const sup = L.supplier[str(r.company)]
  const divs = str(r.divs)
  return {
    noid: r.noid,
    noidOld: str(r.noid_old),
    numbers: r.numbers,
    catId: str(r.assetcatid),
    category: L.category[str(r.assetcatid)] ?? NO_CAT,
    typeId: str(r.typeid),
    typeName: L.type[str(r.typeid)] ?? '',
    subtypeId: str(r.subtypeid),
    subtypeName: L.subtype[str(r.subtypeid)] ?? '',
    codeBps: str(r.code_bps),
    kindName: L.kind[str(r.code_bps)] ?? '',
    names: str(r.names),
    models: str(r.models),
    receive: r.receive,
    fy: str(r.fy),
    locates: str(r.locates),
    divs,
    // รหัสที่ไม่มีในตารางหน่วยงาน ยังต้องแยกกลุ่มให้เห็น ไม่รวมเข้า "ไม่ระบุ"
    department: L.department[divs] ?? (divs ? `หน่วยงานรหัส ${divs}` : NO_DEPT),
    docno: str(r.docno),
    supplierName: str(sup?.name),
    supplierAddress: str(sup?.address),
    supplierPhone: str(sup?.phone),
    moneyType: L.moneyType[str(r.kmoney)] ?? '',
    acquireMethod: L.acquireMethod[str(r.tmoney)] ?? '',
    price: Number(r.perunits) || 0,
    lifeYears: r.expired ?? null,
    rate: r.deprec ?? null,
    gf: str(r.gf),
    notes: str(r.notes),
    status: L.status[str(r.iscode)] ?? str(r.iscode),
  }
}

export interface AssetFilter { fy: string; cat: string; dept: string; search: string }

/** กรองตามปีงบ/หมวด/หน่วยงาน/คำค้น แล้วใส่ลำดับต่อเนื่องให้ตามผลที่กรองได้ */
export const filterAssets = (assets: Omit<Asset, 'seq'>[], f: AssetFilter): Asset[] => {
  const q = f.search.trim().toLowerCase()
  return assets
    .filter(a =>
      (f.fy === ALL || a.fy === f.fy)
      && (f.cat === ALL || a.catId === f.cat)
      && (f.dept === ALL || a.divs === f.dept)
      && (!q || [a.noid, a.noidOld, a.names, a.models, a.locates, a.docno, a.supplierName]
        .some(s => s.toLowerCase().includes(q))))
    .map((a, i) => ({ ...a, seq: i + 1 }))
}

/** รวมจำนวนและมูลค่าตามหน่วยงาน — แถวมาเรียงตามรหัสหน่วยงานจากฐานข้อมูลแล้ว Map จึงคงลำดับนั้นไว้ */
export const groupByDept = (assets: Asset[]): DeptRow[] => {
  const m = new Map<string, DeptRow>()
  for (const a of assets) {
    const r = m.get(a.divs)
    if (r) { r.count++; r.total += a.price }
    else m.set(a.divs, { seq: 0, divs: a.divs, department: a.department, count: 1, total: a.price })
  }
  return [...m.values()].map((r, i) => ({ ...r, seq: i + 1 }))
}

// ── ส่งออก Excel ───────────────────────────────────────────────────────────
// ใส่หัวรายงานกับเงื่อนไขที่กรองไว้บนสุด คนเปิดไฟล์ทีหลังจะรู้ว่าตัวเลขชุดนี้มาจากอะไร
// ช่องเงินเก็บเป็นตัวเลขจริง (ไม่ใช่ข้อความที่จัดรูปแบบแล้ว) เปิดใน Excel แล้วรวม/กรองต่อได้
const HEADER_ROW = 3
export type Cell = string | number | null

export const buildSheet = (
  title: string, subtitle: string, header: string[], rows: Cell[][],
  widths: number[], moneyCols: number[], footer?: Cell[],
) => {
  const aoa: Cell[][] = [[title], [subtitle], [], header, ...rows]
  if (footer) aoa.push([], footer)
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = widths.map(wch => ({ wch }))
  for (let r = HEADER_ROW + 1; r < aoa.length; r++) {
    for (const c of moneyCols) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00'
    }
  }
  // ตัวกรองของ Excel ครอบเฉพาะหัวตารางถึงแถวข้อมูลสุดท้าย ไม่กินแถวรวม
  if (rows.length) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: HEADER_ROW, c: 0 }, e: { r: HEADER_ROW + rows.length, c: header.length - 1 } }),
    }
  }
  return ws
}

const DETAIL_HEADER = [
  'ลำดับ', 'รหัสหน่วยงาน', 'หน่วยงาน', 'เลขครุภัณฑ์', 'เลขครุภัณฑ์เดิม', 'เลขลำดับ',
  'หมวดครุภัณฑ์', 'รหัสประเภท', 'ประเภท', 'รหัสประเภทย่อย', 'ประเภทย่อย', 'รหัสชนิด', 'ชื่อชนิด',
  'ชื่อครุภัณฑ์', 'ยี่ห้อ/รุ่น', 'วันที่รับ', 'ปีงบประมาณ', 'สถานที่ตั้ง', 'เลขที่เอกสาร',
  'ผู้ขาย/ผู้บริจาค', 'ที่อยู่ผู้ขาย', 'โทรศัพท์ผู้ขาย', 'ประเภทเงิน', 'วิธีได้มา',
  'ราคาต่อหน่วย (บาท)', 'อายุการใช้งาน (ปี)', 'อัตราค่าเสื่อม (% ต่อปี)', 'รหัส GF', 'หมายเหตุ', 'สถานะ',
]
const DETAIL_WIDTHS = [7, 12, 30, 20, 18, 9, 22, 10, 26, 13, 26, 15, 30, 32, 24, 12, 11, 28, 14,
  30, 36, 14, 18, 16, 16, 12, 14, 14, 24, 16]
const PRICE_COL = DETAIL_HEADER.indexOf('ราคาต่อหน่วย (บาท)')

/** สมุดงาน 2 ชีต: สรุปตามหน่วยงาน + รายการครุภัณฑ์ (ตามตัวกรองที่ส่งเข้ามา) */
export const buildWorkbook = (assets: Asset[], deptRows: DeptRow[], subtitle: string): XLSX.WorkBook => {
  const total = assets.reduce((s, a) => s + a.price, 0)

  const summary = buildSheet(
    'สรุปครุภัณฑ์แยกตามหน่วยงาน (ทะเบียนครุภัณฑ์ V2)', subtitle,
    ['ลำดับ', 'รหัสหน่วยงาน', 'หน่วยงาน', 'จำนวน (รายการ)', 'มูลค่ารวม (บาท)'],
    deptRows.map(r => [r.seq, r.divs, r.department, r.count, r.total]),
    [7, 14, 40, 16, 20], [4],
    ['', '', 'รวมทั้งสิ้น', assets.length, total],
  )

  // แถวรวมวางยอดเงินให้ตรงคอลัมน์ราคา หาตำแหน่งจากหัวตาราง เพิ่ม/ย้ายคอลัมน์แล้วไม่เลื่อน
  const footer: Cell[] = DETAIL_HEADER.map(() => '')
  footer[2] = 'รวมทั้งสิ้น'
  footer[3] = `${assets.length.toLocaleString('th-TH')} รายการ`
  footer[PRICE_COL] = total

  const detail = buildSheet(
    'รายการครุภัณฑ์แยกตามหน่วยงาน (ทะเบียนครุภัณฑ์ V2)', subtitle,
    DETAIL_HEADER,
    assets.map(a => [
      a.seq, a.divs, a.department, a.noid, a.noidOld, a.numbers,
      a.category, a.typeId, a.typeName, a.subtypeId, a.subtypeName, a.codeBps, a.kindName,
      a.names, a.models, thaiDate(a.receive), a.fy ? Number(a.fy) : null, a.locates, a.docno,
      a.supplierName, a.supplierAddress, a.supplierPhone, a.moneyType, a.acquireMethod,
      a.price, a.lifeYears, a.rate, a.gf, a.notes, a.status,
    ]),
    DETAIL_WIDTHS, [PRICE_COL], footer,
  )

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, summary, 'สรุปตามหน่วยงาน')
  XLSX.utils.book_append_sheet(wb, detail, 'รายการครุภัณฑ์')
  return wb
}

// ── จัดกลุ่มสำหรับ PDF: หน่วยงาน → หมวด → รหัสมาตรฐาน → รายการ ──────────────
// เรียงเองทุกระดับ ไม่พึ่งลำดับที่ส่งเข้ามา — รายงานเดิมเรียงตามหมวดก่อนแล้วค่อยขึ้นหัวหน่วยงาน
// ทุกครั้งที่หน่วยงานเปลี่ยน หน่วยงานเดียวกันจึงโผล่ซ้ำหลายช่วงกระจายไปทั้งเล่ม ของใหม่รวมไว้ที่เดียว
const naturalNoid = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })

export const buildPdfGroups = (assets: Asset[]): { groups: AssetByDeptGroup[]; grandCount: number; grandTotal: number } => {
  type Kind = { code: string; name: string; items: Asset[] }
  type Cat = { id: string; name: string; kinds: Map<string, Kind> }
  type Dept = { divs: string; department: string; count: number; total: number; cats: Map<string, Cat> }

  const depts = new Map<string, Dept>()
  for (const a of assets) {
    let d = depts.get(a.divs)
    if (!d) depts.set(a.divs, d = { divs: a.divs, department: a.department, count: 0, total: 0, cats: new Map() })
    d.count++
    d.total += a.price
    let c = d.cats.get(a.catId)
    if (!c) d.cats.set(a.catId, c = { id: a.catId, name: a.category, kinds: new Map() })
    let k = c.kinds.get(a.codeBps)
    if (!k) c.kinds.set(a.codeBps, k = { code: a.codeBps, name: a.kindName || 'ไม่ระบุชื่อตามรหัสมาตรฐาน', items: [] })
    k.items.push(a)
  }

  const item = (a: Asset): AssetByDeptItem => ({
    noid: a.noid,
    receive: thaiDate(a.receive),
    names: a.names,
    docno: a.docno,
    price: money(a.price),
    acquireMethod: a.acquireMethod,
    moneyType: a.moneyType,
    supplier: a.supplierName,
    gf: a.gf,
  })

  const groups = [...depts.values()]
    .sort((a, b) => a.divs.localeCompare(b.divs))
    .map(d => ({
      divs: d.divs,
      department: d.department,
      count: d.count.toLocaleString('th-TH'),
      total: money(d.total),
      categories: [...d.cats.values()]
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map(c => ({
          name: c.name,
          kinds: [...c.kinds.values()]
            .sort((a, b) => a.code.localeCompare(b.code))
            .map(k => ({ code: k.code, name: k.name, items: k.items.sort((x, y) => naturalNoid(x.noid, y.noid)).map(item) })),
        })),
    }))

  return { groups, grandCount: assets.length, grandTotal: assets.reduce((s, a) => s + a.price, 0) }
}
