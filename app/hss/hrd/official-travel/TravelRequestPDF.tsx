'use client'
// บันทึกข้อความ "ขออนุมัติเดินทางไปราชการและเบิกค่าใช้จ่ายในการเดินทางไปราชการ" — ตามแบบฟอร์มกระดาษของงานพัฒนาทรัพยากรบุคคล
// หน้า ๑ = บันทึกข้อความ (ขอบ บน ๒.๕ ซ้าย ๓ ขวา ๒ ล่าง ๒ ซม.) · หน้า ๒ = บัญชีรายชื่อผู้เดินทางและที่มาของยอดเงิน (แนบท้าย)
// ชิ้นส่วน (ช่องกรอกเส้นประ ช่องติ๊ก ตัดบรรทัดไทย) ตามแบบ components/LeaveFormPDF.tsx
// ตราครุฑ (สูง ๑.๕ ซม. ตามระเบียบงานสารบรรณ): public/assets/docs/jpe4XHmGBReEanQzvr9sZjii.png — ไม่มีไฟล์จะเว้นที่ไว้ (ตัวแสดงตรวจไฟล์ก่อน ส่งมาทาง garudaSrc)
import { Document, Font, Image, Page, Path, PDFViewer, Rect, StyleSheet, Svg, Text, View, pdf } from '@react-pdf/renderer'
import React, { useEffect, useState, type ComponentProps } from 'react'
import { App, Button, Segmented, Spin, Typography } from 'antd'
import { DownloadOutlined, FilePdfOutlined, ShareAltOutlined } from '@ant-design/icons'
import { withBase } from '@/app/lib/basePath'
import { canInlinePdf, canShareFile, saveBlob, shareFile } from '@/app/lib/pdfSupport'
import {
  MEMO, requestBudgetType, memoOrg, bahtText, durationParts, fmtMoney, fmtNum, requestNo, requiredDocs, thaiDate, thaiDateParts, thaiDateShort, thaiDateTime, thaiDigits,
  type Signer, type TravelRequest,
  homeStationText, isNoClaim, tidyName, tripDatesText, mealCut, personAllowance, transportExtras, transportTotal } from './travelCalc'

const { Text: AntText } = Typography

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: withBase('/fonts/Sarabun/Sarabun-Regular.ttf'), fontWeight: 'normal' },
    { src: withBase('/fonts/Sarabun/Sarabun-Bold.ttf'), fontWeight: 'bold' },
  ],
})
Font.registerHyphenationCallback(word => [word])

// react-pdf ตัดสระ/วรรณยุกต์ตัวท้ายของข้อความไทย — เติมช่องว่างไม่ตัดคำต่อท้าย (เหมือน LeaveFormPDF)
const NB = ' '
const pad = (t: string) => (t ? t + NB.repeat(2) : t)
const thSeg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null
const visibleLen = (t: string) => t.replace(/[ัิ-ฺ็-๎]/g, '').length
// คำที่ตัวตัดคำแยกกลางคำ (เช่น รับ|ผิด|ชอบ, โรง|พยาบาล, เอ|ช|ไอ|วี) — รวมกลับเป็นคำเดียว ไม่ให้ขึ้นบรรทัดใหม่กลางคำ
const THAI_GLUE = new Set([
  'รับผิดชอบ', 'ผู้รับผิดชอบ', 'ปฏิบัติการ', 'ปฏิบัติงาน', 'โรงพยาบาล', 'โรงแรม', 'ผู้ป่วย', 'ผู้สูงอายุ', 'ติดเตียง', 'อาสาสมัคร', 'ส่งเสริม', 'สุขภาพ',
  'แลกเปลี่ยน', 'เรียนรู้', 'เอชไอวี', 'ประชุม', 'วิชาการ', 'ศึกษาดูงาน', 'ราชการ', 'ไปราชการ', 'ชี้แจง', 'ชี้แจ้ง', 'แนวทาง', 'ดำเนินการ', 'ดำเนินงาน', 'พัฒนา', 'ศักยภาพ',
])
const thSegments = (t: string): string[] => {
  const segs = [...thSeg!.segment(t)].map(x => x.segment)
  const out: string[] = []
  for (let i = 0; i < segs.length;) {
    let n = 1
    for (let k = Math.min(5, segs.length - i); k >= 2; k--) if (THAI_GLUE.has(segs.slice(i, i + k).join(''))) { n = k; break }
    out.push(segs.slice(i, i + n).join('')); i += n
  }
  return out
}
/** ตัดเป็นบรรทัดตามคำ — first = ความยาวบรรทัดแรก (ย่อหน้าเยื้อง) · maxLines = เกินแล้วตัดทิ้งพร้อม "…" (กันล้นหน้า) */
const splitLines = (t: string, max: number, maxLines = Infinity, first = max): string[] => {
  const lines: string[] = []
  if (!thSeg || visibleLen(t) <= first) lines.push(t)
  else {
    let cur = ''
    for (const segment of thSegments(t)) {
      // ไม่ขึ้นบรรทัดใหม่ด้วยเครื่องหมาย , . ) — ติดท้ายบรรทัดเดิม
      if (cur && !/^[,.)]/.test(segment) && visibleLen(cur + segment) > (lines.length === 0 ? first : max)) {
        // จุดตัดที่ดีกว่าตรงนี้ (ย้อนไม่เกิน ๑๒ ตัวอักษร): ก่อนคำย่อท้ายบรรทัด (อ. ต. จ.) ไม่ให้แยกจากคำที่ตามมา
        // แล้วจึงช่องว่างล่าสุด — ตัวตัดคำอาจแยกคำประสมกลางคำ (รับผิด|ชอบ) ช่องว่างตัดได้แน่นอนกว่า
        const abbr = cur.match(/(?:^|\s)([ก-ฮ]{1,2}\.)$/)
        const sp = cur.lastIndexOf(' ')
        const cut = abbr ? cur.length - abbr[1].length : sp > 0 && visibleLen(cur.slice(sp + 1)) <= 12 ? sp + 1 : cur.length
        const head = cur.slice(0, cut).trim()
        if (head) { lines.push(head); cur = cur.slice(cut) } else { lines.push(cur.trim()); cur = '' }
      }
      cur += segment
    }
    if (cur.trim()) lines.push(cur.trim())
  }
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = kept[maxLines - 1].replace(/.{0,2}$/u, '') + '…'
  return kept
}
/** จำนวนอักษร (ไม่นับสระบน/ล่าง) ต่อบรรทัดเต็มความกว้างหน้า ที่ขนาดตัวอักษรของเอกสารนี้ */
const FULL_LINE = 74
// ข้อความหลายบรรทัดในรายละเอียด (ข้อ ๑ ๒ ๓ ๔): บรรทัดแรกต่อจากหัวข้อ · บรรทัดถัดไปเริ่มตรงตัวอักษรแรกของหัวข้อ (NEXT_LINE ตัวอักษร)
// ความจุเผื่อไว้ — Sarabun กว้างไม่เท่ากันทุกตัว ประมาณเกินจะล้นแล้วขึ้นแถวใหม่ในช่อง
// ความจุคิดที่ขนาดตัวอักษรเนื้อหา (FS_BODY = ขนาด ๑๔) — ตัวเล็กกว่าหัวบันทึก ๑.๑๔ เท่า
const NEXT_LINE = 75
const COMP_FIRST = 44, COMP_NEXT = NEXT_LINE
const SUBJECT_FIRST = 60, LOCATION_FIRST = 61, DATES_FIRST = 54
/** ย่อหน้า "จึงเรียนมา…" เต็มบรรทัดที่ขนาดเนื้อหา */
const BODY_FULL_LINE = 84
const SUBJECT_MAX = 3, LOCATION_MAX = 2, DATES_MAX = 2, COMP_MAX = 4
/**
 * เรียงชื่อเป็นบรรทัด (คั่นด้วย ", ") — ชื่อที่ยังพอใส่ได้ไม่ตัด · ชื่อที่ยาวเกินที่ว่างทั้งบรรทัด ตัดได้เฉพาะที่ช่องว่าง (ระหว่างชื่อกับนามสกุล)
 * คำเดียวยาวเกินบรรทัดจริง ๆ ค่อยตัดตามคำ
 */
