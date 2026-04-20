'use client'
import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Form, Input, Select, Upload, Divider, Row, Col, Alert, Steps, Modal,
  Descriptions, Timeline, Badge, Space
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, InboxOutlined, CheckCircleOutlined,
  CameraOutlined, UserOutlined, SafetyOutlined, WarningOutlined,
  ClockCircleOutlined, PlusOutlined
} from '@ant-design/icons'
import { FaExchangeAlt, FaWarehouse, FaQrcode, FaUserShield } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { TextArea } = Input

// ─── Types ────────────────────────────────────────────────────────────────────
type ReturnStatus =
  | 'pending_tech'      // รอช่างส่ง
  | 'tech_submitted'    // ช่างส่งแล้ว รอหัวหน้าช่างยืนยัน
  | 'supervisor_ok'     // หัวหน้าช่างยืนยัน รอพัสดุรับ
  | 'warehouse_received'// พัสดุรับแล้ว บันทึกสถานที่
  | 'completed'         // ครบกระบวนการ

interface AssetReturn {
  id: string
  woId: string
  rrId?: string  // REP-XXXX ที่ลิงก์กัน
  assetNo: string
  assetName: string
  department: string
  condition: 'irreparable' | 'damaged' | 'obsolete'
  status: ReturnStatus
  // Chain of custody
  techName: string
  techSubmitDate?: string
  techPhotos: number   // จำนวนรูปที่ช่างถ่าย
  techNote?: string
  supervisorName?: string
  supervisorDate?: string
  supervisorNote?: string
  warehouseStaff?: string
  warehouseDate?: string
  warehouseLocation?: string  // เช่น ห้องพัสดุ ชั้น B1 ราวA3 ช่อง5
  warehousePhotos: number
  qrCode?: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_RETURNS: AssetReturn[] = [
  {
    id: 'RET-2026-001', woId: 'WO-2026-008', rrId: 'REP-2026-003', assetNo: 'MED-65-001',
    assetName: 'Patient Monitor Mindray MEC-1200 (จอแสดงผลพัง)', department: 'งาน ICU',
    condition: 'irreparable', status: 'completed',
    techName: 'นายวิชัย เครื่องมือดี', techSubmitDate: '2026-04-02 14:30', techPhotos: 5,
    techNote: 'ส่งคืนครุภัณฑ์ครบ ไม่มีชิ้นส่วนขาดหาย display module เสียหายไม่สามารถซ่อมได้',
    supervisorName: 'นายสมชัย หัวหน้าช่าง', supervisorDate: '2026-04-02 16:00',
    supervisorNote: 'ตรวจสอบแล้ว ครุภัณฑ์ครบสมบูรณ์ตามที่ช่างแจ้ง',
    warehouseStaff: 'นางสาวพัสดุ จัดเก็บดี', warehouseDate: '2026-04-03 09:00',
    warehouseLocation: 'ห้องพัสดุ B1 — ราว A ชั้น 3 ช่อง 7', warehousePhotos: 4,
    qrCode: 'QR-MED-65-001-RET',
  },
  {
    id: 'RET-2026-002', woId: 'WO-2026-001', assetNo: 'MED-65-001',
    assetName: 'เครื่อง ECG 12 Leads Nihon Kohden ECG-2150', department: 'งานห้องผ่าตัด',
    condition: 'irreparable', status: 'supervisor_ok',
    techName: 'นายวิชัย เครื่องมือดี', techSubmitDate: '2026-04-12 10:15', techPhotos: 6,
    techNote: 'ส่งคืนครุภัณฑ์ — เครื่องครบ รวมสาย lead wire 10 เส้น และ electrode module เดิม',
    supervisorName: 'นายสมชัย หัวหน้าช่าง', supervisorDate: '2026-04-12 14:00',
    supervisorNote: 'ตรวจแล้ว ครบถ้วน อนุมัติส่งให้พัสดุ',
    warehouseStaff: undefined, warehouseDate: undefined, warehouseLocation: undefined,
    warehousePhotos: 0, qrCode: undefined,
  },
  {
    id: 'RET-2026-003', woId: 'WO-2026-005', assetNo: 'ก.005-67-002',
    assetName: 'กล้อง CCTV Hikvision 2MP', department: 'งานรักษาความปลอดภัย',
    condition: 'damaged', status: 'tech_submitted',
    techName: 'นายสมศักดิ์ แอร์เย็น', techSubmitDate: '2026-04-13 08:30', techPhotos: 3,
    techNote: 'กล้องภาพเสียหาย lens แตก — ส่งคืนพร้อมขายึด',
    supervisorName: undefined, supervisorDate: undefined, supervisorNote: undefined,
    warehouseStaff: undefined, warehouseDate: undefined, warehouseLocation: undefined,
    warehousePhotos: 0, qrCode: undefined,
  },
]

const CONDITION_TAG: Record<string, { label: string; color: string }> = {
  irreparable: { label: 'ซ่อมไม่ได้',     color: 'error'   },
  damaged:     { label: 'เสียหาย',        color: 'warning' },
  obsolete:    { label: 'เสื่อมสภาพ',     color: 'default' },
}

const STATUS_STEP: Record<ReturnStatus, number> = {
  pending_tech: 0, tech_submitted: 1, supervisor_ok: 2, warehouse_received: 3, completed: 4
}

const STATUS_TAG: Record<ReturnStatus, { label: string; color: string }> = {
  pending_tech:       { label: 'รอช่างส่ง',          color: 'default'    },
  tech_submitted:     { label: 'รอหัวหน้าช่างยืนยัน', color: 'processing' },
  supervisor_ok:      { label: 'รอพัสดุรับ',          color: 'warning'    },
  warehouse_received: { label: 'พัสดุรับแล้ว',        color: 'success'    },
  completed:          { label: 'เสร็จสมบูรณ์',        color: 'success'    },
}

const SUPERVISORS = ['นายสมชัย หัวหน้าช่าง', 'นางสาวมาลี หัวหน้างาน']
const WAREHOUSE_STAFF = ['นางสาวพัสดุ จัดเก็บดี', 'นายพงษ์ศักดิ์ คลังสมบัติ']

function AssetReturnPageInner() {
  const [returns, setReturns] = useState<AssetReturn[]>(MOCK_RETURNS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [supervisorOpen, setSupervisorOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()
  const [wForm] = Form.useForm()
  const [sForm] = Form.useForm()

  const searchParams = useSearchParams()
  const rrIdFromQuery = searchParams?.get('rrId')
  const woIdFromQuery = searchParams?.get('woId')
  const assetNoFromQuery = searchParams?.get('assetNo')

  // Auto-open create modal if navigated from replacement request
  useEffect(() => {
    if (rrIdFromQuery) {
      form.setFieldsValue({
        rrId: rrIdFromQuery,
        woId: woIdFromQuery ?? '',
        assetNo: assetNoFromQuery ?? '',
      })
      setCreateOpen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rrIdFromQuery])

  const selected = returns.find(r => r.id === selectedId)

  const pendingWarehouse = returns.filter(r => r.status === 'supervisor_ok')
  const pendingSupervisor = returns.filter(r => r.status === 'tech_submitted')

  const handleSupervisorApprove = () => {
    if (!selectedId) return
    setReturns(prev => prev.map(r => r.id === selectedId
      ? { ...r, status: 'supervisor_ok' as ReturnStatus, supervisorName: SUPERVISORS[0], supervisorDate: '2026-04-13 15:00', supervisorNote: sForm.getFieldValue('note') ?? '' }
      : r
    ))
    setSupervisorOpen(false)
    sForm.resetFields()
  }

  const handleWarehouseReceive = () => {
    if (!selectedId) return
    setReturns(prev => prev.map(r => r.id === selectedId
      ? {
          ...r,
          status: 'completed' as ReturnStatus,
          warehouseStaff: WAREHOUSE_STAFF[0],
          warehouseDate: '2026-04-13 15:30',
          warehouseLocation: wForm.getFieldValue('location'),
          warehousePhotos: 3,
          qrCode: `QR-${r.assetNo}-RET`,
        }
      : r
    ))
    setWarehouseOpen(false)
    wForm.resetFields()
  }

  const columns = [
    { title: 'เลขที่', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedId(v)}>{v}</Text> },
    { title: 'ครุภัณฑ์', key: 'asset', render: (_: any, r: AssetReturn) => (
      <div>
        <Tag color="orange" style={{ fontSize: 10, marginBottom: 4 }}>{r.assetNo}</Tag>
        <div style={{ fontSize: 13 }}>{r.assetName}</div>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.department}</Text>
      </div>
    )},
    { title: 'สภาพ', dataIndex: 'condition', key: 'cond', width: 110,
      render: (v: string) => <Tag color={CONDITION_TAG[v].color}>{CONDITION_TAG[v].label}</Tag> },
    { title: 'ช่างผู้ส่ง', dataIndex: 'techName', key: 'tech', width: 170,
      render: (v: string, r: AssetReturn) => (
        <div>
          <div style={{ fontSize: 13 }}>{v}</div>
          {r.techSubmitDate && <Text style={{ fontSize: 11, color: '#64748b' }}>{r.techSubmitDate}</Text>}
          {r.techPhotos > 0 && <Tag style={{ fontSize: 10, marginLeft: 4 }}><CameraOutlined /> {r.techPhotos} รูป</Tag>}
        </div>
      )},
    { title: 'Chain of Custody', key: 'chain', render: (_: any, r: AssetReturn) => {
      const step = STATUS_STEP[r.status]
      return (
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { icon: <UserOutlined />,    label: 'ช่าง',       done: step >= 1, color: '#3b82f6' },
            { icon: <SafetyOutlined />,  label: 'หน.ช่าง',   done: step >= 2, color: '#f59e0b' },
            { icon: <FaWarehouse />,     label: 'พัสดุ',      done: step >= 3, color: '#10b981' },
            { icon: <FaQrcode />,        label: 'QR',         done: step >= 4, color: '#a78bfa' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', opacity: s.done ? 1 : 0.3 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.done ? s.color : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', margin: '0 auto 2px' }}>
                {s.icon}
              </div>
              <Text style={{ fontSize: 9, color: s.done ? s.color : '#475569' }}>{s.label}</Text>
            </div>
          ))}
        </div>
      )
    }},
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 150,
      render: (v: ReturnStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].label}</Tag> },
    { title: 'จัดเก็บที่', dataIndex: 'warehouseLocation', key: 'loc', width: 180,
      render: (v?: string) => v
        ? <Text style={{ color: '#6ee7b7', fontSize: 12 }}>{v}</Text>
        : <Text style={{ color: '#475569', fontSize: 12 }}>ยังไม่รับเข้าคลัง</Text> },
    { title: '', key: 'act', width: 120, render: (_: any, r: AssetReturn) => (
      r.status === 'tech_submitted'
        ? <Button size="small" icon={<SafetyOutlined />} onClick={() => { setSelectedId(r.id); setSupervisorOpen(true) }}>หน.ช่างยืนยัน</Button>
        : r.status === 'supervisor_ok'
        ? <Button type="primary" size="small" icon={<InboxOutlined />} onClick={() => { setSelectedId(r.id); setWarehouseOpen(true) }}>พัสดุรับเข้าคลัง</Button>
        : r.status === 'completed'
        ? <Button size="small" onClick={() => setSelectedId(r.id)}>ดูรายละเอียด</Button>
        : null
    )},
  ]

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { title: 'ส่งคืนครุภัณฑ์เสีย' },
          ]} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FaExchangeAlt style={{ fontSize: 24, color: '#FF6500' }} />
              <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>ส่งคืนครุภัณฑ์เสีย / Chain of Custody</Title>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              ส่งคืนครุภัณฑ์ใหม่
            </Button>
          </div>

          {/* Alert badges */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {pendingSupervisor.length > 0 && (
              <Col xs={24} md={12}>
                <Alert type="warning" showIcon icon={<SafetyOutlined />}
                  message={<span>รอหัวหน้าช่างยืนยัน <Badge count={pendingSupervisor.length} style={{ marginLeft: 8 }} /></span>}
                  description="มีครุภัณฑ์ที่ช่างส่งคืนแล้ว รอหัวหน้าช่างตรวจสอบ" />
              </Col>
            )}
            {pendingWarehouse.length > 0 && (
              <Col xs={24} md={12}>
                <Alert type="error" showIcon icon={<FaWarehouse />}
                  message={<span>รอพัสดุรับเข้าคลัง <Badge count={pendingWarehouse.length} color="error" style={{ marginLeft: 8 }} /></span>}
                  description="ครุภัณฑ์ผ่านการยืนยันจากหัวหน้าช่างแล้ว — กรุณารับเข้าคลังโดยเร็ว" />
              </Col>
            )}
          </Row>

          {/* Chain of Custody Info */}
          <Card size="small" style={{ background: '#0c1a2e', border: '1px solid #1e3a5f', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <FaUserShield style={{ color: '#60a5fa', fontSize: 20, marginTop: 2 }} />
              <div>
                <Text style={{ color: '#93c5fd', fontWeight: 600 }}>ระบบ Chain of Custody — ป้องกันครุภัณฑ์สูญหาย</Text>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                  ทุกขั้นตอนต้องมี: <b style={{ color: '#e2e8f0' }}>รูปถ่าย + ชื่อผู้ดำเนินการ + วันเวลา + ลายเซ็น</b>
                  &nbsp;·&nbsp; ครุภัณฑ์ต้องผ่าน 4 ด่าน: ช่าง → หัวหน้าช่าง → พัสดุรับ → QR ติดตาม
                </div>
              </div>
            </div>
          </Card>

          <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <Table dataSource={returns} columns={columns} rowKey="id" size="small" scroll={{ x: 1100 }} pagination={{ pageSize: 10 }} />
          </Card>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        title={<span><FaExchangeAlt style={{ color: '#FF6500', marginRight: 8 }} />รายละเอียด — {selected?.id}</span>}
        open={!!selectedId && !warehouseOpen && !supervisorOpen}
        onCancel={() => setSelectedId(null)}
        footer={null}
        width={680}
      >
        {selected && (
          <div style={{ marginTop: 8 }}>
            <Steps
              size="small"
              current={STATUS_STEP[selected.status]}
              style={{ marginBottom: 20 }}
              items={[
                { title: 'รอช่างส่ง' },
                { title: 'ช่างส่งแล้ว' },
                { title: 'หน.ช่างยืนยัน' },
                { title: 'พัสดุรับ' },
                { title: 'เสร็จสมบูรณ์' },
              ]}
            />

            <Timeline items={[
              {
                color: 'blue',
                icon: <UserOutlined />,
                children: (
                  <div>
                    <Text style={{ color: '#60a5fa', fontWeight: 600 }}>ช่าง: {selected.techName}</Text>
                    <Text style={{ color: '#64748b', fontSize: 11, display: 'block' }}>{selected.techSubmitDate ?? 'ยังไม่ส่ง'}</Text>
                    <Text style={{ color: '#e2e8f0', fontSize: 12 }}>{selected.techNote}</Text>
                    {selected.techPhotos > 0 && <Tag style={{ marginTop: 4 }}><CameraOutlined /> {selected.techPhotos} รูปถ่ายประกอบ</Tag>}
                  </div>
                )
              },
              {
                color: selected.supervisorName ? 'orange' : 'gray',
                icon: <SafetyOutlined />,
                children: (
                  <div>
                    <Text style={{ color: selected.supervisorName ? '#f59e0b' : '#475569', fontWeight: 600 }}>
                      หัวหน้าช่าง: {selected.supervisorName ?? 'รอยืนยัน'}
                    </Text>
                    {selected.supervisorDate && <Text style={{ color: '#64748b', fontSize: 11, display: 'block' }}>{selected.supervisorDate}</Text>}
                    {selected.supervisorNote && <Text style={{ color: '#e2e8f0', fontSize: 12 }}>{selected.supervisorNote}</Text>}
                  </div>
                )
              },
              {
                color: selected.warehouseStaff ? 'green' : 'gray',
                icon: <InboxOutlined />,
                children: (
                  <div>
                    <Text style={{ color: selected.warehouseStaff ? '#6ee7b7' : '#475569', fontWeight: 600 }}>
                      พัสดุ: {selected.warehouseStaff ?? 'ยังไม่รับ'}
                    </Text>
                    {selected.warehouseDate && <Text style={{ color: '#64748b', fontSize: 11, display: 'block' }}>{selected.warehouseDate}</Text>}
                    {selected.warehouseLocation && (
                      <div style={{ marginTop: 4 }}>
                        <Tag color="green"><FaWarehouse style={{ marginRight: 4 }} />{selected.warehouseLocation}</Tag>
                      </div>
                    )}
                    {selected.warehousePhotos > 0 && <Tag style={{ marginTop: 4 }}><CameraOutlined /> {selected.warehousePhotos} รูปถ่าย</Tag>}
                  </div>
                )
              },
              {
                color: selected.qrCode ? 'purple' : 'gray',
                icon: <FaQrcode />,
                children: (
                  <div>
                    <Text style={{ color: selected.qrCode ? '#a78bfa' : '#475569', fontWeight: 600 }}>
                      QR Code: {selected.qrCode ?? 'ยังไม่ออก'}
                    </Text>
                    {selected.qrCode && (
                      <div style={{ marginTop: 6, padding: '8px 12px', background: '#fff', display: 'inline-block', borderRadius: 6 }}>
                        <Text style={{ color: '#1a1a1a', fontFamily: 'monospace', fontSize: 12 }}>{selected.qrCode}</Text>
                      </div>
                    )}
                  </div>
                )
              },
            ]} />
          </div>
        )}
      </Modal>

      {/* Supervisor Approve Modal */}
      <Modal
        title={<span><SafetyOutlined style={{ color: '#f59e0b', marginRight: 8 }} />หัวหน้าช่าง — ยืนยันตรวจรับครุภัณฑ์</span>}
        open={supervisorOpen}
        onCancel={() => { setSupervisorOpen(false); sForm.resetFields() }}
        onOk={handleSupervisorApprove}
        okText="ยืนยัน — ครุภัณฑ์ครบถ้วน"
        okButtonProps={{ style: { background: '#f59e0b', borderColor: '#f59e0b' } }}
        width={560}
      >
        <Alert type="warning" showIcon style={{ marginBottom: 16, marginTop: 12 }}
          message="หัวหน้าช่างต้องตรวจสอบครุภัณฑ์ให้ครบก่อนยืนยัน เพื่อป้องกันชิ้นส่วนสูญหาย" />
        {selected && (
          <Descriptions size="small" column={1} labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="ครุภัณฑ์">{selected.assetName}</Descriptions.Item>
            <Descriptions.Item label="เลขครุภัณฑ์"><Tag color="orange">{selected.assetNo}</Tag></Descriptions.Item>
            <Descriptions.Item label="ช่างผู้ส่ง">{selected.techName} ({selected.techSubmitDate})</Descriptions.Item>
            <Descriptions.Item label="หมายเหตุช่าง"><Text style={{ color: '#fbbf24' }}>{selected.techNote}</Text></Descriptions.Item>
          </Descriptions>
        )}
        <Form form={sForm} layout="vertical">
          <Form.Item label="ผลการตรวจสอบ — ครุภัณฑ์ครบถ้วนหรือไม่" name="check" rules={[{ required: true }]}>
            <Select options={[
              { label: '✅ ครบถ้วนทุกชิ้นส่วน', value: 'ok' },
              { label: '⚠️ ขาดบางชิ้นส่วน (ระบุในหมายเหตุ)', value: 'partial' },
            ]} />
          </Form.Item>
          <Form.Item label="หมายเหตุการตรวจสอบ" name="note" rules={[{ required: true, message: 'กรุณาระบุผลการตรวจ' }]}>
            <TextArea rows={3} placeholder="บันทึกผลการตรวจสอบ สภาพครุภัณฑ์ และจำนวนชิ้นส่วนที่ตรวจพบ..." />
          </Form.Item>
          <Form.Item label="รูปถ่ายประกอบการตรวจสอบ" name="photos">
            <Upload listType="picture-card" beforeUpload={() => false} maxCount={6}>
              <div><CameraOutlined /><div style={{ fontSize: 11, marginTop: 4 }}>ถ่ายรูป</div></div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Warehouse Receive Modal */}
      <Modal
        title={<span><InboxOutlined style={{ color: '#10b981', marginRight: 8 }} />พัสดุ — รับครุภัณฑ์เข้าคลัง</span>}
        open={warehouseOpen}
        onCancel={() => { setWarehouseOpen(false); wForm.resetFields() }}
        onOk={handleWarehouseReceive}
        okText="ยืนยันรับเข้าคลัง + ออก QR"
        okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
        width={600}
      >
        <Alert type="info" showIcon style={{ marginBottom: 16, marginTop: 12 }}
          message="บันทึกข้อมูลให้ครบถ้วน ระบบจะออก QR Code สำหรับติดที่ครุภัณฑ์อัตโนมัติ" />
        {selected && (
          <Descriptions size="small" column={2} labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="ครุภัณฑ์" span={2}>{selected.assetName}</Descriptions.Item>
            <Descriptions.Item label="เลขครุภัณฑ์"><Tag color="orange">{selected.assetNo}</Tag></Descriptions.Item>
            <Descriptions.Item label="ผ่านการยืนยัน">{selected.supervisorName}</Descriptions.Item>
          </Descriptions>
        )}
        <Form form={wForm} layout="vertical">
          <Form.Item label="ผู้รับครุภัณฑ์ (เจ้าหน้าที่พัสดุ)" name="staff" rules={[{ required: true }]}>
            <Select options={WAREHOUSE_STAFF.map(s => ({ label: s, value: s }))} />
          </Form.Item>
          <Divider style={{ borderColor: '#334155' }}>สถานที่จัดเก็บ</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ห้อง / อาคาร" name="room" rules={[{ required: true, message: 'กรุณาระบุห้อง' }]}>
                <Select options={[
                  { label: 'ห้องพัสดุ อาคาร B ชั้น 1', value: 'ห้องพัสดุ B1' },
                  { label: 'คลังกลาง อาคาร C ชั้น G',   value: 'คลังกลาง CG' },
                  { label: 'คลังเครื่องมือแพทย์',        value: 'คลังเครื่องมือแพทย์' },
                ]} placeholder="เลือกห้องจัดเก็บ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ราว / แถว" name="row" rules={[{ required: true }]}>
                <Select options={['A','B','C','D','E'].map(r => ({ label: `ราว ${r}`, value: r }))} placeholder="เลือกราว" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ชั้นวาง" name="shelf" rules={[{ required: true }]}>
                <Select options={[1,2,3,4,5].map(n => ({ label: `ชั้น ${n}`, value: n }))} placeholder="เลือกชั้น" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ช่องที่" name="slot" rules={[{ required: true }]}>
                <Select options={[1,2,3,4,5,6,7,8,9,10].map(n => ({ label: `ช่อง ${n}`, value: n }))} placeholder="เลือกช่อง" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="สถานที่จัดเก็บ (กรอกเอง ถ้ารูปแบบพิเศษ)"
            name="location"
            rules={[{ required: true, message: 'กรุณาระบุสถานที่จัดเก็บ' }]}
          >
            <Input placeholder="เช่น ห้องพัสดุ B1 — ราว A ชั้น 3 ช่อง 7" />
          </Form.Item>
          <Form.Item label="รูปถ่ายครุภัณฑ์ขณะรับเข้าคลัง (ถ่ายทุกมุม)" name="photos" rules={[{ required: true, message: 'กรุณาถ่ายรูป' }]}>
            <Upload listType="picture-card" beforeUpload={() => false} maxCount={6}>
              <div><CameraOutlined /><div style={{ fontSize: 11, marginTop: 4 }}>ถ่ายรูป</div></div>
            </Upload>
          </Form.Item>
          <Form.Item label="หมายเหตุ" name="remark">
            <TextArea rows={2} placeholder="บันทึกเพิ่มเติม สภาพครุภัณฑ์ขณะรับเข้าคลัง..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create new return Modal */}
      <Modal
        title={<span><PlusOutlined style={{ color: '#FF6500', marginRight: 8 }} />แจ้งส่งคืนครุภัณฑ์เสีย (ช่าง)</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => { setCreateOpen(false); form.resetFields() }}
        okText="ส่งคืน + รอหัวหน้าช่างยืนยัน"
        width={600}
        destroyOnHidden
      >
        <Alert type="warning" showIcon style={{ marginBottom: 16, marginTop: 12 }}
          message="ต้องถ่ายรูปครุภัณฑ์ก่อนส่งคืน — บันทึก timestamp อัตโนมัติ" />
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="อ้างอิงใบงานซ่อม" name="woId" rules={[{ required: true }]}>
                <Select options={[
                  { label: 'WO-2026-003 — HP Printer', value: 'WO-2026-003' },
                  { label: 'WO-2026-007 — Infusion Pump', value: 'WO-2026-007' },
                ]} placeholder="เลือกใบงาน" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="เลขครุภัณฑ์" name="assetNo" rules={[{ required: true }]}>
                <Input placeholder="เช่น MED-66-003" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="คำขอทดแทน (REP)" name="rrId">
            <Input placeholder="REP-XXXX" readOnly={!!rrIdFromQuery} />
          </Form.Item>
          <Form.Item label="ชื่อครุภัณฑ์" name="assetName" rules={[{ required: true }]}>
            <Input placeholder="ระบุชื่อและรุ่น" />
          </Form.Item>
          <Form.Item label="สภาพ" name="condition" rules={[{ required: true }]}>
            <Select options={[
              { label: 'ซ่อมไม่ได้', value: 'irreparable' },
              { label: 'เสียหาย',    value: 'damaged' },
              { label: 'เสื่อมสภาพ', value: 'obsolete' },
            ]} />
          </Form.Item>
          <Form.Item label="รูปถ่ายครุภัณฑ์ก่อนส่งคืน (บังคับ — ถ่ายทุกมุม)" name="photos"
            rules={[{ required: true, message: 'กรุณาถ่ายรูปครุภัณฑ์อย่างน้อย 3 รูป' }]}>
            <Upload listType="picture-card" beforeUpload={() => false} maxCount={8}>
              <div><CameraOutlined /><div style={{ fontSize: 11, marginTop: 4 }}>ถ่ายรูป</div></div>
            </Upload>
          </Form.Item>
          <Form.Item label="หมายเหตุ / รายละเอียดชิ้นส่วนที่ส่งคืน" name="note" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="ระบุรายการชิ้นส่วนที่ส่งคืนทั้งหมด เช่น ตัวเครื่อง + สาย power + สาย lead 10 เส้น + คู่มือ..." />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}

export default function AssetReturnPage() {
  return (
    <Suspense fallback={null}>
      <AssetReturnPageInner />
    </Suspense>
  )
}
