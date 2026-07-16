'use client'
import React, { useState, useEffect, useMemo } from 'react'
import {
  Button, Card, Tag, Avatar, Drawer, Input, Breadcrumb,
  Table, Empty, Tooltip, Select, Row, Col, Typography, App, Tabs, Badge, Spin,
  ConfigProvider
} from 'antd'
import {
  SearchOutlined, UserOutlined, HomeOutlined, PlusOutlined,
  ApartmentOutlined, CrownOutlined, DeleteOutlined, SwapOutlined,
  AlertOutlined, TeamOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import { FaUsersCog, FaSitemap } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider, useThemeMode } from '@/app/components/ThemeProvider'

const { Text, Title } = Typography

// จำนวนตัวอักษรขั้นต่ำก่อนเริ่มค้นหา + จำนวนผลลัพธ์สูงสุดที่เรนเดอร์ต่อครั้ง
const MIN_SEARCH = 3
const MAX_SHOWN = 50

// map prefix ของ slotKey → entity ของ API (m=ภารกิจ, w=กลุ่มงาน, u=หน่วยงาน)
const SLOT_API: Record<string, string> = { m: 'missions', w: 'majors', u: 'submajors' }

// ── Types ──────────────────────────────────────────────────────────────────────

interface UserInfo {
  id: number
  pname: string
  fname: string
  lname: string
  position?: string
  userType?: string
}

interface Mission {
  id: number
  mission_name: string
  supervisor_id?: number | null
  acting_supervisor_id?: number | null
}

interface Major {
  id: number
  major_name: string
  mission_id?: number
  mission_name?: string
  supervisor_id?: number | null
  acting_supervisor_id?: number | null
}

interface Submajor {
  id: number
  major_name: string
  major_id?: number
  mission_id?: number
  submajor_name?: string
  name?: string
  supervisor_id?: number | null
  acting_supervisor_id?: number | null
}

type SlotType = 'ผู้อำนวยการ' | 'หัวหน้ากลุ่มภารกิจ' | 'หัวหน้ากลุ่มงาน' | 'หัวหน้าหน่วยงาน'

interface SupervisorState {
  employeeId: number | null
  actingEmployeeId: number | null
}


const SLOT_TYPE_CONFIG: Record<SlotType, { color: string; tagColor: string; icon: React.ReactNode }> = {
  'ผู้อำนวยการ':         { color: '#d97706', tagColor: 'gold',   icon: <CrownOutlined /> },
  'หัวหน้ากลุ่มภารกิจ': { color: '#3b82f6', tagColor: 'blue',   icon: <ApartmentOutlined /> },
  'หัวหน้ากลุ่มงาน':    { color: '#059669', tagColor: 'green',  icon: <TeamOutlined /> },
  'หัวหน้าหน่วยงาน':    { color: '#7c3aed', tagColor: 'purple', icon: <FaSitemap /> },
}

const TAB_TYPES: { key: SlotType; label: string }[] = [
  { key: 'ผู้อำนวยการ',         label: 'ผู้อำนวยการ' },
  { key: 'หัวหน้ากลุ่มภารกิจ', label: 'หัวหน้ากลุ่มภารกิจ' },
  { key: 'หัวหน้ากลุ่มงาน',    label: 'หัวหน้ากลุ่มงาน' },
  { key: 'หัวหน้าหน่วยงาน',    label: 'หัวหน้าหน่วยงาน' },
]

// ── Normalizers (รองรับ field name หลายแบบจาก API) ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeMissions = (data: any[]): Mission[] =>
  data.map((r, i) => ({
    id:                   r.id           ?? r.mission_id ?? i,
    mission_name:         r.mission_name ?? r.name       ?? `ภารกิจ ${i + 1}`,
    supervisor_id:        r.supervisor_id ?? null,
    acting_supervisor_id: r.acting_supervisor_id ?? null,
  }))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeMajors = (data: any[]): Major[] =>
  data.map((r, i) => ({
    id:                   r.id           ?? r.major_id    ?? i,
    major_name:           r.major_name   ?? r.name        ?? `กลุ่มงาน ${i + 1}`,
    mission_id:           r.mission_id   ?? r.mission?.id ?? undefined,
    mission_name:         r.mission_name ?? r.mission?.mission_name ?? undefined,
    supervisor_id:        r.supervisor_id ?? null,
    acting_supervisor_id: r.acting_supervisor_id ?? null,
  }))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeSubmajors = (data: any[]): Submajor[] =>
  data.map((r, i) => ({
    id:                   r.id            ?? r.submajor_id ?? r.major_id ?? i,
    major_name:           r.major_name    ?? r.submajor_name ?? r.name  ?? `หน่วยงาน ${i + 1}`,
    submajor_name:        r.submajor_name ?? r.name          ?? undefined,
    major_id:             r.major_id      ?? r.major?.id     ?? undefined,
    mission_id:           r.mission_id    ?? r.mission?.id   ?? undefined,
    name:                 r.name          ?? undefined,
    supervisor_id:        r.supervisor_id ?? null,
    acting_supervisor_id: r.acting_supervisor_id ?? null,
  }))

