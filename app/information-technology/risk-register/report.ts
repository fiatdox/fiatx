// รายงานทะเบียนความเสี่ยง (Excel) ตามแบบฟอร์มคณะกรรมการพิจารณาความเสี่ยง
//   แผ่น "ทะเบียน <รอบ>" ต่อ 1 รอบ (ปีงบประมาณละ 2 ครั้ง): หัวทะเบียน + ผลประเมินเฉลี่ย + เกณฑ์ระดับ + ตาราง PART 1/2/3 + ช่องลงนาม (เลือกได้)
//   แผ่น "สรุปผล": เทียบรายรอบ + Risk Matrix ก่อนจัดการ/คงเหลือ + จำแนกตามการตอบสนองและกลุ่มความเสี่ยง
//   แผ่น "วิกฤติ-สูง": รายการคะแนน ≥ 9.5 ของทุกรอบที่เลือก
import dayjs from 'dayjs'
import { XSheet, buildXlsx, type XStyle } from '@/app/lib/styledXlsx'
import { AREAS, CATEGORY_LABEL, CIA, LEVELS, TREATMENT_LABEL, avg, isOverdue, levelLabel, levelOf, periodEnd, periodLabel, periodShort, thShort, type Category, type Item, type Level, type Register, type Treatment } from './rrShared'

export interface ReportOptions {
  status: 'all' | 'open' | 'closed'
  levels: Level[]          // ว่าง = ทุกระดับ
  categories: Category[]   // ว่าง = ทุกกลุ่ม
  registers: boolean; summary: boolean; signature: boolean
}

export const filterItems = (items: Item[], o: Pick<ReportOptions, 'status' | 'levels' | 'categories'>) => items.filter(i =>
  (o.status === 'all' || i.status === o.status) && (!o.levels.length || o.levels.includes(levelOf(i.score))) && (!o.categories.length || o.categories.includes(i.category)))

export const filterNote = (o: Pick<ReportOptions, 'status' | 'levels' | 'categories'>) => [
  o.status !== 'all' && `เฉพาะสถานะ ${o.status === 'open' ? 'Open' : 'Closed'}`,
  o.levels.length && o.levels.length < LEVELS.length && `ระดับ ${LEVELS.filter(l => o.levels.includes(l.key)).map(l => l.label).join(', ')}`,
  o.categories.length && `กลุ่ม ${o.categories.map(c => CATEGORY_LABEL[c]).join(', ')}`,
].filter(Boolean).join(' · ')

// สีสำหรับพิมพ์ (โทนมาตรฐานของ Excel อ่านง่ายทั้งจอและกระดาษ)
const LV_FILL: Record<Level, string> = { critical: 'C00000', high: 'ED7D31', medium: 'FFD966', low: 'A9D08E' }
const LV_FONT: Record<Level, string> = { critical: 'FFFFFF', high: 'FFFFFF', medium: '000000', low: '000000' }
const PART = [{ dark: '1F4E79', light: 'DDEBF7' }, { dark: '375623', light: 'E2EFDA' }, { dark: '833C0B', light: 'FCE4D6' }]
const GRAY = 'F2F2F2'
const lvStyle = (score: number | null, s: XStyle): XStyle => score == null ? s : { ...s, b: true, fill: LV_FILL[levelOf(score)], color: LV_FONT[levelOf(score)] }
// วันอ้างอิงเรื่อง "เลยกำหนด": รอบที่ผ่านมาแล้วดู ณ วันสิ้นรอบ (31 มี.ค. / 30 ก.ย.), รอบปัจจุบันดู ณ วันนี้
const asOf = (period: string) => { const end = periodEnd(period), today = dayjs().format('YYYY-MM-DD'); return end < today ? end : today }
const N = 34

