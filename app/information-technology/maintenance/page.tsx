'use client'
import { useState } from 'react'
import {
  ConfigProvider, App, theme, Form, Input, Select, Button, Upload, Table, Tag, Tabs,
  Typography, Breadcrumb, Statistic, Row, Col, Card, Tooltip, Badge, Divider, Radio, Modal, Space
} from 'antd'
import {
  DesktopOutlined, ToolOutlined, PaperClipOutlined, PlusOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, HomeOutlined, SearchOutlined, QrcodeOutlined
} from '@ant-design/icons'
import { FaMicrochip, FaPrint, FaLaptop, FaDesktop, FaKeyboard, FaNetworkWired } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { TextArea } = Input

interface RepairRequest {
  id: string
  requestDate: string
  requesterName: string
  department: string
  phone: string
  deviceType: string
  deviceBrand: string
  deviceSerial: string
  symptom: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  attachments?: { name: string; size?: number }[]
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignedTo?: string
  resolvedNote?: string
}

const mockRequests: RepairRequest[] = [
  {
    id: 'IT-2026-001',
    requestDate: '01/04/2026',
    requesterName: 'นายสมชาย ใจดี',
    department: 'งานการเงินและบัญชี',
    phone: '1234',
    deviceType: 'desktop',
    deviceBrand: 'DELL OptiPlex 7090',
    deviceSerial: 'SN-A001234',
    symptom: 'เครื่องไม่ติด กดปุ่ม Power แล้วไฟไม่ขึ้น',
    urgency: 'high',
    status: 'completed',
    assignedTo: 'นายวิชัย คอมดี',
    resolvedNote: 'เปลี่ยน Power Supply แล้ว ใช้งานได้ปกติ',
  },
  {
    id: 'IT-2026-002',
    requestDate: '03/04/2026',
    requesterName: 'นางสาวรัตนา สวยงาม',
    department: 'งานทรัพยากรบุคคล',
    phone: '1102',
    deviceType: 'laptop',
    deviceBrand: 'Lenovo ThinkPad E14',
    deviceSerial: 'SN-B005678',
    symptom: 'หน้าจอมีเส้นดำแนวนอนพาดตลอด และบางครั้งหน้าจอดับเองโดยไม่มีสาเหตุ',
    urgency: 'medium',
    status: 'in_progress',
    assignedTo: 'นายเทคโน สมาร์ท',
  },
  {
    id: 'IT-2026-003',
    requestDate: '05/04/2026',
    requesterName: 'นายประสิทธิ์ เก่งกาจ',
    department: 'งานพัสดุ',
    phone: '1305',
    deviceType: 'printer',
    deviceBrand: 'HP LaserJet Pro M404',
    deviceSerial: 'SN-C009012',
    symptom: 'พิมพ์แล้วกระดาษติดทุกครั้ง ดึงกระดาษออกมาแล้วพิมพ์ใหม่ก็ยังติดอีก',
    urgency: 'medium',
    status: 'pending',
  },
  {
    id: 'IT-2026-004',
    requestDate: '08/04/2026',
    requesterName: 'นางสาวมาลี รักษ์ดี',
    department: 'งานบริหารทั่วไป',
    phone: '1201',
    deviceType: 'desktop',
    deviceBrand: 'Acer Veriton M6690G',
    deviceSerial: 'SN-D003456',
    symptom: 'เครื่องช้ามาก เปิดโปรแกรมนานมาก บางครั้งค้างจนต้องรีสตาร์ท',
    urgency: 'low',
    status: 'pending',
  },
  {
    id: 'IT-2026-005',
    requestDate: '10/04/2026',
    requesterName: 'นายอนุชา ดูแลดี',
    department: 'งานพัฒนาบุคลากร',
    phone: '1410',
    deviceType: 'scanner',
    deviceBrand: 'Canon DR-C225W',
    deviceSerial: 'SN-E007890',
    symptom: 'สแกนเนอร์ไม่พบอุปกรณ์จากคอมพิวเตอร์ ลองเปลี่ยนสาย USB แล้วยังไม่ได้',
    urgency: 'high',
    status: 'pending',
  },
]

