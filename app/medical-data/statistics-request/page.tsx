'use client'
import { useState, useMemo } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, Button, Drawer, Form, Input,
  Select, Row, Col, Descriptions, Space, Alert, Steps, Timeline, DatePicker,
  Avatar, App, Upload,
} from 'antd'
import {
  HomeOutlined, PlusOutlined, EyeOutlined, CheckCircleOutlined,
  CloseCircleOutlined, AuditOutlined, TeamOutlined, SearchOutlined,
  UserOutlined, CalendarOutlined, FileExcelOutlined, SendOutlined,
  UploadOutlined, PaperClipOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { FaChartBar } from 'react-icons/fa'
import { Dayjs } from 'dayjs'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const ACCENT = '#0d9488'

// ── Types ────────────────────────────────────────────────────────────────────

type StatStatus = 'pending' | 'approved' | 'processing' | 'delivered' | 'rejected'

interface ApprovalStep {
  stepName: string
  actor: string
  action: string
  timestamp?: string
  note?: string
}

interface StatRequest {
  id: string
  requestDate: string
  requester: string
  department: string
  phone?: string
  email?: string
  periodFrom: string
  periodTo: string
  format: string
  purpose: string          // จุดประสงค์การขอข้อมูล
  sampleFile?: string      // ชื่อไฟล์ Excel ตัวอย่างที่แนบ
  urgency: 'low' | 'medium' | 'high'
  status: StatStatus
  assignedTo?: string
  deliveredNote?: string
  approvalHistory: ApprovalStep[]
}

// ── Master data ──────────────────────────────────────────────────────────────

const FORMATS = ['Excel (.xlsx)', 'PDF', 'CSV', 'เอกสาร (พิมพ์)']

const statStaff = [
  { name: 'นางสาวกนกวรรณ เวชสถิติ', status: 'ว่าง' },
  { name: 'นายธีรยุทธ ข้อมูลดี', status: 'ว่าง' },
  { name: 'นางพรทิพย์ รหัสโรค', status: 'ติดภารกิจ' },
]

const urgencyConfig = {
  low:    { color: 'default',    label: 'ปกติ' },
  medium: { color: 'processing', label: 'ปานกลาง' },
  high:   { color: 'warning',    label: 'เร่งด่วน' },
}

const statusConfig: Record<StatStatus, { color: string; label: string; step: number }> = {
  pending:    { color: 'orange',     label: 'รออนุมัติ',        step: 0 },
  approved:   { color: 'cyan',       label: 'อนุมัติแล้ว',      step: 1 },
  processing: { color: 'processing', label: 'กำลังจัดทำข้อมูล',  step: 2 },
  delivered:  { color: 'success',    label: 'ส่งมอบแล้ว',       step: 3 },
  rejected:   { color: 'error',      label: 'ไม่อนุมัติ',       step: -1 },
}

const stepItems = [
  { title: 'ยื่นคำขอ' },
  { title: 'อนุมัติ' },
  { title: 'จัดทำข้อมูล' },
  { title: 'ส่งมอบ' },
]

// ── Mock data ────────────────────────────────────────────────────────────────

const mockRequests: StatRequest[] = [
  {
    id: 'STAT-202606001', requestDate: '12/06/2026',
    requester: 'นพ.สมชาย ใจดี', department: 'กลุ่มงานอายุรกรรม', phone: '081-111-2222', email: 'somchai@hospital.go.th',
    periodFrom: '01/10/2025', periodTo: '31/05/2026', format: 'Excel (.xlsx)',
    purpose: 'ขอสถิติผู้ป่วยเบาหวาน (E11) แยกรายเดือน/ช่วงอายุ เพื่อประกอบงานวิจัยและวางแผนการรักษา',
    sampleFile: 'ตัวอย่าง_สถิติเบาหวาน.xlsx', urgency: 'medium', status: 'pending',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นพ.สมชาย ใจดี', action: 'ยื่นคำขอข้อมูล', timestamp: '12/06/2026 09:15' },
    ],
  },
  {
    id: 'STAT-202606002', requestDate: '11/06/2026',
    requester: 'นางสาวจารุวรรณ บริหาร', department: 'งานยุทธศาสตร์', phone: '082-333-4444',
    periodFrom: '01/01/2026', periodTo: '31/05/2026', format: 'PDF',
    purpose: 'ขอสรุปจำนวนผู้ป่วยนอกรายเดือนแยกตามกลุ่มงาน เพื่อจัดทำรายงาน KPI ประจำไตรมาส', urgency: 'high', status: 'approved',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นางสาวจารุวรรณ บริหาร', action: 'ยื่นคำขอข้อมูล', timestamp: '11/06/2026 10:00' },
      { stepName: 'อนุมัติ', actor: 'หัวหน้างานเวชสถิติ', action: 'อนุมัติ', timestamp: '11/06/2026 14:20', note: 'อนุมัติ ดำเนินการจัดทำได้' },
    ],
  },
  {
    id: 'STAT-202606003', requestDate: '08/06/2026',
    requester: 'นางวันดี สาธารณสุข', department: 'งานควบคุมโรค', phone: '083-555-6666',
    periodFrom: '01/04/2026', periodTo: '31/05/2026', format: 'Excel (.xlsx)',
    purpose: 'ขอข้อมูลการส่งต่อผู้ป่วยโรคติดต่อ (Refer out) แยกรายโรงพยาบาลปลายทาง เพื่อวิเคราะห์แนวโน้ม',
    sampleFile: 'แบบฟอร์ม_refer_out.xlsx', urgency: 'medium', status: 'processing',
    assignedTo: 'นางสาวกนกวรรณ เวชสถิติ',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นางวันดี สาธารณสุข', action: 'ยื่นคำขอข้อมูล', timestamp: '08/06/2026 13:30' },
      { stepName: 'อนุมัติ', actor: 'หัวหน้างานเวชสถิติ', action: 'อนุมัติ', timestamp: '09/06/2026 09:00' },
      { stepName: 'จัดทำข้อมูล', actor: 'หัวหน้างานเวชสถิติ', action: 'มอบหมายงาน', timestamp: '09/06/2026 09:30', note: 'มอบหมายให้ นางสาวกนกวรรณ เวชสถิติ' },
    ],
  },
  {
    id: 'STAT-202605012', requestDate: '28/05/2026',
    requester: 'ผศ.ดร.วิจัย การศึกษา', department: 'มหาวิทยาลัยพะเยา (ภายนอก)', email: 'research@up.ac.th',
    periodFrom: '01/10/2024', periodTo: '30/09/2025', format: 'CSV',
    purpose: 'ขอข้อมูลผู้ป่วยในแบบไม่ระบุตัวตน สำหรับงานวิจัยร่วมด้านระบาดวิทยา (มีหนังสือขอความอนุเคราะห์แนบ)', urgency: 'low', status: 'delivered',
    assignedTo: 'นายธีรยุทธ ข้อมูลดี', deliveredNote: 'ส่งไฟล์ทางอีเมลราชการ พร้อมหนังสือนำส่ง เลขที่ พย 0033/1245',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'ผศ.ดร.วิจัย การศึกษา', action: 'ยื่นคำขอข้อมูล', timestamp: '28/05/2026 11:00' },
      { stepName: 'อนุมัติ', actor: 'หัวหน้างานเวชสถิติ', action: 'อนุมัติ', timestamp: '29/05/2026 10:00', note: 'อนุมัติ — ข้อมูลไม่ระบุตัวตนผู้ป่วย' },
      { stepName: 'จัดทำข้อมูล', actor: 'หัวหน้างานเวชสถิติ', action: 'มอบหมายงาน', timestamp: '29/05/2026 10:30' },
      { stepName: 'ส่งมอบ', actor: 'นายธีรยุทธ ข้อมูลดี', action: 'ส่งมอบข้อมูล', timestamp: '02/06/2026 15:45', note: 'ส่งไฟล์ทางอีเมลราชการ' },
    ],
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

