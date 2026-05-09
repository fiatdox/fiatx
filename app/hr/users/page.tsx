'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Table, Input, Button, Space, ConfigProvider, Card, Row, Col, Tag,
  Avatar, Drawer, Form, Select, Breadcrumb, Tooltip, theme,
  App, Typography, Popconfirm, Badge, Spin, DatePicker,
} from 'antd'
import {
  EditOutlined, SearchOutlined, UserOutlined, PlusOutlined,
  HomeOutlined, IdcardOutlined, CheckCircleOutlined, StopOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { FaUsersCog, FaUsers, FaFilter, FaFileExcel } from 'react-icons/fa'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'

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
  hospital_lc_pid?: number
}

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

const isActive = (u: User) =>
  u.is_active === true || u.is_active === 'true' || u.is_active === '1' || u.is_active === 'Y'

// ── Page ───────────────────────────────────────────────────────────────────

const PageContent = () => {
  const { message } = App.useApp()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMission, setFilterMission] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<number | null>(null)
  const [filterActive, setFilterActive] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // system dropdowns
  const [missions, setMissions] = useState<SystemOption[]>([])
  const [positions, setPositions] = useState<SystemOption[]>([])
  const [levels, setLevels] = useState<SystemOption[]>([])
  const [userTypes, setUserTypes] = useState<SystemOption[]>([])
  const [userStatuses, setUserStatuses] = useState<SystemOption[]>([])

  // cascade sub-lists (populated on parent selection)
  const [filteredMajors, setFilteredMajors] = useState<SystemOption[]>([])
  const [filteredSubmajors, setFilteredSubmajors] = useState<SystemOption[]>([])
  // all majors cache — built up as cascade calls are made, used for table display
  const [allMajors, setAllMajors] = useState<SystemOption[]>([])

  // ID → name lookup helpers
  const byId = (arr: SystemOption[], id?: number) => arr.find((o) => o.id === id)?.name ?? '-'

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/users')
      const list: User[] = Array.isArray(data) ? data : data.data ?? []
      setUsers(list)
      // fetch majors for every unique mission found in the list for table display
      const missionIds = [...new Set(list.map((u) => u.mission_id).filter(Boolean))] as number[]
      if (missionIds.length) {
        Promise.all(missionIds.map((mid) => apiFetch(`/api/system/missions/${mid}/majors`))).then((results) => {
          const merged = results.flatMap((d) => extractList(d))
          setAllMajors((prev) => {
            const map = new Map(prev.map((o) => [o.id, o]))
            merged.forEach((o) => map.set(o.id, o))
            return [...map.values()]
          })
        })
      }
    } catch {
      message.error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    loadUsers()
    Promise.all([
      apiFetch('/api/system/missions'),
      apiFetch('/api/system/positions'),
      apiFetch('/api/system/levels'),
      apiFetch('/api/system/user-types'),
      apiFetch('/api/system/user-statuses'),
    ]).then(([m, p, l, ut, us]) => {
      setMissions(extractList(m))
      setPositions(extractList(p))
      setLevels(extractList(l))
      setUserTypes(extractList(ut))
      setUserStatuses(extractList(us))
    })
  }, [loadUsers])

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

  const handleEdit = (record: User) => {
    setEditing(record)
    setFilteredMajors([])
    setFilteredSubmajors([])
    form.setFieldsValue({
      ...record,
      birthday: record.birthday ? dayjs(record.birthday) : undefined,
      hire_date: record.hire_date ? dayjs(record.hire_date) : undefined,
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
    // auto-set username/password = id_card for new users
    if (!editing) {
      const idCard = values.id_card as string
      values.username = idCard
      values.password = idCard
    }

    setSaving(true)
    try {
      if (editing) {
        await apiFetch(`/api/users/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        message.success('แก้ไขข้อมูลสำเร็จ')
      } else {
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

  const handleToggleActive = async (user: User) => {
    const action = isActive(user) ? 'deactivate' : 'activate'
    const label = isActive(user) ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'
    const result = await Swal.fire({
      title: `${label}?`,
      text: `${user.pname ?? ''}${user.fname} ${user.lname}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: isActive(user) ? '#ef4444' : '#006a5a',
      cancelButtonText: 'ยกเลิก',
      confirmButtonText: label,
      background: '#1e293b',
      color: '#e2e8f0',
    })
    if (!result.isConfirmed) return
    try {
      await apiFetch(`/api/users/${user.id}/${action}`, { method: 'PATCH' })
      message.success(`${label}สำเร็จ`)
      loadUsers()
    } catch {
      message.error('ดำเนินการไม่สำเร็จ')
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch = !q || [u.fname, u.lname, u.pname, u.username, u.id_card, u.position_name]
      .some((v) => v?.toLowerCase().includes(q))
    const matchMission = !filterMission || u.mission_id === filterMission
    const matchStatus = !filterStatus || u.user_status_id === filterStatus
    const matchActive = filterActive === null || (filterActive === 'active' ? isActive(u) : !isActive(u))
    return matchSearch && matchMission && matchStatus && matchActive
  })

  const activeFilterCount = [filterMission, filterStatus, filterActive].filter(Boolean).length

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
      'ด้าน': u.mission_name ?? '',
      'กลุ่มงาน': u.major_name ?? '',
      'กลุ่มงานย่อย': u.submajor_name ?? '',
      'ตำแหน่ง': u.position_name ?? '',
      'ระดับ': u.level_name ?? '',
      'ประเภท': u.type_name ?? '',
      'สถานะ': u.status_name ?? '',
      'วันเกิด': u.birthday ? dayjs(u.birthday).format('DD/MM/YYYY') : '',
      'วันที่บรรจุ': u.hire_date ? dayjs(u.hire_date).format('DD/MM/YYYY') : '',
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
            <div className="font-semibold text-slate-100 text-[14px]">
              {u.pname}{u.fname} {u.lname}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
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
      render: (v: string) => <Text style={{ fontSize: 13, color: '#94a3b8' }}>{v}</Text>,
    },
    {
      title: 'ด้าน / กลุ่มงาน',
      key: 'mission',
      width: 220,
      render: (_: unknown, u: User) => (
        <div>
          <div className="text-[13px] text-slate-200">{byId(missions, u.mission_id)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{u.major_id ? byId(allMajors, u.major_id) : '-'}</div>
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
            <div className="text-[13px] text-slate-200">{byId(positions, u.user_position_id)}</div>
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
        return name !== '-' ? <Tag style={{ borderRadius: 4, fontSize: 11 }}>{name}</Tag> : <span className="text-slate-500">-</span>
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
          <Tooltip title={isActive(u) ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}>
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={isActive(u)
                ? <StopOutlined style={{ color: '#ef4444' }} />
                : <CheckCircleOutlined style={{ color: '#22c55e' }} />}
              onClick={() => handleToggleActive(u)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-200" style={{ minHeight: '100dvh' }}>
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
                  style={{ backgroundColor: '#facc15', color: '#1e293b', border: 'none', fontWeight: 600 }}>
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
                  placeholder="ค้นหาชื่อ, username, เลขบัตร..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 280 }}
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
                  <FaFilter style={{ color: '#94a3b8', fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 13 }}>ตัวกรองข้อมูล</Text>
                </div>
                {activeFilterCount > 0 && (
                  <Button type="link" size="small" danger style={{ padding: 0, height: 'auto' }}
                    onClick={() => { setFilterMission(null); setFilterStatus(null); setFilterActive(null) }}>
                    ล้างตัวกรอง
                  </Button>
                )}
              </div>
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={8}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>ด้าน/ภารกิจ</Text>
                  <Select placeholder="ทั้งหมด" value={filterMission} onChange={setFilterMission} allowClear style={{ width: '100%' }}
                    options={missions.map((m) => ({ label: m.name, value: m.id }))} />
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

            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">ข้อมูลส่วนตัว</div>
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
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="เลือกวันเกิด" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="hire_date" label="วันที่บรรจุ">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="เลือกวันที่บรรจุ" />
                </Form.Item>
              </Col>
            </Row>

            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-2">สังกัด / ตำแหน่ง</div>
            <Form.Item name="mission_id" label="ด้าน/ภารกิจ">
              <Select placeholder="เลือกด้าน" options={toOpts(missions)} onChange={handleMissionChange} allowClear showSearch filterOption={(input, opt) => String(opt?.label ?? '').includes(input)} />
            </Form.Item>
            <Form.Item name="major_id" label="กลุ่มงาน">
              <Select placeholder="เลือกกลุ่มงาน (กรุณาเลือกด้าน/ภารกิจก่อน)" options={toOpts(filteredMajors)} onChange={handleMajorChange} allowClear showSearch filterOption={(input, opt) => String(opt?.label ?? '').includes(input)} disabled={filteredMajors.length === 0} />
            </Form.Item>
            <Form.Item name="submajor_id" label="กลุ่มงานย่อย">
              <Select placeholder="เลือกกลุ่มงานย่อย (กรุณาเลือกกลุ่มงานก่อน)" options={toOpts(filteredSubmajors)} allowClear showSearch filterOption={(input, opt) => String(opt?.label ?? '').includes(input)} disabled={filteredSubmajors.length === 0} />
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
                  <Select placeholder="เลือกสถานะ" options={toOpts(userStatuses)} allowClear />
                </Form.Item>
              </Col>
            </Row>


          </Form>
        </Drawer>

      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ConfigProvider
      theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#006a5a', borderRadius: 8 } }}
      getPopupContainer={(triggerNode) => triggerNode?.parentElement ?? document.body}
    >
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