const packNames = (names: string[], first: number, next: number): string[] => {
  const lines: string[] = []
  let cur = ''
  const cap = () => (lines.length === 0 ? first : next)
  const flush = () => { if (cur) lines.push(cur); cur = '' }
  names.forEach((n, i) => {
    const item = n + (i < names.length - 1 ? ',' : '')
    if (cur && visibleLen(`${cur} ${item}`) > cap()) flush()
    if (!cur && visibleLen(item) > cap()) {
      for (const w of item.split(/\s+/).filter(Boolean)) {
        if (cur && visibleLen(`${cur} ${w}`) > cap()) flush()
        cur = cur ? `${cur} ${w}` : w
      }
      return
    }
    cur = cur ? `${cur} ${item}` : item
  })
  flush()
  return lines.flatMap((ln, i) => splitLines(ln, next, Infinity, i === 0 ? first : next))
}
/** ผู้ร่วมเดินทางในบันทึกข้อความ: ชื่อ (ตำแหน่งระดับ) · เกิน ๓ คน หรือยาวเกิน ๓ บรรทัด = "ตามบัญชีรายชื่อแนบท้าย" (ต้องพิมพ์บัญชีแนบ) */
const companionLines = (travelers: { name: string; position?: string | null; is_requester: boolean }[]): { lines: string[]; attach: boolean } => {
  const comps = travelers.filter(t => !t.is_requester)
  if (comps.length === 0) return { lines: ['-'], attach: false }
  const lines = comps.length <= 3 ? packNames(comps.map(c => c.position ? `${tidyName(c.name)} (${c.position})` : tidyName(c.name)), COMP_FIRST, COMP_NEXT) : []
  return lines.length && lines.length <= COMP_MAX ? { lines, attach: false } : { lines: ['ตามบัญชีรายชื่อแนบท้าย'], attach: true }
}
// ตัวเลขทั้งเอกสารเป็นเลขไทยตามแบบหนังสือราชการ
const th = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '' : thaiDigits(String(v)))
// Sarabun ไม่มีอักขระ ⇄ (ใช้ในหน้าเว็บ) — ในเอกสารใช้ขีด
const routeTxt = (t: string | null | undefined) => (t ?? '').replace(/\s*⇄\s*/g, ' - ')
const money = (n: number) => (n > 0 ? th(fmtMoney(n)) : '-')

const INK = '#000'
const RULE = '#6b7280'
const LINE_H = 15
const FS = 11.5
// ขนาดตัวอักษรเนื้อหาตั้งแต่ "ด้วยข้าพเจ้า" = ขนาด ๑๔ ของ TH Sarabun (Sarabun 11.5 ≈ TH Sarabun 16 — หัวบันทึกยังใช้ขนาด ๑๖)
const FS_BODY = 14 * FS / 16

