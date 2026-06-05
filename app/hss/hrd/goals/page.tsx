'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  App, Typography, Breadcrumb, Card, Row, Col, Tag, Button, Table,
  Input, Select, Modal, Form, Space, Statistic, Progress, Popconfirm,
  InputNumber
} from 'antd'
import {
  HomeOutlined, FundOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  SaveOutlined, ReloadOutlined, AimOutlined, SearchOutlined, TrophyOutlined
} from '@ant-design/icons'
import { FaGraduationCap } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import Link from 'next/link'
import {
  loadStrategies, loadGoals, saveGoals, DEFAULT_GOALS,
  STATUS_OPTIONS, FISCAL_YEAR_OPTIONS, getStatusMeta, getPillarMeta,
  goalAchievement, newId,
  type Goal, type Strategy, type HRDStatus
} from '../data'

const { Title, Text } = Typography
const { TextArea } = Input

const GoalsPageContent = () => {
  const { message, modal } = App.useApp()
  const [hydrated, setHydrated] = useState(false)
  const [rows, setRows] = useState<Goal[]>(DEFAULT_GOALS)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [search, setSearch] = useState('')
  const [strategyFilter, setStrategyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    setRows(loadGoals())
    setStrategies(loadStrategies())
    setHydrated(true)
  }, [])

  const persist = (next: Goal[]) => {
    setRows(next)
    saveGoals(next)
  }

  const filtered = useMemo(() => {
    let list = [...rows]
    if (strategyFilter !== 'all') list = list.filter(r => r.strategyId === strategyFilter)
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (yearFilter !== 'all') list = list.filter(r => r.fiscalYear === yearFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, strategyFilter, statusFilter, yearFilter, search])

  const totalGoals = rows.length
  const completedCount = rows.filter(r => goalAchievement(r) >= 100).length
  const avgAchievement = rows.length
    ? Math.round(rows.reduce((s, r) => s + goalAchievement(r), 0) / rows.length)
    : 0

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({
      code: `HRD-G${String(rows.length + 1).padStart(2, '0')}`,
      strategyId: strategies[0]?.id,
      fiscalYear: 2026,
      unit: 'ร้อยละ',
      baseline: 0, target: 0, current: 0,
      status: 'draft'
    })
    setEditorOpen(true)
  }

  const openEdit = (r: Goal) => {
    setEditingId(r.id)
    form.setFieldsValue({ ...r })
    setEditorOpen(true)
  }

  const handleSubmit = (values: Omit<Goal, 'id'>) => {
    if (editingId) {
      persist(rows.map(r => r.id === editingId ? { ...r, ...values } : r))
      message.success('บันทึกการแก้ไขเรียบร้อย')
    } else {
      persist([...rows, { ...values, id: newId() }])
      message.success('เพิ่มเป้าหมายใหม่เรียบร้อย')
    }
    setEditorOpen(false)
    setEditingId(null)
    form.resetFields()
  }

  const handleDelete = (id: string) => {
    persist(rows.filter(r => r.id !== id))
    message.success('ลบเรียบร้อย')
  }

  const handleReset = () => {
    modal.confirm({
      title: 'รีเซ็ตข้อมูลเป้าหมายทั้งหมด?',
      content: 'จะคืนค่าเป็นข้อมูลตัวอย่างเริ่มต้น',
      okText: 'รีเซ็ต',
      okButtonProps: { danger: true },
      cancelText: 'ยกเลิก',
      onOk: () => {
        persist(DEFAULT_GOALS)
        message.success('รีเซ็ตเรียบร้อย')
      }
    })
  }

  const strategyMap = Object.fromEntries(strategies.map(s => [s.id, s]))

  const columns = [
    {
      title: 'รหัส', dataIndex: 'code', width: 100,
      render: (v: string) => <Text style={{ color: '#10b981', fontWeight: 600 }}>{v}</Text>
    },
    {
      title: 'เป้าหมาย / ยุทธศาสตร์', dataIndex: 'name',
      render: (v: string, r: Goal) => {
        const st = strategyMap[r.strategyId]
        const pm = st ? getPillarMeta(st.pillar) : null
        return (
          <div>
            <div style={{ color: 'var(--app-text)', fontWeight: 500 }}>{v}</div>
            {st && pm && (
              <Tag color={pm.color} style={{ marginTop: 4, borderColor: pm.color, color: '#fff', background: pm.color + 'aa', fontSize: 11 }}>
                {st.code} · {st.name.length > 40 ? st.name.slice(0, 40) + '…' : st.name}
              </Tag>
            )}
          </div>
        )
      }
    },
    {
      title: 'ปีงบฯ', dataIndex: 'fiscalYear', width: 90, align: 'center' as const,
      render: (v: number) => <Tag>{v + 543}</Tag>
    },
    {
      title: 'Baseline → เป้า', width: 160, align: 'center' as const,
      render: (_: unknown, r: Goal) => (
        <div style={{ textAlign: 'center' }}>
          <Text className="text-xs text-app-text-3">{r.baseline} → {r.target} {r.unit}</Text>
          <div style={{ color: 'var(--app-text-2)', fontWeight: 600 }}>ปัจจุบัน {r.current} {r.unit}</div>
        </div>
      )
    },
    {
      title: 'ความสำเร็จ', width: 200,
      render: (_: unknown, r: Goal) => {
        const pct = goalAchievement(r)
        const color = pct >= 100 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444'
        return (
          <div className="flex items-center gap-2">
            <Progress percent={pct} size="small" strokeColor={color} style={{ flex: 1 }} />
            <Text strong style={{ color, minWidth: 44 }}>{pct}%</Text>
          </div>
        )
      }
    },
    {
      title: 'ผู้รับผิดชอบ', dataIndex: 'owner', width: 180,
      render: (v: string, r: Goal) => (
        <div>
          <div style={{ color: 'var(--app-text)' }}>{v}</div>
          <Text className="text-xs text-app-text-3">{r.department}</Text>
        </div>
      )
    },
    {
      title: 'สถานะ', dataIndex: 'status', width: 130,
      render: (v: HRDStatus) => {
        const sm = getStatusMeta(v)
        return <Tag color={sm.color}>{sm.label}</Tag>
      }
    },
    {
      title: 'การจัดการ', width: 130, align: 'center' as const,
      render: (_: unknown, r: Goal) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>แก้</Button>
          <Popconfirm title="ลบเป้าหมายนี้?" onConfirm={() => handleDelete(r.id)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ]

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text">
        <Navbar />
        <div className="p-6 md:p-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] right-[5%] w-[35%] h-[35%] bg-emerald-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[10%] w-[35%] h-[35%] bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: <><FundOutlined /> งานพัฒนาระบบบริการ</> },
          { href: '/hss/hrd', title: <><FaGraduationCap style={{ display: 'inline-block', verticalAlign: '-2px' }} /> งานพัฒนาบุคลากร</> },
          { title: 'เป้าหมายของการพัฒนาบุคลากร' },
        ]} />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AimOutlined style={{ fontSize: 28, color: '#10b981' }} />
            <div>
              <Title level={3} style={{ color: 'var(--app-text)', margin: 0 }}>เป้าหมายของการพัฒนาบุคลากร</Title>
              <Text type="secondary">Development Goals & KPIs · ตัวชี้วัดและเป้าหมายเชิงปริมาณรายปีงบประมาณ</Text>
            </div>
          </div>
          <Space>
            <Link href="/hss/hrd"><Button>← กลับหน้า HRD</Button></Link>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>รีเซ็ต</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>เพิ่มเป้าหมาย</Button>
          </Space>
        </div>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="เป้าหมายทั้งหมด" value={totalGoals} suffix="เป้าหมาย"
                styles={{ content: { color: '#10b981', fontWeight: 800 } }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="บรรลุเป้าแล้ว" value={completedCount} suffix={`/ ${totalGoals}`}
                styles={{ content: { color: '#22c55e', fontWeight: 800 } }} prefix={<TrophyOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="ความสำเร็จเฉลี่ย" value={avgAchievement} suffix="%"
                styles={{ content: { color: '#3b82f6', fontWeight: 800 } }} />
              <Progress percent={avgAchievement} size="small" strokeColor="#3b82f6" showInfo={false} />
            </Card>
          </Col>
        </Row>

        <Card className="bg-app-surface/40 border-app-border">
          <Space wrap className="mb-4">
            <Input
              prefix={<SearchOutlined />}
              placeholder="ค้นหารหัส / เป้าหมาย / ผู้รับผิดชอบ"
              allowClear style={{ width: 320 }}
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <Select
              value={strategyFilter} onChange={setStrategyFilter} style={{ width: 280 }}
              options={[
                { value: 'all', label: 'ทุกยุทธศาสตร์' },
                ...strategies.map(s => ({ value: s.id, label: `${s.code} · ${s.name.slice(0, 40)}` }))
              ]}
            />
            <Select
              value={yearFilter} onChange={setYearFilter} style={{ width: 180 }}
              options={[
                { value: 'all', label: 'ทุกปีงบประมาณ' },
                ...FISCAL_YEAR_OPTIONS.map(o => ({ value: o.value, label: o.label }))
              ]}
            />
            <Select
              value={statusFilter} onChange={setStatusFilter} style={{ width: 180 }}
              options={[{ value: 'all', label: 'ทุกสถานะ' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))]}
            />
          </Space>

          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1300 }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </Card>
      </div>

      <Modal
        title={
          <Space>
            {editingId ? <EditOutlined style={{ color: '#10b981' }} /> : <PlusOutlined style={{ color: '#10b981' }} />}
            <span>{editingId ? 'แก้ไขเป้าหมาย' : 'เพิ่มเป้าหมายใหม่'}</span>
          </Space>
        }
        open={editorOpen}
        onCancel={() => { setEditorOpen(false); setEditingId(null); form.resetFields() }}
        onOk={() => form.submit()}
        okText={<Space><SaveOutlined />บันทึก</Space>}
        cancelText="ยกเลิก"
        width={780}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Form.Item label="รหัส" name="code" rules={[{ required: true }]}>
                <Input placeholder="HRD-G01" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="ยุทธศาสตร์ที่เกี่ยวข้อง" name="strategyId" rules={[{ required: true }]}>
                <Select
                  showSearch optionFilterProp="label"
                  options={strategies.map(s => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="ปีงบประมาณ" name="fiscalYear" rules={[{ required: true }]}>
                <Select options={FISCAL_YEAR_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="ชื่อเป้าหมาย" name="name" rules={[{ required: true }]}>
            <Input placeholder="เช่น หัวหน้างานผ่านหลักสูตรพัฒนาผู้นำ ≥ 80%" />
          </Form.Item>
          <Form.Item label="คำอธิบาย" name="description">
            <TextArea rows={2} placeholder="ขอบเขตและวิธีการวัด" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={12} md={6}>
              <Form.Item label="หน่วยวัด" name="unit" rules={[{ required: true }]}>
                <Input placeholder="คน, ร้อยละ, ครั้ง, ชม./คน" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Baseline" name="baseline" rules={[{ required: true }]}>
                <InputNumber className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="เป้าหมาย" name="target" rules={[{ required: true }]}>
                <InputNumber className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="ปัจจุบัน" name="current" rules={[{ required: true }]}>
                <InputNumber className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={10}>
              <Form.Item label="ผู้รับผิดชอบ" name="owner" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item label="หน่วยงาน" name="department" rules={[{ required: true }]}>
                <Input placeholder="กลุ่มงาน / ฝ่าย" />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="สถานะ" name="status" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="หมายเหตุ" name="notes">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default function GoalsPage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      <GoalsPageContent />
    </AppThemeProvider>
  )
}
