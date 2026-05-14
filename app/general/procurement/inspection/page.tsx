'use client'
import React, { useState, useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, Select, Divider, Row, Col, Alert, Descriptions, App, message, Statistic, InputNumber, Tooltip
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, AuditOutlined, ToolOutlined
} from '@ant-design/icons'
import { FaClipboardCheck, FaUsers } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import {
  MOCK_RECEIPTS, ReceiptRecord, ReceiptItem, InspectionStatus,
  STATUS_LABEL, TODAY,
} from '../_data'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

const COMMITTEE_OPTIONS = [
  'นพ.สมชาย รักษาดี',
  'นางพรพิมล จัดซื้อชอบ',
  'นายธนา ตรวจรับ',
  'นายวิชัย คลังเก่ง',
  'น.ส.มาลี ปฏิบัติ',
  'ภญ.อัจฉรา ยาดี',
  'ภก.สมศักดิ์ ตรวจยา',
  'นายสุรชัย ไอที',
].map(n => ({ label: n, value: n }))

const ITEM_STATUS_OPTIONS: { value: InspectionStatus; label: string; color: string }[] = [
  { value: 'pending',   label: 'รอตรวจ',  color: '#94a3b8' },
  { value: 'passed',    label: 'ผ่าน',    color: '#10b981' },
  { value: 'reworking', label: 'แก้ไข',   color: '#fbbf24' },
  { value: 'rejected',  label: 'ไม่ผ่าน', color: '#ef4444' },
]

// รวมผลรายบรรทัด → สถานะรวม
const computeOverall = (statuses: InspectionStatus[]): InspectionStatus => {
  if (statuses.length === 0) return 'pending'
  if (statuses.some(s => s === 'rejected')) return 'rejected'
  if (statuses.some(s => s === 'reworking')) return 'reworking'
  if (statuses.some(s => s === 'pending')) return 'pending'
  return 'passed'
}

type ItemDraft = {
  status: InspectionStatus
  qtyPassed: number
  qtyDefect: number
  note: string
}

