'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  App, Typography, Breadcrumb, Card, Row, Col, Tag, Button, Table,
  Input, Select, Modal, Form, Space, Statistic, Progress, Popconfirm, Drawer,
  Descriptions, Timeline, InputNumber, DatePicker
} from 'antd'
import {
  HomeOutlined, FundOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  SaveOutlined, ReloadOutlined, ReadOutlined, SearchOutlined, EyeOutlined,
  TeamOutlined, DollarCircleOutlined
} from '@ant-design/icons'
import { FaGraduationCap } from 'react-icons/fa'
import dayjs from 'dayjs'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import Link from 'next/link'
import {
  loadTrainings, saveTrainings, loadGoals, DEFAULT_TRAININGS,
  STATUS_OPTIONS, COMPETENCY_TYPE_OPTIONS, TARGET_GROUP_OPTIONS,
  TRAINING_FORMAT_OPTIONS, FUNDING_OPTIONS, FISCAL_YEAR_OPTIONS,
  getStatusMeta, getCompetencyMeta, getTargetGroupLabel, getFormatLabel, getFundingLabel,
  trainingProgressPct, budgetUtilization, formatTHB, formatCompactTHB, newId,
  type TrainingCourse, type Goal, type HRDStatus
} from '../data'

const { Title, Text } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

