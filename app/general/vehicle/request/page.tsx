'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { VehicleRequestForPDF } from '@/app/components/VehicleRequestPDF'

const VehicleRequestPDFDownload = dynamic(
  () => import('@/app/components/VehicleRequestPDF'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center" style={{ height: 560 }}>
        <Button loading size="large">กำลังโหลดตัวอย่าง PDF...</Button>
      </div>
    ),
  }
)
import {
  Form,
  Input,
  Button,
  DatePicker,
  Radio,
  Card,
  Row,
  Col,
  Typography,
  Breadcrumb,
  ConfigProvider,
  App,
  Badge,
  Calendar,
  Divider,
  Space,
  Tag,
  Tabs,
  Table,
  Statistic,
  Tooltip,
  Popover,
  Upload,
  Modal,
  theme
} from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  CarOutlined,
  CalendarOutlined,
  UserOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  FileProtectOutlined,
  ProjectOutlined,
  UploadOutlined,
  PaperClipOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

// ---- Types ----
interface VehicleRequest {
  id: string
  requestDate: string
  dateFrom: string
  dateTo: string
  projectName: string
  destination: string
  purpose: string
  documentFiles?: { name: string; size?: number }[]
  passengerCount: number
  passengerNames: string[]
  needDriver: boolean
  status: 'pending' | 'approved' | 'rejected'
  vehicle?: string
  driver?: string
  remark?: string
}

// ---- Fleet & Schedule Types ----
interface VehicleScheduleEntry {
  vehicleId: string
  plate: string
  type: string          // รถตู้ | รถกระบะ | รถเก๋ง
  typeColor: string     // ant design tag color
  driver: string
  status: 'booked' | 'available'
  time?: string
  destination?: string
  project?: string
  requestId?: string
}

// รถทั้งหมดในฝูงบิน (ค่าเริ่มต้น)
const mockFleet: VehicleScheduleEntry[] = [
  { vehicleId: 'v1', plate: 'นข-1111', type: 'รถตู้',    typeColor: 'blue',   driver: 'นายสมชาย รักงาน',   status: 'available' },
  { vehicleId: 'v2', plate: 'ฮฮ-2222', type: 'รถตู้',    typeColor: 'blue',   driver: 'นายสมศักดิ์ ใจดี',  status: 'available' },
  { vehicleId: 'v3', plate: 'บบ-3333', type: 'รถกระบะ',  typeColor: 'orange', driver: 'นายวิโรจน์ ขยันดี', status: 'available' },
]

// วันที่มีจอง — merge กับ mockFleet เพื่อให้รถที่ไม่มีใน entry แสดงเป็น available
const bookedEntries: Record<string, Partial<VehicleScheduleEntry>[]> = {
  '2026-04-07': [
    { vehicleId: 'v1', status: 'booked', time: '08:00 – 17:00', destination: 'กระทรวงสาธารณสุข กรุงเทพฯ', project: 'ประชุมหารือแนวทางการพัฒนาระบบสาธารณสุขระดับเขต', requestId: 'VR-2026-001' },
  ],
  '2026-04-09': [
    { vehicleId: 'v3', status: 'booked', time: '09:00 – 12:00', destination: 'ศาลากลางจังหวัด', project: 'ส่งเอกสารราชการและรับมอบวัสดุครุภัณฑ์', requestId: 'VR-2026-002' },
  ],
  '2026-04-14': [
    { vehicleId: 'v1', status: 'booked', time: '08:00 – 16:00', destination: 'กระทรวงสาธารณสุข กรุงเทพฯ', project: 'ประชุมหารือแนวทางการพัฒนาระบบสาธารณสุขระดับเขต' },
    { vehicleId: 'v2', status: 'booked', time: '07:00 – 20:00', destination: 'โรงแรมเซ็นทาราแกรนด์ กรุงเทพฯ', project: 'เข้าร่วมสัมมนาระดับชาติด้านสาธารณสุข ประจำปี 2569' },
  ],
  '2026-04-15': [
    { vehicleId: 'v2', status: 'booked', time: '09:00 – 12:00', destination: 'สำนักงานสาธารณสุขจังหวัด', project: 'ประชุมติดตามผลการดำเนินงานประจำเดือนเมษายน', requestId: 'VR-2026-004' },
  ],
}