// ─── Mock IT asset database ───────────────────────────────────────────────────
const MOCK_IT_ASSETS = [
  { assetNo: 'IT-67-001', name: 'DELL OptiPlex 7090 SFF',           type: 'desktop',    department: 'งานการเงินและบัญชี',   location: 'ห้องการเงิน ชั้น 2',        serialNo: 'SN-A001234', status: 'ปกติ' },
  { assetNo: 'IT-67-002', name: 'HP LaserJet Pro M404dn',           type: 'printer',    department: 'งาน HR',               location: 'ห้อง HR ชั้น 2',            serialNo: 'SN-B005678', status: 'ปกติ' },
  { assetNo: 'IT-67-003', name: 'Lenovo ThinkPad E14 Gen 4',        type: 'laptop',     department: 'งานทรัพยากรบุคคล',    location: 'ห้อง HR ชั้น 2',            serialNo: 'SN-C009012', status: 'ปกติ' },
  { assetNo: 'IT-66-001', name: 'Canon DR-C225W Scanner',           type: 'scanner',    department: 'งานเวชระเบียน',        location: 'ห้องเวชระเบียน ชั้น 1',     serialNo: 'SN-D003456', status: 'เสื่อมสภาพ' },
  { assetNo: 'IT-66-002', name: 'Cisco Catalyst 2960-X Switch',     type: 'network',    department: 'งานคอมพิวเตอร์ IT',   location: 'ห้อง Server ชั้น 2',        serialNo: 'SN-E007890', status: 'ปกติ' },
  { assetNo: 'IT-67-004', name: 'Acer Veriton M6690G',              type: 'desktop',    department: 'งานบริหารทั่วไป',      location: 'ห้องธุรการ ชั้น 1',         serialNo: 'SN-F001122', status: 'ปกติ' },
  { assetNo: 'IT-67-005', name: 'HP LaserJet Enterprise M507dn',    type: 'printer',    department: 'งานพัสดุ',             location: 'ห้องพัสดุ ชั้น 1',          serialNo: 'SN-G003344', status: 'ชำรุด' },
  { assetNo: 'IT-65-001', name: 'Dell Latitude 5520',               type: 'laptop',     department: 'งานพัฒนาบุคลากร',     location: 'ห้องฝึกอบรม ชั้น 3',        serialNo: 'SN-H005566', status: 'ปกติ' },
  { assetNo: 'IT-66-003', name: 'Fujitsu fi-7160 Scanner',          type: 'scanner',    department: 'งานเวชระเบียน',        location: 'ห้องเวชระเบียน ชั้น 1',     serialNo: 'SN-I007788', status: 'ปกติ' },
  { assetNo: 'IT-67-006', name: 'TP-Link TL-SG108E Switch 8-Port',  type: 'network',    department: 'งานการพยาบาล OPD',     location: 'ห้องเซิร์ฟเวอร์ OPD',      serialNo: 'SN-J009900', status: 'ปกติ' },
  { assetNo: 'IT-65-002', name: 'HP ProDesk 400 G7',                type: 'desktop',    department: 'งานอุบัติเหตุ ER',     location: 'เคาน์เตอร์ ER',             serialNo: 'SN-K001234', status: 'ปกติ' },
  { assetNo: 'IT-67-007', name: 'APC Smart-UPS 1500VA',             type: 'peripheral', department: 'งานคอมพิวเตอร์ IT',   location: 'ห้อง Server ชั้น 2',        serialNo: 'SN-L005678', status: 'เสื่อมสภาพ' },
  { assetNo: 'IT-66-004', name: 'Samsung 27" Curved Monitor CF396', type: 'peripheral', department: 'งานเวชระเบียน',        location: 'เคาน์เตอร์เวชระเบียน',      serialNo: 'SN-M002233', status: 'ปกติ' },
  { assetNo: 'IT-67-008', name: 'ASUS ExpertBook B1 B1400',         type: 'laptop',     department: 'งานบริหารทั่วไป',      location: 'ห้องประชุมชั้น 3',          serialNo: 'SN-N004455', status: 'ปกติ' },
  { assetNo: 'IT-65-003', name: 'Brother MFC-L5750DW',              type: 'printer',    department: 'งานเวชระเบียน',        location: 'ห้องเวชระเบียน ชั้น 1',     serialNo: 'SN-O006677', status: 'ชำรุด' },
  { assetNo: 'IT-67-009', name: 'Ubiquiti UniFi AP AC Pro',         type: 'network',    department: 'งานคอมพิวเตอร์ IT',   location: 'ชั้น 2 โซน A',              serialNo: 'SN-P008899', status: 'ปกติ' },
]

