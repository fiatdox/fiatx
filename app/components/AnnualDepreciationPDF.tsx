'use client'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer } from '@react-pdf/renderer'
import { withBase } from '@/app/lib/basePath'

// ─── Font ─────────────────────────────────────────────────────────────────────
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: withBase('/fonts/Sarabun/Sarabun-Regular.ttf'), fontWeight: 'normal' },
    { src: withBase('/fonts/Sarabun/Sarabun-Bold.ttf'), fontWeight: 'bold' },
  ],
})
Font.registerHyphenationCallback(word => [word])

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AnnualDepreciationRow {
  category: string
  count: string
  cost: string
  opening: string
  expense: string
  closing: string
  nbv: string
}

/** ค่าเสื่อมของเดือนหนึ่ง ๆ ภายในงวด — ใช้เฉพาะรายงานรายงวด */
export interface MonthlyDepreciationRow {
  month: string      // เช่น ต.ค. 2569
  days: string       // ช่วงวันที่ที่คิดในเดือนนั้น
  count: string      // จำนวนรายการที่มีค่าเสื่อมในเดือนนั้น
  expense: string    // ค่าเสื่อมราคาของเดือนนั้น
  closing: string    // ค่าเสื่อมสะสมถึงสิ้นเดือน
  nbv: string        // มูลค่าสุทธิสิ้นเดือน
}

