// รายงานทะเบียนทรัพย์สินที่ขึ้นบัญชีในหน่วยงาน (PDF) — แบบฟอร์มเดิมของระบบ PHP
//
// วาดลง PDF ตรง ๆ ด้วย pdfkit (ตัวเดียวกับที่ react-pdf ใช้อยู่ข้างใต้) ไม่ผ่าน react-pdf
// เดิมใช้ react-pdf: ทั้งทะเบียน ~12,700 รายการใช้หลายนาทีและหน้าเว็บค้างตลอด เพราะ react-pdf
// จัดวางทุกช่องซ้ำด้วยเครื่องมือจัดหน้าของมันเอง (yoga + textkit) ราว 115,000 ช่อง
// ทั้งที่เราคำนวณตำแหน่ง ความกว้าง การตัดบรรทัด และการแบ่งหน้าเองครบแล้ว
// วาดตรงจึงเหลือแค่เขียนข้อความลงพิกัดที่รู้อยู่แล้ว และพักให้เบราว์เซอร์หายใจเป็นระยะ หน้าเว็บไม่ค้าง
import PDFDocument from '@react-pdf/pdfkit'

// ─── Types ────────────────────────────────────────────────────────────────────
// ค่าทุกช่องจัดรูปแบบเป็นข้อความมาแล้ว โมดูลนี้มีหน้าที่วางหน้าอย่างเดียว
export interface AssetByDeptItem {
  noid: string
  receive: string
  names: string
  docno: string
  price: string
  acquireMethod: string
  moneyType: string
  supplier: string
  gf: string
}

/** กลุ่มตามรหัสมาตรฐาน (รหัสชนิดครุภัณฑ์ เช่น 5100-001-0001) */
export interface AssetByDeptKind {
  code: string
  name: string
  items: AssetByDeptItem[]
}

export interface AssetByDeptCategory {
  name: string
  kinds: AssetByDeptKind[]
}

export interface AssetByDeptGroup {
  divs: string
  department: string
  count: string
  total: string
  categories: AssetByDeptCategory[]
}

export interface AssetByDepartmentData {
  orgName: string
  /** เช่น '2561' หรือ 'ทุกปีงบประมาณ' */
  fiscalYearText: string
  /** เช่น 'อาคารสิ่งก่อสร้าง' หรือ 'ทุกหมวด' */
  categoryText: string
  /** เงื่อนไขอื่นที่กรองไว้ (เช่น คำค้น) — พิมพ์ใต้หัวรายงาน ให้รู้ว่าเอกสารนี้ไม่ใช่ทั้งทะเบียน */
  filterNote?: string
  groups: AssetByDeptGroup[]
  grandCount: string
  grandTotal: string
  preparedBy?: string
}

/** ไฟล์ฟอนต์ Sarabun (ตัวปกติ + ตัวหนา) เป็นไบต์ดิบ */
export interface PdfFonts {
  regular: ArrayBuffer | Uint8Array
  bold: ArrayBuffer | Uint8Array
}

// ─── ขนาดหน้า ──────────────────────────────────────────────────────────────────
const CM = 28.3465
const PAGE_W = 841.89            // A4 แนวนอน
const PAGE_H = 595.28
const PAD_X = 1 * CM
const PAD_TOP = 0.9 * CM
const PAD_BOTTOM = 1.1 * CM
const BODY_W = PAGE_W - 2 * PAD_X
const FONT = 8.5
const HEAD_FONT = 11
const FOOT_FONT = 7.5
const LINE_EM = 1.3               // ascent − descent ของ Sarabun (1.068 + 0.232) ไม่มี lineGap
const CELL_PAD_Y = 3
const CELL_PAD_X = 3
const TH_PAD_Y = 5
const BORDER_W = 0.75

const FILL = {
  dept: '#ececec',
  cat: '#f7f7f7',
  subtotal: '#f7f7f7',
  grand: '#dcdcdc',
}

