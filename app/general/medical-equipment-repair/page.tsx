'use client'
import React, { useState } from 'react'
import {
  Form, Input, Button, Select, DatePicker, Typography, Card, ConfigProvider,
  Result, Breadcrumb, Row, Col, Alert, Divider, Steps, Radio, Upload, theme
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, CheckCircleOutlined, MedicineBoxOutlined, PlusOutlined
} from '@ant-design/icons'
import Navbar from '../../components/Navbar'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

const equipmentTypeOptions = [
  { label: 'เครื่องมือผ่าตัด', value: 'surgical' },
  { label: 'เครื่องวัดสัญญาณชีพ', value: 'vital_signs' },
  { label: 'เครื่องอัลตร้าซาวด์', value: 'ultrasound' },
  { label: 'เครื่อง X-Ray', value: 'xray' },
  { label: 'อุปกรณ์ห้องแล็บ', value: 'laboratory' },
  { label: 'อื่นๆ (ระบุในรายละเอียด)', value: 'other' },
]

const urgencyOptions = [
  { label: 'ปกติ (ดำเนินการตามลำดับคิว)', value: 'normal' },
  { label: 'ด่วน (ส่งผลกระทบต่องานบางส่วน)', value: 'urgent' },
  { label: 'ด่วนมาก (ฉุกเฉิน / อันตราย)', value: 'critical' },
]

const departmentOptions = [
  { label: 'ห้องผู้ป่วยนอก (OPD)', value: 'opd' },
  { label: 'ห้องผู้ป่วยใน (IPD)', value: 'ipd' },
  { label: 'ห้องฉุกเฉิน (ER)', value: 'er' },
  { label: 'ห้องผ่าตัด (OR)', value: 'or' },
  { label: 'ห้องแล็บ / พยาธิวิทยา', value: 'lab' },
  { label: 'อื่นๆ', value: 'other' },
]

