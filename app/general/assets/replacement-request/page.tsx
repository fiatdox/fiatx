'use client'
import React, { useState, useEffect, Suspense } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, InputNumber, Select, Divider, Row, Col, Alert,
  Descriptions, Steps, Space, message
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, SwapOutlined,
  CheckCircleOutlined, ShoppingCartOutlined, ExclamationCircleOutlined, ArrowRightOutlined
} from '@ant-design/icons'
import { FaExchangeAlt, FaFileAlt } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { useSearchParams } from 'next/navigation'

const { Title, Text } = Typography
const { TextArea } = Input

type ReplaceStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'pending_old_return' | 'completed'

interface ReplacementRequest {
  id: string
  woId: string
  retId?: string
  assetNo: string
  assetName: string
  department: string
  condition: string
  purchaseYear: string
  originalPrice: number
  repairHistory: string   // รายการซ่อมที่ผ่านมา
  reason: string
  proposedName: string    // ชื่อครุภัณฑ์ใหม่ที่เสนอ
  proposedSpec: string
  proposedBudget: number
  budgetType: string
  status: ReplaceStatus
  createdBy: string
  createdDate: string
  approvedBy?: string
  approvedDate?: string
  remark?: string
  newAssetArrivedDate?: string
  oldReturnConfirmedDate?: string
}

const MOCK_REPLACEMENTS: ReplacementRequest[] = [
  {
    id: 'REP-2026-001',
    woId: 'WO-2026-008', retId: 'RET-2026-001',
    assetNo: 'MED-65-001',
    assetName: 'Patient Monitor Mindray MEC-1200',
    department: 'งาน ICU',
    condition: 'Display module เสียหายอย่างถาวร ซ่อมไม่ได้คุ้มค่า',
    purchaseYear: '2565', originalPrice: 85000,
    repairHistory: 'ซ่อม 3 ครั้งใน 2 ปี รวมค่าซ่อม ฿23,500 (27.6% ของราคาเดิม)',
    reason: 'เครื่องมือแพทย์สำคัญสำหรับผู้ป่วยวิกฤต อาการเสียซ้ำซาก ซ่อมแล้วกลับมาใช้ได้ไม่นาน',
    proposedName: 'Patient Monitor ระบบ Multiparameter รุ่นใหม่',
    proposedSpec: 'SpO2, NIBP, ECG 12 Lead, Temp, EtCO2 / Touch Screen 15 นิ้ว',
    proposedBudget: 95000,
    budgetType: 'งบลงทุน — ค่าครุภัณฑ์การแพทย์',
    status: 'pending_approval',
    createdBy: 'นายวิชัย เครื่องมือดี', createdDate: '2026-04-05',
    approvedBy: undefined, approvedDate: undefined, remark: '',
  },
  {
    id: 'REP-2026-002',
    woId: 'WO-2026-001', retId: 'RET-2026-002',
    assetNo: 'MED-65-002',
    assetName: 'เครื่อง ECG 12 Leads Nihon Kohden ECG-2150',
    department: 'งานห้องผ่าตัด',
    condition: 'Electrode interface circuit เสียหาย ราคาอะไหล่แพงเกินคุ้ม',
    purchaseYear: '2563', originalPrice: 120000,
    repairHistory: 'ซ่อม 5 ครั้ง รวม ฿41,000 (34.2% ของราคาเดิม)',
    reason: 'อะไหล่หายากขึ้นเรื่อยๆ บริษัทอาจยุติการผลิตอะไหล่ในอีก 2 ปี',
    proposedName: 'เครื่อง ECG 12 Leads รุ่นใหม่',
    proposedSpec: 'WiFi / Cloud Storage / Color Display / USB Export',
    proposedBudget: 130000,
    budgetType: 'งบลงทุน — ค่าครุภัณฑ์การแพทย์',
    status: 'approved',
    createdBy: 'นายวิชัย เครื่องมือดี', createdDate: '2026-04-12',
    approvedBy: 'นพ.สมชาย ผู้อำนวยการ', approvedDate: '2026-04-13', remark: 'อนุมัติ ให้ดำเนินการจัดซื้อได้',
  },
  {
    id: 'REP-2026-003',
    woId: 'WO-2026-009', retId: 'RET-2026-001',
    assetNo: 'MED-20192-4',
    assetName: 'เครื่องวัดความดันโลหิตอัตโนมัติ Omron HEM-907',
    department: 'งานผู้ป่วยนอก OPD',
    condition: 'มอเตอร์อัดสูบเสียหาย ไม่อัดลมได้ ซ่อมไม่คุ้มค่า',
    purchaseYear: '2564', originalPrice: 25000,
    repairHistory: 'ซ่อม 2 ครั้ง รวม ฿6,500',
    reason: 'จำเป็นต้องใช้เครื่องวัดความดันสำหรับตรวจผู้ป่วยประจำวัน',
    proposedName: 'เครื่องวัดความดันโลหิตอัตโนมัติ รุ่นใหม่ (Omron/Welch Allyn)',
    proposedSpec: 'Wireless / Memory 99 readings / Automatic pressure release',
    proposedBudget: 28000,
    budgetType: 'เงินบำรุง — จัดซื้อทดแทน',
    status: 'pending_old_return',
    createdBy: 'นส.สมหญิง ผลไม้ดี', createdDate: '2026-04-10',
    approvedBy: 'นพ.สมชาย ผู้อำนวยการ', approvedDate: '2026-04-11', remark: 'อนุมัติแล้ว ขอให้จัดซื้อโดยด่วน',
    newAssetArrivedDate: '2026-04-13',
  },
]

