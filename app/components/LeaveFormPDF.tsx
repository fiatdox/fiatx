'use client'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer } from '@react-pdf/renderer'

// ─── Font ─────────────────────────────────────────────────────────────────────
// ใช้ไฟล์ในเครื่อง (public/fonts) ไม่ดึงจากอินเทอร์เน็ต เพราะเครื่องในโรงพยาบาลบางจุดออกเน็ตไม่ได้
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun/Sarabun-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Sarabun/Sarabun-Bold.ttf', fontWeight: 'bold' },
  ],
})
Font.registerHyphenationCallback(word => [word])

// react-pdf ตัดสระ/วรรณยุกต์ตัวท้ายของข้อความไทยทิ้งเวลาจัดบรรทัด
// เติมช่องว่างไม่ตัดคำต่อท้ายไว้กันตัวอักษรหาย (เว้นวรรคธรรมดาถูกตัดทิ้ง ใช้ไม่ได้)
const NB = ' '
const pad = (t: string) => (t ? t + NB.repeat(3) : t)

// ─── ข้อมูลที่ใช้กรอกฟอร์ม ────────────────────────────────────────────────────
export interface LeaveFormData {
  orgName: string            // เขียนที่ / เรียน ผู้อำนวยการ...
  provinceOffice: string     // สำนักงานสาธารณสุขจังหวัด...
  writtenDate: string        // วันที่เขียนใบลา เช่น "14 เดือน สิงหาคม พ.ศ. 2569"
  subject: string            // เรื่อง เช่น "ลาพักผ่อน"
  fullName: string           // ชื่อ-สกุล พร้อมคำนำหน้า
  userType: string           // ประเภทเจ้าหน้าที่ (ใช้ติ๊กช่อง)
  position: string           // ตำแหน่ง
  unitName: string           // กลุ่มงาน
  carriedDays: string        // วันลาพักผ่อนสะสม (วันทำการ)
  annualDays: string         // สิทธิลาพักผ่อนประจำปี
  totalDays: string          // รวมเป็น
  startDate: string          // ตั้งแต่วันที่
  endDate: string            // ถึงวันที่
  requestedDays: string      // มีกำหนด ... วันทำการ
  contact: string            // ในระหว่างลาติดต่อข้าพเจ้าได้ที่
  substitute: string         // ผู้ปฏิบัติหน้าที่แทนระหว่างลา
  note: string               // หมายเหตุ
  /** ความเห็นหัวหน้าหน่วยงาน/หัวหน้าตึก — ขั้นแรกของสายอนุมัติ */
  unitHead: Opinion | null
  /** ความเห็นหัวหน้ากลุ่มงาน */
  majorHead: Opinion | null
  /** คำสั่งอนุญาต/ไม่อนุญาต — ขั้นสุดท้ายของสายอนุมัติ */
  order: { approved: boolean | null; name: string; position: string; date: string }
  /** สถิติการลาในปีงบประมาณนี้ (วันทำการ) */
  statPrior: string          // ลามาแล้ว
  statThis: string           // ลาครั้งนี้
  statTotal: string          // รวมเป็น
}

