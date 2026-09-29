'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, App,
  Button, Modal, Form, Input, Steps, Timeline, Descriptions,
  Row, Col, Divider, Space, Alert, Avatar, Calendar, Segmented, Tabs,
  Result, Skeleton, Empty, Badge,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  HomeOutlined, FileTextOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, AuditOutlined,
  EyeOutlined, UserOutlined, CalendarOutlined, UnorderedListOutlined,
  RollbackOutlined, CheckSquareOutlined, SearchOutlined, ReloadOutlined,
  SolutionOutlined, HourglassOutlined,
} from '@ant-design/icons'
import { FaUmbrellaBeach, FaUserMd, FaBriefcase, FaBaby } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography

type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'waiting'

// หน่วยที่ผู้ใช้เป็นหัวหน้า/รักษาการ — ใช้ตัดสินสิทธิ์เข้าหน้าอนุมัติการลา
type SupervisedUnit = { id: number; name: string; is_primary: boolean }
interface ApproverAccess {
  is_approver: boolean
  is_director: boolean
  is_admin: boolean
  missions: SupervisedUnit[]
  majors: SupervisedUnit[]
  submajors: SupervisedUnit[]
}

interface ApprovalStep {
  level: string
  actor: string
  status: ApprovalStatus
  timestamp?: string
  note?: string
}

/** ขั้นที่ "ฉัน" อยู่ในสายอนุมัติของใบนี้ — หัวหน้าคนเดียวถือหลายหมวกได้ จึงต้องบอกว่าใบนี้ใช้หมวกใบไหน */
interface MyStep {
  step: number
  level_name: string
  unit_name: string | null
  is_acting: boolean
}

interface LeaveApprovalRequest {
  id: string
  employeeName: string
  shortName: string
  department: string
  position: string
  leaveType: string
  startISO: string
  endISO: string
  totalDays: number
  reason: string
  color: string
  approvalChain: ApprovalStep[]
  myStep: MyStep | null
  waitingOnMe: boolean
  pendingLevel: string | null
}

interface LeaveCancelRequest {
  id: string
  refLeaveId: string
  employeeName: string
  department: string
  leaveType: string
  startISO: string
  endISO: string
  totalDays: number
  cancelReason: string
  approvalChain: ApprovalStep[]
  myStep: MyStep | null
  waitingOnMe: boolean
  pendingLevel: string | null
}

// ─── Helper: สถานะรวม ───────────────────────────────────────────────────────
const getOverall = (chain: ApprovalStep[]): ApprovalStatus => {
  if (chain.some(s => s.status === 'rejected')) return 'rejected'
  if (chain.length > 0 && chain.every(s => s.status === 'approved')) return 'approved'
  return 'pending'
}

const getCurrentStep = (chain: ApprovalStep[]): number => {
  const idx = chain.findIndex(s => s.status === 'pending')
  return idx === -1 ? chain.length : idx
}

const isOnLeave = (date: Dayjs, r: LeaveApprovalRequest) => {
  const d = date.format('YYYY-MM-DD')
  return d >= r.startISO && d <= r.endISO
}

const fmtThai = (iso: string) =>
  dayjs(iso).locale('th').format('DD/MM/') + String(dayjs(iso).year() + 543)

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#7c3aed', '#ef4444', '#ec4899', '#14b8a6', '#f97316']

// ─── แปลงใบลาจาก API เป็นรูปแบบที่หน้าจอนี้ใช้ ──────────────────────────────
// สถานะรายขั้นคำนวณจาก current_step ของใบ ไม่ได้เก็บไว้ในฐานข้อมูล
//   ขั้น < current_step = ผ่านแล้ว · = current_step = กำลังรอ · > = ยังไม่ถึงคิว
interface ApiChainStep {
  step: number
  level_name: string
  approver_name: string
  is_acting: boolean
  unit_name: string | null
}

interface ApiLeaveRequest {
  id: number
  employee_name: string
  position_name: string | null
  submajor_name: string | null
  major_name: string | null
  mission_name: string | null
  leave_type_name: string
  start_date: string
  end_date: string
  total_days: string | number
  reason: string | null
  reject_reason: string | null
  status: string
  current_step: number
  approval_chain: ApiChainStep[] | null
  /** ขั้นของผู้เรียกในสายอนุมัติใบนี้ (มาจาก jsonb อาจเป็นสตริง) */
  my_step?: ApiChainStep | string | null
  actions?: { step: number; action: string; comment: string | null; actioned_at: string }[]
  cancellation_id?: number | null
  cancellation_status?: string | null
  cancellation_reason?: string | null
}

const thaiStamp = (v?: string | null) =>
  v ? dayjs(v).locale('th').format('DD/MM/') + String(dayjs(v).year() + 543) + dayjs(v).format(' HH:mm') : undefined

const dateOnly = (v: string) => dayjs(v).format('YYYY-MM-DD')

/** คอลัมน์ jsonb อ่านกลับมาเป็นออบเจกต์หรือสตริงก็ได้ แล้วแต่บริบทของไดรเวอร์ */
const parseStep = (raw: unknown): ApiChainStep | null => {
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as ApiChainStep } catch { return null }
  }
  return raw as ApiChainStep
}

const toMyStep = (raw: unknown): MyStep | null => {
  const s = parseStep(raw)
  if (!s) return null
  return {
    step: Number(s.step),
    level_name: s.level_name,
    unit_name: s.unit_name ?? null,
    is_acting: Boolean(s.is_acting),
  }
}

const buildChain = (r: ApiLeaveRequest): ApprovalStep[] => {
  const chain = r.approval_chain ?? []
  const actionOf = (step: number) => r.actions?.find(a => Number(a.step) === Number(step))
  return chain.map(c => {
    const act = actionOf(c.step)
    let status: ApprovalStatus = 'waiting'
    if (act) status = act.action === 'REJECTED' ? 'rejected' : 'approved'
    else if (r.status === 'PENDING' && Number(c.step) === Number(r.current_step)) status = 'pending'
    else if (r.status === 'CANCELLED' || r.status === 'REJECTED') status = 'waiting'
    else if (Number(c.step) < Number(r.current_step)) status = 'approved'
    return {
      level: `${c.level_name}${c.is_acting ? ' (รักษาการ)' : ''}`,
      actor: `${c.approver_name}${c.unit_name ? ` — ${c.unit_name}` : ''}`,
      status,
      timestamp: thaiStamp(act?.actioned_at),
      note: act?.comment ?? undefined,
    }
  })
}

const pendingLevelOf = (chain: ApprovalStep[]) =>
  chain.find(s => s.status === 'pending')?.level ?? null

