'use client'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer } from '@react-pdf/renderer'

// ─── Font ─────────────────────────────────────────────────────────────────────
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun/Sarabun-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Sarabun/Sarabun-Bold.ttf', fontWeight: 'bold' },
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

export interface AnnualDepreciationData {
  orgName: string
  registryLabel: string   // ทะเบียนต้นทาง เช่น ทะเบียนครุภัณฑ์ (ระบบเดิม V3)
  fiscalYear: string      // ปีงบประมาณ พ.ศ.
  periodLabel: string     // 1 ต.ค. 2568 – 30 ก.ย. 2569
  basisLabel: string      // เกณฑ์รายวัน / เกณฑ์นับเดือน (GFMIS)
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
  meta: { fontSize: 9, textAlign: 'center', marginTop: 2, color: '#333' },
  meta2: { fontSize: 9, textAlign: 'center', marginTop: 1, marginBottom: 12, color: '#333' },

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
  { key: 'category', title: 'หมวดครุภัณฑ์',                w: 24, align: 'left' },
  { key: 'count',    title: 'จำนวน\n(รายการ)',              w: 9,  align: 'right' },
  { key: 'cost',     title: 'ราคาทุนรวม',                   w: 14, align: 'right' },
  { key: 'opening',  title: 'ค่าเสื่อมสะสม\nยกมาต้นปี',      w: 13, align: 'right' },
  { key: 'expense',  title: 'ค่าเสื่อมราคา\nประจำปี',        w: 13, align: 'right' },
  { key: 'closing',  title: 'ค่าเสื่อมสะสม\nปลายปี',         w: 13, align: 'right' },
  { key: 'nbv',      title: 'มูลค่าสุทธิ\nปลายปี',           w: 14, align: 'right' },
]

const alignStyle = (a: 'left' | 'center' | 'right') =>
  a === 'center' ? [s.cCenter] : a === 'right' ? [s.cRight] : []

// react-pdf วัดความกว้างข้อความไทยพลาดไปเล็กน้อย ตัวสุดท้ายเลยโดนตัด
// ต้องใช้ NBSP เพราะเว้นวรรคธรรมดาถูกตัดทิ้งตอนจัดบรรทัด
const NB = ' '
const pad = (t: string, align: 'left' | 'center' | 'right' = 'left') =>
  align === 'center' ? NB.repeat(2) + t + NB.repeat(2) : t + NB.repeat(3)

const Row = ({ row, total }: { row: AnnualDepreciationRow; total?: boolean }) => (
  <View style={[s.tr, ...(total ? [s.totalRow] : [])]} wrap={false}>
    {COLS.map(c => (
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
    <Document title={`สรุปค่าเสื่อมราคาประจำปี ${data.fiscalYear}`}>
      <Page size="A4" orientation="landscape" style={s.page} wrap>
        <Text style={s.title}>รายงานสรุปค่าเสื่อมราคาครุภัณฑ์ประจำปี</Text>
        <Text style={s.subTitle}>{data.orgName} · ปีงบประมาณ {data.fiscalYear}</Text>
        <Text style={s.meta}>
          {data.periodLabel} · คิดค่าเสื่อมด้วย{data.basisLabel} · แสดงเฉพาะครุภัณฑ์ที่ยังคิดค่าเสื่อมในปีงบนี้
        </Text>
        <Text style={s.meta2}>ข้อมูลจาก{data.registryLabel}</Text>

        <View style={s.table}>
          <View style={s.tr} fixed>
            {COLS.map(c => (
              <View key={c.key} style={[s.th, { width: `${c.w}%` }]}>
                <Text>{pad(c.title, 'center')}</Text>
              </View>
            ))}
          </View>

          {data.rows.map(r => <Row key={r.category} row={r} />)}
          <Row row={data.total} total />
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
export default function AnnualDepreciationPDFViewer({ data }: { data: AnnualDepreciationData }) {
  return (
    <PDFViewer width="100%" showToolbar style={{ border: 'none', flex: 1, minHeight: 560 }}>
      <AnnualDepreciationDocument data={data} />
    </PDFViewer>
  )
}
