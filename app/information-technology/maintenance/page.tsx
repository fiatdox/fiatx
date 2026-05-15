'use client'
import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  ConfigProvider, App, theme, Form, Input, Select, Button, Upload, Table, Tag, Tabs,
  Typography, Breadcrumb, Row, Col, Card, Tooltip, Badge, DatePicker, InputNumber,
  Radio, Modal, Space, Steps, Avatar, Descriptions, Timeline, Spin,
} from 'antd'
import {
  DesktopOutlined, ToolOutlined, PaperClipOutlined, PlusOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, HomeOutlined, SearchOutlined, QrcodeOutlined,
  UserOutlined, EnvironmentOutlined, AppstoreOutlined, ShoppingCartOutlined, SwapOutlined,
  FileTextOutlined, WarningOutlined, EyeOutlined, InfoCircleOutlined, PrinterOutlined,
} from '@ant-design/icons'
import { FaMicrochip, FaPrint, FaLaptop, FaDesktop, FaNetworkWired } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import type { RepairSlipData } from '@/app/components/RepairSlipPDF'

const RepairSlipPDFViewer = dynamic(
  () => import('@/app/components/RepairSlipPDF'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Spin size="large" />
        <Text type="secondary">กำลังสร้าง PDF ใบส่งซ่อม...</Text>
      </div>
    ),
  }
)

const { Title, Text } = Typography
const { TextArea } = Input

interface RepairRequest {
  id: string
  requestDate: string
  requesterName: string
  department: string
  phone: string
  position?: string
  deviceType: number
  deviceBrand: string
  deviceSerial: string
  assetNo?: string
  deviceLocation?: string
  problemCategory: number
  symptom: string
  urgency: number
  attachments?: { name: string; size?: number }[]
  status: 'pending' | 'in_progress' | 'waiting_pr' | 'recommend_replacement' | 'completed' | 'cancelled'
  assignedTo?: string
  prNote?: string
  prDate?: string
  replacementNote?: string
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
    deviceType: 1,
    deviceBrand: 'DELL OptiPlex 7090',
    deviceSerial: 'SN-A001234',
    assetNo: 'IT-67-001',
    deviceLocation: 'ห้องการเงิน ชั้น 2',
    problemCategory: 1,
    symptom: 'เครื่องไม่ติด กดปุ่ม Power แล้วไฟไม่ขึ้น',
    urgency: 3,
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
    deviceType: 2,
    deviceBrand: 'Lenovo ThinkPad E14',
    deviceSerial: 'SN-B005678',
    assetNo: 'IT-67-003',
    deviceLocation: 'ห้อง HR ชั้น 2',
    problemCategory: 1,
    symptom: 'หน้าจอมีเส้นดำแนวนอนพาดตลอด และบางครั้งหน้าจอดับเองโดยไม่มีสาเหตุ',
    urgency: 2,
    status: 'in_progress',
    assignedTo: 'นายเทคโน สมาร์ท',
  },
  {
    id: 'IT-2026-003',
    requestDate: '05/04/2026',
    requesterName: 'นายประสิทธิ์ เก่งกาจ',
    department: 'งานพัสดุ',
    phone: '1305',
    deviceType: 3,
    deviceBrand: 'HP LaserJet Pro M404',
    deviceSerial: 'SN-C009012',
    deviceLocation: 'ห้องพัสดุ ชั้น 1',
    problemCategory: 1,
    symptom: 'พิมพ์แล้วกระดาษติดทุกครั้ง ดึงกระดาษออกมาแล้วพิมพ์ใหม่ก็ยังติดอีก',
    urgency: 2,
    status: 'waiting_pr',
    assignedTo: 'นายเทคโน สมาร์ท',
    prDate: '07/04/2026',
    prNote: 'ออก PR สั่งซื้อ Feed Roller และ Separation Pad HP PN: RM2-5452 จำนวน 1 ชุด (รอการอนุมัติ)',
  },
  {
    id: 'IT-2026-004',
    requestDate: '08/04/2026',
    requesterName: 'นางสาวมาลี รักษ์ดี',
    department: 'งานบริหารทั่วไป',
    phone: '1201',
    deviceType: 1,
    deviceBrand: 'Acer Veriton M6690G',
    deviceSerial: 'SN-D003456',
    deviceLocation: 'ห้องธุรการ ชั้น 1',
    problemCategory: 2,
    symptom: 'เครื่องช้ามาก เปิดโปรแกรมนานมาก บางครั้งค้างจนต้องรีสตาร์ท',
    urgency: 1,
    status: 'pending',
  },
  {
    id: 'IT-2026-005',
    requestDate: '10/04/2026',
    requesterName: 'นายอนุชา ดูแลดี',
    department: 'งานพัฒนาบุคลากร',
    phone: '1410',
    deviceType: 8,
    deviceBrand: 'Canon DR-C225W',
    deviceSerial: 'SN-E007890',
    deviceLocation: 'ห้องฝึกอบรม ชั้น 3',
    problemCategory: 4,
    symptom: 'สแกนเนอร์ไม่พบอุปกรณ์จากคอมพิวเตอร์ ลองเปลี่ยนสาย USB แล้วยังไม่ได้',
    urgency: 3,
    status: 'recommend_replacement',
    assignedTo: 'นายวิชัย คอมดี',
    replacementNote: 'ตรวจสอบแล้วพบ IC Controller Board เสีย ค่าซ่อมสูงกว่าราคาอุปกรณ์ใหม่ แนะนำจัดซื้อทดแทน Canon imageFORMULA DR-C225W II หรือเทียบเท่า',
  },
]

