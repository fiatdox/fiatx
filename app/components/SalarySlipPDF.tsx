'use client'
import { useState } from 'react'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer, pdf } from '@react-pdf/renderer'
import { Button, App } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { withBase } from '@/app/lib/basePath'

// ─── Font ─────────────────────────────────────────────────────────────────────
// ใช้ฟอนต์ local เหมือน RepairSlipPDF — ไม่พึ่งอินเทอร์เน็ต เปิดเร็วและเสถียรกว่า
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: withBase('/fonts/Sarabun/Sarabun-Regular.ttf'),    fontWeight: 400 },
    { src: withBase('/fonts/Sarabun/Sarabun-Italic.ttf'),     fontWeight: 400, fontStyle: 'italic' },
    { src: withBase('/fonts/Sarabun/Sarabun-Medium.ttf'),     fontWeight: 500 },
    { src: withBase('/fonts/Sarabun/Sarabun-SemiBold.ttf'),   fontWeight: 600 },
    { src: withBase('/fonts/Sarabun/Sarabun-Bold.ttf'),       fontWeight: 700 },
    { src: withBase('/fonts/Sarabun/Sarabun-BoldItalic.ttf'), fontWeight: 700, fontStyle: 'italic' },
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
const TEAL = '#006a5a'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 9,
    padding: '1.2cm 1.4cm',
    color: '#1a1a1a',
    backgroundColor: '#fff',
    // เผื่อ lineHeight ให้สระบน/วรรณยุกต์ไทยไม่ถูกตัด
    lineHeight: 1.5,
  },

  // ── Header ──
  headerBand: {
    backgroundColor: TEAL,
    borderRadius: 6,
    padding: '12px 16px',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hospitalName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  hospitalSub:  { fontSize: 8, color: 'rgba(255,255,255,0.78)', marginTop: 5 },
  reportTitle:  { fontSize: 13, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  reportSub:    { fontSize: 8, color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginTop: 5 },

  // แถบอ้างอิงเอกสารใต้ header
  refBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '4px 2px 8px',
    marginBottom: 4,
  },
  refText: { fontSize: 7.5, color: '#6b7280' },

  // ── Employee info (ตาราง 2 คอลัมน์มีเส้นกรอบ) ──
  infoBox: {
    flexDirection: 'row',
    border: '1px solid #d1d5db',
    borderRadius: 5,
    marginBottom: 10,
  },
  infoCol:      { flex: 1, padding: '7px 12px' },
  infoColRight: { borderLeft: '1px solid #e5e7eb' },
  infoRow:   { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: 76, fontWeight: 'bold', color: '#4b5563', fontSize: 8.5 },
  infoVal:   { flex: 1, color: '#111827', fontSize: 8.5 },

  // ── ตารางรายรับ / รายการหัก (ตารางเดียว 4 คอลัมน์) ──
  table: {
    border: '1px solid #cbd5e1',
    borderRadius: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  tHead: {
    flexDirection: 'row',
    backgroundColor: TEAL,
  },
  tHalf: { flex: 1, flexDirection: 'row' },
  // เส้นแบ่งกลางตาราง (ระหว่างฝั่งรับกับฝั่งหัก)
  tDividerHead: { borderLeft: '1px solid rgba(255,255,255,0.35)' },
  tDividerBody: { borderLeft: '1px solid #cbd5e1' },
  tHeadLabel:  { flex: 1, padding: '6px 10px', color: '#fff', fontWeight: 'bold', fontSize: 9.5 },
  tHeadAmount: { width: 78, padding: '6px 10px', color: 'rgba(255,255,255,0.9)', fontSize: 8, textAlign: 'right' },
  tRow:    { flexDirection: 'row', borderTop: '0.5px solid #e5e7eb' },
  tRowAlt: { backgroundColor: '#f8fafc' },
  tLabel:  { flex: 1, padding: '4px 10px', fontSize: 9, color: '#374151' },
  tAmount: { width: 78, padding: '4px 10px', fontSize: 9, color: '#111827', textAlign: 'right' },
  tTotalRow: {
    flexDirection: 'row',
    borderTop: '1px solid #94a3b8',
    backgroundColor: '#f1f5f9',
  },
  tTotalLabel:  { flex: 1, padding: '6px 10px', fontSize: 9.5, fontWeight: 'bold', color: '#1f2937' },
  tTotalAmount: { width: 78, padding: '6px 10px', fontSize: 9.5, fontWeight: 'bold', textAlign: 'right' },

  // ── เงินสุทธิ ──
  netBox: {
    padding: '12px 16px',
    backgroundColor: TEAL,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  netLabel:  { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  netText:   { fontSize: 8.5, color: 'rgba(255,255,255,0.88)', marginTop: 2, fontStyle: 'italic' },
  netAmount: { fontSize: 18, color: '#fff', fontWeight: 'bold' },

  // ── ธนาคาร ──
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: 5,
    padding: '6px 12px',
    marginBottom: 4,
  },

  footNote: {
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
    borderTop: '0.5px dashed #d1d5db',
    paddingTop: 5,
  },
  confidential: {
    position: 'absolute',
    top: '0.5cm',
    right: '1.4cm',
    fontSize: 7,
    color: '#dc2626',
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
})

// ─── Document ─────────────────────────────────────────────────────────────────
function SalarySlipDocument({ data }: { data: SalarySlipData }) {
  const { employee, monthLabel, payDate, earnings, deductions, totalEarnings, totalDeductions, netSalary } = data
  const printDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  // จับคู่รายรับ/รายการหักทีละแถว — ฝั่งที่สั้นกว่าปล่อยช่องว่าง ให้ตารางสูงเท่ากันเสมอ
  const rowCount = Math.max(earnings.length, deductions.length)
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    earn: earnings[i] as SalaryEarning | undefined,
    deduct: deductions[i] as SalaryDeduction | undefined,
  }))

  return (
    <Document title={`สลิปเงินเดือน - ${employee.name} - ${monthLabel}`}>
      <Page size="A4" style={s.page}>

        <Text style={s.confidential} fixed>เอกสารลับ / CONFIDENTIAL</Text>

        {/* ── Header ── */}
        <View style={s.headerBand}>
          <View>
            <Text style={s.hospitalName}>โรงพยาบาลพะเยา</Text>
            <Text style={s.hospitalSub}>สำนักปลัดกระทรวงสาธารณสุข กระทรวงสาธารณสุข &nbsp;</Text>
          </View>
          <View>
            <Text style={s.reportTitle}>ใบแจ้งเงินเดือน</Text>
            <Text style={s.reportSub}>เดือน {monthLabel}</Text>
          </View>
        </View>

        {/* แถบอ้างอิงเอกสาร */}
        <View style={s.refBar}>
          <Text style={s.refText}>เลขที่เอกสาร PAY-{monthLabel.replace(/\s/g, '')}</Text>
        </View>

        {/* ── Employee info ── */}
        <View style={s.infoBox}>
          <View style={s.infoCol}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>ชื่อ–นามสกุล</Text>
              <Text style={s.infoVal}>{employee.name}&nbsp;</Text>
            </View>
            <View style={[s.infoRow, { marginBottom: 0 }]}>
              <Text style={s.infoLabel}>ประเภทบุคลากร&nbsp;</Text>
              <Text style={s.infoVal}>{employee.staffType}&nbsp;</Text>
            </View>
          </View>
          <View style={[s.infoCol, s.infoColRight]}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>ตำแหน่ง&nbsp;</Text>
              <Text style={s.infoVal}>{employee.position} &nbsp;</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>กลุ่มงาน</Text>
              <Text style={s.infoVal}>{employee.department}&nbsp;</Text>
            </View>
            <View style={[s.infoRow, { marginBottom: 0 }]}>
              <Text style={s.infoLabel}>งวดที่จ่าย</Text>
              <Text style={s.infoVal}>{payDate}</Text>
            </View>
          </View>
        </View>

        {/* ── Earnings / Deductions — ตารางเดียว 4 คอลัมน์ ── */}
        <View style={s.table}>
          {/* หัวตาราง */}
          <View style={s.tHead}>
            <View style={s.tHalf}>
              <Text style={s.tHeadLabel}>รายรับ</Text>
              <Text style={s.tHeadAmount}>จำนวนเงิน (บาท)</Text>
            </View>
            <View style={[s.tHalf, s.tDividerHead]}>
              <Text style={s.tHeadLabel}>รายการหัก</Text>
              <Text style={s.tHeadAmount}>จำนวนเงิน (บาท)</Text>
            </View>
          </View>
          {/* แถวรายการ — สลับสีพื้นอ่านง่าย */}
          {rows.map((row, i) => (
            <View key={i} style={[s.tRow, ...(i % 2 === 1 ? [s.tRowAlt] : [])]}>
              <View style={s.tHalf}>
                <Text style={s.tLabel}>{row.earn?.label ?? ' '}</Text>
                <Text style={s.tAmount}>{row.earn ? formatNumber(row.earn.amount) : ' '}</Text>
              </View>
              <View style={[s.tHalf, s.tDividerBody]}>
                <Text style={s.tLabel}>{row.deduct?.label ?? ' '}</Text>
                <Text style={s.tAmount}>{row.deduct ? formatNumber(row.deduct.amount) : ' '}</Text>
              </View>
            </View>
          ))}
          {/* แถวรวม — อยู่แนวเดียวกันทั้งสองฝั่งเสมอ */}
          <View style={s.tTotalRow}>
            <View style={s.tHalf}>
              <Text style={s.tTotalLabel}>รวมรายรับ</Text>
              <Text style={[s.tTotalAmount, { color: '#047857' }]}>{formatNumber(totalEarnings)}</Text>
            </View>
            <View style={[s.tHalf, s.tDividerBody]}>
              <Text style={s.tTotalLabel}>รวมรายการหัก</Text>
              <Text style={[s.tTotalAmount, { color: '#b91c1c' }]}>{formatNumber(totalDeductions)}</Text>
            </View>
          </View>
        </View>

        {/* ── Net Salary ── */}
        <View style={s.netBox}>
          <View>
            <Text style={s.netLabel}>เงินได้สุทธิ (รายรับ − รายการหัก)</Text>
            <Text style={s.netText}>({numberToThaiText(netSalary)})</Text>
          </View>
          <Text style={s.netAmount}>{formatNumber(netSalary)} บาท</Text>
        </View>

        {/* ── Bank info ── */}
        {employee.bankAccount && (
          <View style={s.bankRow}>
            <Text style={[s.infoLabel, { width: 90 }]}>โอนเข้าบัญชี</Text>
            <Text style={s.infoVal}>
              {employee.bankName} — เลขที่บัญชี {employee.bankAccount}
            </Text>
          </View>
        )}

        <Text style={s.footNote}>
          เอกสารฉบับนี้จัดทำโดยระบบอัตโนมัติและถือเป็นความลับระหว่างโรงพยาบาลกับพนักงาน
          ห้ามเผยแพร่โดยไม่ได้รับอนุญาต · พิมพ์เมื่อ {printDate} · PYHOS-EXP ระบบการเงินและบัญชี
        </Text>
      </Page>
    </Document>
  )
}