// ── Page Component ─────────────────────────────────────────────────────────────

const PageContent = () => {
  const { message } = App.useApp()
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'

  // org data from API
  const [missions,   setMissions]   = useState<Mission[]>([])
  const [majors,     setMajors]     = useState<Major[]>([])
  const [submajors,  setSubmajors]  = useState<Submajor[]>([])
  const [loading,    setLoading]    = useState(false)

  // user cache: id → UserInfo ดึงจาก /api/v1/users/{id}
  const [userCache, setUserCache] = useState<Record<number, UserInfo>>({})

  // รายชื่อผู้ใช้ทั้งหมดสำหรับ drawer แต่งตั้ง
  const [allUsers,      setAllUsers]      = useState<UserInfo[]>([])
  const [usersLoading,  setUsersLoading]  = useState(false)

  // supervisor assignments keyed by "{type}-{id}"
  const [supervisors, setSupervisors] = useState<Record<string, SupervisorState>>({})

  // UI state
  const [isAssignOpen,   setIsAssignOpen]   = useState(false)
  const [activeRef,      setActiveRef]      = useState<{ slotKey: string; mode: 'main' | 'acting' } | null>(null)
  const [empSearch,      setEmpSearch]      = useState('')
  const [activeTab,      setActiveTab]      = useState<SlotType>('ผู้อำนวยการ')
  const [filterMission,  setFilterMission]  = useState<string>('all')
  const [filterMajor,    setFilterMajor]    = useState<string>('all')
  const [slotSearch,     setSlotSearch]     = useState('')

  // director fixed slot
  const [dirSupervisor, setDirSupervisor] = useState<SupervisorState>({ employeeId: null, actingEmployeeId: null })

  // ── Fetch org data (แสดงผลก่อน) ──────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/system/missions').then(r => r.json()),
      fetch('/api/v1/system/majors').then(r => r.json()),
      fetch('/api/v1/system/submajors').then(r => r.json()),
    ])
      .then(([m, maj, sub]) => {
        const ms:  Mission[]  = m.success   ? normalizeMissions(m.data)    : []
        const mjs: Major[]    = maj.success ? normalizeMajors(maj.data)    : []
        const sms: Submajor[] = sub.success ? normalizeSubmajors(sub.data) : []
        setMissions(ms)
        setMajors(mjs)
        setSubmajors(sms)
        const initSupv: Record<string, SupervisorState> = {}
        ms.forEach(r  => { if (r.supervisor_id || r.acting_supervisor_id) initSupv[`m-${r.id}`] = { employeeId: r.supervisor_id ?? null, actingEmployeeId: r.acting_supervisor_id ?? null } })
        mjs.forEach(r => { if (r.supervisor_id || r.acting_supervisor_id) initSupv[`w-${r.id}`] = { employeeId: r.supervisor_id ?? null, actingEmployeeId: r.acting_supervisor_id ?? null } })
        sms.forEach(r => { if (r.supervisor_id || r.acting_supervisor_id) initSupv[`u-${r.id}`] = { employeeId: r.supervisor_id ?? null, actingEmployeeId: r.acting_supervisor_id ?? null } })
        setSupervisors(initSupv)
      })
      .catch(() => message.error('ไม่สามารถโหลดข้อมูลหน่วยงานได้'))
      .finally(() => setLoading(false))
  }, [message])

  // ── Fetch users แยกต่างหาก ไม่ block org data ─────────────────────────────

  useEffect(() => {
    setUsersLoading(true)
    fetch('/api/v1/users')
      .then(r => r.json())
      .then(json => {
        if (!json.success) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list: UserInfo[] = json.data.map((u: any) => ({
          id:       u.id,
          pname:    u.pname    ?? '',
          fname:    u.fname    ?? '',
          lname:    u.lname    ?? '',
          position: u.position ?? u.position_name ?? u.pos_name ?? '',
          userType: u.user_type_name ?? u.userType ?? '',
        }))
        setAllUsers(list)
        const cache: Record<number, UserInfo> = {}
        list.forEach(u => { cache[u.id] = u })
        setUserCache(cache)
      })
      .catch(() => message.error('ไม่สามารถโหลดรายชื่อบุคลากรได้'))
      .finally(() => setUsersLoading(false))
  }, [message])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getUser = (id: number | null): UserInfo | undefined =>
    id != null ? userCache[id] : undefined

  const getSlotKey = (type: string, id: number) => `${type}-${id}`

  const getSupv = (key: string): SupervisorState =>
    supervisors[key] ?? { employeeId: null, actingEmployeeId: null }

  const setSupv = (key: string, patch: Partial<SupervisorState>) =>
    setSupervisors(prev => ({ ...prev, [key]: { ...getSupv(key), ...patch } }))

  // ── Filter options ─────────────────────────────────────────────────────────

  const missionOptions = useMemo(() => [
    { value: 'all', label: 'ทุกกลุ่มภารกิจ' },
    ...missions.map(m => ({ value: String(m.id), label: m.mission_name })),
  ], [missions])

  const majorOptions = useMemo(() => {
    const filtered = filterMission === 'all'
      ? majors
      : majors.filter(m => String(m.mission_id) === filterMission)
    return [
      { value: 'all', label: 'ทุกกลุ่มงาน' },
      ...filtered.map(m => ({ value: String(m.id), label: m.major_name })),
    ]
  }, [majors, filterMission])

  // ── Tab reset ──────────────────────────────────────────────────────────────

  const handleTabChange = (key: string) => {
    setActiveTab(key as SlotType)
    setFilterMission('all')
    setFilterMajor('all')
    setSlotSearch('')
  }

  // ── Assign drawer ──────────────────────────────────────────────────────────

  const handleOpenAssign = (slotKey: string, mode: 'main' | 'acting') => {
    setActiveRef({ slotKey, mode })
    setEmpSearch('')
    setIsAssignOpen(true)
  }

  // บันทึกการแต่งตั้งหัวหน้า/รักษาการลงฐานข้อมูล (PATCH) — รองรับ ภารกิจ/กลุ่มงาน/หน่วยงาน
  // slotKey: m-* = missions, w-* = majors, u-* = submajors — คืน true ถ้าสำเร็จ
  const persistSupervisor = async (
    slotKey: string, mode: 'main' | 'acting', employeeId: number | null,
  ): Promise<boolean> => {
    const [type, idStr] = slotKey.split('-')
    const entity = SLOT_API[type]
    if (!entity) return false
    const path  = mode === 'main' ? 'supervisor'    : 'acting-supervisor'
    const field = mode === 'main' ? 'supervisor_id' : 'acting_supervisor_id'
    try {
      const res = await fetch(`/api/v1/hr/${entity}/${idStr}/${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: employeeId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        message.error(json.message || 'บันทึกการแต่งตั้งไม่สำเร็จ')
        return false
      }
      setSupv(slotKey, { [mode === 'main' ? 'employeeId' : 'actingEmployeeId']: employeeId })
      message.success(employeeId != null ? 'แต่งตั้งเรียบร้อย' : 'ยกเลิกการแต่งตั้งเรียบร้อย')
      return true
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
      return false
    }
  }

  const handleAssignEmployee = async (employeeId: number | null) => {
    if (!activeRef) return
    const { slotKey, mode } = activeRef
    if (slotKey === 'dir') {
      // ผู้อำนวยการ = slot คงที่ (ยังไม่ผูกตาราง) — เก็บใน state
      setDirSupervisor(prev => ({ ...prev, [mode === 'main' ? 'employeeId' : 'actingEmployeeId']: employeeId }))
    } else {
      // ภารกิจ/กลุ่มงาน/หน่วยงาน บันทึกผ่าน API + กันซ้ำ — ถ้าไม่สำเร็จ (เช่นซ้ำ) ค้าง drawer ให้เลือกใหม่
      const ok = await persistSupervisor(slotKey, mode, employeeId)
      if (!ok) return
    }
    setIsAssignOpen(false)
    setActiveRef(null)
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalSlots = 1 + missions.length + majors.length + submajors.length
  const filledSlots = [
    dirSupervisor.employeeId !== null ? 1 : 0,
    ...missions.map(m  => getSupv(getSlotKey('m', m.id)).employeeId !== null ? 1 : 0),
    ...majors.map(m    => getSupv(getSlotKey('w', m.id)).employeeId !== null ? 1 : 0),
    ...submajors.map(s => getSupv(getSlotKey('u', s.id)).employeeId !== null ? 1 : 0),
  ].reduce((a, b) => a + b, 0)
  const actingSlots = [
    dirSupervisor.actingEmployeeId !== null ? 1 : 0,
    ...missions.map(m  => getSupv(getSlotKey('m', m.id)).actingEmployeeId !== null ? 1 : 0),
    ...majors.map(m    => getSupv(getSlotKey('w', m.id)).actingEmployeeId !== null ? 1 : 0),
    ...submajors.map(s => getSupv(getSlotKey('u', s.id)).actingEmployeeId !== null ? 1 : 0),
  ].reduce((a, b) => a + b, 0)
  const vacantSlots = totalSlots - filledSlots - actingSlots

  // ── Cell renderer ──────────────────────────────────────────────────────────

  const renderEmpCell = (empId: number | null, slotKey: string, mode: 'main' | 'acting') => {
    const user = getUser(empId)
    const isActing = mode === 'acting'

    if (!user) return (
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all"
        style={{ border: '1px dashed var(--app-border-strong)', background: 'var(--app-bg)' }}
        onClick={() => handleOpenAssign(slotKey, mode)}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.background = 'rgba(13,148,136,0.07)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--app-border-strong)'; e.currentTarget.style.background = 'var(--app-bg)' }}
      >
        <Avatar size={32} icon={<PlusOutlined />} style={{ backgroundColor: 'rgba(13,148,136,0.14)', color: '#0d9488' }} />
        <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
          {empId != null ? `รหัส ${empId} (กำลังโหลด...)` : `คลิกเพื่อแต่งตั้ง${isActing ? 'รักษาการ' : ''}`}
        </Text>
      </div>
    )

    const fullName = `${user.pname}${user.fname} ${user.lname}`
    return (
      <div className="flex items-center justify-between group py-1">
        <div className="flex items-center gap-3">
          <Avatar size={36} icon={<UserOutlined />}
            style={{ backgroundColor: isActing ? '#92400e' : '#006a5a', border: `2px solid ${isActing ? 'rgba(245,158,11,0.3)' : 'rgba(0,106,90,0.3)'}` }} />
          <div>
            <div className="flex items-center gap-2">
              <Text strong style={{ fontSize: 13 }}>{fullName}</Text>
              {isActing && <Tag color="warning" style={{ fontSize: 10, borderRadius: 4, margin: 0, lineHeight: '16px', padding: '0 6px' }}>รักษาการ</Tag>}
            </div>
            {user.position && <Text type="secondary" style={{ fontSize: 11 }}>{user.position}</Text>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip title="เปลี่ยนคน">
            <Button size="small" type="text" icon={<SwapOutlined style={{ color: '#60a5fa', fontSize: 12 }} />}
              onClick={e => { e.stopPropagation(); handleOpenAssign(slotKey, mode) }} />
          </Tooltip>
          <Tooltip title="ลบออก">
            <Button size="small" type="text" danger icon={<DeleteOutlined style={{ fontSize: 12 }} />}
              onClick={e => {
                e.stopPropagation()
                if (slotKey === 'dir') {
                  setDirSupervisor(prev => ({ ...prev, [mode === 'main' ? 'employeeId' : 'actingEmployeeId']: null }))
                } else {
                  persistSupervisor(slotKey, mode, null)
                }
              }} />
          </Tooltip>
        </div>
      </div>
    )
  }

  // ── Filtered rows ──────────────────────────────────────────────────────────

  const filteredMissions = useMemo(() =>
    missions.filter(m => {
      if (!slotSearch) return true
      const supv = supervisors[`m-${m.id}`]
      const u = supv?.employeeId != null ? userCache[supv.employeeId] : undefined
      return `${m.mission_name} ${u ? `${u.pname}${u.fname} ${u.lname}` : ''}`.toLowerCase().includes(slotSearch.toLowerCase())
    }),
  [missions, slotSearch, supervisors, userCache])

  const filteredMajors = useMemo(() =>
    majors.filter(m => {
      if (filterMission !== 'all' && String(m.mission_id) !== filterMission) return false
      if (!slotSearch) return true
      const supv = supervisors[`w-${m.id}`]
      const u = supv?.employeeId != null ? userCache[supv.employeeId] : undefined
      return `${m.major_name} ${u ? `${u.pname}${u.fname} ${u.lname}` : ''}`.toLowerCase().includes(slotSearch.toLowerCase())
    }),
  [majors, filterMission, slotSearch, supervisors, userCache])

  const filteredSubmajors = useMemo(() =>
    submajors.filter(s => {
      if (filterMission !== 'all' && s.mission_id !== undefined && String(s.mission_id) !== filterMission) return false
      if (filterMajor !== 'all' && String(s.major_id) !== filterMajor) return false
      if (!slotSearch) return true
      const name = s.submajor_name ?? s.major_name ?? s.name ?? ''
      const supv = supervisors[`u-${s.id}`]
      const u = supv?.employeeId != null ? userCache[supv.employeeId] : undefined
      return `${name} ${u ? `${u.pname}${u.fname} ${u.lname}` : ''}`.toLowerCase().includes(slotSearch.toLowerCase())
    }),
  [submajors, filterMission, filterMajor, slotSearch, supervisors, userCache])

  // ── Columns ────────────────────────────────────────────────────────────────

  const baseColumns = (nameCol: any) => [
    nameCol,
    {
      title: <div className="flex items-center gap-2"><CrownOutlined style={{ color: '#22c55e' }} /> ผู้ดำรงตำแหน่ง</div>,
      key: 'main',
      render: (_: any, record: any) => renderEmpCell(getSupv(record._key).employeeId, record._key, 'main'),
    },
    {
      title: <div className="flex items-center gap-2"><AlertOutlined style={{ color: '#f59e0b' }} /> ผู้รักษาการ</div>,
      key: 'acting',
      render: (_: any, record: any) => renderEmpCell(getSupv(record._key).actingEmployeeId, record._key, 'acting'),
    },
  ]

  const missionColumns = baseColumns({
    title: 'กลุ่มภารกิจ',
    key: 'name',
    render: (_: any, r: any) => <Text strong style={{ fontSize: 13 }}>{r.mission_name}</Text>,
  })

  const majorColumns = baseColumns({
    title: 'กลุ่มงาน',
    key: 'name',
    render: (_: any, r: any) => (
      <div>
        <Text strong style={{ fontSize: 13 }}>{r.major_name}</Text>
        {r.mission_name && (
          <div className="mt-1">
            <Tag color="blue" style={{ fontSize: 10, borderRadius: 8, margin: 0 }}>{r.mission_name}</Tag>
          </div>
        )}
      </div>
    ),
  })

  const submajorColumns = baseColumns({
    title: 'หน่วยงาน',
    key: 'name',
    render: (_: any, r: any) => {
      const name = r.submajor_name ?? r.major_name ?? r.name ?? '-'
      return (
        <div>
          <Text strong style={{ fontSize: 13 }}>{name}</Text>
          {r._majorName && (
            <div className="mt-1">
              <Tag color="green" style={{ fontSize: 10, borderRadius: 8, margin: 0 }}>{r._majorName}</Tag>
            </div>
          )}
        </div>
      )
    },
  })

  const dirColumns = baseColumns({
    title: 'ตำแหน่ง',
    key: 'name',
    render: () => <Text strong style={{ fontSize: 13 }}>ผู้อำนวยการโรงพยาบาล</Text>,
  })

  // ── Tab items ──────────────────────────────────────────────────────────────

  // ค้นหาเมื่อพิมพ์ครบ MIN_SEARCH ตัวอักษรขึ้นไป (กันการเรนเดอร์รายชื่อทั้งหมดพร้อมกัน = ช้า)
  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase()
    if (q.length < MIN_SEARCH) return []
    return allUsers.filter(u =>
      `${u.pname}${u.fname} ${u.lname} ${u.position ?? ''} ${u.userType ?? ''}`.toLowerCase().includes(q)
    )
  }, [allUsers, empSearch])

  const tabItems = TAB_TYPES.map(tab => {
    const config = SLOT_TYPE_CONFIG[tab.key]

    let count = 0
    let vacant = 0

    if (tab.key === 'ผู้อำนวยการ') {
      count = 1
      vacant = dirSupervisor.employeeId === null && dirSupervisor.actingEmployeeId === null ? 1 : 0
    } else if (tab.key === 'หัวหน้ากลุ่มภารกิจ') {
      count = missions.length
      vacant = missions.filter(m => { const s = getSupv(getSlotKey('m', m.id)); return s.employeeId === null && s.actingEmployeeId === null }).length
    } else if (tab.key === 'หัวหน้ากลุ่มงาน') {
      count = majors.length
      vacant = majors.filter(m => { const s = getSupv(getSlotKey('w', m.id)); return s.employeeId === null && s.actingEmployeeId === null }).length
    } else {
      count = submajors.length
      vacant = submajors.filter(s => { const sv = getSupv(getSlotKey('u', s.id)); return sv.employeeId === null && sv.actingEmployeeId === null }).length
    }

    const showMissionFilter = tab.key !== 'ผู้อำนวยการ' && tab.key !== 'หัวหน้ากลุ่มภารกิจ'
    const showMajorFilter   = tab.key === 'หัวหน้าหน่วยงาน'

    // Build dataSource
    let dataSource: any[] = []
    let columns: any[] = []

    if (tab.key === 'ผู้อำนวยการ') {
      dataSource = [{ _key: 'dir', id: 'dir' }]
      columns = dirColumns
    } else if (tab.key === 'หัวหน้ากลุ่มภารกิจ') {
      dataSource = filteredMissions.map(m => ({ ...m, _key: getSlotKey('m', m.id) }))
      columns = missionColumns
    } else if (tab.key === 'หัวหน้ากลุ่มงาน') {
      dataSource = filteredMajors.map(m => ({
        ...m,
        _key: getSlotKey('w', m.id),
        mission_name: m.mission_name ?? missions.find(ms => ms.id === m.mission_id)?.mission_name,
      }))
      columns = majorColumns
    } else {
      dataSource = filteredSubmajors.map(s => {
        const parentMajor = majors.find(m => m.id === s.major_id)
        return {
          ...s,
          _key: getSlotKey('u', s.id),
          _majorName: parentMajor?.major_name,
        }
      })
      columns = submajorColumns
    }

    return {
      key: tab.key,
      label: (
        <span className="flex items-center gap-2 px-1">
          <span style={{ color: config.color }}>{config.icon}</span>
          {tab.label}
          <Badge count={count} style={{ backgroundColor: config.color, fontSize: 10, height: 18, lineHeight: '18px', minWidth: 18 }} />
          {vacant > 0 && (
            <Badge count={`ว่าง ${vacant}`} style={{ backgroundColor: '#ef4444', fontSize: 10, height: 18, lineHeight: '18px' }} />
          )}
        </span>
      ),
      children: (
        <Spin spinning={loading && tab.key !== 'ผู้อำนวยการ'}>
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            {showMissionFilter && (
              <Select
                value={filterMission}
                onChange={val => { setFilterMission(val); setFilterMajor('all') }}
                style={{ minWidth: 240 }}
                options={missionOptions}
              />
            )}
            {showMajorFilter && (
              <Select
                value={filterMajor}
                onChange={setFilterMajor}
                style={{ minWidth: 240 }}
                options={majorOptions}
              />
            )}
            <Input
              placeholder="ค้นหาชื่อหน่วยงาน, บุคลากร..."
              prefix={<SearchOutlined className="text-app-text-2" />}
              value={slotSearch}
              onChange={e => setSlotSearch(e.target.value)}
              allowClear
              style={{ width: 240 }}
            />
            <Tag color={config.color} style={{ borderRadius: 12, fontSize: 12, padding: '2px 12px', marginLeft: 'auto' }}>
              {dataSource.length} รายการ
            </Tag>
          </div>

          <Table
            dataSource={dataSource}
            columns={columns}
            rowKey="_key"
            pagination={false}
            size="middle"
            locale={{ emptyText: <Empty description={loading ? 'กำลังโหลด...' : 'ไม่พบรายการ'} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Spin>
      ),
    }
  })

  // ── Active slot label for drawer ──────────────────────────────────────────

  const activeSlotLabel = useMemo(() => {
    if (!activeRef) return ''
    const key = activeRef.slotKey
    if (key === 'dir') return 'ผู้อำนวยการโรงพยาบาล'
    if (key.startsWith('m-')) {
      const id = Number(key.split('-')[1])
      return missions.find(m => m.id === id)?.mission_name ?? ''
    }
    if (key.startsWith('w-')) {
      const id = Number(key.split('-')[1])
      return majors.find(m => m.id === id)?.major_name ?? ''
    }
    if (key.startsWith('u-')) {
      const id = Number(key.split('-')[1])
      const s = submajors.find(s => s.id === id)
      return s?.submajor_name ?? s?.major_name ?? s?.name ?? ''
    }
    return ''
  }, [activeRef, missions, majors, submajors])

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">

        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: 'ผังผู้บริหาร' },
          ]}
          className="mb-4"
        />

        {/* Header Banner */}
        <Card style={{ background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)', border: 'none', borderRadius: 16, marginBottom: 24 }}>
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={16}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-2xl"
                  style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <FaSitemap className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>ผังผู้บริหารและหัวหน้างาน</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                    กำหนดผู้ดำรงตำแหน่งตัวจริงและรักษาการ แยกตามระดับการบริหาร
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="flex gap-3 md:justify-end">
                <Button icon={<TeamOutlined />} onClick={() => window.location.href = '/hr/users'} size="large"
                  style={{ backgroundColor: '#fff', color: '#006a5a', border: 'none', fontWeight: 600 }}>
                  ทะเบียนบุคลากร
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Stats */}
        <Row gutter={[12, 12]} className="mb-6">
          {[
            { title: 'ตำแหน่งทั้งหมด',    value: totalSlots,  icon: <ApartmentOutlined />,   color: '#006a5a' },
            { title: 'มีผู้ดำรงตำแหน่ง',  value: filledSlots, icon: <CheckCircleOutlined />, color: '#22c55e' },
            { title: 'มีรักษาการ',         value: actingSlots, icon: <AlertOutlined />,       color: '#f59e0b' },
            { title: 'ยังว่าง',            value: vacantSlots, icon: <UserOutlined />,        color: '#ef4444' },
          ].map((stat, i) => (
            <Col xs={12} sm={6} key={i}>
              <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: '18px 16px' } }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-xl"
                    style={{ width: 44, height: 44, backgroundColor: `${stat.color}18`, color: stat.color, fontSize: 20 }}>
                    {stat.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{stat.title}</Text>
                    <div>
                      <Text strong style={{ fontSize: 26, lineHeight: 1.1 }}>{stat.value}</Text>
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>ตำแหน่ง</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Tabs */}
        <ConfigProvider
          theme={{
            components: {
              Tabs: {
                itemColor: 'var(--app-text-2)',
                itemSelectedColor: isDark ? '#34d399' : '#047857',
                itemHoverColor: isDark ? '#5eead4' : '#0d9488',
                inkBarColor: isDark ? '#34d399' : '#006a5a',
                titleFontSize: 15,
              },
              Table: {
                headerBg: isDark ? 'rgba(0,106,90,0.20)' : 'rgba(0,106,90,0.08)',
                headerColor: isDark ? '#5eead4' : '#006a5a',
                headerSplitColor: 'transparent',
                rowHoverBg: isDark ? 'rgba(0,106,90,0.10)' : 'rgba(0,106,90,0.05)',
                borderColor: 'var(--app-border)',
              },
            },
          }}
        >
          <Card style={{ borderRadius: 12, border: '1px solid var(--app-border)' }} styles={{ body: { paddingTop: 0 } }}>
            <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} size="large" />
          </Card>
        </ConfigProvider>

        {/* Note */}
        <div className="mt-6 p-4 rounded-xl flex gap-3 items-start"
          style={{ backgroundColor: 'rgba(0,106,90,0.06)', border: '1px solid rgba(0,106,90,0.12)' }}>
          <ApartmentOutlined style={{ color: '#006a5a', fontSize: 18, marginTop: 2 }} />
          <div>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>โครงสร้างการบริหาร 4 ระดับ</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              ผู้อำนวยการ → หัวหน้ากลุ่มภารกิจ → หัวหน้ากลุ่มงาน → หัวหน้าหน่วยงาน
              คลิกช่องว่างเพื่อแต่งตั้ง หรือ hover เพื่อเปลี่ยน/ลบ
            </Text>
          </div>
        </div>
      </div>

      {/* Assign Drawer */}
      <Drawer
        title={null}
        size="large"
        onClose={() => setIsAssignOpen(false)}
        open={isAssignOpen}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ background: 'linear-gradient(135deg, #006a5a 0%, #059669 100%)', padding: '24px' }}>
          <Title level={5} style={{ color: '#fff', margin: 0 }}>แต่งตั้งบุคลากร</Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{activeSlotLabel}</Text>
          <div className="mt-2">
            <Tag color={activeRef?.mode === 'main' ? 'green' : 'warning'} style={{ borderRadius: 12, fontSize: 12 }}>
              {activeRef?.mode === 'main' ? 'ตำแหน่งตัวจริง' : 'รักษาการแทน'}
            </Tag>
          </div>
        </div>

        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Input
            placeholder="ค้นหาชื่อ, ตำแหน่ง หรือ ประเภทเจ้าหน้าที่..."
            prefix={<SearchOutlined className="text-app-text-2" />}
            value={empSearch}
            onChange={e => setEmpSearch(e.target.value)}
            allowClear
            size="large"
          />
        </div>

        <Spin spinning={usersLoading}>
          <div className="px-4 py-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            {empSearch.trim().length < MIN_SEARCH ? (
              <div className="py-16 flex flex-col items-center gap-2 text-center px-6">
                <SearchOutlined style={{ fontSize: 30, color: 'var(--app-text-3)' }} />
                <Text type="secondary">พิมพ์อย่างน้อย {MIN_SEARCH} ตัวอักษร เพื่อค้นหาชื่อหรือตำแหน่ง</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>({allUsers.length.toLocaleString()} รายชื่อ)</Text>
              </div>
            ) : filteredEmployees.length === 0 ? (
              !usersLoading && <Empty description="ไม่พบรายชื่อบุคลากร" className="py-12" />
            ) : (
              <>
                {filteredEmployees.slice(0, MAX_SHOWN).map((u: UserInfo) => (
                  <div key={u.id}
                    className="group flex items-center gap-3 p-4 cursor-pointer rounded-xl transition-all"
                    style={{ borderBottom: '1px solid var(--app-border)' }}
                    onClick={() => handleAssignEmployee(u.id)}
                  >
                    <Avatar size={44} icon={<UserOutlined />}
                      style={{ backgroundColor: '#006a5a', border: '2px solid rgba(0,106,90,0.3)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <Text strong style={{ fontSize: 14 }}>{u.pname}{u.fname} {u.lname}</Text>
                      <br />
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {u.position && (
                          <Tag color="cyan" style={{ borderRadius: 8, margin: 0, fontSize: 11 }}>{u.position}</Tag>
                        )}
                        {u.userType && (
                          <Tag color="geekblue" style={{ borderRadius: 8, margin: 0, fontSize: 11 }}>{u.userType}</Tag>
                        )}
                        {!u.position && !u.userType && (
                          <Text type="secondary" style={{ fontSize: 12 }}>ไม่ระบุตำแหน่ง</Text>
                        )}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tag color="green" style={{ borderRadius: 12, margin: 0, fontSize: 11 }}>เลือก</Tag>
                    </div>
                  </div>
                ))}
                {filteredEmployees.length > MAX_SHOWN && (
                  <div className="py-3 text-center">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      แสดง {MAX_SHOWN} จาก {filteredEmployees.length.toLocaleString()} รายการ — พิมพ์เพิ่มเพื่อค้นให้แคบลง
                    </Text>
                  </div>
                )}
              </>
            )}
          </div>
        </Spin>
      </Drawer>
    </div>
  )
}

export default function SupervisorPage() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PageContent />
    </AppThemeProvider>
  )
}
