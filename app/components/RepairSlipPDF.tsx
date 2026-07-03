'use client'
import type { ReactNode } from 'react'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer } from '@react-pdf/renderer'

// ─── Font ─────────────────────────────────────────────────────────────────────
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun/Sarabun-Thin.ttf',              fontWeight: 100 },
    { src: '/fonts/Sarabun/Sarabun-ThinItalic.ttf',        fontWeight: 100, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-ExtraLight.ttf',        fontWeight: 200 },
    { src: '/fonts/Sarabun/Sarabun-ExtraLightItalic.ttf',  fontWeight: 200, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-Light.ttf',             fontWeight: 300 },
    { src: '/fonts/Sarabun/Sarabun-LightItalic.ttf',       fontWeight: 300, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-Regular.ttf',           fontWeight: 400 },
    { src: '/fonts/Sarabun/Sarabun-Italic.ttf',            fontWeight: 400, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-Medium.ttf',            fontWeight: 500 },
    { src: '/fonts/Sarabun/Sarabun-MediumItalic.ttf',      fontWeight: 500, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-SemiBold.ttf',          fontWeight: 600 },
    { src: '/fonts/Sarabun/Sarabun-SemiBoldItalic.ttf',    fontWeight: 600, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-Bold.ttf',              fontWeight: 700 },
    { src: '/fonts/Sarabun/Sarabun-BoldItalic.ttf',        fontWeight: 700, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-ExtraBold.ttf',         fontWeight: 800 },
    { src: '/fonts/Sarabun/Sarabun-ExtraBoldItalic.ttf',   fontWeight: 800, fontStyle: 'italic' },
  ],
})
// ตัดบรรทัดไทยที่ "จุดปลอดภัย" (หน้าพยางค์ใหม่) ผ่าน hyphenation callback — ไม่มีช่องว่าง ไม่มียัติภังค์
// แยกเฉพาะหน้าพยัญชนะ/สระนำ (เแโใไ) ไม่แยกสระตาม/วรรณยุกต์ออกจากพยัญชนะ → สระ/วรรณยุกต์ไม่หาย
//
// callback นี้เป็น GLOBAL (react-pdf มีตัวเดียวทั้งเอกสาร) จึงจำกัด scope ด้วยเงื่อนไข:
//   • คำสั้น (≤ THRESHOLD) → คืน [word] เดิม ไม่แตะเลย → label/ค่าสั้นทุก field ไม่กระทบ
//   • เฉพาะข้อความไทยยาวติดกัน (comment) เท่านั้นที่เสนอจุดตัด — ใช้ก็ต่อเมื่อบรรทัดล้นจริง
const TH_WRAP_MIN = 18  // ความยาวขั้นต่ำที่จะเริ่มเสนอจุดตัด (กัน field สั้นโดนกระทบ)
const HARD_CHUNK = 28  // ความยาวสูงสุดต่อชิ้นก่อนบังคับตัด (กันคำยาวๆ ไม่มีช่องว่างล้นกรอบ)
const chunk = (s: string): string[] => {
  if (s.length <= HARD_CHUNK) return [s]
  const out: string[] = []
  for (let i = 0; i < s.length; i += HARD_CHUNK) out.push(s.slice(i, i + HARD_CHUNK))
  return out
}
Font.registerHyphenationCallback(word => {
  if (word.length <= TH_WRAP_MIN) return [word]
  // มีอักษรไทย → ตัดตามกฎไทยก่อน แล้วบังคับตัดชิ้นที่ยังยาวเกิน
  const pieces = /[ก-๿]/.test(word)
    ? word.split(/(?<=[ก-ฺๅ-๎])(?=[ก-ฮเ-ไ])/g)
    : [word]
  return pieces.flatMap(chunk)
})

// wrapTh คงไว้เพื่อ <T> (pass-through — การ wrap ทำที่ callback ด้านบน)
const wrapTh = (t?: string | null): string | undefined => t ?? undefined

// <T> = <Text> ที่ wrap ภาษาไทยอัตโนมัติทุกที่ (กัน glyph/สระ/วรรณยุกต์หาย) — ใช้แทน <Text> ทั้งไฟล์
const wrapNode = (node: ReactNode): ReactNode =>
  typeof node === 'string' ? wrapTh(node)
    : Array.isArray(node) ? node.map(wrapNode)
    : node
const T = ({ children, style }: { children?: ReactNode; style?: object | object[] }) => (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <Text style={style as any}>{wrapNode(children)}</Text>
)

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RepairSlipData {
  id: string
  requestDate: string
  status: string
  statusLabel: string
  requesterName: string
  position?: string
  department: string
  phone: string
  equipmentTypeLabel: string
  deviceBrand: string
  assetNo?: string
  deviceSerial?: string
  deviceLocation?: string
  problemCategoryLabel: string
  priorityLabel: string
  symptom: string
  assignedTo?: string
  resolvedDate?: string
  resolvedNote?: string
  technicianNote?: string   // ความเห็นของช่าง (ผลประเมิน)
  prNote?: string           // รายการที่ต้องการขอซื้อ / บันทึก PR
  prDate?: string
  replacementNote?: string
  // ── ข้อมูลเพิ่มเติมจาก API (รายงานการซ่อม / PR / อนุมัติ 2 ระดับ) ──
  assessmentResult?: string         // ผลการรายงานการซ่อมของช่าง (assessment_name)
  prNumber?: string                 // เลขที่ใบ PR
  // อนุมัติหัวหน้า IT (ระดับ 1)
  itHeadName?: string
  itHeadPosition?: string
  itHeadLevel?: string
  itHeadDate?: string
  itHeadComment?: string
  itHeadDecision?: 'approved' | 'rejected'
  // อนุมัติหัวหน้าภารกิจ (ระดับ 2)
  missionHeadName?: string
  missionHeadPosition?: string
  missionHeadLevel?: string
  missionHeadDate?: string
  missionHeadComment?: string
  missionHeadDecision?: 'approved' | 'rejected'
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 9,
    padding: '1cm 1.5cm',
    color: '#000',
    backgroundColor: '#fff',
    // ฟอนต์ไทยต้องเผื่อ lineHeight ให้สระบน/วรรณยุกต์ ไม่งั้นโดนตัดแหว่ง
    lineHeight: 1.6,
  },

  // แถวบนสุด: ชื่อฟอร์ม + หัวบันทึก (ซ้าย) + กล่องธุรการ (ขวา)
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  topLeft: {
    flex: 1,
    marginRight: 12,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 6,
  },
  regBox: {
    border: '1px solid #000',
    padding: '4px 8px',
    width: 190,
    flexShrink: 0,
  },

  // แถวฟอร์ม: label + เส้นประเติมข้อความ
  row:  { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  lbl:  { fontWeight: 'bold', marginRight: 3, flexShrink: 0 },
  fill: {
    flex: 1,
    borderBottom: '0.7px dotted #000',
    paddingBottom: 1,
    minHeight: 15,
    marginRight: 6,
  },
  fillLast: { marginRight: 0 },

  indent: { marginLeft: 36 },

  // checkbox
  cb: { marginRight: 4, flexShrink: 0 },

  // กล่องส่วนล่าง (บันทึกหน่วยซ่อม / ความเห็นคำสั่ง)
  box:       { border: '1px solid #000', marginTop: 8 },
  boxRow:    { flexDirection: 'row' },
  cellLeft:  { flex: 11, borderRight: '1px solid #000', padding: '5px 8px' },
  cellRight: { flex: 10, padding: '5px 8px' },
  boxBottom: { flexDirection: 'row' },
  secTitle:  { fontWeight: 'bold', marginBottom: 4 },

  // ลายเซ็น
  sigRow:    { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 },
  sigCenter: { alignItems: 'center', marginTop: 8 },
  small:     { fontSize: 8.5 },
  dim:       { color: '#000' },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CB = ({ on, label }: { on?: boolean; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginRight: 14 }}>
    <T style={s.cb}>{on ? '( / )' : '(    )'}</T>
    <T>{label}</T>
  </View>
)

const Fill = ({ v, flex, last, center }: { v?: string; flex?: number; last?: boolean; center?: boolean }) => (
  <T style={[s.fill, last ? s.fillLast : {}, flex ? { flex } : {}, center ? { textAlign: 'center' } : {}]}>{v ?? ' '}</T>
)

// RuledText — กล่องข้อความที่มี "เส้นปะเต็มความกว้าง" ขีดใต้ทุกบรรทัด (เหมือนกระดาษเส้นบรรทัด)
// วางเส้นปะแบบ absolute เป็นพื้นหลัง แล้ววางข้อความทับ → เส้นยาวจนสุดขอบทุกบรรทัด ไม่ว่าข้อความสั้น/ยาว
const LH = 14.4  // fontSize 9 × lineHeight 1.6
const RuledText = ({ text, lines = 3 }: { text?: string; lines?: number }) => (
  <View style={{ position: 'relative', minHeight: LH * lines, marginBottom: 3 }}>
    {Array.from({ length: lines }).map((_, i) => (
      <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: LH * (i + 1) - 2, borderBottom: '0.7px dotted #000' }} />
    ))}
    <T>{text || ' '}</T>
  </View>
)

// ─── Document ─────────────────────────────────────────────────────────────────
function RepairSlipDocument({ data }: { data: RepairSlipData }) {
  // ประเภทงานซ่อม — ติ๊กตามประเภทอุปกรณ์
  const isPrinter  = /พิมพ์|ปริ้น|printer/i.test(data.equipmentTypeLabel + data.deviceBrand)
  const isComputer = !isPrinter

  const isCompleted = data.status === 'completed' || /เสร็จ|เรียบร้อย/.test(data.statusLabel)

  return (
    <Document title={`ใบส่งซ่อม ${data.id}`}>
      <Page size="A4" style={s.page}>

        {/* ── แถวบนสุด: ชื่อฟอร์ม + หัวบันทึก (ซ้าย) | กล่องธุรการ (ขวา) ── */}
        <View style={s.topRow}>
          <View style={s.topLeft}>
            <T style={s.formTitle}>ใบส่งซ่อมบำรุงครุภัณฑ์คอมพิวเตอร์&nbsp;</T>
            <View style={s.row}>
              <T style={s.lbl}>ส่วนราชการ</T>
              <T style={s.lbl}>ตึกผู้ป่วย / ฝ่าย / กลุ่มงาน</T>
              <Fill v={data.department} last />
            </View>
            <View style={s.row}>
              <T style={s.lbl}>ใบส่งซ่อมที่</T>
              <Fill v={data.id} />
              <T style={s.lbl}>วันที่</T>
              <Fill v={data.requestDate} last />
            </View>
            <View style={s.row}>
              <T style={s.lbl}>เรื่อง</T>
              <T>ขออนุมัติซ่อมบำรุงครุภัณฑ์คอมพิวเตอร์ &nbsp;</T>
            </View>
            <View style={[s.row, { marginBottom: 0 }]}>
              <T style={s.lbl}>เรียน</T>
              <T>ผู้อำนวยการโรงพยาบาลพะเยา &nbsp;</T>
            </View>
          </View>
          <View style={s.regBox}>
            <T style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: 3 }}>
              ธุรการงานซ่อมกลุ่มงานเทคโนโลยีสารสนเทศ
            </T>
            <View style={s.row}>
              <T style={s.lbl}>เลขที่</T>
              <Fill v={data.id} />
              <T style={s.lbl}>/</T>
              <Fill last />
            </View>
            <View style={[s.row, { marginBottom: 0 }]}>
              <T style={s.lbl}>วันที่</T>
              <Fill v={data.requestDate} last />
            </View>
          </View>
        </View>

        {/* ── เนื้อความ ── */}
        <View style={[s.row, s.indent]}>
          <T style={s.lbl}>ด้วยฝ่าย/งาน</T>
          <Fill v={data.department} />&nbsp;
          <T> มีความประสงค์ทำการซ่อมบำรุง &nbsp;</T>
        </View>
        <View style={[s.row, { marginBottom: 2 }]}>

          <CB on={isPrinter} label="ซ่อมปริ้นเตอร์" />
          <CB on={isComputer} label="ซ่อมคอมพิวเตอร์ / เปลี่ยนอะไหล่" />
          <T>ตามรายการต่อไปนี้</T>
        </View>

        {/* รายการครุภัณฑ์ที่ส่งซ่อม — 1 ใบ ต่อ 1 รายการ */}
        <View style={s.row}>
          <T style={s.lbl}>ชื่อครุภัณฑ์&nbsp;</T>
          <Fill v={`${data.deviceBrand} (${data.equipmentTypeLabel}) `} flex={3} />
          <T style={s.lbl}>รหัสครุภัณฑ์</T>
          <Fill v={data.assetNo} flex={1} last />
        </View>
        <View style={s.row}>
          <T style={[s.lbl, { fontWeight: 'normal' }]}>อาการเสีย&nbsp;</T>
          <Fill v={wrapTh(data.symptom+ '     ')} last />
        </View>

        <T style={[s.indent, { marginTop: 4 }]}>จึงเรียนมาเพื่อพิจารณาดำเนินการต่อไป&nbsp;</T>

        {/* ลงชื่อผู้ส่งซ่อม */}
        <View style={{ alignItems: 'flex-end', marginTop: 2 }}>
          <View style={[s.row, { width: 260 }]}>
            <T style={s.lbl}>(ลงชื่อ)</T>
            <Fill v={data.requesterName+' '} center />
            <T>ผู้ส่งซ่อม </T>
          </View>
          <View style={[s.row, { width: 260 }]}>
            <T style={s.lbl}>ตำแหน่ง </T>
            <Fill v={data.position} last />
          </View>
        </View>

        {/* ══ กล่องส่วนล่าง ══ */}
        <View style={s.box}>
          <View style={s.boxRow}>

            {/* (1) บันทึกของหน่วยงานซ่อมบำรุง */}
            <View style={s.cellLeft}>
              <T style={s.secTitle}>(1) บันทึกของหน่วยงานซ่อมบำรุงคอมพิวเตอร์ </T>

              {/* ผลการรายงานการซ่อมของช่าง */}
              {data.assessmentResult && (
                <View style={[s.row, { marginBottom: 3 }]}>
                  <T style={s.lbl}>ผลการรายงาน</T>
                  <Fill v={wrapTh(data.assessmentResult+ '    ')} last />
                </View>
              )}

              {/* ความเห็นของช่าง — เส้นปะเต็มความกว้างทุกบรรทัด */}
              <T style={[s.lbl, { marginBottom: 2 }]}>ความเห็นของช่าง</T>
              <RuledText text={data.technicianNote+'      '} />


              {/* รายการที่ต้องการขอซื้อ (อะไหล่จากใบ PR) */}
              <View style={{ marginTop: 4 }}>
                <T style={[s.lbl, { marginBottom: 2, fontWeight: 'normal' }]}>รายการที่ต้องการขอซื้อ</T>
              </View>
              <RuledText text={data.prNote ?? data.replacementNote ?? data.equipmentTypeLabel} />



              <View style={[s.sigRow, { justifyContent: 'flex-end' }]}>
                <T style={s.lbl}>ลงชื่อ </T>
                <Fill v={data.assignedTo ? `${data.assignedTo} ` : undefined} flex={2} center />
                <T>ผู้ซ่อมบำรุง </T>
              </View>

              {/* เรียน หัวหน้างานซ่อม — ต่อในคอลัมน์ซ้าย (ขีดเส้นใต้คั่นเหมือนข้อ (2) ฝั่งขวา) */}
              <View style={{ borderTop: '1px solid #000', marginTop: 8, paddingTop: 6 }}>
                <T style={s.secTitle}>เรียน หัวหน้างานซ่อมบำรุงคอมพิวเตอร์ &nbsp;</T>
              <T style={[s.small, { marginBottom: 4 }]}>
                เพื่อพิจารณาดำเนินการ / ตรวจสอบ / เสนอความเห็น&nbsp;
              </T>
              <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                <CB on={data.itHeadDecision === 'approved'} label="เห็นควรอนุมัติ" />
                <CB on={data.itHeadDecision === 'rejected'} label="ไม่เห็นควร" />
              </View>
              <RuledText text={data.itHeadComment+'    '} lines={2} />
              <View style={s.sigCenter}>
                <View style={[s.row, { width: 200 }]}>
                  <T style={s.lbl}>(ลงชื่อ)</T>
                  <Fill v={wrapTh(data.itHeadName)} last center />
                </View>
                <T>({wrapTh(data.itHeadName ?? 'นางวรางคณา เอื้อหยิ่งศักดิ์')})</T>
                <T>{wrapTh(((data.itHeadPosition ?? '') + (data.itHeadLevel ?? '')) || 'นักวิชาการคอมพิวเตอร์ปฏิบัติการ')}</T>
                {data.itHeadDate && <T style={s.small}>วันที่ {data.itHeadDate}</T>}
              </View>
              {/* เส้นคั่นด้านบนก่อนหมายเหตุ */}
              <View style={{ borderTop: '1px solid #000', marginTop: 8, paddingTop: 6 }}>
                <View style={s.row}>
                  <T style={[s.lbl, { textDecoration: 'underline' }]}>หมายเหตุ</T>
                  <T style={s.lbl}>ส่งงานพัสดุดำเนินการวันที่&nbsp;</T>
                  <Fill v={data.prDate} last />
                </View>
              </View>
              {/* ชื่อผู้รับ/ตำแหน่ง */}
              <View style={[s.sigCenter, { marginTop: 0 }]}>
                <View style={[s.row, { width: 200 }]}>
                  <T style={s.lbl}>ชื่อผู้รับ&nbsp;</T>
                  <Fill last center />
                </View>
                <View style={[s.row, { width: 200, marginBottom: 0 }]}>
                  <T style={s.lbl}>ตำแหน่ง&nbsp;</T>
                  <Fill last center />
                </View>
              </View>
              </View>
            </View>

            {/* เรียน ผอ. (หัวหน้าภารกิจเสนอความเห็น) + (2) ความเห็นและคำสั่ง */}
            <View style={s.cellRight}>
              <T style={s.secTitle}>เรียน ผู้อำนวยการโรงพยาบาลพะเยา </T>
              <T style={[s.indent, { marginLeft: 20, marginBottom: 4 }]}>เพื่อโปรดพิจารณา</T>
              <View style={{ flexDirection: 'row', marginLeft: 20, marginBottom: 4 }}>
                <CB on={data.missionHeadDecision === 'approved'} label="เห็นควรอนุมัติ" />
                <CB on={data.missionHeadDecision === 'rejected'} label="ไม่เห็นควร" />
              </View>
              <View style={{ marginLeft: 20 }}>
                <RuledText text={data.missionHeadComment} lines={2} />
              </View>
              <View style={s.sigCenter}>
                <View style={[s.row, { width: 200 }]}>
                  <T style={s.lbl}>(ลงชื่อ)</T>
                  <Fill last />
                </View>
                <T>({wrapTh(data.missionHeadName ?? 'นายไกรรัตน์ คำดี')}) </T>
                <T>{wrapTh((((data.missionHeadPosition ?? '') + (data.missionHeadLevel ?? '')) || 'นายแพทย์ชำนาญการ') + ' ')}</T>
                <T style={s.small}>วันที่ {data.missionHeadDate ?? '........../........../..........'}</T>
              </View>

              <View style={{ borderTop: '1px solid #000', marginTop: 8, paddingTop: 6 }}>
                <T style={s.secTitle}>(2) ความเห็นและคำสั่ง &nbsp;</T>
                <View style={{ marginBottom: 2 }}><CB on={false} label="อนุมัติให้ซ่อมได้" /></View>
                <View style={[s.row, { marginBottom: 2 }]}>
                  <T style={s.cb}>(    )</T>
                  <T>อนุมัติให้จัดซื้อ</T>
                  <Fill />
                  <T>ซ่อม</T>
                </View>
                <View style={[s.row, { marginBottom: 4 }]}>
                  <T style={s.cb}>(    )</T>
                  <T>อื่นๆ</T>
                  <Fill last />
                </View>
                <View style={s.sigCenter}>
                  <View style={[s.row, { width: 200 }]}>
                    <T style={s.lbl}>(ลงชื่อ)</T>
                    <Fill last />
                  </View>
                  <T>(นายธวัชชัย ปานทอง)</T>
                  <T>ผู้อำนวยการโรงพยาบาลพะเยา </T>
                  <T style={s.small}>วันที่ ........../........../..........</T>
                </View>
              </View>

              {/* ได้ตรวจสอบแล้ว — ต่อในคอลัมน์ขวา (ขีดเส้นใต้คั่นด้านบนเหมือนข้อ (2)) */}
              <View style={{ borderTop: '1px solid #000', marginTop: 8, paddingTop: 6 }}>
              <T style={[s.secTitle, { textAlign: 'center' }]}>ได้ตรวจสอบแล้ว ปรากฏว่า</T>
              <View style={{ marginBottom: 2 }}>
                <CB on={isCompleted} label="เรียบร้อยใช้การได้ดี" />
              </View>
              <View style={{ marginBottom: 2 }}>
                <CB on={false} label="ยังไม่เรียบร้อย ใช้การยังไม่ได้" />
              </View>
              <View style={s.sigRow}>
                <T style={s.lbl}>(ลงชื่อ)</T>
                <Fill center />
                <T>ผู้ซ่อม</T>
              </View>
              <View style={s.sigRow}>
                <T style={s.lbl}>(ลงชื่อ)</T>
                <Fill />
                <T>ผู้รับ</T>
              </View>
              <View style={[s.sigRow, { marginBottom: 0 }]}>
                <T style={[s.lbl, { textDecoration: 'underline' }]}>วันที่แล้วเสร็จ</T>
                <Fill v={data.resolvedDate} last />
              </View>
              </View>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  )
}

// ─── Default export: PDFViewer wrapper ────────────────────────────────────────
export default function RepairSlipPDFViewer({ data }: { data: RepairSlipData }) {
  return (
    // iframe ต้องกำหนด height ตรง ๆ ให้เต็ม container — flex/minHeight ใช้ไม่ได้กับ iframe ใน parent ปกติ
    <PDFViewer width="100%" height="100%" showToolbar
      style={{ border: 'none', width: '100%', height: '100%', minHeight: 580 }}>
      <RepairSlipDocument data={data} />
    </PDFViewer>
  )
}
