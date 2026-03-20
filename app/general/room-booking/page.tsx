'use client'
import React, { useState } from 'react'
import { Form, Input, Button, InputNumber, Select, Typography, Card, ConfigProvider, Steps, Result, Breadcrumb, Row, Col, Alert, Divider } from 'antd'
import { HomeOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { Rule } from 'antd/lib/form'
import Navbar from '../../components/Navbar'

const { Title, Text } = Typography

interface RoomBookingFormValues {
  reasons: string[];
  familyMembers: number;
  additionalInfo: string;
}

const reasonsOptions = [
  { label: 'มีภูมิลำเนาไม่ใช่จังหวัดพะเยา', value: 'not_phayao_resident' },
  { label: 'ไกลจากรพ มากกว่า 20 กิโลเมตร', value: 'far_from_hospital' },
  { label: 'เป็นข้าราชการบรรจุใหม่', value: 'new_government_officer' },
  { label: 'มีลักษณะของงานมีการเข้าเวร เปลี่ยนเวลางาน', value: 'shift_work_nature' },
  { label: 'อื่นๆ (โปรดระบุในรายละเอียดเพิ่มเติม)', value: 'other' },
];

const Page = () => {
  const [form] = Form.useForm<RoomBookingFormValues>();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const onFinish = (values: RoomBookingFormValues) => {
    console.log('Received values of form: ', values);
    setIsSubmitted(true); // เปลี่ยนสถานะเพื่อแสดงหน้าต่างติดตามผล
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  // Validation rules
  const commonRules: Rule[] = [{ required: true, message: 'กรุณากรอกข้อมูลนี้' }];
  const reasonsRules: Rule[] = [{ required: true, message: 'กรุณาเลือกอย่างน้อยหนึ่งเหตุผล', type: 'array' }];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#FF6500' } }}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
              { title: 'ขออนุมัติบ้านพัก/แฟลตเจ้าหน้าที่' },
            ]}
            className="mb-6"
          />

          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Title level={2} style={{ color: '#FF6500', margin: 0 }}>ขออนุมัติบ้านพัก/แฟลตเจ้าหน้าที่</Title>
              <Text type="secondary">กรุณากรอกข้อมูลเพื่อขออนุมัติบ้านพักหรือแฟลตสำหรับเจ้าหน้าที่</Text>
            </div>

            {isSubmitted ? (
              <Card style={{ maxWidth: 800, margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 12, borderTop: '4px solid #FF6500' }}>
                <Result
                  status="success"
                  title="ส่งคำร้องขอเข้าพักสำเร็จ!"
                  subTitle="คำร้องของท่านกำลังเข้าสู่กระบวนการพิจารณาโดยคณะกรรมการของโรงพยาบาล"
                  extra={[
                    <div key="steps" style={{ padding: '24px 0', textAlign: 'left' }}>
                      <Steps
                        current={1} // ตั้งค่าปัจจุบันอยู่ที่สเตปที่ 2 (รอพิจารณา)
                        items={[
                          { title: 'ยื่นคำร้อง', content: 'ระบบรับข้อมูลแล้ว' },
                          { title: 'รอพิจารณา', content: 'รอคณะกรรมการอนุมัติ' },
                          { title: 'แจ้งผล', content: 'รอผลการพิจารณา' },
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
                name="room_booking_form"
                layout="vertical"
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
                initialValues={{ familyMembers: 0 }}
              >
                <Row gutter={24}>
                  {/* คอลัมน์ซ้าย: ข้อมูลฟอร์มหลัก */}
                  <Col xs={24} lg={16}>
                    <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12, borderTop: '4px solid #FF6500' }}>
                      <Title level={4} className="mb-6 flex items-center gap-2">
                        <FileTextOutlined style={{ color: '#FF6500' }} /> รายละเอียดการขอเข้าพัก
                      </Title>
                      <Form.Item label="เหตุผลในการขอห้องพัก (เลือกได้มากกว่า 1 ข้อ)" name="reasons" rules={reasonsRules}>
                        <Select
                          mode="multiple"
                          allowClear
                          placeholder="เลือกเหตุผลในการขอห้องพัก"
                          options={reasonsOptions}
                        />
                      </Form.Item>

                      <Form.Item label="จำนวนสมาชิกในครอบครัวที่ร่วมพักอาศัย (คน)" name="familyMembers" rules={commonRules}>
                        <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="ระบุจำนวนสมาชิก (ถ้ามี)" />
                      </Form.Item>

                      <Form.Item label="รายละเอียดเพิ่มเติม" name="additionalInfo">
                        <Input.TextArea rows={4} placeholder="ระบุรายละเอียดเพิ่มเติม หรืออธิบายเหตุผลอื่นๆ" />
                      </Form.Item>
                    </Card>
                  </Col>

                  {/* คอลัมน์ขวา: คำแนะนำและปุ่มกด */}
                  <Col xs={24} lg={8}>
                    <Card variant="borderless" className="shadow-sm mb-6 bg-orange-50 border-orange-100" style={{ borderRadius: 12 }}>
                      <Title level={4} className="mb-4" style={{ color: '#FF6500' }}>ข้อมูลประกอบ</Title>
                      <Alert
                        title="ข้อแนะนำในการยื่นคำร้อง"
                        description="คณะกรรมการจะพิจารณาจัดสรรบ้านพักจากระยะทาง ภูมิลำเนา และลักษณะการปฏิบัติงานของท่านเป็นสำคัญ"
                        type="info"
                        showIcon
                        className="bg-white"
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
                        ส่งคำขอเข้าพัก
                      </Button>
                      <Button type="link" block className="mt-2 text-slate-400">
                        ยกเลิก
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

export default Page