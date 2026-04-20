'use client'
import React, { useState } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button,
  Descriptions, Divider, Steps, Form, Input, Select, InputNumber,
  Upload, Row, Col, Alert, Space, Modal, Timeline
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, ToolOutlined, PlusOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, ArrowLeftOutlined, StopOutlined
} from '@ant-design/icons'
import { FaWrench, FaBriefcaseMedical, FaDesktop, FaHistory } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { useRouter, useParams } from 'next/navigation'
import { MOCK_WORK_ORDERS } from '../../dashboard/page'

const { Title, Text } = Typography
const { TextArea } = Input

type WOStatus = 'pending' | 'in_progress' | 'waiting_parts' | 'done'

const STATUS_STEPS: Record<WOStatus, number> = { pending: 0, in_progress: 1, waiting_parts: 2, done: 3 }
const TYPE_LABEL: Record<string, string> = { maintenance: 'ซ่อมบำรุงทั่วไป', medical: 'เครื่องมือแพทย์', it: 'คอมพิวเตอร์ IT' }
const TYPE_ICON: Record<string, React.ReactNode> = {
  maintenance: <FaWrench style={{ color: '#f59e0b' }} />,
  medical:     <FaBriefcaseMedical style={{ color: '#ef4444' }} />,
  it:          <FaDesktop style={{ color: '#a78bfa' }} />,
}

const MOCK_TIMELINE = [
  { time: '2026-04-01 08:30', action: 'ได้รับคำขอแจ้งซ่อม', by: 'ระบบ', color: 'gray' },
  { time: '2026-04-01 09:15', action: 'มอบหมายช่างผู้รับผิดชอบ', by: 'นายสมชัย หัวหน้าช่าง', color: 'blue' },
  { time: '2026-04-02 10:00', action: 'ช่างออกตรวจสอบหน้างาน พบว่า electrode module เสีย', by: 'นายวิชัย เครื่องมือดี', color: 'blue' },
  { time: '2026-04-03 14:20', action: 'สร้างใบขอซื้ออะไหล่ PR-2026-001 (฿15,000)', by: 'นายวิชัย เครื่องมือดี', color: 'orange' },
  { time: '2026-04-04 09:00', action: 'PR-2026-001 ได้รับการอนุมัติ', by: 'นายธนกฤต ผู้อำนวยการ', color: 'green' },
]

const TECHS = ['นายวิชัย เครื่องมือดี', 'นายเทคโน สมาร์ท', 'นายสมศักดิ์ แอร์เย็น', 'นางสาวมาลี อุปกรณ์ดี']

