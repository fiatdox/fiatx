'use client'
import React, { useState, useMemo } from 'react'
import {
  Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, Select, Divider, Row, Col, Alert, Descriptions, DatePicker, Space, message,
  Statistic, Progress, Tabs, Steps
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, DollarCircleOutlined, FieldTimeOutlined,
  CheckCircleOutlined, CalendarOutlined, ReloadOutlined,
  InboxOutlined, AuditOutlined, FundOutlined,
  PieChartOutlined, BarChartOutlined, ClusterOutlined, ApartmentOutlined, DotChartOutlined,
} from '@ant-design/icons'
import { FaMoneyCheckAlt, FaFileInvoiceDollar } from 'react-icons/fa'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import EChart from '@/app/components/EChart'
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

// ───────── หมวดพัสดุ (จัดหมวดจากผู้จำหน่าย + รายการสินค้า) — ใช้ในแท็บ Dashboard ─────────
type Category = 'pharma' | 'medical' | 'lab' | 'equipment' | 'it' | 'office' | 'other'
const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  pharma:    { label: 'ยา / เวชภัณฑ์',    color: '#22c55e' },
  medical:   { label: 'วัสดุการแพทย์',    color: '#06b6d4' },
  lab:       { label: 'ห้องปฏิบัติการ',   color: '#a78bfa' },
  equipment: { label: 'ครุภัณฑ์การแพทย์', color: '#f97316' },
  it:        { label: 'อุปกรณ์ IT',        color: '#3b82f6' },
  office:    { label: 'วัสดุสำนักงาน',    color: '#fbbf24' },
  other:     { label: 'อื่นๆ',             color: '#94a3b8' },
}
const categorize = (r: ReceiptRecord): Category => {
  const text = (r.supplier + ' ' + r.items.map(i => i.name).join(' ')).toLowerCase()
  if (/pharma|ยา|paracetamol|amoxicillin|nss|d5w|ceftriaxone|inj/.test(text)) return 'pharma'
  if (/lab|reagent|น้ำยา|microtube|pipette|glove|cbc|hba1c/.test(text)) return 'lab'
  if (/hp |toner|drum|fuser|laserjet|printer|ปริ้น|หมึก/.test(text)) return 'it'
  if (/office|กระดาษ|ปากกา|ลวดเย็บ|แฟ้ม|a4/.test(text)) return 'office'
  if (/เตียง|รถเข็น|วีลแชร์|เสาน้ำเกลือ|ครุภัณฑ์/.test(text)) return 'equipment'
  if (/medtech|electrode|ecg|lead wire|stethoscope|วัสดุการแพทย์/.test(text)) return 'medical'
  return 'other'
}

