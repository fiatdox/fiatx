'use client'
// บันทึกข้อความ "ขออนุมัติเดินทางไปราชการและเบิกค่าใช้จ่ายในการเดินทางไปราชการ" — ตามแบบฟอร์มกระดาษของงานพัฒนาทรัพยากรบุคคล
// หน้า ๑ = บันทึกข้อความ (ขอบ บน ๒.๕ ซ้าย ๓ ขวา ๒ ล่าง ๒ ซม.) · หน้า ๒ = บัญชีรายชื่อผู้เดินทางและที่มาของยอดเงิน (แนบท้าย)
// ชิ้นส่วน (ช่องกรอกเส้นประ ช่องติ๊ก ตัดบรรทัดไทย) ตามแบบ components/LeaveFormPDF.tsx
// ตราครุฑ: วางไฟล์ที่ public/images/garuda.png — ไม่มีไฟล์จะเว้นที่ไว้ (ตัวแสดงตรวจไฟล์ก่อน ส่งมาทาง garudaSrc)
import { Document, Font, Image, Page, Path, PDFViewer, Rect, StyleSheet, Svg, Text, View, pdf } from '@react-pdf/renderer'
import React, { useEffect, useState, type ComponentProps } from 'react'
import { App, Button, Segmented, Spin, Typography } from 'antd'
import { DownloadOutlined, FilePdfOutlined, ShareAltOutlined } from '@ant-design/icons'
import { withBase } from '@/app/lib/basePath'
import { canInlinePdf, canShareFile, saveBlob, shareFile } from '@/app/lib/pdfSupport'
import {
  BUDGET_TYPES, MEMO, bahtText, durationParts, fmtMoney, fmtNum, requestNo, requiredDocs, thaiDate, thaiDateParts, thaiDateShort, thaiDateTime, thaiDigits,
  type Signer, type TravelRequest,
  mealCut, personAllowance,
} from './travelCalc'

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
/** ตัดเป็นบรรทัดตามคำ — first = ความยาวบรรทัดแรก (ย่อหน้าเยื้อง) · maxLines = เกินแล้วตัดทิ้งพร้อม "…" (กันล้นหน้า) */
const splitLines = (t: string, max: number, maxLines = Infinity, first = max): string[] => {
  const lines: string[] = []
  if (!thSeg || visibleLen(t) <= first) lines.push(t)
  else {
    let cur = ''
    for (const { segment } of thSeg.segment(t)) {
      if (cur && visibleLen(cur + segment) > (lines.length === 0 ? first : max)) { lines.push(cur.trim()); cur = '' }
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
// ตัวเลขทั้งเอกสารเป็นเลขไทยตามแบบหนังสือราชการ
const th = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '' : thaiDigits(String(v)))
// Sarabun ไม่มีอักขระ ⇄ (ใช้ในหน้าเว็บ) — ในเอกสารใช้ขีด
const routeTxt = (t: string | null | undefined) => (t ?? '').replace(/\s*⇄\s*/g, ' - ')
const money = (n: number) => (n > 0 ? th(fmtMoney(n)) : '-')

const INK = '#000'
const RULE = '#6b7280'
const LINE_H = 15.5
const FS = 11.5

const s = StyleSheet.create({
  page: { fontFamily: 'Sarabun', fontSize: FS, paddingTop: '2.5cm', paddingBottom: '2cm', paddingLeft: '3cm', paddingRight: '2cm', lineHeight: 1.25, color: INK },
  garudaBox: { position: 'absolute', top: '1.1cm', left: '3cm', width: 42, height: 42 },
  title: { fontSize: 19, fontWeight: 'bold', textAlign: 'center', marginTop: -24, marginBottom: 8 },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', minHeight: LINE_H },
  fill: { borderBottomWidth: 0.7, borderBottomStyle: 'dotted', borderBottomColor: RULE, marginHorizontal: 2, minHeight: LINE_H - 2 },
  fillText: { textAlign: 'center' },
  head: { fontSize: 13.5, fontWeight: 'bold' },
  bold: { fontWeight: 'bold' },
  indent: { paddingLeft: '1.25cm' },
  indent2: { paddingLeft: '1.9cm' },
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
  stamp: { position: 'absolute', top: '1.4cm', right: '2cm', borderWidth: 2, borderColor: '#b91c1c', borderRadius: 4, paddingHorizontal: 8, paddingBottom: 3 },
})

type Style = Exclude<ComponentProps<typeof View>['style'], unknown[] | undefined>
const T = ({ children, style }: { children: string; style?: Style | Style[] }) => <Text style={style}>{pad(children)}</Text>
const Line = ({ children, style }: { children: React.ReactNode; style?: Style | Style[] }) => (
  <View style={[s.line, ...(Array.isArray(style) ? style : style ? [style] : [])]}>{children}</View>
)
/**
 * ช่องกรอกบนเส้นประ — ไม่ระบุ width = ยืดเต็มส่วนที่เหลือ · maxChars = ตัดเป็นหลายบรรทัด ไม่เกิน maxLines (กันล้นหน้า)
 * การจัดวาง: ช่องข้อความ (ยืดได้) ชิดซ้ายเสมอ · ช่องกว้างคงที่ (ตัวเลข วัน เวลา จำนวนเงิน) กึ่งกลาง
 * center = บังคับกึ่งกลาง (ชื่อ/ตำแหน่งใต้ลายเซ็น จำนวนเงินตัวอักษรในวงเล็บ) · left = บังคับชิดซ้าย
 */
const Fill = ({ value, width, left: leftProp, center, maxChars, maxLines = 1, grow = 1 }: { value?: string | null; width?: number | string; left?: boolean; center?: boolean; maxChars?: number; maxLines?: number; grow?: number }) => {
  const left = leftProp ?? (!center && width == null)
  return (
  <View style={[s.fill, { alignItems: left ? 'flex-start' : 'center' }, width != null ? { width } : { flexGrow: grow, flexBasis: value ? 'auto' : 0, minWidth: 20 }]}>
    {value && maxChars
      ? splitLines(value, maxChars, maxLines).map((ln, i) => <Text key={i} style={[s.fillText, left ? { textAlign: 'left', paddingLeft: 3 } : {}]}>{pad(ln)}</Text>)
      : <Text style={[s.fillText, left ? { textAlign: 'left', paddingLeft: 3 } : {}]}>{value ? pad(value) : NB}</Text>}
  </View>
  )
}
/** ย่อหน้าข้อความ — ตัดบรรทัดตามคำเอง (react-pdf หาจุดตัดคำไทยไม่ได้) · indent = ย่อหน้าแรกเยื้อง ๒.๕ ซม. */
const Para = ({ children, indent, style }: { children: string; indent?: boolean; style?: Style }) => (
  <View style={style}>
    {splitLines(children, FULL_LINE, Infinity, indent ? FULL_LINE - 12 : FULL_LINE).map((ln, i) => (
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
const SignBlock = ({ name, position, role, width = '62%', signature, signedAt }: { name?: string | null; position?: string | null; role?: string; width?: string; signature?: string | null; signedAt?: string | null }) => (
  <View style={{ width, alignSelf: 'flex-end', marginTop: 4 }}>
    <Line><T>(ลงชื่อ)</T>{signature ? <SigFill src={signature} date={signedAt} /> : <Fill />}</Line>
    <Line><Text>(</Text><Fill value={name ?? ''} center /><Text>)</Text></Line>
    {role ? <Line style={{ justifyContent: 'center' }}><T>{role}</T></Line> : <Line><T>ตำแหน่ง</T><Fill value={position ?? ''} maxChars={34} maxLines={2} center /></Line>}
  </View>
)
const signerName = (x?: { name: string; is_acting: boolean } | null) => x ? x.name : ''
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

// ─── หน้า ๑ บันทึกข้อความ ─────────────────────────────────────────────────────
const MemoPage = ({ d, garudaSrc, printedAt }: { d: TravelRequest; garudaSrc?: string; printedAt: string }) => {
  const st = thaiDateParts(d.start_at), en = thaiDateParts(d.end_at)
  const dur = durationParts(Date.parse(d.start_at), Date.parse(d.end_at))
  const travelers = d.travelers ?? []
  const companions = travelers.filter(t => !t.is_requester)
  const compNames = companions.length === 0 ? '-' : companions.length <= 3 ? companions.map(c => c.name).join(', ') : 'ตามบัญชีรายชื่อแนบท้าย'
  const m = d.vehicle_mode
  const plate = m === 'private' || m === 'gov_car' ? d.vehicle_plate : ''
  const routeOrOther = m === 'bus' || m === 'plane' ? routeTxt(d.route_text) : m === 'other' ? d.vehicle_other : ''
  return (
    // บันทึกข้อความต้องจบหน้าเดียว — wrap={false} ไม่ขึ้นหน้าใหม่ · ช่องข้อความยาวจำกัดบรรทัดไว้แล้ว (Fill maxLines)
    <Page size="A4" style={s.page} wrap={false}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image ของ react-pdf ไม่มี alt (เป็นภาพใน PDF ไม่ใช่ <img>) */}
      <View style={s.garudaBox} fixed>{garudaSrc ? <Image src={garudaSrc} style={{ width: 42, height: 42, objectFit: 'contain' }} /> : null}</View>
      {d.status !== 'submitted' && <View style={s.stamp}><T style={{ fontSize: 15, fontWeight: 'bold', color: '#b91c1c' }}>{d.status === 'rejected' ? 'ไม่อนุมัติ' : 'ยกเลิกแล้ว'}</T></View>}
      <T style={s.title}>บันทึกข้อความ</T>

      <Line><T style={s.head}>ส่วนราชการ</T><Fill value={MEMO.org} left /></Line>
      <Line>
        <G grow={1}><T style={s.head}>ที่</T><Fill value={`${MEMO.docPrefix}${d.memo_no ? th(d.memo_no) : ''}`} left /></G>
        <G grow={1}><T style={s.head}>วันที่</T><Fill value={th(thaiDate(d.created_at))} /></G>
      </Line>
      <Line><T style={s.head}>เรื่อง</T><Fill value={MEMO.subject} left /></Line>
      <Line style={{ marginTop: 4 }}><T style={s.bold}>เรียน</T><T>{`  ${MEMO.to}`}</T></Line>

      <Line style={[s.indent, { marginTop: 4 }]}>
        <G grow={3}><T>ด้วยข้าพเจ้า</T><Fill value={d.requester_name} maxChars={28} /></G>
        <G grow={2}><T>ตำแหน่ง</T><Fill value={d.requester_position} maxChars={30} /></G>
      </Line>
      <Line style={{ alignItems: 'flex-start' }}>
        <G grow={1}><T>กลุ่มงาน</T><Fill value={d.requester_unit ?? '-'} maxChars={30} /></G>
        <G grow={2}><T>มีความประสงค์ขออนุมัติเดินทางไปราชการ เพื่อ</T><Fill value={d.purpose} maxChars={34} left /></G>
      </Line>
      <Line><T>รายละเอียดดังนี้</T></Line>
      <Line style={[s.indent, { alignItems: 'flex-start' }]}><T>{`${th(1)}. เรื่อง/วัตถุประสงค์`}</T><Fill value={d.subject} maxChars={58} maxLines={2} left /></Line>
      <Line style={[s.indent, { alignItems: 'flex-start' }]}><T>{`${th(2)}. สถานที่ไปราชการ`}</T><Fill value={d.location} maxChars={60} maxLines={2} left /></Line>
      {/* Sarabun กว้างกว่า TH Sarabun ของแบบกระดาษ — วัน เดือน ปี รวมช่องเดียว และรวมระยะเวลาขึ้นบรรทัดของตัวเอง ไม่ให้ตัดบรรทัดกลางช่อง */}
      <Line style={s.indent}>
        <T>{`${th(3)}. ระยะเวลาเดินทาง ตั้งแต่วันที่`}</T><Fill value={th(`${st.day} ${st.month} พ.ศ. ${st.year}`)} width={128} />
        <T>เวลา</T><Fill value={th(st.time)} width={40} /><T>น.</T>
      </Line>
      <Line style={s.indent2}>
        <T>ถึงวันที่</T><Fill value={th(`${en.day} ${en.month} พ.ศ. ${en.year}`)} width={128} /><T>เวลา</T><Fill value={th(en.time)} width={40} /><T>น.</T>
      </Line>
      <Line style={s.indent2}>
        <T>รวมระยะเวลา</T><Fill value={th(dur.days)} width={30} /><T>วัน</T><Fill value={th(dur.hours)} width={30} /><T>ชั่วโมง</T>
        {dur.minutes ? <><Fill value={th(dur.minutes)} width={30} /><T>นาที</T></> : null}
      </Line>
      <Line style={[s.indent, { alignItems: 'flex-start' }]}>
        <T>{`${th(4)}. ผู้ร่วมเดินทาง จำนวน`}</T><Fill value={th(companions.length)} width={26} /><T>คน ได้แก่</T><Fill value={compNames} maxChars={44} maxLines={2} left />
      </Line>

      <Line style={[s.indent, { marginTop: 2 }]}>
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

      <Line style={[s.indent, { marginTop: 2 }]}>
        <T>{`${th(6)}. ประมาณการค่าใช้จ่ายในการเดินทางไปราชการ จำนวนเงินทั้งสิ้น`}</T><Fill value={th(fmtMoney(d.total_amount))} width={74} /><T>บาท</T>
      </Line>
      <Line style={s.indent2}><Text>(</Text><Fill value={bahtText(d.total_amount)} center /><Text>)</Text></Line>
      <Line style={s.indent2}><T>โดยมีรายละเอียด ดังนี้</T></Line>
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
      <CostLine no="๖.๓" label="ค่าพาหนะเดินทาง" amount={d.transport_amount} />
      <CostLine no="๖.๔" label="ค่าลงทะเบียน / ค่าธรรมเนียม" amount={d.registration_amount} />
      <CostLine no="๖.๕" label="ค่าน้ำมันเชื้อเพลิง / ค่าทางด่วน" amount={d.fuel_amount + d.toll_amount} />
      <CostLine no="๖.๖" label="ค่าใช้จ่ายอื่น ๆ (ระบุ)" amount={d.other_amount}><Fill value={d.other_desc ?? ''} maxChars={13} left /></CostLine>

      <Line style={[s.indent, { marginTop: 3 }]}>
        <T>ทั้งนี้ ขอใช้งบประมาณจาก</T>
        <Check label={BUDGET_TYPES.hospital} on={d.budget_type === 'hospital'} /><Check label={BUDGET_TYPES.budget} on={d.budget_type === 'budget'} />
        <Check label={BUDGET_TYPES.project} on={d.budget_type === 'project'} /><Fill />
      </Line>
      {/* ชื่อโครงการยาวได้ — ขึ้นบรรทัดของตัวเอง (เฉพาะงบโครงการ) */}
      {d.budget_type === 'project' && <Line style={s.indent2}><T>ชื่อโครงการ</T><Fill value={d.budget_name} maxChars={60} left /></Line>}
      <Para indent style={{ marginTop: 3 }}>จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติให้เดินทางไปราชการ และอนุมัติเบิกค่าใช้จ่ายในการเดินทางไปราชการตามระเบียบกระทรวงการคลังว่าด้วยค่าใช้จ่ายในการเดินทางไปราชการ และหลักเกณฑ์ที่เกี่ยวข้องต่อไปด้วย</Para>

      <SignBlock name={d.requester_name} position={d.requester_position} signature={d.requester_signature} />

      <View style={s.opinions}>
        <OpinionBox title="ความเห็นหัวหน้ากลุ่มงาน" signer={d.signers?.major ?? null} />
        <OpinionBox title="ความเห็นหัวหน้ากลุ่มภารกิจ" signer={d.signers?.mission ?? null} right />
      </View>
      <View style={{ borderTopWidth: 0.8, borderTopColor: INK, paddingTop: 2 }}>
        <T style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{`คำสั่ง${MEMO.to}`}</T>
        <Line><Check label="อนุมัติ" on={false} /><Check label="ไม่อนุมัติ เพราะ" on={false} /><Fill /></Line>
        <SignBlock name={signerName(d.signers?.director)} role={d.signers?.director?.is_acting ? `รักษาการในตำแหน่ง${MEMO.to}` : MEMO.to} width="55%" />
      </View>

      <View style={s.footer} fixed>
        <Text>{pad(`คำขอในระบบ ${requestNo(d.id)}${d.requester_signature ? ' · ลงนามอิเล็กทรอนิกส์ผ่านระบบ (ยกเว้นผู้อำนวยการ)' : ''}`)}</Text>
        <Text>{pad(`พิมพ์เมื่อ ${printedAt}`)}</Text>
      </View>
    </Page>
  )
}

// ─── หน้า ๒ แนบท้าย: บัญชีรายชื่อ + ที่มาของยอดเงิน ─────────────────────────
// w = ความกว้าง % · wrap = จำนวนอักษรต่อบรรทัดในเซลล์ที่ตัวอักษร ๑๐ pt (react-pdf ตัดคำไทยเองไม่ได้ ต้องตัดก่อน)
// มีค่าที่พัก → เพิ่มคอลัมน์เพดานที่พักรายคน (ย่อคอลัมน์อื่นลง)
const colsOf = (lodging: boolean) => lodging
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
const AttachmentPage = ({ d, printedAt }: { d: TravelRequest; printedAt: string }) => {
  const travelers = d.travelers ?? []
  const hasLodging = d.lodging_mode !== 'none' && d.lodging_amount > 0
  const meals = d.meals_provided ?? 0
  const COLS = colsOf(hasLodging)
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
      <T style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>บัญชีรายชื่อผู้เดินทางและรายละเอียดการคำนวณค่าใช้จ่าย</T>
      <T style={{ textAlign: 'center' }}>แนบท้ายบันทึกข้อความ</T>
      <T style={{ textAlign: 'center', marginBottom: 8 }}>{`เรื่อง ${MEMO.subject}`}</T>
      {note('เรื่อง/วัตถุประสงค์', d.subject, 2)}
      {/* ตัวเลข/จุดแคบกว่าอักษรไทย — บรรทัดนี้ยาวได้มากกว่าปกติ */}
      {note('ระยะเวลาเดินทาง', `${th(thaiDateTime(d.start_at))} ถึง ${th(thaiDateTime(d.end_at))}${d.overnight ? ' (พักแรม)' : ' (ไม่พักแรม)'}`, 2, 54)}

      <View style={s.tbl}>
        <View style={[s.tr, { borderTopWidth: 0, backgroundColor: '#f3f4f6' }]}>{COLS.map((c, i) => <View key={i} style={[{ width: `${c.w}%`, alignSelf: 'stretch', justifyContent: 'center' }, i > 0 ? border : {}]}><Text style={s.th}>{pad(c.label)}</Text></View>)}</View>
        {travelers.map((t, n) => (
          <View key={t.user_id} style={s.tr} wrap={false}>
            {cell(0, th(n + 1), 'center')}{cell(1, `${t.name}${t.is_requester ? ' (ผู้ขอ)' : ''}`)}{cell(2, t.position ?? '-')}
            {cell(3, t.prior_trips == null ? '-' : `${th(t.prior_trips)} ครั้ง`, 'center')}
            {cell(4, th(fmtMoney(t.rate)), 'right')}{cell(5, th(d.allowance_days), 'center')}{cell(6, th(fmtMoney(personAllowance(t.rate, d.allowance_days, meals))), 'right')}
            {hasLodging && cell(7, lodgingCell(t), 'right')}
          </View>
        ))}
        <View style={s.tr}>
          <View style={{ width: `${COLS.slice(0, 6).reduce((n, c) => n + c.w, 0)}%` }}><Text style={[s.td, s.bold, { textAlign: 'right' }]}>{pad(`รวม ${th(travelers.length)} คน`)}</Text></View>
          <View style={[{ width: `${COLS[6].w}%` }, border]}><Text style={[s.td, s.bold, { textAlign: 'right' }]}>{pad(th(fmtMoney(d.allowance_amount)))}</Text></View>
          {hasLodging && <View style={[{ width: `${COLS[7].w}%` }, border]}><Text style={[s.td, s.bold, { textAlign: 'right' }]}>{pad(th(fmtMoney(d.lodging_mode === 'lump' ? d.lodging_amount : d.lodging_cap)))}</Text></View>}
        </View>
      </View>
      <Text style={{ fontSize: 9, marginTop: 2, color: '#374151' }}>{pad(`* ไปราชการแล้วในปีงบประมาณ ${th(d.fiscal_year ?? '')} ก่อนครั้งนี้ (นับคำขอที่ไม่ยกเลิก ทั้งที่เป็นผู้ขอและผู้ร่วมเดินทาง)`)}</Text>
      {hasLodging && <Text style={{ fontSize: 9, color: '#374151' }}>{pad(d.lodging_mode === 'lump' ? 'ช่องที่พัก = ค่าเช่าที่พักเหมาจ่ายของแต่ละคน (อัตราตามระดับสิทธิ์ × จำนวนคืน)' : 'ช่องที่พัก = เพดานค่าเช่าที่พักจ่ายจริงของแต่ละคน (อัตราห้องเดี่ยว/ห้องคู่ตามระดับสิทธิ์ × จำนวนคืน)')}</Text>}

      <T style={{ fontWeight: 'bold', marginTop: 10 }}>ที่มาของยอดเงิน</T>
      {note('๖.๑ เบี้ยเลี้ยง', `อัตราของผู้เดินทางแต่ละคน × ${th(d.allowance_days)} วัน (ระยะเวลาเดินทางเบิกได้สูงสุด ${th(d.allowance_max_days)} วัน)${meals ? ` หักอาหารที่ผู้จัดเลี้ยง ${th(meals)} มื้อ มื้อละ ๑ ใน ๓ ของอัตรา (${[...new Set(travelers.map(t => t.rate))].map(r => `${th(fmtMoney(r))} บาท หักมื้อละ ${th(fmtMoney(mealCut(r)))} บาท`).join(' · ')})` : ''}`)}
      {hasLodging && note('๖.๒ ค่าเช่าที่พัก', lodgingSrc)}
      {(d.vehicle_mode === 'bus' || d.vehicle_mode === 'plane') && note(`๖.๓ ค่าพาหนะ (${d.vehicle_mode === 'bus' ? 'รถโดยสารประจำทาง' : 'เครื่องบิน'})`, `${routeTxt(d.route_text)} · เพดาน ${capText} · ขอเบิก ${th(fmtMoney(d.transport_amount))} บาท`)}
      {d.vehicle_mode === 'other' && d.transport_amount > 0 && note('๖.๓ ค่าพาหนะ', `${d.vehicle_other ?? ''} ${th(fmtMoney(d.transport_amount))} บาท`)}
      {d.vehicle_mode === 'private' && note('๖.๕ ค่าน้ำมันเชื้อเพลิง', `${d.vehicle_name ?? ''} ทะเบียน ${d.vehicle_plate ?? '-'} · ${th(fmtNum(d.distance_km ?? 0))} กม. × ${th(fmtNum(d.rate_per_km ?? 0))} บาท/กม. = ${th(fmtMoney(d.fuel_amount))} บาท`)}
      {d.toll_amount > 0 && note('๖.๕ ค่าทางด่วน', `${th(fmtMoney(d.toll_amount))} บาท`)}
      {note('งบประมาณ', `${BUDGET_TYPES[d.budget_type]} · ${d.budget_name}`)}
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

      <View style={s.footer} fixed>
        <Text>{pad(`คำขอในระบบ ${requestNo(d.id)}`)}</Text>
        <Text>{pad(`พิมพ์เมื่อ ${printedAt}`)}</Text>
      </View>
    </Page>
  )
}

/** บันทึกข้อความ — ๑ หน้าเสมอ */
export const TravelRequestDocument = ({ d, garudaSrc, printedAt }: { d: TravelRequest; garudaSrc?: string; printedAt: string }) => (
  <Document title={`${MEMO.subject} ${requestNo(d.id)}`} author={d.requester_name}>
    <MemoPage d={d} garudaSrc={garudaSrc} printedAt={printedAt} />
  </Document>
)
/** บัญชีรายชื่อผู้เดินทางและที่มาของยอดเงิน — เอกสารแยก พิมพ์เมื่อต้องการ (ผู้ร่วมเดินทางเกิน ๓ คนต้องแนบ) */
export const TravelAttachmentDocument = ({ d, printedAt }: { d: TravelRequest; printedAt: string }) => (
  <Document title={`บัญชีแนบท้าย ${requestNo(d.id)}`} author={d.requester_name}>
    <AttachmentPage d={d} printedAt={printedAt} />
  </Document>
)

// ─── ตัวแสดงผล — PDFViewer ในหน้า หรือปุ่มบันทึก/แชร์บนมือถือที่แสดง PDF ในหน้าไม่ได้ ──
const GARUDA = '/images/garuda.png'
const TravelRequestPDF = ({ data }: { data: TravelRequest }) => {
  const { message } = App.useApp()
  const [garuda, setGaruda] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState<'save' | 'share' | null>(null)
  const [printedAt] = useState(() => thaiDigits(thaiDateTime(Date.now())))
  // ผู้ร่วมเดินทางเกิน ๓ คน บันทึกข้อความเขียนว่า "ตามบัญชีรายชื่อแนบท้าย" — เตือนให้พิมพ์บัญชีแนบด้วย
  const needAttachment = (data.travelers ?? []).filter(t => !t.is_requester).length > 3
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
    ? <TravelRequestDocument d={data} garudaSrc={garuda ?? undefined} printedAt={printedAt} />
    : <TravelAttachmentDocument d={data} printedAt={printedAt} />
  const switcher = (
    <div style={{ padding: 8, flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Segmented value={which} onChange={v => setWhich(v as 'memo' | 'attach')}
        options={[{ value: 'memo', label: 'บันทึกข้อความ (๑ หน้า)' }, { value: 'attach', label: needAttachment ? 'บัญชีแนบท้าย (ต้องแนบ)' : 'บัญชีแนบท้าย' }]} />
      {needAttachment && which === 'memo' && <AntText type="warning" style={{ fontSize: 12 }}>ผู้ร่วมเดินทางเกิน ๓ คน — พิมพ์บัญชีแนบท้ายแนบไปด้วย</AntText>}
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
      if (kind === 'share' && canShareFile(file)) await shareFile(file, MEMO.subject)
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
