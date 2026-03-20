'use client'
import React, { useState, useEffect } from 'react'
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
  Space,
  Breadcrumb,
  ConfigProvider,
  Divider,
  Alert,
  Upload,
  InputNumber,
  Checkbox,
  App
} from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  UploadOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

const LeavePageContent = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [leaveType, setLeaveType] = useState(1)
  const [isAbroad, setIsAbroad] = useState(false)

  // คำนวณจำนวนวันลา
  const handleValuesChange = (changedValues: any, allValues: any) => {
    if ('leaveType' in changedValues) {
      setLeaveType(changedValues.leaveType)
    }
    if ('halfDay' in changedValues) {
      setIsHalfDay(changedValues.halfDay)
    }
    if ('isAbroad' in changedValues) {
      setIsAbroad(changedValues.isAbroad)
    }

    if ('dateRange' in changedValues || 'halfDay' in changedValues) {
      const { dateRange, halfDay } = allValues
      let days = 0
      if (dateRange && dateRange[0] && dateRange[1]) {
        days = dateRange[1].diff(dateRange[0], 'day') + 1
      }

      let calculatedDays = days
      if (halfDay) {
        calculatedDays = days > 0 ? days - 0.5 : 0
      }
      form.setFieldsValue({ totalLeaveDays: calculatedDays })
    }
  }

  const onFinish = (values: any) => {
    console.log('Success:', values)
    message.success('บันทึกคำขอลาเรียบร้อยแล้ว ระบบกำลังส่งต่อให้ผู้อนุมัติตามลำดับ')
  }

  return (
    <div className="min-h-7 bg-slate-50">
      <Navbar />
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { title: <><FileTextOutlined /> ระบบงานบุคคล</> },
              { title: 'บันทึกการลา' },
            ]}
            className="mb-4"
          />
          <div className="mb-4">
            <Title level={2} className="text-primary m-0">แบบฟอร์มบันทึกการลา</Title>
            <Text type="secondary">กรุณากรอกข้อมูลการลาให้ครบถ้วนเพื่อเสนออนุมัติตามลำดับขั้นตอน</Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onValuesChange={handleValuesChange}
            initialValues={{ leaveType: 1, halfDay: false, totalLeaveDays: 0 }}
            requiredMark="optional"
          >
            <Row gutter={24}>
              {/* ส่วนข้อมูลการลา */}
              <Col xs={24} lg={16}>
                <Card variant="borderless" className="shadow-sm mb-6">
                  <Title level={4} className="mb-6 flex items-center gap-2">
                    <CalendarOutlined className="text-primary" /> รายละเอียดการลา
                  </Title>

                  <Form.Item
                    name="leaveType"
                    label="ประเภทการลา"
                    rules={[{ required: true, message: 'กรุณาเลือกประเภทการลา' }]}
                  >
                    <Select placeholder="เลือกประเภทการลา">
                      <Select.Option value={1}>การลาป่วย</Select.Option>
                      <Select.Option value={2}>การลาคลอดบุตร</Select.Option>
                      <Select.Option value={3}>การลากิจส่วนตัว</Select.Option>
                      <Select.Option value={4}>การลาพักผ่อน</Select.Option>
                      <Select.Option value={5}>การลาไปช่วยเหลือภริยาคลอดบุตร</Select.Option>
                      <Select.Option value={6}>การลาอุปสมบทหรือประกอบพิธีฮัจย์</Select.Option>
                      <Select.Option value={7}>การลาเข้ารับการตรวจเลือกหรือเตรียมพล</Select.Option>
                      <Select.Option value={8}>การลาไปศึกษา ฝึกอบรม ดูงาน หรือวิจัย</Select.Option>
                      <Select.Option value={9}>การลาไปปฏิบัติงานในองค์การระหว่างประเทศ</Select.Option>
                      <Select.Option value={10}>การลาติดตามคู่สมรส</Select.Option>
                      <Select.Option value={11}>การลาไปฟื้นฟูสมรรถภาพด้านอาชีพ</Select.Option>
                    </Select>
                  </Form.Item>

                  {leaveType === 4 && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <Form.Item name="isAbroad" valuePropName="checked" noStyle>
                        <Checkbox>ลาไปต่างประเทศ</Checkbox>
                      </Form.Item>
                      {isAbroad && (
                        <Form.Item
                          name="abroadCountry"
                          label="ระบุประเทศ/สถานที่"
                          className="mt-4 mb-0"
                          rules={[{ required: true, message: 'กรุณาระบุประเทศ' }]}
                        >
                          <Input placeholder="เช่น ญี่ปุ่น, สิงคโปร์" />
                        </Form.Item>
                      )}
                    </div>
                  )}

                  {leaveType === 2 && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <Form.Item
                        name="maternityType"
                        label="ประเภทการลาคลอด"
                        rules={[{ required: true, message: 'กรุณาเลือกประเภทการลาคลอด' }]}
                        className="mb-0"
                      >
                        <Radio.Group>
                          <Space orientation="vertical">
                            <Radio value="normal">ลาคลอดปกติ</Radio>
                            <Radio value="childcare">ลาคลอดเลี้ยงบุตร</Radio>
                            <Radio value="withoutPay">ลาคลอดไม่รับเงินเดือน</Radio>
                          </Space>
                        </Radio.Group>
                      </Form.Item>
                    </div>
                  )}

                  {leaveType === 1 && (
                    <Form.Item
                      name="medicalCertificate"
                      label="ใบรับรองแพทย์"
                      valuePropName="fileList"
                      getValueFromEvent={(e) => {
                        if (Array.isArray(e)) return e
                        return e?.fileList
                      }}
                      rules={[{ required: true, message: 'กรุณาแนบใบรับรองแพทย์' }]}
                    >
                      <Upload maxCount={1} beforeUpload={() => false} listType="picture">
                        <Button icon={<UploadOutlined />}>คลิกเพื่ออัพโหลดรูปภาพ</Button>
                      </Upload>
                    </Form.Item>
                  )}

                  <Row gutter={16}>
                    <Col span={16}>
                      <Form.Item
                        name="dateRange"
                        label="วันที่ลา (เริ่มต้น - สิ้นสุด)"
                        rules={[{ required: true, message: 'กรุณาเลือกช่วงวันที่ลา' }]}
                      >
                        <RangePicker className="w-full" format="DD/MM/YYYY" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="halfDay" label="ลาครึ่งวัน">
                        <Radio.Group optionType="button">
                          <Radio value={false}>เต็มวัน</Radio>
                          <Radio value={true}>ครึ่งวัน</Radio>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                  </Row>

                  {isHalfDay && (
                    <Form.Item
                      name="halfDayType"
                      label="ช่วงเวลาที่ลาครึ่งวัน"
                      rules={[{ required: true, message: 'กรุณาเลือกช่วงเวลา' }]}
                    >
                      <Radio.Group>
                        <Space orientation="horizontal">
                          <Radio value="morning">ลาเช้า (08.30 - 12.00 น.)</Radio>
                          <Radio value="afternoon">ลาบ่าย (13.00 - 16.30 น.)</Radio>
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                  )}

                  <Form.Item name="reason" label="หมายเหตุ / เหตุผลการลา">
                    <TextArea rows={3} placeholder="ระบุเหตุผลการลา (ถ้ามี)" />
                  </Form.Item>

                  <Form.Item
                    name="substitute"
                    label="ผู้ปฏิบัติงานแทน"
                    rules={[{ required: true, message: 'กรุณาระบุผู้ปฏิบัติงานแทน' }]}
                  >
                    <Select
                      showSearch
                      placeholder="ค้นหาชื่อผู้ปฏิบัติงานแทน"
                      prefix={<UserOutlined className="text-slate-400" />}
                      options={[
                        { value: '1', label: 'นายสมชาย ใจดี' },
                        { value: '2', label: 'นางสาวสมหญิง รักเรียน' },
                      ]}
                    />
                  </Form.Item>
                </Card>
              </Col>

              {/* ส่วนผู้อนุมัติและสรุป */}
              <Col xs={24} lg={8}>
                <Card variant="borderless" className="shadow-sm mb-6 bg-primary/5 border-primary/10">
                  <Title level={4} className="mb-4">สรุปวันลา</Title>
                  <Form.Item
                    name="totalLeaveDays"
                    label="จำนวนวันที่ใช้ลา (สามารถแก้ไขได้)"
                    rules={[{ required: true, message: 'กรุณาระบุจำนวนวันลา' }]}
                  >
                    <InputNumber
                      min={0}
                      step={0.5}
                      className="w-full"
                      size="large"
                      styles={{
                        input: { textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', color: '#006a5a' }
                      }}
                    />
                  </Form.Item>
                  <Alert
                    title="ตรวจสอบสิทธิ์"
                    description="คุณมีวันลาพักผ่อนคงเหลือ 10 วัน"
                    type="info"
                    showIcon
                    className="bg-white border-blue-100 mt-4"
                  />
                </Card>

                <Card variant="borderless" className="shadow-sm mt-4">
                  <Title level={4} className="mb-6 flex items-center gap-2">
                    <CheckCircleOutlined className="text-primary" /> ลำดับการอนุมัติ
                  </Title>

                  <Space orientation="vertical" className="w-full" size="large">
                    <Form.Item
                      name="approver1"
                      label="1. หัวหน้าหน่วยงาน/ตึก"
                      rules={[{ required: true, message: 'กรุณาเลือกผู้อนุมัติ' }]}
                    >
                      <Select placeholder="เลือกผู้อนุมัติ">
                        <Select.Option value="a1">นางวิไลพร หัวหน้าตึก</Select.Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="approver2"
                      label="2. หัวหน้ากลุ่มงาน"
                      rules={[{ required: true, message: 'กรุณาเลือกผู้อนุมัติ' }]}
                    >
                      <Select placeholder="เลือกผู้อนุมัติ">
                        <Select.Option value="a2">นพ.สมศักดิ์ หัวหน้ากลุ่มงาน</Select.Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="approver3"
                      label="3. หัวหน้ากลุ่มภารกิจ"
                      rules={[{ required: true, message: 'กรุณาเลือกผู้อนุมัติ' }]}
                    >
                      <Select placeholder="เลือกผู้อนุมัติ">
                        <Select.Option value="a3">นพ.อำนาจ ผู้อำนวยการ/หัวหน้าภารกิจ</Select.Option>
                      </Select>
                    </Form.Item>
                  </Space>

                  <Divider />

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    className="h-12 text-lg font-semibold shadow-lg shadow-green-600/20"
                  >
                    ส่งคำขออนุมัติลา
                  </Button>
                  <Button type="link" block className="mt-2 text-slate-400">
                    ยกเลิก
                  </Button>
                </Card>
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    </div>
  )
}

const LeavePage = () => {
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
        <LeavePageContent />
      </App>
    </ConfigProvider>
  )
}

export default LeavePage
