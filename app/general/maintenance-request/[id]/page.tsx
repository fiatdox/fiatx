'use client'
import React, { useState, use } from 'react'
import {
  Typography, Card, ConfigProvider, Breadcrumb, Row, Col,
  Descriptions, Tag, Button, Form, Select, Input, Divider, Steps, Image, Grid, theme, Result
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, ToolOutlined,
  CheckCircleOutlined, ClockCircleOutlined, PrinterOutlined
} from '@ant-design/icons'
import Navbar from '../../../components/Navbar'
import { useRouter } from 'next/navigation'

const { Title, Text } = Typography
const { TextArea } = Input
const { useBreakpoint } = Grid

interface RequestDetails {
  id: string
  status: 'pending' | 'in_progress' | 'completed'
  requestDate: string
  reporterName: string
  contactNumber: string
  department: string
  repairCategory: string
  generalType: string
  assetNumber: string
  urgencyLevel: string
  building: string
  location: string
  symptoms: string
  images: string[]
}

const mockDataMap: Record<string, RequestDetails> = {
  'REQ-20260401-001': {
    id: 'REQ-20260401-001',
    status: 'pending',
    requestDate: '01/04/2026 10:30',
    reporterName: 'นายสมชาย ใจดี',
    contactNumber: '081-234-5678',
    department: 'แผนกอายุรกรรม',
    repairCategory: 'งานซ่อมทั่วไป',
    generalType: 'ระบบไฟฟ้า / แสงสว่าง',
    assetNumber: '-',
    urgencyLevel: 'urgent',
    building: 'อาคารผู้ป่วยนอก (OPD)',
    location: 'ชั้น 2 หน้าลิฟต์',
    symptoms: 'หลอดไฟกระพริบและดับไป 2 ดวง บริเวณทางเดินหน้าลิฟต์โดยสาร ทำให้มืดและอาจเกิดอันตรายได้',
    images: [
      'https://gw.alipayobjects.com/zos/antfincdn/LlvErxo8H9/photo-1503185912284-5271ff81b9a8.webp',
      'https://gw.alipayobjects.com/zos/antfincdn/cV16ZqzNwW/photo-1473091540282-9b846e7965e3.webp',
    ]
  },
  'REQ-20260402-002': {
    id: 'REQ-20260402-002',
    status: 'in_progress',
    requestDate: '02/04/2026 14:15',
    reporterName: 'นางสาวสุดา รักงาน',
    contactNumber: '089-456-7890',
    department: 'แผนกศัลยกรรม',
    repairCategory: 'งานซ่อมทั่วไป',
    generalType: 'ระบบประปา / สุขาภิบาล',
    assetNumber: '-',
    urgencyLevel: 'critical',
    building: 'อาคารผู้ป่วยใน (IPD)',
    location: 'ชั้น 3 ห้องน้ำเจ้าหน้าที่',
    symptoms: 'ท่อน้ำรั่วบริเวณใต้อ่างล้างมือ น้ำไหลออกมาบนพื้นตลอดเวลา ต้องรีบแก้ไขด่วน',
    images: [
      'https://gw.alipayobjects.com/zos/antfincdn/x43I27A55%26/photo-1438109491414-7198515b166b.webp',
    ]
  },
  'REQ-20260403-003': {
    id: 'REQ-20260403-003',
    status: 'completed',
    requestDate: '03/04/2026 09:00',
    reporterName: 'นายวีระ มุ่งมั่น',
    contactNumber: '085-678-9012',
    department: 'แผนกการเงิน',
    repairCategory: 'งานซ่อมครุภัณฑ์',
    generalType: '-',
    assetNumber: 'KRU-2565-0042',
    urgencyLevel: 'normal',
    building: 'อาคารอำนวยการ',
    location: 'ชั้น 1 ห้องการเงิน',
    symptoms: 'เครื่องพิมพ์เอกสารไม่ยอมทำงาน ขึ้น error paper jam แต่ไม่มีกระดาษติดค้าง',
    images: []
  },
}

const technicians = [
  { label: 'นายสมเกียรติ ช่างไฟ (ช่างไฟฟ้า)', value: 'tech_01' },
  { label: 'นายวิชัย ใจสู้ (ช่างทั่วไป)', value: 'tech_02' },
  { label: 'นายสมเกียรติ แอร์เย็น (ช่างแอร์)', value: 'tech_03' },
]