const TrainingPlanContent = () => {
  const { message, modal } = App.useApp()
  const [hydrated, setHydrated] = useState(false)
  const [rows, setRows] = useState<TrainingCourse[]>(DEFAULT_TRAININGS)
  const [goals, setGoals] = useState<Goal[]>([])
  const [search, setSearch] = useState('')
  const [competencyFilter, setCompetencyFilter] = useState<string>('all')
  const [targetFilter, setTargetFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    setRows(loadTrainings())
    setGoals(loadGoals())
    setHydrated(true)
  }, [])

  const persist = (next: TrainingCourse[]) => {
    setRows(next)
    saveTrainings(next)
  }

  const filtered = useMemo(() => {
    let list = [...rows]
    if (competencyFilter !== 'all') list = list.filter(r => r.competencyType === competencyFilter)
    if (targetFilter !== 'all') list = list.filter(r => r.targetGroup === targetFilter)
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (yearFilter !== 'all') list = list.filter(r => r.fiscalYear === yearFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.responsible.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.trainer.toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, competencyFilter, targetFilter, statusFilter, yearFilter, search])

  const totalCourses = rows.length
  const totalSeatsPlanned = rows.reduce((s, r) => s + r.seatsPlanned, 0)
  const totalSeatsActual = rows.reduce((s, r) => s + r.seatsActual, 0)
  const totalBudget = rows.reduce((s, r) => s + r.budgetPlanned, 0)
  const totalSpent = rows.reduce((s, r) => s + r.budgetSpent, 0)
  const seatsPct = totalSeatsPlanned ? Math.round((totalSeatsActual / totalSeatsPlanned) * 100) : 0
  const budgetPct = budgetUtilization(totalBudget, totalSpent)

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({
      code: `HRD-T${String(rows.length + 1).padStart(2, '0')}`,
      competencyType: 'core',
      targetGroup: 'all',
      format: 'inhouse',
      fiscalYear: 2026,
      hours: 6,
      seatsPlanned: 30, seatsActual: 0,
      budgetPlanned: 0, budgetSpent: 0,
      funding: 'revenue',
      status: 'draft'
    })
    setEditorOpen(true)
  }

  const openEdit = (r: TrainingCourse) => {
    setEditingId(r.id)
    form.setFieldsValue({
      ...r,
      range: [dayjs(r.startDate), dayjs(r.endDate)]
    })
    setEditorOpen(true)
  }

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  type FormValues = Omit<TrainingCourse, 'id' | 'startDate' | 'endDate' | 'progress'> & {
    range: [dayjs.Dayjs, dayjs.Dayjs]
  }

  const handleSubmit = (values: FormValues) => {
    const { range, ...rest } = values
    const startDate = range[0].format('YYYY-MM-DD')
    const endDate = range[1].format('YYYY-MM-DD')

    if (editingId) {
      persist(rows.map(r => r.id === editingId ? { ...r, ...rest, startDate, endDate } : r))
      message.success('บันทึกการแก้ไขเรียบร้อย')
    } else {
      persist([...rows, {
        ...rest, startDate, endDate, id: newId(), progress: []
      } as TrainingCourse])
      message.success('เพิ่มหลักสูตรใหม่เรียบร้อย')
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
      title: 'รีเซ็ตข้อมูลหลักสูตรอบรมทั้งหมด?',
      content: 'จะคืนค่าเป็นข้อมูลตัวอย่างเริ่มต้น',
      okText: 'รีเซ็ต',
      okButtonProps: { danger: true },
      cancelText: 'ยกเลิก',
      onOk: () => {
        persist(DEFAULT_TRAININGS)
        message.success('รีเซ็ตเรียบร้อย')
      }
    })
  }

  const columns = [
    {
      title: 'รหัส', dataIndex: 'code', width: 100,
      render: (v: string, r: TrainingCourse) => {
        const cm = getCompetencyMeta(r.competencyType)
        return <Tag color={cm.color} style={{ borderColor: cm.color, color: '#fff', background: cm.color + 'cc', fontWeight: 600 }}>{v}</Tag>
      }
    },
    {
      title: 'ชื่อหลักสูตร', dataIndex: 'name',
      render: (v: string, r: TrainingCourse) => {
        const cm = getCompetencyMeta(r.competencyType)
        return (
          <div>
            <div style={{ color: 'var(--app-text)', fontWeight: 600 }}>{v}</div>
            <Space size={4} style={{ marginTop: 4 }} wrap>
              <Tag color={cm.color} style={{ borderColor: cm.color, color: '#fff', background: cm.color + 'aa', fontSize: 11 }}>{cm.label.split(' (')[0]}</Tag>
              <Tag style={{ fontSize: 11 }}>{getTargetGroupLabel(r.targetGroup)}</Tag>
              <Tag style={{ fontSize: 11 }}>{getFormatLabel(r.format)}</Tag>
            </Space>
          </div>
        )
      }
    },
    {
      title: 'ปีงบฯ / ช่วงเวลา', width: 180,
      render: (_: unknown, r: TrainingCourse) => (
        <div>
          <Tag>{r.fiscalYear + 543}</Tag>
          <div className="text-xs text-app-text-2 mt-1">
            {dayjs(r.startDate).format('DD MMM')} – {dayjs(r.endDate).format('DD MMM YY')}
          </div>
          <Text className="text-xs text-app-text-3">{r.hours} ชม.</Text>
        </div>
      )
    },
    {
      title: 'ที่นั่ง', width: 160, align: 'center' as const,
      render: (_: unknown, r: TrainingCourse) => {
        const pct = trainingProgressPct(r)
        return (
          <div>
            <Text style={{ color: 'var(--app-text-2)', fontWeight: 600 }}>{r.seatsActual}/{r.seatsPlanned}</Text>
            <Progress percent={pct} size="small" strokeColor="#f59e0b" showInfo={false} />
          </div>
        )
      }
    },
    {
      title: 'งบประมาณ', width: 200, align: 'center' as const,
      render: (_: unknown, r: TrainingCourse) => {
        const pct = budgetUtilization(r.budgetPlanned, r.budgetSpent)
        const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#3b82f6'
        return (
          <div>
            <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>
              {formatCompactTHB(r.budgetSpent)} / {formatCompactTHB(r.budgetPlanned)}
            </Text>
            <Progress percent={pct} size="small" strokeColor={color} showInfo={false} />
            <Text style={{ color, fontSize: 11 }}>{pct}% ของงบ</Text>
          </div>
        )
      }
    },
    {
      title: 'ผู้ประสานงาน', dataIndex: 'responsible', width: 180,
      render: (v: string, r: TrainingCourse) => (
        <div>
          <div style={{ color: 'var(--app-text)', fontSize: 13 }}>{v}</div>
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
      title: 'การจัดการ', width: 180, align: 'center' as const,
      render: (_: unknown, r: TrainingCourse) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>ดู</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>แก้</Button>
          <Popconfirm title="ลบหลักสูตรนี้?" onConfirm={() => handleDelete(r.id)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ]

  const detail = detailId ? rows.find(r => r.id === detailId) : null
  const detailGoal = detail?.goalId ? goals.find(g => g.id === detail.goalId) : null

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
        <div className="absolute top-[10%] left-[15%] w-[35%] h-[35%] bg-amber-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[5%] w-[35%] h-[35%] bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: <><FundOutlined /> งานพัฒนาระบบบริการ</> },
          { href: '/hss/hrd', title: <><FaGraduationCap style={{ display: 'inline-block', verticalAlign: '-2px' }} /> งานพัฒนาบุคลากร</> },
          { title: 'แผนพัฒนาอบรมสมรรถนะบุคลากร' },
        ]} />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ReadOutlined style={{ fontSize: 28, color: '#f59e0b' }} />
            <div>
              <Title level={3} style={{ color: 'var(--app-text)', margin: 0 }}>แผนพัฒนาอบรมสมรรถนะบุคลากร</Title>
              <Text type="secondary">Competency Training Plan · แผนหลักสูตรอบรมประจำปีงบประมาณ</Text>
            </div>
          </div>
          <Space>
            <Link href="/hss/hrd"><Button>← กลับหน้า HRD</Button></Link>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>รีเซ็ต</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>เพิ่มหลักสูตร</Button>
          </Space>
        </div>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="หลักสูตรทั้งหมด" value={totalCourses} suffix="หลักสูตร"
                styles={{ content: { color: '#f59e0b', fontWeight: 800 } }} prefix={<ReadOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="ที่นั่งแผน" value={totalSeatsPlanned} suffix="ที่นั่ง"
                styles={{ content: { color: '#a855f7', fontWeight: 800 } }} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="ลงทะเบียนจริง" value={totalSeatsActual} suffix={`(${seatsPct}%)`}
                styles={{ content: { color: '#10b981', fontWeight: 800 } }} />
              <Progress percent={seatsPct} size="small" strokeColor="#10b981" showInfo={false} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-app-surface/60 border-app-border">
              <Statistic title="งบเบิกจ่าย" value={budgetPct} suffix="%"
                styles={{ content: { color: '#3b82f6', fontWeight: 800 } }} prefix={<DollarCircleOutlined />} />
              <Text className="text-xs text-app-text-3">{formatCompactTHB(totalSpent)} / {formatCompactTHB(totalBudget)}</Text>
            </Card>
          </Col>
        </Row>

        <Card className="bg-app-surface/40 border-app-border">
          <Space wrap className="mb-4">
            <Input
              prefix={<SearchOutlined />}
              placeholder="ค้นหารหัส / ชื่อหลักสูตร / ผู้ประสานงาน / วิทยากร"
              allowClear style={{ width: 340 }}
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <Select
              value={yearFilter} onChange={setYearFilter} style={{ width: 170 }}
              options={[{ value: 'all', label: 'ทุกปีงบประมาณ' }, ...FISCAL_YEAR_OPTIONS]}
            />
            <Select
              value={competencyFilter} onChange={setCompetencyFilter} style={{ width: 220 }}
              options={[{ value: 'all', label: 'ทุกประเภทสมรรถนะ' }, ...COMPETENCY_TYPE_OPTIONS.map(c => ({ value: c.value, label: c.label }))]}
            />
            <Select
              value={targetFilter} onChange={setTargetFilter} style={{ width: 200 }}
              options={[{ value: 'all', label: 'ทุกกลุ่มเป้าหมาย' }, ...TARGET_GROUP_OPTIONS]}
            />
            <Select
              value={statusFilter} onChange={setStatusFilter} style={{ width: 170 }}
              options={[{ value: 'all', label: 'ทุกสถานะ' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))]}
            />
          </Space>

          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1500 }}
            pagination={{ pageSize: 12, showSizeChanger: false }}
          />
        </Card>
      </div>

      {/* Editor Modal */}
      <Modal
        title={
          <Space>
            {editingId ? <EditOutlined style={{ color: '#f59e0b' }} /> : <PlusOutlined style={{ color: '#f59e0b' }} />}
            <span>{editingId ? 'แก้ไขหลักสูตรอบรม' : 'เพิ่มหลักสูตรอบรมใหม่'}</span>
          </Space>
        }
        open={editorOpen}
        onCancel={() => { setEditorOpen(false); setEditingId(null); form.resetFields() }}
        onOk={() => form.submit()}
        okText={<Space><SaveOutlined />บันทึก</Space>}
        cancelText="ยกเลิก"
        width={920}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Form.Item label="รหัส" name="code" rules={[{ required: true }]}>
                <Input placeholder="HRD-T01" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="ชื่อหลักสูตร" name="name" rules={[{ required: true }]}>
                <Input placeholder="เช่น Strategic Leadership for Smart Hospital" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="ปีงบประมาณ" name="fiscalYear" rules={[{ required: true }]}>
                <Select options={FISCAL_YEAR_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item label="ประเภทสมรรถนะ" name="competencyType" rules={[{ required: true }]}>
                <Select options={COMPETENCY_TYPE_OPTIONS.map(c => ({ value: c.value, label: c.label }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="กลุ่มเป้าหมาย" name="targetGroup" rules={[{ required: true }]}>
                <Select options={TARGET_GROUP_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="รูปแบบการอบรม" name="format" rules={[{ required: true }]}>
                <Select options={TRAINING_FORMAT_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="ช่วงวันที่อบรม" name="range" rules={[{ required: true }]}>
                <RangePicker className="w-full" format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="ชั่วโมงรวม" name="hours" rules={[{ required: true }]}>
                <InputNumber min={0} className="w-full" addonAfter="ชม." />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="เชื่อมเป้าหมาย (ถ้ามี)" name="goalId">
                <Select allowClear showSearch optionFilterProp="label"
                  options={goals.map(g => ({ value: g.id, label: `${g.code} · ${g.name}` }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={12} md={6}>
              <Form.Item label="ที่นั่งตามแผน" name="seatsPlanned" rules={[{ required: true }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="ลงทะเบียนจริง" name="seatsActual" rules={[{ required: true }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="งบประมาณตามแผน" name="budgetPlanned" rules={[{ required: true }]}>
                <InputNumber<number> min={0} step={10000} className="w-full"
                  formatter={v => `฿ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number((v || '').replace(/[^\d]/g, ''))} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="งบเบิกจ่ายแล้ว" name="budgetSpent" rules={[{ required: true }]}>
                <InputNumber<number> min={0} step={10000} className="w-full"
                  formatter={v => `฿ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number((v || '').replace(/[^\d]/g, ''))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item label="แหล่งงบประมาณ" name="funding" rules={[{ required: true }]}>
                <Select options={FUNDING_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="สถานที่จัด" name="venue" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="วิทยากร" name="trainer" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={10}>
              <Form.Item label="ผู้ประสานงาน" name="responsible" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item label="หน่วยงาน" name="department" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="สถานะ" name="status" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="วัตถุประสงค์" name="objectives" rules={[{ required: true }]}>
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item label="ผลลัพธ์ที่คาดหวัง" name="expectedOutcome" rules={[{ required: true }]}>
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item label="วิธีวัดและประเมินผล" name="evaluationMethod" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="เช่น Pre/Post Test, การสังเกตการปฏิบัติ, Project-based" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item label="คะแนนประเมินเฉลี่ย (Post Score)" name="postScore">
                <InputNumber min={0} max={100} className="w-full" addonAfter="คะแนน" />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item label="ความพึงพอใจ" name="satisfaction">
                <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        size={760}
        title={
          detail ? (
            <Space>
              <Tag color={getCompetencyMeta(detail.competencyType).color}
                style={{ borderColor: getCompetencyMeta(detail.competencyType).color, color: '#fff', background: getCompetencyMeta(detail.competencyType).color + 'cc', fontWeight: 600 }}>
                {detail.code}
              </Tag>
              <span>{detail.name}</span>
            </Space>
          ) : 'รายละเอียดหลักสูตร'
        }
      >
        {detail && (
          <>
            <Space wrap className="mb-4">
              <Tag color={getCompetencyMeta(detail.competencyType).color}
                style={{ borderColor: getCompetencyMeta(detail.competencyType).color, color: '#fff', background: getCompetencyMeta(detail.competencyType).color + 'cc' }}>
                {getCompetencyMeta(detail.competencyType).label}
              </Tag>
              <Tag color={getStatusMeta(detail.status).color}>{getStatusMeta(detail.status).label}</Tag>
              <Tag>{getTargetGroupLabel(detail.targetGroup)}</Tag>
              <Tag>{getFormatLabel(detail.format)}</Tag>
            </Space>

            <Row gutter={12} className="mb-4">
              <Col span={12}>
                <Card className="bg-app-surface/40 border-app-border" styles={{ body: { padding: 14 } }}>
                  <Text className="text-app-text-2 text-xs uppercase tracking-wider">ผู้เข้าอบรม</Text>
                  <div className="text-2xl font-bold text-amber-400">{detail.seatsActual} / {detail.seatsPlanned}</div>
                  <Progress percent={trainingProgressPct(detail)} size="small" strokeColor="#f59e0b" />
                </Card>
              </Col>
              <Col span={12}>
                <Card className="bg-app-surface/40 border-app-border" styles={{ body: { padding: 14 } }}>
                  <Text className="text-app-text-2 text-xs uppercase tracking-wider">งบประมาณ</Text>
                  <div className="text-2xl font-bold text-blue-400">{formatCompactTHB(detail.budgetSpent)}</div>
                  <Progress percent={budgetUtilization(detail.budgetPlanned, detail.budgetSpent)} size="small" strokeColor="#3b82f6" />
                  <Text className="text-xs text-app-text-3">จาก {formatTHB(detail.budgetPlanned)}</Text>
                </Card>
              </Col>
            </Row>

            <Descriptions column={1} bordered size="small" labelStyle={{ width: 160 }}>
              <Descriptions.Item label="ปีงบประมาณ">{detail.fiscalYear + 543}</Descriptions.Item>
              <Descriptions.Item label="ช่วงเวลา">
                {dayjs(detail.startDate).format('DD MMM YYYY')} – {dayjs(detail.endDate).format('DD MMM YYYY')} · {detail.hours} ชั่วโมง
              </Descriptions.Item>
              <Descriptions.Item label="สถานที่จัด">{detail.venue}</Descriptions.Item>
              <Descriptions.Item label="วิทยากร">{detail.trainer}</Descriptions.Item>
              <Descriptions.Item label="ผู้ประสานงาน">{detail.responsible} · {detail.department}</Descriptions.Item>
              <Descriptions.Item label="แหล่งงบประมาณ">{getFundingLabel(detail.funding)}</Descriptions.Item>
              {detailGoal && (
                <Descriptions.Item label="เป้าหมายที่เชื่อม">
                  <Tag color="cyan">{detailGoal.code}</Tag> {detailGoal.name}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="วัตถุประสงค์">{detail.objectives}</Descriptions.Item>
              <Descriptions.Item label="ผลลัพธ์ที่คาดหวัง">{detail.expectedOutcome}</Descriptions.Item>
              <Descriptions.Item label="วิธีวัดและประเมินผล">{detail.evaluationMethod}</Descriptions.Item>
              {detail.postScore !== undefined && (
                <Descriptions.Item label="คะแนนเฉลี่ย">
                  <Tag color={detail.postScore >= 80 ? 'success' : detail.postScore >= 60 ? 'warning' : 'error'}>
                    {detail.postScore} คะแนน
                  </Tag>
                </Descriptions.Item>
              )}
              {detail.satisfaction !== undefined && (
                <Descriptions.Item label="ความพึงพอใจ">
                  <Tag color={detail.satisfaction >= 85 ? 'success' : 'warning'}>{detail.satisfaction}%</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            {detail.progress.length > 0 && (
              <>
                <Title level={5} className="mt-5 mb-3 text-app-text">บันทึกความคืบหน้า</Title>
                <Timeline
                  items={detail.progress.map(p => ({
                    color: '#a855f7',
                    children: (
                      <div>
                        <Text strong style={{ color: 'var(--app-text-2)' }}>
                          {dayjs(p.date).format('DD MMM YYYY')}
                        </Text>
                        <div className="text-app-text-2 mt-1">{p.note}</div>
                        <Text className="text-xs text-app-text-3">
                          โดย {p.reportedBy}
                          {p.attendees !== undefined && ` · ผู้เข้าอบรม ${p.attendees} คน`}
                          {p.spent !== undefined && ` · เบิก ${formatCompactTHB(p.spent)}`}
                        </Text>
                      </div>
                    )
                  }))}
                />
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  )
}

export default function TrainingPlanPage() {
  return (
    <AppThemeProvider colorPrimary="#f59e0b">
      <TrainingPlanContent />
    </AppThemeProvider>
  )
}