const s = StyleSheet.create({
  // หัวครุฑห่างขอบบน ๒.๕ ซม. (ตั้งค่าหน้ากระดาษ) — แถวหัวเรื่องสูงเท่าครุฑ เนื้อหาเริ่มถัดจากครุฑ · ขอบล่าง ๑.๓ ซม. (ท้ายกระดาษมีบรรทัด "พิมพ์เมื่อ" ที่ ๐.๘ ซม.)
  page: { fontFamily: 'Sarabun', fontSize: FS, paddingTop: '2.5cm', paddingBottom: '1.3cm', paddingLeft: '3cm', paddingRight: '2cm', lineHeight: 1.25, color: INK },
  garudaBox: { position: 'absolute', top: '2.5cm', left: '3cm', width: 42, height: 42 },
  // แถวหัวเรื่อง สูงเท่าครุฑ (๑.๕ ซม.) ชื่อเอกสารกึ่งกลางแนวตั้ง ตรงเอวครุฑ — เนื้อหาเริ่มใต้ครุฑเสมอไม่ว่าระดับความแน่น
  titleRow: { height: 42, justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 19, fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2 },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', minHeight: LINE_H },
  fill: { borderBottomWidth: 0.7, borderBottomStyle: 'dotted', borderBottomColor: RULE, marginHorizontal: 2, minHeight: 11 },
  fillText: { textAlign: 'center' },
  head: { fontSize: 13.5, fontWeight: 'bold' },
  headLine: { minHeight: 18 },
  bold: { fontWeight: 'bold' },
  indent: { paddingLeft: '1.25cm' },
  // หัวข้อ ๑–๖ / ทั้งนี้ ชิดขอบซ้ายแนวเดียวกับ "กลุ่มงาน" "รายละเอียดดังนี้"
  item: { paddingLeft: 0 },
  // ข้อย่อย/บรรทัดต่อ เริ่มตรงตัวอักษรแรกของหัวข้อ (หลัง "๑. ") — ระยะ "๑. " ๑๑.๘ pt ที่ขนาดเนื้อหา (วัดจาก PDF จริง ๑๓.๕ pt ที่ Sarabun ๑๑.๕ × ๑๔/๑๖)
  indent2: { paddingLeft: 11.8 },
  check: { flexDirection: 'row', alignItems: 'center', marginLeft: 3, marginRight: 4 },
  money: { width: 78, textAlign: 'right' },
  // ส่วนความเห็น: ซ้าย/ขวามีเส้นคั่น แล้วคำสั่ง ผอ. เต็มแถว
  opinions: { flexDirection: 'row', borderTopWidth: 0.8, borderTopColor: INK, marginTop: 6 },
  opinionBox: { width: '50%', paddingTop: 2, paddingRight: 8 },
  opinionRight: { borderLeftWidth: 0.8, borderLeftColor: INK, paddingLeft: 8, paddingRight: 0 },
  footer: { position: 'absolute', bottom: '0.8cm', left: '3cm', right: '2cm', flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#374151' },
  // หน้าแนบ
  tbl: { borderWidth: 0.8, borderColor: INK, marginTop: 6, fontSize: 10 },   // ตัวเล็กลงให้แถวละ ๒ บรรทัด — ผู้เดินทาง ๑๓ คนยังจบหน้าเดียว
  tr: { flexDirection: 'row', borderTopWidth: 0.8, borderTopColor: INK, minHeight: 18, alignItems: 'center' },
  th: { fontWeight: 'bold', textAlign: 'center', paddingVertical: 2 },
  td: { paddingHorizontal: 4, paddingVertical: 2 },
  stamp: { position: 'absolute', top: '2.8cm', right: '2cm', borderWidth: 2, borderColor: '#b91c1c', borderRadius: 4, paddingHorizontal: 8, paddingBottom: 3 },
})

type Style = Exclude<ComponentProps<typeof View>['style'], unknown[] | undefined>
/** ๐ ปกติ · ๑–๓ ลดระยะบรรทัดตามจำนวนบรรทัดที่เกิน — คิดจากจำนวนบรรทัดที่เกินแบบปกติ (หน้าแรกเต็มพอดี A4 ไม่มีที่เหลือ) */
const DenseCtx = React.createContext(0)
/** อยู่ในพื้นที่เนื้อหาบันทึกข้อความ — บรรทัดยืดรับที่ว่างที่เหลือ (ช่องไฟ) · หน้าแนบท้ายไม่ยืด */
const GrowCtx = React.createContext(false)
// ความสูงบรรทัดขั้นต่ำ / lineHeight ตามระดับความแน่น (index = dense) — ค่าแน่นสุดที่ยังอ่านสบาย ที่ว่างที่เหลือกระจายเป็นช่องไฟทีหลัง (MemoPage)
const DENSE_MIN_H = [12.1, 11.7, 11.4, 11.2]
const DENSE_LH = [1.2, 1.16, 1.12, 1.1]
/** ส่วนแบ่งที่ว่างเหลือของช่องก่อนลงชื่อผู้ขอ เทียบกับบรรทัดละ ๑ ส่วน */
const SIGN_GAP_SHARE = 12
// บันทึกข้อความ: บรรทัดในพื้นที่เนื้อหาใช้ความสูงขั้นต่ำแบบแน่นสุดเสมอ แล้วยืดรับที่ว่างที่เหลือ (GrowCtx) — ช่องไฟจริงมาจากการยืด ไม่ต้องเดาระดับ
const lineMinH = (dense: number, grow = false) => (grow ? DENSE_MIN_H[DENSE_MIN_H.length - 1] : DENSE_MIN_H[dense] ?? LINE_H)
const T = ({ children, style }: { children: string; style?: Style | Style[] }) => <Text style={style}>{pad(children)}</Text>
const Line = ({ children, style }: { children: React.ReactNode; style?: Style | Style[] }) => {
  const dense = React.useContext(DenseCtx), grow = React.useContext(GrowCtx)
  return <View style={[s.line, { minHeight: lineMinH(dense, grow) }, ...(grow ? [{ flexGrow: 1 }] : []), ...(Array.isArray(style) ? style : style ? [style] : [])]}>{children}</View>
}
/**
 * ช่องกรอกบนเส้นประ — ไม่ระบุ width = ยืดเต็มส่วนที่เหลือ · maxChars = ตัดเป็นหลายบรรทัด ไม่เกิน maxLines (กันล้นหน้า)
 * การจัดวาง: ช่องข้อความ (ยืดได้) ชิดซ้ายเสมอ · ช่องกว้างคงที่ (ตัวเลข วัน เวลา จำนวนเงิน) กึ่งกลาง
 * center = บังคับกึ่งกลาง (ชื่อ/ตำแหน่งใต้ลายเซ็น จำนวนเงินตัวอักษรในวงเล็บ) · left = บังคับชิดซ้าย
 */
/** nowrap = width เป็นความกว้างขั้นต่ำ ข้อความยาวกว่าให้ช่องขยายตาม ไม่ตัดขึ้นบรรทัดใหม่ (เช่น วันที่ที่เดือนยาว) */
const Fill = ({ value, width, left: leftProp, center, maxChars, maxLines = 1, grow = 1, nowrap }: { value?: string | null; width?: number | string; left?: boolean; center?: boolean; maxChars?: number; maxLines?: number; grow?: number; nowrap?: boolean }) => {
  const left = leftProp ?? (!center && width == null)
  return (
  <View style={[s.fill, { alignItems: left ? 'flex-start' : 'center' }, width != null ? (nowrap ? { minWidth: width, flexShrink: 0, paddingHorizontal: 4 } : { width }) : { flexGrow: grow, flexBasis: value ? 'auto' : 0, minWidth: 20 }]}>
    {value && maxChars
      ? splitLines(value, maxChars, maxLines).map((ln, i) => <Text key={i} style={[s.fillText, left ? { textAlign: 'left', paddingLeft: 3 } : {}]}>{pad(ln)}</Text>)
      : <Text style={[s.fillText, left ? { textAlign: 'left', paddingLeft: 3 } : {}]}>{value ? pad(value) : NB}</Text>}
  </View>
  )
}
/** ช่องข้อความบรรทัดเดียวยืดเต็มส่วนที่เหลือของบรรทัด (ไม่ขึ้นแถวใหม่เองแม้ข้อความยาว — ผู้เรียกตัดบรรทัดมาแล้ว) */
/** flush = บรรทัดต่อ: ตัวอักษรเริ่มชิดแนวเลขข้อพอดี (ไม่เว้นระยะซ้าย) */
const TextFill = ({ value, flush }: { value: string; flush?: boolean }) => (
  <View style={[s.fill, { flexGrow: 1, flexBasis: 0, minWidth: 20 }, flush ? { marginLeft: 0 } : {}]}><Text style={{ paddingLeft: flush ? 0 : 3 }}>{pad(value)}</Text></View>
)
/** หัวข้อ (head) + ข้อความหลายบรรทัด: บรรทัดแรกต่อจากหัวข้อ บรรทัดถัดไปเริ่มตรงตัวอักษรแรกของหัวข้อ (เช่น "เรื่อง" ไม่ใช่เลข ๑.) มีเส้นประทุกบรรทัด */
const HangLines = ({ head, lines }: { head: React.ReactNode; lines: string[] }) => <>
  <Line style={s.item}>{head}<TextFill value={lines[0]} /></Line>
  {lines.slice(1).map((ln, i) => <Line key={i} style={s.indent2}><TextFill value={ln} flush /></Line>)}
</>
/** หัวข้อ + ข้อความยาว · เกิน maxLines ตัดท้ายด้วย … */
const splitHang = (value: string, first: number, maxLines: number) => splitLines(value || '-', NEXT_LINE, maxLines, first)
const LabeledLines = ({ label, value, first, maxLines }: { label: string; value: string; first: number; maxLines: number }) =>
  <HangLines head={<T>{label}</T>} lines={splitHang(value, first, maxLines)} />
const linesOf = (value: string, first: number, maxLines: number) => splitHang(value, first, maxLines).length
/**
 * จัดหน้าบันทึกข้อความให้จบ A4 หน้าเดียว — นับบรรทัดที่เกินแบบปกติ (ข้อ ๑ ๒ ๓ ๔ ยาว · ขอใช้รถ) แล้วบีบระยะบรรทัด (dense) — รับบรรทัดเกินได้ถึง MAX_EXTRA
 * เกินกว่านั้น: ผู้ร่วมเดินทางไปบัญชีแนบท้ายก่อน แล้วจึงลดบรรทัดเรื่อง/สถานที่ (ตัดท้ายด้วย …)
 */
const MAX_EXTRA = 3
/** แบบไม่เบิกไม่มีหมวดค่าใช้จ่าย ๖.๑–๖.๖ และงบประมาณ (สั้นกว่าแบบเบิกราว ๑๐ บรรทัด) — นับเผื่อไว้ ๘ */
const NC_SAVED = 8
const memoLayout = (d: TravelRequest) => {
  const nc = isNoClaim(d)
  const datesN = nc ? linesOf(th(tripDatesText(d.trip_dates ?? [], true)), DATES_FIRST, DATES_MAX) : 1
  const car = d.vehicle_request && d.vehicle_mode === 'gov_car' ? 1 : 0
  // แบบเบิก: ข้อ ๓ ตั้งแต่/ถึงบรรทัดเดียว + "โดยมีรายละเอียด" ต่อท้ายจำนวนเงินตัวอักษร ประหยัด ๒ บรรทัด (- (nc ? NC_SAVED : 2) ด้านล่าง)
  // ข้อ ๕ แบบเต็ม ๓ บรรทัด — รถยนต์เหลือ ๒ · รถโดยสาร/เครื่องบิน/อื่น ๆ เหลือ ๑ (บรรทัดที่ประหยัดได้ไปเป็นช่องไฟ/รองรับข้อความยาว)
  const vm = d.vehicle_mode, vehSaved = vm === 'gov_car' || vm === 'private' ? 1 : vm === 'bus' || vm === 'plane' || vm === 'other' ? 2 : 0
  let { lines: compLines, attach } = companionLines(d.travelers ?? [])
  let subjectMax = SUBJECT_MAX, locationMax = LOCATION_MAX
  const extraOf = () => (linesOf(d.subject, SUBJECT_FIRST, subjectMax) - 1) + (linesOf(d.location, LOCATION_FIRST, locationMax) - 1) + (datesN - 1) + (compLines.length - 1) + car - vehSaved - (nc ? NC_SAVED : 2)
  if (extraOf() > MAX_EXTRA && compLines.length > 1) { compLines = ['ตามบัญชีรายชื่อแนบท้าย']; attach = true }
  while (extraOf() > MAX_EXTRA && subjectMax > 1) subjectMax--
  while (extraOf() > MAX_EXTRA && locationMax > 1) locationMax--
  return { compLines, attach, subjectMax, locationMax, dense: Math.max(0, Math.min(DENSE_MIN_H.length - 1, extraOf())) }
}
/** ย่อหน้าข้อความ — ตัดบรรทัดตามคำเอง (react-pdf หาจุดตัดคำไทยไม่ได้) · indent = ย่อหน้าแรกเยื้อง ๒.๕ ซม. */
const Para = ({ children, indent, style }: { children: string; indent?: boolean; style?: Style }) => (
  <View style={style}>
    {splitLines(children, BODY_FULL_LINE, Infinity, indent ? BODY_FULL_LINE - 14 : BODY_FULL_LINE).map((ln, i) => (
      <Text key={i} style={i === 0 && indent ? { paddingLeft: '2.5cm' } : undefined}>{pad(ln)}</Text>
    ))}
  </View>
)
const G = ({ children, grow }: { children: React.ReactNode; grow?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexGrow: grow ?? 0 }}>{children}</View>
)
/** ช่องติ๊ก — วาดเครื่องหมายถูกเอง (Sarabun ไม่มีอักขระ ✓) */
const Check = ({ label, on }: { label: string; on: boolean }) => (
  <View style={s.check}>
    <Svg width={10} height={10} viewBox="0 0 10 10" style={{ marginRight: 3 }}>
      <Rect x={0.5} y={0.5} width={9} height={9} stroke={INK} strokeWidth={0.8} fill="none" />
      {on && <Path d="M2 5.3 L4.2 7.5 L8.3 2.4" stroke={INK} strokeWidth={1.5} fill="none" />}
    </Svg>
    <T style={on ? s.bold : undefined}>{label}</T>
  </View>
)
/** แถวค่าใช้จ่าย ๖.x — ชื่อรายการ ... เป็นเงิน [จำนวน] บาท */
const CostLine = ({ no, label, children, amount }: { no: string; label: string; children?: React.ReactNode; amount: number }) => (
  <Line style={s.indent2}>
    <G grow={1}><T>{`${th(no)} ${label}`}</T>{children}</G>
    <G><T>เป็นเงิน</T><Fill value={money(amount)} width={78} /><T>บาท</T></G>
  </Line>
)
/**
 * ช่องลงชื่อที่วางภาพลายเซ็น (ลงนามผ่านระบบ) ทับเส้นประ — วางแบบ absolute ไม่เพิ่มความสูงบรรทัด (บันทึกข้อความต้องจบหน้าเดียว)
 * date = วันที่ลงนาม ตัวเล็กมุมขวา
 */
