'use client'
import React, { useState } from 'react'
import {
  Table, Input, Button, Space, ConfigProvider, Card, Tag, Drawer, Form,
  Select, Breadcrumb, message, Tooltip, Row, Col, Statistic, DatePicker,
  Typography, Radio, theme
} from 'antd'
import {
  EditOutlined, DeleteOutlined, SearchOutlined, PlusOutlined, HomeOutlined,
  DesktopOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import Navbar from '../../../components/Navbar'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

interface IncidentReport {
  id: number
  incidentNo: string
  reportDate: string
  reportedBy: string
  system: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  impact: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  resolution?: string
  resolvedDate?: string
  isSLARelated: boolean
}

const initialIncidents: IncidentReport[] = [
  {
    id: 1, incidentNo: 'INC-202604-001',
    reportDate: '05/04/2026', reportedBy: 'นายสมชาย ใจดี',
    system: 'ระบบ HIS', category: 'ระบบล่ม',
    severity: 'critical',
    description: 'ระบบ HIS ไม่สามารถเข้าใช้งานได้ ผู้ใช้ทุกแผนกได้รับผลกระทบ',
    impact: 'การให้บริการผู้ป่วยล่าช้า ต้องใช้ระบบสำรอง',
    status: 'resolved', resolution: 'Restart application server และ clear session', resolvedDate: '05/04/2026',
    isSLARelated: true,
  },
  {
    id: 2, incidentNo: 'INC-202604-002',
    reportDate: '07/04/2026', reportedBy: 'นางสาวสุดา รักงาน',
    system: 'เครือข่าย LAN', category: 'เครือข่ายขัดข้อง',
    severity: 'high',
    description: 'เครือข่ายอาคาร IPD ชั้น 3 ไม่สามารถเชื่อมต่อได้',
    impact: 'เจ้าหน้าที่ IPD ชั้น 3 ไม่สามารถใช้งานระบบได้ 5 คน',
    status: 'resolved', resolution: 'เปลี่ยน Switch port และตั้งค่าใหม่', resolvedDate: '07/04/2026',
    isSLARelated: true,
  },
  {
    id: 3, incidentNo: 'INC-202604-003',
    reportDate: '08/04/2026', reportedBy: 'นายวีระ มุ่งมั่น',
    system: 'เครื่องพิมพ์', category: 'ฮาร์ดแวร์',
    severity: 'low',
    description: 'เครื่องพิมพ์ห้องการเงินพิมพ์ไม่ออก',
    impact: 'พิมพ์เอกสารการเงินไม่ได้',
    status: 'in_progress',
    isSLARelated: false,
  },
]

const systemOptions = [
  { label: 'ระบบ HIS', value: 'ระบบ HIS' },
  { label: 'เครือข่าย LAN', value: 'เครือข่าย LAN' },
  { label: 'เครือข่าย WiFi', value: 'เครือข่าย WiFi' },
  { label: 'เซิร์ฟเวอร์', value: 'เซิร์ฟเวอร์' },
  { label: 'คอมพิวเตอร์', value: 'คอมพิวเตอร์' },
  { label: 'เครื่องพิมพ์', value: 'เครื่องพิมพ์' },
  { label: 'ระบบสำรองข้อมูล', value: 'ระบบสำรองข้อมูล' },
  { label: 'อื่นๆ', value: 'อื่นๆ' },
]

const categoryOptions = [
  { label: 'ระบบล่ม', value: 'ระบบล่ม' },
  { label: 'เครือข่ายขัดข้อง', value: 'เครือข่ายขัดข้อง' },
  { label: 'ฮาร์ดแวร์', value: 'ฮาร์ดแวร์' },
  { label: 'ซอฟต์แวร์', value: 'ซอฟต์แวร์' },
  { label: 'ความปลอดภัย', value: 'ความปลอดภัย' },
  { label: 'ข้อมูลผิดพลาด', value: 'ข้อมูลผิดพลาด' },
  { label: 'อื่นๆ', value: 'อื่นๆ' },
]

const statusOptions = [
  { label: 'รับเรื่อง', value: 'open' },
  { label: 'กำลังดำเนินการ', value: 'in_progress' },
  { label: 'แก้ไขแล้ว', value: 'resolved' },
  { label: 'ปิดเรื่อง', value: 'closed' },
]

const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: 'error', label: 'วิกฤต' },
  high: { color: 'warning', label: 'สูง' },
  medium: { color: 'processing', label: 'กลาง' },
  low: { color: 'default', label: 'ต่ำ' },
}

const statusConfig: Record<string, { color: string; label: string }> = {
  open: { color: 'default', label: 'รับเรื่อง' },
  in_progress: { color: 'processing', label: 'กำลังดำเนินการ' },
  resolved: { color: 'success', label: 'แก้ไขแล้ว' },
  closed: { color: 'default', label: 'ปิดเรื่อง' },
}

