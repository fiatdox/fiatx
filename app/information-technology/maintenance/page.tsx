'use client'
import { useState } from 'react'
import {
  ConfigProvider, App, theme, Form, Input, Select, Button, Upload, Table, Tag, Tabs,
  Typography, Breadcrumb, Row, Col, Card, Tooltip, Badge, DatePicker, InputNumber,
  Radio, Modal, Space, Steps, Avatar, Descriptions, Timeline,
} from 'antd'
import {
  DesktopOutlined, ToolOutlined, PaperClipOutlined, PlusOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, HomeOutlined, SearchOutlined, QrcodeOutlined,
  UserOutlined, EnvironmentOutlined,
  FileTextOutlined, WarningOutlined, EyeOutlined, InfoCircleOutlined,
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
  position?: string
  deviceType: string
  deviceBrand: string
  deviceSerial: string
  assetNo?: string
  deviceLocation?: string
  problemCategory: 'hardware' | 'software' | 'network' | 'peripheral' | 'other'
  symptom: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  attachments?: { name: string; size?: number }[]
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignedTo?: string
  resolvedNote?: string
  resolvedDate?: string
}

const mockRequests: RepairRequest[] = [
  {
    id: 'IT-2026-001',
    requestDate: '01/04/2026',
    requesterName: 'นายสมชาย ใจดี',
    department: 'งานการเงินและบัญชี',
    phone: '1234',
    position: 'นักวิชาการการเงิน',
    deviceType: 'desktop',
    deviceBrand: 'DELL OptiPlex 7090',
    deviceSerial: 'SN-A001234',
    assetNo: 'IT-67-001',
    deviceLocation: 'ห้องการเงิน ชั้น 2',
    problemCategory: 'hardware',
    symptom: 'เครื่องไม่ติด กดปุ่ม Power แล้วไฟไม่ขึ้น',
    urgency: 'high',
    status: 'completed',
    assignedTo: 'นายวิชัย คอมดี',
    resolvedNote: 'เปลี่ยน Power Supply แล้ว ใช้งานได้ปกติ',
    resolvedDate: '03/04/2026',
  },
  {
    id: 'IT-2026-002',
    requestDate: '03/04/2026',
    requesterName: 'นางสาวรัตนา สวยงาม',
    department: 'งานทรัพยากรบุคคล',
    phone: '1102',
    position: 'นักทรัพยากรบุคคล',
    deviceType: 'laptop',
    deviceBrand: 'Lenovo ThinkPad E14',
    deviceSerial: 'SN-B005678',
    assetNo: 'IT-67-003',
    deviceLocation: 'ห้อง HR ชั้น 2',
    problemCategory: 'hardware',
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
    deviceLocation: 'ห้องพัสดุ ชั้น 1',
    problemCategory: 'hardware',
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
    deviceLocation: 'ห้องธุรการ ชั้น 1',
    problemCategory: 'software',
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
    deviceLocation: 'ห้องฝึกอบรม ชั้น 3',
    problemCategory: 'peripheral',
    symptom: 'สแกนเนอร์ไม่พบอุปกรณ์จากคอมพิวเตอร์ ลองเปลี่ยนสาย USB แล้วยังไม่ได้',
    urgency: 'high',
    status: 'pending',
  },
]

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
  'ปกติ': 'success', 'ชำรุด': 'error', 'เสื่อมสภาพ': 'warning',
}


const deviceTypeOptions = [
  { value: 'desktop',    label: 'คอมพิวเตอร์ตั้งโต๊ะ',               icon: <FaDesktop /> },
  { value: 'laptop',     label: 'โน้ตบุ๊ก / แล็ปท็อป',               icon: <FaLaptop /> },
  { value: 'printer',    label: 'เครื่องพิมพ์',                       icon: <FaPrint /> },
  { value: 'scanner',    label: 'สแกนเนอร์',                          icon: <FaMicrochip /> },
  { value: 'network',    label: 'อุปกรณ์เครือข่าย (Switch/Router)',   icon: <FaNetworkWired /> },
  { value: 'peripheral', label: 'อุปกรณ์ต่อพ่วง (คีย์บอร์ด/เมาส์/จอ)', icon: <FaKeyboard /> },
  { value: 'other',      label: 'อื่นๆ',                              icon: <ToolOutlined /> },
]

