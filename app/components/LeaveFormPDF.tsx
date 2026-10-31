'use client'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer, Svg, Rect, Path } from '@react-pdf/renderer'
import type { ComponentProps } from 'react'
import { withBase } from '@/app/lib/basePath'

// ─── Font ─────────────────────────────────────────────────────────────────────
// ใช้ไฟล์ในเครื่อง (public/fonts) ไม่ดึงจากอินเทอร์เน็ต เพราะเครื่องในโรงพยาบาลบางจุดออกเน็ตไม่ได้
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: withBase('/fonts/Sarabun/Sarabun-Regular.ttf'), fontWeight: 'normal' },
    { src: withBase('/fonts/Sarabun/Sarabun-Bold.ttf'), fontWeight: 'bold' },
  ],
})
Font.registerHyphenationCallback(word => [word])

// react-pdf ตัดสระ/วรรณยุกต์ตัวท้ายของข้อความไทยทิ้งเวลาจัดบรรทัด
// เติมช่องว่างไม่ตัดคำต่อท้ายไว้กันตัวอักษรหาย (เว้นวรรคธรรมดาถูกตัดทิ้ง ใช้ไม่ได้) — ข้อความไทยทุกชิ้นต้องผ่าน pad
const NB = ' '
const pad = (t: string) => (t ? t + NB.repeat(2) : t)
// ภาษาไทยไม่เว้นวรรคระหว่างคำ react-pdf จึงหาจุดตัดบรรทัดไม่ได้ (ข้อความยาวล้นกรอบ / แทรก zero-width space แล้วได้ขีด "-")
// ตัดเป็นบรรทัดเองตามคำ (Intl.Segmenter) โดยนับความกว้างคร่าวๆ จากตัวอักษรที่กินที่ (ไม่นับสระบน/ล่าง วรรณยุกต์)
const thSeg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null
const visibleLen = (t: string) => t.replace(/[ัิ-ฺ็-๎]/g, '').length
const splitLines = (t: string, max: number): string[] => {
  if (!thSeg || visibleLen(t) <= max) return [t]
  const lines: string[] = []
  let cur = ''
  for (const { segment } of thSeg.segment(t)) {
    if (cur && visibleLen(cur + segment) > max) { lines.push(cur.trim()); cur = '' }
    cur += segment
  }
  if (cur.trim()) lines.push(cur.trim())
  return lines
}

// ─── ข้อมูลที่ใช้กรอกฟอร์ม ────────────────────────────────────────────────────
export interface LeaveFormData {
  refNo: string              // เลขที่ใบลาในระบบ เช่น LV-000123 (พิมพ์ท้ายกระดาษ)
  printedAt: string          // วันเวลาที่พิมพ์
  orgName: string            // เขียนที่ / เรียน ผู้อำนวยการ...
  provinceOffice: string     // สำนักงานสาธารณสุขจังหวัด...
  writtenDate: string        // วันที่เขียนใบลา เช่น "14 สิงหาคม 2569"
  subject: string            // เรื่อง เช่น "ลาพักผ่อน"
  isAnnual: boolean          // ลาพักผ่อน — แสดงบรรทัดวันลาสะสม/สิทธิ์ (ประเภทอื่นไม่แสดง)
  fullName: string           // ชื่อ-สกุล พร้อมคำนำหน้า
  signName: string           // (ลงชื่อ) ผู้ลา / ผู้มอบงาน — ชื่อ สกุล ของผู้ลา (ยื่นในระบบถือว่ายืนยันแล้ว)
  userType: string           // ประเภทเจ้าหน้าที่ (ใช้ติ๊กช่อง)
  position: string           // ตำแหน่ง
  unitName: string           // กลุ่มงาน
  carriedDays: string        // วันลาพักผ่อนสะสม (วันทำการ)
  annualDays: string         // สิทธิลาพักผ่อนประจำปี
  totalDays: string          // รวมเป็น
  startDate: string          // ตั้งแต่วันที่
  endDate: string            // ถึงวันที่
  requestedDays: string      // มีกำหนด ... วันทำการ
  halfDayLabel: string       // "ครึ่งวันเช้า" / "ครึ่งวันบ่าย" / ''
  contact: string            // ในระหว่างลาติดต่อข้าพเจ้าได้ที่
  substitute: string         // ผู้ปฏิบัติหน้าที่แทนระหว่างลา
  note: string               // หมายเหตุ
  /** ความเห็นหัวหน้าหน่วยงาน/หัวหน้าตึก — ขั้นแรกของสายอนุมัติ */
  unitHead: Opinion | null
  /** ความเห็นหัวหน้ากลุ่มงาน */
  majorHead: Opinion | null
  /** คำสั่งอนุญาต/ไม่อนุญาต — ขั้นสุดท้ายของสายอนุมัติ */
  order: { approved: boolean | null; comment: string; signName: string; name: string; position: string; date: string }
  /** ผู้ตรวจสอบสถิติการลา (งาน HR ตรวจวันลาแล้ว) — null = ยังไม่ตรวจ เว้นว่างให้เซ็นด้วยมือ */
  checker: { signName: string; name: string; position: string; date: string } | null
  /** สถิติการลาในปีงบประมาณนี้ (วันทำการ) */
  statPrior: string          // ลามาแล้ว
  statThis: string           // ลาครั้งนี้
  statTotal: string          // รวมเป็น
  /** ลาป่วย / ลากิจส่วนตัว / ลาคลอดบุตร — พิมพ์ด้วยแบบใบลาป่วย กิจส่วนตัว ลาคลอดบุตร (ประเภทอื่น null) */
  spm: SpmForm | null
}

