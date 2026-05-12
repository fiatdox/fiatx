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
  App,
  theme
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
import Cookies from 'js-cookie'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

type LeaveType = { id: number; name_th: string; requires_document_after_days: number | null }
type Entitlement = {
  id: number
  leave_type_id: number
  user_type_id: number
  max_days_per_year: number | null
  min_service_months: number
  carry_over: boolean
  carry_over_max_days: number | null
}

const LeavePageContent = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [leaveType, setLeaveType] = useState(1)
  const [isAbroad, setIsAbroad] = useState(false)
  const [totalLeaveDays, setTotalLeaveDays] = useState(0)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false)
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [missionSupervisors, setMissionSupervisors] = useState<{ id: number; mission_name: string; mission_supervisor: string }[]>([])
  const [majorSupervisors, setMajorSupervisors] = useState<{ id: number; major_name: string; major_supervisor: string }[]>([])

  useEffect(() => {
    setLeaveTypesLoading(true)
    fetch('/api/v1/hr/leave-types')
      .then(res => res.json())
      .then(json => { if (json.success) setLeaveTypes(json.data) })
      .catch(() => message.error('ไม่สามารถโหลดประเภทการลาได้'))
      .finally(() => setLeaveTypesLoading(false))
  }, [message])

  useEffect(() => {
    const userTypeId = Cookies.get('user_type_id')
    if (!userTypeId) return
    fetch(`/api/v1/hr/leave-entitlements/${userTypeId}`)
      .then(res => res.json())
      .then(json => { if (json.success) setEntitlements(json.data) })
      .catch(() => message.error('ไม่สามารถโหลดสิทธิ์การลาได้'))
  }, [message])

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (!raw) return
    const id = JSON.parse(raw)?.id
    if (!id) return
    fetch(`/api/v1/hr/mission-supervisor/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setMissionSupervisors(json.data)
          if (json.data.length === 1) {
            form.setFieldsValue({ approver3: String(json.data[0].id) })
          }
        }
      })
      .catch(() => message.error('ไม่สามารถโหลดหัวหน้ากลุ่มภารกิจได้'))
  }, [message, form])

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (!raw) return
    const id = JSON.parse(raw)?.id
    if (!id) return
    fetch(`/api/v1/hr/major-supervisor/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setMajorSupervisors(json.data)
          if (json.data.length === 1) {
            form.setFieldsValue({ approver2: String(json.data[0].id) })
          }
        }
      })
      .catch(() => message.error('ไม่สามารถโหลดหัวหน้ากลุ่มงานได้'))
  }, [message, form])

  const currentLeaveTypeInfo = leaveTypes.find(t => t.id === leaveType) ?? null
  const requiresDoc = currentLeaveTypeInfo?.requires_document_after_days

  // หา entitlement ของประเภทการลาที่เลือก (ใช้ min_service_months น้อยที่สุดเป็นฐาน)
  const currentEntitlement = entitlements
    .filter(e => e.leave_type_id === leaveType)
    .sort((a, b) => a.min_service_months - b.min_service_months)[0] ?? null

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
      setTotalLeaveDays(calculatedDays)
    }

    if ('totalLeaveDays' in changedValues) {
      setTotalLeaveDays(changedValues.totalLeaveDays ?? 0)
    }
  }

  const onFinish = (values: any) => {
    console.log('Success:', values)
    message.success('บันทึกคำขอลาเรียบร้อยแล้ว ระบบกำลังส่งต่อให้ผู้อนุมัติตามลำดับ')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <div className="w-full">
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
                    <Select
                      placeholder="เลือกประเภทการลา"
                      loading={leaveTypesLoading}
                      options={leaveTypes.map(t => ({ value: t.id, label: t.name_th }))}
                    />
                  </Form.Item>

                  {leaveType === 4 && (
                    <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
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
                    <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
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

                  {requiresDoc != null && totalLeaveDays > requiresDoc && (
                    <Form.Item
                      name="documentAttachment"
                      label={`เอกสารแนบ (ลาเกิน ${requiresDoc} วัน ต้องแนบเอกสาร)`}
                      valuePropName="fileList"
                      getValueFromEvent={(e) => {
                        if (Array.isArray(e)) return e
                        return e?.fileList
                      }}
                      rules={[{ required: true, message: 'กรุณาแนบเอกสาร' }]}
                    >
                      <Upload maxCount={1} beforeUpload={() => false} listType="picture">
                        <Button icon={<UploadOutlined />}>คลิกเพื่ออัพโหลดเอกสาร</Button>
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
                    rules={[
                      { required: true, message: 'กรุณาระบุจำนวนวันลา' },
                      {
                        validator: (_, value) => {
                          const max = currentEntitlement?.max_days_per_year
                          if (max != null && value > max) {
                            return Promise.reject(`เกินสิทธิ์การลาสูงสุด ${max} วัน/ปี`)
                          }
                          return Promise.resolve()
                        }
                      }
                    ]}
                  >
                    <InputNumber
                      min={0}
                      max={currentEntitlement?.max_days_per_year ?? undefined}
                      step={0.5}
                      className="w-full"
                      size="large"
                      styles={{
                        input: { textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', color: '#006a5a' }
                      }}
                    />
                  </Form.Item>
                  {currentEntitlement ? (
                    <Alert
                      type={currentEntitlement.max_days_per_year != null ? 'info' : 'warning'}
                      showIcon
                      className="mt-4"
                      title="สิทธิ์การลาประเภทนี้"
                      description={
                        <div className="text-sm space-y-1">
                          <div>
                            สูงสุด:{' '}
                            <strong>
                              {currentEntitlement.max_days_per_year != null
                                ? `${currentEntitlement.max_days_per_year} วัน/ปี`
                                : 'ไม่จำกัด'}
                            </strong>
                          </div>
                          {currentEntitlement.carry_over && (
                            <div>
                              สะสมข้ามปีได้สูงสุด:{' '}
                              <strong>{currentEntitlement.carry_over_max_days} วัน</strong>
                            </div>
                          )}
                        </div>
                      }
                    />
                  ) : (
                    <Alert
                      type="warning"
                      showIcon
                      className="mt-4"
                      title="ไม่พบสิทธิ์การลาสำหรับประเภทนี้"
                    />
                  )}
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
                      <Select
                        placeholder="เลือกผู้อนุมัติ"
                        options={majorSupervisors.map(s => ({ value: String(s.id), label: `${s.major_supervisor} — ${s.major_name}` }))}
                      />
                    </Form.Item>

                    <Form.Item
                      name="approver3"
                      label="3. หัวหน้ากลุ่มภารกิจ"
                      rules={[{ required: true, message: 'กรุณาเลือกผู้อนุมัติ' }]}
                    >
                      <Select
                        placeholder="เลือกผู้อนุมัติ"
                        options={missionSupervisors.map(s => ({ value: String(s.id), label: `${s.mission_supervisor} — ${s.mission_name}` }))}
                      />
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
        algorithm: theme.darkAlgorithm,
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