export interface AnnualDepreciationData {
  orgName: string
  registryLabel: string   // ทะเบียนต้นทาง เช่น ทะเบียนครุภัณฑ์ (ระบบเดิม V3)
  fiscalYear: string      // ปีงบประมาณ พ.ศ.
  /** หัวรายงาน — ไม่ส่งมาจะใช้ข้อความรายปีตามเดิม (รายงานรายงวดส่ง 'ประจำเดือน...' มาแทน) */
  heading?: string
  /** งวดที่คิด เช่น '1 ต.ค. 2568 – 31 ธ.ค. 2568' พิมพ์ต่อท้ายบรรทัดชื่อหน่วยงาน */
  periodText?: string
  /** ตารางแยกรายเดือนภายในงวด — ไม่ส่งมาก็ไม่พิมพ์ */
  monthly?: MonthlyDepreciationRow[]
  /** ยอดรวมของตารางรายเดือน */
  monthlyTotal?: MonthlyDepreciationRow
  /** กล่องสรุปยอดรวมใต้หัวรายงาน — ไม่ส่งมาก็ไม่พิมพ์ */
  summary?: { label: string; value: string }[]
  /** แทนชื่อหัวคอลัมน์บางคอลัมน์ — รายงานรายงวดใช้คำว่า "งวด" แทน "ปี" */
  columnTitles?: Partial<Record<keyof AnnualDepreciationRow, string>>
  /** เก็บไว้ให้ผู้เรียกส่งมาได้ แต่ไม่พิมพ์ลงหน้ารายงานแล้ว (หัวรายงานเอาออกตามที่ขอ) */
  periodLabel?: string
  basisLabel?: string
  rows: AnnualDepreciationRow[]
  total: AnnualDepreciationRow
  preparedBy?: string
  preparedByPosition?: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BORDER = '#000'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 10,
    padding: '0.9cm 1.2cm',
    color: '#000',
    backgroundColor: '#fff',
  },
  title: { fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  subTitle: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  meta2: { fontSize: 9, textAlign: 'center', marginTop: 1, marginBottom: 12, color: '#333' },

  summaryRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  summaryBox: {
    flex: 1,
    border: `1px solid ${BORDER}`,
    padding: '5px 6px',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 8, color: '#333' },
  summaryValue: { fontSize: 11, fontWeight: 'bold', marginTop: 1 },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginTop: 14, marginBottom: 4 },

  table: { borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` },
  tr: { flexDirection: 'row' },
  th: {
    borderRight: `1px solid ${BORDER}`,
    borderBottom: `1px solid ${BORDER}`,
    padding: '6px 4px',
    textAlign: 'center',
    fontWeight: 'bold',
    justifyContent: 'center',
  },
  td: {
    borderRight: `1px solid ${BORDER}`,
    borderBottom: `1px solid ${BORDER}`,
    padding: '5px 4px',
    justifyContent: 'center',
  },
  cCenter: { textAlign: 'center' },
  cRight: { textAlign: 'right' },
  totalRow: { backgroundColor: '#f0f0f0', fontWeight: 'bold' },

  printedBy: {
    position: 'absolute', bottom: '0.5cm', left: '1.2cm', fontSize: 8, color: '#555',
  },
  pageNum: {
    position: 'absolute', bottom: '0.5cm', right: '1.2cm', fontSize: 8, color: '#555',
  },
})

const COLS: { key: keyof AnnualDepreciationRow; title: string; w: number; align: 'left' | 'center' | 'right' }[] = [
  { key: 'category', title: 'หมวดครุภัณฑ์',                w: 19, align: 'left' },
  { key: 'count',    title: 'จำนวน\n(รายการ)',              w: 9,  align: 'right' },
  { key: 'cost',     title: 'ราคาทุนรวม',                   w: 14, align: 'right' },
  { key: 'opening',  title: 'ค่าเสื่อมสะสม\nยกมาต้นปี',      w: 13, align: 'right' },
  { key: 'expense',  title: 'ค่าเสื่อมราคา\nประจำปี',        w: 13, align: 'right' },
  { key: 'closing',  title: 'ค่าเสื่อมสะสม\nปลายปี',         w: 13, align: 'right' },
  { key: 'nbv',      title: 'มูลค่าสุทธิ\nปลายปี',           w: 14, align: 'right' },
]

// คอลัมน์ลำดับไม่ได้มาจากข้อมูลในแถว จึงเรนเดอร์แยกจาก COLS
const SEQ_W = 5

const MONTH_COLS: { key: keyof MonthlyDepreciationRow; title: string; w: number; align: 'left' | 'center' | 'right' }[] = [
  { key: 'month',   title: 'เดือน',              w: 15, align: 'left' },
  { key: 'days',    title: 'ช่วงวันที่ที่คิด',     w: 20, align: 'center' },
  { key: 'count',   title: 'จำนวนรายการ\nที่มีค่าเสื่อม', w: 12, align: 'right' },
  { key: 'expense', title: 'ค่าเสื่อมราคา\nในเดือน',  w: 16, align: 'right' },
  { key: 'closing', title: 'ค่าเสื่อมสะสม\nสิ้นเดือน',  w: 16, align: 'right' },
  { key: 'nbv',     title: 'มูลค่าสุทธิ\nสิ้นเดือน',    w: 16, align: 'right' },
]

const alignStyle = (a: 'left' | 'center' | 'right') =>
  a === 'center' ? [s.cCenter] : a === 'right' ? [s.cRight] : []

// react-pdf วัดความกว้างข้อความไทยพลาดไปเล็กน้อย ตัวสุดท้ายเลยโดนตัด
// ต้องใช้ NBSP เพราะเว้นวรรคธรรมดาถูกตัดทิ้งตอนจัดบรรทัด
const NB = ' '
const pad = (t: string, align: 'left' | 'center' | 'right' = 'left') =>
  align === 'center' ? NB.repeat(2) + t + NB.repeat(2) : t + NB.repeat(3)

const Row = ({ row, seq, total }: { row: AnnualDepreciationRow; seq?: number; total?: boolean }) => (
  <View style={[s.tr, ...(total ? [s.totalRow] : [])]} wrap={false}>
    <View style={[s.td, { width: `${SEQ_W}%` }]}>
      <Text style={[s.cCenter, ...(total ? [{ fontWeight: 'bold' as const }] : [])]}>
        {seq ? pad(String(seq), 'center') : ''}
      </Text>
    </View>
    {COLS.map(c => (
      <View key={c.key} style={[s.td, { width: `${c.w}%` }]}>
        <Text style={[...alignStyle(c.align), ...(total ? [{ fontWeight: 'bold' as const }] : [])]}>
          {row[c.key] ? pad(String(row[c.key]), c.align) : ''}
        </Text>
      </View>
    ))}
  </View>
)

const MonthRow = ({ row, seq, total }: { row: MonthlyDepreciationRow; seq?: number; total?: boolean }) => (
  <View style={[s.tr, ...(total ? [s.totalRow] : [])]} wrap={false}>
    <View style={[s.td, { width: `${SEQ_W}%` }]}>
      <Text style={[s.cCenter, ...(total ? [{ fontWeight: 'bold' as const }] : [])]}>
        {seq ? pad(String(seq), 'center') : ''}
      </Text>
    </View>
    {MONTH_COLS.map(c => (
      <View key={c.key} style={[s.td, { width: `${c.w}%` }]}>
        <Text style={[...alignStyle(c.align), ...(total ? [{ fontWeight: 'bold' as const }] : [])]}>
          {row[c.key] ? pad(String(row[c.key]), c.align) : ''}
        </Text>
      </View>
    ))}
  </View>
)

// ─── Document ─────────────────────────────────────────────────────────────────
export function AnnualDepreciationDocument({ data }: { data: AnnualDepreciationData }) {
  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })

  return (
    <Document title={data.heading || `สรุปค่าเสื่อมราคาประจำปี ${data.fiscalYear}`}>
      <Page size="A4" orientation="landscape" style={s.page} wrap>
        {/* ตัวท้ายบรรทัดโดน react-pdf ตัดสระบน จึงต้องเผื่อ NBSP ท้ายข้อความเสมอ */}
        <Text style={s.title}>{pad(data.heading || 'รายงานสรุปค่าเสื่อมราคาครุภัณฑ์ประจำปี', 'center')}</Text>
        <Text style={s.subTitle}>
          {data.orgName} · ปีงบประมาณ {data.fiscalYear}
          {data.periodText ? ` · งวด ${data.periodText}` : ''}
        </Text>
        <Text style={s.meta2}>ข้อมูลจาก{data.registryLabel}</Text>

        {data.summary && data.summary.length > 0 && (
          <View style={s.summaryRow} wrap={false}>
            {data.summary.map(b => (
              <View key={b.label} style={s.summaryBox}>
                <Text style={s.summaryLabel}>{pad(b.label)}</Text>
                <Text style={s.summaryValue}>{pad(b.value)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.table}>
          <View style={s.tr} fixed>
            <View style={[s.th, { width: `${SEQ_W}%` }]}>
              <Text>{pad('ลำดับ', 'center')}</Text>
            </View>
            {COLS.map(c => (
              <View key={c.key} style={[s.th, { width: `${c.w}%` }]}>
                <Text>{pad(data.columnTitles?.[c.key] ?? c.title, 'center')}</Text>
              </View>
            ))}
          </View>

          {data.rows.map((r, i) => <Row key={r.category} row={r} seq={i + 1} />)}
          <Row row={data.total} total />
        </View>

        {data.monthly && data.monthly.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{pad('แยกค่าเสื่อมราคาตามเดือนภายในงวด')}</Text>
            <View style={s.table}>
              <View style={s.tr} fixed>
                <View style={[s.th, { width: `${SEQ_W}%` }]}>
                  <Text>{pad('ลำดับ', 'center')}</Text>
                </View>
                {MONTH_COLS.map(c => (
                  <View key={c.key} style={[s.th, { width: `${c.w}%` }]}>
                    <Text>{pad(c.title, 'center')}</Text>
                  </View>
                ))}
              </View>
              {data.monthly.map((r, i) => <MonthRow key={r.month} row={r} seq={i + 1} />)}
              {data.monthlyTotal && <MonthRow row={data.monthlyTotal} total />}
            </View>
          </>
        )}

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
export default function AnnualDepreciationPDFViewer({ data }: { data: AnnualDepreciationData }) {
  return (
    <PDFViewer width="100%" showToolbar style={{ border: 'none', flex: 1, minHeight: 560 }}>
      <AnnualDepreciationDocument data={data} />
    </PDFViewer>
  )
}
