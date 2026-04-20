'use client'
import React, { useState } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, InputNumber, Select, Divider, Row, Col, Steps, Space, Descriptions
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, PlusOutlined, SendOutlined,
  CheckCircleOutlined, ShoppingCartOutlined
} from '@ant-design/icons'
import { FaFileAlt, FaShoppingCart } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

type POStatus = 'draft' | 'sent' | 'partial' | 'completed'

interface PurchaseOrder {
  id: string; prIds: string[]
  supplier: string; supplierTel: string; supplierEmail: string
  createdDate: string; expectedDate: string
  status: POStatus
  totalAmount: number
  items: { key: string; name: string; unit: string; qty: number; unitPrice: number; received: number }[]
  remark: string
}

export const MOCK_POS: PurchaseOrder[] = [
  {
    id: 'PO-2026-001', prIds: ['PR-2026-001'],
    supplier: 'บริษัท MedTech Asia Co., Ltd.', supplierTel: '02-xxx-xxxx', supplierEmail: 'sale@medtech.co.th',
    createdDate: '2026-04-05', expectedDate: '2026-04-15',
    status: 'completed' as const,
    totalAmount: 15000,
    items: [
      { key: '1', name: 'Electrode Module Nihon Kohden ECG-2150', unit: 'ชุด',  qty: 1, unitPrice: 12000, received: 1 },
      { key: '2', name: 'Lead wire 10-lead สายต่อ ECG',           unit: 'เส้น', qty: 5, unitPrice: 600,   received: 5 },
    ],
    remark: 'สินค้าได้รับครบ ตรวจสอบแล้ว',
  },
  {
    id: 'PO-2026-002', prIds: ['PR-2026-002'],
    supplier: 'บริษัท HP Thailand Official', supplierTel: '02-yyy-yyyy', supplierEmail: 'service@hp.co.th',
    createdDate: '2026-04-10', expectedDate: '2026-04-17',
    status: 'sent' as const,
    totalAmount: 2400,
    items: [
      { key: '1', name: 'Fuser Unit HP CF367-67906 LaserJet M507', unit: 'ชิ้น', qty: 1, unitPrice: 2400, received: 0 },
    ],
    remark: '',
  },
]

const STATUS_TAG: Record<POStatus, { label: string; color: string }> = {
  draft:     { label: 'ร่าง',          color: 'default'    },
  sent:      { label: 'ส่งผู้จำหน่าย', color: 'processing' },
  partial:   { label: 'รับบางส่วน',   color: 'warning'    },
  completed: { label: 'รับครบแล้ว',   color: 'success'    },
}

