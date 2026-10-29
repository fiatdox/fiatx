'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Table, Input, Button, Space, Card, Row, Col, Tag,
  Avatar, Drawer, Form, Select, Breadcrumb, Tooltip,
  App, Typography, Badge, Spin, DatePicker, ConfigProvider,
} from 'antd'
import {
  EditOutlined, SearchOutlined, UserOutlined, PlusOutlined,
  HomeOutlined, IdcardOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { FaUsersCog, FaUsers, FaFilter, FaFileExcel } from 'react-icons/fa'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import thTH from 'antd/locale/th_TH'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

dayjs.extend(buddhistEra)
// วันที่แสดงเป็นปี พ.ศ. (BBBB) — ค่าที่ส่ง backend ยังเป็น ค.ศ. เพราะ format('YYYY-MM-DD') ตอนบันทึก
const BE_DATE = 'DD/MM/BBBB'
// locale ของ antd ไม่ได้แปลงปีในหัวปฏิทินเป็น พ.ศ. ให้ จึงตั้ง yearFormat เอง
const TH_LOCALE = { ...thTH, DatePicker: { ...thTH.DatePicker!, lang: { ...thTH.DatePicker!.lang, yearFormat: 'BBBB' } } }

const { Text, Title } = Typography

// ── Types ──────────────────────────────────────────────────────────────────

interface User {
  id: number
  pname?: string
  fname: string
  lname: string
  username: string
  id_card?: string
  gender?: string
  birthday?: string
  hire_date?: string
  mission_id?: number
  mission_name?: string
  major_id?: number
  major_name?: string
  submajor_id?: number
  submajor_name?: string
  user_position_id?: number
  position_name?: string
  user_level_id?: number
  level_name?: string
  user_type_id?: number
  type_name?: string
  user_status_id?: number
  status_name?: string
  attendance_id?: number
  salary_id?: number
  is_active?: string | boolean
  work_end_date?: string
  hospital_lc_pid?: number
}

// ชื่อสถานะที่ถือว่า "ยังปฏิบัติงานอยู่" — สถานะอื่น (ลาออก/เกษียณ/โอนย้าย ฯลฯ) ต้องระบุวันสิ้นสุด
const WORKING_STATUS_NAME = 'ปฏิบัติงาน'

interface SystemOption { id: number; name: string; [k: string]: unknown }

// ── Helpers ────────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts)
  return res.json()
}

// API returns varying field names e.g. mission_id/mission_name, major_id/major_name
// Normalize to { id, name } so toOpts works uniformly
function normalizeOption(item: Record<string, unknown>): SystemOption {
  if (typeof item.id === 'number' && typeof item.name === 'string') return item as SystemOption
  const SKIP = ['supervisor_id', 'acting_supervisor_id']
  const idKey = Object.keys(item).find((k) => k.endsWith('_id') && !SKIP.includes(k))
  const nameKey = Object.keys(item).find((k) => k.endsWith('_name'))
  return { id: Number(idKey ? item[idKey] : 0), name: String(nameKey ? item[nameKey] : ''), ...item }
}

function extractList(d: unknown): SystemOption[] {
  let arr: unknown[]
  if (Array.isArray(d)) arr = d
  else {
    const obj = d as Record<string, unknown>
    const found = obj.data ?? obj.result ?? obj.items
    arr = Array.isArray(found) ? found : []
  }
  return arr.map((item) => normalizeOption(item as Record<string, unknown>))
}

const toOpts = (arr: SystemOption[]) =>
  arr.map((o) => ({ label: o.name, value: o.id }))

// ชื่อจาก id — ไม่มีให้เป็นค่าว่าง (ใช้ค้นหา / ส่งออก ส่วนในตารางใช้ byId ที่แสดง '-')
const nameIn = (arr: SystemOption[], id?: number) => (id ? arr.find((o) => o.id === id)?.name : undefined) ?? ''

const isActive = (u: User) =>
  u.is_active === true || u.is_active === 'true' || u.is_active === '1' || u.is_active === 'Y'

// ── Page ───────────────────────────────────────────────────────────────────

