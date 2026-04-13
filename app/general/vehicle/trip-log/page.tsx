'use client'
import { useState } from 'react'
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
  Form,
  InputNumber,
  DatePicker,
  Upload,
  Row,
  Col,
  Divider,
  Input,
  Select,
  Radio,
  theme
} from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  UploadOutlined,
  DashboardOutlined,
  DollarCircleOutlined,
  EditOutlined,
  CarOutlined,
  BulbOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography

// Mock Data
const mockTrips = [
  {
    id: 'TRIP-202604001',
    date: '09/04/2026',
    destination: 'กระทรวงสาธารณสุข นนทบุรี',
    vehicle: 'รถตู้ นข-1111',
    driver: 'นายสมชาย',
    requester: 'นายสมปอง ขยันยิ่ง',
    status: 'completed',
  },
  {
    id: 'TRIP-202604002',
    date: '14/04/2026',
    destination: 'ศาลากลางจังหวัด',
    vehicle: 'รถตู้ ฮฮ-2222',
    driver: 'นายสมศักดิ์',
    requester: 'พญ.สมใจ รักษาดี',
    status: 'assigned',
  },
  {
    id: 'TRIP-202604003',
    date: '15/04/2026',
    destination: 'อย. นนทบุรี',
    vehicle: 'รถกระบะ บบ-3333',
    driver: 'นายวิชัย กล้าหาญ',
    requester: 'นายวิชัย กล้าหาญ',
    status: 'in_progress',
  }
]