const SigFill = ({ src, date }: { src?: string | null; date?: string | null }) => (
  <View style={[s.fill, { flexGrow: 1, flexBasis: 0, minWidth: 20, position: 'relative' }]}>
    <Text>{NB}</Text>
    {/* eslint-disable-next-line jsx-a11y/alt-text -- Image ของ react-pdf ไม่มี alt (เป็นภาพใน PDF ไม่ใช่ <img>) */}
    {src ? <Image src={src} style={{ position: 'absolute', left: '8%', width: '84%', bottom: -3, height: 24, objectFit: 'contain' }} /> : null}
    {date ? <Text style={{ position: 'absolute', right: 0, bottom: -1, fontSize: 6.5, color: '#374151' }}>{pad(date)}</Text> : null}
  </View>
)
/** half = กว้างเท่าช่องความเห็นฝั่งขวา (ครึ่งหน้า + เส้นคั่น ๐.๘ + เว้น ๘) — ใช้กับผู้ขอและ ผอ. ให้แนวตรงกัน · role = บรรทัดตำแหน่งกึ่งกลางไม่มีคำว่า "ตำแหน่ง" */
const SignBlock = ({ name, position, role, width = '62%', half, signature, signedAt }: { name?: string | null; position?: string | null; role?: string; width?: string; half?: boolean; signature?: string | null; signedAt?: string | null }) => (
  <View style={half ? { width: '50%', paddingLeft: 8.8, alignSelf: 'flex-end', marginTop: 4 } : { width, alignSelf: 'flex-end', marginTop: 4 }}>
    <Line><T>(ลงชื่อ)</T>{signature ? <SigFill src={signature} date={signedAt} /> : <Fill />}</Line>
    <Line><Text>(</Text><Fill value={name ?? ''} center /><Text>)</Text></Line>
    {role !== undefined ? <Line style={{ justifyContent: 'center' }}><T>{role || NB}</T></Line> : <Line><T>ตำแหน่ง</T><Fill value={position ?? ''} maxChars={34} maxLines={2} center /></Line>}
  </View>
)
const signerName = (x?: { name: string; is_acting: boolean } | null) => x ? tidyName(x.name) : ''
const signerPos = (x?: { position: string | null; is_acting: boolean; unit: string | null } | null, fallback = '') =>
  x ? `${x.is_acting ? 'รักษาการ ' : ''}${x.position ?? fallback}` : ''

// ช่องความเห็นหัวหน้า — อนุมัติผ่านระบบแล้วติ๊กผล ใส่ความเห็น ลายเซ็น และวันที่ลงนาม
const OpinionBox = ({ title, signer, right }: { title: string; signer?: Signer | null; right?: boolean }) => (
  <View style={[s.opinionBox, ...(right ? [s.opinionRight] : [])]}>
    <T style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{title}</T>
    <Line>
      <Check label="อนุมัติ" on={signer?.action === 'approved'} /><Check label="ไม่อนุมัติ" on={signer?.action === 'rejected'} />
      <Fill value={signer?.comment ?? ''} maxChars={15} left />
    </Line>
    <Line><T>(ลงชื่อ)</T>{signer?.signature ? <SigFill src={signer.signature} date={signer.acted_at ? th(thaiDateShort(signer.acted_at)) : null} /> : <Fill />}</Line>
    <Line><Text>(</Text><Fill value={signerName(signer)} center /><Text>)</Text></Line>
    <Line style={{ alignItems: 'flex-start' }}><T>ตำแหน่ง</T><Fill value={signerPos(signer)} maxChars={26} maxLines={2} center /></Line>
  </View>
)

/** เรื่องของบันทึกข้อความ — ไม่เบิกค่าใช้จ่ายไม่ขอเบิก */
const memoSubject = (d: TravelRequest) => isNoClaim(d) ? 'ขออนุมัติเดินทางไปราชการ โดยไม่เบิกค่าใช้จ่าย' : MEMO.subject

