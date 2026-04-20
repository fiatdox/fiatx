'use client'
import React, { useState } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, Divider, Row, Col, Alert, Space, Badge, Descriptions
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { FaClipboardCheck, FaFileAlt } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { MOCK_PRS } from '../parts-request/page'

const { Title, Text } = Typography
const { TextArea } = Input

type PRStatus = 'pending' | 'approved' | 'rejected' | 'ordered'

const STATUS_TAG: Record<PRStatus, { label: string; color: string }> = {
  pending:  { label: 'รออนุมัติ',    color: 'warning'    },
  approved: { label: 'อนุมัติแล้ว',  color: 'success'    },
  rejected: { label: 'ไม่อนุมัติ',   color: 'error'      },
  ordered:  { label: 'สั่งซื้อแล้ว', color: 'processing' },
}

const BUDGET_LIMIT = 50000 // บาท — ถ้าเกินนี้ต้องผ่านผู้บริหารระดับสูง

export default function ProcurementApprovalPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, PRStatus>>(
    Object.fromEntries(MOCK_PRS.map(p => [p.id, p.status]))
  )
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen]   = useState(false)
  const [form] = Form.useForm()

  const selected = MOCK_PRS.find(p => p.id === selectedId)
  const currentStatus = selectedId ? statuses[selectedId] : null

  const pending  = MOCK_PRS.filter(p => statuses[p.id] === 'pending')
  const approved = MOCK_PRS.filter(p => statuses[p.id] === 'approved')
  const rejected = MOCK_PRS.filter(p => statuses[p.id] === 'rejected')

  const handleApprove = () => {
    if (!selectedId) return
    setStatuses(prev => ({ ...prev, [selectedId]: 'approved' }))
    setApproveOpen(false)
    form.resetFields()
  }
  const handleReject = () => {
    if (!selectedId) return
    setStatuses(prev => ({ ...prev, [selectedId]: 'rejected' }))
    setRejectOpen(false)
    form.resetFields()
  }

  const itemColumns = [
    { title: 'รายการ',        dataIndex: 'name',      key: 'name' },
    { title: 'หน่วย',         dataIndex: 'unit',      key: 'unit',       width: 80 },
    { title: 'จำนวน',         dataIndex: 'qty',        key: 'qty',       width: 80, align: 'center' as const },
    { title: 'ราคา/หน่วย',    dataIndex: 'unitPrice',  key: 'unitPrice', width: 120, align: 'right' as const,
      render: (v: number) => `฿${v.toLocaleString()}` },
    { title: 'รวม',            dataIndex: 'total',     key: 'total',      width: 120, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
  ]

  const makeColumns = (list: typeof MOCK_PRS) => [
    { title: 'เลขที่ PR', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedId(v)}>{v}</Text> },
    { title: 'ใบงานซ่อม / อุปกรณ์', key: 'wo', render: (_: any, r: typeof MOCK_PRS[0]) => (
      <div><Text style={{ color: '#60a5fa' }}>{r.woId}</Text><br/><Text style={{ fontSize: 11, color: '#94a3b8' }}>{r.woAsset}</Text></div>
    )},
    { title: 'ผู้ขอ',         dataIndex: 'requestedBy',  key: 'req',  width: 170 },
    { title: 'วงเงิน',        dataIndex: 'totalAmount',  key: 'amt',  width: 120, align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > BUDGET_LIMIT ? '#ef4444' : '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text>
      )},
    { title: 'วันที่',        dataIndex: 'createdDate',  key: 'date', width: 110,
      render: (v: string) => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{v}</Text> },
    { title: '',               key: 'act', width: 80,
      render: (_: any, r: typeof MOCK_PRS[0]) => (
        <Button size="small" onClick={() => setSelectedId(r.id)}>พิจารณา</Button>
      )},
  ]

  const renderTable = (list: typeof MOCK_PRS) =>
    list.length === 0
      ? <div style={{ textAlign: 'center', padding: 32, color: '#475569' }}>ไม่มีรายการ</div>
      : <Table dataSource={list} columns={makeColumns(list)} rowKey="id" size="small" pagination={{ pageSize: 8 }} />

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { href: '/general/procurement/parts-request', title: 'ขอซื้ออะไหล่ (PR)' },
            { title: 'อนุมัติใบขอซื้อ' },
          ]} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <FaClipboardCheck style={{ fontSize: 24, color: '#FF6500' }} />
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>อนุมัติใบขอซื้ออะไหล่</Title>
            <Badge count={pending.length} color="warning" />
          </div>

          {pending.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`มีใบขอซื้อรออนุมัติ ${pending.length} รายการ`}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Pending */}
          <Card title={<span style={{ color: '#fbbf24' }}>รออนุมัติ ({pending.length})</span>}
            style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
            styles={{ header: { borderBottom: '1px solid #334155' } }}>
            {renderTable(pending)}
          </Card>

          {/* Approved */}
          <Card title={<span style={{ color: '#6ee7b7' }}>อนุมัติแล้ว ({approved.length})</span>}
            style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
            styles={{ header: { borderBottom: '1px solid #334155' } }}>
            {renderTable(approved)}
          </Card>

          {/* Rejected */}
          <Card title={<span style={{ color: '#f87171' }}>ไม่อนุมัติ ({rejected.length})</span>}
            style={{ background: '#1e293b', border: '1px solid #334155' }}
            styles={{ header: { borderBottom: '1px solid #334155' } }}>
            {renderTable(rejected)}
          </Card>
        </div>
      </div>

      {/* Detail/Action Drawer */}
      <Modal
        title={<span><FaFileAlt style={{ color: '#FF6500', marginRight: 8 }} />พิจารณาใบขอซื้อ — {selected?.id}</span>}
        open={!!selectedId}
        onCancel={() => setSelectedId(null)}
        footer={
          currentStatus === 'pending' ? (
            <Space>
              <Button danger icon={<CloseCircleOutlined />} onClick={() => { setSelectedId(null); setRejectOpen(true) }}>ไม่อนุมัติ</Button>
              <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#16a34a' }}
                onClick={() => { setSelectedId(null); setApproveOpen(true) }}>อนุมัติ</Button>
            </Space>
          ) : null
        }
        width={700}
      >
        {selected && (
          <div style={{ marginTop: 8 }}>
            <Descriptions column={2} size="small" labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}>
              <Descriptions.Item label="เลขที่ PR">{selected.id}</Descriptions.Item>
              <Descriptions.Item label="ใบงานซ่อม"><Text style={{ color: '#60a5fa' }}>{selected.woId}</Text></Descriptions.Item>
              <Descriptions.Item label="ผู้ขอ">{selected.requestedBy}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{selected.department}</Descriptions.Item>
              <Descriptions.Item label="ผู้จำหน่าย" span={2}>{selected.supplier}</Descriptions.Item>
              <Descriptions.Item label="เหตุผล" span={2}><Text style={{ color: '#fbbf24' }}>{selected.reason}</Text></Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: '#334155' }}>รายการอะไหล่</Divider>
            <Table
              dataSource={selected.items}
              columns={itemColumns}
              rowKey="key"
              size="small"
              pagination={false}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}><Text style={{ fontWeight: 700 }}>รวมทั้งสิ้น</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text style={{ color: '#a78bfa', fontWeight: 700, fontSize: 16 }}>฿{selected.totalAmount.toLocaleString()}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
            {selected.totalAmount > BUDGET_LIMIT && (
              <Alert type="error" showIcon style={{ marginTop: 12 }}
                message={`วงเงินเกิน ฿${BUDGET_LIMIT.toLocaleString()} — ต้องผ่านความเห็นชอบจากผู้อำนวยการ`} />
            )}
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        title={<span><CheckCircleOutlined style={{ color: '#16a34a', marginRight: 8 }} />ยืนยันอนุมัติ</span>}
        open={approveOpen}
        onCancel={() => { setApproveOpen(false); form.resetFields() }}
        onOk={handleApprove}
        okText="ยืนยันอนุมัติ"
        okButtonProps={{ style: { background: '#16a34a' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="หมายเหตุ / เงื่อนไข (ถ้ามี)" name="note">
            <TextArea rows={3} placeholder="เช่น ให้จัดซื้อภายในงบประมาณที่กำหนด ..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={<span><CloseCircleOutlined style={{ color: '#dc2626', marginRight: 8 }} />ระบุเหตุผลที่ไม่อนุมัติ</span>}
        open={rejectOpen}
        onCancel={() => { setRejectOpen(false); form.resetFields() }}
        onOk={handleReject}
        okText="ยืนยันไม่อนุมัติ"
        okButtonProps={{ danger: true }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="เหตุผลที่ไม่อนุมัติ" name="reason" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
            <TextArea rows={3} placeholder="ระบุเหตุผลที่ไม่อนุมัติ เพื่อแจ้งกลับผู้ขอ..." />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}
