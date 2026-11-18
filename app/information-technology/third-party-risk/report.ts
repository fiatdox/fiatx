// รายงาน Excel การประเมินความเสี่ยงของบุคคลภายนอก (3rd Party Risk Assessment) ตามแบบฟอร์ม
//   หัว: ผู้พิจารณา ผู้บันทึก วันที่ประชุม ชื่อบุคคล/องค์กร ระบบบริการที่สำคัญ + ค่าเฉลี่ยก่อน/หลังจัดการ พร้อมเกณฑ์ระดับทั้งสองชุด
//   ตาราง: หมวด → ข้อ · กระทบ C/I/A · ด้าน B/F S R I L O · โอกาส × ความรุนแรง = ระดับ · ค่าเฉลี่ยหมวด · การจัดการ · คงเหลือ · ดำเนินการเพิ่มเติม
import dayjs from 'dayjs'
import { XSheet, buildXlsx, type XStyle } from '@/app/lib/styledXlsx'
import { AREAS, CIA, LEVELS, RESIDUAL_LEVELS, TREATMENT_LABEL, avg2, isOverdue, levelOf, planParts, thDate, type Assessment, type Item, type Level } from './tpShared'

const LV_FILL: Record<Level, string> = { critical: 'C00000', high: 'ED7D31', medium: 'FFD966', low: 'A9D08E' }
const LV_FONT: Record<Level, string> = { critical: 'FFFFFF', high: 'FFFFFF', medium: '000000', low: '000000' }
const BAND = [{ dark: '1F4E79', light: 'DDEBF7' }, { dark: '375623', light: 'E2EFDA' }, { dark: '833C0B', light: 'FCE4D6' }]
const GRAY = 'F2F2F2', CLUSTER = 'D9E1F2'
const lv = (score: number | null, s: XStyle, residual = false): XStyle => score == null ? s : { ...s, b: true, fill: LV_FILL[levelOf(score, residual)], color: LV_FONT[levelOf(score, residual)] }

// คอลัมน์ตามแบบฟอร์ม
const C = { no: 0, risk: 1, threat: 2, vuln: 3, cia: 4, area: 7, l: 13, i: 14, lvl: 15, avg: 16, tr: 17, plan: 18, owner: 19, prog: 20, due: 21,
  rcia: 22, rarea: 25, rl: 31, ri: 32, rlvl: 33, further: 34 }
const N = 35
// Excel คำนวณความสูงแถวภาษาไทยที่ตัดบรรทัดได้ไม่พอ (ตัวท้ายหาย) — ประมาณเองจากความกว้างคอลัมน์
// สระ/วรรณยุกต์บน-ล่างไม่กินที่ · ฟอนต์ 9 pt ได้ราว 1.05 ตัวอักษรต่อหน่วยความกว้าง (เผื่อไว้) · บรรทัดละ ~12.5 pt
const visible = (s: string) => s.replace(/[ัิ-ฺ็-๎]/g, '').length
const linesOf = (text: string, width: number) => text.split('\n').reduce((n, part) => n + Math.max(1, Math.ceil(visible(part) / Math.max(1, width * 1.05 - 1))), 0)
const fitHeight = (cells: [string, number][], min = 16) => Math.max(min, Math.max(...cells.map(([t, w]) => linesOf(t, w))) * 12.5 + 5)