const problemCategoryOptions = [
  { value: 'hardware',   label: 'ฮาร์ดแวร์',       color: '#f87171',  desc: 'ชิ้นส่วนอุปกรณ์ชำรุด, ไม่ติด, เสียงดัง' },
  { value: 'software',   label: 'ซอฟต์แวร์',       color: '#60a5fa',  desc: 'โปรแกรมค้าง, ติดไวรัส, Windows เสีย' },
  { value: 'network',    label: 'เครือข่าย/อินเทอร์เน็ต', color: '#34d399', desc: 'เน็ตหลุด, เชื่อมต่อไม่ได้, ช้า' },
  { value: 'peripheral', label: 'อุปกรณ์ต่อพ่วง',  color: '#fbbf24',  desc: 'คีย์บอร์ด, เมาส์, จอ, เครื่องพิมพ์' },
  { value: 'other',      label: 'อื่นๆ',            color: '#94a3b8',  desc: 'ปัญหาอื่นนอกเหนือจากที่ระบุ' },
]

const urgencyConfig = {
  low:      { color: 'default',    label: 'ปกติ',       textColor: '#94a3b8', sla: 'ภายใน 5 วันทำการ' },
  medium:   { color: 'processing', label: 'ปานกลาง',   textColor: '#60a5fa', sla: 'ภายใน 3 วันทำการ' },
  high:     { color: 'warning',    label: 'เร่งด่วน',   textColor: '#fbbf24', sla: 'ภายในวันนี้' },
  critical: { color: 'error',      label: 'วิกฤต',      textColor: '#f87171', sla: 'ทันที (ส่งผลต่อการให้บริการผู้ป่วย)' },
}

const statusConfig = {
  pending:     { color: 'warning',    label: 'รอดำเนินการ', icon: <ClockCircleOutlined /> },
  in_progress: { color: 'processing', label: 'กำลังซ่อม',  icon: <ToolOutlined /> },
  completed:   { color: 'success',    label: 'ซ่อมเสร็จแล้ว', icon: <CheckCircleOutlined /> },
  cancelled:   { color: 'error',      label: 'ยกเลิก',      icon: <CloseCircleOutlined /> },
}

const STEP_MAP = { pending: 0, in_progress: 1, completed: 2, cancelled: 2 }

