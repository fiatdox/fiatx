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
  UploadOutlined,
  MedicineBoxOutlined,
  HeartOutlined,
  CoffeeOutlined,
  GlobalOutlined,
  ReadOutlined,
  SafetyOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  SmileOutlined
} from '@ant-design/icons'
import { GiPrayerBeads, GiWalkingBoot } from 'react-icons/gi'
import dayjs from 'dayjs'
import Cookies from 'js-cookie'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

// ไอคอน + สีของแต่ละประเภทการลา (key = hr_leave_types.code)
const LEAVE_TYPE_STYLE: Record<string, { icon: React.ReactNode; color: string }> = {
  SICK:   { icon: <MedicineBoxOutlined />, color: '#ef4444' },
  MAT:    { icon: <HeartOutlined />,       color: '#ec4899' },
  PERS:   { icon: <UserOutlined />,        color: '#6366f1' },
  ANNUAL: { icon: <CoffeeOutlined />,      color: '#0d9488' },
  PAT:    { icon: <TeamOutlined />,        color: '#3b82f6' },
  ORDAIN: { icon: <GiPrayerBeads />,       color: '#d97706' },
  MIL:    { icon: <SafetyOutlined />,      color: '#64748b' },
  STUDY:  { icon: <ReadOutlined />,        color: '#7c3aed' },
  INTL:   { icon: <GlobalOutlined />,      color: '#0ea5e9' },
  FOLLOW: { icon: <UserSwitchOutlined />,  color: '#f59e0b' },
  REHAB:  { icon: <GiWalkingBoot />,       color: '#16a34a' },
}
const DEFAULT_LEAVE_STYLE = { icon: <SmileOutlined />, color: '#6b7280' }
const getLeaveStyle = (code?: string) => (code && LEAVE_TYPE_STYLE[code]) || DEFAULT_LEAVE_STYLE