const registerSheet = (reg: Register, items: Item[], o: ReportOptions, note: string, printed: string) => {
  const sh = new XSheet(`ทะเบียน ${periodShort(reg.period)}`)
  sh.paper = 'A3'; sh.gridLines = false; sh.footer = `ทะเบียนความเสี่ยง ${periodLabel(reg.period)} · พิมพ์ ${printed}`
  sh.cols = [11, 13, 22, 20, 26, 26, ...Array(9).fill(3.6), 8, 8, 10, 20, 14, 28, 10, 11, ...Array(6).fill(3.6), 8, 8, 11, 8, 26]
  const B: XStyle = { border: 'thin', v: 'center', wrap: true }
  const label: XStyle = { ...B, b: true, fill: GRAY }
  // ── หัวทะเบียน ──
  sh.merge(0, 0, 0, N - 1, 'ทะเบียนความเสี่ยง (Risk Register) ของบริการที่สำคัญของหน่วยงาน', { b: true, sz: 16, h: 'center', v: 'center' }).height(0, 28)
  sh.merge(1, 0, 1, N - 1, `Risk Register of Critical Services · ${periodLabel(reg.period)}${note ? ` · (${note})` : ''}`, { sz: 11, color: '404040', h: 'center' })
  const info: [string, string][] = [
    ['ผู้บันทึก', [reg.recorder_name, reg.recorder_role].filter(Boolean).join(' , ')],
    ['รอบการประเมิน', periodLabel(reg.period)],
    ['วันที่ประชุมความเสี่ยงพร้อมบันทึก', reg.meeting_date ? thShort(reg.meeting_date) : ''],
    ['สถานที่', reg.location ?? ''],
    ['ที่อยู่', reg.address ?? ''],
    ['ระบบบริการที่สำคัญ', reg.critical_service ?? ''],
  ]
  info.forEach(([k, v], n) => { sh.merge(3 + n, 0, 3 + n, 1, k, label); sh.merge(3 + n, 2, 3 + n, 5, v, B); sh.height(3 + n, 22) })
  sh.height(5, 30).height(7, 30)
  const avgScore = avg(items.map(i => i.score)), avgRes = avg(items.filter(i => i.residual_score != null).map(i => i.residual_score!))
  const big: XStyle = { ...B, h: 'center', b: true }
  sh.merge(3, 7, 3, 18, 'ผลการประเมินความเสี่ยง (เฉลี่ย) โดยรวมของทะเบียนความเสี่ยง', { ...label, h: 'center' })
  sh.merge(4, 7, 6, 13, avgScore ?? '-', lvStyle(avgScore, { ...big, sz: 24, fmt: '0.0' }))
  sh.merge(4, 14, 6, 18, avgScore == null ? '' : `ความเสี่ยง${levelLabel(avgScore)}`, lvStyle(avgScore, { ...big, sz: 14 }))
  sh.merge(7, 7, 7, 18, `ความเสี่ยงคงเหลือเฉลี่ย ${avgRes ?? '-'}${avgRes == null ? '' : ` (${levelLabel(avgRes)})`}`, { ...B, h: 'center' })
  sh.merge(8, 7, 8, 18, `จำนวน ${items.length} รายการ · Open ${items.filter(i => i.status === 'open').length} · Closed ${items.filter(i => i.status === 'closed').length}`, { ...B, h: 'center' })
  sh.merge(3, 19, 3, N - 1, 'เกณฑ์ระดับความเสี่ยง (Average Risk Score)', { ...label, h: 'center' })
  LEVELS.forEach((l, n) => {
    sh.set(4 + n, 19, l.range, { ...B, h: 'center', b: true, fill: LV_FILL[l.key], color: LV_FONT[l.key] })
    sh.merge(4 + n, 20, 4 + n, N - 1, `เป็นความเสี่ยง${l.key === 'critical' ? 'ขั้น' : ''}${l.label} ${l.desc}`, B)
  })
  sh.merge(8, 19, 8, N - 1, `C I A = ${CIA.map(c => c.label).join(', ')}  ·  ${AREAS.map(a => a.label).join(', ')}`, { sz: 8, color: '595959', v: 'center', wrap: true })
  sh.height(8, 24)

  // ── หัวตาราง PART 1/2/3 ──
  const partOf = (c: number) => c <= 18 ? 0 : c <= 31 ? 1 : 2
  const H = 10
  sh.merge(H, 0, H, 18, 'PART 1 : Risk Assessment , Record and 1st Evaluation', { b: true, sz: 11, color: 'FFFFFF', fill: PART[0].dark, border: 'thin', h: 'center', v: 'center' })
  sh.merge(H, 19, H, 31, 'PART 2 : Risk Treatment Plan and expected assessment with risk residual by Risk Team', { b: true, sz: 11, color: 'FFFFFF', fill: PART[1].dark, border: 'thin', h: 'center', v: 'center' })
  sh.merge(H, 32, H, 33, 'PART 3 : Follow Up', { b: true, sz: 11, color: 'FFFFFF', fill: PART[2].dark, border: 'thin', h: 'center', v: 'center' })
  const hs = (c: number): XStyle => ({ b: true, sz: 9, fill: PART[partOf(c)].light, border: 'thin', h: 'center', v: 'center', wrap: true })
  const single: [number, string][] = [[0, 'วันที่ระบุความเสี่ยง'], [1, 'กลุ่มความเสี่ยง (Risk Category)'], [2, 'หมวดหมู่ทรัพย์สิน (Asset Group) / ระบบงาน (System)'], [5, 'มาตรการควบคุมในปัจจุบัน'],
    [15, 'โอกาสเกิด (Likelihood) A'], [16, 'ความรุนแรง (Impact) B'], [17, 'ระดับความเสี่ยง (Risk Level) C = A×B'], [18, 'เจ้าของความเสี่ยง (Risk Owner)'],
    [19, 'ตัวเลือกการตอบสนอง (Risk Treatment)'], [20, 'แผนจัดการความเสี่ยง (Risk Treatment Plan)'], [21, 'สถานะความคืบหน้า (Progress Status)'], [22, 'คาดว่าดำเนินการแล้วเสร็จ'],
    [32, 'สถานะ (Status)'], [33, 'สถานะความคืบหน้า (Progress Status)']]
  single.forEach(([c, t]) => sh.merge(H + 1, c, H + 2, c, t, hs(c)))
  const groups: [number, number, string][] = [[3, 4, 'คำอธิบายของความเสี่ยงที่พบเจอ (Risk Description)'], [6, 8, 'กระทบต่อ'], [9, 14, 'ความรุนแรงแต่ละด้าน'], [23, 31, 'ความเสี่ยงที่คงเหลืออยู่ (Risk Residual)']]
  groups.forEach(([a, b, t]) => sh.merge(H + 1, a, H + 1, b, t, hs(a)))
  const subs: [number, string][] = [[3, 'ภัยคุกคาม (Threat)'], [4, 'ช่องโหว่ (Vulnerability)'], ...CIA.map((x, k) => [6 + k, x.key] as [number, string]),
    ...AREAS.map((x, k) => [9 + k, x.key] as [number, string]), ...AREAS.map((x, k) => [23 + k, x.key] as [number, string]), [29, 'โอกาสเกิด (Likelihood)'], [30, 'ความรุนแรง (Impact)'], [31, 'ระดับความเสี่ยงคงเหลือ (Risk Residual Level)']]
  subs.forEach(([c, t]) => sh.set(H + 2, c, t, hs(c)))
  sh.height(H, 22).height(H + 1, 40).height(H + 2, 62)
  sh.freeze = { row: H + 3, col: 3 }; sh.printTitleRows = [H, H + 2]

  // ── รายการ ──
  const D: XStyle = { border: 'thin', v: 'top', wrap: true, sz: 9 }, C: XStyle = { ...D, h: 'center' }
  const x = (on: boolean) => on ? 'x' : '-'
  const ref = asOf(reg.period)
  let r = H + 3
  if (!items.length) { sh.merge(r, 0, r, N - 1, 'ไม่มีรายการความเสี่ยง', { ...C, color: '7F7F7F' }); r++ }
  for (const i of items) {
    const cells: [string | number | null, XStyle][] = [
      [thShort(i.identified_date), C], [CATEGORY_LABEL[i.category], D],
      [i.bia_service_name && i.bia_service_name !== i.asset_group ? `${i.asset_group}\n(BIA: ${i.bia_service_name})` : i.asset_group, D],
      [i.threat, D], [i.vulnerability ?? '', D], [i.controls ?? '', D],
      ...CIA.map(c => [x(i.cia.includes(c.key)), C] as [string, XStyle]),
      ...AREAS.map(a => [x(i.impact_areas.includes(a.key)), C] as [string, XStyle]),
      [i.likelihood, C], [i.impact, C], [i.score, lvStyle(i.score, C)], [i.owner ?? '', D],
      [TREATMENT_LABEL[i.treatment], D], [i.treatment_plan ?? '', D], [`${i.progress_pct}%`, C],
      [i.due_date ? thShort(i.due_date) : '-', isOverdue(i, ref) ? { ...C, b: true, color: 'C00000' } : C],
      ...AREAS.map(a => [x(i.residual_areas.includes(a.key)), C] as [string, XStyle]),
      [i.residual_likelihood ?? '-', C], [i.residual_impact ?? '-', C], [i.residual_score ?? '-', lvStyle(i.residual_score, C)],
      [i.status === 'open' ? 'Open' : 'Closed', { ...C, b: true, fill: i.status === 'open' ? 'DDEBF7' : 'EDEDED' }], [i.follow_up ?? '', D],
    ]
    cells.forEach(([v, s], c) => sh.set(r, c, v, s))
    r++
  }
  // แถวสรุปท้ายตาราง
  const sum: XStyle = { b: true, border: 'thin', fill: GRAY, h: 'right', v: 'center' }
  sh.merge(r, 0, r, 16, 'ผลการประเมินความเสี่ยง (เฉลี่ย) โดยรวมของทะเบียนความเสี่ยง', sum)
  sh.set(r, 17, avgScore ?? '-', lvStyle(avgScore, { ...sum, h: 'center', fmt: '0.0' }))
  sh.merge(r, 18, r, 30, 'ความเสี่ยงคงเหลือ (เฉลี่ย)', sum)
  sh.set(r, 31, avgRes ?? '-', lvStyle(avgRes, { ...sum, h: 'center', fmt: '0.0' }))
  sh.merge(r, 32, r, 33, '', sum)
  sh.height(r, 22); r++
  if (reg.notes) { r++; sh.merge(r, 0, r, N - 1, `หมายเหตุ : ${reg.notes}`, { wrap: true, v: 'top' }); sh.height(r, 30); r++ }
  // ช่องลงนาม
  if (o.signature) {
    r += 2
    const signers: [number, number, string, string, string][] = [
      [0, 3, 'ผู้บันทึก', reg.recorder_name ?? '', reg.recorder_role ?? ''],
      [15, 20, 'ผู้ทบทวน', '', ''],
      [26, 33, 'ผู้อนุมัติ', '', 'ประธานคณะกรรมการพิจารณาความเสี่ยง'],
    ]
    const cs: XStyle = { h: 'center', v: 'center' }
    for (const [a, b, role, name, pos] of signers) {
      sh.merge(r, a, r, b, `ลงชื่อ ......................................................... ${role}`, cs)
      sh.merge(r + 1, a, r + 1, b, `( ${name || '.........................................................'} )`, cs)
      sh.merge(r + 2, a, r + 2, b, `ตำแหน่ง ${pos || '.........................................................'}`, cs)
      sh.merge(r + 3, a, r + 3, b, 'วันที่ ........ / ........ / ........', cs)
    }
    for (let k = 0; k < 4; k++) sh.height(r + k, 20)
  }
  return sh
}

