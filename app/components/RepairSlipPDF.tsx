'use client'
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
Font.registerHyphenationCallback(word => [word])

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
  boxBottom: { flexDirection: 'row', borderTop: '1px solid #000' },
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
    <Text style={s.cb}>{on ? '( / )' : '(    )'}</Text>
    <Text>{label}</Text>
  </View>
)

const Fill = ({ v, flex, last, center }: { v?: string; flex?: number; last?: boolean; center?: boolean }) => (
  <Text style={[s.fill, last ? s.fillLast : {}, flex ? { flex } : {}, center ? { textAlign: 'center' } : {}]}>{v ?? ' '}</Text>
)

// ─── Document ─────────────────────────────────────────────────────────────────
function RepairSlipDocument({ data }: { data: RepairSlipData }) {
  // ประเภทงานซ่อม — ติ๊กตามประเภทอุปกรณ์
  const isPrinter  = /พิมพ์|ปริ้น|printer/i.test(data.equipmentTypeLabel + data.deviceBrand)
  const isComputer = !isPrinter

  // (1) บันทึกของหน่วยงานซ่อมบำรุง — ติ๊กตามผลการดำเนินงาน
  const fixedNoParts = data.status === 'completed' && !data.prNote && !data.replacementNote
  const fixedParts   = !!data.prNote || data.status === 'waiting_pr'
  const cannotFix    = !!data.replacementNote || data.status === 'recommend_replacement'

  return (
    <Document title={`ใบส่งซ่อม ${data.id}`}>
      <Page size="A4" style={s.page}>

        {/* ── แถวบนสุด: ชื่อฟอร์ม + หัวบันทึก (ซ้าย) | กล่องธุรการ (ขวา) ── */}
        <View style={s.topRow}>
          <View style={s.topLeft}>
            <Text style={s.formTitle}>ใบส่งซ่อมบำรุงครุภัณฑ์คอมพิวเตอร์&nbsp;</Text>
            <View style={s.row}>
              <Text style={s.lbl}>ส่วนราชการ</Text>
              <Text style={s.lbl}>ตึกผู้ป่วย / ฝ่าย / กลุ่มงาน</Text>
              <Fill v={data.department} last />
            </View>
            <View style={s.row}>
              <Text style={s.lbl}>ใบส่งซ่อมที่</Text>
              <Fill v={data.id} />
              <Text style={s.lbl}>วันที่</Text>
              <Fill v={data.requestDate} last />
            </View>
            <View style={s.row}>
              <Text style={s.lbl}>เรื่อง</Text>
              <Text>ขออนุมัติซ่อมบำรุงครุภัณฑ์คอมพิวเตอร์ &nbsp;</Text>
            </View>
            <View style={[s.row, { marginBottom: 0 }]}>
              <Text style={s.lbl}>เรียน</Text>
              <Text>ผู้อำนวยการโรงพยาบาล &nbsp;</Text>
            </View>
          </View>
          <View style={s.regBox}>
            <Text style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: 3 }}>
              ธุรการงานซ่อมกลุ่มงานเทคโนโลยีสารสนเทศ
            </Text>
            <View style={s.row}>
              <Text style={s.lbl}>เลขที่</Text>
              <Fill v={data.id} />
              <Text style={s.lbl}>/</Text>
              <Fill last />
            </View>
            <View style={[s.row, { marginBottom: 0 }]}>
              <Text style={s.lbl}>วันที่</Text>
              <Fill v={data.requestDate} last />
            </View>
          </View>
        </View>

        {/* ── เนื้อความ ── */}
        <View style={[s.row, s.indent]}>
          <Text style={s.lbl}>ด้วยฝ่าย/งาน</Text>
          <Fill v={data.department} />&nbsp;
          <Text> มีความประสงค์ทำการซ่อมบำรุง &nbsp;</Text>
        </View>
        <View style={[s.row, { marginBottom: 6 }]}>

          <CB on={isPrinter} label="ซ่อมปริ้นเตอร์" />
          <CB on={isComputer} label="ซ่อมคอมพิวเตอร์ / เปลี่ยนอะไหล่" />
          <Text>ตามรายการต่อไปนี้</Text>
        </View>

        {/* รายการครุภัณฑ์ที่ส่งซ่อม — 1 ใบ ต่อ 1 รายการ */}
        <View style={s.row}>
          <Text style={s.lbl}>ชื่อครุภัณฑ์&nbsp;</Text>
          <Fill v={`${data.deviceBrand} (${data.equipmentTypeLabel}) `} flex={3} />
          <Text style={s.lbl}>รหัสครุภัณฑ์</Text>
          <Fill v={data.assetNo} flex={1} last />
        </View>
        <View style={s.row}>
          <Text style={s.lbl}>อาการเสีย&nbsp;</Text>
          <Fill v={`${data.symptom} `} last />
        </View>

        <Text style={[s.indent, { marginTop: 4 }]}>จึงเรียนมาเพื่อพิจารณาดำเนินการต่อไป&nbsp;</Text>

        {/* ลงชื่อผู้ส่งซ่อม */}
        <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
          <View style={[s.row, { width: 260 }]}>
            <Text style={s.lbl}>(ลงชื่อ)</Text>
            <Fill v={data.requesterName+' '} center />
            <Text>ผู้ส่งซ่อม </Text>
          </View>
          <View style={[s.row, { width: 260 }]}>
            <Text style={s.lbl}>ตำแหน่ง </Text>
            <Fill v={data.position} last />
          </View>
        </View>

        {/* ══ กล่องส่วนล่าง ══ */}
        <View style={s.box}>
          <View style={s.boxRow}>

            {/* (1) บันทึกของหน่วยงานซ่อมบำรุง */}
            <View style={s.cellLeft}>
              <Text style={s.secTitle}>(1) บันทึกของหน่วยงานซ่อมบำรุงคอมพิวเตอร์ </Text>
              <View style={{ marginBottom: 2 }}><CB on={fixedNoParts} label="ซ่อมได้ ไม่เบิกวัสดุ" /></View>
              <View style={{ marginBottom: 2 }}><CB on={fixedParts} label="ซ่อมได้ เบิกวัสดุ" /></View>
              <View style={{ marginBottom: 4 }}><CB on={cannotFix} label="ซ่อมไม่ได้ ขอซื้อใหม่ทดแทน" /></View>

              {/* ความเห็นของช่าง */}
              <Text style={[s.lbl, { marginBottom: 2 }]}>ความเห็นของช่าง</Text>
              <View style={[s.row, { marginBottom: 3 }]}><Fill v={data.technicianNote} last /></View>
              <View style={[s.row, { marginBottom: 3 }]}><Fill last /></View>

              {/* รายการที่ต้องการขอซื้อ */}
              <Text style={[s.lbl, { marginTop: 4, marginBottom: 2 }]}>รายการที่ต้องการขอซื้อ</Text>
              <View style={[s.row, { marginBottom: 3 }]}><Fill v={data.prNote ?? data.replacementNote} last /></View>
              <View style={[s.row, { marginBottom: 3 }]}><Fill last /></View>
              <View style={[s.row, { marginBottom: 3 }]}><Fill last /></View>

              <View style={[s.sigRow, { justifyContent: 'flex-end' }]}>
                <Text style={s.lbl}>ลงชื่อ </Text>
                <Fill v={data.assignedTo} flex={2} center />
                <Text>ผู้ซ่อมบำรุง </Text>
              </View>
            </View>

            {/* เรียน ผอ. + (2) ความเห็นและคำสั่ง */}
            <View style={s.cellRight}>
              <Text style={s.secTitle}>เรียน ผู้อำนวยการ </Text>
              <Text style={[s.indent, { marginLeft: 20, marginBottom: 8 }]}>เพื่อโปรดพิจารณา</Text>
              <View style={s.sigCenter}>
                <View style={[s.row, { width: 200 }]}>
                  <Text style={s.lbl}>(ลงชื่อ)</Text>
                  <Fill last />
                </View>
                <Text>นายไกรรัตน์ คำดี </Text>
                <Text>นายแพทย์ชำนาญการ </Text>
                <Text style={s.small}>วันที่ ........../........../..........</Text>
              </View>

              <View style={{ borderTop: '1px solid #000', marginTop: 8, paddingTop: 6 }}>
                <Text style={s.secTitle}>(2) ความเห็นและคำสั่ง &nbsp;</Text>
                <View style={{ marginBottom: 2 }}><CB on={false} label="อนุมัติให้ซ่อมได้" /></View>
                <View style={[s.row, { marginBottom: 2 }]}>
                  <Text style={s.cb}>(    )</Text>
                  <Text>อนุมัติให้จัดซื้อ</Text>
                  <Fill />
                  <Text>ซ่อม</Text>
                </View>
                <View style={[s.row, { marginBottom: 4 }]}>
                  <Text style={s.cb}>(    )</Text>
                  <Text>อื่นๆ</Text>
                  <Fill last />
                </View>
                <View style={s.sigCenter}>
                  <View style={[s.row, { width: 200 }]}>
                    <Text style={s.lbl}>(ลงชื่อ)</Text>
                    <Fill last />
                  </View>
                  <Text>(นายธวัชชัย ปานทอง)</Text>
                  <Text>ผู้อำนวยการโรงพยาบาลพะเยา </Text>
                  <Text style={s.small}>วันที่ ........../........../..........</Text>
                </View>
              </View>
            </View>
          </View>

          {/* แถวล่างของกล่อง */}
          <View style={s.boxBottom}>
            <View style={s.cellLeft}>
              <Text style={s.secTitle}>เรียน หัวหน้างานซ่อมบำรุงคอมพิวเตอร์ &nbsp;</Text>
              <Text style={[s.small, { marginBottom: 4 }]}>
                เพื่อพิจารณาดำเนินการ / ตรวจสอบ / เสนอความเห็น&nbsp;
              </Text>
              <View style={[s.row]}><Fill last /></View>
              <View style={[s.row, { marginBottom: 6 }]}><Fill last /></View>
              <View style={s.sigCenter}>
                <View style={[s.row, { width: 200 }]}>
                  <Text style={s.lbl}>(ลงชื่อ)</Text>
                  <Fill last />
                </View>
                <Text>(นางวรางคณา เอื้อหยิ่งศักดิ์)</Text>
                <Text>นักวิชาการคอมพิวเตอร์ปฏิบัติการ</Text>
              </View>
              {/* เส้นคั่นยาวเต็มช่อง — แยกส่วนลงชื่อออกจากหมายเหตุ */}
              <View style={{ borderBottom: '0.7px solid #000', marginTop: 8, marginBottom: 6 }} />
              <View style={s.row}>
                <Text style={[s.lbl, { textDecoration: 'underline' }]}>หมายเหตุ</Text>
                <Text style={s.lbl}>ส่งงานพัสดุดำเนินการวันที่&nbsp;</Text>
                <Fill v={data.prDate} last />
              </View>
              {/* ชื่อผู้รับ/ตำแหน่ง — จัดกึ่งกลางความกว้าง 200 มาตรฐานเดียวกับบล็อกลงชื่อด้านบน */}
              <View style={[s.sigCenter, { marginTop: 4 }]}>
                <View style={[s.row, { width: 200 }]}>
                  <Text style={s.lbl}>ชื่อผู้รับ&nbsp;</Text>
                  <Fill last center />
                </View>
                <View style={[s.row, { width: 200, marginBottom: 0 }]}>
                  <Text style={s.lbl}>ตำแหน่ง&nbsp;</Text>
                  <Fill last center />
                </View>
              </View>
            </View>

            <View style={s.cellRight}>
              <Text style={[s.secTitle, { textAlign: 'center' }]}>ได้ตรวจสอบแล้ว ปรากฏว่า</Text>
              <View style={{ marginBottom: 2 }}>
                <CB on={data.status === 'completed'} label="เรียบร้อยใช้การได้ดี" />
              </View>
              <View style={{ marginBottom: 6 }}>
                <CB on={false} label="ยังไม่เรียบร้อย ใช้การยังไม่ได้" />
              </View>
              <View style={s.sigRow}>
                <Text style={s.lbl}>(ลงชื่อ)</Text>
                <Fill v={data.assignedTo} center />
                <Text>ผู้ซ่อม</Text>
              </View>
              <View style={s.sigRow}>
                <Text style={s.lbl}>(ลงชื่อ)</Text>
                <Fill />
                <Text>ผู้รับ</Text>
              </View>
              <View style={[s.sigRow, { marginBottom: 0 }]}>
                <Text style={[s.lbl, { textDecoration: 'underline' }]}>วันที่แล้วเสร็จ</Text>
                <Fill v={data.resolvedDate} last />
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