type Align = 'left' | 'center' | 'right'
// ความกว้างคอลัมน์สั้นตั้งจากค่าที่ยาวที่สุดในทะเบียนจริงให้อยู่บรรทัดเดียว เช่น
// "เงินนอกงบประมาณ" ต้องการ 11.4%, เลข GF 12 หลัก 9.4%, "เฉพาะเจาะจง" 9.4%, วันที่ 7.6%
// ที่เหลือแบ่งให้คอลัมน์ข้อความยาว (รายละเอียด เลขที่ใบสั่งซื้อ บริษัท) ซึ่งตัดขึ้นบรรทัดใหม่ได้
const COLS: { key: keyof AssetByDeptItem; title: string; w: number; align: Align }[] = [
  { key: 'noid',          title: 'รหัสครุภัณฑ์',        w: 13,   align: 'left' },
  { key: 'receive',       title: 'วันที่รับ',            w: 8,    align: 'center' },
  { key: 'names',         title: 'รายละเอียดครุภัณฑ์',  w: 16.5, align: 'left' },
  { key: 'docno',         title: 'เลขที่ใบสั่งซื้อ',      w: 10,   align: 'left' },
  { key: 'price',         title: 'ราคา',               w: 9,    align: 'right' },
  { key: 'acquireMethod', title: 'วิธีการได้มา',         w: 9.5,  align: 'center' },
  { key: 'moneyType',     title: 'เงิน',                w: 11.5, align: 'center' },
  { key: 'supplier',      title: 'บริษัท',              w: 13,   align: 'left' },
  { key: 'gf',            title: 'GF',                 w: 9.5,  align: 'center' },
]
const colW = (pct: number) => BODY_W * pct / 100
// ขอบซ้ายของแต่ละคอลัมน์ (pt)
const COL_X = COLS.reduce<number[]>((xs, c, i) => [...xs, i === 0 ? PAD_X : xs[i - 1] + colW(COLS[i - 1].w)], [])
// แถวรวมวางยอดเงินใต้คอลัมน์ราคา ช่องข้อความกินคอลัมน์ก่อนหน้าทั้งหมด
const PRICE_AT = COLS.findIndex(c => c.key === 'price')
const LABEL_W = COLS.slice(0, PRICE_AT).reduce((n, c) => n + c.w, 0)

// ─── วัดความกว้างและตัดบรรทัด ─────────────────────────────────────────────────
// ข้อความไทยไม่เว้นวรรคระหว่างคำ จึงตัดคำด้วย Intl.Segmenter แล้ววัดความกว้างจากตารางด้านล่าง
// รู้ความสูงของทุกแถวล่วงหน้า ใช้แบ่งหน้าได้แม่นยำ และไม่มีข้อความล้นทับช่องข้าง ๆ

// ความกว้างตัวอักษรของ Sarabun (หน่วย 1/1000 em) อ่านจากไฟล์ฟอนต์ใน public/fonts/Sarabun
// เรียงตามรหัส: ASCII 0x20–0x7E แล้วต่อด้วยอักษรไทย 0x0E00–0x0E5B (สระบน/ล่าง วรรณยุกต์ = 0)
const REG_W = '243,237,354,686,529,903,668,192,318,318,448,607,252,340,252,415,550,550,550,550,550,550,550,550,550,550,252,252,607,607,607,454,795,596,589,585,623,552,550,636,678,292,440,605,548,798,682,661,573,661,581,529,558,657,602,831,605,573,567,308,382,308,585,323,400,514,542,473,542,518,331,541,558,245,247,487,291,839,549,557,545,545,350,416,377,552,479,668,460,462,451,320,242,320,607,600,576,594,606,603,607,638,454,556,570,606,616,807,830,612,612,539,708,831,831,592,607,581,657,542,637,645,655,622,622,720,720,616,614,572,484,581,580,612,512,602,677,580,636,720,587,565,546,534,0,485,485,0,0,0,0,0,0,0,600,600,600,600,589,310,579,379,378,390,293,621,0,0,0,0,0,0,0,0,621,660,676,685,694,678,678,675,744,674,692,767,1020'.split(',').map(Number)
const BOLD_W = '233,256,405,707,541,968,697,205,354,354,448,617,291,340,291,468,565,565,565,565,565,565,565,565,565,565,291,291,617,617,617,471,805,641,606,620,642,571,574,653,692,323,492,656,565,816,699,690,590,690,596,551,590,662,647,874,655,628,592,332,385,332,599,358,400,529,558,492,558,542,377,555,567,273,279,533,301,846,563,579,565,565,397,441,420,561,528,707,520,505,476,350,257,350,617,600,597,632,656,624,628,679,482,571,594,650,667,832,849,622,622,573,761,876,884,614,628,598,678,584,650,651,669,649,649,739,739,630,630,587,498,598,600,622,535,624,718,600,645,739,601,584,574,548,0,510,510,0,0,0,0,0,0,0,600,600,600,600,603,326,616,409,425,449,304,666,0,0,0,0,0,0,0,0,626,666,691,716,709,688,688,673,793,684,700,831,1055'.split(',').map(Number)
const ASCII_N = 0x7e - 0x20 + 1