// ─── หน้า ๑ บันทึกข้อความ ─────────────────────────────────────────────────────
const MemoPage = ({ d, garudaSrc }: { d: TravelRequest; garudaSrc?: string }) => {
  const st = thaiDateParts(d.start_at), en = thaiDateParts(d.end_at)
  const dur = durationParts(Date.parse(d.start_at), Date.parse(d.end_at))
  const travelers = d.travelers ?? []
  const companions = travelers.filter(t => !t.is_requester)
  const { compLines, subjectMax, locationMax, dense } = memoLayout(d)
  const m = d.vehicle_mode
  const plate = m === 'private' || m === 'gov_car' ? d.vehicle_plate : ''
  const routeOrOther = m === 'bus' || m === 'plane' ? routeTxt(d.route_text) : m === 'other' ? d.vehicle_other : ''
  const nc = isNoClaim(d)
  const datesText = th(tripDatesText(d.trip_dates ?? [], true))
  // บรรทัดที่เกินแบบปกติ (ข้อ ๑ ๒ ๓ ๔ ยาว · ขอใช้รถ) — หน้าปกติเต็มพอดี A4 จึงต้องบีบระยะตามจำนวนที่เกิน
  const pageStyle = [s.page, { lineHeight: DENSE_LH[dense], paddingBottom: '1cm' }]
  return (
    // บันทึกข้อความ A4 หน้าเดียว (ขนาดหน้าคงที่ — ห้ามใส่ wrap={false} ที่ Page เพราะ react-pdf จะยืด/หดหน้าตามเนื้อหา ไม่ใช่ A4)
    // เนื้อหาจัดแบบแน่นตามระดับ dense ก่อน แล้วแบ่งที่ว่างที่เหลือ: ทุกบรรทัดยืดเท่า ๆ กัน (ช่องไฟ) + ช่องก่อนลงชื่อผู้ขอได้ส่วนแบ่งมากกว่า (SIGN_GAP_SHARE)
    // บันทึกข้อความสั้น (เช่น ไม่เบิก) จึงไม่ถ่างบรรทัดจนห่างเกิน — ที่เหลือไปอยู่เหนือช่องลงชื่อ
    <DenseCtx.Provider value={dense}>
    <Page size="A4" style={pageStyle}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image ของ react-pdf ไม่มี alt (เป็นภาพใน PDF ไม่ใช่ <img>) */}
      <View style={s.garudaBox} fixed>{garudaSrc ? <Image src={garudaSrc} style={{ width: 42, height: 42, objectFit: 'contain' }} /> : null}</View>
      {d.status !== 'submitted' && <View style={s.stamp}><T style={{ fontSize: 15, fontWeight: 'bold', color: '#b91c1c' }}>{d.status === 'rejected' ? 'ไม่อนุมัติ' : 'ยกเลิกแล้ว'}</T></View>}
      <View style={s.titleRow}><T style={s.title}>บันทึกข้อความ</T></View>
      <View style={{ flexGrow: 1, fontSize: FS_BODY }} wrap={false}>
      <GrowCtx.Provider value>

      {/* หัวบันทึก (ส่วนราชการ ที่ เรื่อง เรียน) ขนาด ๑๖ — เนื้อหาตั้งแต่ "ด้วยข้าพเจ้า" ขนาด ๑๔ */}
      {/* หัวบันทึกใช้ระยะบรรทัดตามขนาด ๑๖ ของตัวเอง (ไม่บีบตามระดับ dense ของเนื้อหา) */}
      <View style={{ fontSize: FS, lineHeight: 1.25 }}>
      <Line style={s.headLine}><T style={s.head}>ส่วนราชการ</T><Fill value={memoOrg(d.requester_unit)} left /></Line>
      <Line style={s.headLine}>
        <G grow={1}><T style={s.head}>ที่</T><Fill value={`${MEMO.docPrefix}${d.memo_no ? th(d.memo_no) : ''}`} left /></G>
        <G grow={1}><T style={s.head}>วันที่</T><Fill value={th(thaiDate(d.created_at))} /></G>
      </Line>
      <Line style={s.headLine}><T style={s.head}>เรื่อง</T><Fill value={memoSubject(d)} left /></Line>
      {/* ผู้รับเริ่มตรงแนวย่อหน้าเดียวกับ "ด้วยข้าพเจ้า" */}
      <Line style={[s.headLine, { marginTop: 3 }]}><View style={{ width: '1.25cm' }}><T style={s.bold}>เรียน</T></View><T>{MEMO.to}</T></Line>
      </View>

      <Line style={s.indent}>
        <G grow={3}><T>ด้วยข้าพเจ้า</T><Fill value={tidyName(d.requester_name)} maxChars={28} /></G>
        <G grow={2}><T>ตำแหน่ง</T><Fill value={d.requester_position} maxChars={30} /></G>
      </Line>
      <Line style={{ alignItems: 'flex-start' }}>
        <G grow={1}><T>กลุ่มงาน</T><Fill value={d.requester_unit ?? '-'} maxChars={30} /></G>
        <G grow={2}><T>มีความประสงค์ขออนุมัติเดินทางไปราชการ เพื่อ</T><Fill value={d.purpose} maxChars={34} left /></G>
      </Line>
      <Line><T>รายละเอียดดังนี้</T></Line>
      <LabeledLines label={`${th(1)}. เรื่อง/วัตถุประสงค์`} value={d.subject} first={SUBJECT_FIRST} maxLines={subjectMax} />
      <LabeledLines label={`${th(2)}. สถานที่ไปราชการ`} value={d.location} first={LOCATION_FIRST} maxLines={locationMax} />
      {/* Sarabun กว้างกว่า TH Sarabun ของแบบกระดาษ — วัน เดือน ปี รวมช่องเดียว และรวมระยะเวลาขึ้นบรรทัดของตัวเอง ไม่ให้ตัดบรรทัดกลางช่อง */}
      {nc ? <>
      {/* ไม่เบิกค่าใช้จ่าย: หลายวันในเดือนเดียว ไป-กลับในวันเดียวกัน เวลาเดียวกันทุกวัน */}
      <LabeledLines label={`${th(3)}. ระยะเวลาเดินทาง ในวันที่`} value={datesText} first={DATES_FIRST} maxLines={DATES_MAX} />
      <Line style={s.indent2}>
        <T>เวลา</T><Fill value={th(st.time)} width={40} /><T>น. ถึง</T><Fill value={th(en.time)} width={40} /><T>น.</T>
        <T>รวม</T><Fill value={th(d.trip_dates?.length ?? 0)} width={30} /><T>วัน (ไป-กลับในวันเดียวกัน)</T>
      </Line>
      </> : <>
      {/* ตั้งแต่ … ถึง … บรรทัดเดียว (เดือนย่อ ให้พอดีบรรทัดแม้เดือนชื่อยาว) · ช่องเวลาไม่ตัดบรรทัด · รวมระยะเวลาเป็นบรรทัดที่ ๒ */}
      <Line style={[s.item, { flexWrap: 'nowrap' }]}>
        <T>{`${th(3)}. ระยะเวลาเดินทาง ตั้งแต่วันที่`}</T><Fill value={th(`${st.day} ${st.monthShort} ${st.year}`)} width={50} nowrap />
        <T>เวลา</T><Fill value={th(st.time)} width={26} nowrap /><T>น.</T>
        <T>ถึงวันที่</T><Fill value={th(`${en.day} ${en.monthShort} ${en.year}`)} width={50} nowrap /><T>เวลา</T><Fill value={th(en.time)} width={26} nowrap /><T>น.</T>
      </Line>
      <Line style={s.indent2}>
        <T>รวมระยะเวลา</T><Fill value={th(dur.days)} width={30} /><T>วัน</T><Fill value={th(dur.hours)} width={30} /><T>ชั่วโมง</T>
        {dur.minutes ? <><Fill value={th(dur.minutes)} width={30} /><T>นาที</T></> : null}
      </Line>
      </>}
      <HangLines head={<><T>{`${th(4)}. ผู้ร่วมเดินทาง จำนวน`}</T><Fill value={th(companions.length)} width={26} /><T>คน ได้แก่</T></>} lines={compLines} />

      {/* ข้อ ๕ แสดงเฉพาะยานพาหนะที่ใช้ — รถยนต์: ช่องที่เลือก + ทะเบียน/ระยะทาง · รถโดยสาร/เครื่องบิน/อื่น ๆ: บรรทัดเดียวพร้อมเส้นทาง · ยังไม่ระบุ: แบบเต็ม */}
      {m === 'gov_car' || m === 'private' ? <>
      <Line style={[s.item, { marginTop: 2 }]}>
        <T>{`${th(5)}. ยานพาหนะที่ใช้ในการเดินทาง`}</T>
        <Check label={m === 'gov_car' ? 'รถยนต์ราชการ' : d.vehicle_name || 'รถยนต์ส่วนตัว'} on />
      </Line>
      <Line style={s.indent2}>
        <G grow={1}><T>ทะเบียน</T><Fill value={plate} maxChars={36} /></G>
        <G><T>ระยะทาง</T><Fill value={d.distance_km ? th(fmtNum(d.distance_km)) : ''} width={56} /><T>กม.</T></G>
      </Line>
      </> : m === 'bus' || m === 'plane' || m === 'other' ? (
      <Line style={[s.item, { marginTop: 2 }]}>
        <T>{`${th(5)}. ยานพาหนะที่ใช้ในการเดินทาง`}</T>
        <Check label={m === 'bus' ? 'รถโดยสารประจำทาง' : m === 'plane' ? 'เครื่องบิน' : 'อื่น ๆ'} on />
        <Fill value={routeOrOther} maxChars={34} left />
      </Line>
      ) : <>
      <Line style={[s.item, { marginTop: 2 }]}>
        <T>{`${th(5)}. ยานพาหนะที่ใช้ในการเดินทาง`}</T>
        <Check label="รถยนต์ราชการ" on={m === 'gov_car'} />
        <Check label={m === 'private' && d.vehicle_name ? d.vehicle_name : 'รถยนต์ส่วนตัว'} on={m === 'private'} />
      </Line>
      <Line style={s.indent2}>
        <G grow={1}><T>ทะเบียน</T><Fill value={plate} maxChars={36} /></G>
        <G><T>ระยะทาง</T><Fill value={d.distance_km ? th(fmtNum(d.distance_km)) : ''} width={56} /><T>กม.</T></G>
      </Line>
      <Line style={s.indent2}>
        <Check label="รถโดยสารประจำทาง" on={m === 'bus'} /><Check label="เครื่องบิน" on={m === 'plane'} /><Check label="อื่น ๆ" on={m === 'other'} />
        <Fill value={routeOrOther} maxChars={34} left />
      </Line>
      </>}
      {d.vehicle_request && m === 'gov_car' && <Line style={s.indent2}><Check label="ขออนุมัติใช้รถราชการ (ตามหนังสือขออนุมัติใช้รถที่แนบ)" on /></Line>}

      {nc ? <>
      <Line style={[s.item, { marginTop: 2 }]}><T>{`${th(6)}. ค่าใช้จ่าย`}</T><Check label="ไม่เบิกค่าใช้จ่ายในการเดินทางไปราชการ" on /></Line>
      <Para style={{ marginTop: 3 }}>จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติให้เดินทางไปราชการ โดยไม่เบิกค่าใช้จ่ายในการเดินทางไปราชการ</Para>
      </> : <>
      <Line style={[s.item, { marginTop: 2 }]}>
        <T>{`${th(6)}. ประมาณการค่าใช้จ่ายในการเดินทางไปราชการ จำนวนเงินทั้งสิ้น`}</T><Fill value={th(fmtMoney(d.total_amount))} width={74} /><T>บาท</T>
      </Line>
      {/* จำนวนเงินตัวอักษร: วงเล็บพอดีข้อความ เผื่อข้างละเล็กน้อย (ไม่ยืดเต็มบรรทัด) ตามด้วย "โดยมีรายละเอียด ดังนี้" ในบรรทัดเดียวกัน */}
      <Line style={s.indent2}><Text>(</Text><View style={[s.fill, { paddingHorizontal: 10, flexShrink: 0 }]}><Text>{pad(bahtText(d.total_amount))}</Text></View><Text>)</Text><T style={{ marginLeft: 6 }}>โดยมีรายละเอียด ดังนี้</T></Line>
      <CostLine no="๖.๑" label="ค่าเบี้ยเลี้ยงเดินทาง จำนวน" amount={d.allowance_amount}>
        <Fill value={th(travelers.length)} width={24} /><T>คน</T><Fill value={th(d.allowance_days)} width={28} /><T>วัน</T>
      </CostLine>
      {/* รูปแบบการเบิกแทนคำว่า "จำนวน" ให้ยาวเท่าเดิม (บรรทัดเดียว) · เหมาจ่าย = คน × คืน · จ่ายจริง = ห้อง × คืน */}
      <CostLine no="๖.๒" label={`ค่าเช่าที่พัก ${d.lodging_mode === 'lump' ? 'เหมาจ่าย' : d.lodging_mode === 'actual' ? 'จ่ายจริง' : 'จำนวน'}`} amount={d.lodging_amount}>
        {d.lodging_mode === 'lump'
          ? <><Fill value={th(travelers.length)} width={20} /><T>คน</T></>
          : <><Fill value={d.lodging_rooms ? th(d.lodging_rooms) : ''} width={20} /><T>ห้อง</T></>}
        <Fill value={d.lodging_nights ? th(d.lodging_nights) : ''} width={20} /><T>คืน</T>
      </CostLine>
      {/* ที่มาของยอด ๖.๓ / ๖.๕ (เส้นทาง · กม. × อัตรา) อยู่ในหน้าแนบท้าย — หน้านี้คงรูปตามแบบกระดาษ */}
      <CostLine no="๖.๓" label="ค่าพาหนะเดินทาง" amount={transportTotal(d)} />
      <CostLine no="๖.๔" label="ค่าลงทะเบียน / ค่าธรรมเนียม" amount={d.registration_amount} />
      <CostLine no="๖.๕" label="ค่าน้ำมันเชื้อเพลิง / ค่าทางด่วน" amount={d.fuel_amount + d.toll_amount} />
      <CostLine no="๖.๖" label="ค่าใช้จ่ายอื่น ๆ (ระบุ)" amount={d.other_amount}><Fill value={d.other_desc ?? ''} maxChars={13} left /></CostLine>

      <Line style={[s.item, { marginTop: 3 }]}>
        {/* พิมพ์เฉพาะประเภทงบที่เลือก (ชื่อ ณ วันยื่น) — ไม่วาดช่องติ๊กของประเภทอื่น */}
        <T>ทั้งนี้ ขอใช้งบประมาณจาก</T>
        <Fill value={requestBudgetType(d)} maxChars={50} left />
      </Line>
      {/* งบที่ผู้ขอเลือก (ชื่อยาวได้) — ขึ้นบรรทัดของตัวเองทุกประเภทงบ */}
      {/* ข้อความหน้าชื่องบตามประเภท — ว่าง ('') = ไม่มีคำนำหน้า · คำขอเก่าที่ไม่มีค่า (null) = ค่าเดิม */}
      {d.budget_name && (() => {
        const label = d.budget_item_label ?? (d.budget_type === 'project' ? 'ชื่อโครงการ' : 'รายการงบ')
        return <Line style={s.item}>{label && <T>{label}</T>}<Fill value={d.budget_name} maxChars={66} left /></Line>
      })()}
      <Para style={{ marginTop: 3 }}>จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติให้เดินทางไปราชการ และอนุมัติเบิกค่าใช้จ่ายในการเดินทางไปราชการตามระเบียบกระทรวงการคลังว่าด้วยค่าใช้จ่ายในการเดินทางไปราชการ และหลักเกณฑ์ที่เกี่ยวข้องต่อไปด้วย</Para>
      </>}

      <View style={{ flexGrow: SIGN_GAP_SHARE }} />
      <SignBlock name={tidyName(d.requester_name)} role={d.requester_position ?? ''} signature={d.requester_signature} half />

      <View style={s.opinions}>
        <OpinionBox title="ความเห็นหัวหน้ากลุ่มงาน" signer={d.signers?.major ?? null} />
        <OpinionBox title="ความเห็นหัวหน้ากลุ่มภารกิจ" signer={d.signers?.mission ?? null} right />
      </View>
      <View style={{ borderTopWidth: 0.8, borderTopColor: INK, paddingTop: 2 }}>
        <T style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{`คำสั่ง${MEMO.to}`}</T>
        <Line><Check label="อนุมัติ" on={false} /><Check label="ไม่อนุมัติ เพราะ" on={false} /><Fill /></Line>
        <SignBlock name={signerName(d.signers?.director)} role={d.signers?.director?.is_acting ? `รักษาการในตำแหน่ง${MEMO.to}` : MEMO.to} half />
      </View>
      </GrowCtx.Provider>
      </View>

    </Page>
    </DenseCtx.Provider>
  )
}

