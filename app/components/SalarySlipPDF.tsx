'use client'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer } from '@react-pdf/renderer'

// ─── Font ─────────────────────────────────────────────────────────────────────
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Italic.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
})
Font.registerHyphenationCallback(word => [word])

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SalaryEmployee {
  id: string
  name: string
  position: string
  department: string
  staffType: string
  bankAccount?: string
  bankName?: string
}

export interface SalaryEarning {
  label: string
  amount: number
}

export interface SalaryDeduction {
  label: string
  amount: number
}

export interface SalarySlipData {
  employee: SalaryEmployee
  monthLabel: string       // e.g. "เมษายน พ.ศ. 2569"
  payDate: string          // e.g. "30 เมษายน 2569"
  earnings: SalaryEarning[]
  deductions: SalaryDeduction[]
  totalEarnings: number
  totalDeductions: number
  netSalary: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatNumber = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const numberToThaiText = (num: number): string => {
  const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']
  const [intPart, decPart] = num.toFixed(2).split('.')
  const intNum = parseInt(intPart, 10)

  const readInt = (n: number): string => {
    if (n === 0) return 'ศูนย์'
    if (n >= 1000000) {
      return readInt(Math.floor(n / 1000000)) + 'ล้าน' + (n % 1000000 > 0 ? readInt(n % 1000000) : '')
    }
    let result = ''
    const s = String(n)
    for (let i = 0; i < s.length; i++) {
      const digit = parseInt(s[i], 10)
      const pos = s.length - 1 - i
      if (digit === 0) continue
      if (pos === 0 && digit === 1 && s.length > 1) result += 'เอ็ด'
      else if (pos === 1 && digit === 1) result += 'สิบ'
      else if (pos === 1 && digit === 2) result += 'ยี่สิบ'
      else result += ones[digit] + positions[pos]
    }
    return result
  }

  const intText = readInt(intNum) + 'บาท'
  const dec = parseInt(decPart, 10)
  const decText = dec === 0 ? 'ถ้วน' : readInt(dec) + 'สตางค์'
  return intText + decText
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 9,
    padding: '1.2cm 1.4cm',
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  // Header
  headerBand: {
    backgroundColor: '#006a5a',
    borderRadius: 6,
    padding: '12px 16px',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hospitalName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  hospitalSub: { fontSize: 8, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  reportTitle: { fontSize: 12, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  reportMonth: { fontSize: 9, color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginTop: 2 },
  // Employee info
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 5,
    padding: '8px 12px',
    borderLeft: '3px solid #006a5a',
  },
  infoCol: { flex: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { width: 70, fontWeight: 'bold', color: '#374151', fontSize: 8.5 },
  infoVal: { flex: 1, color: '#111827', fontSize: 8.5 },
  // Two-column (earnings / deductions)
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col: { flex: 1 },
  colHeader: {
    padding: '6px 10px',
    borderRadius: '4px 4px 0 0',
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 10,
  },
  colHeaderEarn: { backgroundColor: '#059669' },
  colHeaderDeduct: { backgroundColor: '#dc2626' },
  colBody: {
    border: '1px solid #e2e8f0',
    borderTop: 'none',
    borderRadius: '0 0 4px 4px',
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '5px 10px',
    borderBottom: '0.5px solid #e2e8f0',
  },
  lineLabel: { fontSize: 9, color: '#374151' },
  lineAmount: { fontSize: 9, color: '#111827', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '6px 10px',
    backgroundColor: '#f1f5f9',
    borderTop: '1.5px solid #64748b',
  },
  totalLabel: { fontSize: 9.5, fontWeight: 'bold', color: '#1f2937' },
  totalAmount: { fontSize: 9.5, fontWeight: 'bold', color: '#1f2937', textAlign: 'right' },
  // Net salary
  netBox: {
    marginTop: 4,
    padding: '12px 16px',
    backgroundColor: '#006a5a',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  netAmount: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  netText: { fontSize: 8.5, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontStyle: 'italic' },
  // Signature
  sigRow: { flexDirection: 'row', marginTop: 20, gap: 16 },
  sigBlock: { flex: 1, alignItems: 'center' },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#94a3b8', width: '70%', marginBottom: 4 },
  sigLabel: { fontSize: 8, color: '#64748b' },
  footNote: { fontSize: 7, color: '#94a3b8', textAlign: 'center', marginTop: 10 },
  // Confidential mark
  confidential: {
    position: 'absolute',
    top: '1.2cm',
    right: '1.4cm',
    fontSize: 7,
    color: '#dc2626',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
})

// ─── Document ─────────────────────────────────────────────────────────────────
function SalarySlipDocument({ data }: { data: SalarySlipData }) {
  const { employee, monthLabel, payDate, earnings, deductions, totalEarnings, totalDeductions, netSalary } = data
  const printDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document title={`สลิปเงินเดือน - ${employee.name} - ${monthLabel}`}>
      <Page size="A4" style={s.page}>

        <Text style={s.confidential}>CONFIDENTIAL</Text>

        {/* ── Header band ── */}
        <View style={s.headerBand}>
          <View>
            <Text style={s.hospitalName}>โรงพยาบาลพระยืน</Text>
            <Text style={s.hospitalSub}>กรมการแพทย์ กระทรวงสาธารณสุข</Text>
          </View>
          <View>
            <Text style={s.reportTitle}>สลิปเงินเดือน</Text>
            <Text style={s.reportMonth}>ประจำเดือน {monthLabel}</Text>
          </View>
        </View>

        {/* ── Employee info ── */}
        <View style={s.infoBox}>
          <View style={s.infoCol}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>ชื่อ–สกุล</Text>
              <Text style={s.infoVal}>{employee.name}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>รหัสพนักงาน</Text>
              <Text style={s.infoVal}>{employee.id}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>ประเภท</Text>
              <Text style={s.infoVal}>{employee.staffType}</Text>
            </View>
          </View>
          <View style={s.infoCol}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>ตำแหน่ง</Text>
              <Text style={s.infoVal}>{employee.position}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>หน่วยงาน</Text>
              <Text style={s.infoVal}>{employee.department}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>วันที่จ่าย</Text>
              <Text style={s.infoVal}>{payDate}</Text>
            </View>
          </View>
        </View>

        {/* ── Earnings / Deductions ── */}
        <View style={s.twoCol}>
          {/* Earnings */}
          <View style={s.col}>
            <Text style={[s.colHeader, s.colHeaderEarn]}>รายรับ</Text>
            <View style={s.colBody}>
              {earnings.map((e, i) => (
                <View key={i} style={s.lineRow}>
                  <Text style={s.lineLabel}>{e.label}</Text>
                  <Text style={s.lineAmount}>{formatNumber(e.amount)}</Text>
                </View>
              ))}
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>รวมรายรับ</Text>
                <Text style={[s.totalAmount, { color: '#059669' }]}>{formatNumber(totalEarnings)}</Text>
              </View>
            </View>
          </View>

          {/* Deductions */}
          <View style={s.col}>
            <Text style={[s.colHeader, s.colHeaderDeduct]}>รายการหัก</Text>
            <View style={s.colBody}>
              {deductions.map((d, i) => (
                <View key={i} style={s.lineRow}>
                  <Text style={s.lineLabel}>{d.label}</Text>
                  <Text style={s.lineAmount}>{formatNumber(d.amount)}</Text>
                </View>
              ))}
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>รวมรายการหัก</Text>
                <Text style={[s.totalAmount, { color: '#dc2626' }]}>{formatNumber(totalDeductions)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Net Salary ── */}
        <View style={s.netBox}>
          <View>
            <Text style={s.netLabel}>เงินสุทธิที่ได้รับ</Text>
            <Text style={s.netText}>({numberToThaiText(netSalary)})</Text>
          </View>
          <Text style={s.netAmount}>{formatNumber(netSalary)} บาท</Text>
        </View>

        {/* ── Bank info ── */}
        {employee.bankAccount && (
          <View style={[s.infoBox, { marginTop: 10, marginBottom: 0 }]}>
            <View style={s.infoCol}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>โอนเข้าบัญชี</Text>
                <Text style={s.infoVal}>{employee.bankName} — {employee.bankAccount}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Signature ── */}
        <View style={s.sigRow}>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>ลายมือชื่อผู้รับเงิน</Text>
            <Text style={[s.sigLabel, { marginTop: 2 }]}>({employee.name})</Text>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>ผู้จัดทำ</Text>
            <Text style={[s.sigLabel, { marginTop: 2 }]}>(เจ้าหน้าที่การเงิน)</Text>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>ผู้อนุมัติ</Text>
            <Text style={[s.sigLabel, { marginTop: 2 }]}>(ผู้อำนวยการ)</Text>
          </View>
        </View>

        <Text style={s.footNote}>
          เอกสารนี้จัดทำโดยระบบอัตโนมัติ · พิมพ์เมื่อ {printDate} · PYHOS-ERP ระบบการเงินและบัญชี
        </Text>
      </Page>
    </Document>
  )
}

// ─── Default export: PDFViewer wrapper ──────────────────────────────────────
export default function SalarySlipPDFViewer({ data }: { data: SalarySlipData }) {
  return (
    <PDFViewer width="100%" showToolbar style={{ border: 'none', flex: 1, minHeight: 600 } as any}>
      <SalarySlipDocument data={data} />
    </PDFViewer>
  )
}
