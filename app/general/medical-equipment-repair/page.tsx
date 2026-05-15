'use client'
import { useState } from 'react'
import {
  ConfigProvider, App, theme, Form, Input, Select, Button, Upload, Table, Tag, Tabs,
  Typography, Breadcrumb, Row, Col, Card, Tooltip, Badge, Radio, Modal, Steps,
  Descriptions, Timeline, Space,
} from 'antd'
import {
  MedicineBoxOutlined, PaperClipOutlined, PlusOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, HomeOutlined, SearchOutlined, QrcodeOutlined,
  FileTextOutlined, WarningOutlined, EyeOutlined,
  InfoCircleOutlined, ToolOutlined,
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { TextArea } = Input

interface MedicalRepairRequest {
  id: string
  requestDate: string
  equipmentType: 'surgical' | 'vital_signs' | 'ultrasound' | 'xray' | 'laboratory' | 'other'
  assetNumber?: string
  assetName?: string
  department: string
  location: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  symptom: string
  attachments?: { name: string }[]
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignedTo?: string
  resolvedNote?: string
  resolvedDate?: string
}

const mockRequests: MedicalRepairRequest[] = [
  {
    id: 'MED-2026-001',
    requestDate: '05/04/2026',
    equipmentType: 'vital_signs',
    assetNumber: 'MED-65-003',
    assetName: 'Patient Monitor Mindray MEC-1200',
    department: 'ipd',
    location: 'Ward A ชั้น 3',
    urgency: 'high',
    symptom: 'หน้าจอมอนิเตอร์ดับกะทันหัน ค่า SpO2 และความดันโลหิตไม่แสดงผล',
    status: 'completed',
    assignedTo: 'นายวิชัย ช่างเทคนิคการแพทย์',
    resolvedNote: 'เปลี่ยน power board และทำความสะอาดภายใน ทดสอบครบทุกฟังก์ชันแล้ว',
    resolvedDate: '06/04/2026',
  },
  {
    id: 'MED-2026-002',
    requestDate: '07/04/2026',
    equipmentType: 'vital_signs',
    assetNumber: 'MED-66-005',
    assetName: 'เครื่องวัดความดัน Omron HEM-7600T',
    department: 'opd',
    location: 'ห้องชั่งน้ำหนัก',
    urgency: 'medium',
    symptom: 'ค่าความดันที่วัดได้ผิดปกติ คลาดเคลื่อนมากกว่า 20 mmHg เมื่อเทียบกับเครื่องอื่น',
    status: 'in_progress',
    assignedTo: 'นายสมพงษ์ ช่างสอบเทียบ',
  },
  {
    id: 'MED-2026-003',
    requestDate: '09/04/2026',
    equipmentType: 'surgical',
    assetNumber: 'MED-67-007',
    assetName: 'Syringe Pump Fresenius Kabi Agilia SP',
    department: 'ipd',
    location: 'ICU ชั้น 4',
    urgency: 'critical',
    symptom: 'ปั๊มสารน้ำส่งเสียงแจ้งเตือน Occlusion ตลอดเวลา ทั้งที่ท่อไม่มีการอุดตัน',
    status: 'pending',
  },
  {
    id: 'MED-2026-004',
    requestDate: '10/04/2026',
    equipmentType: 'laboratory',
    assetNumber: 'MED-67-004',
    assetName: 'เครื่อง Centrifuge Eppendorf 5810R',
    department: 'lab',
    location: 'ห้องแล็บ ชั้น 1',
    urgency: 'medium',
    symptom: 'เครื่องหมุนสั่นผิดปกติ มีเสียงดังผิดปกติขณะหมุนที่ความเร็วสูง',
    status: 'pending',
  },
  {
    id: 'MED-2026-005',
    requestDate: '12/04/2026',
    equipmentType: 'vital_signs',
    assetNumber: 'MED-65-001',
    assetName: 'เครื่อง ECG 12 Leads Nihon Kohden ECG-2150',
    department: 'or',
    location: 'OR 1',
    urgency: 'high',
    symptom: 'กราฟ ECG แสดงผล Lead III และ aVF เป็นเส้นตรง ไม่มีสัญญาณ',
    status: 'completed',
    assignedTo: 'นายวิชัย ช่างเทคนิคการแพทย์',
    resolvedNote: 'เปลี่ยนสาย lead และขั้วต่อสัญญาณ ทดสอบครบ 12 leads แล้ว',
    resolvedDate: '12/04/2026',
  },
]

const MOCK_MEDICAL_ASSETS = [
  { assetNo: 'MED-65-001', name: 'เครื่อง ECG 12 Leads Nihon Kohden ECG-2150',        type: 'เครื่องมือตรวจหัวใจ',    department: 'งานห้องผ่าตัด',     location: 'OR 1',                  status: 'ชำรุด' },
  { assetNo: 'MED-65-002', name: 'เครื่องกระตุ้นหัวใจ Zoll AED Plus',                 type: 'เครื่องช่วยชีวิต',       department: 'งานอุบัติเหตุ ER',  location: 'ER ห้องฉุกเฉิน',       status: 'ปกติ' },
  { assetNo: 'MED-65-003', name: 'Patient Monitor Mindray MEC-1200',                   type: 'เครื่องมอนิเตอร์',       department: 'งานผู้ป่วยใน IPD',  location: 'Ward A ชั้น 3',        status: 'ปกติ' },
  { assetNo: 'MED-66-001', name: 'เครื่องอัลตราซาวด์ GE LOGIQ P9',                   type: 'เครื่องอัลตราซาวด์',     department: 'งานรังสีวิทยา',     location: 'ห้องอัลตราซาวด์',     status: 'ปกติ' },
  { assetNo: 'MED-66-002', name: 'เครื่องช่วยหายใจ Maquet Servo-i',                  type: 'เครื่องช่วยหายใจ',       department: 'งาน ICU',           location: 'ICU ชั้น 4',           status: 'ปกติ' },
  { assetNo: 'MED-66-003', name: 'Infusion Pump Baxter SIGMA Spectrum',                type: 'ปั๊มสารน้ำ',             department: 'งานผู้ป่วยใน IPD',  location: 'Ward B ชั้น 3',        status: 'เสื่อมสภาพ' },
  { assetNo: 'MED-66-004', name: 'เครื่องดูดเสมหะ Laerdal LSU',                      type: 'เครื่องดูดเสมหะ',        department: 'งานการพยาบาล OPD',  location: 'ห้องตรวจโรค OPD 3',  status: 'ปกติ' },
  { assetNo: 'MED-66-005', name: 'เครื่องวัดความดัน Omron HEM-7600T',                type: 'เครื่องวัดความดัน',      department: 'งานการพยาบาล OPD',  location: 'ห้องชั่งน้ำหนัก',    status: 'ชำรุด' },
  { assetNo: 'MED-67-001', name: 'Pulse Oximeter Nonin GO2',                           type: 'เครื่องวัดออกซิเจน',     department: 'งานอุบัติเหตุ ER',  location: 'ER คัดกรอง',          status: 'ปกติ' },
  { assetNo: 'MED-67-002', name: 'เครื่อง X-Ray Shimadzu MobileArt Evolution',         type: 'เครื่อง X-Ray',          department: 'งานรังสีวิทยา',     location: 'ห้อง X-Ray ชั้น 1',   status: 'ปกติ' },
  { assetNo: 'MED-67-003', name: 'Glucometer Roche Accu-Chek Inform II',              type: 'เครื่องวัดน้ำตาล',       department: 'งานห้องปฏิบัติการ', location: 'ห้องแล็บ ชั้น 1',    status: 'ปกติ' },
  { assetNo: 'MED-67-004', name: 'เครื่อง Centrifuge Eppendorf 5810R',                type: 'อุปกรณ์ห้องแล็บ',        department: 'งานห้องปฏิบัติการ', location: 'ห้องแล็บ ชั้น 1',    status: 'เสื่อมสภาพ' },
  { assetNo: 'MED-67-005', name: 'กล้องจุลทรรศน์ Olympus CX23',                      type: 'กล้องจุลทรรศน์',         department: 'งานห้องปฏิบัติการ', location: 'ห้องพยาธิวิทยา',     status: 'ปกติ' },
  { assetNo: 'MED-67-006', name: 'เครื่องผ่าตัดด้วยไฟฟ้า Bovie A1250S',             type: 'เครื่องมือผ่าตัด',       department: 'งานห้องผ่าตัด',     location: 'OR 2',                  status: 'ปกติ' },
  { assetNo: 'MED-67-007', name: 'Syringe Pump Fresenius Kabi Agilia SP',             type: 'ปั๊มสารน้ำ',             department: 'งาน ICU',           location: 'ICU ชั้น 4',           status: 'ชำรุด' },
  { assetNo: 'MED-64-001', name: 'เตียงผ่าตัดไฮดรอลิก Maquet Alpha Star',            type: 'เตียงผ่าตัด',            department: 'งานห้องผ่าตัด',     location: 'OR 3',                  status: 'ปกติ' },
]

const ASSET_STATUS_COLOR: Record<string, string> = {
  'ปกติ': 'success', 'ชำรุด': 'error', 'เสื่อมสภาพ': 'warning',
}

const ASSET_TYPE_MAP: Record<string, MedicalRepairRequest['equipmentType']> = {
  'เครื่องมือผ่าตัด':    'surgical',
  'เตียงผ่าตัด':         'surgical',
  'เครื่องช่วยชีวิต':    'surgical',
  'เครื่องช่วยหายใจ':    'surgical',
  'เครื่องมอนิเตอร์':    'vital_signs',
  'เครื่องวัดความดัน':   'vital_signs',
  'เครื่องวัดออกซิเจน':  'vital_signs',
  'เครื่องวัดน้ำตาล':    'vital_signs',
  'เครื่องมือตรวจหัวใจ': 'vital_signs',
  'เครื่องอัลตราซาวด์':  'ultrasound',
  'เครื่อง X-Ray':       'xray',
  'อุปกรณ์ห้องแล็บ':     'laboratory',
  'กล้องจุลทรรศน์':      'laboratory',
  'ปั๊มสารน้ำ':          'other',
  'เครื่องดูดเสมหะ':     'other',
}

const ASSET_DEPT_MAP: Record<string, string> = {
  'งานการพยาบาล OPD':    'opd',
  'งานผู้ป่วยใน IPD':    'ipd',
  'งาน ICU':             'ipd',
  'งานอุบัติเหตุ ER':    'er',
  'งานห้องผ่าตัด':       'or',
  'งานรังสีวิทยา':       'lab',
  'งานห้องปฏิบัติการ':   'lab',
}

const equipmentTypeOptions = [
  { label: 'เครื่องมือผ่าตัด / ห้องผ่าตัด', value: 'surgical',    color: '#f87171' },
  { label: 'เครื่องวัดสัญญาณชีพ',            value: 'vital_signs', color: '#34d399' },
  { label: 'เครื่องอัลตราซาวด์',             value: 'ultrasound',  color: '#60a5fa' },
  { label: 'เครื่อง X-Ray / รังสีวิทยา',     value: 'xray',        color: '#a78bfa' },
  { label: 'อุปกรณ์ห้องปฏิบัติการ',           value: 'laboratory',  color: '#fbbf24' },
  { label: 'อื่นๆ',                           value: 'other',       color: '#94a3b8' },
]

const departmentOptions = [
  { label: 'ห้องผู้ป่วยนอก (OPD)', value: 'opd' },
  { label: 'ห้องผู้ป่วยใน (IPD / ICU)', value: 'ipd' },
  { label: 'ห้องฉุกเฉิน (ER)', value: 'er' },
  { label: 'ห้องผ่าตัด (OR)', value: 'or' },
  { label: 'ห้องแล็บ / พยาธิวิทยา / รังสีวิทยา', value: 'lab' },
  { label: 'อื่นๆ', value: 'other' },
]

const DEPARTMENT_LABEL: Record<string, string> = {
  opd:   'ห้องผู้ป่วยนอก (OPD)',
  ipd:   'ห้องผู้ป่วยใน (IPD / ICU)',
  er:    'ห้องฉุกเฉิน (ER)',
  or:    'ห้องผ่าตัด (OR)',
  lab:   'ห้องแล็บ / พยาธิวิทยา / รังสีวิทยา',
  other: 'อื่นๆ',
}

const urgencyConfig = {
  low:      { color: 'default',    label: 'ปกติ',     sla: 'ภายใน 5 วันทำการ' },
  medium:   { color: 'processing', label: 'ปานกลาง', sla: 'ภายใน 3 วันทำการ' },
  high:     { color: 'warning',    label: 'เร่งด่วน', sla: 'ภายในวันนี้' },
  critical: { color: 'error',      label: 'วิกฤต',    sla: 'ทันที (กระทบความปลอดภัยผู้ป่วย)' },
}

const statusConfig = {
  pending:     { color: 'warning',    label: 'รอดำเนินการ',   icon: <ClockCircleOutlined /> },
  in_progress: { color: 'processing', label: 'กำลังซ่อม',    icon: <ToolOutlined /> },
  completed:   { color: 'success',    label: 'ซ่อมเสร็จแล้ว', icon: <CheckCircleOutlined /> },
  cancelled:   { color: 'error',      label: 'ยกเลิก',        icon: <CloseCircleOutlined /> },
}

const STEP_MAP = { pending: 0, in_progress: 1, completed: 2, cancelled: 2 }

const PageContent = () => {
  const [form] = Form.useForm()
  const [requests, setRequests] = useState<MedicalRepairRequest[]>(mockRequests)
  const [activeTab, setActiveTab] = useState('form')
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [detailModal, setDetailModal] = useState<MedicalRepairRequest | null>(null)
  const { message } = App.useApp()

  const filteredAssets = assetSearch.trim()
    ? MOCK_MEDICAL_ASSETS.filter(a =>
        a.assetNo.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.department.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.type.toLowerCase().includes(assetSearch.toLowerCase())
      )
    : MOCK_MEDICAL_ASSETS

  const handleSelectAsset = (asset: typeof MOCK_MEDICAL_ASSETS[0]) => {
    form.setFieldsValue({
      assetNumber:   asset.assetNo,
      assetName:     asset.name,
      equipmentType: ASSET_TYPE_MAP[asset.type] ?? 'other',
      department:    ASSET_DEPT_MAP[asset.department] ?? 'other',
      location:      asset.location,
    })
    setAssetModalOpen(false)
    setAssetSearch('')
    message.success(`เลือกเครื่องมือแพทย์ ${asset.assetNo} แล้ว`)
  }

  const onFinish = (values: any) => {
    const newReq: MedicalRepairRequest = {
      id: `MED-2026-${String(requests.length + 1).padStart(3, '0')}`,
      requestDate:   new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      equipmentType: values.equipmentType,
      assetNumber:   values.assetNumber ?? '',
      assetName:     values.assetName ?? '',
      department:    values.department,
      location:      values.location,
      urgency:       values.urgency,
      symptom:       values.symptom,
      attachments:   (values.attachments ?? []).map((f: any) => ({ name: f.name })),
      status: 'pending',
    }
    setRequests(prev => [newReq, ...prev])
    form.resetFields()
    setActiveTab('status')
    message.success('ส่งคำร้องแจ้งซ่อมเครื่องมือแพทย์เรียบร้อยแล้ว')
  }

  const pending = requests.filter(r => r.status === 'pending').length

  const columns = [
    {
      title: 'เลขที่',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'วันที่แจ้ง',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 110,
    },
    {
      title: 'ประเภทเครื่องมือ',
      dataIndex: 'equipmentType',
      key: 'equipmentType',
      width: 190,
      render: (v: string) => {
        const opt = equipmentTypeOptions.find(o => o.value === v)
        return opt ? <Tag style={{ color: opt.color, borderColor: opt.color + '55' }}>{opt.label}</Tag> : '-'
      },
    },
    {
      title: 'เครื่องมือแพทย์',
      key: 'asset',
      width: 220,
      render: (_: unknown, r: MedicalRepairRequest) => (
        <div>
          <div style={{ color: '#cbd5e1', fontSize: 13 }}>{r.assetName || '-'}</div>
          {r.assetNumber && <Text style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{r.assetNumber}</Text>}
        </div>
      ),
    },
    {
      title: 'อาการที่แจ้ง',
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
      render: (v: MedicalRepairRequest['urgency']) => {
        const cfg = urgencyConfig[v]
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: MedicalRepairRequest['status']) => {
        const cfg = statusConfig[v]
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>
      },
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_: unknown, r: MedicalRepairRequest) => (
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
            { title: <span style={{ color: '#FF6500' }}>แจ้งซ่อมเครื่องมือแพทย์</span> },
          ]}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <MedicineBoxOutlined style={{ fontSize: 28, color: '#FF6500' }} />
          <div>
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>แจ้งซ่อมเครื่องมือแพทย์</Title>
            <Text style={{ color: '#64748b', fontSize: 13 }}>งานบริหารงานทั่วไป / ช่างเทคนิคการแพทย์</Text>
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
                    initialValues={{ urgency: 'medium', equipmentType: 'vital_signs' }}
                    style={{ color: '#cbd5e1' }}
                  >
                    {/* ── Section 1: ข้อมูลเครื่องมือแพทย์ ──────────────────── */}
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: '16px 20px', marginBottom: 24, border: '1px solid #1e3a5f' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ width: 3, height: 18, background: '#0284c7', borderRadius: 2 }} />
                        <Text style={{ color: '#38bdf8', fontWeight: 600, fontSize: 15 }}>
                          <MedicineBoxOutlined style={{ marginRight: 6 }} />ข้อมูลเครื่องมือแพทย์
                        </Text>
                      </div>

                      <Row gutter={16}>
                        <Col xs={24} md={10}>
                          <Form.Item
                            name="equipmentType"
                            label={<span style={{ color: '#94a3b8' }}>ประเภทเครื่องมือแพทย์ <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาเลือกประเภทเครื่องมือ' }]}
                          >
                            <Select
                              placeholder="เลือกประเภทเครื่องมือ"
                              options={equipmentTypeOptions.map(o => ({
                                label: <span style={{ color: o.color }}>{o.label}</span>,
                                value: o.value,
                              }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={7}>
                          <Form.Item
                            name="department"
                            label={<span style={{ color: '#94a3b8' }}>หน่วยงาน / แผนก <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาเลือกหน่วยงาน' }]}
                          >
                            <Select placeholder="เลือกหน่วยงาน" options={departmentOptions} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={7}>
                          <Form.Item
                            name="location"
                            label={<span style={{ color: '#94a3b8' }}>สถานที่ / ห้องที่ตั้งเครื่อง <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาระบุสถานที่' }]}
                          >
                            <Input placeholder="เช่น Ward A ชั้น 3, OR 1" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <div style={{ borderTop: '1px solid #1e3a5f', margin: '4px 0 16px', paddingTop: 16 }}>
                        <Text style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 12 }}>
                          ครุภัณฑ์เครื่องมือแพทย์ (ถ้ามี) — ระบุเพื่อให้ช่างค้นหาประวัติการซ่อมได้รวดเร็ว
                        </Text>
                        <Row gutter={16}>
                          <Col xs={24} md={8}>
                            <Form.Item label={<span style={{ color: '#94a3b8' }}>เลขครุภัณฑ์</span>}>
                              <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name="assetNumber" noStyle>
                                  <Input placeholder="เช่น MED-67-001" style={{ fontFamily: 'monospace' }} />
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
                              label={<span style={{ color: '#94a3b8' }}>ชื่อเครื่องมือแพทย์ / รุ่น (Model)</span>}
                            >
                              <Input placeholder="เช่น Patient Monitor Mindray MEC-1200" />
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

                      <Row gutter={16}>
                        <Col xs={24} md={16}>
                          <Form.Item
                            name="symptom"
                            label={<span style={{ color: '#94a3b8' }}>อาการ / ปัญหาที่พบ <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาระบุอาการที่พบ' }]}
                            extra={<span style={{ color: '#475569', fontSize: 11 }}>อธิบายให้ละเอียดเพื่อให้ช่างเทคนิคเตรียมอะไหล่และเครื่องมือได้ล่วงหน้า</span>}
                          >
                            <TextArea
                              rows={5}
                              placeholder={`ตัวอย่างการอธิบาย:\n• เครื่องไม่ติด / ไม่แสดงผล / ค่าผิดปกติ\n• มีเสียงดัง / สั่น / มีกลิ่นไหม้\n• หน้าจอแสดง Error Code: xxx\n• ใช้งานได้บางฟังก์ชัน เช่น Lead III ไม่แสดง`}
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
                        label={<span style={{ color: '#94a3b8' }}><PaperClipOutlined style={{ marginRight: 4 }} />ภาพถ่ายความเสียหาย / หน้าจอ Error / ไฟล์แนบ (ถ้ามี)</span>}
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

                    {/* ── Submit ────────────────────────────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <Button onClick={() => form.resetFields()}>ล้างข้อมูล</Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<MedicineBoxOutlined />}
                        style={{ minWidth: 200, background: '#FF6500' }}
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
                    scroll={{ x: 1150 }}
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

      {/* ── Asset Search Modal ──────────────────────────────────────────────── */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrcodeOutlined style={{ color: '#FF6500' }} />
            ค้นหาครุภัณฑ์เครื่องมือแพทย์
          </span>
        }
        open={assetModalOpen}
        onCancel={() => { setAssetModalOpen(false); setAssetSearch('') }}
        footer={null}
        width={920}
        destroyOnHidden
      >
        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="ค้นหาจากเลขครุภัณฑ์ ชื่อเครื่องมือ ประเภท หรือหน่วยงาน..."
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
              title: 'เลขครุภัณฑ์', dataIndex: 'assetNo', key: 'assetNo', width: 130,
              render: (v: string) => <code style={{ color: '#FF6500' }}>{v}</code>,
            },
            { title: 'ชื่อเครื่องมือแพทย์', dataIndex: 'name', key: 'name' },
            {
              title: 'ประเภท', dataIndex: 'type', key: 'type', width: 140,
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
              render: (_: any, record: typeof MOCK_MEDICAL_ASSETS[0]) => (
                <Button type="primary" size="small" onClick={() => handleSelectAsset(record)}>เลือก</Button>
              ),
            },
          ]}
        />
      </Modal>

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
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
              styles={{ label: { color: '#94a3b8', background: '#0f172a', width: 140 }, content: { background: '#1e293b', color: '#e2e8f0' } }}
            >
              <Descriptions.Item label="เลขที่คำร้อง">
                <Text style={{ color: '#FF6500', fontWeight: 600 }}>{detailModal.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="วันที่แจ้ง">{detailModal.requestDate}</Descriptions.Item>
              <Descriptions.Item label="ประเภทเครื่องมือ" span={2}>
                {(() => {
                  const opt = equipmentTypeOptions.find(o => o.value === detailModal.equipmentType)
                  return opt ? <Tag style={{ color: opt.color, borderColor: opt.color + '55' }}>{opt.label}</Tag> : '-'
                })()}
              </Descriptions.Item>
              {detailModal.assetNumber && (
                <Descriptions.Item label="เลขครุภัณฑ์">
                  <code style={{ color: '#FF6500' }}>{detailModal.assetNumber}</code>
                </Descriptions.Item>
              )}
              {detailModal.assetName && (
                <Descriptions.Item label="ชื่อเครื่องมือแพทย์">
                  {detailModal.assetName}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="หน่วยงาน">{DEPARTMENT_LABEL[detailModal.department] ?? detailModal.department}</Descriptions.Item>
              <Descriptions.Item label="สถานที่">{detailModal.location}</Descriptions.Item>
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