const summarySheet = (data: { reg: Register; items: Item[] }[], note: string, printed: string) => {
  const sh = new XSheet('สรุปผล')
  sh.gridLines = false; sh.footer = `สรุปผลทะเบียนความเสี่ยง · พิมพ์ ${printed}`
  sh.cols = [16, 10, 10, 10, 10, 10, 10, 16, 10, 10, 10, 10, 10, 10]   // 2 Risk Matrix วางคู่กัน (คอลัมน์ 0–5 และ 7–12)
  const W = sh.cols.length
  const first = data[0].reg.period, last = data[data.length - 1].reg.period
  sh.merge(0, 0, 0, W - 1, 'สรุปผลทะเบียนความเสี่ยง (Risk Register Summary)', { b: true, sz: 16, h: 'center', v: 'center' }).height(0, 28)
  sh.merge(1, 0, 1, W - 1, `${first === last ? periodLabel(first) : `ช่วง ${periodShort(first)} – ${periodShort(last)} (${data.length} รอบ)`}${note ? ` · ${note}` : ''}`, { sz: 11, color: '404040', h: 'center' })
  const th: XStyle = { b: true, sz: 9, fill: PART[0].light, border: 'thin', h: 'center', v: 'center', wrap: true }
  const td: XStyle = { border: 'thin', h: 'center', v: 'center' }
  const sec = (r: number, t: string) => sh.merge(r, 0, r, W - 1, t, { b: true, sz: 12, color: PART[0].dark })

  // 1) เทียบรายรอบ
  let r = 3
  sec(r, '1. ผลการประเมินแต่ละรอบ'); r++
  const heads = ['รอบการประเมิน', 'รายการ', 'Open', 'Closed', ...LEVELS.map(l => l.label), 'คะแนนเฉลี่ย', 'ระดับ', 'คงเหลือเฉลี่ย', 'ระดับคงเหลือ', 'ความคืบหน้าเฉลี่ย (%)', 'เลยกำหนด']
  heads.forEach((h, c) => sh.set(r, c, h, c >= 4 && c <= 7 ? { ...th, fill: LV_FILL[LEVELS[c - 4].key], color: LV_FONT[LEVELS[c - 4].key] } : th))
  sh.height(r, 32); r++
  const rowOf = (label: string, items: Item[], overdue: number, bold = false) => {
    const a = avg(items.map(i => i.score)), ar = avg(items.filter(i => i.residual_score != null).map(i => i.residual_score!))
    const s: XStyle = bold ? { ...td, b: true, fill: GRAY } : td
    const vals: [string | number, XStyle][] = [
      [label, { ...s, h: 'left' }], [items.length, s], [items.filter(i => i.status === 'open').length, s], [items.filter(i => i.status === 'closed').length, s],
      ...LEVELS.map(l => [items.filter(i => levelOf(i.score) === l.key).length, s] as [number, XStyle]),
      [a ?? '-', { ...s, fmt: '0.0' }], [levelLabel(a) || '-', lvStyle(a, s)], [ar ?? '-', { ...s, fmt: '0.0' }], [levelLabel(ar) || '-', lvStyle(ar, s)],
      [avg(items.map(i => i.progress_pct)) ?? '-', { ...s, fmt: '0.0' }], [overdue, overdue ? { ...s, b: true, color: 'C00000' } : s],
    ]
    vals.forEach(([v, st], c) => sh.set(r, c, v, st)); r++
  }
  for (const d of data) rowOf(periodShort(d.reg.period), d.items, d.items.filter(i => isOverdue(i, asOf(d.reg.period))).length)
  if (data.length > 1) { const all = data.flatMap(d => d.items); rowOf('รวมทุกรอบ', all, data.reduce((n, d) => n + d.items.filter(i => isOverdue(i, asOf(d.reg.period))).length, 0), true) }

  // 2) Risk Matrix ของรอบล่าสุด
  const lastD = data[data.length - 1]
  r += 1; sec(r, `2. Risk Matrix — ${periodShort(lastD.reg.period)} (จำนวนรายการในแต่ละช่อง)`); r++
  const matrix = (c0: number, title: string, pick: (i: Item) => [number | null, number | null]) => {
    sh.merge(r, c0, r, c0 + 5, title, { b: true, h: 'center', fill: GRAY, border: 'thin' })
    const counts = new Map<string, number>()
    for (const i of lastD.items) { const [l, m] = pick(i); if (l && m) counts.set(`${l}-${m}`, (counts.get(`${l}-${m}`) ?? 0) + 1) }
    for (let l = 5; l >= 1; l--) {
      const rr = r + 1 + (5 - l)
      sh.set(rr, c0, `โอกาสเกิด ${l}`, { ...td, b: true, fill: GRAY, sz: 9 })
      for (let m = 1; m <= 5; m++) {
        const n = counts.get(`${l}-${m}`) ?? 0, lv = levelOf(l * m)
        sh.set(rr, c0 + m, n || '', { ...td, b: true, sz: 12, fill: LV_FILL[lv], color: LV_FONT[lv] })
      }
    }
    sh.set(r + 6, c0, '', { ...td, fill: GRAY })
    for (let m = 1; m <= 5; m++) sh.set(r + 6, c0 + m, `ความรุนแรง ${m}`, { ...td, b: true, fill: GRAY, sz: 8, wrap: true })
  }
  matrix(0, 'ก่อนจัดการ (Inherent)', i => [i.likelihood, i.impact])
  matrix(7, 'ความเสี่ยงคงเหลือ (Residual)', i => [i.residual_likelihood, i.residual_impact])
  for (let k = 1; k <= 5; k++) sh.height(r + k, 26)
  sh.height(r + 6, 26)
  r += 8

  // 3) จำแนกตามการตอบสนอง / กลุ่มความเสี่ยง (รอบล่าสุด)
  sec(r, `3. จำแนกรายการ — ${periodShort(lastD.reg.period)}`); r++
  sh.merge(r, 0, r, 3, 'ตัวเลือกการตอบสนอง (Risk Treatment)', th); sh.merge(r, 4, r, 5, 'รายการ', th)
  sh.merge(r, 7, r, 11, 'กลุ่มความเสี่ยง (Risk Category)', th); sh.merge(r, 12, r, 13, 'รายการ', th)
  const tr = Object.keys(TREATMENT_LABEL) as Treatment[], ca = Object.keys(CATEGORY_LABEL) as Category[]
  for (let k = 0; k < Math.max(tr.length, ca.length); k++) {
    const rr = r + 1 + k
    if (tr[k]) { sh.merge(rr, 0, rr, 3, TREATMENT_LABEL[tr[k]], { ...td, h: 'left' }); sh.merge(rr, 4, rr, 5, lastD.items.filter(i => i.treatment === tr[k]).length, td) }
    if (ca[k]) { sh.merge(rr, 7, rr, 11, CATEGORY_LABEL[ca[k]], { ...td, h: 'left' }); sh.merge(rr, 12, rr, 13, lastD.items.filter(i => i.category === ca[k]).length, td) }
  }
  return sh
}

