'use client'
import React, { useState, useEffect, useMemo } from 'react'
import Cookies from 'js-cookie'
import {
  Card, Table, Tag, Typography, Breadcrumb, Button, Modal, Form, Input,
  InputNumber, Select, Switch, Space, App, Empty, Tooltip, Popconfirm
} from 'antd'
import {
  HomeOutlined, SettingOutlined, EditOutlined, PlusOutlined, DeleteOutlined,
  MedicineBoxOutlined, HeartOutlined, CoffeeOutlined, GlobalOutlined, ReadOutlined,
  SafetyOutlined, TeamOutlined, UserOutlined, UserSwitchOutlined, SmileOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { GiPrayerBeads, GiWalkingBoot } from 'react-icons/gi'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography

// หน้านี้แก้ไขกฎสิทธิ์การลาทั้งองค์กร — จำกัดเฉพาะ ADMIN/HR (ตรงกับ requireRoles ฝั่ง backend)
const ALLOWED_ROLES = ['ADMIN', 'HR']

// ไอคอน + สีของแต่ละประเภทการลา (ตรงกับหน้ายื่นคำขอลา — key = hr_leave_types.code)
const LEAVE_TYPE_STYLE: Record<string, { icon: React.ReactNode; color: string }> = {
  SICK:   { icon: <MedicineBoxOutlined />, color: '#ef4444' },
  MAT:    { icon: <HeartOutlined />,       color: '#ec4899' },
  PERS:   { icon: <UserOutlined />,        color: '#6366f1' },
  ANNUAL: { icon: <CoffeeOutlined />,      color: '#0d9488' },
  PAT:    { icon: <TeamOutlined />,        color: '#3b82f6' },
  ORDAIN: { icon: <GiPrayerBeads />,       color: '#d97706' },
  MIL:    { icon: <SafetyOutlined />,      color: '#64748b' },
  STUDY:  { icon: <ReadOutlined />,        color: '#7c3aed' },
  INTL:   { icon: <GlobalOutlined />,      color: '#0ea5e9' },
  FOLLOW: { icon: <UserSwitchOutlined />,  color: '#f59e0b' },
  REHAB:  { icon: <GiWalkingBoot />,       color: '#16a34a' },
}
const DEFAULT_LEAVE_STYLE = { icon: <SmileOutlined />, color: '#6b7280' }
const getLeaveStyle = (code?: string) => (code && LEAVE_TYPE_STYLE[code]) || DEFAULT_LEAVE_STYLE

const GENDER_LABEL: Record<string, string> = { ALL: 'ทุกเพศ', MALE: 'ชายเท่านั้น', FEMALE: 'หญิงเท่านั้น' }

interface LeaveTypeRow {
  id: number
  code: string
  name_th: string
  name_en: string | null
  requires_document: boolean
  requires_document_after_days: number | null
  requires_approval: boolean
  gender_restriction: string
  is_paid: boolean
  sort_order: number
  is_active: boolean
}

interface Entitlement {
  id: number
  leave_type_id: number
  user_type_id: number
  max_days_per_year: number | null
  min_service_months: number
  carry_over: boolean
  carry_over_max_days: number | null
}

interface UserTypeOpt { user_type_id: number; user_type_name: string }

const PolicyPageContent = () => {
  const { message } = App.useApp()

  // roles จาก cookie (normalize เป็นตัวพิมพ์ใหญ่) — ต้องมี ADMIN หรือ HR อย่างน้อย 1 ตัวจึงเข้าหน้านี้ได้
  const hasAccess = useMemo(() => {
    try {
      const raw = Cookies.get('user_data')
      if (!raw) return false
      const roles: string[] = JSON.parse(raw).roles ?? []
      return roles.map(r => String(r).toUpperCase()).some(r => ALLOWED_ROLES.includes(r))
    } catch {
      return false
    }
  }, [])

  // gate การ render จนกว่าจะ mount ฝั่ง client — กัน hydration mismatch จากการอ่าน cookie
  // (server อ่าน cookie ไม่ได้ → hasAccess ต่างจาก client ตอน render แรก)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([])
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [userTypes, setUserTypes] = useState<UserTypeOpt[]>([])
  const [loading, setLoading] = useState(false)

  const loadAll = () => {
    if (!hasAccess) return
    setLoading(true)
    Promise.all([
      fetch('/api/v1/hr/leave-types/full').then(r => r.json()),
      fetch('/api/v1/hr/leave-entitlements').then(r => r.json()),
      fetch('/api/v1/system/user-types').then(r => r.json()),
    ])
      .then(([lt, ent, ut]) => {
        if (lt.success) setLeaveTypes(lt.data)
        if (ent.success) setEntitlements(ent.data)
        if (ut.success) setUserTypes(ut.data)
      })
      .catch(() => message.error('ไม่สามารถโหลดข้อมูลกำหนดสิทธิ์การลาได้'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [message, hasAccess])

  const userTypeName = (id: number) => userTypes.find(u => u.user_type_id === id)?.user_type_name ?? `ประเภท #${id}`

  // ── แก้ไขประเภทการลา ──────────────────────────────────────────────────────
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<LeaveTypeRow | null>(null)
  const [typeForm] = Form.useForm()
  const [savingType, setSavingType] = useState(false)

  const openEditType = (row: LeaveTypeRow) => {
    setEditingType(row)
    typeForm.setFieldsValue(row)
    setTypeModalOpen(true)
  }

  const saveType = async () => {
    const values = await typeForm.validateFields()
    if (!editingType) return
    setSavingType(true)
    try {
      const res = await fetch(`/api/v1/hr/leave-types/${editingType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        message.error(json.message || 'บันทึกไม่สำเร็จ')
        return
      }
      setLeaveTypes(prev => prev.map(t => t.id === editingType.id ? json.data : t))
      setTypeModalOpen(false)
      message.success('บันทึกเงื่อนไขประเภทการลาเรียบร้อย')
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSavingType(false)
    }
  }

  // ── เพิ่ม/แก้ไขเกณฑ์สิทธิ์การลา ────────────────────────────────────────────
  const [entModalOpen, setEntModalOpen] = useState(false)
  const [editingEnt, setEditingEnt] = useState<Entitlement | null>(null) // null = โหมดเพิ่มใหม่
  const [entLeaveTypeId, setEntLeaveTypeId] = useState<number | null>(null)
  const [entForm] = Form.useForm()
  const [savingEnt, setSavingEnt] = useState(false)
  const carryOverWatch = Form.useWatch('carry_over', entForm)
  const unlimitedWatch = Form.useWatch('unlimited', entForm)

  const openAddEntitlement = (leaveTypeId: number) => {
    setEditingEnt(null)
    setEntLeaveTypeId(leaveTypeId)
    entForm.resetFields()
    entForm.setFieldsValue({ min_service_months: 0, carry_over: false, unlimited: false, max_days_per_year: 30 })
    setEntModalOpen(true)
  }

  const openEditEntitlement = (row: Entitlement) => {
    setEditingEnt(row)
    setEntLeaveTypeId(row.leave_type_id)
    entForm.setFieldsValue({ ...row, unlimited: row.max_days_per_year == null })
    setEntModalOpen(true)
  }

  const saveEntitlement = async () => {
    const values = await entForm.validateFields()
    const payload = {
      max_days_per_year: values.unlimited ? null : values.max_days_per_year,
      min_service_months: values.min_service_months ?? 0,
      carry_over: !!values.carry_over,
      carry_over_max_days: values.carry_over ? values.carry_over_max_days : null,
    }
    setSavingEnt(true)
    try {
      const isEdit = editingEnt != null
      const url = isEdit ? `/api/v1/hr/leave-entitlements/${editingEnt!.id}` : '/api/v1/hr/leave-entitlements'
      const body = isEdit ? payload : { ...payload, leave_type_id: entLeaveTypeId, user_type_id: values.user_type_id }
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        message.error(json.message || 'บันทึกไม่สำเร็จ')
        return
      }
      setEntitlements(prev => isEdit
        ? prev.map(e => e.id === json.data.id ? json.data : e)
        : [...prev, json.data])
      setEntModalOpen(false)
      message.success('บันทึกเกณฑ์สิทธิ์การลาเรียบร้อย')
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSavingEnt(false)
    }
  }

  const deleteEntitlement = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/hr/leave-entitlements/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        message.error(json.message || 'ลบไม่สำเร็จ')
        return
      }
      setEntitlements(prev => prev.filter(e => e.id !== id))
      message.success('ลบเกณฑ์สิทธิ์การลาเรียบร้อย')
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    }
  }

  // ── ตารางประเภทการลา ──────────────────────────────────────────────────────
  const columns = [
    {
      title: 'ประเภทการลา', key: 'name', width: 260,
      render: (_: any, r: LeaveTypeRow) => {
        const style = getLeaveStyle(r.code)
        return (
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 32, height: 32, backgroundColor: `${style.color}1f`, color: style.color, fontSize: 15, flexShrink: 0 }}
            >
              {style.icon}
            </span>
            <div>
              <Text strong style={{ fontSize: 13 }}>{r.name_th}</Text>
              <div><Tag style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>{r.code}</Tag></div>
            </div>
          </div>
        )
      },
    },
    {
      title: 'เพศที่ลาได้', key: 'gender', width: 110, align: 'center' as const,
      render: (_: any, r: LeaveTypeRow) => <Tag color={r.gender_restriction === 'ALL' ? 'default' : 'blue'}>{GENDER_LABEL[r.gender_restriction] ?? r.gender_restriction}</Tag>,
    },
    {
      title: 'ต้องมีเอกสารหลังลาเกิน', key: 'doc', width: 150, align: 'center' as const,
      render: (_: any, r: LeaveTypeRow) => r.requires_document_after_days != null
        ? <Text>{r.requires_document_after_days} วัน</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'จ่ายเงินระหว่างลา', key: 'paid', width: 130, align: 'center' as const,
      render: (_: any, r: LeaveTypeRow) => r.is_paid ? <Tag color="green">จ่ายเงิน</Tag> : <Tag color="red">ไม่จ่ายเงิน</Tag>,
    },
    {
      title: 'สถานะ', key: 'active', width: 100, align: 'center' as const,
      render: (_: any, r: LeaveTypeRow) => r.is_active ? <Tag color="success">ใช้งาน</Tag> : <Tag>ปิดใช้งาน</Tag>,
    },
    {
      title: '', key: 'action', width: 70, align: 'center' as const,
      render: (_: any, r: LeaveTypeRow) => (
        <Tooltip title="แก้ไขเงื่อนไข">
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditType(r)} />
        </Tooltip>
      ),
    },
  ]

  const entitlementColumns = (leaveTypeId: number) => [
    { title: 'ประเภทเจ้าหน้าที่', key: 'ut', render: (_: any, r: Entitlement) => <Text>{userTypeName(r.user_type_id)}</Text> },
    {
      title: 'สิทธิ์สูงสุด (วัน/ปี)', key: 'max', align: 'center' as const,
      render: (_: any, r: Entitlement) => r.max_days_per_year != null ? <strong>{r.max_days_per_year}</strong> : <Tag color="gold">ไม่จำกัด</Tag>,
    },
    {
      title: 'อายุงานขั้นต่ำ (เดือน)', key: 'svc', align: 'center' as const,
      render: (_: any, r: Entitlement) => r.min_service_months > 0 ? r.min_service_months : <Text type="secondary">ไม่กำหนด</Text>,
    },
    {
      title: 'สะสมข้ามปี', key: 'carry', align: 'center' as const,
      render: (_: any, r: Entitlement) => r.carry_over
        ? <Tag color="blue">สะสมได้ ≤ {r.carry_over_max_days ?? '—'} วัน</Tag>
        : <Tag>สะสมไม่ได้</Tag>,
    },
    {
      title: '', key: 'action', width: 90, align: 'center' as const,
      render: (_: any, r: Entitlement) => (
        <Space size={4}>
          <Tooltip title="แก้ไข">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditEntitlement(r)} />
          </Tooltip>
          <Popconfirm title="ลบเกณฑ์นี้?" okText="ลบ" cancelText="ยกเลิก" onConfirm={() => deleteEntitlement(r.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const userTypeOptions = useMemo(() => userTypes.map(u => ({ value: u.user_type_id, label: u.user_type_name })), [userTypes])

  if (mounted && !hasAccess) {
    return (
      <div className="min-h-dvh bg-app-bg text-app-text">
        <Navbar />
        <div className="p-6 md:p-8" style={{ display: 'flex', justifyContent: 'center' }}>
          <Card style={{ background: 'var(--app-surface)', border: '1px solid #334155', borderRadius: 10, maxWidth: 480, marginTop: 60, textAlign: 'center' }}>
            <CloseCircleOutlined style={{ fontSize: 48, color: '#ef4444', marginBottom: 16 }} />
            <Title level={4} style={{ color: 'var(--app-text)', marginTop: 0 }}>ไม่มีสิทธิ์เข้าถึง</Title>
            <Text style={{ color: 'var(--app-text-2)' }}>
              หน้ากำหนดสิทธิ์การลานี้เปิดให้เฉพาะผู้ดูแลระบบและงานทรัพยากรบุคคลเท่านั้น
            </Text>
            <div style={{ marginTop: 20 }}>
              <Button type="primary" href="/home" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
                <HomeOutlined /> กลับหน้าหลัก
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
            { title: 'กำหนดสิทธิ์การลา' },
          ]}
          className="mb-4"
        />

        <Card style={{ background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)', border: 'none', borderRadius: 16, marginBottom: 24 }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <SettingOutlined className="text-2xl text-white" />
            </div>
            <div>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>กำหนดสิทธิ์การลา</Title>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                ตั้งค่าจำนวนวันลาสูงสุด การสะสมวันลา และเงื่อนไขของแต่ละประเภทการลา ตามระเบียบราชการ
              </Text>
            </div>
          </div>
        </Card>

        <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: 0 } }}>
          <Table
            loading={loading}
            columns={columns}
            dataSource={leaveTypes}
            rowKey="id"
            pagination={false}
            size="middle"
            expandable={{
              expandedRowRender: (r: LeaveTypeRow) => {
                const rows = entitlements
                  .filter(e => e.leave_type_id === r.id)
                  .sort((a, b) => a.user_type_id - b.user_type_id || a.min_service_months - b.min_service_months)
                return (
                  <div className="py-2">
                    <div className="flex items-center justify-between mb-3">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        เกณฑ์สิทธิ์ตามประเภทเจ้าหน้าที่ — ประเภทเดียวกันเพิ่มได้หลายเกณฑ์ตามอายุงาน (เช่น สะสมได้มากขึ้นเมื่อทำงานนานขึ้น)
                      </Text>
                      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => openAddEntitlement(r.id)}>
                        เพิ่มเกณฑ์
                      </Button>
                    </div>
                    {rows.length === 0 ? (
                      <Empty description="ยังไม่มีเกณฑ์สิทธิ์สำหรับประเภทการลานี้" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <Table columns={entitlementColumns(r.id)} dataSource={rows} rowKey="id" pagination={false} size="small" />
                    )}
                  </div>
                )
              },
            }}
          />
        </Card>

        {/* ── Modal แก้ไขเงื่อนไขประเภทการลา ── */}
        <Modal
          title={<Space><EditOutlined style={{ color: '#006a5a' }} /><span>แก้ไขเงื่อนไข: {editingType?.name_th}</span></Space>}
          open={typeModalOpen}
          onCancel={() => setTypeModalOpen(false)}
          onOk={saveType}
          okText="บันทึก"
          cancelText="ยกเลิก"
          confirmLoading={savingType}
          forceRender
        >
          <Form form={typeForm} layout="vertical">
            <Form.Item name="name_th" label="ชื่อประเภทการลา" rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="gender_restriction" label="เพศที่ลาได้">
              <Select options={[
                { value: 'ALL', label: 'ทุกเพศ' },
                { value: 'MALE', label: 'ชายเท่านั้น' },
                { value: 'FEMALE', label: 'หญิงเท่านั้น' },
              ]} />
            </Form.Item>
            <Space size="large">
              <Form.Item name="requires_document" label="ต้องแนบเอกสาร" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="requires_document_after_days" label="แนบเอกสารเมื่อลาเกิน (วัน)">
                <InputNumber min={0} />
              </Form.Item>
            </Space>
            <Space size="large">
              <Form.Item name="requires_approval" label="ต้องผ่านการอนุมัติ" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="is_paid" label="จ่ายเงินระหว่างลา" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="is_active" label="เปิดใช้งาน" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Space>
          </Form>
        </Modal>

        {/* ── Modal เพิ่ม/แก้ไขเกณฑ์สิทธิ์การลา ── */}
        <Modal
          title={
            <Space>
              <EditOutlined style={{ color: '#006a5a' }} />
              <span>{editingEnt ? 'แก้ไขเกณฑ์สิทธิ์การลา' : 'เพิ่มเกณฑ์สิทธิ์การลา'}</span>
            </Space>
          }
          open={entModalOpen}
          onCancel={() => setEntModalOpen(false)}
          onOk={saveEntitlement}
          okText="บันทึก"
          cancelText="ยกเลิก"
          confirmLoading={savingEnt}
          forceRender
        >
          <Form form={entForm} layout="vertical">
            {!editingEnt && (
              <Form.Item name="user_type_id" label="ประเภทเจ้าหน้าที่" rules={[{ required: true, message: 'กรุณาเลือกประเภทเจ้าหน้าที่' }]}>
                <Select showSearch optionFilterProp="label" options={userTypeOptions} placeholder="เลือกประเภทเจ้าหน้าที่" />
              </Form.Item>
            )}
            <Space align="start" size="large">
              <Form.Item name="unlimited" label="ไม่จำกัดจำนวนวัน" valuePropName="checked">
                <Switch />
              </Form.Item>
              {!unlimitedWatch && (
                <Form.Item name="max_days_per_year" label="สิทธิ์สูงสุด (วัน/ปี)" rules={[{ required: !unlimitedWatch, message: 'กรุณาระบุจำนวนวัน' }]}>
                  <InputNumber min={0} />
                </Form.Item>
              )}
            </Space>
            <Form.Item
              name="min_service_months"
              label="อายุงานขั้นต่ำ (เดือน)"
              tooltip="ใช้ทำเกณฑ์แบบขั้นบันได เช่น ปีแรกสะสมได้น้อยกว่า ทำงานครบ 10 ปีสะสมได้มากขึ้น"
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="carry_over" label="สะสมวันลาข้ามปีได้" valuePropName="checked">
              <Switch />
            </Form.Item>
            {carryOverWatch && (
              <Form.Item name="carry_over_max_days" label="สะสมได้สูงสุด (วัน)" rules={[{ required: true, message: 'กรุณาระบุจำนวนวันสะสมสูงสุด' }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </div>
    </div>
  )
}

export default function LeavePolicyPage() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PolicyPageContent />
    </AppThemeProvider>
  )
}