const PageContent = () => {
  const { message } = App.useApp()

  const [requests, setRequests] = useState<StatRequest[]>(mockRequests)
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<StatRequest | null>(null)
  const [rejectMode, setRejectMode] = useState(false)

  const [form] = Form.useForm()
  const [assignForm] = Form.useForm()
  const [rejectForm] = Form.useForm()
  const [deliverForm] = Form.useForm()

  const nowStr = () =>
    new Date().toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const today = () =>
    new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.requester.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q)
    )
  }, [requests, search])

  const summary = useMemo(() => ({
    pending:    requests.filter(r => r.status === 'pending').length,
    approved:   requests.filter(r => r.status === 'approved' || r.status === 'processing').length,
    delivered:  requests.filter(r => r.status === 'delivered').length,
    total:      requests.length,
  }), [requests])

  const openDetail = (r: StatRequest) => {
    setSelected(r)
    setRejectMode(false)
    assignForm.resetFields()
    rejectForm.resetFields()
    deliverForm.resetFields()
    setDetailOpen(true)
  }

  const updateRequest = (id: string, patch: Partial<StatRequest>) => {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch } : r)
      setSelected(next.find(r => r.id === id) ?? null)
      return next
    })
  }

  const handleApprove = () => {
    if (!selected) return
    updateRequest(selected.id, {
      status: 'approved',
      approvalHistory: [...selected.approvalHistory, { stepName: 'อนุมัติ', actor: 'หัวหน้างานเวชสถิติ', action: 'อนุมัติ', timestamp: nowStr() }],
    })
    message.success('อนุมัติคำขอแล้ว')
  }

  const handleReject = () => {
    rejectForm.validateFields().then(values => {
      if (!selected) return
      updateRequest(selected.id, {
        status: 'rejected',
        approvalHistory: [...selected.approvalHistory, { stepName: 'อนุมัติ', actor: 'หัวหน้างานเวชสถิติ', action: 'ไม่อนุมัติ', timestamp: nowStr(), note: values.rejectReason }],
      })
      setRejectMode(false)
      rejectForm.resetFields()
      message.error('ปฏิเสธคำขอแล้ว')
    })
  }

  const handleAssign = () => {
    assignForm.validateFields().then(values => {
      if (!selected) return
      updateRequest(selected.id, {
        status: 'processing',
        assignedTo: values.assignedTo,
        approvalHistory: [...selected.approvalHistory, {
          stepName: 'จัดทำข้อมูล', actor: 'หัวหน้างานเวชสถิติ', action: 'มอบหมายงาน', timestamp: nowStr(),
          note: `มอบหมายให้ ${values.assignedTo}${values.assignNote ? ' — ' + values.assignNote : ''}`,
        }],
      })
      assignForm.resetFields()
      message.success(`มอบหมายให้ ${values.assignedTo} แล้ว`)
    })
  }

  const handleDeliver = () => {
    deliverForm.validateFields().then(values => {
      if (!selected) return
      updateRequest(selected.id, {
        status: 'delivered',
        deliveredNote: values.deliveredNote,
        approvalHistory: [...selected.approvalHistory, { stepName: 'ส่งมอบ', actor: selected.assignedTo ?? 'เจ้าหน้าที่เวชสถิติ', action: 'ส่งมอบข้อมูล', timestamp: nowStr(), note: values.deliveredNote }],
      })
      deliverForm.resetFields()
      message.success('บันทึกการส่งมอบข้อมูลแล้ว')
    })
  }

  const handleNewRequest = () => {
    form.validateFields().then(values => {
      const [from, to] = (values.period ?? []) as [Dayjs, Dayjs]
      const sample = (values.sampleFile as UploadFile[] | undefined)?.[0]?.name
      const newReq: StatRequest = {
        id: `STAT-${Date.now()}`,
        requestDate: today(),
        requester: values.requester,
        department: values.department,
        phone: values.phone,
        email: values.email,
        periodFrom: from ? from.format('DD/MM/YYYY') : '-',
        periodTo: to ? to.format('DD/MM/YYYY') : '-',
        format: values.format,
        purpose: values.purpose,
        sampleFile: sample,
        urgency: values.urgency ?? 'medium',
        status: 'pending',
        approvalHistory: [{ stepName: 'ยื่นคำขอ', actor: values.requester, action: 'ยื่นคำขอข้อมูล', timestamp: nowStr() }],
      }
      setRequests(prev => [newReq, ...prev])
      message.success('ยื่นคำขอข้อมูลสถิติเรียบร้อยแล้ว')
      form.resetFields()
      setFormOpen(false)
    })
  }

  const columns = [
    { title: 'เลขที่คำขอ', dataIndex: 'id', key: 'id', width: 160,
      render: (v: string) => <Text style={{ color: ACCENT, fontWeight: 600 }}>{v}</Text> },
    { title: 'วันที่', dataIndex: 'requestDate', key: 'requestDate', width: 110 },
    { title: 'ผู้ขอ', key: 'requester',
      render: (_: unknown, r: StatRequest) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.requester}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.department}</Text>
        </div>
      ) },
    { title: 'จุดประสงค์การขอข้อมูล', dataIndex: 'purpose', key: 'purpose',
      render: (v: string, r: StatRequest) => (
        <div>
          <Text style={{ fontSize: 13 }}>{v}</Text>
          {r.sampleFile && (
            <div><Text type="secondary" style={{ fontSize: 11 }}><PaperClipOutlined /> {r.sampleFile}</Text></div>
          )}
        </div>
      ) },
    { title: 'ช่วงข้อมูล', key: 'period', width: 180,
      render: (_: unknown, r: StatRequest) => <Text style={{ fontSize: 12 }}>{r.periodFrom} – {r.periodTo}</Text> },
    { title: 'ความเร่งด่วน', dataIndex: 'urgency', key: 'urgency', width: 110,
      render: (v: keyof typeof urgencyConfig) => <Tag color={urgencyConfig[v].color}>{urgencyConfig[v].label}</Tag> },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 150,
      render: (v: StatStatus) => <Tag color={statusConfig[v].color}>{statusConfig[v].label}</Tag> },
    { title: 'จัดการ', key: 'action', align: 'center' as const, width: 120,
      render: (_: unknown, r: StatRequest) => (
        <Button size="small" type="primary" icon={<EyeOutlined />} onClick={() => openDetail(r)}>พิจารณา</Button>
      ) },
  ]

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: 'งานข้อมูลทางการแพทย์' },
            { title: 'ขอข้อมูลสถิติ' },
          ]}
          className="mb-6"
        />

        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <Title level={2} className="m-0" style={{ display: 'flex', alignItems: 'center', gap: 10, color: ACCENT }}>
              <FaChartBar /> ขอข้อมูลสถิติ
            </Title>
            <Text type="secondary">ยื่นคำขอ อนุมัติ จัดทำ และส่งมอบข้อมูลสถิติทางการแพทย์</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => { form.resetFields(); setFormOpen(true) }}>
            ยื่นคำขอใหม่
          </Button>
        </div>

        {/* Summary */}
        <Row gutter={16} className="mb-6">
          {[
            { label: 'รออนุมัติ',        count: summary.pending,   color: '#f59e0b' },
            { label: 'กำลังดำเนินการ',    count: summary.approved,  color: ACCENT },
            { label: 'ส่งมอบแล้ว',       count: summary.delivered, color: '#10b981' },
            { label: 'คำขอทั้งหมด',      count: summary.total,     color: '#0891b2' },
          ].map((s, i) => (
            <Col xs={12} md={6} key={i}>
              <Card variant="borderless" className="rounded-xl text-center">
                <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.count}</div>
                <Text type="secondary">{s.label}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Card variant="borderless" className="rounded-xl">
          <div className="mb-4" style={{ maxWidth: 380 }}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="ค้นหา เลขที่คำขอ / ผู้ขอ / หน่วยงาน / ประเภทข้อมูล"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Table columns={columns} dataSource={filtered} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
        </Card>
      </div>

      {/* ─── Drawer: ยื่นคำขอใหม่ ─── */}
      <Drawer
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, backgroundColor: `${ACCENT}20`, color: ACCENT }}>
              <PlusOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>ยื่นคำขอข้อมูลสถิติ</div>
              <Text type="secondary" style={{ fontSize: 12 }}>กรอกรายละเอียดข้อมูลที่ต้องการ</Text>
            </div>
          </div>
        }
        size="large"
        open={formOpen}
        onClose={() => setFormOpen(false)}
        styles={{ body: { paddingBottom: 80 } }}
        extra={
          <Space>
            <Button onClick={() => setFormOpen(false)}>ยกเลิก</Button>
            <Button type="primary" icon={<SendOutlined />} onClick={handleNewRequest}>ยื่นคำขอ</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional" initialValues={{ urgency: 'medium', format: 'Excel (.xlsx)' }}>
          <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3">ข้อมูลผู้ขอ</div>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="requester" label="ชื่อ-นามสกุล ผู้ขอ" rules={[{ required: true, message: 'กรุณาระบุชื่อ' }]}>
                <Input placeholder="ชื่อ-นามสกุล" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="department" label="หน่วยงาน / สังกัด" rules={[{ required: true, message: 'กรุณาระบุหน่วยงาน' }]}>
                <Input placeholder="เช่น งานยุทธศาสตร์ / มหาวิทยาลัย (ภายนอก)" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="เบอร์โทรติดต่อ">
                <Input placeholder="หมายเลขโทรศัพท์" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="อีเมล">
                <Input placeholder="อีเมลสำหรับรับข้อมูล" />
              </Form.Item>
            </Col>
          </Row>

          <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3 mt-2">รายละเอียดข้อมูลที่ขอ</div>
          <Form.Item name="purpose" label="จุดประสงค์การขอข้อมูล" rules={[{ required: true, message: 'กรุณาระบุจุดประสงค์การขอข้อมูล' }]}>
            <Input.TextArea rows={3} placeholder="อธิบายว่าต้องการข้อมูลอะไร แยกตามอะไร และจะนำไปใช้เพื่ออะไร..." />
          </Form.Item>
          <Form.Item
            name="sampleFile"
            label="ไฟล์ Excel ตัวอย่างข้อมูลที่ต้องการ (ถ้ามี)"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            extra="แนบไฟล์ตัวอย่างเพื่อให้เจ้าหน้าที่เห็นรูปแบบ/คอลัมน์ข้อมูลที่ต้องการ"
          >
            <Upload
              maxCount={1}
              beforeUpload={() => false}
              accept=".xlsx,.xls,.csv"
            >
              <Button icon={<UploadOutlined />}>เลือกไฟล์ Excel ตัวอย่าง</Button>
            </Upload>
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={14}>
              <Form.Item name="period" label="ช่วงเวลาข้อมูล" rules={[{ required: true, message: 'กรุณาระบุช่วงเวลา' }]}>
                <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder={['ตั้งแต่', 'ถึง']} />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name="format" label="รูปแบบไฟล์ที่ต้องการรับ">
                <Select options={FORMATS.map(f => ({ value: f, label: f }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="urgency" label="ความเร่งด่วน">
            <Select options={[
              { value: 'low', label: 'ปกติ' },
              { value: 'medium', label: 'ปานกลาง' },
              { value: 'high', label: 'เร่งด่วน' },
            ]} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ─── Drawer: พิจารณา / ดำเนินการ ─── */}
      <Drawer
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, backgroundColor: `${ACCENT}20`, color: ACCENT }}>
              <AuditOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>พิจารณาคำขอข้อมูล</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{selected?.id}</Text>
            </div>
          </div>
        }
        size="large"
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setRejectMode(false) }}
        styles={{ body: { paddingBottom: 80 } }}
      >
        {selected && (
          <>
            <Steps
              current={selected.status === 'rejected' ? -1 : statusConfig[selected.status].step}
              status={selected.status === 'rejected' ? 'error' : 'process'}
              items={stepItems}
              size="small"
              className="mb-6"
            />

            <Card variant="borderless" className="rounded-xl mb-4" styles={{ body: { padding: 16 } }}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <div className="flex items-center gap-3 mb-3">
                <Avatar size={46} style={{ backgroundColor: ACCENT }} icon={<UserOutlined />} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.requester}</div>
                  <Text type="secondary" style={{ fontSize: 13 }}>{selected.department}</Text>
                </div>
              </div>
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="จุดประสงค์การขอข้อมูล" span={{ xs: 1, sm: 2 }}>{selected.purpose}</Descriptions.Item>
                {selected.sampleFile && (
                  <Descriptions.Item label="ไฟล์ตัวอย่าง" span={{ xs: 1, sm: 2 }}>
                    <a><PaperClipOutlined /> {selected.sampleFile}</a>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label={<><CalendarOutlined /> ช่วงข้อมูล</>}>{selected.periodFrom} – {selected.periodTo}</Descriptions.Item>
                <Descriptions.Item label="รูปแบบไฟล์">{selected.format}</Descriptions.Item>
                <Descriptions.Item label="ความเร่งด่วน">
                  <Tag color={urgencyConfig[selected.urgency].color}>{urgencyConfig[selected.urgency].label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="ติดต่อ">{selected.phone ?? selected.email ?? '-'}</Descriptions.Item>
                {selected.assignedTo && (
                  <Descriptions.Item label="ผู้จัดทำ" span={{ xs: 1, sm: 2 }}>
                    <Text style={{ color: ACCENT, fontWeight: 600 }}>{selected.assignedTo}</Text>
                  </Descriptions.Item>
                )}
                {selected.deliveredNote && (
                  <Descriptions.Item label="การส่งมอบ" span={{ xs: 1, sm: 2 }}>{selected.deliveredNote}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3">ประวัติการดำเนินการ</div>
            <Timeline
              items={selected.approvalHistory.map(h => ({
                color: h.action.includes('ไม่อนุมัติ') ? 'red'
                  : h.action.includes('อนุมัติ') || h.action.includes('ส่งมอบ') ? 'green'
                  : ACCENT,
                content: (
                  <div>
                    <Text strong>{h.stepName}</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{h.timestamp}</Text>
                    <div><Text type="secondary">โดย {h.actor} — {h.action}</Text></div>
                    {h.note && <div style={{ color: '#d97706', fontSize: 12, marginTop: 2 }}>{h.note}</div>}
                  </div>
                ),
              }))}
            />

            <div className="text-xs font-semibold text-app-text-2 uppercase tracking-wider mb-3 mt-2">การดำเนินการ</div>

            {/* pending → approve / reject */}
            {selected.status === 'pending' && !rejectMode && (
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Button block type="primary" icon={<CheckCircleOutlined />} onClick={handleApprove}>อนุมัติคำขอ</Button>
                <Button block danger icon={<CloseCircleOutlined />} onClick={() => setRejectMode(true)}>ไม่อนุมัติ</Button>
              </Space>
            )}
            {selected.status === 'pending' && rejectMode && (
              <Form form={rejectForm} layout="vertical">
                <Form.Item name="rejectReason" label="เหตุผลที่ไม่อนุมัติ" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
                  <Input.TextArea rows={3} placeholder="ระบุเหตุผล..." />
                </Form.Item>
                <Space>
                  <Button danger icon={<CloseCircleOutlined />} onClick={handleReject}>ยืนยันการปฏิเสธ</Button>
                  <Button onClick={() => setRejectMode(false)}>ยกเลิก</Button>
                </Space>
              </Form>
            )}

            {/* approved → assign */}
            {selected.status === 'approved' && (
              <>
                <Alert type="info" showIcon className="mb-4" title="อนุมัติแล้ว — มอบหมายผู้จัดทำข้อมูล" />
                <Form form={assignForm} layout="vertical">
                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item name="assignedTo" label="มอบหมายให้เจ้าหน้าที่" rules={[{ required: true, message: 'กรุณาเลือกเจ้าหน้าที่' }]}>
                        <Select placeholder="เลือกเจ้าหน้าที่เวชสถิติ"
                          options={statStaff.map(s => ({ value: s.name, label: `${s.name} (${s.status})`, disabled: s.status === 'ติดภารกิจ' }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="assignNote" label="หมายเหตุ">
                        <Input placeholder="เช่น ให้เสร็จภายใน 3 วัน" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" icon={<TeamOutlined />} onClick={handleAssign}>มอบหมายงาน</Button>
                </Form>
              </>
            )}

            {/* processing → deliver */}
            {selected.status === 'processing' && (
              <>
                <Alert type="warning" showIcon className="mb-4"
                  title={`กำลังจัดทำโดย ${selected.assignedTo}`}
                  description="เมื่อจัดทำเสร็จ บันทึกการส่งมอบข้อมูล" />
                <Form form={deliverForm} layout="vertical">
                  <Form.Item name="deliveredNote" label="รายละเอียดการส่งมอบ" rules={[{ required: true, message: 'กรุณาระบุการส่งมอบ' }]}>
                    <Input.TextArea rows={3} placeholder="เช่น ส่งไฟล์ทางอีเมล / เลขที่หนังสือนำส่ง..." />
                  </Form.Item>
                  <Button type="primary" icon={<FileExcelOutlined />} onClick={handleDeliver}>บันทึกการส่งมอบ</Button>
                </Form>
              </>
            )}

            {selected.status === 'delivered' && (
              <Alert type="success" showIcon title="ส่งมอบข้อมูลเรียบร้อยแล้ว" description={selected.deliveredNote} />
            )}
            {selected.status === 'rejected' && (
              <Alert type="error" showIcon title="คำขอนี้ถูกปฏิเสธ"
                description={selected.approvalHistory.findLast(h => h.action === 'ไม่อนุมัติ')?.note} />
            )}
          </>
        )}
      </Drawer>
    </div>
  )
}

const StatisticsRequestPage = () => (
  <AppThemeProvider colorPrimary={ACCENT}>
    <PageContent />
  </AppThemeProvider>
)

export default StatisticsRequestPage
