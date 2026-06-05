'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  App, Typography, Breadcrumb, Card, Row, Col, Tag, Button, Table,
  Input, Select, Modal, Form, Space, Statistic, Progress, Popconfirm, Drawer,
  Descriptions, InputNumber
} from 'antd'
import {
  HomeOutlined, FundOutlined, PlusOutlined, EyeOutlined, EditOutlined,
  DeleteOutlined, SaveOutlined, ReloadOutlined, CompassOutlined, SearchOutlined
} from '@ant-design/icons'
import { FaGraduationCap } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import Link from 'next/link'
import {
  loadStrategies, saveStrategies, loadGoals, DEFAULT_STRATEGIES,
  STATUS_OPTIONS, PILLAR_OPTIONS,
  getPillarMeta, getStatusMeta, formatCompactTHB, formatTHB, newId,
  type Strategy, type Goal, type HRDStatus
} from '../data'

const { Title, Text } = Typography
const { TextArea } = Input

const StrategyPageContent = () => {
  const { message, modal } = App.useApp()
  const [hydrated, setHydrated] = useState(false)
  const [rows, setRows] = useState<Strategy[]>(DEFAULT_STRATEGIES)
  const [goals, setGoals] = useState<Goal[]>([])
  const [search, setSearch] = useState('')
  const [pillarFilter, setPillarFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    setRows(loadStrategies())
    setGoals(loadGoals())
    setHydrated(true)
  }, [])

  const persist = (next: Strategy[]) => {
    setRows(next)
    saveStrategies(next)
  }

  const filtered = useMemo(() => {
    let list = [...rows]
    if (pillarFilter !== 'all') list = list.filter(r => r.pillar === pillarFilter)
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, pillarFilter, statusFilter, search])

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0)
  const activeCount = rows.filter(r => r.status === 'in_progress').length

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({
      code: `HRD-S${String(rows.length + 1).padStart(2, '0')}`,
      pillar: 'core',
      status: 'draft',
      startYear: 2026,
      endYear: 2029,
      budget: 0
    })
    setEditorOpen(true)
  }

  const openEdit = (r: Strategy) => {
    setEditingId(r.id)
    form.setFieldsValue({ ...r })
    setEditorOpen(true)
  }

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  const handleSubmit = (values: Omit<Strategy, 'id'>) => {
    if (editingId) {
      persist(rows.map(r => r.id === editingId ? { ...r, ...values } : r))
      message.success('บันทึกการแก้ไขเรียบร้อย')
    } else {
      persist([...rows, { ...values, id: newId() }])
      message.success('เพิ่มยุทธศาสตร์ใหม่เรียบร้อย')
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
      title: 'รีเซ็ตข้อมูลยุทธศาสตร์ทั้งหมด?',
      content: 'จะคืนค่าเป็นข้อมูลตัวอย่างเริ่มต้น ข้อมูลที่แก้ไขจะหายไป',
      okText: 'รีเซ็ต',
      okButtonProps: { danger: true },
      cancelText: 'ยกเลิก',
      onOk: () => {
        persist(DEFAULT_STRATEGIES)
        message.success('รีเซ็ตเรียบร้อย')
      }
    })
  }

  const columns = [
    {
      title: 'รหัส', dataIndex: 'code', width: 100,
      render: (v: string, r: Strategy) => {
        const pm = getPillarMeta(r.pillar)
        return <Tag color={pm.color} style={{ borderColor: pm.color, color: '#fff', background: pm.color + 'cc', fontWeight: 600 }}>{v}</Tag>
      }
    },
    {
      title: 'ยุทธศาสตร์ / เสาหลัก', dataIndex: 'name',
      render: (v: string, r: Strategy) => {
        const pm = getPillarMeta(r.pillar)
        return (
          <div>
            <div style={{ color: 'var(--app-text)', fontWeight: 600, marginBottom: 4 }}>{v}</div>
            <Tag color={pm.color} style={{ borderColor: pm.color, color: '#fff', background: pm.color + 'aa' }}>{pm.label}</Tag>
          </div>
        )
      }
    },
    {
      title: 'ผู้รับผิดชอบ', dataIndex: 'owner', width: 200,
      render: (v: string, r: Strategy) => (
        <div>
          <div style={{ color: 'var(--app-text)' }}>{v}</div>
          <Text className="text-xs text-app-text-3">{r.ownerPosition}</Text>
        </div>
      )
    },
    {
      title: 'ระยะเวลา', width: 130,
      render: (_: unknown, r: Strategy) => (
        <Text style={{ color: 'var(--app-text-2)' }}>พ.ศ. {r.startYear} – {r.endYear}</Text>
      )
    },
    {
      title: 'งบประมาณกรอบ', dataIndex: 'budget', width: 150, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#3b82f6', fontWeight: 600 }}>{formatCompactTHB(v)}</Text>
    },
    {
      title: 'เป้าหมายภายใต้', width: 110, align: 'center' as const,
      render: (_: unknown, r: Strategy) => {
        const count = goals.filter(g => g.strategyId === r.id).length
        return <Tag color={count > 0 ? 'cyan' : 'default'}>{count} เป้า</Tag>
      }
    },
    {
      title: 'สถานะ', dataIndex: 'status', width: 130,
      render: (v: HRDStatus) => {
        const sm = getStatusMeta(v)
        return <Tag color={sm.color}>{sm.label}</Tag>
      }
    },
    {
      title: 'การจัดการ', width: 180, align: 'center' as const,
      render: (_: unknown, r: Strategy) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>ดู</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>แก้</Button>
          <Popconfirm title="ลบยุทธศาสตร์นี้?" onConfirm={() => handleDelete(r.id)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ]

  const detail = detailId ? rows.find(r => r.id === detailId) : null
  const detailGoals = detail ? goals.filter(g => g.strategyId === detail.id) : []

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
        <div className="absolute top-[15%] left-[5%] w-[35%] h-[35%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: <><FundOutlined /> งานพัฒนาระบบบริการ</> },
          { href: '/hss/hrd', title: <><FaGraduationCap style={{ display: 'inline-block', verticalAlign: '-2px' }} /> งานพัฒนาบุคลากร</> },
          { title: 'ยุทธศาสตร์การพัฒนาบุคลากร' },
        ]} />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CompassOutlined style={{ fontSize: 28, color: '#a855f7' }} />
            <div>
              <Title level={3} style={{ color: 'var(--app-text)', margin: 0 }}>ยุทธศาสตร์การพัฒนาบุคลากร</Title>
              <Text type="secondary">5-Year HR Development Strategic Plan · กรอบยุทธศาสตร์ระยะ 5 ปี</Text>
            </div>
          </div>
          <Space>
            <Link href="/hss/hrd">
              <Button>← กลับหน้า HRD</Button>
            </Link>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>รีเซ็ต</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>เพิ่มยุทธศาสตร์</Button>
          </Space>
        </div>

        {/* KPI Strip */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="ยุทธศาสตร์ทั้งหมด" value={rows.length} suffix="เรื่อง"
                styles={{ content: { color: '#a855f7', fontWeight: 800 } }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="กำลังดำเนินการ" value={activeCount} suffix="เรื่อง"
                styles={{ content: { color: '#10b981', fontWeight: 800 } }} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="งบประมาณกรอบรวม" value={totalBudget} formatter={(v) => formatTHB(Number(v))}
                styles={{ content: { color: '#3b82f6', fontWeight: 800, fontSize: 22 } }} />
            </Card>
          </Col>
        </Row>

        <Card className="bg-app-surface/40 border-app-border">
          <Space wrap className="mb-4">
            <Input
              prefix={<SearchOutlined />}
              placeholder="ค้นหารหัส / ชื่อยุทธศาสตร์ / ผู้รับผิดชอบ"
              allowClear style={{ width: 320 }}
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <Select
              value={pillarFilter} onChange={setPillarFilter} style={{ width: 240 }}
              options={[{ value: 'all', label: 'ทุกเสาหลัก' }, ...PILLAR_OPTIONS.map(p => ({ value: p.value, label: p.label }))]}
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
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </Card>
      </div>

      {/* Editor Modal */}
      <Modal
        title={
          <Space>
            {editingId ? <EditOutlined style={{ color: '#a855f7' }} /> : <PlusOutlined style={{ color: '#a855f7' }} />}
            <span>{editingId ? 'แก้ไขยุทธศาสตร์' : 'เพิ่มยุทธศาสตร์ใหม่'}</span>
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
              <Form.Item label="รหัส" name="code" rules={[{ required: true, message: 'กรุณาระบุรหัส' }]}>
                <Input placeholder="HRD-S01" />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item label="เสาหลัก (Pillar)" name="pillar" rules={[{ required: true }]}>
                <Select options={PILLAR_OPTIONS.map(p => ({ value: p.value, label: p.label }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="สถานะ" name="status" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="ชื่อยุทธศาสตร์" name="name" rules={[{ required: true, message: 'กรุณาระบุชื่อ' }]}>
            <Input placeholder="พัฒนาผู้นำการเปลี่ยนแปลงทางสุขภาพ" />
          </Form.Item>
          <Form.Item label="วิสัยทัศน์ / ผลลัพธ์ที่คาดหวัง" name="vision" rules={[{ required: true }]}>
            <Input placeholder="ต้องการให้เกิดอะไรเมื่อสำเร็จ" />
          </Form.Item>
          <Form.Item label="รายละเอียด" name="description">
            <TextArea rows={3} placeholder="คำอธิบาย ขอบเขต และแนวทางดำเนินการ" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="ผู้รับผิดชอบหลัก" name="owner" rules={[{ required: true }]}>
                <Input placeholder="นพ. / นาย / นาง" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="ตำแหน่ง" name="ownerPosition">
                <Input placeholder="เช่น รองผู้อำนวยการฝ่ายการแพทย์" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={12} md={6}>
              <Form.Item label="พ.ศ. เริ่มต้น" name="startYear" rules={[{ required: true }]}>
                <InputNumber min={2024} max={2040} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="พ.ศ. สิ้นสุด" name="endYear" rules={[{ required: true }]}>
                <InputNumber min={2024} max={2040} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="งบประมาณกรอบ (บาท)" name="budget" rules={[{ required: true }]}>
                <InputNumber<number> min={0} step={100000} className="w-full"
                  formatter={v => `฿ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number((v || '').replace(/[^\d]/g, ''))} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="หมายเหตุ" name="notes">
            <TextArea rows={2} placeholder="เช่น สอดคล้องกับนโยบาย Smart Hospital หรือ HA ขั้น 4" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        size={680}
        title={
          detail ? (
            <Space>
              <Tag color={getPillarMeta(detail.pillar).color}
                style={{ borderColor: getPillarMeta(detail.pillar).color, color: '#fff', background: getPillarMeta(detail.pillar).color + 'cc', fontWeight: 600 }}>
                {detail.code}
              </Tag>
              <span>{detail.name}</span>
            </Space>
          ) : 'รายละเอียด'
        }
      >
        {detail && (
          <>
            <div className="mb-4">
              <Tag color={getPillarMeta(detail.pillar).color} style={{ borderColor: getPillarMeta(detail.pillar).color, color: '#fff', background: getPillarMeta(detail.pillar).color + 'cc' }}>
                {getPillarMeta(detail.pillar).label}
              </Tag>
              <Tag color={getStatusMeta(detail.status).color}>{getStatusMeta(detail.status).label}</Tag>
            </div>

            <Card className="mb-4 bg-app-surface/40 border-app-border" styles={{ body: { padding: 16 } }}>
              <Text className="text-app-text-2 text-xs uppercase tracking-widest">วิสัยทัศน์ / ผลลัพธ์ที่คาดหวัง</Text>
              <div className="text-app-text mt-1">{detail.vision}</div>
            </Card>

            <Descriptions column={1} bordered size="small" labelStyle={{ width: 160 }}>
              <Descriptions.Item label="รายละเอียด">{detail.description || '—'}</Descriptions.Item>
              <Descriptions.Item label="ผู้รับผิดชอบ">{detail.owner} <Text type="secondary">({detail.ownerPosition})</Text></Descriptions.Item>
              <Descriptions.Item label="ระยะเวลา">พ.ศ. {detail.startYear} – {detail.endYear}</Descriptions.Item>
              <Descriptions.Item label="งบประมาณกรอบ">{formatTHB(detail.budget)}</Descriptions.Item>
              <Descriptions.Item label="หมายเหตุ">{detail.notes || '—'}</Descriptions.Item>
            </Descriptions>

            <Title level={5} className="mt-5 mb-3 text-app-text">เป้าหมายภายใต้ยุทธศาสตร์นี้ ({detailGoals.length})</Title>
            {detailGoals.length === 0 ? (
              <Text type="secondary">ยังไม่มีเป้าหมายภายใต้ยุทธศาสตร์นี้</Text>
            ) : (
              detailGoals.map(g => (
                <Card key={g.id} size="small" className="mb-2 bg-app-surface/40 border-app-border" styles={{ body: { padding: 12 } }}>
                  <div className="flex items-center justify-between mb-2">
                    <Text strong style={{ color: 'var(--app-text-2)' }}>{g.code} · {g.name}</Text>
                    <Tag color={getStatusMeta(g.status).color}>{getStatusMeta(g.status).label}</Tag>
                  </div>
                  <Text type="secondary" className="text-xs">
                    Baseline: {g.baseline} {g.unit} · Target: {g.target} {g.unit} · ปัจจุบัน: {g.current} {g.unit}
                  </Text>
                  <Progress
                    percent={g.target === g.baseline ? (g.current >= g.target ? 100 : 0)
                      : Math.max(0, Math.min(100, Math.round(((g.current - g.baseline) / (g.target - g.baseline)) * 100)))}
                    size="small" strokeColor="#10b981"
                  />
                </Card>
              ))
            )}
          </>
        )}
      </Drawer>
    </div>
  )
}

export default function StrategyPage() {
  return (
    <AppThemeProvider colorPrimary="#a855f7">
      <StrategyPageContent />
    </AppThemeProvider>
  )
}