const PageContent = () => {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(MOCK_RECEIPTS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({})
  const [form] = Form.useForm()

  const active = receipts.find(r => r.id === activeId)

  const overall = useMemo<InspectionStatus>(() => {
    if (!active) return 'pending'
    return computeOverall(active.items.map(i => itemDrafts[i.key]?.status ?? 'pending'))
  }, [active, itemDrafts])

  const openInspect = (id: string) => {
    const r = receipts.find(x => x.id === id)
    if (!r) return
    const drafts: Record<string, ItemDraft> = {}
    r.items.forEach(i => {
      drafts[i.key] = {
        status: i.inspectStatus ?? 'pending',
        qtyPassed: i.qtyPassed ?? (i.inspectStatus === 'passed' ? i.qty : 0),
        qtyDefect: i.qtyDefect ?? 0,
        note: i.inspectNote ?? '',
      }
    })
    setItemDrafts(drafts)
    setActiveId(id)
    form.setFieldsValue({
      inspectionDate: r.inspectionDate || TODAY,
      inspectionBy: r.inspectionBy || 'นายวิชัย คลังเก่ง (หัวหน้าคลัง)',
      committee: r.committee || [],
      inspectionRemark: r.inspectionRemark || '',
    })
  }

  const updateDraft = (key: string, patch: Partial<ItemDraft>) => {
    setItemDrafts(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const handleSave = () => {
    if (!activeId || !active) return
    form.validateFields().then(values => {
      // validate per-item
      for (const it of active.items) {
        const d = itemDrafts[it.key]
        if (!d || d.status === 'pending') {
          message.error(`รายการ "${it.name}" ยังไม่ได้ระบุผลตรวจ`)
          return
        }
        if (d.qtyPassed + d.qtyDefect > it.qty) {
          message.error(`"${it.name}" จำนวนผ่าน + ไม่ผ่าน เกินจำนวนที่รับ (${it.qty})`)
          return
        }
        if ((d.status === 'rejected' || d.status === 'reworking') && !d.note.trim()) {
          message.error(`"${it.name}" ต้องระบุเหตุผลที่ไม่ผ่าน/ต้องแก้ไข`)
          return
        }
      }

      const newItems: ReceiptItem[] = active.items.map(i => {
        const d = itemDrafts[i.key]
        return {
          ...i,
          inspectStatus: d.status,
          qtyPassed: d.qtyPassed,
          qtyDefect: d.qtyDefect || undefined,
          inspectNote: d.note || undefined,
        }
      })

      const overallStatus = computeOverall(newItems.map(i => i.inspectStatus ?? 'pending'))

      setReceipts(prev => prev.map(r => r.id === activeId ? {
        ...r,
        items: newItems,
        inspectionStatus: overallStatus,
        inspectionDate: values.inspectionDate,
        inspectionBy: values.inspectionBy,
        committee: values.committee,
        inspectionRemark: values.inspectionRemark,
      } : r))
      const labelMap = STATUS_LABEL.inspection[overallStatus]
      message.success(`บันทึกผลตรวจรับ ${activeId} : ${labelMap.label} — แจ้งบัญชี/การเงินแล้ว`)
      setActiveId(null)
      form.resetFields()
      setItemDrafts({})
    }).catch(() => {})
  }

  const pending = receipts.filter(r => r.inspectionStatus === 'pending')
  const passed = receipts.filter(r => r.inspectionStatus === 'passed')
  const rejected = receipts.filter(r => r.inspectionStatus === 'rejected' || r.inspectionStatus === 'reworking')

  const columns = (showAction: boolean) => [
    { title: 'เลขที่ใบรับ', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => <Text style={{ color: '#22d3ee', fontWeight: 600 }}>{v}</Text> },
    { title: 'อ้างอิง PO', dataIndex: 'poId', key: 'po', width: 130,
      render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Invoice', dataIndex: 'invoiceNo', key: 'inv', width: 150,
      render: (v: string) => <Text style={{ color: '#fbbf24' }}>{v}</Text> },
    { title: 'ผู้จำหน่าย', dataIndex: 'supplier', key: 'sup' },
    { title: 'วันที่รับ', dataIndex: 'receivedDate', key: 'rd', width: 110,
      render: (v: string) => <Text style={{ color: '#94a3b8' }}>{v}</Text> },
    { title: 'รายการ (ผ่าน/ทั้งหมด)', key: 'items', width: 160, align: 'center' as const,
      render: (_: unknown, r: ReceiptRecord) => {
        const total = r.items.length
        const passedCnt = r.items.filter(i => i.inspectStatus === 'passed').length
        const defectCnt = r.items.filter(i => i.inspectStatus === 'rejected' || i.inspectStatus === 'reworking').length
        return (
          <div style={{ fontSize: 12 }}>
            <Tag color="success">ผ่าน {passedCnt}</Tag>
            {defectCnt > 0 && <Tag color="error">ปัญหา {defectCnt}</Tag>}
            <Text style={{ color: '#94a3b8' }}>/ {total}</Text>
          </div>
        )
      }},
    { title: 'มูลค่า', dataIndex: 'totalAmount', key: 'amt', width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa' }}>฿{v.toLocaleString()}</Text> },
    { title: 'รอตรวจ (วัน)', key: 'wait', width: 120, align: 'center' as const,
      render: (_: unknown, r: ReceiptRecord) => {
        const days = dayjs(TODAY).diff(dayjs(r.receivedDate), 'day')
        const color = days >= 7 ? '#ef4444' : days >= 3 ? '#fbbf24' : '#6ee7b7'
        return <Text style={{ color, fontWeight: 600 }}>{days} วัน</Text>
      }},
    { title: 'สถานะรวม', dataIndex: 'inspectionStatus', key: 'st', width: 120,
      render: (v: InspectionStatus) =>
        <Tag color={STATUS_LABEL.inspection[v].color}>{STATUS_LABEL.inspection[v].label}</Tag> },
    ...(showAction ? [{
      title: '', key: 'act', width: 130,
      render: (_: unknown, r: ReceiptRecord) => (
        <Button type="primary" size="small" icon={<AuditOutlined />} onClick={() => openInspect(r.id)}>
          ตรวจรับรายการ
        </Button>
      )
    }] : [{
      title: '', key: 'act', width: 90,
      render: (_: unknown, r: ReceiptRecord) => (
        <Button size="small" onClick={() => openInspect(r.id)}>ดู / แก้ไข</Button>
      )
    }]),
  ]

  // ─── Per-item inspection rows in modal
  const itemColumns = active ? [
    { title: 'รายการ', dataIndex: 'name', key: 'name',
      render: (v: string, r: ReceiptItem) => (
        <div>
          <Text style={{ color: '#e2e8f0', fontSize: 12 }}>{v}</Text>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            รับมา {r.qty} {r.unit} • ฿{r.unitPrice.toLocaleString()}/{r.unit}
          </div>
        </div>
      )
    },
    { title: 'ผลตรวจ', key: 'status', width: 120, align: 'center' as const,
      render: (_: unknown, r: ReceiptItem) => {
        const d = itemDrafts[r.key]
        return (
          <Select size="small" style={{ width: '100%' }}
            value={d?.status ?? 'pending'}
            onChange={v => {
              const patch: Partial<ItemDraft> = { status: v }
              if (v === 'passed') {
                patch.qtyPassed = r.qty
                patch.qtyDefect = 0
              } else if (v === 'rejected') {
                patch.qtyPassed = 0
                patch.qtyDefect = r.qty
              }
              updateDraft(r.key, patch)
            }}
            options={ITEM_STATUS_OPTIONS.map(o => ({
              value: o.value,
              label: <span style={{ color: o.color }}>● {o.label}</span>,
            }))}
          />
        )
      }
    },
    { title: 'จำนวนผ่าน', key: 'qtyPassed', width: 110, align: 'center' as const,
      render: (_: unknown, r: ReceiptItem) => {
        const d = itemDrafts[r.key]
        return (
          <InputNumber size="small" min={0} max={r.qty}
            value={d?.qtyPassed ?? 0}
            onChange={v => updateDraft(r.key, { qtyPassed: v ?? 0 })}
            style={{ width: '100%' }} />
        )
      }
    },
    { title: 'ไม่ผ่าน/คืน', key: 'qtyDefect', width: 110, align: 'center' as const,
      render: (_: unknown, r: ReceiptItem) => {
        const d = itemDrafts[r.key]
        const max = r.qty - (d?.qtyPassed ?? 0)
        return (
          <InputNumber size="small" min={0} max={Math.max(0, max)}
            value={d?.qtyDefect ?? 0}
            onChange={v => updateDraft(r.key, { qtyDefect: v ?? 0 })}
            style={{ width: '100%' }} />
        )
      }
    },
    { title: 'หมายเหตุ / เหตุผล', key: 'note',
      render: (_: unknown, r: ReceiptItem) => {
        const d = itemDrafts[r.key]
        const required = d?.status === 'rejected' || d?.status === 'reworking'
        return (
          <Input size="small" value={d?.note ?? ''}
            placeholder={required ? 'จำเป็น — ระบุปัญหา' : 'ตรงสเปค / ครบจำนวน...'}
            onChange={e => updateDraft(r.key, { note: e.target.value })}
            status={required && !d?.note?.trim() ? 'error' : undefined}
          />
        )
      }
    },
  ] : []

  const overallLabel = STATUS_LABEL.inspection[overall]
  const overallTagColor =
    overall === 'passed' ? '#10b981' :
    overall === 'rejected' ? '#ef4444' :
    overall === 'reworking' ? '#fbbf24' : '#94a3b8'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
          { href: '/general/procurement/dashboard', title: 'งานพัสดุ' },
          { title: 'ตรวจรับสินค้า (กรรมการตรวจรายบรรทัด)' },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <FaClipboardCheck style={{ fontSize: 24, color: '#22d3ee' }} />
          <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>
            ตรวจรับสินค้า — กรรมการตรวจ <span style={{ color: '#22d3ee' }}>รายบรรทัด</span> ใน PO
          </Title>
        </div>

        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <Statistic title={<span style={{ color: '#94a3b8' }}>รอตรวจรับ</span>} value={pending.length}
                styles={{ content: { color: '#fbbf24' } }} prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <Statistic title={<span style={{ color: '#94a3b8' }}>ตรวจผ่าน → ส่งบัญชี</span>} value={passed.length}
                styles={{ content: { color: '#6ee7b7' } }} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <Statistic title={<span style={{ color: '#94a3b8' }}>ไม่ผ่าน / รอแก้ไข</span>} value={rejected.length}
                styles={{ content: { color: '#ef4444' } }} prefix={<CloseCircleOutlined />} />
            </Card>
          </Col>
        </Row>

        {pending.length > 0 && (
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message={`มีใบรับสินค้า ${pending.length} รายการรอกรรมการตรวจ — ระบุผ่าน/ไม่ผ่านได้รายบรรทัด`} />
        )}

        <Card title={<span style={{ color: '#fbbf24' }}>รอตรวจรับ ({pending.length})</span>}
          style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
          styles={{ header: { borderBottom: '1px solid #334155' } }}>
          <Table dataSource={pending} columns={columns(true)} rowKey="id" size="small"
            expandable={{ expandedRowRender: (r) => <ItemSummary items={r.items} /> }}
            pagination={false} scroll={{ x: 1200 }} />
        </Card>

        <Card title={<span style={{ color: '#6ee7b7' }}>ตรวจผ่านแล้ว ({passed.length})</span>}
          style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
          styles={{ header: { borderBottom: '1px solid #334155' } }}>
          <Table dataSource={passed} columns={columns(false)} rowKey="id" size="small"
            expandable={{ expandedRowRender: (r) => <ItemSummary items={r.items} /> }}
            pagination={{ pageSize: 5 }} scroll={{ x: 1200 }} />
        </Card>

        <Card title={<span style={{ color: '#ef4444' }}>ไม่ผ่าน / รอแก้ไข ({rejected.length})</span>}
          style={{ background: '#1e293b', border: '1px solid #334155' }}
          styles={{ header: { borderBottom: '1px solid #334155' } }}>
          <Table dataSource={rejected} columns={columns(false)} rowKey="id" size="small"
            expandable={{ expandedRowRender: (r) => <ItemSummary items={r.items} /> }}
            pagination={false} scroll={{ x: 1200 }} />
        </Card>
      </div>

      <Modal
        title={<span><AuditOutlined style={{ color: '#22d3ee', marginRight: 8 }} />บันทึกผลตรวจรับรายบรรทัด — {activeId}</span>}
        open={!!activeId}
        onCancel={() => { setActiveId(null); form.resetFields(); setItemDrafts({}) }}
        onOk={handleSave}
        okText="บันทึกผลตรวจรับ"
        width={960}
      >
        {active && (
          <div style={{ marginTop: 8 }}>
            <Descriptions size="small" column={2} bordered
              labelStyle={{ background: '#0f172a', color: '#94a3b8', width: 130 }}
              contentStyle={{ background: '#1e293b', color: '#e2e8f0' }}>
              <Descriptions.Item label="ผู้จำหน่าย" span={2}>{active.supplier}</Descriptions.Item>
              <Descriptions.Item label="อ้างอิง PO">{active.poId}</Descriptions.Item>
              <Descriptions.Item label="Invoice">{active.invoiceNo}</Descriptions.Item>
              <Descriptions.Item label="วันที่รับของ">{active.receivedDate}</Descriptions.Item>
              <Descriptions.Item label="ครบกำหนดชำระ">
                <Text style={{ color: '#60a5fa' }}>{active.dueDate}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>(เครดิต {active.creditDays} วัน)</Text>
              </Descriptions.Item>
              <Descriptions.Item label="มูลค่ารวม" span={2}>
                <Text style={{ color: '#a78bfa', fontWeight: 700 }}>฿{active.totalAmount.toLocaleString()}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: '#334155' }}>
              <FaUsers style={{ marginRight: 6 }} />ตรวจรับรายบรรทัด — กรรมการระบุผ่าน/ไม่ผ่านแต่ละรายการ
            </Divider>

            <Table size="small" pagination={false} rowKey="key" dataSource={active.items}
              columns={itemColumns}
              rowClassName={(r) => {
                const s = itemDrafts[r.key]?.status
                if (s === 'rejected') return 'inspection-row-rejected'
                if (s === 'reworking') return 'inspection-row-reworking'
                return ''
              }}
            />

            <div style={{
              marginTop: 12, padding: '10px 14px', background: '#0f172a', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: `1px solid ${overallTagColor}`,
            }}>
              <Text style={{ color: '#94a3b8' }}>สถานะรวม (คำนวณอัตโนมัติจากรายบรรทัด)</Text>
              <Tag color={overallLabel.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                {overall === 'passed' && <CheckCircleOutlined />}
                {overall === 'rejected' && <CloseCircleOutlined />}
                {overall === 'reworking' && <ToolOutlined />}
                {overall === 'pending' && <ClockCircleOutlined />}
                {' '}{overallLabel.label}
              </Tag>
            </div>

            <Divider style={{ borderColor: '#334155' }}>ข้อมูลกรรมการและสรุปภาพรวม</Divider>

            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col span={10}>
                  <Form.Item label="วันที่ตรวจรับ" name="inspectionDate" rules={[{ required: true }]}>
                    <Input type="date" />
                  </Form.Item>
                </Col>
                <Col span={14}>
                  <Form.Item label="หัวหน้าคลัง (ผู้บันทึก)" name="inspectionBy" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="กรรมการตรวจรับ" name="committee"
                rules={[{ required: true, message: 'เลือกกรรมการอย่างน้อย 1 ท่าน' }]}>
                <Select mode="multiple" options={COMMITTEE_OPTIONS} placeholder="เลือกกรรมการตรวจรับ" />
              </Form.Item>
              <Form.Item label="หมายเหตุภาพรวม / สรุปผลตรวจ" name="inspectionRemark"
                rules={[{ required: true, message: 'กรุณาระบุสรุปผลตรวจ' }]}>
                <TextArea rows={2} placeholder="สรุปภาพรวม เช่น 'ผ่าน 2/3 รายการ — รายการ A ส่งคืน 2 ชิ้นชำรุด'" />
              </Form.Item>
            </Form>

            <Alert type={overall === 'passed' ? 'success' : overall === 'rejected' ? 'error' : 'warning'}
              showIcon
              message={
                overall === 'passed' ? 'สถานะรวม “ตรวจผ่าน” → แจ้งบัญชี/การเงินจ่ายภายใน KPI'
                : overall === 'rejected' ? 'สถานะรวม “ไม่ผ่าน” → ระงับการจ่าย แจ้งผู้ขายเปลี่ยนของ'
                : overall === 'reworking' ? 'สถานะรวม “รอแก้ไข” → ผู้ขายแก้ไข/ส่งใหม่ก่อนจ่าย'
                : 'ยังไม่ได้ระบุผลตรวจครบทุกรายการ'
              } />
          </div>
        )}
      </Modal>

      <style jsx global>{`
        .inspection-row-rejected > td {
          background: rgba(239, 68, 68, 0.08) !important;
        }
        .inspection-row-reworking > td {
          background: rgba(251, 191, 36, 0.08) !important;
        }
      `}</style>
    </div>
  )
}

// แสดงผลตรวจรายบรรทัดในแถวขยาย
const ItemSummary: React.FC<{ items: ReceiptItem[] }> = ({ items }) => (
  <div style={{ background: '#0f172a', padding: 10, borderRadius: 6 }}>
    <Table size="small" pagination={false} rowKey="key" dataSource={items}
      columns={[
        { title: 'รายการ', dataIndex: 'name', key: 'n' },
        { title: 'จำนวนรับ', key: 'qty', width: 110, align: 'center' as const,
          render: (_: unknown, r: ReceiptItem) => <Text>{r.qty} {r.unit}</Text> },
        { title: 'ผ่าน', key: 'pass', width: 80, align: 'center' as const,
          render: (_: unknown, r: ReceiptItem) =>
            r.qtyPassed != null ? <Text style={{ color: '#6ee7b7', fontWeight: 600 }}>{r.qtyPassed}</Text>
            : <Text style={{ color: '#475569' }}>-</Text> },
        { title: 'ไม่ผ่าน', key: 'def', width: 80, align: 'center' as const,
          render: (_: unknown, r: ReceiptItem) =>
            r.qtyDefect ? <Text style={{ color: '#ef4444', fontWeight: 600 }}>{r.qtyDefect}</Text>
            : <Text style={{ color: '#475569' }}>-</Text> },
        { title: 'ผลตรวจ', key: 's', width: 110, align: 'center' as const,
          render: (_: unknown, r: ReceiptItem) => r.inspectStatus
            ? <Tag color={STATUS_LABEL.inspection[r.inspectStatus].color}>{STATUS_LABEL.inspection[r.inspectStatus].label}</Tag>
            : <Tag>รอตรวจ</Tag> },
        { title: 'หมายเหตุ', dataIndex: 'inspectNote', key: 'note',
          render: (v?: string) => v
            ? <Text style={{ fontSize: 11, color: '#cbd5e1' }}>{v}</Text>
            : <Text style={{ color: '#475569' }}>-</Text> },
      ]} />
  </div>
)

export default function InspectionPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#22d3ee', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