const MedicalEquipmentRepairPage = () => {
  const [form] = Form.useForm()
  const [isSubmitted, setIsSubmitted] = useState(false)

  const onFinish = (values: any) => {
    console.log('Received values of form: ', values)
    setIsSubmitted(true)
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo)
  }

  const normFile = (e: any) => {
    if (Array.isArray(e)) return e
    return e?.fileList
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
              { title: 'แจ้งซ่อมเครื่องมือแพทย์' },
            ]}
            className="mb-6"
          />

          <div className="w-full">
            <div className="mb-8">
              <Title level={2} style={{ color: '#FF6500', margin: 0 }}>แบบฟอร์มแจ้งซ่อมเครื่องมือแพทย์</Title>
              <Text type="secondary">กรุณากรอกรายละเอียดเครื่องมือแพทย์ที่ต้องการแจ้งซ่อม เพื่อให้ช่างเทคนิคการแพทย์ดำเนินการแก้ไข</Text>
            </div>

            {isSubmitted ? (
              <Card style={{ maxWidth: 800, margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 12, borderTop: '4px solid #FF6500' }}>
                <Result
                  status="success"
                  title="ส่งคำขอแจ้งซ่อมเครื่องมือแพทย์สำเร็จ!"
                  subTitle="ระบบได้รับข้อมูลการแจ้งซ่อมของท่านแล้ว ช่างเทคนิคการแพทย์จะทำการตรวจสอบและดำเนินการตามลำดับความเร่งด่วน"
                  extra={[
                    <div key="steps" style={{ padding: '24px 0', textAlign: 'left' }}>
                      <Steps
                        current={1}
                        items={[
                          { title: 'แจ้งซ่อม', content: 'ระบบรับเรื่องแล้ว' },
                          { title: 'รอดำเนินการ', content: 'ช่างเทคนิคตรวจสอบ' },
                          { title: 'กำลังซ่อมแซม', content: 'ช่างกำลังปฏิบัติงาน' },
                          { title: 'เสร็จสิ้น', content: 'ปิดงานซ่อม' },
                        ]}
                      />
                    </div>,
                    <Button type="primary" key="back" onClick={() => { setIsSubmitted(false); form.resetFields() }}>แจ้งซ่อมรายการใหม่</Button>
                  ]}
                />
              </Card>
            ) : (
              <Form
                form={form}
                name="medical_equipment_repair_form"
                layout="vertical"
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
                initialValues={{
                  requestDate: dayjs(),
                  urgencyLevel: 'normal'
                }}
              >
                <Row gutter={24}>
                  <Col xs={24} lg={16}>
                    <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12, borderTop: '4px solid #FF6500' }}>
                      <Title level={4} className="mb-6 flex items-center gap-2">
                        <MedicineBoxOutlined style={{ color: '#FF6500' }} /> รายละเอียดเครื่องมือแพทย์
                      </Title>

                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="ประเภทเครื่องมือแพทย์" name="equipmentType" rules={[{ required: true, message: 'กรุณาเลือกประเภทเครื่องมือ' }]}>
                            <Select placeholder="เลือกประเภทเครื่องมือ" options={equipmentTypeOptions} size="large" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="รหัสทรัพย์สิน / เลขครุภัณฑ์" name="assetNumber" rules={[{ required: true, message: 'กรุณาระบุรหัสทรัพย์สิน' }]}>
                            <Input placeholder="เช่น MED-2566-0123" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item label="ชื่อเครื่องมือแพทย์ / รุ่น (Model)" name="equipmentName" rules={[{ required: true, message: 'กรุณาระบุชื่อเครื่องมือ' }]}>
                        <Input placeholder="เช่น เครื่องวัดความดันโลหิต Omron HEM-7200" size="large" />
                      </Form.Item>

                      <Form.Item label="ระดับความเร่งด่วน" name="urgencyLevel" rules={[{ required: true, message: 'กรุณาระบุระดับความเร่งด่วน' }]}>
                        <Radio.Group buttonStyle="solid" className="flex w-full">
                          {urgencyOptions.map(opt => {
                            const color = opt.value === 'critical' ? '#ef4444' : opt.value === 'urgent' ? '#f59e0b' : '#22c55e'
                            return (
                              <ConfigProvider key={opt.value} theme={{ token: { colorPrimary: color } }}>
                                <Radio.Button value={opt.value} className="flex-1 text-center">
                                  {opt.label}
                                </Radio.Button>
                              </ConfigProvider>
                            )
                          })}
                        </Radio.Group>
                      </Form.Item>

                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="ห้อง/แผนกที่ใช้งาน" name="department" rules={[{ required: true, message: 'กรุณาเลือกแผนก' }]}>
                            <Select placeholder="เลือกห้อง/แผนก" options={departmentOptions} size="large" showSearch optionFilterProp="label" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="สถานที่/จุดที่ตั้งเครื่อง" name="location" rules={[{ required: true, message: 'กรุณาระบุสถานที่' }]}>
                            <Input placeholder="เช่น ชั้น 2 ห้อง 201" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item label="อาการ / ปัญหาที่พบ" name="symptoms" rules={[{ required: true, message: 'กรุณาระบุอาการ/ปัญหา' }]}>
                        <TextArea rows={4} placeholder="อธิบายรายละเอียดอาการผิดปกติ เช่น เครื่องไม่ติด, ค่าที่อ่านผิดปกติ, มีเสียงดัง" />
                      </Form.Item>

                      <Form.Item
                        label="อัปโหลดรูปภาพประกอบ (ถ้ามี)"
                        name="images"
                        valuePropName="fileList"
                        getValueFromEvent={normFile}
                        extra="สามารถอัปโหลดได้สูงสุด 3 รูปภาพ เช่น รูปหน้าจอ error หรือรูปจุดที่เสียหาย"
                      >
                        <Upload
                          listType="picture-card"
                          maxCount={3}
                          beforeUpload={() => false}
                        >
                          <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>เพิ่มรูปภาพ</div>
                          </div>
                        </Upload>
                      </Form.Item>
                    </Card>

                    <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12 }}>
                      <Title level={5} className="mb-4">ข้อมูลผู้แจ้ง</Title>
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="วันที่แจ้ง" name="requestDate">
                            <DatePicker style={{ width: '100%' }} disabled format="DD/MM/YYYY" size="large" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="ชื่อ-นามสกุล ผู้แจ้ง" name="reporterName" rules={[{ required: true, message: 'กรุณาระบุชื่อผู้แจ้ง' }]}>
                            <Input placeholder="ระบุชื่อ-นามสกุล" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="เบอร์ติดต่อ" name="contactNumber" rules={[{ required: true, message: 'กรุณาระบุเบอร์ติดต่อ' }]}>
                            <Input placeholder="ระบุเบอร์โทรศัพท์ที่ติดต่อได้" size="large" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="หน่วยงานที่แจ้ง" name="reporterDepartment" rules={[{ required: true, message: 'กรุณาระบุหน่วยงาน' }]}>
                            <Input placeholder="ระบุหน่วยงานของท่าน" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  </Col>

                  <Col xs={24} lg={8}>
                    <Card variant="borderless" className="shadow-sm mb-6 bg-slate-800 border-slate-700" style={{ borderRadius: 12 }}>
                      <Title level={4} className="mb-4" style={{ color: '#FF6500' }}>ข้อแนะนำ</Title>
                      <Alert
                        description={
                          <ul className="list-disc pl-4 mt-2 mb-0 text-slate-300 text-sm">
                            <li>ระบุ <b>รหัสทรัพย์สิน</b> ให้ถูกต้อง เพื่อให้ช่างค้นหาประวัติการซ่อมได้รวดเร็ว</li>
                            <li>กรณีเครื่องมือที่ใช้ในการ <b>รักษาชีวิต</b> เช่น เครื่องช่วยหายใจ ให้เลือกระดับ ด่วนมาก และแจ้งหัวหน้างานโดยตรง</li>
                            <li>แนบรูปภาพ <b>หน้าจอ error</b> หรือจุดที่ผิดปกติ จะช่วยให้ช่างเตรียมอะไหล่ได้ล่วงหน้า</li>
                          </ul>
                        }
                        type="info"
                        showIcon
                      />
                    </Card>

                    <Card variant="borderless" className="shadow-sm mt-4" style={{ borderRadius: 12 }}>
                      <Title level={4} className="mb-6 flex items-center gap-2">
                        <CheckCircleOutlined style={{ color: '#FF6500' }} /> การดำเนินการ
                      </Title>
                      <Divider />
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        className="h-12 text-lg font-semibold"
                        style={{ boxShadow: '0 4px 14px rgba(255,101,0,0.3)' }}
                      >
                        ส่งเรื่องแจ้งซ่อม
                      </Button>
                      <Button type="link" block className="mt-2 text-slate-400" onClick={() => form.resetFields()}>
                        ล้างข้อมูล
                      </Button>
                    </Card>
                  </Col>
                </Row>
              </Form>
            )}
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}

export default MedicalEquipmentRepairPage