export type SpmCode = 'SICK' | 'PERS' | 'MAT'
export interface SpmForm {
  kind: SpmCode
  /** ครั้งสุดท้ายที่ลา 3 ประเภทนี้ (อนุมัติแล้ว) */
  last: { kind: SpmCode; startDate: string; endDate: string; days: string } | null
  /** สถิติในปีงบประมาณนี้ แยกประเภท ('-' = ไม่มี) */
  stats: { kind: SpmCode; prior: string; this: string; total: string }[]
}

export interface Opinion {
  comment: string
  signName: string           // (ลงชื่อ) ชื่อ สกุล — เมื่ออนุมัติแล้ว
  name: string               // (คำนำหน้าชื่อ สกุล) ผู้อนุมัติตามสาย — แสดงทุกครั้ง
  position: string
  date: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const INK = '#000'           // ข้อความทั้งแบบฟอร์มใช้สีดำ (รวมข้อมูลที่ระบบกรอก)
const RULE = '#6b7280'       // เส้นประช่องกรอก
const LINE_H = 17            // ความสูงบรรทัดของเนื้อความ — ทั้งแบบฟอร์มต้องจบใน A4 หน้าเดียว

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 12,
    paddingTop: '1.1cm',
    paddingBottom: '1.3cm',
    paddingHorizontal: '1.9cm',
    lineHeight: 1.3,
    color: '#000',
  },
  title: { fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  // ข้อความยาวเกินบรรทัด (ชื่อหน่วยงานยาว ฯลฯ) ให้ส่วนที่เหลือขึ้นบรรทัดใหม่ แทนการบีบช่องกรอกจนข้อความทับกัน
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', minHeight: LINE_H },
  fill: { borderBottomWidth: 0.8, borderBottomStyle: 'dotted', borderBottomColor: RULE, marginHorizontal: 2, minHeight: 15 },
  fillText: { textAlign: 'center', color: INK },
  check: { flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  body: { fontSize: 12 },     // เนื้อความขนาดเดียวกับส่วนอื่น — บรรทัดล้นก็ขึ้นบรรทัดใหม่ทั้งกลุ่ม (Line + G)
  bold: { fontWeight: 'bold' },
  center: { textAlign: 'center' },

  // ── ส่วนท้าย 2×2: ความเห็นผู้บังคับบัญชา / สถิติ / คำสั่ง ──
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  box: { width: '48.5%', borderWidth: 0.8, borderColor: '#000', borderRadius: 3 },
  boxHead: {
    fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3,
    borderBottomWidth: 0.8, borderBottomColor: '#000', backgroundColor: '#f3f4f6',
  },
  boxBody: { paddingHorizontal: 8, paddingTop: 2, paddingBottom: 6 },
  rule: { borderBottomWidth: 0.8, borderBottomStyle: 'dotted', borderBottomColor: RULE, minHeight: LINE_H },

  statTable: { flexDirection: 'row', borderWidth: 0.8, borderColor: '#000', marginTop: 6 },
  statCell: { flex: 1, borderRightWidth: 0.8, borderRightColor: '#000' },
  statHead: { textAlign: 'center', fontSize: 10.5, lineHeight: 1.25, paddingVertical: 3, backgroundColor: '#f9fafb' },
  statValue: { textAlign: 'center', borderTopWidth: 0.8, borderTopColor: '#000', paddingVertical: 4, fontSize: 13, color: INK, fontWeight: 'bold' },

  // ตารางสถิติแยกประเภท (แบบใบลาป่วย กิจส่วนตัว ลาคลอดบุตร)
  tblRow: { flexDirection: 'row' },
  tblCell: { flexGrow: 1, flexBasis: 0, textAlign: 'center', paddingVertical: 2, borderRightWidth: 0.8, borderRightColor: '#000', borderTopWidth: 0.8, borderTopColor: '#000' },

  footer: {
    position: 'absolute', bottom: '0.6cm', left: '1.9cm', right: '1.9cm',
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 8.5, color: '#000', borderTopWidth: 0.5, borderTopColor: '#d1d5db', paddingTop: 3,
  },
})