// ───────── ประเภทเงินงบประมาณ (มาจากหมวดพัสดุ + มูลค่า) ─────────
type BudgetType = 'operating' | 'capital' | 'maintenance' | 'subsidy' | 'other'
const BUDGET_META: Record<BudgetType, { label: string; color: string }> = {
  operating:   { label: 'งบดำเนินงาน',    color: '#22d3ee' },
  capital:     { label: 'งบลงทุน',        color: '#f97316' },
  maintenance: { label: 'เงินบำรุง',      color: '#10b981' },
  subsidy:     { label: 'งบอุดหนุน / UC', color: '#a78bfa' },
  other:       { label: 'งบอื่นๆ',        color: '#94a3b8' },
}
const budgetTypeOf = (r: ReceiptRecord): BudgetType => {
  const c = categorize(r)
  if (c === 'equipment') return 'capital'
  if (c === 'it' && r.totalAmount >= 50000) return 'capital'
  if (c === 'pharma') return 'subsidy'
  if (c === 'medical' || c === 'lab') return 'operating'
  if (c === 'office' || c === 'it') return 'maintenance'
  return 'other'
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

  // ─── ข้อมูลกราฟแท็บ Dashboard (คำนวณจาก payable — เคารพตัวกรองช่วงวันที่ด้านบน) ───
  const byCategory = useMemo(() => {
    const map = new Map<Category, { paid: number; unpaid: number; count: number }>()
    payable.forEach(r => {
      const c = categorize(r)
      const cur = map.get(c) || { paid: 0, unpaid: 0, count: 0 }
      if (r.paymentStatus === 'paid') cur.paid += r.totalAmount
      else cur.unpaid += r.totalAmount
      cur.count++
      map.set(c, cur)
    })
    return Array.from(map.entries())
      .map(([cat, v]) => ({ cat, ...v, total: v.paid + v.unpaid }))
      .sort((a, b) => b.total - a.total)
  }, [payable])

  const topSuppliers = useMemo(() => {
    const map = new Map<string, { paid: number; unpaid: number; count: number }>()
    payable.forEach(r => {
      const cur = map.get(r.supplier) || { paid: 0, unpaid: 0, count: 0 }
      if (r.paymentStatus === 'paid') cur.paid += r.totalAmount
      else cur.unpaid += r.totalAmount
      cur.count++
      map.set(r.supplier, cur)
    })
    return Array.from(map.entries())
      .map(([s, v]) => ({ supplier: s, ...v, total: v.paid + v.unpaid }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [payable])

  // Sunburst: งบประมาณ → หมวดพัสดุ → ผู้จำหน่าย (3 ชั้น)
  const sunburstData = useMemo(() => {
    const budgets = new Map<BudgetType, Map<Category, Map<string, number>>>()
    payable.forEach(r => {
      const b = budgetTypeOf(r), c = categorize(r)
      if (!budgets.has(b)) budgets.set(b, new Map())
      const cats = budgets.get(b)!
      if (!cats.has(c)) cats.set(c, new Map())
      const sups = cats.get(c)!
      sups.set(r.supplier, (sups.get(r.supplier) ?? 0) + r.totalAmount)
    })
    return Array.from(budgets.entries()).map(([b, cats]) => ({
      name: BUDGET_META[b].label,
      itemStyle: { color: BUDGET_META[b].color },
      children: Array.from(cats.entries()).map(([c, sups]) => ({
        name: CATEGORY_META[c].label,
        itemStyle: { color: CATEGORY_META[c].color },
        children: Array.from(sups.entries()).map(([supplier, value]) => ({
          name: supplier.length > 22 ? supplier.slice(0, 22) + '…' : supplier,
          value,
        })),
      })),
    }))
  }, [payable])

  // Sankey: งบประมาณ → หมวดพัสดุ → สถานะการจ่าย (กระแสเงิน)
  const sankeyData = useMemo(() => {
    const l1 = new Map<string, number>() // budget|category
    const l2 = new Map<string, number>() // category|status
    payable.forEach(r => {
      const b = BUDGET_META[budgetTypeOf(r)].label
      const c = CATEGORY_META[categorize(r)].label
      const status = r.paymentStatus === 'paid' ? 'จ่ายแล้ว' : 'ค้างจ่าย'
      l1.set(`${b}|${c}`, (l1.get(`${b}|${c}`) ?? 0) + r.totalAmount)
      l2.set(`${c}|${status}`, (l2.get(`${c}|${status}`) ?? 0) + r.totalAmount)
    })
    const nodeNames = new Set<string>(['จ่ายแล้ว', 'ค้างจ่าย'])
    Object.values(BUDGET_META).forEach(m => nodeNames.add(m.label))
    Object.values(CATEGORY_META).forEach(m => nodeNames.add(m.label))
    const nodes = Array.from(nodeNames).map(name => ({
      name,
      itemStyle: { color: name === 'จ่ายแล้ว' ? '#10b981' : name === 'ค้างจ่าย' ? '#ef4444' : '#64748b' },
    }))
    const links = [
      ...Array.from(l1.entries()).map(([k, value]) => { const [source, target] = k.split('|'); return { source, target, value } }),
      ...Array.from(l2.entries()).map(([k, value]) => { const [source, target] = k.split('|'); return { source, target, value } }),
    ]
    return { nodes, links }
  }, [payable])

  // Nested pie: วงใน = หมวดพัสดุ (รวม), วงนอก = แยกจ่ายแล้ว/ค้างจ่ายในแต่ละหมวด
  const nestedPieData = useMemo(() => {
    const inner = byCategory.map(c => ({
      name: CATEGORY_META[c.cat].label, value: c.total,
      itemStyle: { color: CATEGORY_META[c.cat].color },
    }))
    const outer = byCategory.flatMap(c => [
      { name: `${CATEGORY_META[c.cat].label} • จ่ายแล้ว`, value: c.paid,
        itemStyle: { color: CATEGORY_META[c.cat].color } },
      { name: `${CATEGORY_META[c.cat].label} • ค้าง`, value: c.unpaid,
        itemStyle: { color: CATEGORY_META[c.cat].color + '55' } },
    ]).filter(d => d.value > 0)
    return { inner, outer }
  }, [byCategory])

  const paymentPie = useMemo(() => ([
    { name: 'จ่ายแล้ว', value: payable.filter(r => r.paymentStatus === 'paid').length, itemStyle: { color: '#10b981' } },
    { name: 'นัดจ่าย', value: payable.filter(r => r.paymentStatus === 'scheduled').length, itemStyle: { color: '#60a5fa' } },
    { name: 'รอจ่าย', value: payable.filter(r => r.paymentStatus === 'unpaid').length, itemStyle: { color: '#fbbf24' } },
    { name: 'เกินกำหนด', value: payable.filter(r => r.paymentStatus === 'overdue').length, itemStyle: { color: '#ef4444' } },
  ].filter(d => d.value > 0)), [payable])

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

        {summary.overdue.length > 0 && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }}
            title={`มีเจ้าหนี้เกินกำหนดชำระ ${summary.overdue.length} รายการ — กระทบ KPI การจ่ายตรงเวลา`}
            description="โปรดดำเนินการจ่ายโดยด่วน หรือบันทึกเหตุผลที่จ่ายช้า" />
        )}

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}
          styles={{ body: { padding: 0 } }}>
          <Tabs defaultActiveKey="due" style={{ padding: '0 16px' }}
            items={[
              {
                key: 'dashboard',
                label: <span><FundOutlined /> Dashboard</span>,
                children: (
                  <div style={{ padding: '16px 0' }}>
                    <Row gutter={12} style={{ marginBottom: 16 }}>
                      <Col span={12}>
                        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
                          <Statistic title={<span style={{ color: 'var(--app-text-2)' }}>ใกล้ครบกำหนด (≤3 วัน)</span>}
                            value={summary.danger.length}
                            styles={{ content: { color: '#fb923c' } }} prefix={<FieldTimeOutlined />} />
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
                          <Text style={{ color: 'var(--app-text-2)', fontSize: 13 }}>KPI จ่ายตรงเวลา</Text>
                          <Progress percent={kpiOnTimePct} strokeColor={kpiOnTimePct >= 90 ? '#10b981' : kpiOnTimePct >= 70 ? '#fbbf24' : '#ef4444'}
                            railColor="var(--app-border-strong)" />
                          <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>จ่ายแล้ว {paidList.length} รายการ • ฿{summary.paid.toLocaleString()}</Text>
                        </Card>
                      </Col>
                    </Row>

                    {payable.length === 0 ? (
                      <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', textAlign: 'center', padding: 24 }}>
                        <Text style={{ color: 'var(--app-text-2)' }}>ไม่มีข้อมูลในช่วงที่เลือก</Text>
                      </Card>
                    ) : (
                      <>
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                          {/* Pie: สัดส่วนตามสถานะการจ่าย */}
                          <Col span={8}>
                            <Card size="small"
                              title={<span style={{ color: '#22d3ee' }}><PieChartOutlined /> สัดส่วนตามสถานะการจ่าย</span>}
                              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', height: '100%' }}
                              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
                              <EChart height={260} option={{
                                backgroundColor: 'transparent',
                                tooltip: {
                                  trigger: 'item',
                                  backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                                  textStyle: { color: 'var(--app-text)' },
                                  formatter: (p: { name: string; value: number; percent: number }) =>
                                    `${p.name}<br/>${p.value} รายการ (${p.percent}%)`,
                                },
                                legend: { bottom: 0, textStyle: { color: 'var(--app-text-2)', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
                                series: [{
                                  type: 'pie', radius: ['40%', '68%'], center: ['50%', '44%'],
                                  avoidLabelOverlap: true,
                                  itemStyle: { borderColor: 'var(--app-surface)', borderWidth: 2 },
                                  label: { show: true, color: 'var(--app-text-2)', fontSize: 11, formatter: '{b}\n{d}%' },
                                  data: paymentPie,
                                }],
                              }} />
                            </Card>
                          </Col>

                          {/* Bar: Top ผู้จำหน่ายตามมูลค่า */}
                          <Col span={8}>
                            <Card size="small"
                              title={<span style={{ color: '#f97316' }}><BarChartOutlined /> Top ผู้จำหน่าย (มูลค่ารวม)</span>}
                              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', height: '100%' }}
                              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
                              <EChart height={260} option={{
                                backgroundColor: 'transparent',
                                grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
                                tooltip: {
                                  trigger: 'axis', axisPointer: { type: 'shadow' },
                                  backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                                  textStyle: { color: 'var(--app-text)' },
                                  formatter: (params: { dataIndex: number }[]) => {
                                    const s = topSuppliers[params[0].dataIndex]
                                    return `<b>${s.supplier}</b><br/>฿${s.total.toLocaleString()} • ${s.count} ใบ`
                                  },
                                },
                                xAxis: {
                                  type: 'value',
                                  axisLabel: { color: 'var(--app-text-2)', formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v) },
                                  splitLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                                },
                                yAxis: {
                                  type: 'category', inverse: true,
                                  data: topSuppliers.map((s, i) => `#${i + 1} ${s.supplier.length > 14 ? s.supplier.slice(0, 14) + '…' : s.supplier}`),
                                  axisLabel: { color: 'var(--app-text)', fontSize: 11 },
                                  axisLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                                },
                                series: [{
                                  type: 'bar', barWidth: 14,
                                  data: topSuppliers.map(s => ({ value: s.total, itemStyle: { color: '#f97316', borderRadius: [0, 4, 4, 0] } })),
                                  label: { show: true, position: 'right', color: 'var(--app-text-2)', fontSize: 10,
                                    formatter: (p: { value: number }) => '฿' + (p.value / 1000).toFixed(0) + 'k' },
                                }],
                              }} />
                            </Card>
                          </Col>

                          {/* Nested pie: หมวดพัสดุ (วงใน) + จ่ายแล้ว/ค้าง (วงนอก) */}
                          <Col span={8}>
                            <Card size="small"
                              title={<span style={{ color: '#a78bfa' }}><DotChartOutlined /> หมวดพัสดุ × สถานะจ่าย (วงซ้อน)</span>}
                              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', height: '100%' }}
                              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
                              <EChart height={260} option={{
                                backgroundColor: 'transparent',
                                tooltip: {
                                  trigger: 'item',
                                  backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                                  textStyle: { color: 'var(--app-text)' },
                                  formatter: (p: { name: string; value: number }) => `${p.name}<br/>฿${p.value.toLocaleString()}`,
                                },
                                series: [
                                  {
                                    name: 'หมวดพัสดุ', type: 'pie', radius: ['0%', '38%'], center: ['50%', '48%'],
                                    label: { show: false },
                                    itemStyle: { borderColor: 'var(--app-surface)', borderWidth: 2 },
                                    data: nestedPieData.inner,
                                  },
                                  {
                                    name: 'จ่ายแล้ว/ค้าง', type: 'pie', radius: ['48%', '72%'], center: ['50%', '48%'],
                                    label: { show: true, fontSize: 9, color: 'var(--app-text-2)', formatter: '{d}%' },
                                    itemStyle: { borderColor: 'var(--app-surface)', borderWidth: 1 },
                                    data: nestedPieData.outer,
                                  },
                                ],
                              }} />
                              <Text style={{ color: 'var(--app-text-2)', fontSize: 10 }}>วงใน = หมวดพัสดุ • วงนอก เข้ม = จ่ายแล้ว / อ่อน = ค้างจ่าย</Text>
                            </Card>
                          </Col>
                        </Row>

                        <Row gutter={16} style={{ marginBottom: 16 }}>
                          {/* Sunburst: งบประมาณ → หมวดพัสดุ → ผู้จำหน่าย */}
                          <Col span={12}>
                            <Card size="small"
                              title={<span style={{ color: '#10b981' }}><ClusterOutlined /> Sunburst — งบประมาณ → หมวดพัสดุ → ผู้จำหน่าย</span>}
                              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', height: '100%' }}
                              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
                              <EChart height={360} option={{
                                backgroundColor: 'transparent',
                                tooltip: {
                                  backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                                  textStyle: { color: 'var(--app-text)' },
                                  formatter: (p: { name: string; value: number; treePathInfo?: { name: string }[] }) => {
                                    const path = (p.treePathInfo ?? []).map(x => x.name).filter(Boolean).join(' → ')
                                    return `${path}<br/>฿${(p.value ?? 0).toLocaleString()}`
                                  },
                                },
                                series: [{
                                  type: 'sunburst', radius: ['12%', '92%'],
                                  data: sunburstData,
                                  label: { color: '#0f172a', fontSize: 10, minAngle: 8 },
                                  itemStyle: { borderColor: 'var(--app-surface)', borderWidth: 1 },
                                  levels: [
                                    {},
                                    { r0: '12%', r: '38%', label: { fontSize: 11, fontWeight: 700 } },
                                    { r0: '38%', r: '68%', label: { fontSize: 10 } },
                                    { r0: '68%', r: '92%', label: { fontSize: 9, rotate: 'tangential' } },
                                  ],
                                }],
                              }} />
                            </Card>
                          </Col>

                          {/* Sankey: งบประมาณ → หมวดพัสดุ → สถานะการจ่าย */}
                          <Col span={12}>
                            <Card size="small"
                              title={<span style={{ color: '#60a5fa' }}><ApartmentOutlined /> Sankey — กระแสเงิน งบประมาณ → หมวดพัสดุ → สถานะจ่าย</span>}
                              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', height: '100%' }}
                              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
                              <EChart height={360} option={{
                                backgroundColor: 'transparent',
                                tooltip: {
                                  trigger: 'item',
                                  backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                                  textStyle: { color: 'var(--app-text)' },
                                  formatter: (p: { dataType: string; name: string; value?: number; data?: { source: string; target: string; value: number } }) =>
                                    p.dataType === 'edge' && p.data
                                      ? `${p.data.source} → ${p.data.target}<br/>฿${p.data.value.toLocaleString()}`
                                      : `${p.name}`,
                                },
                                series: [{
                                  type: 'sankey',
                                  emphasis: { focus: 'adjacency' },
                                  data: sankeyData.nodes,
                                  links: sankeyData.links,
                                  label: { color: 'var(--app-text)', fontSize: 10 },
                                  lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },
                                  nodeWidth: 14,
                                  nodeGap: 10,
                                }],
                              }} />
                            </Card>
                          </Col>
                        </Row>
                      </>
                    )}

                    <Link href="/accounting/accounts-payable/dashboard">
                      <Button type="primary" icon={<FundOutlined />}>ดู Dashboard ภาพรวมแบบเต็ม</Button>
                    </Link>
                  </div>
                ),
              },
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
                    content: active.receivedDate,
                    icon: <InboxOutlined />,
                  },
                  {
                    title: active.inspectionStatus === 'rejected' ? 'ตรวจรับไม่ผ่าน'
                      : active.inspectionStatus === 'reworking' ? 'ส่งกลับแก้ไข'
                      : 'ตรวจรับผ่าน',
                    content: active.inspectionDate
                      ? `${active.inspectionDate}${active.inspectionBy ? ' • ' + active.inspectionBy : ''}`
                      : '-',
                    icon: <AuditOutlined />,
                  },
                  {
                    title: active.paymentStatus === 'scheduled' ? 'นัดจ่าย'
                      : active.paymentStatus === 'overdue' ? 'เกินกำหนด'
                      : 'รอจ่าย',
                    content: `ครบกำหนด ${active.dueDate}`,
                    icon: <FieldTimeOutlined />,
                  },
                  {
                    title: 'จ่ายแล้ว',
                    content: active.paymentDate
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