const PageContent = () => {
  const { message } = App.useApp()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMission, setFilterMission] = useState<number | null>(null)
  const [filterMajor, setFilterMajor] = useState<number | null>(null)
  const [filterSubmajor, setFilterSubmajor] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<number | null>(null)
  const [filterActive, setFilterActive] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  // เฝ้าดูสถานะที่เลือกในฟอร์ม เพื่อโชว์/บังคับช่องวันที่สิ้นสุดการปฏิบัติงาน
  const watchedStatusId = Form.useWatch('user_status_id', form) as number | undefined

  // system dropdowns
  const [missions, setMissions] = useState<SystemOption[]>([])
  const [positions, setPositions] = useState<SystemOption[]>([])
  const [levels, setLevels] = useState<SystemOption[]>([])
  const [userTypes, setUserTypes] = useState<SystemOption[]>([])
  const [userStatuses, setUserStatuses] = useState<SystemOption[]>([])

  // cascade sub-lists (populated on parent selection)
  const [filteredMajors, setFilteredMajors] = useState<SystemOption[]>([])
  const [filteredSubmajors, setFilteredSubmajors] = useState<SystemOption[]>([])
  // กลุ่มงาน / หน่วยงานทั้งหมดที่ยังใช้งาน — ใช้แสดงชื่อในตาราง/Excel และเป็นตัวเลือกของตัวกรอง
  // (API รายชื่อบุคลากรส่งมาแค่ id ชื่อต้องเปิดจากรายการนี้)
  const [majors, setMajors] = useState<SystemOption[]>([])
  const [submajors, setSubmajors] = useState<SystemOption[]>([])

  // ID → name lookup helpers
  const byId = (arr: SystemOption[], id?: number) => arr.find((o) => o.id === id)?.name ?? '-'

  // สถานะที่ไม่ใช่ "ปฏิบัติงาน" -> ต้องระบุวันสิ้นสุด + is_active = 'N'
  const isNonWorkingStatus = (statusId?: number) =>
    statusId != null && userStatuses.find((s) => s.id === statusId)?.name !== WORKING_STATUS_NAME

  const loadUsers = useCallback(async (): Promise<User[]> => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/users')
      const list: User[] = Array.isArray(data) ? data : data.data ?? []
      setUsers(list)
      return list
    } catch {
      message.error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ')
      return []
    } finally {
      setLoading(false)
    }
  }, [message])

  const handleEdit = useCallback((record: User) => {
    setEditing(record)
    setFilteredMajors([])
    setFilteredSubmajors([])
    form.setFieldsValue({
      ...record,
      gender: record.gender === 'M' ? 'ชาย' : record.gender === 'F' ? 'หญิง' : record.gender,
      birthday: record.birthday ? dayjs(record.birthday) : undefined,
      hire_date: record.hire_date ? dayjs(record.hire_date) : undefined,
      work_end_date: record.work_end_date ? dayjs(record.work_end_date) : undefined,
    })
    if (record.mission_id) {
      apiFetch(`/api/system/missions/${record.mission_id}/majors`).then((d) => {
        setFilteredMajors(extractList(d))
      })
    }
    if (record.major_id) {
      apiFetch(`/api/system/majors/${record.major_id}/submajors`).then((d) => {
        setFilteredSubmajors(extractList(d))
      })
    }
    setDrawerOpen(true)
  }, [form])

  useEffect(() => {
    // ?edit=<id> (ลิงก์จาก HR Dashboard) → เปิดฟอร์มแก้ไขของคนนั้นทันทีที่โหลดรายชื่อเสร็จ
    const editId = Number(new URLSearchParams(window.location.search).get('edit'))
    loadUsers().then((list) => {
      const target = editId ? list.find((u) => u.id === editId) : undefined
      if (target) handleEdit(target)
      // เอา ?edit ออก — รีเฟรชหน้าแล้วจะได้ไม่เด้งฟอร์มเดิมขึ้นมาอีก
      if (editId) window.history.replaceState(null, '', window.location.pathname)
    })
    Promise.all([
      apiFetch('/api/system/missions'),
      apiFetch('/api/system/positions'),
      apiFetch('/api/system/levels'),
      apiFetch('/api/system/user-types'),
      apiFetch('/api/system/user-statuses'),
      apiFetch('/api/system/majors'),
      apiFetch('/api/system/submajors'),
    ]).then(([m, p, l, ut, us, mj, sm]) => {
      setMissions(extractList(m))
      setMajors(extractList(mj))
      setSubmajors(extractList(sm))
      setPositions(extractList(p))
      setLevels(extractList(l))
      setUserTypes(extractList(ut))
      setUserStatuses(extractList(us))
    })
  }, [loadUsers, handleEdit])

  // cascade: mission → majors
  const handleMissionChange = async (missionId: number) => {
    form.setFieldsValue({ major_id: undefined, submajor_id: undefined })
    setFilteredSubmajors([])
    if (!missionId) { setFilteredMajors([]); return }
    const data = await apiFetch(`/api/system/missions/${missionId}/majors`)
    setFilteredMajors(extractList(data))
  }

  // cascade: major → submajors
  const handleMajorChange = async (majorId: number) => {
    form.setFieldsValue({ submajor_id: undefined })
    if (!majorId) { setFilteredSubmajors([]); return }
    const data = await apiFetch(`/api/system/majors/${majorId}/submajors`)
    setFilteredSubmajors(extractList(data))
  }

  const handleAdd = () => {
    setEditing(null)
    form.resetFields()
    setFilteredMajors([])
    setFilteredSubmajors([])
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    let values: Record<string, unknown>
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    // format dates
    if (values.birthday) values.birthday = dayjs(values.birthday as dayjs.Dayjs).format('YYYY-MM-DD')
    if (values.hire_date) values.hire_date = dayjs(values.hire_date as dayjs.Dayjs).format('YYYY-MM-DD')
    // map Thai gender display back to API value
    if (values.gender === 'ชาย') values.gender = 'M'
    else if (values.gender === 'หญิง') values.gender = 'F'

    // ── สถานะการปฏิบัติงาน ──────────────────────────────────────────────
    // ถ้าสถานะไม่ใช่ "ปฏิบัติงาน" -> ต้องมีวันสิ้นสุด และตั้ง is_active = 'N'
    // ถ้าเป็น "ปฏิบัติงาน" (หรือยังไม่เลือก) -> is_active = 'Y' และล้างวันสิ้นสุด
    if (isNonWorkingStatus(values.user_status_id as number | undefined)) {
      values.work_end_date = dayjs(values.work_end_date as dayjs.Dayjs).format('YYYY-MM-DD')
      values.is_active = 'N'
    } else {
      values.work_end_date = null
      values.is_active = 'Y'
    }

    setSaving(true)
    try {
      if (editing) {
        // Merge existing record so all required PUT fields are present
        const body: Record<string, unknown> = {
          pname: editing.pname ?? '',
          fname: editing.fname,
          lname: editing.lname,
          id_card: editing.id_card ?? '',
          gender: editing.gender ?? '',
          birthday: editing.birthday ?? '',
          hire_date: editing.hire_date ?? '',
          user_type_id: editing.user_type_id ?? '',
          user_position_id: editing.user_position_id ?? '',
          user_level_id: editing.user_level_id ?? '',
          user_status_id: editing.user_status_id ?? '',
          mission_id: editing.mission_id ?? '',
          major_id: editing.major_id ?? '',
          submajor_id: editing.submajor_id ?? '',
          ...values,
        }
        console.log('[PUT] /api/v1/users/' + editing.id, body)
        await apiFetch(`/api/users/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        message.success('แก้ไขข้อมูลสำเร็จ')
      } else {
        // auto-set username/password = id_card for new users
        const idCard = values.id_card as string
        values.username = idCard
        values.password = idCard
        await apiFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        message.success('เพิ่มผู้ใช้งานสำเร็จ')
      }
      setDrawerOpen(false)
      loadUsers()
    } catch {
      message.error('บันทึกข้อมูลไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    // ค้นด้วยชื่อด้าน / กลุ่มงาน / หน่วยงานได้ด้วย นอกจากเลือกจากตัวกรอง
    const matchSearch = !q || [
      u.fname, u.lname, u.pname, u.username, u.id_card, u.position_name,
      nameIn(missions, u.mission_id), nameIn(majors, u.major_id), nameIn(submajors, u.submajor_id),
    ].some((v) => v?.toLowerCase().includes(q))
    const matchMission = !filterMission || u.mission_id === filterMission
    const matchMajor = !filterMajor || u.major_id === filterMajor
    const matchSubmajor = !filterSubmajor || u.submajor_id === filterSubmajor
    const matchStatus = !filterStatus || u.user_status_id === filterStatus
    const matchActive = filterActive === null || (filterActive === 'active' ? isActive(u) : !isActive(u))
    return matchSearch && matchMission && matchMajor && matchSubmajor && matchStatus && matchActive
  })

  const activeFilterCount = [filterMission, filterMajor, filterSubmajor, filterStatus, filterActive].filter(Boolean).length

  // ── ตัวกรองกลุ่มงาน / หน่วยงาน ──────────────────────────────────────────
  // ตัวเลือกแคบลงตามระดับที่เลือกไว้ด้านบน (ด้าน → กลุ่มงาน → หน่วยงาน) และบอกจำนวนคนในวงเล็บ
  const missionOf = (majorId?: number | null) => Number(majors.find((m) => m.id === majorId)?.mission_id) || null
  const majorOf = (submajorId?: number | null) => Number(submajors.find((s) => s.id === submajorId)?.major_id) || null
  const countBy = (key: 'major_id' | 'submajor_id') => {
    const n = new Map<number, number>()
    users.forEach((u) => { const id = u[key]; if (id) n.set(id, (n.get(id) ?? 0) + 1) })
    return n
  }
  const majorCount = countBy('major_id')
  const submajorCount = countBy('submajor_id')

  const majorOptions = majors
    .filter((m) => !filterMission || Number(m.mission_id) === filterMission)
    .map((m) => ({ label: `${m.name} (${majorCount.get(m.id) ?? 0})`, value: m.id }))
  const submajorOptions = submajors
    .filter((s) => filterMajor
      ? Number(s.major_id) === filterMajor
      : !filterMission || missionOf(Number(s.major_id)) === filterMission)
    .map((s) => ({
      // ชื่อหน่วยงานซ้ำกันได้ในต่างกลุ่มงาน — ยังไม่ได้เลือกกลุ่มงานให้บอกกลุ่มงานกำกับไว้
      label: `${s.name}${filterMajor ? '' : ` · ${nameIn(majors, Number(s.major_id)) || '-'}`} (${submajorCount.get(s.id) ?? 0})`,
      value: s.id,
    }))

  // เปลี่ยนระดับบน → ล้างระดับล่างที่ไม่ได้อยู่ใต้ตัวที่เลือกใหม่ ไม่งั้นได้ผลว่างโดยไม่รู้ตัว
  const changeMission = (v?: number | null) => {
    const mission = v ?? null
    setFilterMission(mission)
    if (!mission) return
    if (filterMajor && missionOf(filterMajor) !== mission) setFilterMajor(null)
    if (filterSubmajor && missionOf(majorOf(filterSubmajor)) !== mission) setFilterSubmajor(null)
  }
  const changeMajor = (v?: number | null) => {
    const major = v ?? null
    setFilterMajor(major)
    if (major && filterSubmajor && majorOf(filterSubmajor) !== major) setFilterSubmajor(null)
  }

  const handleExportExcel = () => {
    if (!filtered.length) { message.warning('ไม่มีข้อมูลสำหรับส่งออก'); return }
    const rows = filtered.map((u, i) => ({
      'ลำดับ': i + 1,
      'คำนำหน้า': u.pname ?? '',
      'ชื่อ': u.fname,
      'นามสกุล': u.lname,
      'ชื่อผู้ใช้งาน': u.username,
      'เลขบัตรประชาชน': u.id_card ?? '',
      'เพศ': u.gender ?? '',
      // API รายชื่อส่งมาแค่ id — เปิดชื่อจากรายการที่โหลดไว้ (เดิมอ่าน *_name ที่ไม่มีอยู่จริง คอลัมน์จึงว่าง)
      'ด้าน': nameIn(missions, u.mission_id),
      'กลุ่มงาน': nameIn(majors, u.major_id),
      'หน่วยงาน': nameIn(submajors, u.submajor_id),
      'ตำแหน่ง': u.position_name ?? '',
      'ระดับ': nameIn(levels, u.user_level_id),
      'ประเภท': nameIn(userTypes, u.user_type_id),
      'สถานะ': nameIn(userStatuses, u.user_status_id),
      'วันเกิด': u.birthday ? dayjs(u.birthday).format(BE_DATE) : '',
      'วันที่บรรจุ': u.hire_date ? dayjs(u.hire_date).format(BE_DATE) : '',
      'สถานะการใช้งาน': isActive(u) ? 'ใช้งาน' : 'ระงับ',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'บุคลากร')
    XLSX.writeFile(wb, `บุคลากร_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`)
  }

  // ── Columns ─────────────────────────────────────────────────────────────

  const columns = [
    {
      title: 'บุคลากร',
      key: 'name',
      width: 280,
      render: (_: unknown, u: User) => (
        <div className="flex items-center gap-3 py-1">
          <Avatar size={44} icon={<UserOutlined />} style={{ backgroundColor: '#006a5a', border: '2px solid rgba(0,106,90,0.3)', flexShrink: 0 }} />
          <div>
            <div className="font-semibold text-app-text text-[14px]">
              {u.pname}{u.fname} {u.lname}
            </div>
            <div className="text-xs text-app-text-2 mt-0.5 flex items-center gap-1">
              <IdcardOutlined /> {u.id_card || u.username}
            </div>
          </div>
        </div>
      ),
      sorter: (a: User, b: User) => a.fname.localeCompare(b.fname),
    },
    {
      title: 'ชื่อผู้ใช้งาน',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (v: string) => <Text style={{ fontSize: 13, color: 'var(--app-text-2)' }}>{v}</Text>,
    },
    {
      title: 'ด้าน / กลุ่มงาน / หน่วยงาน',
      key: 'mission',
      width: 240,
      render: (_: unknown, u: User) => (
        <div>
          <div className="text-[13px] text-app-text">{byId(missions, u.mission_id)}</div>
          <div className="text-[11px] text-app-text-3 mt-0.5">{u.major_id ? byId(majors, u.major_id) : '-'}</div>
          {u.submajor_id && <div className="text-[11px] text-app-text-3">{byId(submajors, u.submajor_id)}</div>}
        </div>
      ),
    },
    {
      title: 'ตำแหน่ง / ระดับ',
      key: 'position',
      width: 200,
      render: (_: unknown, u: User) => {
        const levelName = byId(levels, u.user_level_id)
        return (
          <div>
            <div className="text-[13px] text-app-text">{byId(positions, u.user_position_id)}</div>
            {levelName !== '-' && <Tag color="cyan" style={{ marginTop: 4, fontSize: 11, borderRadius: 4 }}>{levelName}</Tag>}
          </div>
        )
      },
    },
    {
      title: 'ประเภท',
      key: 'type',
      width: 160,
      render: (_: unknown, u: User) => {
        const name = byId(userTypes, u.user_type_id)
        return name !== '-' ? <Tag style={{ borderRadius: 4, fontSize: 11 }}>{name}</Tag> : <span className="text-app-text-3">-</span>
      },
    },
    {
      title: 'สถานะ',
      key: 'status',
      width: 140,
      render: (_: unknown, u: User) => {
        const statusName = byId(userStatuses, u.user_status_id)
        return (
          <div className="flex flex-col gap-1">
            {statusName !== '-' && <Tag color="blue" style={{ borderRadius: 4, fontSize: 11, width: 'fit-content' }}>{statusName}</Tag>}
            <Badge
              status={isActive(u) ? 'success' : 'error'}
              text={<span style={{ fontSize: 11, color: isActive(u) ? '#22c55e' : '#ef4444' }}>{isActive(u) ? 'ใช้งาน' : 'ระงับ'}</span>}
            />
          </div>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, u: User) => (
        <Space size={4}>
          <Tooltip title="แก้ไข">
            <Button type="text" shape="circle" size="small" icon={<EditOutlined style={{ color: '#60a5fa' }} />} onClick={() => handleEdit(u)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-app-bg text-app-text" style={{ minHeight: '100dvh' }}>
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">

        <Breadcrumb
          className="mb-4"
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: 'ทะเบียนบุคลากร' },
          ]}
        />

        {/* Header */}
        <Card
          style={{ background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)', border: 'none', borderRadius: 16, marginBottom: 24 }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={14}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <FaUsers className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>ระบบทะเบียนบุคลากร</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>จัดการข้อมูลบุคลากร ตำแหน่ง และสิทธิ์การใช้งาน</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={10}>
              <div className="flex gap-3 md:justify-end flex-wrap">
                <Button icon={<ReloadOutlined />} onClick={loadUsers} size="large"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                  รีเฟรช
                </Button>
                <Button icon={<PlusOutlined />} onClick={handleAdd} size="large"
                  style={{ backgroundColor: '#facc15', color: 'var(--app-surface)', border: 'none', fontWeight: 600 }}>
                  เพิ่มบุคลากร
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Table Card */}
        <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: 0 } }}>
          <div className="px-6 pt-5 pb-4">
            <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Text strong style={{ fontSize: 16 }}>รายชื่อบุคลากร</Text>
                <Tag color="#006a5a" style={{ borderRadius: 12, fontSize: 12, padding: '0 10px' }}>
                  {filtered.length} / {users.length} รายการ
                </Tag>
                {activeFilterCount > 0 && (
                  <Tag color="orange" style={{ borderRadius: 12, fontSize: 11 }}>
                    <FaFilter className="inline mr-1" />ใช้ตัวกรอง {activeFilterCount} ตัว
                  </Tag>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="ค้นหาชื่อ, username, เลขบัตร, กลุ่มงาน, หน่วยงาน..."
                  prefix={<SearchOutlined className="text-app-text-2" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 340 }}
                  allowClear
                />
                <Tooltip title="ส่งออก Excel">
                  <Button icon={<FaFileExcel />} onClick={handleExportExcel}
                    style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#fff' }}>
                    Excel
                  </Button>
                </Tooltip>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FaFilter style={{ color: 'var(--app-text-2)', fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 13 }}>ตัวกรองข้อมูล</Text>
                </div>
                {activeFilterCount > 0 && (
                  <Button type="link" size="small" danger style={{ padding: 0, height: 'auto' }}
                    onClick={() => {
                      setFilterMission(null); setFilterMajor(null); setFilterSubmajor(null)
                      setFilterStatus(null); setFilterActive(null)
                    }}>
                    ล้างตัวกรอง
                  </Button>
                )}
              </div>
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={8}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>ด้าน/ภารกิจ</Text>
                  <Select placeholder="ทั้งหมด" value={filterMission} onChange={changeMission} allowClear style={{ width: '100%' }}
                    options={missions.map((m) => ({ label: m.name, value: m.id }))} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>กลุ่มงาน</Text>
                  <Select placeholder="ทั้งหมด" value={filterMajor} onChange={changeMajor} allowClear style={{ width: '100%' }}
                    showSearch={{ optionFilterProp: 'label' }} options={majorOptions}
                    notFoundContent="ไม่มีกลุ่มงานในด้านที่เลือก" />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>หน่วยงาน</Text>
                  <Select placeholder="ทั้งหมด" value={filterSubmajor} onChange={(v) => setFilterSubmajor(v ?? null)} allowClear style={{ width: '100%' }}
                    showSearch={{ optionFilterProp: 'label' }} options={submajorOptions}
                    notFoundContent="ไม่มีหน่วยงานในกลุ่มงานที่เลือก" />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>สถานะ</Text>
                  <Select placeholder="ทั้งหมด" value={filterStatus} onChange={setFilterStatus} allowClear style={{ width: '100%' }}
                    options={userStatuses.map((s) => ({ label: s.name, value: s.id }))} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>การใช้งาน</Text>
                  <Select placeholder="ทั้งหมด" value={filterActive} onChange={setFilterActive} allowClear style={{ width: '100%' }}
                    options={[{ label: 'ใช้งาน', value: 'active' }, { label: 'ระงับ', value: 'inactive' }]} />
                </Col>
              </Row>
            </div>
          </div>

          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              pagination={{ pageSize: 10, showTotal: (total, range) => `แสดง ${range[0]}-${range[1]} จาก ${total} รายการ`, style: { padding: '0 24px' } }}
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            />
          </Spin>
        </Card>

        {/* ── Add/Edit Drawer ── */}
        <ConfigProvider locale={TH_LOCALE}>
        <Drawer
          title={
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-lg"
                style={{ width: 36, height: 36, backgroundColor: '#006a5a20', color: '#006a5a' }}>
                {editing ? <EditOutlined /> : <PlusOutlined />}
              </div>
              <span>{editing ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}</span>
            </div>
          }
          size="large"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          styles={{ body: { paddingBottom: 80 } }}
          extra={
            <Space>
              <Button onClick={() => setDrawerOpen(false)}>ยกเลิก</Button>
              <Button type="primary" onClick={handleSave} loading={saving} style={{ backgroundColor: '#006a5a', borderColor: '#006a5a' }}>
                บันทึก
              </Button>
            </Space>
          }
        >
          <Form form={form} layout="vertical" requiredMark="optional">

            <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3">ข้อมูลส่วนตัว</div>
            <Row gutter={12}>
              <Col span={6}>
                <Form.Item name="pname" label="คำนำหน้า">
                  <Select placeholder="เลือก" options={[{ label: 'นาย', value: 'นาย' }, { label: 'นาง', value: 'นาง' }, { label: 'นางสาว', value: 'นางสาว' }]} allowClear />
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item name="fname" label="ชื่อ" rules={[{ required: true, message: 'กรุณาระบุชื่อ' }]}>
                  <Input placeholder="ชื่อ" />
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item name="lname" label="นามสกุล" rules={[{ required: true, message: 'กรุณาระบุนามสกุล' }]}>
                  <Input placeholder="นามสกุล" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="id_card" label="เลขบัตรประชาชน">
                  <Input placeholder="1 0000 00000 00 0" maxLength={13} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="gender" label="เพศ">
                  <Select placeholder="เลือก" allowClear options={[{ label: 'ชาย', value: 'ชาย' }, { label: 'หญิง', value: 'หญิง' }]} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="birthday" label="วันเกิด">
                  <DatePicker style={{ width: '100%' }} format={BE_DATE} placeholder="เลือกวันเกิด" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="hire_date" label="วันที่บรรจุ">
                  <DatePicker style={{ width: '100%' }} format={BE_DATE} placeholder="เลือกวันที่บรรจุ" />
                </Form.Item>
              </Col>
            </Row>

            <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3 mt-2">สังกัด / ตำแหน่ง</div>
            <Form.Item name="mission_id" label="ด้าน/ภารกิจ">
              <Select placeholder="เลือกด้าน" options={toOpts(missions)} onChange={handleMissionChange} allowClear showSearch filterOption={(input, opt) => String(opt?.label ?? '').includes(input)} />
            </Form.Item>
            <Form.Item name="major_id" label="กลุ่มงาน">
              <Select placeholder="เลือกกลุ่มงาน (กรุณาเลือกด้าน/ภารกิจก่อน)" options={toOpts(filteredMajors)} onChange={handleMajorChange} allowClear showSearch filterOption={(input, opt) => String(opt?.label ?? '').includes(input)} disabled={filteredMajors.length === 0} />
            </Form.Item>
            <Form.Item name="submajor_id" label="หน่วยงาน">
              <Select placeholder="เลือกหน่วยงาน (กรุณาเลือกกลุ่มงานก่อน)" options={toOpts(filteredSubmajors)} allowClear showSearch filterOption={(input, opt) => String(opt?.label ?? '').includes(input)} disabled={filteredSubmajors.length === 0} />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="user_position_id" label="ตำแหน่ง">
                  <Select placeholder="เลือกตำแหน่ง" options={toOpts(positions)} allowClear showSearch filterOption={(input, opt) => String(opt?.label ?? '').includes(input)} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="user_level_id" label="ระดับ">
                  <Select placeholder="เลือกระดับ" options={toOpts(levels)} allowClear showSearch filterOption={(input, opt) => String(opt?.label ?? '').includes(input)} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="user_type_id" label="ประเภทบุคลากร">
                  <Select placeholder="เลือกประเภท" options={toOpts(userTypes)} allowClear />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="user_status_id" label="สถานะ">
                  <Select
                    placeholder="เลือกสถานะ"
                    options={toOpts(userStatuses)}
                    allowClear
                    onChange={(v) => {
                      // สลับกลับมา "ปฏิบัติงาน" (หรือล้างค่า) -> เคลียร์วันสิ้นสุดทันที
                      if (!isNonWorkingStatus(v as number | undefined)) {
                        form.setFieldValue('work_end_date', undefined)
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {isNonWorkingStatus(watchedStatusId) && (
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="work_end_date"
                    label="วันที่สิ้นสุดการปฏิบัติงาน"
                    tooltip="วันสุดท้ายที่บุคลากรปฏิบัติงาน (เช่น วันลาออก/เกษียณ/โอนย้าย)"
                    rules={[{ required: true, message: 'กรุณาระบุวันที่สิ้นสุดการปฏิบัติงาน' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format={BE_DATE} placeholder="เลือกวันที่สิ้นสุด" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <div className="mt-7 text-xs text-app-text-2">
                    เมื่อบันทึก สถานะการใช้งานจะถูกตั้งเป็น <Tag color="red" className="ml-1">ระงับ (is_active=N)</Tag>
                  </div>
                </Col>
              </Row>
            )}

          </Form>
        </Drawer>
        </ConfigProvider>

      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PageContent />
    </AppThemeProvider>
  )
}
