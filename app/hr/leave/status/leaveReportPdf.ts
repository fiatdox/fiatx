// รายงานสรุปการลาตามปีงบประมาณ (PDF) — รายคน หรือรายกลุ่มงาน/หน่วยงาน
//
// วาดด้วย pdfkit ตรง ๆ แบบเดียวกับรายงานครุภัณฑ์แยกตามหน่วยงาน (ดูเหตุผลใน asset-by-department/pdfReport.ts)
// โมดูลนี้จัดกลุ่ม รวมยอด และวางหน้าเท่านั้น จำนวนวันของแต่ละคนคำนวณมาจากหน้ารายงานแล้ว ตัวเลขจึงตรงกับหน้าจอ
import PDFDocument from '@react-pdf/pdfkit'
import { textW, wrap, type PdfFonts } from '@/app/general/procurement/asset-by-department/pdfReport'

// ─── ข้อมูลเข้า ────────────────────────────────────────────────────────────────
export type LeaveReportMode = 'person' | 'unit'

export interface LeaveReportPerson {
  name: string
  position: string
  /** ชื่อกลุ่มงาน — ไม่ว่างเสมอ (หน้ารายงานใส่ "ไม่ระบุกลุ่มงาน" ให้แล้ว) */
  major: string
  /** ชื่อหน่วยงาน — ว่างได้ */
  submajor: string
  /** จำนวนวันแยกตามคอลัมน์ประเภทการลา เรียงตาม bucketLabels */
  days: number[]
  count: number
  totalDays: number
}

export interface LeaveReportInput {
  mode: LeaveReportMode
  orgName: string
  /** เช่น 'ประจำปีงบประมาณ พ.ศ. 2569 · ทั้งปีงบประมาณ (01/10/2568 – 30/09/2569)' */
  periodText: string
  /** เงื่อนไขที่ทำให้ตัวเลขเปลี่ยน — พิมพ์ไว้ใต้หัวรายงาน คนอ่านจะได้รู้ว่านับอะไร */
  noteText: string
  bucketLabels: string[]
  people: LeaveReportPerson[]
  preparedBy?: string
}

// ─── จัดกลุ่มเป็นแถวของรายงาน ─────────────────────────────────────────────────
type Align = 'left' | 'center' | 'right'
interface Column { title: string; w: number; align: Align }

type Row =
  | { kind: 'group'; text: string }
  | { kind: 'subgroup'; text: string }
  | { kind: 'item'; cells: string[] }
  | { kind: 'total'; level: 'sub' | 'group' | 'grand'; label: string; cells: string[] }

const NO_SUBMAJOR = 'ไม่ระบุหน่วยงาน'
const round2 = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number) => round2(n).toLocaleString('th-TH', { maximumFractionDigits: 2 })
const num = (n: number) => (n ? fmt(n) : '-')
const byTh = (a: string, b: string) => a.localeCompare(b, 'th')

/** ยอดรวมของกลุ่มคน → ช่องตัวเลข: วันแต่ละประเภท + ครั้ง + วันรวม */
const sumCells = (people: LeaveReportPerson[], buckets: number): string[] => [
  ...Array.from({ length: buckets }, (_, i) => num(people.reduce((a, p) => a + (p.days[i] ?? 0), 0))),
  num(people.reduce((a, p) => a + p.count, 0)),
  num(people.reduce((a, p) => a + p.totalDays, 0)),
]

/** กลุ่มงาน → หน่วยงาน → คน เรียงตามชื่อไทย (หน่วยที่ไม่ระบุไว้ท้ายกลุ่ม) */
const groupPeople = (people: LeaveReportPerson[]) => {
  const majors = new Map<string, Map<string, LeaveReportPerson[]>>()
  for (const p of people) {
    const subs = majors.get(p.major) ?? new Map<string, LeaveReportPerson[]>()
    const list = subs.get(p.submajor)
    if (list) list.push(p); else subs.set(p.submajor, [p])
    majors.set(p.major, subs)
  }
  return [...majors.entries()].sort(([a], [b]) => byTh(a, b)).map(([major, subs]) => ({
    major,
    all: [...subs.values()].flat(),
    subs: [...subs.entries()]
      .sort(([a], [b]) => (a ? (b ? byTh(a, b) : -1) : b ? 1 : 0))
      .map(([submajor, list]) => ({ submajor, people: [...list].sort((x, y) => byTh(x.name, y.name)) })),
  }))
}

