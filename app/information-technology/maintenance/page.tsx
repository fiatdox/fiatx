'use client'
import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  ConfigProvider, App, theme, Form, Input, Select, Button, Upload, Table, Tag, Tabs,
  Typography, Breadcrumb, Row, Col, Card, Tooltip, Badge, InputNumber,
  Radio, Modal, Space, Avatar, Descriptions, Timeline, Spin, DatePicker, Image as AntImage,
} from 'antd'
import {
  DesktopOutlined, ToolOutlined, PaperClipOutlined, PlusOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, HomeOutlined, SearchOutlined, QrcodeOutlined,
  UserOutlined, EnvironmentOutlined, AppstoreOutlined, ShoppingCartOutlined, SwapOutlined,
  FileTextOutlined, WarningOutlined, EyeOutlined, InfoCircleOutlined, PrinterOutlined,
} from '@ant-design/icons'
import { FaMicrochip, FaPrint, FaLaptop, FaDesktop, FaNetworkWired } from 'react-icons/fa'
import Swal from 'sweetalert2'
import Cookies from 'js-cookie'
import Navbar from '@/app/components/Navbar'
import RepairKanbanView from '@/app/components/RepairKanbanView'
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
  it_repair_request_id: number
  equipment_number: string
  equipment_name: string
  brand: string | null
  location: string
  problem_description: string
  created_at: string
  equipment_type_name: string
  problem_category_name: string
  priority_name: string
  process_status_name: string
  process_status_id: number
  created_by_name: string
  major_name: string
  submajor_name: string | null
  it_priority_level_id?: number
}




interface EquipmentType {
  id: number
  name: string
}

