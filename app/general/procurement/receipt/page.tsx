'use client'
import React, { useState } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, InputNumber, Divider, Row, Col, Alert, Progress, Descriptions
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, CheckCircleOutlined, InboxOutlined
} from '@ant-design/icons'
import { FaBoxOpen } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { MOCK_POS } from '../purchase-order/page'

const { Title, Text } = Typography
const { TextArea } = Input

type POStatus = 'draft' | 'sent' | 'partial' | 'completed'

const STATUS_TAG: Record<POStatus, { label: string; color: string }> = {
  draft:     { label: 'ร่าง',            color: 'default'    },
  sent:      { label: 'รอรับสินค้า',     color: 'processing' },
  partial:   { label: 'รับบางส่วน',     color: 'warning'    },
  completed: { label: 'รับครบแล้ว',     color: 'success'    },
}

export default function ProcurementReceiptPage() {
  const [pos, setPOs] = useState(MOCK_POS)
  const [receiveId, setReceiveId] = useState<string | null>(null)
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({})
  const [form] = Form.useForm()

  const po = pos.find(p => p.id === receiveId)

  const openReceive = (id: string) => {
    const p = pos.find(x => x.id === id)
    if (!p) return
    const initial: Record<string, number> = {}
    p.items.forEach(i => { initial[i.key] = i.qty - i.received })
    setReceiveQtys(initial)
    setReceiveId(id)
  }

  const handleConfirmReceive = () => {
    if (!receiveId || !po) return
    setPOs(prev => prev.map(p => {
      if (p.id !== receiveId) return p
      const updatedItems = p.items.map(i => ({
        ...i,
        received: Math.min(i.qty, i.received + (receiveQtys[i.key] ?? 0))
      }))
      const allReceived = updatedItems.every(i => i.received >= i.qty)
      const anyReceived = updatedItems.some(i => i.received > 0)
      return { ...p, items: updatedItems, status: (allReceived ? 'completed' : anyReceived ? 'partial' : p.status) as POStatus }
    }))
    setReceiveId(null)
    form.resetFields()
  }

  const columns = [
    { title: 'เลขที่ PO',     dataIndex: 'id',           key: 'id',    width: 130,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600 }}>{v}</Text> },
    { title: 'ผู้จัดจำหน่าย', dataIndex: 'supplier',     key: 'sup',   render: (v: string) => <Text>{v}</Text> },
    { title: 'รายการสินค้า', key: 'items', render: (_: any, r: typeof MOCK_POS[0]) => (
      <div>
        {r.items.map(i => (
          <div key={i.key} style={{ fontSize: 12, marginBottom: 2 }}>
            <Text style={{ color: '#e2e8f0' }}>{i.name}</Text>
            <Text style={{ color: '#94a3b8', marginLeft: 8 }}>รับแล้ว {i.received}/{i.qty} {i.unit}</Text>
          </div>
        ))}
      </div>
    )},
    { title: 'กำหนดรับ',     dataIndex: 'expectedDate',  key: 'exp',   width: 120,
      render: (v: string) => {
        const isLate = new Date(v) < new Date('2026-04-13')
        return <Text style={{ color: isLate ? '#ef4444' : '#60a5fa' }}>{v}</Text>
      }},
    { title: 'วงเงิน',       dataIndex: 'totalAmount',   key: 'amt',   width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa' }}>฿{v.toLocaleString()}</Text> },
    { title: 'สถานะ',        dataIndex: 'status',        key: 'status', width: 140,
      render: (v: POStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].label}</Tag> },
    { title: '', key: 'act', width: 120, render: (_: any, r: typeof MOCK_POS[0]) => (
      r.status !== 'completed'
        ? <Button type="primary" size="small" icon={<InboxOutlined />} onClick={() => openReceive(r.id)}>รับสินค้า</Button>
        : <Tag color="success" icon={<CheckCircleOutlined />}>รับครบแล้ว</Tag>
    )},
  ]

  const pending = pos.filter(p => p.status === 'sent' || p.status === 'partial')
  const completed = pos.filter(p => p.status === 'completed')

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { href: '/general/procurement/purchase-order', title: 'ใบสั่งซื้อ (PO)' },
            { title: 'รับอะไหล่' },
          ]} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <FaBoxOpen style={{ fontSize: 24, color: '#FF6500' }} />
            <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>รับอะไหล่ / ตรวจรับสินค้า</Title>
          </div>

          {pending.length > 0 && (
            <Alert type="warning" showIcon style={{ marginBottom: 16 }}
              message={`มี PO รอรับสินค้า ${pending.length} รายการ`} />
          )}

          <Card title={<span style={{ color: '#fbbf24' }}>รอรับสินค้า ({pending.length})</span>}
            style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
            styles={{ header: { borderBottom: '1px solid #334155' } }}>
            <Table dataSource={pending} columns={columns} rowKey="id" size="small" pagination={false} />
          </Card>

          <Card title={<span style={{ color: '#6ee7b7' }}>รับครบแล้ว ({completed.length})</span>}
            style={{ background: '#1e293b', border: '1px solid #334155' }}
            styles={{ header: { borderBottom: '1px solid #334155' } }}>
            <Table dataSource={completed} columns={columns} rowKey="id" size="small" pagination={false} />
          </Card>
        </div>
      </div>

      {/* Receive Modal */}
      <Modal
        title={<span><InboxOutlined style={{ color: '#FF6500', marginRight: 8 }} />ยืนยันรับสินค้า — {receiveId}</span>}
        open={!!receiveId}
        onCancel={() => { setReceiveId(null); form.resetFields() }}
        onOk={handleConfirmReceive}
        okText="ยืนยันรับสินค้า"
        width={660}
      >
        {po && (
          <div style={{ marginTop: 8 }}>
            <Descriptions size="small" column={2} labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}>
              <Descriptions.Item label="ผู้จำหน่าย">{po.supplier}</Descriptions.Item>
              <Descriptions.Item label="วงเงิน">฿{po.totalAmount.toLocaleString()}</Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: '#334155' }}>ระบุจำนวนที่รับได้ในรอบนี้</Divider>

            {po.items.map(item => {
              const remaining = item.qty - item.received
              const pct = Math.round((item.received / item.qty) * 100)
              return (
                <Card key={item.key} size="small" style={{ background: '#0f172a', border: '1px solid #334155', marginBottom: 10 }}>
                  <Text style={{ fontWeight: 500, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>{item.name}</Text>
                  <Row gutter={16} align="middle">
                    <Col span={14}>
                      <Progress percent={pct} strokeColor="#FF6500" trailColor="#334155" size="small" />
                      <Text style={{ fontSize: 11, color: '#94a3b8' }}>รับแล้ว {item.received} / สั่ง {item.qty} {item.unit}</Text>
                    </Col>
                    <Col span={10}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>รับรอบนี้:</Text>
                        <InputNumber
                          min={0} max={remaining} value={receiveQtys[item.key] ?? remaining}
                          onChange={v => setReceiveQtys(prev => ({ ...prev, [item.key]: v ?? 0 }))}
                          addonAfter={item.unit}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </Col>
                  </Row>
                </Card>
              )
            })}

            <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
              <Form.Item label="หมายเหตุการรับของ" name="remark">
                <TextArea rows={2} placeholder="เช่น สินค้าตรงตามสเปค มีใบรับประกัน / บางรายการยังรอ..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </ConfigProvider>
  )
}