// ─── ชิ้นส่วน ─────────────────────────────────────────────────────────────────
type Style = Exclude<ComponentProps<typeof View>['style'], unknown[] | undefined>
/** ข้อความในแบบฟอร์ม (กันตัวท้ายหาย) */
const T = ({ children, style }: { children: string; style?: Style | Style[] }) => <Text style={style}>{pad(children)}</Text>

/**
 * ช่องกรอกบนเส้นประ — ไม่มีข้อมูลก็เว้นไว้ให้เขียนด้วยมือ
 * ไม่ระบุ width = ยืดเต็มส่วนที่เหลือของบรรทัด (ข้อความยาวไม่ล้นทับคำถัดไป)
 */
const Fill = ({ value, width, left, maxChars, grow = 1 }: { value?: string; width?: number | string; left?: boolean; maxChars?: number; grow?: number }) => (
  // มีข้อความ: เริ่มจากความกว้างจริงของข้อความ (flexBasis auto) แล้วยืดตามที่เหลือ — ไม่ถูกบีบจนตัดบรรทัด · ว่าง: ยืดเต็มที่เหลือ
  <View style={[s.fill, { alignItems: left ? 'flex-start' : 'center' }, width != null ? { width } : { flexGrow: grow, flexBasis: value ? 'auto' : 0, minWidth: 24 }]}>
    {value && maxChars
      ? splitLines(value, maxChars).map((ln, i) => <Text key={i} style={[s.fillText, left ? { textAlign: 'left', paddingLeft: 4 } : {}]}>{pad(ln)}</Text>)
      : <Text style={[s.fillText, left ? { textAlign: 'left', paddingLeft: 4 } : {}]}>{value ? pad(value) : NB}</Text>}
  </View>
)

/** กลุ่มคำนำ + ช่องกรอกที่ต้องอยู่บรรทัดเดียวกัน — grow = สัดส่วนการยืดเมื่อบรรทัดมีที่เหลือ */
const G = ({ children, grow }: { children: React.ReactNode; grow?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexGrow: grow ?? 0 }}>{children}</View>
)

const Line = ({ children, style }: { children: React.ReactNode; style?: Style | Style[] }) => (
  <View style={[s.line, ...(Array.isArray(style) ? style : style ? [style] : [])]}>{children}</View>
)

/** ช่องติ๊ก — วาดเครื่องหมายถูกเป็นเส้น (ฟอนต์ Sarabun ไม่มีอักขระ ✓ พิมพ์ออกมาเป็นช่องว่าง) */
const Check = ({ label, on }: { label: string; on: boolean }) => (
  <View style={s.check}>
    <Svg width={10} height={10} viewBox="0 0 10 10" style={{ marginRight: 3 }}>
      <Rect x={0.5} y={0.5} width={9} height={9} stroke="#000" strokeWidth={0.8} fill="none" />
      {on && <Path d="M2 5.3 L4.2 7.5 L8.3 2.4" stroke={INK} strokeWidth={1.5} fill="none" />}
    </Svg>
    <T style={on ? [s.bold, { color: INK }] : undefined}>{label}</T>
  </View>
)

