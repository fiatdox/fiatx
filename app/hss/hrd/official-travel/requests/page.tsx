'use client'
// รายการขออนุมัติเดินทางไปราชการ — ของฉัน (ยื่นเอง/ร่วมเดินทาง) · ทั้งหมด (ADMIN/HRD)
// พิมพ์ PDF · แก้ไข/ยกเลิก (ผู้ขอ ก่อนการเงินยืนยัน) · ยืนยันยอดจากการเงิน (ADMIN/HRD — ยอดนี้เท่านั้นที่ตัดงบ)
// ?open=<id> เปิด PDF ทันที (หลังยื่นคำขอ)
import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { Alert, App, Badge, Button, Card, Dropdown, Empty, Form, Grid, Input, InputNumber, Modal, Pagination, Radio, Segmented, Spin, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FileTextOutlined, AccountBookOutlined, TeamOutlined, ApartmentOutlined, AuditOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, EditOutlined, FileDoneOutlined, FileSearchOutlined, MoreOutlined, PlusOutlined, PrinterOutlined, ProfileOutlined, SearchOutlined, StopOutlined } from '@ant-design/icons'
import { RequestTravelersDrawer } from '../TravelHistory'
import { progressCount, RequestProgress, StatusBadge } from '../TravelStatus'
import { ApproveModal, TripUrgency } from '../TravelApprove'
import { ReviewModal } from '../HrdReview'
import { ChainResyncModal, RescheduleModal, TravelersModal } from '../HrdChangeModals'
import HrdTasks from '../HrdTasks'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { canSeeTravelItem, HRD_ROLES_ITEM, HRD_TASKS, isHrdTaskKey, TRAVEL_BASE, TRAVEL_COLOR, TRAVEL_MENU, TravelShell, travelApi, travelPost, TravelApiError, useTravelRoles, type HrdTaskKey } from '../travelShared'
import { MEMO, isNoClaim, requestBudgetType, requestDates, requiredDocs, SIGN_MODE_LABEL, fmtMoney, requestNo, thaiDateTime, type LodgingMode, type TravelRequest, type VehicleMode } from '../travelCalc'
import { ClaimStatusTag } from '../claimShared'

const { Title, Text } = Typography
// react-pdf เรนเดอร์ฝั่ง server ไม่ได้
const TravelRequestPDF = dynamic(() => import('../TravelRequestPDF'), { ssr: false, loading: () => <div style={{ padding: 24 }}><Spin /> กำลังเตรียมเอกสาร...</div> })

/** แจ้งเตรียมเอกสารเบิก — ตั้งแต่ 08:00 วันถัดจากวันกลับ จนกว่าจะส่งเบิก */
interface ClaimDue { id: number; subject: string; location: string; start_at: string; end_at: string; vehicle_mode: VehicleMode; lodging_mode: LodgingMode; registration_amount: number; transport_amount: number; report_status: 'draft' | 'submitted' | null; claim_status: 'draft' | 'returned' | null }
interface ListData { rows: TravelRequest[]; total: number; can_manage: boolean; pending_approvals: number; soon?: { count: number; overdue: number; days: number }; cleared?: ClearedTrip[]; claim_due?: ClaimDue[]; stage_counts?: Partial<Record<StageTab, number>> }
/** ของฉัน: ผอ. อนุมัติแล้ว (HRD อัปเดตสถานะ) ยังไม่ถึงวันกลับ */
type ClearedTrip = Pick<TravelRequest, 'id' | 'subject' | 'location' | 'start_at' | 'end_at' | 'director_at' | 'director_note' | 'cost_mode' | 'trip_dates'>
type Scope = 'mine' | 'approve' | 'all'
/** แท็บกรองตามขั้น (ตรงกับ backend stage) */
type StageTab = 'all' | 'hrd' | 'returned' | 'chain' | 'director' | 'approved' | 'rejected' | 'cancelled'
const STAGE_TABS: { key: StageTab; label: string; color: string }[] = [
  { key: 'all', label: 'ทั้งหมด', color: '#475569' },
  { key: 'hrd', label: 'รอ HRD ตรวจ', color: '#0d9488' },
  { key: 'returned', label: 'ส่งกลับแก้ไข', color: '#d97706' },
  { key: 'chain', label: 'รอหัวหน้าอนุมัติ', color: '#6366f1' },
  { key: 'director', label: 'รอ ผอ. ลงนาม', color: '#ca8a04' },
  { key: 'approved', label: 'เดินทางได้', color: '#16a34a' },
  { key: 'rejected', label: 'ไม่อนุมัติ', color: '#dc2626' },
  { key: 'cancelled', label: 'ยกเลิก', color: '#64748b' },
]
const PAGE_SIZE = 20
/** ตัดข้อความเกิน n บรรทัดด้วย … */
const clamp = (n: number): React.CSSProperties => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' })