const IT_ASSET_STATUS_COLOR: Record<string, string> = {
  'ปกติ': 'success', 'ชำรุด': 'error', 'เสื่อมสภาพ': 'warning'
}

const deviceTypeOptions = [
  { value: 'desktop', label: 'คอมพิวเตอร์ตั้งโต๊ะ', icon: <FaDesktop /> },
  { value: 'laptop', label: 'โน้ตบุ๊ก / แล็ปท็อป', icon: <FaLaptop /> },
  { value: 'printer', label: 'เครื่องพิมพ์', icon: <FaPrint /> },
  { value: 'scanner', label: 'สแกนเนอร์', icon: <FaMicrochip /> },
  { value: 'network', label: 'อุปกรณ์เครือข่าย (Switch/Router)', icon: <FaNetworkWired /> },
  { value: 'peripheral', label: 'อุปกรณ์ต่อพ่วง (คีย์บอร์ด/เมาส์/จอ)', icon: <FaKeyboard /> },
  { value: 'other', label: 'อื่นๆ', icon: <ToolOutlined /> },
]

const urgencyConfig = {
  low: { color: 'default', label: 'ปกติ', textColor: '#94a3b8' },
  medium: { color: 'processing', label: 'ปานกลาง', textColor: '#60a5fa' },
  high: { color: 'warning', label: 'เร่งด่วน', textColor: '#fbbf24' },
  critical: { color: 'error', label: 'วิกฤต', textColor: '#f87171' },
}

const statusConfig = {
  pending: { color: 'warning', label: 'รอดำเนินการ', icon: <ClockCircleOutlined /> },
  in_progress: { color: 'processing', label: 'กำลังซ่อม', icon: <ToolOutlined /> },
  completed: { color: 'success', label: 'ซ่อมเสร็จแล้ว', icon: <CheckCircleOutlined /> },
  cancelled: { color: 'error', label: 'ยกเลิก', icon: <CloseCircleOutlined /> },
}

