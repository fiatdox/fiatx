'use client'
import { useState, useMemo, useEffect } from 'react'
import Cookies from 'js-cookie'
import dayjs, { Dayjs } from 'dayjs'
import {
  ConfigProvider, App, theme, Form, Input, DatePicker, Button, Table, Tag, Tabs,
  Typography, Breadcrumb, Row, Col, Card, Badge, Modal, Space, Radio, Alert, Descriptions, Select,
  Spin, Image as AntImage, Checkbox,
} from 'antd'
import {
  ToolOutlined, CheckCircleOutlined, CloseCircleOutlined, HomeOutlined,
  ShoppingCartOutlined, SwapOutlined, InfoCircleOutlined, FileTextOutlined,
  AuditOutlined, SafetyCertificateOutlined, CheckSquareOutlined,
  ClockCircleOutlined, UserOutlined, EnvironmentOutlined, BarcodeOutlined,
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { TextArea } = Input

// ── Types ──────────────────────────────────────────────────────────────────────

type RepairStatus =
  | 'pending' | 'assigned' | 'in_progress' | 'waiting_pr'
  | 'recommend_replacement' | 'pending_it_approval' | 'pending_mission_approval'
  | 'po_processing' | 'awaiting_delivery'
  | 'purchase_approved' | 'completed' | 'cancelled'

type RepairResult =
  | 'fixed_no_parts' | 'fixed_with_parts' | 'fixed_need_purchase' | 'cannot_fix_replace' | 'external_service'

type ReplacementHandover = 'return_to_owner' | 'return_to_procurement'

type UserRole = 'it_officer' | 'technician' | 'it_head' | 'mission_head'

interface Approval {
  status: 'pending' | 'approved' | 'rejected'
  by?: string
  date?: string
  note?: string
}

// ประวัติขอเพิ่มเวลา 1 รายการ (map มาจาก GET /repair-requests/{id}/extensions)
interface RepairExtension {
  days: number
  reason: string
  date: string          // วันเวลาที่ขอ (แสดงผลแล้ว)
  by?: string           // ชื่อผู้ขอ
  prevDueIso?: string   // กำหนดเดิม
  newDueIso?: string    // กำหนดใหม่
}

interface ManageRepairRequest {
  id: string; apiId?: number; requestDate: string; createdAtIso?: string; requesterName: string; department: string; phone: string
  deviceType: string; deviceBrand: string; deviceSerial?: string; assetNo?: string
  deviceLocation?: string; problemCategory: string; symptom: string
  urgency: 'low' | 'medium' | 'high' | 'critical'; status: RepairStatus
  assignedTo?: string; assignedTechId?: string; assignedBy?: string; assignedDate?: string; assignedDateIso?: string
  estimatedDays?: number; dueDateIso?: string
  technicianPriorityId?: number; technicianPriorityName?: string
  extensions?: RepairExtension[]
  repairAssessmentId?: number
  repairResult?: RepairResult; technicianNote?: string; partsUsed?: string
  prNote?: string; prNumber?: string; prIssuedBy?: string; prIssuedDate?: string; prDocuments?: number[]
  // สถานะ PR/PO จากระบบ inventory/พัสดุ — GET /repair-requests/{id}/pr-status
  prStatus?: {
    found: boolean; issued: boolean; requestNo?: string; approveDate?: string
    poApproveDate?: string  // request_receive_date — ถ้ามี = ออก PO แล้ว
    paidStatusName?: string // paid_status_name เช่น "ส่งการเงิน"
  }
  prTaskSteps?: number[]  // ขั้นงานที่เจ้าหน้าที่ทำเสร็จแล้วระหว่างออก PR (PR_TASK_STEPS) — ติ๊กได้หลายขั้น
  prTaskNote?: string     // หมายเหตุ/รายละเอียดการดำเนินการจนถึงวันนี้
  prTrackingStatus?: 'awaiting_signature' | 'pr_approved' | 'request_po' | 'po_issued' | 'tracking_po' | 'po_approved' | 'waiting_delivery' | 'received'
  replacementNote?: string
  replacementHandover?: ReplacementHandover
  externalServiceNote?: string
  itHeadApproval?: Approval; missionHeadApproval?: Approval
  resolvedNote?: string; resolvedDate?: string
}

// ── Config ─────────────────────────────────────────────────────────────────────

const statusConfig: Record<RepairStatus, { color: string; label: string }> = {
  pending:                  { color: 'warning',    label: 'รอดำเนินการ' },
  assigned:                 { color: 'processing', label: 'มอบหมายแล้ว' },
  in_progress:              { color: 'blue',       label: 'กำลังซ่อม' },
  waiting_pr:               { color: 'orange',     label: 'รออะไหล่ / PR' },
  recommend_replacement:    { color: 'pink',       label: 'แนะนำซื้อทดแทน' },
  pending_it_approval:      { color: 'purple',     label: 'รออนุมัติหัวหน้า IT / หัวหน้าภารกิจ' },
  pending_mission_approval: { color: 'magenta',    label: 'รออนุมัติหัวหน้ากลุ่ม' },
  po_processing:            { color: '#0d9488',    label: 'ขั้นตอน PO โดยพัสดุ / เสนอผู้อำนวยการ' },
  awaiting_delivery:        { color: 'cyan',       label: 'รอรับของ / รับอะไหล่' },
  purchase_approved:        { color: 'cyan',       label: 'อนุมัติแล้ว' },
  completed:                { color: 'success',    label: 'เสร็จสิ้น' },
  cancelled:                { color: 'error',      label: 'ยกเลิก' },
}

const urgencyConfig = {
  low:      { color: 'default',    label: 'ปกติ' },
  medium:   { color: 'processing', label: 'ปานกลาง' },
  high:     { color: 'warning',    label: 'เร่งด่วน' },
  critical: { color: 'error',      label: 'วิกฤต' },
}

// จุดสีบอกระดับความเร่งด่วน — เขียว → เหลือง → ส้ม → แดง
const URGENCY_DOT: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
}

// แปลง display_order ของ priority-level → ระดับความเร่งด่วน (1=ปกติ … 4=วิกฤต)
const urgencyByOrder = (order: number): 'low' | 'medium' | 'high' | 'critical' =>
  order >= 4 ? 'critical' : order === 3 ? 'high' : order === 2 ? 'medium' : 'low'

const repairResultConfig: Record<RepairResult, { label: string; color: string }> = {
  fixed_no_parts:      { label: 'ซ่อมได้ — ไม่ใช้อะไหล่',         color: '#22c55e' },
  fixed_with_parts:    { label: 'ซ่อมได้ — ใช้อะไหล่ในคลัง',      color: '#34d399' },
  fixed_need_purchase: { label: 'ซ่อมได้ — ต้องสั่งซื้ออะไหล่',    color: '#fbbf24' },
  cannot_fix_replace:  { label: 'ซ่อมไม่ได้ — แนะนำซื้อทดแทน',    color: '#f472b6' },
  external_service:    { label: 'ซ่อมไม่ได้ — จ้างบริษัทภายนอก',  color: '#a78bfa' },
}

interface ApiRepairAssessment {
  repair_assessment_id: number
  assessment_name: string
  // สถานะถัดไปเมื่อหัวหน้าภารกิจอนุมัติ (process_status_id) — null = ผลประเมินที่ไม่ต้องขออนุมัติ
  approve_process_id: number | null
  is_active: string
  created_at: string
}

interface ApiPriorityLevel {
  it_priority_level_id: number
  name: string
  description: string
  response_days: number | null
  display_order: number
}

const ASSESSMENT_ID_TO_RESULT: Record<number, RepairResult> = {
  1: 'fixed_no_parts',
  2: 'fixed_with_parts',
  3: 'fixed_need_purchase',
  4: 'cannot_fix_replace',
  5: 'external_service',
}

const ASSESSMENT_DESC: Record<RepairResult, string> = {
  fixed_no_parts:      'ไม่ต้องใช้อะไหล่ใด ๆ',
  fixed_with_parts:    'ใช้อะไหล่จากคลังสินค้า',
  fixed_need_purchase: 'ต้องจัดซื้ออะไหล่เพิ่มเติม',
  cannot_fix_replace:  'ค่าซ่อมไม่คุ้ม / เสียหายหนัก',
  external_service:    'ส่งให้บริษัทภายนอกซ่อม',
}

const REPLACEMENT_HANDOVER_CONFIG: Record<ReplacementHandover, { label: string; color: string }> = {
  return_to_owner:       { label: 'ส่งคืนเจ้าของงาน / หน่วยงาน', color: '#22c55e' },
  return_to_procurement: { label: 'ส่งคืนงานพัสดุ',               color: '#0ea5e9' },
}

const RETURN_STATUS_ID_TO_KEY: Record<number, ReplacementHandover> = {
  1: 'return_to_owner',
  2: 'return_to_procurement',
}

const DEVICE_TYPE_LABEL: Record<string, string> = {
  desktop:    'คอมพิวเตอร์ตั้งโต๊ะ',
  laptop:     'คอมพิวเตอร์โน้ตบุ๊ก',
  printer:    'เครื่องพิมพ์',
  scanner:    'สแกนเนอร์',
  network:    'อุปกรณ์เครือข่าย',
  peripheral: 'อุปกรณ์ต่อพ่วง',
  other:      'อื่น ๆ',
}

const PROBLEM_CATEGORY_LABEL: Record<string, { label: string; color: string }> = {
  hardware:        { label: 'ฮาร์ดแวร์',     color: '#f87171' },
  software:        { label: 'ซอฟต์แวร์',     color: '#60a5fa' },
  peripheral:      { label: 'อุปกรณ์ต่อพ่วง', color: '#34d399' },
  network:         { label: 'เครือข่าย',     color: '#fbbf24' },
  other:           { label: 'อื่น ๆ',         color: '#94a3b8' },
  'ฮาร์ดแวร์':     { label: 'ฮาร์ดแวร์',     color: '#f87171' },
  'ซอฟต์แวร์':     { label: 'ซอฟต์แวร์',     color: '#60a5fa' },
  'อุปกรณ์ต่อพ่วง': { label: 'อุปกรณ์ต่อพ่วง', color: '#34d399' },
  'เครือข่าย':     { label: 'เครือข่าย',     color: '#fbbf24' },
  'อื่น ๆ':         { label: 'อื่น ๆ',         color: '#94a3b8' },
}

interface ApiRepairRequest {
  it_repair_request_id: number
  equipment_number: string
  equipment_name: string
  brand: string | null
  location: string
  problem_description: string
  created_at: string
  equipment_type_name: string
  problem_category_name: string
  priority_name: string
  process_status_name: string
  process_status_id: number
  created_by_name: string
  major_name: string
  submajor_name: string | null
  // ข้อมูลช่างรับงาน (เพิ่มจาก backend)
  assigned_to?: number | null
  assigned_to_name?: string | null
  assign_datetime?: string | null
  estimated_days?: number | null
  estimated_completion_date?: string | null
  technician_priority_id?: number | null
  technician_priority_name?: string | null
  // ผลประเมินของช่าง (มากับงานที่บันทึกผลแล้ว เช่น รออนุมัติหัวหน้า IT)
  repair_assessment_id?: number | null
  assessment_name?: string | null
  assessment_detail?: string | null
}

const URGENCY_BY_PRIORITY_NAME: Record<string, ManageRepairRequest['urgency']> = {
  'ด่วนมาก': 'critical',
  'ด่วน':    'high',
  'ปานกลาง': 'medium',
  'ปกติ':    'low',
}

const STATUS_BY_PROCESS_ID: Record<number, RepairStatus> = {
  1: 'pending',
  2: 'in_progress',
  3: 'waiting_pr',
  4: 'recommend_replacement',
  5: 'completed',
  6: 'pending_it_approval',
  7: 'po_processing',
  8: 'awaiting_delivery',
  9: 'pending_mission_approval',  // หัวหน้า IT อนุมัติแล้ว — รอหัวหน้าภารกิจ
  10: 'cancelled',
  11: 'purchase_approved',        // อนุมัติซื้อทดแทน (approve_process_id ของผลประเมิน "แนะนำซื้อทดแทน")
}

const toSlashDate = (iso?: string | null): string | undefined => {
  if (!iso) return undefined
  const d = new Date(iso)
  if (isNaN(d.getTime())) return undefined
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`
}

const apiToManageRequest = (r: ApiRepairRequest): ManageRepairRequest => {
  const d = new Date(r.created_at)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const due = r.estimated_completion_date ? new Date(r.estimated_completion_date) : null
  return {
    id:             `IT-${String(r.it_repair_request_id).padStart(4, '0')}`,
    apiId:          r.it_repair_request_id,
    requestDate:    `${dd}/${mm}/${d.getFullYear()}`,
    createdAtIso:   r.created_at,
    requesterName:  r.created_by_name,
    department:     r.major_name,
    phone:          '-',
    deviceType:     r.equipment_type_name,
    deviceBrand:    r.brand ?? r.equipment_type_name,
    assetNo:        r.equipment_number || undefined,
    deviceLocation: r.location || undefined,
    problemCategory: r.problem_category_name,
    symptom:        r.problem_description,
    urgency:        URGENCY_BY_PRIORITY_NAME[r.priority_name] ?? 'low',
    status:         STATUS_BY_PROCESS_ID[r.process_status_id] ?? 'pending',
    // ช่างรับงาน
    assignedTo:             r.assigned_to_name || undefined,
    assignedTechId:         r.assigned_to != null ? String(r.assigned_to) : undefined,
    assignedDate:           toSlashDate(r.assign_datetime),
    assignedDateIso:        r.assign_datetime ?? undefined,
    estimatedDays:          r.estimated_days ?? undefined,
    dueDateIso:             due && !isNaN(due.getTime()) ? due.toISOString() : undefined,
    technicianPriorityId:   r.technician_priority_id ?? undefined,
    technicianPriorityName: r.technician_priority_name || undefined,
    // ผลประเมินของช่าง — ใช้แสดงให้หัวหน้า IT / หัวหน้าภารกิจตอนพิจารณาอนุมัติ
    repairAssessmentId:     r.repair_assessment_id ?? undefined,
    repairResult:           r.repair_assessment_id != null ? ASSESSMENT_ID_TO_RESULT[r.repair_assessment_id] : undefined,
    technicianNote:         r.assessment_detail || undefined,
  }
}

const daysSince = (isoOrSlash?: string): number | null => {
  if (!isoOrSlash) return null
  const from = isoOrSlash.includes('T')
    ? new Date(isoOrSlash)
    : (() => {
        const parts = isoOrSlash.split('/').map(Number)
        if (parts.length !== 3) return new Date(NaN)
        const [d, m, y] = parts
        return new Date(y, m - 1, d)
      })()
  if (isNaN(from.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - from.getTime()) / 86400000))
}

const daysColor = (days: number): string => {
  if (days <= 3)  return '#22c55e'
  if (days <= 7)  return '#f59e0b'
  if (days <= 14) return '#f97316'
  return '#ef4444'
}

// จำนวนวันที่ช่างใช้ดำเนินการ — นับจากวันรับงานถึงวันนี้
// ถ้าไม่มี ISO วันรับงาน ประมาณจากกำหนดเสร็จ - จำนวนวันที่ขอ
const techWorkingDays = (r: ManageRepairRequest): number | null => {
  if (r.assignedDateIso) return daysSince(r.assignedDateIso)
  if (r.dueDateIso && r.estimatedDays != null) {
    const start = dayjs(r.dueDateIso).subtract(r.estimatedDays, 'day').startOf('day')
    return Math.max(0, dayjs().startOf('day').diff(start, 'day'))
  }
  return null
}

// จำนวนวันที่เหลือจนถึงวันครบกำหนด (บวก = เหลือ, 0 = วันนี้, ลบ = เกินกำหนด)
const daysUntil = (iso?: string): number | null => {
  if (!iso) return null
  const due = new Date(iso)
  if (isNaN(due.getTime())) return null
  const t = new Date(); t.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - t.getTime()) / 86400000)
}

const dueStatus = (left: number): { color: string; label: string } => {
  if (left > 1)   return { color: '#22c55e', label: `เหลืออีก ${left} วัน` }
  if (left === 1) return { color: '#f59e0b', label: 'เหลืออีก 1 วัน' }
  if (left === 0) return { color: '#f59e0b', label: 'ครบกำหนดวันนี้' }
  return { color: '#ef4444', label: `เกินกำหนด ${Math.abs(left)} วัน` }
}

const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`
}