const STATUS_TAG: Record<ReplaceStatus, { label: string; color: string }> = {
  draft:            { label: 'ร่าง',              color: 'default'    },
  pending_approval: { label: 'รออนุมัติ',          color: 'processing' },
  approved:         { label: 'อนุมัติแล้ว',         color: 'success'    },
  rejected:         { label: 'ไม่อนุมัติ',          color: 'error'      },
  ordered:          { label: 'ออกใบสั่งซื้อแล้ว',   color: 'purple'     },
  pending_old_return: { label: 'รอส่งคืนครุภัณฑ์เก่า', color: 'volcano' },
  completed:        { label: 'เสร็จสมบูรณ์',        color: 'green'      },
}

const BUDGET_TYPES = [
  { label: 'งบลงทุน — ค่าครุภัณฑ์การแพทย์',    value: 'งบลงทุน — ค่าครุภัณฑ์การแพทย์' },
  { label: 'งบลงทุน — ค่าครุภัณฑ์สำนักงาน',   value: 'งบลงทุน — ค่าครุภัณฑ์สำนักงาน' },
  { label: 'งบดำเนินการ — ค่าวัสดุ',           value: 'งบดำเนินการ — ค่าวัสดุ' },
  { label: 'เงินบำรุง — จัดซื้อทดแทน',         value: 'เงินบำรุง — จัดซื้อทดแทน' },
]

const DEPARTMENTS = [
  'งาน ICU', 'งานห้องผ่าตัด', 'งานผู้ป่วยนอก OPD', 'งานฉุกเฉิน',
  'งานการพยาบาล', 'งานสารสนเทศ', 'งานรักษาความปลอดภัย', 'งานอื่นๆ',
]