export default function PurchaseOrderPage() {
  const [pos, setPOs] = useState(MOCK_POS)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const detail = pos.find(p => p.id === detailId)

  const handleSend = (id: string) => {
    setPOs(prev => prev.map(p => p.id === id ? { ...p, status: 'sent' as POStatus } : p))
    setDetailId(null)
  }

  const columns = [
    { title: 'เลขที่ PO',   dataIndex: 'id',           key: 'id',     width: 130,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600, cursor: 'pointer' }} onClick={() => setDetailId(v)}>{v}</Text> },
    { title: 'อ้างอิง PR',  dataIndex: 'prIds',        key: 'pr',     width: 140,
      render: (v: string[]) => v.map(pr => <Tag key={pr} color="blue">{pr}</Tag>) },
    { title: 'ผู้จัดจำหน่าย', dataIndex: 'supplier',  key: 'sup',    render: (v: string) => <Text>{v}</Text> },
    { title: 'วงเงิน',      dataIndex: 'totalAmount',  key: 'amt',    width: 120, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
    { title: 'วันที่สร้าง',  dataIndex: 'createdDate', key: 'date',   width: 120,
      render: (v: string) => <Text style={{ color: '#94a3b8' }}>{v}</Text> },
    { title: 'กำหนดรับ',    dataIndex: 'expectedDate', key: 'exp',    width: 120,
      render: (v: string) => <Text style={{ color: '#60a5fa' }}>{v}</Text> },
    { title: 'สถานะ',       dataIndex: 'status',       key: 'status', width: 140,
      render: (v: POStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].label}</Tag> },
    { title: '', key: 'act', width: 80,
      render: (_: any, r: typeof MOCK_POS[0]) => <Button size="small" onClick={() => setDetailId(r.id)}>ดู PO</Button> },
  ]

  const itemColumns = [
    { title: 'รายการ',   dataIndex: 'name',      key: 'name' },
    { title: 'หน่วย',   dataIndex: 'unit',      key: 'unit',       width: 80 },
    { title: 'สั่ง (qty)', dataIndex: 'qty',    key: 'qty',        width: 80, align: 'center' as const },
    { title: 'รับแล้ว', dataIndex: 'received',  key: 'received',   width: 80, align: 'center' as const,
      render: (v: number, r: any) => <Text style={{ color: v >= r.qty ? '#6ee7b7' : '#fbbf24' }}>{v}</Text> },
    { title: 'ราคา/หน่วย', dataIndex: 'unitPrice', key: 'up',     width: 120, align: 'right' as const,
      render: (v: number) => `฿${v.toLocaleString()}` },
    { title: 'รวม', key: 'total', width: 120, align: 'right' as const,
      render: (_: any, r: any) => <Text style={{ color: '#a78bfa' }}>฿{(r.qty * r.unitPrice).toLocaleString()}</Text> },
  ]

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { href: '/general/procurement/parts-request', title: 'ขอซื้ออะไหล่ (PR)' },
            { title: 'ใบสั่งซื้อ (PO)' },
          ]} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FaFileAlt style={{ fontSize: 24, color: '#FF6500' }} />
              <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>ใบสั่งซื้อ (Purchase Order)</Title>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              ออก PO ใหม่
            </Button>
          </div>

          {/* PO Flow Steps */}
          <Card style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}>
            <Steps size="small" items={[
              { title: 'PR อนุมัติแล้ว',    status: 'finish' },
              { title: 'ออก PO',            status: 'finish' },
              { title: 'ส่งผู้จำหน่าย',    status: 'process' },
              { title: 'รับสินค้า',          status: 'wait' },
              { title: 'ส่งมอบช่าง',        status: 'wait' },
            ]} />
          </Card>

          <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <Table dataSource={pos} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
          </Card>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        title={<span><FaFileAlt style={{ color: '#FF6500', marginRight: 8 }} />{detail?.id}</span>}
        open={!!detailId}
        onCancel={() => setDetailId(null)}
        footer={
          detail?.status === 'draft' ? (
            <Button type="primary" icon={<SendOutlined />} onClick={() => handleSend(detail.id)}>
              ส่งใบสั่งซื้อให้ผู้จำหน่าย
            </Button>
          ) : null
        }
        width={740}
      >
        {detail && (
          <div>
            <Descriptions column={2} size="small" labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }} style={{ marginTop: 8 }}>
              <Descriptions.Item label="เลขที่ PO">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="สถานะ"><Tag color={STATUS_TAG[detail.status].color}>{STATUS_TAG[detail.status].label}</Tag></Descriptions.Item>
              <Descriptions.Item label="ผู้จำหน่าย">{detail.supplier}</Descriptions.Item>
              <Descriptions.Item label="โทรศัพท์">{detail.supplierTel}</Descriptions.Item>
              <Descriptions.Item label="อีเมล">{detail.supplierEmail}</Descriptions.Item>
              <Descriptions.Item label="กำหนดรับ"><Text style={{ color: '#60a5fa' }}>{detail.expectedDate}</Text></Descriptions.Item>
              <Descriptions.Item label="อ้างอิง PR" span={2}>{detail.prIds.map(p => <Tag key={p} color="blue">{p}</Tag>)}</Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: '#334155' }}>รายการสินค้า</Divider>
            <Table dataSource={detail.items} columns={itemColumns} rowKey="key" size="small" pagination={false}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}><Text style={{ fontWeight: 700 }}>รวมทั้งสิ้น</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text style={{ color: '#a78bfa', fontWeight: 700 }}>฿{detail.totalAmount.toLocaleString()}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </div>
        )}
      </Modal>

      {/* Create PO Modal */}
      <Modal
        title={<span><ShoppingCartOutlined style={{ color: '#FF6500', marginRight: 8 }} />ออกใบสั่งซื้อ (PO)</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="ออก PO"
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} onFinish={() => setCreateOpen(false)}>
          <Form.Item label="อ้างอิงใบขอซื้อ (PR) ที่อนุมัติแล้ว" name="prIds" rules={[{ required: true }]}>
            <Select mode="multiple" options={[
              { label: 'PR-2026-001 — ECG Electrode (฿15,000)', value: 'PR-2026-001' },
              { label: 'PR-2026-002 — Fuser Unit HP (฿2,400)',   value: 'PR-2026-002' },
            ]} placeholder="เลือก PR" />
          </Form.Item>
          <Form.Item label="ผู้จัดจำหน่าย" name="supplier" rules={[{ required: true }]}>
            <Input placeholder="ชื่อบริษัท / ร้านค้า" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="โทรศัพท์ผู้จำหน่าย" name="supplierTel">
                <Input placeholder="02-xxx-xxxx" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="กำหนดรับสินค้า" name="expectedDate">
                <Input type="date" defaultValue={dayjs().add(7, 'day').format('YYYY-MM-DD')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="หมายเหตุ / เงื่อนไขพิเศษ" name="remark">
            <TextArea rows={2} placeholder="เช่น ต้องการสินค้าของแท้ พร้อมใบรับประกัน..." />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}