// สร้าง schedule เต็มจาก fleet + override ด้วย bookedEntries
function buildSchedule(dateStr: string): VehicleScheduleEntry[] {
  const overrides = (bookedEntries[dateStr] ?? []).reduce<Record<string, Partial<VehicleScheduleEntry>>>(
    (acc, e) => { acc[e.vehicleId!] = e; return acc }, {}
  )
  return mockFleet.map(v => ({ ...v, ...(overrides[v.vehicleId] ?? {}) }))
}

// ---- Mock Request History ----
const mockRequests: VehicleRequest[] = [
  {
    id: 'VR-2026-001',
    requestDate: '01/04/2026',
    dateFrom: '07/04/2026 08:00',
    dateTo: '07/04/2026 17:00',
    projectName: 'โครงการพัฒนาระบบสาธารณสุขระดับเขต',
    destination: 'กระทรวงสาธารณสุข กรุงเทพฯ',
    purpose: 'ประชุมหารือแนวทางการพัฒนาระบบสาธารณสุขระดับเขต',
    documentFiles: [{ name: 'หนังสือสั่งการ สธ 0201-ว1234.pdf', size: 245000 }],
    passengerCount: 3,
    passengerNames: ['นพ.ประสิทธิ์ สุขใจ', 'นางสาวมาลี ดีงาม', 'นายวิชัย เจริญ'],
    needDriver: true,
    status: 'approved',
    vehicle: 'รถตู้ นข-1111',
    driver: 'นายสมชาย รักงาน',
  },
  {
    id: 'VR-2026-002',
    requestDate: '03/04/2026',
    dateFrom: '09/04/2026 09:00',
    dateTo: '09/04/2026 12:00',
    projectName: 'งานพัสดุรับมอบวัสดุครุภัณฑ์',
    destination: 'ศาลากลางจังหวัด',
    purpose: 'ส่งเอกสารราชการและรับมอบวัสดุครุภัณฑ์',
    documentFiles: [{ name: 'บันทึกข้อความ รพ.0203-124.pdf', size: 128000 }, { name: 'ใบสั่งซื้อวัสดุ.pdf', size: 89000 }],
    passengerCount: 2,
    passengerNames: ['นางสาวสุดา รักงาน', 'นายอนันต์ มีสุข'],
    needDriver: true,
    status: 'approved',
    vehicle: 'รถกระบะ บบ-3333',
    driver: 'นายวิโรจน์ ขยันดี',
  },
  {
    id: 'VR-2026-003',
    requestDate: '05/04/2026',
    dateFrom: '14/04/2026 07:00',
    dateTo: '14/04/2026 20:00',
    projectName: 'สัมมนาระดับชาติด้านสาธารณสุข ประจำปี 2569',
    destination: 'โรงแรมเซ็นทาราแกรนด์ กรุงเทพฯ',
    purpose: 'เข้าร่วมสัมมนาระดับชาติด้านสาธารณสุข ประจำปี 2569',
    documentFiles: [{ name: 'หนังสือเชิญประชุม สธ 0301-ว567.pdf', size: 310000 }],
    passengerCount: 5,
    passengerNames: ['ผอ.โรงพยาบาล', 'รอง ผอ.', 'พยาบาลหัวหน้า', 'นักวิชาการสาธารณสุข', 'เจ้าหน้าที่'],
    needDriver: true,
    status: 'rejected',
    remark: 'ช่วงวันที่ดังกล่าวไม่มีรถว่าง รถทุกคันถูกจองแล้ว กรุณาขอใหม่ในวันอื่น',
  },
  {
    id: 'VR-2026-004',
    requestDate: '10/04/2026',
    dateFrom: '15/04/2026 08:30',
    dateTo: '15/04/2026 16:30',
    projectName: 'ประชุมติดตามผลงานประจำเดือน',
    destination: 'สำนักงานสาธารณสุขจังหวัด',
    purpose: 'ประชุมติดตามผลการดำเนินงานประจำเดือนเมษายน',
    documentFiles: [{ name: 'หนังสือสั่งการ สสจ-ว89.pdf', size: 198000 }],
    passengerCount: 2,
    passengerNames: ['นางสาวสุดา รักงาน', 'นายอนันต์ มีสุข'],
    needDriver: false,
    status: 'pending',
  },
]

