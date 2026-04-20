'use client'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer } from '@react-pdf/renderer'

// ─── Font ─────────────────────────────────────────────────────────────────────
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf', fontWeight: 'normal' },
    { src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf',    fontWeight: 'bold' },
  ],
})
Font.registerHyphenationCallback(word => [word])

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AttendanceEmployee {
  id: string
  name: string
  position: string
  department: string
  group: string
}

export interface AttendanceDayRecord {
  date: string        // YYYY-MM-DD
  dayNum: number      // 1-31
  dayShort: string    // จ. / อ. / พ. / พฤ. / ศ. / ส. / อา.
  checkIn?: string    // HH:mm
  checkOut?: string   // HH:mm
  workHours?: number
  lateMinutes?: number
  status: 'normal' | 'late' | 'absent' | 'leave-sick' | 'leave-vacation' | 'leave-personal' | 'holiday'
  remark?: string
}

export interface AttendanceSummary {
  workDays: number
  normalDays: number
  lateDays: number
  absentDays: number
  leaveDays: number
  totalWorkHours: number
}

export interface AttendanceReportData {
  employee: AttendanceEmployee
  monthLabel: string
  dateRangeLabel?: string   // e.g. "1 - 15 เมษายน พ.ศ. 2569"
  records: AttendanceDayRecord[]
  summary: AttendanceSummary
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  normal: 'ปกติ', late: 'สาย', absent: 'ขาดงาน',
  'leave-sick': 'ลาป่วย', 'leave-vacation': 'ลาพักผ่อน',
  'leave-personal': 'ลากิจ', holiday: 'วันหยุด',
}

const STATUS_BG: Record<string, string> = {
  normal: '#d1fae5', late: '#fef3c7', absent: '#fee2e2',
  'leave-sick': '#ffedd5', 'leave-vacation': '#dbeafe',
  'leave-personal': '#cffafe', holiday: '#f1f5f9',
}

const STATUS_COLOR: Record<string, string> = {
  normal: '#065f46', late: '#92400e', absent: '#991b1b',
  'leave-sick': '#9a3412', 'leave-vacation': '#1e40af',
  'leave-personal': '#155e75', holiday: '#64748b',
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 8,
    padding: '1cm 1.2cm',
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  // Header
  headerBand: {
    backgroundColor: '#006a5a',
    borderRadius: 6,
    padding: '10px 14px',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hospitalName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  hospitalSub: { fontSize: 8, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  reportTitle: { fontSize: 11, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  reportMonth: { fontSize: 8.5, color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginTop: 2 },
  // Employee info
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: '7px 10px',
    borderLeft: '3px solid #006a5a',
  },
  infoCol: { flex: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: 60, fontWeight: 'bold', color: '#374151', fontSize: 8 },
  infoVal: { flex: 1, color: '#111827', fontSize: 8 },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#006a5a',
    borderRadius: '3px 3px 0 0',
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  tableRowHoliday: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', backgroundColor: '#f1f5f9' },
  th: { fontWeight: 'bold', color: '#fff', padding: '4px 4px', fontSize: 7.5, textAlign: 'center' },
  td: { padding: '3px 4px', fontSize: 8, textAlign: 'center' },
  tdLeft: { padding: '3px 4px', fontSize: 8 },
  statusBadge: { borderRadius: 2, padding: '1px 4px', fontSize: 7 },
  // Summary
  summaryBox: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 6,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: '6px 8px',
    alignItems: 'center',
    borderTop: '2.5px solid #006a5a',
  },
  summaryNum: { fontSize: 15, fontWeight: 'bold', color: '#006a5a' },
  summaryLbl: { fontSize: 7, color: '#64748b', marginTop: 1 },
  // Signature
  sigRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  sigBlock: {
    flex: 1,
    alignItems: 'center',
  },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#94a3b8', width: '70%', marginBottom: 4 },
  sigLabel: { fontSize: 7.5, color: '#64748b' },
  footNote: { fontSize: 6.5, color: '#94a3b8', textAlign: 'right', marginTop: 8 },
})

// ─── Column widths ────────────────────────────────────────────────────────────
const COL = { date: '7%', day: '5%', in: '8%', out: '8%', hrs: '7%', lateMin: '7%', status: '11%', remark: '47%' }