// วันเวลาที่ส่งคำขอ — DD/MM/พ.ศ. HH:mm น.
const fmtDateTime = (isoOrSlash?: string): string | null => {
  if (!isoOrSlash) return null
  const d = new Date(isoOrSlash)
  if (isNaN(d.getTime())) return isoOrSlash
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time} น.`
}

// กำหนดเสร็จล่าสุดของงาน — ถ้าเคยขอเพิ่มเวลาแล้ว ใช้กำหนดใหม่ของการขอครั้งล่าสุด (extensions[0])
// แทนกำหนดแรก เพื่อให้การขอครั้งถัดไปต่อจากกำหนดล่าสุดเสมอ ไม่เลือกวันย้อนซ้ำของเดิม
const effectiveDueIso = (r: ManageRepairRequest): string | undefined => {
  const latest = r.extensions?.[0]?.newDueIso
  if (!latest) return r.dueDateIso
  if (!r.dueDateIso) return latest
  return new Date(latest) > new Date(r.dueDateIso) ? latest : r.dueDateIso
}

// กำหนดเสร็จครั้งแรกที่สัญญาไว้ — ถ้าเคยผลัดสัญญา ใช้กำหนดเดิมของการขอครั้งแรกสุด (extensions ตัวท้ายสุด)
const originalDueIso = (r: ManageRepairRequest): string | undefined => {
  const exts = r.extensions
  if (exts && exts.length > 0) {
    const first = exts[exts.length - 1].prevDueIso
    if (first) return first
  }
  return r.dueDateIso
}

// แถบแสดงกำหนดเวลาซ่อม — ใช้ในการ์ด kanban และการ์ดช่าง
// ถ้าเคยผลัดสัญญา: แสดง "สัญญาแรก → ผลัด N ครั้ง → กำหนดล่าสุด" ให้เห็นครบในบรรทัดเดียว
const renderDue = (r: ManageRepairRequest) => {
  const dueIso = effectiveDueIso(r)
  const left = daysUntil(dueIso)
  if (left === null) return null
  const ds = dueStatus(left)
  const extCount = r.extensions?.length ?? 0
  const firstIso = originalDueIso(r)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px 5px', marginBottom: 6, fontSize: 10,
      padding: '4px 7px', borderRadius: 6, background: ds.color + '14', border: `1px solid ${ds.color}33`,
    }}>
      <ClockCircleOutlined style={{ fontSize: 10, color: ds.color }} />
      {extCount > 0 && firstIso ? (
        <>
          <span style={{ color: '#94a3b8' }}>สัญญาแรก {fmtDate(firstIso)}</span>
          <span style={{ color: '#475569' }}>·</span>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>ผลัดสัญญา {extCount} ครั้ง</span>
          <span style={{ color: '#475569' }}>·</span>
          {dueIso && <span style={{ color: '#e2e8f0', fontWeight: 600 }}>ล่าสุด {fmtDate(dueIso)}</span>}
        </>
      ) : (
        <>
          {r.estimatedDays != null && (
            <>
              <span style={{ color: '#94a3b8' }}>ขอเวลา {r.estimatedDays} วัน</span>
              <span style={{ color: '#475569' }}>·</span>
            </>
          )}
          {dueIso && <span style={{ color: '#94a3b8' }}>กำหนดเสร็จ {fmtDate(dueIso)}</span>}
        </>
      )}
      <span style={{ color: '#475569' }}>·</span>
      <span style={{ color: ds.color, fontWeight: 600 }}>{ds.label}</span>
    </div>
  )
}

// รายการประวัติขอเพิ่มเวลา — ต่อท้ายการ์ด (API ส่งมาเรียงล่าสุด → เก่าสุดอยู่แล้ว)
// ย่อเหลือรายการล่าสุดรายการเดียว กดขยายดูทั้งหมดได้ — กันการ์ดยาวเกินเมื่อผลัดหลายครั้ง
const ExtensionHistory = ({ exts }: { exts?: RepairExtension[] }) => {
  const [open, setOpen] = useState(false)
  if (!exts || exts.length === 0) return null
  const shown = open ? exts : exts.slice(0, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
      {shown.map((ex, i) => (
        <div key={i} style={{
          fontSize: 10, lineHeight: 1.5, padding: '3px 7px', borderRadius: 6,
          background: '#f59e0b0d', border: '1px dashed #f59e0b2e',
        }}>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>+{ex.days} วัน</span>
          {ex.newDueIso && <span style={{ color: '#94a3b8' }}> → กำหนดใหม่ {fmtDate(ex.newDueIso)}</span>}
          <span style={{ color: '#475569' }}> · {ex.date}</span>
          <div style={{ color: '#94a3b8' }}>
            {ex.reason}
            {ex.by && <span style={{ color: '#64748b' }}> — {ex.by}</span>}
          </div>
        </div>
      ))}
      {exts.length > 1 && (
        <a
          onClick={() => setOpen(o => !o)}
          style={{ fontSize: 10, color: '#f59e0b', userSelect: 'none' }}
        >
          {open ? '▲ ย่อประวัติผลัดสัญญา' : `▼ ดูประวัติผลัดสัญญาทั้งหมด (${exts.length} ครั้ง)`}
        </a>
      )}
    </div>
  )
}

// GET /repair-requests/{id}/extensions
interface ApiRepairExtension {
  it_repair_request_extension_id: number
  it_repair_request_id: number
  previous_estimated_completion_date: string
  new_estimated_completion_date: string
  extension_days: number
  extension_reason: string
  requested_at: string
  requested_by: number
  requested_by_name: string
}

const apiToExtension = (e: ApiRepairExtension): RepairExtension => ({
  days:       e.extension_days,
  reason:     e.extension_reason,
  date:       fmtDateTime(e.requested_at) ?? '',
  by:         e.requested_by_name || undefined,
  prevDueIso: e.previous_estimated_completion_date || undefined,
  newDueIso:  e.new_estimated_completion_date || undefined,
})

const PR_TRACKING_CONFIG: Record<NonNullable<ManageRepairRequest['prTrackingStatus']>, { label: string; color: string }> = {
  awaiting_signature: { label: 'รอผอ.เซ็น',                    color: '#f59e0b' },
  pr_approved:        { label: 'อนุมัติ PR',                   color: '#3b82f6' },
  request_po:         { label: 'ดำเนินการให้พัสดุออก PO',     color: '#8b5cf6' },
  po_issued:          { label: 'ออก PO แล้ว',                  color: '#a78bfa' },
  tracking_po:        { label: 'ติดตาม PO',                    color: '#f97316' },
  po_approved:        { label: 'อนุมัติ PO',                   color: '#06b6d4' },
  waiting_delivery:   { label: 'รอรับของ',                     color: '#0ea5e9' },
  received:           { label: 'ได้รับอะไหล่แล้ว',            color: '#22c55e' },
}

// ขั้นงานของเจ้าหน้าที่ IT — ดึงจาก GET /api/v1/it/repair-work-steps
interface WorkStep {
  id: number
  step_code: string
  name_th: string
  sort_order: number
}

// ขั้นตอนติดตาม PO ของธุรการ (คอลัมน์ po_processing) — รายการคงที่ (รอ API จริง)
const PO_TRACKING_STEPS: WorkStep[] = [
  { id: 1, step_code: 'pr_approved', name_th: 'อนุมัติ PR แล้ว', sort_order: 1 },
  { id: 2, step_code: 'po_approved', name_th: 'อนุมัติ PO แล้ว', sort_order: 2 },
]

// 1 รายการประวัติอัพเดทความคืบหน้า — GET /repair-requests/{id}/progress
interface ProgressEntry {
  id: number
  note: string
  created_by_name: string
  created_at: string
  completed_steps: { id: number; step_code: string; name_th: string }[]
}

// เอกสารแนบประกอบการบันทึกเตรียมนำเสนอ — ดึงจาก GET /api/v1/it/pr-document-types
interface PrDocumentType {
  id: number
  doc_code: string
  name_th: string
  sort_order: number
}

const API_ROLE_MAP: Record<string, UserRole> = {
  IT_Staff:         'it_officer',
  IT_Head:          'it_head',
  Technician:       'technician',
  Mission_Head:     'mission_head',
  CHIEF_GROUP_IT:   'it_head',       // หัวหน้ากลุ่มงาน IT
  CHIEF_MISSION_IT: 'mission_head',  // หัวหน้าภารกิจ
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; name: string; techId?: string }> = {
  it_officer:   { label: 'เจ้าหน้าที่ IT',     color: '#6d28d9', name: 'นางสาวสุดา ไอที' },
  technician:   { label: 'ช่าง / เจ้าหน้าที่', color: '#2563eb', name: 'นายวิชัย คอมดี', techId: 'tech-01' },
  it_head:      { label: 'หัวหน้า IT',          color: '#7c3aed', name: 'นายกิตติ หัวหน้า IT' },
  mission_head: { label: 'หัวหน้ากลุ่มภารกิจ', color: '#0e7490', name: 'นายเจริญ หัวหน้ากลุ่ม' },
}

// ── PageContent ────────────────────────────────────────────────────────────────

const PageContent = () => {
  const allowedRoles = useMemo<UserRole[]>(() => {
    try {
      const raw = Cookies.get('user_data')
      if (!raw) return []
      const apiRoles: string[] = JSON.parse(raw).roles ?? []
      return apiRoles.map(r => API_ROLE_MAP[r]).filter(Boolean) as UserRole[]
    } catch {
      return []
    }
  }, [])

  // ชื่อผู้ใช้ที่ล็อกอินอยู่ — ใช้เป็น "ผู้รับงาน" ตอนกดรับงาน
  const currentUserName = useMemo<string>(() => {
    try {
      const raw = Cookies.get('user_data')
      if (!raw) return ''
      return JSON.parse(raw).name ?? ''
    } catch {
      return ''
    }
  }, [])

  const [role] = useState<UserRole>(() => allowedRoles[0] ?? 'it_officer')
  const [requests, setRequests] = useState<ManageRepairRequest[]>([])
  const [assessments, setAssessments] = useState<ApiRepairAssessment[]>([])
  const [priorityLevels, setPriorityLevels] = useState<ApiPriorityLevel[]>([])
  const [prDocTypes, setPrDocTypes] = useState<PrDocumentType[]>([])
  const [workSteps, setWorkSteps] = useState<WorkStep[]>([])
  const [taskHistory, setTaskHistory] = useState<ProgressEntry[]>([])
  const [taskHistoryLoading, setTaskHistoryLoading] = useState(false)
  const [taskSubmitting, setTaskSubmitting] = useState(false)
  const [detailImages, setDetailImages] = useState<{ it_repair_request_image_id: number }[]>([])
  const [detailImagesLoading, setDetailImagesLoading] = useState(false)
  const [approvalImages, setApprovalImages] = useState<{ it_repair_request_image_id: number }[]>([])
  const [approvalImagesLoading, setApprovalImagesLoading] = useState(false)

  // ดึงประวัติขอเพิ่มเวลาของคำร้องจาก API — คืน null ถ้าโหลดไม่ได้
  const loadExtensions = (apiId: number): Promise<RepairExtension[] | null> =>
    fetch(`/api/v1/it/repair-requests/${apiId}/extensions`)
      .then(r => r.json())
      .then(json => (json.success && Array.isArray(json.data))
        ? (json.data as ApiRepairExtension[]).map(apiToExtension)
        : null)
      .catch(() => null)

  // ดึงประวัติอัพเดทความคืบหน้า (ล่าสุด→เก่า) — แถวแรก = ความคืบหน้าปัจจุบัน
  const loadProgress = (apiId: number): Promise<ProgressEntry[] | null> =>
    fetch(`/api/v1/it/repair-requests/${apiId}/progress`)
      .then(r => r.json())
      .then(json => (json.success && Array.isArray(json.data)) ? (json.data as ProgressEntry[]) : null)
      .catch(() => null)

  // ดึงเอกสาร PR ที่บันทึกไว้ในฐานข้อมูล — GET /repair-requests/{id}/pr
  const loadPrRecord = (apiId: number): Promise<Partial<ManageRepairRequest> | null> =>
    fetch(`/api/v1/it/repair-requests/${apiId}/pr`)
      .then(r => r.json())
      .then(json => {
        const d = json?.data
        if (!json?.success || !d) return null
        // รองรับได้ทั้ง document_type_ids (number[]) และ documents (object[])
        const docIds: number[] = Array.isArray(d.document_type_ids)
          ? d.document_type_ids
          : Array.isArray(d.documents)
            ? d.documents.map((x: { id?: number; document_type_id?: number }) => x.document_type_id ?? x.id).filter((v: unknown): v is number => typeof v === 'number')
            : []
        const issuedAt = d.issued_at ?? d.created_at
        return {
          prNumber: d.pr_number || undefined,
          prNote: d.pr_detail ?? d.pr_note ?? undefined,
          prDocuments: docIds.length ? docIds : undefined,
          prIssuedBy: d.issued_by_name ?? d.issuer_name ?? d.issued_by ?? undefined,
          prIssuedDate: issuedAt ? (fmtDate(issuedAt) ?? undefined) : undefined,
        } as Partial<ManageRepairRequest>
      })
      .catch(() => null)

  // เช็คสถานะ PR จากระบบ inventory/พัสดุ — เอาเลข PR ไปตรวจว่าออกเลข/อนุมัติแล้วหรือยัง
  const loadPrStatus = (apiId: number): Promise<ManageRepairRequest['prStatus'] | null> =>
    fetch(`/api/v1/it/repair-requests/${apiId}/pr-status`)
      .then(r => r.json())
      .then(json => {
        const d = json?.data
        if (!json?.success || !d) return null
        return {
          found: !!d.found,
          issued: !!d.issued,
          requestNo: d.request_no || undefined,
          approveDate: d.stock_approve_date || undefined,
          poApproveDate: d.request_receive_date || undefined,
          paidStatusName: d.paid_status_name || undefined,
        }
      })
      .catch(() => null)

  // ใช้แถวล่าสุดของประวัติ → set prTaskSteps/prTaskNote ให้การ์ดแสดงความคืบหน้าปัจจุบัน
  const progressToUpdates = (entries: ProgressEntry[]): Partial<ManageRepairRequest> => {
    const latest = entries[0]
    return {
      prTaskSteps: latest ? latest.completed_steps.map(s => s.id) : [],
      prTaskNote:  latest?.note || undefined,
    }
  }

  useEffect(() => {
    // GET /repair-requests — รวมข้อมูลผลประเมินของช่าง (repair_assessment_id, assessment_detail)
    fetch('/api/v1/it/repair-requests')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          const mapped: ManageRepairRequest[] = json.data.map(apiToManageRequest)
          setRequests(mapped)
          // โหลดประวัติขอเพิ่มเวลาของงานที่ช่างรับแล้ว — ต่อท้ายการ์ด
          // (เช็คจากสถานะ ไม่ใช่ estimated_days เพราะบาง endpoint ไม่ส่ง field นี้มา)
          mapped
            .filter(m => m.apiId != null && m.status !== 'pending')
            .forEach(m => {
              loadExtensions(m.apiId!).then(exts => {
                if (exts && exts.length > 0) {
                  setRequests(prev => prev.map(r => r.id === m.id ? { ...r, extensions: exts } : r))
                }
              })
            })
          // โหลดความคืบหน้าล่าสุดของงานช่วงออกเอกสาร/ขั้นตอน PO — แสดงเช็คลิสต์บนการ์ด
          mapped
            .filter(m => m.apiId != null && (m.status === 'waiting_pr' || m.status === 'po_processing'))
            .forEach(m => {
              loadProgress(m.apiId!).then(entries => {
                if (entries) {
                  setRequests(prev => prev.map(r => r.id === m.id ? { ...r, ...progressToUpdates(entries) } : r))
                }
              })
            })
          // โหลดเอกสาร PR ที่บันทึกไว้ใน DB + ตรวจสถานะ PR จากระบบพัสดุ
          mapped
            .filter(m => m.apiId != null && (m.status === 'waiting_pr' || m.status === 'po_processing'))
            .forEach(m => {
              loadPrRecord(m.apiId!).then(rec => {
                if (rec) setRequests(prev => prev.map(r => r.id === m.id ? { ...r, ...rec } : r))
              })
            })
          // ตรวจสถานะ PR จากระบบพัสดุ — เฉพาะคอลัมน์ PO เพื่อแสดงวันที่อนุมัติ
          mapped
            .filter(m => m.apiId != null && m.status === 'po_processing')
            .forEach(m => {
              loadPrStatus(m.apiId!).then(ps => {
                if (ps) setRequests(prev => prev.map(r => r.id === m.id ? { ...r, prStatus: ps } : r))
              })
            })
        }
      })
      .catch(() => {})

    fetch('/api/v1/it/repair-assessments')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setAssessments(json.data.filter((a: ApiRepairAssessment) => a.is_active === 'Y'))
        }
      })
      .catch(() => {})

    fetch('/api/v1/it/priority-levels')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setPriorityLevels([...json.data].sort((a: ApiPriorityLevel, b: ApiPriorityLevel) => a.display_order - b.display_order))
        }
      })
      .catch(() => {})

    // เช็กลิสต์เอกสารเตรียมนำเสนอ — ใช้ render checkbox ใน modal บันทึกเอกสาร
    fetch('/api/v1/it/pr-document-types')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setPrDocTypes([...json.data].sort((a: PrDocumentType, b: PrDocumentType) => a.sort_order - b.sort_order))
        }
      })
      .catch(() => {})

    // เช็กลิสต์ขั้นงาน — ใช้ render checkbox ใน modal อัพเดทงาน + แสดงบนการ์ด
    fetch('/api/v1/it/repair-work-steps')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setWorkSteps([...json.data].sort((a: WorkStep, b: WorkStep) => a.sort_order - b.sort_order))
        }
      })
      .catch(() => {})
  }, [])
  const [prModal, setPrModal]         = useState<ManageRepairRequest | null>(null)
  const [taskModal, setTaskModal]     = useState<ManageRepairRequest | null>(null)
  const [resultModal, setResultModal] = useState<ManageRepairRequest | null>(null)
  const [approvalModal, setApprovalModal] = useState<{ req: ManageRepairRequest; level: 'it_head' | 'mission_head' } | null>(null)
  const [detailModal, setDetailModal] = useState<ManageRepairRequest | null>(null)
  const [takeModal, setTakeModal]     = useState<ManageRepairRequest | null>(null)
  const [rejectModal, setRejectModal] = useState<ManageRepairRequest | null>(null)
  const [extendModal, setExtendModal] = useState<ManageRepairRequest | null>(null)
  const [prForm]       = Form.useForm()
  const [taskForm]     = Form.useForm()
  const [resultForm]   = Form.useForm()
  const [approvalForm] = Form.useForm()
  const [takeForm]     = Form.useForm()
  const [rejectForm]   = Form.useForm()
  const [extendForm]   = Form.useForm()
  const { message } = App.useApp()

  // เลือกชุดเช็คลิสต์ตามสถานะ — คอลัมน์ PO ใช้ขั้นตอนติดตาม PO, ที่เหลือใช้ขั้นงานช่าง/IT
  const stepsFor = (status?: RepairStatus): WorkStep[] =>
    status === 'po_processing' ? PO_TRACKING_STEPS : workSteps

  // สีธีมของ modal อัพเดทงาน — PO (ธุรการ) ใช้เขียวอมฟ้าให้ตรงกับ card, งานช่างใช้ส้ม
  const isPoTask = taskModal?.status === 'po_processing'
  const taskAccent = isPoTask ? '#0d9488' : '#f97316'
  const taskAccentText = isPoTask ? '#2dd4bf' : '#fb923c'  // โทนสว่างสำหรับข้อความบนพื้นเข้ม

  // เปิด modal อัพเดทงาน — โหลดประวัติความคืบหน้าสดจาก API + เติมค่าจากความคืบหน้าล่าสุด
  const openTask = (req: ManageRepairRequest) => {
    setTaskModal(req)
    setTaskHistory([])
    // PO ใช้ radio (เลือกได้ค่าเดียว) ส่วนงานช่างใช้ checkbox (หลายค่า)
    const isPo = req.status === 'po_processing'
    const prefill = (ids: number[]) => (isPo ? (ids.length ? ids[ids.length - 1] : undefined) : ids)
    taskForm.setFieldsValue({ task_steps: prefill(req.prTaskSteps ?? []), task_note: '' })
    const apiId = req.apiId
    if (!apiId) return
    // refresh สถานะ PR จากพัสดุ (วันที่อนุมัติ) ตอนเปิดโมดัล PO
    if (isPo) {
      loadPrStatus(apiId).then(ps => {
        if (!ps) return
        setTaskModal(prev => prev && prev.apiId === apiId ? { ...prev, prStatus: ps } : prev)
        setRequests(prev => prev.map(r => r.apiId === apiId ? { ...r, prStatus: ps } : r))
      })
    }
    setTaskHistoryLoading(true)
    loadProgress(apiId)
      .then(entries => {
        if (!entries) return
        setTaskHistory(entries)
        // เติมเช็คลิสต์จากความคืบหน้าล่าสุด (note เว้นว่างไว้ให้พิมพ์อัพเดทใหม่)
        const latest = entries[0]
        taskForm.setFieldsValue({ task_steps: prefill(latest ? latest.completed_steps.map(s => s.id) : []) })
        setRequests(prev => prev.map(r => r.apiId === apiId ? { ...r, ...progressToUpdates(entries) } : r))
      })
      .finally(() => setTaskHistoryLoading(false))
  }

  // เปิด modal รายละเอียด — โหลดรูปและประวัติขอเพิ่มเวลาสดจาก API ทุกครั้ง
  const openDetail = (req: ManageRepairRequest) => {
    setDetailModal(req)
    setDetailImages([])
    const apiId = req.apiId
    if (!apiId) return
    setDetailImagesLoading(true)
    fetch(`/api/v1/it/repair-requests/${apiId}/images`)
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setDetailImages(json.data) })
      .catch(() => {})
      .finally(() => setDetailImagesLoading(false))
    // ประวัติขอเพิ่มเวลา — ครอบคลุมงานที่ปิดไปแล้วด้วย
    loadExtensions(apiId).then(exts => {
      if (!exts) return
      setDetailModal(prev => prev && prev.apiId === apiId ? { ...prev, extensions: exts } : prev)
      setRequests(prev => prev.map(r => r.apiId === apiId ? { ...r, extensions: exts } : r))
    })
  }

  // เปิด modal พิจารณาอนุมัติ — โหลดรูปและประวัติผลัดสัญญาสดจาก API ประกอบการตัดสินใจ
  const openApproval = (req: ManageRepairRequest, level: 'it_head' | 'mission_head') => {
    setApprovalModal({ req, level })
    approvalForm.resetFields()
    setApprovalImages([])
    const apiId = req.apiId
    if (!apiId) return
    setApprovalImagesLoading(true)
    fetch(`/api/v1/it/repair-requests/${apiId}/images`)
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setApprovalImages(json.data) })
      .catch(() => {})
      .finally(() => setApprovalImagesLoading(false))
    loadExtensions(apiId).then(exts => {
      if (!exts) return
      setApprovalModal(prev => prev && prev.req.apiId === apiId ? { ...prev, req: { ...prev.req, extensions: exts } } : prev)
      setRequests(prev => prev.map(r => r.apiId === apiId ? { ...r, extensions: exts } : r))
    })
  }

  const roleInfo = ROLE_CONFIG[role]
  const today = '15/05/2026'

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleTakeJob = (req: ManageRepairRequest) => {
    if (!req.apiId) {
      message.error('ไม่พบ id ของคำร้องนี้')
      return
    }
    takeForm.resetFields()
    setTakeModal(req)
  }

  const submitTakeJob = async (values: { dueDate: Dayjs; it_priority_level_id?: number }) => {
    const req = takeModal!
    if (!req.apiId) { message.error('ไม่พบ id ของคำร้องนี้'); return }
    const due = values.dueDate.startOf('day')
    const estimatedDays = due.diff(dayjs().startOf('day'), 'day')
    const chosenLevel = priorityLevels.find(p => p.it_priority_level_id === values.it_priority_level_id)
    try {
      const res = await fetch(`/api/v1/it/repair-requests/${req.apiId}/receive-assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimated_days: estimatedDays,
          estimated_completion_date: due.format('YYYY-MM-DD'),
          technician_priority_id: values.it_priority_level_id,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) {
        message.error(json.message ?? `รับงานไม่สำเร็จ (${res.status})`)
        return
      }
      const receiver = currentUserName || roleInfo.name
      const dueDateIso = due.toISOString()
      setRequests(prev => prev.map(r =>
        r.id === req.id
          ? { ...r, status: 'in_progress', assignedTo: receiver, assignedBy: receiver, assignedDate: today, assignedDateIso: new Date().toISOString(), estimatedDays, dueDateIso, technicianPriorityId: chosenLevel?.it_priority_level_id, technicianPriorityName: chosenLevel?.name }
          : r
      ))
      message.success(`รับงาน ${req.id} — เริ่มซ่อม (กำหนด ${estimatedDays} วัน)`)
      setTakeModal(null)
      takeForm.resetFields()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
    }
  }

  const handleRejectJob = (req: ManageRepairRequest) => {
    if (!req.apiId) {
      message.error('ไม่พบ id ของคำร้องนี้')
      return
    }
    rejectForm.resetFields()
    setRejectModal(req)
  }

  const submitRejectJob = async (values: { reason: string }) => {
    const req = rejectModal!
    if (!req.apiId) { message.error('ไม่พบ id ของคำร้องนี้'); return }
    const reason = values.reason.trim()
    try {
      const res = await fetch(`/api/v1/it/repair-requests/${req.apiId}/reject-assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_status_id: 10, reject_reason: reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) {
        message.error(json.message ?? `ปฏิเสธงานไม่สำเร็จ (${res.status})`)
        return
      }
      setRequests(prev => prev.map(r =>
        r.id === req.id
          ? { ...r, status: 'cancelled', resolvedNote: reason, resolvedDate: today }
          : r
      ))
      message.success(`ปฏิเสธงาน ${req.id} แล้ว`)
      setRejectModal(null)
      rejectForm.resetFields()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
    }
  }

  // ช่างพบปัญหา → ขอเพิ่มระยะเวลาซ่อม (ระบุจำนวนวัน + เหตุผล)
  const handleExtendTime = (req: ManageRepairRequest) => {
    if (!req.apiId) {
      message.error('ไม่พบ id ของคำร้องนี้')
      return
    }
    extendForm.resetFields()
    setExtendModal(req)
  }

  const submitExtendTime = async (values: { newDueDate: Dayjs; reason: string }) => {
    const req = extendModal!
    if (!req.apiId) { message.error('ไม่พบ id ของคำร้องนี้'); return }
    const newDue = values.newDueDate.startOf('day')
    const baseIso = effectiveDueIso(req)
    const base = (baseIso ? dayjs(baseIso) : dayjs()).startOf('day')
    const days = newDue.diff(base, 'day')
    const reason = values.reason.trim()
    try {
      const res = await fetch(`/api/v1/it/repair-requests/${req.apiId}/request-extension`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_estimated_completion_date: newDue.format('YYYY-MM-DD'),
          extension_reason: reason,
          extension_days: days,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) {
        message.error(json.message ?? `ขอเพิ่มเวลาไม่สำเร็จ (${res.status})`)
        return
      }
      // ดึงประวัติจาก API ให้ได้ข้อมูลครบ (ผู้ขอ, กำหนดเดิม/ใหม่) — ถ้าดึงไม่ได้ค่อย fallback ต่อท้ายเอง
      const exts = await loadExtensions(req.apiId)
      setRequests(prev => prev.map(r => {
        if (r.id !== req.id) return r
        return {
          ...r,
          estimatedDays: (r.estimatedDays ?? 0) + days,
          dueDateIso: newDue.toISOString(),
          extensions: exts ?? [{ days, reason, date: today, newDueIso: newDue.toISOString() }, ...(r.extensions ?? [])],
        }
      }))
      message.success(`ขอเพิ่มเวลา ${req.id} อีก ${days} วันแล้ว`)
      setExtendModal(null)
      extendForm.resetFields()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
    }
  }

  const handleRecordResult = async (values: {
    repair_assessment_id: number
    assessment_detail: string
    parts_used?: string
    replacement_recommendation?: string
    return_status_id?: number
    external_service_detail?: string
  }) => {
    const req = resultModal!
    if (!req.apiId) {
      message.error('ไม่พบ id ของคำร้องนี้')
      return
    }

    const body: Record<string, unknown> = {
      repair_assessment_id: values.repair_assessment_id,
      assessment_detail:    values.assessment_detail,
    }
    if (values.parts_used)                  body.parts_used                  = values.parts_used
    if (values.replacement_recommendation)  body.replacement_recommendation  = values.replacement_recommendation
    if (values.return_status_id != null)    body.return_status_id            = values.return_status_id
    if (values.external_service_detail)     body.external_service_detail     = values.external_service_detail

    try {
      const res = await fetch(`/api/v1/it/repair-requests/${req.apiId}/assessment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) {
        message.error(json.message ?? `บันทึกผลไม่สำเร็จ (${res.status})`)
        return
      }

      const resultKey = ASSESSMENT_ID_TO_RESULT[values.repair_assessment_id]
      const handover  = values.return_status_id ? RETURN_STATUS_ID_TO_KEY[values.return_status_id] : undefined
      const apiStatusId = json.data?.process_status_id as number | undefined
      const nextStatusFromApi = apiStatusId ? STATUS_BY_PROCESS_ID[apiStatusId] : undefined

      let nextStatus: RepairStatus
      const updates: Partial<ManageRepairRequest> = {
        repairAssessmentId:  values.repair_assessment_id,
        repairResult:        resultKey,
        technicianNote:      values.assessment_detail,
        partsUsed:           values.parts_used,
        replacementNote:     values.replacement_recommendation,
        replacementHandover: handover,
        externalServiceNote: values.external_service_detail,
      }
      if (nextStatusFromApi) {
        nextStatus = nextStatusFromApi
      } else if (resultKey === 'fixed_no_parts' || resultKey === 'fixed_with_parts') {
        nextStatus = 'completed'
      } else if (resultKey === 'fixed_need_purchase') {
        nextStatus = 'pending_it_approval'
      } else if (resultKey === 'cannot_fix_replace') {
        nextStatus = 'recommend_replacement'
      } else {
        nextStatus = 'pending_it_approval'
      }
      if (nextStatus === 'completed') {
        updates.resolvedNote = values.assessment_detail
        updates.resolvedDate = today
      }

      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, ...updates, status: nextStatus } : r))
      message.success(`บันทึกผลการซ่อม ${req.id} แล้ว`)
      setResultModal(null)
      resultForm.resetFields()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
    }
  }

  // บันทึกเอกสารเตรียมนำเสนอ — POST /repair-requests/{id}/pr → เลื่อนสถานะ (process 7)
  const handleIssuePR = async (values: { prNote?: string; prNumber: string; prDocuments?: number[] }) => {
    const req = prModal!
    if (!req.apiId) { message.error('ไม่พบ id ของคำร้องนี้'); return }
    try {
      const res = await fetch(`/api/v1/it/repair-requests/${req.apiId}/pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pr_number: values.prNumber,
          pr_detail: values.prNote ?? '',
          document_type_ids: values.prDocuments ?? [],
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) {
        message.error(json.message ?? `บันทึกเอกสารไม่สำเร็จ (${res.status})`)
        return
      }
      const apiStatusId = json.data?.process_status_id as number | undefined
      const nextStatus = (apiStatusId ? STATUS_BY_PROCESS_ID[apiStatusId] : undefined) ?? 'po_processing'
      setRequests(prev => prev.map(r =>
        r.id === req.id
          ? { ...r, status: nextStatus, prNote: values.prNote, prNumber: values.prNumber, prDocuments: values.prDocuments, prIssuedBy: currentUserName || roleInfo.name, prIssuedDate: today }
          : r
      ))
      message.success(`บันทึกเอกสารเตรียมนำเสนอ ${req.id} แล้ว`)
      setPrModal(null)
      prForm.resetFields()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
    }
  }

  // บันทึกความคืบหน้า — POST /repair-requests/{id}/progress (note + work_step_ids)
  // ต้องมี note หรือ work_step_ids อย่างน้อย 1 รายการ (ไม่งั้น backend ตอบ 400)
  const handleUpdateTaskStep = async (values: { task_steps?: number[] | number; task_note?: string }) => {
    const req = taskModal!
    if (!req.apiId) { message.error('ไม่พบ id ของคำร้องนี้'); return }
    const rawSteps = values.task_steps
    const steps = (Array.isArray(rawSteps) ? rawSteps : rawSteps != null ? [rawSteps] : []).slice().sort((a, b) => a - b)
    const note = values.task_note?.trim() || ''
    if (steps.length === 0 && !note) {
      message.warning('กรุณาระบุหมายเหตุ หรือติ๊กขั้นงานที่ทำเสร็จอย่างน้อย 1 รายการ')
      return
    }
    setTaskSubmitting(true)
    const payload = { note, work_step_ids: steps }
    const url = `/api/v1/it/repair-requests/${req.apiId}/progress`
    console.log('[progress] POST', url, payload)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      console.log('[progress] response', res.status, json)
      if (!res.ok || json.success === false) {
        message.error(json.message ?? `บันทึกความคืบหน้าไม่สำเร็จ (${res.status})`)
        return
      }
      // รีโหลดประวัติให้การ์ดแสดงความคืบหน้าล่าสุด
      const entries = await loadProgress(req.apiId)
      setRequests(prev => prev.map(r =>
        r.id === req.id
          ? { ...r, ...(entries ? progressToUpdates(entries) : { prTaskSteps: steps, prTaskNote: note || undefined }) }
          : r
      ))
      message.success(`อัพเดทงาน ${req.id} — ทำเสร็จ ${steps.length}/${stepsFor(req.status).length} ขั้น`)
      setTaskModal(null)
      taskForm.resetFields()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
    } finally {
      setTaskSubmitting(false)
    }
  }

  const handleApproval = async (values: { decision: 'approved' | 'rejected'; note?: string }) => {
    const { req, level } = approvalModal!
    let statusFromApi: RepairStatus | undefined

    // หัวหน้า IT — บันทึกผลพิจารณาผ่าน API (1=อนุมัติ, 2=ไม่อนุมัติ + ต้องมีเหตุผล)
    if (level === 'it_head') {
      if (!req.apiId) { message.error('ไม่พบ id ของคำร้องนี้'); return }
      const comment = values.note?.trim()
      try {
        const res = await fetch(`/api/v1/it/repair-requests/${req.apiId}/header-approve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            header_approve: values.decision === 'approved' ? 1 : 2,
            ...(comment ? { header_comment: comment } : {}),
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || json.success === false) {
          message.error(json.message ?? `บันทึกผลพิจารณาไม่สำเร็จ (${res.status})`)
          return
        }
        const apiStatusId = json.data?.process_status_id as number | undefined
        statusFromApi = apiStatusId ? STATUS_BY_PROCESS_ID[apiStatusId] : undefined
      } catch {
        message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
        return
      }
    }

    // หัวหน้ากลุ่มภารกิจ — บันทึกผลผ่าน API (backend เซ็ตสถานะตาม approve_process_id ของผลประเมิน)
    if (level === 'mission_head') {
      if (!req.apiId) { message.error('ไม่พบ id ของคำร้องนี้'); return }
      const comment = values.note?.trim()
      try {
        const res = await fetch(`/api/v1/it/repair-requests/${req.apiId}/mission-approve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mission_approve: values.decision === 'approved' ? 1 : 2,
            ...(comment ? { mission_comment: comment } : {}),
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || json.success === false) {
          message.error(json.message ?? `บันทึกผลพิจารณาไม่สำเร็จ (${res.status})`)
          return
        }
        const apiStatusId = json.data?.process_status_id as number | undefined
        statusFromApi = apiStatusId ? STATUS_BY_PROCESS_ID[apiStatusId] : undefined
      } catch {
        message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
        return
      }
    }

    const approval: Approval = { status: values.decision, by: currentUserName || roleInfo.name, date: today, note: values.note }
    let nextStatus: RepairStatus
    if (statusFromApi) {
      nextStatus = statusFromApi
    } else if (values.decision === 'rejected') {
      // ปฏิเสธ (ทั้งสองขั้น) → process_status 10
      nextStatus = 'cancelled'
    } else if (level === 'it_head') {
      nextStatus = 'pending_mission_approval'
    } else {
      // หัวหน้าภารกิจอนุมัติ — เดินตาม approve_process_id ของผลประเมินที่ช่างเลือก
      // เช่น สั่งซื้ออะไหล่/จ้างนอก → 3 (ออก PR), แนะนำซื้อทดแทน → 11 (อนุมัติซื้อทดแทน)
      const assess = assessments.find(a => a.repair_assessment_id === req.repairAssessmentId)
      const pid = assess?.approve_process_id
      nextStatus = (pid != null ? STATUS_BY_PROCESS_ID[pid] : undefined) ?? 'purchase_approved'
    }
    const updates: Partial<ManageRepairRequest> = { status: nextStatus }
    if (level === 'it_head') updates.itHeadApproval = approval
    else updates.missionHeadApproval = approval
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, ...updates } : r))
    message.success(`${values.decision === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} ${req.id} แล้ว`)
    setApprovalModal(null)
    approvalForm.resetFields()
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const myTechId  = ROLE_CONFIG.technician.techId
  const waitingJobs = requests.filter(r => r.assignedTechId === myTechId && r.status === 'assigned')
  const activeJobs  = requests.filter(r => r.assignedTechId === myTechId && r.status === 'in_progress')
  const doneJobs    = requests.filter(r => r.assignedTechId === myTechId && ['completed', 'cancelled'].includes(r.status))

  // ── Common column helpers ─────────────────────────────────────────────────────

  const colId     = { title: 'รหัส', dataIndex: 'id', key: 'id', width: 120, render: (v: string) => <code style={{ color: '#a78bfa', fontSize: 11 }}>{v}</code> }
  const colDevice = { title: 'อุปกรณ์', key: 'device', render: (_: unknown, r: ManageRepairRequest) => (
    <div>
      <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12 }}>{r.deviceBrand}</div>
      <div style={{ color: '#64748b', fontSize: 11 }}>{r.department}</div>
    </div>
  )}
  const colUrgency = { title: 'ความเร่งด่วน', dataIndex: 'urgency', key: 'urgency', width: 110,
    render: (v: ManageRepairRequest['urgency']) => <Tag color={urgencyConfig[v].color}>{urgencyConfig[v].label}</Tag> }
  const colStatus  = { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 180,
    render: (v: RepairStatus) => <Tag color={statusConfig[v].color}>{statusConfig[v].label}</Tag> }
  const colDetail  = { title: '', key: 'detail', width: 50, align: 'center' as const,
    render: (_: unknown, r: ManageRepairRequest) => (
      <Button size="small" icon={<InfoCircleOutlined />} onClick={() => openDetail(r)} />
    )}

  const tableProps = { size: 'small' as const, scroll: { x: 900 } }

  // ── Job card for technician ───────────────────────────────────────────────────

  const jobCard = (r: ManageRepairRequest, action: React.ReactNode) => (
    <Card key={r.id} size="small" style={{ background: '#0f172a', border: '1px solid #334155', marginBottom: 10 }}>
      <Row gutter={8} align="middle" wrap={false}>
        <Col flex="1" style={{ minWidth: 0 }}>
          <Space size={4} wrap>
            <code style={{ color: '#a78bfa', fontSize: 11 }}>{r.id}</code>
            <Tag color={urgencyConfig[r.urgency].color} style={{ margin: 0 }}>{urgencyConfig[r.urgency].label}</Tag>
            <Tag color={statusConfig[r.status].color} style={{ margin: 0 }}>{statusConfig[r.status].label}</Tag>
          </Space>
          <div style={{ color: '#e2e8f0', fontWeight: 600, marginTop: 6, fontSize: 13 }}>{r.deviceBrand}</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>{r.department} · {r.deviceLocation}</div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4, marginBottom: 6 }}>
            {r.symptom.length > 90 ? r.symptom.slice(0, 90) + '…' : r.symptom}
          </div>
          {renderDue(r)}
          <ExtensionHistory exts={r.extensions} />
        </Col>
        <Col style={{ flexShrink: 0, paddingLeft: 12 }}>{action}</Col>
      </Row>
    </Card>
  )

  const emptyText = (text: string) => ({ emptyText: <div style={{ color: '#64748b', padding: '24px 0' }}>{text}</div> })

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">

        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { href: '/', title: <span style={{ color: '#94a3b8' }}>หน้าหลัก</span> },
            { title: <span style={{ color: '#94a3b8' }}>งานเทคโนโลยีสารสนเทศ</span> },
            { href: '/information-technology/maintenance', title: <span style={{ color: '#94a3b8' }}>แจ้งซ่อมคอมพิวเตอร์</span> },
            { title: <span style={{ color: '#a78bfa' }}>จัดการงานซ่อม</span> },
          ]}
        />

        <div style={{ marginBottom: 20 }}>
          <Title level={4} style={{ color: '#e2e8f0', margin: 0 }}>
            <AuditOutlined style={{ color: '#a78bfa', marginRight: 10 }} />
            ระบบจัดการงานซ่อมคอมพิวเตอร์และอุปกรณ์ IT
          </Title>
        </div>

        {/* Panel Card */}
        <Card style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10 }}>

          {/* ── IT Officer / หัวหน้า IT / หัวหน้าภารกิจ — kanban board เดียวกัน
               ระดับหัวหน้าเห็นบอร์ดเหมือนเจ้าหน้าที่ เพิ่มเฉพาะปุ่มพิจารณาอนุมัติตาม role ── */}
          {(role === 'it_officer' || role === 'it_head' || role === 'mission_head') && (() => {
            type KanbanCol = {
              key: string; title: string; accent: string
              items: ManageRepairRequest[]
              action?: (r: ManageRepairRequest) => React.ReactNode
            }
            const kanbanCols: KanbanCol[] = [
              {
                key: 'pending', title: 'รอดำเนินการ', accent: '#f59e0b',
                items: requests.filter(r => r.status === 'pending'),
                action: (r) => (
                  <div style={{ display: 'flex', gap: 5, flex: 1 }}>
                    <Button size="small" type="primary"
                      style={{ flex: 1, background: '#7c3aed', borderColor: '#7c3aed', fontSize: 11 }}
                      onClick={() => handleTakeJob(r)}>
                      <CheckSquareOutlined /> รับงาน
                    </Button>
                    <Button size="small" danger
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={() => handleRejectJob(r)}>
                      <CloseCircleOutlined /> ปฏิเสธ
                    </Button>
                  </div>
                ),
              },
              {
                key: 'in_progress', title: 'กำลังดำเนินการ', accent: '#06b6d4',
                items: requests.filter(r => r.status === 'in_progress'),
                action: (r) => (
                  <>
                    <Button size="small"
                      style={{ flex: 1, background: '#6d28d9', borderColor: '#6d28d9', color: '#fff', fontSize: 11 }}
                      onClick={() => { setResultModal(r); resultForm.resetFields() }}>
                      <CheckSquareOutlined /> บันทึกผล
                    </Button>
                    <Button size="small"
                      style={{ flex: 1, borderColor: '#f59e0b', color: '#f59e0b', fontSize: 11 }}
                      onClick={() => handleExtendTime(r)}>
                      <ClockCircleOutlined /> เพิ่มเวลา
                    </Button>
                  </>
                ),
              },
              {
                key: 'pending_head_approval', title: 'รออนุมัติหัวหน้า IT / หัวหน้าภารกิจ', accent: '#a855f7',
                items: requests.filter(r => r.status === 'pending_it_approval' || r.status === 'pending_mission_approval'),
                // ปุ่มอนุมัติแสดงตาม role ของผู้ใช้: หัวหน้า IT อนุมัติขั้นแรก, หัวหน้าภารกิจอนุมัติขั้นถัดไป
                action: (allowedRoles.includes('it_head') || allowedRoles.includes('mission_head'))
                  ? (r) => {
                      const level = r.status === 'pending_it_approval' ? 'it_head' as const : 'mission_head' as const
                      if (!allowedRoles.includes(level)) return null
                      return (
                        <Button size="small" block
                          style={{ background: '#9333ea', borderColor: '#9333ea', color: '#fff', fontSize: 11 }}
                          onClick={() => openApproval(r, level)}>
                          <SafetyCertificateOutlined /> พิจารณาอนุมัติ ({level === 'it_head' ? 'หัวหน้า IT' : 'หัวหน้าภารกิจ'})
                        </Button>
                      )
                    }
                  : undefined,
              },
              {
                key: 'waiting_pr', title: 'ออกใบ PR เจ้าหน้าที่ IT', accent: '#f97316',
                items: requests.filter(r => r.status === 'waiting_pr'),
                // 2 ปุ่ม: บันทึกงาน (ออกใบ PR) + อัพเดทงานที่เจ้าหน้าที่กำลังทำ (PR_TASK_STEPS)
                action: (r) => (
                  <>
                    <Button size="small"
                      style={{ flex: 1, background: '#f97316', borderColor: '#f97316', color: '#fff', fontSize: 11 }}
                      onClick={() => {
                        setPrModal(r)
                        prForm.resetFields()
                        // ติ๊กเอกสารครบทุกรายการไว้ล่วงหน้า (หรือใช้ค่าที่เคยบันทึกไว้)
                        prForm.setFieldsValue({
                          prDocuments: r.prDocuments ?? prDocTypes.map(d => d.id),
                        })
                      }}>
                      <ShoppingCartOutlined /> บันทึกงาน
                    </Button>
                    <Button size="small"
                      style={{ flex: 1, borderColor: '#f97316', color: '#f97316', fontSize: 11 }}
                      onClick={() => openTask(r)}>
                      <ToolOutlined /> อัพเดทงาน
                    </Button>
                  </>
                ),
              },
              {
                key: 'po_processing', title: 'ขั้นตอน PO โดยพัสดุ / เสนอผู้อำนวยการ', accent: '#0d9488',
                items: requests.filter(r => r.status === 'po_processing'),
                // งานของธุรการ — อัพเดทความคืบหน้าขั้นตอน PO (เช็คลิสต์ + หมายเหตุ + ประวัติ)
                action: (r) => (
                  <Button size="small" block
                    style={{ background: '#0d9488', borderColor: '#0d9488', color: '#fff', fontSize: 11 }}
                    onClick={() => openTask(r)}>
                    <ToolOutlined /> อัพเดทข้อมูล
                  </Button>
                ),
              },
              {
                key: 'awaiting_delivery', title: 'รอรับของ / รับอะไหล่', accent: '#0ea5e9',
                items: requests.filter(r => r.status === 'awaiting_delivery'),
                action: (r) => (
                  <Button size="small" block
                    style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff', fontSize: 11 }}
                    onClick={() => {
                      setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'completed', resolvedDate: today } : x))
                      message.success(`รับอะไหล่และซ่อมเสร็จ ${r.id} แล้ว`)
                    }}>
                    <CheckCircleOutlined /> รับอะไหล่ / เสร็จสิ้น
                  </Button>
                ),
              },
            ]

            const totalActive = kanbanCols.reduce((s, c) => s + c.items.length, 0)

            return (
              <Tabs type="line" items={[
                {
                  key: 'kanban',
                  label: (
                    <Badge count={totalActive} size="small" offset={[6, -2]}>
                      <span>Kanban</span>
                    </Badge>
                  ),
                  children: (
                    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 10, minWidth: 'max-content', alignItems: 'flex-start', padding: '4px 2px 12px' }}>
                        {kanbanCols.map(col => (
                          <div key={col.key} style={{ width: 252, flexShrink: 0 }}>
                            {/* Column header */}
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '7px 12px', borderRadius: 8, marginBottom: 8,
                              background: '#0f172a', borderLeft: `3px solid ${col.accent}`,
                              boxShadow: `inset 0 0 0 1px ${col.accent}22`,
                            }}>
                              <Text style={{ color: col.accent, fontSize: 12, fontWeight: 700 }}>{col.title}</Text>
                              <span style={{
                                background: col.accent + '22', color: col.accent,
                                borderRadius: 10, padding: '0 8px', fontSize: 11, fontWeight: 700,
                              }}>{col.items.length}</span>
                            </div>
                            {/* Cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minHeight: 80 }}>
                              {col.items.length === 0 && (
                                <div style={{
                                  textAlign: 'center', color: '#334155', padding: '24px 0',
                                  border: '1px dashed #1e3a5f', borderRadius: 8, fontSize: 11,
                                }}>ไม่มีงาน</div>
                              )}
                              {col.items.map(r => {
                                const days = daysSince(r.createdAtIso ?? r.requestDate)
                                const cat = PROBLEM_CATEGORY_LABEL[r.problemCategory] ?? { label: r.problemCategory, color: '#94a3b8' }
                                return (
                                <div key={r.id} style={{
                                  background: '#0f172a',
                                  border: '1px solid #1e293b',
                                  borderLeft: `3px solid ${col.accent}`,
                                  borderRadius: 8, padding: '10px 11px',
                                  transition: 'border-color .15s',
                                }}>
                                  {/* Row 1: id + days + urgency */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 4 }}>
                                    <code style={{ color: '#a78bfa', fontSize: 10, fontWeight: 600 }}>{r.id}</code>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {days !== null && (
                                        <span style={{ fontSize: 10, color: daysColor(days), whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                          <ClockCircleOutlined style={{ fontSize: 9 }} />{days} วัน
                                        </span>
                                      )}
                                      <Tag color={urgencyConfig[r.urgency].color}
                                        style={{ margin: 0, fontSize: 10, padding: '0 5px', lineHeight: '16px' }}>
                                        {urgencyConfig[r.urgency].label}
                                      </Tag>
                                    </div>
                                  </div>
                                  {/* Row 2: brand + type */}
                                  <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12, marginBottom: 2, lineHeight: 1.4 }}>
                                    {r.deviceBrand}
                                    {r.deviceType && <span style={{ color: '#64748b', fontSize: 10, fontWeight: 400 }}> · {DEVICE_TYPE_LABEL[r.deviceType] ?? r.deviceType}</span>}
                                  </div>
                                  {/* Row 3: asset no */}
                                  {r.assetNo && (
                                    <div style={{ color: '#fb923c', fontSize: 10, fontFamily: 'monospace', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <BarcodeOutlined style={{ fontSize: 10 }} />{r.assetNo}
                                    </div>
                                  )}
                                  {/* Row 4: location */}
                                  {r.deviceLocation && (
                                    <div style={{ color: '#94a3b8', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                                      <EnvironmentOutlined style={{ fontSize: 10 }} />{r.deviceLocation}
                                    </div>
                                  )}
                                  {/* Row 5: requester + dept */}
                                  <div style={{ color: '#cbd5e1', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                                    <UserOutlined style={{ fontSize: 10 }} />{r.requesterName}
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: 10, marginLeft: 14, marginBottom: 5 }}>{r.department}</div>
                                  {/* วันเวลาที่ส่งคำขอ */}
                                  {fmtDateTime(r.createdAtIso ?? r.requestDate) && (
                                    <div style={{ color: '#64748b', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                                      <ClockCircleOutlined style={{ fontSize: 10 }} />
                                      <span>ส่งคำขอ {fmtDateTime(r.createdAtIso ?? r.requestDate)}</span>
                                    </div>
                                  )}
                                  {/* Row 6: category */}
                                  <div style={{ marginBottom: 4 }}>
                                    <Tag style={{
                                      margin: 0, fontSize: 10, padding: '0 5px', lineHeight: '16px',
                                      color: cat.color, borderColor: cat.color + '55', background: 'transparent',
                                    }}>
                                      {cat.label}
                                    </Tag>
                                  </div>
                                  {/* Row 7: symptom */}
                                  <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 5, lineHeight: 1.45, fontStyle: 'italic' }}>
                                    “{r.symptom.length > 60 ? r.symptom.slice(0, 60) + '…' : r.symptom}”
                                  </div>
                                  {/* เส้นคั่น — แยกข้อมูลคำร้องออกจากส่วนงานของช่าง */}
                                  {r.status !== 'pending' && r.assignedTo && (
                                    <div style={{ borderTop: '1px dashed #334155', margin: '6px 0 7px' }} />
                                  )}
                                  {/* Assigned tech */}
                                  {r.status !== 'pending' && r.assignedTo && (
                                    <div style={{ color: '#6ee7b7', fontSize: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <ToolOutlined style={{ fontSize: 9 }} />{r.assignedTo}
                                    </div>
                                  )}
                                  {/* Technician-assessed priority */}
                                  {r.status !== 'pending' && r.technicianPriorityName && (() => {
                                    const lvl = priorityLevels.find(l => l.it_priority_level_id === r.technicianPriorityId)
                                    const color = lvl ? URGENCY_DOT[urgencyByOrder(lvl.display_order)] : '#94a3b8'
                                    return (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: 10 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}99`, flexShrink: 0 }} />
                                        <span style={{ color: '#64748b' }}>ช่างประเมิน:</span>
                                        <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{r.technicianPriorityName}</span>
                                      </div>
                                    )
                                  })()}
                                  {/* Due countdown (กำหนดเวลาซ่อม) */}
                                  {r.status === 'in_progress' && renderDue(r)}
                                  {/* ประวัติขอเพิ่มเวลา — ต่อท้ายการ์ด */}
                                  <ExtensionHistory exts={r.extensions} />
                                  {/* PR number + tracking status — คอลัมน์ PO แสดงเลขที่ในส่วนความคืบหน้าแทน */}
                                  {r.prNumber && r.status !== 'po_processing' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                                      <code style={{ color: '#fb923c', fontSize: 10, background: '#1c0f00', padding: '1px 5px', borderRadius: 4 }}>
                                        {r.prNumber}
                                      </code>
                                      {r.prTrackingStatus && (
                                        <Tag style={{
                                          margin: 0, fontSize: 10, padding: '0 5px', lineHeight: '16px',
                                          color: PR_TRACKING_CONFIG[r.prTrackingStatus].color,
                                          borderColor: PR_TRACKING_CONFIG[r.prTrackingStatus].color + '55',
                                          background: 'transparent',
                                        }}>
                                          {PR_TRACKING_CONFIG[r.prTrackingStatus].label}
                                        </Tag>
                                      )}
                                    </div>
                                  )}
                                  {/* ขั้นงานที่ทำเสร็จแล้ว (ออกเอกสาร / ขั้นตอน PO) — เช็คลิสต์ */}
                                  {(r.status === 'waiting_pr' || r.status === 'po_processing') && ((r.prTaskSteps && r.prTaskSteps.length > 0) || r.prTaskNote || (r.status === 'po_processing' && (r.prStatus?.found || r.prStatus?.issued))) && (() => {
                                    const cardSteps = stepsFor(r.status)
                                    const sel = r.prTaskSteps ?? []
                                    const isPo = r.status === 'po_processing'
                                    const accent = isPo ? '#0d9488' : '#f97316'
                                    // PO เป็นไปป์ไลน์ตามลำดับ — ขั้นที่อยู่ก่อนสถานะปัจจุบันถือว่าทำเสร็จแล้ว จึงติ๊กสะสม
                                    let done: Set<number>
                                    if (isPo) {
                                      // PO นับจากสถานะพัสดุเท่านั้น: issued → 'อนุมัติ PR แล้ว', request_receive_date → 'อนุมัติ PO แล้ว'
                                      const ps = r.prStatus
                                      done = new Set<number>()
                                      cardSteps.forEach(s => {
                                        if (s.step_code === 'pr_approved' && (ps?.issued || ps?.poApproveDate)) done.add(s.id)
                                        if (s.step_code === 'po_approved' && ps?.poApproveDate) done.add(s.id)
                                      })
                                    } else {
                                      done = new Set(sel)
                                    }
                                    return (
                                      <div style={{
                                        marginBottom: 6, fontSize: 10,
                                        padding: '5px 7px', borderRadius: 6, background: `${accent}14`, border: `1px solid ${accent}33`,
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                          <ToolOutlined style={{ fontSize: 10, color: accent }} />
                                          <span style={{ color: '#94a3b8' }}>
                                            ความคืบหน้างาน{' '}
                                            <span style={{ color: accent, fontWeight: 700 }}>{done.size}/{cardSteps.length} ขั้น</span>
                                          </span>
                                        </div>
                                        {cardSteps.map(s => {
                                          const checked = done.has(s.id)
                                          // ไม่พบข้อมูลใน inventory (found:false) → ขั้นอนุมัติ PR/PO ขึ้นกากบาท
                                          // ไม่มีข้อมูลยืนยันการอนุมัติ (found:false หรือ pr-status โหลดไม่ได้) → ขึ้นกากบาท
                                          const notFound = isPo && (s.step_code === 'pr_approved' || s.step_code === 'po_approved') && !r.prStatus?.found
                                          return (
                                            <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.5 }}>
                                              {notFound
                                                ? <CloseCircleOutlined style={{ fontSize: 10, marginTop: 1, color: '#ef4444' }} />
                                                : <CheckSquareOutlined style={{ fontSize: 10, marginTop: 1, color: checked ? '#22c55e' : '#475569' }} />}
                                              <span style={{ color: notFound ? '#94a3b8' : (checked ? '#cbd5e1' : '#64748b') }}>
                                                {s.name_th}
                                                {notFound && <span style={{ color: '#ef4444', marginLeft: 4 }}>· ไม่พบข้อมูล</span>}
                                                {isPo && s.step_code === 'pr_approved' && (() => {
                                                  const prNo = r.prNumber ?? r.prStatus?.requestNo
                                                  return (
                                                    <>
                                                      {prNo && <span style={{ marginLeft: 4 }}>เลขที่ <code style={{ color: '#fb923c', fontSize: 10 }}>{prNo}</code></span>}
                                                      {r.prStatus?.issued && r.prStatus.approveDate && (
                                                        <span style={{ color: '#22c55e', marginLeft: 4 }}>· อนุมัติวันที่ {fmtDate(r.prStatus.approveDate)}</span>
                                                      )}
                                                      {r.prStatus?.found && !r.prStatus.issued && (
                                                        <span style={{ color: '#eab308', marginLeft: 4 }}>· รออนุมัติพัสดุ</span>
                                                      )}
                                                    </>
                                                  )
                                                })()}
                                                {isPo && s.step_code === 'po_approved' && r.prStatus?.poApproveDate && (
                                                  <>
                                                    <span style={{ color: '#22c55e', marginLeft: 4 }}>· อนุมัติ PO วันที่ {fmtDate(r.prStatus.poApproveDate)}</span>
                                                    {r.prStatus.paidStatusName && (
                                                      <span style={{ color: '#38bdf8', marginLeft: 4 }}>· {r.prStatus.paidStatusName}</span>
                                                    )}
                                                  </>
                                                )}
                                              </span>
                                            </div>
                                          )
                                        })}
                                        {r.prTaskNote && (
                                          <div style={{ marginTop: 4, paddingTop: 4, borderTop: `1px dashed ${accent}33`, color: '#94a3b8', lineHeight: 1.5 }}>
                                            <span style={{ color: '#64748b' }}>หมายเหตุ: </span>{r.prTaskNote}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                  {/* Sub-status badge */}
                                  {r.status === 'waiting_pr' && !r.prNumber && (
                                    <Tag color="orange" style={{ fontSize: 10, marginBottom: 6 }}>ออก PR แล้ว — รออะไหล่</Tag>
                                  )}
                                  {r.status === 'pending_it_approval' && (
                                    <Tag color="purple" style={{ fontSize: 10, marginBottom: 6 }}>รออนุมัติ IT Head</Tag>
                                  )}
                                  {r.status === 'pending_mission_approval' && (
                                    <Tag color="magenta" style={{ fontSize: 10, marginBottom: 6 }}>รออนุมัติหัวหน้ากลุ่ม</Tag>
                                  )}
                                  {r.status === 'purchase_approved' && (
                                    <Tag color="cyan" style={{ fontSize: 10, marginBottom: 6 }}>อนุมัติจัดซื้อแล้ว</Tag>
                                  )}
                                  {/* Actions */}
                                  {(() => {
                                    const actionNode = col.action ? col.action(r) : null
                                    return (
                                      <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                                        {actionNode}
                                        <Button size="small" icon={<InfoCircleOutlined />}
                                          style={{ flex: actionNode ? '0 0 auto' : 1, fontSize: 11 }}
                                          onClick={() => openDetail(r)}>
                                          {!actionNode && 'รายละเอียด'}
                                        </Button>
                                      </div>
                                    )
                                  })()}
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'all',
                  label: 'ทั้งหมด',
                  children: (
                    <Table
                      {...tableProps}
                      dataSource={requests}
                      rowKey="id"
                      pagination={{ pageSize: 8, size: 'small' }}
                      columns={[
                        colId, colDevice, colUrgency, colStatus,
                        { title: 'ช่าง', dataIndex: 'assignedTo', key: 'assignedTo', width: 150,
                          render: (v?: string) => v
                            ? <Text style={{ color: '#6ee7b7', fontSize: 12 }}>{v}</Text>
                            : <Text style={{ color: '#334155' }}>-</Text> },
                        colDetail,
                      ]}
                    />
                  ),
                },
              ]} />
            )
          })()}

          {/* ── Technician Panel ── */}
          {role === 'technician' && (
            <Tabs type="line" items={[
              {
                key: 'waiting',
                label: <Badge count={waitingJobs.length} size="small" offset={[6, -2]}><span>รองานใหม่</span></Badge>,
                children: (
                  <div>
                    {waitingJobs.length === 0 && <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>ไม่มีงานที่รอรับ</div>}
                    {waitingJobs.map(r => jobCard(r,
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Button block type="primary" icon={<CheckCircleOutlined />} onClick={() => handleTakeJob(r)}>รับงาน</Button>
                        <Button block danger icon={<CloseCircleOutlined />} onClick={() => handleRejectJob(r)}>ปฏิเสธงาน</Button>
                      </Space>
                    ))}
                  </div>
                ),
              },
              {
                key: 'active',
                label: <Badge count={activeJobs.length} size="small" offset={[6, -2]}><span>กำลังซ่อม</span></Badge>,
                children: (
                  <div>
                    {activeJobs.length === 0 && <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>ไม่มีงานที่กำลังดำเนินการ</div>}
                    {activeJobs.map(r => jobCard(r,
                      <Space direction="vertical" size={6}>
                        <Button block
                          style={{ background: '#6d28d9', borderColor: '#6d28d9', color: '#fff' }}
                          icon={<CheckSquareOutlined />}
                          onClick={() => { setResultModal(r); resultForm.resetFields() }}>
                          บันทึกผล
                        </Button>
                        <Button block
                          style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                          icon={<ClockCircleOutlined />}
                          onClick={() => handleExtendTime(r)}>
                          ขอเพิ่มเวลา
                        </Button>
                      </Space>
                    ))}
                  </div>
                ),
              },
              {
                key: 'history',
                label: 'ประวัติงาน',
                children: (
                  <Table
                    {...tableProps}
                    dataSource={doneJobs}
                    rowKey="id"
                    pagination={false}
                    locale={emptyText('ไม่มีประวัติ')}
                    columns={[
                      colId, colDevice, colUrgency,
                      { title: 'ผลการซ่อม', dataIndex: 'repairResult', key: 'repairResult',
                        render: (v?: RepairResult) => v
                          ? <Tag style={{ color: repairResultConfig[v].color, borderColor: repairResultConfig[v].color + '44', fontSize: 11 }}>{repairResultConfig[v].label}</Tag>
                          : '-' },
                      { title: 'วันที่เสร็จ', dataIndex: 'resolvedDate', key: 'resolvedDate', width: 110,
                        render: (v?: string) => <Text style={{ color: '#94a3b8', fontSize: 11 }}>{v ?? '-'}</Text> },
                      colDetail,
                    ]}
                  />
                ),
              },
            ]} />
          )}

        </Card>
      </div>

      {/* ══ Task Modal — อัพเดทงานที่เจ้าหน้าที่กำลังทำ (ออกใบ PR) ═══════════════ */}
      <Modal
        title={<span><ToolOutlined style={{ color: taskAccent, marginRight: 8 }} />อัพเดทงานที่กำลังทำ<code style={{ color: taskAccentText, fontSize: 12, marginLeft: 8, fontWeight: 400 }}>{taskModal?.id}</code></span>}
        open={!!taskModal}
        onCancel={() => { setTaskModal(null); taskForm.resetFields() }}
        onOk={() => taskForm.submit()}
        okText="อัพเดทงาน" cancelText="ยกเลิก"
        confirmLoading={taskSubmitting}
        okButtonProps={{ style: { background: taskAccent, borderColor: taskAccent } }}
        width={620}
      >
        {taskModal && (() => {
          const waited = daysSince(taskModal.createdAtIso ?? taskModal.requestDate)
          return (
            <Alert
              type="info" showIcon style={{ marginBottom: 16 }}
              title={<span style={{ fontSize: 13, color: '#e2e8f0' }}>{taskModal.deviceBrand}</span>}
              description={
                <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: '2px 6px', marginTop: 2 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <UserOutlined style={{ fontSize: 11 }} /> ผู้ส่งซ่อม: <span style={{ color: '#cbd5e1' }}>{taskModal.requesterName || '-'}</span>
                  </span>
                  {taskModal.deviceLocation && (
                    <>
                      <span style={{ color: '#475569' }}>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <EnvironmentOutlined style={{ fontSize: 11 }} /> ตำแหน่ง: <span style={{ color: '#cbd5e1' }}>{taskModal.deviceLocation}</span>
                      </span>
                    </>
                  )}
                  <span style={{ color: '#475569' }}>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <BarcodeOutlined style={{ fontSize: 11 }} /> เลขครุภัณฑ์: <span style={{ color: '#cbd5e1' }}>{taskModal.assetNo || '-'}</span>
                  </span>
                  <span style={{ color: '#475569' }}>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <EnvironmentOutlined style={{ fontSize: 11 }} /> {taskModal.department}
                  </span>
                  {waited != null && (
                    <>
                      <span style={{ color: '#475569' }}>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: daysColor(waited) }} />
                        รอมาแล้ว <span style={{ color: daysColor(waited), fontWeight: 700 }}>{waited} วัน</span>
                      </span>
                    </>
                  )}
                  {taskModal.prNumber && (
                    <>
                      <span style={{ color: '#475569' }}>·</span>
                      <span>PR <code style={{ color: '#fb923c' }}>{taskModal.prNumber}</code></span>
                    </>
                  )}
                </div>
              }
            />
          )
        })()}
        {taskModal && taskModal.status === 'po_processing' && (
          <Alert
            type="success" showIcon style={{ marginBottom: 16 }}
            title={
              <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <FileTextOutlined style={{ fontSize: 11 }} /> เอกสารที่เจ้าหน้าที่ IT เสนอ
                {taskModal.prNumber && <span style={{ color: '#94a3b8', fontWeight: 400 }}>· PR <code style={{ color: '#2dd4bf' }}>{taskModal.prNumber}</code></span>}
                {taskModal.prIssuedBy && <span style={{ color: '#94a3b8', fontWeight: 400 }}>· โดย {taskModal.prIssuedBy}</span>}
              </span>
            }
            description={
              (taskModal.prDocuments?.length ?? 0) > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {taskModal.prDocuments!.map(d => {
                    const doc = prDocTypes.find(x => x.id === d)
                    return (
                      <Tag key={d} icon={<CheckCircleOutlined />} style={{
                        color: '#0d9488', borderColor: '#0d948855', background: 'transparent', fontSize: 11,
                      }}>{doc?.name_th ?? d}</Tag>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>ยังไม่มีรายการเอกสารที่บันทึกไว้</div>
              )
            }
          />
        )}
        {taskModal && taskModal.status !== 'po_processing' && (() => {
          const rr = taskModal.repairResult ? repairResultConfig[taskModal.repairResult] : undefined
          if (!taskModal.assignedTo && !rr && !taskModal.technicianNote) return null
          return (
            <Alert
              type="warning" showIcon style={{ marginBottom: 16 }}
              title={
                <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <UserOutlined style={{ fontSize: 11 }} /> ช่างผู้ซ่อม: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{taskModal.assignedTo || '-'}</span>
                  {taskModal.assignedDate && <span style={{ color: '#94a3b8', fontWeight: 400 }}>· รับงาน {taskModal.assignedDate}</span>}
                </span>
              }
              description={
                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {(() => {
                    const used = techWorkingDays(taskModal)
                    if (used == null) return null
                    return (
                      <div>
                        <span style={{ color: '#64748b' }}>ช่างใช้เวลาดำเนินการ: </span>
                        <span style={{ color: daysColor(used), fontWeight: 700 }}>{used} วัน</span>
                        {taskModal.estimatedDays != null && <span style={{ color: '#64748b' }}> / ขอไว้ {taskModal.estimatedDays} วัน</span>}
                      </div>
                    )
                  })()}
                  {rr && (
                    <div>
                      <span style={{ color: '#64748b' }}>ผลการประเมิน: </span>
                      <span style={{ color: rr.color, fontWeight: 700 }}>{rr.label}</span>
                    </div>
                  )}
                  {taskModal.technicianNote && (
                    <div><span style={{ color: '#64748b' }}>บันทึกของช่าง: </span><span style={{ color: '#cbd5e1' }}>{taskModal.technicianNote}</span></div>
                  )}
                  {taskModal.partsUsed && (
                    <div><span style={{ color: '#64748b' }}>อะไหล่ที่ใช้/ต้องซื้อ: </span><span style={{ color: '#cbd5e1' }}>{taskModal.partsUsed}</span></div>
                  )}
                  {taskModal.replacementNote && (
                    <div><span style={{ color: '#64748b' }}>ข้อเสนอแนะซื้อทดแทน: </span><span style={{ color: '#cbd5e1' }}>{taskModal.replacementNote}</span></div>
                  )}
                  {taskModal.externalServiceNote && (
                    <div><span style={{ color: '#64748b' }}>ส่งซ่อมภายนอก: </span><span style={{ color: '#cbd5e1' }}>{taskModal.externalServiceNote}</span></div>
                  )}
                </div>
              }
            />
          )
        })()}
        <Form form={taskForm} layout="vertical" onFinish={handleUpdateTaskStep}>
          <ConfigProvider theme={{ token: { colorPrimary: taskAccent } }}>
            {taskModal?.status === 'po_processing' ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, color: '#e2e8f0' }}>สถานะการติดตาม PO</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' }}>
                  {stepsFor(taskModal?.status).map(s => {
                    const ps = taskModal?.prStatus
                    const notFound = !ps?.found
                    const done = s.step_code === 'pr_approved' ? !!ps?.issued : s.step_code === 'po_approved' ? !!ps?.poApproveDate : false
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5 }}>
                        {notFound
                          ? <CloseCircleOutlined style={{ fontSize: 13, marginTop: 2, color: '#ef4444' }} />
                          : <CheckSquareOutlined style={{ fontSize: 13, marginTop: 2, color: done ? '#22c55e' : '#475569' }} />}
                        <span style={{ color: notFound ? '#94a3b8' : (done ? '#e2e8f0' : '#94a3b8'), fontSize: 13 }}>
                          {s.name_th}
                          {s.step_code === 'pr_approved' && (() => {
                            const prNo = taskModal?.prNumber ?? ps?.requestNo
                            return (
                              <>
                                {prNo && <span style={{ marginLeft: 6, fontSize: 12 }}>เลขที่ <code style={{ color: '#fb923c' }}>{prNo}</code></span>}
                                {ps?.issued && ps.approveDate && (
                                  <span style={{ color: '#22c55e', marginLeft: 6, fontSize: 12 }}>· อนุมัติวันที่ {fmtDate(ps.approveDate)}</span>
                                )}
                                {ps?.found && !ps.issued && (
                                  <span style={{ color: '#eab308', marginLeft: 6, fontSize: 12 }}>· รออนุมัติพัสดุ</span>
                                )}
                              </>
                            )
                          })()}
                          {s.step_code === 'po_approved' && ps?.poApproveDate && (
                            <>
                              <span style={{ color: '#22c55e', marginLeft: 6, fontSize: 12 }}>· อนุมัติ PO วันที่ {fmtDate(ps.poApproveDate)}</span>
                              {ps.paidStatusName && (
                                <span style={{ color: '#38bdf8', marginLeft: 6, fontSize: 12 }}>· {ps.paidStatusName}</span>
                              )}
                            </>
                          )}
                          {(s.step_code === 'pr_approved' || s.step_code === 'po_approved') && notFound && (
                            <span style={{ color: '#ef4444', marginLeft: 6, fontSize: 12 }}>· ไม่พบข้อมูล</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <Form.Item
                name="task_steps"
                label="ขั้นงานที่ทำเสร็จแล้ว"
                extra={<span style={{ fontSize: 11, color: '#64748b' }}>ติ๊กขั้นงานที่ดำเนินการเสร็จแล้ว (เลือกได้หลายขั้น)</span>}
              >
                <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                  {stepsFor(taskModal?.status).map(s => (
                    <Checkbox key={s.id} value={s.id}>
                      <span style={{ color: taskAccent, fontWeight: 700, marginRight: 6 }}>{s.sort_order}.</span>
                      <span style={{ color: '#e2e8f0' }}>{s.name_th}</span>
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </Form.Item>
            )}
          </ConfigProvider>
          <Form.Item
            name="task_note"
            label="หมายเหตุ / รายละเอียดการดำเนินการจนถึงวันนี้"
          >
            <TextArea
              rows={3}
              placeholder="เช่น ทำบันทึกข้อความเสร็จแล้ว รอเสนอ ผอ. เซ็น / ติดต่อพัสดุขอทะเบียนครุภัณฑ์"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>

        {/* ประวัติการอัพเดทความคืบหน้า (ล่าสุด → เก่า) */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClockCircleOutlined style={{ fontSize: 12 }} /> ประวัติการอัพเดท
            {taskHistoryLoading && <Spin size="small" />}
          </div>
          {!taskHistoryLoading && taskHistory.length === 0 && (
            <div style={{ fontSize: 12, color: '#475569' }}>ยังไม่มีประวัติการอัพเดท</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {taskHistory.map((e, i) => (
              <div key={e.id} style={{
                fontSize: 11, lineHeight: 1.6, padding: '8px 10px', borderRadius: 8,
                background: i === 0 ? `${taskAccent}10` : '#0f172a',
                border: `1px solid ${i === 0 ? `${taskAccent}40` : '#1e293b'}`,
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 6px', marginBottom: 4 }}>
                  {i === 0 && <Tag color={taskAccent} style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>ล่าสุด</Tag>}
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{e.created_by_name}</span>
                  <span style={{ color: '#475569' }}>·</span>
                  <span style={{ color: '#64748b' }}>{fmtDateTime(e.created_at)}</span>
                </div>
                {e.completed_steps.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: e.note ? 4 : 0 }}>
                    {e.completed_steps.map(s => (
                      <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
                        <CheckSquareOutlined style={{ fontSize: 10 }} />{s.name_th}
                      </span>
                    ))}
                  </div>
                )}
                {e.note && <div style={{ color: '#94a3b8' }}>{e.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ══ PR Modal ══════════════════════════════════════════════════════════ */}
      <Modal
        title={<span><ShoppingCartOutlined style={{ color: '#f97316', marginRight: 8 }} />บันทึกเอกสารเตรียมนำเสนอ — {prModal?.id}</span>}
        open={!!prModal}
        onCancel={() => { setPrModal(null); prForm.resetFields() }}
        onOk={() => prForm.submit()}
        okText="บันทึก PR" cancelText="ยกเลิก"
        okButtonProps={{ style: { background: '#f97316', borderColor: '#f97316' } }}
      >
        {prModal && (() => {
          const waited = daysSince(prModal.createdAtIso ?? prModal.requestDate)
          return (
            <Alert
              type="info" showIcon style={{ marginBottom: 12 }}
              title={<span style={{ fontSize: 13, color: '#e2e8f0' }}>{prModal.deviceBrand}</span>}
              description={
                <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: '2px 6px', marginTop: 2 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <UserOutlined style={{ fontSize: 11 }} /> ผู้ส่งซ่อม: <span style={{ color: '#cbd5e1' }}>{prModal.requesterName || '-'}</span>
                  </span>
                  {prModal.deviceLocation && (
                    <>
                      <span style={{ color: '#475569' }}>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <EnvironmentOutlined style={{ fontSize: 11 }} /> ตำแหน่ง: <span style={{ color: '#cbd5e1' }}>{prModal.deviceLocation}</span>
                      </span>
                    </>
                  )}
                  <span style={{ color: '#475569' }}>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <BarcodeOutlined style={{ fontSize: 11 }} /> เลขครุภัณฑ์: <span style={{ color: '#cbd5e1' }}>{prModal.assetNo || '-'}</span>
                  </span>
                  <span style={{ color: '#475569' }}>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <EnvironmentOutlined style={{ fontSize: 11 }} /> {prModal.department}
                  </span>
                  {waited != null && (
                    <>
                      <span style={{ color: '#475569' }}>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: daysColor(waited) }} />
                        รอมาแล้ว <span style={{ color: daysColor(waited), fontWeight: 700 }}>{waited} วัน</span>
                      </span>
                    </>
                  )}
                </div>
              }
            />
          )
        })()}
        {prModal && (() => {
          const rr = prModal.repairResult ? repairResultConfig[prModal.repairResult] : undefined
          return (
            <Alert
              type="warning" showIcon style={{ marginBottom: 16 }}
              title={
                <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <UserOutlined style={{ fontSize: 11 }} /> ช่างผู้ซ่อม: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{prModal.assignedTo || '-'}</span>
                  {prModal.assignedDate && <span style={{ color: '#94a3b8', fontWeight: 400 }}>· รับงาน {prModal.assignedDate}</span>}
                </span>
              }
              description={
                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {(() => {
                    const used = techWorkingDays(prModal)
                    if (used == null) return null
                    return (
                      <div>
                        <span style={{ color: '#64748b' }}>ช่างใช้เวลาดำเนินการ: </span>
                        <span style={{ color: daysColor(used), fontWeight: 700 }}>{used} วัน</span>
                        {prModal.estimatedDays != null && <span style={{ color: '#64748b' }}> / ขอไว้ {prModal.estimatedDays} วัน</span>}
                      </div>
                    )
                  })()}
                  {rr && (
                    <div>
                      <span style={{ color: '#64748b' }}>ผลการประเมิน: </span>
                      <span style={{ color: rr.color, fontWeight: 700 }}>{rr.label}</span>
                    </div>
                  )}
                  {prModal.technicianNote && (
                    <div><span style={{ color: '#64748b' }}>บันทึกของช่าง: </span><span style={{ color: '#cbd5e1' }}>{prModal.technicianNote}</span></div>
                  )}
                  {prModal.partsUsed && (
                    <div><span style={{ color: '#64748b' }}>อะไหล่ที่ใช้/ต้องซื้อ: </span><span style={{ color: '#cbd5e1' }}>{prModal.partsUsed}</span></div>
                  )}
                  {prModal.replacementNote && (
                    <div><span style={{ color: '#64748b' }}>ข้อเสนอแนะซื้อทดแทน: </span><span style={{ color: '#cbd5e1' }}>{prModal.replacementNote}</span></div>
                  )}
                  {prModal.externalServiceNote && (
                    <div><span style={{ color: '#64748b' }}>ส่งซ่อมภายนอก: </span><span style={{ color: '#cbd5e1' }}>{prModal.externalServiceNote}</span></div>
                  )}
                </div>
              }
            />
          )
        })()}
        {prModal && (prModal.itHeadApproval || prModal.missionHeadApproval) && (() => {
          const rows: { label: string; icon: React.ReactNode; ap?: Approval }[] = [
            { label: 'หัวหน้า IT', icon: <SafetyCertificateOutlined style={{ fontSize: 11 }} />, ap: prModal.itHeadApproval },
            { label: 'หัวหน้ากลุ่มภารกิจ', icon: <AuditOutlined style={{ fontSize: 11 }} />, ap: prModal.missionHeadApproval },
          ].filter(r => r.ap)
          return (
            <Alert
              type="success" showIcon style={{ marginBottom: 16 }}
              title={<span style={{ fontSize: 12, color: '#e2e8f0' }}>ผ่านการอนุมัติแล้ว</span>}
              description={
                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                  {rows.map(({ label, icon, ap }) => {
                    const approved = ap!.status === 'approved'
                    const color = approved ? '#22c55e' : '#ef4444'
                    return (
                      <div key={label} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 6px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b' }}>{icon}{label}:</span>
                        <span style={{ color, fontWeight: 700 }}>{approved ? 'อนุมัติ' : 'ไม่อนุมัติ'}</span>
                        {ap!.by && <><span style={{ color: '#475569' }}>·</span><span style={{ color: '#cbd5e1' }}>{ap!.by}</span></>}
                        {ap!.date && <><span style={{ color: '#475569' }}>·</span><span>{ap!.date}</span></>}
                        {ap!.note && <div style={{ width: '100%', color: '#94a3b8' }}><span style={{ color: '#64748b' }}>หมายเหตุ: </span>{ap!.note}</div>}
                      </div>
                    )
                  })}
                </div>
              }
            />
          )
        })()}
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#f97316', colorPrimaryHover: '#fb923c', colorPrimaryActive: '#ea580c' } }}>
          <Form form={prForm} layout="vertical" onFinish={handleIssuePR}>
            <Form.Item name="prNumber" label="เลขที่ใบ PR" rules={[{ required: true, message: 'กรุณาระบุเลขที่ใบ PR' }]}>
              <Input placeholder="เช่น PR-2026-00123" />
            </Form.Item>
            <Form.Item name="prDocuments" label="เอกสารที่เสนอผู้อำนวยการ ประกอบด้วย">
              <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {prDocTypes.map(doc => (
                  <Checkbox key={doc.id} value={doc.id}>{doc.name_th}</Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
            <Form.Item name="prNote" label="รายละเอียด PR / อะไหล่ที่ต้องการจัดซื้อ">
              <TextArea rows={3} placeholder="เช่น ออก PR สั่งซื้อ... Part Number: ... จำนวน ... ราคาประมาณ ..." />
            </Form.Item>
          </Form>
        </ConfigProvider>
      </Modal>

      {/* ══ Record Result Modal ═══════════════════════════════════════════════ */}
      <Modal
        title={
          <span>
            <CheckSquareOutlined style={{ color: '#22c55e', marginRight: 8 }} />
            บันทึกผลการซ่อม
            <code style={{ color: '#a78bfa', fontSize: 12, marginLeft: 10, fontWeight: 400 }}>{resultModal?.id}</code>
          </span>
        }
        open={!!resultModal}
        onCancel={() => { setResultModal(null); resultForm.resetFields() }}
        onOk={() => resultForm.submit()}
        okText="บันทึกผล" cancelText="ยกเลิก"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
        width={1100}
      >
        {resultModal && (() => {
          const devTypeLabel = DEVICE_TYPE_LABEL[resultModal.deviceType] ?? resultModal.deviceType
          const probCat = PROBLEM_CATEGORY_LABEL[resultModal.problemCategory] ?? { label: resultModal.problemCategory, color: '#94a3b8' }
          return (
            <Descriptions
              column={4}
              size="small"
              bordered
              styles={{
                label:   { color: '#94a3b8', background: '#0f172a', fontSize: 11, padding: '6px 10px', width: 100 },
                content: { background: '#1e293b', color: '#e2e8f0', fontSize: 12, padding: '6px 10px' },
              }}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="เลขที่">
                <code style={{ color: '#a78bfa', fontWeight: 700 }}>{resultModal.id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="วันที่แจ้ง">{resultModal.requestDate}</Descriptions.Item>
              <Descriptions.Item label="ความเร่งด่วน" span={2}>
                <Tag color={urgencyConfig[resultModal.urgency].color} style={{ margin: 0 }}>
                  {urgencyConfig[resultModal.urgency].label}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="ผู้แจ้ง">{resultModal.requesterName}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน" span={2}>{resultModal.department}</Descriptions.Item>
              <Descriptions.Item label="เบอร์"><code style={{ color: '#cbd5e1' }}>{resultModal.phone}</code></Descriptions.Item>

              <Descriptions.Item label="ประเภท">{devTypeLabel}</Descriptions.Item>
              <Descriptions.Item label="ยี่ห้อ / รุ่น" span={3}>
                <Text style={{ color: '#e2e8f0', fontWeight: 600 }}>{resultModal.deviceBrand}</Text>
              </Descriptions.Item>

              {resultModal.assetNo && (
                <Descriptions.Item label="เลขครุภัณฑ์" span={resultModal.deviceSerial ? 2 : 4}>
                  <code style={{ color: '#a78bfa' }}>{resultModal.assetNo}</code>
                </Descriptions.Item>
              )}
              {resultModal.deviceSerial && (
                <Descriptions.Item label="Serial" span={resultModal.assetNo ? 2 : 4}>
                  <code style={{ color: '#fb923c' }}>{resultModal.deviceSerial}</code>
                </Descriptions.Item>
              )}
              {resultModal.deviceLocation && (
                <Descriptions.Item label="สถานที่" span={4}>{resultModal.deviceLocation}</Descriptions.Item>
              )}

              <Descriptions.Item label="หมวดหมู่" span={4}>
                <Tag style={{ color: probCat.color, borderColor: probCat.color + '55', background: 'transparent', margin: 0 }}>
                  {probCat.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="อาการที่แจ้ง" span={4} styles={{ content: { whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#e2e8f0', fontSize: 12, padding: '6px 10px', background: '#1e293b' } }}>
                {resultModal.symptom}
              </Descriptions.Item>
            </Descriptions>
          )
        })()}
        <Form form={resultForm} layout="vertical" onFinish={handleRecordResult}>
              {/* ── Result options 2×2 grid ── */}
              <Form.Item
                name="repair_assessment_id"
                label={<span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>ประเมินการซ่อม</span>}
                rules={[{ required: true, message: 'กรุณาเลือกผลการซ่อม' }]}
              >
                <Radio.Group style={{ width: '100%' }}>
                  <Row gutter={[8, 8]}>
                    {assessments.map(a => {
                      const key = ASSESSMENT_ID_TO_RESULT[a.repair_assessment_id]
                      const cfg = key ? repairResultConfig[key] : { color: '#94a3b8', label: a.assessment_name }
                      const desc = key ? ASSESSMENT_DESC[key] : ''
                      return (
                        <Col span={12} key={a.repair_assessment_id}>
                          <Radio value={a.repair_assessment_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', border: `1px solid #1e293b`, borderRadius: 8, width: '100%', margin: 0, background: '#0f172a', cursor: 'pointer' }}>
                            <div>
                              <div style={{ color: cfg.color, fontWeight: 700, fontSize: 12, lineHeight: 1.5 }}>{a.assessment_name}</div>
                              {desc && <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>{desc}</div>}
                            </div>
                          </Radio>
                        </Col>
                      )
                    })}
                    {assessments.length === 0 && (
                      <Col span={24}>
                        <div style={{ color: '#475569', fontSize: 11, padding: '12px 0', textAlign: 'center' }}>
                          กำลังโหลดตัวเลือก…
                        </div>
                      </Col>
                    )}
                  </Row>
                </Radio.Group>
              </Form.Item>

              {/* ── Conditional fields ── */}
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.repair_assessment_id !== cur.repair_assessment_id}>
                {({ getFieldValue }) => {
                  const result: number | undefined = getFieldValue('repair_assessment_id')
                  return (
                    <>
                      {result === 2 && (
                        <Form.Item name="parts_used" label="อะไหล่ที่ใช้" rules={[{ required: true, message: 'กรุณาระบุอะไหล่ที่ใช้' }]}>
                          <Input placeholder="เช่น Power Supply ATX 500W, RAM DDR4 8GB" />
                        </Form.Item>
                      )}
                      {result === 3 && (
                        <Form.Item name="parts_used" label="อะไหล่ที่ต้องสั่งซื้อ" rules={[{ required: true, message: 'กรุณาระบุอะไหล่' }]}>
                          <Input placeholder="เช่น Feed Roller HP PN: RM2-5452, จำนวน 1 ชุด" />
                        </Form.Item>
                      )}
                      {result === 5 && (
                        <Form.Item name="external_service_detail" label="ข้อมูลบริษัทภายนอก / ราคาประเมิน" rules={[{ required: true, message: 'กรุณาระบุข้อมูลบริษัทและราคา' }]}>
                          <TextArea rows={3} placeholder="เช่น บริษัท ABC จำกัด ราคาประเมิน 5,000 บาท เนื่องจาก..." />
                        </Form.Item>
                      )}
                      {result === 4 && (
                        <>
                          <Form.Item name="replacement_recommendation" label="คำแนะนำการซื้อทดแทน" rules={[{ required: true, message: 'กรุณาระบุคำแนะนำ' }]}>
                            <TextArea rows={3} placeholder="เช่น แนะนำจัดซื้อทดแทน [รุ่น] ราคาประมาณ [บาท] เนื่องจาก..." />
                          </Form.Item>
                          <Form.Item
                            name="return_status_id"
                            label={<span style={{ color: '#e2e8f0', fontWeight: 600 }}>การส่งคืนครุภัณฑ์ที่ซ่อมไม่ได้</span>}
                            rules={[{ required: true, message: 'กรุณาเลือกการจัดการครุภัณฑ์' }]}
                            extra={
                              <span style={{ color: '#f59e0b', fontSize: 11 }}>
                                ⚠ ต้องส่งคืนเพื่อป้องกันการสูญหาย และให้สามารถคืนพัสดุได้หลังได้ครุภัณฑ์ใหม่
                              </span>
                            }
                          >
                            <Radio.Group style={{ width: '100%' }}>
                              <Row gutter={[8, 8]}>
                                {Object.entries(RETURN_STATUS_ID_TO_KEY).map(([idStr, key]) => {
                                  const id = Number(idStr)
                                  const cfg = REPLACEMENT_HANDOVER_CONFIG[key]
                                  return (
                                    <Col span={12} key={id}>
                                      <Radio value={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid #1e293b', borderRadius: 8, width: '100%', margin: 0, background: '#0f172a', cursor: 'pointer' }}>
                                        <span style={{ color: cfg.color, fontWeight: 600, fontSize: 12 }}>{cfg.label}</span>
                                      </Radio>
                                    </Col>
                                  )
                                })}
                              </Row>
                            </Radio.Group>
                          </Form.Item>
                        </>
                      )}
                    </>
                  )
                }}
              </Form.Item>

              {/* ── Repair note ── */}
              <Form.Item
                name="assessment_detail"
                label={<span style={{ color: '#e2e8f0', fontWeight: 600 }}>บันทึกรายละเอียดการซ่อม</span>}
                rules={[{ required: true, message: 'กรุณาบันทึกรายละเอียด' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="อธิบายขั้นตอนที่ดำเนินการ อาการที่ตรวจพบ สาเหตุ และวิธีแก้ไข..."
                  style={{ fontSize: 13 }}
                />
              </Form.Item>
        </Form>
      </Modal>

      {/* ══ Approval Modal ════════════════════════════════════════════════════ */}
      <Modal
        title={
          <span>
            <SafetyCertificateOutlined style={{ color: '#a78bfa', marginRight: 8 }} />
            พิจารณาอนุมัติ — {approvalModal?.req.id}
          </span>
        }
        open={!!approvalModal}
        onCancel={() => { setApprovalModal(null); approvalForm.resetFields() }}
        onOk={() => approvalForm.submit()}
        okText="ยืนยัน" cancelText="ยกเลิก"
        width={860}
      >
        {approvalModal && (() => {
          const req = approvalModal.req
          const exts = req.extensions ?? []
          const dueIso = effectiveDueIso(req)
          const firstIso = originalDueIso(req)
          const left = daysUntil(dueIso)
          const ds = left !== null ? dueStatus(left) : null
          return (
          <>
          <Descriptions column={1} size="small" bordered
            styles={{ label: { color: '#94a3b8', background: '#0f172a', width: 130 }, content: { background: '#1e293b', color: '#e2e8f0' } }}
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="อุปกรณ์">
              {req.deviceBrand}
              {req.assetNo && <code style={{ color: '#fb923c', fontSize: 11, marginLeft: 8 }}>{req.assetNo}</code>}
            </Descriptions.Item>
            <Descriptions.Item label="หน่วยงาน">{req.department}{req.deviceLocation ? ` · ${req.deviceLocation}` : ''}</Descriptions.Item>
            <Descriptions.Item label="อาการ" styles={{ content: { fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap' } }}>
              {req.symptom}
            </Descriptions.Item>
            {req.assignedTo && (
              <Descriptions.Item label="ช่างผู้รับผิดชอบ">
                <ToolOutlined style={{ color: '#6ee7b7', marginRight: 6 }} />{req.assignedTo}
                {req.assignedDate && <span style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>รับงาน {req.assignedDate}</span>}
              </Descriptions.Item>
            )}
            {(req.estimatedDays != null || dueIso || exts.length > 0) && (
              <Descriptions.Item label="กำหนดเวลาซ่อม">
                <Space size={8} wrap>
                  {req.estimatedDays != null && (
                    <Tag style={{ color: '#a78bfa', borderColor: '#a78bfa44', background: 'transparent', margin: 0 }}>
                      ขอเวลา {req.estimatedDays} วัน
                    </Tag>
                  )}
                  {exts.length > 0 && firstIso ? (
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>
                      สัญญาแรก {fmtDate(firstIso)}
                      <span style={{ color: '#f59e0b', fontWeight: 600, margin: '0 6px' }}>ผลัดสัญญา {exts.length} ครั้ง</span>
                      {dueIso && <span style={{ color: '#e2e8f0', fontWeight: 600 }}>กำหนดล่าสุด {fmtDate(dueIso)}</span>}
                    </span>
                  ) : (
                    dueIso && <span style={{ color: '#94a3b8', fontSize: 12 }}>ครบกำหนด {fmtDate(dueIso)}</span>
                  )}
                  {ds && <Tag style={{ color: ds.color, borderColor: ds.color + '55', background: 'transparent', margin: 0 }}>{ds.label}</Tag>}
                </Space>
              </Descriptions.Item>
            )}
            {exts.length > 0 && (
              <Descriptions.Item label="ประวัติผลัดสัญญา">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {exts.map((ex, i) => (
                    <div key={i} style={{ fontSize: 12 }}>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>+{ex.days} วัน</span>
                      {ex.prevDueIso && ex.newDueIso && (
                        <span style={{ color: '#94a3b8', marginLeft: 6 }}>{fmtDate(ex.prevDueIso)} → {fmtDate(ex.newDueIso)}</span>
                      )}
                      <span style={{ color: '#475569', margin: '0 6px' }}>({ex.date})</span>
                      <span style={{ color: '#94a3b8' }}>{ex.reason}</span>
                      {ex.by && <span style={{ color: '#64748b', marginLeft: 6 }}>— {ex.by}</span>}
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="ผลการประเมิน">
              {req.repairResult && (
                <Tag style={{ color: repairResultConfig[req.repairResult].color }}>
                  {repairResultConfig[req.repairResult].label}
                </Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="ความเห็นช่าง" styles={{ content: { fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap' } }}>
              {req.replacementNote || req.prNote || req.technicianNote}
            </Descriptions.Item>
            {req.partsUsed && (
              <Descriptions.Item label="อะไหล่ที่ใช้" styles={{ content: { fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap' } }}>
                {req.partsUsed}
              </Descriptions.Item>
            )}
            {(req.prNumber || req.prTrackingStatus) && (
              <Descriptions.Item label="ติดตาม PR">
                <Space size={8} wrap>
                  {req.prNumber && (
                    <code style={{ color: '#fb923c', fontSize: 12, background: '#1c0f00', padding: '1px 6px', borderRadius: 4 }}>{req.prNumber}</code>
                  )}
                  {req.prTrackingStatus && (
                    <Tag style={{ color: PR_TRACKING_CONFIG[req.prTrackingStatus].color, borderColor: PR_TRACKING_CONFIG[req.prTrackingStatus].color + '55', background: 'transparent', margin: 0 }}>
                      {PR_TRACKING_CONFIG[req.prTrackingStatus].label}
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
            )}
            {approvalModal.level === 'mission_head' && req.itHeadApproval && (
              <Descriptions.Item label="มติหัวหน้า IT">
                <Tag color="success">อนุมัติแล้ว</Tag>
                <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 8 }}>{req.itHeadApproval.note}</span>
              </Descriptions.Item>
            )}
          </Descriptions>

          {(approvalImagesLoading || approvalImages.length > 0) && (
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>ภาพถ่ายอาการ</Text>
              {approvalImagesLoading ? (
                <Spin size="small" />
              ) : (
                <AntImage.PreviewGroup>
                  <Space wrap>
                    {approvalImages.map(img => (
                      <AntImage
                        key={img.it_repair_request_image_id}
                        src={`/api/v1/it/repair-request-images/${img.it_repair_request_image_id}/file`}
                        width={96}
                        height={96}
                        style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #334155' }}
                      />
                    ))}
                  </Space>
                </AntImage.PreviewGroup>
              )}
            </div>
          )}
          </>
          )
        })()}
        <Form form={approvalForm} layout="vertical" onFinish={handleApproval}>
          <Form.Item name="decision" label="มติ" rules={[{ required: true, message: 'กรุณาเลือกมติ' }]}>
            <Radio.Group>
              <Radio.Button value="approved">
                <CheckCircleOutlined style={{ marginRight: 4, color: '#22c55e' }} />อนุมัติ
              </Radio.Button>
              <Radio.Button value="rejected">
                <CloseCircleOutlined style={{ marginRight: 4, color: '#ef4444' }} />ปฏิเสธ
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.decision !== c.decision}>
            {({ getFieldValue }) => (
              <Form.Item
                name="note"
                label="หมายเหตุ / เหตุผล"
                rules={[{
                  required: getFieldValue('decision') === 'rejected',
                  message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ',
                }]}
              >
                <TextArea rows={2} placeholder="ระบุหมายเหตุ เหตุผลการอนุมัติหรือปฏิเสธ..." />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* ══ Take Job Modal ════════════════════════════════════════════════════ */}
      <Modal
        title={<span><CheckSquareOutlined style={{ color: '#7c3aed', marginRight: 8 }} />รับงานซ่อม<code style={{ color: '#a78bfa', fontSize: 12, marginLeft: 8, fontWeight: 400 }}>{takeModal?.id}</code></span>}
        open={!!takeModal}
        onCancel={() => { setTakeModal(null); takeForm.resetFields() }}
        onOk={() => takeForm.submit()}
        okText="รับงาน — เริ่มซ่อม" cancelText="ยกเลิก"
        okButtonProps={{ style: { background: '#7c3aed', borderColor: '#7c3aed' } }}
        width={460}
      >
        {takeModal && (
          <Alert
            type="info" showIcon style={{ marginBottom: 16 }}
            title={<span style={{ fontSize: 13, color: '#e2e8f0' }}>{takeModal.deviceBrand}</span>}
            description={<span style={{ fontSize: 12, color: '#94a3b8' }}>{takeModal.department}{takeModal.deviceLocation ? ' · ' + takeModal.deviceLocation : ''}</span>}
          />
        )}
        <Form
          key={takeModal?.id}
          form={takeForm}
          layout="vertical"
          onFinish={submitTakeJob}
          initialValues={{
            dueDate: dayjs().add(1, 'day'),
            it_priority_level_id: priorityLevels.find(p => urgencyByOrder(p.display_order) === takeModal?.urgency)?.it_priority_level_id,
          }}
        >
          <Form.Item
            name="it_priority_level_id"
            label="ความเร่งด่วน (ช่างประเมิน)"
            extra={<span style={{ color: '#64748b', fontSize: 11 }}>ช่างกำหนดระดับความเร่งด่วนของงานนี้เอง</span>}
            rules={[{ required: true, message: 'กรุณาเลือกความเร่งด่วน' }]}
          >
            <Select
              placeholder="เลือกระดับความเร่งด่วน"
              options={priorityLevels.map(p => {
                const u = urgencyByOrder(p.display_order)
                return {
                  value: p.it_priority_level_id,
                  label: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: URGENCY_DOT[u], boxShadow: `0 0 6px ${URGENCY_DOT[u]}99`, flexShrink: 0 }} />
                      <span style={{ color: '#e2e8f0' }}>{p.name}</span>
                      {p.description && <span style={{ color: '#64748b', fontSize: 11 }}>· {p.description}</span>}
                    </span>
                  ),
                }
              })}
            />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="กำหนดวันที่จะซ่อมเสร็จ"
            extra={<span style={{ color: '#64748b', fontSize: 11 }}>เลือกวันที่ — ระบบจะคำนวณจำนวนวันให้อัตโนมัติ</span>}
            rules={[{ required: true, message: 'กรุณาเลือกวันที่จะเสร็จ' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="เลือกวันที่จะเสร็จ"
              disabledDate={(d) => d.isBefore(dayjs(), 'day')}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.dueDate !== c.dueDate}>
            {({ getFieldValue }) => {
              const due = getFieldValue('dueDate') as Dayjs | undefined
              if (!due) return null
              const days = due.startOf('day').diff(dayjs().startOf('day'), 'day')
              const color = daysColor(days)
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: color + '14', border: `1px solid ${color}33`, marginBottom: 8 }}>
                  <ClockCircleOutlined style={{ color }} />
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>ระยะเวลาซ่อม</span>
                  <span style={{ color, fontWeight: 700, fontSize: 16 }}>{days}</span>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>วัน</span>
                  <span style={{ color: '#475569', fontSize: 12, marginLeft: 'auto' }}>ครบกำหนด {due.format('DD/MM/YYYY')}</span>
                </div>
              )
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* ══ Reject Job Modal ══════════════════════════════════════════════════ */}
      <Modal
        title={<span><CloseCircleOutlined style={{ color: '#dc2626', marginRight: 8 }} />ปฏิเสธงานซ่อม<code style={{ color: '#a78bfa', fontSize: 12, marginLeft: 8, fontWeight: 400 }}>{rejectModal?.id}</code></span>}
        open={!!rejectModal}
        onCancel={() => { setRejectModal(null); rejectForm.resetFields() }}
        onOk={() => rejectForm.submit()}
        okText="ปฏิเสธงาน" cancelText="ยกเลิก"
        okButtonProps={{ danger: true }}
        width={460}
      >
        {rejectModal && (
          <Alert
            type="warning" showIcon style={{ marginBottom: 16 }}
            title={<span style={{ fontSize: 13, color: '#e2e8f0' }}>{rejectModal.deviceBrand}</span>}
            description={<span style={{ fontSize: 12, color: '#94a3b8' }}>{rejectModal.department}{rejectModal.deviceLocation ? ' · ' + rejectModal.deviceLocation : ''}</span>}
          />
        )}
        <Form form={rejectForm} layout="vertical" onFinish={submitRejectJob}>
          <Form.Item name="reason" label="เหตุผลการปฏิเสธงาน" rules={[{ required: true, message: 'กรุณาระบุเหตุผลการปฏิเสธ' }]}>
            <TextArea rows={3} placeholder="ระบุเหตุผลการปฏิเสธงาน..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ══ Extend Time Modal ═════════════════════════════════════════════════ */}
      <Modal
        title={<span><ClockCircleOutlined style={{ color: '#f59e0b', marginRight: 8 }} />ขอเพิ่มระยะเวลาซ่อม<code style={{ color: '#a78bfa', fontSize: 12, marginLeft: 8, fontWeight: 400 }}>{extendModal?.id}</code></span>}
        open={!!extendModal}
        onCancel={() => { setExtendModal(null); extendForm.resetFields() }}
        onOk={() => extendForm.submit()}
        okText="ขอเพิ่มเวลา" cancelText="ยกเลิก"
        okButtonProps={{ style: { background: '#f59e0b', borderColor: '#f59e0b' } }}
        width={460}
      >
        {extendModal && (() => {
          // กำหนดเดิม = กำหนดล่าสุดหลังรวมการขอเพิ่มเวลาครั้งก่อน ๆ แล้ว
          const dueIso = effectiveDueIso(extendModal)
          const firstIso = originalDueIso(extendModal)
          const left = daysUntil(dueIso)
          const ds = left !== null ? dueStatus(left) : null
          const extCount = extendModal.extensions?.length ?? 0
          return (
            <Alert
              type="warning" showIcon style={{ marginBottom: 16 }}
              title={<span style={{ fontSize: 13, color: '#e2e8f0' }}>{extendModal.deviceBrand}</span>}
              description={
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {dueIso
                    ? extCount > 0 && firstIso
                      ? <>
                          สัญญาแรก {fmtDate(firstIso)}
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}> · ผลัดมาแล้ว {extCount} ครั้ง</span>
                          {' · '}<span style={{ color: '#e2e8f0', fontWeight: 600 }}>กำหนดล่าสุด {fmtDate(dueIso)}</span>
                          {ds && <> · <span style={{ color: ds.color }}>{ds.label}</span></>}
                        </>
                      : <>
                          กำหนดเดิม {fmtDate(dueIso)}
                          {ds && <> · <span style={{ color: ds.color }}>{ds.label}</span></>}
                        </>
                    : 'ยังไม่ได้กำหนดเวลา'}
                </span>
              }
            />
          )
        })()}
        <Form form={extendForm} layout="vertical" onFinish={submitExtendTime}>
          <Form.Item
            name="newDueDate"
            label="กำหนดวันที่จะเสร็จใหม่"
            extra={<span style={{ color: '#64748b', fontSize: 11 }}>เลือกวันที่ใหม่ — ระบบจะคำนวณจำนวนวันที่เพิ่มให้อัตโนมัติ</span>}
            rules={[{ required: true, message: 'กรุณาเลือกวันที่จะเสร็จใหม่' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="เลือกวันที่จะเสร็จใหม่"
              disabledDate={(d) => {
                // เลือกได้เฉพาะวันหลังกำหนดล่าสุดเท่านั้น — กันเลือกวันซ้ำ/ย้อนช่วงที่ขยายไปแล้ว
                const minIso = extendModal ? effectiveDueIso(extendModal) : undefined
                const min = minIso ? dayjs(minIso) : dayjs()
                return !d.isAfter(min, 'day')
              }}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.newDueDate !== c.newDueDate}>
            {({ getFieldValue }) => {
              const nd = getFieldValue('newDueDate') as Dayjs | undefined
              if (!nd || !extendModal) return null
              const baseIso = effectiveDueIso(extendModal)
              const base = (baseIso ? dayjs(baseIso) : dayjs()).startOf('day')
              const days = nd.startOf('day').diff(base, 'day')
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#f59e0b14', border: '1px solid #f59e0b33', marginBottom: 16 }}>
                  <ClockCircleOutlined style={{ color: '#f59e0b' }} />
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>เพิ่มอีก</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16 }}>{days}</span>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>วัน</span>
                  <span style={{ color: '#475569', fontSize: 12, marginLeft: 'auto' }}>กำหนดใหม่ {nd.format('DD/MM/YYYY')}</span>
                </div>
              )
            }}
          </Form.Item>
          <Form.Item name="reason" label="เหตุผล / ปัญหาที่พบ" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
            <TextArea rows={3} placeholder="อธิบายปัญหาที่พบทำให้ต้องขอเพิ่มเวลา..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ══ Detail Modal ══════════════════════════════════════════════════════ */}
      <Modal
        title={<span><InfoCircleOutlined style={{ color: '#a78bfa', marginRight: 8 }} />รายละเอียด {detailModal?.id}</span>}
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={<Button onClick={() => setDetailModal(null)}>ปิด</Button>}
        width={1100}
      >
        {detailModal && (
            <>
              <Descriptions column={2} size="small" bordered
                styles={{ label: { color: '#94a3b8', background: '#0f172a', width: 130 }, content: { background: '#1e293b', color: '#e2e8f0' } }}
              >
            <Descriptions.Item label="เลขที่คำร้อง">
              <Text style={{ color: '#a78bfa', fontWeight: 700 }}>{detailModal.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="สถานะ">
              <Tag color={statusConfig[detailModal.status].color}>{statusConfig[detailModal.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="ผู้แจ้ง">{detailModal.requesterName}</Descriptions.Item>
            <Descriptions.Item label="หน่วยงาน">{detailModal.department}</Descriptions.Item>
            <Descriptions.Item label="อุปกรณ์" span={2}>{detailModal.deviceBrand}</Descriptions.Item>
            {detailModal.assetNo && <Descriptions.Item label="เลขครุภัณฑ์" span={detailModal.deviceLocation ? 1 : 2}><code style={{ color: '#a78bfa' }}>{detailModal.assetNo}</code></Descriptions.Item>}
            {detailModal.deviceLocation && <Descriptions.Item label="สถานที่" span={detailModal.assetNo ? 1 : 2}>{detailModal.deviceLocation}</Descriptions.Item>}
            <Descriptions.Item label="อาการ" span={2}
              styles={{ content: { whiteSpace: 'pre-wrap', color: '#e2e8f0' } }}>{detailModal.symptom}</Descriptions.Item>
            <Descriptions.Item label="ผู้รับงาน" span={detailModal.assignedDate ? 1 : 2}>
              {detailModal.assignedTo
                ? <Text style={{ color: '#6ee7b7' }}>{detailModal.assignedTo}</Text>
                : <Text style={{ color: '#475569' }}>— ยังไม่มีผู้รับงาน</Text>}
            </Descriptions.Item>
            {detailModal.assignedDate && <Descriptions.Item label="วันที่รับงาน" span={1}>{detailModal.assignedDate}</Descriptions.Item>}
            {(detailModal.estimatedDays != null || !!effectiveDueIso(detailModal) || (detailModal.extensions?.length ?? 0) > 0) && (() => {
              const dueIso = effectiveDueIso(detailModal)
              const firstIso = originalDueIso(detailModal)
              const extCount = detailModal.extensions?.length ?? 0
              const left = daysUntil(dueIso)
              const ds = left !== null ? dueStatus(left) : null
              return (
                <Descriptions.Item label="กำหนดเวลาซ่อม" span={2}>
                  <Space size={8} wrap>
                    {detailModal.estimatedDays != null && (
                      <Tag style={{ color: '#a78bfa', borderColor: '#a78bfa44', background: 'transparent', margin: 0 }}>
                        ขอเวลา {detailModal.estimatedDays} วัน
                      </Tag>
                    )}
                    {extCount > 0 && firstIso ? (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>
                        สัญญาแรก {fmtDate(firstIso)}
                        <span style={{ color: '#f59e0b', fontWeight: 600, margin: '0 6px' }}>ผลัดสัญญา {extCount} ครั้ง</span>
                        {dueIso && <span style={{ color: '#e2e8f0', fontWeight: 600 }}>กำหนดล่าสุด {fmtDate(dueIso)}</span>}
                      </span>
                    ) : (
                      dueIso && <span style={{ color: '#94a3b8', fontSize: 12 }}>ครบกำหนด {fmtDate(dueIso)}</span>
                    )}
                    {ds && detailModal.status === 'in_progress' && (
                      <Tag style={{ color: ds.color, borderColor: ds.color + '55', background: 'transparent', margin: 0 }}>{ds.label}</Tag>
                    )}
                  </Space>
                </Descriptions.Item>
              )
            })()}
            {detailModal.extensions && detailModal.extensions.length > 0 && (
              <Descriptions.Item label="ประวัติขอเพิ่มเวลา" span={2}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {detailModal.extensions.map((ex, i) => (
                    <div key={i} style={{ fontSize: 12 }}>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>+{ex.days} วัน</span>
                      {ex.prevDueIso && ex.newDueIso && (
                        <span style={{ color: '#94a3b8', marginLeft: 6 }}>{fmtDate(ex.prevDueIso)} → {fmtDate(ex.newDueIso)}</span>
                      )}
                      <span style={{ color: '#475569', margin: '0 6px' }}>({ex.date})</span>
                      <span style={{ color: '#94a3b8' }}>{ex.reason}</span>
                      {ex.by && <span style={{ color: '#64748b', marginLeft: 6 }}>— {ex.by}</span>}
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            )}
            {detailModal.repairResult && (
              <Descriptions.Item label="ผลการซ่อม" span={2}>
                <Tag style={{ color: repairResultConfig[detailModal.repairResult].color, borderColor: repairResultConfig[detailModal.repairResult].color + '44' }}>
                  {repairResultConfig[detailModal.repairResult].label}
                </Tag>
              </Descriptions.Item>
            )}
            {detailModal.technicianNote && (
              <Descriptions.Item label="บันทึกช่าง" span={2}
                styles={{ content: { whiteSpace: 'pre-wrap' } }}>{detailModal.technicianNote}</Descriptions.Item>
            )}
            {(detailModal.prNumber || detailModal.prNote || (detailModal.prDocuments?.length ?? 0) > 0) && (
              <Descriptions.Item label={<span style={{ color: '#f97316' }}><ShoppingCartOutlined style={{ marginRight: 4 }} />ใบ PR</span>} span={2}
                styles={{ content: { whiteSpace: 'pre-wrap' } }}>
                {detailModal.prNumber && (
                  <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ color: '#f97316', fontWeight: 700, fontSize: 13 }}>{detailModal.prNumber}</code>
                    {detailModal.prIssuedDate && (
                      <span style={{ color: '#475569', fontSize: 11 }}>ออกวันที่ {detailModal.prIssuedDate}</span>
                    )}
                  </div>
                )}
                {(detailModal.prDocuments?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: detailModal.prNote ? 6 : 0 }}>
                    {detailModal.prDocuments!.map(d => {
                      const doc = prDocTypes.find(x => x.id === d)
                      return (
                        <Tag key={d} icon={<CheckCircleOutlined />} style={{
                          color: '#f97316', borderColor: '#f9731655', background: 'transparent', fontSize: 11,
                        }}>{doc?.name_th ?? d}</Tag>
                      )
                    })}
                  </div>
                )}
                {detailModal.prNote && <span style={{ color: '#94a3b8' }}>{detailModal.prNote}</span>}
              </Descriptions.Item>
            )}
            {detailModal.replacementNote && (
              <Descriptions.Item label={<span style={{ color: '#f472b6' }}><SwapOutlined style={{ marginRight: 4 }} />ซื้อทดแทน</span>} span={2}
                styles={{ content: { color: '#f472b6', whiteSpace: 'pre-wrap' } }}>
                {detailModal.replacementNote}
              </Descriptions.Item>
            )}
            {detailModal.replacementHandover && (
              <Descriptions.Item label="ส่งคืนครุภัณฑ์เดิม" span={2}>
                <Tag style={{
                  color: REPLACEMENT_HANDOVER_CONFIG[detailModal.replacementHandover].color,
                  borderColor: REPLACEMENT_HANDOVER_CONFIG[detailModal.replacementHandover].color + '55',
                  background: 'transparent',
                }}>
                  {REPLACEMENT_HANDOVER_CONFIG[detailModal.replacementHandover].label}
                </Tag>
              </Descriptions.Item>
            )}
            {detailModal.itHeadApproval && (
              <Descriptions.Item label="อนุมัติ — หัวหน้า IT" span={detailModal.missionHeadApproval ? 1 : 2}>
                <Tag color={detailModal.itHeadApproval.status === 'approved' ? 'success' : 'error'}>
                  {detailModal.itHeadApproval.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}
                </Tag>
                <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 8 }}>{detailModal.itHeadApproval.note}</span>
              </Descriptions.Item>
            )}
            {detailModal.missionHeadApproval && (
              <Descriptions.Item label="อนุมัติ — หัวหน้ากลุ่ม" span={detailModal.itHeadApproval ? 1 : 2}>
                <Tag color={detailModal.missionHeadApproval.status === 'approved' ? 'success' : 'error'}>
                  {detailModal.missionHeadApproval.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}
                </Tag>
                <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 8 }}>{detailModal.missionHeadApproval.note}</span>
              </Descriptions.Item>
            )}
            {detailModal.resolvedNote && (
              <Descriptions.Item label="ผลสำเร็จ" span={2}
                styles={{ content: { color: '#6ee7b7', whiteSpace: 'pre-wrap' } }}>
                {detailModal.resolvedNote}
                {detailModal.resolvedDate && <span style={{ color: '#475569', marginLeft: 8 }}>({detailModal.resolvedDate})</span>}
              </Descriptions.Item>
            )}
              </Descriptions>

              {(detailImagesLoading || detailImages.length > 0) && (
                <div style={{ marginTop: 16 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>ภาพถ่ายอาการ</Text>
                  {detailImagesLoading ? (
                    <Spin size="small" />
                  ) : (
                    <AntImage.PreviewGroup>
                      <Space wrap>
                        {detailImages.map(img => (
                          <AntImage
                            key={img.it_repair_request_image_id}
                            src={`/api/v1/it/repair-request-images/${img.it_repair_request_image_id}/file`}
                            width={96}
                            height={96}
                            style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #334155' }}
                          />
                        ))}
                      </Space>
                    </AntImage.PreviewGroup>
                  )}
                </div>
              )}
            </>
        )}
      </Modal>
    </div>
  )
}

export default function Page() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#7c3aed', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
