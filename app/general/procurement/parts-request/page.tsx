'use client'
import React, { useState } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Form, Input, InputNumber, Select, Space, Divider, Modal, Row, Col, Tabs, Badge
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, PlusOutlined, DeleteOutlined,
  ShoppingCartOutlined, CheckCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons'
import { FaShoppingCart, FaClipboardList } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { TextArea } = Input

export const MOCK_PRS = [
  {
    id: 'PR-2026-001', woId: 'WO-2026-001', woAsset: 'เครื่อง ECG 12 Leads Nihon Kohden',
    requestedBy: 'นายวิชัย เครื่องมือดี', department: 'งานห้องผ่าตัด',
    createdDate: '2026-04-03', status: 'approved' as const,
    approvedBy: 'นายธนกฤต ผู้อำนวยการ', approvedDate: '2026-04-04',
    totalAmount: 15000,
    items: [
      { key: '1', name: 'Electrode Module Nihon Kohden ECG-2150', unit: 'ชุด', qty: 1, unitPrice: 12000, total: 12000 },
      { key: '2', name: 'Lead wire 10-lead สายต่อ ECG',           unit: 'เส้น', qty: 5, unitPrice: 600,   total: 3000  },
    ],
    reason: 'Electrode module เสื่อมสภาพ ไม่สามารถอ่านสัญญาณหัวใจได้ ต้องการเร่งด่วนเพื่อให้เครื่องกลับมาใช้งานได้',
    supplier: 'บริษัท MedTech Asia Co., Ltd.',
  },
  {
    id: 'PR-2026-002', woId: 'WO-2026-003', woAsset: 'HP LaserJet Enterprise M507dn',
    requestedBy: 'นายเทคโน สมาร์ท', department: 'งานพัสดุ',
    createdDate: '2026-04-08', status: 'pending' as const,
    approvedBy: undefined, approvedDate: undefined,
    totalAmount: 2400,
    items: [
      { key: '1', name: 'Fuser Unit HP CF367-67906 LaserJet M507', unit: 'ชิ้น', qty: 1, unitPrice: 2400, total: 2400 },
    ],
    reason: 'Fuser unit เสีย ทำให้กระดาษติดในเครื่อง ไม่สามารถใช้งานได้',
    supplier: 'บริษัท HP Thailand Official',
  },
  {
    id: 'PR-2026-003', woId: 'WO-2026-004', woAsset: 'ท่อประปาชั้น 2',
    requestedBy: 'นายสมศักดิ์ แอร์เย็น', department: 'งานผู้ป่วยใน IPD',
    createdDate: '2026-04-09', status: 'rejected' as const,
    approvedBy: 'นายธนกฤต ผู้อำนวยการ', approvedDate: '2026-04-10',
    totalAmount: 800,
    items: [
      { key: '1', name: 'ข้อต่อท่อ PVC 1 นิ้ว', unit: 'ชิ้น', qty: 4, unitPrice: 120, total: 480 },
      { key: '2', name: 'กาวท่อ Tangit',         unit: 'กระป๋อง', qty: 2, unitPrice: 160, total: 320 },
    ],
    reason: 'ท่อน้ำรั่วข้อต่อเสีย — ปรับเป็นงบดำเนินการแทน',
    supplier: 'ร้านวัสดุก่อสร้างชัยณรงค์',
  },
]

type PRStatus = 'pending' | 'approved' | 'rejected' | 'ordered'

const STATUS_TAG: Record<PRStatus, { label: string; color: string }> = {
  pending:  { label: 'รออนุมัติ',   color: 'warning'    },
  approved: { label: 'อนุมัติแล้ว', color: 'success'    },
  rejected: { label: 'ไม่อนุมัติ',  color: 'error'      },
  ordered:  { label: 'สั่งซื้อแล้ว', color: 'processing' },
}

