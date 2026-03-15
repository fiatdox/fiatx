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
  Space,
  Alert,
  Divider
} from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CarOutlined,
  BellOutlined,
  IdcardOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography

// Mockup Data Types
type RequestStatus = 'pending_dept' | 'pending_vehicle' | 'pending_director' | 'approved' | 'rejected'

interface VehicleRequest {
  id: string
  requester: string
  department: string
  destination: string
  date: string
  purpose: string
  passengers: number
  status: RequestStatus
  carAssigned?: string
  driverAssigned?: string
}

const mockData: VehicleRequest[] = [
  {
    id: 'VR-202311001',
    requester: 'นายสมปอง ขยันยิ่ง',
    department: 'กลุ่มงานบริหารทั่วไป',
    destination: 'กระทรวงสาธารณสุข นนทบุรี',
    date: '20/11/2023 08:00 - 16:00',
    purpose: 'ส่งเอกสารเบิกจ่ายงบประมาณ',
    passengers: 2,
    status: 'pending_dept',
  },
  {
    id: 'VR-202311002',
    requester: 'พญ.สมใจ รักษาดี',
    department: 'กลุ่มงานการแพทย์',
    destination: 'ศาลากลางจังหวัด',
    date: '21/11/2023 09:00 - 12:00',
    purpose: 'ร่วมประชุมคณะกรรมการจังหวัด',
    passengers: 1,
    status: 'pending_vehicle',
  },
  {
    id: 'VR-202311003',
    requester: 'นายวิชัย กล้าหาญ',
    department: 'กลุ่มงานเภสัชกรรม',
    destination: 'อย. นนทบุรี',
    date: '22/11/2023 08:30 - 16:30',
    purpose: 'รับยาและเวชภัณฑ์',
    passengers: 3,
    status: 'pending_director',
    carAssigned: 'รถตู้ นข-1111',
    driverAssigned: 'นายสมชาย คนขับ',
  },
  {
    id: 'VR-202311004',
    requester: 'นางสาวมานี มีตา',
    department: 'กลุ่มงานการพยาบาล',
    destination: 'โรงพยาบาลศูนย์',
    date: '18/11/2023 13:00 - 16:00',
    purpose: 'ส่งต่อผู้ป่วย',
    passengers: 4,
    status: 'approved',
    carAssigned: 'รถพยาบาล ฉฉ-9999',
    driverAssigned: 'นายสมเกียรติ คนขับ',
  }
]