const MOCK_IT_ASSETS = [
  { assetNo: 'IT-67-001', name: 'DELL OptiPlex 7090 SFF',           type: 1, department: 'งานการเงินและบัญชี',   location: 'ห้องการเงิน ชั้น 2',        serialNo: 'SN-A001234', status: 'ปกติ' },
  { assetNo: 'IT-67-002', name: 'HP LaserJet Pro M404dn',           type: 3, department: 'งาน HR',               location: 'ห้อง HR ชั้น 2',            serialNo: 'SN-B005678', status: 'ปกติ' },
  { assetNo: 'IT-67-003', name: 'Lenovo ThinkPad E14 Gen 4',        type: 2, department: 'งานทรัพยากรบุคคล',    location: 'ห้อง HR ชั้น 2',            serialNo: 'SN-C009012', status: 'ปกติ' },
  { assetNo: 'IT-66-001', name: 'Canon DR-C225W Scanner',           type: 8, department: 'งานเวชระเบียน',        location: 'ห้องเวชระเบียน ชั้น 1',     serialNo: 'SN-D003456', status: 'เสื่อมสภาพ' },
  { assetNo: 'IT-66-002', name: 'Cisco Catalyst 2960-X Switch',     type: 6, department: 'งานคอมพิวเตอร์ IT',   location: 'ห้อง Server ชั้น 2',        serialNo: 'SN-E007890', status: 'ปกติ' },
  { assetNo: 'IT-67-004', name: 'Acer Veriton M6690G',              type: 1, department: 'งานบริหารทั่วไป',      location: 'ห้องธุรการ ชั้น 1',         serialNo: 'SN-F001122', status: 'ปกติ' },
  { assetNo: 'IT-67-005', name: 'HP LaserJet Enterprise M507dn',    type: 3, department: 'งานพัสดุ',             location: 'ห้องพัสดุ ชั้น 1',          serialNo: 'SN-G003344', status: 'ชำรุด' },
  { assetNo: 'IT-65-001', name: 'Dell Latitude 5520',               type: 2, department: 'งานพัฒนาบุคลากร',     location: 'ห้องฝึกอบรม ชั้น 3',        serialNo: 'SN-H005566', status: 'ปกติ' },
  { assetNo: 'IT-66-003', name: 'Fujitsu fi-7160 Scanner',          type: 8, department: 'งานเวชระเบียน',        location: 'ห้องเวชระเบียน ชั้น 1',     serialNo: 'SN-I007788', status: 'ปกติ' },
  { assetNo: 'IT-67-006', name: 'TP-Link TL-SG108E Switch 8-Port',  type: 6, department: 'งานการพยาบาล OPD',     location: 'ห้องเซิร์ฟเวอร์ OPD',      serialNo: 'SN-J009900', status: 'ปกติ' },
  { assetNo: 'IT-65-002', name: 'HP ProDesk 400 G7',                type: 1, department: 'งานอุบัติเหตุ ER',     location: 'เคาน์เตอร์ ER',             serialNo: 'SN-K001234', status: 'ปกติ' },
  { assetNo: 'IT-67-007', name: 'APC Smart-UPS 1500VA',             type: 5, department: 'งานคอมพิวเตอร์ IT',   location: 'ห้อง Server ชั้น 2',        serialNo: 'SN-L005678', status: 'เสื่อมสภาพ' },
  { assetNo: 'IT-66-004', name: 'Samsung 27" Curved Monitor CF396', type: 4, department: 'งานเวชระเบียน',        location: 'เคาน์เตอร์เวชระเบียน',      serialNo: 'SN-M002233', status: 'ปกติ' },
  { assetNo: 'IT-67-008', name: 'ASUS ExpertBook B1 B1400',         type: 2, department: 'งานบริหารทั่วไป',      location: 'ห้องประชุมชั้น 3',          serialNo: 'SN-N004455', status: 'ปกติ' },
  { assetNo: 'IT-65-003', name: 'Brother MFC-L5750DW',              type: 3, department: 'งานเวชระเบียน',        location: 'ห้องเวชระเบียน ชั้น 1',     serialNo: 'SN-O006677', status: 'ชำรุด' },
  { assetNo: 'IT-67-009', name: 'Ubiquiti UniFi AP AC Pro',         type: 6, department: 'งานคอมพิวเตอร์ IT',   location: 'ชั้น 2 โซน A',              serialNo: 'SN-P008899', status: 'ปกติ' },
]

