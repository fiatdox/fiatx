'use client'
import React, { useState } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Input, Select, Row, Col, Descriptions, Divider, Badge, Space, Tooltip
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, SearchOutlined, QrcodeOutlined,
  InboxOutlined, ExportOutlined
} from '@ant-design/icons'
import { FaWarehouse, FaQrcode, FaBoxOpen } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography

type WarehouseStatus = 'stored' | 'pending_disposal' | 'disposed' | 'returned_to_account'

interface WarehouseAsset {
  id: string           // RET-XXXX-XXX
  assetNo: string
  assetName: string
  department: string
  condition: 'irreparable' | 'damaged' | 'obsolete'
  status: WarehouseStatus
  storedDate: string
  warehouseStaff: string
  location: string     // ห้อง/ราว/ชั้น/ช่อง
  qrCode: string
  woId: string
  estValue: number     // ราคาประเมินตลาด
  remark: string
}

const MOCK_WAREHOUSE: WarehouseAsset[] = [
  {
    id: 'RET-2026-001', assetNo: 'MED-65-001',
    assetName: 'Patient Monitor Mindray MEC-1200',
    department: 'งาน ICU',
    condition: 'irreparable', status: 'pending_disposal',
    storedDate: '2026-04-03', warehouseStaff: 'นางสาวพัสดุ จัดเก็บดี',
    location: 'ห้องพัสดุ B1 — ราว A ชั้น 3 ช่อง 7',
    qrCode: 'QR-MED-65-001-RET', woId: 'WO-2026-008',
    estValue: 12000, remark: 'display module เสียหาย รอประเมินจำหน่าย',
  },
  {
    id: 'RET-2025-018', assetNo: 'IT-64-020',
    assetName: 'Laptop Dell Inspiron 15 5000',
    department: 'งานสารสนเทศ',
    condition: 'obsolete', status: 'returned_to_account',
    storedDate: '2025-11-10', warehouseStaff: 'นายพงษ์ศักดิ์ คลังสมบัติ',
    location: 'ห้องพัสดุ B1 — ราว C ชั้น 1 ช่อง 2',
    qrCode: 'QR-IT-64-020-RET', woId: 'WO-2025-045',
    estValue: 3000, remark: 'อายุการใช้งาน 7 ปี — คืนบัญชีทรัพย์สินแล้ว',
  },
  {
    id: 'RET-2025-022', assetNo: 'ก.005-66-001',
    assetName: 'เครื่องปรับอากาศ Daikin 24000 BTU',
    department: 'อาคาร 3 ชั้น 2',
    condition: 'irreparable', status: 'disposed',
    storedDate: '2025-12-20', warehouseStaff: 'นางสาวพัสดุ จัดเก็บดี',
    location: 'ลานจอดรถ ด้านหลัง อาคาร B',
    qrCode: 'QR-ก-005-66-001-RET', woId: 'WO-2025-051',
    estValue: 0, remark: 'จำหน่ายโดยวิธีขายทอดตลาด ราคา ฿5,200 เมื่อ 2026-01-15',
  },
  {
    id: 'RET-2026-002', assetNo: 'MED-65-002',
    assetName: 'เครื่อง ECG 12 Leads Nihon Kohden ECG-2150',
    department: 'งานห้องผ่าตัด',
    condition: 'irreparable', status: 'stored',
    storedDate: '2026-04-12', warehouseStaff: 'นายพงษ์ศักดิ์ คลังสมบัติ',
    location: 'ห้องพัสดุ B1 — ราว A ชั้น 2 ช่อง 4',
    qrCode: 'QR-MED-65-002-RET', woId: 'WO-2026-001',
    estValue: 18000, remark: 'รอเสนอ จนท.จำหน่าย',
  },
]

const STATUS_TAG: Record<WarehouseStatus, { label: string; color: string }> = {
  stored:               { label: 'จัดเก็บในคลัง',      color: 'processing' },
  pending_disposal:     { label: 'รอจำหน่าย',          color: 'warning'    },
  disposed:             { label: 'จำหน่ายแล้ว',         color: 'default'    },
  returned_to_account:  { label: 'คืนบัญชีแล้ว',        color: 'success'    },
}