// ─── Document ─────────────────────────────────────────────────────────────────
function AttendanceDocument({ data }: { data: AttendanceReportData }) {
  const { employee, monthLabel, dateRangeLabel, records, summary } = data
  const printDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document title={`รายงานเวลาทำงาน — ${employee.name} — ${monthLabel}`}>
      <Page size="A4" style={s.page}>

        {/* ── Header band ── */}
        <View style={s.headerBand}>
          <View>
            <Text style={s.hospitalName}>โรงพยาบาลพระยืน</Text>
            <Text style={s.hospitalSub}>กรมการแพทย์ กระทรวงสาธารณสุข</Text>
          </View>
          <View>
            <Text style={s.reportTitle}>รายงานการเข้า–ออกงาน</Text>
            <Text style={s.reportMonth}>
              {dateRangeLabel ? dateRangeLabel : `ประจำเดือน ${monthLabel}`}
            </Text>
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
          </View>
          <View style={s.infoCol}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>กลุ่มงาน</Text>
              <Text style={s.infoVal}>{employee.group}</Text>
            </View>
          </View>
        </View>

        {/* ── Table ── */}
        <View style={s.tableHeader}>
          <Text style={[s.th, { width: COL.date }]}>วันที่</Text>
          <Text style={[s.th, { width: COL.day }]}>วัน</Text>
          <Text style={[s.th, { width: COL.in }]}>เข้างาน</Text>
          <Text style={[s.th, { width: COL.out }]}>ออกงาน</Text>
          <Text style={[s.th, { width: COL.hrs }]}>ชม.</Text>
          <Text style={[s.th, { width: COL.lateMin }]}>สาย (นาที)</Text>
          <Text style={[s.th, { width: COL.status }]}>สถานะ</Text>
          <Text style={[s.th, { width: COL.remark, textAlign: 'left' }]}>หมายเหตุ</Text>
        </View>

        {records.map((r, i) => {
          const rowStyle = r.status === 'holiday' ? s.tableRowHoliday : (i % 2 === 0 ? s.tableRow : s.tableRowAlt)
          return (
            <View key={r.date} style={rowStyle}>
              <Text style={[s.td, { width: COL.date }]}>{r.dayNum}</Text>
              <Text style={[s.td, { width: COL.day, color: r.status === 'holiday' ? '#94a3b8' : '#374151' }]}>{r.dayShort}</Text>
              <Text style={[s.td, { width: COL.in, color: r.status === 'late' ? '#b45309' : '#111827' }]}>{r.checkIn ?? '—'}</Text>
              <Text style={[s.td, { width: COL.out }]}>{r.checkOut ?? '—'}</Text>
              <Text style={[s.td, { width: COL.hrs }]}>{r.workHours != null ? r.workHours.toFixed(1) : '—'}</Text>
              <Text style={[s.td, { width: COL.lateMin, color: '#b45309' }]}>{r.lateMinutes ? String(r.lateMinutes) : '—'}</Text>
              <View style={[{ width: COL.status }, s.td, { alignItems: 'center' }]}>
                <Text style={[s.statusBadge, { backgroundColor: STATUS_BG[r.status], color: STATUS_COLOR[r.status] }]}>
                  {STATUS_LABEL[r.status]}
                </Text>
              </View>
              <Text style={[s.tdLeft, { width: COL.remark, color: '#64748b' }]}>{r.remark ?? ''}</Text>
            </View>
          )
        })}

        {/* ── Summary ── */}
        <View style={s.summaryBox}>
          {[
            { num: summary.workDays, lbl: 'วันทำงาน', color: '#006a5a' },
            { num: summary.normalDays, lbl: 'มาปกติ', color: '#059669' },
            { num: summary.lateDays, lbl: 'มาสาย', color: '#d97706' },
            { num: summary.absentDays, lbl: 'ขาดงาน', color: '#dc2626' },
            { num: summary.leaveDays, lbl: 'วันลา', color: '#2563eb' },
            { num: Math.round(summary.totalWorkHours * 10) / 10, lbl: 'ชั่วโมงรวม', color: '#7c3aed' },
          ].map(({ num, lbl, color }) => (
            <View key={lbl} style={[s.summaryCard, { borderTopColor: color }]}>
              <Text style={[s.summaryNum, { color }]}>{num}</Text>
              <Text style={s.summaryLbl}>{lbl}</Text>
            </View>
          ))}
        </View>

        {/* ── Signature ── */}
        <View style={s.sigRow}>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>ลายมือชื่อพนักงาน</Text>
            <Text style={[s.sigLabel, { marginTop: 2 }]}>({employee.name})</Text>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>ลายมือชื่อหัวหน้างาน</Text>
            <Text style={[s.sigLabel, { marginTop: 2 }]}>(..............................)</Text>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>ลายมือชื่อผู้รับรอง (HR)</Text>
            <Text style={[s.sigLabel, { marginTop: 2 }]}>(..............................)</Text>
          </View>
        </View>

        <Text style={s.footNote}>พิมพ์เมื่อ {printDate} · PYHOS-ERP ระบบบริหารทรัพยากรบุคคล</Text>
      </Page>
    </Document>
  )
}

// ─── Default export: PDFViewer wrapper (dynamic-import target) ─────────────
export default function AttendancePDFViewer({ data }: { data: AttendanceReportData }) {
  return (
    <PDFViewer width="100%" showToolbar style={{ border: 'none', flex: 1, minHeight: 560 } as any}>
      <AttendanceDocument data={data} />
    </PDFViewer>
  )
}