const TripLogManagementContent = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<any>(null)

  const openModal = (record: any) => {
    setSelectedTrip(record)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      console.log('Saved Trip Data:', values)
      message.success('บันทึกข้อมูลการเดินทางและค่าใช้จ่ายเรียบร้อยแล้ว')
      setIsModalOpen(false)
    })
  }

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e
    }
    return e?.fileList
  }

  const columns = [
    {
      title: 'รหัสการเดินทาง',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <span className="font-medium text-primary">{text}</span>
    },
    {
      title: 'วันที่',
      dataIndex: 'date',
      key: 'date',
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
      title: 'รถยนต์',
      dataIndex: 'vehicle',
      key: 'vehicle',
      render: (text: string) => <span><CarOutlined className="mr-1 text-slate-400" />{text}</span>
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'assigned') return <Tag color="blue">รอเดินทาง</Tag>
        if (status === 'in_progress') return <Tag color="warning">กำลังเดินทาง</Tag>
        if (status === 'completed') return <Tag color="success">เสร็จสิ้น (รอลงบันทึก)</Tag>
        return <Tag>{status}</Tag>
      }
    },
    {
      title: 'จัดการ',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button 
          type="primary" 
          icon={<EditOutlined />} 
          onClick={() => openModal(record)}
          size="small"
        >
          บันทึกการเดินทาง
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
            { title: 'ระบบจัดการการเดินทางและค่าใช้จ่าย' },
          ]}
          className="mb-6"
        />

        <div className="w-full">
          <div className="mb-8">
            <Title level={2} className="text-primary m-0">บันทึกการเดินทาง (Logbook & Expenses)</Title>
            <Text type="secondary">บันทึกเลขไมล์ เวลาที่ใช้จริง และเบิกจ่ายค่าใช้จ่ายต่างๆ ระหว่างการเดินทาง</Text>
          </div>

          <Card variant="borderless" className="shadow-sm rounded-xl overflow-hidden">
            <div className="mb-4 flex justify-end">
              <DatePicker.RangePicker size="small" placeholder={['วันที่เริ่มต้น', 'วันที่สิ้นสุด']} />
            </div>
            <Table 
              columns={columns} 
              dataSource={mockTrips} 
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </div>
      </div>

      {/* Modal สำหรับบันทึก Logbook & Expenses */}
      <Modal
        title={<span className="text-lg text-primary"><EditOutlined /> บันทึกการเดินทาง: {selectedTrip?.id}</span>}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        width="80%"
        okText="บันทึกข้อมูล"
        cancelText="ยกเลิก"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Divider titlePlacement="left" styles={{ content: { margin: 0 } }} className="text-blue-600 border-blue-200">
            <DashboardOutlined /> บันทึกการเดินทาง (Logbook)
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startMileage" label="เลขไมล์ก่อนเดินทาง" rules={[{ required: true, message: 'กรุณากรอกเลขไมล์เริ่มต้น' }]}>
                <InputNumber className="w-full" placeholder="ระบุเลขกิโลเมตรเริ่มต้น" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endMileage" label="เลขไมล์เมื่อกลับถึงที่ตั้ง" rules={[{ required: true, message: 'กรุณากรอกเลขไมล์สิ้นสุด' }]}>
                <InputNumber className="w-full" placeholder="ระบุเลขกิโลเมตรสิ้นสุด" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startTime" label="เวลาออกเดินทางจริง" rules={[{ required: true, message: 'กรุณาระบุเวลาออก' }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" placeholder="เลือกเวลาออกเดินทาง" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="เวลาถึงที่หมายจริง" rules={[{ required: true, message: 'กรุณาระบุเวลาถึง' }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" placeholder="เลือกเวลาถึงที่หมาย" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" styles={{ content: { margin: 0 } }} className="text-yellow-500 border-yellow-700 mt-6">
            ⛽ ข้อมูลการเติมน้ำมัน
          </Divider>
          <div className="bg-slate-800 p-4 rounded-md border border-slate-700">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="fuelType" label="ประเภทน้ำมัน" rules={[{ required: true, message: 'กรุณาเลือกประเภทน้ำมัน' }]}>
                  <Select placeholder="เลือกประเภทน้ำมัน" options={[
                    { value: 'benzine95', label: 'เบนซิน 95' },
                    { value: 'benzine91', label: 'เบนซิน 91' },
                    { value: 'diesel', label: 'ดีเซล' },
                    { value: 'e20', label: 'E20' },
                    { value: 'e85', label: 'E85' },
                    { value: 'ngv', label: 'NGV' },
                    { value: 'lpg', label: 'LPG' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="fuelLiters" label="จำนวนที่เติม (ลิตร)">
                  <InputNumber min={0} step={0.01} className="w-full" placeholder="ระบุจำนวนลิตร" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="fuelPricePerLiter" label="ราคาต่อลิตร (บาท)">
                  <InputNumber min={0} step={0.01} className="w-full" placeholder="ราคาต่อลิตร" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="fuelTotalCost" label="จำนวนเงินรวม (บาท)">
                  <InputNumber min={0} className="w-full" placeholder="ยอดรวมค่าน้ำมัน" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="fuelReceipt" label="แนบใบเสร็จน้ำมัน" valuePropName="fileList" getValueFromEvent={normFile} className="mb-0">
              <Upload maxCount={1} beforeUpload={() => false}>
                <Button icon={<UploadOutlined />}>อัปโหลดสลิป/ใบเสร็จน้ำมัน</Button>
              </Upload>
            </Form.Item>
          </div>

          <Divider titlePlacement="left" styles={{ content: { margin: 0 } }} className="text-green-600 border-green-200 mt-6">
            <DollarCircleOutlined /> ค่าใช้จ่ายอื่นๆ (Expenses)
          </Divider>
          <div className="bg-slate-800 p-4 rounded-md border border-slate-700">
            {['ค่าทางด่วน', 'ค่าที่จอดรถ'].map((item, index) => (
              <Row gutter={16} key={index} className={index !== 0 ? "mt-4" : ""}>
                <Col span={12}>
                  <Form.Item name={['expenses', index, 'amount']} label={`${item} (บาท)`} className="mb-0">
                    <InputNumber min={0} className="w-full" placeholder="จำนวนเงิน" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['expenses', index, 'receipt']} label={`แนบใบเสร็จ${item}`} valuePropName="fileList" getValueFromEvent={normFile} className="mb-0">
                    <Upload maxCount={1} beforeUpload={() => false}>
                      <Button icon={<UploadOutlined />}>อัปโหลดสลิป/ใบเสร็จ</Button>
                    </Upload>
                  </Form.Item>
                </Col>
              </Row>
            ))}
          </div>

          <Divider titlePlacement="left" styles={{ content: { margin: 0 } }} className="text-blue-400 border-blue-700 mt-6">
            <BulbOutlined /> ข้อเสนอแนะและสภาพรถ
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vehicleCondition" label="สภาพรถโดยรวม" initialValue="normal">
                <Radio.Group>
                  <Radio value="normal">ปกติ</Radio>
                  <Radio value="check">ควรตรวจสอบ</Radio>
                  <Radio value="urgent">ต้องซ่อมด่วน</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="roadCondition" label="สภาพเส้นทาง">
                <Select placeholder="เลือกสภาพเส้นทาง" options={[
                  { value: 'normal', label: 'ปกติ' },
                  { value: 'construction', label: 'มีการก่อสร้าง' },
                  { value: 'flood', label: 'น้ำท่วม/ถนนเสียหาย' },
                  { value: 'other', label: 'อื่นๆ' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="suggestions" label="ข้อเสนอแนะเพิ่มเติม">
            <Input.TextArea rows={4} placeholder="ระบุข้อเสนอแนะ เช่น สภาพยางรถ น้ำมันเบรก ปัญหาที่พบระหว่างเดินทาง..." />
          </Form.Item>

          <Form.Item name="remark" label="หมายเหตุอื่นๆ">
            <Input.TextArea rows={2} placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

const TripLogPage = () => {
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
        <TripLogManagementContent />
      </App>
    </ConfigProvider>
  )
}

export default TripLogPage