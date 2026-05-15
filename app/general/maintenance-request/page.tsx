'use client'
import { useState } from 'react'
import {
  ConfigProvider, App, theme, Form, Input, Select, Button, Upload, Table, Tag, Tabs,
  Typography, Breadcrumb, Row, Col, Card, Tooltip, Badge, Radio, Modal, Steps,
  Descriptions, Timeline, Space,
} from 'antd'
import {
  ToolOutlined, PaperClipOutlined, PlusOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, HomeOutlined, SearchOutlined, QrcodeOutlined,
  EnvironmentOutlined, FileTextOutlined, WarningOutlined, EyeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { FaBolt, FaWater, FaSnowflake, FaBuilding, FaWrench } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { TextArea } = Input

interface MaintenanceRequest {
  id: string
  requestDate: string
  repairCategory: 'electrical' | 'plumbing' | 'aircon' | 'building' | 'other'
  assetNumber?: string
  assetName?: string
  building: string
  location: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  symptom: string
  attachments?: { name: string }[]
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignedTo?: string
  resolvedNote?: string
  resolvedDate?: string
}

const mockRequests: MaintenanceRequest[] = [
  {
    id: 'MR-2026-001',
    requestDate: '01/04/2026',
    repairCategory: 'electrical',
    building: 'opd',
    location: 'ห้องตรวจโรค OPD 2 ชั้น 1',
    urgency: 'high',
    symptom: 'หลอดไฟฟลูออเรสเซนต์ดับทั้งห้อง ไม่สามารถตรวจผู้ป่วยได้',
    status: 'completed',
    assignedTo: 'นายสมศักดิ์ ช่างไฟ',
    resolvedNote: 'เปลี่ยนหลอดไฟและบัลลาสต์ใหม่ทั้ง 4 จุด ใช้งานได้ปกติ',
    resolvedDate: '02/04/2026',
  },
  {
    id: 'MR-2026-002',
    requestDate: '03/04/2026',
    repairCategory: 'plumbing',
    building: 'ipd',
    location: 'ห้องน้ำผู้ป่วยใน Ward A ชั้น 3',
    urgency: 'critical',
    symptom: 'ท่อน้ำรั่ว น้ำรั่วออกมาเป็นจำนวนมาก ต้องปิดวาล์วน้ำไว้ก่อน',
    status: 'in_progress',
    assignedTo: 'นายวีระ ช่างประปา',
  },
  {
    id: 'MR-2026-003',
    requestDate: '05/04/2026',
    repairCategory: 'aircon',
    assetNumber: 'ก.002-67-001',
    building: 'opd',
    location: 'ห้องตรวจโรค OPD 1',
    urgency: 'medium',
    symptom: 'เครื่องปรับอากาศไม่เย็น ทำงานแต่ลมไม่เย็น คาดน้ำยาหมด',
    status: 'pending',
  },
  {
    id: 'MR-2026-004',
    requestDate: '08/04/2026',
    repairCategory: 'building',
    building: 'admin',
    location: 'ทางเดินชั้น 2 อาคารอำนวยการ',
    urgency: 'low',
    symptom: 'ฝ้าเพดานมีรอยน้ำซึม คาดว่ามาจากห้องน้ำชั้นบน',
    status: 'pending',
  },
  {
    id: 'MR-2026-005',
    requestDate: '10/04/2026',
    repairCategory: 'electrical',
    building: 'er',
    location: 'ห้องฉุกเฉิน ER',
    urgency: 'critical',
    symptom: 'เต้าเสียบไฟฟ้าข้างเตียงผู้ป่วยชำรุด มีประกายไฟ อันตรายมาก',
    status: 'completed',
    assignedTo: 'นายสมศักดิ์ ช่างไฟ',
    resolvedNote: 'เปลี่ยนเต้าเสียบและสายไฟใหม่ทั้งจุด ตรวจสอบความปลอดภัยแล้ว',
    resolvedDate: '10/04/2026',
  },
]

const MOCK_ASSETS = [
  { assetNo: 'ก.001-67-002', name: 'เครื่องพิมพ์ HP LaserJet Pro M404dn',      type: 'เครื่องพิมพ์',     department: 'งาน HR',                location: 'ห้อง HR ชั้น 2',            status: 'ปกติ' },
  { assetNo: 'ก.002-67-001', name: 'เครื่องปรับอากาศ Daikin 18000 BTU',        type: 'เครื่องปรับอากาศ', department: 'งานการพยาบาล OPD',      location: 'ห้องตรวจโรค OPD 1',         status: 'ปกติ' },
  { assetNo: 'ก.002-67-002', name: 'โต๊ะทำงานแพทย์ไม้สัก',                    type: 'เฟอร์นิเจอร์',     department: 'งานการพยาบาล OPD',      location: 'ห้องตรวจโรค OPD 2',         status: 'ปกติ' },
  { assetNo: 'ก.003-65-001', name: 'เครื่อง ECG 12 Leads Nihon Kohden',         type: 'เครื่องมือแพทย์',  department: 'งานห้องผ่าตัด',         location: 'OR 1',                       status: 'ชำรุด' },
  { assetNo: 'ก.003-65-002', name: 'เตียงผ่าตัดไฮดรอลิก Maquet Alpha Star',    type: 'เครื่องมือแพทย์',  department: 'งานห้องผ่าตัด',         location: 'OR 2',                       status: 'ปกติ' },
  { assetNo: 'ก.004-66-001', name: 'ตู้เย็นเก็บยา Thermo Fisher 4°C',          type: 'ตู้เย็น',          department: 'งานเภสัชกรรม',          location: 'ห้องยา ชั้น 1',             status: 'ปกติ' },
  { assetNo: 'ก.005-67-001', name: 'โปรเจคเตอร์ Epson EB-X49',                 type: 'โสตทัศนูปกรณ์',   department: 'งาน HR',                location: 'ห้องประชุมชั้น 3',           status: 'เสื่อมสภาพ' },
  { assetNo: 'ก.005-67-002', name: 'กล้อง CCTV Hikvision 2MP',                 type: 'กล้องวงจรปิด',    department: 'งานรักษาความปลอดภัย',   location: 'ประตูทางเข้าหลัก',          status: 'ชำรุด' },
  { assetNo: 'ก.006-66-001', name: 'เครื่องชั่งน้ำหนักดิจิทัล AND UC-321',    type: 'เครื่องมือแพทย์',  department: 'งานการพยาบาล OPD',      location: 'ห้องชั่งน้ำหนัก',           status: 'ปกติ' },
  { assetNo: 'ก.006-66-002', name: 'เตียงผู้ป่วย Hill-Rom เตียงไฟฟ้า',         type: 'เฟอร์นิเจอร์',    department: 'งานผู้ป่วยใน IPD',       location: 'Ward A ชั้น 3',             status: 'ปกติ' },
  { assetNo: 'ก.007-65-001', name: 'สแกนเนอร์เอกสาร Fujitsu fi-7160',          type: 'เครื่องพิมพ์',     department: 'งานเวชระเบียน',          location: 'ห้องเวชระเบียน ชั้น 1',     status: 'ปกติ' },
  { assetNo: 'ก.007-65-002', name: 'เครื่องกระตุ้นหัวใจ Zoll AED Plus',        type: 'เครื่องมือแพทย์',  department: 'งานอุบัติเหตุ ER',       location: 'ER ห้องฉุกเฉิน',            status: 'ปกติ' },
]

const ASSET_STATUS_COLOR: Record<string, string> = {
  'ปกติ': 'success', 'ชำรุด': 'error', 'เสื่อมสภาพ': 'warning',
}

const ASSET_BUILDING_MAP: Record<string, string> = {
  'งาน HR':                  'admin',
  'งานการพยาบาล OPD':        'opd',
  'งานห้องผ่าตัด':           'ipd',
  'งานเภสัชกรรม':            'opd',
  'งานเวชระเบียน':           'opd',
  'งานรักษาความปลอดภัย':     'other',
  'งานผู้ป่วยใน IPD':        'ipd',
  'งานอุบัติเหตุ ER':        'er',
}

const repairCategoryOptions = [
  { value: 'electrical', label: 'ระบบไฟฟ้า / แสงสว่าง',     color: '#fbbf24', icon: <FaBolt />,      desc: 'หลอดไฟ, สวิตช์, เต้าเสียบ, ไฟฟ้าขัดข้อง' },
  { value: 'plumbing',   label: 'ระบบประปา / สุขาภิบาล',    color: '#60a5fa', icon: <FaWater />,     desc: 'ท่อน้ำ, น้ำรั่ว, ก๊อกน้ำ, ห้องน้ำ' },
  { value: 'aircon',     label: 'เครื่องปรับอากาศ',          color: '#34d399', icon: <FaSnowflake />, desc: 'แอร์ไม่เย็น, น้ำหยด, เสียงดัง' },
  { value: 'building',   label: 'อาคารสถานที่ / โครงสร้าง', color: '#fb923c', icon: <FaBuilding />,  desc: 'ผนัง, ฝ้าเพดาน, พื้น, ประตู, หน้าต่าง' },
  { value: 'other',      label: 'อื่นๆ',                     color: '#94a3b8', icon: <FaWrench />,    desc: 'ปัญหาอื่นนอกเหนือจากที่ระบุ' },
]

const urgencyConfig = {
  low:      { color: 'default',    label: 'ปกติ',     sla: 'ภายใน 5 วันทำการ' },
  medium:   { color: 'processing', label: 'ปานกลาง', sla: 'ภายใน 3 วันทำการ' },
  high:     { color: 'warning',    label: 'เร่งด่วน', sla: 'ภายในวันนี้' },
  critical: { color: 'error',      label: 'วิกฤต',    sla: 'ทันที (อันตราย / กระทบการบริการ)' },
}

const statusConfig = {
  pending:     { color: 'warning',    label: 'รอดำเนินการ',   icon: <ClockCircleOutlined /> },
  in_progress: { color: 'processing', label: 'กำลังซ่อม',    icon: <ToolOutlined /> },
  completed:   { color: 'success',    label: 'ซ่อมเสร็จแล้ว', icon: <CheckCircleOutlined /> },
  cancelled:   { color: 'error',      label: 'ยกเลิก',        icon: <CloseCircleOutlined /> },
}

const STEP_MAP = { pending: 0, in_progress: 1, completed: 2, cancelled: 2 }

const buildingOptions = [
  { label: 'อาคารผู้ป่วยนอก (OPD)', value: 'opd' },
  { label: 'อาคารผู้ป่วยใน (IPD)', value: 'ipd' },
  { label: 'อาคารอุบัติเหตุและฉุกเฉิน (ER)', value: 'er' },
  { label: 'อาคารอำนวยการ', value: 'admin' },
  { label: 'บ้านพักเจ้าหน้าที่', value: 'staff_housing' },
  { label: 'อื่นๆ / บริเวณภายนอก', value: 'other' },
]

const BUILDING_LABEL: Record<string, string> = {
  opd:          'อาคารผู้ป่วยนอก (OPD)',
  ipd:          'อาคารผู้ป่วยใน (IPD)',
  er:           'อาคารอุบัติเหตุและฉุกเฉิน (ER)',
  admin:        'อาคารอำนวยการ',
  staff_housing:'บ้านพักเจ้าหน้าที่',
  other:        'อื่นๆ / บริเวณภายนอก',
}

const PageContent = () => {
  const [form] = Form.useForm()
  const [requests, setRequests] = useState<MaintenanceRequest[]>(mockRequests)
  const [activeTab, setActiveTab] = useState('form')
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [detailModal, setDetailModal] = useState<MaintenanceRequest | null>(null)
  const { message } = App.useApp()

  const filteredAssets = assetSearch.trim()
    ? MOCK_ASSETS.filter(a =>
        a.assetNo.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.department.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.type.toLowerCase().includes(assetSearch.toLowerCase())
      )
    : MOCK_ASSETS

  const handleSelectAsset = (asset: typeof MOCK_ASSETS[0]) => {
    form.setFieldsValue({
      assetNumber: asset.assetNo,
      assetName:   asset.name,
      location:    asset.location,
      building:    ASSET_BUILDING_MAP[asset.department] ?? 'other',
    })
    setAssetModalOpen(false)
    setAssetSearch('')
    message.success(`เลือกครุภัณฑ์ ${asset.assetNo} แล้ว`)
  }

  const onFinish = (values: any) => {
    const newReq: MaintenanceRequest = {
      id: `MR-2026-${String(requests.length + 1).padStart(3, '0')}`,
      requestDate:    new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      repairCategory: values.repairCategory,
      assetNumber:    values.assetNumber ?? '',
      assetName:      values.assetName ?? '',
      building:       values.building,
      location:       values.location,
      urgency:        values.urgency,
      symptom:        values.symptom,
      attachments:    (values.attachments ?? []).map((f: any) => ({ name: f.name })),
      status: 'pending',
    }
    setRequests(prev => [newReq, ...prev])
    form.resetFields()
    setActiveTab('status')
    message.success('ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว')
  }

  const pending = requests.filter(r => r.status === 'pending').length

  const columns = [
    {
      title: 'เลขที่',
      dataIndex: 'id',
      key: 'id',
      width: 130,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'วันที่แจ้ง',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 110,
    },
    {
      title: 'ประเภทงาน',
      dataIndex: 'repairCategory',
      key: 'repairCategory',
      width: 180,
      render: (v: string) => {
        const cat = repairCategoryOptions.find(c => c.value === v)
        return cat ? <Tag style={{ color: cat.color, borderColor: cat.color + '55' }}>{cat.label}</Tag> : '-'
      },
    },
    {
      title: 'สถานที่',
      key: 'location',
      width: 210,
      render: (_: unknown, r: MaintenanceRequest) => (
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{BUILDING_LABEL[r.building] ?? r.building}</div>
          <div style={{ color: '#cbd5e1', fontSize: 13 }}>{r.location}</div>
          {r.assetNumber && (
            <div>
              <Text style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{r.assetNumber}</Text>
              {r.assetName && <Text style={{ fontSize: 11, color: '#475569' }}> · {r.assetName}</Text>}
            </div>
          )}
        </div>
      ),
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
      render: (v: MaintenanceRequest['urgency']) => {
        const cfg = urgencyConfig[v]
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: MaintenanceRequest['status']) => {
        const cfg = statusConfig[v]
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>
      },
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_: unknown, r: MaintenanceRequest) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          size="small"
          style={{ color: '#FF6500' }}
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
            { title: <span style={{ color: '#94a3b8' }}>งานบริหารงานทั่วไป</span> },
            { title: <span style={{ color: '#FF6500' }}>แจ้งซ่อมบำรุง</span> },
          ]}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <ToolOutlined style={{ fontSize: 28, color: '#FF6500' }} />
          <div>
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>แจ้งซ่อมบำรุงอาคารและสถานที่</Title>
            <Text style={{ color: '#64748b', fontSize: 13 }}>งานบริหารงานทั่วไป โรงพยาบาล</Text>
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
                    initialValues={{ urgency: 'medium', repairCategory: 'electrical' }}
                    style={{ color: '#cbd5e1' }}
                  >
                    {/* ── Section 1: สถานที่ ─────────────────────────────────── */}
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: '16px 20px', marginBottom: 24, border: '1px solid #1e3a5f' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ width: 3, height: 18, background: '#0284c7', borderRadius: 2 }} />
                        <Text style={{ color: '#38bdf8', fontWeight: 600, fontSize: 15 }}>
                          <EnvironmentOutlined style={{ marginRight: 6 }} />ข้อมูลสถานที่
                        </Text>
                      </div>
                      <Row gutter={16}>
                        <Col xs={24} md={8}>
                          <Form.Item
                            name="building"
                            label={<span style={{ color: '#94a3b8' }}>ตึก / อาคาร <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาเลือกตึก/อาคาร' }]}
                          >
                            <Select placeholder="เลือกตึก/อาคาร" options={buildingOptions} showSearch optionFilterProp="label" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={16}>
                          <Form.Item
                            name="location"
                            label={<span style={{ color: '#94a3b8' }}>สถานที่ / บริเวณที่เกิดปัญหา <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาระบุสถานที่' }]}
                          >
                            <Input placeholder="เช่น ชั้น 2 ห้อง 201, หน้าลิฟต์" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <div style={{ borderTop: '1px solid #1e3a5f', margin: '4px 0 16px', paddingTop: 16 }}>
                        <Text style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 12 }}>
                          ครุภัณฑ์ที่เกี่ยวข้อง (ถ้ามี) — ระบุหากปัญหาเกิดจากครุภัณฑ์เฉพาะ
                        </Text>
                        <Row gutter={16}>
                          <Col xs={24} md={8}>
                            <Form.Item label={<span style={{ color: '#94a3b8' }}>เลขครุภัณฑ์</span>}>
                              <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name="assetNumber" noStyle>
                                  <Input placeholder="เช่น ก.002-67-001" style={{ fontFamily: 'monospace' }} />
                                </Form.Item>
                                <Button
                                  icon={<QrcodeOutlined />}
                                  onClick={() => { setAssetSearch(''); setAssetModalOpen(true) }}
                                  style={{ color: '#FF6500', fontWeight: 600 }}
                                >
                                  ค้นหา
                                </Button>
                              </Space.Compact>
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={16}>
                            <Form.Item
                              name="assetName"
                              label={<span style={{ color: '#94a3b8' }}>ชื่อครุภัณฑ์</span>}
                            >
                              <Input placeholder="เช่น เครื่องปรับอากาศ Daikin 18000 BTU" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    </div>

                    {/* ── Section 2: รายละเอียดปัญหา ────────────────────────── */}
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: '16px 20px', marginBottom: 24, border: '1px solid #1e3a5f' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ width: 3, height: 18, background: '#059669', borderRadius: 2 }} />
                        <Text style={{ color: '#6ee7b7', fontWeight: 600, fontSize: 15 }}>
                          <FileTextOutlined style={{ marginRight: 6 }} />รายละเอียดปัญหา
                        </Text>
                      </div>

                      <Form.Item
                        name="repairCategory"
                        label={<span style={{ color: '#94a3b8' }}>ประเภทงานซ่อม <span style={{ color: '#f87171' }}>*</span></span>}
                        rules={[{ required: true, message: 'กรุณาเลือกประเภทงานซ่อม' }]}
                      >
                        <Radio.Group>
                          <Row gutter={[8, 8]}>
                            {repairCategoryOptions.map(cat => (
                              <Col key={cat.value}>
                                <Radio.Button value={cat.value} style={{ height: 'auto', padding: '6px 14px' }}>
                                  <div>
                                    <div style={{ color: cat.color, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {cat.icon} {cat.label}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: 11 }}>{cat.desc}</div>
                                  </div>
                                </Radio.Button>
                              </Col>
                            ))}
                          </Row>
                        </Radio.Group>
                      </Form.Item>

                      <Row gutter={16}>
                        <Col xs={24} md={16}>
                          <Form.Item
                            name="symptom"
                            label={<span style={{ color: '#94a3b8' }}>อาการความเสียหาย / รายละเอียดปัญหา <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาระบุอาการที่พบ' }]}
                            extra={<span style={{ color: '#475569', fontSize: 11 }}>อธิบายให้ละเอียดเพื่อให้เจ้าหน้าที่เตรียมอุปกรณ์และดำเนินการได้รวดเร็วขึ้น</span>}
                          >
                            <TextArea
                              rows={5}
                              placeholder={`ตัวอย่างการอธิบาย:\n• หลอดไฟดับ / หน้าห้อง xxx ชั้น x\n• ท่อน้ำรั่ว / น้ำไม่ไหล / ส้วมอุดตัน\n• แอร์ไม่เย็น / น้ำหยดจากแอร์\n• ผนังแตกร้าว / ฝ้าร้าว / ประตูพัง`}
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
                        label={<span style={{ color: '#94a3b8' }}><PaperClipOutlined style={{ marginRight: 4 }} />ภาพถ่ายความเสียหาย / ไฟล์แนบ (ถ้ามี)</span>}
                        valuePropName="fileList"
                        getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                        extra={<span style={{ color: '#475569', fontSize: 11 }}>รองรับ JPG, PNG, PDF ขนาดไม่เกิน 10MB ต่อไฟล์</span>}
                      >
                        <Upload
                          multiple
                          beforeUpload={() => false}
                          accept=".jpg,.jpeg,.png,.pdf"
                          listType="picture"
                        >
                          <Button icon={<UploadOutlined />}>เลือกไฟล์ภาพหรือเอกสาร</Button>
                        </Upload>
                      </Form.Item>
                    </div>

                    {/* ── Submit ──────────────────────────────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <Button onClick={() => form.resetFields()}>ล้างข้อมูล</Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<ToolOutlined />}
                        style={{ minWidth: 180, background: '#FF6500' }}
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

      {/* ── Asset Search Modal ─────────────────────────────────────────────── */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrcodeOutlined style={{ color: '#FF6500' }} />
            ค้นหาครุภัณฑ์ในระบบ
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
          placeholder="ค้นหาจากเลขครุภัณฑ์ ชื่อ ประเภท หรือหน่วยงาน..."
          value={assetSearch}
          onChange={e => setAssetSearch(e.target.value)}
          allowClear
          autoFocus
          size="large"
          style={{ marginBottom: 16 }}
        />
        <Table
          dataSource={filteredAssets}
          rowKey="assetNo"
          size="small"
          pagination={{ pageSize: 8, size: 'small' }}
          columns={[
            {
              title: 'เลขครุภัณฑ์', dataIndex: 'assetNo', key: 'assetNo', width: 140,
              render: (v: string) => <code style={{ color: '#FF6500' }}>{v}</code>,
            },
            { title: 'ชื่อครุภัณฑ์', dataIndex: 'name', key: 'name' },
            {
              title: 'ประเภท', dataIndex: 'type', key: 'type', width: 130,
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: 'หน่วยงาน', dataIndex: 'department', key: 'department', width: 160,
              render: (v: string) => <Text style={{ fontSize: 12, color: '#94a3b8' }}>{v}</Text>,
            },
            {
              title: 'ห้อง/ชั้น', dataIndex: 'location', key: 'location', width: 160,
              render: (v: string) => <Text style={{ fontSize: 12, color: '#94a3b8' }}>{v}</Text>,
            },
            {
              title: 'สภาพ', dataIndex: 'status', key: 'status', width: 90,
              render: (v: string) => <Tag color={ASSET_STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
            },
            {
              title: 'เลือก', key: 'action', width: 70, align: 'center' as const,
              render: (_: any, record: typeof MOCK_ASSETS[0]) => (
                <Button type="primary" size="small" onClick={() => handleSelectAsset(record)}>เลือก</Button>
              ),
            },
          ]}
        />
      </Modal>

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined style={{ color: '#FF6500' }} />
            รายละเอียดคำร้อง {detailModal?.id}
          </span>
        }
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={<Button onClick={() => setDetailModal(null)}>ปิด</Button>}
        width={900}
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
                {
                  title: detailModal.status === 'cancelled' ? 'ยกเลิก' : 'ซ่อมเสร็จ',
                  icon: detailModal.status === 'cancelled' ? <CloseCircleOutlined /> : <CheckCircleOutlined />,
                },
              ]}
            />
            <Descriptions
              column={{ xs: 1, sm: 2 }}
              size="small"
              bordered
              styles={{ label: { color: '#94a3b8', background: '#0f172a', width: 130 }, content: { background: '#1e293b', color: '#e2e8f0' } }}
            >
              <Descriptions.Item label="เลขที่คำร้อง">
                <Text style={{ color: '#FF6500', fontWeight: 600 }}>{detailModal.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="วันที่แจ้ง">{detailModal.requestDate}</Descriptions.Item>
              <Descriptions.Item label="ประเภทงานซ่อม" span={2}>
                {(() => {
                  const cat = repairCategoryOptions.find(c => c.value === detailModal.repairCategory)
                  return cat ? <Tag style={{ color: cat.color, borderColor: cat.color + '55' }}>{cat.label}</Tag> : '-'
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="อาคาร">{BUILDING_LABEL[detailModal.building] ?? detailModal.building}</Descriptions.Item>
              <Descriptions.Item label="สถานที่">{detailModal.location}</Descriptions.Item>
              {detailModal.assetNumber && (
                <Descriptions.Item label="เลขครุภัณฑ์">
                  <code style={{ color: '#FF6500' }}>{detailModal.assetNumber}</code>
                </Descriptions.Item>
              )}
              {detailModal.assetName && (
                <Descriptions.Item label="ชื่อครุภัณฑ์">
                  {detailModal.assetName}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="ความเร่งด่วน">
                <Tag color={urgencyConfig[detailModal.urgency].color}>{urgencyConfig[detailModal.urgency].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="สถานะ">
                <Tag color={statusConfig[detailModal.status].color} icon={statusConfig[detailModal.status].icon}>
                  {statusConfig[detailModal.status].label}
                </Tag>
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
                    ...(detailModal.resolvedNote ? [{
                      color: 'green',
                      children: (
                        <div>
                          <Text style={{ color: '#cbd5e1' }}>ซ่อมเสร็จ {detailModal.resolvedDate && `— ${detailModal.resolvedDate}`}</Text>
                          <div style={{ color: '#6ee7b7', marginTop: 4 }}>{detailModal.resolvedNote}</div>
                        </div>
                      ),
                    }] : []),
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
        token: { colorPrimary: '#FF6500', borderRadius: 8 },
      }}
    >
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