// ความกว้างคอลัมน์เป็น % ของหน้า รวม 100 — ตัวเลขทุกคอลัมน์กว้างเท่ากันเพื่อให้อ่านเทียบกันได้
const NUM_W = 7
const COUNT_W = 6
const buildColumns = (mode: LeaveReportMode, labels: string[]): { columns: Column[]; labelSpan: number } => {
  const nums: Column[] = [
    ...labels.map(title => ({ title, w: NUM_W, align: 'center' as const })),
    { title: 'รวม (ครั้ง)', w: COUNT_W, align: 'center' },
    { title: 'รวม (วัน)', w: NUM_W, align: 'center' },
  ]
  const fixed = nums.reduce((a, c) => a + c.w, 0)
  if (mode === 'person') {
    const rest = 100 - fixed - 4.5
    return {
      columns: [
        { title: 'ลำดับ', w: 4.5, align: 'center' },
        { title: 'ชื่อ-สกุล', w: rest * 0.52, align: 'left' },
        { title: 'ตำแหน่ง', w: rest * 0.48, align: 'left' },
        ...nums,
      ],
      labelSpan: 3,
    }
  }
  return {
    columns: [
      { title: 'ลำดับ', w: 5, align: 'center' },
      { title: 'หน่วยงาน', w: 100 - fixed - 5 - NUM_W, align: 'left' },
      { title: 'คนที่ลา', w: NUM_W, align: 'center' },
      ...nums,
    ],
    labelSpan: 2,
  }
}

/** แปลงรายคนเป็นแถวของรายงานตามรูปแบบที่เลือก */
export const buildLeaveReportRows = (mode: LeaveReportMode, people: LeaveReportPerson[], buckets: number): Row[] => {
  const rows: Row[] = []
  let seq = 0
  for (const g of groupPeople(people)) {
    rows.push({ kind: 'group', text: g.major })
    if (mode === 'person') {
      const many = g.subs.length > 1
      for (const s of g.subs) {
        // กลุ่มงานที่ไม่แยกหน่วย ไม่ต้องมีหัว "ไม่ระบุหน่วยงาน" ให้รก
        if (s.submajor || many) rows.push({ kind: 'subgroup', text: `หน่วยงาน :: ${s.submajor || NO_SUBMAJOR}` })
        for (const p of s.people) {
          rows.push({
            kind: 'item',
            cells: [fmt(++seq), p.name, p.position, ...p.days.map(num), num(p.count), num(p.totalDays)],
          })
        }
        if (many) {
          rows.push({
            kind: 'total', level: 'sub',
            label: `รวม ${s.submajor || NO_SUBMAJOR} ${fmt(s.people.length)} คน`,
            cells: sumCells(s.people, buckets),
          })
        }
      }
      rows.push({ kind: 'total', level: 'group', label: `รวม ${g.major} ${fmt(g.all.length)} คน`, cells: sumCells(g.all, buckets) })
    } else {
      for (const s of g.subs) {
        rows.push({
          kind: 'item',
          cells: [fmt(++seq), s.submajor || NO_SUBMAJOR, fmt(s.people.length), ...sumCells(s.people, buckets)],
        })
      }
      rows.push({ kind: 'total', level: 'group', label: `รวม ${g.major}`, cells: [fmt(g.all.length), ...sumCells(g.all, buckets)] })
    }
  }
  const grand = sumCells(people, buckets)
  rows.push(mode === 'person'
    ? { kind: 'total', level: 'grand', label: `รวมทั้งสิ้น ${fmt(people.length)} คน`, cells: grand }
    : { kind: 'total', level: 'grand', label: 'รวมทั้งสิ้น', cells: [fmt(people.length), ...grand] })
  return rows
}

// ─── ขนาดหน้า ──────────────────────────────────────────────────────────────────
const CM = 28.3465
const PAGE_W = 841.89            // A4 แนวนอน
const PAGE_H = 595.28
const PAD_X = 1 * CM
const PAD_TOP = 0.9 * CM
const PAD_BOTTOM = 1.2 * CM
const BODY_W = PAGE_W - 2 * PAD_X
const FONT = 8.5
const HEAD_FONT = 12
const FOOT_FONT = 7.5
const LINE_EM = 1.3               // ascent − descent ของ Sarabun
const LINE_H = FONT * LINE_EM
const CELL_PAD_Y = 3
const CELL_PAD_X = 3
const TH_PAD_Y = 4
const BORDER_W = 0.5
const MEASURE_SLACK = 0.98
const FILL = { group: '#e4e4e4', subgroup: '#f4f4f4', sub: '#f4f4f4', total: '#ececec', grand: '#d6d6d6', head: '#f0f0f0' }

const colW = (pct: number) => BODY_W * pct / 100
const availW = (pct: number) => (colW(pct) - 2 * CELL_PAD_X) * MEASURE_SLACK
const rowH = (lines: number) => lines * LINE_H + 2 * CELL_PAD_Y

// ─── แถวที่ตัดบรรทัดแล้ว + แบ่งหน้า ───────────────────────────────────────────
type Line =
  | { kind: 'group' | 'subgroup'; raw: string; text: string[]; h: number }
  | { kind: 'item'; cells: string[][]; h: number }
  | { kind: 'total'; level: 'sub' | 'group' | 'grand'; label: string[]; cells: string[]; h: number }