const PageContent = () => {
  const [form] = Form.useForm()
  const [requests, setRequests] = useState<RepairRequest[]>(mockRequests)
  const [activeTab, setActiveTab] = useState('form')
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [detailModal, setDetailModal] = useState<RepairRequest | null>(null)
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
      deviceSerial:   asset.serialNo,
      deviceBrand:    asset.name,
      deviceType:     asset.type,
      assetNo:        asset.assetNo,
      deviceLocation: asset.location,
    })
    setAssetModalOpen(false)
    setAssetSearch('')
    message.success(`เลือกครุภัณฑ์ ${asset.assetNo} แล้ว`)
  }

  const onFinish = (values: any) => {
    const newReq: RepairRequest = {
      id: `IT-2026-${String(requests.length + 1).padStart(3, '0')}`,
      requestDate: new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      requesterName:   values.requesterName,
      department:      values.department,
      phone:           values.phone,
      position:        values.position,
      deviceType:      values.deviceType,
      deviceBrand:     values.deviceBrand ?? '',
      deviceSerial:    values.deviceSerial ?? '',
      assetNo:         values.assetNo ?? '',
      deviceLocation:  values.deviceLocation ?? '',
      problemCategory: values.problemCategory,
      symptom:         values.symptom,
      urgency:         values.urgency,
      attachments:     (values.attachments ?? []).map((f: any) => ({ name: f.name, size: f.size })),
      status: 'pending',
    }
    setRequests((prev) => [newReq, ...prev])
    form.resetFields()
    setActiveTab('status')
    message.success('ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว')
  }

  const pending = requests.filter((r) => r.status === 'pending').length

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
      key: 'requester',
      width: 180,
      render: (_: unknown, r: RepairRequest) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={30} icon={<UserOutlined />} style={{ background: '#4c1d95', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{r.requesterName}</div>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.department}</Text>
            {r.phone && <div style={{ fontSize: 11, color: '#64748b' }}>โทร. {r.phone}</div>}
          </div>
        </div>
      ),
    },
    {
      title: 'อุปกรณ์',
      key: 'device',
      width: 190,
      render: (_: unknown, r: RepairRequest) => {
        const dt = deviceTypeOptions.find((d) => d.value === r.deviceType)
        return (
          <div>
            <Tag color="purple" style={{ marginBottom: 2 }}>{dt?.label ?? r.deviceType}</Tag>
            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>{r.deviceBrand || '-'}</div>
            {r.assetNo && <Text style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{r.assetNo}</Text>}
          </div>
        )
      },
    },
    {
      title: 'หมวดหมู่',
      dataIndex: 'problemCategory',
      key: 'problemCategory',
      width: 130,
      render: (v: string) => {
        const cat = problemCategoryOptions.find(c => c.value === v)
        return cat ? <Tag color="default" style={{ color: cat.color, borderColor: cat.color + '55' }}>{cat.label}</Tag> : '-'
      },
    },
    {
      title: 'อาการ',
      dataIndex: 'symptom',
      key: 'symptom',
      render: (v: string) => (
        <Tooltip title={v}>
          <Text style={{ color: '#cbd5e1', fontSize: 13 }}>
            {v.length > 45 ? v.slice(0, 45) + '…' : v}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'ความเร่งด่วน',
      dataIndex: 'urgency',
      key: 'urgency',
      width: 110,
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
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>
      },
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_: unknown, r: RepairRequest) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          size="small"
          style={{ color: '#a78bfa' }}
          onClick={() => setDetailModal(r)}
        />
      ),
    },
  ]

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
          <div>
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>แจ้งซ่อมคอมพิวเตอร์และอุปกรณ์ IT</Title>
            <Text style={{ color: '#64748b', fontSize: 13 }}>งานคอมพิวเตอร์และเทคโนโลยีสารสนเทศ โรงพยาบาล</Text>
          </div>
        </div>



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
                    initialValues={{ urgency: 'medium', problemCategory: 'hardware' }}
                    style={{ color: '#cbd5e1' }}
                  >
                    {/* ── SECTION 2: อุปกรณ์ ───────────────────────────────────────────── */}
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: '16px 20px', marginBottom: 24, border: '1px solid #1e3a5f' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ width: 3, height: 18, background: '#0284c7', borderRadius: 2 }} />
                        <Text style={{ color: '#38bdf8', fontWeight: 600, fontSize: 15 }}>
                          <DesktopOutlined style={{ marginRight: 6 }} />ข้อมูลอุปกรณ์
                        </Text>
                      </div>
                      <Row gutter={16}>
                        <Col xs={24} md={6}>
                          <Form.Item
                            name="deviceType"
                            label={<span style={{ color: '#94a3b8' }}>ประเภทอุปกรณ์ <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาเลือกประเภทอุปกรณ์' }]}
                          >
                            <Select
                              placeholder="เลือกประเภทอุปกรณ์"
                              options={deviceTypeOptions.map((d) => ({
                                value: d.value,
                                label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{d.icon}{d.label}</span>,
                              }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item
                            name="deviceBrand"
                            label={<span style={{ color: '#94a3b8' }}>ยี่ห้อ / รุ่น</span>}
                          >
                            <Input placeholder="เช่น DELL OptiPlex 7090" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item
                            name="assetNo"
                            label={<span style={{ color: '#94a3b8' }}>เลขครุภัณฑ์</span>}
                          >
                            <Input placeholder="เช่น IT-67-001" style={{ fontFamily: 'monospace' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item
                            name="deviceSerial"
                            label={<span style={{ color: '#94a3b8' }}>Serial Number</span>}
                          >
                            <Space.Compact style={{ width: '100%' }}>
                              <Input placeholder="เช่น SN-A001234" style={{ fontFamily: 'monospace' }} />
                              <Button
                                icon={<QrcodeOutlined />}
                                onClick={() => { setAssetSearch(''); setAssetModalOpen(true) }}
                                style={{ color: '#a78bfa', fontWeight: 600 }}
                              >
                                ค้นหา
                              </Button>
                            </Space.Compact>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col xs={24} md={8}>
                          <Form.Item
                            name="deviceLocation"
                            label={<span style={{ color: '#94a3b8' }}><EnvironmentOutlined style={{ marginRight: 4 }} />สถานที่ติดตั้งอุปกรณ์</span>}
                          >
                            <Input placeholder="เช่น ห้องการเงิน ชั้น 2 อาคาร A" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
                          <Form.Item
                            name="receivedDate"
                            label={<span style={{ color: '#94a3b8' }}>วันที่รับ</span>}
                          >
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="เลือกวันที่" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
                          <Form.Item
                            name="price"
                            label={<span style={{ color: '#94a3b8' }}>ราคา (บาท)</span>}
                          >
                            <InputNumber
                              style={{ width: '100%' }}
                              placeholder="0.00"
                              min={0}
                              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={(v) => v?.replace(/,/g, '') as any}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>

                    {/* ── SECTION 3: รายละเอียดปัญหา ────────────────────────────────────── */}
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: '16px 20px', marginBottom: 24, border: '1px solid #1e3a5f' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ width: 3, height: 18, background: '#059669', borderRadius: 2 }} />
                        <Text style={{ color: '#6ee7b7', fontWeight: 600, fontSize: 15 }}>
                          <FileTextOutlined style={{ marginRight: 6 }} />รายละเอียดปัญหา
                        </Text>
                      </div>

                      <Row gutter={16}>
                        <Col xs={24} md={24}>
                          <Form.Item
                            name="problemCategory"
                            label={<span style={{ color: '#94a3b8' }}>หมวดหมู่ปัญหา <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาเลือกหมวดหมู่ปัญหา' }]}
                          >
                            <Radio.Group>
                              <Row gutter={[8, 8]}>
                                {problemCategoryOptions.map(cat => (
                                  <Col key={cat.value}>
                                    <Radio.Button value={cat.value} style={{ height: 'auto', padding: '6px 14px' }}>
                                      <div>
                                        <div style={{ color: cat.color, fontWeight: 600, fontSize: 13 }}>{cat.label}</div>
                                        <div style={{ color: '#64748b', fontSize: 11 }}>{cat.desc}</div>
                                      </div>
                                    </Radio.Button>
                                  </Col>
                                ))}
                              </Row>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col xs={24} md={16}>
                          <Form.Item
                            name="symptom"
                            label={<span style={{ color: '#94a3b8' }}>อาการที่พบ / รายละเอียดปัญหา <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาระบุอาการที่พบ' }]}
                            extra={<span style={{ color: '#475569', fontSize: 11 }}>อธิบายให้ละเอียดเพื่อให้เจ้าหน้าที่ IT ดำเนินการได้รวดเร็วขึ้น</span>}
                          >
                            <TextArea
                              rows={5}
                              placeholder={`ตัวอย่างการอธิบาย:\n• เครื่องไม่ติด / กดปุ่ม Power แล้วไม่มีสัญญาณ\n• หน้าจอดำ / มีเส้นลายพาดตลอด\n• เปิดโปรแกรม xxx ไม่ได้ / ขึ้น Error ว่า...\n• อินเทอร์เน็ตหลุด / เชื่อมต่อ Wi-Fi ไม่ได้`}
                              showCount
                              maxLength={500}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item
                            name="urgency"
                            label={
                              <span style={{ color: '#94a3b8' }}>
                                <WarningOutlined style={{ marginRight: 4 }} />ระดับความเร่งด่วน <span style={{ color: '#f87171' }}>*</span>
                              </span>
                            }
                            rules={[{ required: true }]}
                          >
                            <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {(Object.entries(urgencyConfig) as [string, typeof urgencyConfig['low']][]).map(([key, cfg]) => (
                                <Radio key={key} value={key}>
                                  <div>
                                    <Tag color={cfg.color} style={{ marginRight: 6 }}>{cfg.label}</Tag>
                                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>{cfg.sla}</Text>
                                  </div>
                                </Radio>
                              ))}
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item
                        name="attachments"
                        label={<span style={{ color: '#94a3b8' }}><PaperClipOutlined style={{ marginRight: 4 }} />ภาพถ่ายอาการ / ไฟล์แนบ (ถ้ามี)</span>}
                        valuePropName="fileList"
                        getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                        extra={<span style={{ color: '#475569', fontSize: 11 }}>รองรับ JPG, PNG, PDF, DOC ขนาดไม่เกิน 10MB ต่อไฟล์</span>}
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
                    </div>

                    {/* ── Submit ──────────────────────────────────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <Button onClick={() => form.resetFields()}>ล้างข้อมูล</Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<ToolOutlined />}
                        style={{ minWidth: 180, background: '#6d28d9' }}
                      >
                        ส่งคำร้องแจ้งซ่อม
                      </Button>
                    </div>
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
                    scroll={{ x: 1100 }}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    style={{ color: '#cbd5e1' }}
                    onRow={(r) => ({ onClick: () => setDetailModal(r), style: { cursor: 'pointer' } })}
                  />
                </Card>
              ),
            },
          ]}
        />
      </div>

      {/* ── IT Asset Search Modal ─────────────────────────────────────────────── */}
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
        width={900}
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
            { title: 'ห้อง/ชั้น', dataIndex: 'location', key: 'location', width: 160, render: (v: string) => <Text style={{ fontSize: 12, color: '#94a3b8' }}>{v}</Text> },
            {
              title: 'สภาพ', dataIndex: 'status', key: 'status', width: 90,
              render: (v: string) => <Tag color={IT_ASSET_STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
            },
            {
              title: 'เลือก', key: 'action', width: 70, align: 'center' as const,
              render: (_: any, record: typeof MOCK_IT_ASSETS[0]) => (
                <Button type="primary" size="small" onClick={() => handleSelectItAsset(record)}>เลือก</Button>
              ),
            },
          ]}
        />
      </Modal>

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined style={{ color: '#a78bfa' }} />
            รายละเอียดคำร้อง {detailModal?.id}
          </span>
        }
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={<Button onClick={() => setDetailModal(null)}>ปิด</Button>}
        width={700}
        destroyOnHidden
      >
        {detailModal && (
          <>
            <Steps
              size="small"
              current={STEP_MAP[detailModal.status]}
              status={detailModal.status === 'cancelled' ? 'error' : undefined}
              style={{ marginBottom: 24 }}
              items={[
                { title: 'รับคำร้อง', icon: <FileTextOutlined /> },
                { title: 'กำลังซ่อม', icon: <ToolOutlined /> },
                { title: detailModal.status === 'cancelled' ? 'ยกเลิก' : 'ซ่อมเสร็จ', icon: detailModal.status === 'cancelled' ? <CloseCircleOutlined /> : <CheckCircleOutlined /> },
              ]}
            />
            <Descriptions
              column={{ xs: 1, sm: 2 }}
              size="small"
              bordered
              labelStyle={{ color: '#94a3b8', background: '#0f172a', width: 130 }}
              contentStyle={{ background: '#1e293b', color: '#e2e8f0' }}
            >
              <Descriptions.Item label="เลขที่คำร้อง" span={1}>
                <Text style={{ color: '#a78bfa', fontWeight: 600 }}>{detailModal.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="วันที่แจ้ง">{detailModal.requestDate}</Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้ง">{detailModal.requesterName}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{detailModal.department}</Descriptions.Item>
              {detailModal.position && <Descriptions.Item label="ตำแหน่ง">{detailModal.position}</Descriptions.Item>}
              <Descriptions.Item label="เบอร์ภายใน">{detailModal.phone}</Descriptions.Item>
              <Descriptions.Item label="ประเภทอุปกรณ์">
                {deviceTypeOptions.find(d => d.value === detailModal.deviceType)?.label ?? detailModal.deviceType}
              </Descriptions.Item>
              <Descriptions.Item label="ยี่ห้อ/รุ่น">{detailModal.deviceBrand || '-'}</Descriptions.Item>
              {detailModal.assetNo && <Descriptions.Item label="เลขครุภัณฑ์"><code style={{ color: '#a78bfa' }}>{detailModal.assetNo}</code></Descriptions.Item>}
              {detailModal.deviceSerial && <Descriptions.Item label="Serial No."><code style={{ color: '#a78bfa' }}>{detailModal.deviceSerial}</code></Descriptions.Item>}
              {detailModal.deviceLocation && <Descriptions.Item label="สถานที่ติดตั้ง" span={2}>{detailModal.deviceLocation}</Descriptions.Item>}
              <Descriptions.Item label="หมวดหมู่ปัญหา">
                {(() => { const c = problemCategoryOptions.find(p => p.value === detailModal.problemCategory); return c ? <Tag style={{ color: c.color, borderColor: c.color + '55' }}>{c.label}</Tag> : '-' })()}
              </Descriptions.Item>
              <Descriptions.Item label="ความเร่งด่วน">
                <Tag color={urgencyConfig[detailModal.urgency].color}>{urgencyConfig[detailModal.urgency].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="อาการที่แจ้ง" span={2} styles={{ content: { whiteSpace: 'pre-wrap' } }}>
                {detailModal.symptom}
              </Descriptions.Item>
            </Descriptions>

            {(detailModal.assignedTo || detailModal.resolvedNote) && (
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>ความคืบหน้า</Text>
                <Timeline
                  items={[
                    { color: 'blue', children: <Text style={{ color: '#cbd5e1' }}>รับคำร้อง — {detailModal.requestDate}</Text> },
                    ...(detailModal.assignedTo ? [{ color: 'orange', children: <Text style={{ color: '#cbd5e1' }}>มอบหมาย <span style={{ color: '#6ee7b7' }}>{detailModal.assignedTo}</span></Text> }] : []),
                    ...(detailModal.resolvedNote ? [{ color: 'green', children: <div><Text style={{ color: '#cbd5e1' }}>ซ่อมเสร็จ {detailModal.resolvedDate && `— ${detailModal.resolvedDate}`}</Text><div style={{ color: '#6ee7b7', marginTop: 4 }}>{detailModal.resolvedNote}</div></div> }] : []),
                  ]}
                />
              </div>
            )}
          </>
        )}
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
