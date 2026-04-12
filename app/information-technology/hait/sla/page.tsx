'use client'
import React, { useState } from 'react'
import {
  Table, Input, Button, Space, ConfigProvider, Card, Tag, Drawer, Form,
  Select, Breadcrumb, message, Tooltip, Row, Col, Statistic, InputNumber,
  Tabs, Progress, Typography, Divider, DatePicker, theme
} from 'antd'
import {
  EditOutlined, DeleteOutlined, SearchOutlined, PlusOutlined, HomeOutlined,
  DesktopOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  SaveOutlined, FileTextOutlined
} from '@ant-design/icons'
import Navbar from '../../../components/Navbar'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface SLAItem {
  id: number
  service: string
  category: string
  target: string
  targetMinutes: number
  description: string
  status: 'active' | 'draft' | 'suspended'
  announcedDate: string
}

interface SLALog {
  id: number
  slaId: number
  service: string
  incidentDate: string
  reportedAt: string
  resolvedAt: string
  actualMinutes: number
  targetMinutes: number
  met: boolean
  note: string
}

const initialSLAs: SLAItem[] = [
  { id: 1, service: 'ระบบ HIS หลักล่ม', category: 'ระบบหลัก', target: '< 30 นาที', targetMinutes: 30, description: 'กรณีระบบ HIS หลักไม่สามารถใช้งานได้ ต้องแก้ไขภายใน 30 นาที', status: 'active', announcedDate: '01/01/2026' },
  { id: 2, service: 'เครือข่ายภายในขัดข้อง', category: 'เครือข่าย', target: '< 1 ชั่วโมง', targetMinutes: 60, description: 'กรณีเครือข่าย LAN ขัดข้อง ต้องแก้ไขภายใน 1 ชั่วโมง', status: 'active', announcedDate: '01/01/2026' },
  { id: 3, service: 'ขอรหัสผ่านใหม่', category: 'บัญชีผู้ใช้', target: '< 4 ชั่วโมง', targetMinutes: 240, description: 'คำขอรีเซ็ตรหัสผ่านต้องดำเนินการแล้วเสร็จภายใน 4 ชั่วโมง', status: 'active', announcedDate: '01/01/2026' },
  { id: 4, service: 'ซ่อมแซมคอมพิวเตอร์ทั่วไป', category: 'ฮาร์ดแวร์', target: '< 2 วันทำการ', targetMinutes: 960, description: 'งานซ่อมคอมพิวเตอร์ทั่วไปที่ไม่ใช่งานเร่งด่วน ต้องแล้วเสร็จภายใน 2 วันทำการ', status: 'active', announcedDate: '01/01/2026' },
]

const initialLogs: SLALog[] = [
  { id: 1, slaId: 1, service: 'ระบบ HIS หลักล่ม', incidentDate: '05/04/2026', reportedAt: '08:15', resolvedAt: '08:38', actualMinutes: 23, targetMinutes: 30, met: true, note: 'Restart service สำเร็จ' },
  { id: 2, slaId: 2, service: 'เครือข่ายภายในขัดข้อง', incidentDate: '07/04/2026', reportedAt: '13:10', resolvedAt: '14:30', actualMinutes: 80, targetMinutes: 60, met: false, note: 'Switch เสีย รอเปลี่ยนอุปกรณ์' },
  { id: 3, slaId: 3, service: 'ขอรหัสผ่านใหม่', incidentDate: '08/04/2026', reportedAt: '09:00', resolvedAt: '10:15', actualMinutes: 75, targetMinutes: 240, met: true, note: '' },
]

const categoryOptions = [
  { label: 'ระบบหลัก', value: 'ระบบหลัก' },
  { label: 'เครือข่าย', value: 'เครือข่าย' },
  { label: 'บัญชีผู้ใช้', value: 'บัญชีผู้ใช้' },
  { label: 'ฮาร์ดแวร์', value: 'ฮาร์ดแวร์' },
  { label: 'ซอฟต์แวร์', value: 'ซอฟต์แวร์' },
  { label: 'อื่นๆ', value: 'อื่นๆ' },
]

