'use client'
import React, { useState } from 'react'
import {
  Form,
  Input,
  Button,
  DatePicker,
  Radio,
  Select,
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
  InputNumber,
  Space,
  Tag,
  theme
} from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  CarOutlined,
  CalendarOutlined,
  UserOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

// Mockup Data
const mockSchedule: Record<string, { vehicle: string, driver: string, status: 'booked' | 'available', time?: string, destination?: string }[]> = {
  '2026-04-14': [
    { vehicle: 'รถตู้ นข-1111', driver: 'นายสมชาย', status: 'booked', time: '08:00 - 16:00', destination: 'กระทรวงสาธารณสุข' },
    { vehicle: 'รถตู้ ฮฮ-2222', driver: 'นายสมศักดิ์', status: 'available' },
    { vehicle: 'รถกระบะ บบ-3333', driver: 'ไม่มี (ขับเอง)', status: 'available' },
  ],
  '2026-04-15': [
    { vehicle: 'รถตู้ นข-1111', driver: 'นายสมชาย', status: 'available' },
    { vehicle: 'รถตู้ ฮฮ-2222', driver: 'นายสมศักดิ์', status: 'booked', time: '09:00 - 12:00', destination: 'ศาลากลางจังหวัด' },
  ]
}

const VehicleRequestPageContent = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())

  const onFinish = (values: any) => {
    console.log('Success:', values)
    message.success('ส่งคำขอใช้รถไปราชการเรียบร้อยแล้ว')
  }

  const dateCellRender = (value: Dayjs) => {
    const dateString = value.format('YYYY-MM-DD')
    const listData = mockSchedule[dateString] || []
    if (listData.length > 0) {
      const bookedCount = listData.filter(item => item.status === 'booked').length
      return (
        <div className="text-center">
          {bookedCount > 0 ? (
            <Badge status="warning" />
          ) : (
             <Badge status="success" />
          )}
        </div>
      )
    }
    return null
  }

  const cellRender = (current: Dayjs, info: any) => {
    if (info.type === 'date') return dateCellRender(current);
    return info.originNode;
  }

  const selectedDateString = selectedDate.format('YYYY-MM-DD')
  const currentSchedule = mockSchedule[selectedDateString] || [
    { vehicle: 'รถตู้ นข-1111', driver: 'นายสมชาย', status: 'available' },
    { vehicle: 'รถตู้ ฮฮ-2222', driver: 'นายสมศักดิ์', status: 'available' },
    { vehicle: 'รถกระบะ บบ-3333', driver: 'ไม่มี', status: 'available' },
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

        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Title level={2} className="text-primary m-0">แบบฟอร์มขอใช้รถไปราชการ</Title>
            <Text type="secondary">กรอกรายละเอียดการเดินทาง และตรวจสอบสถานะรถว่างก่อนทำการจอง</Text>
          </div>

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
                  initialValues={{ needDriver: true, passengerCount: 1 }}
                >
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="dateRange"
                        label="วันที่และเวลา (ไป-กลับ)"
                        rules={[{ required: true, message: 'กรุณาเลือกวันเวลา' }]}
                      >
                        <RangePicker 
                          showTime={{ format: 'HH:mm' }} 
                          format="DD/MM/YYYY HH:mm" 
                          className="w-full"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

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
                      <Form.Item
                        name="waypoints"
                        label="จุดแวะพัก (ถ้ามี)"
                      >
                        <Input placeholder="ระบุจุดแวะพักระหว่างทาง" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="purpose"
                    label="วัตถุประสงค์การเดินทาง"
                    rules={[{ required: true, message: 'กรุณาระบุวัตถุประสงค์' }]}
                  >
                    <TextArea rows={3} placeholder="เช่น ประชุมสัมมนา, ส่งเอกสารราชการ, รับมอบสิ่งของ" />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col xs={24} sm={8}>
                      <Form.Item
                        name="passengerCount"
                        label="จำนวนผู้โดยสาร (คน)"
                        rules={[{ required: true, message: 'กรุณาระบุจำนวน' }]}
                      >
                        <InputNumber min={1} max={15} className="w-full" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={16}>
                      <Form.Item
                        name="passengerNames"
                        label="รายชื่อผู้ร่วมเดินทาง"
                        rules={[{ required: true, message: 'กรุณาระบุรายชื่อ' }]}
                      >
                        <Select
                          mode="tags"
                          placeholder="พิมพ์ชื่อและกด Enter"
                          tokenSeparators={[',']}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

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
                    <Button type="default" onClick={() => form.resetFields()}>ล้างข้อมูล</Button>
                    <Button type="primary" htmlType="submit" size="large" className="px-8 shadow-md">
                      ส่งคำขอใช้รถ
                    </Button>
                  </div>
                </Form>
              </Card>
            </Col>

            {/* Right: Calendar & Availability */}
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
                  {currentSchedule.map((item: any, index: number) => (
                    <div key={index} className="flex gap-4 bg-slate-800 p-3 rounded-md border border-slate-700 shadow-sm">
                      <div className="shrink-0">
                        <CarOutlined className={`text-2xl mt-1 ${item.status === 'available' ? 'text-green-500' : 'text-orange-500'}`} />
                      </div>
                      <div className="grow min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-slate-200">{item.vehicle}</span>
                          {item.status === 'available' ? (
                            <Tag color="success" className="m-0">ว่าง</Tag>
                          ) : (
                            <Tag color="warning" className="m-0">มีจองแล้ว</Tag>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div><UserOutlined /> คนขับ: {item.driver}</div>
                          {item.status === 'booked' && (
                            <>
                              <div><InfoCircleOutlined /> เวลา: {item.time}</div>
                              <div><InfoCircleOutlined /> ปลายทาง: {item.destination}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
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