/** ลงชื่อ / ตำแหน่ง / วันที่ ในกล่องส่วนท้าย */
const SignLines = ({ signName, name, position, date, role }: { signName?: string; name?: string; position?: string; date?: string; role?: string }) => (
  <>
    <Line style={{ marginTop: 4 }}>
      <T>(ลงชื่อ)</T><Fill value={signName} />{role ? <T>{role}</T> : null}
    </Line>
    <Line>
      <Text>(</Text><Fill value={name} /><Text>)</Text>
    </Line>
    {/* ตำแหน่งตามผังยาวได้มาก (เช่น รองผู้อำนวยการด้าน...) — ตัดเป็นหลายบรรทัดภายในกรอบ */}
    <Line style={{ alignItems: 'flex-start' }}><T>ตำแหน่ง</T><Fill value={position} maxChars={27} /></Line>
    <Line><T>วันที่</T><Fill value={date} /></Line>
  </>
)

/** ช่องความเห็นผู้บังคับบัญชา — ความเห็น 2 บรรทัด แล้วลงชื่อ */
const OpinionBox = ({ title, o }: { title: string; o: Opinion | null }) => (
  <View style={s.box}>
    <T style={[s.boxHead, s.center]}>{title}</T>
    <View style={s.boxBody}>
      <View style={s.rule}><T style={[s.center, { color: INK }]}>{o?.comment ?? ''}</T></View>
      <View style={s.rule} />
      <SignLines signName={o?.signName} name={o?.name} position={o?.position} date={o?.date} />
    </View>
  </View>
)

const STAFF_TYPES = ['ข้าราชการ', 'ลูกจ้างประจำ', 'ลูกจ้างชั่วคราว', 'พนักงานราชการ']
const MOPH = 'พนักงานกระทรวงสาธารณสุข'
const SPM_LABEL: Record<SpmCode, string> = { SICK: 'ป่วย', PERS: 'กิจส่วนตัว', MAT: 'คลอดบุตร' }
const SPM_ORDER = Object.keys(SPM_LABEL) as SpmCode[]

// ─── ส่วนที่ใช้ร่วมกันทั้ง 2 แบบฟอร์ม ─────────────────────────────────────────

/** หน้ากระดาษ + ชื่อแบบฟอร์ม + เขียนที่/วันที่ + เรื่อง/เรียน + ท้ายกระดาษ */
const FormPage = ({ d, title, children }: { d: LeaveFormData; title: string; children: React.ReactNode }) => (
  <Document title={`${title} — ${d.fullName}`} author={d.orgName}>
    <Page size="A4" style={s.page}>
      <T style={s.title}>{title}</T>

      {/* เขียนที่ + วันที่ (ชิดขวา) */}
      <View style={{ alignItems: 'flex-end' }}>
        <Line><T>เขียนที่</T><Fill value={d.orgName} width="5.6cm" left /></Line>
        <Line><T>วันที่</T><Fill value={d.writtenDate} width="5.6cm" left /></Line>
      </View>

      {/* เรื่อง / เรียน */}
      <Line style={{ marginTop: 6 }}><T>เรื่อง</T><Fill value={d.subject} width="7cm" left /></Line>
      <Line><T>{`เรียน${NB}${NB}ผู้อำนวยการ${d.orgName}`}</T></Line>

      {children}

      {/* ท้ายกระดาษ — วันเวลาที่พิมพ์ (ชิดขวา) */}
      <View style={[s.footer, { justifyContent: 'flex-end' }]} fixed>
        <T>{`พิมพ์เมื่อ ${d.printedAt}`}</T>
      </View>
    </Page>
  </Document>
)

