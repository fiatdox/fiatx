'use client'
import React, { useState } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, Select, Divider, Row, Col, Alert, Descriptions, Space, Badge
} from 'antd'
import {
  HomeOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FileTextOutlined, DollarOutlined
} from '@ant-design/icons'
import { FaFileAlt, FaFileInvoiceDollar } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography
const { TextArea } = Input

type PayStatus = 'pending' | 'paid' | 'rejected'

interface Payment {
  id: string; woId: string; poId: string | undefined
  assetName: string; department: string
  laborCost: number; partsCost: number; totalCost: number
  status: PayStatus
  budgetCode: string; budgetName: string
  paidBy: string | undefined; paidDate: string | undefined
  remark: string
}

const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'PAY-2026-001', woId: 'WO-2026-006', poId: undefined,
    assetName: 'DELL OptiPlex 7090 SFF', department: 'งานการเงินและบัญชี',
    laborCost: 600, partsCost: 0, totalCost: 600,
    status: 'paid' as const,
    budgetCode: '2001-01-0001', budgetName: 'งบดำเนินการ — ค่าซ่อมแซม',
    paidBy: 'นางสาวพิมพ์ใจ การเงิน', paidDate: '2026-04-08',
    remark: 'ค่าแรงช่าง IT ซ่อมคอมพิวเตอร์',
  },
  {
    id: 'PAY-2026-002', woId: 'WO-2026-008', poId: undefined,
    assetName: 'Patient Monitor Mindray MEC-1200', department: 'งาน ICU',
    laborCost: 1800, partsCost: 5500, totalCost: 7300,
    status: 'paid' as const,
    budgetCode: '2001-02-0003', budgetName: 'งบดำเนินการ — ค่าซ่อมเครื่องมือแพทย์',
    paidBy: 'นางสาวพิมพ์ใจ การเงิน', paidDate: '2026-04-09',
    remark: 'เปลี่ยน display module Patient Monitor',
  },
  {
    id: 'PAY-2026-003', woId: 'WO-2026-001', poId: 'PO-2026-001',
    assetName: 'เครื่อง ECG 12 Leads Nihon Kohden', department: 'งานห้องผ่าตัด',
    laborCost: 900, partsCost: 15000, totalCost: 15900,
    status: 'pending' as const,
    budgetCode: '2001-02-0003', budgetName: 'งบดำเนินการ — ค่าซ่อมเครื่องมือแพทย์',
    paidBy: undefined, paidDate: undefined,
    remark: '',
  },
  {
    id: 'PAY-2026-004', woId: 'WO-2026-002', poId: undefined,
    assetName: 'เครื่องปรับอากาศ Daikin 18000 BTU', department: 'งานการพยาบาล OPD',
    laborCost: 1500, partsCost: 0, totalCost: 1500,
    status: 'pending' as const,
    budgetCode: '2001-01-0001', budgetName: 'งบดำเนินการ — ค่าซ่อมแซม',
    paidBy: undefined, paidDate: undefined,
    remark: '',
  },
]

const STATUS_TAG: Record<PayStatus, { label: string; color: string }> = {
  pending:  { label: 'รออนุมัติจ่าย', color: 'warning'  },
  paid:     { label: 'จ่ายแล้ว',       color: 'success'  },
  rejected: { label: 'ไม่อนุมัติ',     color: 'error'    },
}

const BUDGET_CODES = [
  { label: '2001-01-0001 — งบดำเนินการ ค่าซ่อมแซม',              value: '2001-01-0001' },
  { label: '2001-02-0003 — งบดำเนินการ ค่าซ่อมเครื่องมือแพทย์', value: '2001-02-0003' },
  { label: '2001-03-0005 — งบลงทุน ค่าครุภัณฑ์',                  value: '2001-03-0005' },
]

