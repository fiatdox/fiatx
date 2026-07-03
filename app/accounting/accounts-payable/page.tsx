'use client'
import React, { useState, useMemo } from 'react'
import {
  Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, Select, Divider, Row, Col, Alert, Descriptions, DatePicker, Space, message,
  Statistic, Progress, Tabs, Steps
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, DollarCircleOutlined, FieldTimeOutlined,
  WarningOutlined, CheckCircleOutlined, CalendarOutlined, ReloadOutlined,
  InboxOutlined, AuditOutlined
} from '@ant-design/icons'
import { FaMoneyCheckAlt, FaFileInvoiceDollar } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import { MOCK_RECEIPTS, ReceiptRecord, PaymentStatus, STATUS_LABEL, TODAY } from '../../general/procurement/_data'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

const { Title, Text } = Typography
const { TextArea } = Input

type KPILevel = 'safe' | 'warn' | 'danger' | 'overdue'
const kpiLevel = (dueDate: string): KPILevel => {
  const days = dayjs(dueDate).diff(dayjs(TODAY), 'day')
  if (days < 0) return 'overdue'
  if (days <= 3) return 'danger'
  if (days <= 7) return 'warn'
  return 'safe'
}
const kpiColor: Record<KPILevel, string> = {
  safe: '#6ee7b7', warn: '#fbbf24', danger: '#fb923c', overdue: '#ef4444',
}
const kpiLabel: Record<KPILevel, string> = {
  safe: 'ปกติ', warn: 'ใกล้ครบกำหนด', danger: 'ใกล้เกินกำหนด', overdue: 'เกินกำหนด',
}

const stepInfo = (r: ReceiptRecord): { current: number; status: 'wait' | 'process' | 'finish' | 'error' } => {
  if (r.paymentStatus === 'paid') return { current: 3, status: 'finish' }
  if (r.paymentStatus === 'overdue' || kpiLevel(r.dueDate) === 'overdue') {
    return { current: 2, status: 'error' }
  }
  if (r.paymentStatus === 'scheduled') return { current: 2, status: 'process' }
  if (r.inspectionStatus === 'passed') return { current: 2, status: 'process' }
  if (r.inspectionStatus === 'rejected' || r.inspectionStatus === 'reworking') {
    return { current: 1, status: 'error' }
  }
  return { current: 1, status: 'process' }
}

type DateField = 'dueDate' | 'receivedDate' | 'invoiceDate'
const DATE_FIELD_LABEL: Record<DateField, string> = {
  dueDate: 'ครบกำหนดชำระ',
  receivedDate: 'วันที่รับของ',
  invoiceDate: 'วันที่ Invoice',
}

