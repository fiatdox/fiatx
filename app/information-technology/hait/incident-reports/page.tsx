'use client'
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Table, Input, Button, Space, ConfigProvider, Card, Tag, Drawer, Form,
  Select, Breadcrumb, message, Tooltip, Row, Col, DatePicker,
  Typography, Radio, theme, Modal, InputNumber, Tabs
} from 'antd'
import {
  EditOutlined, DeleteOutlined, SearchOutlined, PlusOutlined, HomeOutlined,
  DesktopOutlined, CheckCircleOutlined, ClockCircleOutlined,
  AlertOutlined, PrinterOutlined, SecurityScanOutlined,
  AuditOutlined, SafetyOutlined, BarChartOutlined, UnorderedListOutlined,
  BulbOutlined, FireOutlined, WarningOutlined
} from '@ant-design/icons'
import Navbar from '../../../components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { StatCard, gBtn, type Accent } from '@/app/components/StatCard'
import EChart from '../../../components/EChart'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

const API = '/api/v1/it/incident'

interface IncidentReport {
  id: number
  incidentNo: string
  incidentDate: string      // YYYY-MM-DD
  detectedDate: string
  reportDate: string
  reportedBy: string
  department: string
  threatTypeId: number
  attackVectorId: number
  affectedSystemId: number
  threatType: string        // display name from JOIN
  attackVector: string
  affectedSystem: string
  affectedAssets: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  impact: string
  affectedUsers: number
  dataBreached: 'Y' | 'N'
  continuityImpact: 'Y' | 'N'
  rootCause: string
  immediateActions: string
  longTermMeasures: string
  resolution: string
  resolvedDate?: string     // YYYY-MM-DD
  resolvedBy: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ncsaReported: 'Y' | 'N'
  ncsaReportDate?: string   // YYYY-MM-DD
  isSlaRelated: 'Y' | 'N'
  mttrDays?: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapToLocal = (r: any): IncidentReport => ({
  id: r.id,
  incidentNo: r.incident_no,
  incidentDate: r.incident_date,
  detectedDate: r.detected_date,
  reportDate: r.report_date,
  reportedBy: r.reported_by,
  department: r.department,
  threatTypeId: r.threat_type_id,
  attackVectorId: r.attack_vector_id,
  affectedSystemId: r.affected_system_id,
  threatType: r.threat_type || '',
  attackVector: r.attack_vector || '',
  affectedSystem: r.affected_system || '',
  affectedAssets: r.affected_assets || '',
  description: r.description || '',
  severity: r.severity,
  impact: r.impact || '',
  affectedUsers: r.affected_users || 0,
  dataBreached: r.data_breached || 'N',
  continuityImpact: r.continuity_impact || 'N',
  rootCause: r.root_cause || '',
  immediateActions: r.immediate_actions || '',
  longTermMeasures: r.long_term_measures || '',
  resolution: r.resolution || '',
  resolvedDate: r.resolved_date || undefined,
  resolvedBy: r.resolved_by || '',
  status: r.status,
  ncsaReported: r.ncsa_reported || 'N',
  ncsaReportDate: r.ncsa_report_date || undefined,
  isSlaRelated: r.is_sla_related || 'N',
  mttrDays: r.mttr_days,
})

const FALLBACK_THREAT_TYPES = [
  { value: 1,  label: 'มัลแวร์ (Malware)' },
  { value: 2,  label: 'แรนซัมแวร์ (Ransomware)' },
  { value: 3,  label: 'ฟิชชิง (Phishing)' },
  { value: 4,  label: 'Social Engineering' },
  { value: 5,  label: 'การเข้าถึงโดยไม่ได้รับอนุญาต' },
  { value: 6,  label: 'การรั่วไหลของข้อมูล' },
  { value: 7,  label: 'การโจมตี DoS/DDoS' },
  { value: 8,  label: 'การโจมตีเว็บแอปพลิเคชัน' },
  { value: 9,  label: 'ภัยคุกคามจากภายใน (Insider Threat)' },
  { value: 10, label: 'ฮาร์ดแวร์ขัดข้อง' },
  { value: 11, label: 'ระบบล้มเหลว (System Failure)' },
  { value: 12, label: 'ช่องโหว่ซอฟต์แวร์' },
  { value: 13, label: 'อื่นๆ' },
]

const FALLBACK_ATTACK_VECTORS = [
  { value: 1, label: 'อีเมล (Email/Phishing)' },
  { value: 2, label: 'เว็บไซต์ (Web/Drive-by Download)' },
  { value: 3, label: 'USB/สื่อบันทึก (Removable Media)' },
  { value: 4, label: 'เครือข่ายภายใน (Internal Network)' },
  { value: 5, label: 'การเข้าถึงระยะไกล (VPN/RDP)' },
  { value: 6, label: 'บุคคลภายใน (Insider)' },
  { value: 7, label: 'ช่องโหว่ซอฟต์แวร์ (Exploit)' },
  { value: 8, label: 'Supply Chain' },
  { value: 9, label: 'อื่นๆ' },
]

const FALLBACK_AFFECTED_SYSTEMS = [
  { value: 1,  label: 'ระบบ HIS (Hospital Information System)' },
  { value: 2,  label: 'ระบบ LIS (Laboratory Information System)' },
  { value: 3,  label: 'ระบบ PACS / RIS (รังสีวิทยา)' },
  { value: 4,  label: 'ระบบ Email / Office 365' },
  { value: 5,  label: 'ระบบ Active Directory / LDAP' },
  { value: 6,  label: 'ระบบเครือข่าย (Network Infrastructure)' },
  { value: 7,  label: 'ระบบ ERP / บัญชี-การเงิน' },
  { value: 8,  label: 'ระบบ Backup & Recovery' },
  { value: 9,  label: 'ระบบ CCTV / ควบคุมการเข้าออก' },
  { value: 10, label: 'เว็บไซต์โรงพยาบาล' },
  { value: 11, label: 'ระบบ VPN / Remote Access' },
  { value: 12, label: 'เครื่องลูกข่าย (Workstation/PC)' },
  { value: 13, label: 'เซิร์ฟเวอร์หลัก (File/App Server)' },
  { value: 14, label: 'ระบบฐานข้อมูล (Database Server)' },
  { value: 15, label: 'ระบบ IoT / Medical Device' },
  { value: 16, label: 'ระบบโทรศัพท์ (VoIP/PABX)' },
  { value: 17, label: 'ระบบ Cloud / SaaS' },
  { value: 18, label: 'อื่นๆ' },
]

const departmentOptions = [
  { label: 'งานเทคโนโลยีสารสนเทศ (IT)', value: 'งานเทคโนโลยีสารสนเทศ' },
  { label: 'แผนกผู้ป่วยนอก (OPD)', value: 'แผนกผู้ป่วยนอก' },
  { label: 'แผนกผู้ป่วยใน (IPD)', value: 'แผนกผู้ป่วยใน' },
  { label: 'ห้องฉุกเฉิน (ER)', value: 'ห้องฉุกเฉิน' },
  { label: 'ห้องผ่าตัด (OR)', value: 'ห้องผ่าตัด' },
  { label: 'ห้องการเงิน', value: 'ห้องการเงิน' },
  { label: 'ห้องเวชระเบียน', value: 'ห้องเวชระเบียน' },
  { label: 'ห้องยา', value: 'ห้องยา' },
  { label: 'ห้องปฏิบัติการ (Lab)', value: 'ห้องปฏิบัติการ' },
  { label: 'อื่นๆ', value: 'อื่นๆ' },
]

const statusOptions = [
  { label: 'รับเรื่อง', value: 'open' },
  { label: 'กำลังดำเนินการ', value: 'in_progress' },
  { label: 'แก้ไขแล้ว', value: 'resolved' },
  { label: 'ปิดเรื่อง', value: 'closed' },
]

const severityConfig: Record<string, { color: string; label: string; ncsa: string }> = {
  critical: { color: 'error',      label: 'วิกฤต', ncsa: 'ระดับ 1' },
  high:     { color: 'warning',    label: 'สูง',   ncsa: 'ระดับ 2' },
  medium:   { color: 'processing', label: 'กลาง',  ncsa: 'ระดับ 3' },
  low:      { color: 'default',    label: 'ต่ำ',   ncsa: 'ระดับ 4' },
}

const statusConfig: Record<string, { color: string; label: string }> = {
  open:        { color: 'default',    label: 'รับเรื่อง' },
  in_progress: { color: 'processing', label: 'กำลังดำเนินการ' },
  resolved:    { color: 'success',    label: 'แก้ไขแล้ว' },
  closed:      { color: 'default',    label: 'ปิดเรื่อง' },
}

const severityPrintColor: Record<string, string> = {
  critical: '#dc2626', high: '#d97706', medium: '#2563eb', low: '#6b7280',
}

const CHART_COLORS = ['#a855f7','#7c3aed','#6366f1','#3b82f6','#0ea5e9','#06b6d4','#14b8a6','#22c55e','#f59e0b','#ef4444','#ec4899','#d946ef','#84cc16']

const recommendationsMap: Record<string, { action: string; priority: 'สูง' | 'กลาง' | 'ต่ำ' }[]> = {
  'มัลแวร์': [
    { action: 'ติดตั้ง/อัปเดต Antivirus และ EDR Solution', priority: 'สูง' },
    { action: 'กำหนดนโยบาย Patch Management อย่างสม่ำเสมอ', priority: 'สูง' },
    { action: 'จำกัดสิทธิ์ติดตั้งซอฟต์แวร์ (Least Privilege)', priority: 'กลาง' },
  ],
  'แรนซัมแวร์': [
    { action: 'จัดทำ Backup ตามหลัก 3-2-1 และทดสอบ Restore เป็นประจำ', priority: 'สูง' },
    { action: 'Network Segmentation เพื่อจำกัดการแพร่กระจาย', priority: 'สูง' },
    { action: 'ฝึกซ้อม Incident Response Tabletop Exercise', priority: 'กลาง' },
  ],
  'ฟิชชิง': [
    { action: 'จัดอบรม Security Awareness Training ประจำปี', priority: 'สูง' },
    { action: 'กำหนด Email Security Gateway พร้อม SPF/DKIM/DMARC', priority: 'สูง' },
    { action: 'เปิดใช้ Multi-Factor Authentication (MFA)', priority: 'สูง' },
  ],
  'การเข้าถึงโดยไม่ได้รับอนุญาต': [
    { action: 'กำหนด Network Access Control (NAC)', priority: 'สูง' },
    { action: 'Disable unused ports / accounts ทันที', priority: 'สูง' },
    { action: 'ตรวจสอบ Access Log และตั้ง Alert อัตโนมัติ', priority: 'กลาง' },
  ],
  'การรั่วไหลของข้อมูล': [
    { action: 'ติดตั้ง Data Loss Prevention (DLP)', priority: 'สูง' },
    { action: 'เข้ารหัสข้อมูลสำคัญ (Encryption at rest/transit)', priority: 'สูง' },
    { action: 'จัดหมวดหมู่ข้อมูล (Data Classification)', priority: 'กลาง' },
  ],
  'การโจมตี DoS/DDoS': [
    { action: 'ใช้บริการ Anti-DDoS / WAF', priority: 'สูง' },
    { action: 'กำหนด Rate Limiting บน API/Service', priority: 'กลาง' },
    { action: 'เตรียม Failover / CDN สำรอง', priority: 'กลาง' },
  ],
  'ระบบล้มเหลว': [
    { action: 'กำหนด High Availability และ Failover System', priority: 'สูง' },
    { action: 'ติดตั้ง Monitoring & Alerting (Memory, CPU, Disk)', priority: 'สูง' },
    { action: 'จัดทำ Capacity Planning และ Load Testing', priority: 'กลาง' },
  ],
  'Social Engineering': [
    { action: 'Security Awareness Training เน้น Social Engineering', priority: 'สูง' },
    { action: 'นโยบาย Verification Process สำหรับ Sensitive Actions', priority: 'สูง' },
    { action: 'Physical Security และ Visitor Management', priority: 'กลาง' },
  ],
  'ภัยคุกคามจากภายใน': [
    { action: 'User Behavior Analytics (UBA/UEBA)', priority: 'สูง' },
    { action: 'Privileged Access Management (PAM)', priority: 'สูง' },
    { action: 'Separation of Duties และ Least Privilege', priority: 'กลาง' },
  ],
  'ฮาร์ดแวร์ขัดข้อง': [
    { action: 'Preventive Maintenance Plan ประจำปี', priority: 'กลาง' },
    { action: 'Spare Parts / Hot Standby สำหรับอุปกรณ์สำคัญ', priority: 'กลาง' },
    { action: 'Hardware EOL tracking และแผนการเปลี่ยน', priority: 'ต่ำ' },
  ],
}

const priorityColor: Record<string, string> = { สูง: 'error', กลาง: 'warning', ต่ำ: 'default' }

const fmtDate = (d?: string | null) => d ? dayjs(d).format('DD/MM/YYYY') : '—'

const getMTTR = (r: IncidentReport): number | null => {
  if (r.mttrDays !== undefined && r.mttrDays !== null) return r.mttrDays
  if (!r.resolvedDate) return null
  return Math.max(0, dayjs(r.resolvedDate).diff(dayjs(r.incidentDate), 'day'))
}

// escape ค่าที่ผู้ใช้กรอก ก่อนแทรกลง HTML ของหน้าพิมพ์ (document.write ไม่ escape ให้)
const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

function buildPrintHtml(incidents: IncidentReport[], monthLabel: string): string {
  const total     = incidents.length
  const critical  = incidents.filter(i => i.severity === 'critical').length
  const high      = incidents.filter(i => i.severity === 'high').length
  const resolved  = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length
  const ncsaCount = incidents.filter(i => i.ncsaReported === 'Y').length

  const summaryRows = incidents.map((r, idx) => `
    <tr>
      <td>${idx + 1}</td><td>${esc(r.incidentNo)}</td><td>${fmtDate(r.incidentDate)}</td>
      <td>${esc(r.threatType)}</td><td>${esc(r.affectedSystem)}</td>
      <td style="color:${severityPrintColor[r.severity]};font-weight:600">${severityConfig[r.severity].ncsa} ${severityConfig[r.severity].label}</td>
      <td>${statusConfig[r.status].label}</td>
      <td>${r.ncsaReported === 'Y' ? '✓' : '—'}</td>
    </tr>`).join('')

  const detailCards = incidents.map(r => `
    <div class="card">
      <div class="card-header">
        <span>${esc(r.incidentNo)}</span>
        <span style="color:${severityPrintColor[r.severity]}">${severityConfig[r.severity].ncsa} — ${severityConfig[r.severity].label}</span>
        <span>${statusConfig[r.status].label}</span>
      </div>
      <div class="st">ส่วนที่ 1 : ข้อมูลทั่วไป</div>
      <div class="g2">
        <div><span class="lb">วันที่เกิดเหตุ</span>${fmtDate(r.incidentDate)}</div>
        <div><span class="lb">วันที่ตรวจพบ</span>${fmtDate(r.detectedDate)}</div>
        <div><span class="lb">ผู้แจ้งเหตุ</span>${esc(r.reportedBy)}</div>
        <div><span class="lb">หน่วยงาน</span>${esc(r.department)}</div>
      </div>
      <div class="st">ส่วนที่ 2 : รายละเอียดภัยคุกคาม</div>
      <div class="g2">
        <div><span class="lb">ประเภทภัยคุกคาม (สกมช)</span>${esc(r.threatType)}</div>
        <div><span class="lb">ช่องทาง/เวกเตอร์</span>${esc(r.attackVector)}</div>
        <div><span class="lb">ระบบที่ได้รับผลกระทบ</span>${esc(r.affectedSystem)}</div>
        <div><span class="lb">ทรัพย์สิน/อุปกรณ์</span>${r.affectedAssets ? esc(r.affectedAssets) : '—'}</div>
      </div>
      <div class="fr"><span class="lb">รายละเอียดเหตุการณ์</span><div class="vb">${esc(r.description)}</div></div>
      <div class="st">ส่วนที่ 3 : ผลกระทบ</div>
      <div class="g2">
        <div><span class="lb">ระดับความรุนแรง</span><span style="color:${severityPrintColor[r.severity]};font-weight:600">${severityConfig[r.severity].ncsa} (${severityConfig[r.severity].label})</span></div>
        <div><span class="lb">จำนวนผู้ใช้ที่กระทบ</span>${r.affectedUsers} คน</div>
        <div><span class="lb">ข้อมูลรั่วไหล</span>${r.dataBreached === 'Y' ? 'ใช่' : 'ไม่มี'}</div>
        <div><span class="lb">กระทบความต่อเนื่องบริการ</span>${r.continuityImpact === 'Y' ? 'ใช่' : 'ไม่มี'}</div>
      </div>
      <div class="fr"><span class="lb">ผลกระทบต่อการให้บริการ</span><div class="vb">${esc(r.impact)}</div></div>
      <div class="st">ส่วนที่ 4 : การวิเคราะห์สาเหตุ (Root Cause)</div>
      <div class="fr"><div class="vb">${r.rootCause ? esc(r.rootCause) : '—'}</div></div>
      <div class="st">ส่วนที่ 5 : มาตรการรับมือและการดำเนินการ</div>
      <div class="fr"><span class="lb">มาตรการเร่งด่วน</span><div class="vb">${r.immediateActions ? esc(r.immediateActions) : '—'}</div></div>
      <div class="fr"><span class="lb">การแก้ไขปัญหา</span><div class="vb">${r.resolution ? esc(r.resolution) : '—'}</div></div>
      <div class="fr"><span class="lb">มาตรการระยะยาว / ป้องกันการเกิดซ้ำ</span><div class="vb">${r.longTermMeasures ? esc(r.longTermMeasures) : '—'}</div></div>
      <div class="g2">
        <div><span class="lb">วันที่แก้ไขสำเร็จ</span>${r.resolvedDate ? fmtDate(r.resolvedDate) : '(ยังดำเนินการ)'}</div>
        <div><span class="lb">ผู้แก้ไข</span>${r.resolvedBy ? esc(r.resolvedBy) : '—'}</div>
      </div>
      <div class="st">ส่วนที่ 6 : การรายงานต่อ สกมช</div>
      <div class="g2">
        <div><span class="lb">แจ้ง สกมช แล้ว</span>${r.ncsaReported === 'Y' ? `✓ แจ้งแล้ว (${fmtDate(r.ncsaReportDate)})` : 'ยังไม่ได้แจ้ง'}</div>
        <div><span class="lb">เกี่ยวข้องกับ SLA</span>${r.isSlaRelated === 'Y' ? 'ใช่' : 'ไม่ใช่'}</div>
      </div>
    </div>`).join('')

  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"/>
<title>รายงานอุบัติการณ์ ${monthLabel}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
*{font-family:'Sarabun',sans-serif;box-sizing:border-box;margin:0;padding:0}
body{padding:24px;color:#111;font-size:12px;line-height:1.6}
h1{font-size:17px;font-weight:700;color:#6B21A8;text-align:center}
h2{font-size:13px;color:#6B21A8;text-align:center;margin-top:2px}
.sub{text-align:center;color:#555;font-size:11px;margin-bottom:4px}
.hr{border:none;border-top:2px solid #6B21A8;margin:12px 0}
.stats{display:flex;gap:12px;margin-bottom:16px}
.stat{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px;text-align:center}
.stat .n{font-size:22px;font-weight:700}.stat .l{font-size:11px;color:#555;margin-top:2px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead{background:#6B21A8;color:#fff}
th{padding:7px 6px;text-align:left;font-size:11px;font-weight:600}
td{padding:5px 6px;border-bottom:1px solid #eee;font-size:11px;vertical-align:top}
tr:nth-child(even){background:#f9f7ff}
.card{border:1px solid #ccc;border-radius:8px;padding:14px;margin-bottom:14px}
.card-header{display:flex;justify-content:space-between;font-weight:700;font-size:12px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #ddd}
.st{background:#ede9fe;color:#6B21A8;font-weight:700;font-size:11px;padding:4px 8px;border-radius:4px;margin:10px 0 6px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:6px}
.g2>div{display:flex;flex-direction:column}
.lb{color:#666;font-size:10px;margin-bottom:1px}
.fr{margin-bottom:6px}.vb{background:#f8f8f8;padding:6px 8px;border-radius:4px;margin-top:2px}
.pb{page-break-after:always}
.footer{margin-top:32px;display:flex;justify-content:space-around}
.sig{text-align:center;min-width:160px}
.sig-line{border-top:1px solid #333;padding-top:6px;margin-top:40px;font-size:11px}
@media print{body{padding:12px}}
</style></head><body>
<h1>รายงานอุบัติการณ์ระบบเทคโนโลยีสารสนเทศ</h1>
<h2>ประจำ${monthLabel}</h2>
<p class="sub">จัดทำตามแนวทางการรายงานของ สกมช (พ.ร.บ. ไซเบอร์ พ.ศ. 2562)</p>
<p class="sub">วันที่จัดทำรายงาน: ${dayjs().format('DD/MM/YYYY')}</p>
<hr class="hr"/>
<div class="stats">
  <div class="stat"><div class="n">${total}</div><div class="l">เหตุการณ์ทั้งหมด</div></div>
  <div class="stat"><div class="n" style="color:#dc2626">${critical}</div><div class="l">วิกฤต (ระดับ 1)</div></div>
  <div class="stat"><div class="n" style="color:#d97706">${high}</div><div class="l">สูง (ระดับ 2)</div></div>
  <div class="stat"><div class="n" style="color:#16a34a">${resolved}</div><div class="l">แก้ไขแล้ว</div></div>
  <div class="stat"><div class="n" style="color:#6B21A8">${ncsaCount}</div><div class="l">แจ้ง สกมช แล้ว</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>เลขที่</th><th>วันที่</th><th>ประเภทภัย</th><th>ระบบที่กระทบ</th><th>ความรุนแรง</th><th>สถานะ</th><th>สกมช</th></tr></thead>
  <tbody>${summaryRows}</tbody>
</table>
<div class="pb"></div>
<h2 style="margin-bottom:12px">รายละเอียดเหตุการณ์แต่ละรายการ</h2>
${detailCards}
<div class="footer">
  <div class="sig"><div class="sig-line">ผู้จัดทำรายงาน<br/>เจ้าหน้าที่งานเทคโนโลยีสารสนเทศ</div></div>
  <div class="sig"><div class="sig-line">ผู้ตรวจสอบ<br/>หัวหน้างานเทคโนโลยีสารสนเทศ</div></div>
  <div class="sig"><div class="sig-line">ผู้อนุมัติ<br/>ผู้อำนวยการโรงพยาบาล</div></div>
</div>
</body></html>`
}

export default function IncidentReportsPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  const [incidents, setIncidents]           = useState<IncidentReport[]>([])
  const [loading, setLoading]               = useState(false)
  const [threatTypeOpts, setThreatTypeOpts] = useState<{ value: number; label: string }[]>([])
  const [attackVectorOpts, setAttackVectorOpts] = useState<{ value: number; label: string }[]>([])
  const [affectedSystemOpts, setAffectedSystemOpts] = useState<{ value: number; label: string }[]>([])
  const [searchText, setSearchText]         = useState('')
  const [isDrawerOpen, setIsDrawerOpen]     = useState(false)
  const [editingIncident, setEditingIncident] = useState<IncidentReport | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [selectedMonth, setSelectedMonth]   = useState(dayjs())
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const loadIncidents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}?limit=200`)
      const json = await res.json()
      if (json.success) setIncidents(json.data.map(mapToLocal))
      else messageApi.error('โหลดข้อมูลไม่สำเร็จ')
    } catch {
      messageApi.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }, [messageApi])

  useEffect(() => {
    const loadMaster = async () => {
      try {
        const res  = await fetch(`${API}/master`)
        const json = await res.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toOpt = (t: any) => ({ value: t.id, label: t.label || t.name_th || String(t.id) })
        if (json.success && json.data) {
          if (json.data.threat_types?.length)     setThreatTypeOpts(json.data.threat_types.map(toOpt))
          else                                    setThreatTypeOpts(FALLBACK_THREAT_TYPES)
          if (json.data.attack_vectors?.length)   setAttackVectorOpts(json.data.attack_vectors.map(toOpt))
          else                                    setAttackVectorOpts(FALLBACK_ATTACK_VECTORS)
          if (json.data.affected_systems?.length) setAffectedSystemOpts(json.data.affected_systems.map(toOpt))
          else                                    setAffectedSystemOpts(FALLBACK_AFFECTED_SYSTEMS)
        } else {
          setThreatTypeOpts(FALLBACK_THREAT_TYPES)
          setAttackVectorOpts(FALLBACK_ATTACK_VECTORS)
          setAffectedSystemOpts(FALLBACK_AFFECTED_SYSTEMS)
        }
      } catch {
        setThreatTypeOpts(FALLBACK_THREAT_TYPES)
        setAttackVectorOpts(FALLBACK_ATTACK_VECTORS)
        setAffectedSystemOpts(FALLBACK_AFFECTED_SYSTEMS)
      }
    }
    loadMaster()
    loadIncidents()
  }, [loadIncidents])

  // ── Chart Options ─────────────────────────────────────────────────────────

  const threatTypeOption = useMemo(() => {
    const counts: Record<string, number> = {}
    incidents.forEach(i => { counts[i.threatType] = (counts[i.threatType] || 0) + 1 })
    const data = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} ครั้ง ({d}%)' },
      legend: { orient: 'vertical', right: '2%', top: 'middle', type: 'scroll', textStyle: { color: 'var(--app-text)', fontSize: 10 } },
      color: CHART_COLORS,
      series: [{ type: 'pie', radius: ['42%', '68%'], center: ['36%', '50%'],
        data: data.map(([name, value]) => ({ name, value })),
        label: { show: true, formatter: '{d}%', fontSize: 10, color: 'var(--app-text)' },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } }
      }],
    }
  }, [incidents])

  const severityOption = useMemo(() => {
    const d = [
      { name: 'วิกฤต (ระดับ 1)', value: incidents.filter(i => i.severity === 'critical').length, itemStyle: { color: '#ef4444' } },
      { name: 'สูง (ระดับ 2)',    value: incidents.filter(i => i.severity === 'high').length,     itemStyle: { color: '#f59e0b' } },
      { name: 'กลาง (ระดับ 3)',  value: incidents.filter(i => i.severity === 'medium').length,   itemStyle: { color: '#3b82f6' } },
      { name: 'ต่ำ (ระดับ 4)',   value: incidents.filter(i => i.severity === 'low').length,      itemStyle: { color: '#6b7280' } },
    ].filter(x => x.value > 0)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} ครั้ง ({d}%)' },
      legend: { bottom: 0, textStyle: { color: 'var(--app-text)', fontSize: 10 } },
      series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'], data: d,
        label: { formatter: '{b}\n{d}%', fontSize: 10, color: 'var(--app-text)' },
      }],
    }
  }, [incidents])

  const affectedSystemOption = useMemo(() => {
    const counts: Record<string, number> = {}
    incidents.forEach(i => { counts[i.affectedSystem] = (counts[i.affectedSystem] || 0) + 1 })
    const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1])
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 120, right: 40, top: 10, bottom: 10 },
      xAxis: { type: 'value', axisLabel: { color: 'var(--app-text-2)', fontSize: 10 }, splitLine: { lineStyle: { color: 'var(--app-border-strong)' } }, minInterval: 1 },
      yAxis: { type: 'category', data: sorted.map(([k]) => k), axisLabel: { color: 'var(--app-text)', fontSize: 10 } },
      series: [{ type: 'bar', data: sorted.map(([, v]) => v),
        itemStyle: { color: '#a855f7', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: 'var(--app-text)', fontSize: 11 },
      }],
    }
  }, [incidents])