export interface Opinion {
  comment: string
  name: string
  position: string
  date: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 12,
    paddingTop: '1.2cm',
    paddingBottom: '1cm',
    paddingHorizontal: '1.8cm',
    lineHeight: 1.5,
  },
  title: { fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  right: { alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  // ช่องกรอก: ข้อความอยู่บนเส้นประ กว้างตามที่กำหนด
  fillWrap: { borderBottomWidth: 1, borderBottomStyle: 'dashed', borderBottomColor: '#000' },
  fillText: { textAlign: 'center' },
  indent: { marginLeft: '1.5cm' },
  center: { textAlign: 'center' },
  sigBlock: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  sigCol: { width: '48%' },
  opinionWrap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  opinionCol: { width: '47%' },
  dotted: { borderBottomWidth: 1, borderBottomStyle: 'dashed', borderBottomColor: '#000', height: 16 },
  box: { width: 11, height: 11, borderWidth: 1, borderColor: '#000', marginRight: 4, marginBottom: 3 },
  boxTick: { fontSize: 10, textAlign: 'center', lineHeight: 1 },

  // ── ส่วนท้าย: สถิติการลา + กล่องคำสั่ง ──
  footWrap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statCol: { width: '47%' },
  statTitle: { textAlign: 'center', textDecoration: 'underline', marginBottom: 6 },
  statTable: { borderWidth: 1, borderColor: '#000', flexDirection: 'row', width: '100%' },
  statCell: { flex: 1, borderRightWidth: 1, borderRightColor: '#000' },
  statCellLast: { flex: 1 },
  statHead: { textAlign: 'center', fontSize: 11, lineHeight: 1.3, paddingVertical: 4 },
  statValue: { textAlign: 'center', borderTopWidth: 1, borderTopColor: '#000', paddingVertical: 5 },
  orderBox: { width: '47%', borderWidth: 1, borderColor: '#000', padding: 10 },
})

/** ช่องกรอกบนเส้นประ — ถ้าไม่มีข้อมูลก็เว้นไว้ให้เขียนด้วยมือ */
const Fill = ({ value, width }: { value?: string; width: number | string }) => (
  <View style={[s.fillWrap, { width }]}>
    <Text style={s.fillText}>{pad(value ?? '')}{value ? '' : NB}</Text>
  </View>
)

/** ช่องติ๊ก □ / ☑ ตามประเภทเจ้าหน้าที่ */
const Check = ({ label, on }: { label: string; on: boolean }) => (
  <View style={[s.row, { marginRight: 10 }]}>
    <View style={s.box}><Text style={s.boxTick}>{on ? '✓' : ' '}</Text></View>
    <Text>{pad(label)}</Text>
  </View>
)

const STAFF_TYPES = ['ข้าราชการ', 'ลูกจ้างประจำ', 'ลูกจ้างชั่วคราว', 'พนักงานราชการ']

/** ช่องความเห็นผู้บังคับบัญชา — ความเห็น 2 บรรทัด แล้วลงชื่อ/ตำแหน่ง/วันที่ */
const OpinionBody = ({ o }: { o: Opinion | null }) => (
  <>
    <View style={s.dotted}><Text style={s.center}>{pad(o?.comment ?? '')}</Text></View>
    <View style={s.dotted} />
    <View style={[s.row, { marginTop: 4 }]}>
      <Text>(ลงชื่อ){NB}</Text>
      <Fill value={o?.name} width="4.6cm" />
    </View>
    <View style={s.row}>
      <Text>ตำแหน่ง{NB}</Text>
      <Fill value={o?.position} width="4.6cm" />
    </View>
    <View style={s.row}>
      <Text>วันที่{NB}</Text>
      <Fill value={o?.date} width="4.6cm" />
    </View>
  </>
)