const charW = (cp: number, bold: boolean): number => {
  const tbl = bold ? BOLD_W : REG_W
  if (cp >= 0x20 && cp <= 0x7e) return tbl[cp - 0x20]
  if (cp >= 0x0e00 && cp <= 0x0e5b) return tbl[ASCII_N + cp - 0x0e00]
  if (cp === 0xa0) return bold ? 233 : 243
  return 1000 // อักขระนอกตาราง คิดกว้างไว้ก่อน กันล้น
}

const textW = (t: string, size: number, bold: boolean) => {
  let w = 0
  for (const ch of t) w += charW(ch.codePointAt(0)!, bold)
  return (w / 1000) * size
}

// ตัดคำไทยด้วยพจนานุกรมของเบราว์เซอร์ — ไม่มี Segmenter (เบราว์เซอร์เก่ามาก) ก็ตัดที่เว้นวรรคแทน
const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter('th', { granularity: 'word' })
  : null
const tokens = (t: string): string[] =>
  segmenter ? Array.from(segmenter.segment(t), x => x.segment) : t.split(/(\s+)/)

// ความกว้างที่ใช้ได้จริงของช่อง = กว้างคอลัมน์ − ช่องว่างซ้ายขวา เผื่อไว้อีก 2%
const MEASURE_SLACK = 0.98
const availW = (widthPct: number) => (colW(widthPct) - 2 * CELL_PAD_X) * MEASURE_SLACK

/** ตัดข้อความเป็นบรรทัดให้พอดีความกว้าง (pt) — คำที่ยาวเกินบรรทัดเดียวถูกหั่นทีละตัวอักษร */
const wrap = (text: string, avail: number, size: number, bold: boolean): string[] => {
  if (!text) return ['']
  const lines: string[] = []
  let cur = ''
  let curW = 0
  const flush = () => { lines.push(cur.trimEnd()); cur = ''; curW = 0 }
  for (const tok of tokens(text)) {
    const space = /^\s+$/.test(tok)
    if (space && !cur) continue
    const w = textW(tok, size, bold)
    if (curW + w <= avail) { cur += tok; curW += w; continue }
    if (space) { flush(); continue }
    if (cur) flush()
    if (w <= avail) { cur = tok; curW = w; continue }
    // สระบน/ล่างกว้าง 0 จึงไม่มีวันถูกแยกออกจากพยัญชนะตัวหน้า
    for (const ch of tok) {
      const cw = textW(ch, size, bold)
      if (cur && curW + cw > avail) flush()
      cur += ch
      curW += cw
    }
  }
  if (cur || !lines.length) lines.push(cur.trimEnd())
  return lines
}

// ─── แถวของรายงาน ────────────────────────────────────────────────────────────
// ทุกแถว (หัวกลุ่ม รายการ แถวรวม) เป็นรายการแบนชั้นเดียว ตัดบรรทัดและรู้ความสูงไว้ล่วงหน้า แล้วจัดใส่หน้าเอง
const LINE_H = FONT * LINE_EM
const rowH = (lines: number) => lines * LINE_H + 2 * CELL_PAD_Y