// ─── แสดง PDF ในหน้าได้ไหม ──────────────────────────────────────────────────
// Chrome บน Android ไม่มีตัวแสดง PDF ในหน้า — iframe ของ PDFViewer จะว่างเปล่า
// navigator.pdfViewerEnabled บอกตรง ๆ (Chrome 94+, Safari 16.4+); เบราว์เซอร์เก่าเดาจาก UA
const canInlinePdf = () => {
  const nav = navigator as Navigator & { pdfViewerEnabled?: boolean }
  if (typeof nav.pdfViewerEnabled === 'boolean') return nav.pdfViewerEnabled
  return !/Android|Mobi/i.test(nav.userAgent)
}

// ─── สลิปแบบหน้าเว็บ (มือถือที่แสดง PDF ในหน้าไม่ได้) + ปุ่มบันทึก PDF ──────────
function SalarySlipHtml({ data }: { data: SalarySlipData }) {
  const { message } = App.useApp()
  const [saving, setSaving] = useState(false)
  const { employee, monthLabel, payDate, earnings, deductions, totalEarnings, totalDeductions, netSalary } = data

  const savePdf = async () => {
    setSaving(true)
    try {
      const blob = await pdf(<SalarySlipDocument data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `สลิปเงินเดือน-${monthLabel.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      message.error('สร้างไฟล์ PDF ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const section = (title: string, items: SalaryEarning[], total: number, color: string) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, color, borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 4 }}>{title}</div>
      {items.length === 0 && <div style={{ color: 'var(--app-text-3)', fontSize: 13, padding: '4px 0' }}>ไม่มีรายการ</div>}
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', fontSize: 14, borderBottom: '1px dashed var(--app-border)' }}>
          <span>{it.label}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatNumber(it.amount)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '6px 0 0', fontSize: 14 }}>
        <span>รวม{title}</span>
        <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(total)}</span>
      </div>
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 16 }}>
      <div style={{ background: TEAL, color: '#fff', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>ใบแจ้งเงินเดือน · เดือน {monthLabel}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>โรงพยาบาลพะเยา · วันที่จ่าย {payDate}</div>
      </div>
      <div style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.7 }}>
        <div><b>{employee.name}</b></div>
        {employee.position && <div>{employee.position}</div>}
        {employee.department && <div style={{ color: 'var(--app-text-3)' }}>{employee.department}</div>}
      </div>
      {section('รายรับ', earnings, totalEarnings, '#047857')}
      {section('รายการหัก', deductions, totalDeductions, '#b91c1c')}
      <div style={{ border: `2px solid ${TEAL}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontWeight: 600 }}>เงินได้สุทธิ</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: TEAL, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(netSalary)} บาท</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>({numberToThaiText(netSalary)})</div>
      </div>
      {employee.bankAccount && (
        <div style={{ fontSize: 13, marginBottom: 12 }}>โอนเข้าบัญชี {employee.bankName} — เลขที่บัญชี {employee.bankAccount}</div>
      )}
      <Button type="primary" block size="large" icon={<DownloadOutlined />} loading={saving} onClick={savePdf}
        style={{ backgroundColor: TEAL }}>
        บันทึกสลิปเป็น PDF
      </Button>
    </div>
  )
}

// ─── Default export: PDFViewer wrapper ──────────────────────────────────────
export default function SalarySlipPDFViewer({ data }: { data: SalarySlipData }) {
  if (!canInlinePdf()) return <SalarySlipHtml data={data} />
  return (
    // iframe ต้องกำหนด height ตรง ๆ ให้เต็ม container — flex ใช้ไม่ได้กับ parent ปกติ
    <PDFViewer width="100%" height="100%" showToolbar
      style={{ border: 'none', width: '100%', height: '100%', minHeight: 600 }}>
      <SalarySlipDocument data={data} />
    </PDFViewer>
  )
}