const itemColumns = [
  { title: 'รายการ',       dataIndex: 'name',      key: 'name' },
  { title: 'หน่วย',        dataIndex: 'unit',      key: 'unit',      width: 80 },
  { title: 'จำนวน',        dataIndex: 'qty',       key: 'qty',       width: 80, align: 'center' as const },
  { title: 'ราคาต่อหน่วย', dataIndex: 'unitPrice', key: 'unitPrice', width: 120, align: 'right' as const,
    render: (v: number) => `฿${v.toLocaleString()}` },
  { title: 'รวม',          dataIndex: 'total',     key: 'total',     width: 120, align: 'right' as const,
    render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
]

export default function PartsRequestPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [items, setItems] = useState([{ key: '1', name: '', unit: 'ชิ้น', qty: 1, unitPrice: 0, total: 0 }])

  const detail = MOCK_PRS.find(p => p.id === detailId)

  const mainColumns = [
    { title: 'เลขที่ PR',   dataIndex: 'id',     key: 'id',     width: 130,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600, cursor: 'pointer' }} onClick={() => setDetailId(v)}>{v}</Text> },
    { title: 'อ้างอิงใบงาน', key: 'wo', render: (_: any, r: typeof MOCK_PRS[0]) => (
      <div><Text style={{ color: '#60a5fa' }}>{r.woId}</Text><br/><Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.woAsset}</Text></div>
    )},
    { title: 'ผู้ขอ / หน่วยงาน', key: 'req', render: (_: any, r: typeof MOCK_PRS[0]) => (
      <div><div>{r.requestedBy}</div><Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.department}</Text></div>
    )},
    { title: 'วงเงิน',      dataIndex: 'totalAmount', key: 'amt', width: 120, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
    { title: 'วันที่',      dataIndex: 'createdDate', key: 'date', width: 110,
      render: (v: string) => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{v}</Text> },
    { title: 'สถานะ',       dataIndex: 'status',      key: 'status', width: 120,
      render: (v: PRStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].label}</Tag> },
    { title: '', key: 'act', width: 80,
      render: (_: any, r: typeof MOCK_PRS[0]) => <Button size="small" onClick={() => setDetailId(r.id)}>ดูรายละเอียด</Button> },
  ]

  const addItem = () => setItems(prev => [...prev, { key: String(prev.length + 1), name: '', unit: 'ชิ้น', qty: 1, unitPrice: 0, total: 0 }])
  const removeItem = (key: string) => setItems(prev => prev.filter(i => i.key !== key))

  const tabItems = ['pending', 'approved', 'rejected'].map(s => ({
    key: s,
    label: <Badge count={MOCK_PRS.filter(p => p.status === s).length} size="small" color={STATUS_TAG[s as PRStatus].color}>
      <span style={{ paddingRight: 12 }}>{STATUS_TAG[s as PRStatus].label}</span>
    </Badge>,
    children: (
      <Table
        dataSource={MOCK_PRS.filter(p => p.status === s)}
        columns={mainColumns}
        rowKey="id"
        size="small"
        pagination={false}
      />
    )
  }))

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { title: 'ขอซื้ออะไหล่ (PR)' },
          ]} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FaShoppingCart style={{ fontSize: 24, color: '#FF6500' }} />
              <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>ใบขอซื้ออะไหล่ (Purchase Request)</Title>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              สร้าง PR ใหม่
            </Button>
          </div>

          <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <Tabs items={tabItems} />
          </Card>
        </div>
      </div>

      {/* Create PR Modal */}
      <Modal
        title={<span><ShoppingCartOutlined style={{ color: '#FF6500', marginRight: 8 }} />สร้างใบขอซื้ออะไหล่</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); setItems([{ key: '1', name: '', unit: 'ชิ้น', qty: 1, unitPrice: 0, total: 0 }]) }}
        onOk={() => form.submit()}
        okText="ส่งขออนุมัติ"
        width={720}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} onFinish={() => { setCreateOpen(false) }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="อ้างอิงใบงานซ่อม" name="woId" rules={[{ required: true }]}>
                <Select options={[
                  { label: 'WO-2026-001 — ECG', value: 'WO-2026-001' },
                  { label: 'WO-2026-002 — แอร์', value: 'WO-2026-002' },
                  { label: 'WO-2026-005 — CCTV', value: 'WO-2026-005' },
                  { label: 'WO-2026-007 — Infusion Pump', value: 'WO-2026-007' },
                ]} placeholder="เลือกใบงาน" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ผู้จัดจำหน่าย" name="supplier">
                <Input placeholder="ชื่อบริษัท / ร้านค้า" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>รายการอะไหล่</Divider>
          {items.map((item, idx) => (
            <Row key={item.key} gutter={8} style={{ marginBottom: 8, alignItems: 'flex-start' }}>
              <Col flex="auto">
                <Input placeholder="ชื่ออะไหล่ / รายการ" value={item.name}
                  onChange={e => setItems(prev => prev.map(i => i.key === item.key ? { ...i, name: e.target.value } : i))} />
              </Col>
              <Col style={{ width: 80 }}>
                <Input placeholder="หน่วย" value={item.unit}
                  onChange={e => setItems(prev => prev.map(i => i.key === item.key ? { ...i, unit: e.target.value } : i))} />
              </Col>
              <Col style={{ width: 80 }}>
                <InputNumber min={1} value={item.qty} placeholder="จำนวน" style={{ width: '100%' }}
                  onChange={v => setItems(prev => prev.map(i => i.key === item.key ? { ...i, qty: v ?? 1, total: (v ?? 1) * i.unitPrice } : i))} />
              </Col>
              <Col style={{ width: 120 }}>
                <InputNumber min={0} value={item.unitPrice} placeholder="ราคา/หน่วย" style={{ width: '100%' }}
                  onChange={v => setItems(prev => prev.map(i => i.key === item.key ? { ...i, unitPrice: v ?? 0, total: item.qty * (v ?? 0) } : i))} />
              </Col>
              <Col style={{ width: 40 }}>
                <Button danger icon={<DeleteOutlined />} disabled={items.length === 1} onClick={() => removeItem(item.key)} />
              </Col>
            </Row>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} block style={{ marginBottom: 16 }}>
            เพิ่มรายการ
          </Button>

          <Form.Item label="เหตุผลความจำเป็น" name="reason" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="อธิบายความจำเป็น ผลกระทบ และความเร่งด่วน..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={<span><FaClipboardList style={{ color: '#FF6500', marginRight: 8 }} />{detail?.id}</span>}
        open={!!detailId}
        onCancel={() => setDetailId(null)}
        footer={null}
        width={700}
      >
        {detail && (
          <div style={{ padding: '8px 0' }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}><Text style={{ color: '#94a3b8' }}>ใบงานซ่อม: </Text><Text style={{ color: '#60a5fa' }}>{detail.woId}</Text></Col>
              <Col span={12}><Text style={{ color: '#94a3b8' }}>สถานะ: </Text><Tag color={STATUS_TAG[detail.status].color}>{STATUS_TAG[detail.status].label}</Tag></Col>
              <Col span={12}><Text style={{ color: '#94a3b8' }}>ผู้ขอ: </Text><Text>{detail.requestedBy}</Text></Col>
              <Col span={12}><Text style={{ color: '#94a3b8' }}>ผู้จำหน่าย: </Text><Text>{detail.supplier}</Text></Col>
              {detail.approvedBy && <Col span={24}><Text style={{ color: '#94a3b8' }}>อนุมัติโดย: </Text><Text style={{ color: '#6ee7b7' }}>{detail.approvedBy} ({detail.approvedDate})</Text></Col>}
            </Row>
            <Divider style={{ borderColor: '#334155' }}>รายการอะไหล่</Divider>
            <Table dataSource={detail.items} columns={itemColumns} rowKey="key" size="small" pagination={false}
              summary={() => <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><Text style={{ fontWeight: 700 }}>รวมทั้งสิ้น</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right"><Text style={{ color: '#a78bfa', fontWeight: 700 }}>฿{detail.totalAmount.toLocaleString()}</Text></Table.Summary.Cell>
              </Table.Summary.Row>}
            />
            <Divider style={{ borderColor: '#334155' }} />
            <Text style={{ color: '#94a3b8' }}>เหตุผล: </Text><Text style={{ color: '#fbbf24' }}>{detail.reason}</Text>
          </div>
        )}
      </Modal>
    </ConfigProvider>
  )
}