const headLine = (kind: 'group' | 'subgroup', raw: string): Line => {
  const text = wrap(raw, availW(100), FONT, kind === 'group')
  return { kind, raw, text, h: rowH(text.length) }
}

const toLines = (rows: Row[], columns: Column[], labelSpan: number): Line[] => {
  const labelPct = columns.slice(0, labelSpan).reduce((a, c) => a + c.w, 0)
  return rows.map((r): Line => {
    if (r.kind === 'group' || r.kind === 'subgroup') return headLine(r.kind, r.text)
    if (r.kind === 'item') {
      const cells = r.cells.map((s, i) => wrap(s, availW(columns[i].w), FONT, false))
      return { kind: 'item', cells, h: rowH(Math.max(...cells.map(c => c.length))) }
    }
    const label = wrap(r.label, availW(labelPct), FONT, true)
    return { kind: 'total', level: r.level, label, cells: r.cells, h: rowH(label.length) }
  })
}

const paginate = (lines: Line[], firstBudget: number, budget: number): Line[][] => {
  const pages: Line[][] = []
  let page: Line[] = []
  let used = 0
  let room = firstBudget
  let group: Extract<Line, { kind: 'group' | 'subgroup' }> | null = null
  let sub: Extract<Line, { kind: 'group' | 'subgroup' }> | null = null

  lines.forEach((l, i) => {
    // หัวกลุ่มต้องไปพร้อมแถวแรกของกลุ่ม ไม่ค้างอยู่ท้ายหน้าตัวเดียว
    let need = l.h
    if (l.kind === 'group' || l.kind === 'subgroup') {
      let j = i + 1
      while (j < lines.length && lines[j].kind === 'subgroup') need += lines[j++].h
      if (j < lines.length) need += lines[j].h
    }
    if (page.length && used + need > room) {
      pages.push(page)
      page = []
      used = 0
      room = budget
      // ยังอยู่ในกลุ่มเดิม — ทวนชื่อไว้หัวหน้าใหม่ คนเปิดหน้ากลางเล่มจะรู้ว่าเป็นของกลุ่มไหน
      const isGrand = l.kind === 'total' && l.level === 'grand'
      if (group && l.kind !== 'group' && !isGrand) {
        const again = headLine('group', `${group.raw} (ต่อ)`)
        page.push(again)
        used += again.h
        if (sub && l.kind !== 'subgroup') {
          const againSub = headLine('subgroup', `${sub.raw} (ต่อ)`)
          page.push(againSub)
          used += againSub.h
        }
      }
    }
    if (l.kind === 'group') { group = l; sub = null }
    if (l.kind === 'subgroup') sub = l
    page.push(l)
    used += l.h
    if (l.kind === 'total') { sub = null; if (l.level !== 'sub') group = null }
  })
  if (page.length || !pages.length) pages.push(page)
  return pages
}

// ─── วาดลง PDF ────────────────────────────────────────────────────────────────
const PAGES_PER_SLICE = 10
const breathe = () => new Promise<void>(resolve => setTimeout(resolve, 0))

export const LEAVE_REPORT_TITLE: Record<LeaveReportMode, string> = {
  person: 'รายงานสรุปการลารายบุคคล แยกตามกลุ่มงาน/หน่วยงาน',
  unit: 'รายงานสรุปการลารายกลุ่มงาน/หน่วยงาน',
}

