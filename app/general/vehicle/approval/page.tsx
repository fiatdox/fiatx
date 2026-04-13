'use client'
import React, { useState } from 'react'
import {
  Table,
  Tag,
  Card,
  Typography,
  Breadcrumb,
  ConfigProvider,
  App,
  Button,
  Modal,
  Steps,
  Descriptions,
  Form,
  Select,
  Alert,
  Divider,
  theme,
  Timeline,
  Badge
} from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CarOutlined,
  BellOutlined,
  IdcardOutlined,
  UserOutlined,
  AuditOutlined,
  TeamOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography

// ---- สถานะตามสายการอนุมัติ ----
// 1. pending_admin    → รอธุรการอนุมัติหลักการ
// 2. pending_director → รอผู้บริหารอนุมัติ
// 3. pending_vehicle  → รอจัดสรรรถและคนขับ (งานยานพาหนะ/ธุรการ)
// 4. approved         → เสร็จสมบูรณ์
// 5. rejected         → ถูกปฏิเสธ
type RequestStatus = 'pending_admin' | 'pending_director' | 'pending_vehicle' | 'approved' | 'rejected'

interface ApprovalStep {
  stepName: string
  actor: string
  action: string
  timestamp?: string
  note?: string
}

interface VehicleRequest {
  id: string
  requester: string
  department: string
  destination: string
  dateFrom: string
  dateTo: string
  purpose: string
  passengers: number
  needDriver: boolean
  status: RequestStatus
  carAssigned?: string
  driverAssigned?: string
  approvalHistory: ApprovalStep[]
}

const mockData: VehicleRequest[] = [
  {
    id: 'VR-202604001',
    requester: 'นายสมปอง ขยันยิ่ง',
    department: 'กลุ่มงานบริหารทั่วไป',
    destination: 'กระทรวงสาธารณสุข นนทบุรี',
    dateFrom: '14/04/2026',
    dateTo: '14/04/2026',
    purpose: 'ส่งเอกสารเบิกจ่ายงบประมาณ',
    passengers: 2,
    needDriver: true,
    status: 'pending_admin',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นายสมปอง ขยันยิ่ง', action: 'ยื่นคำขอเข้าระบบ', timestamp: '11/04/2026 09:30' }
    ]
  },
  {
    id: 'VR-202604002',
    requester: 'พญ.สมใจ รักษาดี',
    department: 'กลุ่มงานการแพทย์',
    destination: 'ศาลากลางจังหวัด',
    dateFrom: '15/04/2026',
    dateTo: '15/04/2026',
    purpose: 'ร่วมประชุมคณะกรรมการจังหวัด',
    passengers: 1,
    needDriver: false,
    status: 'pending_director',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'พญ.สมใจ รักษาดี', action: 'ยื่นคำขอเข้าระบบ', timestamp: '10/04/2026 14:00' },
      { stepName: 'ธุรการอนุมัติ', actor: 'นางสาวธุรการ ดีงาม', action: 'อนุมัติหลักการ', timestamp: '11/04/2026 10:15', note: 'เอกสารครบถ้วน อนุมัติเดินทาง' }
    ]
  },
  {
    id: 'VR-202604003',
    requester: 'นายวิชัย กล้าหาญ',
    department: 'กลุ่มงานเภสัชกรรม',
    destination: 'อย. นนทบุรี',
    dateFrom: '16/04/2026',
    dateTo: '16/04/2026',
    purpose: 'รับยาและเวชภัณฑ์',
    passengers: 3,
    needDriver: true,
    status: 'pending_vehicle',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นายวิชัย กล้าหาญ', action: 'ยื่นคำขอเข้าระบบ', timestamp: '09/04/2026 08:00' },
      { stepName: 'ธุรการอนุมัติ', actor: 'นางสาวธุรการ ดีงาม', action: 'อนุมัติหลักการ', timestamp: '09/04/2026 11:00', note: 'อนุมัติ' },
      { stepName: 'ผู้บริหารอนุมัติ', actor: 'นพ.ผู้อำนวยการ ใจดี', action: 'อนุมัติขั้นสุดท้าย', timestamp: '10/04/2026 09:00', note: 'อนุมัติ รับทราบวัตถุประสงค์' }
    ]
  },
  {
    id: 'VR-202604004',
    requester: 'นางสาวมานี มีตา',
    department: 'กลุ่มงานการพยาบาล',
    destination: 'โรงพยาบาลศูนย์',
    dateFrom: '09/04/2026',
    dateTo: '09/04/2026',
    purpose: 'ส่งต่อผู้ป่วย',
    passengers: 4,
    needDriver: true,
    status: 'approved',
    carAssigned: 'รถพยาบาล ฉฉ-9999',
    driverAssigned: 'นายสมเกียรติ คนขับ',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นางสาวมานี มีตา', action: 'ยื่นคำขอเข้าระบบ', timestamp: '07/04/2026 13:00' },
      { stepName: 'ธุรการอนุมัติ', actor: 'นางสาวธุรการ ดีงาม', action: 'อนุมัติหลักการ', timestamp: '07/04/2026 15:30', note: 'อนุมัติ' },
      { stepName: 'ผู้บริหารอนุมัติ', actor: 'นพ.ผู้อำนวยการ ใจดี', action: 'อนุมัติขั้นสุดท้าย', timestamp: '08/04/2026 08:45', note: 'อนุมัติ' },
      { stepName: 'จัดสรรยานพาหนะ', actor: 'นายยานพาหนะ จัดการดี', action: 'จัดสรรรถและคนขับ', timestamp: '08/04/2026 10:00', note: 'จัดรถพยาบาล ฉฉ-9999 พร้อมคนขับ' }
    ]
  },
  {
    id: 'VR-202604005',
    requester: 'นายบุญมี สุขใจ',
    department: 'กลุ่มงานทันตกรรม',
    destination: 'สำนักงานเขตสุขภาพ',
    dateFrom: '18/04/2026',
    dateTo: '18/04/2026',
    purpose: 'ประชุมวิชาการทันตกรรม',
    passengers: 2,
    needDriver: false,
    status: 'rejected',
    approvalHistory: [
      { stepName: 'ยื่นคำขอ', actor: 'นายบุญมี สุขใจ', action: 'ยื่นคำขอเข้าระบบ', timestamp: '10/04/2026 10:00' },
      { stepName: 'ธุรการอนุมัติ', actor: 'นางสาวธุรการ ดีงาม', action: 'ไม่อนุมัติ', timestamp: '10/04/2026 14:00', note: 'เอกสารไม่ครบ กรุณาแนบหนังสือเชิญ' }
    ]
  }
]

