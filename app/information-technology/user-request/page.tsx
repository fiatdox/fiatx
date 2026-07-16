'use client'
import { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react'
import Cookies from 'js-cookie'
import {
  Table, Tag, Card, Typography, Breadcrumb, Button, Form, Input,
  Select, Row, Col, Descriptions, Space, Alert, Spin, Tooltip, App,
  Tabs, Progress, Drawer, Avatar, Dropdown,
} from 'antd'
import {
  HomeOutlined, KeyOutlined, PlusOutlined, EyeOutlined, UserOutlined,
  IdcardOutlined, ReloadOutlined, SafetyCertificateOutlined,
  CheckCircleOutlined, SearchOutlined, UnorderedListOutlined, DashboardOutlined,
  ClockCircleOutlined, ApartmentOutlined, MoreOutlined, CloseCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { FaUserShield, FaHospital, FaBoxes, FaBed, FaBuilding, FaMoneyBillWave, FaWifi } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import EChart from '@/app/components/EChart'
import { AppThemeProvider, useThemeMode } from '@/app/components/ThemeProvider'
import { StatCard, gBtn, type Accent } from '@/app/components/StatCard'

const { Title, Text } = Typography

// ── Types ────────────────────────────────────────────────────────────────────

type ReqStatus = 'pending' | 'issued' | 'rejected' | 'cancelled'

// ผู้ใช้จาก /api/v1/users และ /api/v1/users/{id}/info
interface SystemUser {
  id: number
  id_card?: string
  employee_name?: string
  pname?: string
  fname?: string
  lname?: string
  username?: string
  position_name?: string
  mission_name?: string
  major_name?: string
  submajor_name?: string
  user_type_name?: string
  phone?: string
}

// ระบบที่เปิดให้ขอใช้งาน — จาก GET /systems
interface SystemOption {
  id: number
  system_code: string
  label: string
  icon_key?: string
  color?: string
}

// คำร้อง — จาก GET /api/v1/it/user-requests
interface CredentialRequest {
  id: number
  request_no: string
  request_date: string
  requester_user_id?: number | null
  requester_name: string
  position_name?: string | null
  department?: string | null
  phone?: string | null
  system_id: number
  system_code?: string
  system_name?: string
  purpose?: string | null
  status: ReqStatus
  issued_by?: string | null
  issued_date?: string | null
  notified_at?: string | null
  note?: string | null
}

// แดชบอร์ด — จาก GET /dashboard
interface DashboardData {
  kpi: { total: number; pending: number; issued: number; rejected: number; issued_rate: number }
  by_system: { system_code: string; system_name: string; count: number }[]
  by_department: { department: string; count: number }[]
  by_status: { status: string; count: number }[]
  fiscal_by_system: {
    fiscal_years: number[]
    systems: { system_code: string; system_name: string; data: number[] }[]
    total_line: number[]
  }
}

// ── Master / config ──────────────────────────────────────────────────────────

// map icon_key (จาก backend) → react-icons
const ICON_MAP: Record<string, React.ReactNode> = {
  hospital: <FaHospital />,
  boxes: <FaBoxes />,
  bed: <FaBed />,
  building: <FaBuilding />,
  money: <FaMoneyBillWave />,
  wifi: <FaWifi />,
}

const statusConfig: Record<ReqStatus, { color: string; label: string }> = {
  pending:   { color: 'orange',  label: 'รอออกรหัส' },
  issued:    { color: 'success', label: 'ออกรหัสแล้ว' },
  rejected:  { color: 'error',   label: 'ปฏิเสธ' },
  cancelled: { color: 'default', label: 'ยกเลิก' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (u: SystemUser) =>
  u.employee_name?.trim() || `${u.pname ?? ''}${u.fname ?? ''} ${u.lname ?? ''}`.trim()

// สุ่มรหัสผ่านอ่านง่าย (ช่วยเจ้าหน้าที่ — ไม่มีอักขระกำกวม 0/O, 1/l)
const genPassword = (len = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%'
  let out = ''
  const rnd = typeof crypto !== 'undefined' && crypto.getRandomValues
    ? () => crypto.getRandomValues(new Uint32Array(1))[0]
    : () => Math.floor(Math.random() * 0xffffffff)
  for (let i = 0; i < len; i++) out += chars[rnd() % chars.length]
  return out
}

const fmtDate = (s?: string | null) => {
  if (!s) return '-'
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const fmtDateTime = (s?: string | null) => {
  if (!s) return '-'
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Page content ─────────────────────────────────────────────────────────────

const PageContent = () => {
  const { message, modal } = App.useApp()
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'

  // ผู้ดำเนินการ (จาก cookie login) — ส่งเป็น "id" ของผู้ใช้ ไม่ใช่ชื่อ/username
  const actor = useMemo(() => {
    try {
      const id = JSON.parse(Cookies.get('user_data') || '{}').id
      return id != null ? String(id) : ''
    } catch { return '' }
  }, [])

  const [systems, setSystems] = useState<SystemOption[]>([])
  const [requests, setRequests] = useState<CredentialRequest[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [search, setSearch] = useState('')

  // ── Drawer: ออกรหัสให้คำร้อง ──
  const [issueOpen, setIssueOpen] = useState(false)
  const [selected, setSelected] = useState<CredentialRequest | null>(null)
  const [issueForm] = Form.useForm()
  const [issuing, setIssuing] = useState(false)
  const [requesterDetail, setRequesterDetail] = useState<SystemUser | null>(null)
  const [requesterLoading, setRequesterLoading] = useState(false)

  // ── Drawer: IT เพิ่มเอง ──
  const [addOpen, setAddOpen] = useState(false)
  const [addForm] = Form.useForm()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [pickedUser, setPickedUser] = useState<SystemUser | null>(null)
  const [pickedLoading, setPickedLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  // ── Drawer: ดูรายละเอียด ──
  const [viewOpen, setViewOpen] = useState(false)

  // ── lookup ระบบ ──
  const systemByCode = useMemo(
    () => Object.fromEntries(systems.map(s => [s.system_code, s])) as Record<string, SystemOption>,
    [systems],
  )
  const systemById = useMemo(
    () => Object.fromEntries(systems.map(s => [s.id, s])) as Record<number, SystemOption>,
    [systems],
  )

  const systemSelectOptions = useMemo(() => systems.map(s => ({
    value: s.id,
    label: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: s.color, display: 'inline-flex' }}>{ICON_MAP[s.icon_key ?? ''] }</span>
        {s.label}
      </span>
    ),
  })), [systems])

  const renderSystem = useCallback((r: CredentialRequest) => {
    const meta = (r.system_code && systemByCode[r.system_code]) || systemById[r.system_id]
    const label = r.system_name ?? meta?.label ?? `#${r.system_id}`
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {meta && <span style={{ color: meta.color, display: 'inline-flex' }}>{ICON_MAP[meta.icon_key ?? '']}</span>}
        {label}
      </span>
    )
  }, [systemByCode, systemById])

  // ── โหลดข้อมูลจาก API ──
  const loadSystems = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/it/user-requests/systems')
      const data = await res.json()
      const arr = (data?.data ?? []) as Array<Record<string, unknown>>
      setSystems(arr.map(s => ({
        id: Number(s.id),
        system_code: String(s.system_code ?? ''),
        label: String(s.label ?? s.name_th ?? s.system_code ?? ''),
        icon_key: s.icon_key as string | undefined,
        color: s.color as string | undefined,
      })))
    } catch {
      message.error('โหลดรายการระบบไม่สำเร็จ')
    }
  }, [message])

  const loadRequests = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await fetch('/api/v1/it/user-requests?limit=200&sort=-request_date')
      const data = await res.json()
      setRequests((data?.data ?? []) as CredentialRequest[])
    } catch {
      message.error('โหลดรายการคำร้องไม่สำเร็จ')
    } finally {
      setListLoading(false)
    }
  }, [message])

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/it/user-requests/dashboard')
      const data = await res.json()
      setDashboard((data?.data ?? null) as DashboardData | null)
    } catch {
      // เงียบไว้ — แดชบอร์ดเป็นข้อมูลเสริม
    }
  }, [])

  useEffect(() => {
    void loadSystems()
    void loadRequests()
    void loadDashboard()
  }, [loadSystems, loadRequests, loadDashboard])

  const reloadAll = useCallback(() => {
    void loadRequests()
    void loadDashboard()
  }, [loadRequests, loadDashboard])

  // ── ค้นหา (client-side) ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter(r =>
      r.request_no.toLowerCase().includes(q) ||
      r.requester_name.toLowerCase().includes(q) ||
      (r.department ?? '').toLowerCase().includes(q) ||
      (r.system_name ?? '').toLowerCase().includes(q) ||
      (r.purpose ?? '').toLowerCase().includes(q)
    )
  }, [requests, search])

  // ── สรุปสำหรับ list tab (คำนวณจากรายการที่โหลด) ──
  const summary = useMemo(() => ({
    pending: requests.filter(r => r.status === 'pending').length,
    issued:  requests.filter(r => r.status === 'issued').length,
    total:   requests.length,
  }), [requests])

  const axisBase = {
    axisLine: { lineStyle: { color: 'rgba(148,163,184,0.3)' } },
    axisLabel: { color: '#94a3b8' },
    splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
  }
  const PURPLE = '#a78bfa'
  const SYSTEM_COLORS = ['#a78bfa', '#22d3ee', '#10b981', '#f59e0b', '#f472b6', '#60a5fa', '#fb923c', '#c084fc']

  // ── แดชบอร์ด: chart options (จาก dashboard API) ──
  const statusPieOption = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {
      pending:   { name: 'รอออกรหัส',   color: '#f59e0b' },
      issued:    { name: 'ออกรหัสแล้ว', color: '#10b981' },
      rejected:  { name: 'ปฏิเสธ',       color: '#ef4444' },
      cancelled: { name: 'ยกเลิก',       color: '#94a3b8' },
    }
    const rows = dashboard?.by_status ?? []
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
      series: [{
        type: 'pie', radius: ['55%', '78%'], avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{c}', color: '#64748b' },
        data: rows.map(r => ({
          value: r.count,
          name: map[r.status]?.name ?? r.status,
          itemStyle: { color: map[r.status]?.color ?? '#a78bfa' },
        })),
      }],
    }
  }, [dashboard])

  const systemBarOption = useMemo(() => {
    const rows = [...(dashboard?.by_system ?? [])].sort((a, b) => a.count - b.count)
    return {
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', ...axisBase },
      yAxis: { type: 'category', data: rows.map(r => r.system_name), ...axisBase },
      series: [{
        type: 'bar', barWidth: 16,
        data: rows.map(r => r.count),
        itemStyle: { color: PURPLE, borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right', color: '#64748b' },
      }],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard])

  const deptBarOption = useMemo(() => {
    const rows = [...(dashboard?.by_department ?? [])].sort((a, b) => a.count - b.count).slice(-6)
    return {
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', ...axisBase },
      yAxis: { type: 'category', data: rows.map(r => r.department), ...axisBase },
      series: [{
        type: 'bar', barWidth: 14,
        data: rows.map(r => r.count),
        itemStyle: { color: '#22d3ee', borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right', color: '#64748b' },
      }],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard])

  const fiscalComboOption = useMemo(() => {
    const f = dashboard?.fiscal_by_system
    const years = f?.fiscal_years ?? []
    const sys = f?.systems ?? []
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, type: 'scroll', textStyle: { color: '#94a3b8', fontSize: 11 }, itemWidth: 14, itemHeight: 9, itemGap: 12 },
      grid: { left: 8, right: 12, top: 44, bottom: 6, containLabel: true },
      xAxis: { type: 'category', data: years.map(y => `ปีงบ ${y}`), ...axisBase, axisLabel: { color: '#94a3b8', fontSize: 11 } },
      yAxis: [
        { type: 'value', minInterval: 1, ...axisBase },
        { type: 'value', name: 'รวม', minInterval: 1, position: 'right', axisLine: { lineStyle: { color: 'rgba(148,163,184,0.3)' } }, axisLabel: { color: '#94a3b8' }, splitLine: { show: false } },
      ],
      series: [
        ...sys.map((s, i) => ({
          name: s.system_name, type: 'bar', stack: 'system', barWidth: 26, yAxisIndex: 0,
          data: s.data,
          itemStyle: { color: SYSTEM_COLORS[i % SYSTEM_COLORS.length] },
          emphasis: { focus: 'series' },
        })),
        {
          name: 'จำนวนรวม', type: 'line', smooth: true, yAxisIndex: 1,
          symbol: 'circle', symbolSize: 8,
          data: f?.total_line ?? [],
          lineStyle: { color: '#fbbf24', width: 3 },
          itemStyle: { color: '#fbbf24' },
          label: { show: true, position: 'top', color: '#fbbf24', fontWeight: 700 },
          z: 10,
        },
      ],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard])

  // ── ดึงข้อมูลผู้ขอจาก /info (เพื่อแสดง + เอา id_card ไปทำ citizen_id) ──
  const loadRequester = useCallback(async (userId?: number | null) => {
    setRequesterDetail(null)
    if (userId == null) return
    setRequesterLoading(true)
    try {
      const res = await fetch(`/api/v1/users/${userId}/info`)
      const data = await res.json()
      const u = (data?.data ?? data?.result ?? data) as SystemUser
      if (u && (u.employee_name || u.fname || u.lname || u.id_card)) setRequesterDetail(u)
    } catch {
      // เงียบ — ใช้ snapshot จากคำร้อง
    } finally {
      setRequesterLoading(false)
    }
  }, [])

  const openIssue = (r: CredentialRequest) => {
    setSelected(r)
    issueForm.resetFields()
    setIssueOpen(true)
    void loadRequester(r.requester_user_id)
  }

  const openView = (r: CredentialRequest) => {
    setSelected(r)
    setViewOpen(true)
  }

  // ── ออกรหัส: ส่ง username/password ผ่านหมอพร้อม (ไม่เก็บลง DB) ──
  const handleIssue = () => {
    issueForm.validateFields().then(async values => {
      if (!selected) return
      const citizenId = requesterDetail?.id_card
      if (!citizenId) {
        message.error('ไม่พบเลขบัตรประชาชน (id_card) ของผู้ขอ — ไม่สามารถส่งหมอพร้อมได้')
        return
      }
      setIssuing(true)
      try {
        const res = await fetch(`/api/v1/it/user-requests/${selected.id}/issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: values.username,
            password: values.password,
            morprom_target: { citizen_id: citizenId, user_ref: selected.requester_user_id ?? null },
            issued_by: actor,
            note: values.note,
          }),
        })
        const data = await res.json()
        if (!res.ok || data?.success === false) {
          const msg = data?.error?.message
          message.error(res.status === 502 ? (msg || 'ส่งหมอพร้อมไม่สำเร็จ กรุณาลองใหม่') : (msg || 'ออกรหัสไม่สำเร็จ'))
          return
        }
        message.success(`ออกรหัสและส่งหมอพร้อมให้ ${selected.requester_name} เรียบร้อยแล้ว`)
        setIssueOpen(false)
        reloadAll()
      } catch {
        message.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      } finally {
        setIssuing(false)
      }
    })
  }

  // ── IT เพิ่มเอง ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/v1/users')
      const data = await res.json()
      const arr = (Array.isArray(data) ? data : data?.data ?? data?.result ?? data?.items ?? []) as SystemUser[]
      setUsers(arr)
    } catch {
      message.error('โหลดรายชื่อผู้ใช้ไม่สำเร็จ')
    } finally {
      setUsersLoading(false)
    }
  }, [message])

  const openAdd = () => {
    addForm.resetFields()
    setPickedUser(null)
    setAddOpen(true)
    if (users.length === 0) void loadUsers()
  }

  const onPickUser = async (userId?: number) => {
    if (userId == null) { setPickedUser(null); return }
    setPickedUser(users.find(x => x.id === userId) ?? null)
    setPickedLoading(true)
    try {
      const res = await fetch(`/api/v1/users/${userId}/info`)
      const data = await res.json()
      const u = (data?.data ?? data?.result ?? data) as SystemUser
      if (u && (u.employee_name || u.fname || u.lname || u.id_card)) setPickedUser(u)
    } catch {
      message.error('ดึงข้อมูลบุคลากรไม่สำเร็จ')
    } finally {
      setPickedLoading(false)
    }
  }

  // เพิ่ม: สร้างคำร้อง (POST /) แล้วออกรหัสทันที (POST /:id/issue)
  const handleAdd = () => {
    addForm.validateFields().then(async values => {
      const u = pickedUser ?? users.find(x => x.id === values.userId)
      if (!u) { message.error('กรุณาเลือกบุคลากร'); return }
      if (!u.id_card) {
        message.error('ไม่พบเลขบัตรประชาชน (id_card) ของบุคลากร — ไม่สามารถส่งหมอพร้อมได้')
        return
      }
      setAdding(true)
      try {
        // 1) สร้างคำร้อง
        const createRes = await fetch('/api/v1/it/user-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_user_id: u.id,
            requester_name: fullName(u),
            position_name: u.position_name ?? null,
            department: u.mission_name ?? u.major_name ?? null,
            phone: u.phone ?? null,
            system_id: values.system_id,
            purpose: values.purpose ?? null,
          }),
        })
        const created = await createRes.json()
        if (!createRes.ok || created?.success === false) {
          message.error(created?.error?.message || 'สร้างคำร้องไม่สำเร็จ')
          return
        }
        const newId = created?.data?.id
        // 2) ออกรหัส + ส่งหมอพร้อม
        const issueRes = await fetch(`/api/v1/it/user-requests/${newId}/issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: values.username,
            password: values.password,
            morprom_target: { citizen_id: u.id_card, user_ref: u.id },
            issued_by: actor,
            note: values.purpose ?? null,
          }),
        })
        const issued = await issueRes.json()
        if (!issueRes.ok || issued?.success === false) {
          message.warning(issued?.error?.message
            || 'สร้างคำร้องแล้ว แต่ส่งหมอพร้อมไม่สำเร็จ — ลองออกรหัสซ้ำจากรายการคำร้อง')
          reloadAll()
          setAddOpen(false)
          return
        }
        message.success(`เพิ่มและออกรหัสให้ ${fullName(u)} เรียบร้อยแล้ว`)
        setAddOpen(false)
        reloadAll()
      } catch {
        message.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      } finally {
        setAdding(false)
      }
    })
  }

  // ── ปฏิเสธ / ยกเลิกคำร้อง ──
  const doAction = useCallback(async (r: CredentialRequest, type: 'reject' | 'cancel') => {
    try {
      const res = await fetch(`/api/v1/it/user-requests/${r.id}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor }),
      })
      const data = await res.json()
      if (!res.ok || data?.success === false) {
        message.error(data?.error?.message || 'ดำเนินการไม่สำเร็จ')
        return
      }
      message.success(type === 'reject' ? 'ปฏิเสธคำร้องแล้ว' : 'ยกเลิกคำร้องแล้ว')
      reloadAll()
    } catch {
      message.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    }
  }, [actor, message, reloadAll])

  const confirmAction = (r: CredentialRequest, type: 'reject' | 'cancel') => {
    modal.confirm({
      title: type === 'reject' ? 'ปฏิเสธคำร้องนี้?' : 'ยกเลิกคำร้องนี้?',
      content: `${r.request_no} · ${r.requester_name}`,
      okText: type === 'reject' ? 'ปฏิเสธ' : 'ยกเลิกคำร้อง',
      okButtonProps: { danger: true },
      cancelText: 'ไม่',
      onOk: () => doAction(r, type),
    })
  }

  // ── columns ──
  const columns = [
    {
      title: 'เลขที่คำร้อง', dataIndex: 'request_no', key: 'request_no', width: 150,
      render: (v: string) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>{v}</Text>,
    },
    { title: 'วันที่', dataIndex: 'request_date', key: 'request_date', width: 110, render: (v: string) => fmtDate(v) },
    {
      title: 'ผู้ขอ', key: 'requester',
      render: (_: unknown, r: CredentialRequest) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.requester_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{[r.position_name, r.department].filter(Boolean).join(' · ') || '-'}</Text>
        </div>
      ),
    },
    { title: 'ระบบที่ขอใช้งาน', key: 'system', render: (_: unknown, r: CredentialRequest) => renderSystem(r) },
    {
      title: 'สถานะ', dataIndex: 'status', key: 'status', width: 120,
      render: (v: ReqStatus) => <Tag color={statusConfig[v]?.color}>{statusConfig[v]?.label ?? v}</Tag>,
    },
    {
      title: 'จัดการ', key: 'action', align: 'center' as const, width: 170,
      render: (_: unknown, r: CredentialRequest) => r.status === 'pending' ? (
        <Space size={4}>
          <Button size="small" type="primary" icon={<KeyOutlined />} onClick={() => openIssue(r)}>
            ออกรหัส
          </Button>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'reject', icon: <CloseCircleOutlined />, label: 'ปฏิเสธคำร้อง', danger: true, onClick: () => confirmAction(r, 'reject') },
                { key: 'cancel', icon: <StopOutlined />, label: 'ยกเลิกคำร้อง', onClick: () => confirmAction(r, 'cancel') },
              ],
            }}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ) : (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)}>
          ดูรายละเอียด
        </Button>
      ),
    },
  ]

  // ── แดชบอร์ด ──
  const kpiData = dashboard?.kpi
  const issuedRate = kpiData?.issued_rate ?? 0
  const kpis: { label: string; value: ReactNode; icon: ReactNode; accent: Accent }[] = [
    { label: 'คำร้องทั้งหมด', value: kpiData?.total ?? summary.total,     icon: <UnorderedListOutlined />, accent: 'violet' },
    { label: 'รอออกรหัส',     value: kpiData?.pending ?? summary.pending, icon: <ClockCircleOutlined />,   accent: 'amber' },
    { label: 'ออกรหัสแล้ว',   value: kpiData?.issued ?? summary.issued,   icon: <CheckCircleOutlined />,   accent: 'emerald' },
    { label: 'ปฏิเสธ',        value: kpiData?.rejected ?? 0,              icon: <CloseCircleOutlined />,   accent: 'rose' },
  ]

  const DashboardPanel = () => {
    if (!dashboard) {
      return <div className="flex justify-center items-center" style={{ height: 320 }}><Spin size="large" /></div>
    }
    return (
      <div>
        <Row gutter={[16, 16]} className="mb-6">
          {kpis.map((k, i) => (
            <Col xs={12} md={6} key={i}>
              <StatCard accent={k.accent} isDark={isDark} label={k.label} value={k.value} icon={k.icon} />
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} md={12}>
            <Card
              variant="borderless"
              className="rounded-xl h-full"
              title={<span><DashboardOutlined style={{ color: '#a78bfa', marginRight: 8 }} />สรุปตามปีงบประมาณ (5 ปีย้อนหลัง): ระบบที่ขอ และ จำนวนรวม</span>}
            >
              <EChart option={fiscalComboOption} height={300} showToolbar />
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card variant="borderless" className="rounded-xl h-full" title={<span><SafetyCertificateOutlined style={{ color: '#a78bfa', marginRight: 8 }} />อัตราการออกรหัส</span>}>
              <div className="flex flex-col items-center justify-center h-full" style={{ paddingTop: 8 }}>
                <Progress
                  type="dashboard"
                  percent={Math.round(issuedRate)}
                  strokeColor={{ '0%': '#a78bfa', '100%': '#10b981' }}
                  format={(p) => <span style={{ color: '#10b981', fontWeight: 700 }}>{p}%</span>}
                />
                <Text type="secondary" className="mt-2 text-center">
                  ออกรหัสแล้ว {kpiData?.issued ?? 0} จาก {kpiData?.total ?? 0} คำร้อง
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card variant="borderless" className="rounded-xl h-full" title="สัดส่วนสถานะคำร้อง">
              <EChart option={statusPieOption} height={300} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card variant="borderless" className="rounded-xl h-full" title={<span><ApartmentOutlined style={{ color: '#a78bfa', marginRight: 8 }} />คำร้องตามระบบที่ขอใช้งาน</span>}>
              <EChart option={systemBarOption} height={Math.max(240, (dashboard.by_system?.length ?? 0) * 36)} />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card variant="borderless" className="rounded-xl h-full" title={<span><UserOutlined style={{ color: '#22d3ee', marginRight: 8 }} />หน่วยงานที่ขอมากที่สุด</span>}>
              <EChart option={deptBarOption} height={Math.max(240, Math.min(6, dashboard.by_department?.length ?? 0) * 38)} />
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: 'งานคอมพิวเตอร์และเทคโนโลยีสารสนเทศ' },
            { title: 'ขอรหัสผู้ใช้งานระบบ' },
          ]}
          className="mb-6"
        />

        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <Title level={2} className="m-0" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a78bfa' }}>
              <FaUserShield /> ขอรหัสผู้ใช้งานระบบ
            </Title>
            <Text type="secondary">ออกบัญชีผู้ใช้ให้บุคลากร — ส่ง username / password ผ่านหมอพร้อม (ไม่บันทึกรหัสในระบบ)</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="large" style={gBtn('#7c3aed', '#a855f7')} className="transition-all duration-200 hover:-translate-y-px hover:brightness-110" onClick={openAdd}>
            เพิ่ม (IT ออกรหัสเอง)
          </Button>
        </div>

        <Tabs
          defaultActiveKey="list"
          size="large"
          items={[
            {
              key: 'list',
              label: <span><UnorderedListOutlined /> รายการคำร้อง</span>,
              children: (
                <>
                  <Row gutter={16} className="mb-6">
                    {[
                      { label: 'รอออกรหัส',   count: summary.pending, color: '#f59e0b' },
                      { label: 'ออกรหัสแล้ว', count: summary.issued,  color: '#10b981' },
                      { label: 'ทั้งหมด',     count: summary.total,   color: '#7c3aed' },
                    ].map((s, i) => (
                      <Col xs={8} key={i}>
                        <Card variant="borderless" className="rounded-xl text-center">
                          <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.count}</div>
                          <Text type="secondary">{s.label}</Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>

                  <Card variant="borderless" className="rounded-xl">
                    <div className="mb-4 flex items-center gap-2" style={{ maxWidth: 480 }}>
                      <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="ค้นหา เลขที่คำร้อง / ชื่อ / หน่วยงาน / ระบบ / วัตถุประสงค์"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                      <Tooltip title="โหลดใหม่">
                        <Button icon={<ReloadOutlined />} onClick={() => loadRequests()} />
                      </Tooltip>
                    </div>
                    <Table
                      columns={columns}
                      dataSource={filtered}
                      rowKey="id"
                      loading={listLoading}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1000 }}
                    />
                  </Card>
                </>
              ),
            },
            {
              key: 'dashboard',
              label: <span><DashboardOutlined /> แดชบอร์ด</span>,
              children: <DashboardPanel />,
            },
          ]}
        />
      </div>

      {/* ─── Drawer: ออกรหัสให้คำร้อง ─── */}
      <Drawer
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg"
              style={{ width: 36, height: 36, backgroundColor: '#7c3aed20', color: '#a78bfa' }}>
              <KeyOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>ออกรหัสผู้ใช้งาน</div>
              <Text type="secondary" style={{ fontSize: 12 }}>คำร้อง {selected?.request_no}</Text>
            </div>
          </div>
        }
        size="large"
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        styles={{ body: { paddingBottom: 80 } }}
        extra={
          <Space>
            <Button onClick={() => setIssueOpen(false)}>ยกเลิก</Button>
            <Button type="primary" icon={<SafetyCertificateOutlined />} loading={issuing} onClick={handleIssue}>
              ออกรหัส + ส่งหมอพร้อม
            </Button>
          </Space>
        }
      >
        {selected && (
          <>
            <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3">
              <Space size={6}><UserOutlined /> ข้อมูลผู้ขอ {requesterLoading && <Spin size="small" />}</Space>
            </div>
            <Card
              variant="borderless"
              className="rounded-xl mb-4"
              styles={{ body: { padding: 16 } }}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar size={48} style={{ backgroundColor: '#7c3aed' }} icon={<UserOutlined />} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {requesterDetail ? fullName(requesterDetail) : selected.requester_name}
                  </div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {requesterDetail?.position_name ?? selected.position_name ?? '-'}
                  </Text>
                </div>
              </div>
              <Descriptions column={1} size="small" styles={{ label: { width: 110 } }}>
                <Descriptions.Item label="ระบบที่ขอ">{renderSystem(selected)}</Descriptions.Item>
                <Descriptions.Item label="หน่วยงาน">
                  {requesterDetail?.mission_name ?? requesterDetail?.major_name ?? selected.department ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="เบอร์โทร">{requesterDetail?.phone ?? selected.phone ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="วัตถุประสงค์">{selected.purpose ?? '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Alert
              type="info" showIcon className="mb-4"
              title="กรอก username / password ที่สร้างไว้ในระบบปลายทาง"
              description="ระบบจะส่งให้ผู้ใช้ผ่านหมอพร้อมทันที — ไม่มีการบันทึกรหัสผ่านลงฐานข้อมูล"
            />

            <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3">รายละเอียดการออกรหัส</div>
            <Form form={issueForm} layout="vertical" requiredMark="optional">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="username" label="Username" rules={[{ required: true, message: 'กรุณากำหนด username' }]}>
                    <Input prefix={<IdcardOutlined />} placeholder="เช่น somsri.r" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="password" label="Password" rules={[{ required: true, message: 'กรุณากำหนด password' }]}>
                    <Input
                      prefix={<KeyOutlined />}
                      placeholder="รหัสผ่านที่ตั้งให้ผู้ใช้"
                      suffix={
                        <Tooltip title="สุ่มรหัสผ่าน">
                          <ReloadOutlined onClick={() => issueForm.setFieldValue('password', genPassword())} style={{ cursor: 'pointer', color: '#a78bfa' }} />
                        </Tooltip>
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="note" label="หมายเหตุ (ถ้ามี)">
                <Input.TextArea rows={2} placeholder="เช่น สิทธิ์การใช้งาน / ข้อกำหนดเพิ่มเติม" />
              </Form.Item>
            </Form>
          </>
        )}
      </Drawer>

      {/* ─── Drawer: IT เพิ่มเอง ─── */}
      <Drawer
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg"
              style={{ width: 36, height: 36, backgroundColor: '#7c3aed20', color: '#a78bfa' }}>
              <PlusOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>เพิ่มและออกรหัสผู้ใช้งาน</div>
              <Text type="secondary" style={{ fontSize: 12 }}>โดยเจ้าหน้าที่ไอที</Text>
            </div>
          </div>
        }
        size="large"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        styles={{ body: { paddingBottom: 80 } }}
        extra={
          <Space>
            <Button onClick={() => setAddOpen(false)}>ยกเลิก</Button>
            <Button type="primary" icon={<SafetyCertificateOutlined />} loading={adding} onClick={handleAdd}>
              บันทึก + ส่งหมอพร้อม
            </Button>
          </Space>
        }
      >
        <Form form={addForm} layout="vertical" requiredMark="optional">
          <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3">เลือกบุคลากร</div>
          <Form.Item name="userId" label="ค้นหาบุคลากร (ดึงข้อมูลจากระบบ)" rules={[{ required: true, message: 'กรุณาเลือกบุคลากร' }]}>
            <Select
              showSearch
              allowClear
              loading={usersLoading}
              placeholder="พิมพ์ชื่อ-นามสกุลเพื่อค้นหา"
              onChange={onPickUser}
              onClear={() => setPickedUser(null)}
              filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              notFoundContent={usersLoading ? <Spin size="small" /> : 'ไม่พบข้อมูล'}
              options={users.map(u => {
                const dept = u.mission_name ?? u.major_name
                return {
                  value: u.id,
                  label: `${fullName(u)}${u.position_name ? ' · ' + u.position_name : ''}${dept ? ' · ' + dept : ''}`,
                }
              })}
            />
          </Form.Item>

          {pickedUser && (
            <Card
              variant="borderless"
              className="rounded-xl mb-4"
              styles={{ body: { padding: 16 } }}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar size={48} style={{ backgroundColor: '#7c3aed' }} icon={<UserOutlined />} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {fullName(pickedUser)}
                    {pickedLoading && <Spin size="small" style={{ marginLeft: 8 }} />}
                  </div>
                  <Text type="secondary" style={{ fontSize: 13 }}>{pickedUser.position_name ?? '-'}</Text>
                </div>
              </div>
              <Descriptions column={1} size="small" styles={{ label: { width: 110 } }}>
                <Descriptions.Item label="ภารกิจ/สังกัด">{pickedUser.mission_name ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="กลุ่มงาน">{pickedUser.major_name ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="ตำแหน่ง">{pickedUser.position_name ?? '-'}</Descriptions.Item>
                {pickedUser.submajor_name && <Descriptions.Item label="งาน">{pickedUser.submajor_name}</Descriptions.Item>}
                <Descriptions.Item label="ประเภทบุคลากร">{pickedUser.user_type_name ?? '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3 mt-2">รายละเอียดการออกรหัส</div>
          <Form.Item name="system_id" label="ระบบที่ขอใช้งาน" rules={[{ required: true, message: 'กรุณาเลือกระบบ' }]}>
            <Select options={systemSelectOptions} optionLabelProp="label" allowClear placeholder="เลือกระบบ" />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="username" label="Username" rules={[{ required: true, message: 'กรุณากำหนด username' }]}>
                <Input prefix={<IdcardOutlined />} placeholder="เช่น somsri.r" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="password" label="Password" rules={[{ required: true, message: 'กรุณากำหนด password' }]}>
                <Input
                  prefix={<KeyOutlined />}
                  placeholder="รหัสผ่านที่ตั้งให้ผู้ใช้"
                  suffix={
                    <Tooltip title="สุ่มรหัสผ่าน">
                      <ReloadOutlined onClick={() => addForm.setFieldValue('password', genPassword())} style={{ cursor: 'pointer', color: '#a78bfa' }} />
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="purpose" label="วัตถุประสงค์ / หมายเหตุ">
            <Input.TextArea rows={2} placeholder="เช่น ออกรหัสให้บุคลากรใหม่" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ─── Drawer: ดูรายละเอียดคำร้อง ─── */}
      <Drawer
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg"
              style={{ width: 36, height: 36, backgroundColor: '#10b98120', color: '#10b981' }}>
              <CheckCircleOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>รายละเอียดคำร้อง</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{selected?.requester_name}</Text>
            </div>
          </div>
        }
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        size="large"
        styles={{ body: { paddingBottom: 80 } }}
        extra={<Button onClick={() => setViewOpen(false)}>ปิด</Button>}
      >
        {selected && (
          <>
            {selected.status === 'issued' && (
              <Alert
                type="success" showIcon className="mb-4"
                title="ออกรหัสและแจ้งผ่านหมอพร้อมแล้ว"
                description={`ส่งเมื่อ ${fmtDateTime(selected.notified_at)} · ไม่มีการเก็บรหัสผ่านในระบบ`}
              />
            )}
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="เลขที่คำร้อง">{selected.request_no}</Descriptions.Item>
              <Descriptions.Item label="วันที่ยื่น">{fmtDate(selected.request_date)}</Descriptions.Item>
              <Descriptions.Item label="ผู้ขอ">{selected.requester_name}</Descriptions.Item>
              <Descriptions.Item label="ตำแหน่ง">{selected.position_name ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{selected.department ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="ระบบที่ใช้งาน">{renderSystem(selected)}</Descriptions.Item>
              <Descriptions.Item label="วัตถุประสงค์">{selected.purpose ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="สถานะ"><Tag color={statusConfig[selected.status]?.color}>{statusConfig[selected.status]?.label}</Tag></Descriptions.Item>
              {selected.status === 'issued' && (
                <>
                  <Descriptions.Item label="ออกรหัสโดย">{selected.issued_by ?? '-'} · {fmtDate(selected.issued_date)}</Descriptions.Item>
                  <Descriptions.Item label="แจ้งหมอพร้อมเมื่อ">{fmtDateTime(selected.notified_at)}</Descriptions.Item>
                </>
              )}
              {selected.note && <Descriptions.Item label="หมายเหตุ">{selected.note}</Descriptions.Item>}
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  )
}

const UserRequestPage = () => (
  <AppThemeProvider colorPrimary="#7c3aed">
    <PageContent />
  </AppThemeProvider>
)

export default UserRequestPage