export default function RepairPaymentPage() {
  const [payments, setPayments] = useState(MOCK_PAYMENTS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [form] = Form.useForm()

  const selected = payments.find(p => p.id === selectedId)
  const pending = payments.filter(p => p.status === 'pending')
  const paid    = payments.filter(p => p.status === 'paid')

  const totalPaid    = paid.reduce((s, p) => s + p.totalCost, 0)
  const totalPending = pending.reduce((s, p) => s + p.totalCost, 0)

  const handlePay = () => {
    if (!selectedId) return
    setPayments(prev => prev.map(p =>
      p.id === selectedId ? { ...p, status: 'paid' as const, paidDate: '2026-04-13', paidBy: 'นางสาวพิมพ์ใจ การเงิน' } : p
    ))
    setPayOpen(false)
    setSelectedId(null)
    form.resetFields()
  }

  const columns = [
    { title: 'เลขที่ใบจ่าย', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => <Text style={{ color: '#006a5a', fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedId(v)}>{v}</Text> },
    { title: 'ใบงานซ่อม', key: 'wo', render: (_: any, r: typeof MOCK_PAYMENTS[0]) => (
      <div>
        <Text style={{ color: '#60a5fa' }}>{r.woId}</Text>
        {r.poId && <><br/><Text style={{ fontSize: 11, color: '#a78bfa' }}>PO: {r.poId}</Text></>}
      </div>
    )},
    { title: 'อุปกรณ์ / หน่วยงาน', key: 'asset', render: (_: any, r: typeof MOCK_PAYMENTS[0]) => (
      <div><div style={{ fontSize: 13 }}>{r.assetName}</div><Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.department}</Text></div>
    )},
    { title: 'ค่าแรง',   dataIndex: 'laborCost', key: 'labor', width: 100, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#60a5fa' }}>฿{v.toLocaleString()}</Text> },
    { title: 'ค่าอะไหล่', dataIndex: 'partsCost', key: 'parts', width: 100, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#f59e0b' }}>{v > 0 ? `฿${v.toLocaleString()}` : '—'}</Text> },
    { title: 'รวม',       dataIndex: 'totalCost', key: 'total', width: 120, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 700 }}>฿{v.toLocaleString()}</Text> },
    { title: 'รหัสงบ',   dataIndex: 'budgetCode', key: 'budget', width: 120,
      render: (v: string) => <Text style={{ color: '#94a3b8', fontSize: 11 }}>{v}</Text> },
    { title: 'สถานะ',    dataIndex: 'status',     key: 'status', width: 130,
      render: (v: PayStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].label}</Tag> },
    { title: '', key: 'act', width: 90, render: (_: any, r: typeof MOCK_PAYMENTS[0]) => (
      r.status === 'pending'
        ? <Button type="primary" size="small" onClick={() => { setSelectedId(r.id); setPayOpen(true) }}>อนุมัติจ่าย</Button>
        : <Text style={{ color: '#6ee7b7', fontSize: 12 }}>{r.paidDate}</Text>
    )},
  ]

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#006a5a', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',           title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/accounting', title: <><FileTextOutlined /> งานการเงินและบัญชี</> },
            { title: 'เบิกจ่ายค่าซ่อมบำรุง' },
          ]} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <FaFileInvoiceDollar style={{ fontSize: 24, color: '#006a5a' }} />
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>เบิกจ่ายค่าซ่อมบำรุง</Title>
          </div>

          {/* Summary Cards */}
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            {[
              { label: 'รออนุมัติจ่าย', value: `฿${totalPending.toLocaleString()}`, count: pending.length, color: '#d97706' },
              { label: 'จ่ายแล้วเดือนนี้', value: `฿${totalPaid.toLocaleString()}`,    count: paid.length,    color: '#006a5a' },
              { label: 'รายการทั้งหมด',  value: payments.length,                       count: undefined,      color: '#475569' },
            ].map(c => (
              <Col key={c.label} xs={24} sm={8}>
                <Card size="small" style={{ background: '#1e293b', borderTop: `3px solid ${c.color}`, border: `1px solid ${c.color}33` }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{c.label}</Text>
                  <div style={{ fontSize: 22, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.value}</div>
                  {c.count !== undefined && <Text style={{ color: '#64748b', fontSize: 12 }}>{c.count} รายการ</Text>}
                </Card>
              </Col>
            ))}
          </Row>

          {pending.length > 0 && (
            <Alert type="warning" showIcon style={{ marginBottom: 16 }}
              message={`มีรายการรออนุมัติจ่าย ${pending.length} รายการ รวม ฿${totalPending.toLocaleString()}`} />
          )}

          <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <Table dataSource={payments} columns={columns} rowKey="id" size="small"
              scroll={{ x: 1000 }}
              pagination={{ pageSize: 10 }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}><Text style={{ fontWeight: 700 }}>รวมทั้งสิ้น</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text style={{ color: '#a78bfa', fontWeight: 700 }}>
                      ฿{payments.reduce((s, p) => s + p.totalCost, 0).toLocaleString()}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={3} />
                </Table.Summary.Row>
              )}
            />
          </Card>
        </div>
      </div>

      {/* Pay Approve Modal */}
      <Modal
        title={<span><DollarOutlined style={{ color: '#006a5a', marginRight: 8 }} />อนุมัติจ่ายค่าซ่อม — {selected?.id}</span>}
        open={payOpen}
        onCancel={() => { setPayOpen(false); setSelectedId(null); form.resetFields() }}
        onOk={handlePay}
        okText="ยืนยันอนุมัติจ่าย"
        okButtonProps={{ style: { background: '#006a5a' } }}
        width={560}
      >
        {selected && (
          <div style={{ marginTop: 8 }}>
            <Descriptions size="small" column={2} labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}>
              <Descriptions.Item label="ใบงานซ่อม">{selected.woId}</Descriptions.Item>
              <Descriptions.Item label="อุปกรณ์">{selected.assetName}</Descriptions.Item>
              <Descriptions.Item label="ค่าแรง">
                <Text style={{ color: '#60a5fa' }}>฿{selected.laborCost.toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ค่าอะไหล่">
                <Text style={{ color: '#f59e0b' }}>฿{selected.partsCost.toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="รวมทั้งสิ้น" span={2}>
                <Text style={{ color: '#a78bfa', fontWeight: 700, fontSize: 18 }}>฿{selected.totalCost.toLocaleString()}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: '#334155' }} />
            <Form form={form} layout="vertical">
              <Form.Item label="รหัสงบประมาณที่ตัดจ่าย" name="budgetCode" initialValue={selected.budgetCode} rules={[{ required: true }]}>
                <Select options={BUDGET_CODES} />
              </Form.Item>
              <Form.Item label="หมายเหตุ" name="remark" initialValue={selected.remark}>
                <TextArea rows={2} placeholder="ระบุรายละเอียดเพิ่มเติม..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </ConfigProvider>
  )
}
