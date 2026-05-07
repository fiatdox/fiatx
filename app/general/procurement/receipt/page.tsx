'use client'
import React, { useState, useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, InputNumber, Divider, Row, Col, Alert, Progress, Descriptions, Select, DatePicker, Space, App, message
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, CheckCircleOutlined, InboxOutlined, FileDoneOutlined,
  WarningOutlined, ClockCircleOutlined, CloseCircleOutlined, CalendarOutlined, ReloadOutlined
} from '@ant-design/icons'
import { FaBoxOpen, FaFileInvoiceDollar } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import {
  MOCK_RECEIPTS, ReceiptRecord, STATUS_LABEL, TODAY,
  ShortReason, SHORT_REASON_LABEL,
  MOCK_POS, POStatus, PO_STATUS_TAG, PurchaseOrder,
} from '../_data'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

const { Title, Text } = Typography

const SHORT_REASON_OPTIONS = (Object.keys(SHORT_REASON_LABEL) as ShortReason[])
  .map(k => ({ label: SHORT_REASON_LABEL[k], value: k }))

const PageContent = () => {
  const [pos, setPOs] = useState(MOCK_POS)
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(MOCK_RECEIPTS)
  const [receiveId, setReceiveId] = useState<string | null>(null)
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({})
  const [pendingQtys, setPendingQtys] = useState<Record<string, number>>({})
  const [shortReasons, setShortReasons] = useState<Record<string, ShortReason | undefined>>({})
  const [shortNotes, setShortNotes] = useState<Record<string, string>>({})
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [form] = Form.useForm()

  const po = pos.find(p => p.id === receiveId)

  const inRange = (date?: string) => {
    if (!dateRange) return true
    if (!date) return false
    const ts = dayjs(date).valueOf()
    return ts >= dateRange[0].startOf('day').valueOf() && ts <= dateRange[1].endOf('day').valueOf()
  }

  const openReceive = (id: string) => {
    const p = pos.find(x => x.id === id)
    if (!p) return
    const initial: Record<string, number> = {}
    p.items.forEach(i => { initial[i.key] = i.qty - i.received })
    setReceiveQtys(initial)
    setPendingQtys({})
    setShortReasons({})
    setShortNotes({})
    setReceiveId(id)
    form.setFieldsValue({
      invoiceDate: TODAY,
      receivedDate: TODAY,
      creditDays: 30,
      receivedBy: 'น.ส.สุดา พัสดุดี',
    })
  }

  const handleConfirmReceive = () => {
    if (!receiveId || !po) return
    form.validateFields().then(values => {
      const lineRows = po.items.map(i => {
        const remaining = i.qty - i.received
        const got = receiveQtys[i.key] ?? 0
        const pending = pendingQtys[i.key] ?? 0
        const cancelled = Math.max(0, remaining - got - pending)
        return {
          base: i,
          remaining,
          got,
          pending,
          cancelled,
          short: remaining - got,        // รวม pending + cancelled
          reason: shortReasons[i.key],
          note: shortNotes[i.key] || '',
        }
      })

      // Validate: pending + got ต้องไม่เกิน remaining
      const overflow = lineRows.find(r => r.got + r.pending > r.remaining)
      if (overflow) {
        message.error(`รับ + รอส่งเพิ่ม เกินจำนวนสั่ง: ${overflow.base.name}`)
        return
      }
      // ถ้ามี short (pending หรือ cancelled) ต้องระบุเหตุผล
      const missingReason = lineRows.find(r => r.short > 0 && !r.reason)
      if (missingReason) {
        message.error(`กรุณาระบุเหตุผลที่รับไม่ครบ: ${missingReason.base.name}`)
        return
      }
      const missingNote = lineRows.find(r => r.short > 0 && r.reason === 'other' && !r.note.trim())
      if (missingNote) {
        message.error(`เหตุผล "อื่นๆ" ต้องระบุหมายเหตุเพิ่มเติม: ${missingNote.base.name}`)
        return
      }
      const anyReceived = lineRows.some(r => r.got > 0)
      if (!anyReceived) {
        message.error('ต้องรับสินค้าอย่างน้อย 1 รายการ — ถ้าไม่รับเลยให้ยกเลิกใบส่ง')
        return
      }

      const totalAmount = lineRows.reduce((s, r) => s + r.got * r.base.unitPrice, 0)
      const dueDate = dayjs(values.invoiceDate).add(values.creditDays, 'day').format('YYYY-MM-DD')

      // Update PO received qty
      setPOs(prev => prev.map(p => {
        if (p.id !== receiveId) return p
        const updatedItems = p.items.map(i => ({
          ...i,
          received: Math.min(i.qty, i.received + (receiveQtys[i.key] ?? 0))
        }))
        const allReceived = updatedItems.every(i => i.received >= i.qty)
        const anyRcv = updatedItems.some(i => i.received > 0)
        return {
          ...p, items: updatedItems,
          status: (allReceived ? 'completed' : anyRcv ? 'partial' : p.status) as POStatus,
        }
      }))

      // เก็บทั้งรายการที่รับ และรายการที่ไม่ได้รับ (มีเหตุผล) ไว้ใน GR
      const grItems = lineRows
        .filter(r => r.got > 0 || r.short > 0)
        .map(r => ({
          key: r.base.key,
          name: r.base.name,
          unit: r.base.unit,
          qty: r.got,
          qtyOrdered: r.remaining,
          ...(r.pending > 0 ? { qtyPending: r.pending } : {}),
          unitPrice: r.base.unitPrice,
          ...(r.short > 0 ? { shortReason: r.reason, shortNote: r.note || undefined } : {}),
        }))

      const nextSeq = (receipts.length + 1).toString().padStart(3, '0')
      const newGR: ReceiptRecord = {
        id: `GR-2026-${nextSeq}`,
        poId: po.id,
        supplier: po.supplier,
        supplierTaxId: '-',
        invoiceNo: values.invoiceNo,
        invoiceDate: values.invoiceDate,
        receivedDate: values.receivedDate,
        receivedBy: values.receivedBy,
        creditDays: values.creditDays,
        dueDate,
        items: grItems,
        totalAmount,
        inspectionStatus: 'pending',
        committee: [],
        paymentStatus: 'unpaid',
        remark: values.remark || '',
      }
      setReceipts(prev => [newGR, ...prev])

      const pendingCount = lineRows.filter(r => r.pending > 0).length
      const cancelledCount = lineRows.filter(r => r.cancelled > 0).length
      let suffix = ''
      if (pendingCount > 0) suffix += ` (รอส่งเพิ่ม ${pendingCount} รายการ`
      if (cancelledCount > 0) suffix += `${pendingCount > 0 ? ', ' : ' ('}ยกเลิก ${cancelledCount} รายการ`
      if (suffix) suffix += ')'
      message.success(
        `บันทึก ${newGR.id} แล้ว — เจ้าหนี้ ฿${totalAmount.toLocaleString()} ครบกำหนด ${dueDate}${suffix}`
      )
      setReceiveId(null)
      form.resetFields()
    }).catch(() => {})
  }

  const poColumns = [
    { title: 'เลขที่ PO', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600 }}>{v}</Text> },
    { title: 'ผู้จัดจำหน่าย', dataIndex: 'supplier', key: 'sup',
      render: (v: string) => <Text>{v}</Text> },
    { title: 'รายการสินค้า', key: 'items', render: (_: any, r: PurchaseOrder) => (
      <div>
        {r.items.map(i => (
          <div key={i.key} style={{ fontSize: 12, marginBottom: 2 }}>
            <Text style={{ color: '#e2e8f0' }}>{i.name}</Text>
            <Text style={{ color: '#94a3b8', marginLeft: 8 }}>รับแล้ว {i.received}/{i.qty} {i.unit}</Text>
          </div>
        ))}
      </div>
    )},
    { title: 'กำหนดรับ', dataIndex: 'expectedDate', key: 'exp', width: 120,
      render: (v: string) => {
        const isLate = new Date(v) < new Date(TODAY)
        return <Text style={{ color: isLate ? '#ef4444' : '#60a5fa' }}>{v}</Text>
      }},
    { title: 'วงเงิน', dataIndex: 'totalAmount', key: 'amt', width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa' }}>฿{v.toLocaleString()}</Text> },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 140,
      render: (v: POStatus) => <Tag color={PO_STATUS_TAG[v].color}>{PO_STATUS_TAG[v].label}</Tag> },
    { title: '', key: 'act', width: 120, render: (_: any, r: PurchaseOrder) => (
      r.status !== 'completed'
        ? <Button type="primary" size="small" icon={<InboxOutlined />} onClick={() => openReceive(r.id)}>รับสินค้า</Button>
        : <Tag color="success" icon={<CheckCircleOutlined />}>รับครบแล้ว</Tag>
    )},
  ]

  const grColumns = [
    { title: 'เลขที่ใบรับ', dataIndex: 'id', key: 'id', width: 150,
      render: (v: string, r: ReceiptRecord) => {
        const pendingCount = r.items.filter(i => (i.qtyPending ?? 0) > 0).length
        const cancelledCount = r.items.filter(i => {
          const ord = i.qtyOrdered ?? i.qty
          return ord - i.qty - (i.qtyPending ?? 0) > 0
        }).length
        return (
          <div>
            <Text style={{ color: '#22d3ee', fontWeight: 600 }}>{v}</Text>
            {pendingCount > 0 && (
              <Tag color="warning" style={{ marginLeft: 4, fontSize: 10 }} icon={<ClockCircleOutlined />}>
                รอส่ง {pendingCount}
              </Tag>
            )}
            {cancelledCount > 0 && (
              <Tag color="error" style={{ marginLeft: 4, fontSize: 10 }} icon={<CloseCircleOutlined />}>
                ยกเลิก {cancelledCount}
              </Tag>
            )}
          </div>
        )
      }},
    { title: 'อ้างอิง PO', dataIndex: 'poId', key: 'po', width: 130,
      render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Invoice', dataIndex: 'invoiceNo', key: 'inv', width: 160,
      render: (v: string) => <Text style={{ color: '#fbbf24' }}>{v}</Text> },
    { title: 'ผู้จำหน่าย', dataIndex: 'supplier', key: 'sup' },
    { title: 'วันที่รับ', dataIndex: 'receivedDate', key: 'rd', width: 110,
      render: (v: string) => <Text style={{ color: '#94a3b8' }}>{v}</Text> },
    { title: 'เครดิต', dataIndex: 'creditDays', key: 'cd', width: 80, align: 'center' as const,
      render: (v: number) => <Text>{v} วัน</Text> },
    { title: 'ครบกำหนด', dataIndex: 'dueDate', key: 'dd', width: 110,
      render: (v: string) => <Text style={{ color: '#60a5fa' }}>{v}</Text> },
    { title: 'มูลค่า', dataIndex: 'totalAmount', key: 'amt', width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa' }}>฿{v.toLocaleString()}</Text> },
    { title: 'ตรวจรับ', dataIndex: 'inspectionStatus', key: 'ins', width: 120,
      render: (v: keyof typeof STATUS_LABEL.inspection) =>
        <Tag color={STATUS_LABEL.inspection[v].color}>{STATUS_LABEL.inspection[v].label}</Tag> },
    { title: 'การเงิน', dataIndex: 'paymentStatus', key: 'pay', width: 120,
      render: (v: keyof typeof STATUS_LABEL.payment) =>
        <Tag color={STATUS_LABEL.payment[v].color}>{STATUS_LABEL.payment[v].label}</Tag> },
  ]

  const renderItemRow = (r: ReceiptRecord) => {
    const sumOrdered = r.items.reduce((s, i) => s + (i.qtyOrdered ?? i.qty), 0)
    const sumGot = r.items.reduce((s, i) => s + i.qty, 0)
    const sumPending = r.items.reduce((s, i) => s + (i.qtyPending ?? 0), 0)
    const sumCancelled = r.items.reduce((s, i) => {
      const ord = i.qtyOrdered ?? i.qty
      return s + Math.max(0, ord - i.qty - (i.qtyPending ?? 0))
    }, 0)
    return (
      <div style={{ background: '#0f172a', padding: 12, borderRadius: 6 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>สั่งรอบนี้รวม <b style={{ color: '#e2e8f0' }}>{sumOrdered}</b></Text>
          <Text style={{ color: '#6ee7b7', fontSize: 12 }}><CheckCircleOutlined /> รับจริง <b>{sumGot}</b></Text>
          {sumPending > 0 && <Text style={{ color: '#fbbf24', fontSize: 12 }}><ClockCircleOutlined /> รอส่ง <b>{sumPending}</b></Text>}
          {sumCancelled > 0 && <Text style={{ color: '#ef4444', fontSize: 12 }}><CloseCircleOutlined /> ยกเลิก <b>{sumCancelled}</b></Text>}
        </div>
        <Table size="small" pagination={false} rowKey="key" dataSource={r.items}
          columns={[
            { title: 'รายการ', dataIndex: 'name', key: 'n' },
            { title: 'หน่วย', dataIndex: 'unit', key: 'u', width: 70 },
            { title: 'สั่งรอบนี้', dataIndex: 'qtyOrdered', key: 'qo', width: 80, align: 'center' as const,
              render: (v: number | undefined, row) => v ?? row.qty },
            { title: 'รับจริง', dataIndex: 'qty', key: 'qg', width: 80, align: 'center' as const,
              render: (v: number) => <Text style={{ color: '#6ee7b7', fontWeight: 600 }}>{v}</Text> },
            { title: 'รอส่ง', dataIndex: 'qtyPending', key: 'qp', width: 70, align: 'center' as const,
              render: (v?: number) => v ? <Text style={{ color: '#fbbf24', fontWeight: 600 }}>{v}</Text> : <Text style={{ color: '#475569' }}>-</Text> },
            { title: 'ยกเลิก', key: 'qc', width: 70, align: 'center' as const,
              render: (_: unknown, row) => {
                const ord = row.qtyOrdered ?? row.qty
                const cancelled = Math.max(0, ord - row.qty - (row.qtyPending ?? 0))
                return cancelled > 0
                  ? <Text style={{ color: '#ef4444', fontWeight: 600 }}>{cancelled}</Text>
                  : <Text style={{ color: '#475569' }}>-</Text>
              }},
            { title: 'ราคา/หน่วย', dataIndex: 'unitPrice', key: 'up', width: 100, align: 'right' as const,
              render: (v: number) => `฿${v.toLocaleString()}` },
            { title: 'รวมรับ', key: 'tot', width: 100, align: 'right' as const,
              render: (_: unknown, row) => `฿${(row.qty * row.unitPrice).toLocaleString()}` },
            { title: 'ตรวจรับ (รายบรรทัด)', key: 'inspect', width: 200,
              render: (_: unknown, row) => {
                if (!row.inspectStatus) {
                  return <Tag>รอกรรมการตรวจ</Tag>
                }
                const lbl = STATUS_LABEL.inspection[row.inspectStatus]
                return (
                  <div>
                    <Tag color={lbl.color}>{lbl.label}</Tag>
                    {(row.qtyPassed != null || row.qtyDefect) && (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {row.qtyPassed != null && <> ผ่าน <b style={{ color: '#6ee7b7' }}>{row.qtyPassed}</b></>}
                        {row.qtyDefect ? <> · เสีย <b style={{ color: '#ef4444' }}>{row.qtyDefect}</b></> : null}
                      </span>
                    )}
                    {row.inspectNote && <Text style={{ fontSize: 11, color: '#cbd5e1', display: 'block' }}>{row.inspectNote}</Text>}
                  </div>
                )
              }
            },
            { title: 'เหตุผลรับไม่ครบ', key: 'reason', width: 200,
              render: (_: unknown, row) => row.shortReason ? (
                <div>
                  <Tag color="warning">{SHORT_REASON_LABEL[row.shortReason]}</Tag>
                  {row.shortNote && <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>{row.shortNote}</Text>}
                </div>
              ) : <Text style={{ color: '#475569' }}>-</Text>
            },
          ]} />
      </div>
    )
  }

  const pending = useMemo(() =>
    pos.filter(p => (p.status === 'sent' || p.status === 'partial') && inRange(p.expectedDate)),
    [pos, dateRange])
  const completed = useMemo(() =>
    pos.filter(p => p.status === 'completed' && inRange(p.expectedDate)),
    [pos, dateRange])
  const filteredReceipts = useMemo(() =>
    receipts.filter(r => inRange(r.receivedDate)),
    [receipts, dateRange])

  const totalPos = pos.filter(p => p.status === 'sent' || p.status === 'partial').length
  const totalCompleted = pos.filter(p => p.status === 'completed').length

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
          { href: '/general/procurement/dashboard', title: 'งานพัสดุ' },
          { title: 'รับสินค้า / สร้างเจ้าหนี้' },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <FaBoxOpen style={{ fontSize: 24, color: '#FF6500' }} />
          <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>รับสินค้า / สร้างเจ้าหนี้</Title>
        </div>

        {totalPos > 0 && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            message={`มี PO รอรับสินค้า ${totalPos} รายการ — บันทึกการรับเพื่อสร้างเจ้าหนี้อัตโนมัติ`} />
        )}

        <Card style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
          styles={{ body: { padding: 12 } }}>
          <Space wrap size={12} align="center">
            <Text style={{ color: '#94a3b8' }}><CalendarOutlined /> ค้นหาช่วงวันที่</Text>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]])
                else setDateRange(null)
              }}
              format="YYYY-MM-DD"
              allowClear
              presets={[
                { label: '7 วันล่าสุด', value: [dayjs(TODAY).subtract(7, 'day'), dayjs(TODAY)] },
                { label: '30 วันล่าสุด', value: [dayjs(TODAY).subtract(30, 'day'), dayjs(TODAY)] },
                { label: '90 วันล่าสุด', value: [dayjs(TODAY).subtract(90, 'day'), dayjs(TODAY)] },
                { label: 'เดือนนี้', value: [dayjs(TODAY).startOf('month'), dayjs(TODAY).endOf('month')] },
              ]}
            />
            <Text style={{ color: '#64748b', fontSize: 12 }}>
              PO กรองตาม “กำหนดรับ” • ใบรับ กรองตาม “วันที่รับ”
            </Text>
            {dateRange && (
              <Button size="small" icon={<ReloadOutlined />} onClick={() => setDateRange(null)}>ล้างตัวกรอง</Button>
            )}
          </Space>
        </Card>

        <Card title={<span style={{ color: '#fbbf24' }}>PO รอรับสินค้า ({pending.length}{dateRange ? `/${totalPos}` : ''})</span>}
          style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
          styles={{ header: { borderBottom: '1px solid #334155' } }}>
          <Table dataSource={pending} columns={poColumns} rowKey="id" size="small" pagination={false}
            locale={{ emptyText: dateRange ? 'ไม่พบ PO ในช่วงวันที่ที่เลือก' : 'ไม่มีรายการ' }} />
        </Card>

        <Card title={<span style={{ color: '#22d3ee' }}><FileDoneOutlined /> ใบรับสินค้า / เจ้าหนี้ที่สร้างแล้ว ({filteredReceipts.length}{dateRange ? `/${receipts.length}` : ''})</span>}
          extra={<Text style={{ color: '#94a3b8', fontSize: 12 }}>คลิก ▸ เพื่อดูรายการและเหตุผลที่ไม่รับครบ</Text>}
          style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
          styles={{ header: { borderBottom: '1px solid #334155' } }}>
          <Table dataSource={filteredReceipts} columns={grColumns} rowKey="id" size="small"
            expandable={{ expandedRowRender: renderItemRow }}
            pagination={{ pageSize: 8 }} scroll={{ x: 1200 }}
            locale={{ emptyText: dateRange ? 'ไม่พบใบรับในช่วงวันที่ที่เลือก' : 'ไม่มีรายการ' }} />
        </Card>

        <Card title={<span style={{ color: '#6ee7b7' }}>PO รับครบแล้ว ({completed.length}{dateRange ? `/${totalCompleted}` : ''})</span>}
          style={{ background: '#1e293b', border: '1px solid #334155' }}
          styles={{ header: { borderBottom: '1px solid #334155' } }}>
          <Table dataSource={completed} columns={poColumns} rowKey="id" size="small" pagination={false}
            locale={{ emptyText: dateRange ? 'ไม่พบ PO ในช่วงวันที่ที่เลือก' : 'ไม่มีรายการ' }} />
        </Card>
      </div>

      {/* Receive Modal */}
      <Modal
        title={<span><InboxOutlined style={{ color: '#FF6500', marginRight: 8 }} />ยืนยันรับสินค้า — {receiveId}</span>}
        open={!!receiveId}
        onCancel={() => { setReceiveId(null); form.resetFields() }}
        onOk={handleConfirmReceive}
        okText="บันทึกรับของ + สร้างเจ้าหนี้"
        width={760}
      >
        {po && (
          <div style={{ marginTop: 8 }}>
            <Descriptions size="small" column={2} labelStyle={{ color: '#94a3b8' }} contentStyle={{ color: '#e2e8f0' }}>
              <Descriptions.Item label="ผู้จำหน่าย">{po.supplier}</Descriptions.Item>
              <Descriptions.Item label="วงเงิน PO">฿{po.totalAmount.toLocaleString()}</Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: '#334155' }}>
              <FaFileInvoiceDollar style={{ marginRight: 6 }} />ข้อมูลใบส่งของ / เจ้าหนี้
            </Divider>

            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col span={10}>
                  <Form.Item label="เลขที่ใบส่งของ / Invoice" name="invoiceNo"
                    rules={[{ required: true, message: 'กรุณาระบุเลข Invoice' }]}>
                    <Input placeholder="เช่น INV-2604-018" />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item label="วันที่ Invoice" name="invoiceDate" rules={[{ required: true }]}>
                    <Input type="date" />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item label="วันที่รับของ" name="receivedDate" rules={[{ required: true }]}>
                    <Input type="date" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={10}>
                  <Form.Item label="ผู้รับของ (พัสดุ)" name="receivedBy" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item label="เครดิตเทอม" name="creditDays" rules={[{ required: true }]}>
                    <Select options={[
                      { label: 'จ่ายทันที (0 วัน)', value: 0 },
                      { label: '15 วัน',  value: 15 },
                      { label: '30 วัน',  value: 30 },
                      { label: '45 วัน',  value: 45 },
                      { label: '60 วัน',  value: 60 },
                      { label: '90 วัน',  value: 90 },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={7}>
                  <Form.Item label="หมายเหตุ" name="remark">
                    <Input placeholder="เช่น ขอเอกสารใบกำกับภาษีเพิ่ม" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Divider style={{ borderColor: '#334155' }}>เลือกรายการที่รับ + ระบุเหตุผลถ้าไม่รับครบ</Divider>

            {po.items.map(item => {
              const remaining = item.qty - item.received
              const pct = Math.round((item.received / item.qty) * 100)
              const got = receiveQtys[item.key] ?? remaining
              const pending = pendingQtys[item.key] ?? 0
              const cancelled = Math.max(0, remaining - got - pending)
              const isShort = (pending + cancelled) > 0
              const reason = shortReasons[item.key]

              const borderColor = !isShort ? '#334155'
                : cancelled > 0 ? '#ef4444'
                : '#fbbf24'

              return (
                <Card key={item.key} size="small" style={{
                    background: '#0f172a',
                    border: `1px solid ${borderColor}`,
                    marginBottom: 10,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                    <Text style={{ fontWeight: 500, color: '#e2e8f0', flex: 1 }}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                      สั่งรอบนี้ {remaining} {item.unit} • ฿{item.unitPrice.toLocaleString()}/หน่วย
                    </Text>
                  </div>

                  <Progress percent={pct} strokeColor="#FF6500" trailColor="#334155" size="small"
                    style={{ marginBottom: 10 }}
                    format={() => <Text style={{ color: '#94a3b8', fontSize: 11 }}>รับสะสมในใบ PO {item.received}/{item.qty}</Text>} />

                  <Row gutter={8}>
                    <Col span={8}>
                      <div style={{ background: '#052e16', border: '1px solid #15803d', borderRadius: 6, padding: 8 }}>
                        <Text style={{ color: '#86efac', fontSize: 11, display: 'block', marginBottom: 2 }}>
                          <CheckCircleOutlined /> รับจริง
                        </Text>
                        <InputNumber
                          min={0} max={remaining} value={got} size="small"
                          onChange={v => {
                            const newGot = v ?? 0
                            // ถ้า pending + got > remaining → ลด pending ลง
                            const newPending = Math.min(pending, remaining - newGot)
                            setReceiveQtys(prev => ({ ...prev, [item.key]: newGot }))
                            if (newPending !== pending) {
                              setPendingQtys(prev => ({ ...prev, [item.key]: newPending }))
                            }
                            // ถ้าครบแล้ว เคลียร์เหตุผล
                            if (newGot >= remaining) {
                              setShortReasons(prev => ({ ...prev, [item.key]: undefined }))
                              setShortNotes(prev => ({ ...prev, [item.key]: '' }))
                            }
                          }}
                          addonAfter={<Text style={{ fontSize: 10 }}>{item.unit}</Text>}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ background: '#1e293b', border: '1px solid #f59e0b', borderRadius: 6, padding: 8 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, display: 'block', marginBottom: 2 }}>
                          <ClockCircleOutlined /> รอส่งเพิ่ม
                        </Text>
                        <InputNumber
                          min={0} max={Math.max(0, remaining - got)} value={pending} size="small"
                          onChange={v => setPendingQtys(prev => ({ ...prev, [item.key]: v ?? 0 }))}
                          addonAfter={<Text style={{ fontSize: 10 }}>{item.unit}</Text>}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{
                        background: cancelled > 0 ? '#450a0a' : '#1e293b',
                        border: `1px solid ${cancelled > 0 ? '#dc2626' : '#475569'}`,
                        borderRadius: 6, padding: 8 }}>
                        <Text style={{ color: cancelled > 0 ? '#fca5a5' : '#94a3b8', fontSize: 11, display: 'block', marginBottom: 2 }}>
                          <CloseCircleOutlined /> ยกเลิก/ไม่ส่ง
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', height: 24, justifyContent: 'space-between', padding: '0 4px' }}>
                          <Text style={{ color: cancelled > 0 ? '#fca5a5' : '#475569', fontSize: 16, fontWeight: 600 }}>
                            {cancelled}
                          </Text>
                          <Text style={{ color: '#475569', fontSize: 11 }}>{item.unit} (auto)</Text>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                    <Button size="small" type="link" style={{ padding: 0, height: 18, fontSize: 11 }}
                      onClick={() => {
                        setReceiveQtys(p => ({ ...p, [item.key]: remaining }))
                        setPendingQtys(p => ({ ...p, [item.key]: 0 }))
                        setShortReasons(p => ({ ...p, [item.key]: undefined }))
                        setShortNotes(p => ({ ...p, [item.key]: '' }))
                      }}>
                      ✓ รับครบ
                    </Button>
                    <Text style={{ color: '#475569' }}>·</Text>
                    <Button size="small" type="link" style={{ padding: 0, height: 18, fontSize: 11, color: '#fbbf24' }}
                      onClick={() => {
                        setReceiveQtys(p => ({ ...p, [item.key]: 0 }))
                        setPendingQtys(p => ({ ...p, [item.key]: remaining }))
                      }}>
                      รอส่งทั้งหมด
                    </Button>
                    <Text style={{ color: '#475569' }}>·</Text>
                    <Button size="small" type="link" danger style={{ padding: 0, height: 18, fontSize: 11 }}
                      onClick={() => {
                        setReceiveQtys(p => ({ ...p, [item.key]: 0 }))
                        setPendingQtys(p => ({ ...p, [item.key]: 0 }))
                      }}>
                      ยกเลิกทั้งหมด
                    </Button>
                  </div>

                  {isShort && (
                    <div style={{ marginTop: 10, padding: 10, background: '#1e293b', borderRadius: 6, border: '1px dashed #475569' }}>
                      <Text style={{ color: '#fbbf24', fontSize: 12, display: 'block', marginBottom: 6 }}>
                        <WarningOutlined /> เหตุผล
                        {pending > 0 && cancelled > 0 ? 'ที่รับไม่ครบ (รอส่ง+ยกเลิก)'
                          : pending > 0 ? 'ที่รอส่งเพิ่ม'
                          : 'ที่ยกเลิก/ไม่รับ'}
                        {' '}(จำเป็น)
                      </Text>
                      <Row gutter={8}>
                        <Col span={10}>
                          <Select
                            placeholder="เลือกเหตุผล" size="small"
                            value={reason}
                            onChange={v => setShortReasons(prev => ({ ...prev, [item.key]: v }))}
                            options={SHORT_REASON_OPTIONS}
                            style={{ width: '100%' }}
                            status={!reason ? 'error' : undefined}
                          />
                        </Col>
                        <Col span={14}>
                          <Input size="small"
                            placeholder={reason === 'other' ? 'ระบุเหตุผล (จำเป็น)' : 'หมายเหตุ เช่น คาดว่าได้รับใน 7 วัน'}
                            value={shortNotes[item.key] || ''}
                            onChange={e => setShortNotes(prev => ({ ...prev, [item.key]: e.target.value }))}
                            status={reason === 'other' && !shortNotes[item.key]?.trim() ? 'error' : undefined}
                          />
                        </Col>
                      </Row>
                    </div>
                  )}
                </Card>
              )
            })}

            {/* Summary */}
            {(() => {
              const rounds = po.items.map(i => {
                const remaining = i.qty - i.received
                const got = receiveQtys[i.key] ?? remaining
                const pending = pendingQtys[i.key] ?? 0
                const cancelled = Math.max(0, remaining - got - pending)
                return { got, pending, cancelled, value: got * i.unitPrice }
              })
              const totalGot = rounds.reduce((s, r) => s + r.got, 0)
              const totalPending = rounds.reduce((s, r) => s + r.pending, 0)
              const totalCancelled = rounds.reduce((s, r) => s + r.cancelled, 0)
              const totalAmt = rounds.reduce((s, r) => s + r.value, 0)
              return (
                <div style={{ display: 'flex', gap: 16, padding: '10px 14px', background: '#0f172a', borderRadius: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <Text style={{ color: '#6ee7b7' }}>
                    <CheckCircleOutlined /> รับจริง: <b>{totalGot}</b> ชิ้น
                  </Text>
                  {totalPending > 0 && (
                    <Text style={{ color: '#fbbf24' }}>
                      <ClockCircleOutlined /> รอส่งเพิ่ม: <b>{totalPending}</b> ชิ้น
                    </Text>
                  )}
                  {totalCancelled > 0 && (
                    <Text style={{ color: '#ef4444' }}>
                      <CloseCircleOutlined /> ยกเลิก: <b>{totalCancelled}</b> ชิ้น
                    </Text>
                  )}
                  <Text style={{ color: '#a78bfa', marginLeft: 'auto', fontWeight: 600 }}>
                    มูลค่าเจ้าหนี้รอบนี้: ฿{totalAmt.toLocaleString()}
                  </Text>
                </div>
              )
            })()}

            <Alert type="info" showIcon style={{ marginTop: 8 }}
              message="เมื่อบันทึกแล้ว ระบบจะสร้างใบรับสินค้า (GR) และรายการเจ้าหนี้ตามมูลค่าที่รับจริงโดยอัตโนมัติ"
              description="รายการที่ไม่รับครบจะถูกบันทึกไว้พร้อมเหตุผล เพื่ออ้างอิงตอนรอบส่งครั้งถัดไป" />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function ProcurementReceiptPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
