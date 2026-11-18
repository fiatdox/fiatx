// ตัวสร้างไฟล์ .xlsx แบบมีสไตล์ (ฟอนต์ สีพื้น เส้นขอบ จัดวาง รวมช่อง ตรึงแถว ตั้งค่าหน้าพิมพ์)
// SheetJS รุ่น community ที่ใช้อยู่เขียนสไตล์ไม่ได้ — ไฟล์นี้เขียน SpreadsheetML เองแล้วใช้ zip ของ SheetJS (XLSX.CFB) บีบอัด
// ใช้กับรายงานที่ต้องออกมาหน้าตาตามแบบฟอร์ม; ตารางข้อมูลธรรมดายังใช้ XLSX.utils ได้ตามเดิม
import * as XLSX from 'xlsx'

export interface XStyle {
  b?: boolean; i?: boolean; sz?: number; color?: string  // สีตัวอักษร RRGGBB
  fill?: string                                          // สีพื้น RRGGBB
  h?: 'left' | 'center' | 'right'; v?: 'top' | 'center' | 'bottom'; wrap?: boolean
  border?: 'thin' | 'medium'; fmt?: string               // รูปแบบตัวเลข เช่น '0.0'
}
export type XValue = string | number | null | undefined

export const colName = (c: number) => { let s = ''; let n = c + 1; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }
const ref = (r: number, c: number) => `${colName(c)}${r + 1}`

export class XSheet {
  cells = new Map<number, Map<number, { v: XValue; s?: XStyle }>>()
  merges: string[] = []
  cols: number[] = []
  heights = new Map<number, number>()
  freeze?: { row: number; col: number }           // แถว/คอลัมน์แรกที่ไม่ถูกตรึง (เริ่ม 0)
  printTitleRows?: [number, number]               // แถวหัวตารางที่พิมพ์ซ้ำทุกหน้า (เริ่ม 0)
  landscape = true; paper: 'A4' | 'A3' = 'A4'; fitWidth = true; gridLines = true
  footer?: string
  constructor(public name: string) {}
  set(r: number, c: number, v: XValue, s?: XStyle) {
    if (!this.cells.has(r)) this.cells.set(r, new Map())
    this.cells.get(r)!.set(c, { v, s })
    return this
  }
  // รวมช่อง — ทุกช่องในช่วงได้สไตล์เดียวกัน (ให้เส้นขอบครบรอบ)
  merge(r1: number, c1: number, r2: number, c2: number, v: XValue, s?: XStyle) {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) this.set(r, c, r === r1 && c === c1 ? v : null, s)
    if (r1 !== r2 || c1 !== c2) this.merges.push(`${ref(r1, c1)}:${ref(r2, c2)}`)
    return this
  }
  height(r: number, h: number) { this.heights.set(r, h); return this }
}

