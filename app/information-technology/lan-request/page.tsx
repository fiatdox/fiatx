'use client'
import { useState } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, ConfigProvider, App,
  Button, Modal, Form, Input, InputNumber, Select, Upload,
  Row, Col, Divider, Steps, Timeline, Descriptions, Badge, Space, Alert,
  theme
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, UploadOutlined, CheckCircleOutlined,
  CloseCircleOutlined, AuditOutlined, TeamOutlined,
  PlusOutlined, EyeOutlined
} from '@ant-design/icons'
import { FaNetworkWired } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography

type LanStatus = 'pending' | 'approved' | 'assigned' | 'in_progress' | 'completed' | 'rejected'

interface ApprovalStep {
  stepName: string
  actor: string
  action: string
  timestamp?: string
  note?: string
}

interface LanRequest {
  id: string
  requestDate: string
  requester: string
  department: string
  phone: string
  building: string
  floor: string
  room: string
  portCount: number
  cableType: string
  purpose: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  status: LanStatus
  assignedTo?: string
  approvalHistory: ApprovalStep[]
}

const mockRequests: LanRequest[] = [
  {
    id: 'LAN-202604001',
    requestDate: '10/04/2026',
    requester: 'นางสาวสมศรี รักษาดี',
    department: 'งานการเงิน',
    phone: '081-234-5678',
    building: 'อาคารผู้ป่วยนอก (OPD)',
    floor: 'ชั้น 2',
    room: 'ห้องการเงิน 201',
    portCount: 4,
    cableType: 'Cat6',
    purpose: 'ขยายจุดเชื่อมต่อสำหรับคอมพิวเตอร์เพิ่มเติม จำนวน 4 เครื่อง',
    urgency: 'medium',
    status: 'pending',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นางสาวสมศรี รักษาดี', action: 'ยื่นคำขอติดตั้ง', timestamp: '10/04/2026 09:00' }
    ]
  },
  {
    id: 'LAN-202604002',
    requestDate: '11/04/2026',
    requester: 'นายวิชัย กล้าหาญ',
    department: 'งานเวชระเบียน',
    phone: '082-345-6789',
    building: 'อาคารอำนวยการ',
    floor: 'ชั้น 1',
    room: 'ห้องเวชระเบียน',
    portCount: 8,
    cableType: 'Cat6A',
    purpose: 'ติดตั้งจุด LAN ใหม่ทั้งห้อง เนื่องจากย้ายที่ทำการ ต้องการ 8 จุด',
    urgency: 'high',
    status: 'approved',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นายวิชัย กล้าหาญ', action: 'ยื่นคำขอติดตั้ง', timestamp: '11/04/2026 08:30' },
      { stepName: 'หัวหน้างานอนุมัติ', actor: 'นายสมนึก หัวหน้าไอที', action: 'อนุมัติ', timestamp: '11/04/2026 10:15', note: 'อนุมัติ — งบประมาณพร้อม ดำเนินการได้เลย' }
    ]
  },
  {
    id: 'LAN-202604003',
    requestDate: '09/04/2026',
    requester: 'นพ.สมชาย ใจดี',
    department: 'งานผู้ป่วยใน (IPD)',
    phone: '083-456-7890',
    building: 'อาคารผู้ป่วยใน (IPD)',
    floor: 'ชั้น 3',
    room: 'ห้องพักแพทย์',
    portCount: 2,
    cableType: 'Cat6',
    purpose: 'ติดตั้งจุด LAN สำหรับ Workstation ของแพทย์ 2 จุด',
    urgency: 'low',
    status: 'assigned',
    assignedTo: 'นายสมบัติ เน็ตเวิร์ค',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นพ.สมชาย ใจดี', action: 'ยื่นคำขอติดตั้ง', timestamp: '09/04/2026 13:00' },
      { stepName: 'หัวหน้างานอนุมัติ', actor: 'นายสมนึก หัวหน้าไอที', action: 'อนุมัติ', timestamp: '09/04/2026 15:00' },
      { stepName: 'จ่ายงาน', actor: 'นายสมนึก หัวหน้าไอที', action: 'มอบหมายงาน', timestamp: '10/04/2026 08:00', note: 'มอบหมายให้ นายสมบัติ เน็ตเวิร์ค รับผิดชอบ ให้เสร็จภายใน 3 วัน' }
    ]
  },
  {
    id: 'LAN-202603001',
    requestDate: '28/03/2026',
    requester: 'นางรัตนา สุขสม',
    department: 'งานผู้ป่วยนอก',
    phone: '084-567-8901',
    building: 'อาคารผู้ป่วยนอก (OPD)',
    floor: 'ชั้น 1',
    room: 'เคาน์เตอร์ OPD',
    portCount: 6,
    cableType: 'Cat6',
    purpose: 'ต้องการจุด LAN เพิ่มสำหรับเครื่อง kiosk และระบบคิว',
    urgency: 'high',
    status: 'completed',
    assignedTo: 'นางสาวจิตรา ไอที',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นางรัตนา สุขสม', action: 'ยื่นคำขอติดตั้ง', timestamp: '28/03/2026 10:00' },
      { stepName: 'หัวหน้างานอนุมัติ', actor: 'นายสมนึก หัวหน้าไอที', action: 'อนุมัติ', timestamp: '28/03/2026 14:00' },
      { stepName: 'จ่ายงาน', actor: 'นายสมนึก หัวหน้าไอที', action: 'มอบหมายงาน', timestamp: '29/03/2026 08:00', note: 'มอบหมายให้ นางสาวจิตรา ไอที รับผิดชอบ' },
      { stepName: 'เสร็จสิ้น', actor: 'นางสาวจิตรา ไอที', action: 'ดำเนินการเสร็จสิ้น', timestamp: '31/03/2026 16:30', note: 'ติดตั้งครบ 6 จุด ทดสอบการเชื่อมต่อเรียบร้อย' }
    ]
  },
]