/** สร้าง PDF ทั้งเล่ม คืนเป็นไบต์ของไฟล์ — คืน null ถ้า isCancelled() บอกให้หยุดระหว่างทาง */
export async function renderLeaveReportPdf(
  input: LeaveReportInput,
  fonts: PdfFonts,
  isCancelled?: () => boolean,
): Promise<Uint8Array[] | null> {
  const { columns, labelSpan } = buildColumns(input.mode, input.bucketLabels)
  const rows = buildLeaveReportRows(input.mode, input.people, input.bucketLabels.length)
  const heads = columns.map(c => wrap(c.title, availW(c.w), FONT, true))
  const thH = Math.max(...heads.map(h => h.length)) * LINE_H + 2 * TH_PAD_Y
  const notes = wrap(input.noteText, BODY_W, FONT, false)
  const titleH = 2 * (HEAD_FONT * LINE_EM + 2) + (HEAD_FONT * LINE_EM + 2) + notes.length * LINE_H + 8
  const budget = PAGE_H - PAD_TOP - PAD_BOTTOM - thH
  const pages = paginate(toLines(rows, columns, labelSpan), budget - titleH, budget)
  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })
  const title = LEAVE_REPORT_TITLE[input.mode]

  const doc = new PDFDocument({
    autoFirstPage: false,
    compress: true,
    displayTitle: true,
    lang: 'th-TH',
    info: { Title: `${title} ${input.periodText}`, Creator: 'PYHOS-EXP', Producer: 'PYHOS-EXP' },
  })
  const chunks: Uint8Array[] = []
  doc.on('data', (c: Uint8Array) => chunks.push(c instanceof Uint8Array ? c : new Uint8Array(c)))
  const finished = new Promise<void>((resolve, reject) => {
    doc.on('end', () => resolve())
    doc.on('error', reject)
  })
  doc.registerFont('R', fonts.regular)
  doc.registerFont('B', fonts.bold)

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

  const colX = columns.reduce<number[]>((xs, c, i) => [...xs, i === 0 ? PAD_X : xs[i - 1] + colW(columns[i - 1].w)], [])
  const frame = (y: number, h: number, splits: number[]) => {
    doc.rect(PAD_X, y, BODY_W, h)
    for (const x of splits) doc.moveTo(x, y).lineTo(x, y + h)
    doc.stroke()
  }
  const fillRow = (y: number, h: number, color: string) => {
    doc.rect(PAD_X, y, BODY_W, h).fill(color)
    doc.fillColor('#000')
  }
  const allSplits = colX.slice(1)
  const totalSplits = colX.slice(labelSpan)
  const labelW = colX[labelSpan] - PAD_X

  const drawHeader = (y: number) => {
    fillRow(y, thH, FILL.head)
    frame(y, thH, allSplits)
    heads.forEach((lines, i) => {
      const top = y + (thH - lines.length * LINE_H) / 2
      lines.forEach((s, li) => putAligned(s, colX[i], colW(columns[i].w), top + li * LINE_H, 'center', true))
    })
    return y + thH
  }

  const drawLine = (l: Line, y: number) => {
    const ty = y + CELL_PAD_Y
    switch (l.kind) {
      case 'item':
        frame(y, l.h, allSplits)
        l.cells.forEach((lines, i) => lines.forEach((s, li) =>
          putAligned(s, colX[i], colW(columns[i].w), ty + li * LINE_H, columns[i].align, false)))
        break
      case 'group':
      case 'subgroup':
        fillRow(y, l.h, l.kind === 'group' ? FILL.group : FILL.subgroup)
        frame(y, l.h, [])
        l.text.forEach((s, li) => put(s, PAD_X + CELL_PAD_X, ty + li * LINE_H, l.kind === 'group', FONT))
        break
      case 'total':
        fillRow(y, l.h, l.level === 'grand' ? FILL.grand : l.level === 'group' ? FILL.total : FILL.sub)
        frame(y, l.h, totalSplits)
        l.label.forEach((s, li) => putAligned(s, PAD_X, labelW, ty + li * LINE_H, 'right', true))
        l.cells.forEach((s, i) => {
          const c = labelSpan + i
          putAligned(s, colX[c], colW(columns[c].w), ty, columns[c].align, true)
        })
        break
    }
  }

  const drawTitle = (top: number) => {
    let y = top
    const center = (str: string, yy: number, size: number, bold: boolean) =>
      put(str, PAD_X + (BODY_W - textW(str, size, bold)) / 2, yy, bold, size)
    center(input.orgName, y, HEAD_FONT, true)
    y += HEAD_FONT * LINE_EM + 2
    center(title, y, HEAD_FONT, true)
    y += HEAD_FONT * LINE_EM + 2
    center(input.periodText, y, HEAD_FONT, true)
    y += HEAD_FONT * LINE_EM + 2
    doc.fillColor('#333')
    for (const s of notes) { center(s, y, FONT, false); y += LINE_H }
    doc.fillColor('#000')
    return top + titleH
  }

  const drawFooter = (n: number, total: number) => {
    const y = PAGE_H - 0.5 * CM - FOOT_FONT * LINE_EM
    doc.fillColor('#555')
    put(`ผู้พิมพ์ : ${input.preparedBy || '-'} · พิมพ์เมื่อ ${printedAt}`, PAD_X, y, false, FOOT_FONT)
    const pageNo = `หน้า ${n} / ${total}`
    put(pageNo, PAGE_W - PAD_X - textW(pageNo, FOOT_FONT, false), y, false, FOOT_FONT)
    doc.fillColor('#000')
  }

  for (let pi = 0; pi < pages.length; pi++) {
    doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 })
    doc.lineWidth(BORDER_W).strokeColor('#000').fillColor('#000')
    curFont = ''
    let y = PAD_TOP
    if (pi === 0) y = drawTitle(y)
    y = drawHeader(y)
    for (const l of pages[pi]) { drawLine(l, y); y += l.h }
    drawFooter(pi + 1, pages.length)
    if ((pi + 1) % PAGES_PER_SLICE === 0) {
      await breathe()
      if (isCancelled?.()) return null
    }
  }
  doc.end()
  await finished
  return chunks
}