export default function IncidentReportsPage() {
  const [incidents, setIncidents] = useState<IncidentReport[]>(initialIncidents)
  const [searchText, setSearchText] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingIncident, setEditingIncident] = useState<IncidentReport | null>(null)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const filtered = incidents.filter(i =>
    i.description.toLowerCase().includes(searchText.toLowerCase()) ||
    i.system.includes(searchText) ||
    i.incidentNo.includes(searchText) ||
    i.reportedBy.includes(searchText)
  )

  const openCount = incidents.filter(i => i.status === 'open' || i.status === 'in_progress').length
  const resolvedCount = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length
  const criticalCount = incidents.filter(i => i.severity === 'critical').length
  const slaRelatedCount = incidents.filter(i => i.isSLARelated).length

  const openAddDrawer = () => {
    setEditingIncident(null)
    form.resetFields()
    form.setFieldsValue({ isSLARelated: false, severity: 'medium', status: 'open' })
    setIsDrawerOpen(true)
  }

  const openEditDrawer = (item: IncidentReport) => {
    setEditingIncident(item)
    form.setFieldsValue({ ...item })
    setIsDrawerOpen(true)
  }

  const handleDelete = (item: IncidentReport) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ต้องการลบอุบัติการณ์ ${item.incidentNo} ใช่หรือไม่`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }).then(result => {
      if (result.isConfirmed) {
        setIncidents(prev => prev.filter(i => i.id !== item.id))
        messageApi.success('ลบรายการเรียบร้อยแล้ว')
      }
    })
  }

  const handleSave = (values: any) => {
    if (editingIncident) {
      setIncidents(prev => prev.map(i => i.id === editingIncident.id ? { ...i, ...values } : i))
      messageApi.success('แก้ไขเรียบร้อยแล้ว')
    } else {
      const count = incidents.length + 1
      const newItem: IncidentReport = {
        id: Date.now(),
        incidentNo: `INC-${dayjs().format('YYYYMM')}-${String(count).padStart(3, '0')}`,
        ...values,
        reportDate: values.reportDate ? values.reportDate.format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY'),
        resolvedDate: values.resolvedDate ? values.resolvedDate.format('DD/MM/YYYY') : undefined,
      }
      setIncidents(prev => [newItem, ...prev])
      messageApi.success('บันทึกอุบัติการณ์เรียบร้อยแล้ว')
    }
    setIsDrawerOpen(false)
    form.resetFields()
  }

  const columns = [
    {
      title: 'เลขที่',
      dataIndex: 'incidentNo',
      key: 'incidentNo',
      render: (no: string) => <Text strong className="text-purple-400">{no}</Text>,
      width: 160,
    },
    {
      title: 'วันที่',
      dataIndex: 'reportDate',
      key: 'reportDate',
      width: 110,
    },
    {
      title: 'ระบบ / หัวข้อ',
      key: 'system',
      render: (_: any, r: IncidentReport) => (
        <div>
          <div className="font-medium">{r.system} — {r.category}</div>
          <div className="text-xs text-gray-400 line-clamp-1">{r.description}</div>
        </div>
      ),
    },
    {
      title: 'ความรุนแรง',
      dataIndex: 'severity',
      key: 'severity',
      render: (s: string) => <Tag color={severityConfig[s]?.color}>{severityConfig[s]?.label}</Tag>,
      width: 100,
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusConfig[s]?.color}>{statusConfig[s]?.label}</Tag>,
      width: 130,
    },
    {
      title: 'SLA',
      dataIndex: 'isSLARelated',
      key: 'isSLARelated',
      width: 80,
      render: (v: boolean) => v
        ? <Tag color="purple">SLA</Tag>
        : <Tag color="default">ทั่วไป</Tag>,
    },
    {
      title: 'จัดการ',
      key: 'action',
      width: 90,
      render: (_: any, record: IncidentReport) => (
        <Space>
          <Tooltip title="แก้ไข"><Button type="text" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} /></Tooltip>
          <Tooltip title="ลบ"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} /></Tooltip>
        </Space>
      ),
    },
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
              { title: 'บันทึกอุบัติการณ์' },
            ]}
            className="mb-6"
          />

          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <Title level={2} style={{ color: '#a855f7', margin: 0 }}>บันทึกอุบัติการณ์ระบบ IT</Title>
                <Text type="secondary">HAIT 4.4 — เหตุการณ์ที่ไม่พึงประสงค์ในระบบเทคโนโลยีสารสนเทศ</Text>
              </div>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openAddDrawer}>
                บันทึกอุบัติการณ์ใหม่
              </Button>
            </div>

            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #a855f7' }}>
                  <Statistic title="ทั้งหมด" value={incidents.length} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #ef4444' }}>
                  <Statistic title="วิกฤต" value={criticalCount} styles={{ content: { color: '#ef4444' } }} prefix={<ExclamationCircleOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #f59e0b' }}>
                  <Statistic title="ยังเปิดอยู่" value={openCount} styles={{ content: { color: '#f59e0b' } }} prefix={<ClockCircleOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #22c55e' }}>
                  <Statistic title="แก้ไขแล้ว" value={resolvedCount} styles={{ content: { color: '#22c55e' } }} prefix={<CheckCircleOutlined />} />
                </Card>
              </Col>
            </Row>

            <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
              <div className="mb-4">
                <Input
                  placeholder="ค้นหาด้วยเลขที่, ระบบ, ผู้แจ้ง, หรือรายละเอียด"
                  prefix={<SearchOutlined />}
                  allowClear
                  onChange={e => setSearchText(e.target.value)}
                  style={{ maxWidth: 400 }}
                />
              </div>
              <Table
                columns={columns}
                dataSource={filtered}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                expandable={{
                  expandedRowRender: r => (
                    <div className="p-4 bg-slate-800 rounded-lg">
                      <Row gutter={24}>
                        <Col xs={24} md={12}>
                          <Text type="secondary">ผู้แจ้ง:</Text> <Text>{r.reportedBy}</Text><br />
                          <Text type="secondary">ผลกระทบ:</Text> <Text>{r.impact}</Text>
                        </Col>
                        <Col xs={24} md={12}>
                          {r.resolution && <><Text type="secondary">การแก้ไข:</Text> <Text>{r.resolution}</Text><br /></>}
                          {r.resolvedDate && <><Text type="secondary">วันที่แก้ไข:</Text> <Text>{r.resolvedDate}</Text></>}
                        </Col>
                      </Row>
                    </div>
                  )
                }}
              />
            </Card>
          </div>
        </div>
      </div>

      <Drawer
        title={editingIncident ? 'แก้ไขอุบัติการณ์' : 'บันทึกอุบัติการณ์ใหม่'}
        open={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); form.resetFields() }}
        width={540}
        footer={
          <Space className="float-right">
            <Button onClick={() => { setIsDrawerOpen(false); form.resetFields() }}>ยกเลิก</Button>
            <Button type="primary" onClick={() => form.submit()}>บันทึก</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="วันที่เกิดเหตุ" name="reportDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="ผู้แจ้ง" name="reportedBy" rules={[{ required: true, message: 'กรุณาระบุผู้แจ้ง' }]}>
            <Input placeholder="ชื่อ-นามสกุล ผู้แจ้งเหตุ" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ระบบที่เกิดปัญหา" name="system" rules={[{ required: true }]}>
                <Select options={systemOptions} placeholder="เลือกระบบ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ประเภทปัญหา" name="category" rules={[{ required: true }]}>
                <Select options={categoryOptions} placeholder="เลือกประเภท" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="ระดับความรุนแรง" name="severity" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid" className="w-full flex">
              <ConfigProvider theme={{ token: { colorPrimary: '#ef4444' } }}>
                <Radio.Button value="critical" className="flex-1 text-center">วิกฤต</Radio.Button>
              </ConfigProvider>
              <ConfigProvider theme={{ token: { colorPrimary: '#f59e0b' } }}>
                <Radio.Button value="high" className="flex-1 text-center">สูง</Radio.Button>
              </ConfigProvider>
              <ConfigProvider theme={{ token: { colorPrimary: '#3b82f6' } }}>
                <Radio.Button value="medium" className="flex-1 text-center">กลาง</Radio.Button>
              </ConfigProvider>
              <ConfigProvider theme={{ token: { colorPrimary: '#6b7280' } }}>
                <Radio.Button value="low" className="flex-1 text-center">ต่ำ</Radio.Button>
              </ConfigProvider>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="รายละเอียดปัญหา" name="description" rules={[{ required: true, message: 'กรุณาระบุรายละเอียด' }]}>
            <TextArea rows={3} placeholder="อธิบายอาการและรายละเอียดของปัญหา" />
          </Form.Item>
          <Form.Item label="ผลกระทบ" name="impact" rules={[{ required: true, message: 'กรุณาระบุผลกระทบ' }]}>
            <TextArea rows={2} placeholder="ระบุผลกระทบต่อการให้บริการ" />
          </Form.Item>
          <Form.Item label="เกี่ยวข้องกับ SLA" name="isSLARelated">
            <Radio.Group>
              <Radio value={true}>เป็นรายการ SLA</Radio>
              <Radio value={false}>ไม่ใช่ SLA</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="สถานะ" name="status" rules={[{ required: true }]}>
            <Select options={statusOptions} placeholder="เลือกสถานะ" />
          </Form.Item>
          <Form.Item label="วิธีแก้ไข" name="resolution">
            <TextArea rows={2} placeholder="อธิบายวิธีที่ใช้แก้ไขปัญหา (กรณีแก้ไขแล้ว)" />
          </Form.Item>
          <Form.Item label="วันที่แก้ไขสำเร็จ" name="resolvedDate">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Drawer>
    </ConfigProvider>
  )
}