type Line =
  | { kind: 'dept'; key: string; text: string[]; raw: string; h: number }
  | { kind: 'group'; key: string; text: string[]; h: number; fill?: string }
  | { kind: 'item'; key: string; cells: string[][]; h: number }
  | { kind: 'total'; key: string; label: string[]; total: string; h: number; fill: string }

const deptLine = (key: string, raw: string): Extract<Line, { kind: 'dept' }> => {
  const text = wrap(raw, availW(100), FONT, true)
  return { kind: 'dept', key, text, raw, h: rowH(text.length) }
}

const groupLine = (key: string, raw: string, fill?: string): Line => {
  const text = wrap(raw, availW(100), FONT, false)
  return { kind: 'group', key, text, h: rowH(text.length), fill }
}

const totalLine = (key: string, raw: string, total: string, fill: string): Line => {
  const label = wrap(raw, availW(LABEL_W), FONT, true)
  return { kind: 'total', key, label, total, h: rowH(label.length), fill }
}

const flatten = (data: AssetByDepartmentData): Line[] => {
  const out: Line[] = []
  for (const g of data.groups) {
    const d = g.divs || '-'
    out.push(deptLine(`d:${d}`, `หน่วยงาน :: [${d}] ${g.department}`))
    for (const c of g.categories) {
      out.push(groupLine(`c:${d}:${c.name}`, `หมวด :: ${c.name}`, FILL.cat))
      for (const k of c.kinds) {
        out.push(groupLine(`k:${d}:${c.name}:${k.code}`, `รหัสมาตรฐาน :: [${k.code || '-'}] ${k.name}`))
        for (const it of k.items) {
          const cells = COLS.map(col => wrap(it[col.key], availW(col.w), FONT, false))
          out.push({ kind: 'item', key: it.noid, cells, h: rowH(Math.max(...cells.map(x => x.length))) })
        }
      }
    }
    out.push(totalLine(`t:${d}`, `รวม ${g.department} ${g.count} รายการ`, g.total, FILL.subtotal))
  }
  out.push(totalLine('grand', `รวมทั้งสิ้น ${data.grandCount} รายการ`, data.grandTotal, FILL.grand))
  return out
}

// ─── แบ่งหน้า ─────────────────────────────────────────────────────────────────
const TH_H = LINE_H + 2 * TH_PAD_Y
const PAGE_BUDGET = PAGE_H - PAD_TOP - PAD_BOTTOM - TH_H

const titleHeight = (hasNote: boolean) =>
  2 * (HEAD_FONT * LINE_EM + 3) + (HEAD_FONT * LINE_EM + 6) + (hasNote ? LINE_H + 2 : 0) + 10

const paginate = (lines: Line[], firstPageReserve: number): Line[][] => {
  const pages: Line[][] = []
  let page: Line[] = []
  let used = 0
  let budget = PAGE_BUDGET - firstPageReserve
  let dept: Extract<Line, { kind: 'dept' }> | null = null

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    // หัวกลุ่มต้องไปพร้อมหัวกลุ่มย่อยที่ต่อกันและรายการแรก ไม่ค้างอยู่ท้ายหน้าตัวเดียว
    let need = l.h
    if (l.kind === 'dept' || l.kind === 'group') {
      let j = i + 1
      while (j < lines.length && lines[j].kind === 'group') need += lines[j++].h
      if (j < lines.length) need += lines[j].h
    }
    if (page.length && used + need > budget) {
      pages.push(page)
      page = []
      used = 0
      budget = PAGE_BUDGET
      // ยังอยู่ในหน่วยงานเดิม — ทวนชื่อหน่วยงานไว้หัวหน้าใหม่ คนเปิดหน้ากลางเล่มจะรู้ว่าเป็นของใคร
      if (dept && l.kind !== 'dept' && l.key !== 'grand') {
        const cont = deptLine(`${dept.key}:p${pages.length}`, `${dept.raw} (ต่อ)`)
        page.push(cont)
        used += cont.h
      }
    }
    if (l.kind === 'dept') dept = l
    page.push(l)
    used += l.h
  }
  if (page.length || !pages.length) pages.push(page)
  return pages
}