function ReplacementRequestPageInner() {
  const [requests, setRequests] = useState<ReplacementRequest[]>(MOCK_REPLACEMENTS)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [arrivedConfirmOpen, setArrivedConfirmOpen] = useState(false)
  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [aForm] = Form.useForm()

  const searchParams = useSearchParams()
  const woIdFromQuery = searchParams?.get('woId')
  const assetNoFromQuery = searchParams?.get('assetNo')

  // Auto-open create modal if navigated from work order
  useEffect(() => {
    if (woIdFromQuery) {
      form.setFieldsValue({ woId: woIdFromQuery, assetNo: assetNoFromQuery ?? '' })
      setCreateOpen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [woIdFromQuery])

  const detail = requests.find(r => r.id === detailId)
  const selectedReq = requests.find(r => r.id === selectedId)

  const pending = requests.filter(r => r.status === 'pending_approval')

  const handleCreate = (values: any) => {
    const newReq: ReplacementRequest = {
      id: `REP-2026-00${requests.length + 1}`,
      woId: values.woId || '',
      retId: undefined,
      assetNo: values.assetNo || '',
      assetName: values.assetName,
      department: values.department,
      condition: values.condition,
      purchaseYear: values.purchaseYear || '',
      originalPrice: values.originalPrice || 0,
      repairHistory: values.repairHistory || '',
      reason: values.reason,
      proposedName: values.proposedName,
      proposedSpec: values.proposedSpec || '',
      proposedBudget: values.proposedBudget || 0,
      budgetType: values.budgetType || '',
      status: 'pending_approval',
      createdBy: 'ผู้ใช้งานปัจจุบัน',
      createdDate: '2026-04-13',
    }
    setRequests(prev => [newReq, ...prev])
    setCreateOpen(false)
    form.resetFields()
  }

  const handleApprove = () => {
    if (!selectedId) return
    setRequests(prev => prev.map(r =>
      r.id === selectedId
        ? { ...r, status: 'approved' as ReplaceStatus, approvedBy: 'ผู้อนุมัติปัจจุบัน', approvedDate: '2026-04-13', remark: aForm.getFieldValue('remark') }
        : r
    ))
    setApproveOpen(false)
    aForm.resetFields()
  }

  const handleAssetArrived = () => {
    if (!selectedId) return
    setRequests(prev => prev.map(r =>
      r.id === selectedId
        ? { ...r, status: 'pending_old_return' as ReplaceStatus, newAssetArrivedDate: '2026-04-13' }
        : r
    ))
    setArrivedConfirmOpen(false)
  }

  const handleReturnConfirmed = () => {
    if (!selectedId) return
    setRequests(prev => prev.map(r =>
      r.id === selectedId
        ? { ...r, status: 'completed' as ReplaceStatus, oldReturnConfirmedDate: '2026-04-13' }
        : r
    ))
    setReturnConfirmOpen(false)
  }

  const columns = [
    { title: 'เลขที่', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => (
        <Text style={{ color: '#FF6500', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => setDetailId(v)}>{v}</Text>
      )},
    { title: 'ใบงานซ่อม', dataIndex: 'woId', key: 'wo', width: 120,
      render: (v: string) => <Text style={{ color: '#60a5fa' }}>{v}</Text> },
    { title: 'ครุภัณฑ์เดิม', key: 'asset',
      render: (_: any, r: ReplacementRequest) => (
        <div>
          <div>{r.assetName}</div>
          <Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.assetNo} — {r.department}</Text>
        </div>
      )},
    { title: 'ครุภัณฑ์ที่เสนอ', dataIndex: 'proposedName', key: 'prop',
      render: (v: string) => <Text style={{ color: '#6ee7b7' }}>{v}</Text> },
    { title: 'วงเงิน', dataIndex: 'proposedBudget', key: 'budget', width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
    { title: 'วันที่', dataIndex: 'createdDate', key: 'date', width: 110,
      render: (v: string) => <Text style={{ color: '#94a3b8' }}>{v}</Text> },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 140,
      render: (v: ReplaceStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].label}</Tag> },
    { title: '', key: 'act', width: 200,
      render: (_: any, r: ReplacementRequest) => {
        const handleReturnLink = () => {
          window.location.href = `/general/assets/return?rrId=${r.id}&woId=${r.woId}&assetNo=${r.assetNo}`
        }
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {r.status === 'pending_approval' && (
              <Button type="primary" size="small" block
                onClick={() => { setSelectedId(r.id); setApproveOpen(true) }}>
                อนุมัติ
              </Button>
            )}
            {r.status === 'ordered' && (
              <Button type="primary" size="small" block
                onClick={() => { setSelectedId(r.id); setArrivedConfirmOpen(true) }}>
                แจ้งของใหม่มาถึง
              </Button>
            )}
            {r.status === 'pending_old_return' && (
              <>
                <Button type="primary" danger size="small" block
                  onClick={() => { setSelectedId(r.id); setReturnConfirmOpen(true) }}>
                  ยืนยันรับคืนของเก่าแล้ว
                </Button>
                <Button type="link" size="small"
                  onClick={handleReturnLink}>
                  ไปหน้าส่งคืน <ArrowRightOutlined />
                </Button>
              </>
            )}
            <Button size="small" onClick={() => setDetailId(r.id)}>ดู</Button>
          </Space>
        )
      }},
  ]

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { title: 'เสนอซื้อทดแทนครุภัณฑ์' },
          ]} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <FaExchangeAlt style={{ fontSize: 24, color: '#FF6500' }} />
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>เสนอซื้อทดแทนครุภัณฑ์</Title>
          </div>

          {/* Flow Steps */}
          <Card style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}>
            <Steps size="small" items={[
              { title: 'ซ่อมไม่ได้',          status: 'finish' },
              { title: 'ส่งคืนพัสดุ',         status: 'finish' },
              { title: 'เสนอซื้อทดแทน',       status: 'process' },
              { title: 'อนุมัติ',              status: 'wait' },
              { title: 'สั่งซื้อ',             status: 'wait' },
              { title: 'รับคืนของเก่า',       status: 'wait' },
            ]} />
          </Card>

          {pending.length > 0 && (
            <Alert type="warning" showIcon style={{ marginBottom: 16 }}
              message={`มีเรื่องรออนุมัติ ${pending.length} รายการ`} />
          )}

          <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <Table dataSource={requests} columns={columns} rowKey="id" size="small"
              scroll={{ x: 1000 }} pagination={{ pageSize: 10 }} />
          </Card>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        title={<span><FaFileAlt style={{ color: '#FF6500', marginRight: 8 }} />{detail?.id}</span>}
        open={!!detailId}
        onCancel={() => setDetailId(null)}
        footer={null}
        width={720}
      >
        {detail && (
          <div>
            {detail.status === 'pending_old_return' && (
              <Alert
                type="error"
                showIcon
                message="ยังไม่สามารถใช้ครุภัณฑ์ใหม่ได้"
                description={`กรุณาส่งคืนครุภัณฑ์เก่า (${detail.retId ?? detail.assetNo}) เข้าคลังพัสดุก่อน`}
                style={{ marginBottom: 16 }}
              />
            )}
            <Descriptions column={2} size="small"
              labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}
              style={{ marginTop: 8 }}>
              <Descriptions.Item label="เลขที่">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="สถานะ">
                <Tag color={STATUS_TAG[detail.status].color}>{STATUS_TAG[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ใบงานซ่อม">
                <Text style={{ color: '#60a5fa' }}>{detail.woId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="เลขที่คืนพัสดุ">
                {detail.retId
                  ? <Text style={{ color: '#FF6500' }}>{detail.retId}</Text>
                  : <Text style={{ color: '#475569' }}>—</Text>}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: '#334155' }}>ครุภัณฑ์เดิม</Divider>
            <Descriptions column={2} size="small"
              labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}>
              <Descriptions.Item label="ชื่อครุภัณฑ์" span={2}>{detail.assetName}</Descriptions.Item>
              <Descriptions.Item label="เลขทะเบียน">
                <Text style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{detail.assetNo}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{detail.department}</Descriptions.Item>
              <Descriptions.Item label="ปีที่ซื้อ">พ.ศ. {detail.purchaseYear}</Descriptions.Item>
              <Descriptions.Item label="ราคาเดิม">
                <Text style={{ color: '#a78bfa' }}>฿{detail.originalPrice.toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ประวัติซ่อม" span={2}>
                <Text style={{ color: '#fbbf24' }}>{detail.repairHistory}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="เหตุผล" span={2}>{detail.condition}</Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: '#334155' }}>ครุภัณฑ์ที่เสนอซื้อทดแทน</Divider>
            <Descriptions column={2} size="small"
              labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}>
              <Descriptions.Item label="ชื่อรายการ" span={2}>
                <Text style={{ color: '#6ee7b7', fontWeight: 600 }}>{detail.proposedName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="คุณสมบัติ" span={2}>{detail.proposedSpec}</Descriptions.Item>
              <Descriptions.Item label="วงเงินที่เสนอ">
                <Text style={{ color: '#a78bfa', fontWeight: 700, fontSize: 16 }}>
                  ฿{detail.proposedBudget.toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="ประเภทงบ">{detail.budgetType}</Descriptions.Item>
            </Descriptions>

            {detail.approvedBy && (
              <>
                <Divider style={{ borderColor: '#334155' }}>ผลการอนุมัติ</Divider>
                <Descriptions column={2} size="small"
                  labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}>
                  <Descriptions.Item label="ผู้อนุมัติ">{detail.approvedBy}</Descriptions.Item>
                  <Descriptions.Item label="วันที่อนุมัติ">{detail.approvedDate}</Descriptions.Item>
                  <Descriptions.Item label="หมายเหตุ" span={2}>{detail.remark || '—'}</Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        title={<span><CheckCircleOutlined style={{ color: '#22c55e', marginRight: 8 }} />อนุมัติเสนอซื้อทดแทน</span>}
        open={approveOpen}
        onCancel={() => { setApproveOpen(false); aForm.resetFields() }}
        onOk={handleApprove}
        okText="อนุมัติ"
        okButtonProps={{ style: { background: '#22c55e', borderColor: '#22c55e' } }}
        width={500}
      >
        {selectedReq && (
          <div style={{ marginTop: 8 }}>
            <Alert type="info" showIcon style={{ marginBottom: 16 }}
              message={selectedReq.proposedName}
              description={`วงเงิน ฿${selectedReq.proposedBudget.toLocaleString()} — ${selectedReq.budgetType}`}
            />
            <Form form={aForm} layout="vertical">
              <Form.Item label="หมายเหตุ / เงื่อนไขการอนุมัติ" name="remark">
                <TextArea rows={3} placeholder="ระบุเงื่อนไขหรือความเห็นเพิ่มเติม..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        title={<span><SwapOutlined style={{ color: '#FF6500', marginRight: 8 }} />ยื่นเสนอซื้อทดแทนครุภัณฑ์</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="ส่งเรื่อง"
        width={680}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} onFinish={handleCreate}>
          <Divider style={{ borderColor: '#334155', color: '#94a3b8', fontSize: 13 }}>
            ข้อมูลครุภัณฑ์เดิม
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="เลขที่ใบงานซ่อม" name="woId">
                <Input placeholder="WO-2026-XXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="เลขทะเบียนครุภัณฑ์" name="assetNo">
                <Input placeholder="MED-65-001" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="ชื่อครุภัณฑ์เดิม" name="assetName" rules={[{ required: true }]}>
            <Input placeholder="ชื่อเต็มพร้อมรุ่น" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="หน่วยงาน" name="department" rules={[{ required: true }]}>
                <Select options={DEPARTMENTS.map(d => ({ label: d, value: d }))} placeholder="เลือกหน่วยงาน" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="ปีที่ซื้อ (พ.ศ.)" name="purchaseYear">
                <Input placeholder="2563" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="ราคาเดิม (บาท)" name="originalPrice">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="สภาพ/เหตุที่ซ่อมไม่ได้" name="condition" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="อธิบายสภาพและเหตุผลที่ไม่สามารถซ่อมได้..." />
          </Form.Item>
          <Form.Item label="ประวัติการซ่อม (ถ้ามี)" name="repairHistory">
            <Input placeholder="เช่น ซ่อม 3 ครั้ง รวม ฿20,000" />
          </Form.Item>
          <Form.Item label="เหตุผลความจำเป็น" name="reason" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="อธิบายความจำเป็นต้องซื้อทดแทน..." />
          </Form.Item>

          <Divider style={{ borderColor: '#334155', color: '#94a3b8', fontSize: 13 }}>
            ครุภัณฑ์ที่เสนอซื้อทดแทน
          </Divider>
          <Form.Item label="ชื่อรายการที่เสนอ" name="proposedName" rules={[{ required: true }]}>
            <Input placeholder="ชื่อครุภัณฑ์ใหม่ที่ต้องการ" />
          </Form.Item>
          <Form.Item label="คุณสมบัติที่ต้องการ (Spec)" name="proposedSpec">
            <TextArea rows={2} placeholder="ระบุ specification ที่สำคัญ..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="วงเงินที่เสนอ (บาท)" name="proposedBudget" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ประเภทงบประมาณ" name="budgetType" rules={[{ required: true }]}>
                <Select options={BUDGET_TYPES} placeholder="เลือกประเภทงบ" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Asset Arrived Confirmation Modal */}
      <Modal
        title="ยืนยันการรับครุภัณฑ์ใหม่"
        open={arrivedConfirmOpen}
        onCancel={() => setArrivedConfirmOpen(false)}
        onOk={handleAssetArrived}
        okText="ยืนยัน"
        okButtonProps={{ style: { background: '#6366f1', borderColor: '#6366f1' } }}
        width={500}
      >
        <p>ยืนยันว่ากำลังรับครุภัณฑ์ใหม่เข้ามาแล้ว</p>
        <p>ระบบจะเปลี่ยนสถานะเป็น <Tag color="volcano">รอส่งคืนครุภัณฑ์เก่า</Tag></p>
        <Alert type="warning" showIcon
          message="กรุณาดำเนินการส่งคืนครุภัณฑ์เก่าเข้าคลังพัสดุให้ด่วน"
          style={{ marginTop: 16 }} />
      </Modal>

      {/* Return Confirmed Modal */}
      <Modal
        title="ยืนยันการรับคืนครุภัณฑ์เก่า"
        open={returnConfirmOpen}
        onCancel={() => setReturnConfirmOpen(false)}
        onOk={handleReturnConfirmed}
        okText="ยืนยัน"
        okButtonProps={{ style: { background: '#22c55e', borderColor: '#22c55e' } }}
        width={500}
      >
        <p>ยืนยันว่าได้รับคืนครุภัณฑ์เก่าเข้าคลังพัสดุเรียบร้อยแล้ว</p>
        <p>ระบบจะเปลี่ยนสถานะเป็น <Tag color="green">เสร็จสมบูรณ์</Tag></p>
        <Alert type="success" showIcon
          message="สามารถใช้ครุภัณฑ์ใหม่ได้แล้ว"
          style={{ marginTop: 16 }} />
      </Modal>
    </ConfigProvider>
  )
}

export default function ReplacementRequestPage() {
  return (
    <Suspense fallback={null}>
      <ReplacementRequestPageInner />
    </Suspense>
  )
}