const PageContent = () => {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(MOCK_RECEIPTS)
  const [payId, setPayId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [dateField, setDateField] = useState<DateField>('dueDate')
  const [form] = Form.useForm()

  const active = receipts.find(r => r.id === payId)

  const inRange = (date?: string) => {
    if (!dateRange) return true
    if (!date) return false
    const ts = dayjs(date).valueOf()
    return ts >= dateRange[0].startOf('day').valueOf() && ts <= dateRange[1].endOf('day').valueOf()
  }

  // เฉพาะรายการที่ตรวจรับผ่านแล้ว = พร้อมจ่าย + กรองตามช่วงวันที่ที่เลือก
  const payable = useMemo(() => receipts.filter(r =>
    r.inspectionStatus === 'passed' && inRange(r[dateField])
  ), [receipts, dateRange, dateField])
  const totalPayable = useMemo(() => receipts.filter(r => r.inspectionStatus === 'passed').length, [receipts])

  const summary = useMemo(() => {
    const unpaid = payable.filter(r => r.paymentStatus === 'unpaid' || r.paymentStatus === 'overdue')
    const overdue = payable.filter(r => r.paymentStatus !== 'paid' && kpiLevel(r.dueDate) === 'overdue')
    const danger = payable.filter(r => r.paymentStatus !== 'paid' && kpiLevel(r.dueDate) === 'danger')
    const totalUnpaid = unpaid.reduce((s, r) => s + r.totalAmount, 0)
    const paid = payable.filter(r => r.paymentStatus === 'paid').reduce((s, r) => s + r.totalAmount, 0)
    return { unpaid, overdue, danger, totalUnpaid, paid }
  }, [payable])

  const openPay = (id: string) => {
    const r = receipts.find(x => x.id === id)
    if (!r) return
    setPayId(id)
    form.setFieldsValue({
      paymentDate: TODAY,
      paymentRef: `PAY-${dayjs(TODAY).format('YYMM')}-${(receipts.length + 100).toString().slice(-3)}`,
      paymentStatus: 'paid',
    })
  }

  const handlePay = () => {
    if (!payId) return
    form.validateFields().then(values => {
      setReceipts(prev => prev.map(r => r.id === payId ? {
        ...r,
        paymentStatus: values.paymentStatus as PaymentStatus,
        paymentDate: values.paymentStatus === 'paid' ? values.paymentDate : undefined,
        paymentRef: values.paymentStatus === 'paid' ? values.paymentRef : undefined,
      } : r))
      message.success(`อัปเดตการจ่าย ${payId} เรียบร้อย`)
      setPayId(null)
      form.resetFields()
    }).catch(() => {})
  }

  const cols = [
    { title: 'เลขที่ใบรับ', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => <Text style={{ color: '#22d3ee', fontWeight: 600 }}>{v}</Text> },
    { title: 'Invoice', dataIndex: 'invoiceNo', key: 'inv', width: 150,
      render: (v: string) => <Text style={{ color: '#fbbf24' }}>{v}</Text> },
    { title: 'ผู้จำหน่าย', dataIndex: 'supplier', key: 'sup' },
    { title: 'วันที่รับ', dataIndex: 'receivedDate', key: 'rd', width: 105,
      render: (v: string) => <Text style={{ color: 'var(--app-text-2)' }}>{v}</Text> },
    { title: 'ครบกำหนด', dataIndex: 'dueDate', key: 'dd', width: 110,
      render: (v: string) => <Text style={{ color: '#60a5fa' }}>{v}</Text> },
    { title: 'KPI (วันคงเหลือ)', key: 'kpi', width: 180,
      render: (_: any, r: ReceiptRecord) => {
        const days = dayjs(r.dueDate).diff(dayjs(TODAY), 'day')
        const lv = kpiLevel(r.dueDate)
        const text = days < 0 ? `เกิน ${Math.abs(days)} วัน` : `เหลือ ${days} วัน`
        return (
          <div style={{ minWidth: 150 }}>
            <Tag color={r.paymentStatus === 'paid' ? 'success'
              : lv === 'overdue' ? 'error' : lv === 'danger' ? 'orange' : lv === 'warn' ? 'warning' : 'success'}>
              {r.paymentStatus === 'paid' ? 'จ่ายแล้ว' : kpiLabel[lv]}
            </Tag>
            <Text style={{ color: kpiColor[lv], fontSize: 12, marginLeft: 6 }}>{text}</Text>
          </div>
        )
      }},
    { title: 'มูลค่า', dataIndex: 'totalAmount', key: 'amt', width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
    { title: 'สถานะ', key: 'st', width: 280,
      render: (_: any, r: ReceiptRecord) => {
        const info = stepInfo(r)
        return (
          <div style={{ minWidth: 260 }}>
            <Steps
              size="small"
              progressDot
              current={info.current}
              status={info.status}
              items={[
                { title: <span style={{ fontSize: 11 }}>รับ</span> },
                { title: <span style={{ fontSize: 11 }}>ตรวจ</span> },
                { title: <span style={{ fontSize: 11 }}>{r.paymentStatus === 'scheduled' ? 'นัดจ่าย' : 'รอจ่าย'}</span> },
                { title: <span style={{ fontSize: 11 }}>จ่าย</span> },
              ]}
            />
            <div style={{ marginTop: 4, textAlign: 'center' }}>
              <Tag color={STATUS_LABEL.payment[r.paymentStatus].color} style={{ fontSize: 11, marginInlineEnd: 0 }}>
                {STATUS_LABEL.payment[r.paymentStatus].label}
              </Tag>
            </div>
          </div>
        )
      }
    },
    { title: '', key: 'act', width: 130,
      render: (_: any, r: ReceiptRecord) => (
        r.paymentStatus !== 'paid'
          ? <Button type="primary" size="small" icon={<DollarCircleOutlined />} onClick={() => openPay(r.id)}>
              บันทึกการจ่าย
            </Button>
          : <Button size="small" onClick={() => openPay(r.id)}>ดูรายละเอียด</Button>
      )
    },
  ]

  const dueSoon = payable
    .filter(r => r.paymentStatus !== 'paid')
    .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)))

  const paidList = payable.filter(r => r.paymentStatus === 'paid')

  const kpiOnTimePct = paidList.length === 0 ? 100 : Math.round(
    paidList.filter(r => r.paymentDate && dayjs(r.paymentDate).diff(dayjs(r.dueDate), 'day') <= 0).length
    / paidList.length * 100
  )

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/accounting', title: <><FileTextOutlined /> งานการเงินและบัญชี</> },
          { title: 'เจ้าหนี้การค้า / กำหนดจ่าย' },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <FaMoneyCheckAlt style={{ fontSize: 24, color: '#10b981' }} />
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>เจ้าหนี้การค้า — กำหนดจ่าย (KPI)</Title>
        </div>

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', marginBottom: 16 }}
          styles={{ body: { padding: 12 } }}>
          <Space wrap size={12} align="center">
            <Text style={{ color: 'var(--app-text-2)' }}><CalendarOutlined /> ค้นหาช่วงวันที่</Text>
            <Select
              size="middle"
              value={dateField}
              onChange={setDateField}
              style={{ width: 180 }}
              options={(Object.keys(DATE_FIELD_LABEL) as DateField[]).map(k => ({ label: DATE_FIELD_LABEL[k], value: k }))}
            />
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
                { label: 'เดือนนี้', value: [dayjs(TODAY).startOf('month'), dayjs(TODAY).endOf('month')] },
                { label: 'เดือนหน้า', value: [dayjs(TODAY).add(1, 'month').startOf('month'), dayjs(TODAY).add(1, 'month').endOf('month')] },
                { label: 'เกินกำหนดทั้งหมด', value: [dayjs(TODAY).subtract(1, 'year'), dayjs(TODAY).subtract(1, 'day')] },
              ]}
            />
            {dateRange && (
              <>
                <Text style={{ color: '#fbbf24', fontSize: 12 }}>
                  พบ {payable.length}/{totalPayable} รายการ
                </Text>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => setDateRange(null)}>ล้างตัวกรอง</Button>
              </>
            )}
          </Space>
        </Card>

        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
              <Statistic title={<span style={{ color: 'var(--app-text-2)' }}>ยอดรอจ่ายทั้งหมด</span>}
                value={summary.totalUnpaid} precision={0} prefix="฿"
                styles={{ content: { color: '#a78bfa' } }}
                formatter={v => Number(v).toLocaleString()} />
              <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>{summary.unpaid.length} รายการ</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
              <Statistic title={<span style={{ color: 'var(--app-text-2)' }}>เกินกำหนด</span>}
                value={summary.overdue.length}
                styles={{ content: { color: '#ef4444' } }} prefix={<WarningOutlined />} />
              <Text style={{ color: '#ef4444', fontSize: 12 }}>
                ฿{summary.overdue.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()}
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
              <Statistic title={<span style={{ color: 'var(--app-text-2)' }}>ใกล้ครบกำหนด (≤3 วัน)</span>}
                value={summary.danger.length}
                styles={{ content: { color: '#fb923c' } }} prefix={<FieldTimeOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
              <Text style={{ color: 'var(--app-text-2)', fontSize: 13 }}>KPI จ่ายตรงเวลา</Text>
              <Progress percent={kpiOnTimePct} strokeColor={kpiOnTimePct >= 90 ? '#10b981' : kpiOnTimePct >= 70 ? '#fbbf24' : '#ef4444'}
                railColor="var(--app-border-strong)" />
              <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>จ่ายแล้ว {paidList.length} รายการ • ฿{summary.paid.toLocaleString()}</Text>
            </Card>
          </Col>
        </Row>

        {summary.overdue.length > 0 && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }}
            message={`มีเจ้าหนี้เกินกำหนดชำระ ${summary.overdue.length} รายการ — กระทบ KPI การจ่ายตรงเวลา`}
            description="โปรดดำเนินการจ่ายโดยด่วน หรือบันทึกเหตุผลที่จ่ายช้า" />
        )}

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}
          styles={{ body: { padding: 0 } }}>
          <Tabs defaultActiveKey="due" style={{ padding: '0 16px' }}
            items={[
              {
                key: 'due',
                label: <span><FieldTimeOutlined /> เรียงตามใกล้ครบกำหนด ({dueSoon.length})</span>,
                children: <Table dataSource={dueSoon} columns={cols} rowKey="id" size="small"
                  pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} />
              },
              {
                key: 'paid',
                label: <span><CheckCircleOutlined /> จ่ายแล้ว ({paidList.length})</span>,
                children: <Table dataSource={paidList} columns={cols} rowKey="id" size="small"
                  pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} />
              },
              {
                key: 'all',
                label: <span><CalendarOutlined /> ทั้งหมด ({payable.length})</span>,
                children: <Table dataSource={payable} columns={cols} rowKey="id" size="small"
                  pagination={{ pageSize: 8 }} scroll={{ x: 1380 }} />
              },
            ]} />
        </Card>
      </div>

      <Modal
        title={<span><FaFileInvoiceDollar style={{ color: '#10b981', marginRight: 8 }} />บันทึกการจ่าย — {payId}</span>}
        open={!!payId}
        onCancel={() => { setPayId(null); form.resetFields() }}
        onOk={handlePay}
        okText="บันทึก"
        width={680}
      >
        {active && (
          <div style={{ marginTop: 8 }}>
            <Card style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)', marginBottom: 16 }}
              styles={{ body: { padding: '16px 12px' } }}>
              <Steps
                size="small"
                current={stepInfo(active).current}
                status={stepInfo(active).status}
                items={[
                  {
                    title: 'รับของ',
                    description: active.receivedDate,
                    icon: <InboxOutlined />,
                  },
                  {
                    title: active.inspectionStatus === 'rejected' ? 'ตรวจรับไม่ผ่าน'
                      : active.inspectionStatus === 'reworking' ? 'ส่งกลับแก้ไข'
                      : 'ตรวจรับผ่าน',
                    description: active.inspectionDate
                      ? `${active.inspectionDate}${active.inspectionBy ? ' • ' + active.inspectionBy : ''}`
                      : '-',
                    icon: <AuditOutlined />,
                  },
                  {
                    title: active.paymentStatus === 'scheduled' ? 'นัดจ่าย'
                      : active.paymentStatus === 'overdue' ? 'เกินกำหนด'
                      : 'รอจ่าย',
                    description: `ครบกำหนด ${active.dueDate}`,
                    icon: <FieldTimeOutlined />,
                  },
                  {
                    title: 'จ่ายแล้ว',
                    description: active.paymentDate
                      ? `${active.paymentDate}${active.paymentRef ? ' • ' + active.paymentRef : ''}`
                      : '-',
                    icon: <DollarCircleOutlined />,
                  },
                ]}
              />
            </Card>

            <Descriptions size="small" column={2} bordered
              labelStyle={{ background: 'var(--app-bg)', color: 'var(--app-text-2)', width: 130 }}
              contentStyle={{ background: 'var(--app-surface)', color: 'var(--app-text)' }}>
              <Descriptions.Item label="ผู้จำหน่าย" span={2}>{active.supplier}</Descriptions.Item>
              <Descriptions.Item label="เลขผู้เสียภาษี">{active.supplierTaxId}</Descriptions.Item>
              <Descriptions.Item label="Invoice">{active.invoiceNo}</Descriptions.Item>
              <Descriptions.Item label="วันที่ Invoice">{active.invoiceDate}</Descriptions.Item>
              <Descriptions.Item label="ครบกำหนด">
                <Text style={{ color: '#60a5fa' }}>{active.dueDate}</Text>
                <Text style={{ color: 'var(--app-text-2)', fontSize: 11, marginLeft: 6 }}>(เครดิต {active.creditDays} วัน)</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ตรวจรับโดย" span={2}>
                {active.inspectionBy} • {active.inspectionDate}
              </Descriptions.Item>
              <Descriptions.Item label="ผลตรวจรับ" span={2}>
                <Text style={{ color: '#6ee7b7' }}>{active.inspectionRemark}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ยอดเจ้าหนี้" span={2}>
                <Text style={{ color: '#a78bfa', fontWeight: 700, fontSize: 16 }}>
                  ฿{active.totalAmount.toLocaleString()}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: 'var(--app-border-strong)' }}>บันทึกการจ่ายโดยการเงิน</Divider>

            <Form form={form} layout="vertical">
              <Form.Item label="สถานะการจ่าย" name="paymentStatus" rules={[{ required: true }]}>
                <Select options={[
                  { label: 'นัดจ่าย (อยู่ในรอบจ่าย)', value: 'scheduled' },
                  { label: 'จ่ายแล้ว', value: 'paid' },
                  { label: 'ยังไม่จ่าย', value: 'unpaid' },
                ]} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="วันที่จ่าย" name="paymentDate">
                    <Input type="date" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="เลขที่อ้างอิง / เช็ค" name="paymentRef">
                    <Input placeholder="เช่น PAY-2605-001 / เช็ค #..." />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="หมายเหตุ" name="payRemark">
                <TextArea rows={2} placeholder="เช่น โอนเข้าบัญชี กสิกรไทย / รอใบเสร็จเพิ่มเติม..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function AccountsPayablePage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      <PageContent />
    </AppThemeProvider>
  )
}