const IT_ASSET_STATUS_COLOR: Record<string, string> = {
  'ปกติ': 'success', 'ชำรุด': 'error', 'เสื่อมสภาพ': 'warning',
}


interface EquipmentType {
  id: number
  name: string
}

const EQUIPMENT_TYPE_ICONS: Record<number, React.ReactNode> = {
  1: <FaDesktop />,
  2: <FaLaptop />,
  3: <FaPrint />,
  4: <FaDesktop />,
  5: <FaMicrochip />,
  6: <FaNetworkWired />,
  7: <FaMicrochip />,
  8: <FaMicrochip />,
}

interface ProblemCategory {
  it_problem_category_id: number
  name: string
  description: string
}


const PROBLEM_CATEGORY_COLORS = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#94a3b8']

interface PriorityLevel {
  it_priority_level_id: number
  name: string
  description: string
  response_days: number | null
  display_order: number
}


const PRIORITY_TAG_COLORS   = ['default', 'processing', 'warning', 'error']
const PRIORITY_BORDER_COLORS = ['#475569', '#3b82f6', '#f59e0b', '#ef4444']

const statusConfig = {
  pending:     { color: 'warning',    label: 'รอดำเนินการ',      icon: <ClockCircleOutlined /> },
  in_progress: { color: 'processing', label: 'กำลังซ่อม',        icon: <ToolOutlined /> },
  waiting_pr:           { color: 'orange',  label: 'รออะไหล่ / ออก PR',  icon: <ShoppingCartOutlined /> },
  recommend_replacement: { color: 'pink',    label: 'แนะนำซื้อทดแทน',    icon: <SwapOutlined /> },
  completed:            { color: 'success', label: 'ซ่อมเสร็จแล้ว',     icon: <CheckCircleOutlined /> },
  cancelled:            { color: 'error',   label: 'ยกเลิก',             icon: <CloseCircleOutlined /> },
}

