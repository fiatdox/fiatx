'use client'
import { useState } from 'react'
import {
  ConfigProvider, App, theme, Form, Input, Select, Button, Table, Tag, Tabs,
  Typography, Breadcrumb, Row, Col, Card, Badge, Modal, Space, Radio, Alert, Descriptions, Divider, Steps,
} from 'antd'
import {
  ToolOutlined, CheckCircleOutlined, CloseCircleOutlined, HomeOutlined,
  ShoppingCartOutlined, SwapOutlined, InfoCircleOutlined, TeamOutlined,
  AuditOutlined, SafetyCertificateOutlined, CheckSquareOutlined, FileTextOutlined,
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { TextArea } = Input

// ── Types ──────────────────────────────────────────────────────────────────────

type RepairStatus =
  | 'pending' | 'assigned' | 'in_progress' | 'waiting_pr'
  | 'recommend_replacement' | 'pending_it_approval' | 'pending_mission_approval'
  | 'purchase_approved' | 'completed' | 'cancelled'

type RepairResult =
  | 'fixed_no_parts' | 'fixed_with_parts' | 'fixed_need_purchase' | 'cannot_fix_replace'

type UserRole = 'it_officer' | 'technician' | 'it_head' | 'mission_head'

interface Approval {
  status: 'pending' | 'approved' | 'rejected'
  by?: string
  date?: string
  note?: string
}

interface ManageRepairRequest {
  id: string; requestDate: string; requesterName: string; department: string; phone: string
  deviceType: string; deviceBrand: string; deviceSerial?: string; assetNo?: string
  deviceLocation?: string; problemCategory: string; symptom: string
  urgency: 'low' | 'medium' | 'high' | 'critical'; status: RepairStatus
  assignedTo?: string; assignedTechId?: string; assignedBy?: string; assignedDate?: string
  repairResult?: RepairResult; technicianNote?: string; partsUsed?: string
  prNote?: string; prIssuedBy?: string; prIssuedDate?: string
  replacementNote?: string
  itHeadApproval?: Approval; missionHeadApproval?: Approval
  resolvedNote?: string; resolvedDate?: string
}

// ── Config ─────────────────────────────────────────────────────────────────────

const statusConfig: Record<RepairStatus, { color: string; label: string }> = {
  pending:                  { color: 'warning',    label: 'รอมอบหมาย' },
  assigned:                 { color: 'processing', label: 'มอบหมายแล้ว' },
  in_progress:              { color: 'blue',       label: 'กำลังซ่อม' },
  waiting_pr:               { color: 'orange',     label: 'รออะไหล่ / PR' },
  recommend_replacement:    { color: 'pink',       label: 'แนะนำซื้อทดแทน' },
  pending_it_approval:      { color: 'purple',     label: 'รออนุมัติ IT' },
  pending_mission_approval: { color: 'magenta',    label: 'รออนุมัติหัวหน้ากลุ่ม' },
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
  fixed_no_parts:      { label: 'ซ่อมได้ — ไม่ใช้อะไหล่',       color: '#22c55e' },
  fixed_with_parts:    { label: 'ซ่อมได้ — ใช้อะไหล่ในคลัง',    color: '#34d399' },
  fixed_need_purchase: { label: 'ซ่อมได้ — ต้องสั่งซื้ออะไหล่',  color: '#fbbf24' },
  cannot_fix_replace:  { label: 'ซ่อมไม่ได้ — แนะนำซื้อทดแทน',  color: '#f472b6' },
}

const MOCK_TECHNICIANS = [
  { id: 'tech-01', name: 'นายวิชัย คอมดี',  specialty: 'Hardware / Peripheral' },
  { id: 'tech-02', name: 'นายเทคโน สมาร์ท', specialty: 'Software / Network' },
  { id: 'tech-03', name: 'นางสาวสุดา ไอที',  specialty: 'เจ้าหน้าที่ IT (ดูแลระบบ)' },
]

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; name: string; techId?: string }> = {
  it_officer:   { label: 'เจ้าหน้าที่ IT',     color: '#6d28d9', name: 'นางสาวสุดา ไอที' },
  technician:   { label: 'ช่าง / เจ้าหน้าที่', color: '#2563eb', name: 'นายวิชัย คอมดี', techId: 'tech-01' },
  it_head:      { label: 'หัวหน้า IT',          color: '#7c3aed', name: 'นายกิตติ หัวหน้า IT' },
  mission_head: { label: 'หัวหน้ากลุ่มภารกิจ', color: '#0e7490', name: 'นายเจริญ หัวหน้ากลุ่ม' },
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const initRequests: ManageRepairRequest[] = [
  {
    id: 'IT-2026-001', requestDate: '01/04/2026', requesterName: 'นายสมชาย ใจดี',
    department: 'งานการเงินและบัญชี', phone: '1234', deviceType: 'desktop',
    deviceBrand: 'DELL OptiPlex 7090', deviceSerial: 'SN-A001234', assetNo: 'IT-67-001',
    deviceLocation: 'ห้องการเงิน ชั้น 2', problemCategory: 'hardware',
    symptom: 'เครื่องไม่ติด กดปุ่ม Power แล้วไฟไม่ขึ้น', urgency: 'high', status: 'completed',
    assignedTo: 'นายวิชัย คอมดี', assignedTechId: 'tech-01', assignedBy: 'นางสาวสุดา ไอที', assignedDate: '01/04/2026',
    repairResult: 'fixed_with_parts', partsUsed: 'Power Supply ATX 500W',
    technicianNote: 'เปลี่ยน Power Supply แล้ว ใช้งานได้ปกติ',
    resolvedNote: 'เปลี่ยน Power Supply แล้ว ใช้งานได้ปกติ', resolvedDate: '03/04/2026',
  },
  {
    id: 'IT-2026-002', requestDate: '03/04/2026', requesterName: 'นางสาวรัตนา สวยงาม',
    department: 'งานทรัพยากรบุคคล', phone: '1102', deviceType: 'laptop',
    deviceBrand: 'Lenovo ThinkPad E14', deviceSerial: 'SN-B005678', assetNo: 'IT-67-003',
    deviceLocation: 'ห้อง HR ชั้น 2', problemCategory: 'hardware',
    symptom: 'หน้าจอมีเส้นดำแนวนอนพาดตลอด และบางครั้งหน้าจอดับเองโดยไม่มีสาเหตุ',
    urgency: 'medium', status: 'in_progress',
    assignedTo: 'นายเทคโน สมาร์ท', assignedTechId: 'tech-02', assignedBy: 'นางสาวสุดา ไอที', assignedDate: '03/04/2026',
  },
  {
    id: 'IT-2026-003', requestDate: '05/04/2026', requesterName: 'นายประสิทธิ์ เก่งกาจ',
    department: 'งานพัสดุ', phone: '1305', deviceType: 'printer',
    deviceBrand: 'HP LaserJet Pro M404', deviceSerial: 'SN-C009012',
    deviceLocation: 'ห้องพัสดุ ชั้น 1', problemCategory: 'hardware',
    symptom: 'พิมพ์แล้วกระดาษติดทุกครั้ง ดึงกระดาษออกมาแล้วพิมพ์ใหม่ก็ยังติดอีก',
    urgency: 'medium', status: 'waiting_pr',
    assignedTo: 'นายเทคโน สมาร์ท', assignedTechId: 'tech-02', assignedBy: 'นางสาวสุดา ไอที', assignedDate: '05/04/2026',
    repairResult: 'fixed_need_purchase', technicianNote: 'Feed Roller และ Separation Pad เสื่อมสภาพ ต้องสั่งซื้ออะไหล่',
    prNote: 'ออก PR สั่งซื้อ Feed Roller และ Separation Pad HP PN: RM2-5452 จำนวน 1 ชุด (รอการอนุมัติ)',
    prIssuedBy: 'นางสาวสุดา ไอที', prIssuedDate: '06/04/2026',
  },
  {
    id: 'IT-2026-004', requestDate: '08/04/2026', requesterName: 'นางสาวมาลี รักษ์ดี',
    department: 'งานบริหารทั่วไป', phone: '1201', deviceType: 'desktop',
    deviceBrand: 'Acer Veriton M6690G', deviceSerial: 'SN-D003456',
    deviceLocation: 'ห้องธุรการ ชั้น 1', problemCategory: 'software',
    symptom: 'เครื่องช้ามาก เปิดโปรแกรมนานมาก บางครั้งค้างจนต้องรีสตาร์ท',
    urgency: 'low', status: 'pending',
  },
  {
    id: 'IT-2026-005', requestDate: '10/04/2026', requesterName: 'นายอนุชา ดูแลดี',
    department: 'งานพัฒนาบุคลากร', phone: '1410', deviceType: 'scanner',
    deviceBrand: 'Canon DR-C225W', deviceSerial: 'SN-E007890',
    deviceLocation: 'ห้องฝึกอบรม ชั้น 3', problemCategory: 'peripheral',
    symptom: 'สแกนเนอร์ไม่พบอุปกรณ์จากคอมพิวเตอร์ ลองเปลี่ยนสาย USB แล้วยังไม่ได้',
    urgency: 'high', status: 'pending_it_approval',
    assignedTo: 'นายวิชัย คอมดี', assignedTechId: 'tech-01', assignedBy: 'นางสาวสุดา ไอที', assignedDate: '10/04/2026',
    repairResult: 'cannot_fix_replace', technicianNote: 'IC Controller Board เสีย ค่าซ่อมสูงกว่าราคาอุปกรณ์ใหม่',
    replacementNote: 'แนะนำจัดซื้อทดแทน Canon imageFORMULA DR-C225W II หรือเทียบเท่า ราคาประมาณ 8,500 บาท',
  },
  {
    id: 'IT-2026-006', requestDate: '12/04/2026', requesterName: 'นางสาวกนกวรรณ ใจดี',
    department: 'งานการพยาบาล OPD', phone: '2101', deviceType: 'desktop',
    deviceBrand: 'HP ProDesk 400 G7', deviceSerial: 'SN-F001234',
    deviceLocation: 'เคาน์เตอร์ OPD ชั้น 1', problemCategory: 'hardware',
    symptom: 'เปิดเครื่องแล้วขึ้น Boot Error ไม่เข้า Windows', urgency: 'critical',
    status: 'assigned',
    assignedTo: 'นายวิชัย คอมดี', assignedTechId: 'tech-01', assignedBy: 'นางสาวสุดา ไอที', assignedDate: '12/04/2026',
  },
  {
    id: 'IT-2026-007', requestDate: '08/04/2026', requesterName: 'นายธนาคาร มีทรัพย์',
    department: 'งานการเงินและบัญชี', phone: '1231', deviceType: 'printer',
    deviceBrand: 'Brother MFC-L5750DW', deviceSerial: 'SN-G007890', assetNo: 'IT-65-003',
    deviceLocation: 'ห้องการเงิน ชั้น 2', problemCategory: 'hardware',
    symptom: 'เครื่องพิมพ์ไม่ดึงกระดาษ สเตปเปอร์มอเตอร์เสีย', urgency: 'high',
    status: 'pending_mission_approval',
    assignedTo: 'นายเทคโน สมาร์ท', assignedTechId: 'tech-02', assignedBy: 'นางสาวสุดา ไอที', assignedDate: '08/04/2026',
    repairResult: 'cannot_fix_replace', technicianNote: 'Stepper motor เสียและ PCB Main Board มีรอยไหม้ ค่าซ่อมไม่คุ้ม',
    replacementNote: 'แนะนำจัดซื้อทดแทน Brother MFC-L5750DW หรือรุ่นเทียบเท่า ราคาประมาณ 12,000 บาท',
    itHeadApproval: { status: 'approved', by: 'นายกิตติ หัวหน้า IT', date: '10/04/2026', note: 'อนุมัติ เครื่องเสียจริง ราคาซ่อมไม่คุ้ม' },
  },
  {
    id: 'IT-2026-008', requestDate: '01/04/2026', requesterName: 'นายบุญช่วย ดีงาม',
    department: 'งานอุบัติเหตุ ER', phone: '1901', deviceType: 'network',
    deviceBrand: 'Cisco Catalyst 2960-X', deviceSerial: 'SN-H001122', assetNo: 'IT-66-002',
    deviceLocation: 'ห้อง Server ชั้น 2', problemCategory: 'network',
    symptom: 'Switch พอร์ตหลายพอร์ตขาด เชื่อมต่อไม่ได้', urgency: 'critical',
    status: 'purchase_approved',
    assignedTo: 'นายวิชัย คอมดี', assignedTechId: 'tech-01', assignedBy: 'นางสาวสุดา ไอที', assignedDate: '01/04/2026',
    repairResult: 'fixed_need_purchase', technicianNote: 'Switch เสียหลายพอร์ต ต้องสั่งซื้ออุปกรณ์ทดแทน',
    prNote: 'จัดซื้อ Cisco Catalyst 2960-X Switch 48 Port PN: WS-C2960X-48TS-L ราคาประมาณ 45,000 บาท',
    prIssuedBy: 'นางสาวสุดา ไอที', prIssuedDate: '02/04/2026',
    itHeadApproval: { status: 'approved', by: 'นายกิตติ หัวหน้า IT', date: '03/04/2026', note: 'อนุมัติ จำเป็นสำหรับระบบ ER' },
    missionHeadApproval: { status: 'approved', by: 'นายเจริญ หัวหน้ากลุ่ม', date: '04/04/2026', note: 'อนุมัติ กระทบระบบวิกฤต ER' },
  },
  {
    id: 'IT-2026-009', requestDate: '14/05/2026', requesterName: 'นายอนันต์ ขยันดี',
    department: 'งานเวชระเบียน', phone: '1501', deviceType: 'desktop',
    deviceBrand: 'HP ProDesk 600 G5', deviceSerial: 'SN-I009988',
    deviceLocation: 'เคาน์เตอร์เวชระเบียน ชั้น 1', problemCategory: 'hardware',
    symptom: 'เครื่องดับเองทุก 30 นาที อาจเป็นปัญหา CPU ร้อน หรือ PSU', urgency: 'high',
    status: 'pending',
  },
]

// ── PageContent ────────────────────────────────────────────────────────────────

const PageContent = () => {
  const [role, setRole] = useState<UserRole>('it_officer')
  const [requests, setRequests] = useState<ManageRepairRequest[]>(initRequests)
  const [assignModal, setAssignModal] = useState<ManageRepairRequest | null>(null)
  const [prModal, setPrModal]         = useState<ManageRepairRequest | null>(null)
  const [resultModal, setResultModal] = useState<ManageRepairRequest | null>(null)
  const [approvalModal, setApprovalModal] = useState<{ req: ManageRepairRequest; level: 'it_head' | 'mission_head' } | null>(null)
  const [detailModal, setDetailModal] = useState<ManageRepairRequest | null>(null)
  const [assignForm]   = Form.useForm()
  const [prForm]       = Form.useForm()
  const [resultForm]   = Form.useForm()
  const [approvalForm] = Form.useForm()
  const { message } = App.useApp()

  const roleInfo = ROLE_CONFIG[role]
  const today = '15/05/2026'

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAssign = (values: { techId: string; note?: string }) => {
    const tech = MOCK_TECHNICIANS.find(t => t.id === values.techId)
    setRequests(prev => prev.map(r =>
      r.id === assignModal!.id
        ? { ...r, status: 'assigned', assignedTo: tech?.name, assignedTechId: values.techId, assignedBy: roleInfo.name, assignedDate: today }
        : r
    ))
    message.success(`มอบหมายงาน ${assignModal!.id} ให้ ${tech?.name} แล้ว`)
    setAssignModal(null)
    assignForm.resetFields()
  }

  const handleAcceptJob = (req: ManageRepairRequest) => {
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'in_progress' } : r))
    message.success(`รับงาน ${req.id} แล้ว`)
  }

  const handleRecordResult = (values: { repairResult: RepairResult; technicianNote: string; partsUsed?: string; replacementNote?: string }) => {
    const req = resultModal!
    let nextStatus: RepairStatus
    const updates: Partial<ManageRepairRequest> = {
      repairResult: values.repairResult,
      technicianNote: values.technicianNote,
      partsUsed: values.partsUsed,
      replacementNote: values.replacementNote,
    }
    if (values.repairResult === 'fixed_no_parts' || values.repairResult === 'fixed_with_parts') {
      nextStatus = 'completed'
      updates.resolvedNote = values.technicianNote
      updates.resolvedDate = today
    } else if (values.repairResult === 'fixed_need_purchase') {
      nextStatus = 'in_progress'
    } else {
      nextStatus = 'pending_it_approval'
    }
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, ...updates, status: nextStatus } : r))
    message.success(`บันทึกผลการซ่อม ${req.id} แล้ว`)
    setResultModal(null)
    resultForm.resetFields()
  }

  const handleIssuePR = (values: { prNote: string }) => {
    setRequests(prev => prev.map(r =>
      r.id === prModal!.id
        ? { ...r, status: 'waiting_pr', prNote: values.prNote, prIssuedBy: roleInfo.name, prIssuedDate: today }
        : r
    ))
    message.success(`ออก PR สำหรับ ${prModal!.id} แล้ว`)
    setPrModal(null)
    prForm.resetFields()
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

  const pendingAssign = requests.filter(r => r.status === 'pending')
  const needPrItems   = requests.filter(r => r.repairResult === 'fixed_need_purchase' && r.status === 'in_progress')

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
          <Text style={{ color: '#64748b', fontSize: 12 }}>สำหรับเจ้าหน้าที่ภายใน — เลือกบทบาทของคุณด้านล่าง</Text>
        </div>

        {/* Role Selector */}
        <Card style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 20, borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 160 }}>
              <Text style={{ color: '#64748b', fontSize: 11, display: 'block' }}>เข้าใช้งานในฐานะ</Text>
              <Text style={{ color: '#a78bfa', fontWeight: 700, fontSize: 14 }}>{roleInfo.name}</Text>
            </div>
            <Divider type="vertical" style={{ borderColor: '#334155', height: 40 }} />
            <Radio.Group value={role} onChange={e => setRole(e.target.value)} buttonStyle="solid">
              <Radio.Button value="it_officer">เจ้าหน้าที่ IT</Radio.Button>
              <Radio.Button value="technician">ช่าง / เจ้าหน้าที่ซ่อม</Radio.Button>
              <Radio.Button value="it_head">หัวหน้า IT</Radio.Button>
              <Radio.Button value="mission_head">หัวหน้ากลุ่มภารกิจ</Radio.Button>
            </Radio.Group>
          </div>
        </Card>

        {/* Panel Card */}
        <Card style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #1e3a5f' }}>
            {role === 'it_officer'   && <TeamOutlined style={{ color: '#a78bfa', fontSize: 18 }} />}
            {role === 'technician'   && <ToolOutlined style={{ color: '#60a5fa', fontSize: 18 }} />}
            {role === 'it_head'      && <SafetyCertificateOutlined style={{ color: '#c084fc', fontSize: 18 }} />}
            {role === 'mission_head' && <AuditOutlined style={{ color: '#22d3ee', fontSize: 18 }} />}
            <div>
              <Title level={5} style={{ color: '#e2e8f0', margin: 0 }}>
                {role === 'it_officer'   && 'แผงควบคุม — เจ้าหน้าที่ IT'}
                {role === 'technician'   && 'แผงควบคุม — ช่าง / เจ้าหน้าที่ซ่อม'}
                {role === 'it_head'      && 'แผงควบคุม — หัวหน้า IT'}
                {role === 'mission_head' && 'แผงควบคุม — หัวหน้ากลุ่มภารกิจ'}
              </Title>
              <Text style={{ color: '#64748b', fontSize: 11 }}>
                {role === 'it_officer'   && 'มอบหมายงาน · ออกใบ PR · ติดตามสถานะทั้งหมด'}
                {role === 'technician'   && 'รับงาน · บันทึกผลการซ่อม'}
                {role === 'it_head'      && 'อนุมัติการจัดซื้ออะไหล่และอุปกรณ์ทดแทน'}
                {role === 'mission_head' && 'อนุมัติขั้นสุดท้ายหลังจากหัวหน้า IT อนุมัติ'}
              </Text>
            </div>
          </div>

          {/* ── IT Officer Panel ── */}
          {role === 'it_officer' && (
            <Tabs type="line" items={[
              {
                key: 'assign',
                label: <Badge count={pendingAssign.length} size="small" offset={[6, -2]}><span>รอมอบหมาย</span></Badge>,
                children: (
                  <Table
                    {...tableProps}
                    dataSource={pendingAssign}
                    rowKey="id"
                    pagination={false}
                    locale={emptyText('ไม่มีคำร้องรอมอบหมาย')}
                    columns={[
                      colId, colDevice, colUrgency,
                      { title: 'วันที่แจ้ง', dataIndex: 'requestDate', key: 'requestDate', width: 110 },
                      { title: 'อาการ', dataIndex: 'symptom', key: 'symptom',
                        render: (v: string) => <Text style={{ color: '#94a3b8', fontSize: 11 }}>{v.length > 50 ? v.slice(0, 50) + '…' : v}</Text> },
                      { title: 'มอบหมาย', key: 'action', width: 100, align: 'center' as const,
                        render: (_: unknown, r: ManageRepairRequest) => (
                          <Button size="small" type="primary" onClick={() => { setAssignModal(r); assignForm.resetFields() }}>
                            มอบหมาย
                          </Button>
                        )},
                    ]}
                  />
                ),
              },
              {
                key: 'pr',
                label: <Badge count={needPrItems.length} size="small" offset={[6, -2]}><span>รอออก PR</span></Badge>,
                children: (
                  <Table
                    {...tableProps}
                    dataSource={needPrItems}
                    rowKey="id"
                    pagination={false}
                    locale={emptyText('ไม่มีรายการรอออก PR')}
                    columns={[
                      colId, colDevice, colUrgency,
                      { title: 'ช่าง', dataIndex: 'assignedTo', key: 'assignedTo', width: 150 },
                      { title: 'บันทึกช่าง', dataIndex: 'technicianNote', key: 'technicianNote',
                        render: (v: string) => <Text style={{ color: '#94a3b8', fontSize: 11 }}>{v}</Text> },
                      { title: 'ออก PR', key: 'action', width: 90, align: 'center' as const,
                        render: (_: unknown, r: ManageRepairRequest) => (
                          <Button size="small"
                            style={{ background: '#fb923c', borderColor: '#fb923c', color: '#fff' }}
                            onClick={() => { setPrModal(r); prForm.resetFields() }}>
                            ออก PR
                          </Button>
                        )},
                    ]}
                  />
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
          )}

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

      {/* ══ Assign Modal ══════════════════════════════════════════════════════ */}
      <Modal
        title={<span><TeamOutlined style={{ color: '#a78bfa', marginRight: 8 }} />มอบหมายงาน {assignModal?.id}</span>}
        open={!!assignModal}
        onCancel={() => { setAssignModal(null); assignForm.resetFields() }}
        onOk={() => assignForm.submit()}
        okText="มอบหมาย" cancelText="ยกเลิก"
        destroyOnHidden
      >
        {assignModal && (
          <Alert
            message={<span style={{ fontSize: 12 }}>{assignModal.deviceBrand} — {assignModal.department}</span>}
            description={<span style={{ fontSize: 11, color: '#94a3b8' }}>{assignModal.symptom}</span>}
            type="info" showIcon style={{ marginBottom: 16 }}
          />
        )}
        <Form form={assignForm} layout="vertical" onFinish={handleAssign}>
          <Form.Item name="techId" label="เลือกช่าง / เจ้าหน้าที่" rules={[{ required: true, message: 'กรุณาเลือกผู้รับงาน' }]}>
            <Select placeholder="เลือกผู้รับงาน" size="large">
              {MOCK_TECHNICIANS.map(t => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name} <span style={{ color: '#64748b', fontSize: 11 }}>({t.specialty})</span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="note" label="หมายเหตุ / คำแนะนำ (ถ้ามี)">
            <TextArea rows={2} placeholder="ระบุคำแนะนำหรือรายละเอียดเพิ่มเติม..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ══ PR Modal ══════════════════════════════════════════════════════════ */}
      <Modal
        title={<span><ShoppingCartOutlined style={{ color: '#fb923c', marginRight: 8 }} />ออกใบ PR — {prModal?.id}</span>}
        open={!!prModal}
        onCancel={() => { setPrModal(null); prForm.resetFields() }}
        onOk={() => prForm.submit()}
        okText="บันทึก PR" cancelText="ยกเลิก"
        okButtonProps={{ style: { background: '#fb923c', borderColor: '#fb923c' } }}
        destroyOnHidden
      >
        {prModal && (
          <Alert
            message={<span style={{ fontSize: 12 }}>ช่าง: {prModal.assignedTo}</span>}
            description={<span style={{ fontSize: 11, color: '#94a3b8' }}>บันทึก: {prModal.technicianNote}</span>}
            type="warning" showIcon style={{ marginBottom: 16 }}
          />
        )}
        <Form form={prForm} layout="vertical" onFinish={handleIssuePR}>
          <Form.Item name="prNote" label="รายละเอียด PR / อะไหล่ที่ต้องการจัดซื้อ"
            rules={[{ required: true, message: 'กรุณาระบุรายละเอียด PR' }]}>
            <TextArea rows={4} placeholder="เช่น ออก PR สั่งซื้อ... Part Number: ... จำนวน ... ราคาประมาณ ..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ══ Record Result Modal ═══════════════════════════════════════════════ */}
      <Modal
        title={<span><CheckSquareOutlined style={{ color: '#22c55e', marginRight: 8 }} />บันทึกผลการซ่อม — {resultModal?.id}</span>}
        open={!!resultModal}
        onCancel={() => { setResultModal(null); resultForm.resetFields() }}
        onOk={() => resultForm.submit()}
        okText="บันทึก" cancelText="ยกเลิก"
        width={560} destroyOnHidden
      >
        {resultModal && (
          <Alert
            message={<span style={{ fontSize: 12 }}>{resultModal.deviceBrand} — {resultModal.department}</span>}
            description={<span style={{ fontSize: 11, color: '#94a3b8' }}>{resultModal.symptom}</span>}
            type="info" showIcon style={{ marginBottom: 16 }}
          />
        )}
        <Form form={resultForm} layout="vertical" onFinish={handleRecordResult}>
          <Form.Item name="repairResult" label="ผลการซ่อม" rules={[{ required: true, message: 'กรุณาเลือกผลการซ่อม' }]}>
            <Radio.Group>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(Object.entries(repairResultConfig) as [RepairResult, typeof repairResultConfig[RepairResult]][]).map(([key, cfg]) => (
                  <Radio key={key} value={key} style={{ padding: '6px 0' }}>
                    <Tag style={{ color: cfg.color, borderColor: cfg.color + '44', fontWeight: 600 }}>{cfg.label}</Tag>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.repairResult !== cur.repairResult}>
            {({ getFieldValue }) => {
              const result: RepairResult = getFieldValue('repairResult')
              return (
                <>
                  {result === 'fixed_with_parts' && (
                    <Form.Item name="partsUsed" label="อะไหล่ที่ใช้" rules={[{ required: true, message: 'กรุณาระบุอะไหล่ที่ใช้' }]}>
                      <Input placeholder="เช่น Power Supply ATX 500W, RAM DDR4 8GB" />
                    </Form.Item>
                  )}
                  {result === 'fixed_need_purchase' && (
                    <Form.Item name="partsUsed" label="อะไหล่ที่ต้องสั่งซื้อ" rules={[{ required: true, message: 'กรุณาระบุอะไหล่' }]}>
                      <Input placeholder="เช่น Feed Roller HP PN: RM2-5452" />
                    </Form.Item>
                  )}
                  {result === 'cannot_fix_replace' && (
                    <Form.Item name="replacementNote" label="คำแนะนำการซื้อทดแทน" rules={[{ required: true, message: 'กรุณาระบุคำแนะนำ' }]}>
                      <TextArea rows={3} placeholder="เช่น แนะนำจัดซื้อทดแทน... รุ่น... ราคาประมาณ..." />
                    </Form.Item>
                  )}
                </>
              )
            }}
          </Form.Item>

          <Form.Item name="technicianNote" label="บันทึกการซ่อม" rules={[{ required: true, message: 'กรุณาบันทึกรายละเอียด' }]}>
            <TextArea rows={3} placeholder="รายละเอียดการซ่อม อาการที่พบ สิ่งที่ดำเนินการ..." />
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
        width={520} destroyOnHidden
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
        width={1100} destroyOnHidden
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

              <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered
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
            {detailModal.assetNo && <Descriptions.Item label="เลขครุภัณฑ์"><code style={{ color: '#a78bfa' }}>{detailModal.assetNo}</code></Descriptions.Item>}
            {detailModal.deviceLocation && <Descriptions.Item label="สถานที่">{detailModal.deviceLocation}</Descriptions.Item>}
            <Descriptions.Item label="อาการ" span={2}
              styles={{ content: { whiteSpace: 'pre-wrap', color: '#e2e8f0' } }}>{detailModal.symptom}</Descriptions.Item>
            {detailModal.assignedTo && <Descriptions.Item label="ช่าง / เจ้าหน้าที่">
              <Text style={{ color: '#6ee7b7' }}>{detailModal.assignedTo}</Text>
            </Descriptions.Item>}
            {detailModal.assignedDate && <Descriptions.Item label="วันที่มอบหมาย">{detailModal.assignedDate}</Descriptions.Item>}
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
            {detailModal.prNote && (
              <Descriptions.Item label={<span style={{ color: '#fb923c' }}><ShoppingCartOutlined style={{ marginRight: 4 }} />ใบ PR</span>} span={2}
                styles={{ content: { color: '#fb923c', whiteSpace: 'pre-wrap' } }}>
                {detailModal.prNote}
              </Descriptions.Item>
            )}
            {detailModal.replacementNote && (
              <Descriptions.Item label={<span style={{ color: '#f472b6' }}><SwapOutlined style={{ marginRight: 4 }} />ซื้อทดแทน</span>} span={2}
                styles={{ content: { color: '#f472b6', whiteSpace: 'pre-wrap' } }}>
                {detailModal.replacementNote}
              </Descriptions.Item>
            )}
            {detailModal.itHeadApproval && (
              <Descriptions.Item label="อนุมัติ — หัวหน้า IT">
                <Tag color={detailModal.itHeadApproval.status === 'approved' ? 'success' : 'error'}>
                  {detailModal.itHeadApproval.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}
                </Tag>
                <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 8 }}>{detailModal.itHeadApproval.note}</span>
              </Descriptions.Item>
            )}
            {detailModal.missionHeadApproval && (
              <Descriptions.Item label="อนุมัติ — หัวหน้ากลุ่ม">
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