const PageContent = () => {
  const [form] = Form.useForm()
  const [requests, setRequests] = useState<RepairRequest[]>(mockRequests)
  const [activeTab, setActiveTab] = useState('form')
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const { message } = App.useApp()

  const filteredItAssets = assetSearch.trim()
    ? MOCK_IT_ASSETS.filter(a =>
        a.assetNo.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.department.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.serialNo.toLowerCase().includes(assetSearch.toLowerCase())
      )
    : MOCK_IT_ASSETS

  const handleSelectItAsset = (asset: typeof MOCK_IT_ASSETS[0]) => {
    form.setFieldsValue({
      deviceSerial: asset.serialNo,
      deviceBrand:  asset.name,
      deviceType:   asset.type,
    })
    setAssetModalOpen(false)
    setAssetSearch('')
  }

  const onFinish = (values: any) => {
    const newReq: RepairRequest = {
      id: `IT-2026-${String(requests.length + 1).padStart(3, '0')}`,
      requestDate: new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      requesterName: values.requesterName,
      department: values.department,
      phone: values.phone,
      deviceType: values.deviceType,
      deviceBrand: values.deviceBrand ?? '',
      deviceSerial: values.deviceSerial ?? '',
      symptom: values.symptom,
      urgency: values.urgency,
      attachments: (values.attachments ?? []).map((f: any) => ({ name: f.name, size: f.size })),
      status: 'pending',
    }
    setRequests((prev) => [newReq, ...prev])
    form.resetFields()
    setActiveTab('status')
    message.success('ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว')
  }

  const pending = requests.filter((r) => r.status === 'pending').length
  const inProgress = requests.filter((r) => r.status === 'in_progress').length
  const completed = requests.filter((r) => r.status === 'completed').length

  const columns = [
    {
      title: 'เลขที่',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      render: (v: string) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'วันที่แจ้ง',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 110,
    },
    {
      title: 'ผู้แจ้ง',
      dataIndex: 'requesterName',
      key: 'requesterName',
      width: 160,
      render: (v: string, r: RepairRequest) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v}</div>
          <Text style={{ fontSize: 12, color: '#94a3b8' }}>{r.department}</Text>
        </div>
      ),
    },
    {
      title: 'อุปกรณ์',
      key: 'device',
      width: 180,
      render: (_: unknown, r: RepairRequest) => {
        const dt = deviceTypeOptions.find((d) => d.value === r.deviceType)
        return (
          <div>
            <Tag color="purple" style={{ marginBottom: 4 }}>{dt?.label ?? r.deviceType}</Tag>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.deviceBrand || '-'}</div>
          </div>
        )
      },
    },
    {
      title: 'อาการ',
      dataIndex: 'symptom',
      key: 'symptom',
      render: (v: string) => (
        <Tooltip title={v}>
          <Text style={{ color: '#cbd5e1' }} ellipsis={{ tooltip: false }}>
            {v.length > 50 ? v.slice(0, 50) + '…' : v}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'ความเร่งด่วน',
      dataIndex: 'urgency',
      key: 'urgency',
      width: 120,
      render: (v: RepairRequest['urgency']) => {
        const cfg = urgencyConfig[v]
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: RepairRequest['status']) => {
        const cfg = statusConfig[v]
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.label}
          </Tag>
        )
      },
    },
    {
      title: 'ผู้รับผิดชอบ',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 150,
      render: (v?: string) => v ? <Text style={{ color: '#6ee7b7' }}>{v}</Text> : <Text style={{ color: '#475569' }}>-</Text>,
    },
  ]

  const expandedRow = (record: RepairRequest) => (
    <div style={{ padding: '8px 16px', color: '#cbd5e1' }}>
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>อาการที่แจ้ง</Text>
          <div style={{ marginTop: 4, marginBottom: 12 }}>{record.symptom}</div>
          {record.deviceSerial && (
            <>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Serial Number</Text>
              <div style={{ marginTop: 4, fontFamily: 'monospace', color: '#a78bfa' }}>{record.deviceSerial}</div>
            </>
          )}
        </Col>
        <Col xs={24} md={12}>
          {record.resolvedNote && (
            <>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>บันทึกการซ่อม</Text>
              <div style={{ marginTop: 4, color: '#6ee7b7', marginBottom: 12 }}>{record.resolvedNote}</div>
            </>
          )}
          {record.attachments && record.attachments.length > 0 && (
            <>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>ไฟล์แนบ</Text>
              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {record.attachments.map((f, i) => (
                  <Tag key={i} icon={<PaperClipOutlined />} color="blue">{f.name}</Tag>
                ))}
              </div>
            </>
          )}
        </Col>
      </Row>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { href: '/', title: <HomeOutlined style={{ color: '#94a3b8' }} /> },
            { title: <span style={{ color: '#94a3b8' }}>งานคอมพิวเตอร์และเทคโนโลยีสารสนเทศ</span> },
            { title: <span style={{ color: '#a78bfa' }}>แจ้งซ่อมคอมพิวเตอร์</span> },
          ]}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <DesktopOutlined style={{ fontSize: 28, color: '#a78bfa' }} />
          <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>แจ้งซ่อมคอมพิวเตอร์และอุปกรณ์ IT</Title>
        </div>

        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card
              style={{
                background: 'linear-gradient(135deg, #92400e 0%, #1e293b 100%)',
                border: '1px solid #b45309',
                borderRadius: 10,
              }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <Statistic
                title={<span style={{ color: '#fde68a', fontSize: 12 }}>รอดำเนินการ</span>}
                value={pending}
                prefix={<ClockCircleOutlined style={{ color: '#fbbf24' }} />}
                styles={{ content: { color: '#fff', fontSize: 24 } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)',
                border: '1px solid #2563eb',
                borderRadius: 10,
              }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <Statistic
                title={<span style={{ color: '#bae6fd', fontSize: 12 }}>กำลังซ่อม</span>}
                value={inProgress}
                prefix={<ToolOutlined style={{ color: '#60a5fa' }} />}
                styles={{ content: { color: '#fff', fontSize: 24 } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              style={{
                background: 'linear-gradient(135deg, #065f46 0%, #1e293b 100%)',
                border: '1px solid #059669',
                borderRadius: 10,
              }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <Statistic
                title={<span style={{ color: '#a7f3d0', fontSize: 12 }}>ซ่อมเสร็จแล้ว</span>}
                value={completed}
                prefix={<CheckCircleOutlined style={{ color: '#6ee7b7' }} />}
                styles={{ content: { color: '#fff', fontSize: 24 } }}
              />
            </Card>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          style={{ color: '#cbd5e1' }}
          items={[
            {
              key: 'form',
              label: (
                <span style={{ fontWeight: 500 }}>
                  <PlusOutlined style={{ marginRight: 6 }} />แจ้งซ่อม
                </span>
              ),
              children: (
                <Card style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10 }}>
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ urgency: 'medium' }}
                    style={{ color: '#cbd5e1' }}
                  >
                    <Divider style={{ color: '#a78bfa', borderColor: '#334155' }}>
                      ข้อมูลอุปกรณ์
                    </Divider>
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="deviceType"
                          label={<span style={{ color: '#94a3b8' }}>ประเภทอุปกรณ์</span>}
                          rules={[{ required: true, message: 'กรุณาเลือกประเภทอุปกรณ์' }]}
                        >
                          <Select
                            placeholder="เลือกประเภทอุปกรณ์"
                            options={deviceTypeOptions.map((d) => ({
                              value: d.value,
                              label: <span><span style={{ marginRight: 8 }}>{d.icon}</span>{d.label}</span>,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="deviceBrand"
                          label={<span style={{ color: '#94a3b8' }}>ยี่ห้อ / รุ่น</span>}
                        >
                          <Input placeholder="เช่น DELL OptiPlex 7090" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="deviceSerial"
                          label={<span style={{ color: '#94a3b8' }}>Serial Number / รหัสครุภัณฑ์</span>}
                        >
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="เช่น SN-A001234"
                              style={{ fontFamily: 'monospace' }}
                            />
                            <Button
                              icon={<QrcodeOutlined />}
                              onClick={() => { setAssetSearch(''); setAssetModalOpen(true) }}
                              style={{ color: '#a78bfa', fontWeight: 600 }}
                            >
                              ค้นหาในระบบ
                            </Button>
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ color: '#a78bfa', borderColor: '#334155' }}>
                      รายละเอียดการแจ้งซ่อม
                    </Divider>
                    <Row gutter={16}>
                      <Col xs={24} md={16}>
                        <Form.Item
                          name="symptom"
                          label={<span style={{ color: '#94a3b8' }}>อาการที่พบ / รายละเอียดปัญหา</span>}
                          rules={[{ required: true, message: 'กรุณาระบุอาการที่พบ' }]}
                        >
                          <TextArea
                            rows={4}
                            placeholder="อธิบายอาการที่พบให้ชัดเจน เช่น เครื่องไม่ติด / หน้าจอดำ / เปิดโปรแกรมไม่ได้ / เน็ตไม่เชื่อมต่อ ฯลฯ"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="urgency"
                          label={<span style={{ color: '#94a3b8' }}>ระดับความเร่งด่วน</span>}
                          rules={[{ required: true }]}
                        >
                          <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Radio value="low"><Tag color="default">ปกติ</Tag> ไม่เร่งด่วน</Radio>
                            <Radio value="medium"><Tag color="processing">ปานกลาง</Tag> ต้องการภายใน 3 วัน</Radio>
                            <Radio value="high"><Tag color="warning">เร่งด่วน</Tag> ต้องการภายในวันนี้</Radio>
                            <Radio value="critical"><Tag color="error">วิกฤต</Tag> ส่งผลต่อการทำงานทันที</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      name="attachments"
                      label={<span style={{ color: '#94a3b8' }}>ภาพถ่ายอาการ / ไฟล์แนบ (ถ้ามี)</span>}
                      valuePropName="fileList"
                      getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                    >
                      <Upload
                        multiple
                        beforeUpload={() => false}
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                        listType="picture"
                      >
                        <Button icon={<UploadOutlined />}>เลือกไฟล์ภาพหรือเอกสาร</Button>
                      </Upload>
                    </Form.Item>

                    <Form.Item style={{ marginTop: 8 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<ToolOutlined />}
                        style={{ minWidth: 160 }}
                      >
                        ส่งคำร้องแจ้งซ่อม
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              ),
            },
            {
              key: 'status',
              label: (
                <span style={{ fontWeight: 500 }}>
                  <Badge count={pending} size="small" offset={[4, -2]}>
                    <ClockCircleOutlined style={{ marginRight: 6 }} />
                  </Badge>
                  สถานะการซ่อม
                </span>
              ),
              children: (
                <Card style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10 }}>
                  <Table
                    dataSource={requests}
                    columns={columns}
                    rowKey="id"
                    scroll={{ x: 900 }}
                    expandable={{ expandedRowRender: expandedRow }}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    style={{ color: '#cbd5e1' }}
                  />
                </Card>
              ),
            },
          ]}
        />
      </div>

      {/* ── IT Asset Search Modal ── */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrcodeOutlined style={{ color: '#a78bfa' }} />
            ค้นหาครุภัณฑ์คอมพิวเตอร์และอุปกรณ์ IT
          </span>
        }
        open={assetModalOpen}
        onCancel={() => { setAssetModalOpen(false); setAssetSearch('') }}
        footer={null}
        width={860}
        destroyOnHidden
      >
        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="ค้นหาจากเลขครุภัณฑ์ ชื่ออุปกรณ์ Serial Number หรือหน่วยงาน..."
          value={assetSearch}
          onChange={e => setAssetSearch(e.target.value)}
          allowClear
          autoFocus
          size="large"
          style={{ marginBottom: 16 }}
        />
        <Table
          dataSource={filteredItAssets}
          rowKey="assetNo"
          size="small"
          pagination={{ pageSize: 8, size: 'small' }}
          columns={[
            { title: 'เลขครุภัณฑ์', dataIndex: 'assetNo', key: 'assetNo', width: 110, render: (v: string) => <code style={{ color: '#a78bfa' }}>{v}</code> },
            { title: 'ชื่ออุปกรณ์', dataIndex: 'name', key: 'name' },
            { title: 'Serial No.', dataIndex: 'serialNo', key: 'serialNo', width: 120, render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
            { title: 'หน่วยงาน', dataIndex: 'department', key: 'department', width: 160 },
            {
              title: 'สภาพ', dataIndex: 'status', key: 'status', width: 90,
              render: (v: string) => <Tag color={IT_ASSET_STATUS_COLOR[v] ?? 'default'}>{v}</Tag>
            },
            {
              title: 'เลือก', key: 'action', width: 70, align: 'center' as const,
              render: (_: any, record: typeof MOCK_IT_ASSETS[0]) => (
                <Button type="primary" size="small" onClick={() => handleSelectItAsset(record)}>เลือก</Button>
              )
            },
          ]}
        />
      </Modal>
    </div>
  )
}

export default function Page() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: '#7c3aed', borderRadius: 8 },
      }}
    >
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
