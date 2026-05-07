'use client'
import React, { useState } from 'react'
import {
  ConfigProvider, App, theme, Card, Form, Input, Button, Breadcrumb, Typography,
  Row, Col, Tag, Space, Avatar, Divider, Tabs, Select, DatePicker, Switch, Alert,
  Descriptions, Upload, Tooltip, Badge
} from 'antd'
import type { UploadProps } from 'antd'
import {
  HomeOutlined, UserOutlined, IdcardOutlined, BankOutlined, PhoneOutlined,
  MailOutlined, SafetyCertificateOutlined, BellOutlined, EnvironmentOutlined,
  EditOutlined, SaveOutlined, ReloadOutlined, CameraOutlined, InfoCircleOutlined,
  CheckCircleFilled, ContactsOutlined, NumberOutlined, SolutionOutlined,
  CalendarOutlined, GlobalOutlined, ApartmentOutlined, ClockCircleOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// ข้อมูลที่งาน HR กำหนดและผู้ใช้แก้ไขเองไม่ได้
const profileLocked = {
  employeeNo: 'EMP-0428',
  fullName: 'นายสมชาย ใจดี',
  position: 'นักทรัพยากรบุคคล ปฏิบัติการ',
  staffType: 'ข้าราชการ',
  missionGroup: 'กลุ่มภารกิจอำนวยการ',
  workGroup: 'กลุ่มงานทรัพยากรบุคคล',
  department: 'งานบริหารทั่วไป',
  startDate: '2018-04-02',
}

const banks = [
  'ธนาคารกรุงไทย', 'ธนาคารกรุงเทพ', 'ธนาคารกสิกรไทย', 'ธนาคารไทยพาณิชย์',
  'ธนาคารกรุงศรีอยุธยา', 'ธนาคารทหารไทยธนชาต (ttb)', 'ธนาคารออมสิน', 'ธ.ก.ส.'
]

const SettingsContent = () => {
  const [profileForm] = Form.useForm()
  const [codesForm] = Form.useForm()
  const [contactForm] = Form.useForm()
  const [emergencyForm] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('profile')

  // ตัวอย่างค่าเริ่มต้น
  const initialProfile = {
    nickname: 'ชาย',
    gender: 'male',
    birthdate: dayjs('1990-08-15'),
    nationality: 'ไทย',
    religion: 'พุทธ',
    maritalStatus: 'single',
    bloodType: 'O',
  }
  const initialCodes = {
    salaryCode: 'PAY-44091',
    attendanceCode: 'ATT-0428',
    cardNo: 'IC-100428',
    taxId: '1-1099-00428-12-3',
    ssoNo: '1-1099-00428-12-3',
    bank: 'ธนาคารกรุงไทย',
    bankBranch: 'พญาไท',
    bankAccount: '123-4-56789-0',
  }
  const initialContact = {
    email: 'somchai.j@hospital.go.th',
    mobile: '081-234-5678',
    phone: '02-123-4567 ต่อ 2410',
    address: '123/45 ถ.ราชวิถี แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพฯ 10400',
    line: 'somchai_jd',
  }
  const initialEmergency = {
    contactName: 'นางสุดา ใจดี',
    contactRelation: 'มารดา',
    contactPhone: '081-987-6543',
    contactAddress: 'ที่อยู่เดียวกับเจ้าหน้าที่',
  }

  const [notify, setNotify] = useState({
    leaveStatus: true,
    payslip: true,
    announce: true,
    systemAlert: false,
  })

  const handleSave = async (label: string) => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    Swal.fire({
      title: 'บันทึกข้อมูลสำเร็จ',
      text: `${label} ถูกส่งให้งานทรัพยากรบุคคลตรวจสอบแล้ว`,
      icon: 'success',
      background: '#1e293b',
      color: '#e2e8f0',
      confirmButtonColor: '#006a5a',
    })
  }

  const uploadProps: UploadProps = {
    name: 'avatar',
    showUploadList: false,
    beforeUpload: () => false,
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <Breadcrumb
          className="mb-4"
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: 'บัญชีผู้ใช้' },
            { title: 'ตั้งค่าบัญชี' },
          ]}
        />

        {/* Header banner */}
        <Card
          className="mt-4 mb-6 border-0 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(6,106,90,0.25), rgba(16,185,129,0.08) 60%, transparent)',
            borderLeft: '4px solid #006a5a',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="relative">
              <Badge
                count={
                  <Upload {...uploadProps}>
                    <Tooltip title="เปลี่ยนรูปโปรไฟล์">
                      <Button
                        size="small"
                        shape="circle"
                        icon={<CameraOutlined />}
                        type="primary"
                      />
                    </Tooltip>
                  </Upload>
                }
                offset={[-8, 70]}
              >
                <Avatar
                  size={84}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#006a5a', fontSize: 36 }}
                />
              </Badge>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Title level={3} style={{ margin: 0, color: '#e2e8f0' }}>
                  {profileLocked.fullName}
                </Title>
                <Tag color="green">{profileLocked.staffType}</Tag>
                <Tag color="cyan">{profileLocked.employeeNo}</Tag>
              </div>
              <Text type="secondary" style={{ color: '#94a3b8' }}>
                {profileLocked.position} · {profileLocked.workGroup}
              </Text>
              <div className="mt-1">
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                  <ClockCircleOutlined /> เริ่มงาน: {dayjs(profileLocked.startDate).format('DD/MM/YYYY')} ·
                  อายุงาน: {dayjs().diff(profileLocked.startDate, 'year')} ปี
                </Text>
              </div>
            </div>
            <div className="hidden md:block">
              <Tag color="green" icon={<CheckCircleFilled />} className="!m-0">
                บัญชียืนยันตัวตนแล้ว
              </Tag>
            </div>
          </div>
        </Card>

        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          className="mb-5"
          message="หมายเหตุการแก้ไขข้อมูล"
          description="ข้อมูลที่ผู้ใช้แก้ไขในหน้านี้ถือเป็นการแจ้งให้งานทรัพยากรบุคคลทราบ ระบบจะแสดงสถานะ 'รอ HR ยืนยัน' จนกว่าจะได้รับอนุมัติ ส่วนข้อมูลที่ HR กำหนด (สีเทา) จะไม่สามารถแก้ไขเองได้"
          style={{ background: 'rgba(30,41,59,0.6)', borderColor: '#1e293b' }}
        />

        <Card styles={{ header: { borderBottom: '1px solid #1e293b' } }}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'profile',
                label: <Space><UserOutlined />ข้อมูลส่วนตัว</Space>,
                children: (
                  <>
                    <Descriptions
                      column={{ xs: 1, sm: 2, md: 3 }}
                      size="small"
                      bordered
                      className="mb-5"
                      styles={{
                        label: { color: '#94a3b8', background: 'rgba(15,23,42,0.5)', width: 160 },
                        content: { color: '#e2e8f0', background: 'rgba(15,23,42,0.3)' },
                      }}
                      title={<span className="text-slate-300 text-sm">ข้อมูลที่ HR กำหนด · แก้ไขเองไม่ได้</span>}
                    >
                      <Descriptions.Item label="รหัสบุคลากร">{profileLocked.employeeNo}</Descriptions.Item>
                      <Descriptions.Item label="ชื่อ-นามสกุล">{profileLocked.fullName}</Descriptions.Item>
                      <Descriptions.Item label="ตำแหน่ง">{profileLocked.position}</Descriptions.Item>
                      <Descriptions.Item label="กลุ่มภารกิจ">{profileLocked.missionGroup}</Descriptions.Item>
                      <Descriptions.Item label="กลุ่มงาน">{profileLocked.workGroup}</Descriptions.Item>
                      <Descriptions.Item label="หน่วยงาน">{profileLocked.department}</Descriptions.Item>
                    </Descriptions>

                    <Form
                      form={profileForm}
                      layout="vertical"
                      initialValues={initialProfile}
                      onFinish={() => handleSave('ข้อมูลส่วนตัว')}
                    >
                      <Row gutter={[16, 0]}>
                        <Col xs={24} sm={12} md={8}>
                          <Form.Item label="ชื่อเล่น" name="nickname">
                            <Input placeholder="ชื่อเล่น" prefix={<UserOutlined className="text-slate-500" />} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                          <Form.Item label="เพศ" name="gender">
                            <Select
                              options={[
                                { value: 'male', label: 'ชาย' },
                                { value: 'female', label: 'หญิง' },
                                { value: 'other', label: 'อื่นๆ' },
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                          <Form.Item label="วันเกิด" name="birthdate">
                            <DatePicker
                              format="DD/MM/YYYY"
                              className="w-full"
                              suffixIcon={<CalendarOutlined />}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                          <Form.Item label="สัญชาติ" name="nationality">
                            <Input prefix={<GlobalOutlined className="text-slate-500" />} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                          <Form.Item label="ศาสนา" name="religion">
                            <Select
                              options={['พุทธ', 'คริสต์', 'อิสลาม', 'ฮินดู', 'ซิกข์', 'อื่นๆ'].map(v => ({ value: v, label: v }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                          <Form.Item label="สถานภาพสมรส" name="maritalStatus">
                            <Select
                              options={[
                                { value: 'single',   label: 'โสด' },
                                { value: 'married',  label: 'สมรส' },
                                { value: 'divorced', label: 'หย่าร้าง' },
                                { value: 'widowed',  label: 'หม้าย' },
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                          <Form.Item label="กรุ๊ปเลือด" name="bloodType">
                            <Select
                              options={['A', 'B', 'AB', 'O'].map(v => ({ value: v, label: v }))}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Divider style={{ borderColor: '#1e293b' }} />
                      <div className="flex justify-end gap-2">
                        <Button icon={<ReloadOutlined />} onClick={() => profileForm.resetFields()}>
                          คืนค่าเดิม
                        </Button>
                        <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                          บันทึกข้อมูลส่วนตัว
                        </Button>
                      </div>
                    </Form>
                  </>
                ),
              },
              {
                key: 'codes',
                label: <Space><IdcardOutlined />รหัสและบัญชีธนาคาร</Space>,
                children: (
                  <Form
                    form={codesForm}
                    layout="vertical"
                    initialValues={initialCodes}
                    onFinish={() => handleSave('รหัสและบัญชีธนาคาร')}
                  >
                    <Title level={5} style={{ color: '#cbd5e1', marginTop: 0 }}>
                      <NumberOutlined /> รหัสประจำตัวระบบ
                    </Title>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          label={<span>รหัสเลขที่เงินเดือน <Tooltip title="ใช้สำหรับออกสลิปเงินเดือน"><InfoCircleOutlined className="text-slate-500" /></Tooltip></span>}
                          name="salaryCode"
                          rules={[{ required: true, message: 'กรุณาระบุรหัสเลขที่เงินเดือน' }]}
                        >
                          <Input prefix={<SolutionOutlined className="text-slate-500" />} placeholder="เช่น PAY-44091" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          label={<span>รหัสเข้าออกงาน <Tooltip title="ใช้กับเครื่องสแกนนิ้ว/บัตร"><InfoCircleOutlined className="text-slate-500" /></Tooltip></span>}
                          name="attendanceCode"
                          rules={[{ required: true, message: 'กรุณาระบุรหัสเข้าออกงาน' }]}
                        >
                          <Input prefix={<ClockCircleOutlined className="text-slate-500" />} placeholder="เช่น ATT-0428" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="เลขที่บัตรพนักงาน" name="cardNo">
                          <Input prefix={<IdcardOutlined className="text-slate-500" />} placeholder="เช่น IC-100428" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          label="เลขประจำตัวผู้เสียภาษี"
                          name="taxId"
                          rules={[{ pattern: /^[0-9-]{13,17}$/, message: 'รูปแบบไม่ถูกต้อง' }]}
                        >
                          <Input placeholder="X-XXXX-XXXXX-XX-X" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="เลขที่ประกันสังคม" name="ssoNo">
                          <Input placeholder="X-XXXX-XXXXX-XX-X" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ borderColor: '#1e293b' }} />

                    <Title level={5} style={{ color: '#cbd5e1' }}>
                      <BankOutlined /> บัญชีธนาคารรับเงินเดือน
                    </Title>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="ธนาคาร" name="bank" rules={[{ required: true, message: 'กรุณาเลือกธนาคาร' }]}>
                          <Select
                            options={banks.map(b => ({ value: b, label: b }))}
                            placeholder="เลือกธนาคาร"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="สาขา" name="bankBranch">
                          <Input placeholder="ชื่อสาขา" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          label="เลขที่บัญชี"
                          name="bankAccount"
                          rules={[{ required: true, message: 'กรุณากรอกเลขบัญชี' }]}
                        >
                          <Input placeholder="XXX-X-XXXXX-X" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Alert
                      type="warning"
                      showIcon
                      className="mt-2 mb-4"
                      message="การแก้ไขเลขที่บัญชีธนาคารต้องผ่านการยืนยันจากงานการเงิน"
                      style={{ background: 'rgba(146,64,14,0.18)', borderColor: '#92400e' }}
                    />

                    <div className="flex justify-end gap-2">
                      <Button icon={<ReloadOutlined />} onClick={() => codesForm.resetFields()}>
                        คืนค่าเดิม
                      </Button>
                      <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                        ส่งคำขอแก้ไขให้ HR
                      </Button>
                    </div>
                  </Form>
                ),
              },
              {
                key: 'contact',
                label: <Space><ContactsOutlined />ข้อมูลติดต่อ</Space>,
                children: (
                  <Form
                    form={contactForm}
                    layout="vertical"
                    initialValues={initialContact}
                    onFinish={() => handleSave('ข้อมูลติดต่อ')}
                  >
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="อีเมล"
                          name="email"
                          rules={[{ type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }]}
                        >
                          <Input prefix={<MailOutlined className="text-slate-500" />} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="เบอร์มือถือ"
                          name="mobile"
                          rules={[{ required: true, message: 'กรุณากรอกเบอร์มือถือ' }]}
                        >
                          <Input prefix={<PhoneOutlined className="text-slate-500" />} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="โทรศัพท์ภายใน" name="phone">
                          <Input prefix={<PhoneOutlined className="text-slate-500" />} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="LINE ID" name="line">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item label="ที่อยู่ปัจจุบัน" name="address">
                          <Input.TextArea
                            rows={3}
                            placeholder="บ้านเลขที่ / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ borderColor: '#1e293b' }} />

                    <div className="flex justify-end gap-2">
                      <Button icon={<ReloadOutlined />} onClick={() => contactForm.resetFields()}>
                        คืนค่าเดิม
                      </Button>
                      <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                        บันทึกข้อมูลติดต่อ
                      </Button>
                    </div>
                  </Form>
                ),
              },
              {
                key: 'emergency',
                label: <Space><SafetyCertificateOutlined />ผู้ติดต่อฉุกเฉิน</Space>,
                children: (
                  <Form
                    form={emergencyForm}
                    layout="vertical"
                    initialValues={initialEmergency}
                    onFinish={() => handleSave('ผู้ติดต่อฉุกเฉิน')}
                  >
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          label="ชื่อ-นามสกุล"
                          name="contactName"
                          rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}
                        >
                          <Input prefix={<UserOutlined className="text-slate-500" />} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="ความสัมพันธ์" name="contactRelation">
                          <Select
                            options={['บิดา', 'มารดา', 'คู่สมรส', 'พี่/น้อง', 'บุตร', 'ญาติ', 'อื่นๆ'].map(v => ({ value: v, label: v }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          label="เบอร์ติดต่อ"
                          name="contactPhone"
                          rules={[{ required: true, message: 'กรุณากรอกเบอร์โทร' }]}
                        >
                          <Input prefix={<PhoneOutlined className="text-slate-500" />} />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item
                          label={<span><EnvironmentOutlined /> ที่อยู่</span>}
                          name="contactAddress"
                        >
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ borderColor: '#1e293b' }} />

                    <div className="flex justify-end gap-2">
                      <Button icon={<ReloadOutlined />} onClick={() => emergencyForm.resetFields()}>
                        คืนค่าเดิม
                      </Button>
                      <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                        บันทึกผู้ติดต่อฉุกเฉิน
                      </Button>
                    </div>
                  </Form>
                ),
              },
              {
                key: 'notify',
                label: <Space><BellOutlined />การแจ้งเตือน</Space>,
                children: (
                  <div className="space-y-4">
                    {[
                      { key: 'leaveStatus', title: 'แจ้งเตือนสถานะการลา', desc: 'รับแจ้งเตือนเมื่อใบลาได้รับการอนุมัติ/ไม่อนุมัติ' },
                      { key: 'payslip',     title: 'แจ้งเตือนสลิปเงินเดือนใหม่', desc: 'รับแจ้งเตือนทุกครั้งที่มีการออกสลิปเงินเดือน' },
                      { key: 'announce',    title: 'ประกาศจากหน่วยงาน', desc: 'รับข่าวประชาสัมพันธ์ คำสั่ง และเอกสารเวียน' },
                      { key: 'systemAlert', title: 'การเตือนระบบ', desc: 'รับแจ้งเตือนการเข้าสู่ระบบจากอุปกรณ์ใหม่' },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b' }}
                      >
                        <div>
                          <Text style={{ color: '#e2e8f0', fontWeight: 600 }}>{item.title}</Text>
                          <div><Text type="secondary" style={{ color: '#94a3b8', fontSize: 12 }}>{item.desc}</Text></div>
                        </div>
                        <Switch
                          checked={(notify as any)[item.key]}
                          onChange={(v) => setNotify(prev => ({ ...prev, [item.key]: v }))}
                        />
                      </div>
                    ))}
                    <Divider style={{ borderColor: '#1e293b' }} />
                    <div className="flex justify-end">
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={() => handleSave('ตั้งค่าการแจ้งเตือน')}
                      >
                        บันทึกการตั้งค่าแจ้งเตือน
                      </Button>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}

export default function AccountSettingsPage() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: '#006a5a', borderRadius: 8 },
      }}
    >
      <App>
        <SettingsContent />
      </App>
    </ConfigProvider>
  )
}