/** ข้าพเจ้า ... ประเภทเจ้าหน้าที่ ... ตำแหน่ง — ย่อหน้าแรกด้วยช่องว่าง 1 ซม. (ไม่ใช้ padding ของ Line เพราะจะเยื้องทุกบรรทัดที่ขึ้นใหม่) */
const Applicant = ({ d }: { d: LeaveFormData }) => {
  const norm = (t: string) => t.replace(/\s/g, '')
  const isMoph = norm(d.userType).includes(norm(MOPH))
  const isType = (t: string) => !isMoph && norm(d.userType).includes(norm(t))
  return (
    <Line style={{ marginTop: 6 }}>
      <View style={{ width: '1cm' }} />
      <G grow={1}><T>ข้าพเจ้า</T><Fill value={d.fullName} left /></G>
      {STAFF_TYPES.map(t => <Check key={t} label={t} on={isType(t)} />)}
      <Check label={MOPH} on={isMoph} />
      <G grow={1}><T>ตำแหน่ง</T><Fill value={d.position} left /></G>
    </Line>
  )
}

/** กลุ่มงาน ... โรงพยาบาล สำนักงานสาธารณสุขจังหวัด — ชื่อกลุ่มงานในทะเบียนขึ้นต้นด้วย "กลุ่มงาน" อยู่แล้ว ตัดออกไม่ให้ซ้ำ */
const Workplace = ({ d }: { d: LeaveFormData }) => (
  <>
    <G grow={1}><T>กลุ่มงาน</T><Fill value={d.unitName.replace(/^กลุ่มงาน\s*/, '')} left /></G>
    <T>{`${d.orgName} ${d.provinceOffice}`}</T>
  </>
)

const DaysGroup = ({ d, unit }: { d: LeaveFormData; unit: string }) => (
  <G>
    <T>มีกำหนด</T><Fill value={d.requestedDays} width="0.8cm" /><T>{unit}</T>
    {d.halfDayLabel ? <T>{`(${d.halfDayLabel})`}</T> : null}
  </G>
)

const ContactLine = ({ d }: { d: LeaveFormData }) => (
  <Line style={{ alignItems: 'flex-start' }}><T>ในระหว่างลาติดต่อข้าพเจ้าได้ที่</T><Fill value={d.contact} left /></Line>
)
const SubstituteLine = ({ d }: { d: LeaveFormData }) => (
  <Line><T>และได้มอบหมายให้</T><Fill value={d.substitute} left /><T>เป็นผู้ปฏิบัติหน้าที่แทนระหว่างลา</T></Line>
)
/** เหตุผลยาวขึ้นหลายบรรทัด — ชิดซ้ายและเริ่มบรรทัดเดียวกับคำว่า หมายเหตุ */
const NoteLine = ({ value }: { value: string }) => (
  <Line style={{ alignItems: 'flex-start' }}><T>หมายเหตุ</T><Fill value={value} left /></Line>
)

/** ผู้มอบงาน (ผู้ลา — ยื่นในระบบถือว่ายืนยันแล้ว) / ผู้รับมอบงาน (ผู้ปฏิบัติหน้าที่แทน) */
const Handover = ({ d }: { d: LeaveFormData }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
    {[['ผู้มอบงาน', d.fullName, d.signName], ['ผู้รับมอบงาน', d.substitute, '']].map(([role, name, sign]) => (
      <View key={role} style={{ width: '48.5%' }}>
        <Line><T>(ลงชื่อ)</T><Fill value={sign} /><T>{role}</T></Line>
        <Line style={{ paddingLeft: '0.6cm', paddingRight: '1.2cm' }}><Text>(</Text><Fill value={name} /><Text>)</Text></Line>
      </View>
    ))}
  </View>
)

const Closing = ({ d }: { d: LeaveFormData }) => (
  <View style={{ alignItems: 'center', marginTop: 6 }}>
    <T>ขอแสดงความนับถือ</T>
    <Line style={{ width: '50%', marginTop: 2 }}><T>(ลงชื่อ)</T><Fill value={d.signName} /></Line>
    <Line style={{ width: '50%' }}><Text>(</Text><Fill value={d.fullName} /><Text>)</Text></Line>
  </View>
)