const toRequest = (r: ApiLeaveRequest, i: number): LeaveApprovalRequest => {
  const approvalChain = buildChain(r)
  const myStep = toMyStep(r.my_step)
  const nameParts = String(r.employee_name ?? '').trim().split(' ')
  return {
    id: `LV-${String(r.id).padStart(6, '0')}`,
    employeeName: r.employee_name,
    shortName: nameParts[nameParts.length - 1] || r.employee_name,
    department: r.submajor_name || r.major_name || r.mission_name || '-',
    position: r.position_name || '-',
    leaveType: r.leave_type_name,
    startISO: dateOnly(r.start_date),
    endISO: dateOnly(r.end_date),
    totalDays: Number(r.total_days),
    reason: r.reason || '-',
    color: COLORS[i % COLORS.length],
    approvalChain,
    myStep,
    // กดได้ก็ต่อเมื่อใบยังรออนุมัติ และขั้นที่ค้างอยู่เป็นขั้นของเราเท่านั้น
    waitingOnMe: r.status === 'PENDING' && myStep != null && myStep.step === Number(r.current_step),
    pendingLevel: pendingLevelOf(approvalChain),
  }
}

/**
 * ใบที่อยู่ระหว่างขอยกเลิก — เดินสายอนุมัติชุดเดิมอีกรอบ จึงอ่าน current_step ตัวเดียวกัน
 * แต่ actions ของรอบยกเลิกผูกกับ cancellation_id ไม่ใช่ request_id จึงยังไม่มี timestamp
 * ของรอบนี้ส่งมากับใบ ใช้ current_step ตัดสินสถานะรายขั้นแทน
 */
const toCancelRequest = (r: ApiLeaveRequest): LeaveCancelRequest => {
  const chain = r.approval_chain ?? []
  const myStep = toMyStep(r.my_step)
  const approvalChain: ApprovalStep[] = chain.map(c => ({
    level: `${c.level_name}${c.is_acting ? ' (รักษาการ)' : ''}`,
    actor: `${c.approver_name}${c.unit_name ? ` — ${c.unit_name}` : ''}`,
    status: Number(c.step) < Number(r.current_step)
      ? 'approved'
      : Number(c.step) === Number(r.current_step) ? 'pending' : 'waiting',
  }))
  return {
    id: `CL-${String(r.cancellation_id ?? r.id).padStart(6, '0')}`,
    refLeaveId: `LV-${String(r.id).padStart(6, '0')}`,
    employeeName: r.employee_name,
    department: r.submajor_name || r.major_name || r.mission_name || '-',
    leaveType: r.leave_type_name,
    startISO: dateOnly(r.start_date),
    endISO: dateOnly(r.end_date),
    totalDays: Number(r.total_days),
    cancelReason: r.cancellation_reason || '-',
    approvalChain,
    myStep,
    waitingOnMe: myStep != null && myStep.step === Number(r.current_step),
    pendingLevel: pendingLevelOf(approvalChain),
  }
}

// ─── Tag Helpers ──────────────────────────────────────────────────────────────
const leaveTypeColor: Record<string, string> = {
  'ลาป่วย': 'volcano', 'ลาพักผ่อน': 'green', 'ลากิจ': 'blue', 'ลาคลอด': 'magenta',
}
const leaveTypeIcon: Record<string, React.ReactNode> = {
  'ลาป่วย': <FaUserMd className="inline mr-1" />,
  'ลาพักผ่อน': <FaUmbrellaBeach className="inline mr-1" />,
  'ลากิจ': <FaBriefcase className="inline mr-1" />,
  'ลาคลอด': <FaBaby className="inline mr-1" />,
}
/** ชื่อประเภทในฐานข้อมูลขึ้นต้นด้วย "การลา" — ตัดออกให้แท็กสั้นลง */
const shortType = (name: string) => (name || '').replace(/^การลา/, 'ลา').trim() || 'ไม่ระบุ'

const statusTag = (s: ApprovalStatus) => {
  if (s === 'approved') return <Tag icon={<CheckCircleOutlined />} color="success">อนุมัติ</Tag>
  if (s === 'rejected') return <Tag icon={<CloseCircleOutlined />} color="error">ไม่อนุมัติ</Tag>
  if (s === 'pending') return <Tag icon={<ClockCircleOutlined />} color="warning">รออนุมัติ</Tag>
  return <Tag color="default">รอคิว</Tag>
}

const overallTag = (s: ApprovalStatus) => {
  if (s === 'approved') return <Tag color="success">อนุมัติครบทุกระดับ</Tag>
  if (s === 'rejected') return <Tag icon={<CloseCircleOutlined />} color="error">ไม่อนุมัติ</Tag>
  return <Tag icon={<ClockCircleOutlined />} color="processing">อยู่ระหว่างอนุมัติ</Tag>
}

/** แท็ก "หมวก" ที่ใช้พิจารณาใบนี้ — สำคัญกับคนที่เป็นหัวหน้าหลายระดับพร้อมกัน */
const myStepTag = (s: MyStep | null) => {
  if (!s) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
  return (
    <div style={{ lineHeight: 1.35 }}>
      <Text style={{ fontSize: 12, fontWeight: 600 }}>
        {s.level_name}{s.is_acting && <Text type="secondary" style={{ fontSize: 11 }}> (รักษาการ)</Text>}
      </Text>
      {s.unit_name && <div style={{ fontSize: 11, color: 'var(--app-text-2)' }}>{s.unit_name}</div>}
    </div>
  )
}

const initial = (name: string) =>
  name.replace(/^(นาย|นาง|นางสาว|น\.ส\.|ดร\.|พญ\.|นพ\.|ทพ\.|ภก\.)\s*/, '').charAt(0)

type FilterKey = 'mine' | 'inprogress' | 'approved' | 'rejected' | 'all'

