'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Cookies from 'js-cookie'
import {
  Card, Table, Tag, Typography, Breadcrumb, Button, Modal, Form, Input,
  InputNumber, Select, Space, App, Tooltip, Row, Col, Empty
} from 'antd'
import {
  HomeOutlined, SwapOutlined, EditOutlined, PlusOutlined, SearchOutlined,
  CloseCircleOutlined, HistoryOutlined
} from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography

// หน้านี้แก้ไขยอดวันลาสะสมของบุคลากรทั้งองค์กร — จำกัดเฉพาะ ADMIN/HR (ตรงกับ requireRoles ฝั่ง backend)
const ALLOWED_ROLES = ['ADMIN', 'HR']

interface LeaveTypeOpt { id: number; code: string; name_th: string }
interface OrgOpt { id: number; name: string; parent_id?: number }
interface BalanceRow {
  user_id: number
  pname?: string
  fname: string
  lname: string
  position_name?: string
  mission_name?: string
  major_name?: string
  submajor_name?: string
  balance_id: number | null
  carried_in: string | null
  entitled: string | null
  used: string | null
  remaining: string | null
  note: string | null
  updated_at: string | null
}

const PageContent = () => {
  const { message } = App.useApp()

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

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // ── หน้านี้ทำเฉพาะ "ลาพักผ่อน" (ANNUAL) เท่านั้น — ตามระเบียบราชการที่ให้สะสมได้ ──
  const [leaveTypeId, setLeaveTypeId] = useState<number | null>(null)
  const [fiscalYears, setFiscalYears] = useState<number[]>([])
  const [fiscalYear, setFiscalYear] = useState<number | null>(null)

  useEffect(() => {
    if (!hasAccess) return
    Promise.all([
      fetch('/api/v1/hr/leave-types/full').then(r => r.json()),
      fetch('/api/v1/hr/leave-balances/meta').then(r => r.json()),
    ]).then(([lt, meta]) => {
      if (lt.success) {
        const annual = (lt.data as LeaveTypeOpt[]).find(t => t.code === 'ANNUAL')
        if (annual) setLeaveTypeId(annual.id)
        else message.error('ไม่พบประเภทการลาพักผ่อน (ANNUAL) ในระบบ')
      }
      if (meta.success) {
        setFiscalYears(meta.data.fiscal_years)
        setFiscalYear(meta.data.current_fiscal_year)
      }
    }).catch(() => message.error('ไม่สามารถโหลดข้อมูลตั้งต้นได้'))
  }, [hasAccess, message])

  // ── ตัวเลือกกรององค์กร (ภารกิจ/กลุ่มงาน/หน่วยงาน) ────────────────────────
  const [missions, setMissions] = useState<OrgOpt[]>([])
  const [majors, setMajors] = useState<(OrgOpt & { mission_id?: number })[]>([])
  const [submajors, setSubmajors] = useState<(OrgOpt & { major_id?: number })[]>([])
  const [filterMission, setFilterMission] = useState<string>('')
  const [filterMajor, setFilterMajor] = useState<string>('')
  const [filterSubmajor, setFilterSubmajor] = useState<string>('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!hasAccess) return
    Promise.all([
      fetch('/api/v1/system/missions').then(r => r.json()),
      fetch('/api/v1/system/majors').then(r => r.json()),
      fetch('/api/v1/system/submajors').then(r => r.json()),
    ]).then(([m, maj, sub]) => {
      if (m.success) setMissions(m.data.map((r: any) => ({ id: r.mission_id, name: r.mission_name })))
      if (maj.success) setMajors(maj.data.map((r: any) => ({ id: r.major_id, name: r.major_name, mission_id: r.mission_id })))
      if (sub.success) setSubmajors(sub.data.map((r: any) => ({ id: r.submajor_id, name: r.submajor_name, major_id: r.major_id })))
    }).catch(() => message.error('ไม่สามารถโหลดข้อมูลหน่วยงานได้'))
  }, [hasAccess, message])

  const majorOptions = useMemo(
    () => filterMission ? majors.filter(m => String(m.mission_id) === filterMission) : majors,
    [majors, filterMission],
  )
  const submajorOptions = useMemo(
    () => filterMajor ? submajors.filter(s => String(s.major_id) === filterMajor) : submajors,
    [submajors, filterMajor],
  )

  const hasFilter = !!(filterMission || filterMajor || filterSubmajor || search.trim())

  // ── รายการวันลาสะสม ────────────────────────────────────────────────────────
  const [rows, setRows] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(false)

  const loadRows = useCallback(() => {
    if (!hasAccess || !leaveTypeId || !fiscalYear || !hasFilter) { setRows([]); return }
    setLoading(true)
    const params = new URLSearchParams({ leave_type_id: String(leaveTypeId), fiscal_year: String(fiscalYear) })
    if (filterMission) params.set('mission_id', filterMission)
    if (filterMajor) params.set('major_id', filterMajor)
    if (filterSubmajor) params.set('submajor_id', filterSubmajor)
    if (search.trim()) params.set('search', search.trim())
    fetch(`/api/v1/hr/leave-balances?${params.toString()}`)
      .then(r => r.json())
      .then(json => { if (json.success) setRows(json.data.rows) })
      .catch(() => message.error('ไม่สามารถโหลดข้อมูลวันลาสะสมได้'))
      .finally(() => setLoading(false))
  }, [hasAccess, leaveTypeId, fiscalYear, filterMission, filterMajor, filterSubmajor, search, hasFilter, message])

  useEffect(loadRows, [loadRows])

  // ── modal เพิ่ม/แก้ไขยอดสะสม ────────────────────────────────────────────────
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<BalanceRow | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const openEdit = (row: BalanceRow) => {
    setEditingRow(row)
    form.setFieldsValue({
      carried_in: row.balance_id ? Number(row.carried_in) : 0,
      used: row.balance_id ? Number(row.used) : 0,
      note: row.note ?? '',
    })
    setEditModalOpen(true)
  }

  const saveBalance = async () => {
    const values = await form.validateFields()
    if (!editingRow || !leaveTypeId || !fiscalYear) return
    setSaving(true)
    try {
      const isNew = editingRow.balance_id == null
      const url = isNew ? '/api/v1/hr/leave-balances' : `/api/v1/hr/leave-balances/${editingRow.balance_id}`
      const body = isNew
        ? { user_id: editingRow.user_id, leave_type_id: leaveTypeId, fiscal_year: fiscalYear, carried_in: values.carried_in, used: values.used, note: values.note }
        : { carried_in: values.carried_in, used: values.used, note: values.note }
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        message.error(json.message || 'บันทึกไม่สำเร็จ')
        return
      }
      message.success('บันทึกยอดวันลาสะสมเรียบร้อย')
      setEditModalOpen(false)
      loadRows()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  // ── ยกยอดปีงบประมาณใหม่ ────────────────────────────────────────────────────
  const [rolloverOpen, setRolloverOpen] = useState(false)
  const [rolloverForm] = Form.useForm()
  const [rollingOver, setRollingOver] = useState(false)

  const openRollover = () => {
    rolloverForm.setFieldsValue({
      from_fiscal_year: fiscalYear,
      to_fiscal_year: (fiscalYear ?? 0) + 1,
    })
    setRolloverOpen(true)
  }

  const runRollover = async () => {
    const values = await rolloverForm.validateFields()
    setRollingOver(true)
    try {
      const res = await fetch('/api/v1/hr/leave-balances/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        message.error(json.message || 'ยกยอดไม่สำเร็จ')
        return
      }
      const { created, skipped_existing, skipped_no_entitlement } = json.data
      message.success(`ยกยอดสำเร็จ: สร้างใหม่ ${created} ราย, ข้าม (มีอยู่แล้ว) ${skipped_existing} ราย, ข้าม (ไม่มีสิทธิ์สะสม) ${skipped_no_entitlement} ราย`)
      setRolloverOpen(false)
      if (!fiscalYears.includes(values.to_fiscal_year)) setFiscalYears(prev => [values.to_fiscal_year, ...prev].sort((a, b) => b - a))
      loadRows()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setRollingOver(false)
    }
  }

  // ── ตาราง ──────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'บุคลากร', key: 'name',
      render: (_: any, r: BalanceRow) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.pname}{r.fname} {r.lname}</Text>
          {r.position_name && <div><Text type="secondary" style={{ fontSize: 11 }}>{r.position_name}</Text></div>}
        </div>
      ),
    },
    {
      title: 'สังกัด', key: 'org',
      render: (_: any, r: BalanceRow) => (
        <Space size={4} wrap>
          {r.mission_name && <Tag color="blue" style={{ fontSize: 10 }}>{r.mission_name}</Tag>}
          {r.major_name && <Tag color="green" style={{ fontSize: 10 }}>{r.major_name}</Tag>}
          {r.submajor_name && <Tag color="purple" style={{ fontSize: 10 }}>{r.submajor_name}</Tag>}
        </Space>
      ),
    },
    {
      title: 'ยกมา', key: 'carried_in', align: 'center' as const, width: 90,
      render: (_: any, r: BalanceRow) => r.balance_id ? Number(r.carried_in) : <Text type="secondary">—</Text>,
    },
    {
      title: 'สิทธิ์ปีนี้', key: 'entitled', align: 'center' as const, width: 90,
      render: (_: any, r: BalanceRow) => r.balance_id ? Number(r.entitled) : <Text type="secondary">—</Text>,
    },
    {
      title: 'ใช้ไปแล้ว', key: 'used', align: 'center' as const, width: 90,
      render: (_: any, r: BalanceRow) => r.balance_id ? Number(r.used) : <Text type="secondary">—</Text>,
    },
    {
      title: 'คงเหลือ', key: 'remaining', align: 'center' as const, width: 100,
      render: (_: any, r: BalanceRow) => r.balance_id
        ? <Text strong style={{ color: '#006a5a', fontSize: 15 }}>{Number(r.remaining)}</Text>
        : <Tag color="orange">ยังไม่มีข้อมูล</Tag>,
    },
    { title: 'หมายเหตุ', key: 'note', render: (_: any, r: BalanceRow) => r.note || <Text type="secondary">—</Text> },
    {
      title: '', key: 'action', width: 70, align: 'center' as const,
      render: (_: any, r: BalanceRow) => (
        <Tooltip title={r.balance_id ? 'แก้ไข' : 'เพิ่มยอดสะสม'}>
          <Button size="small" type="text" icon={r.balance_id ? <EditOutlined /> : <PlusOutlined />} onClick={() => openEdit(r)} />
        </Tooltip>
      ),
    },
  ]

  if (mounted && !hasAccess) {
    return (
      <div className="min-h-dvh bg-app-bg text-app-text">
        <Navbar />
        <div className="p-6 md:p-8" style={{ display: 'flex', justifyContent: 'center' }}>
          <Card style={{ background: 'var(--app-surface)', border: '1px solid #334155', borderRadius: 10, maxWidth: 480, marginTop: 60, textAlign: 'center' }}>
            <CloseCircleOutlined style={{ fontSize: 48, color: '#ef4444', marginBottom: 16 }} />
            <Title level={4} style={{ color: 'var(--app-text)', marginTop: 0 }}>ไม่มีสิทธิ์เข้าถึง</Title>
            <Text style={{ color: 'var(--app-text-2)' }}>
              หน้าจัดการวันลาสะสมนี้เปิดให้เฉพาะผู้ดูแลระบบและงานทรัพยากรบุคคลเท่านั้น
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
            { title: 'วันลาสะสม' },
          ]}
          className="mb-4"
        />

        <Card style={{ background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)', border: 'none', borderRadius: 16, marginBottom: 24 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={16}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <HistoryOutlined className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>วันลาสะสม (ลาพักผ่อน)</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                    กรอกยอดยกมา (เช่น ย้ายเข้า) และยกยอดคงเหลือขึ้นปีงบประมาณใหม่อัตโนมัติ — เฉพาะลาพักผ่อนตามระเบียบราชการ
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="flex gap-2 md:justify-end">
                <Button icon={<SwapOutlined />} size="large" onClick={openRollover}
                  style={{ backgroundColor: '#fff', color: '#006a5a', border: 'none', fontWeight: 600 }}>
                  ยกยอดปีงบประมาณใหม่
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        <Card style={{ borderRadius: 12, border: '1px solid var(--app-border)' }} styles={{ body: { padding: 20 } }} className="mb-4">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={5}>
              <Text type="secondary" style={{ fontSize: 12 }}>ประเภทการลา</Text>
              <div>
                <Tag color="#006a5a" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 6 }}>ลาพักผ่อน</Tag>
              </div>
            </Col>
            <Col xs={24} md={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>ปีงบประมาณ</Text>
              <Select
                value={fiscalYear}
                onChange={setFiscalYear}
                className="w-full"
                options={fiscalYears.map(y => ({ value: y, label: `พ.ศ. ${y}` }))}
              />
            </Col>
            <Col xs={24} md={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>กลุ่มภารกิจ</Text>
              <Select
                allowClear placeholder="ทั้งหมด" className="w-full"
                value={filterMission || undefined}
                onChange={v => { setFilterMission(v ?? ''); setFilterMajor(''); setFilterSubmajor('') }}
                options={missions.map(m => ({ value: String(m.id), label: m.name }))}
              />
            </Col>
            <Col xs={24} md={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>กลุ่มงาน</Text>
              <Select
                allowClear placeholder="ทั้งหมด" className="w-full"
                value={filterMajor || undefined}
                onChange={v => { setFilterMajor(v ?? ''); setFilterSubmajor('') }}
                options={majorOptions.map(m => ({ value: String(m.id), label: m.name }))}
              />
            </Col>
            <Col xs={24} md={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>หน่วยงาน</Text>
              <Select
                allowClear placeholder="ทั้งหมด" className="w-full"
                value={filterSubmajor || undefined}
                onChange={v => setFilterSubmajor(v ?? '')}
                options={submajorOptions.map(s => ({ value: String(s.id), label: s.name }))}
              />
            </Col>
            <Col xs={24} md={3}>
              <Text type="secondary" style={{ fontSize: 12 }}>ค้นหาชื่อ</Text>
              <Input
                allowClear
                placeholder="ชื่อ-สกุล"
                prefix={<SearchOutlined className="text-app-text-2" />}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </Col>
          </Row>
        </Card>

        <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: 0 } }}>
          {!hasFilter ? (
            <Empty
              description="เลือกกลุ่มภารกิจ / กลุ่มงาน / หน่วยงาน หรือค้นหาชื่อ เพื่อแสดงรายการ"
              style={{ padding: 60 }}
            />
          ) : (
            <Table
              loading={loading}
              columns={columns}
              dataSource={rows}
              rowKey="user_id"
              pagination={{ pageSize: 20 }}
              size="middle"
              locale={{ emptyText: <Empty description="ไม่พบบุคลากรตามเงื่อนไข" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          )}
        </Card>

        {/* ── Modal เพิ่ม/แก้ไขยอดสะสม ── */}
        <Modal
          title={
            <Space>
              <EditOutlined style={{ color: '#006a5a' }} />
              <span>{editingRow?.balance_id ? 'แก้ไขยอดวันลาสะสม' : 'เพิ่มยอดวันลาสะสม'} — {editingRow?.pname}{editingRow?.fname} {editingRow?.lname}</span>
            </Space>
          }
          open={editModalOpen}
          onCancel={() => setEditModalOpen(false)}
          onOk={saveBalance}
          okText="บันทึก"
          cancelText="ยกเลิก"
          confirmLoading={saving}
          forceRender
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="carried_in" label="ยอดยกมา (วัน)" rules={[{ required: true, message: 'กรุณาระบุยอดยกมา' }]}>
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="used" label="ใช้ไปแล้วในปีนี้ (วัน)" rules={[{ required: true, message: 'กรุณาระบุจำนวนที่ใช้ไป' }]}>
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="note" label="หมายเหตุ">
              <Input.TextArea rows={2} placeholder="เช่น ย้ายมาจาก รพ.xxx" />
            </Form.Item>
          </Form>
        </Modal>

        {/* ── Modal ยกยอดปีงบประมาณใหม่ ── */}
        <Modal
          title={<Space><SwapOutlined style={{ color: '#006a5a' }} /><span>ยกยอดวันลาสะสมขึ้นปีงบประมาณใหม่</span></Space>}
          open={rolloverOpen}
          onCancel={() => setRolloverOpen(false)}
          onOk={runRollover}
          okText="ยืนยันยกยอด"
          cancelText="ยกเลิก"
          confirmLoading={rollingOver}
          forceRender
        >
          <Form form={rolloverForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="from_fiscal_year" label="จากปีงบประมาณ" rules={[{ required: true }]}>
                  <InputNumber className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="to_fiscal_year" label="ไปปีงบประมาณ" rules={[{ required: true }]}>
                  <InputNumber className="w-full" />
                </Form.Item>
              </Col>
            </Row>
            <Tag color="#006a5a" style={{ marginBottom: 12 }}>ประเภทการลา: ลาพักผ่อน (ทำเฉพาะประเภทนี้เท่านั้น)</Tag>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              ระบบจะคำนวณ &quot;คงเหลือ&quot; ของปีงบเดิม (จำกัดเพดานตามเกณฑ์สะสมสูงสุดของแต่ละคน) แล้วสร้างยอดยกมาให้ในปีงบใหม่
              — ข้ามคนที่มีข้อมูลปีใหม่อยู่แล้วโดยอัตโนมัติ (กดซ้ำได้ไม่ซ้อนข้อมูล)
            </Text>
          </Form>
        </Modal>
      </div>
    </div>
  )
}

export default function LeaveBalancePage() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PageContent />
    </AppThemeProvider>
  )
}