export default function MaintenanceRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [form] = Form.useForm()
  const [isAssigned, setIsAssigned] = useState(false)
  const router = useRouter()
  const screens = useBreakpoint()
  const currentColumn = screens.sm ? 2 : 1

  const resolvedParams = use(params)
  const requestId = resolvedParams?.id
  const requestDetails = mockDataMap[requestId] ?? null

  const onAssign = (values: any) => {
    console.log('Assigned values:', values)
    setIsAssigned(true)
  }

  const getUrgencyTag = (level: string) => {
    switch(level) {
      case 'critical': return <Tag color="error">ด่วนมาก (ฉุกเฉิน)</Tag>
      case 'urgent': return <Tag color="warning">ด่วน (กระทบงาน)</Tag>
      default: return <Tag color="success">ปกติ</Tag>
    }
  }

  const getStatusTag = (status: string) => {
    switch(status) {
      case 'completed': return <Tag icon={<CheckCircleOutlined />} color="success" className="text-lg px-3 py-1 m-0">เสร็จสิ้น</Tag>
      case 'in_progress': return <Tag icon={<ToolOutlined />} color="processing" className="text-lg px-3 py-1 m-0">กำลังดำเนินการ</Tag>
      default: return <Tag icon={<ClockCircleOutlined />} color="warning" className="text-lg px-3 py-1 m-0">รอดำเนินการ</Tag>
    }
  }

  const getStepsCurrent = (status: string) => {
    if (isAssigned || status === 'in_progress') return 2
    if (status === 'completed') return 4
    return 1
  }

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
              { href: '/general/maintenance-request', title: 'แจ้งซ่อมบำรุง' },
              { title: `รายละเอียดรายการ ${requestId}` },
            ]}
            className="mb-6"
          />

          {!requestDetails ? (
            <Result
              status="404"
              title="ไม่พบข้อมูล"
              subTitle={`ไม่พบรายการแจ้งซ่อม รหัส: ${requestId}`}
              extra={<Button type="primary" onClick={() => router.push('/general/maintenance-request')}>กลับหน้าแจ้งซ่อม</Button>}
            />
          ) : (
            <div className="max-w-8xl mx-auto">
              <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                  <Title level={2} style={{ color: '#FF6500', margin: 0 }}>รายละเอียดการแจ้งซ่อม</Title>
                  <Text type="secondary">รหัสอ้างอิง: {requestDetails.id}</Text>
                </div>
                <div>
                  {getStatusTag(isAssigned ? 'in_progress' : requestDetails.status)}
                </div>
              </div>

              <Row gutter={24}>
                <Col xs={24} lg={16}>
                  <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12, borderTop: '4px solid #FF6500' }}>
                    <Title level={4} className="mb-6 flex items-center gap-2">
                      <FileTextOutlined style={{ color: '#FF6500' }} /> ข้อมูลการแจ้งซ่อม
                    </Title>

                    <Descriptions column={currentColumn} bordered size="middle">
                      <Descriptions.Item label="วันที่แจ้ง" span={currentColumn}>{requestDetails.requestDate}</Descriptions.Item>
                      <Descriptions.Item label="ผู้แจ้ง">{requestDetails.reporterName}</Descriptions.Item>
                      <Descriptions.Item label="เบอร์ติดต่อ">{requestDetails.contactNumber}</Descriptions.Item>
                      <Descriptions.Item label="หน่วยงาน" span={currentColumn}>{requestDetails.department}</Descriptions.Item>

                      <Descriptions.Item label="ประเภทงานซ่อม" span={currentColumn}>
                        {requestDetails.repairCategory}
                        {requestDetails.generalType && requestDetails.generalType !== '-' && ` - ${requestDetails.generalType}`}
                      </Descriptions.Item>
                      <Descriptions.Item label="ระดับความเร่งด่วน" span={currentColumn}>
                        {getUrgencyTag(requestDetails.urgencyLevel)}
                      </Descriptions.Item>

                      <Descriptions.Item label="ตึก/อาคาร">{requestDetails.building}</Descriptions.Item>
                      <Descriptions.Item label="สถานที่">{requestDetails.location}</Descriptions.Item>

                      <Descriptions.Item label="เลขครุภัณฑ์" span={currentColumn}>{requestDetails.assetNumber}</Descriptions.Item>

                      <Descriptions.Item label="อาการ/ปัญหา" span={currentColumn}>
                        <span className="text-red-400 font-medium">{requestDetails.symptoms}</span>
                      </Descriptions.Item>

                      <Descriptions.Item label="รูปภาพประกอบ" span={currentColumn}>
                        {requestDetails.images && requestDetails.images.length > 0 ? (
                          <div className="flex gap-2 flex-wrap mt-2">
                            <Image.PreviewGroup>
                              {requestDetails.images.map((img, index) => (
                                <Image
                                  key={index}
                                  width={120}
                                  height={120}
                                  src={img}
                                  alt={`รูปภาพความเสียหาย ${index + 1}`}
                                  className="object-cover rounded-lg border border-slate-200 shadow-sm"
                                />
                              ))}
                            </Image.PreviewGroup>
                          </div>
                        ) : (
                          <Text type="secondary">- ไม่มีรูปภาพแนบ -</Text>
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12 }}>
                    <Title level={5} className="mb-6">สถานะการดำเนินการ</Title>
                    <Steps
                      current={getStepsCurrent(requestDetails.status)}
                      items={[
                        { title: 'แจ้งซ่อม', content: requestDetails.requestDate },
                        { title: 'ตรวจสอบ/มอบหมาย', content: (isAssigned || requestDetails.status !== 'pending') ? 'หัวหน้างานมอบหมายแล้ว' : 'รอหัวหน้างานพิจารณา' },
                        { title: 'กำลังดำเนินการ', content: (isAssigned || requestDetails.status === 'in_progress' || requestDetails.status === 'completed') ? 'ช่างกำลังปฏิบัติงาน' : '' },
                        { title: 'เสร็จสิ้น' },
                      ]}
                    />
                  </Card>
                </Col>

                <Col xs={24} lg={8}>
                  <Card variant="borderless" className="shadow-sm mb-6 bg-slate-800 border-slate-700" style={{ borderRadius: 12 }}>
                    <Title level={4} className="mb-4 flex items-center gap-2" style={{ color: '#FF6500' }}>
                      <ToolOutlined /> พิจารณา / มอบหมายงาน
                    </Title>
                    <Text type="secondary" className="block mb-6">สำหรับหัวหน้างานหรือผู้รับผิดชอบ เพื่อจ่ายงานให้ช่างที่เกี่ยวข้อง</Text>

                    {isAssigned || requestDetails.status !== 'pending' ? (
                       <div className="bg-green-950/30 p-4 rounded-lg border border-green-900 text-center">
                         <CheckCircleOutlined className="text-4xl text-green-500 mb-2" />
                         <Title level={5} className="text-green-400 m-0">มอบหมายงานเรียบร้อยแล้ว</Title>
                         <Text className="text-green-500 block mb-4">สถานะของใบงานถูกปรับเป็นกำลังดำเนินการ</Text>
                         <Button
                           type="primary"
                           icon={<PrinterOutlined />}
                           onClick={() => router.push(`/general/maintenance-request/${requestDetails.id}/print`)}
                           className="w-full"
                         >
                           พิมพ์ใบสั่งงานซ่อม (Job Order)
                         </Button>
                       </div>
                    ) : (
                      <Form form={form} layout="vertical" onFinish={onAssign} initialValues={{ action: 'assign' }}>
                        <Form.Item label="การดำเนินการ" name="action" rules={[{ required: true }]}>
                          <Select
                            options={[
                              { label: 'อนุมัติ / มอบหมายช่าง', value: 'assign' },
                              { label: 'รอดำเนินการ (รออะไหล่/คิว)', value: 'wait' },
                              { label: 'ไม่อนุมัติ / ยกเลิก', value: 'reject' },
                            ]}
                          />
                        </Form.Item>

                        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.action !== currentValues.action}>
                          {({ getFieldValue }) => {
                            const action = getFieldValue('action');
                            return action === 'assign' ? (
                              <Form.Item label="มอบหมายให้ช่าง" name="technician" rules={[{ required: true, message: 'กรุณาเลือกช่าง' }]}>
                                <Select placeholder="เลือกช่างเทคนิค" options={technicians} showSearch optionFilterProp="label" />
                              </Form.Item>
                            ) : null;
                          }}
                        </Form.Item>

                        <Form.Item label="ความเห็นเพิ่มเติม / หมายเหตุ" name="remarks">
                          <TextArea rows={3} placeholder="ระบุข้อความถึงช่าง หรือเหตุผลเพิ่มเติม (เช่น อนุมัติเบิกอะไหล่)" />
                        </Form.Item>

                        <Divider />

                        <Button type="primary" htmlType="submit" size="large" block className="font-semibold" style={{ boxShadow: '0 4px 14px rgba(255,101,0,0.3)' }}>
                          บันทึกและส่งมอบหมาย
                        </Button>
                      </Form>
                    )}
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </div>
      </div>
    </ConfigProvider>
  )
}