const topSheet = (data: { reg: Register; items: Item[] }[], printed: string) => {
  const sh = new XSheet('วิกฤติ-สูง')
  sh.gridLines = false; sh.footer = `รายการความเสี่ยงระดับวิกฤติและสูง · พิมพ์ ${printed}`
  const heads = ['รอบ', 'หมวดหมู่ทรัพย์สิน / ระบบงาน', 'ภัยคุกคาม', 'ช่องโหว่', 'A', 'B', 'C', 'ระดับ', 'เจ้าของความเสี่ยง', 'การตอบสนอง', 'แผนจัดการความเสี่ยง', 'ความคืบหน้า', 'คาดว่าเสร็จ', 'คงเหลือ', 'สถานะ', 'การติดตาม']
  sh.cols = [14, 22, 20, 24, 5, 5, 6, 9, 20, 14, 28, 9, 11, 9, 8, 24]
  sh.merge(0, 0, 0, heads.length - 1, 'รายการความเสี่ยงระดับวิกฤติและสูง (คะแนน ≥ 9.5)', { b: true, sz: 14, h: 'center', v: 'center' }).height(0, 26)
  const th: XStyle = { b: true, sz: 9, fill: PART[0].light, border: 'thin', h: 'center', v: 'center', wrap: true }
  heads.forEach((h, c) => sh.set(2, c, h, th)); sh.height(2, 30)
  sh.freeze = { row: 3, col: 0 }; sh.printTitleRows = [2, 2]
  const D: XStyle = { border: 'thin', v: 'top', wrap: true, sz: 9 }, C: XStyle = { ...D, h: 'center' }
  let r = 3
  for (const d of data) {
    const ref = asOf(d.reg.period)
    for (const i of [...d.items].filter(i => i.score >= 9.5).sort((a, b) => b.score - a.score)) {
      const vals: [string | number, XStyle][] = [
        [periodShort(d.reg.period), C], [i.asset_group, D], [i.threat, D], [i.vulnerability ?? '', D], [i.likelihood, C], [i.impact, C],
        [i.score, lvStyle(i.score, C)], [levelLabel(i.score), lvStyle(i.score, C)], [i.owner ?? '', D], [TREATMENT_LABEL[i.treatment], D], [i.treatment_plan ?? '', D],
        [`${i.progress_pct}%`, C], [i.due_date ? thShort(i.due_date) : '-', isOverdue(i, ref) ? { ...C, b: true, color: 'C00000' } : C],
        [i.residual_score ?? '-', lvStyle(i.residual_score, C)], [i.status === 'open' ? 'Open' : 'Closed', C], [i.follow_up ?? '', D],
      ]
      vals.forEach(([v, s], c) => sh.set(r, c, v, s)); r++
    }
  }
  if (r === 3) sh.merge(3, 0, 3, heads.length - 1, 'ไม่มีรายการระดับวิกฤติหรือสูง', { ...C, color: '7F7F7F' })
  return sh
}