type LeaveType = { id: number; code?: string; name_th: string; requires_document_after_days: number | null }
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
  const [totalLeaveDays, setTotalLeaveDays] = useState(1)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false)
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [staffType, setStaffType] = useState('')

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (!raw) return
    try { setStaffType(JSON.parse(raw)?.user_type_name || '') } catch { /* ignore malformed cookie */ }
  }, [])
  // role: 'supervisor' = ตัวจริง | 'acting' = รักษาการ (API เรียงตัวจริงมาก่อน)
  const [missionSupervisors, setMissionSupervisors] = useState<{ id: number; mission_name: string; mission_supervisor: string; role?: string }[]>([])
  const [majorSupervisors, setMajorSupervisors] = useState<{ id: number; major_name: string; major_supervisor: string; role?: string }[]>([])
  const [submajorSupervisors, setSubmajorSupervisors] = useState<{ id: number; major_name: string; major_supervisor: string; role?: string }[]>([])

  // เพื่อนร่วมหน่วยงาน — ใช้เลือกผู้ปฏิบัติงานแทน (หน่วยย่อยก่อน ไม่มีจึงใช้กลุ่มงาน)
  const [colleagues, setColleagues] = useState<{ id: number; pname?: string; fname: string; lname: string; position_name?: string }[]>([])
  const [colleaguesLoading, setColleaguesLoading] = useState(false)

  useEffect(() => {
    setColleaguesLoading(true)
    fetch('/api/v1/users/me/colleagues')
      .then(res => res.json())
      .then(json => { if (json.success) setColleagues(json.data.colleagues) })
      .catch(() => message.error('ไม่สามารถโหลดรายชื่อเพื่อนร่วมหน่วยงานได้'))
      .finally(() => setColleaguesLoading(false))
  }, [message])

  // ถ้าผู้ login เป็นหัวหน้า/รักษาการกลุ่มภารกิจ → สายอนุมัติเปลี่ยนเป็นเสนอ ผอ. โดยตรง
  const [isMissionHead, setIsMissionHead] = useState(false)
  const [directorOptions, setDirectorOptions] = useState<{ value: string; label: string; role: string }[]>([])

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (!raw) return
    const id = JSON.parse(raw)?.id
    if (!id) return
    fetch(`/api/v1/hr/mission-head-check/${id}`)
      .then(res => res.json())
      .then(json => {
        if (!json.success || !json.data.is_mission_head) return
        setIsMissionHead(true)
        // โหลด ผอ. / รักษาการ ผอ. จาก hr_settings มาเป็นผู้อนุมัติ
        return fetch('/api/v1/hr/director')
          .then(res => res.json())
          .then(dj => {
            if (!dj.success) return
            const opts: { value: string; label: string; role: string }[] = []
            if (dj.data.director_id != null) {
              opts.push({ value: String(dj.data.director_id), label: `${dj.data.director_name ?? dj.data.director_id} — ผู้อำนวยการ`, role: 'supervisor' })
            }
            if (dj.data.acting_director_id != null) {
              opts.push({ value: String(dj.data.acting_director_id), label: `${dj.data.acting_director_name ?? dj.data.acting_director_id} — ผู้อำนวยการ (รักษาการ)`, role: 'acting' })
            }
            setDirectorOptions(opts)
            // auto-select ผอ. ตัวจริงก่อน ถ้าไม่มีใช้รักษาการ
            const main = opts.find(o => o.role === 'supervisor') ?? opts[0]
            if (main) form.setFieldsValue({ approverDirector: main.value })
          })
      })
      .catch(() => message.error('ไม่สามารถตรวจสอบสายอนุมัติได้'))
  }, [message, form])

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
          // auto-select ตัวจริงก่อน ถ้าไม่มีค่อยใช้รักษาการ
          const main = json.data.find((s: any) => s.role !== 'acting') ?? json.data[0]
          if (main) form.setFieldsValue({ approver3: String(main.id) })
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
          const main = json.data.find((s: any) => s.role !== 'acting') ?? json.data[0]
          if (main) form.setFieldsValue({ approver2: String(main.id) })
        }
      })
      .catch(() => message.error('ไม่สามารถโหลดหัวหน้ากลุ่มงานได้'))
  }, [message, form])

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (!raw) return
    const id = JSON.parse(raw)?.id
    if (!id) return
    fetch(`/api/v1/hr/submajor-supervisor/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setSubmajorSupervisors(json.data)
          const main = json.data.find((s: any) => s.role !== 'acting') ?? json.data[0]
          if (main) form.setFieldsValue({ approver1: String(main.id) })
        }
      })
      .catch(() => message.error('ไม่สามารถโหลดหัวหน้าหน่วยงาน/ตึกได้'))
  }, [message, form])

  const currentLeaveTypeInfo = leaveTypes.find(t => t.id === leaveType) ?? null
  const requiresDoc = currentLeaveTypeInfo?.requires_document_after_days

  // ลาพักผ่อน (ANNUAL) ต้องยื่นล่วงหน้า — เลือกวันที่ย้อนหลังไม่ได้ (ประเภทลาอื่น เช่น ลาป่วย ยื่นย้อนหลังได้ตามระเบียบ)
  const isAnnualLeave = currentLeaveTypeInfo?.code === 'ANNUAL'
  const disabledPastDate = (current: dayjs.Dayjs) => isAnnualLeave && current.isBefore(dayjs(), 'day')

  // หา entitlement ของประเภทการลาที่เลือก (ใช้ min_service_months น้อยที่สุดเป็นฐาน)
  const currentEntitlement = entitlements
    .filter(e => e.leave_type_id === leaveType)
    .sort((a, b) => a.min_service_months - b.min_service_months)[0] ?? null

  // คำนวณจำนวนวันลา
  const handleValuesChange = (changedValues: any, allValues: any) => {
    if ('leaveType' in changedValues) {
      setLeaveType(changedValues.leaveType)
      // สลับมาเป็นลาพักผ่อน (ANNUAL) แต่วันที่เลือกไว้เดิมย้อนหลังไปแล้ว → ล้างช่วงวันที่ทิ้ง กันเลือกวันย้อนหลังหลุดมาได้
      const newIsAnnual = leaveTypes.find(t => t.id === changedValues.leaveType)?.code === 'ANNUAL'
      const dr = allValues.dateRange
      if (newIsAnnual && dr && dr[0] && dr[0].isBefore(dayjs(), 'day')) {
        form.setFieldsValue({ dateRange: undefined, totalLeaveDays: 0 })
        setTotalLeaveDays(0)
        message.warning('ลาพักผ่อนไม่สามารถเลือกวันที่ย้อนหลังได้ กรุณาเลือกวันที่ใหม่')
      }
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
    <div className="min-h-screen bg-app-bg text-app-text">
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
            initialValues={{ leaveType: 1, halfDay: false, dateRange: [dayjs(), dayjs()], totalLeaveDays: 1 }}
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
                      optionLabelProp="label"
                      options={leaveTypes.map(t => {
                        const style = getLeaveStyle(t.code)
                        return {
                          value: t.id,
                          // label = แสดงในกล่องหลังเลือกแล้ว (มีไอคอนสีตามประเภท)
                          label: (
                            <span className="flex items-center gap-2">
                              <span style={{ color: style.color }}>{style.icon}</span>
                              {t.name_th}
                            </span>
                          ),
                          // ตัวเลือกในดรอปดาวน์ — พื้นหลังไอคอนเป็นวงกลมให้ดูสวยขึ้น
                          text: t.name_th,
                          rawLabel: (
                            <span className="flex items-center gap-2">
                              <span
                                className="flex items-center justify-center rounded-full"
                                style={{ width: 22, height: 22, backgroundColor: `${style.color}1f`, color: style.color, fontSize: 12 }}
                              >
                                {style.icon}
                              </span>
                              {t.name_th}
                            </span>
                          ),
                        }
                      })}
                      optionRender={(option) => (option.data as any).rawLabel}
                      filterOption={(input, option) =>
                        ((option as any)?.text as string ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>

                  {leaveType === 4 && (
                    <div className="mb-6 p-4 bg-app-surface rounded-lg border border-app-border">
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
                    <div className="mb-6 p-4 bg-app-surface rounded-lg border border-app-border">
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
                        rules={[
                          { required: true, message: 'กรุณาเลือกช่วงวันที่ลา' },
                          {
                            validator: (_, value) => {
                              if (isAnnualLeave && value?.[0] && value[0].isBefore(dayjs(), 'day')) {
                                return Promise.reject('ลาพักผ่อนไม่สามารถเลือกวันที่ย้อนหลังได้')
                              }
                              return Promise.resolve()
                            },
                          },
                        ]}
                      >
                        <RangePicker className="w-full" format="DD/MM/YYYY" disabledDate={disabledPastDate} />
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
                    label="ผู้ปฏิบัติงานแทน (ถ้ามี)"
                  >
                    <Select
                      showSearch
                      allowClear
                      placeholder="ค้นหาชื่อผู้ปฏิบัติงานแทน — ไม่ระบุก็ได้"
                      prefix={<UserOutlined className="text-app-text-2" />}
                      loading={colleaguesLoading}
                      notFoundContent={colleaguesLoading ? undefined : 'ไม่พบบุคลากรในหน่วยงานเดียวกัน'}
                      filterOption={(input, option) =>
                        (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={colleagues.map(c => ({
                        value: String(c.id),
                        label: `${c.pname ?? ''}${c.fname} ${c.lname}${c.position_name ? ` — ${c.position_name}` : ''}`,
                      }))}
                    />
                  </Form.Item>
                </Card>
              </Col>

              {/* ส่วนผู้อนุมัติและสรุป */}
              <Col xs={24} lg={8}>
                <Card variant="borderless" className="shadow-sm mb-6 bg-primary/5 border-primary/10">
                  <Title level={4} className="mb-4">
                    สรุปวันลา
                    {staffType && <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}> · {staffType}</Text>}
                  </Title>
                  <Form.Item
                    name="totalLeaveDays"
                    label="จำนวนวันที่ใช้ลา (สามารถแก้ไขได้)"
                    rules={[
                      { required: true, message: 'กรุณาระบุจำนวนวันลา' },
                      {
                        validator: (_, value) => {
                          if (value != null && value < 0.5) {
                            return Promise.reject('ขั้นต่ำ 0.5 วัน (ครึ่งวัน)')
                          }
                          if (value != null && Math.abs(value * 2 - Math.round(value * 2)) > 1e-9) {
                            return Promise.reject('กรอกได้เป็นจำนวนเต็มหรือครึ่งวันเท่านั้น')
                          }
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
                      min={0.5}
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
                      title={`สิทธิ์การลาประเภทนี้${staffType ? ` (${staffType})` : ''}`}
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
                          {currentEntitlement.max_days_per_year != null && (
                            <div>
                              คงเหลือหลังคำขอนี้:{' '}
                              <strong>
                                {Math.max(currentEntitlement.max_days_per_year - totalLeaveDays, 0)} วัน
                              </strong>
                              <Text type="secondary" style={{ fontSize: 11 }}> (คำนวณจากสิทธิ์ต่อปี ยังไม่หักวันลาที่เคยใช้ไปก่อนหน้า)</Text>
                            </div>
                          )}
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

                  {isMissionHead ? (
                    /* หัวหน้า/รักษาการกลุ่มภารกิจ → ลากับ ผอ. โดยตรง */
                    <>
                      <Alert
                        type="info"
                        showIcon
                        className="mb-4"
                        title="ท่านดำรงตำแหน่งหัวหน้า/รักษาการกลุ่มภารกิจ"
                        description="คำขอลาจะเสนอผู้อำนวยการอนุมัติโดยตรง"
                      />
                      <Form.Item
                        name="approverDirector"
                        label="ผู้อนุมัติ: ผู้อำนวยการ"
                        rules={[{ required: directorOptions.length > 0, message: 'กรุณาเลือกผู้อนุมัติ' }]}
                      >
                        <Select
                          placeholder={directorOptions.length > 0 ? 'เลือกผู้อนุมัติ' : 'ยังไม่มีการแต่งตั้งผู้อำนวยการ'}
                          disabled={directorOptions.length === 0}
                          options={directorOptions.map(o => ({ value: o.value, label: o.label }))}
                        />
                      </Form.Item>
                    </>
                  ) : (
                  <Space orientation="vertical" className="w-full" size="large">
                    <Form.Item
                      name="approver1"
                      label="1. หัวหน้าหน่วยงาน/ตึก"
                      rules={[{ required: submajorSupervisors.length > 0, message: 'กรุณาเลือกผู้อนุมัติ' }]}
                    >
                      <Select
                        placeholder={submajorSupervisors.length > 0 ? 'เลือกผู้อนุมัติ' : 'ยังไม่มีการแต่งตั้งหัวหน้าหน่วยงาน'}
                        disabled={submajorSupervisors.length === 0}
                        options={submajorSupervisors.map(s => ({
                          value: String(s.id),
                          label: `${s.major_supervisor} — ${s.major_name}${s.role === 'acting' ? ' (รักษาการ)' : ''}`,
                        }))}
                      />
                    </Form.Item>

                    <Form.Item
                      name="approver2"
                      label="2. หัวหน้ากลุ่มงาน"
                      rules={[{ required: majorSupervisors.length > 0, message: 'กรุณาเลือกผู้อนุมัติ' }]}
                    >
                      <Select
                        placeholder={majorSupervisors.length > 0 ? 'เลือกผู้อนุมัติ' : 'ยังไม่มีการแต่งตั้งหัวหน้ากลุ่มงาน'}
                        disabled={majorSupervisors.length === 0}
                        options={majorSupervisors.map(s => ({
                          value: String(s.id),
                          label: `${s.major_supervisor} — ${s.major_name}${s.role === 'acting' ? ' (รักษาการ)' : ''}`,
                        }))}
                      />
                    </Form.Item>

                    <Form.Item
                      name="approver3"
                      label="3. หัวหน้ากลุ่มภารกิจ"
                      rules={[{ required: missionSupervisors.length > 0, message: 'กรุณาเลือกผู้อนุมัติ' }]}
                    >
                      <Select
                        placeholder={missionSupervisors.length > 0 ? 'เลือกผู้อนุมัติ' : 'ยังไม่มีการแต่งตั้งหัวหน้ากลุ่มภารกิจ'}
                        disabled={missionSupervisors.length === 0}
                        options={missionSupervisors.map(s => ({
                          value: String(s.id),
                          label: `${s.mission_supervisor} — ${s.mission_name}${s.role === 'acting' ? ' (รักษาการ)' : ''}`,
                        }))}
                      />
                    </Form.Item>
                  </Space>
                  )}

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
                  <Button type="link" block className="mt-2 text-app-text-2">
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
    <AppThemeProvider colorPrimary="#006a5a">
      <LeavePageContent />
    </AppThemeProvider>
  )
}

export default LeavePage