export const buildThirdPartyReport = (a: Assessment) => {
  const printed = dayjs().toDate().toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const today = dayjs().format('YYYY-MM-DD')
  const sh = new XSheet('3rd Party Risk')
  sh.paper = 'A3'; sh.gridLines = false; sh.footer = `การประเมินความเสี่ยงของบุคคลภายนอก · ${a.vendor_name} · พิมพ์ ${printed}`
  sh.cols = [5.5, 34, 24, 24, 3.4, 3.4, 3.4, 3.8, 3.4, 3.4, 3.4, 3.4, 3.4, 8, 8, 9, 10, 13, 44, 14, 9, 10, 3.4, 3.4, 3.4, 3.8, 3.4, 3.4, 3.4, 3.4, 3.4, 8, 8, 10, 18]
  const B: XStyle = { border: 'thin', v: 'center', wrap: true }
  const label: XStyle = { ...B, b: true, fill: GRAY }
  const avgScore = avg2(a.items.map(i => i.score)), avgRes = avg2(a.items.map(i => i.residual_score))
  const assessed = a.items.filter(i => i.score != null).length

  // ── หัวแบบฟอร์ม ──
  sh.merge(0, 0, 0, N - 1, 'การประเมินความเสี่ยงของบุคคลภายนอก (3rd Party Risk Assessment)', { b: true, sz: 16, h: 'center', v: 'center' }).height(0, 28)
  sh.merge(1, 0, 1, N - 1, `${a.vendor_name}${a.service_name ? ` · ${a.service_name}` : ''}`, { sz: 11, color: '404040', h: 'center' })
  const info: [string, string][] = [
    ['ผู้พิจารณาประเมิน', a.reviewer ?? ''],
    ['ผู้บันทึก', [a.recorder_name, a.recorder_role].filter(Boolean).join(', ')],
    ['วันที่ทำการประชุมความเสี่ยงพร้อมบันทึก', thDate(a.meeting_date)],
    ['ชื่อบุคคล/องค์กรภายนอก', a.vendor_name],
    ['ระบบบริการที่สำคัญ', a.service_name ?? ''],
  ]
  info.forEach(([k, v], n) => { sh.merge(3 + n, 0, 3 + n, 1, k, label); sh.merge(3 + n, 2, 3 + n, 3, v, B); sh.height(3 + n, n < 4 ? 30 : 24) })
  const big: XStyle = { ...B, h: 'center', b: true }
  const box = (c1: number, c2: number, title: string, score: number | null, residual: boolean) => {
    const mid = c1 + Math.floor((c2 - c1) / 2)
    sh.merge(3, c1, 3, c2, title, { ...label, h: 'center', sz: 9 })
    sh.merge(4, c1, 6, mid, score == null ? '-' : Math.round(score * 10 + 1e-9) / 10, lv(score, { ...big, sz: 24, fmt: '0.0' }, residual))
    sh.merge(4, mid + 1, 6, c2, score == null ? '' : `ความเสี่ยง${(residual ? RESIDUAL_LEVELS : LEVELS).find(l => l.key === levelOf(score, residual))!.label}`, lv(score, { ...big, sz: 13 }, residual))
  }
  const legend = (cRange: number, cRange2: number, cDesc: number, cDesc2: number, defs: typeof LEVELS) => defs.forEach((d, n) => {
    sh.merge(3 + n, cRange, 3 + n, cRange2, d.range, { ...B, h: 'center', b: true, fill: LV_FILL[d.key], color: LV_FONT[d.key] })
    sh.merge(3 + n, cDesc, 3 + n, cDesc2, d.desc, { ...B, sz: 9 })
  })
  box(4, 16, 'ผลการประเมินความเสี่ยง (เฉลี่ย) โดยรวมของ 3rd party เจ้านี้', avgScore, false)
  legend(C.tr, C.tr, C.plan, C.plan, LEVELS)
  box(19, 30, 'ผลการประเมินความเสี่ยง (เฉลี่ย) โดยรวมของบุคคลภายนอกเจ้านี้ หลังจัดการความเสี่ยง', avgRes, true)
  legend(31, 32, 33, 34, RESIDUAL_LEVELS)
  sh.merge(7, 4, 7, 16, `ประเมินแล้ว ${assessed} / ${a.items.length} ข้อ · โอกาสเกิด 4–5 = ใช่`, { ...B, h: 'center', sz: 9 })

  // ── หัวตาราง ──
  const H = 9
  const th = (band: number): XStyle => ({ b: true, sz: 9, fill: BAND[band].light, border: 'thin', h: 'center', v: 'center', wrap: true })
  sh.merge(H, 0, H, C.avg, 'การประเมินความเสี่ยง (Risk Assessment)', { b: true, color: 'FFFFFF', fill: BAND[0].dark, border: 'thin', h: 'center', v: 'center' })
  sh.merge(H, C.tr, H, C.due, 'การจัดการความเสี่ยง (Risk Treatment)', { b: true, color: 'FFFFFF', fill: BAND[1].dark, border: 'thin', h: 'center', v: 'center' })
  sh.merge(H, C.rcia, H, C.further, 'ความเสี่ยงคงเหลือหลังจัดการ (Risk Residual)', { b: true, color: 'FFFFFF', fill: BAND[2].dark, border: 'thin', h: 'center', v: 'center' })
  const tall = (c: number, text: string, band: number) => sh.merge(H + 1, c, H + 3, c, text, th(band))
  tall(C.no, 'No.', 0); tall(C.risk, 'หมวดหมู่ความเสี่ยง (Risk Cluster)', 0); tall(C.threat, 'ภัยคุกคาม (Threat)', 0); tall(C.vuln, 'ช่องโหว่ (Vulnerability)', 0)
  const ciaHead = (c: number, band: number) => { sh.merge(H + 1, c, H + 2, c + 2, 'กระทบต่อ', th(band)); CIA.forEach((x, k) => sh.set(H + 3, c + k, x.key, th(band))) }
  const areaHead = (c: number, band: number) => { sh.merge(H + 1, c, H + 2, c + 5, 'ความรุนแรงแต่ละด้าน', th(band)); AREAS.forEach((x, k) => sh.set(H + 3, c + k, x.short, th(band))) }
  ciaHead(C.cia, 0); areaHead(C.area, 0)
  sh.merge(H + 1, C.l, H + 1, C.lvl, 'Risk Analysis', th(0))
  sh.merge(H + 2, C.l, H + 3, C.l, 'โอกาสเกิด (Likelihood)', th(0)); sh.merge(H + 2, C.i, H + 3, C.i, 'ความรุนแรง (Impact)', th(0)); sh.merge(H + 2, C.lvl, H + 3, C.lvl, 'ระดับความเสี่ยง (Risk Level)', th(0))
  tall(C.avg, 'ระดับความเสี่ยงโดยเฉลี่ย (Average Risk Level)', 0)
  tall(C.tr, 'ตัวเลือกการตอบสนอง (Risk Treatment)', 1); tall(C.plan, 'การจัดการความเสี่ยง (Risk Treatment - Threat and Vuln.)', 1); tall(C.owner, 'ผู้รับผิดชอบ', 1)
  tall(C.prog, 'สถานะความคืบหน้า (Progress Status)', 1); tall(C.due, 'คาดว่าดำเนินการแล้วเสร็จ (Expected finish date)', 1)
  ciaHead(C.rcia, 2); areaHead(C.rarea, 2)
  tall(C.rl, 'โอกาสเกิด (Likelihood)', 2); tall(C.ri, 'ความรุนแรง (Impact)', 2); tall(C.rlvl, 'ระดับความเสี่ยงที่คงเหลือ (Risk Residual Level)', 2)
  tall(C.further, 'ดำเนินการเพิ่มเติมเพื่อลดความเสี่ยงให้น้อยลงอีก (Further actions)', 2)
  sh.height(H, 20).height(H + 1, 22).height(H + 2, 34).height(H + 3, 22)
  sh.freeze = { row: H + 4, col: 2 }; sh.printTitleRows = [H, H + 3]

  // ── ข้อประเมินตามหมวด ──
  const D: XStyle = { border: 'thin', v: 'top', wrap: true, sz: 9 }, Cc: XStyle = { ...D, h: 'center' }
  const X = (on: boolean) => on ? 'x' : ''
  const clusters = [...new Set(a.items.map(i => i.cluster_no))].sort((x, y) => x - y)
  let r = H + 4
  for (const cn of clusters) {
    const list = a.items.filter(i => i.cluster_no === cn).sort((x, y) => x.sort - y.sort || x.id - y.id)
    const head: XStyle = { ...D, b: true, fill: CLUSTER, v: 'center' }
    for (let c = 0; c < N; c++) sh.set(r, c, '', head)
    sh.set(r, C.no, cn, { ...head, h: 'center' }); sh.set(r, C.risk, list[0].cluster_name, head)
    sh.set(r, C.threat, 'ภัยคุกคาม (Threat)', head); sh.set(r, C.vuln, 'ช่องโหว่ (Vulnerability)', head)
    sh.set(r, C.plan, 'เป็นคำแนะนำให้แก่ผู้ให้บริการ', { ...head, i: true })
    sh.height(r, fitHeight([[list[0].cluster_name, sh.cols[C.risk]]], 18))
    r++
    const first = r, cAvg = avg2(list.map(i => i.score))
    for (const i of list) row(i, r++)
    sh.merge(first, C.avg, r - 1, C.avg, cAvg ?? '-', lv(cAvg, { ...Cc, v: 'center', sz: 11, fmt: '0.00' }))
  }
  function row(i: Item, rr: number) {
    const vals: [number, string | number, XStyle][] = [
      [C.no, i.item_no, Cc], [C.risk, i.risk, D], [C.threat, i.threat ?? '', D], [C.vuln, i.vulnerability ?? '', D],
      ...CIA.map((x, k) => [C.cia + k, X(i.cia.includes(x.key)), Cc] as [number, string, XStyle]),
      ...AREAS.map((x, k) => [C.area + k, X(i.impact_areas.includes(x.key)), Cc] as [number, string, XStyle]),
      [C.l, i.likelihood ?? '', Cc], [C.i, i.impact ?? '', Cc], [C.lvl, i.score ?? '', lv(i.score, Cc)],
      [C.tr, TREATMENT_LABEL[i.treatment], D], [C.plan, planParts(i.treatment_plan).join('\n'), D], [C.owner, i.owner ?? '', D],
      [C.prog, `${i.progress_pct}%`, Cc], [C.due, i.due_date ? thDate(i.due_date) : '', isOverdue(i, today) ? { ...Cc, b: true, color: 'C00000' } : Cc],
      ...CIA.map((x, k) => [C.rcia + k, X(i.residual_cia.includes(x.key)), Cc] as [number, string, XStyle]),
      ...AREAS.map((x, k) => [C.rarea + k, X(i.residual_areas.includes(x.key)), Cc] as [number, string, XStyle]),
      [C.rl, i.residual_likelihood ?? '', Cc], [C.ri, i.residual_impact ?? '', Cc], [C.rlvl, i.residual_score ?? '', lv(i.residual_score, Cc, true)],
      [C.further, i.further_action ?? '', D],
    ]
    for (const [c, v, s] of vals) sh.set(rr, c, v, s)
    sh.height(rr, fitHeight([C.risk, C.threat, C.vuln, C.plan, C.owner, C.further].map(c => [String(vals.find(x => x[0] === c)?.[1] ?? ''), sh.cols[c]])))
  }
  // แถวสรุปท้ายตาราง
  const sum: XStyle = { ...B, b: true, fill: GRAY, h: 'center' }
  sh.merge(r, 0, r, C.i, `ค่าเฉลี่ยโดยรวม (${assessed} ข้อที่ประเมินแล้ว)`, { ...sum, h: 'right' })
  sh.merge(r, C.lvl, r, C.avg, avgScore ?? '-', lv(avgScore, { ...sum, fmt: '0.00' }))
  sh.merge(r, C.tr, r, C.ri, 'ค่าเฉลี่ยความเสี่ยงคงเหลือ', { ...sum, h: 'right' })
  sh.set(r, C.rlvl, avgRes ?? '-', lv(avgRes, { ...sum, fmt: '0.00' }, true)); sh.set(r, C.further, '', sum)
  sh.height(r, 22)
  if (a.notes) { r += 2; sh.merge(r, 0, r, C.vuln, `หมายเหตุ: ${a.notes}`, { wrap: true, v: 'top' }) }
  return buildXlsx([sh], { font: 'Tahoma', size: 10 })
}

export const thirdPartyFilename = (a: Assessment) =>
  `ประเมินความเสี่ยงบุคคลภายนอก-${a.vendor_name.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60)}${a.meeting_date ? `-${a.meeting_date}` : ''}.xlsx`