// ─── Main Component ───────────────────────────────────────────────────────────
const LeaveApprovalContent = () => {
  const { message } = App.useApp()
  const [activeMainTab, setActiveMainTab] = useState<string>('approve')

  // ── สิทธิ์เข้าหน้านี้: ต้องเป็นหัวหน้า/รักษาการ กลุ่มภารกิจ · กลุ่มงาน · หน่วยงาน (หรือ ผอ./ADMIN) ──
  const [access, setAccess] = useState<ApproverAccess | null>(null)
  const [accessLoading, setAccessLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const j = await (await fetch('/api/v1/hr/leave-approver-check')).json()
        if (alive && j?.success) setAccess(j.data)
      } catch { /* ปล่อยให้เป็น null = ไม่มีสิทธิ์ */ }
      finally { if (alive) setAccessLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [])

  // ── อนุมัติลา (ข้อมูลจริงจาก API) ──
  const [requests, setRequests] = useState<LeaveApprovalRequest[]>([])
  const [cancelRequests, setCancelRequests] = useState<LeaveCancelRequest[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [selected, setSelected] = useState<LeaveApprovalRequest | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterKey>('mine')
  const [keyword, setKeyword] = useState('')
  const [view, setView] = useState<string>('list')
  const [calMonth, setCalMonth] = useState<Dayjs>(dayjs())
  const [rejectForm] = Form.useForm()

  const [selectedCancel, setSelectedCancel] = useState<LeaveCancelRequest | null>(null)
  const [cancelRejectMode, setCancelRejectMode] = useState(false)
  const [cancelRejectForm] = Form.useForm()

  // scope=all = เห็นทั้งใบที่รอเราและใบที่เราเคยกดไปแล้ว จะได้ดูย้อนหลังได้ในหน้าเดียว
  const reload = useCallback(async () => {
    setListLoading(true)
    try {
      const json = await (await fetch('/api/v1/hr/leave-requests/pending-approval?scope=all')).json()
      if (json?.success && Array.isArray(json.data)) {
        const rows: ApiLeaveRequest[] = json.data
        setRequests(rows.filter(r => r.status !== 'CANCEL_PENDING').map(toRequest))
        setCancelRequests(rows.filter(r => r.status === 'CANCEL_PENDING').map(toCancelRequest))
      } else {
        setRequests([])
        setCancelRequests([])
      }
    } catch {
      setRequests([])
      setCancelRequests([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  /** id ที่ใช้เรียก API — หน้าจอโชว์เป็น LV-000123 แต่ API ใช้ตัวเลขล้วน */
  const apiIdOf = (display: string) => Number(display.replace(/\D/g, ''))

  const openDetail = (record: LeaveApprovalRequest) => {
    setSelected(record)
    setRejectMode(false)
    rejectForm.resetFields()
  }

  /** ยิง API แล้วโหลดรายการใหม่ — ไม่แก้สถานะในหน้าจอเอง ให้ฐานข้อมูลเป็นตัวตัดสิน */
  const act = async (path: string, body: Record<string, unknown>, okMsg: string) => {
    if (!selected) return
    setActing(true)
    try {
      const res = await fetch(`/api/v1/hr/leave-requests/${apiIdOf(selected.id)}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json?.success) {
        message.error(json?.message ?? 'ทำรายการไม่สำเร็จ')
        return
      }
      message.success(json.message ?? okMsg)
      setSelected(null)
      setRejectMode(false)
      rejectForm.resetFields()
      await reload()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setActing(false)
    }
  }

  const handleApprove = () => act('approve', { comment: 'อนุมัติ' }, 'อนุมัติเรียบร้อย')

  const handleReject = () => {
    rejectForm.validateFields().then(values => act('reject', { comment: values.reason }, 'บันทึกการไม่อนุมัติแล้ว'))
  }

  const actCancel = async (path: 'approve' | 'reject', body: Record<string, unknown>) => {
    if (!selectedCancel) return
    setActing(true)
    try {
      const res = await fetch(`/api/v1/hr/leave-requests/${apiIdOf(selectedCancel.refLeaveId)}/cancel/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json?.success) {
        message.error(json?.message ?? 'ทำรายการไม่สำเร็จ')
        return
      }
      message.success(json.message ?? 'บันทึกเรียบร้อย')
      setSelectedCancel(null)
      setCancelRejectMode(false)
      cancelRejectForm.resetFields()
      await reload()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setActing(false)
    }
  }

  const handleCancelApprove = () => actCancel('approve', { comment: 'อนุมัติการยกเลิก' })

  const handleCancelReject = () => {
    cancelRejectForm.validateFields().then(values => actCancel('reject', { comment: values.reason }))
  }

  // ── สรุปยอด ────────────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    mine: requests.filter(r => r.waitingOnMe).length,
    inprogress: requests.filter(r => !r.waitingOnMe && getOverall(r.approvalChain) === 'pending').length,
    approved: requests.filter(r => getOverall(r.approvalChain) === 'approved').length,
    rejected: requests.filter(r => getOverall(r.approvalChain) === 'rejected').length,
  }), [requests])

  const cancelWaitingOnMe = useMemo(
    () => cancelRequests.filter(r => r.waitingOnMe).length,
    [cancelRequests],
  )

  const matchKeyword = useCallback((r: { employeeName: string; department: string; id: string }) => {
    const k = keyword.trim().toLowerCase()
    if (!k) return true
    return r.employeeName.toLowerCase().includes(k)
      || r.department.toLowerCase().includes(k)
      || r.id.toLowerCase().includes(k)
  }, [keyword])

  const displayed = useMemo(() => requests.filter(r => {
    if (!matchKeyword(r)) return false
    const overall = getOverall(r.approvalChain)
    switch (filterStatus) {
      case 'mine': return r.waitingOnMe
      case 'inprogress': return !r.waitingOnMe && overall === 'pending'
      case 'approved': return overall === 'approved'
      case 'rejected': return overall === 'rejected'
      default: return true
    }
  }), [requests, filterStatus, matchKeyword])

  const displayedCancels = useMemo(
    () => cancelRequests.filter(matchKeyword),
    [cancelRequests, matchKeyword],
  )

  // ─── Calendar: จัดเลน (lane) ให้ใบลาแต่ละใบมีแถวคงที่ตลอดทั้งเดือน ───────────
  // เพื่อให้บาร์ของใบลาต่อเนื่อง "ลากยาว" ข้ามวันโดยอยู่แถวเดิม (ไม่สลับขึ้นลง)
  const laneInfo = useMemo(() => {
    const sorted = [...requests].sort(
      (a, b) => a.startISO.localeCompare(b.startISO) || a.endISO.localeCompare(b.endISO)
    )
    const laneEnd: string[] = []          // endISO ล่าสุดของแต่ละเลน
    const map: Record<string, number> = {}
    for (const r of sorted) {
      let lane = laneEnd.findIndex(end => end < r.startISO)   // เลนแรกที่ว่าง
      if (lane === -1) { lane = laneEnd.length; laneEnd.push(r.endISO) }
      else laneEnd[lane] = r.endISO
      map[r.id] = lane
    }
    return map
  }, [requests])

  // ─── Calendar: render บาร์วันลาแบบต่อเนื่องในแต่ละ cell ──────────────────────
  const cellRender = (date: Dayjs) => {
    if (date.month() !== calMonth.month()) return null
    const ds = date.format('YYYY-MM-DD')
    const active = requests.filter(r => ds >= r.startISO && ds <= r.endISO)
    if (!active.length) return null

    const byLane: Record<number, LeaveApprovalRequest> = {}
    active.forEach(r => { byLane[laneInfo[r.id]] = r })
    const maxLane = Math.max(...active.map(r => laneInfo[r.id]))
    const dow = date.day()   // 0 = อาทิตย์, 6 = เสาร์

    const rows = []
    for (let i = 0; i <= maxLane; i++) {
      const r = byLane[i]
      if (!r) { rows.push(<div key={i} style={{ height: 16 }} />); continue }   // spacer คงแถว
      const isStart = ds === r.startISO
      const isEnd = ds === r.endISO
      const openLeft = isStart || dow === 0   // ต้นใบลา หรือ ต้นสัปดาห์
      const openRight = isEnd || dow === 6   // ปลายใบลา หรือ ปลายสัปดาห์
      rows.push(
        <div
          key={i}
          style={{
            backgroundColor: r.color,
            height: 16,
            lineHeight: '16px',
            padding: '0 5px',
            fontSize: 10,
            color: '#fff',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            cursor: 'pointer',
            // ลากบาร์ให้ชนขอบ cell เพื่อต่อกันข้ามวัน (เปิดด้านที่ยังลาต่อ)
            marginLeft: openLeft ? 0 : -9,
            marginRight: openRight ? 0 : -9,
            borderTopLeftRadius: openLeft ? 3 : 0,
            borderBottomLeftRadius: openLeft ? 3 : 0,
            borderTopRightRadius: openRight ? 3 : 0,
            borderBottomRightRadius: openRight ? 3 : 0,
            outline: r.waitingOnMe ? '1px solid #fff' : undefined,
          }}
          onClick={(e) => { e.stopPropagation(); openDetail(r) }}
          title={`${r.employeeName} — ${shortType(r.leaveType)} (${fmtThai(r.startISO)} – ${fmtThai(r.endISO)})`}
        >
          {openLeft ? r.shortName : ' '}
        </div>
      )
    }
    return <div className="flex flex-col gap-0.5 mt-0.5">{rows}</div>
  }

  // เพื่อนร่วมงานที่ลาทับช่วงเวลาเดียวกัน (ใช้ใน modal)
  const getOverlapping = (target: LeaveApprovalRequest) =>
    requests.filter(r =>
      r.id !== target.id &&
      r.department === target.department &&   // เฉพาะหน่วยงานเดียวกัน
      r.startISO <= target.endISO &&
      r.endISO >= target.startISO
    )

  // ─── คอลัมน์ร่วม ────────────────────────────────────────────────────────────
  const personColumn = (titleText: string) => ({
    title: titleText, dataIndex: 'employeeName', key: 'employeeName', width: 250,
    render: (v: string, r: { position?: string; department: string; color?: string }) => (
      <Space size={8} align="start">
        <Avatar size={26} style={{ background: r.color ?? '#64748b', fontSize: 12, flexShrink: 0 }}>
          {initial(v)}
        </Avatar>
        <div style={{ lineHeight: 1.35 }}>
          <Text strong style={{ fontSize: 13 }}>{v}</Text>
          <div style={{ fontSize: 11, color: 'var(--app-text-2)' }}>
            {r.position && r.position !== '-' ? `${r.position} · ` : ''}{r.department}
          </div>
        </div>
      </Space>
    ),
  })

  const periodColumn = (badgeColor: string) => ({
    title: 'ช่วงวันที่', key: 'date', width: 210,
    render: (_: unknown, r: { startISO: string; endISO: string; totalDays: number }) => (
      <div style={{ lineHeight: 1.35 }}>
        <div style={{ fontSize: 12 }}>{fmtThai(r.startISO)} – {fmtThai(r.endISO)}</div>
        <Tag color={badgeColor} style={{ marginInlineEnd: 0, fontSize: 11 }}>{r.totalDays} วัน</Tag>
      </div>
    ),
  })

  const chainColumn = {
    title: 'ความคืบหน้า', key: 'chain', width: 300,
    render: (_: unknown, r: { approvalChain: ApprovalStep[]; waitingOnMe: boolean; pendingLevel: string | null }) => {
      const overall = getOverall(r.approvalChain)
      return (
        <div>
          <Steps
            size="small"
            current={getCurrentStep(r.approvalChain)}
            status={overall === 'rejected' ? 'error' : overall === 'approved' ? 'finish' : 'process'}
            items={r.approvalChain.map(s => ({
              title: <span style={{ fontSize: 11 }}>{s.level.replace('หัวหน้า', 'หน.')}</span>,
              status: s.status === 'approved' ? 'finish'
                : s.status === 'rejected' ? 'error'
                  : s.status === 'pending' ? 'process'
                    : 'wait',
            }))}
          />
          <div style={{ marginTop: 4 }}>
            {r.waitingOnMe
              ? <Tag color="warning" icon={<HourglassOutlined />} style={{ marginInlineEnd: 0 }}>รอท่านพิจารณา</Tag>
              : overall === 'pending'
                ? <Text type="secondary" style={{ fontSize: 11 }}>รอ{r.pendingLevel ?? 'ขั้นถัดไป'}</Text>
                : overallTag(overall)}
          </div>
        </div>
      )
    },
  }

  // ─── Table columns: อนุมัติลา ───────────────────────────────────────────────
  const columns = [
    personColumn('ผู้ขอลา'),
    {
      title: 'ประเภท', dataIndex: 'leaveType', key: 'leaveType', width: 140,
      render: (v: string) => (
        <Tag color={leaveTypeColor[shortType(v)] ?? 'default'} style={{ marginInlineEnd: 0 }}>
          {leaveTypeIcon[shortType(v)]}{shortType(v)}
        </Tag>
      ),
    },
    periodColumn('green'),
    {
      title: 'ท่านพิจารณาในฐานะ', key: 'myStep', width: 170,
      render: (_: unknown, r: LeaveApprovalRequest) => myStepTag(r.myStep),
    },
    chainColumn,
    {
      title: 'จัดการ', key: 'action', align: 'center' as const, width: 110, fixed: 'right' as const,
      render: (_: unknown, record: LeaveApprovalRequest) => (
        <Button
          size="small"
          type={record.waitingOnMe ? 'primary' : 'default'}
          icon={<EyeOutlined />}
          onClick={() => openDetail(record)}
        >
          {record.waitingOnMe ? 'พิจารณา' : 'ดู'}
        </Button>
      ),
    },
  ]

  // ─── Table columns: ยกเลิกลา ────────────────────────────────────────────────
  const cancelColumns = [
    personColumn('ผู้ขอยกเลิก'),
    {
      title: 'ใบลาที่ขอยกเลิก', key: 'ref', width: 190,
      render: (_: unknown, r: LeaveCancelRequest) => (
        <div style={{ lineHeight: 1.35 }}>
          <Space size={6}>
            <RollbackOutlined style={{ color: '#f59e0b' }} />
            <Text style={{ fontSize: 12, fontWeight: 600 }}>{r.refLeaveId}</Text>
          </Space>
          <div>
            <Tag color={leaveTypeColor[shortType(r.leaveType)] ?? 'default'} style={{ marginInlineEnd: 0, fontSize: 11 }}>
              {shortType(r.leaveType)}
            </Tag>
          </div>
        </div>
      ),
    },
    periodColumn('orange'),
    { title: 'เหตุผลการยกเลิก', dataIndex: 'cancelReason', key: 'cancelReason', ellipsis: true },
    {
      title: 'ท่านพิจารณาในฐานะ', key: 'myStep', width: 170,
      render: (_: unknown, r: LeaveCancelRequest) => myStepTag(r.myStep),
    },
    chainColumn,
    {
      title: 'จัดการ', key: 'action', align: 'center' as const, width: 110, fixed: 'right' as const,
      render: (_: unknown, record: LeaveCancelRequest) => (
        <Button
          size="small"
          type={record.waitingOnMe ? 'primary' : 'default'}
          icon={<EyeOutlined />}
          onClick={() => { setSelectedCancel(record); setCancelRejectMode(false); cancelRejectForm.resetFields() }}
        >
          {record.waitingOnMe ? 'พิจารณา' : 'ดู'}
        </Button>
      ),
    },
  ]

  // ─── Gate: ไม่ใช่หัวหน้าหน่วยใด = เข้าหน้านี้ไม่ได้ ────────────────────────
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text">
        <Navbar />
        <div className="p-4 md:p-6"><Skeleton active paragraph={{ rows: 6 }} /></div>
      </div>
    )
  }

  if (!access?.is_approver) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text">
        <Navbar />
        <div className="p-4 md:p-6">
          <Result
            status="403"
            title="ไม่มีสิทธิ์เข้าถึงหน้านี้"
            subTitle="หน้าอนุมัติการลาสงวนไว้สำหรับหัวหน้าหรือรักษาการหัวหน้ากลุ่มภารกิจ กลุ่มงาน และหน่วยงานเท่านั้น หากท่านได้รับแต่งตั้งแล้วแต่ยังเข้าไม่ได้ กรุณาติดต่อฝ่ายบุคคลเพื่อตรวจสอบการบันทึกข้อมูลหัวหน้าหน่วย"
            extra={<Button type="primary" href="/hr/leave">ไปหน้ายื่นคำขอลา</Button>}
          />
        </div>
      </div>
    )
  }

  // ป้ายบอกขอบเขตที่ผู้ใช้ดูแล — คนเดียวถือได้หลายหมวกพร้อมกัน
  const scopeTags = [
    ...(access.is_director ? [{ key: 'dir', label: 'ผู้อำนวยการ', color: 'red' }] : []),
    ...access.missions.map(u => ({ key: `mi-${u.id}`, label: `กลุ่มภารกิจ: ${u.name}${u.is_primary ? '' : ' (รักษาการ)'}`, color: 'purple' })),
    ...access.majors.map(u => ({ key: `ma-${u.id}`, label: `กลุ่มงาน: ${u.name}${u.is_primary ? '' : ' (รักษาการ)'}`, color: 'blue' })),
    ...access.submajors.map(u => ({ key: `sm-${u.id}`, label: `หน่วยงาน: ${u.name}${u.is_primary ? '' : ' (รักษาการ)'}`, color: 'cyan' })),
  ]

  const statCards: { key: FilterKey; label: string; sub: string; value: number; color: string; icon: React.ReactNode }[] = [
    { key: 'mine', label: 'รอท่านพิจารณา', sub: 'กดได้ทันที', value: summary.mine, color: '#f59e0b', icon: <HourglassOutlined /> },
    { key: 'inprogress', label: 'รอขั้นอื่น', sub: 'ท่านผ่านแล้ว หรือยังไม่ถึงคิว', value: summary.inprogress, color: '#0ea5e9', icon: <ClockCircleOutlined /> },
    { key: 'approved', label: 'อนุมัติครบแล้ว', sub: 'ครบทุกระดับ', value: summary.approved, color: '#10b981', icon: <CheckCircleOutlined /> },
    { key: 'rejected', label: 'ไม่อนุมัติ', sub: 'จบที่ขั้นใดขั้นหนึ่ง', value: summary.rejected, color: '#ef4444', icon: <CloseCircleOutlined /> },
  ]

  const emptyText = filterStatus === 'mine'
    ? <Empty description="ไม่มีใบลาที่รอท่านพิจารณา" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    : <Empty description="ไม่มีรายการในเงื่อนไขที่เลือก" image={Empty.PRESENTED_IMAGE_SIMPLE} />

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-6">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบบริหารการลา</> },
            { title: 'อนุมัติการลา' },
          ]}
          className="mb-4"
        />

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={3} className="m-0">อนุมัติการลา</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              พิจารณาใบลาของบุคลากรตามสายบังคับบัญชา — ระบบจะแสดงเฉพาะใบที่ท่านอยู่ในสายอนุมัติ
            </Text>
          </div>
          <Space size={8}>
            {summary.mine + cancelWaitingOnMe > 0 && (
              <Tag icon={<HourglassOutlined />} color="warning" style={{ fontSize: 13, padding: '4px 10px' }}>
                รอท่านพิจารณา {summary.mine + cancelWaitingOnMe} ใบ
              </Tag>
            )}
            <Button icon={<ReloadOutlined />} loading={listLoading} onClick={reload}>รีเฟรช</Button>
          </Space>
        </div>

        {/* ── หมวกที่ท่านถืออยู่ ─────────────────────────────────────────────── */}
        {scopeTags.length > 0 && (
          <Card variant="borderless" className="mb-3 shadow-sm" styles={{ body: { padding: 14 } }}>
            <div className="flex flex-wrap items-center gap-2">
              <Text type="secondary" style={{ fontSize: 12 }}>
                <SolutionOutlined /> ขอบเขตที่ท่านดูแล
              </Text>
              {scopeTags.map(t => (
                <Tag key={t.key} color={t.color} style={{ marginInlineEnd: 0 }}>{t.label}</Tag>
              ))}
              {scopeTags.length > 1 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  · ท่านเป็นหัวหน้าหลายระดับ ใบลาแต่ละใบจะบอกว่าท่านพิจารณาในฐานะใด
                </Text>
              )}
            </div>
          </Card>
        )}

        <Tabs
          activeKey={activeMainTab}
          onChange={setActiveMainTab}
          type="card"
          className="mb-3"
          items={[
            {
              key: 'approve',
              label: (
                <span>
                  <CheckSquareOutlined className="mr-1" />อนุมัติลา
                  {summary.mine > 0 && <Badge count={summary.mine} size="small" offset={[6, -8]} />}
                </span>
              ),
            },
            {
              key: 'cancel',
              label: (
                <span>
                  <RollbackOutlined className="mr-1" />ยกเลิกลา
                  {cancelWaitingOnMe > 0 && <Badge count={cancelWaitingOnMe} size="small" offset={[6, -8]} />}
                </span>
              ),
            },
          ]}
        />

        {/* ══ TAB: อนุมัติลา ══ */}
        {activeMainTab === 'approve' && <>
          {/* การ์ดสถิติ — กดเพื่อกรอง */}
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statCards.map(s => {
              const on = filterStatus === s.key
              return (
                <Card
                  key={s.key}
                  variant="borderless"
                  className="rounded-xl shadow-sm cursor-pointer"
                  styles={{ body: { padding: 16 } }}
                  style={{
                    outline: on ? `2px solid ${s.color}` : '2px solid transparent',
                    transition: 'outline-color .15s ease',
                  }}
                  onClick={() => setFilterStatus(on ? 'all' : s.key)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>
                      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, color: s.color }}>{s.value}</div>
                      <Text type="secondary" style={{ fontSize: 11 }}>{s.sub}</Text>
                    </div>
                    <span style={{
                      color: s.color, background: `${s.color}1f`, borderRadius: 10,
                      width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{s.icon}</span>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* ตัวกรอง */}
          <Card variant="borderless" className="mb-3 shadow-sm" styles={{ body: { padding: 14 } }}>
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                value={filterStatus}
                onChange={v => setFilterStatus(v as FilterKey)}
                options={[
                  { value: 'mine', label: `รอท่านพิจารณา (${summary.mine})` },
                  { value: 'inprogress', label: 'รอขั้นอื่น' },
                  { value: 'approved', label: 'อนุมัติแล้ว' },
                  { value: 'rejected', label: 'ไม่อนุมัติ' },
                  { value: 'all', label: 'ทั้งหมด' },
                ]}
              />
              <Input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                allowClear
                prefix={<SearchOutlined />}
                placeholder="ค้นหาชื่อ · หน่วยงาน · เลขที่ใบลา"
                style={{ width: 280 }}
              />
              <div className="ml-auto">
                <Segmented
                  value={view}
                  onChange={v => setView(v as string)}
                  options={[
                    { label: <span><UnorderedListOutlined className="mr-1" />รายการ</span>, value: 'list' },
                    { label: <span><CalendarOutlined className="mr-1" />ปฏิทิน</span>, value: 'calendar' },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <Card
              variant="borderless"
              className="rounded-xl shadow-sm"
              title={<span style={{ fontSize: 15, fontWeight: 600 }}>รายการใบลา</span>}
              extra={<Tag>{displayed.length} รายการ</Tag>}
            >
              <Table
                columns={columns}
                dataSource={displayed}
                rowKey="id"
                loading={listLoading}
                size="small"
                pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `ทั้งหมด ${t} รายการ` }}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText }}
                rowClassName={r => r.waitingOnMe ? 'leave-row-mine' : ''}
              />
            </Card>
          )}

          {/* ── CALENDAR VIEW ── */}
          {view === 'calendar' && (
            <Row gutter={12}>
              <Col xs={24} xl={18}>
                <Card variant="borderless" className="rounded-xl shadow-sm overflow-hidden">
                  <Calendar
                    className="leave-cal"
                    value={calMonth}
                    onPanelChange={v => setCalMonth(v)}
                    cellRender={cellRender}
                    style={{ background: 'transparent' }}
                  />
                </Card>
              </Col>

              <Col xs={24} xl={6}>
                <Card
                  variant="borderless"
                  className="rounded-xl shadow-sm"
                  title={<span style={{ fontSize: 13 }}>ผู้ลาในเดือนนี้</span>}
                >
                  {(() => {
                    const mStart = calMonth.startOf('month').format('YYYY-MM-DD')
                    const mEnd = calMonth.endOf('month').format('YYYY-MM-DD')
                    const inMonth = requests.filter(r => r.startISO <= mEnd && r.endISO >= mStart)
                    if (inMonth.length === 0) return <Empty description="ไม่มีการลาในเดือนนี้" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    return inMonth.map(r => (
                      <div
                        key={r.id}
                        className="flex items-start gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openDetail(r)}
                      >
                        <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: r.color, flexShrink: 0, marginTop: 3 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{r.employeeName}</div>
                          <div style={{ fontSize: 11, color: 'var(--app-text-2)' }}>
                            {shortType(r.leaveType)} · {fmtThai(r.startISO)}–{fmtThai(r.endISO)}
                          </div>
                          <div style={{ marginTop: 2 }}>
                            {r.waitingOnMe
                              ? <Tag color="warning" style={{ marginInlineEnd: 0 }}>รอท่านพิจารณา</Tag>
                              : overallTag(getOverall(r.approvalChain))}
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </Card>
              </Col>
            </Row>
          )}
        </>}

        {/* ══ TAB: ยกเลิกลา ══ */}
        {activeMainTab === 'cancel' && (
          <>
            <Card variant="borderless" className="mb-3 shadow-sm" styles={{ body: { padding: 14 } }}>
              <div className="flex flex-wrap items-center gap-3">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  คำขอยกเลิกใบลาที่อนุมัติไปแล้ว — ต้องเดินสายอนุมัติชุดเดิมอีกรอบ
                </Text>
                <Input
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="ค้นหาชื่อ · หน่วยงาน · เลขที่"
                  style={{ width: 280, marginInlineStart: 'auto' }}
                />
              </div>
            </Card>
            <Card
              variant="borderless"
              className="rounded-xl shadow-sm"
              title={<span style={{ fontSize: 15, fontWeight: 600 }}>คำขอยกเลิกการลา</span>}
              extra={<Tag>{displayedCancels.length} รายการ</Tag>}
            >
              <Table
                columns={cancelColumns}
                dataSource={displayedCancels}
                rowKey="id"
                loading={listLoading}
                size="small"
                pagination={{ pageSize: 15, showTotal: t => `ทั้งหมด ${t} รายการ` }}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: <Empty description="ไม่มีคำขอยกเลิกการลา" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                rowClassName={r => r.waitingOnMe ? 'leave-row-mine' : ''}
              />
            </Card>
          </>
        )}
      </div>

      {/* ─── Modal พิจารณา (อนุมัติลา) ─── */}
      <Modal
        title={<span><AuditOutlined className="mr-2" />พิจารณาใบลา: {selected?.id}</span>}
        open={!!selected}
        onCancel={() => { setSelected(null); setRejectMode(false) }}
        width="80%"
        footer={null}
      >
        {selected && (() => {
          const overall = getOverall(selected.approvalChain)
          const step = getCurrentStep(selected.approvalChain)
          const pendingIdx = selected.approvalChain.findIndex(s => s.status === 'pending')
          // กดได้เฉพาะเมื่อขั้นที่ค้างอยู่เป็นขั้นของเราเอง — ขั้นของคนอื่นดูได้อย่างเดียว
          const canAct = selected.waitingOnMe && pendingIdx !== -1
          const overlapping = getOverlapping(selected)

          return (
            <div className="mt-4">
              {selected.myStep && (
                <Alert
                  type={canAct ? 'warning' : 'info'}
                  showIcon
                  className="mb-4"
                  title={canAct
                    ? `ท่านพิจารณาใบนี้ในฐานะ${selected.myStep.level_name}${selected.myStep.is_acting ? ' (รักษาการ)' : ''}`
                    : `ท่านอยู่ในสายอนุมัติใบนี้ในฐานะ${selected.myStep.level_name}${selected.myStep.is_acting ? ' (รักษาการ)' : ''}`}
                  description={[
                    selected.myStep.unit_name ? `หน่วย: ${selected.myStep.unit_name}` : null,
                    canAct
                      ? 'ใบนี้รอการตัดสินใจของท่านอยู่'
                      : overall === 'pending'
                        ? `ขณะนี้รอ${selected.pendingLevel ?? 'ขั้นถัดไป'} — ท่านยังกดไม่ได้`
                        : 'ใบนี้จบกระบวนการแล้ว',
                  ].filter(Boolean).join(' · ')}
                />
              )}

              {/* Steps */}
              <Steps
                current={step}
                status={overall === 'rejected' ? 'error' : overall === 'approved' ? 'finish' : 'process'}
                items={selected.approvalChain.map(s => ({ title: s.level, content: s.actor }))}
                className="mb-6"
              />

              {/* Details */}
              <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small" className="mb-4">
                <Descriptions.Item label="ผู้ขอลา"><UserOutlined className="mr-1" />{selected.employeeName}</Descriptions.Item>
                <Descriptions.Item label="หน่วยงาน">{selected.department}</Descriptions.Item>
                <Descriptions.Item label="ตำแหน่ง">{selected.position}</Descriptions.Item>
                <Descriptions.Item label="ประเภทการลา">
                  <Tag color={leaveTypeColor[shortType(selected.leaveType)] ?? 'default'}>
                    {leaveTypeIcon[shortType(selected.leaveType)]}{selected.leaveType}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="วันที่ลา">{fmtThai(selected.startISO)} – {fmtThai(selected.endISO)}</Descriptions.Item>
                <Descriptions.Item label="จำนวนวัน">
                  <Text style={{ color: '#10b981', fontWeight: 700 }}>{selected.totalDays} วัน</Text>
                </Descriptions.Item>
                <Descriptions.Item label="เหตุผล" span={{ xs: 1, sm: 2, md: 3 }}>{selected.reason}</Descriptions.Item>
              </Descriptions>

              {/* ── ปฏิทินช่วงวันลา + เพื่อนร่วมงาน ── */}
              <Divider style={{ borderColor: 'var(--app-border-strong)' }}>
                <CalendarOutlined className="mr-2" />เปรียบเทียบวันลากับเพื่อนร่วมงาน
              </Divider>

              {overlapping.length > 0 ? (
                <>
                  <Alert
                    title={`มีเจ้าหน้าที่ ${overlapping.length} คน ลาทับช่วงเวลาเดียวกัน`}
                    type="warning"
                    showIcon
                    className="mb-4"
                  />
                  {/* Visual date strip */}
                  <div className="mb-4 overflow-x-auto">
                    {(() => {
                      const start = dayjs(selected.startISO)
                      const end = dayjs(selected.endISO)
                      // แสดงช่วง ±3 วันรอบๆ
                      const dispStart = start.subtract(3, 'day')
                      const dispEnd = end.add(3, 'day')
                      const days: Dayjs[] = []
                      let cur = dispStart
                      while (!cur.isAfter(dispEnd)) { days.push(cur); cur = cur.add(1, 'day') }
                      const allPeople = [selected, ...overlapping]
                      return (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ borderCollapse: 'collapse', minWidth: days.length * 44 }}>
                            <thead>
                              <tr>
                                <td style={{ width: 120, fontSize: 11, color: 'var(--app-text-2)', paddingRight: 8, whiteSpace: 'nowrap' }}>ชื่อเจ้าหน้าที่</td>
                                {days.map(d => (
                                  <td key={d.format('YYYYMMDD')} style={{ width: 40, textAlign: 'center', fontSize: 10, color: 'var(--app-text-2)', padding: '2px 2px 6px' }}>
                                    <div style={{ fontWeight: d.isSame(dayjs(), 'day') ? 700 : 400 }}>{d.format('D')}</div>
                                    <div style={{ color: 'var(--app-text-3)', fontSize: 9 }}>{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][d.day()]}</div>
                                  </td>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {allPeople.map(p => (
                                <tr key={p.id}>
                                  <td style={{ fontSize: 11, color: p.id === selected.id ? 'var(--app-text)' : 'var(--app-text-2)', paddingRight: 8, fontWeight: p.id === selected.id ? 700 : 400, whiteSpace: 'nowrap' }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: p.color, marginRight: 5 }} />
                                    {p.shortName}
                                  </td>
                                  {days.map(d => {
                                    const onL = isOnLeave(d, p)
                                    const isSel = p.id === selected.id
                                    return (
                                      <td key={d.format('YYYYMMDD')} style={{ padding: '2px', textAlign: 'center' }}>
                                        {onL && (
                                          <div style={{
                                            height: 22,
                                            borderRadius: 4,
                                            backgroundColor: p.color,
                                            opacity: isSel ? 1 : 0.6,
                                            border: isSel ? `2px solid ${p.color}` : 'none',
                                            boxShadow: isSel ? `0 0 6px ${p.color}60` : 'none',
                                          }} />
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </div>

                  {/* รายชื่อที่ทับ */}
                  <div className="flex flex-col gap-2">
                    {overlapping.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: r.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 13 }}>{r.employeeName}</Text>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{r.department}</Text>
                        </div>
                        <Tag color={leaveTypeColor[shortType(r.leaveType)] ?? 'default'} style={{ fontSize: 11 }}>{shortType(r.leaveType)}</Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>{fmtThai(r.startISO)}–{fmtThai(r.endISO)}</Text>
                        {overallTag(getOverall(r.approvalChain))}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Alert title="ไม่มีเพื่อนร่วมงานลาทับช่วงเวลาเดียวกัน" type="success" showIcon className="mb-2" />
              )}

              {/* Timeline */}
              <Divider style={{ borderColor: 'var(--app-border-strong)' }}>ประวัติการอนุมัติ</Divider>
              <Timeline
                items={selected.approvalChain.map(s => ({
                  color: s.status === 'approved' ? 'green' : s.status === 'rejected' ? 'red' : s.status === 'pending' ? 'blue' : 'gray',
                  content: (
                    <div>
                      <Text strong>{s.level}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{s.timestamp}</Text>
                      <div><Text type="secondary">{s.actor}</Text><span className="mx-2">—</span>{statusTag(s.status)}</div>
                      {s.note && s.note !== 'อนุมัติ' && <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 2 }}>{s.note}</div>}
                    </div>
                  ),
                }))}
              />

              {/* Action Zone */}
              <Divider style={{ borderColor: 'var(--app-border-strong)' }}>การดำเนินการ</Divider>

              {canAct && !rejectMode && (
                <Alert
                  title="ใบลานี้รอการพิจารณาของท่าน"
                  description={`ขั้นที่ ${selected.myStep?.step} · ${selected.approvalChain[pendingIdx].actor}`}
                  type="warning" showIcon className="mb-0"
                  action={
                    <Space orientation="vertical">
                      <Button block type="primary" icon={<CheckCircleOutlined />} loading={acting} onClick={handleApprove}>อนุมัติ</Button>
                      <Button block danger icon={<CloseCircleOutlined />} disabled={acting} onClick={() => setRejectMode(true)}>ไม่อนุมัติ</Button>
                    </Space>
                  }
                />
              )}

              {canAct && rejectMode && (
                <Form form={rejectForm} layout="vertical">
                  <Form.Item name="reason" label="เหตุผลที่ไม่อนุมัติ" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
                    <Input.TextArea rows={3} placeholder="ระบุเหตุผล..." />
                  </Form.Item>
                  <Space>
                    <Button danger icon={<CloseCircleOutlined />} loading={acting} onClick={handleReject}>ยืนยันการปฏิเสธ</Button>
                    <Button onClick={() => setRejectMode(false)}>ยกเลิก</Button>
                  </Space>
                </Form>
              )}

              {!canAct && overall === 'pending' && (
                <Alert
                  title={`ขณะนี้รอ${selected.pendingLevel ?? 'ขั้นถัดไป'}พิจารณา`}
                  description={`ผู้รับผิดชอบขั้นนี้: ${pendingIdx !== -1 ? selected.approvalChain[pendingIdx].actor : '-'}`}
                  type="info" showIcon
                />
              )}
              {!canAct && overall === 'approved' && <Alert title="อนุมัติครบทุกระดับแล้ว" type="success" showIcon />}
              {!canAct && overall === 'rejected' && (
                <Alert
                  title="คำขอนี้ถูกปฏิเสธ"
                  description={selected.approvalChain.find(s => s.status === 'rejected')?.note}
                  type="error" showIcon
                />
              )}
            </div>
          )
        })()}
      </Modal>

      {/* ─── Modal พิจารณา (ยกเลิกลา) ─── */}
      <Modal
        title={<span><RollbackOutlined className="mr-2" />พิจารณายกเลิกลา: {selectedCancel?.id}</span>}
        open={!!selectedCancel}
        onCancel={() => { setSelectedCancel(null); setCancelRejectMode(false) }}
        width="60%"
        footer={null}
      >
        {selectedCancel && (() => {
          const overall = getOverall(selectedCancel.approvalChain)
          const step = getCurrentStep(selectedCancel.approvalChain)
          const pendingIdx = selectedCancel.approvalChain.findIndex(s => s.status === 'pending')
          const canAct = selectedCancel.waitingOnMe && pendingIdx !== -1

          return (
            <div className="mt-4">
              {selectedCancel.myStep && (
                <Alert
                  type={canAct ? 'warning' : 'info'}
                  showIcon
                  className="mb-4"
                  title={`ท่านพิจารณาคำขอนี้ในฐานะ${selectedCancel.myStep.level_name}${selectedCancel.myStep.is_acting ? ' (รักษาการ)' : ''}`}
                  description={canAct
                    ? 'คำขอยกเลิกนี้รอการตัดสินใจของท่านอยู่'
                    : `ขณะนี้รอ${selectedCancel.pendingLevel ?? 'ขั้นถัดไป'} — ท่านยังกดไม่ได้`}
                />
              )}

              <Steps
                current={step}
                status={overall === 'rejected' ? 'error' : overall === 'approved' ? 'finish' : 'process'}
                items={selectedCancel.approvalChain.map(s => ({ title: s.level, content: s.actor }))}
                className="mb-6"
              />

              <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small" className="mb-4">
                <Descriptions.Item label="ผู้ขอยกเลิก"><UserOutlined className="mr-1" />{selectedCancel.employeeName}</Descriptions.Item>
                <Descriptions.Item label="หน่วยงาน">{selectedCancel.department}</Descriptions.Item>
                <Descriptions.Item label="อ้างอิงใบลา"><Text strong>{selectedCancel.refLeaveId}</Text></Descriptions.Item>
                <Descriptions.Item label="ประเภทการลา">
                  <Tag color={leaveTypeColor[shortType(selectedCancel.leaveType)] ?? 'default'}>
                    {leaveTypeIcon[shortType(selectedCancel.leaveType)]}{selectedCancel.leaveType}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="วันที่ขอยกเลิก">{fmtThai(selectedCancel.startISO)} – {fmtThai(selectedCancel.endISO)}</Descriptions.Item>
                <Descriptions.Item label="จำนวนวัน">
                  <Text style={{ color: '#f59e0b', fontWeight: 700 }}>{selectedCancel.totalDays} วัน</Text>
                </Descriptions.Item>
                <Descriptions.Item label="เหตุผลการยกเลิก" span={{ xs: 1, sm: 2 }}>{selectedCancel.cancelReason}</Descriptions.Item>
              </Descriptions>

              <Divider style={{ borderColor: 'var(--app-border-strong)' }}>ประวัติการอนุมัติ</Divider>
              <Timeline
                items={selectedCancel.approvalChain.map(s => ({
                  color: s.status === 'approved' ? 'green' : s.status === 'rejected' ? 'red' : s.status === 'pending' ? 'blue' : 'gray',
                  content: (
                    <div>
                      <Text strong>{s.level}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{s.timestamp}</Text>
                      <div><Text type="secondary">{s.actor}</Text><span className="mx-2">—</span>{statusTag(s.status)}</div>
                      {s.note && <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 2 }}>{s.note}</div>}
                    </div>
                  ),
                }))}
              />

              <Divider style={{ borderColor: 'var(--app-border-strong)' }}>การดำเนินการ</Divider>

              {canAct && !cancelRejectMode && (
                <Alert
                  title="คำขอยกเลิกนี้รอการพิจารณาของท่าน"
                  description={`ขั้นที่ ${selectedCancel.myStep?.step} · ${selectedCancel.approvalChain[pendingIdx].actor}`}
                  type="warning" showIcon className="mb-0"
                  action={
                    <Space orientation="vertical">
                      <Button block type="primary" icon={<CheckCircleOutlined />} loading={acting} onClick={handleCancelApprove}>อนุมัติยกเลิก</Button>
                      <Button block danger icon={<CloseCircleOutlined />} disabled={acting} onClick={() => setCancelRejectMode(true)}>ไม่อนุมัติ</Button>
                    </Space>
                  }
                />
              )}

              {canAct && cancelRejectMode && (
                <Form form={cancelRejectForm} layout="vertical">
                  <Form.Item name="reason" label="เหตุผลที่ไม่อนุมัติยกเลิก" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
                    <Input.TextArea rows={3} placeholder="ระบุเหตุผล..." />
                  </Form.Item>
                  <Space>
                    <Button danger icon={<CloseCircleOutlined />} loading={acting} onClick={handleCancelReject}>ยืนยันการปฏิเสธ</Button>
                    <Button onClick={() => setCancelRejectMode(false)}>ยกเลิก</Button>
                  </Space>
                </Form>
              )}

              {!canAct && overall === 'pending' && (
                <Alert
                  title={`ขณะนี้รอ${selectedCancel.pendingLevel ?? 'ขั้นถัดไป'}พิจารณา`}
                  type="info" showIcon
                />
              )}
              {!canAct && overall === 'approved' && <Alert title="อนุมัติยกเลิกลาครบทุกระดับแล้ว" type="success" showIcon />}
              {!canAct && overall === 'rejected' && (
                <Alert
                  title="คำขอยกเลิกลาถูกปฏิเสธ"
                  description={selectedCancel.approvalChain.find(s => s.status === 'rejected')?.note}
                  type="error" showIcon
                />
              )}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

const LeaveApprovalPage = () => (
  <AppThemeProvider colorPrimary="#10b981">
    <LeaveApprovalContent />
  </AppThemeProvider>
)

export default LeaveApprovalPage