const itStaff = [
  { name: 'นายสมบัติ เน็ตเวิร์ค', status: 'ติดภารกิจ' },
  { name: 'นายวีระ สายแลน', status: 'ว่าง' },
  { name: 'นางสาวจิตรา ไอที', status: 'ว่าง' },
]

const urgencyConfig = {
  low:      { color: 'default',     label: 'ปกติ' },
  medium:   { color: 'processing',  label: 'ปานกลาง' },
  high:     { color: 'warning',     label: 'เร่งด่วน' },
  critical: { color: 'error',       label: 'วิกฤต' },
}

const statusConfig: Record<LanStatus, { color: string; label: string; step: number }> = {
  pending:     { color: 'orange',     label: 'รออนุมัติ',             step: 0 },
  approved:    { color: 'purple',     label: 'อนุมัติแล้ว / รอจัดงาน', step: 1 },
  assigned:    { color: 'blue',       label: 'จ่ายงานแล้ว',           step: 2 },
  in_progress: { color: 'processing', label: 'กำลังดำเนินการ',         step: 2 },
  completed:   { color: 'success',    label: 'เสร็จสิ้น',             step: 3 },
  rejected:    { color: 'error',      label: 'ไม่อนุมัติ',             step: -1 },
}

const stepItems = [
  { title: 'ยื่นคำขอ' },
  { title: 'หัวหน้างานอนุมัติ' },
  { title: 'จ่ายงาน' },
  { title: 'เสร็จสิ้น' },
]