interface EquipmentAsset {
  noid: string
  names: string
  models: string
  locates: string
  fy: string
  docno: string
  notes: string
  companyname: string
  perunits: number | null
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

interface ProcessStatus {
  id: number
  it_process_status_name: string
  description: string | null
}

interface RepairRequestImage {
  it_repair_request_image_id: number
  it_repair_request_id: number
  attach_file_name: string
  created_at: string
  created_by: number
}


const PROBLEM_CATEGORY_COLORS = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#94a3b8']

interface PriorityLevel {
  it_priority_level_id: number
  name: string
  description: string
  response_days: number | null
  display_order: number
}


const statusConfig: Record<number, { color: string; label: string; icon: React.ReactNode }> = {
  1: { color: 'warning',    label: 'รอดำเนินการ',        icon: <ClockCircleOutlined /> },
  2: { color: 'processing', label: 'กำลังซ่อม',          icon: <ToolOutlined /> },
  3: { color: 'orange',     label: 'รออะไหล่ / ออก PR',  icon: <ShoppingCartOutlined /> },
  4: { color: 'pink',       label: 'แนะนำซื้อทดแทน',     icon: <SwapOutlined /> },
  5: { color: 'success',    label: 'ซ่อมเสร็จแล้ว',      icon: <CheckCircleOutlined /> },
  6: { color: 'error',      label: 'ยกเลิก',              icon: <CloseCircleOutlined /> },
}



const PageContent = () => {
  const [form] = Form.useForm()
  const [requests, setRequests] = useState<RepairRequest[]>([])
  const [activeTab, setActiveTab] = useState('form')
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [assetResults, setAssetResults] = useState<EquipmentAsset[]>([])
  const [assetLoading, setAssetLoading] = useState(false)
  const [imageList, setImageList] = useState<any[]>([])
  const [detailModal, setDetailModal] = useState<RepairRequest | null>(null)
  const [printSlip, setPrintSlip] = useState<RepairRequest | null>(null)
  const [priorityLevels, setPriorityLevels] = useState<PriorityLevel[]>([])
  const [problemCategories, setProblemCategories] = useState<ProblemCategory[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [processStatuses, setProcessStatuses] = useState<ProcessStatus[]>([])
  const [filterStatusIds, setFilterStatusIds] = useState<number[]>([])
  const [filterDateRange, setFilterDateRange] = useState<[string, string] | null>(null)
  const [detailImages, setDetailImages] = useState<RepairRequestImage[]>([])
  const [detailImagesLoading, setDetailImagesLoading] = useState(false)
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
    fetch('/api/v1/it/process-statuses')
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setProcessStatuses(json.data) })
      .catch(() => {})
  }, [])

  const getPriorityColorByName = (name: string) => {
    const map: Record<string, { color: string; borderColor: string }> = {
      'ด่วนมาก': { color: 'error',      borderColor: '#ef4444' },
      'ด่วน':    { color: 'warning',    borderColor: '#f97316' },
      'ปานกลาง': { color: 'processing', borderColor: '#3b82f6' },
      'ปกติ':    { color: 'default',    borderColor: '#475569' },
    }
    return map[name] ?? { color: 'default', borderColor: '#475569' }
  }

  const getProblemCategoryColor = (name: string) => {
    const idx = problemCategories.findIndex(c => c.name === name)
    return PROBLEM_CATEGORY_COLORS[Math.max(0, Math.min(idx, PROBLEM_CATEGORY_COLORS.length - 1))]
  }

  // Used in form radio buttons (id-based lookup from loaded lists)
  const getPriorityConfig = (id: number) => {
    const level = priorityLevels.find(p => p.it_priority_level_id === id)
    const idx = Math.min((level?.display_order ?? 1) - 1, 3)
    const colors = ['default', 'processing', 'warning', 'error']
    return { label: level?.name ?? String(id), sla: level?.description ?? '', color: colors[idx] }
  }

  const getProblemCategoryConfig = (id: number) => {
    const cat = problemCategories.find(c => c.it_problem_category_id === id)
    const idx = Math.min((cat?.it_problem_category_id ?? 1) - 1, PROBLEM_CATEGORY_COLORS.length - 1)
    return { label: cat?.name ?? String(id), desc: cat?.description ?? '', color: PROBLEM_CATEGORY_COLORS[idx] }
  }

  const toSlipData = (r: RepairRequest): RepairSlipData => ({
    id:                   `IT-${String(r.it_repair_request_id).padStart(4, '0')}`,
    requestDate:          new Date(r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    status:               String(r.process_status_id),
    statusLabel:          statusConfig[r.process_status_id]?.label ?? r.process_status_name,
    requesterName:        r.created_by_name,
    position:             undefined,
    department:           r.major_name,
    phone:                '',
    equipmentTypeLabel:   r.equipment_type_name,
    deviceBrand:          r.brand ?? '',
    assetNo:              r.equipment_number,
    deviceSerial:         '',
    deviceLocation:       r.location,
    problemCategoryLabel: r.problem_category_name,
    priorityLabel:        r.priority_name,
    symptom:              r.problem_description,
    assignedTo:           undefined,
    resolvedDate:         undefined,
    resolvedNote:         undefined,
    prNote:               undefined,
    prDate:               undefined,
    replacementNote:      undefined,
  })

  useEffect(() => {
    if (!detailModal) { setDetailImages([]); return }
    setDetailImagesLoading(true)
    fetch(`/api/v1/it/repair-requests/${detailModal.it_repair_request_id}/images`)
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setDetailImages(json.data) })
      .catch(() => {})
      .finally(() => setDetailImagesLoading(false))
  }, [detailModal])

  const fetchRequests = (statusIds = filterStatusIds, dateRange = filterDateRange) => {
    const body: Record<string, unknown> = {}
    if (statusIds.length > 0) body.status = statusIds
    if (dateRange) { body.date1 = dateRange[0]; body.date2 = dateRange[1] }
    fetch('/api/v1/it/repair-requests/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setRequests(json.data) })
      .catch(() => {})
  }

  useEffect(() => { fetchRequests() }, [filterStatusIds, filterDateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!assetModalOpen) return
    const t = setTimeout(() => {
      setAssetLoading(true)
      fetch(`/api/v1/equipment/search?keyword=${encodeURIComponent(assetSearch.trim())}`)
        .then(r => r.json())
        .then(json => { if (Array.isArray(json.data)) setAssetResults(json.data) })
        .catch(() => {})
        .finally(() => setAssetLoading(false))
    }, 350)
    return () => clearTimeout(t)
  }, [assetSearch, assetModalOpen])

  const handleSelectItAsset = (asset: EquipmentAsset) => {
    form.setFieldsValue({
      assetNo:        asset.noid,
      assetNames:     asset.names,
      assetCompany:   asset.companyname,
      assetFy:        asset.fy,
      deviceBrand:    [asset.models].filter(Boolean).join(' '),
      deviceLocation: asset.locates,
      price:          asset.perunits ?? undefined,
    })
    setAssetModalOpen(false)
    setAssetSearch('')
    message.success(`เลือกครุภัณฑ์ ${asset.noid} แล้ว`)
  }

  const handleSubmit = async () => {
    let values: any
    try {
      values = await form.validateFields()
    } catch (err: any) {
      const msgs = (err?.errorFields ?? []).map((f: any) => `• ${f.errors[0]}`).join('<br>')
      Swal.fire({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        html: msgs || 'มีช่องที่จำเป็นต้องกรอกยังไม่ได้ระบุ',
        icon: 'warning',
        confirmButtonText: 'ตกลง',
        background: '#1e293b',
        color: '#e2e8f0',
        confirmButtonColor: '#6d28d9',
      })
      return
    }

    const { isConfirmed } = await Swal.fire({
      title: 'ยืนยันการแจ้งซ่อม?',
      text: 'ระบบจะบันทึกคำร้องและส่งให้เจ้าหน้าที่ IT ดำเนินการ',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      background: '#1e293b',
      color: '#e2e8f0',
      confirmButtonColor: '#6d28d9',
      cancelButtonColor: '#475569',
    })
    if (!isConfirmed) return

    // ดึง user_id จาก cookie
    const userId = (() => { try { return JSON.parse(Cookies.get('user_data') ?? '')?.id ?? null } catch { return null } })()
    if (!userId) {
      Swal.fire({ title: 'ไม่พบข้อมูลผู้ใช้', text: 'กรุณาเข้าสู่ระบบใหม่', icon: 'error', background: '#1e293b', color: '#e2e8f0', confirmButtonColor: '#6d28d9' })
      return
    }

    // Step 1: อัปโหลดภาพไปเก็บที่ public/it/maintenance ก่อน
    const filesToUpload = imageList.filter(f => f.originFileObj)
    if (filesToUpload.length > 0) {
      try {
        const uploadData = new FormData()
        filesToUpload.forEach(f => uploadData.append('images', f.originFileObj))
        const uploadRes = await fetch('/api/v1/it/maintenance/upload', { method: 'POST', body: uploadData })
        const uploadJson = await uploadRes.json()
        if (!uploadJson.success) {
          Swal.fire({ title: 'อัปโหลดรูปไม่สำเร็จ', text: uploadJson.message ?? 'เกิดข้อผิดพลาด', icon: 'error', background: '#1e293b', color: '#e2e8f0', confirmButtonColor: '#6d28d9' })
          return
        }
        // files saved to public/it/maintenance/ with UUID names
      } catch {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถอัปโหลดรูปได้', icon: 'error', background: '#1e293b', color: '#e2e8f0', confirmButtonColor: '#6d28d9' })
        return
      }
    }

    // Step 2: Build multipart payload ตาม API spec
    const formData = new FormData()
    formData.append('user_id', String(userId))
    formData.append('it_equipment_type_id', String(values.deviceType      ?? ''))
    formData.append('equipment_number',     values.assetNo         ?? '')
    formData.append('equipment_name',       values.assetNames      ?? '')
    formData.append('location',             values.deviceLocation  ?? '')
    formData.append('problem_category_id',  String(values.problemCategory ?? ''))
    formData.append('problem_description',  values.symptom         ?? '')
    formData.append('it_priority_level_id', String(values.urgency  ?? ''))
    if (values.deviceBrand)  formData.append('brand',        values.deviceBrand)
    if (values.price != null) formData.append('unit_price',  String(values.price))
    if (values.assetCompany) formData.append('company_name', values.assetCompany)
    if (values.assetFy)      formData.append('budget_year',  values.assetFy)
    filesToUpload.forEach(f => formData.append('images', f.originFileObj))

    let repairId: number | null = null
    try {
      const res = await fetch('/api/v1/it/repair-requests', { method: 'POST', body: formData })
      const json = await res.json()
      if (!json.success) {
        Swal.fire({ title: 'บันทึกไม่สำเร็จ', text: json.message ?? 'เกิดข้อผิดพลาด', icon: 'error', background: '#1e293b', color: '#e2e8f0', confirmButtonColor: '#6d28d9' })
        return
      }
      repairId = json.data?.it_repair_request_id ?? null
    } catch {
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', icon: 'error', background: '#1e293b', color: '#e2e8f0', confirmButtonColor: '#6d28d9' })
      return
    }

    form.resetFields()
    setImageList([])
    fetchRequests()
    setActiveTab('status')

    Swal.fire({
      title: 'บันทึกสำเร็จ!',
      text: repairId ? `เลขที่คำร้อง #${repairId}` : 'ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว',
      icon: 'success',
      confirmButtonText: 'ตกลง',
      background: '#1e293b',
      color: '#e2e8f0',
      confirmButtonColor: '#6d28d9',
    })
  }

  const pending = requests.filter((r) => r.process_status_id === 1).length

  const columns = [
    {
      title: 'เลขที่',
      dataIndex: 'it_repair_request_id',
      key: 'it_repair_request_id',
      width: 110,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>IT-{String(v).padStart(4, '0')}</Text>,
    },
    {
      title: 'วันที่แจ้ง',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (v: string) => new Date(v).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    },
    {
      title: 'ผู้แจ้ง',
      key: 'requester',
      width: 180,
      render: (_: unknown, r: RepairRequest) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={30} icon={<UserOutlined />} style={{ background: '#4c1d95', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{r.created_by_name}</div>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.major_name}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'อุปกรณ์',
      key: 'device',
      width: 190,
      render: (_: unknown, r: RepairRequest) => (
        <div>
          <Tag color="purple" style={{ marginBottom: 2 }}>{r.equipment_type_name}</Tag>
          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>{r.brand || '-'}</div>
          {r.equipment_number && <Text style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{r.equipment_number}</Text>}
        </div>
      ),
    },
    {
      title: 'หมวดหมู่',
      dataIndex: 'problem_category_name',
      key: 'problem_category_name',
      width: 130,
      render: (v: string) => {
        const color = getProblemCategoryColor(v)
        return <Tag color="default" style={{ color, borderColor: color + '55' }}>{v}</Tag>
      },
    },
    {
      title: 'อาการ',
      dataIndex: 'problem_description',
      key: 'problem_description',
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
      dataIndex: 'priority_name',
      key: 'priority_name',
      width: 110,
      render: (v: string) => <Tag color={getPriorityColorByName(v).color}>{v}</Tag>,
    },
    {
      title: 'สถานะ',
      dataIndex: 'process_status_id',
      key: 'process_status_id',
      width: 160,
      render: (v: number) => {
        const cfg = statusConfig[v] ?? { color: 'default', label: String(v), icon: null }
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
                        <Col xs={24} md={5}>
                          <Form.Item
                            name="deviceType"
                            label={<span style={{ color: '#94a3b8' }}>ประเภทอุปกรณ์ <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาเลือกประเภทอุปกรณ์' }]}
                          >
                            <Select
                              placeholder="เลือกประเภทอุปกรณ์"
                              allowClear
                              options={equipmentTypes.map((et) => ({
                                value: et.id,
                                label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{EQUIPMENT_TYPE_ICONS[et.id] ?? <ToolOutlined />}{et.name}</span>,
                              }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={5}>
                          <Form.Item label={<span style={{ color: '#94a3b8' }}>เลขครุภัณฑ์ <span style={{ color: '#f87171' }}>*</span></span>}>
                            <Space.Compact style={{ width: '100%' }}>
                              <Form.Item name="assetNo" noStyle rules={[{ required: true, message: 'กรุณาระบุเลขครุภัณฑ์' }]}>
                                <Input placeholder="เช่น IT-67-001" style={{ fontFamily: 'monospace' }} />
                              </Form.Item>
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
                        <Col xs={24} md={7}>
                          <Form.Item
                            name="assetNames"
                            label={<span style={{ color: '#94a3b8' }}>ชื่ออุปกรณ์ <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาระบุชื่ออุปกรณ์' }]}
                          >
                            <Input placeholder="ชื่อครุภัณฑ์" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
                          <Form.Item
                            name="assetCompany"
                            label={<span style={{ color: '#94a3b8' }}>บริษัท</span>}
                          >
                            <Input placeholder="บริษัทผู้ผลิต" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={3}>
                          <Form.Item
                            name="assetFy"
                            label={<span style={{ color: '#94a3b8' }}>ปีงบ</span>}
                          >
                            <Input placeholder="เช่น 67" style={{ fontFamily: 'monospace' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col xs={24} md={6}>
                          <Form.Item
                            name="deviceBrand"
                            label={<span style={{ color: '#94a3b8' }}>ยี่ห้อ / รุ่น</span>}
                          >
                            <Input placeholder="เช่น DELL OptiPlex 7090" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item
                            name="deviceLocation"
                            label={<span style={{ color: '#94a3b8' }}><EnvironmentOutlined style={{ marginRight: 4 }} />สถานที่ติดตั้งอุปกรณ์ <span style={{ color: '#f87171' }}>*</span></span>}
                            rules={[{ required: true, message: 'กรุณาระบุสถานที่ติดตั้ง' }]}
                          >
                            <Input placeholder="เช่น ห้องการเงิน ชั้น 2 อาคาร A" />
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
                        label={<span style={{ color: '#94a3b8' }}><PaperClipOutlined style={{ marginRight: 4 }} />ภาพถ่ายอาการ (ถ้ามี) <span style={{ color: '#64748b', fontSize: 11 }}>สูงสุด 3 รูป · JPG, PNG, WEBP เท่านั้น</span></span>}
                      >
                        <Upload
                          listType="picture-card"
                          fileList={imageList}
                          accept=".jpg,.jpeg,.png,.gif,.webp"
                          beforeUpload={(file) => {
                            const isImage = file.type.startsWith('image/')
                            if (!isImage) {
                              message.error(`${file.name} ไม่ใช่ไฟล์รูปภาพ`)
                              return Upload.LIST_IGNORE
                            }
                            if (imageList.length >= 3) {
                              message.error('อัปโหลดได้สูงสุด 3 รูปเท่านั้น')
                              return Upload.LIST_IGNORE
                            }
                            return false
                          }}
                          onChange={({ fileList }) => setImageList(fileList.slice(0, 3))}
                          onRemove={(file) => setImageList(prev => prev.filter(f => f.uid !== file.uid))}
                        >
                          {imageList.length < 3 && (
                            <div>
                              <UploadOutlined />
                              <div style={{ marginTop: 6, fontSize: 12 }}>อัปโหลดรูป</div>
                            </div>
                          )}
                        </Upload>
                      </Form.Item>
                    </div>

                    {/* ── Submit ──────────────────────────────────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <Button onClick={() => form.resetFields()}>ล้างข้อมูล</Button>
                      <Button
                        type="primary"
                        size="large"
                        icon={<ToolOutlined />}
                        style={{ minWidth: 180, background: '#6d28d9' }}
                        onClick={handleSubmit}
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
                  <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="กรองตามสถานะ"
                      style={{ minWidth: 240 }}
                      value={filterStatusIds}
                      onChange={(v) => setFilterStatusIds(v ?? [])}
                      options={processStatuses.map(s => ({ value: s.id, label: s.it_process_status_name }))}
                    />
                    <DatePicker.RangePicker
                      allowClear
                      placeholder={['วันที่เริ่ม', 'วันที่สิ้นสุด']}
                      style={{ width: 280 }}
                      onChange={(_, dateStrings) =>
                        setFilterDateRange(dateStrings?.[0] && dateStrings?.[1] ? [dateStrings[0], dateStrings[1]] : null)
                      }
                    />
                  </div>
                  <Table
                    dataSource={requests}
                    columns={columns}
                    rowKey="it_repair_request_id"
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
              children: (
                <RepairKanbanView
                  rows={requests}
                  onDetail={(row) => {
                    const full = requests.find(x => x.it_repair_request_id === row.it_repair_request_id)
                    if (full) setDetailModal(full)
                  }}
                />
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
        width={1200}
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
          dataSource={assetResults}
          rowKey="noid"
          loading={assetLoading}
          size="small"
          pagination={{ pageSize: 8, size: 'small' }}
          columns={[
            { title: 'เลขครุภัณฑ์', dataIndex: 'noid',        key: 'noid',        width: 120, render: (v: string) => <code style={{ color: '#a78bfa' }}>{v}</code> },
            { title: 'ชื่ออุปกรณ์',  dataIndex: 'names',       key: 'names' },
            { title: 'รุ่น',          dataIndex: 'models',      key: 'models',      width: 140 },
            { title: 'บริษัท',        dataIndex: 'companyname', key: 'companyname', width: 140 },
            { title: 'สถานที่',       dataIndex: 'locates',     key: 'locates',     width: 160, render: (v: string) => <Text style={{ color: '#94a3b8' }}>{v}</Text> },
            { title: 'ปีงบ',          dataIndex: 'fy',          key: 'fy',          width: 60  },
            {
              title: 'ราคา/หน่วย', dataIndex: 'perunits', key: 'perunits', width: 110, align: 'right' as const,
              render: (v: number | null) => v != null
                ? <Text style={{ color: '#6ee7b7', fontFamily: 'monospace' }}>{v.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text>
                : <Text style={{ color: '#475569' }}>-</Text>,
            },
            {
              title: 'เลือก', key: 'action', width: 70, align: 'center' as const,
              render: (_: any, record: EquipmentAsset) => (
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
            รายละเอียดคำร้อง IT-{String(detailModal?.it_repair_request_id ?? '').padStart(4, '0')}
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
            <Descriptions
              column={2}
              size="small"
              bordered
              styles={{ label: { color: '#94a3b8', background: '#0f172a', width: 130 }, content: { background: '#1e293b', color: '#e2e8f0' } }}
            >
              <Descriptions.Item label="เลขที่คำร้อง" span={1}>
                <Text style={{ color: '#a78bfa', fontWeight: 600 }}>IT-{String(detailModal.it_repair_request_id).padStart(4, '0')}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="วันที่แจ้ง">
                {new Date(detailModal.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Descriptions.Item>
              <Descriptions.Item label="ผู้แจ้ง">{detailModal.created_by_name}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{detailModal.major_name}</Descriptions.Item>
              {detailModal.submajor_name ? <Descriptions.Item label="แผนก" span={2}>{detailModal.submajor_name}</Descriptions.Item> : null}
              <Descriptions.Item label="ประเภทอุปกรณ์">{detailModal.equipment_type_name}</Descriptions.Item>
              <Descriptions.Item label="ยี่ห้อ/รุ่น">{detailModal.brand || '-'}</Descriptions.Item>
              {detailModal.equipment_number ? <Descriptions.Item label="เลขครุภัณฑ์" span={2}><code style={{ color: '#a78bfa' }}>{detailModal.equipment_number}</code></Descriptions.Item> : null}
              {detailModal.equipment_name ? <Descriptions.Item label="ชื่ออุปกรณ์" span={2}>{detailModal.equipment_name}</Descriptions.Item> : null}
              {detailModal.location ? <Descriptions.Item label="สถานที่ติดตั้ง" span={2}>{detailModal.location}</Descriptions.Item> : null}
              <Descriptions.Item label="หมวดหมู่ปัญหา">
                {(() => { const color = getProblemCategoryColor(detailModal.problem_category_name); return <Tag style={{ color, borderColor: color + '55' }}>{detailModal.problem_category_name}</Tag> })()}
              </Descriptions.Item>
              <Descriptions.Item label="ความเร่งด่วน">
                <Tag color={getPriorityColorByName(detailModal.priority_name).color}>{detailModal.priority_name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="อาการที่แจ้ง" span={2} styles={{ content: { whiteSpace: 'pre-wrap' } }}>
                {detailModal.problem_description}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>ความคืบหน้า</Text>
              <Timeline
                items={[
                  { color: 'blue', content: <Text style={{ color: '#cbd5e1' }}>รับคำร้อง — {new Date(detailModal.created_at).toLocaleDateString('th-TH')}</Text> },
                ]}
              />
            </div>

            {(detailImagesLoading || detailImages.length > 0) && (
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 8 }}>ภาพถ่ายอาการ</Text>
                {detailImagesLoading ? (
                  <Spin size="small" />
                ) : (
                  <AntImage.PreviewGroup>
                    <Space wrap>
                      {detailImages.map(img => (
                        <AntImage
                          key={img.it_repair_request_image_id}
                          src={`/api/v1/it/repair-request-images/${img.it_repair_request_image_id}/file`}
                          width={80}
                          height={80}
                          style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #334155' }}
                        />
                      ))}
                    </Space>
                  </AntImage.PreviewGroup>
                )}
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
            ใบส่งซ่อม IT-{String(printSlip?.it_repair_request_id ?? '').padStart(4, '0')}
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