const VehicleApprovalPageContent = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReq, setSelectedReq] = useState<VehicleRequest | null>(null)

  const openModal = (record: VehicleRequest) => {
    setSelectedReq(record)
    setIsModalOpen(true)
    if (record.status === 'pending_vehicle') {
      form.resetFields()
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedReq(null)
  }

  const handleAction = (action: 'approve' | 'reject' | 'assign') => {
    if (action === 'assign') {
      form.validateFields().then(values => {
        console.log('Assigned:', values)
        message.success('จัดสรรรถและคนขับเรียบร้อยแล้ว ระบบได้ส่ง Line Notify แจ้งเตือนผู้อำนวยการ')
        closeModal()
      })
    } else if (action === 'approve') {
      message.success('อนุมัติรายการเรียบร้อยแล้ว ระบบได้ส่งการแจ้งเตือนไปยังผู้เกี่ยวข้อง')
      closeModal()
    } else {
      message.error('ไม่อนุมัติรายการนี้')
      closeModal()
    }
  }

  const getStatusTag = (status: RequestStatus) => {
    switch (status) {
      case 'pending_dept': return <Tag color="orange" icon={<ClockCircleOutlined />}>รอหัวหน้ากลุ่มงาน</Tag>
      case 'pending_vehicle': return <Tag color="blue" icon={<CarOutlined />}>รอจัดสรรรถ (หัวหน้ายานพาหนะ)</Tag>
      case 'pending_director': return <Tag color="purple" icon={<ClockCircleOutlined />}>รอผู้อำนวยการอนุมัติ</Tag>
      case 'approved': return <Tag color="success" icon={<CheckCircleOutlined />}>อนุมัติเรียบร้อย</Tag>
      case 'rejected': return <Tag color="error" icon={<CloseCircleOutlined />}>ไม่อนุมัติ</Tag>
      default: return <Tag>{status}</Tag>
    }
  }

  const getStepCurrent = (status: RequestStatus) => {
    switch (status) {
      case 'pending_dept': return 0
      case 'pending_vehicle': return 1
      case 'pending_director': return 2
      case 'approved': return 3
      case 'rejected': return 0 // ขึ้นอยู่กับว่าถูกปฏิเสธที่ขั้นตอนไหน อันนี้จำลองให้เห็นว่ามี error
      default: return 0
    }
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
      title: 'ปลายทาง',
      dataIndex: 'destination',
      key: 'destination',
    },
    {
      title: 'วันเวลาที่เดินทาง',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (status: RequestStatus) => getStatusTag(status),
    },
    {
      title: 'จัดการ',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: VehicleRequest) => (
        <Button 
          type={record.status === 'approved' ? 'default' : 'primary'} 
          size="small" 
          onClick={() => openModal(record)}
        >
          {record.status === 'approved' ? 'ดูรายละเอียด' : 'พิจารณา'}
        </Button>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> ระบบบริหารงานทั่วไป</> },
            { title: 'ระบบสายการอนุมัติ (Approval Workflow)' },
          ]}
          className="mb-6"
        />

        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Title level={2} className="text-primary m-0">ระบบสายการอนุมัติขอใช้รถ</Title>
            <Text type="secondary">จัดการและอนุมัติคำขอใช้รถส่วนกลางตามลำดับขั้น พร้อมระบบแจ้งเตือนอัตโนมัติ</Text>
          </div>

          <Card variant="borderless" className="shadow-sm rounded-xl overflow-hidden">
            <Table 
              columns={columns} 
              dataSource={mockData} 
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </div>
      </div>

      {/* Modal สำหรับพิจารณาอนุมัติ */}
      <Modal
        title={<span className="text-lg text-primary">รายละเอียดการขอใช้รถไปราชการ</span>}
        open={isModalOpen}
        onCancel={closeModal}
        width={800}
        footer={null}
      >
        {selectedReq && (
          <div className="mt-6">
            {/* Workflow Steps */}
            <div className="bg-slate-50 p-6 rounded-lg mb-6 border border-slate-100">
              <Steps
                current={getStepCurrent(selectedReq.status)}
                status={selectedReq.status === 'rejected' ? 'error' : 'process'}
                items={[
                  {
                    title: 'หัวหน้ากลุ่มงาน',
                    content: 'อนุมัติหลักการ',
                  },
                  {
                    title: 'หัวหน้างานยานพาหนะ',
                    content: 'จัดสรรรถและคนขับ',
                  },
                  {
                    title: 'ผู้อำนวยการ',
                    content: 'อนุมัติขั้นสุดท้าย',
                  },
                ]}
              />
            </div>

            {/* Details */}
            <Descriptions bordered column={2} size="small" className="mb-6">
              <Descriptions.Item label="เลขที่คำขอ">{selectedReq.id}</Descriptions.Item>
              <Descriptions.Item label="ผู้ขอใช้รถ">{selectedReq.requester}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{selectedReq.department}</Descriptions.Item>
              <Descriptions.Item label="จำนวนผู้โดยสาร">{selectedReq.passengers} คน</Descriptions.Item>
              <Descriptions.Item label="สถานที่ปลายทาง" span={2}>{selectedReq.destination}</Descriptions.Item>
              <Descriptions.Item label="วัน-เวลา" span={2}>{selectedReq.date}</Descriptions.Item>
              <Descriptions.Item label="วัตถุประสงค์" span={2}>{selectedReq.purpose}</Descriptions.Item>
              
              {/* แสดงข้อมูลรถถ้ามีการจัดสรรแล้ว */}
              {selectedReq.carAssigned && (
                <>
                  <Descriptions.Item label="รถที่จัดสรร">
                    <Tag color="geekblue" className="m-0 text-sm"><CarOutlined /> {selectedReq.carAssigned}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="พนักงานขับรถ">
                    <Tag color="cyan" className="m-0 text-sm"><IdcardOutlined /> {selectedReq.driverAssigned}</Tag>
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Divider />

            {/* Form จัดสรรรถ สำหรับหัวหน้ายานพาหนะ */}
            {selectedReq.status === 'pending_vehicle' && (
              <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100 mb-6">
                <Title level={5} className="mb-4 text-blue-800"><CarOutlined /> ส่วนการจัดสรรรถ (เฉพาะหัวหน้างานยานพาหนะ)</Title>
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
                      </Select>
                    </Form.Item>
                    <Form.Item 
                      name="driver" 
                      label="เลือกพนักงานขับรถ"
                      rules={[{ required: true, message: 'กรุณาเลือกคนขับ' }]}
                    >
                      <Select placeholder="เลือกคนขับที่ว่าง">
                        <Select.Option value="นายสมชาย">นายสมชาย (ว่าง)</Select.Option>
                        <Select.Option value="นายสมศักดิ์">นายสมศักดิ์ (ว่าง)</Select.Option>
                        <Select.Option value="ไม่มี (ผู้ขอขับเอง)">ไม่มี (ผู้ขอขับเอง)</Select.Option>
                      </Select>
                    </Form.Item>
                  </div>
                </Form>
              </div>
            )}

            {/* System Notifications Alert */}
            {selectedReq.status !== 'approved' && selectedReq.status !== 'rejected' && (
              <Alert
                title="การแจ้งเตือนระบบ"
                description="เมื่อท่านดำเนินการ ระบบจะส่งแจ้งเตือนผ่าน Line Notify และ In-app ไปยังผู้อนุมัติลำดับถัดไปโดยอัตโนมัติ"
                type="info"
                showIcon
                icon={<BellOutlined />}
                className="mb-6 bg-slate-50 border-slate-200"
              />
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button onClick={closeModal}>ปิดหน้าต่าง</Button>
              
              {selectedReq.status === 'pending_dept' && (
                <>
                  <Button danger onClick={() => handleAction('reject')}>ไม่อนุมัติ</Button>
                  <Button type="primary" onClick={() => handleAction('approve')}>อนุมัติหลักการ (ส่งต่อยานพาหนะ)</Button>
                </>
              )}

              {selectedReq.status === 'pending_vehicle' && (
                <>
                  <Button danger onClick={() => handleAction('reject')}>ยกเลิกคำขอ / รถไม่ว่าง</Button>
                  <Button type="primary" onClick={() => handleAction('assign')}>บันทึกจัดสรรรถ (ส่งต่อผู้อำนวยการ)</Button>
                </>
              )}

              {selectedReq.status === 'pending_director' && (
                <>
                  <Button danger onClick={() => handleAction('reject')}>ไม่อนุมัติ</Button>
                  <Button type="primary" className="bg-green-600 hover:bg-green-500" onClick={() => handleAction('approve')}>อนุมัติขั้นสุดท้าย</Button>
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