// ─── เอกสาร ───────────────────────────────────────────────────────────────────
export const LeaveFormDocument = ({ d }: { d: LeaveFormData }) => {
  const isType = (t: string) => d.userType.replace(/\s/g, '').includes(t.replace(/\s/g, ''))
  const isMoph = d.userType.includes('กระทรวงสาธารณสุข')

  return (
    <Document title={`แบบใบ${d.subject} — ${d.fullName}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{pad(`แบบใบ${d.subject}`)}</Text>

        {/* เขียนที่ + วันที่ */}
        <View style={s.right}>
          <Text>{pad(`เขียนที่ ${d.orgName}`)}</Text>
          <View style={s.row}>
            <Text>วันที่{NB}</Text>
            <Fill value={d.writtenDate} width="6.5cm" />
          </View>
        </View>

        {/* เรื่อง / เรียน */}
        <View style={[s.row, { marginTop: 10 }]}>
          <Text>เรื่อง{NB}</Text>
          <Fill value={d.subject} width="8cm" />
        </View>
        <Text>{pad(`เรียน ผู้อำนวยการ${d.orgName}`)}</Text>

        {/* ข้าพเจ้า + ประเภทเจ้าหน้าที่ */}
        <View style={[s.row, { marginTop: 12 }]}>
          <Text>{NB.repeat(6)}ข้าพเจ้า{NB}</Text>
          <Fill value={d.fullName} width="5.5cm" />
          <Text>{NB.repeat(2)}</Text>
          {STAFF_TYPES.map(t => <Check key={t} label={t} on={isType(t)} />)}
        </View>

        <View style={s.row}>
          <Check label="พนักงานกระทรวงสาธารณสุข" on={isMoph} />
          <Text>ตำแหน่ง{NB}</Text>
          <Fill value={d.position} width="4.5cm" />
          <Text>{NB}กลุ่มงาน{NB}</Text>
          <Fill value={d.unitName} width="5cm" />
        </View>
        <Text>{pad(d.orgName)}</Text>

        {/* วันลาสะสม + สิทธิ์ */}
        <View style={s.row}>
          <Text>{pad(d.provinceOffice)} มีวันลาพักผ่อนสะสม{NB}</Text>
          <Fill value={d.carriedDays} width="2cm" />
          <Text>{NB}วันทำการ มีสิทธิลาพักผ่อนประจำปีอีก{NB}</Text>
          <Fill value={d.annualDays} width="1.6cm" />
          <Text>{NB}วัน</Text>
        </View>

        <View style={s.row}>
          <Text>รวมเป็น{NB}</Text>
          <Fill value={d.totalDays} width="1.8cm" />
          <Text>{NB}{pad(`ขอ${d.subject}`)} ตั้งแต่วันที่{NB}</Text>
          <Fill value={d.startDate} width="3.4cm" />
          <Text>{NB}ถึงวันที่{NB}</Text>
          <Fill value={d.endDate} width="3.4cm" />
        </View>
        <View style={s.row}>
          <Text>มีกำหนด{NB}</Text>
          <Fill value={d.requestedDays} width="1.8cm" />
          <Text>{NB}วันทำการ</Text>
        </View>

        {/* ติดต่อ / ผู้ปฏิบัติงานแทน */}
        <View style={s.row}>
          <Text>ในระหว่างลาติดต่อข้าพเจ้าได้ที่{NB}</Text>
          <Fill value={d.contact} width="9.5cm" />
        </View>
        <View style={s.row}>
          <Text>และได้มอบหมายให้{NB}</Text>
          <Fill value={d.substitute} width="7.5cm" />
          <Text>{NB}{pad('เป็นผู้ปฏิบัติหน้าที่แทนระหว่างลา')}</Text>
        </View>
        <View style={s.row}>
          <Text>หมายเหตุ{NB}</Text>
          <Fill value={d.note} width="12cm" />
        </View>

        {/* ผู้มอบงาน / ผู้รับมอบงาน */}
        <View style={s.sigBlock}>
          <View style={s.sigCol}>
            <View style={s.row}>
              <Text>(ลงชื่อ){NB}</Text>
              <Fill value="" width="5cm" />
              <Text>{NB}{pad('ผู้มอบงาน')}</Text>
            </View>
            <View style={[s.row, { marginLeft: '1cm' }]}>
              <Text>({NB}</Text>
              <Fill value={d.fullName} width="5.2cm" />
              <Text>{NB})</Text>
            </View>
          </View>
          <View style={s.sigCol}>
            <View style={s.row}>
              <Text>(ลงชื่อ){NB}</Text>
              <Fill value="" width="5cm" />
              <Text>{NB}{pad('ผู้รับมอบงาน')}</Text>
            </View>
            <View style={[s.row, { marginLeft: '1cm' }]}>
              <Text>({NB}</Text>
              <Fill value={d.substitute} width="5.2cm" />
              <Text>{NB})</Text>
            </View>
          </View>
        </View>

        {/* ขอแสดงความนับถือ */}
        <Text style={[s.center, { marginTop: 16 }]}>{pad('ขอแสดงความนับถือ')}</Text>
        <View style={[s.row, s.center, { justifyContent: 'center', marginTop: 4 }]}>
          <Text>(ลงชื่อ){NB}</Text>
          <Fill value="" width="5.5cm" />
        </View>
        <View style={[s.row, { justifyContent: 'center' }]}>
          <Text>({NB}</Text>
          <Fill value={d.fullName} width="5.5cm" />
          <Text>{NB})</Text>
        </View>

        {/* ความเห็นผู้บังคับบัญชา */}
        <View style={s.opinionWrap}>
          <View style={s.opinionCol}>
            <Text>{pad('ความเห็นหัวหน้าหน่วยงาน/หัวหน้าตึก')}</Text>
            <OpinionBody o={d.unitHead} />
          </View>

          <View style={s.opinionCol}>
            <View style={s.row}>
              <Text>{pad('ความเห็นหัวหน้ากลุ่มงาน')}</Text>
              <Fill value="" width="3cm" />
            </View>
            <OpinionBody o={d.majorHead} />
          </View>
        </View>

        {/* สถิติการลา + คำสั่ง */}
        <View style={s.footWrap}>
          <View style={s.statCol}>
            <Text style={s.statTitle}>{pad('สถิติการลาในปีงบประมาณนี้')}</Text>
            <View style={s.statTable}>
              <View style={s.statCell}>
                <Text style={s.statHead}>{pad('ลามาแล้ว')}{'\n'}{pad('(วันทำการ)')}</Text>
                <Text style={s.statValue}>{pad(d.statPrior)}</Text>
              </View>
              <View style={s.statCell}>
                <Text style={s.statHead}>{pad('ลาครั้งนี้')}{'\n'}{pad('(วันทำการ)')}</Text>
                <Text style={s.statValue}>{pad(d.statThis)}</Text>
              </View>
              <View style={s.statCellLast}>
                <Text style={s.statHead}>{pad('รวมเป็น')}{'\n'}{pad('(วันทำการ)')}</Text>
                <Text style={s.statValue}>{pad(d.statTotal)}</Text>
              </View>
            </View>

            <View style={[s.row, { marginTop: 10 }]}>
              <Text>(ลงชื่อ){NB}</Text>
              <Fill value="" width="4cm" />
              <Text>{NB}{pad('ผู้ตรวจสอบ')}</Text>
            </View>
            <View style={s.row}>
              <Text>ตำแหน่ง{NB}</Text>
              <Fill value="" width="4.6cm" />
            </View>
            <View style={s.row}>
              <Text>วันที่{NB}</Text>
              <Fill value="" width="4.6cm" />
            </View>
          </View>

          {/* กล่องคำสั่งอนุญาต — ขั้นสุดท้ายของสายอนุมัติ */}
          <View style={s.orderBox}>
            <View style={s.row}>
              <Text>คำสั่ง{NB.repeat(2)}</Text>
              <Check label="อนุญาต" on={d.order.approved === true} />
              <Check label="ไม่อนุญาต" on={d.order.approved === false} />
            </View>
            <View style={s.dotted} />
            <View style={s.dotted} />
            <View style={[s.row, { marginTop: 6 }]}>
              <Text>(ลงชื่อ){NB}</Text>
              <Fill value={d.order.name} width="4cm" />
            </View>
            <View style={s.row}>
              <Text>ตำแหน่ง{NB}</Text>
              <Fill value={d.order.position} width="4.2cm" />
            </View>
            <View style={s.row}>
              <Text>วันที่{NB}</Text>
              <Fill value={d.order.date} width="4.2cm" />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/** ตัวแสดงผลในโมดัล — react-pdf ทำงานเฉพาะฝั่ง client เท่านั้น */
const LeaveFormPDF = ({ data }: { data: LeaveFormData }) => (
  <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar>
    <LeaveFormDocument d={data} />
  </PDFViewer>
)

export default LeaveFormPDF