// ---- Step current index ตามสถานะ ----
const getStepCurrent = (status: RequestStatus) => {
  switch (status) {
    case 'pending_admin': return 0
    case 'pending_director': return 1
    case 'pending_vehicle': return 2
    case 'approved': return 3
    case 'rejected': return -1
    default: return 0
  }
}

const getStatusTag = (status: RequestStatus) => {
  switch (status) {
    case 'pending_admin': return <Tag color="orange" icon={<ClockCircleOutlined />}>รอธุรการอนุมัติ</Tag>
    case 'pending_director': return <Tag color="purple" icon={<AuditOutlined />}>รอผู้บริหารอนุมัติ</Tag>
    case 'pending_vehicle': return <Tag color="blue" icon={<CarOutlined />}>รอจัดสรรยานพาหนะ</Tag>
    case 'approved': return <Tag color="success" icon={<CheckCircleOutlined />}>เสร็จสมบูรณ์</Tag>
    case 'rejected': return <Tag color="error" icon={<CloseCircleOutlined />}>ไม่อนุมัติ</Tag>
    default: return <Tag>{status}</Tag>
  }
}

// ---- Main Page Content ----
const VehicleApprovalPageContent = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReq, setSelectedReq] = useState<VehicleRequest | null>(null)
  const [data, setData] = useState<VehicleRequest[]>(mockData)

  const openModal = (record: VehicleRequest) => {
    setSelectedReq(record)
    setIsModalOpen(true)
    form.resetFields()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedReq(null)
  }

  // จำลอง role ของผู้ใช้ปัจจุบัน (ในระบบจริงจะมาจาก Auth)
  // 'admin' = งานธุรการ | 'director' = ผู้บริหาร | 'vehicle' = งานยานพาหนะ
  const currentRole: 'admin' | 'director' | 'vehicle' = 'admin'

  const handleApprove = () => {
    if (!selectedReq) return
    const now = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

    let nextStatus: RequestStatus = selectedReq.status
    let stepName = ''
    let actor = ''
    let action = ''

    if (selectedReq.status === 'pending_admin') {
      nextStatus = 'pending_director'
      stepName = 'ธุรการอนุมัติ'
      actor = 'นางสาวธุรการ ดีงาม'
      action = 'อนุมัติหลักการ'
    } else if (selectedReq.status === 'pending_director') {
      nextStatus = 'pending_vehicle'
      stepName = 'ผู้บริหารอนุมัติ'
      actor = 'นพ.ผู้อำนวยการ ใจดี'
      action = 'อนุมัติขั้นสุดท้าย'
    }

    const newStep: ApprovalStep = { stepName, actor, action, timestamp: now, note: 'อนุมัติ' }
    const updated = data.map(r =>
      r.id === selectedReq.id
        ? { ...r, status: nextStatus, approvalHistory: [...r.approvalHistory, newStep] }
        : r
    )
    setData(updated)
    message.success(`${action}เรียบร้อยแล้ว ระบบส่งแจ้งเตือนไปยังผู้เกี่ยวข้องแล้ว`)
    closeModal()
  }

  const handleReject = () => {
    if (!selectedReq) return
    const now = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

    let stepName = selectedReq.status === 'pending_admin' ? 'ธุรการอนุมัติ' : 'ผู้บริหารอนุมัติ'
    let actor = selectedReq.status === 'pending_admin' ? 'นางสาวธุรการ ดีงาม' : 'นพ.ผู้อำนวยการ ใจดี'
    const newStep: ApprovalStep = { stepName, actor, action: 'ไม่อนุมัติ', timestamp: now }
    const updated = data.map(r =>
      r.id === selectedReq.id
        ? { ...r, status: 'rejected' as RequestStatus, approvalHistory: [...r.approvalHistory, newStep] }
        : r
    )
    setData(updated)
    message.error('ไม่อนุมัติรายการนี้ ระบบได้แจ้งผู้ขอแล้ว')
    closeModal()
  }

  const handleAssignVehicle = () => {
    if (!selectedReq) return
    form.validateFields().then(values => {
      const now = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      const newStep: ApprovalStep = {
        stepName: 'จัดสรรยานพาหนะ',
        actor: 'นายยานพาหนะ จัดการดี',
        action: 'จัดสรรรถและคนขับ',
        timestamp: now,
        note: `รถ: ${values.car} / คนขับ: ${values.driver}`
      }
      const updated = data.map(r =>
        r.id === selectedReq.id
          ? { ...r, status: 'approved' as RequestStatus, carAssigned: values.car, driverAssigned: values.driver, approvalHistory: [...r.approvalHistory, newStep] }
          : r
      )
      setData(updated)
      message.success('จัดสรรรถและคนขับเรียบร้อยแล้ว ระบบแจ้งผู้ขอและคนขับทราบแล้ว')
      closeModal()
    })
  }

  const columns = [
    {
      title: 'เลขที่คำขอ',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <span className="font-medium text-primary">{text}</span>
    },
    {
      title: 'ผู้ขอใช้รถ',
      dataIndex: 'requester',
      key: 'requester',
    },
    {
      title: 'หน่วยงาน',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'ปลายทาง',
      dataIndex: 'destination',
      key: 'destination',
    },
    {
      title: 'วันที่เดินทาง',
      dataIndex: 'dateFrom',
      key: 'dateFrom',
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (status: RequestStatus) => getStatusTag(status),
    },
    {
      title: 'ดำเนินการ',
      key: 'action',
      align: 'center' as const,
      render: (_: unknown, record: VehicleRequest) => (
        <Button
          type={record.status === 'approved' || record.status === 'rejected' ? 'default' : 'primary'}
          size="small"
          onClick={() => openModal(record)}
        >
          {record.status === 'approved' || record.status === 'rejected' ? 'ดูรายละเอียด' : 'พิจารณา'}
        </Button>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> ระบบบริหารงานทั่วไป</> },
            { title: 'อนุมัติคำขอใช้รถ' },
          ]}
          className="mb-6"
        />

        <div className="w-full">
          <div className="mb-6">
            <Title level={3} className="text-primary m-0 mt-4">ระบบสายการอนุมัติขอใช้รถไปราชการ</Title>
            <Text type="secondary">
              สายการอนุมัติ: ยื่นคำขอ → งานธุรการ → ผู้บริหาร → งานยานพาหนะจัดสรรรถ
            </Text>
          </div>

          {/* Summary Badges */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Badge count={data.filter(r => r.status === 'pending_admin').length} showZero>
              <Tag color="orange" className="px-3 py-1 text-sm"><ClockCircleOutlined className="mr-1" />รอธุรการ</Tag>
            </Badge>
            <Badge count={data.filter(r => r.status === 'pending_director').length} showZero>
              <Tag color="purple" className="px-3 py-1 text-sm"><AuditOutlined className="mr-1" />รอผู้บริหาร</Tag>
            </Badge>
            <Badge count={data.filter(r => r.status === 'pending_vehicle').length} showZero>
              <Tag color="blue" className="px-3 py-1 text-sm"><CarOutlined className="mr-1" />รอจัดสรรรถ</Tag>
            </Badge>
            <Badge count={data.filter(r => r.status === 'approved').length} showZero>
              <Tag color="success" className="px-3 py-1 text-sm"><CheckCircleOutlined className="mr-1" />เสร็จสมบูรณ์</Tag>
            </Badge>
          </div>

          <Card variant="borderless" className="shadow-sm rounded-xl overflow-hidden">
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </div>
      </div>

      {/* Modal พิจารณาอนุมัติ */}
      <Modal
        title={<span className="text-lg">รายละเอียดคำขอใช้รถ — {selectedReq?.id}</span>}
        open={isModalOpen}
        onCancel={closeModal}
        width={860}
        footer={null}
        style={{ top: '5vh' }}
      >
        {selectedReq && (
          <div className="mt-4 space-y-5">

            {/* Workflow Steps */}
            <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
              <Text className="text-slate-400 text-xs mb-3 block">สายการอนุมัติ</Text>
              {selectedReq.status === 'rejected' ? (
                <Alert
                  type="error"
                  showIcon
                  icon={<CloseCircleOutlined />}
                  message="คำขอนี้ถูกปฏิเสธ"
                  description={`ปฏิเสธในขั้น: ${selectedReq.approvalHistory.find(h => h.action === 'ไม่อนุมัติ')?.stepName ?? '—'}  |  ${selectedReq.approvalHistory.find(h => h.action === 'ไม่อนุมัติ')?.note ?? ''}`}
                />
              ) : (
                <Steps
                  current={getStepCurrent(selectedReq.status)}
                  size="small"
                  items={[
                    { title: 'งานธุรการ', content: 'อนุมัติหลักการ', icon: <UserOutlined /> },
                    { title: 'ผู้บริหาร', content: 'อนุมัติขั้นสุดท้าย', icon: <AuditOutlined /> },
                    { title: 'งานยานพาหนะ', content: 'จัดสรรรถและคนขับ', icon: <CarOutlined /> },
                    { title: 'เสร็จสมบูรณ์', content: 'แจ้งผู้ขอ', icon: <CheckCircleOutlined /> },
                  ]}
                />
              )}
            </div>

            {/* Details */}
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="เลขที่คำขอ">{selectedReq.id}</Descriptions.Item>
              <Descriptions.Item label="ผู้ขอใช้รถ"><UserOutlined className="mr-1" />{selectedReq.requester}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน"><TeamOutlined className="mr-1" />{selectedReq.department}</Descriptions.Item>
              <Descriptions.Item label="จำนวนผู้โดยสาร">{selectedReq.passengers} คน</Descriptions.Item>
              <Descriptions.Item label="สถานที่ปลายทาง" span={2}>{selectedReq.destination}</Descriptions.Item>
              <Descriptions.Item label="วันที่เดินทาง" span={2}>{selectedReq.dateFrom}{selectedReq.dateFrom !== selectedReq.dateTo ? ` — ${selectedReq.dateTo}` : ''}</Descriptions.Item>
              <Descriptions.Item label="วัตถุประสงค์" span={2}>{selectedReq.purpose}</Descriptions.Item>
              <Descriptions.Item label="ต้องการคนขับ">{selectedReq.needDriver ? 'ต้องการพนักงานขับรถ' : 'ขับเอง'}</Descriptions.Item>
              <Descriptions.Item label="สถานะปัจจุบัน">{getStatusTag(selectedReq.status)}</Descriptions.Item>

              {selectedReq.carAssigned && (
                <>
                  <Descriptions.Item label="รถที่จัดสรร">
                    <Tag color="geekblue"><CarOutlined className="mr-1" />{selectedReq.carAssigned}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="พนักงานขับรถ">
                    <Tag color="cyan"><IdcardOutlined className="mr-1" />{selectedReq.driverAssigned}</Tag>
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            {/* Approval History Timeline */}
            <div>
              <Text strong className="block mb-3">ประวัติการดำเนินการ</Text>
              <Timeline
                items={selectedReq.approvalHistory.map((step, i) => ({
                  key: i,
                  color: step.action === 'ไม่อนุมัติ' ? 'red' : step.action.includes('ยื่น') ? 'gray' : 'green',
                  children: (
                    <div>
                      <Text strong>{step.stepName}</Text>
                      <Text className="text-slate-400 ml-2 text-xs">{step.timestamp}</Text>
                      <div className="text-sm">{step.actor} — {step.action}</div>
                      {step.note && <div className="text-slate-400 text-xs mt-1">หมายเหตุ: {step.note}</div>}
                    </div>
                  )
                }))}
              />
            </div>

            <Divider className="my-3" />

            {/* ฟอร์มจัดสรรรถ (เฉพาะขั้นตอน pending_vehicle) */}
            {selectedReq.status === 'pending_vehicle' && (
              <div className="bg-blue-950/40 border border-blue-800 rounded-lg p-5">
                <Title level={5} className="mb-4"><CarOutlined className="mr-2" />จัดสรรยานพาหนะ (งานยานพาหนะ/งานธุรการ)</Title>
                <Form form={form} layout="vertical">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="car"
                      label="เลือกรถยนต์ส่วนกลาง"
                      rules={[{ required: true, message: 'กรุณาเลือกรถยนต์' }]}
                    >
                      <Select placeholder="เลือกรถที่ว่างในช่วงเวลานี้">
                        <Select.Option value="รถตู้ นข-1111">รถตู้ นข-1111 (ว่าง)</Select.Option>
                        <Select.Option value="รถตู้ ฮฮ-2222">รถตู้ ฮฮ-2222 (ว่าง)</Select.Option>
                        <Select.Option value="รถกระบะ บบ-3333">รถกระบะ บบ-3333 (ว่าง)</Select.Option>
                        <Select.Option value="รถพยาบาล ฉฉ-9999">รถพยาบาล ฉฉ-9999 (ว่าง)</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      name="driver"
                      label="เลือกพนักงานขับรถ"
                      rules={[{ required: true, message: 'กรุณาเลือกคนขับ' }]}
                    >
                      <Select placeholder="เลือกคนขับที่ว่าง">
                        <Select.Option value="นายสมชาย คนขับ">นายสมชาย (ว่าง)</Select.Option>
                        <Select.Option value="นายสมศักดิ์ คนขับ">นายสมศักดิ์ (ว่าง)</Select.Option>
                        <Select.Option value="ผู้ขอขับเอง">ไม่มี — ผู้ขอขับเอง</Select.Option>
                      </Select>
                    </Form.Item>
                  </div>
                </Form>
              </div>
            )}

            {/* แจ้งเตือน */}
            {selectedReq.status !== 'approved' && selectedReq.status !== 'rejected' && (
              <Alert
                description="เมื่อดำเนินการแล้ว ระบบจะส่งแจ้งเตือนไปยังผู้เกี่ยวข้องลำดับถัดไปโดยอัตโนมัติ"
                type="info"
                showIcon
                icon={<BellOutlined />}
              />
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={closeModal}>ปิด</Button>

              {selectedReq.status === 'pending_admin' && (
                <>
                  <Button danger onClick={handleReject}>ไม่อนุมัติ</Button>
                  <Button type="primary" onClick={handleApprove}>
                    อนุมัติหลักการ → ส่งต่อผู้บริหาร
                  </Button>
                </>
              )}

              {selectedReq.status === 'pending_director' && (
                <>
                  <Button danger onClick={handleReject}>ไม่อนุมัติ</Button>
                  <Button type="primary" onClick={handleApprove}>
                    อนุมัติ → ส่งต่องานยานพาหนะ
                  </Button>
                </>
              )}

              {selectedReq.status === 'pending_vehicle' && (
                <>
                  <Button danger onClick={handleReject}>ยกเลิก / รถไม่ว่าง</Button>
                  <Button type="primary" onClick={handleAssignVehicle}>
                    <CarOutlined /> บันทึกจัดสรรรถ → เสร็จสมบูรณ์
                  </Button>
                </>
              )}
            </div>

          </div>
        )}
      </Modal>
    </div>
  )
}

const VehicleApprovalPage = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#006a5a',
          borderRadius: 8,
          fontFamily: 'var(--font-sarabun)',
        },
      }}
    >
      <App>
        <VehicleApprovalPageContent />
      </App>
    </ConfigProvider>
  )
}

export default VehicleApprovalPage
