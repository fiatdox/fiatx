'use client'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer } from '@react-pdf/renderer'

// ---- Type (mirrors VehicleRequest in the page) ----
export interface VehicleRequestForPDF {
  id: string
  requestDate: string
  dateFrom: string
  dateTo: string
  projectName: string
  destination: string
  purpose: string
  passengerCount: number
  passengerNames: string[]
  needDriver: boolean
  vehicle?: string
  driver?: string
  documentFiles?: { name: string; size?: number }[]
}

// ---- Font registration ----
Font.register({
  family: 'Sarabun',
  fonts: [
    {
      src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf',
      fontWeight: 'normal',
    },
    {
      src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf',
      fontWeight: 'bold',
    },
  ],
})

// Disable hyphenation (important for Thai text)
Font.registerHyphenationCallback(word => [word])

// ---- Styles ----
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 12,
    padding: '2cm',
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  centerBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#555',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    marginVertical: 10,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    color: '#374151',
  },
  value: {
    flex: 1,
    color: '#111827',
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 6,
    color: '#1f2937',
  },
  table: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  cellNo: {
    width: 40,
    padding: '4 6',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    textAlign: 'center',
    fontSize: 10,
  },
  cellName: {
    flex: 1,
    padding: '4 6',
    fontSize: 10,
  },
  approvalBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 4,
    padding: '8 12',
    marginBottom: 12,
  },
  approvalTitle: {
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 6,
  },
  signatureRow: {
    flexDirection: 'row',
    marginTop: 32,
  },
  signatureBlock: {
    flex: 1,
    alignItems: 'center',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    width: '80%',
    marginBottom: 6,
    paddingBottom: 24,
  },
  signatureLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: '1.5cm',
    left: '2cm',
    right: '2cm',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

// ---- PDF Document Component ----
export const VehicleRequestDocument = ({ req }: { req: VehicleRequestForPDF }) => (
  <Document
    title={`ใบอนุมัติใช้รถราชการ ${req.id}`}
    author="ระบบบริหารงานทั่วไป"
    language="th"
  >
    <Page size="A4" style={styles.page}>

      {/* Header */}
      <View style={styles.centerBlock}>
        <Text style={styles.title}>บันทึกข้อความ</Text>
        <Text style={styles.subtitle}>ใบอนุมัติการใช้รถราชการ — โรงพยาบาลส่งเสริมสุขภาพตำบล</Text>
      </View>

      <View style={styles.divider} />

      {/* Request Info */}
      <View style={{ marginBottom: 12 }}>
        <View style={styles.infoGrid}>
          <Text style={styles.label}>เลขที่คำขอ</Text>
          <Text style={styles.value}>{req.id}</Text>
          <Text style={[styles.label, { width: 60 }]}>วันที่ขอ</Text>
          <Text style={styles.value}>{req.requestDate}</Text>
        </View>
        <View style={styles.infoGrid}>
          <Text style={styles.label}>ชื่อโครงการ</Text>
          <Text style={styles.value}>{req.projectName}</Text>
        </View>
        <View style={styles.infoGrid}>
          <Text style={styles.label}>วันที่เดินทาง</Text>
          <Text style={styles.value}>ไป: {req.dateFrom}   กลับ: {req.dateTo}</Text>
        </View>
        <View style={styles.infoGrid}>
          <Text style={styles.label}>สถานที่ปลายทาง</Text>
          <Text style={styles.value}>{req.destination}</Text>
        </View>
        <View style={styles.infoGrid}>
          <Text style={styles.label}>วัตถุประสงค์</Text>
          <Text style={styles.value}>{req.purpose}</Text>
        </View>
        <View style={styles.infoGrid}>
          <Text style={styles.label}>ต้องการคนขับ</Text>
          <Text style={styles.value}>{req.needDriver ? 'ต้องการพนักงานขับรถ' : 'ไม่ต้องการ (เจ้าหน้าที่ขับเอง)'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Passengers */}
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.sectionTitle}>ผู้ร่วมเดินทาง ({req.passengerCount} คน)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellNo, { fontWeight: 'bold' }]}>ลำดับ</Text>
            <Text style={[styles.cellName, { fontWeight: 'bold' }]}>ชื่อ-นามสกุล</Text>
          </View>
          {req.passengerNames.map((name, i) => (
            <View
              key={i}
              style={i === req.passengerNames.length - 1 ? styles.tableRowLast : styles.tableRow}
            >
              <Text style={styles.cellNo}>{i + 1}</Text>
              <Text style={styles.cellName}>{name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Approval Info */}
      <View style={styles.approvalBox}>
        <Text style={styles.approvalTitle}>รถและคนขับที่ได้รับอนุมัติ</Text>
        <View style={styles.infoGrid}>
          <Text style={[styles.label, { color: '#166534' }]}>รถที่ได้รับ</Text>
          <Text style={styles.value}>{req.vehicle ?? '—'}</Text>
        </View>
        <View style={styles.infoGrid}>
          <Text style={[styles.label, { color: '#166534' }]}>คนขับ</Text>
          <Text style={styles.value}>{req.driver ?? '—'}</Text>
        </View>
      </View>

      {/* Signatures */}
      <View style={styles.divider} />
      <View style={styles.signatureRow}>
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>(............................................)</Text>
          <Text style={styles.signatureLabel}>ผู้ขอ</Text>
          <Text style={[styles.signatureLabel, { marginTop: 4 }]}>วันที่ ............/............/............</Text>
        </View>
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>(............................................)</Text>
          <Text style={styles.signatureLabel}>ผู้อนุมัติ</Text>
          <Text style={[styles.signatureLabel, { marginTop: 4 }]}>วันที่ ............/............/............</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>ระบบบริหารงานทั่วไป — ใบอนุมัติการใช้รถราชการ</Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `หน้า ${pageNumber}/${totalPages}`} />
      </View>

    </Page>
  </Document>
)

// ---- Modal Content: Viewer (exported for dynamic import) ----
export default function VehicleRequestPDFPreview({ req }: { req: VehicleRequestForPDF }) {
  return (
    <PDFViewer width="100%" showToolbar style={{ border: 'none', borderRadius: 6, display: 'flex', flex: 1, minHeight: 0 } as any}>
      <VehicleRequestDocument req={req} />
    </PDFViewer>
  )
}
