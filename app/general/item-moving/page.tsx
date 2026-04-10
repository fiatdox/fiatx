'use client'
import React, { useState } from 'react'
import { Form, Input, Button, Select, DatePicker, Typography, Card, ConfigProvider, Result, Breadcrumb, Row, Col, Alert, Divider, Steps, theme } from 'antd'
import { HomeOutlined, FileTextOutlined, CheckCircleOutlined, ToolOutlined } from '@ant-design/icons'
import Navbar from '../../components/Navbar'

const { Title, Text } = Typography
const { TextArea } = Input

const jobTypeOptions = [
  { label: 'ขนย้ายสิ่งของ / ครุภัณฑ์', value: 'moving' },
  { label: 'จัดห้องประชุม / จัดสถานที่', value: 'setup' },
  { label: 'ตัดหญ้า / จัดสวน', value: 'gardening' },
  { label: 'ปรับทัศนียภาพพื้นที่', value: 'landscaping' },
  { label: 'อื่นๆ (โปรดระบุในรายละเอียด)', value: 'other' },
];

const ItemMovingPage = () => {
  const [form] = Form.useForm();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const onFinish = (values: any) => {
    console.log('Received values of form: ', values);
    setIsSubmitted(true); // เปลี่ยนสถานะเพื่อแสดงหน้าต่างติดตามผล
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
              { title: 'ขอย้ายสิ่งของ / จัดสถานที่' },
            ]}
            className="mb-6"
          />

          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Title level={2} style={{ color: '#FF6500', margin: 0 }}>แบบฟอร์มขอรับบริการงานสนาม / จัดสถานที่</Title>
              <Text type="secondary">กรุณากรอกรายละเอียดเพื่อแจ้งเจ้าหน้าที่งานสนามในการดำเนินการ ขนย้ายสิ่งของ หรือจัดเตรียมสถานที่</Text>
            </div>

            {isSubmitted ? (
              <Card style={{ maxWidth: 800, margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 12, borderTop: '4px solid #FF6500' }}>
                <Result
                  status="success"
                  title="ส่งคำขอรับบริการสำเร็จ!"
                  subTitle="ระบบได้รับข้อมูลของท่านแล้ว และได้แจ้งเตือนไปยังหัวหน้างานสนามเพื่อพิจารณาจัดสรรเจ้าหน้าที่ต่อไป"
                  extra={[
                    <div key="steps" style={{ padding: '24px 0', textAlign: 'left' }}>
                      <Steps
                        current={1}
                        items={[
                          { title: 'ยื่นคำร้อง', content: 'ระบบรับข้อมูลแล้ว' },
                          { title: 'รอรับเรื่อง', content: 'งานสนามกำลังพิจารณา' },
                          { title: 'กำลังดำเนินการ', content: 'จัดเตรียม/ขนย้าย' },
                          { title: 'เสร็จสิ้น', content: 'ปิดงาน' },
                        ]}
                      />
                    </div>,
                    <Button type="primary" key="back" onClick={() => { setIsSubmitted(false); form.resetFields(); }}>กลับไปหน้าฟอร์ม (จำลอง)</Button>
                  ]}
                />
              </Card>
            ) : (
              <Form
                form={form}
                name="item_moving_form"
                layout="vertical"
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
              >
                <Row gutter={24}>
                  {/* คอลัมน์ซ้าย: ข้อมูลฟอร์มหลัก */}
                  <Col xs={24} lg={16}>
                    <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12, borderTop: '4px solid #FF6500' }}>
                      <Title level={4} className="mb-6 flex items-center gap-2">
                        <ToolOutlined style={{ color: '#FF6500' }} /> รายละเอียดการขอรับบริการ
                      </Title>
                      
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="ผู้แจ้ง (ชื่อ-นามสกุล)" name="requesterName" rules={[{ required: true, message: 'กรุณาระบุชื่อ-นามสกุลผู้แจ้ง' }]}>
                            <Input placeholder="ระบุชื่อ-นามสกุล" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="เบอร์ติดต่อ" name="contactNumber" rules={[{ required: true, message: 'กรุณาระบุเบอร์ติดต่อ' }]}>
                            <Input placeholder="ระบุเบอร์โทรศัพท์ที่ติดต่อได้" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={24}>
                          <Form.Item label="หน่วยงาน" name="department" rules={[{ required: true, message: 'กรุณาระบุหน่วยงาน' }]}>
                            <Input placeholder="ระบุหน่วยงานของท่าน" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="ประเภทงาน" name="jobType" rules={[{ required: true, message: 'กรุณาเลือกประเภทงาน' }]}>
                            <Select
                              placeholder="เลือกประเภทงาน"
                              options={jobTypeOptions}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="วันที่และเวลาที่ต้องการให้ดำเนินการ" name="dateTime" rules={[{ required: true, message: 'กรุณาระบุวันและเวลา' }]}>
                            <DatePicker 
                              showTime={{ format: 'HH:mm' }} 
                              format="DD/MM/YYYY HH:mm" 
                              style={{ width: '100%' }}
                              placeholder="เลือกวันที่และเวลา" 
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item label="สถานที่ปฏิบัติงาน" name="location" rules={[{ required: true, message: 'กรุณาระบุสถานที่' }]}>
                        <Input placeholder="ระบุสถานที่ เช่น ห้องประชุม 1, อาคารผู้ป่วยนอก, ลานจอดรถ" />
                      </Form.Item>

                      <Form.Item label="รายละเอียดอื่นๆ เพิ่มเติม" name="details">
                        <TextArea rows={4} placeholder="ระบุรายละเอียดเพิ่มเติม เช่น จำนวนสิ่งของที่ต้องขนย้าย, รูปแบบการจัดโต๊ะประชุม" />
                      </Form.Item>
                    </Card>
                  </Col>

                  {/* คอลัมน์ขวา: คำแนะนำและปุ่มกด */}
                  <Col xs={24} lg={8}>
                    <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12 }}>
                      <Title level={4} className="mb-4" style={{ color: '#FF6500' }}>ข้อแนะนำ</Title>
                      <Alert
                        title="เงื่อนไขการขอรับบริการ"
                        description={
                          <ul className="list-disc pl-4 mt-2 mb-0 text-slate-600">
                            <li>กรุณาแจ้งล่วงหน้าอย่างน้อย 1-2 วันทำการ</li>
                            <li>กรณีขนย้ายของหนัก/จำนวนมาก โปรดระบุในรายละเอียดให้ชัดเจน</li>
                            <li>หากมีการเปลี่ยนแปลงวันเวลา กรุณาติดต่อหน่วยงานสนามโดยตรง</li>
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
                        ส่งคำขอรับบริการ
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

export default ItemMovingPage