const LanRequestContent = () => {
  const { message } = App.useApp()
  const [requests, setRequests] = useState<LanRequest[]>(mockRequests)
  const [formModal, setFormModal] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [selected, setSelected] = useState<LanRequest | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [form] = Form.useForm()
  const [assignForm] = Form.useForm()
  const [rejectForm] = Form.useForm()

  const nowStr = () =>
    new Date().toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const openDetail = (record: LanRequest) => {
    setSelected(record)
    setRejectMode(false)
    assignForm.resetFields()
    rejectForm.resetFields()
    setDetailModal(true)
  }

  const updateRequest = (id: string, patch: Partial<LanRequest>) => {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch } : r)
      setSelected(next.find(r => r.id === id) || null)
      return next
    })
  }

  const handleApprove = () => {
    if (!selected) return
    updateRequest(selected.id, {
      status: 'approved',
      approvalHistory: [...selected.approvalHistory, {
        stepName: 'หัวหน้างานอนุมัติ',
        actor: 'นายสมนึก หัวหน้าไอที',
        action: 'อนุมัติ',
        timestamp: nowStr(),
      }]
    })
    message.success('อนุมัติคำขอเรียบร้อยแล้ว')
  }

  const handleReject = () => {
    rejectForm.validateFields().then(values => {
      if (!selected) return
      updateRequest(selected.id, {
        status: 'rejected',
        approvalHistory: [...selected.approvalHistory, {
          stepName: 'หัวหน้างานอนุมัติ',
          actor: 'นายสมนึก หัวหน้าไอที',
          action: 'ไม่อนุมัติ',
          timestamp: nowStr(),
          note: values.rejectReason,
        }]
      })
      setRejectMode(false)
      rejectForm.resetFields()
      message.error('ปฏิเสธคำขอเรียบร้อยแล้ว')
    })
  }

  const handleAssign = () => {
    assignForm.validateFields().then(values => {
      if (!selected) return
      updateRequest(selected.id, {
        status: 'assigned',
        assignedTo: values.assignedTo,
        approvalHistory: [...selected.approvalHistory, {
          stepName: 'จ่ายงาน',
          actor: 'นายสมนึก หัวหน้าไอที',
          action: 'มอบหมายงาน',
          timestamp: nowStr(),
          note: `มอบหมายให้ ${values.assignedTo} รับผิดชอบ${values.assignNote ? ' — ' + values.assignNote : ''}`,
        }]
      })
      assignForm.resetFields()
      message.success(`จ่ายงานให้ ${values.assignedTo} เรียบร้อยแล้ว`)
    })
  }

  const handleNewRequest = () => {
    form.validateFields().then(values => {
      const newReq: LanRequest = {
        id: `LAN-${Date.now()}`,
        requestDate: new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        requester: values.requester,
        department: values.department,
        phone: values.phone || '',
        building: values.building,
        floor: values.floor,
        room: values.room,
        portCount: values.portCount,
        cableType: values.cableType || 'Cat6',
        purpose: values.purpose,
        urgency: values.urgency || 'medium',
        status: 'pending',
        approvalHistory: [
          { stepName: 'ยื่นคำขอ', actor: values.requester, action: 'ยื่นคำขอติดตั้ง', timestamp: nowStr() }
        ]
      }
      setRequests(prev => [newReq, ...prev])
      message.success('ยื่นคำขอติดตั้งจุด LAN เรียบร้อยแล้ว')
      form.resetFields()
      setFormModal(false)
    })
  }

  const normFile = (e: any) => Array.isArray(e) ? e : e?.fileList

  const columns = [
    {
      title: 'เลขที่คำขอ',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      render: (v: string) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>{v}</Text>,
    },
    { title: 'วันที่ยื่น', dataIndex: 'requestDate', key: 'requestDate', width: 110 },
    { title: 'ผู้ขอ', dataIndex: 'requester', key: 'requester' },
    { title: 'หน่วยงาน', dataIndex: 'department', key: 'department' },
    {
      title: 'สถานที่',
      key: 'location',
      render: (_: any, r: LanRequest) => `${r.building} ${r.floor} ${r.room}`,
    },
    {
      title: 'จำนวนจุด',
      dataIndex: 'portCount',
      key: 'portCount',
      width: 100,
      align: 'center' as const,
      render: (v: number) => <Badge count={v} color="#7c3aed" overflowCount={99} />,
    },
    {
      title: 'ความเร่งด่วน',
      dataIndex: 'urgency',
      key: 'urgency',
      width: 120,
      render: (v: keyof typeof urgencyConfig) => <Tag color={urgencyConfig[v].color}>{urgencyConfig[v].label}</Tag>,
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (v: LanStatus) => <Tag color={statusConfig[v].color}>{statusConfig[v].label}</Tag>,
    },
    {
      title: 'ผู้รับผิดชอบ',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (v?: string) => v
        ? <Text style={{ color: '#6ee7b7' }}>{v}</Text>
        : <Text type="secondary">-</Text>,
    },
    {
      title: 'จัดการ',
      key: 'action',
      align: 'center' as const,
      width: 110,
      render: (_: any, record: LanRequest) => (
        <Button size="small" type="primary" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
          พิจารณา
        </Button>
      ),
    },
  ]

  const summary = {
    pending:   requests.filter(r => r.status === 'pending').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    assigned:  requests.filter(r => r.status === 'assigned' || r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> งานคอมพิวเตอร์และเทคโนโลยีสารสนเทศ</> },
            { title: 'ขอติดตั้งจุด LAN' },
          ]}
          className="mb-6"
        />

        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <Title level={2} className="text-primary m-0" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FaNetworkWired /> ขอติดตั้งจุด LAN
            </Title>
            <Text type="secondary">ยื่นคำขอ อนุมัติ และมอบหมายการติดตั้งจุดเชื่อมต่อเครือข่าย LAN</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setFormModal(true)}>
            ยื่นคำขอใหม่
          </Button>
        </div>

        {/* Summary cards */}
        <Row gutter={16} className="mb-6">
          {[
            { label: 'รออนุมัติ',              count: summary.pending,   color: '#f59e0b' },
            { label: 'อนุมัติแล้ว / รอจัดงาน', count: summary.approved,  color: '#7c3aed' },
            { label: 'กำลังดำเนินการ',          count: summary.assigned,  color: '#3b82f6' },
            { label: 'เสร็จสิ้น',              count: summary.completed, color: '#10b981' },
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
          <Table
            columns={columns}
            dataSource={requests}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>

      {/* ─── Modal: ยื่นคำขอใหม่ ─── */}
      <Modal
        title={<span className="text-primary"><PlusOutlined /> ยื่นคำขอติดตั้งจุด LAN</span>}
        open={formModal}
        onOk={handleNewRequest}
        onCancel={() => { setFormModal(false); form.resetFields() }}
        width="80%"
        okText="ยื่นคำขอ"
        cancelText="ยกเลิก"
      >
        <Form form={form} layout="vertical" className="mt-4" initialValues={{ urgency: 'medium', cableType: 'Cat6' }}>
          <Divider style={{ color: '#a78bfa', borderColor: '#334155' }}>ข้อมูลผู้ขอ</Divider>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="requester" label="ชื่อ-นามสกุล" rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
                <Input placeholder="ชื่อ-นามสกุลผู้ยื่นคำขอ" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="department" label="หน่วยงาน" rules={[{ required: true, message: 'กรุณากรอกหน่วยงาน' }]}>
                <Input placeholder="ชื่อหน่วยงาน" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="phone" label="เบอร์โทรติดต่อ">
                <Input placeholder="หมายเลขโทรศัพท์" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ color: '#a78bfa', borderColor: '#334155' }}>สถานที่ติดตั้ง</Divider>
          <Row gutter={16}>
            <Col xs={24} md={10}>
              <Form.Item name="building" label="อาคาร" rules={[{ required: true, message: 'กรุณาระบุอาคาร' }]}>
                <Select placeholder="เลือกอาคาร" options={[
                  { value: 'อาคารผู้ป่วยนอก (OPD)',  label: 'อาคารผู้ป่วยนอก (OPD)' },
                  { value: 'อาคารผู้ป่วยใน (IPD)',    label: 'อาคารผู้ป่วยใน (IPD)' },
                  { value: 'อาคารอำนวยการ',           label: 'อาคารอำนวยการ' },
                  { value: 'อาคารพักแพทย์',           label: 'อาคารพักแพทย์' },
                  { value: 'อาคารห้องผ่าตัด',         label: 'อาคารห้องผ่าตัด' },
                  { value: 'อื่นๆ',                   label: 'อื่นๆ (ระบุในหมายเหตุ)' },
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={7}>
              <Form.Item name="floor" label="ชั้น" rules={[{ required: true, message: 'กรุณาระบุชั้น' }]}>
                <Select placeholder="เลือกชั้น" options={[1,2,3,4,5,6,7,8].map(n => ({ value: `ชั้น ${n}`, label: `ชั้น ${n}` }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={7}>
              <Form.Item name="room" label="ห้อง/บริเวณ" rules={[{ required: true, message: 'กรุณาระบุห้อง' }]}>
                <Input placeholder="เช่น ห้องพยาบาล 301" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ color: '#a78bfa', borderColor: '#334155' }}>รายละเอียดการติดตั้ง</Divider>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="portCount" label="จำนวนจุด LAN (พอร์ต)" rules={[{ required: true, message: 'กรุณาระบุจำนวน' }]}>
                <InputNumber min={1} max={48} className="w-full" placeholder="จำนวนพอร์ต" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="cableType" label="ประเภทสาย">
                <Select options={[
                  { value: 'Cat5e',       label: 'Cat5e' },
                  { value: 'Cat6',        label: 'Cat6 (แนะนำ)' },
                  { value: 'Cat6A',       label: 'Cat6A (ความเร็วสูง)' },
                  { value: 'Fiber Optic', label: 'Fiber Optic' },
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="urgency" label="ความเร่งด่วน">
                <Select options={[
                  { value: 'low',      label: 'ปกติ' },
                  { value: 'medium',   label: 'ปานกลาง' },
                  { value: 'high',     label: 'เร่งด่วน' },
                  { value: 'critical', label: 'วิกฤต' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="purpose" label="วัตถุประสงค์การใช้งาน" rules={[{ required: true, message: 'กรุณาระบุวัตถุประสงค์' }]}>
            <Input.TextArea rows={3} placeholder="อธิบายการใช้งานและความจำเป็น..." />
          </Form.Item>
          <Form.Item name="attachments" label="แนบไฟล์ประกอบ (แผนผัง / รูปสถานที่)" valuePropName="fileList" getValueFromEvent={normFile}>
            <Upload maxCount={3} beforeUpload={() => false} multiple>
              <Button icon={<UploadOutlined />}>อัปโหลดไฟล์</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── Modal: พิจารณา / จ่ายงาน ─── */}
      <Modal
        title={<span className="text-primary"><AuditOutlined /> พิจารณาคำขอ: {selected?.id}</span>}
        open={detailModal}
        onCancel={() => { setDetailModal(false); setRejectMode(false) }}
        width="80%"
        footer={null}
      >
        {selected && (
          <div className="mt-4">
            {/* Steps Progress */}
            <Steps
              current={selected.status === 'rejected' ? -1 : statusConfig[selected.status].step}
              status={selected.status === 'rejected' ? 'error' : 'process'}
              items={stepItems}
              className="mb-6"
            />

            {/* Request Details */}
            <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small" className="mb-4">
              <Descriptions.Item label="ผู้ขอ">{selected.requester}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{selected.department}</Descriptions.Item>
              <Descriptions.Item label="เบอร์โทร">{selected.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="อาคาร">{selected.building}</Descriptions.Item>
              <Descriptions.Item label="ชั้น">{selected.floor}</Descriptions.Item>
              <Descriptions.Item label="ห้อง">{selected.room}</Descriptions.Item>
              <Descriptions.Item label="จำนวนจุด">{selected.portCount} พอร์ต</Descriptions.Item>
              <Descriptions.Item label="ประเภทสาย">{selected.cableType}</Descriptions.Item>
              <Descriptions.Item label="ความเร่งด่วน">
                <Tag color={urgencyConfig[selected.urgency].color}>{urgencyConfig[selected.urgency].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="วัตถุประสงค์" span={3}>{selected.purpose}</Descriptions.Item>
              {selected.assignedTo && (
                <Descriptions.Item label="ผู้รับผิดชอบ" span={3}>
                  <Text style={{ color: '#6ee7b7', fontWeight: 600 }}>{selected.assignedTo}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Approval History */}
            <Divider style={{ borderColor: '#334155' }}>ประวัติการดำเนินการ</Divider>
            <Timeline
              items={selected.approvalHistory.map(h => ({
                color: h.action.includes('ไม่อนุมัติ') ? 'red'
                  : h.action.includes('อนุมัติ') || h.action.includes('เสร็จสิ้น') ? 'green'
                  : 'blue',
                children: (
                  <div>
                    <Text strong>{h.stepName}</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{h.timestamp}</Text>
                    <div><Text type="secondary">โดย {h.actor} — {h.action}</Text></div>
                    {h.note && <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 2 }}>{h.note}</div>}
                  </div>
                ),
              }))}
            />

            {/* Action Zone */}
            <Divider style={{ borderColor: '#334155' }}>การดำเนินการ</Divider>

            {/* pending: approve / reject */}
            {selected.status === 'pending' && !rejectMode && (
              <Alert
                title="รอการอนุมัติจากหัวหน้างาน"
                description="ตรวจสอบรายละเอียดแล้วกดอนุมัติหรือปฏิเสธคำขอ"
                type="warning"
                showIcon
                className="mb-0"
                action={
                  <Space direction="vertical">
                    <Button block type="primary" icon={<CheckCircleOutlined />} onClick={handleApprove}>
                      อนุมัติ
                    </Button>
                    <Button block danger icon={<CloseCircleOutlined />} onClick={() => setRejectMode(true)}>
                      ไม่อนุมัติ
                    </Button>
                  </Space>
                }
              />
            )}

            {selected.status === 'pending' && rejectMode && (
              <Form form={rejectForm} layout="vertical">
                <Form.Item name="rejectReason" label="เหตุผลที่ไม่อนุมัติ" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
                  <Input.TextArea rows={3} placeholder="ระบุเหตุผลที่ไม่อนุมัติ..." />
                </Form.Item>
                <Space>
                  <Button danger icon={<CloseCircleOutlined />} onClick={handleReject}>ยืนยันการปฏิเสธ</Button>
                  <Button onClick={() => setRejectMode(false)}>ยกเลิก</Button>
                </Space>
              </Form>
            )}

            {/* approved: assign staff */}
            {selected.status === 'approved' && (
              <>
                <Alert title="อนุมัติแล้ว — รอมอบหมายผู้ดำเนินการ" type="info" showIcon className="mb-4" />
                <Form form={assignForm} layout="vertical">
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="assignedTo" label="มอบหมายให้เจ้าหน้าที่" rules={[{ required: true, message: 'กรุณาเลือกเจ้าหน้าที่' }]}>
                        <Select
                          placeholder="เลือกเจ้าหน้าที่ IT"
                          options={itStaff.map(s => ({
                            value: s.name,
                            label: `${s.name}  (${s.status})`,
                            disabled: s.status === 'ติดภารกิจ',
                          }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="assignNote" label="หมายเหตุการมอบหมาย">
                        <Input placeholder="เช่น ให้ดำเนินการภายใน 3 วัน" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" icon={<TeamOutlined />} onClick={handleAssign}>จ่ายงาน</Button>
                </Form>
              </>
            )}

            {(selected.status === 'assigned' || selected.status === 'in_progress') && (
              <Alert
                title={`จ่ายงานให้ ${selected.assignedTo} แล้ว`}
                description="รอเจ้าหน้าที่ดำเนินการติดตั้ง"
                type="success"
                showIcon
              />
            )}

            {selected.status === 'completed' && (
              <Alert title="ดำเนินการติดตั้งเสร็จสิ้นแล้ว" type="success" showIcon />
            )}

            {selected.status === 'rejected' && (
              <Alert
                title="คำขอนี้ถูกปฏิเสธ"
                description={selected.approvalHistory.findLast(h => h.action === 'ไม่อนุมัติ')?.note}
                type="error"
                showIcon
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

const LanRequestPage = () => (
  <ConfigProvider
    theme={{
      algorithm: theme.darkAlgorithm,
      token: { colorPrimary: '#7c3aed', borderRadius: 8, fontFamily: 'var(--font-sarabun)' },
    }}
  >
    <App>
      <LanRequestContent />
    </App>
  </ConfigProvider>
)

export default LanRequestPage