/** ความเห็นผู้บังคับบัญชา 2 ช่อง แล้วสถิติ (ส่งเข้ามาตามแบบฟอร์ม) คู่กับคำสั่ง */
const Approvals = ({ d, stats }: { d: LeaveFormData; stats: React.ReactNode }) => (
  <>
    <View style={[s.grid, { marginTop: 8 }]}>
      <OpinionBox title="ความเห็นหัวหน้าหน่วยงาน/หัวหน้าตึก" o={d.unitHead} />
      <OpinionBox title="ความเห็นหัวหน้ากลุ่มงาน" o={d.majorHead} />
    </View>

    <View style={s.grid} wrap={false}>
      <View style={s.box}>
        <T style={[s.boxHead, s.center]}>สถิติการลาในปีงบประมาณนี้</T>
        <View style={s.boxBody}>
          {stats}
          <SignLines role="ผู้ตรวจสอบ" signName={d.checker?.signName} name={d.checker?.name} position={d.checker?.position} date={d.checker?.date} />
        </View>
      </View>

      {/* คำสั่งอนุญาต — ขั้นสุดท้ายของสายอนุมัติ */}
      <View style={s.box}>
        <View style={[s.boxHead, { flexDirection: 'row', alignItems: 'center' }]}>
          <T style={[s.bold, { marginRight: 10 }]}>คำสั่ง</T>
          <Check label="อนุญาต" on={d.order.approved === true} />
          <Check label="ไม่อนุญาต" on={d.order.approved === false} />
        </View>
        <View style={s.boxBody}>
          <View style={s.rule}><T style={[s.center, { color: INK }]}>{d.order.comment}</T></View>
          <View style={s.rule} />
          <SignLines signName={d.order.signName} name={d.order.name} position={d.order.position} date={d.order.date} />
        </View>
      </View>
    </View>
  </>
)

// ─── แบบใบลาพักผ่อน (และประเภทอื่นที่ไม่ใช่ ป่วย/กิจ/คลอด) ─────────────────────
// เนื้อความจัดแบบแบบฟอร์มราชการ ข้อความต่อเนื่องเต็มบรรทัด ใช้บรรทัดน้อยที่สุด
// คำนำ + ช่องกรอก จับเป็นกลุ่ม (G) — บรรทัดไม่พอ ขึ้นบรรทัดใหม่ทั้งกลุ่ม ไม่แยกคำนำไว้ท้ายบรรทัด
const AnnualLeaveForm = ({ d }: { d: LeaveFormData }) => (
  <FormPage d={d} title={`แบบใบ${d.subject}`}>
    <View style={s.body}>
      <Applicant d={d} />
      <Line>
        <Workplace d={d} />
        {d.isAnnual ? (
          <>
            <G grow={1}><T>มีวันลาพักผ่อนสะสม</T><Fill value={d.carriedDays} /><T>วันทำการ</T></G>
            <G grow={1}><T>มีสิทธิลาพักผ่อนประจำปีอีก</T><Fill value={d.annualDays} /><T>วัน</T></G>
            <G><T>รวมเป็น</T><Fill value={d.totalDays} width="0.8cm" /></G>
          </>
        ) : null}
        <G grow={1}><T>{`ขอ${d.subject} ตั้งแต่วันที่`}</T><Fill value={d.startDate} /></G>
        <G grow={1}><T>ถึงวันที่</T><Fill value={d.endDate} /></G>
        <DaysGroup d={d} unit="วันทำการ" />
      </Line>
      <ContactLine d={d} />
      <SubstituteLine d={d} />
      <NoteLine value={d.note} />
    </View>

    <Handover d={d} />
    <Closing d={d} />
    <Approvals d={d} stats={
      <View style={s.statTable}>
        {[['ลามาแล้ว', d.statPrior], ['ลาครั้งนี้', d.statThis], ['รวมเป็น', d.statTotal]].map(([label, v], i) => (
          <View key={label} style={[s.statCell, i === 2 ? { borderRightWidth: 0 } : {}]}>
            <Text style={s.statHead}>{pad(label)}{'\n'}{pad('(วันทำการ)')}</Text>
            <Text style={s.statValue}>{pad(v)}</Text>
          </View>
        ))}
      </View>
    } />
  </FormPage>
)