const esc = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`

class Styles {
  fonts: string[] = []; fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>']; fmts: string[] = []; xfs: string[] = []
  private idx = new Map<string, number>()
  constructor(private font: string, private size: number) {
    this.fonts.push(this.fontXml({})); this.xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>')
  }
  private fontXml(s: XStyle) {
    return `<font>${s.b ? '<b/>' : ''}${s.i ? '<i/>' : ''}<sz val="${s.sz ?? this.size}"/><color rgb="${argb(s.color ?? '000000')}"/><name val="${esc(this.font)}"/><family val="2"/></font>`
  }
  private add(list: string[], xml: string, offset = 0) { const i = list.indexOf(xml); if (i >= 0) return i + offset; list.push(xml); return list.length - 1 + offset }
  id(s?: XStyle) {
    if (!s) return 0
    const key = JSON.stringify(s)
    const hit = this.idx.get(key); if (hit != null) return hit
    const fontId = this.add(this.fonts, this.fontXml(s))
    const fillId = s.fill ? this.add(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${argb(s.fill)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0
    const side = (n: string) => s.border ? `<${n} style="${s.border}"><color rgb="FF7F7F7F"/></${n}>` : `<${n}/>`
    const borderId = s.border ? this.add(this.borders, `<border>${side('left')}${side('right')}${side('top')}${side('bottom')}<diagonal/></border>`) : 0
    const numFmtId = s.fmt ? this.add(this.fmts, s.fmt, 164) : 0
    const al = (s.h || s.v || s.wrap) ? `<alignment${s.h ? ` horizontal="${s.h}"` : ''}${s.v ? ` vertical="${s.v}"` : ''}${s.wrap ? ' wrapText="1"' : ''}/>` : ''
    this.xfs.push(`<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1"${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''}${numFmtId ? ' applyNumberFormat="1"' : ''}${al ? ' applyAlignment="1"' : ''}>${al}</xf>`)
    const i = this.xfs.length - 1; this.idx.set(key, i); return i
  }
  xml() {
    const fmts = this.fmts.length ? `<numFmts count="${this.fmts.length}">${this.fmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join('')}</numFmts>` : ''
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${fmts}`
      + `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts><fills count="${this.fills.length}">${this.fills.join('')}</fills>`
      + `<borders count="${this.borders.length}">${this.borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
      + `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  }
}

const sheetXml = (sh: XSheet, st: Styles) => {
  const rows = [...new Set([...sh.cells.keys(), ...sh.heights.keys()])].sort((a, b) => a - b)
  const data = rows.map(r => {
    const h = sh.heights.get(r)
    const cs = [...(sh.cells.get(r) ?? new Map()).entries()].sort((a, b) => a[0] - b[0]).map(([c, { v, s }]) => {
      const sid = st.id(s), sa = sid ? ` s="${sid}"` : ''
      if (v == null || v === '') return `<c r="${ref(r, c)}"${sa}/>`
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref(r, c)}"${sa}><v>${v}</v></c>`
      return `<c r="${ref(r, c)}"${sa} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`
    }).join('')
    return `<row r="${r + 1}"${h ? ` ht="${h}" customHeight="1"` : ''}>${cs}</row>`
  }).join('')
  const f = sh.freeze
  const pane = f && (f.row || f.col)
    ? `<pane${f.col ? ` xSplit="${f.col}"` : ''}${f.row ? ` ySplit="${f.row}"` : ''} topLeftCell="${ref(f.row, f.col)}" activePane="${f.row && f.col ? 'bottomRight' : f.row ? 'bottomLeft' : 'topRight'}" state="frozen"/>` : ''
  const cols = sh.cols.length ? `<cols>${sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
  const merges = sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
    + `${sh.fitWidth ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : ''}<sheetViews><sheetView workbookViewId="0"${sh.gridLines ? '' : ' showGridLines="0"'}>${pane}</sheetView></sheetViews>`
    + `<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${data}</sheetData>${merges}`
    + `<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.45" header="0.2" footer="0.2"/>`
    + `<pageSetup paperSize="${sh.paper === 'A3' ? 8 : 9}" orientation="${sh.landscape ? 'landscape' : 'portrait'}"${sh.fitWidth ? ' fitToWidth="1" fitToHeight="0"' : ''}/>`
    + `<headerFooter><oddFooter>${esc(`&L${sh.footer ?? ''}&Rหน้า &P / &N`)}</oddFooter></headerFooter></worksheet>`
}

// ชื่อแผ่นงาน: ≤ 31 ตัว ห้าม []:*?/\ และห้ามซ้ำ
export const safeSheetName = (name: string, used: Set<string>) => {
  const base = name.replace(/[[\]:*?/\\]/g, '-').slice(0, 31) || 'Sheet'
  let n = base, k = 2
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 27)} (${k++})`
  used.add(n.toLowerCase()); return n
}

export const buildXlsx = (sheets: XSheet[], opts: { font?: string; size?: number } = {}): Uint8Array => {
  const st = new Styles(opts.font ?? 'Tahoma', opts.size ?? 10)
  const enc = new TextEncoder()
  const used = new Set<string>()
  sheets.forEach(s => { s.name = safeSheetName(s.name, used) })
  const sheetXmls = sheets.map(s => sheetXml(s, st))   // ต้องสร้างก่อน styles.xml (ลงทะเบียนสไตล์)
  const quote = (n: string) => `'${n.replace(/'/g, "''")}'`
  const defined = sheets.map((s, i) => s.printTitleRows ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${esc(quote(s.name))}!$${s.printTitleRows[0] + 1}:$${s.printTitleRows[1] + 1}</definedName>` : '').join('')
  const files: [string, string][] = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${defined ? `<definedNames>${defined}</definedNames>` : ''}</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ...sheetXmls.map((x, i) => [`xl/worksheets/sheet${i + 1}.xml`, x] as [string, string]),
    ['xl/styles.xml', st.xml()],
  ]
  const zip = XLSX.CFB.utils.cfb_new({ root: 'R' })
  for (const [p, x] of files) XLSX.CFB.utils.cfb_add(zip, p, enc.encode(x))
  return new Uint8Array(XLSX.CFB.write(zip, { fileType: 'zip', type: 'array', compression: true }))
}

export const downloadXlsx = (data: Uint8Array, filename: string) => {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