const CONDITION_TAG: Record<string, { label: string; color: string }> = {
  irreparable: { label: 'ซ่อมไม่ได้',  color: 'error'   },
  damaged:     { label: 'เสียหาย',    color: 'warning' },
  obsolete:    { label: 'เสื่อมสภาพ', color: 'default' },
}

export default function WarehousePage() {
  const [assets] = useState<WarehouseAsset[]>(MOCK_WAREHOUSE)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<WarehouseStatus | 'all'>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrTarget, setQrTarget] = useState<WarehouseAsset | null>(null)

  const filtered = assets.filter(a => {
    const matchSearch = !search ||
      a.assetName.includes(search) || a.assetNo.includes(search) ||
      a.id.includes(search) || a.location.includes(search)
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const detail = assets.find(a => a.id === detailId)

  const stored = assets.filter(a => a.status === 'stored' || a.status === 'pending_disposal')
  const totalEstValue = stored.reduce((s, a) => s + a.estValue, 0)

  const columns = [
    { title: 'เลขที่คืน', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => (
        <Text style={{ color: '#FF6500', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => setDetailId(v)}>{v}</Text>
      )},
    { title: 'เลขทะเบียน', dataIndex: 'assetNo', key: 'assetNo', width: 120,
      render: (v: string) => <Text style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{v}</Text> },
    { title: 'ชื่อครุภัณฑ์', dataIndex: 'assetName', key: 'name',
      render: (v: string, r: WarehouseAsset) => (
        <div>
          <div>{v}</div>
          <Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.department}</Text>
        </div>
      )},
    { title: 'สภาพ', dataIndex: 'condition', key: 'cond', width: 110,
      render: (v: string) => <Tag color={CONDITION_TAG[v].color}>{CONDITION_TAG[v].label}</Tag> },
    { title: 'สถานที่เก็บ', dataIndex: 'location', key: 'loc',
      render: (v: string) => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{v}</Text> },
    { title: 'วันที่รับเข้า', dataIndex: 'storedDate', key: 'date', width: 110,
      render: (v: string) => <Text style={{ color: '#94a3b8' }}>{v}</Text> },
    { title: 'ราคาประเมิน', dataIndex: 'estValue', key: 'val', width: 110, align: 'right' as const,
      render: (v: number) => v > 0
        ? <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text>
        : <Text style={{ color: '#475569' }}>—</Text> },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 140,
      render: (v: WarehouseStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].label}</Tag> },
    { title: '', key: 'act', width: 100,
      render: (_: any, r: WarehouseAsset) => (
        <Space>
          <Tooltip title="ดู QR Code">
            <Button size="small" icon={<QrcodeOutlined />}
              onClick={() => { setQrTarget(r); setQrOpen(true) }} />
          </Tooltip>
          <Button size="small" onClick={() => setDetailId(r.id)}>รายละเอียด</Button>
        </Space>
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
            { title: 'คลังครุภัณฑ์เสื่อมสภาพ' },
          ]} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <FaWarehouse style={{ fontSize: 24, color: '#FF6500' }} />
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>คลังครุภัณฑ์เสื่อมสภาพ</Title>
          </div>

          {/* Summary Cards */}
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            {[
              { label: 'ครุภัณฑ์ในคลัง',   value: stored.length,                count: 'รายการ',    color: '#FF6500' },
              { label: 'มูลค่าประเมินรวม',  value: `฿${totalEstValue.toLocaleString()}`, count: undefined, color: '#a78bfa' },
              { label: 'รอจำหน่าย',        value: assets.filter(a => a.status === 'pending_disposal').length, count: 'รายการ', color: '#d97706' },
              { label: 'จำหน่าย/คืนแล้ว',  value: assets.filter(a => a.status === 'disposed' || a.status === 'returned_to_account').length, count: 'รายการ', color: '#475569' },
            ].map(c => (
              <Col key={c.label} xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#1e293b', borderTop: `3px solid ${c.color}`, border: `1px solid ${c.color}33` }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{c.label}</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.value}</div>
                  {c.count && <Text style={{ color: '#64748b', fontSize: 12 }}>{c.count}</Text>}
                </Card>
              </Col>
            ))}
          </Row>

          {/* Filters */}
          <Card style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}>
            <Row gutter={12} align="middle">
              <Col flex="auto">
                <Input
                  prefix={<SearchOutlined style={{ color: '#64748b' }} />}
                  placeholder="ค้นหาด้วยชื่อครุภัณฑ์ เลขทะเบียน หรือสถานที่..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  allowClear
                />
              </Col>
              <Col>
                <Select
                  value={statusFilter}
                  onChange={v => setStatusFilter(v)}
                  style={{ width: 160 }}
                  options={[
                    { label: 'ทุกสถานะ',       value: 'all' },
                    { label: 'จัดเก็บในคลัง',   value: 'stored' },
                    { label: 'รอจำหน่าย',       value: 'pending_disposal' },
                    { label: 'จำหน่ายแล้ว',     value: 'disposed' },
                    { label: 'คืนบัญชีแล้ว',    value: 'returned_to_account' },
                  ]}
                />
              </Col>
            </Row>
          </Card>

          <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <Table
              dataSource={filtered}
              columns={columns}
              rowKey="id"
              size="small"
              scroll={{ x: 1100 }}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        title={<span><FaBoxOpen style={{ color: '#FF6500', marginRight: 8 }} />{detail?.assetName}</span>}
        open={!!detailId}
        onCancel={() => setDetailId(null)}
        footer={null}
        width={680}
      >
        {detail && (
          <div>
            <Descriptions column={2} size="small"
              labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}
              style={{ marginTop: 8 }}>
              <Descriptions.Item label="เลขที่คืน">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="ใบงานซ่อม">
                <Text style={{ color: '#60a5fa' }}>{detail.woId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="เลขทะเบียน">
                <Text style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{detail.assetNo}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{detail.department}</Descriptions.Item>
              <Descriptions.Item label="สภาพ">
                <Tag color={CONDITION_TAG[detail.condition].color}>{CONDITION_TAG[detail.condition].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="สถานะ">
                <Tag color={STATUS_TAG[detail.status].color}>{STATUS_TAG[detail.status].label}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="วันที่รับเข้าคลัง">{detail.storedDate}</Descriptions.Item>
              <Descriptions.Item label="เจ้าหน้าที่รับ">{detail.warehouseStaff}</Descriptions.Item>
              <Descriptions.Item label="สถานที่จัดเก็บ" span={2}>
                <Text style={{ color: '#fbbf24' }}>{detail.location}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="QR Code" span={2}>
                <Text style={{ fontFamily: 'monospace', color: '#6ee7b7' }}>{detail.qrCode}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ราคาประเมิน" span={2}>
                {detail.estValue > 0
                  ? <Text style={{ color: '#a78bfa', fontWeight: 700 }}>฿{detail.estValue.toLocaleString()}</Text>
                  : <Text style={{ color: '#475569' }}>—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="หมายเหตุ" span={2}>
                <Text style={{ color: '#94a3b8' }}>{detail.remark || '—'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* QR Code Modal */}
      <Modal
        title={<span><FaQrcode style={{ color: '#FF6500', marginRight: 8 }} />QR Code ครุภัณฑ์</span>}
        open={qrOpen}
        onCancel={() => { setQrOpen(false); setQrTarget(null) }}
        footer={<Button type="primary" onClick={() => setQrOpen(false)}>ปิด</Button>}
        width={360}
      >
        {qrTarget && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            {/* QR Code placeholder — ในระบบจริงใช้ library qrcode.react */}
            <div style={{
              width: 200, height: 200, margin: '0 auto',
              background: '#fff', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#1e293b', flexDirection: 'column', gap: 8, padding: 12,
            }}>
              <QrcodeOutlined style={{ fontSize: 80, color: '#334155' }} />
              <div style={{ wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace', fontSize: 10 }}>
                {qrTarget.qrCode}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <Text style={{ color: '#e2e8f0', display: 'block', fontWeight: 600 }}>{qrTarget.assetName}</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{qrTarget.assetNo}</Text>
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: '#fbbf24', fontSize: 12 }}>{qrTarget.location}</Text>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </ConfigProvider>
  )
}