const STEP_MAP = { pending: 0, in_progress: 1, waiting_pr: 2, recommend_replacement: 3, completed: 3, cancelled: 3 }

const PageContent = () => {
  const [form] = Form.useForm()
  const [requests, setRequests] = useState<RepairRequest[]>(mockRequests)
  const [activeTab, setActiveTab] = useState('form')
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [detailModal, setDetailModal] = useState<RepairRequest | null>(null)
  const [printSlip, setPrintSlip] = useState<RepairRequest | null>(null)
  const [priorityLevels, setPriorityLevels] = useState<PriorityLevel[]>([])
  const [problemCategories, setProblemCategories] = useState<ProblemCategory[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const { message } = App.useApp()

  useEffect(() => {
    fetch('/api/v1/it/priority-levels')
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setPriorityLevels(json.data) })
      .catch(() => {})
    fetch('/api/v1/it/problem-categories')
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setProblemCategories(json.data) })
      .catch(() => {})
    fetch('/api/v1/it/equipment-types')
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setEquipmentTypes(json.data) })
      .catch(() => {})
  }, [])

  const getPriorityConfig = (id: number) => {
    const level = priorityLevels.find(p => p.it_priority_level_id === id)
    const idx = Math.min((level?.display_order ?? 1) - 1, 3)
    return {
      label: level?.name ?? String(id),
      sla: level?.description ?? '',
      color: PRIORITY_TAG_COLORS[idx],
      borderColor: PRIORITY_BORDER_COLORS[idx],
    }
  }

  const getProblemCategoryConfig = (id: number) => {
    const cat = problemCategories.find(c => c.it_problem_category_id === id)
    const idx = Math.min((cat?.it_problem_category_id ?? 1) - 1, PROBLEM_CATEGORY_COLORS.length - 1)
    return {
      label: cat?.name ?? String(id),
      desc: cat?.description ?? '',
      color: PROBLEM_CATEGORY_COLORS[idx],
    }
  }

  const getEquipmentTypeConfig = (id: number) => {
    const et = equipmentTypes.find(e => e.id === id)
    return {
      label: et?.name ?? String(id),
      icon: EQUIPMENT_TYPE_ICONS[id] ?? <ToolOutlined />,
    }
  }

  const daysSince = (dateStr: string): number => {
    const [d, m, y] = dateStr.split('/').map(Number)
    const from = new Date(y, m - 1, d)
    const now = new Date()
    return Math.floor((now.getTime() - from.getTime()) / 86400000)
  }

  const daysColor = (days: number) => {
    if (days <= 3)  return '#22c55e'
    if (days <= 7)  return '#f59e0b'
    if (days <= 14) return '#f97316'
    return '#ef4444'
  }

  const toSlipData = (r: RepairRequest): RepairSlipData => ({
    id:                   r.id,
    requestDate:          r.requestDate,
    status:               r.status,
    statusLabel:          statusConfig[r.status].label,
    requesterName:        r.requesterName,
    position:             r.position,
    department:           r.department,
    phone:                r.phone,
    equipmentTypeLabel:   getEquipmentTypeConfig(r.deviceType).label,
    deviceBrand:          r.deviceBrand,
    assetNo:              r.assetNo,
    deviceSerial:         r.deviceSerial,
    deviceLocation:       r.deviceLocation,
    problemCategoryLabel: getProblemCategoryConfig(r.problemCategory).label,
    priorityLabel:        getPriorityConfig(r.urgency).label,
    symptom:              r.symptom,
    assignedTo:           r.assignedTo,
    resolvedDate:         r.resolvedDate,
    resolvedNote:         r.resolvedNote,
    prNote:               r.prNote,
    prDate:               r.prDate,
    replacementNote:      r.replacementNote,
  })

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
        const dt = getEquipmentTypeConfig(r.deviceType)
        return (
          <div>
            <Tag color="purple" style={{ marginBottom: 2 }}>{dt.label}</Tag>
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
      render: (v: number) => {
        const cat = getProblemCategoryConfig(v)
        return <Tag color="default" style={{ color: cat.color, borderColor: cat.color + '55' }}>{cat.label}</Tag>
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
        const cfg = getPriorityConfig(v)
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
      width: 90,
      render: (_: unknown, r: RepairRequest) => (
        <Space size={2}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            style={{ color: '#a78bfa' }}
            onClick={(e) => { e.stopPropagation(); setDetailModal(r) }}
          />
          <Button
            type="text"
            icon={<PrinterOutlined />}
            size="small"
            style={{ color: '#6ee7b7' }}
            onClick={(e) => { e.stopPropagation(); setPrintSlip(r) }}
          />
        </Space>
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
                    initialValues={{ urgency: 2, problemCategory: 1 }}
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
                              options={equipmentTypes.map((et) => ({
                                value: et.id,
                                label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{EQUIPMENT_TYPE_ICONS[et.id] ?? <ToolOutlined />}{et.name}</span>,
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
                                {problemCategories.map(cat => {
                                  const cfg = getProblemCategoryConfig(cat.it_problem_category_id)
                                  return (
                                    <Col key={cat.it_problem_category_id}>
                                      <Radio.Button value={cat.it_problem_category_id} style={{ height: 'auto', padding: '6px 14px' }}>
                                        <div>
                                          <div style={{ color: cfg.color, fontWeight: 600, fontSize: 13 }}>{cfg.label}</div>
                                          <div style={{ color: '#64748b', fontSize: 11 }}>{cfg.desc}</div>
                                        </div>
                                      </Radio.Button>
                                    </Col>
                                  )
                                })}
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
                              {priorityLevels.map(level => {
                                const cfg = getPriorityConfig(level.it_priority_level_id)
                                return (
                                  <Radio key={level.it_priority_level_id} value={level.it_priority_level_id}>
                                    <div>
                                      <Tag color={cfg.color} style={{ marginRight: 6 }}>{cfg.label}</Tag>
                                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{cfg.sla}</Text>
                                    </div>
                                  </Radio>
                                )
                              })}
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
            {
              key: 'kanban',
              label: (
                <span style={{ fontWeight: 500 }}>
                  <AppstoreOutlined style={{ marginRight: 6 }} />Kanban
                </span>
              ),
              children: (() => {
                const kanbanCols: { key: RepairRequest['status']; label: string; accent: string; bg: string; sub?: string }[] = [
                  { key: 'pending',     label: 'รอดำเนินการ',        accent: '#f59e0b', bg: '#1c1a0f' },
                  { key: 'in_progress', label: 'กำลังซ่อม',          accent: '#3b82f6', bg: '#0f1a2e' },
                  { key: 'waiting_pr',           label: 'รออะไหล่ / ออก PR',  accent: '#fb923c', bg: '#1f150a', sub: 'รอจัดซื้อ / รออนุมัติ PR' },
                  { key: 'recommend_replacement', label: 'แนะนำซื้อทดแทน',     accent: '#f472b6', bg: '#1f0e1a', sub: 'ซ่อมไม่ได้ / ประเมินแล้ว' },
                  { key: 'completed',            label: 'ซ่อมเสร็จแล้ว',      accent: '#22c55e', bg: '#0d1f12' },
                  { key: 'cancelled',            label: 'ยกเลิก',              accent: '#ef4444', bg: '#1f0d0d' },
                ]
                const urgencyBorder = (id: number) => getPriorityConfig(id).borderColor
                return (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
                    {kanbanCols.map(col => {
                      const colItems = requests.filter(r => r.status === col.key)
                      return (
                        <div key={col.key} style={{ minWidth: 270, flex: '1 1 0' }}>
                          {/* Column header */}
                          <div style={{
                            background: col.bg,
                            border: `1px solid ${col.accent}44`,
                            borderTop: `3px solid ${col.accent}`,
                            borderRadius: 8,
                            padding: '10px 14px',
                            marginBottom: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <div>
                              <Text style={{ color: col.accent, fontWeight: 700, fontSize: 13 }}>{col.label}</Text>
                              {col.sub && <div style={{ color: '#64748b', fontSize: 10, marginTop: 1 }}>{col.sub}</div>}
                            </div>
                            <Badge
                              count={colItems.length}
                              style={{ background: col.accent, fontSize: 11 }}
                              showZero
                            />
                          </div>
                          {/* Cards */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {colItems.length === 0 && (
                              <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, padding: '24px 0' }}>
                                ไม่มีรายการ
                              </div>
                            )}
                            {colItems.map(r => {
                              const cat = getProblemCategoryConfig(r.problemCategory)
                              const dt  = getEquipmentTypeConfig(r.deviceType)
                              return (
                                <div
                                  key={r.id}
                                  onClick={() => setDetailModal(r)}
                                  style={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderLeft: `3px solid ${urgencyBorder(r.urgency)}`,
                                    borderRadius: 8,
                                    padding: '11px 13px',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.borderColor = col.accent)}
                                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={{ color: '#a78bfa', fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>{r.id}</Text>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {!['completed', 'cancelled'].includes(r.status) && (() => {
                                        const days = daysSince(r.requestDate)
                                        return (
                                          <Text style={{ fontSize: 10, color: daysColor(days), whiteSpace: 'nowrap' }}>
                                            <ClockCircleOutlined style={{ marginRight: 2 }} />{days} วัน
                                          </Text>
                                        )
                                      })()}
                                      <Tag color={getPriorityConfig(r.urgency).color} style={{ fontSize: 10, padding: '0 5px', margin: 0 }}>
                                        {getPriorityConfig(r.urgency).label}
                                      </Tag>
                                    </div>
                                  </div>
                                  <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
                                    {r.deviceBrand || dt.label}
                                  </div>
                                  {r.assetNo && (
                                    <Text style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>
                                      {r.assetNo}
                                    </Text>
                                  )}
                                  <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>
                                    {r.requesterName} · {r.department}
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: 11, marginBottom: r.prNote ? 6 : 8, lineHeight: 1.5 }}>
                                    {r.symptom.length > 70 ? r.symptom.slice(0, 70) + '…' : r.symptom}
                                  </div>
                                  {r.prNote && (
                                    <div style={{ background: '#fb923c11', border: '1px solid #fb923c33', borderRadius: 4, padding: '4px 7px', marginBottom: 8 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                        <span style={{ color: '#fb923c', fontSize: 10, fontWeight: 600 }}>
                                          <ShoppingCartOutlined style={{ marginRight: 4 }} />ใบ PR / PO
                                        </span>
                                        {r.prDate && (() => {
                                          const prDays = daysSince(r.prDate)
                                          return (
                                            <span style={{ fontSize: 10, color: daysColor(prDays), whiteSpace: 'nowrap' }}>
                                              <ClockCircleOutlined style={{ marginRight: 2 }} />อนุมัติ {prDays} วัน
                                            </span>
                                          )
                                        })()}
                                      </div>
                                      <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.4 }}>
                                        {r.prNote.length > 80 ? r.prNote.slice(0, 80) + '…' : r.prNote}
                                      </div>
                                    </div>
                                  )}
                                  {r.replacementNote && (
                                    <div style={{ background: '#f472b611', border: '1px solid #f472b633', borderRadius: 4, padding: '4px 7px', marginBottom: 8 }}>
                                      <div style={{ color: '#f472b6', fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
                                        <SwapOutlined style={{ marginRight: 4 }} />แนะนำซื้อทดแทน
                                      </div>
                                      <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.4 }}>
                                        {r.replacementNote.length > 80 ? r.replacementNote.slice(0, 80) + '…' : r.replacementNote}
                                      </div>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Tag style={{ fontSize: 10, color: cat.color, borderColor: cat.color + '44', margin: 0, padding: '0 5px' }}>
                                      {cat.label}
                                    </Tag>
                                    {r.assignedTo && (
                                      <Text style={{ fontSize: 10, color: '#6ee7b7' }}>⚙ {r.assignedTo}</Text>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })(),
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
        footer={
          <Space>
            <Button onClick={() => setDetailModal(null)}>ปิด</Button>
            <Button icon={<PrinterOutlined />} onClick={() => detailModal && setPrintSlip(detailModal)} style={{ background: '#5b21b6', color: '#fff', borderColor: '#5b21b6' }}>
              พิมพ์ใบส่งซ่อม
            </Button>
          </Space>
        }
        width={1000}
        destroyOnHidden
      >
        {detailModal && (
          <>
            <Steps
              size="small"
              current={STEP_MAP[detailModal.status]}
              status={['cancelled', 'recommend_replacement'].includes(detailModal.status) ? 'error' : undefined}
              style={{ marginBottom: 24 }}
              items={[
                { title: 'รับคำร้อง',     icon: <FileTextOutlined /> },
                { title: 'กำลังซ่อม',     icon: <ToolOutlined /> },
                { title: 'รออะไหล่ / PR', icon: <ShoppingCartOutlined /> },
                {
                  title: detailModal.status === 'cancelled' ? 'ยกเลิก'
                       : detailModal.status === 'recommend_replacement' ? 'แนะนำซื้อทดแทน'
                       : 'ซ่อมเสร็จ',
                  icon: detailModal.status === 'cancelled' ? <CloseCircleOutlined />
                      : detailModal.status === 'recommend_replacement' ? <SwapOutlined />
                      : <CheckCircleOutlined />,
                },
              ]}
            />
            <Descriptions
              column={2}
              size="small"
              bordered
              styles={{ label: { color: '#94a3b8', background: '#0f172a', width: 130 }, content: { background: '#1e293b', color: '#e2e8f0' } }}
            >
              <Descriptions.Item label="เลขที่คำร้อง" span={1}>
                <Text style={{ color: '#a78bfa', fontWeight: 600 }}>{detailModal.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="วันที่แจ้ง">{detailModal.requestDate}</Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้ง">{detailModal.requesterName}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{detailModal.department}</Descriptions.Item>
              {detailModal.position && <Descriptions.Item label="ตำแหน่ง" span={2}>{detailModal.position}</Descriptions.Item>}
              <Descriptions.Item label="เบอร์ภายใน">{detailModal.phone}</Descriptions.Item>
              <Descriptions.Item label="ประเภทอุปกรณ์">
                {getEquipmentTypeConfig(detailModal.deviceType).label}
              </Descriptions.Item>
              <Descriptions.Item label="ยี่ห้อ/รุ่น" span={2}>{detailModal.deviceBrand || '-'}</Descriptions.Item>
              {detailModal.assetNo && <Descriptions.Item label="เลขครุภัณฑ์" span={2}><code style={{ color: '#a78bfa' }}>{detailModal.assetNo}</code></Descriptions.Item>}
              {detailModal.deviceSerial && <Descriptions.Item label="Serial No." span={2}><code style={{ color: '#a78bfa' }}>{detailModal.deviceSerial}</code></Descriptions.Item>}
              {detailModal.deviceLocation && <Descriptions.Item label="สถานที่ติดตั้ง" span={2}>{detailModal.deviceLocation}</Descriptions.Item>}
              <Descriptions.Item label="หมวดหมู่ปัญหา">
                {(() => { const c = getProblemCategoryConfig(detailModal.problemCategory); return <Tag style={{ color: c.color, borderColor: c.color + '55' }}>{c.label}</Tag> })()}
              </Descriptions.Item>
              <Descriptions.Item label="ความเร่งด่วน">
                <Tag color={getPriorityConfig(detailModal.urgency).color}>{getPriorityConfig(detailModal.urgency).label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="อาการที่แจ้ง" span={2} styles={{ content: { whiteSpace: 'pre-wrap' } }}>
                {detailModal.symptom}
              </Descriptions.Item>
              {detailModal.prNote && (
                <Descriptions.Item label={<span style={{ color: '#fb923c' }}><ShoppingCartOutlined style={{ marginRight: 4 }} />ใบ PR / อะไหล่</span>} span={2} styles={{ content: { color: '#fb923c', whiteSpace: 'pre-wrap' } }}>
                  {detailModal.prNote}
                </Descriptions.Item>
              )}
              {detailModal.replacementNote && (
                <Descriptions.Item label={<span style={{ color: '#f472b6' }}><SwapOutlined style={{ marginRight: 4 }} />ผลการประเมิน</span>} span={2} styles={{ content: { color: '#f472b6', whiteSpace: 'pre-wrap' } }}>
                  {detailModal.replacementNote}
                </Descriptions.Item>
              )}
            </Descriptions>

            {(detailModal.assignedTo || detailModal.prNote || detailModal.resolvedNote) && (
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>ความคืบหน้า</Text>
                <Timeline
                  items={[
                    { color: 'blue', content: <Text style={{ color: '#cbd5e1' }}>รับคำร้อง — {detailModal.requestDate}</Text> },
                    ...(detailModal.assignedTo ? [{ color: 'orange', content: <Text style={{ color: '#cbd5e1' }}>มอบหมาย <span style={{ color: '#6ee7b7' }}>{detailModal.assignedTo}</span></Text> }] : []),
                    ...(detailModal.prNote ? [{
                      color: '#fb923c',
                      icon: <ShoppingCartOutlined style={{ color: '#fb923c' }} />,
                      content: (
                        <div>
                          <Text style={{ color: '#fb923c', fontWeight: 600 }}>ออกใบ PR / รออะไหล่</Text>
                          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{detailModal.prNote}</div>
                        </div>
                      ),
                    }] : []),
                    ...(detailModal.replacementNote ? [{
                      color: '#f472b6',
                      icon: <SwapOutlined style={{ color: '#f472b6' }} />,
                      content: (
                        <div>
                          <Text style={{ color: '#f472b6', fontWeight: 600 }}>ประเมินแล้ว: แนะนำซื้อทดแทน</Text>
                          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{detailModal.replacementNote}</div>
                        </div>
                      ),
                    }] : []),
                    ...(detailModal.resolvedNote ? [{ color: 'green', content: <div><Text style={{ color: '#cbd5e1' }}>ซ่อมเสร็จ {detailModal.resolvedDate && `— ${detailModal.resolvedDate}`}</Text><div style={{ color: '#6ee7b7', marginTop: 4 }}>{detailModal.resolvedNote}</div></div> }] : []),
                  ]}
                />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ── Print Slip Modal ──────────────────────────────────────────────────── */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PrinterOutlined style={{ color: '#a78bfa' }} />
            ใบส่งซ่อม {printSlip?.id}
          </span>
        }
        open={!!printSlip}
        onCancel={() => setPrintSlip(null)}
        footer={<Button onClick={() => setPrintSlip(null)}>ปิด</Button>}
        width="90%"
        style={{ top: 24, maxWidth: 1100 }}
        styles={{ body: { padding: 0, height: '80vh' } }}
        destroyOnHidden
      >
        <div style={{ width: '100%', height: '100%' }}>
          {printSlip && <RepairSlipPDFViewer data={toSlipData(printSlip)} />}
        </div>
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