  const attackVectorOption = useMemo(() => {
    const counts: Record<string, number> = {}
    incidents.forEach(i => { counts[i.attackVector] = (counts[i.attackVector] || 0) + 1 })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 20, right: 20, top: 20, bottom: 64 },
      xAxis: { type: 'category', data: sorted.map(([k]) => k), axisLabel: { color: 'var(--app-text)', fontSize: 9, rotate: 30 } },
      yAxis: { type: 'value', axisLabel: { color: 'var(--app-text-2)', fontSize: 10 }, splitLine: { lineStyle: { color: 'var(--app-border-strong)' } }, minInterval: 1 },
      series: [{ type: 'bar', data: sorted.map(([, v]) => v),
        itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: 'var(--app-text)', fontSize: 11 },
      }],
    }
  }, [incidents])

  const breachSummaryOption = useMemo(() => {
    const n = incidents.length
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, textStyle: { color: 'var(--app-text)', fontSize: 10 }, data: ['ใช่', 'ไม่ใช่'] },
      grid: { left: 150, right: 40, top: 10, bottom: 40 },
      xAxis: { type: 'value', max: n, axisLabel: { color: 'var(--app-text-2)', fontSize: 10 }, splitLine: { lineStyle: { color: 'var(--app-border-strong)' } } },
      yAxis: { type: 'category', data: ['ข้อมูลรั่วไหล', 'กระทบความต่อเนื่อง', 'เกี่ยวข้อง SLA', 'แจ้ง สกมช แล้ว'], axisLabel: { color: 'var(--app-text)', fontSize: 10 } },
      series: [
        { type: 'bar', name: 'ใช่', stack: 'total',
          data: [
            incidents.filter(i => i.dataBreached    === 'Y').length,
            incidents.filter(i => i.continuityImpact === 'Y').length,
            incidents.filter(i => i.isSlaRelated    === 'Y').length,
            incidents.filter(i => i.ncsaReported    === 'Y').length,
          ],
          itemStyle: { color: '#ef4444', borderRadius: [0, 4, 4, 0] },
          label: { show: true, color: '#fff', fontSize: 10, formatter: (p: { value: number }) => p.value > 0 ? String(p.value) : '' },
        },
        { type: 'bar', name: 'ไม่ใช่', stack: 'total',
          data: [
            n - incidents.filter(i => i.dataBreached    === 'Y').length,
            n - incidents.filter(i => i.continuityImpact === 'Y').length,
            n - incidents.filter(i => i.isSlaRelated    === 'Y').length,
            n - incidents.filter(i => i.ncsaReported    === 'Y').length,
          ],
          itemStyle: { color: 'var(--app-border-strong)', borderRadius: [0, 4, 4, 0] },
          label: { show: true, color: 'var(--app-text-2)', fontSize: 10, formatter: (p: { value: number }) => p.value > 0 ? String(p.value) : '' },
        },
      ],
    }
  }, [incidents])

  // ── Painpoint Analysis ─────────────────────────────────────────────────────

  const painpointData = useMemo(() => {
    const byThreat: Record<string, IncidentReport[]> = {}
    incidents.forEach(i => { (byThreat[i.threatType] = byThreat[i.threatType] || []).push(i) })
    return Object.entries(byThreat).sort((a, b) => b[1].length - a[1].length).map(([threat, items]) => {
      const mttrVals = items.map(getMTTR).filter((v): v is number => v !== null)
      const avgMTTR  = mttrVals.length ? Math.round(mttrVals.reduce((a, b) => a + b, 0) / mttrVals.length) : null
      const maxSev   = items.some(i => i.severity === 'critical') ? 'critical' : items.some(i => i.severity === 'high') ? 'high' : items.some(i => i.severity === 'medium') ? 'medium' : 'low'
      return { threat, count: items.length, avgMTTR, maxSev, hasBreach: items.some(i => i.dataBreached === 'Y'), systems: [...new Set(items.map(i => i.affectedSystem))] }
    })
  }, [incidents])

  const systemData = useMemo(() => {
    const bySys: Record<string, IncidentReport[]> = {}
    incidents.forEach(i => { (bySys[i.affectedSystem] = bySys[i.affectedSystem] || []).push(i) })
    return Object.entries(bySys).sort((a, b) => b[1].length - a[1].length).map(([system, items]) => {
      const mttrVals = items.map(getMTTR).filter((v): v is number => v !== null)
      const avgMTTR  = mttrVals.length ? Math.round(mttrVals.reduce((a, b) => a + b, 0) / mttrVals.length) : null
      return { system, count: items.length, avgMTTR, criticalCount: items.filter(i => i.severity === 'critical').length, hasBreach: items.some(i => i.dataBreached === 'Y') }
    })
  }, [incidents])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const filtered = incidents.filter(i =>
    i.description.toLowerCase().includes(searchText.toLowerCase()) ||
    i.affectedSystem.includes(searchText) || i.incidentNo.includes(searchText) ||
    i.reportedBy.includes(searchText) || i.threatType.includes(searchText)
  )

  const openAddDrawer = () => {
    setEditingIncident(null)
    form.resetFields()
    form.setFieldsValue({ isSlaRelated: 'N', severity: 'medium', status: 'open', ncsaReported: 'N', dataBreached: 'N', continuityImpact: 'N', affectedUsers: 0 })
    setIsDrawerOpen(true)
  }

  const openEditDrawer = (item: IncidentReport) => {
    setEditingIncident(item)
    form.setFieldsValue({
      ...item,
      incidentDate:    item.incidentDate    ? dayjs(item.incidentDate)    : null,
      detectedDate:    item.detectedDate    ? dayjs(item.detectedDate)    : null,
      resolvedDate:    item.resolvedDate    ? dayjs(item.resolvedDate)    : null,
      ncsaReportDate:  item.ncsaReportDate  ? dayjs(item.ncsaReportDate)  : null,
    })
    setIsDrawerOpen(true)
  }

  const handleDelete = (item: IncidentReport) => {
    Swal.fire({
      title: 'ยืนยันการลบ?', text: `ต้องการลบเหตุการณ์ ${item.incidentNo} ใช่หรือไม่`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280', confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก',
    }).then(async r => {
      if (!r.isConfirmed) return
      try {
        const res  = await fetch(`${API}/${item.id}`, { method: 'DELETE' })
        const json = await res.json()
        if (json.success) {
          setIncidents(prev => prev.filter(i => i.id !== item.id))
          messageApi.success('ลบรายการเรียบร้อยแล้ว')
        } else {
          messageApi.error(json.error?.message || 'ลบไม่สำเร็จ')
        }
      } catch {
        messageApi.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      }
    })
  }

  const handleSave = async (values: Record<string, unknown>) => {
    const fmt = (v: unknown, f: string) =>
      v && typeof v === 'object' && 'format' in v
        ? (v as { format: (s: string) => string }).format(f)
        : null
    const toDate     = (v: unknown) => fmt(v, 'YYYY-MM-DD')
    const toDatetime = (v: unknown) => fmt(v, 'YYYY-MM-DD HH:mm:ss')

    const body = {
      incident_date:       toDatetime(values.incidentDate) || dayjs().format('YYYY-MM-DD HH:mm:ss'),
      detected_date:       toDatetime(values.detectedDate) || dayjs().format('YYYY-MM-DD HH:mm:ss'),
      report_date:         dayjs().format('YYYY-MM-DD'),
      reported_by:         values.reportedBy,
      department:          values.department,
      threat_type_id:      values.threatTypeId,
      attack_vector_id:    values.attackVectorId,
      affected_system_id:  values.affectedSystemId,
      affected_assets:     values.affectedAssets || null,
      description:         values.description,
      severity:            values.severity,
      impact:              values.impact || null,
      affected_users:      values.affectedUsers || 0,
      data_breached:       values.dataBreached  || 'N',
      continuity_impact:   values.continuityImpact || 'N',
      root_cause:          values.rootCause || null,
      immediate_actions:   values.immediateActions || null,
      long_term_measures:  values.longTermMeasures || null,
      resolution:          values.resolution || null,
      resolved_date:       toDate(values.resolvedDate) || null,
      resolved_by:         values.resolvedBy || null,
      status:              values.status,
      ncsa_reported:       values.ncsaReported   || 'N',
      ncsa_report_date:    toDate(values.ncsaReportDate) || null,
      is_sla_related:      values.isSlaRelated   || 'N',
    }

    const url    = editingIncident ? `${API}/${editingIncident.id}` : API
    const method = editingIncident ? 'PUT' : 'POST'

    try {
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.success) {
        messageApi.error(json.error?.message || 'บันทึกไม่สำเร็จ')
        return
      }
      messageApi.success(editingIncident ? 'แก้ไขเรียบร้อยแล้ว' : 'บันทึกเหตุการณ์เรียบร้อยแล้ว')
      setIsDrawerOpen(false)
      form.resetFields()
      await loadIncidents()
    } catch {
      messageApi.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    }
  }

  const handlePrint = () => {
    const monthStr      = selectedMonth.format('YYYY-MM')
    const monthIncidents = incidents.filter(i => i.incidentDate.startsWith(monthStr))
    if (!monthIncidents.length) { messageApi.warning('ไม่พบข้อมูลในเดือนที่เลือก'); return }
    const monthLabel = `เดือน${selectedMonth.format('MM')} พ.ศ. ${Number(selectedMonth.format('YYYY')) + 543}`
    const win = window.open('', '_blank')
    if (!win) { messageApi.error('กรุณาอนุญาต popup'); return }
    win.document.write(buildPrintHtml(monthIncidents, monthLabel))
    win.document.close(); win.focus()
    setTimeout(() => win.print(), 600)
  }

  // ── Table Columns ──────────────────────────────────────────────────────────

  const columns = [
    { title: 'เลขที่',         dataIndex: 'incidentNo',   key: 'incidentNo',   width: 160, render: (no: string)  => <Text strong className="text-purple-400">{no}</Text> },
    { title: 'วันที่เกิดเหตุ', dataIndex: 'incidentDate', key: 'incidentDate', width: 115, render: (d: string)   => fmtDate(d) },
    { title: 'ประเภทภัยคุกคาม', key: 'threat', render: (_: unknown, r: IncidentReport) => <div><div className="font-medium">{r.threatType}</div><div className="text-xs text-gray-400">{r.affectedSystem}</div></div> },
    { title: 'รายละเอียด',     dataIndex: 'description',  key: 'description',  render: (d: string) => <div className="text-xs text-gray-300 line-clamp-2 max-w-xs">{d}</div> },
    { title: 'ระดับ (สกมช)',   dataIndex: 'severity',     key: 'severity',     width: 115, render: (s: string)   => <Tag color={severityConfig[s]?.color}>{severityConfig[s]?.ncsa} {severityConfig[s]?.label}</Tag> },
    { title: 'สถานะ',          dataIndex: 'status',       key: 'status',       width: 130, render: (s: string)   => <Tag color={statusConfig[s]?.color}>{statusConfig[s]?.label}</Tag> },
    { title: 'สกมช',           dataIndex: 'ncsaReported', key: 'ncsaReported', width: 90,  render: (v: 'Y' | 'N') => v === 'Y' ? <Tag color="purple">แจ้งแล้ว</Tag> : <Tag color="default">ยังไม่แจ้ง</Tag> },
    { title: 'จัดการ', key: 'action', width: 90, render: (_: unknown, r: IncidentReport) =>
      <Space>
        <Tooltip title="แก้ไข"><Button type="text" icon={<EditOutlined />} onClick={() => openEditDrawer(r)} /></Tooltip>
        <Tooltip title="ลบ"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} /></Tooltip>
      </Space>
    },
  ]

  // ── Section Header Helper ──────────────────────────────────────────────────

  const SectionHeader = ({ label }: { label: string }) => (
    <div className="mb-4 mt-1 px-3 py-2 rounded" style={{ background: '#2e1065', borderLeft: '3px solid #a855f7' }}>
      <Text strong style={{ color: '#a855f7' }}>{label}</Text>
    </div>
  )

  // ── Tab Contents ───────────────────────────────────────────────────────────

  const dashboardTab = (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card variant="borderless" title={<><AlertOutlined className="mr-2 text-purple-400" />ประเภทภัยคุกคาม</>} style={{ borderRadius: 12 }}>
            <EChart option={threatTypeOption} height={260} showToolbar />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card variant="borderless" title={<><WarningOutlined className="mr-2 text-yellow-400" />ระดับความรุนแรง (สกมช)</>} style={{ borderRadius: 12 }}>
            <EChart option={severityOption} height={260} showToolbar />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card variant="borderless" title={<><DesktopOutlined className="mr-2 text-blue-400" />ระบบที่ได้รับผลกระทบบ่อยที่สุด</>} style={{ borderRadius: 12 }}>
            <EChart option={affectedSystemOption} height={220} showToolbar />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card variant="borderless" title={<><SecurityScanOutlined className="mr-2 text-indigo-400" />ช่องทาง/เวกเตอร์การโจมตี</>} style={{ borderRadius: 12 }}>
            <EChart option={attackVectorOption} height={220} showToolbar />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card variant="borderless" title={<><SafetyOutlined className="mr-2 text-red-400" />การรั่วไหลของข้อมูล / ความต่อเนื่องบริการ / การรายงาน</>} style={{ borderRadius: 12 }}>
            <EChart option={breachSummaryOption} height={200} showToolbar />
          </Card>
        </Col>
      </Row>
    </div>
  )

  const listTab = (
    <Card variant="borderless" style={{ borderRadius: 12 }}>
      <div className="mb-4 flex items-center gap-3">
        <Input placeholder="ค้นหาด้วยเลขที่, ประเภทภัย, ระบบ, ผู้แจ้ง..." prefix={<SearchOutlined />} allowClear onChange={e => setSearchText(e.target.value)} style={{ maxWidth: 420 }} />
        {incidents.filter(i => i.ncsaReported === 'Y').length > 0 &&
          <Tag color="purple" icon={<AuditOutlined />}>แจ้ง สกมช แล้ว {incidents.filter(i => i.ncsaReported === 'Y').length} รายการ</Tag>}
      </div>
      <Table
        columns={columns} dataSource={filtered} rowKey="id" pagination={{ pageSize: 10 }} loading={loading}
        expandable={{ expandedRowRender: r => (
          <div className="p-4 bg-slate-800 rounded-lg space-y-3">
            <Row gutter={24}>
              <Col xs={24} md={12}><div className="text-xs text-gray-400 mb-1">ผู้แจ้ง / หน่วยงาน</div><Text>{r.reportedBy} — {r.department}</Text></Col>
              <Col xs={24} md={12}><div className="text-xs text-gray-400 mb-1">ช่องทาง/เวกเตอร์</div><Text>{r.attackVector}</Text></Col>
            </Row>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <div className="text-xs text-gray-400 mb-1">ผลกระทบ</div>
                <Text>{r.impact}</Text>
                <div className="mt-1">
                  {r.dataBreached    === 'Y' && <Tag color="red"    className="mr-1">ข้อมูลรั่วไหล</Tag>}
                  {r.continuityImpact === 'Y' && <Tag color="orange" className="mr-1">กระทบความต่อเนื่อง</Tag>}
                  <Tag>ผู้ใช้กระทบ {r.affectedUsers} คน</Tag>
                </div>
              </Col>
              <Col xs={24} md={12}><div className="text-xs text-gray-400 mb-1">สาเหตุที่แท้จริง</div><Text>{r.rootCause || '—'}</Text></Col>
            </Row>
            <Row gutter={24}>
              <Col xs={24} md={8}><div className="text-xs text-gray-400 mb-1">มาตรการเร่งด่วน</div><Text className="text-sm">{r.immediateActions || '—'}</Text></Col>
              <Col xs={24} md={8}><div className="text-xs text-gray-400 mb-1">การแก้ไขปัญหา</div><Text className="text-sm">{r.resolution || '—'}</Text></Col>
              <Col xs={24} md={8}><div className="text-xs text-gray-400 mb-1">มาตรการป้องกันระยะยาว</div><Text className="text-sm">{r.longTermMeasures || '—'}</Text></Col>
            </Row>
            {r.ncsaReported === 'Y' &&
              <Tag color="purple" icon={<AuditOutlined />}>แจ้ง สกมช แล้ว วันที่ {r.ncsaReportDate ? fmtDate(r.ncsaReportDate) : '—'}</Tag>}
          </div>
        ) }}
      />
    </Card>
  )

  const painpointTab = (
    <div className="space-y-6">
      <Card variant="borderless" title={<><FireOutlined className="mr-2 text-red-400" />ภัยคุกคามที่พบบ่อย (จัดลำดับ)</>} style={{ borderRadius: 12 }}>
        <Table
          dataSource={painpointData} rowKey="threat" pagination={false} size="small"
          columns={[
            { title: 'ลำดับ', key: 'rank', width: 60, render: (_: unknown, __: unknown, idx: number) => <Text strong className="text-purple-400">#{idx + 1}</Text> },
            { title: 'ประเภทภัยคุกคาม',  dataIndex: 'threat',   key: 'threat',   render: (t: string) => <Text strong>{t}</Text> },
            { title: 'จำนวน (ครั้ง)',    dataIndex: 'count',    key: 'count',    width: 100, render: (c: number) => <Tag color="purple">{c} ครั้ง</Tag> },
            { title: 'ความรุนแรงสูงสุด', dataIndex: 'maxSev',   key: 'maxSev',   width: 120, render: (s: string) => <Tag color={severityConfig[s]?.color}>{severityConfig[s]?.ncsa} {severityConfig[s]?.label}</Tag> },
            { title: 'MTTR เฉลี่ย',      dataIndex: 'avgMTTR',  key: 'avgMTTR',  width: 110, render: (v: number | null) => v !== null ? <span>{v === 0 ? '< 1 วัน' : `${v} วัน`}</span> : <Text type="secondary">ยังเปิดอยู่</Text> },
            { title: 'ระบบที่กระทบ',     dataIndex: 'systems',  key: 'systems',  render: (sys: string[]) => sys.map(s => <Tag key={s} className="mb-1">{s}</Tag>) },
            { title: 'ข้อมูลรั่วไหล',    dataIndex: 'hasBreach',key: 'hasBreach',width: 100, render: (v: boolean) => v ? <Tag color="error">มีรั่วไหล</Tag> : <Tag color="success">ไม่มี</Tag> },
          ]}
          expandable={{ expandedRowRender: r => {
            const recs = recommendationsMap[r.threat]
            if (!recs) return <Text type="secondary">ไม่มีข้อแนะนำเฉพาะ</Text>
            return (
              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="text-xs text-purple-300 font-semibold mb-2">ข้อเสนอแนะมาตรการ</div>
                <div className="space-y-1">
                  {recs.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Tag color={priorityColor[rec.priority]} className="shrink-0 mt-0.5">{rec.priority}</Tag>
                      <Text className="text-sm">{rec.action}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )
          }, expandRowByClick: false }}
        />
      </Card>

      <Card variant="borderless" title={<><DesktopOutlined className="mr-2 text-blue-400" />ระบบที่มีความเสี่ยงสูง (วิเคราะห์จากเหตุการณ์)</>} style={{ borderRadius: 12 }}>
        <Table
          dataSource={systemData} rowKey="system" pagination={false} size="small"
          columns={[
            { title: 'ระบบ',              dataIndex: 'system',        key: 'system',        render: (s: string) => <Text strong>{s}</Text> },
            { title: 'เหตุการณ์ทั้งหมด', dataIndex: 'count',         key: 'count',         width: 120, render: (c: number) => <Tag color="purple">{c} ครั้ง</Tag> },
            { title: 'วิกฤต',            dataIndex: 'criticalCount',  key: 'criticalCount',  width: 80,  render: (c: number) => c > 0 ? <Tag color="error">{c}</Tag> : <Text type="secondary">0</Text> },
            { title: 'MTTR เฉลี่ย',      dataIndex: 'avgMTTR',       key: 'avgMTTR',        width: 110, render: (v: number | null) => v !== null ? <span>{v === 0 ? '< 1 วัน' : `${v} วัน`}</span> : <Text type="secondary">—</Text> },
            { title: 'ข้อมูลรั่วไหล',    dataIndex: 'hasBreach',     key: 'hasBreach',      width: 110, render: (v: boolean) => v ? <Tag color="error">มีรั่วไหล</Tag> : <Tag color="success">ไม่มี</Tag> },
            { title: 'ระดับความเสี่ยง', key: 'risk', width: 130, render: (_: unknown, r: { count: number; criticalCount: number }) => {
              const risk  = r.criticalCount > 0 ? 'สูงมาก' : r.count >= 3 ? 'สูง' : r.count >= 2 ? 'กลาง' : 'ต่ำ'
              const color = r.criticalCount > 0 ? 'error' : r.count >= 3 ? 'warning' : r.count >= 2 ? 'processing' : 'default'
              return <Tag color={color}>{risk}</Tag>
            }},
          ]}
        />
      </Card>

      <Card variant="borderless" title={<><BulbOutlined className="mr-2 text-yellow-400" />ข้อเสนอแนะมาตรการ (Top 3 ภัยคุกคาม)</>} style={{ borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          {painpointData.slice(0, 3).map((p, idx) => {
            const recs = recommendationsMap[p.threat] || []
            return (
              <Col xs={24} md={8} key={p.threat}>
                <div className="rounded-lg p-4 h-full" style={{ background: '#1e1b4b', border: '1px solid #4c1d95' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#7c3aed', color: '#fff' }}>#{idx + 1}</div>
                    <Text strong style={{ color: '#c4b5fd' }}>{p.threat}</Text>
                    <Tag color={severityConfig[p.maxSev]?.color} className="ml-auto">{p.count} ครั้ง</Tag>
                  </div>
                  <div className="space-y-2">
                    {recs.length > 0 ? recs.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Tag color={priorityColor[rec.priority]} className="shrink-0 mt-0.5 text-xs">{rec.priority}</Tag>
                        <Text className="text-xs text-gray-300">{rec.action}</Text>
                      </div>
                    )) : <Text type="secondary" className="text-xs">ไม่มีข้อแนะนำเฉพาะ</Text>}
                  </div>
                </div>
              </Col>
            )
          })}
        </Row>
      </Card>
    </div>
  )

  const tabItems = [
    { key: 'dashboard', label: <span><BarChartOutlined className="mr-1" />Dashboard</span>,                           children: dashboardTab },
    { key: 'list',      label: <span><UnorderedListOutlined className="mr-1" />รายการอุบัติการณ์ ({incidents.length})</span>, children: listTab },
    { key: 'painpoint', label: <span><BulbOutlined className="mr-1" />วิเคราะห์ Painpoint</span>,                    children: painpointTab },
  ]

  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#6B21A8', borderRadius: 8 } }}>
      {contextHolder}
      <div className="min-h-screen bg-app-bg text-app-text">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/information-technology', title: <><DesktopOutlined /> งานคอมพิวเตอร์ฯ</> },
            { href: '/information-technology/hait', title: 'HAIT ข้อ 4' },
            { title: 'บันทึกอุบัติการณ์' }
          ]} className="mb-6" />

          <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <Title level={2} style={{ color: '#a855f7', margin: 0 }}>บันทึกอุบัติการณ์ระบบ IT</Title>
              <Text type="secondary">HAIT 4.4 — ตามแนวทาง สกมช (พ.ร.บ. ไซเบอร์ พ.ศ. 2562)</Text>
            </div>
            <Space>
              <Button icon={<PrinterOutlined />} onClick={() => setIsPdfModalOpen(true)}>รายงานประจำเดือน (PDF)</Button>
              <Button type="primary" icon={<PlusOutlined />} size="large" style={gBtn('#a855f7', '#d946ef')} className="transition-all duration-200 hover:-translate-y-px hover:brightness-110" onClick={openAddDrawer}>บันทึกเหตุการณ์ใหม่</Button>
            </Space>
          </div>

          <Row gutter={[16, 16]} className="mb-6">
            {([
              { title: 'เหตุการณ์ทั้งหมด', value: incidents.length, accent: 'purple' as Accent, icon: <SecurityScanOutlined /> },
              { title: 'วิกฤต (ระดับ 1)',   value: incidents.filter(i => i.severity === 'critical').length, accent: 'rose' as Accent, icon: <AlertOutlined /> },
              { title: 'ยังเปิดอยู่',       value: incidents.filter(i => i.status === 'open' || i.status === 'in_progress').length, accent: 'amber' as Accent, icon: <ClockCircleOutlined /> },
              { title: 'แก้ไขแล้ว',         value: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length, accent: 'emerald' as Accent, icon: <CheckCircleOutlined /> },
            ]).map(s => (
              <Col xs={12} sm={6} key={s.title}>
                <StatCard accent={s.accent} isDark={isDark} label={s.title} value={s.value} icon={s.icon} />
              </Col>
            ))}
          </Row>

          <Tabs defaultActiveKey="dashboard" items={tabItems} type="card" />
        </div>
      </div>

      {/* PDF Modal */}
      <Modal title={<><PrinterOutlined /> ออกรายงานอุบัติการณ์ประจำเดือน</>} open={isPdfModalOpen} onCancel={() => setIsPdfModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsPdfModalOpen(false)}>ยกเลิก</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>พิมพ์ / บันทึก PDF</Button>
        ]} width={480}>
        <div className="py-4 space-y-4">
          <div>
            <div className="text-sm text-gray-400 mb-2">เลือกเดือนที่ต้องการออกรายงาน</div>
            <DatePicker picker="month" value={selectedMonth} onChange={v => v && setSelectedMonth(v)} format="MM/YYYY" style={{ width: '100%' }} />
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-sm space-y-1">
            <div className="font-medium text-purple-400 mb-2">รายงานนี้ประกอบด้วย</div>
            {['สรุปสถิติเหตุการณ์ประจำเดือน','ตารางรายการเหตุการณ์ทั้งหมด','รายละเอียดแต่ละเหตุการณ์ตามมาตรฐาน สกมช','ประเภทภัยคุกคาม / ช่องทางการโจมตี','มาตรการรับมือเร่งด่วนและระยะยาว','สถานะการแจ้งไปยัง สกมช','ช่องลงนาม 3 ระดับ'].map(t => (
              <div key={t} className="text-gray-300">• {t}</div>
            ))}
          </div>
          <div className="text-xs text-gray-500">* จัดทำตามแนวทาง พ.ร.บ. การรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2562 และประกาศ สกมช</div>
        </div>
      </Modal>

      {/* Incident Form Drawer */}
      <Drawer
        title={<Space><SecurityScanOutlined style={{ color: '#a855f7' }} />{editingIncident ? 'แก้ไขบันทึกเหตุการณ์' : 'บันทึกเหตุการณ์ใหม่ (ตามมาตรฐาน สกมช)'}</Space>}
        open={isDrawerOpen} onClose={() => { setIsDrawerOpen(false); form.resetFields() }}
        styles={{ wrapper: { width: 720 } }}
        footer={
          <Space className="float-right">
            <Button onClick={() => { setIsDrawerOpen(false); form.resetFields() }}>ยกเลิก</Button>
            <Button type="primary" onClick={() => form.submit()}>บันทึก</Button>
          </Space>
        }>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <SectionHeader label="ส่วนที่ 1 — ข้อมูลทั่วไป" />
          <Row gutter={16}>
            <Col span={12}><Form.Item label="วันที่/เวลาเกิดเหตุ" name="incidentDate" rules={[{ required: true, message: 'กรุณาระบุวันที่เกิดเหตุ' }]}><DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" /></Form.Item></Col>
            <Col span={12}><Form.Item label="วันที่/เวลาตรวจพบ" name="detectedDate" dependencies={['incidentDate']} rules={[
              { required: true, message: 'กรุณาระบุวันที่ตรวจพบ' },
              {
                validator: (_: unknown, value: dayjs.Dayjs | null) => {
                  if (!value) return Promise.resolve()
                  if (value.isAfter(dayjs(), 'day')) return Promise.reject(new Error('วันที่ตรวจพบต้องไม่หลังวันที่รายงาน (วันปัจจุบัน)'))
                  const incidentDate = form.getFieldValue('incidentDate') as dayjs.Dayjs | null
                  if (incidentDate && value.isBefore(incidentDate)) return Promise.reject(new Error('วันที่ตรวจพบต้องไม่ก่อนวันที่เกิดเหตุ'))
                  return Promise.resolve()
                },
              },
            ]}><DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" disabledDate={d => d.isAfter(dayjs(), 'day')} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="ผู้แจ้งเหตุ"      name="reportedBy"  rules={[{ required: true, message: 'กรุณาระบุผู้แจ้ง' }]}><Input placeholder="ชื่อ-นามสกุล" /></Form.Item></Col>
            <Col span={12}><Form.Item label="หน่วยงาน/แผนก"   name="department"  rules={[{ required: true, message: 'กรุณาเลือกหน่วยงาน' }]}><Select options={departmentOptions} placeholder="เลือกหน่วยงาน" /></Form.Item></Col>
          </Row>

          <SectionHeader label="ส่วนที่ 2 — รายละเอียดภัยคุกคาม (ตาม สกมช)" />
          <Row gutter={16}>
            <Col span={12}><Form.Item label="ประเภทภัยคุกคาม"         name="threatTypeId"     rules={[{ required: true, message: 'กรุณาเลือกประเภทภัย' }]}><Select options={threatTypeOpts}      placeholder="เลือกประเภทภัยคุกคาม" /></Form.Item></Col>
            <Col span={12}><Form.Item label="ช่องทาง/เวกเตอร์การโจมตี" name="attackVectorId" rules={[{ required: true, message: 'กรุณาเลือกช่องทาง' }]}><Select options={attackVectorOpts}   placeholder="เลือกช่องทาง" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="ระบบที่ได้รับผลกระทบ"   name="affectedSystemId" rules={[{ required: true, message: 'กรุณาระบุระบบ' }]}><Select options={affectedSystemOpts} placeholder="เลือกระบบ" /></Form.Item></Col>
            <Col span={12}><Form.Item label="ทรัพย์สิน/อุปกรณ์ที่กระทบ" name="affectedAssets"><Input placeholder="ชื่ออุปกรณ์, เซิร์ฟเวอร์, IP" /></Form.Item></Col>
          </Row>
          <Form.Item label="รายละเอียดเหตุการณ์" name="description" rules={[{ required: true, message: 'กรุณาระบุรายละเอียด' }]}><TextArea rows={3} placeholder="อธิบายรายละเอียดเหตุการณ์ที่เกิดขึ้น" /></Form.Item>

          <SectionHeader label="ส่วนที่ 3 — ผลกระทบ" />
          <Form.Item label="ระดับความรุนแรง (ตาม สกมช)" name="severity" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid" className="w-full flex">
              <Radio.Button value="critical" className="flex-1 text-center">ระดับ 1 วิกฤต</Radio.Button>
              <Radio.Button value="high"     className="flex-1 text-center">ระดับ 2 สูง</Radio.Button>
              <Radio.Button value="medium"   className="flex-1 text-center">ระดับ 3 กลาง</Radio.Button>
              <Radio.Button value="low"      className="flex-1 text-center">ระดับ 4 ต่ำ</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="ผลกระทบต่อการให้บริการ" name="impact" rules={[{ required: true, message: 'กรุณาระบุผลกระทบ' }]}><TextArea rows={2} placeholder="ระบุผลกระทบต่อระบบ บริการ และผู้ใช้งาน" /></Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="จำนวนผู้ใช้ที่กระทบ"      name="affectedUsers"><InputNumber min={0} style={{ width: '100%' }} suffix="คน" /></Form.Item></Col>
            <Col span={8}><Form.Item label="มีข้อมูลรั่วไหล"           name="dataBreached"><Radio.Group><Radio value="Y">ใช่</Radio><Radio value="N">ไม่มี</Radio></Radio.Group></Form.Item></Col>
            <Col span={8}><Form.Item label="กระทบความต่อเนื่องบริการ"  name="continuityImpact"><Radio.Group><Radio value="Y">ใช่</Radio><Radio value="N">ไม่มี</Radio></Radio.Group></Form.Item></Col>
          </Row>

          <SectionHeader label="ส่วนที่ 4 — การวิเคราะห์สาเหตุ (Root Cause)" />
          <Form.Item label="สาเหตุที่แท้จริง" name="rootCause"><TextArea rows={3} placeholder="วิเคราะห์สาเหตุหลักที่ทำให้เกิดเหตุการณ์" /></Form.Item>

          <SectionHeader label="ส่วนที่ 5 — มาตรการรับมือและการดำเนินการ" />
          <Form.Item label="มาตรการรับมือเร่งด่วน (Immediate Response)" name="immediateActions"><TextArea rows={2} placeholder="ระบุมาตรการที่ดำเนินการทันทีเมื่อพบเหตุการณ์" /></Form.Item>
          <Form.Item label="การแก้ไขปัญหา"                               name="resolution"><TextArea rows={2} placeholder="วิธีแก้ไขปัญหาและขั้นตอนที่ดำเนินการ" /></Form.Item>
          <Form.Item label="มาตรการระยะยาว / ป้องกันการเกิดซ้ำ"         name="longTermMeasures"><TextArea rows={2} placeholder="มาตรการเพื่อป้องกันไม่ให้เกิดเหตุการณ์ซ้ำ" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="วันที่แก้ไขสำเร็จ"  name="resolvedDate"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col span={12}><Form.Item label="ผู้รับผิดชอบแก้ไข"  name="resolvedBy"><Input placeholder="ชื่อ-นามสกุล" /></Form.Item></Col>
          </Row>

          <SectionHeader label="ส่วนที่ 6 — สถานะและการรายงาน" />
          <Row gutter={16}>
            <Col span={12}><Form.Item label="สถานะ"              name="status"       rules={[{ required: true }]}><Select options={statusOptions} placeholder="เลือกสถานะ" /></Form.Item></Col>
            <Col span={12}><Form.Item label="เกี่ยวข้องกับ SLA"  name="isSlaRelated"><Radio.Group><Radio value="Y">เป็นรายการ SLA</Radio><Radio value="N">ไม่ใช่ SLA</Radio></Radio.Group></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="แจ้ง สกมช แล้ว"    name="ncsaReported"><Radio.Group><Radio value="Y">แจ้งแล้ว</Radio><Radio value="N">ยังไม่ได้แจ้ง</Radio></Radio.Group></Form.Item></Col>
            <Col span={12}><Form.Item label="วันที่แจ้ง สกมช"   name="ncsaReportDate"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          </Row>
        </Form>
      </Drawer>
    </ConfigProvider>
  )
}