export default function WorkOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const wo = MOCK_WORK_ORDERS.find(w => w.id === id) ?? MOCK_WORK_ORDERS[0]
  const [status, setStatus] = useState<WOStatus>(wo.status as WOStatus)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [irreparableOpen, setIrreparableOpen] = useState(false)
  const [form] = Form.useForm()
  const [closeForm] = Form.useForm()

  const currentStep = STATUS_STEPS[status]

  const urgencyColor: Record<string, string> = { normal: 'default', urgent: 'warning', critical: 'error' }
  const urgencyLabel: Record<string, string> = { normal: 'ปกติ', urgent: 'ด่วน', critical: 'ด่วนมาก' }

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general/maintenance/dashboard', title: 'Dashboard งานซ่อม' },
            { href: '/general/maintenance/work-order', title: 'ใบสั่งงานซ่อม' },
            { title: wo.id },
          ]} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
              <span style={{ fontSize: 20 }}>{TYPE_ICON[wo.type]}</span>
              <Title level={4} style={{ margin: 0, color: '#f1f5f9' }}>{wo.id}</Title>
              <Tag color={urgencyColor[wo.urgency]}>{urgencyLabel[wo.urgency]}</Tag>
            </div>
            <Space>
              {status === 'pending' && (
                <Button type="primary" icon={<ToolOutlined />} onClick={() => setStatus('in_progress')}>
                  รับงาน / เริ่มซ่อม
                </Button>
              )}
              {(status === 'in_progress' || status === 'waiting_parts') && (
                <Button danger icon={<StopOutlined />} onClick={() => setIrreparableOpen(true)}>
                  ซ่อมไม่ได้ / เสนอซื้อทดแทน
                </Button>
              )}
              {(status === 'in_progress' || status === 'waiting_parts') && (
                <Button type="primary" style={{ background: '#16a34a' }} icon={<CheckCircleOutlined />} onClick={() => setCloseModalOpen(true)}>
                  ปิดงาน / เสร็จสิ้น
                </Button>
              )}
            </Space>
          </div>

          {/* Progress Steps */}
          <Card style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}>
            <Steps
              current={currentStep}
              items={[
                { title: 'รอรับงาน',   icon: <ClockCircleOutlined /> },
                { title: 'กำลังซ่อม',  icon: <ToolOutlined /> },
                { title: 'รออะไหล่',   icon: <ExclamationCircleOutlined /> },
                { title: 'เสร็จสิ้น',  icon: <CheckCircleOutlined /> },
              ]}
            />
          </Card>

          <Row gutter={16}>
            {/* Left column */}
            <Col xs={24} lg={16}>
              {/* Work Order Info */}
              <Card title="รายละเอียดใบสั่งงาน" style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
                styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
                <Descriptions column={2} size="small" styles={{ label: { color: '#94a3b8' }, content: { color: '#e2e8f0' } }}>
                  <Descriptions.Item label="เลขที่ใบงาน">{wo.id}</Descriptions.Item>
                  <Descriptions.Item label="อ้างอิงคำขอ">{wo.reqId}</Descriptions.Item>
                  <Descriptions.Item label="ประเภทงาน">{TYPE_LABEL[wo.type]}</Descriptions.Item>
                  <Descriptions.Item label="วันที่สร้าง">{wo.createdDate}</Descriptions.Item>
                  <Descriptions.Item label="ครุภัณฑ์" span={2}>
                    <Text style={{ color: '#FF6500', fontWeight: 600 }}>{wo.assetNo || '—'}</Text>
                    {' '}{wo.assetName}
                  </Descriptions.Item>
                  <Descriptions.Item label="หน่วยงาน">{wo.department}</Descriptions.Item>
                  <Descriptions.Item label="สถานที่">{wo.location}</Descriptions.Item>
                  <Descriptions.Item label="อาการที่แจ้ง" span={2}>
                    <Text style={{ color: '#fbbf24' }}>{wo.symptom}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Technician Section */}
              <Card title="บันทึกการวินิจฉัยและซ่อม" style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
                styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
                <Form form={form} layout="vertical">
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="ช่างผู้รับผิดชอบ" name="tech" initialValue={wo.tech}>
                        <Select options={TECHS.map(t => ({ label: t, value: t }))} placeholder="เลือกช่าง" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="วันที่ซ่อมเสร็จ" name="completedDate">
                        <Input type="date" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="ผลการวินิจฉัย / สาเหตุที่พบ" name="diagnosis" initialValue={wo.diagnosis}>
                    <TextArea rows={3} placeholder="ระบุสาเหตุที่พบ วิธีการแก้ไข และผลการซ่อม..." />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col xs={24} sm={8}>
                      <Form.Item label="ชั่วโมงแรงงาน" name="laborHours" initialValue={wo.laborHours}>
                        <InputNumber min={0} step={0.5} addonAfter="ชม." style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="ค่าแรง (฿)" name="laborCost" initialValue={wo.laborCost}>
                        <InputNumber min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="ค่าอะไหล่ (฿)" name="partsCost" initialValue={wo.partsCost}>
                        <InputNumber min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="รูปภาพหลังซ่อม" name="photos">
                    <Upload listType="picture-card" beforeUpload={() => false} maxCount={4}>
                      <div><PlusOutlined /><div style={{ marginTop: 4, fontSize: 12 }}>เพิ่มรูป</div></div>
                    </Upload>
                  </Form.Item>
                  <Button type="primary" onClick={() => form.submit()}>บันทึกข้อมูล</Button>
                </Form>
              </Card>
            </Col>

            {/* Right column */}
            <Col xs={24} lg={8}>
              {/* Cost Summary */}
              <Card title="สรุปค่าใช้จ่าย" style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
                styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
                {[
                  { label: 'ค่าแรง',   value: wo.laborCost,  color: '#60a5fa' },
                  { label: 'ค่าอะไหล่', value: wo.partsCost, color: '#f59e0b' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
                    <Text style={{ color: '#94a3b8' }}>{r.label}</Text>
                    <Text style={{ color: r.color, fontWeight: 600 }}>฿{r.value.toLocaleString()}</Text>
                  </div>
                ))}
                <Divider style={{ borderColor: '#334155', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#e2e8f0', fontWeight: 700 }}>รวมทั้งสิ้น</Text>
                  <Text style={{ color: '#a78bfa', fontWeight: 700, fontSize: 18 }}>
                    ฿{wo.totalCost.toLocaleString()}
                  </Text>
                </div>
              </Card>

              {/* Timeline */}
              <Card title={<span><FaHistory style={{ marginRight: 6 }} />ประวัติการดำเนินการ</span>}
                style={{ background: '#1e293b', border: '1px solid #334155' }}
                styles={{ header: { borderBottom: '1px solid #334155', color: '#e2e8f0' } }}>
                <Timeline
                  items={MOCK_TIMELINE.map(t => ({
                    color: t.color,
                    children: (
                      <div>
                        <Text style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{t.time}</Text>
                        <Text style={{ fontSize: 13, color: '#e2e8f0' }}>{t.action}</Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>โดย: {t.by}</Text>
                      </div>
                    )
                  }))}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* Close Modal */}
      <Modal
        title={<span><CheckCircleOutlined style={{ color: '#16a34a', marginRight: 8 }} />ยืนยันปิดงานซ่อม</span>}
        open={closeModalOpen}
        onCancel={() => { setCloseModalOpen(false); closeForm.resetFields() }}
        onOk={() => { setStatus('done'); setCloseModalOpen(false) }}
        okText="ปิดงาน"
        okButtonProps={{ style: { background: '#16a34a' } }}
      >
        <Form form={closeForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="สรุปผลการซ่อม" name="summary" rules={[{ required: true, message: 'กรุณาระบุสรุปผล' }]}>
            <TextArea rows={3} placeholder="ระบุผลการซ่อมที่ดำเนินการ และสภาพอุปกรณ์หลังซ่อม..." />
          </Form.Item>
          <Form.Item label="ผู้รับมอบงาน (ผู้ใช้เซ็นรับ)" name="receivedBy" rules={[{ required: true }]}>
            <Input placeholder="ชื่อ-นามสกุล ผู้รับมอบ" />
          </Form.Item>
        </Form>
      </Modal>
      {/* Irreparable / Replacement Modal */}
      <Modal
        title={<span style={{ color: '#ef4444' }}><StopOutlined style={{ marginRight: 8 }} />แจ้งซ่อมไม่ได้ — เสนอซื้อทดแทน</span>}
        open={irreparableOpen}
        onCancel={() => { setIrreparableOpen(false) }}
        onOk={() => {
          setStatus('done')
          setIrreparableOpen(false)
          router.push(`/general/assets/replacement-request?woId=${wo.id}&assetNo=${wo.assetNo}&assetName=${encodeURIComponent(wo.assetName)}`)
        }}
        okText="ยืนยัน — ดำเนินการส่งคืน & เสนอซื้อทดแทน"
        okButtonProps={{ danger: true }}
        width={560}
      >
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16, marginTop: 12 }}
          message="การดำเนินการนี้จะ:"
          description={
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              <li>บันทึกสถานะครุภัณฑ์ว่า <b>"ซ่อมไม่ได้"</b></li>
              <li>สร้างใบ <b>เสนอซื้อทดแทน</b> อัตโนมัติ</li>
              <li>นำไปยังหน้า <b>ส่งคืนครุภัณฑ์</b> เพื่อบันทึก Chain of Custody</li>
              <li>พัสดุจะต้องรับครุภัณฑ์เข้าคลังและออก QR ติดตาม</li>
            </ul>
          }
        />
        <Form layout="vertical">
          <Form.Item label="สาเหตุที่ซ่อมไม่ได้" name="reason" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="อธิบายเหตุผลที่ซ่อมไม่ได้อย่างละเอียด เช่น อะไหล่หมดการผลิต ค่าซ่อมเกินราคาตลาด โครงสร้างเสียหายรุนแรง..." />
          </Form.Item>
          <Form.Item label="ราคาทดแทนประมาณ (฿)" name="estimatedReplacement">
            <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="ราคาครุภัณฑ์ทดแทนโดยประมาณ" />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}