// regs: ทะเบียนที่เลือก (เรียงตามรอบเก่า → ใหม่)
export const buildRiskReport = (regs: Register[], o: ReportOptions) => {
  const printed = dayjs().toDate().toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const note = filterNote(o)
  const data = [...regs].sort((a, b) => a.period.localeCompare(b.period)).map(reg => ({ reg, items: filterItems(reg.items, o) }))
  const regSheets = o.registers ? data.map(d => registerSheet(d.reg, d.items, o, note, printed)) : []
  const sumSheets = o.summary ? [summarySheet(data, note, printed), topSheet(data, printed)] : []
  // รอบเดียว: แบบฟอร์มขึ้นก่อน · หลายรอบ: สรุปผลขึ้นก่อน
  const sheets = data.length === 1 ? [...regSheets, ...sumSheets] : [...sumSheets, ...regSheets]
  return buildXlsx(sheets, { font: 'Tahoma', size: 10 })
}

export const reportFilename = (regs: Register[]) => {
  const ps = regs.map(r => r.period).sort()
  return ps.length === 1 ? `ทะเบียนความเสี่ยง-ปีงบ${ps[0].replace('-', '-ครั้งที่')}.xlsx` : `รายงานทะเบียนความเสี่ยง-${ps[0]}_${ps[ps.length - 1]}.xlsx`
}