// ─── วาดลง PDF ────────────────────────────────────────────────────────────────
type Doc = InstanceType<typeof PDFDocument>

export interface RenderProgress {
  page: number
  pages: number
}

// วาดทีละชุดแล้วพักให้เบราว์เซอร์วาดหน้าจอ/ตอบสนองผู้ใช้ — ไม่งั้นหน้าเว็บค้างจนกว่าจะเสร็จ
const PAGES_PER_SLICE = 10
const breathe = () => new Promise<void>(resolve => setTimeout(resolve, 0))

/** สร้าง PDF ทั้งเล่ม คืนเป็นไบต์ของไฟล์ — คืน null ถ้า isCancelled() บอกให้หยุดระหว่างทาง */
export async function renderAssetByDepartmentPdf(
  data: AssetByDepartmentData,
  fonts: PdfFonts,
  onProgress?: (p: RenderProgress) => void,
  isCancelled?: () => boolean,
): Promise<Uint8Array[] | null> {
  const pages = paginate(flatten(data), titleHeight(!!data.filterNote))
  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })

  const doc: Doc = new PDFDocument({
    autoFirstPage: false,
    compress: true,
    displayTitle: true,
    lang: 'th-TH',
    info: {
      Title: `รายงานทะเบียนทรัพย์สินที่ขึ้นบัญชีในหน่วยงาน ${data.fiscalYearText}`,
      Creator: 'PYHOS-EXP',
      Producer: 'PYHOS-EXP',
    },
  })
  const chunks: Uint8Array[] = []
  doc.on('data', (c: Uint8Array) => chunks.push(c instanceof Uint8Array ? c : new Uint8Array(c)))
  const finished = new Promise<void>((resolve, reject) => {
    doc.on('end', () => resolve())
    doc.on('error', reject)
  })
  doc.registerFont('R', fonts.regular)
  doc.registerFont('B', fonts.bold)

  // เขียนข้อความหนึ่งบรรทัด — y คือขอบบนของบรรทัด (pdfkit บวกความสูงตัวอักษรให้เอง)
  let curFont = ''
  let curSize = 0
  const put = (str: string, x: number, y: number, bold: boolean, size: number) => {
    if (!str) return
    const f = bold ? 'B' : 'R'
    if (f !== curFont || size !== curSize) { doc.font(f).fontSize(size); curFont = f; curSize = size }
    doc.text(str, x, y, { lineBreak: false })
  }
  const putAligned = (str: string, x: number, w: number, y: number, align: Align, bold: boolean, size = FONT) => {
    if (!str) return
    const tw = textW(str, size, bold)
    const tx = align === 'left' ? x + CELL_PAD_X
      : align === 'right' ? x + w - CELL_PAD_X - tw
        : x + (w - tw) / 2
    put(str, tx, y, bold, size)
  }

  // กรอบแถว: สี่เหลี่ยมรอบแถว + เส้นตั้งที่ขอบคอลัมน์ที่ระบุ แล้ว stroke ครั้งเดียว
  const frame = (y: number, h: number, splits: number[]) => {
    doc.rect(PAD_X, y, BODY_W, h)
    for (const x of splits) doc.moveTo(x, y).lineTo(x, y + h)
    doc.stroke()
  }
  const fillRow = (y: number, h: number, color?: string) => {
    if (!color) return
    doc.rect(PAD_X, y, BODY_W, h).fill(color)
    doc.fillColor('#000')
  }

  const COL_SPLITS = COL_X.slice(1)
  const TOTAL_SPLITS = [PAD_X + colW(LABEL_W), PAD_X + colW(LABEL_W + COLS[PRICE_AT].w)]

  const drawHeaderRow = (y: number) => {
    frame(y, TH_H, COL_SPLITS)
    COLS.forEach((c, i) => putAligned(c.title, COL_X[i], colW(c.w), y + TH_PAD_Y, 'center', true))
    return y + TH_H
  }

  const drawLine = (l: Line, y: number) => {
    const ty = y + CELL_PAD_Y
    switch (l.kind) {
      case 'item':
        frame(y, l.h, COL_SPLITS)
        l.cells.forEach((lines, i) => lines.forEach((s, li) =>
          putAligned(s, COL_X[i], colW(COLS[i].w), ty + li * LINE_H, COLS[i].align, false)))
        break
      case 'dept':
      case 'group': {
        const bold = l.kind === 'dept'
        fillRow(y, l.h, l.kind === 'dept' ? FILL.dept : l.fill)
        frame(y, l.h, [])
        l.text.forEach((s, li) => put(s, PAD_X + CELL_PAD_X, ty + li * LINE_H, bold, FONT))
        break
      }
      case 'total':
        fillRow(y, l.h, l.fill)
        frame(y, l.h, TOTAL_SPLITS)
        l.label.forEach((s, li) => putAligned(s, PAD_X, colW(LABEL_W), ty + li * LINE_H, 'right', true))
        putAligned(l.total, TOTAL_SPLITS[0], colW(COLS[PRICE_AT].w), ty, 'right', true)
        break
    }
  }

  const drawTitle = (y: number) => {
    const center = (str: string, yy: number, size: number, bold: boolean) =>
      put(str, PAD_X + (BODY_W - textW(str, size, bold)) / 2, yy, bold, size)
    center(`ส่วนราชการ${data.orgName}`, y, HEAD_FONT, true)
    y += HEAD_FONT * LINE_EM + 3
    center(`รายงานทะเบียนทรัพย์สินที่ขึ้นบัญชีในหน่วยงาน ประจำปีงบประมาณ :: ${data.fiscalYearText}`, y, HEAD_FONT, true)
    y += HEAD_FONT * LINE_EM + 3 + 4
    center(`หมวดครุภัณฑ์ ${data.categoryText}`, y, HEAD_FONT, true)
    y += HEAD_FONT * LINE_EM + 2
    if (data.filterNote) {
      doc.fillColor('#333')
      center(data.filterNote, y, FONT, false)
      doc.fillColor('#000')
      y += LINE_H + 2
    }
    return y + 10
  }

  const drawFooter = (n: number, total: number) => {
    const y = PAGE_H - 0.45 * CM - FOOT_FONT * LINE_EM
    doc.fillColor('#555')
    put(`ผู้พิมพ์ : ${data.preparedBy || '-'} · พิมพ์เมื่อ ${printedAt}`, PAD_X, y, false, FOOT_FONT)
    const num = `หน้า ${n} / ${total}`
    put(num, PAGE_W - PAD_X - textW(num, FOOT_FONT, false), y, false, FOOT_FONT)
    doc.fillColor('#000')
  }

  for (let pi = 0; pi < pages.length; pi++) {
    doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 })
    // ค่าเส้น/สีเขียนลงเนื้อหาของหน้า ต้องตั้งหลังเปิดหน้าแล้ว (ตั้งก่อนมีหน้าแรกจะพัง) และตั้งใหม่ทุกหน้า
    doc.lineWidth(BORDER_W).strokeColor('#000').fillColor('#000')
    curFont = ''
    let y = PAD_TOP
    if (pi === 0) y = drawTitle(y)
    y = drawHeaderRow(y)
    for (const l of pages[pi]) { drawLine(l, y); y += l.h }
    drawFooter(pi + 1, pages.length)

    if ((pi + 1) % PAGES_PER_SLICE === 0) {
      onProgress?.({ page: pi + 1, pages: pages.length })
      await breathe()
      // ผู้ใช้ปิดหน้าต่างไปแล้ว — เลิกวาดต่อ ไม่ต้องเสียเวลาทำส่วนที่เหลือ
      if (isCancelled?.()) return null
    }
  }
  onProgress?.({ page: pages.length, pages: pages.length })
  doc.end()
  await finished
  return chunks
}