// ─── หน้า ๒ แนบท้าย: บัญชีรายชื่อ + ที่มาของยอดเงิน ─────────────────────────
// w = ความกว้าง % · wrap = จำนวนอักษรต่อบรรทัดในเซลล์ที่ตัวอักษร ๑๐ pt (react-pdf ตัดคำไทยเองไม่ได้ ต้องตัดก่อน)
// มีค่าที่พัก → เพิ่มคอลัมน์เพดานที่พักรายคน (ย่อคอลัมน์อื่นลง)
const colsOf = (lodging: boolean, noClaim = false) => noClaim
  ? [{ w: 8, label: 'ลำดับ', wrap: 5 }, { w: 40, label: 'ชื่อ - สกุล', wrap: 27 }, { w: 37, label: 'ตำแหน่ง', wrap: 25 }, { w: 15, label: 'ไปแล้ว*', wrap: 10 }]
  : lodging
  ? [
    { w: 6, label: 'ที่', wrap: 3 }, { w: 21, label: 'ชื่อ - สกุล', wrap: 14 }, { w: 19, label: 'ตำแหน่ง', wrap: 13 }, { w: 10, label: 'ไปแล้ว*', wrap: 7 },
    { w: 10, label: 'บาท/วัน', wrap: 7 }, { w: 6, label: 'วัน', wrap: 3 }, { w: 12, label: 'เบี้ยเลี้ยง', wrap: 9 }, { w: 16, label: 'ที่พัก', wrap: 11 },
  ]
  : [
    { w: 6, label: 'ลำดับ', wrap: 4 }, { w: 27, label: 'ชื่อ - สกุล', wrap: 18 }, { w: 25, label: 'ตำแหน่ง', wrap: 16 }, { w: 10, label: 'ไปแล้ว*', wrap: 7 },
    { w: 11, label: 'บาท/วัน', wrap: 8 }, { w: 7, label: 'วัน', wrap: 4 }, { w: 14, label: 'เบี้ยเลี้ยง', wrap: 11 },
  ]