// ── ผอ. ลงนามแล้ว: HRD รับเอกสารแล้วอัปเดตสถานะ = แจ้งผู้เดินทางว่าเดินทางได้ / ไม่ได้รับอนุมัติ (ADMIN/HRD) ──
const DirectorModal = ({ r, onClose, onSaved }: { r: TravelRequest; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const result = Form.useWatch('result', form)
  const submit = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      await travelPost(`requests/${r.id}/director`, { result: v.result, note: v.note?.trim() || null })
      message.success(v.result === 'approved' ? 'อัปเดตสถานะแล้ว — ผู้เดินทางเห็นว่า “อนุมัติ เดินทางได้”' : 'อัปเดตสถานะแล้ว — แจ้งผู้เดินทางว่าไม่ได้รับอนุมัติ')
      onClose(); onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else message.error((e as Error).message)
    } finally { setSaving(false) }
  }
  return (
    <Modal open title={`อัปเดตสถานะหลัง ผอ. ลงนาม · ${requestNo(r.id)}`} onCancel={onClose} onOk={submit} okText="อัปเดตสถานะและแจ้งผู้เดินทาง" cancelText="ยกเลิก" confirmLoading={saving}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        title={r.sign_mode === 'paper' ? 'เดินเอกสาร — ได้รับเอกสารที่ลงนามครบแล้ว' : 'ได้รับบันทึกข้อความที่ผู้อำนวยการลงนามแล้ว'}
        description={<>{r.requester_name} · {r.subject}{r.sign_mode === 'paper' && <div>หัวหน้าไม่อนุมัติในเอกสาร ให้เลือก “ไม่อนุมัติ” แล้วระบุเหตุผล</div>}<div>อัปเดตแล้วผู้ขอและผู้ร่วมเดินทางเห็นผลในระบบทันที</div></>} />
      <Form form={form} layout="vertical" initialValues={{ result: 'approved' }}>
        <Form.Item name="result" label="คำสั่งผู้อำนวยการ" rules={[{ required: true }]}>
          <Radio.Group optionType="button" buttonStyle="solid" options={[{ value: 'approved', label: 'อนุมัติ — เดินทางได้' }, { value: 'rejected', label: 'ไม่อนุมัติ' }]} />
        </Form.Item>
        <Form.Item name="note" label={result === 'rejected' ? 'เหตุผลที่ไม่อนุมัติ' : 'ข้อความถึงผู้เดินทาง / เลขที่หนังสือ (ถ้ามี)'} rules={[{ required: result === 'rejected', whitespace: true, message: 'ระบุเหตุผล' }, { max: 300 }]}>
          <Input placeholder={result === 'rejected' ? 'ตามที่ผู้อำนวยการเขียนในคำสั่ง' : 'เช่น เลขที่หนังสือ'} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── ยืนยันยอดจากการเงิน ── (ฟอร์มของตัวเอง render เฉพาะตอนเปิด)
const ActualModal = ({ r, onClose, onSaved }: { r: TravelRequest; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState<'save' | 'clear' | null>(null)
  const submit = async (clear: boolean) => {
    const v = clear ? {} : await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(clear ? 'clear' : 'save')
    try {
      await travelApi(`requests/${r.id}/actual`, 'PUT', clear ? { actual_amount: null } : { actual_amount: v.actual_amount, actual_note: v.actual_note ?? null })
      message.success(clear ? 'ล้างยอดยืนยันแล้ว — กลับเป็นประมาณการรอยืนยัน' : `ยืนยันยอด ${fmtMoney(v.actual_amount)} บาท แล้ว ตัดงบเรียบร้อย`)
      onClose(); onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else message.error((e as Error).message)
    } finally { setSaving(null) }
  }
  return (
    <Modal open title={`ยืนยันยอดเบิกจ่ายจากการเงิน · ${requestNo(r.id)}`} onCancel={onClose}
      footer={[
        r.actual_amount != null && <Button key="c" danger loading={saving === 'clear'} onClick={() => submit(true)}>ล้างยอดยืนยัน</Button>,
        <Button key="x" onClick={onClose}>ยกเลิก</Button>,
        <Button key="s" type="primary" loading={saving === 'save'} onClick={() => submit(false)}>บันทึกยอดยืนยัน</Button>,
      ]}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }} title="ยอดที่บันทึกนี้เท่านั้นที่ตัดงบประมาณ"
        description={`${r.requester_name} · ${r.subject} · ประมาณการ ${fmtMoney(r.total_amount)} บาท · ${requestBudgetType(r)} ${r.budget_name}`} />
      <Form form={form} layout="vertical" initialValues={{ actual_amount: r.actual_amount ?? r.total_amount, actual_note: r.actual_note ?? undefined }}>
        <Form.Item name="actual_amount" label="ยอดที่การเงินยืนยัน" rules={[{ required: true, message: 'ระบุยอด' }]}>
          <InputNumber min={0} max={1_000_000} precision={2} style={{ width: '100%' }} suffix="บาท" />
        </Form.Item>
        <Form.Item name="actual_note" label="อ้างอิง / หมายเหตุ" rules={[{ max: 300 }]}>
          <Input placeholder="เช่น เลขที่ใบสำคัญ / ฎีกา" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── ยกเลิกคำขอ ──
const CancelModal = ({ r, onClose, onSaved }: { r: TravelRequest; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  // ผอ. อนุมัติแล้ว (เบิกค่าใช้จ่าย) อาจยืมเงินไปแล้ว — ยกเลิกต้องคืนเงินยืมเต็มจำนวนผ่าน HRD → การเงิน
  const canBorrow = r.approval_stage === 'approved' && !isNoClaim(r)
  const borrowed = Form.useWatch('borrowed', form)
  const submit = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const out = await travelPost<{ refund: number | null }>(`requests/${r.id}/cancel`, { reason: v.reason ?? null,
        ...(canBorrow && v.borrowed === 'yes' ? { advance_amount: v.advance_amount, advance_no: v.advance_no ?? null } : {}) })
      message.success(out?.refund ? `ยกเลิกแล้ว — ส่งรายการคืนเงินยืม ${fmtMoney(out.refund)} บาท ให้ HRD และการเงิน` : `ยกเลิกคำขอ ${requestNo(r.id)} แล้ว`)
      onClose(); onSaved()
    } catch (e) { message.error((e as Error).message) } finally { setSaving(false) }
  }
  return (
    <Modal open title={`ยกเลิกคำขอ ${requestNo(r.id)}`} onCancel={onClose} onOk={submit} okText="ยกเลิกคำขอ" okButtonProps={{ danger: true }} cancelText="ไม่ยกเลิก" confirmLoading={saving}>
      <Text>{r.subject}</Text>
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="reason" label="เหตุผล (ถ้ามี)" rules={[{ max: 300 }]}><Input placeholder="เช่น เลื่อนการประชุม" /></Form.Item>
        {canBorrow && <>
          <Form.Item name="borrowed" label="ยืมเงินไปราชการครั้งนี้แล้วหรือยัง" initialValue={r.claim_status ? undefined : 'no'} rules={[{ required: true, message: 'เลือก' }]}
            extra={r.claim_status ? 'ถ้าบันทึกเงินยืมไว้ในร่างการเบิกแล้ว ระบบใช้ยอดนั้นให้ — เลือก "ยังไม่ได้ยืม" ได้' : undefined}>
            <Radio.Group data-testid="cancel-borrowed" options={[{ value: 'no', label: 'ยังไม่ได้ยืม' }, { value: 'yes', label: 'ยืมแล้ว — คืนเงินยืมเต็มจำนวน' }]} />
          </Form.Item>
          {borrowed === 'yes' && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Form.Item name="advance_amount" label="จำนวนเงินยืม (บาท)" style={{ flex: '1 1 160px' }} rules={[{ required: true, message: 'ระบุจำนวนเงินยืม' }]}>
              <InputNumber min={0.01} max={1000000} precision={2} style={{ width: '100%' }} aria-label="จำนวนเงินยืมที่ต้องคืน" />
            </Form.Item>
            <Form.Item name="advance_no" label="เลขที่สัญญายืมเงิน" style={{ flex: '1 1 160px' }}><Input maxLength={50} aria-label="เลขที่สัญญายืมเงิน" /></Form.Item>
          </div>}
          {borrowed === 'yes' && <Alert type="warning" showIcon title="ระบบส่งรายการคืนเงินยืมให้ HRD ตรวจ แล้วการเงินรับคืนและปิดเรื่อง" />}
        </>}
      </Form>
    </Modal>
  )
}

const RequestsContent = () => {
  const { message } = App.useApp()
  const router = useRouter()
  const params = useSearchParams()
  // ?tab=approve — ลิงก์จากป้ายรออนุมัติบนเมนู · ?tab=all&task= — การ์ดงานที่ต้องดำเนินการของ HRD (backend ตรวจสิทธิ์ scope=all)
  // ไม่ระบุ ?tab= → ADMIN/HRD เห็นคำขอทั้งหมดเป็นค่าเริ่มต้น · คนอื่นเห็นคำขอของตนเอง (ที่ยื่นเองและที่ร่วมเดินทาง)
  // (backend ตรวจสิทธิ์ scope=all อีกชั้น — คนที่ไม่ใช่ ADMIN/HRD ได้ 403)
  const tabParam = params.get('tab')
  const [scopeSel, setScope] = useState<Scope | null>(tabParam === 'approve' ? 'approve' : tabParam === 'all' ? 'all' : tabParam === 'mine' ? 'mine' : null)
  const roles = useTravelRoles()
  const isManager = !!roles && canSeeTravelItem(HRD_ROLES_ITEM, roles)
  const scope: Scope | null = scopeSel ?? (roles === null ? null : isManager ? 'all' : 'mine')
  const [task, setTask] = useState<HrdTaskKey | null>(() => { const t = params.get('task'); return isHrdTaskKey(t) ? t : null })
  const [approveFor, setApproveFor] = useState<number | null>(null)
  const [directorFor, setDirectorFor] = useState<TravelRequest | null>(null)
  const [reviewFor, setReviewFor] = useState<number | null>(null)
  // แสดงแท็บรออนุมัติเมื่อมีคำขอรอ หรือเคยอยู่ในสายอนุมัติ
  const [approver, setApprover] = useState<{ pending: number; involved: boolean } | null>(null)
  const loadCount = useCallback(() => { travelApi<{ pending: number; involved: boolean }>('requests/approvals/count').then(setApprover).catch(() => {}) }, [])
  useEffect(() => { loadCount() }, [loadCount])
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<StageTab>('all')
  // มือถือ (< md) การ์ด 1 คอลัมน์ · แท็บเล็ต (md–xl รวมแนวนอน 1024) การ์ด 2 คอลัมน์ · ตั้งแต่ xl (≥ 1200) ตาราง (ก่อนรู้ขนาดจอถือเป็นจอกว้าง)
  const screens = Grid.useBreakpoint()
  const isMobile = screens.md === false
  const wide = screens.xl !== false
  const [page, setPage] = useState(1)
  const [now] = useState(() => Date.now())
  const [data, setData] = useState<ListData | null>(null)
  const soon = data?.soon, soonDays = soon?.days ?? 7
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState<TravelRequest | null>(null)
  const [printLoading, setPrintLoading] = useState<number | null>(null)
  const [actualFor, setActualFor] = useState<TravelRequest | null>(null)
  const [cancelFor, setCancelFor] = useState<TravelRequest | null>(null)
  const [rescheduleFor, setRescheduleFor] = useState<TravelRequest | null>(null)
  const [chainFor, setChainFor] = useState<TravelRequest | null>(null)
  const [travelersFor, setTravelersFor] = useState<TravelRequest | null>(null)
  const [checkFor, setCheckFor] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!scope) return   // รอรู้ role ก่อน (อ่าน cookie หลัง mount) — ไม่ยิงซ้ำสองรอบ
    setLoading(true)
    const q = new URLSearchParams({ scope, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) })
    if (query) q.set('search', query)
    if (stage !== 'all') q.set('stage', stage)
    if (task && scope === 'all') q.set('task', task)
    try {
      const d = await travelApi<ListData>(`requests?${q}`)
      setData(d)
      setApprover(a => a && d.pending_approvals != null ? { ...a, pending: d.pending_approvals } : a)
    }
    catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [scope, page, query, stage, task, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const openPdf = useCallback(async (id: number) => {
    setPrintLoading(id)
    try { setPrinting(await travelApi<TravelRequest>(`requests/${id}`)) }
    catch (e) { message.error((e as Error).message) } finally { setPrintLoading(null) }
  }, [message])
  // หลังยื่นคำขอ: เปิด PDF ทันที แล้วล้าง ?open ออกจาก URL
  const openId = Number(params.get('open')) || null
  useEffect(() => {
    if (!openId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- เปิด PDF จากลิงก์ (โหลดข้อมูลจาก API)
    openPdf(openId)
    router.replace(`${TRAVEL_BASE}/requests`)
  }, [openId, openPdf, router])
  // การ์ดงานที่ต้องดำเนินการ (ADMIN/HRD) — โหลดจำนวนใหม่หลังบันทึกผล ผอ. / ยอดการเงิน / ยกเลิก / อนุมัติ
  const [tasksKey, setTasksKey] = useState(0)
  const afterAct = () => { load(); loadCount(); setTasksKey(k => k + 1) }
  const afterSave = () => { load(); setTasksKey(k => k + 1) }
  // กดการ์ดงาน = กรองตารางในหน้าเดิม (กดการ์ดที่กรองอยู่ซ้ำ = เลิกกรอง)
  const pickTask = (k: HrdTaskKey) => {
    const next = task === k && scope === 'all' ? null : k
    setScope('all'); setTask(next); setStage('all'); setPage(1)
    router.replace(`${TRAVEL_BASE}/requests?tab=all${next ? `&task=${next}` : ''}`, { scroll: false })
  }

  // ── ปุ่มจัดการต่อแถว: ปุ่มหลัก (งานที่ต้องทำกับคำขอนี้) + พิมพ์ + เมนู "…" ──
  type Act = { key: string; label: string; icon: React.ReactNode; danger?: boolean; run: () => void }
  const actionsOf = (r: TravelRequest): { primary: Act | null; more: Act[] } => {
    const acts: Act[] = []
    if (r.can_hrd_review) acts.push({ key: 'review', label: 'ตรวจ', icon: <FileSearchOutlined />, run: () => setReviewFor(r.id) })
    if (r.can_approve) acts.push({ key: 'approve', label: 'พิจารณา', icon: <AuditOutlined />, run: () => setApproveFor(r.id) })
    if (r.can_record_director) acts.push({ key: 'director', label: 'อัปเดตสถานะ', icon: <FileDoneOutlined />, run: () => setDirectorFor(r) })
    if (r.can_record_actual) acts.push({ key: 'actual', label: 'ยืนยันยอด', icon: <CheckCircleOutlined />, run: () => setActualFor(r) })
    if (r.can_edit) acts.push({ key: 'edit', label: 'แก้ไข', icon: <EditOutlined />, run: () => router.push(`${TRAVEL_BASE}/request?id=${r.id}`) })
    // เบิกค่าใช้จ่ายจริง: ผอ. อนุมัติแล้ว เดินทางกลับแล้ว ยังไม่ส่ง (หรือถูกส่งกลับ) — งานหลักของผู้ขอ · ส่งแล้วดูได้จากเมนู
    if (r.can_claim && Date.parse(r.end_at) <= now)
      acts.push({ key: 'claim', label: r.claim_status === 'returned' ? 'แก้การเบิก' : 'เบิกจ่ายจริง', icon: <AccountBookOutlined />, run: () => router.push(`${TRAVEL_BASE}/claim?id=${r.id}`) })
    // ส่งกลับแก้ไข = งานหลักของผู้ขอคือแก้ไข
    const primary = acts.find(a => a.key !== 'edit') ?? (r.approval_stage === 'returned' ? acts.find(a => a.key === 'edit') : undefined) ?? null
    const reportable = r.status === 'submitted' && (r.report_status || (r.can_cancel && Date.parse(r.start_at) <= now))
    const more: Act[] = [
      ...acts.filter(a => a !== primary),
      ...(scope === 'approve' && !r.can_approve ? [{ key: 'view-approve', label: 'ดูการอนุมัติ', icon: <AuditOutlined />, run: () => setApproveFor(r.id) }] : []),
      ...(data?.can_manage ? [{ key: 'detail', label: 'รายละเอียดการขออนุมัติ', icon: <ProfileOutlined />, run: () => setCheckFor(r.id) }] : []),
      ...(reportable ? [{
        key: 'report', label: r.report_status === 'submitted' ? 'รายงานผลการเดินทาง (ส่งแล้ว)' : r.report_status ? 'รายงานผลการเดินทาง (ร่าง)' : 'เขียนรายงานผลการเดินทาง',
        icon: <FileTextOutlined />, run: () => router.push(`${TRAVEL_BASE}/report?id=${r.id}`),
      }] : []),
      ...(r.claim_status && !acts.some(a => a.key === 'claim') ? [{ key: 'claim-view', label: 'การเบิกค่าใช้จ่ายจริง', icon: <AccountBookOutlined />, run: () => router.push(`${TRAVEL_BASE}/claim?id=${r.id}`) }] : []),
      // HRD: เลื่อนวันเดินทาง (ผอ. อนุมัติแล้ว ยังไม่ส่งเบิก) · คิดสายอนุมัติใหม่ (เปลี่ยนตัวหัวหน้า — ก่อนผ่านสาย)
      ...(data?.can_manage && r.status === 'submitted' && r.approval_stage === 'approved' && !isNoClaim(r) && (!r.claim_status || r.claim_status === 'draft' || r.claim_status === 'returned')
        ? [{ key: 'reschedule', label: 'เลื่อนวันเดินทาง', icon: <CalendarOutlined />, run: () => setRescheduleFor(r) }] : []),
      // HRD แก้ผู้ร่วมเดินทาง: หลังหัวหน้าเริ่มกด (ก่อนนั้นผู้ขอแก้เอง) จนกว่าจะส่งเบิก
      ...(data?.can_manage && r.status === 'submitted' && (['director', 'approved'].includes(r.approval_stage) || (r.approval_stage === 'chain' && Number(r.current_step) > 1))
          && (!r.claim_status || r.claim_status === 'draft' || r.claim_status === 'returned')
        ? [{ key: 'travelers', label: 'แก้ผู้ร่วมเดินทาง', icon: <TeamOutlined />, run: () => setTravelersFor(r) }] : []),
      ...(data?.can_manage && r.status === 'submitted' && ['hrd', 'returned', 'chain'].includes(r.approval_stage)
        ? [{ key: 'chain', label: 'คิดสายอนุมัติใหม่ (เปลี่ยนหัวหน้า)', icon: <ApartmentOutlined />, run: () => setChainFor(r) }] : []),
      ...(r.can_cancel ? [{ key: 'cancel', label: 'ยกเลิกคำขอ', icon: <StopOutlined />, danger: true, run: () => setCancelFor(r) }] : []),
    ]
    return { primary, more }
  }
  const actionBar = (r: TravelRequest, block?: boolean) => {
    const { primary, more } = actionsOf(r)
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, width: block ? '100%' : undefined }}>
        {primary && <Button type="primary" size="small" icon={primary.icon} onClick={primary.run} aria-label={`${primary.label} ${requestNo(r.id)}`}
          style={block ? { flex: 1 } : undefined}>{primary.label}</Button>}
        <Tooltip title="พิมพ์บันทึกข้อความ"><Button type="text" size="small" icon={<PrinterOutlined />} loading={printLoading === r.id} onClick={() => openPdf(r.id)} aria-label={`พิมพ์ ${requestNo(r.id)}`} /></Tooltip>
        {more.length > 0 && (
          <Dropdown trigger={['click']} placement="bottomRight"
            menu={{ items: more.map(a => ({ key: a.key, label: a.label, icon: a.icon, danger: a.danger })), onClick: ({ key }) => more.find(a => a.key === key)?.run() }}>
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label={`เพิ่มเติม ${requestNo(r.id)}`} />
          </Dropdown>
        )}
      </div>
    )
  }
  /** สถานะ: ขั้นตอน + ป้ายสถานะ · ขั้นที่ x/n · เดินเอกสาร · ใกล้เดินทาง (บรรทัดเดียว) */
  const statusCell = (r: TravelRequest) => {
    const tip = r.status === 'cancelled' ? r.cancel_reason : r.status === 'rejected' ? r.reject_reason
      : r.approval_stage === 'returned' ? (r.return_note ? `ต้องแก้ไข: ${r.return_note}` : null)
      : r.waiting_for ? `${r.waiting_for.is_acting ? 'รักษาการ ' : ''}${r.waiting_for.approver_name}` : null
    const count = progressCount(r)
    return <>
      <RequestProgress r={r} />
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        <Tooltip title={tip ?? undefined}><StatusBadge r={r} /></Tooltip>
        {count && <Text type="secondary" style={{ fontSize: 11 }}>{count}</Text>}
        {r.sign_mode === 'paper' && <Tag style={{ margin: 0, fontSize: 11 }}>{SIGN_MODE_LABEL.paper}</Tag>}
        <TripUrgency r={r} now={now} days={soonDays} inline />
        {r.claim_status && <span data-testid="claim-tag"><ClaimStatusTag status={r.claim_status} /></span>}
      </div>
    </>
  }
  const travelersText = (r: TravelRequest) => {
    const names = r.traveler_names ?? []
    const n = r.traveler_count ?? names.length
    return { first: names[0] ?? r.requester_name, more: Math.max(0, n - 1), n, all: names.join(', ') }
  }
  const travelersLink = (r: TravelRequest) => {
    const t = travelersText(r)
    const label = `${t.n} คน`
    return data?.can_manage
      ? <a onClick={() => setCheckFor(r.id)} title={t.all || 'ดูรายละเอียดคำขอและประวัติผู้เดินทาง'}>{label}</a>
      : <Tooltip title={t.all || undefined}><Text type="secondary" style={{ fontSize: 12 }}>{label}</Text></Tooltip>
  }
  const amount = (r: TravelRequest) => isNoClaim(r) ? <Tag color="green" style={{ margin: 0 }}>ไม่เบิกค่าใช้จ่าย</Tag> : <>
    <span style={{ fontWeight: 600 }}>{fmtMoney(r.total_amount)}</span>
    {r.status === 'submitted' && r.approval_stage === 'approved' && (r.actual_amount != null
      ? <Tag color="success" style={{ margin: '0 0 0 6px', fontSize: 11 }}>ยืนยัน {fmtMoney(r.actual_amount)}</Tag>
      : <Tag style={{ margin: '0 0 0 6px', fontSize: 11 }}>รอการเงินยืนยัน</Tag>)}
  </>

  // ── เดสก์ท็อป (≥ 1200): ตาราง (คอลัมน์รองซ่อนตามความกว้าง) ──
  const columns: ColumnsType<TravelRequest> = [
    // ลำดับต่อเนื่องข้ามหน้า (หน้า 2 เริ่มที่ 21)
    { title: 'ลำดับ', key: 'no', width: 52, align: 'center', responsive: ['xl'], render: (_: unknown, __: TravelRequest, i: number) => <Text type="secondary" data-testid="row-no">{(page - 1) * PAGE_SIZE + i + 1}</Text> },
    {
      title: 'เลขที่', dataIndex: 'id', width: 118,
      render: (id: number, r) => <>
        <Text code>{requestNo(id)}</Text>
        {r.memo_no && <div style={{ fontSize: 11, marginTop: 2, whiteSpace: 'nowrap' }} data-testid="memo-no">
          <Tooltip title="เลขที่บันทึกข้อความ"><Text style={{ fontSize: 11 }}>ที่ {MEMO.docPrefix}{r.memo_no}</Text></Tooltip>
        </div>}
      </>,
    },
    {
      // เรื่อง (≤ 2 บรรทัด) · วันเดินทาง · สถานที่ · ผู้ขอ — ข้อความยาวตัดด้วย … ชี้ดูเต็ม
      title: 'เรื่อง / วันเดินทาง', dataIndex: 'subject', width: 270,
      render: (v: string, r) => <div style={{ width: 254 }}>
        <div style={{ fontWeight: 500, ...clamp(2) }} title={v}>{v}</div>
        <div style={{ fontSize: 12, color: 'var(--app-text-2)', ...clamp(1) }} title={`${requestDates(r)} · ${r.location}`}>
          <span style={{ color: 'var(--app-text)' }}>{requestDates(r)}</span> · {r.location}
        </div>
        {scope !== 'mine' && <div style={{ fontSize: 12, color: 'var(--app-text-3)', ...clamp(1) }} data-testid="requester"
          title={[r.requester_name, r.requester_position, r.requester_unit].filter(Boolean).join(' · ')}>{r.requester_name}{r.requester_unit ? ` · ${r.requester_unit}` : ''}</div>}
      </div>,
    },
    {
      // ผู้เดินทาง: คนแรก + จำนวน (ชี้ดูรายชื่อครบ) · ช่องค้นหาค้นชื่อผู้เดินทางได้
      title: 'ผู้เดินทาง', dataIndex: 'traveler_count', width: 150, responsive: ['xl'],
      render: (_: number, r) => {
        const t = travelersText(r)
        return <div data-testid="travelers" style={{ fontSize: 12, lineHeight: 1.5, width: 134 }}>
          <div title={t.all} style={{ fontWeight: 500, ...clamp(1) }}>{t.first}</div>
          <div>{t.more > 0 && <Text type="secondary" style={{ fontSize: 12 }}>และอีก {t.more} คน · </Text>}{travelersLink(r)}</div>
        </div>
      },
    },
    { title: 'ประมาณการ (บาท)', dataIndex: 'total_amount', width: 120, align: 'right', render: (_: number, r) => <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>{amount(r)}</div> },
    { title: 'ความคืบหน้า', dataIndex: 'status', width: 300, render: (_: string, r) => statusCell(r) },
    // ปุ่มจัดการตรึงขวา — ตารางเลื่อนแนวนอนได้โดยไม่ซ่อนปุ่ม
    { title: '', key: 'actions', width: 150, align: 'right', fixed: 'right', render: (_: unknown, r) => actionBar(r) },
  ]

  const counts = data?.stage_counts
  const pickStage = (k: StageTab) => { setStage(k); setTask(null); setPage(1); if (task) router.replace(`${TRAVEL_BASE}/requests${scope === 'all' ? '?tab=all' : ''}`, { scroll: false }) }
  const empty = scope === 'approve' ? <Empty description="ไม่มีคำขอที่รอท่านอนุมัติ" />
    : <Empty description={stage !== 'all' ? 'ไม่มีคำขอในขั้นนี้' : scope === 'mine' ? 'ยังไม่มีคำขอ' : 'ไม่พบคำขอ'}>{stage === 'all' && <Link href={`${TRAVEL_BASE}/request`}><Button type="primary">ยื่นคำขอแรก</Button></Link>}</Empty>

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, fontSize: 20, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{TRAVEL_MENU[1].icon}</div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)', fontSize: isMobile ? 19 : undefined }}>รายการขออนุมัติเดินทางไปราชการ</Title>
          {!isMobile && <Text style={{ color: 'var(--app-text-2)' }}>{isManager ? 'คำขอของบุคลากรทั้งหมด (ผู้ดูแลระบบ / งานพัฒนาทรัพยากรบุคคล)' : 'คำขอที่ยื่นเองและที่ร่วมเดินทาง'} พิมพ์บันทึกข้อความได้ทุกรายการ</Text>}
        </div>
        <Link href={`${TRAVEL_BASE}/request`} style={isMobile ? { width: '100%' } : undefined}><Button type="primary" icon={<PlusOutlined />} block={isMobile}>ยื่นคำขอใหม่</Button></Link>
      </div>
      {isManager && <HrdTasks compact onPick={pickTask} active={scope === 'all' ? task : null} reloadKey={tasksKey} />}
      <Card styles={{ body: { padding: isMobile ? 10 : 12 } }} style={{ borderRadius: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {(data?.can_manage || approver?.involved || (approver?.pending ?? 0) > 0 || scope !== 'mine') && (
            <Segmented value={scope} onChange={x => { setScope(x as Scope); setTask(null); setStage('all'); setPage(1) }} block={isMobile} style={isMobile ? { width: '100%' } : undefined}
              options={[
                { value: 'mine', label: 'ของฉัน' },
                ...(approver?.involved || (approver?.pending ?? 0) > 0 || scope === 'approve'
                  ? [{ value: 'approve', label: <Badge count={approver?.pending ?? 0} size="small" offset={[8, -2]}><span>รออนุมัติ</span></Badge> }] : []),
                ...(data?.can_manage ? [{ value: 'all', label: 'ทั้งหมด' }] : []),
              ]} />
          )}
          <Input allowClear prefix={<SearchOutlined style={{ color: 'var(--app-text-3)' }} />} placeholder="ค้นหาเรื่อง สถานที่ ผู้เดินทาง เลขที่บันทึก" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '1 1 220px', maxWidth: isMobile ? undefined : 360 }} />
        </div>
        {/* แท็บกรองตามขั้น — เลื่อนแนวนอนได้บนจอแคบ */}
        <div className="travel-stage-tabs" role="tablist" aria-label="กรองตามขั้น" data-testid="stage-tabs">
          {STAGE_TABS.map(t => {
            const on = stage === t.key && !task, n = counts?.[t.key]
            return (
              <button key={t.key} type="button" role="tab" aria-selected={on} data-stage={t.key} onClick={() => pickStage(t.key)}
                className={on ? 'on' : undefined} style={on ? { background: t.color, borderColor: t.color, color: '#fff' } : undefined}>
                {t.label}{n != null && <span className="n" style={on ? { background: 'rgba(255,255,255,.25)', color: '#fff' } : undefined}>{n}</span>}
              </button>
            )
          })}
        </div>
        {scope === 'mine' && (data?.cleared?.length ?? 0) > 0 && (
          <Alert type="success" showIcon style={{ marginBottom: 10 }} data-testid="cleared-alert"
            title={<b>ผู้อำนวยการอนุมัติแล้ว — เดินทางไปราชการได้</b>}
            description={<div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
              {data!.cleared!.map(c => (
                <div key={c.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 8px' }}>
                  <Text code>{requestNo(c.id)}</Text>
                  <Text strong>{c.subject}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{c.location} · {requestDates(c as TravelRequest)}</Text>
                  {c.director_note && <Text style={{ fontSize: 12 }}>· {c.director_note}</Text>}
                  <a onClick={() => openPdf(c.id)} style={{ fontSize: 12 }}>พิมพ์บันทึกข้อความ</a>
                </div>
              ))}
            </div>} />
        )}
        {scope === 'mine' && (data?.claim_due?.length ?? 0) > 0 && (
          <Alert type="warning" showIcon icon={<AccountBookOutlined />} style={{ marginBottom: 10 }} data-testid="claim-due-alert"
            title={<b>เดินทางกลับแล้ว — เตรียมเอกสารเบิกค่าใช้จ่ายจริง</b>}
            description={<div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
              {data!.claim_due!.map(c => (
                <div key={c.id}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 8px' }}>
                    <Text code>{requestNo(c.id)}</Text><Text strong>{c.subject}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>กลับถึง {thaiDateTime(c.end_at)}</Text>
                    {c.claim_status === 'returned' && <Tag color="orange" style={{ margin: 0 }}>HRD ส่งกลับแก้ไข</Tag>}
                    <Link href={`${TRAVEL_BASE}/claim?id=${c.id}`} style={{ fontSize: 13, fontWeight: 600 }}>{c.claim_status ? 'ทำต่อ ›' : 'เบิกค่าใช้จ่ายจริง ›'}</Link>
                  </div>
                  <ol style={{ margin: '4px 0 0', paddingLeft: 22, fontSize: 13 }}>
                    {requiredDocs({ vehicle_mode: c.vehicle_mode, lodging_mode: c.lodging_mode, registration_amount: c.registration_amount, transport_amount: c.transport_amount }).map(x => <li key={x}>{x}</li>)}
                    <li>ใบเสร็จค่าใช้จ่ายที่จ่ายจริงทุกใบ (ทางด่วน ค่าโดยสาร ฯลฯ) {c.report_status !== 'submitted' && <>· <Link href={`${TRAVEL_BASE}/report?id=${c.id}`}>เขียนรายงานการเดินทาง</Link> (ส่งคู่กับการเบิก)</>}</li>
                  </ol>
                </div>
              ))}
            </div>} />
        )}
        {soon && soon.count > 0 && task !== 'soon' && (
          <Alert type="error" showIcon icon={<ClockCircleOutlined />} style={{ marginBottom: 10 }} data-testid="soon-alert"
            title={<span>ใกล้เดินทางแต่ผู้อำนวยการยังไม่อนุมัติ <b>{soon.count}</b> รายการ{soon.overdue > 0 ? <> (เลยวันออกเดินทางแล้ว <b>{soon.overdue}</b>)</> : null}</span>}
            description={isMobile ? undefined : `ออกเดินทางภายใน ${soon.days} วัน — ${isManager ? 'ต้องเร่งติดตามให้ผู้อำนวยการอนุมัติก่อนวันเดินทาง' : 'ติดตามเอกสารให้ผู้อำนวยการอนุมัติก่อนวันเดินทาง'} มิฉะนั้นผู้เดินทางจะไม่มีสิทธิ์เดินทาง`}
            action={scope === 'all' ? <Button size="small" danger onClick={() => pickTask('soon')}>ดูรายการ</Button> : undefined} />
        )}
        {task && scope === 'all' && (
          <Alert type="info" showIcon style={{ marginBottom: 10 }} data-testid="task-filter"
            title={<span>กรองงาน: <b>{HRD_TASKS[task].title}</b></span>}
            description={isMobile ? undefined : HRD_TASKS[task].hint}
            action={<Button size="small" onClick={() => { setTask(null); setPage(1); router.replace(`${TRAVEL_BASE}/requests?tab=all`, { scroll: false }) }}>แสดงทั้งหมด</Button>} />
        )}
        {wide ? (
          <Table<TravelRequest> size="small" rowKey="id" loading={loading} columns={columns} dataSource={data?.rows ?? []} scroll={{ x: 'max-content' }} sticky={{ offsetHeader: 64 }}
            pagination={{ current: page, pageSize: PAGE_SIZE, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false, hideOnSinglePage: true, showTotal: t => `ทั้งหมด ${t} รายการ` }}
            locale={{ emptyText: empty }} />
        ) : (
          // ── มือถือ/แท็บเล็ต: การ์ดทีละคำขอ (แท็บเล็ต 2 คอลัมน์) ──
          <Spin spinning={loading}>
            {!loading && !(data?.rows.length) ? <div style={{ padding: 24 }}>{empty}</div> : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10 }} data-testid="request-cards">
                {(data?.rows ?? []).map(r => (
                  <div key={r.id} className="travel-req-card" data-testid="request-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text code style={{ margin: 0 }}>{requestNo(r.id)}</Text>
                      {r.memo_no && <Text type="secondary" style={{ fontSize: 11 }}>ที่ {MEMO.docPrefix}{r.memo_no}</Text>}
                      <span style={{ marginLeft: 'auto', fontSize: 12.5 }}>{amount(r)}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14.5, margin: '6px 0 2px', ...clamp(2) }} title={r.subject}>{r.subject}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--app-text-2)', ...clamp(2) }}>
                      <span style={{ color: 'var(--app-text)' }}>{requestDates(r)}</span> · {r.location}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--app-text-3)', marginBottom: 6, ...clamp(1) }}>
                      {scope !== 'mine' && <>{r.requester_name} · </>}ผู้เดินทาง {travelersLink(r)}
                    </div>
                    {statusCell(r)}
                    <div style={{ borderTop: '1px solid var(--app-border)', marginTop: 8, paddingTop: 8 }}>{actionBar(r, true)}</div>
                  </div>
                ))}
              </div>
            )}
            {(data?.total ?? 0) > PAGE_SIZE && (
              <Pagination simple={isMobile} current={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} showSizeChanger={false}
                style={{ marginTop: 12, textAlign: 'center', justifyContent: 'center' }} />
            )}
          </Spin>
        )}
      </Card>

      <Modal title={<span><PrinterOutlined style={{ marginRight: 8 }} />บันทึกข้อความขออนุมัติเดินทางไปราชการ — {printing ? requestNo(printing.id) : ''}</span>}
        open={!!printing} onCancel={() => setPrinting(null)} width="92vw" style={{ top: 16 }} styles={{ body: { height: '80vh', padding: 0 } }} footer={null} destroyOnHidden>
        {printing && <TravelRequestPDF data={printing} />}
      </Modal>
      {approveFor && <ApproveModal key={approveFor} id={approveFor} onClose={() => setApproveFor(null)} onSaved={afterAct} onOpenPdf={openPdf} />}
      {reviewFor && <ReviewModal key={reviewFor} id={reviewFor} onClose={() => setReviewFor(null)} onSaved={afterSave} onOpenPdf={openPdf} />}
      {directorFor && <DirectorModal key={directorFor.id} r={directorFor} onClose={() => setDirectorFor(null)} onSaved={afterSave} />}
      {actualFor && <ActualModal key={actualFor.id} r={actualFor} onClose={() => setActualFor(null)} onSaved={afterSave} />}
      {cancelFor && <CancelModal key={cancelFor.id} r={cancelFor} onClose={() => setCancelFor(null)} onSaved={afterSave} />}
      {rescheduleFor && <RescheduleModal key={rescheduleFor.id} r={rescheduleFor} onClose={() => setRescheduleFor(null)} onSaved={afterSave} />}
      {travelersFor && <TravelersModal key={travelersFor.id} r={travelersFor} onClose={() => setTravelersFor(null)} onSaved={afterSave} />}
      {chainFor && <ChainResyncModal key={chainFor.id} r={chainFor} onClose={() => setChainFor(null)} onSaved={afterSave} />}
      {checkFor && <RequestTravelersDrawer key={checkFor} requestId={checkFor} onClose={() => setCheckFor(null)} onOpenPdf={id => { setCheckFor(null); openPdf(id) }} />}
      <style>{`
        .travel-stage-tabs { display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 8px; margin-bottom: 4px; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
        .travel-stage-tabs button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--app-border);
          background: var(--app-surface); color: var(--app-text); font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .travel-stage-tabs button:hover { border-color: var(--app-text-3); }
        .travel-stage-tabs .n { min-width: 20px; padding: 0 6px; border-radius: 999px; background: var(--app-bg); color: var(--app-text-2); font-size: 11.5px; font-weight: 600; text-align: center; }
        .travel-req-card { border: 1px solid var(--app-border); border-radius: 12px; padding: 10px 12px; background: var(--app-surface); min-width: 0; }
      `}</style>
      <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 12 }}>
        ยอดประมาณการในคำขอไม่ตัดงบ — งบถูกตัดเมื่องานพัฒนาทรัพยากรบุคคลบันทึกยอดที่การเงินยืนยันแล้ว{data?.rows.some(r => r.actual_at) ? ` · ยืนยันล่าสุด ${thaiDateTime(data.rows.filter(r => r.actual_at).map(r => r.actual_at!).sort().pop()!)}` : ''}
      </Text>
    </>
  )
}

export default function TravelRequestListPage() {
  return (
    <TravelShell current={TRAVEL_MENU[1].title} fluid>
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>}>
        <RequestsContent />
      </Suspense>
    </TravelShell>
  )
}