// ─── แบบใบลาป่วย กิจส่วนตัว ลาคลอดบุตร ─────────────────────────────────────────
// ขอลา ติ๊กประเภทเรียงลงมา (เหตุผลต่อท้ายประเภทที่ลา) · ครั้งสุดท้ายที่ลา · สถิติแยกประเภท
// ไม่มีส่วนมอบหมายงานในแบบฟอร์ม — ระบุผู้ปฏิบัติแทนไว้ก็แสดงเฉพาะบรรทัด "มอบหมายให้" (ไม่มีช่องลงชื่อผู้มอบ/รับมอบงาน ให้จบหน้าเดียว)
const SickPersonalMaternityForm = ({ d, spm }: { d: LeaveFormData; spm: SpmForm }) => (
  <FormPage d={d} title="แบบใบลาป่วย กิจส่วนตัว ลาคลอดบุตร">
    <View style={s.body}>
      <Applicant d={d} />
      <Line><Workplace d={d} /></Line>

      <View style={{ flexDirection: 'row', marginTop: 2 }}>
        <T style={{ width: '1.6cm' }}>ขอลา</T>
        <View style={{ flexGrow: 1 }}>
          {SPM_ORDER.map(k => (
            <Line key={k} style={{ minHeight: 15 }}>
              <View style={{ width: '2.6cm' }}><Check label={SPM_LABEL[k]} on={spm.kind === k} /></View>
              {spm.kind === k ? <G grow={1}><T>เนื่องจาก</T><Fill value={d.note} left /></G> : null}
            </Line>
          ))}
        </View>
      </View>

      <Line>
        <G grow={1}><T>ตั้งแต่วันที่</T><Fill value={d.startDate} /></G>
        <G grow={1}><T>ถึงวันที่</T><Fill value={d.endDate} /></G>
        {/* ลาคลอดบุตรนับวันต่อเนื่อง (รวมวันหยุด) — ป่วย/กิจนับวันทำการ */}
        <DaysGroup d={d} unit={spm.kind === 'MAT' ? 'วัน' : 'วันทำการ'} />
      </Line>
      <Line>
        <T>ข้าพเจ้าได้ลา</T>
        {SPM_ORDER.map(k => <Check key={k} label={SPM_LABEL[k]} on={spm.last?.kind === k} />)}
        <G grow={1}><T>ครั้งสุดท้ายตั้งแต่วันที่</T><Fill value={spm.last?.startDate} /></G>
        <G grow={1}><T>ถึงวันที่</T><Fill value={spm.last?.endDate} /></G>
        <G><T>มีกำหนด</T><Fill value={spm.last?.days} width="0.8cm" /><T>วัน</T></G>
      </Line>
      <ContactLine d={d} />
      {d.substitute ? <SubstituteLine d={d} /> : null}
      <NoteLine value="" />
    </View>

    <Closing d={d} />
    <Approvals d={d} stats={
      <View style={[s.statTable, { flexDirection: 'column', borderTopWidth: 0 }]}>
        {[['ประเภทลา', 'ลามาแล้ว', 'ลาครั้งนี้', 'รวมเป็น'],
          ...spm.stats.map(x => [SPM_LABEL[x.kind], x.prior, x.this, x.total])].map((row, ri) => (
          <View key={ri} style={s.tblRow}>
            {row.map((v, ci) => (
              <T key={ci} style={[s.tblCell, ci === 0 ? { flexGrow: 1.3 } : {}, ci === 3 ? { borderRightWidth: 0 } : {},
                ri === 0 ? { backgroundColor: '#f9fafb', fontSize: 10.5 } : ci > 0 ? { color: INK } : {}]}>{v}</T>
            ))}
          </View>
        ))}
      </View>
    } />
  </FormPage>
)

// ─── เลือกแบบฟอร์มตามประเภทการลา ──────────────────────────────────────────────
export const LeaveFormDocument = ({ d }: { d: LeaveFormData }) =>
  d.spm ? <SickPersonalMaternityForm d={d} spm={d.spm} /> : <AnnualLeaveForm d={d} />

/** ตัวแสดงผลในโมดัล — react-pdf ทำงานเฉพาะฝั่ง client เท่านั้น */
const LeaveFormPDF = ({ data }: { data: LeaveFormData }) => (
  <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar>
    <LeaveFormDocument d={data} />
  </PDFViewer>
)

export default LeaveFormPDF