/** จำนวนอักษรต่อบรรทัดของช่องข้อความใน "ที่มาของยอดเงิน" (เต็มหน้า − ช่องหัวข้อ 150 pt) */
const NOTE_LINE = 44
const ROOM_SHORT = { single: 'ห้องเดี่ยว', double: 'ห้องคู่' } as const
const AttachmentPage = ({ d }: { d: TravelRequest }) => {
  const travelers = d.travelers ?? []
  const hasLodging = d.lodging_mode !== 'none' && d.lodging_amount > 0
  const meals = d.meals_provided ?? 0
  const nc = isNoClaim(d)
  const COLS = colsOf(hasLodging, nc)
  const border = { borderLeftWidth: 0.8, borderLeftColor: INK }
  const cell = (i: number, children: string | string[], align: 'left' | 'center' | 'right' = 'left', bold = false) => (
    <View key={i} style={[{ width: `${COLS[i].w}%`, alignSelf: 'stretch', justifyContent: 'center' }, i > 0 ? border : {}]}>
      {(Array.isArray(children) ? children : [children]).flatMap(t => splitLines(t, COLS[i].wrap)).map((ln, k) => <Text key={k} style={[s.td, { textAlign: align, paddingVertical: k ? 0 : 2 }, bold ? s.bold : {}]}>{pad(ln)}</Text>)}
    </View>
  )
  // เพดานที่พักรายคน — คำขอเก่าที่ไม่มีรายคนแสดง "-"
  const lodgingCell = (t: (typeof travelers)[number]) => !t.lodging_cap ? '-'
    : d.lodging_mode === 'actual' && t.lodging_room ? [th(fmtMoney(t.lodging_cap)), ROOM_SHORT[t.lodging_room]] : th(fmtMoney(t.lodging_cap))
  const lodgingSrc = d.lodging_mode === 'lump'
    ? `เหมาจ่ายตามระดับสิทธิ์ของแต่ละคน × ${th(d.lodging_nights)} คืน รวม ${th(fmtMoney(d.lodging_amount))} บาท (ไม่ต้องแนบใบเสร็จ)`
    : `จ่ายจริง ${th(d.lodging_rooms)} ห้อง ${th(d.lodging_nights)} คืน ขอเบิก ${th(fmtMoney(d.lodging_amount))} บาท${d.lodging_cap > 0 ? ` ไม่เกินเพดานตามระดับสิทธิ์ ${th(fmtMoney(d.lodging_cap))} บาท` : ''}${d.lodging_note ? ` · พักห้องเดี่ยวเนื่องจาก ${d.lodging_note}` : ''}`
  // ตัดบรรทัดเอง (react-pdf ตัดคำไทยไม่ได้ ข้อความยาวจะล้นขอบขวา) · maxLines กันหน้าล้น · ไม่แยกรายการข้ามหน้า (ผู้เดินทางมากจนต้อง ๒ หน้า)
  const note = (label: string, value: string, maxLines = 4, perLine = NOTE_LINE) => (
    <View wrap={false}>
      <Line style={{ alignItems: 'flex-start' }}>
        <T style={{ width: 150 }}>{label}</T>
        <View style={{ flex: 1 }}>{splitLines(value, perLine, maxLines).map((ln, i) => <Text key={i}>{pad(ln)}</Text>)}</View>
      </Line>
    </View>
  )
  const capText = d.route_max_fare != null ? `${th(fmtMoney(d.route_max_fare))} บาท/เที่ยว × ไป-กลับ × ${th(travelers.length)} คน = ไม่เกิน ${th(fmtMoney(d.route_max_fare * 2 * travelers.length))} บาท` : ''
  return (
    <Page size="A4" style={s.page}>
      <T style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>{nc ? 'บัญชีรายชื่อผู้เดินทาง' : 'บัญชีรายชื่อผู้เดินทางและรายละเอียดการคำนวณค่าใช้จ่าย'}</T>
      <T style={{ textAlign: 'center' }}>แนบท้ายบันทึกข้อความ</T>
      <T style={{ textAlign: 'center', marginBottom: 8 }}>{`เรื่อง ${memoSubject(d)}`}</T>
      {note('เรื่อง/วัตถุประสงค์', d.subject, 2)}
      {/* ตัวเลข/จุดแคบกว่าอักษรไทย — บรรทัดนี้ยาวได้มากกว่าปกติ */}
      {nc
        ? note('วันที่เดินทาง', `${th(tripDatesText(d.trip_dates ?? [], true))} รวม ${th(d.trip_dates?.length ?? 0)} วัน · เวลา ${th(thaiDateParts(d.start_at).time)} ถึง ${th(thaiDateParts(d.end_at).time)} น. (ไม่เบิกค่าใช้จ่าย)`, 3, 54)
        : note('ระยะเวลาเดินทาง', `${th(thaiDateTime(d.start_at))} ถึง ${th(thaiDateTime(d.end_at))}${d.overnight ? ' (พักแรม)' : ' (ไม่พักแรม)'}`, 2, 54)}

      <View style={s.tbl}>
        <View style={[s.tr, { borderTopWidth: 0, backgroundColor: '#f3f4f6' }]}>{COLS.map((c, i) => <View key={i} style={[{ width: `${c.w}%`, alignSelf: 'stretch', justifyContent: 'center' }, i > 0 ? border : {}]}><Text style={s.th}>{pad(c.label)}</Text></View>)}</View>
        {travelers.map((t, n) => (
          <View key={t.user_id} style={s.tr} wrap={false}>
            {cell(0, th(n + 1), 'center')}{cell(1, `${tidyName(t.name)}${t.is_requester ? ' (ผู้ขอ)' : ''}`)}{cell(2, t.position ?? '-')}
            {cell(3, t.prior_trips == null ? '-' : `${th(t.prior_trips)} ครั้ง`, 'center')}
            {!nc && <>{cell(4, th(fmtMoney(t.rate)), 'right')}{cell(5, th(d.allowance_days), 'center')}{cell(6, th(fmtMoney(personAllowance(t.rate, d.allowance_days, meals))), 'right')}
            {hasLodging && cell(7, lodgingCell(t), 'right')}</>}
          </View>
        ))}
        {!nc && <View style={s.tr}>
          <View style={{ width: `${COLS.slice(0, 6).reduce((n, c) => n + c.w, 0)}%` }}><Text style={[s.td, s.bold, { textAlign: 'right' }]}>{pad(`รวม ${th(travelers.length)} คน`)}</Text></View>
          <View style={[{ width: `${COLS[6].w}%` }, border]}><Text style={[s.td, s.bold, { textAlign: 'right' }]}>{pad(th(fmtMoney(d.allowance_amount)))}</Text></View>
          {hasLodging && <View style={[{ width: `${COLS[7].w}%` }, border]}><Text style={[s.td, s.bold, { textAlign: 'right' }]}>{pad(th(fmtMoney(d.lodging_mode === 'lump' ? d.lodging_amount : d.lodging_cap)))}</Text></View>}
        </View>}
      </View>
      <Text style={{ fontSize: 9, marginTop: 2, color: '#374151' }}>{pad(`* ไปราชการแล้วในปีงบประมาณ ${th(d.fiscal_year ?? '')} ก่อนครั้งนี้ (นับคำขอที่ไม่ยกเลิก ทั้งที่เป็นผู้ขอและผู้ร่วมเดินทาง)`)}</Text>
      {hasLodging && <Text style={{ fontSize: 9, color: '#374151' }}>{pad(d.lodging_mode === 'lump' ? 'ช่องที่พัก = ค่าเช่าที่พักเหมาจ่ายของแต่ละคน (อัตราตามระดับสิทธิ์ × จำนวนคืน)' : 'ช่องที่พัก = เพดานค่าเช่าที่พักจ่ายจริงของแต่ละคน (อัตราห้องเดี่ยว/ห้องคู่ตามระดับสิทธิ์ × จำนวนคืน)')}</Text>}

      {!nc && <>
      <T style={{ fontWeight: 'bold', marginTop: 10 }}>ที่มาของยอดเงิน</T>
      {note('๖.๑ เบี้ยเลี้ยง', `อัตราของผู้เดินทางแต่ละคน × ${th(d.allowance_days)} วัน (ระยะเวลาเดินทางเบิกได้สูงสุด ${th(d.allowance_max_days)} วัน)${meals ? ` หักอาหารที่ผู้จัดเลี้ยง ${th(meals)} มื้อ มื้อละ ๑ ใน ๓ ของอัตรา (${[...new Set(travelers.map(t => t.rate))].map(r => `${th(fmtMoney(r))} บาท หักมื้อละ ${th(fmtMoney(mealCut(r)))} บาท`).join(' · ')})` : ''}`)}
      {hasLodging && note('๖.๒ ค่าเช่าที่พัก', lodgingSrc)}
      {(d.vehicle_mode === 'bus' || d.vehicle_mode === 'plane') && note(`๖.๓ ค่าพาหนะ (${d.vehicle_mode === 'bus' ? 'รถโดยสารประจำทาง' : 'เครื่องบิน'})`, `${routeTxt(d.route_text)} · เพดาน ${capText} · ขอเบิก ${th(fmtMoney(d.transport_amount))} บาท`)}
      {d.vehicle_mode === 'other' && d.transport_amount > 0 && note('๖.๓ ค่าพาหนะ', `${d.vehicle_other ?? ''} ${th(fmtMoney(d.transport_amount))} บาท`)}
      {/* Sarabun ไม่มี ↔ — ใช้ขีด · ข้อความสั้นไม่ให้วงเล็บตกบรรทัด */}
      {transportExtras(d) > 0 && note('๖.๓ ค่าพาหนะย่อย', [
        d.taxi_go_amount ? `แท็กซี่ขาไป ${th(fmtMoney(d.taxi_go_amount))} บาท` : '',
        d.taxi_back_amount ? `แท็กซี่ขากลับ ${th(fmtMoney(d.taxi_back_amount))} บาท` : '',
        d.taxi_go_amount || d.taxi_back_amount ? 'ระหว่างสถานีกับที่พัก' : '',
        d.home_station_amount ? (d.home_station_district
          ? `ค่ารถรับจ้างไปสถานี ${th(fmtMoney(d.home_station_amount))} บาท (${th(homeStationText(d).replace(/ → /g, ' ถึง '))})`
          : `ค่าเดินทางบ้าน - สถานี ไปกลับ ${th(fmtMoney(d.home_station_amount))} บาท`) : '',
      ].filter(Boolean).join(' · '))}
      {d.vehicle_mode === 'private' && note('๖.๕ ค่าน้ำมันเชื้อเพลิง', `${d.vehicle_name ?? ''} ทะเบียน ${d.vehicle_plate ?? '-'} · ${th(fmtNum(d.distance_km ?? 0))} กม. × ${th(fmtNum(d.rate_per_km ?? 0))} บาท/กม. = ${th(fmtMoney(d.fuel_amount))} บาท`)}
      {d.toll_amount > 0 && note('๖.๕ ค่าทางด่วน', `${th(fmtMoney(d.toll_amount))} บาท`)}
      {note('งบประมาณ', `${requestBudgetType(d)} · ${d.budget_name}`)}
      {note('รวมทั้งสิ้น', `${th(fmtMoney(d.total_amount))} บาท (${bahtText(d.total_amount)})`)}

      <View wrap={false}>
        <T style={{ fontWeight: 'bold', marginTop: 8 }}>หลักฐานที่ต้องใช้เบิกจ่าย</T>
        {requiredDocs(d).map((x, i) => (
          <Line key={i} style={{ alignItems: 'flex-start', paddingLeft: 8 }}>
            <T style={{ width: 16 }}>{`${th(i + 1)}.`}</T>
            <View style={{ flex: 1 }}>{splitLines(x, FULL_LINE - 6).map((ln, k) => <Text key={k}>{pad(ln)}</Text>)}</View>
          </Line>
        ))}
      </View>
      <Text style={{ fontSize: 9, marginTop: 8, color: '#374151' }}>{pad('การนับวันเบี้ยเลี้ยง: ๒๔ ชั่วโมงนับเป็น ๑ วัน เศษเกิน ๑๒ ชั่วโมงนับเป็น ๑ วัน กรณีไม่พักแรมเศษเกิน ๖ ชั่วโมงนับเป็นครึ่งวัน')}</Text>
      <Text style={{ fontSize: 9, color: '#374151' }}>{pad('อัตราเบี้ยเลี้ยง ค่าที่พัก ค่าน้ำมัน และเพดานค่าพาหนะ เป็นอัตรา ณ วันยื่นคำขอ ตามที่งานพัฒนาทรัพยากรบุคคลตั้งไว้ในระบบ')}</Text>
      </>}

      <View style={s.footer} fixed>
        <Text>{pad(`คำขอในระบบ ${requestNo(d.id)}`)}</Text>
      </View>
    </Page>
  )
}

