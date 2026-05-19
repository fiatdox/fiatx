'use client'
import { useState, useMemo, useEffect } from 'react'
import Cookies from 'js-cookie'
import {
  ConfigProvider, App, theme, Form, Input, Button, Table, Tag, Tabs,
  Typography, Breadcrumb, Row, Col, Card, Badge, Modal, Space, Radio, Alert, Descriptions, Steps, Select, Dropdown,
  Spin, Image as AntImage,
} from 'antd'
import {
  ToolOutlined, CheckCircleOutlined, CloseCircleOutlined, HomeOutlined,
  ShoppingCartOutlined, SwapOutlined, InfoCircleOutlined, TeamOutlined,
  AuditOutlined, SafetyCertificateOutlined, CheckSquareOutlined, FileTextOutlined,
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

interface ManageRepairRequest {
  id: string; apiId?: number; requestDate: string; createdAtIso?: string; requesterName: string; department: string; phone: string
  deviceType: string; deviceBrand: string; deviceSerial?: string; assetNo?: string
  deviceLocation?: string; problemCategory: string; symptom: string
  urgency: 'low' | 'medium' | 'high' | 'critical'; status: RepairStatus
  assignedTo?: string; assignedTechId?: string; assignedBy?: string; assignedDate?: string
  repairResult?: RepairResult; technicianNote?: string; partsUsed?: string
  prNote?: string; prNumber?: string; prIssuedBy?: string; prIssuedDate?: string
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
  po_processing:            { color: 'geekblue',   label: 'ขั้นตอน PO โดยพัสดุ / เสนอผู้อำนวยการ' },
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
  is_active: string
  created_at: string
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
  3: 'pending_it_approval',
  4: 'recommend_replacement',
  5: 'completed',
  6: 'waiting_pr',
  7: 'po_processing',
  8: 'awaiting_delivery',
}

const apiToManageRequest = (r: ApiRepairRequest): ManageRepairRequest => {
  const d = new Date(r.created_at)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
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

const API_ROLE_MAP: Record<string, UserRole> = {
  IT_Staff:     'it_officer',
  IT_Head:      'it_head',
  Technician:   'technician',
  Mission_Head: 'mission_head',
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

  const [role] = useState<UserRole>(() => allowedRoles[0] ?? 'it_officer')
  const [requests, setRequests] = useState<ManageRepairRequest[]>([])
  const [assessments, setAssessments] = useState<ApiRepairAssessment[]>([])
  const [detailImages, setDetailImages] = useState<{ it_repair_request_image_id: number }[]>([])
  const [detailImagesLoading, setDetailImagesLoading] = useState(false)

  useEffect(() => {
    fetch('/api/v1/it/repair-requests/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setRequests(json.data.map(apiToManageRequest))
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
  }, [])
  const [prModal, setPrModal]         = useState<ManageRepairRequest | null>(null)
  const [resultModal, setResultModal] = useState<ManageRepairRequest | null>(null)
  const [approvalModal, setApprovalModal] = useState<{ req: ManageRepairRequest; level: 'it_head' | 'mission_head' } | null>(null)
  const [detailModal, setDetailModal] = useState<ManageRepairRequest | null>(null)
  const [prForm]       = Form.useForm()
  const [resultForm]   = Form.useForm()
  const [approvalForm] = Form.useForm()
  const { message } = App.useApp()

  useEffect(() => {
    if (!detailModal?.apiId) { setDetailImages([]); return }
    setDetailImagesLoading(true)
    fetch(`/api/v1/it/repair-requests/${detailModal.apiId}/images`)
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setDetailImages(json.data) })
      .catch(() => {})
      .finally(() => setDetailImagesLoading(false))
  }, [detailModal])

  const roleInfo = ROLE_CONFIG[role]
  const today = '15/05/2026'

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleTakeJob = async (req: ManageRepairRequest) => {
    if (!req.apiId) {
      message.error('ไม่พบ id ของคำร้องนี้')
      return
    }
    try {
      const res = await fetch(`/api/v1/it/repair-requests/${req.apiId}/receive-assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) {
        message.error(json.message ?? `รับงานไม่สำเร็จ (${res.status})`)
        return
      }
      setRequests(prev => prev.map(r =>
        r.id === req.id
          ? { ...r, status: 'in_progress', assignedTo: roleInfo.name, assignedBy: roleInfo.name, assignedDate: today }
          : r
      ))
      message.success(`รับงาน ${req.id} — เริ่มซ่อมทันที`)
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
    }
  }

  const handleAcceptJob = (req: ManageRepairRequest) => {
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'in_progress' } : r))
    message.success(`รับงาน ${req.id} แล้ว`)
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

  const handleIssuePR = (values: { prNote: string; prNumber: string; prTrackingStatus: ManageRepairRequest['prTrackingStatus'] }) => {
    setRequests(prev => prev.map(r =>
      r.id === prModal!.id
        ? { ...r, status: 'waiting_pr', prNote: values.prNote, prNumber: values.prNumber, prTrackingStatus: values.prTrackingStatus, prIssuedBy: roleInfo.name, prIssuedDate: today }
        : r
    ))
    message.success(`ออก PR ${values.prNumber} สำหรับ ${prModal!.id} แล้ว`)
    setPrModal(null)
    prForm.resetFields()
  }

  const handleUpdatePRStatus = (id: string, prStatus: NonNullable<ManageRepairRequest['prTrackingStatus']>) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r
      const next: Partial<ManageRepairRequest> = { prTrackingStatus: prStatus }
      if (['pr_approved', 'po_issued', 'tracking_po', 'po_approved'].includes(prStatus)) next.status = 'pending_it_approval'
      if (['waiting_delivery', 'received'].includes(prStatus)) next.status = 'purchase_approved'
      return { ...r, ...next }
    }))
    message.success(`อัปเดตสถานะ PR เป็น "${PR_TRACKING_CONFIG[prStatus].label}" แล้ว`)
  }

  const handleApproval = (values: { decision: 'approved' | 'rejected'; note?: string }) => {
    const { req, level } = approvalModal!
    const approval: Approval = { status: values.decision, by: roleInfo.name, date: today, note: values.note }
    let nextStatus: RepairStatus
    if (values.decision === 'rejected') {
      nextStatus = 'cancelled'
    } else if (level === 'it_head') {
      nextStatus = 'pending_mission_approval'
    } else {
      nextStatus = 'purchase_approved'
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

  const itApprovalPending  = requests.filter(r => r.status === 'pending_it_approval')
  const itApprovalHistory  = requests.filter(r => r.itHeadApproval?.by === ROLE_CONFIG.it_head.name)
  const msnApprovalPending = requests.filter(r => r.status === 'pending_mission_approval')
  const msnApprovalHistory = requests.filter(r => r.missionHeadApproval?.by === ROLE_CONFIG.mission_head.name)

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
      <Button size="small" icon={<InfoCircleOutlined />} onClick={() => setDetailModal(r)} />
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
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
            {r.symptom.length > 90 ? r.symptom.slice(0, 90) + '…' : r.symptom}
          </div>
        </Col>
        <Col style={{ flexShrink: 0, paddingLeft: 12 }}>{action}</Col>
      </Row>
    </Card>
  )

  // ── Approval table helper ─────────────────────────────────────────────────────

  const approvalCols = (level: 'it_head' | 'mission_head') => [
    colId, colDevice, colUrgency,
    { title: 'ช่าง', dataIndex: 'assignedTo', key: 'assignedTo', width: 140 },
    { title: 'ผลประเมิน / รายละเอียด', key: 'result', render: (_: unknown, r: ManageRepairRequest) => (
      <div>
        {r.repairResult && (
          <Tag style={{ color: repairResultConfig[r.repairResult].color, borderColor: repairResultConfig[r.repairResult].color + '44', fontSize: 10 }}>
            {repairResultConfig[r.repairResult].label}
          </Tag>
        )}
        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
          {(r.replacementNote || r.prNote || r.technicianNote || '').slice(0, 60)}…
        </div>
        {level === 'mission_head' && r.itHeadApproval && (
          <div style={{ marginTop: 4 }}>
            <Tag color="success" style={{ fontSize: 10 }}>IT Head อนุมัติแล้ว</Tag>
            <span style={{ color: '#64748b', fontSize: 10, marginLeft: 4 }}>{r.itHeadApproval.note}</span>
          </div>
        )}
      </div>
    )},
    { title: 'จัดการ', key: 'action', width: 90, align: 'center' as const,
      render: (_: unknown, r: ManageRepairRequest) => (
        <Button size="small" type="primary" onClick={() => { setApprovalModal({ req: r, level }); approvalForm.resetFields() }}>
          พิจารณา
        </Button>
      )},
    colDetail,
  ]

  const approvalHistoryCols = (level: 'it_head' | 'mission_head') => [
    colId, colDevice, colUrgency,
    { title: 'มติ', key: 'decision', width: 90, render: (_: unknown, r: ManageRepairRequest) => {
      const a = level === 'it_head' ? r.itHeadApproval : r.missionHeadApproval
      return a ? <Tag color={a.status === 'approved' ? 'success' : 'error'}>{a.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}</Tag> : '-'
    }},
    { title: 'วันที่', key: 'date', width: 110, render: (_: unknown, r: ManageRepairRequest) => {
      const a = level === 'it_head' ? r.itHeadApproval : r.missionHeadApproval
      return <Text style={{ fontSize: 11, color: '#94a3b8' }}>{a?.date ?? '-'}</Text>
    }},
    { title: 'หมายเหตุ', key: 'note', render: (_: unknown, r: ManageRepairRequest) => {
      const a = level === 'it_head' ? r.itHeadApproval : r.missionHeadApproval
      return <Text style={{ fontSize: 11, color: '#94a3b8' }}>{a?.note ?? '-'}</Text>
    }},
    colDetail,
  ]

  const emptyText = (text: string) => ({ emptyText: <div style={{ color: '#64748b', padding: '24px 0' }}>{text}</div> })

  const getDetailStep = (r: ManageRepairRequest): { current: number; status: 'process' | 'finish' | 'error' } => {
    if (r.status === 'cancelled') {
      let current = 1
      if (r.missionHeadApproval) current = 4
      else if (r.itHeadApproval || r.repairResult) current = 3
      else if (r.assignedTo) current = 2
      return { current, status: 'error' }
    }
    const map: Record<RepairStatus, number> = {
      pending: 0, assigned: 1, in_progress: 2,
      waiting_pr: 3, recommend_replacement: 3, pending_it_approval: 3,
      po_processing: 3, awaiting_delivery: 3,
      pending_mission_approval: 4, purchase_approved: 4, completed: 4,
      cancelled: 0,
    }
    const isDone = r.status === 'completed' || r.status === 'purchase_approved'
    return { current: map[r.status], status: isDone ? 'finish' : 'process' }
  }

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

          {/* ── IT Officer Panel ── */}
          {role === 'it_officer' && (() => {
            const urgencyBorder: Record<string, string> = {
              critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#475569',
            }
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
                  <Button size="small" type="primary" block
                    style={{ background: '#7c3aed', borderColor: '#7c3aed', fontSize: 11 }}
                    onClick={() => handleTakeJob(r)}>
                    <CheckSquareOutlined /> รับงาน
                  </Button>
                ),
              },
              {
                key: 'in_progress', title: 'กำลังดำเนินการ', accent: '#06b6d4',
                items: requests.filter(r => r.status === 'in_progress'),
                action: (r) => (
                  <Button size="small" block
                    style={{ background: '#6d28d9', borderColor: '#6d28d9', color: '#fff', fontSize: 11 }}
                    onClick={() => { setResultModal(r); resultForm.resetFields() }}>
                    <CheckSquareOutlined /> บันทึกผล
                  </Button>
                ),
              },
              {
                key: 'pending_head_approval', title: 'รออนุมัติหัวหน้า IT / หัวหน้าภารกิจ', accent: '#a855f7',
                items: requests.filter(r => r.status === 'pending_it_approval'),
              },
              {
                key: 'recommend_replacement', title: 'แนะนำซื้อทดแทน', accent: '#f472b6',
                items: requests.filter(r => r.status === 'recommend_replacement'),
                action: (r) => (
                  <Button size="small" block
                    style={{ background: '#9d174d', borderColor: '#9d174d', color: '#fff', fontSize: 11 }}
                    onClick={() => {
                      setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'pending_it_approval' } : x))
                      message.success(`ส่งเรื่องขออนุมัติซื้อทดแทน ${r.id} แล้ว`)
                    }}>
                    <SwapOutlined /> ส่งขออนุมัติ
                  </Button>
                ),
              },
              {
                key: 'waiting_pr', title: 'ออกใบ PR เจ้าหน้าที่ IT', accent: '#f97316',
                items: requests.filter(r => r.status === 'waiting_pr'),
                action: (r) => !r.prNumber ? (
                  <Button size="small" block
                    style={{ background: '#f97316', borderColor: '#f97316', color: '#fff', fontSize: 11 }}
                    onClick={() => { setPrModal(r); prForm.resetFields() }}>
                    <ShoppingCartOutlined /> ออก PR
                  </Button>
                ) : (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: (Object.entries(PR_TRACKING_CONFIG) as [NonNullable<ManageRepairRequest['prTrackingStatus']>, { label: string; color: string }][]).map(([key, cfg]) => ({
                        key,
                        label: <span style={{ color: cfg.color, fontSize: 12 }}>{cfg.label}</span>,
                        onClick: () => handleUpdatePRStatus(r.id, key),
                      })),
                      selectedKeys: r.prTrackingStatus ? [r.prTrackingStatus] : [],
                    }}
                  >
                    <Button size="small" block style={{ fontSize: 11, borderColor: '#334155', color: '#94a3b8' }}>
                      อัปเดตสถานะ PR ▾
                    </Button>
                  </Dropdown>
                ),
              },
              {
                key: 'po_processing', title: 'ขั้นตอน PO โดยพัสดุ / เสนอผู้อำนวยการ', accent: '#6366f1',
                items: requests.filter(r => r.status === 'po_processing'),
                action: (r) => (
                  <Button size="small" block
                    style={{ background: '#4f46e5', borderColor: '#4f46e5', color: '#fff', fontSize: 11 }}
                    onClick={() => {
                      setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'awaiting_delivery' } : x))
                      message.success(`อนุมัติ PO ${r.id} แล้ว — รอรับของ`)
                    }}>
                    <CheckSquareOutlined /> อนุมัติ PO
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
                                  borderLeft: `3px solid ${urgencyBorder[r.urgency]}`,
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
                                  {/* Assigned tech */}
                                  {r.assignedTo && (
                                    <div style={{ color: '#6ee7b7', fontSize: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <ToolOutlined style={{ fontSize: 9 }} />{r.assignedTo}
                                    </div>
                                  )}
                                  {/* PR number + tracking status */}
                                  {r.prNumber && (
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
                                  <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                                    {col.action && col.action(r)}
                                    <Button size="small" icon={<InfoCircleOutlined />}
                                      style={{ flex: col.action ? '0 0 auto' : 1, fontSize: 11 }}
                                      onClick={() => setDetailModal(r)}>
                                      {!col.action && 'รายละเอียด'}
                                    </Button>
                                  </div>
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
                      <Button type="primary" onClick={() => handleAcceptJob(r)}>รับงาน</Button>
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
                      <Button
                        style={{ background: '#6d28d9', borderColor: '#6d28d9', color: '#fff' }}
                        icon={<CheckSquareOutlined />}
                        onClick={() => { setResultModal(r); resultForm.resetFields() }}>
                        บันทึกผล
                      </Button>
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

          {/* ── IT Head Panel ── */}
          {role === 'it_head' && (
            <Tabs type="line" items={[
              {
                key: 'pending',
                label: <Badge count={itApprovalPending.length} size="small" offset={[6, -2]}><span>รออนุมัติ</span></Badge>,
                children: (
                  <Table
                    {...tableProps}
                    dataSource={itApprovalPending}
                    rowKey="id"
                    pagination={false}
                    locale={emptyText('ไม่มีรายการรออนุมัติ')}
                    columns={approvalCols('it_head')}
                  />
                ),
              },
              {
                key: 'history',
                label: 'ประวัติการอนุมัติ',
                children: (
                  <Table
                    {...tableProps}
                    dataSource={itApprovalHistory}
                    rowKey="id"
                    pagination={false}
                    locale={emptyText('ไม่มีประวัติ')}
                    columns={approvalHistoryCols('it_head')}
                  />
                ),
              },
            ]} />
          )}

          {/* ── Mission Head Panel ── */}
          {role === 'mission_head' && (
            <Tabs type="line" items={[
              {
                key: 'pending',
                label: <Badge count={msnApprovalPending.length} size="small" offset={[6, -2]}><span>รออนุมัติ</span></Badge>,
                children: (
                  <Table
                    {...tableProps}
                    dataSource={msnApprovalPending}
                    rowKey="id"
                    pagination={false}
                    locale={emptyText('ไม่มีรายการรออนุมัติ')}
                    columns={approvalCols('mission_head')}
                  />
                ),
              },
              {
                key: 'history',
                label: 'ประวัติการอนุมัติ',
                children: (
                  <Table
                    {...tableProps}
                    dataSource={msnApprovalHistory}
                    rowKey="id"
                    pagination={false}
                    locale={emptyText('ไม่มีประวัติ')}
                    columns={approvalHistoryCols('mission_head')}
                  />
                ),
              },
            ]} />
          )}
        </Card>
      </div>

      {/* ══ PR Modal ══════════════════════════════════════════════════════════ */}
      <Modal
        title={<span><ShoppingCartOutlined style={{ color: '#fb923c', marginRight: 8 }} />ออกใบ PR — {prModal?.id}</span>}
        open={!!prModal}
        onCancel={() => { setPrModal(null); prForm.resetFields() }}
        onOk={() => prForm.submit()}
        okText="บันทึก PR" cancelText="ยกเลิก"
        okButtonProps={{ style: { background: '#fb923c', borderColor: '#fb923c' } }}
      >
        {prModal && (
          <Alert
            title={<span style={{ fontSize: 12 }}>ช่าง: {prModal.assignedTo}</span>}
            description={<span style={{ fontSize: 11, color: '#94a3b8' }}>บันทึก: {prModal.technicianNote}</span>}
            type="warning" showIcon style={{ marginBottom: 16 }}
          />
        )}
        <Form form={prForm} layout="vertical" onFinish={handleIssuePR}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="prNumber" label="เลขที่ใบ PR" rules={[{ required: true, message: 'กรุณาระบุเลขที่ใบ PR' }]}>
                <Input placeholder="เช่น PR-2026-00123" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="prTrackingStatus" label="สถานะ PR" rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}
                initialValue="awaiting_signature">
                <Select
                  options={(Object.entries(PR_TRACKING_CONFIG) as [NonNullable<ManageRepairRequest['prTrackingStatus']>, { label: string; color: string }][]).map(([key, cfg]) => ({
                    value: key,
                    label: <span style={{ color: cfg.color }}>{cfg.label}</span>,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="prNote" label="รายละเอียด PR / อะไหล่ที่ต้องการจัดซื้อ"
            rules={[{ required: true, message: 'กรุณาระบุรายละเอียด PR' }]}>
            <TextArea rows={3} placeholder="เช่น ออก PR สั่งซื้อ... Part Number: ... จำนวน ... ราคาประมาณ ..." />
          </Form.Item>
        </Form>
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
        width={520}
      >
        {approvalModal && (
          <Descriptions column={1} size="small" bordered
            styles={{ label: { color: '#94a3b8', background: '#0f172a', width: 130 }, content: { background: '#1e293b', color: '#e2e8f0' } }}
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="อุปกรณ์">{approvalModal.req.deviceBrand}</Descriptions.Item>
            <Descriptions.Item label="หน่วยงาน">{approvalModal.req.department}</Descriptions.Item>
            <Descriptions.Item label="ผลการประเมิน">
              {approvalModal.req.repairResult && (
                <Tag style={{ color: repairResultConfig[approvalModal.req.repairResult].color }}>
                  {repairResultConfig[approvalModal.req.repairResult].label}
                </Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="รายละเอียด" styles={{ content: { fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap' } }}>
              {approvalModal.req.replacementNote || approvalModal.req.prNote || approvalModal.req.technicianNote}
            </Descriptions.Item>
            {approvalModal.level === 'mission_head' && approvalModal.req.itHeadApproval && (
              <Descriptions.Item label="มติหัวหน้า IT">
                <Tag color="success">อนุมัติแล้ว</Tag>
                <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 8 }}>{approvalModal.req.itHeadApproval.note}</span>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
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
          <Form.Item name="note" label="หมายเหตุ / เหตุผล">
            <TextArea rows={2} placeholder="ระบุหมายเหตุ เหตุผลการอนุมัติหรือปฏิเสธ..." />
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
        {detailModal && (() => {
          const { current, status: stepStatus } = getDetailStep(detailModal)
          return (
            <>
              <div style={{ background: '#0f172a', borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
                <Steps
                  current={current}
                  status={stepStatus}
                  size="small"
                  items={[
                    {
                      title: 'รับคำร้อง',
                      content: detailModal.requestDate,
                      icon: <FileTextOutlined />,
                    },
                    {
                      title: 'มอบหมายงาน',
                      content: detailModal.assignedTo ?? '—',
                      icon: <TeamOutlined />,
                    },
                    {
                      title: 'กำลังซ่อม',
                      content: detailModal.assignedDate ? `รับงาน ${detailModal.assignedDate}` : '—',
                      icon: <ToolOutlined />,
                    },
                    {
                      title: 'บันทึกผลการซ่อม',
                      content: detailModal.repairResult
                        ? repairResultConfig[detailModal.repairResult].label
                        : '—',
                      icon: <CheckSquareOutlined />,
                    },
                    {
                      title: detailModal.status === 'completed' ? 'เสร็จสิ้น' : 'อนุมัติ / เสร็จสิ้น',
                      content: detailModal.resolvedDate
                        ?? detailModal.missionHeadApproval?.date
                        ?? detailModal.itHeadApproval?.date
                        ?? '—',
                      icon: detailModal.status === 'completed'
                        ? <CheckCircleOutlined />
                        : <SafetyCertificateOutlined />,
                    },
                  ]}
                />
              </div>

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
            {detailModal.assignedTo && <Descriptions.Item label="ช่าง / เจ้าหน้าที่" span={detailModal.assignedDate ? 1 : 2}>
              <Text style={{ color: '#6ee7b7' }}>{detailModal.assignedTo}</Text>
            </Descriptions.Item>}
            {detailModal.assignedDate && <Descriptions.Item label="วันที่มอบหมาย" span={detailModal.assignedTo ? 1 : 2}>{detailModal.assignedDate}</Descriptions.Item>}
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
            {(detailModal.prNumber || detailModal.prNote) && (
              <Descriptions.Item label={<span style={{ color: '#fb923c' }}><ShoppingCartOutlined style={{ marginRight: 4 }} />ใบ PR</span>} span={2}
                styles={{ content: { whiteSpace: 'pre-wrap' } }}>
                {detailModal.prNumber && (
                  <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ color: '#fb923c', fontWeight: 700, fontSize: 13 }}>{detailModal.prNumber}</code>
                    {detailModal.prTrackingStatus && (
                      <Tag style={{
                        color: PR_TRACKING_CONFIG[detailModal.prTrackingStatus].color,
                        borderColor: PR_TRACKING_CONFIG[detailModal.prTrackingStatus].color + '55',
                        background: 'transparent', fontSize: 11,
                      }}>
                        {PR_TRACKING_CONFIG[detailModal.prTrackingStatus].label}
                      </Tag>
                    )}
                    {detailModal.prIssuedDate && (
                      <span style={{ color: '#475569', fontSize: 11 }}>ออกวันที่ {detailModal.prIssuedDate}</span>
                    )}
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
          )
        })()}
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