// ---- Status Config ----
const statusConfig = {
  pending:  { label: 'รอพิจารณา', tagColor: 'warning',  icon: <ClockCircleOutlined /> },
  approved: { label: 'อนุมัติ',    tagColor: 'success',  icon: <CheckCircleOutlined /> },
  rejected: { label: 'ไม่อนุมัติ', tagColor: 'error',   icon: <CloseCircleOutlined /> },
}

// ---- Page Content ----
const VehicleRequestPageContent = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [requests, setRequests] = useState<VehicleRequest[]>(mockRequests)
  const requesterLevel = Form.useWatch('requesterLevel', form)
  const minPassengers = requesterLevel === 'senior' ? 1 : requesterLevel === 'junior' ? 3 : 1
  const [printRequest, setPrintRequest] = useState<VehicleRequest | null>(null)

  const onFinish = (values: any) => {
    const [dateFrom, dateTo] = values.dateRange ?? []
    const passengers: string[] = (values.passengers ?? []).map((p: { name: string }) => p.name).filter(Boolean)
    const newRequest: VehicleRequest = {
      id: `VR-${Date.now()}`,
      requestDate: dayjs().format('DD/MM/YYYY'),
      dateFrom: dateFrom ? dateFrom.format('DD/MM/YYYY HH:mm') : '',
      dateTo: dateTo ? dateTo.format('DD/MM/YYYY HH:mm') : '',
      projectName: values.projectName,
      destination: values.destination,
      purpose: values.purpose,
      documentFiles: (values.documentFiles ?? []).map((f: any) => ({ name: f.name, size: f.size })),
      passengerCount: passengers.length,
      passengerNames: passengers,
      needDriver: values.needDriver,
      status: 'pending',
    }
    setRequests(prev => [newRequest, ...prev])
    message.success('ส่งคำขอใช้รถไปราชการเรียบร้อยแล้ว — อยู่ระหว่างรอการพิจารณา')
    form.resetFields()
    form.setFieldsValue({ needDriver: true, passengers: [{ name: '' }] })
  }

  const dateCellRender = (value: Dayjs) => {
    const dateString = value.format('YYYY-MM-DD')
    const booked = (bookedEntries[dateString] ?? [])
    if (booked.length === 0) return null

    const fleet = buildSchedule(dateString)
    const bookedList = fleet.filter(v => v.status === 'booked')

    const popoverContent = (
      <div className="space-y-2" style={{ minWidth: 240 }}>
        {bookedList.map(v => (
          <div key={v.vehicleId} className="border-b border-slate-600 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Tag color={v.typeColor} className="m-0 text-xs">{v.type}</Tag>
              <span className="font-semibold text-sm">{v.plate}</span>
            </div>
            <div className="text-xs text-slate-400 space-y-0.5">
              <div>คนขับ: {v.driver}</div>
              {v.time && <div>เวลา: {v.time}</div>}
              {v.destination && <div>ปลายทาง: {v.destination}</div>}
              {v.project && (
                <div className="text-yellow-400 mt-1">
                  📋 {v.project}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )

    return (
      <Popover
        content={popoverContent}
        title={<span className="text-sm">รถที่จอง {value.format('DD/MM/YYYY')}</span>}
        trigger="hover"
        placement="right"
      >
        <div className="text-center cursor-pointer">
          <Badge status="warning" count={bookedList.length} size="small" />
        </div>
      </Popover>
    )
  }

  const cellRender = (current: Dayjs, info: any) => {
    if (info.type === 'date') return dateCellRender(current)
    return info.originNode
  }

  const selectedDateString = selectedDate.format('YYYY-MM-DD')
  const currentSchedule = buildSchedule(selectedDateString)

  const pendingCount  = requests.filter(r => r.status === 'pending').length
  const approvedCount = requests.filter(r => r.status === 'approved').length
  const rejectedCount = requests.filter(r => r.status === 'rejected').length

  const columns = [
    {
      title: 'เลขที่คำขอ',
      dataIndex: 'id',
      key: 'id',
      width: 130,
      render: (id: string) => <Text strong className="font-mono text-xs">{id}</Text>,
    },
    {
      title: 'วันที่ขอ',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 110,
    },
    {
      title: 'ช่วงเวลาใช้รถ',
      key: 'dateRange',
      width: 200,
      render: (_: any, r: VehicleRequest) => (
        <div className="text-xs">
          <div>ไป: {r.dateFrom}</div>
          <div>กลับ: {r.dateTo}</div>
        </div>
      ),
    },
    {
      title: 'ชื่อโครงการ',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (p: string) => (
        <Tooltip title={p}>
          <Text className="text-xs font-medium" ellipsis style={{ maxWidth: 160, display: 'block' }}>{p}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'ปลายทาง',
      dataIndex: 'destination',
      key: 'destination',
      render: (d: string) => <Text className="text-xs">{d}</Text>,
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: VehicleRequest['status']) => {
        const cfg = statusConfig[s]
        return <Tag icon={cfg.icon} color={cfg.tagColor}>{cfg.label}</Tag>
      },
    },
    {
      title: 'รถ / คนขับ',
      key: 'vehicle',
      width: 160,
      render: (_: any, r: VehicleRequest) =>
        r.status === 'approved' ? (
          <div className="text-xs">
            <div className="font-medium">{r.vehicle}</div>
            <div className="text-slate-400">{r.driver}</div>
          </div>
        ) : (
          <Text type="secondary" className="text-xs">—</Text>
        ),
    },
    {
      title: 'หมายเหตุ',
      dataIndex: 'remark',
      key: 'remark',
      render: (remark: string | undefined) =>
        remark ? (
          <Tooltip title={remark}>
            <Text className="text-xs text-red-400" ellipsis style={{ maxWidth: 150, display: 'block' }}>{remark}</Text>
          </Tooltip>
        ) : <Text type="secondary" className="text-xs">—</Text>,
    },
    {
      title: '',
      key: 'print',
      width: 90,
      render: (_: any, r: VehicleRequest) =>
        r.status === 'approved' ? (
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => setPrintRequest(r)}
          >
            พิมพ์ใบ
          </Button>
        ) : null,
    },
  ]

  const tabItems = [
    {
      key: 'form',
      label: <span><CarOutlined /> ขอใช้รถ</span>,
      children: (
        <Row gutter={24}>
          {/* Left: Form */}
          <Col xs={24} lg={14}>
            <Card variant="borderless" className="shadow-sm mb-6">
              <Title level={4} className="mb-6 flex items-center gap-2">
                <CarOutlined className="text-primary" /> รายละเอียดการขอใช้รถ
              </Title>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ needDriver: true, passengers: [{ name: '' }] }}
              >
                {/* ชื่อโครงการ */}
                <Form.Item
                  name="projectName"
                  label={<span><ProjectOutlined className="mr-1" />ชื่อโครงการ / ชื่องาน</span>}
                  rules={[{ required: true, message: 'กรุณาระบุชื่อโครงการ' }]}
                >
                  <Input placeholder="เช่น โครงการพัฒนาระบบสาธารณสุขระดับเขต, งานพัสดุรับมอบวัสดุ" />
                </Form.Item>

                {/* เอกสารที่ได้รับ */}
                <Form.Item
                  name="documentFiles"
                  label={<span><FileProtectOutlined className="mr-1" />เอกสารที่ได้รับ / แนบไฟล์</span>}
                  valuePropName="fileList"
                  getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                  extra="รองรับ PDF, Word, รูปภาพ — แนบได้หลายไฟล์"
                >
                  <Upload
                    multiple
                    beforeUpload={() => false}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    listType="text"
                  >
                    <Button icon={<UploadOutlined />}>เลือกไฟล์แนบ</Button>
                  </Upload>
                </Form.Item>

                <Divider className="my-4" />

                {/* วันที่และเวลา */}
                <Form.Item
                  name="dateRange"
                  label="วันที่และเวลา (ไป – กลับ)"
                  rules={[{ required: true, message: 'กรุณาเลือกวันเวลา' }]}
                >
                  <RangePicker
                    showTime={{ format: 'HH:mm' }}
                    format="DD/MM/YYYY HH:mm"
                    className="w-full"
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="destination"
                      label="สถานที่ปลายทาง"
                      rules={[{ required: true, message: 'กรุณาระบุสถานที่ปลายทาง' }]}
                    >
                      <Input placeholder="ระบุสถานที่ปลายทาง เช่น ศาลากลางจังหวัด, กระทรวงสาธารณสุข" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="waypoints" label="จุดแวะพัก (ถ้ามี)">
                      <Input placeholder="ระบุจุดแวะพักระหว่างทาง" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="purpose"
                  label="วัตถุประสงค์การเดินทาง"
                  rules={[{ required: true, message: 'กรุณาระบุวัตถุประสงค์' }]}
                >
                  <TextArea rows={2} placeholder="เช่น ประชุมสัมมนา, ส่งเอกสารราชการ, รับมอบสิ่งของ" />
                </Form.Item>

                <Divider className="my-4" />

                {/* ระดับผู้ขอ */}
                <Form.Item
                  name="requesterLevel"
                  label={<span><UserOutlined className="mr-1" />ระดับผู้ขอ</span>}
                  rules={[{ required: true, message: 'กรุณาระบุระดับผู้ขอ' }]}
                  extra={
                    requesterLevel === 'senior'
                      ? <span className="text-green-400 text-xs">ระดับชำนาญการพิเศษขึ้นไป — ขอได้ตั้งแต่ 1 คน</span>
                      : requesterLevel === 'junior'
                      ? <span className="text-yellow-400 text-xs">ระดับต่ำกว่าชำนาญการพิเศษ — ต้องมีผู้ร่วมเดินทางอย่างน้อย 3 คน</span>
                      : null
                  }
                >
                  <Radio.Group>
                    <div className="flex flex-col gap-1">
                      <Radio value="senior">ชำนาญการพิเศษขึ้นไป</Radio>
                      <Radio value="junior">ต่ำกว่าชำนาญการพิเศษ</Radio>
                    </div>
                  </Radio.Group>
                </Form.Item>

                {/* ผู้ร่วมเดินทาง */}
                <Form.Item label={<span><UserOutlined className="mr-1" />ผู้ที่จะไปด้วย</span>}>
                  <Form.List
                    name="passengers"
                    rules={[{
                      validator: async (_, items) => {
                        const filled = (items ?? []).filter((p: { name: string }) => p?.name?.trim())
                        if (filled.length < minPassengers) {
                          return Promise.reject(
                            minPassengers === 3
                              ? 'ระดับต่ำกว่าชำนาญการพิเศษ ต้องมีผู้ร่วมเดินทางอย่างน้อย 3 คน'
                              : 'กรุณาระบุผู้ร่วมเดินทางอย่างน้อย 1 คน'
                          )
                        }
                      }
                    }]}
                  >
                    {(fields, { add, remove }, { errors }) => (
                      <div className="space-y-2">
                        {fields.map(({ key, ...field }, index) => (
                          <div key={key} className="flex gap-2 items-center">
                            <span className="text-slate-400 text-sm w-6 shrink-0 text-right">{index + 1}.</span>
                            <Form.Item
                              key={key}
                              {...field}
                              name={[field.name, 'name']}
                              validateTrigger={['onChange', 'onBlur']}
                              rules={[{ required: true, whitespace: true, message: 'กรุณาระบุชื่อ' }]}
                              className="mb-0 grow"
                            >
                              <Input placeholder={`ชื่อ-นามสกุล ผู้ร่วมเดินทางคนที่ ${index + 1}`} />
                            </Form.Item>
                            {fields.length > 1 && (
                              <Button
                                type="text"
                                danger
                                icon={<MinusCircleOutlined />}
                                onClick={() => remove(field.name)}
                                className="shrink-0"
                              />
                            )}
                          </div>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add()}
                          icon={<PlusOutlined />}
                          className="w-full mt-1"
                        >
                          เพิ่มผู้ร่วมเดินทาง
                        </Button>
                        <Form.ErrorList errors={errors} />
                      </div>
                    )}
                  </Form.List>
                </Form.Item>

                <Form.Item
                  name="needDriver"
                  label="ต้องการพนักงานขับรถหรือไม่"
                  rules={[{ required: true, message: 'กรุณาระบุความต้องการ' }]}
                >
                  <Radio.Group>
                    <Space orientation="horizontal">
                      <Radio value={true}>ต้องการพนักงานขับรถ</Radio>
                      <Radio value={false}>ไม่ต้องการ (เจ้าหน้าที่ขับเอง)</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>

                <Divider />

                <div className="flex justify-end gap-3">
                  <Button type="default" onClick={() => { form.resetFields(); form.setFieldsValue({ needDriver: true, passengers: [{ name: '' }] }) }}>
                    ล้างข้อมูล
                  </Button>
                  <Button type="primary" htmlType="submit" size="large" className="px-8 shadow-md">
                    ส่งคำขอใช้รถ
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>

          {/* Right: Calendar */}
          <Col xs={24} lg={10}>
            <Card variant="borderless" className="shadow-sm mb-6 bg-slate-800/50 border-slate-700">
              <Title level={4} className="mb-4 flex items-center gap-2">
                <CalendarOutlined className="text-primary" /> ปฏิทินตรวจสอบคิวรถ
              </Title>
              <div className="bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 mb-4">
                <Calendar
                  fullscreen={false}
                  onSelect={(date) => setSelectedDate(date)}
                  cellRender={cellRender}
                />
              </div>

              <Title level={5} className="mb-3">
                สถานะรถวันที่ {selectedDate.format('DD/MM/YYYY')}
              </Title>
              <div className="flex flex-col gap-2">
                {currentSchedule.map((item: VehicleScheduleEntry) => (
                  <div key={item.vehicleId} className={`flex gap-3 p-3 rounded-md border shadow-sm ${item.status === 'booked' ? 'bg-orange-950/30 border-orange-700/50' : 'bg-slate-800 border-slate-700'}`}>
                    <div className="shrink-0 pt-0.5">
                      <CarOutlined className={`text-xl ${item.status === 'available' ? 'text-green-500' : 'text-orange-400'}`} />
                    </div>
                    <div className="grow min-w-0">
                      {/* Header row: ประเภท + ทะเบียน + สถานะ */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Tag color={item.typeColor} className="m-0 text-xs">{item.type}</Tag>
                        <span className="font-bold text-slate-100 tracking-wide">{item.plate}</span>
                        <span className="ml-auto">
                          {item.status === 'available'
                            ? <Tag color="success" className="m-0">ว่าง</Tag>
                            : <Tag color="warning" className="m-0">มีจองแล้ว</Tag>
                          }
                        </span>
                      </div>
                      {/* คนขับ */}
                      <div className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                        <UserOutlined /> {item.driver}
                      </div>
                      {/* เวลา + โครงการ (เมื่อมีจอง) */}
                      {item.status === 'booked' && (
                        <div className="text-xs space-y-0.5 mt-1">
                          {item.time && (
                            <div className="text-slate-400">
                              <InfoCircleOutlined className="mr-1" />{item.time} → {item.destination}
                            </div>
                          )}
                          {item.project && (
                            <Tooltip title={item.project} placement="bottomLeft">
                              <div className="text-yellow-400 cursor-help truncate">
                                📋 {item.project}
                              </div>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'status',
      label: (
        <span>
          <UnorderedListOutlined /> สถานะคำขอ
          {pendingCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-yellow-500 text-white">
              {pendingCount}
            </span>
          )}
        </span>
      ),
      children: (
        <div className="space-y-4">
          {/* Summary */}
          <Row gutter={[16, 16]}>
            <Col xs={8}>
              <Card variant="borderless" className="text-center shadow-sm" style={{ borderBottom: '3px solid #f59e0b' }}>
                <Statistic
                  title="รอพิจารณา"
                  value={pendingCount}
                  styles={{ content: { color: '#f59e0b' } }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={8}>
              <Card variant="borderless" className="text-center shadow-sm" style={{ borderBottom: '3px solid #10b981' }}>
                <Statistic
                  title="อนุมัติ"
                  value={approvedCount}
                  styles={{ content: { color: '#10b981' } }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={8}>
              <Card variant="borderless" className="text-center shadow-sm" style={{ borderBottom: '3px solid #ef4444' }}>
                <Statistic
                  title="ไม่อนุมัติ"
                  value={rejectedCount}
                  styles={{ content: { color: '#ef4444' } }}
                  prefix={<CloseCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Table */}
          <Card variant="borderless" className="shadow-sm">
            <Title level={5} style={{ color: '#006a5a', marginBottom: 16 }}>ประวัติคำขอใช้รถทั้งหมด</Title>
            <Table
              columns={columns}
              dataSource={requests}
              rowKey="id"
              pagination={{ pageSize: 10, showTotal: t => `ทั้งหมด ${t} รายการ` }}
              scroll={{ x: 'max-content' }}
              size="middle"
              expandable={{
                expandedRowRender: (r: VehicleRequest) => (
                  <div className="p-3 space-y-2 text-sm">
                    {r.documentFiles && r.documentFiles.length > 0 && (
                      <div>
                        <Text strong><FileProtectOutlined className="mr-1" />เอกสารแนบ ({r.documentFiles.length} ไฟล์): </Text>
                        <Space wrap size={4} className="mt-1">
                          {r.documentFiles.map((f, i) => (
                            <Tag key={i} icon={<PaperClipOutlined />} color="blue">{f.name}</Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                    <div><Text strong>วัตถุประสงค์: </Text><Text>{r.purpose}</Text></div>
                    <div>
                      <Text strong>ผู้ร่วมเดินทาง ({r.passengerCount} คน): </Text>
                      <Space wrap size={4} className="mt-1">
                        {r.passengerNames.map((name, i) => <Tag key={i} icon={<UserOutlined />}>{name}</Tag>)}
                      </Space>
                    </div>
                    <div><Text strong>ต้องการคนขับ: </Text><Text>{r.needDriver ? 'ใช่' : 'ไม่ใช่'}</Text></div>
                    {r.remark && <div><Text strong>หมายเหตุจากผู้อนุมัติ: </Text><Text type="danger">{r.remark}</Text></div>}
                  </div>
                ),
              }}
              locale={{ emptyText: 'ยังไม่มีคำขอใช้รถ' }}
            />
          </Card>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> ระบบบริหารงานทั่วไป</> },
            { title: 'ขอใช้รถไปราชการ' },
          ]}
          className="mb-6"
        />

        <div className="w-full">
          <div className="mb-6">
            <Title level={2} className="text-primary m-0">แบบฟอร์มขอใช้รถไปราชการ</Title>
            <Text type="secondary">กรอกรายละเอียดการเดินทาง ตรวจสอบสถานะรถว่าง และติดตามคำขอที่ส่งไปแล้ว</Text>
          </div>

          <Tabs items={tabItems} size="large" />
        </div>
      </div>

      {/* Print Modal */}
      <Modal
        open={!!printRequest}
        onCancel={() => setPrintRequest(null)}
        footer={null}
        width="80vw"
        title={<span><PrinterOutlined className="mr-2" />ตัวอย่างใบอนุมัติการใช้รถราชการ — {printRequest?.id}</span>}
        style={{ top: '5vh' }}
        styles={{ body: { padding: '12px 0 0', height: 'calc(80vh - 57px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        {printRequest && (
          <VehicleRequestPDFDownload req={printRequest as VehicleRequestForPDF} />
        )}
      </Modal>
    </div>
  )
}

const VehicleRequestPage = () => {
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
        <VehicleRequestPageContent />
      </App>
    </ConfigProvider>
  )
}

export default VehicleRequestPage