/** บันทึกข้อความ — ๑ หน้าเสมอ */
export const TravelRequestDocument = ({ d, garudaSrc }: { d: TravelRequest; garudaSrc?: string }) => (
  <Document title={`${memoSubject(d)} ${requestNo(d.id)}`} author={d.requester_name}>
    <MemoPage d={d} garudaSrc={garudaSrc} />
  </Document>
)
/** บัญชีรายชื่อผู้เดินทางและที่มาของยอดเงิน — เอกสารแยก พิมพ์เมื่อต้องการ (ผู้ร่วมเดินทางเกิน ๓ คนต้องแนบ) */
export const TravelAttachmentDocument = ({ d }: { d: TravelRequest }) => (
  <Document title={`บัญชีแนบท้าย ${requestNo(d.id)}`} author={d.requester_name}>
    <AttachmentPage d={d} />
  </Document>
)

// ─── ตัวแสดงผล — PDFViewer ในหน้า หรือปุ่มบันทึก/แชร์บนมือถือที่แสดง PDF ในหน้าไม่ได้ ──
const GARUDA = '/assets/docs/jpe4XHmGBReEanQzvr9sZjii.png'
const TravelRequestPDF = ({ data }: { data: TravelRequest }) => {
  const { message } = App.useApp()
  const [garuda, setGaruda] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState<'save' | 'share' | null>(null)
  // ผู้ร่วมเดินทางเกิน ๓ คน บันทึกข้อความเขียนว่า "ตามบัญชีรายชื่อแนบท้าย" — เตือนให้พิมพ์บัญชีแนบด้วย
  const needAttachment = memoLayout(data).attach
  const [which, setWhich] = useState<'memo' | 'attach'>('memo')
  useEffect(() => {
    let alive = true
    fetch(withBase(GARUDA), { method: 'HEAD' })
      .then(r => { if (alive) setGaruda(r.ok && (r.headers.get('content-type') ?? '').startsWith('image/') ? withBase(GARUDA) : null) })
      .catch(() => { if (alive) setGaruda(null) })
    return () => { alive = false }
  }, [])
  if (garuda === undefined) return <div style={{ padding: 24 }}><Spin /> กำลังเตรียมเอกสาร...</div>

  const doc = which === 'memo'
    ? <TravelRequestDocument d={data} garudaSrc={garuda ?? undefined} />
    : <TravelAttachmentDocument d={data} />
  const switcher = (
    <div style={{ padding: 8, flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Segmented value={which} onChange={v => setWhich(v as 'memo' | 'attach')}
        options={[{ value: 'memo', label: 'บันทึกข้อความ (๑ หน้า)' }, { value: 'attach', label: needAttachment ? 'บัญชีแนบท้าย (ต้องแนบ)' : 'บัญชีแนบท้าย' }]} />
      {needAttachment && which === 'memo' && <AntText type="warning" style={{ fontSize: 12 }}>รายชื่อผู้ร่วมเดินทางอยู่ในบัญชีแนบท้าย — พิมพ์แนบไปด้วย</AntText>}
    </div>
  )
  if (canInlinePdf()) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {switcher}
      <div style={{ flex: 1, minHeight: 0 }}><PDFViewer key={which} style={{ width: '100%', height: '100%', border: 'none' }} showToolbar>{doc}</PDFViewer></div>
    </div>
  )

  const fileName = `${which === 'memo' ? 'ขอไปราชการ' : 'บัญชีแนบท้าย'}-${requestNo(data.id)}.pdf`
  const build = async () => new File([await pdf(doc).toBlob()], fileName, { type: 'application/pdf' })
  const run = async (kind: 'save' | 'share') => {
    setBusy(kind)
    try {
      const file = await build()
      if (kind === 'share' && canShareFile(file)) await shareFile(file, memoSubject(data))
      else { saveBlob(file, fileName); message.success('บันทึกไฟล์แล้ว — เปิดไฟล์จากแถบดาวน์โหลดแล้วสั่งพิมพ์', 5) }
    } catch { message.error('สร้างไฟล์ PDF ไม่สำเร็จ') } finally { setBusy(null) }
  }
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 16 }}>
      {switcher}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <FilePdfOutlined style={{ fontSize: 28, color: '#dc2626' }} />
        <div><div style={{ fontWeight: 700 }}>{data.subject}</div><div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{requestNo(data.id)}</div></div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--app-text-3)', margin: '14px 0' }}>เครื่องนี้แสดงเอกสารในหน้าเว็บไม่ได้ — บันทึกเป็นไฟล์ PDF แล้วเปิดด้วยแอปในเครื่องเพื่อดูหรือสั่งพิมพ์</div>
      <Button type="primary" block size="large" icon={<DownloadOutlined />} loading={busy === 'save'} disabled={busy === 'share'} onClick={() => run('save')}>บันทึกเป็น PDF</Button>
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
        <Button block size="large" icon={<ShareAltOutlined />} loading={busy === 'share'} disabled={busy === 'save'} onClick={() => run('share')} style={{ marginTop: 8 }}>แชร์ / ส่งไปพิมพ์</Button>
      )}
    </div>
  )
}

export default TravelRequestPDF
