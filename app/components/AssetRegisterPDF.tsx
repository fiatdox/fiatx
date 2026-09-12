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

// ─── Types ────────────────────────────────────────────────────────────────────
/** หนึ่งบรรทัดในตารางทะเบียนคุมทรัพย์สิน — ช่องไหนไม่มีค่าให้ปล่อยว่างไว้ */
export interface AssetRegisterRow {
  date: string          // วัน เดือน ปี (พ.ศ.) เช่น "30 ก.ย. 2563"
  docno?: string        // ที่เอกสาร
  item: string          // รายการ เช่น "คำนวณ 5 เดือน"
  qty?: string          // จำนวนหน่วย
  unitPrice?: string    // ราคาต่อหน่วย/ชุด/กลุ่ม
  total?: string        // มูลค่ารวม
  life?: string         // อายุใช้งาน (ปี)
  rate?: string         // อัตราค่าเสื่อมราคา (%)
  yearAmount?: string   // ค่าเสื่อมราคาประจำปี
  accumulated?: string  // ค่าเสื่อมราคาสะสม
  nbv?: string          // มูลค่าสุทธิ
  note?: string         // หมายเหตุ
  highlight?: boolean   // เน้นแถว (ปีงบปัจจุบัน)
}

export interface AssetRegisterData {
  orgName: string           // ส่วนราชการ
  deptName: string          // หน่วยงาน
  assetType: string         // ประเภทครุภัณฑ์ (hsro_subtype)
  assetCategory: string     // หมวดครุภัณฑ์ (assetcat.catdesc)
  assetCode: string         // รหัสครุภัณฑ์
  itemName: string          // รายการ (ชื่ออุปกรณ์)
  spec: string              // ลักษณะ/คุณสมบัติ
  model: string             // รุ่น
  responsible: string       // สถานที่ตั้ง/หน่วยงานที่รับผิดชอบ
  vendor: string            // ชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค
  address: string           // ที่อยู่
  phone: string             // โทรศัพท์
  moneyType: string         // ประเภทเงิน
  acquireMethod: string     // วิธีได้มา
  fiscalYear: string        // ปีงบประมาณ
  preparedBy?: string       // ผู้จัดทำ (pname+fname+lname ของผู้ที่กำลังพิมพ์)
  preparedByPosition?: string
  rows: AssetRegisterRow[]
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BORDER = '#000'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 9,
    padding: '0.8cm 1cm',
    color: '#000',
    backgroundColor: '#fff',
  },
  title: { fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  orgLine: { textAlign: 'right', marginBottom: 1 },

  // หัวกระดาษ 3 คอลัมน์ ตามแบบทะเบียนคุมทรัพย์สิน
  headGrid: { flexDirection: 'row', marginTop: 8, marginBottom: 10 },
  headCol: { flexGrow: 1, flexBasis: 0, paddingRight: 10 },
  headItem: { flexDirection: 'row', marginBottom: 3 },
  lbl: { color: '#000' },
  val: { flexGrow: 1, flexBasis: 0 },

  // ตาราง
  table: { borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` },
  tr: { flexDirection: 'row' },
  th: {
    borderRight: `1px solid ${BORDER}`,
    borderBottom: `1px solid ${BORDER}`,
    padding: '6px 3px',
    textAlign: 'center',
    fontWeight: 'bold',
    justifyContent: 'center',
  },
  td: {
    borderRight: `1px solid ${BORDER}`,
    borderBottom: `1px solid ${BORDER}`,
    padding: '4px 3px',
    justifyContent: 'center',
  },
  cCenter: { textAlign: 'center' },
  cRight: { textAlign: 'right' },
  rowHi: { backgroundColor: '#fff3e6' },

  printedBy: {
    position: 'absolute', bottom: '0.5cm', left: '1cm', fontSize: 8, color: '#555',
  },
  pageNum: {
    position: 'absolute', bottom: '0.5cm', right: '1cm', fontSize: 8, color: '#555',
  },
})

// ความกว้างคอลัมน์ (รวม = 100)
const COLS: { key: keyof AssetRegisterRow; title: string; w: number; align: 'left' | 'center' | 'right' }[] = [
  { key: 'date',        title: 'วัน เดือน ปี',                 w: 8,  align: 'center' },
  { key: 'docno',       title: 'ที่เอกสาร',                     w: 8,  align: 'center' },
  { key: 'item',        title: 'รายการ',                       w: 19, align: 'left' },
  { key: 'qty',         title: 'จำนวน\nหน่วย',                  w: 5,  align: 'center' },
  { key: 'unitPrice',   title: 'ราคาต่อ\nหน่วย/ชุด/กลุ่ม',        w: 9,  align: 'right' },
  { key: 'total',       title: 'มูลค่ารวม',                     w: 9,  align: 'right' },
  { key: 'life',        title: 'อายุ\nใช้งาน',                   w: 4,  align: 'center' },
  { key: 'rate',        title: 'อัตราค่า\nเสื่อมราคา',            w: 5,  align: 'center' },
  { key: 'yearAmount',  title: 'ค่าเสื่อมราคา\nประจำปี',          w: 9,  align: 'right' },
  { key: 'accumulated', title: 'ค่าเสื่อมราคา\nสะสม',            w: 9,  align: 'right' },
  { key: 'nbv',         title: 'มูลค่าสุทธิ',                    w: 9,  align: 'right' },
  { key: 'note',        title: 'หมายเหตุ',                      w: 6,  align: 'center' },
]

const alignStyle = (a: 'left' | 'center' | 'right') =>
  a === 'center' ? s.cCenter : a === 'right' ? s.cRight : undefined

// react-pdf วัดความกว้างข้อความไทยพลาดไปเล็กน้อย ตัวสุดท้ายเลยโดนตัด ("เดือน" → "เดือ")
// กันไว้ด้วยการเติมช่องว่างท้ายข้อความ — ต้องใช้ NBSP เพราะเว้นวรรคธรรมดาถูกตัดทิ้งตอนจัดบรรทัด
const NB = ' '
const pad = (t: string, align: 'left' | 'center' | 'right' = 'left') =>
  align === 'center' ? NB.repeat(2) + t + NB.repeat(2) : t + NB.repeat(4)

const HeadItem = ({ label, value }: { label: string; value: string }) => (
  <View style={s.headItem}>
    <Text style={s.lbl}>{label} : </Text>
    <Text style={s.val}>{pad(value || '-')}</Text>
  </View>
)

// ─── Document ─────────────────────────────────────────────────────────────────
export function AssetRegisterDocument({ data }: { data: AssetRegisterData }) {
  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })

  return (
    <Document title={`ทะเบียนคุมทรัพย์สิน ${data.assetCode}`}>
      <Page size="A4" orientation="landscape" style={s.page} wrap>
        <Text style={s.title}>ทะเบียนคุมทรัพย์สิน</Text>
        <Text style={s.orgLine}>ส่วนราชการ : {data.orgName}</Text>
        <Text style={s.orgLine}>หน่วยงาน : {data.deptName || '-'}</Text>

        <View style={s.headGrid}>
          <View style={s.headCol}>
            <HeadItem label="หมวดครุภัณฑ์" value={data.assetCategory} />
            <HeadItem label="ประเภทครุภัณฑ์" value={data.assetType} />
            <HeadItem label="รุ่น" value={data.model} />
            <HeadItem label="ที่อยู่" value={data.address} />
            <HeadItem label="ประเภทเงิน" value={data.moneyType} />
          </View>
          <View style={s.headCol}>
            <HeadItem label="รหัสครุภัณฑ์" value={data.assetCode} />
            <HeadItem label="รายการ" value={data.itemName} />
            <HeadItem label="สถานที่ตั้ง/หน่วยงานที่รับผิดชอบ" value={data.responsible} />
            <HeadItem label="โทรศัพท์" value={data.phone} />
            <HeadItem label="วิธีได้มา" value={data.acquireMethod} />
          </View>
          <View style={s.headCol}>
            <HeadItem label="ลักษณะ/คุณสมบัติ" value={data.spec} />
            <HeadItem label="ชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค" value={data.vendor} />
            <HeadItem label="ปีงบประมาณ" value={data.fiscalYear} />
          </View>
        </View>

        {/* ── ตาราง ── */}
        <View style={s.table}>
          <View style={s.tr} fixed>
            {COLS.map(c => (
              <View key={c.key} style={[s.th, { width: `${c.w}%` }]}>
                <Text>{pad(c.title, 'center')}</Text>
              </View>
            ))}
          </View>

          {data.rows.map((r, i) => (
            <View key={i} style={[s.tr, ...(r.highlight ? [s.rowHi] : [])]} wrap={false}>
              {COLS.map(c => (
                <View key={c.key} style={[s.td, { width: `${c.w}%` }]}>
                  <Text style={alignStyle(c.align)}>
                    {r[c.key] ? pad(String(r[c.key]), c.align) : ''}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Text style={s.printedBy} fixed>
          {pad(`ผู้พิมพ์ : ${data.preparedBy || '-'}${data.preparedByPosition ? ` (${data.preparedByPosition})` : ''} · พิมพ์เมื่อ ${printedAt}`)}
        </Text>

        <Text
          style={s.pageNum}
          render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}

// ─── Default export: PDFViewer wrapper (เป้าหมายของ dynamic import) ──────────
export default function AssetRegisterPDFViewer({ data }: { data: AssetRegisterData }) {
  return (
    <PDFViewer width="100%" showToolbar style={{ border: 'none', flex: 1, minHeight: 560 }}>
      <AssetRegisterDocument data={data} />
    </PDFViewer>
  )
}