const statusOptions = [
  { label: 'ประกาศใช้งาน', value: 'active' },
  { label: 'ร่าง', value: 'draft' },
  { label: 'ระงับใช้', value: 'suspended' },
]

const getStatusTag = (status: string) => {
  switch (status) {
    case 'active': return <Tag color="success">ประกาศใช้งาน</Tag>
    case 'draft': return <Tag color="default">ร่าง</Tag>
    case 'suspended': return <Tag color="warning">ระงับใช้</Tag>
    default: return <Tag>{status}</Tag>
  }
}

export default function SLAPage() {
  const [slas, setSlas] = useState<SLAItem[]>(initialSLAs)
  const [logs, setLogs] = useState<SLALog[]>(initialLogs)
  const [searchText, setSearchText] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false)
  const [editingSLA, setEditingSLA] = useState<SLAItem | null>(null)
  const [form] = Form.useForm()
  const [logForm] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const filteredSLAs = slas.filter(s =>
    s.service.toLowerCase().includes(searchText.toLowerCase()) ||
    s.category.includes(searchText)
  )

  const activeCount = slas.filter(s => s.status === 'active').length
  const metCount = logs.filter(l => l.met).length
  const slaMetRate = logs.length > 0 ? Math.round((metCount / logs.length) * 100) : 0

  const openAddDrawer = () => {
    setEditingSLA(null)
    form.resetFields()
    setIsDrawerOpen(true)
  }

  const openEditDrawer = (sla: SLAItem) => {
    setEditingSLA(sla)
    form.setFieldsValue({ ...sla })
    setIsDrawerOpen(true)
  }

  const handleDeleteSLA = (sla: SLAItem) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ต้องการลบ SLA "${sla.service}" ใช่หรือไม่`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }).then(result => {
      if (result.isConfirmed) {
        setSlas(prev => prev.filter(s => s.id !== sla.id))
        messageApi.success('ลบ SLA เรียบร้อยแล้ว')
      }
    })
  }

  const handleSaveSLA = (values: any) => {
    if (editingSLA) {
      setSlas(prev => prev.map(s => s.id === editingSLA.id ? { ...s, ...values } : s))
      messageApi.success('แก้ไข SLA เรียบร้อยแล้ว')
    } else {
      setSlas(prev => [...prev, { id: Date.now(), ...values }])
      messageApi.success('เพิ่ม SLA เรียบร้อยแล้ว')
    }
    setIsDrawerOpen(false)
    form.resetFields()
  }

  const handleSaveLog = (values: any) => {
    const slaItem = slas.find(s => s.id === values.slaId)
    const newLog: SLALog = {
      id: Date.now(),
      slaId: values.slaId,
      service: slaItem?.service || '-',
      incidentDate: values.incidentDate ? values.incidentDate.format('DD/MM/YYYY') : '',
      reportedAt: values.reportedAt,
      resolvedAt: values.resolvedAt,
      actualMinutes: values.actualMinutes,
      targetMinutes: slaItem?.targetMinutes || 0,
      met: values.actualMinutes <= (slaItem?.targetMinutes || 0),
      note: values.note || '',
    }
    setLogs(prev => [newLog, ...prev])
    messageApi.success('บันทึกผล SLA เรียบร้อยแล้ว')
    setIsLogDrawerOpen(false)
    logForm.resetFields()
  }

  const slaColumns = [
    {
      title: 'บริการ / กิจกรรม',
      dataIndex: 'service',
      key: 'service',
      render: (service: string, record: SLAItem) => (
        <div>
          <div className="font-medium">{service}</div>
          <div className="text-xs text-gray-400">{record.description}</div>
        </div>
      ),
    },
    { title: 'หมวดหมู่', dataIndex: 'category', key: 'category', render: (c: string) => <Tag color="blue">{c}</Tag> },
    { title: 'เป้าหมาย SLA', dataIndex: 'target', key: 'target', render: (t: string) => <Text strong>{t}</Text> },
    { title: 'วันที่ประกาศ', dataIndex: 'announcedDate', key: 'announcedDate' },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', render: getStatusTag },
    {
      title: 'จัดการ',
      key: 'action',
      width: 90,
      render: (_: any, record: SLAItem) => (
        <Space>
          <Tooltip title="แก้ไข"><Button type="text" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} /></Tooltip>
          <Tooltip title="ลบ"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSLA(record)} /></Tooltip>
        </Space>
      ),
    },
  ]

  const logColumns = [
    { title: 'วันที่', dataIndex: 'incidentDate', key: 'incidentDate' },
    {
      title: 'บริการ',
      dataIndex: 'service',
      key: 'service',
      render: (s: string) => <Text strong>{s}</Text>
    },
    {
      title: 'เวลาแจ้ง → แก้ไข',
      key: 'time',
      render: (_: any, r: SLALog) => <span>{r.reportedAt} → {r.resolvedAt}</span>,
    },
    {
      title: 'เวลาที่ใช้',
      key: 'actual',
      render: (_: any, r: SLALog) => (
        <span className={r.met ? 'text-green-400' : 'text-red-400'}>
          {r.actualMinutes} นาที
        </span>
      ),
    },
    {
      title: 'ผล SLA',
      key: 'met',
      render: (_: any, r: SLALog) => r.met
        ? <Tag icon={<CheckCircleOutlined />} color="success">ผ่าน</Tag>
        : <Tag icon={<WarningOutlined />} color="error">ไม่ผ่าน</Tag>,
    },
    { title: 'หมายเหตุ', dataIndex: 'note', key: 'note', render: (n: string) => n || '-' },
  ]

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6B21A8', borderRadius: 8 } }}>
      {contextHolder}
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { href: '/information-technology', title: <><DesktopOutlined /> งานคอมพิวเตอร์ฯ</> },
              { href: '/information-technology/hait', title: 'HAIT ข้อ 4' },
              { title: 'Service Level Agreement (SLA)' },
            ]}
            className="mb-6"
          />

          <div className="w-full">
            <div className="mb-8">
              <Title level={2} style={{ color: '#a855f7', margin: 0 }}>Service Level Agreement (SLA)</Title>
              <Text type="secondary">HAIT 4.2 กำหนด SLA | 4.3 ติดตามผลการดำเนินการตาม SLA</Text>
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #a855f7' }}>
                  <Statistic title="SLA ทั้งหมด" value={slas.length} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #22c55e' }}>
                  <Statistic title="ประกาศใช้งาน" value={activeCount} styles={{ content: { color: '#22c55e' } }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #3b82f6' }}>
                  <Statistic title="บันทึกผล" value={logs.length} suffix="ครั้ง" />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: `3px solid ${slaMetRate >= 80 ? '#22c55e' : '#ef4444'}` }}>
                  <Statistic
                    title="อัตราผ่าน SLA"
                    value={slaMetRate}
                    suffix="%"
                    styles={{ content: { color: slaMetRate >= 80 ? '#22c55e' : '#ef4444' } }}
                  />
                </Card>
              </Col>
            </Row>

            <Tabs
              defaultActiveKey="sla"
              items={[
                {
                  key: 'sla',
                  label: <span><FileTextOutlined /> รายการ SLA (4.2)</span>,
                  children: (
                    <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                      <div className="mb-4 flex flex-col sm:flex-row gap-3 justify-between">
                        <Input
                          placeholder="ค้นหา SLA..."
                          prefix={<SearchOutlined />}
                          allowClear
                          onChange={e => setSearchText(e.target.value)}
                          style={{ maxWidth: 300 }}
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
                          เพิ่ม SLA ใหม่
                        </Button>
                      </div>
                      <Table
                        columns={slaColumns}
                        dataSource={filteredSLAs}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                      />
                    </Card>
                  )
                },
                {
                  key: 'log',
                  label: <span><ClockCircleOutlined /> บันทึกผล SLA (4.3)</span>,
                  children: (
                    <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                      <div className="mb-4 flex justify-between items-center">
                        <div>
                          <Text type="secondary">อัตราการผ่าน SLA รวม</Text>
                          <Progress
                            percent={slaMetRate}
                            strokeColor={slaMetRate >= 80 ? '#22c55e' : '#ef4444'}
                            railColor="#334155"
                            style={{ width: 300, marginTop: 4 }}
                          />
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsLogDrawerOpen(true)}>
                          บันทึกผล SLA
                        </Button>
                      </div>
                      <Table
                        columns={logColumns}
                        dataSource={logs}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                      />
                    </Card>
                  )
                }
              ]}
            />
          </div>
        </div>
      </div>

      {/* SLA Form Drawer */}
      <Drawer
        title={editingSLA ? 'แก้ไข SLA' : 'เพิ่ม SLA ใหม่'}
        open={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); form.resetFields() }}
        size="large"
        footer={
          <Space className="float-right">
            <Button onClick={() => { setIsDrawerOpen(false); form.resetFields() }}>ยกเลิก</Button>
            <Button type="primary" onClick={() => form.submit()}>บันทึก</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSaveSLA}>
          <Form.Item label="บริการ / กิจกรรม" name="service" rules={[{ required: true, message: 'กรุณาระบุชื่อบริการ' }]}>
            <Input placeholder="เช่น ระบบ HIS หลักล่ม" />
          </Form.Item>
          <Form.Item label="หมวดหมู่" name="category" rules={[{ required: true, message: 'กรุณาเลือกหมวดหมู่' }]}>
            <Select options={categoryOptions} placeholder="เลือกหมวดหมู่" />
          </Form.Item>
          <Form.Item label="เป้าหมาย SLA (แสดงผล)" name="target" rules={[{ required: true, message: 'กรุณาระบุเป้าหมาย' }]}>
            <Input placeholder="เช่น < 30 นาที" />
          </Form.Item>
          <Form.Item label="เป้าหมาย SLA (นาที)" name="targetMinutes" rules={[{ required: true, message: 'กรุณาระบุนาที' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="เช่น 30" />
          </Form.Item>
          <Form.Item label="คำอธิบาย" name="description" rules={[{ required: true, message: 'กรุณาระบุคำอธิบาย' }]}>
            <TextArea rows={3} placeholder="อธิบายเงื่อนไขและขอบเขตของ SLA นี้" />
          </Form.Item>
          <Form.Item label="วันที่ประกาศ" name="announcedDate" rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}>
            <Input placeholder="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="สถานะ" name="status" rules={[{ required: true }]}>
            <Select options={statusOptions} placeholder="เลือกสถานะ" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* SLA Log Drawer */}
      <Drawer
        title="บันทึกผลการดำเนินการตาม SLA"
        open={isLogDrawerOpen}
        onClose={() => { setIsLogDrawerOpen(false); logForm.resetFields() }}
        size="large"
        footer={
          <Space className="float-right">
            <Button onClick={() => { setIsLogDrawerOpen(false); logForm.resetFields() }}>ยกเลิก</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => logForm.submit()}>บันทึก</Button>
          </Space>
        }
      >
        <Form form={logForm} layout="vertical" onFinish={handleSaveLog}>
          <Form.Item label="SLA ที่เกี่ยวข้อง" name="slaId" rules={[{ required: true, message: 'กรุณาเลือก SLA' }]}>
            <Select
              options={slas.filter(s => s.status === 'active').map(s => ({ label: s.service, value: s.id }))}
              placeholder="เลือก SLA"
            />
          </Form.Item>
          <Form.Item label="วันที่เกิดเหตุ" name="incidentDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="เวลาที่แจ้ง" name="reportedAt" rules={[{ required: true, message: 'กรุณาระบุเวลา' }]}>
                <Input placeholder="เช่น 08:15" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="เวลาที่แก้ไขสำเร็จ" name="resolvedAt" rules={[{ required: true, message: 'กรุณาระบุเวลา' }]}>
                <Input placeholder="เช่น 08:38" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="เวลาที่ใช้แก้ไข (นาที)" name="actualMinutes" rules={[{ required: true, message: 'กรุณาระบุจำนวนนาที' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="หมายเหตุ / วิธีแก้ไข" name="note">
            <TextArea rows={3} placeholder="อธิบายสาเหตุและวิธีแก้ไขโดยย่อ" />
          </Form.Item>
        </Form>
      </Drawer>
    </ConfigProvider>
  )
}
