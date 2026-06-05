'use client'
import React, { useMemo } from 'react'
import {
  Typography, Breadcrumb, Card, Tag, Button, Table,
  Row, Col, Alert, Progress, Statistic, Divider
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, DollarCircleOutlined, FieldTimeOutlined,
  WarningOutlined, CheckCircleOutlined, FundOutlined, ArrowRightOutlined,
  ClockCircleOutlined, RiseOutlined, ThunderboltOutlined, BankOutlined,
  PieChartOutlined, BarChartOutlined, AlertOutlined
} from '@ant-design/icons'
import {
  FaMoneyCheckAlt, FaPills, FaStethoscope, FaFlask, FaDesktop, FaPrint,
  FaBed, FaBoxes, FaTrophy, FaChartLine,
  FaCoins, FaWallet, FaPiggyBank, FaHandHoldingUsd
} from 'react-icons/fa'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import EChart from '@/app/components/EChart'
import { MOCK_RECEIPTS, ReceiptRecord, TODAY, KPI_PAY_AFTER_INSPECTION_DAYS } from '../../../general/procurement/_data'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// ───────── หมวดเงิน (categorize by supplier + item keywords) ─────────
type Category = 'pharma' | 'medical' | 'lab' | 'equipment' | 'it' | 'office' | 'other'
const CATEGORY_META: Record<Category, { label: string; color: string; icon: React.ReactNode }> = {
  pharma:    { label: 'ยา / เวชภัณฑ์',     color: '#22c55e', icon: <FaPills /> },
  medical:   { label: 'วัสดุการแพทย์',     color: '#06b6d4', icon: <FaStethoscope /> },
  lab:       { label: 'ห้องปฏิบัติการ',    color: '#a78bfa', icon: <FaFlask /> },
  equipment: { label: 'ครุภัณฑ์การแพทย์',  color: '#f97316', icon: <FaBed /> },
  it:        { label: 'อุปกรณ์ IT',         color: '#3b82f6', icon: <FaDesktop /> },
  office:    { label: 'วัสดุสำนักงาน',     color: '#fbbf24', icon: <FaPrint /> },
  other:     { label: 'อื่นๆ',              color: 'var(--app-text-2)', icon: <FaBoxes /> },
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

// ───────── ประเภทเงินงบประมาณ (mapped จาก category + มูลค่า) ─────────
type BudgetType = 'operating' | 'capital' | 'maintenance' | 'subsidy' | 'other'
const BUDGET_META: Record<BudgetType, { label: string; color: string; icon: React.ReactNode }> = {
  operating:   { label: 'งบดำเนินงาน',     color: '#22d3ee', icon: <FaCoins /> },
  capital:     { label: 'งบลงทุน',          color: '#f97316', icon: <FaWallet /> },
  maintenance: { label: 'เงินบำรุง',        color: '#10b981', icon: <FaPiggyBank /> },
  subsidy:     { label: 'งบอุดหนุน / UC',   color: '#a78bfa', icon: <FaHandHoldingUsd /> },
  other:       { label: 'งบอื่นๆ',           color: 'var(--app-text-2)', icon: <FaBoxes /> },
}
const budgetType = (r: ReceiptRecord): BudgetType => {
  const c = categorize(r)
  if (c === 'equipment') return 'capital'
  if (c === 'it' && r.totalAmount >= 50000) return 'capital'
  if (c === 'pharma') return 'subsidy'
  if (c === 'medical' || c === 'lab') return 'operating'
  if (c === 'office' || c === 'it') return 'maintenance'
  return 'other'
}

const PageContent = () => {
  const receipts = MOCK_RECEIPTS

  // ─── ตัวเลขฐาน ───
  const stats = useMemo(() => {
    const passed = receipts.filter(r => r.inspectionStatus === 'passed')
    const paid   = passed.filter(r => r.paymentStatus === 'paid' && r.paymentDate)
    const unpaid = passed.filter(r => r.paymentStatus !== 'paid')
    const totalPaid    = paid.reduce((s, r) => s + r.totalAmount, 0)
    const totalUnpaid  = unpaid.reduce((s, r) => s + r.totalAmount, 0)
    const totalAll     = totalPaid + totalUnpaid

    // Days Payable Outstanding = avg(paymentDate - invoiceDate)
    const dpo = paid.length === 0 ? 0
      : Math.round(paid.reduce((s, r) =>
          s + dayjs(r.paymentDate!).diff(dayjs(r.invoiceDate), 'day'), 0) / paid.length)

    // Inspection→Payment time (เทียบ KPI 30 วัน)
    const ip = paid.filter(r => r.inspectionDate)
    const insp2pay = ip.length === 0 ? 0
      : Math.round(ip.reduce((s, r) =>
          s + dayjs(r.paymentDate!).diff(dayjs(r.inspectionDate!), 'day'), 0) / ip.length)

    // ตรงเวลา = paymentDate ≤ dueDate
    const onTime = paid.filter(r => dayjs(r.paymentDate!).diff(dayjs(r.dueDate), 'day') <= 0).length
    const onTimePct = paid.length === 0 ? 100 : Math.round(onTime / paid.length * 100)

    // กระจายเวลาจ่าย (vs dueDate)
    const buckets = { early: 0, ontime: 0, late7: 0, late30: 0, lateMore: 0 }
    paid.forEach(r => {
      const d = dayjs(r.paymentDate!).diff(dayjs(r.dueDate), 'day')
      if (d < -3) buckets.early++
      else if (d <= 0) buckets.ontime++
      else if (d <= 7) buckets.late7++
      else if (d <= 30) buckets.late30++
      else buckets.lateMore++
    })

    return { passed, paid, unpaid, totalPaid, totalUnpaid, totalAll, dpo, insp2pay, onTimePct, buckets }
  }, [receipts])

  // ─── หมวดเงินที่จ่ายไป ───
  const byCategory = useMemo(() => {
    const map = new Map<Category, { paid: number; unpaid: number; count: number }>()
    receipts.filter(r => r.inspectionStatus === 'passed').forEach(r => {
      const c = categorize(r)
      const cur = map.get(c) || { paid: 0, unpaid: 0, count: 0 }
      if (r.paymentStatus === 'paid') cur.paid += r.totalAmount
      else cur.unpaid += r.totalAmount
      cur.count++
      map.set(c, cur)
    })
    const arr = Array.from(map.entries())
      .map(([cat, v]) => ({ cat, ...v, total: v.paid + v.unpaid }))
      .sort((a, b) => b.total - a.total)
    return arr
  }, [receipts])

  // ─── Top suppliers ───
  const topSuppliers = useMemo(() => {
    const map = new Map<string, { paid: number; unpaid: number; count: number }>()
    receipts.filter(r => r.inspectionStatus === 'passed').forEach(r => {
      const cur = map.get(r.supplier) || { paid: 0, unpaid: 0, count: 0 }
      if (r.paymentStatus === 'paid') cur.paid += r.totalAmount
      else cur.unpaid += r.totalAmount
      cur.count++
      map.set(r.supplier, cur)
    })
    return Array.from(map.entries())
      .map(([s, v]) => ({ supplier: s, ...v, total: v.paid + v.unpaid }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [receipts])

  // ─── Aging รายการที่ยังไม่จ่าย ───
  const aging = useMemo(() => {
    const mk = () => ({ val: 0, cnt: 0 })
    const a = { current: mk(), b1: mk(), b2: mk(), b3: mk(), b4: mk() }
    stats.unpaid.forEach(r => {
      const d = dayjs(TODAY).diff(dayjs(r.dueDate), 'day') // overdue days
      let k: keyof typeof a
      if (d <= 0) k = 'current'
      else if (d <= 30) k = 'b1'
      else if (d <= 60) k = 'b2'
      else if (d <= 90) k = 'b3'
      else k = 'b4'
      a[k].val += r.totalAmount
      a[k].cnt++
    })
    return a
  }, [stats.unpaid])

  // ─── ประเภทเงินงบประมาณที่ค้างจ่าย ───
  const byBudget = useMemo(() => {
    const map = new Map<BudgetType, { unpaid: number; count: number; paid: number }>()
    stats.passed.forEach(r => {
      const t = budgetType(r)
      const cur = map.get(t) || { unpaid: 0, count: 0, paid: 0 }
      if (r.paymentStatus === 'paid') cur.paid += r.totalAmount
      else { cur.unpaid += r.totalAmount; cur.count++ }
      map.set(t, cur)
    })
    return Array.from(map.entries())
      .map(([t, v]) => ({ type: t, ...v }))
      .filter(b => b.unpaid > 0)
      .sort((a, b) => b.unpaid - a.unpaid)
  }, [stats.passed])

  // ─── Cash forecast (กระแสเงินที่ต้องจ่ายล่วงหน้า — ถึง 180 วัน) ───
  const forecast = useMemo(() => {
    const f = { d7: 0, d14: 0, d30: 0, d60: 0, d90: 0, d120: 0, d180: 0, d180plus: 0 }
    stats.unpaid.forEach(r => {
      const d = dayjs(r.dueDate).diff(dayjs(TODAY), 'day')
      if (d < 0) return // เกินกำหนดไม่นับใน forecast
      if (d <= 7) f.d7 += r.totalAmount
      else if (d <= 14) f.d14 += r.totalAmount
      else if (d <= 30) f.d30 += r.totalAmount
      else if (d <= 60) f.d60 += r.totalAmount
      else if (d <= 90) f.d90 += r.totalAmount
      else if (d <= 120) f.d120 += r.totalAmount
      else if (d <= 180) f.d180 += r.totalAmount
      else f.d180plus += r.totalAmount
    })
    return f
  }, [stats.unpaid])

  // ─── จ่ายรายเดือน ───
  const monthly = useMemo(() => {
    const map = new Map<string, number>()
    stats.paid.forEach(r => {
      const m = dayjs(r.paymentDate!).format('YYYY-MM')
      map.set(m, (map.get(m) || 0) + r.totalAmount)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [stats.paid])

  // ─── largest outstanding ───
  const largest = useMemo(() =>
    [...stats.unpaid].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5)
  , [stats.unpaid])

  const largestCols = [
    { title: 'ใบรับ', dataIndex: 'id', key: 'id', width: 110,
      render: (v: string) => <Text style={{ color: '#22d3ee', fontWeight: 600 }}>{v}</Text> },
    { title: 'ผู้จำหน่าย', dataIndex: 'supplier', key: 'sup', ellipsis: true,
      render: (v: string) => <Text style={{ color: 'var(--app-text)' }}>{v}</Text> },
    { title: 'ครบกำหนด', dataIndex: 'dueDate', key: 'dd', width: 100,
      render: (v: string) => <Text style={{ color: '#60a5fa' }}>{v}</Text> },
    { title: 'มูลค่า', dataIndex: 'totalAmount', key: 'amt', width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
  ]

  // KPI verdict
  const kpiVerdict = stats.insp2pay <= KPI_PAY_AFTER_INSPECTION_DAYS && stats.onTimePct >= 90
    ? { color: '#10b981', label: 'ผ่านเป้า KPI' }
    : stats.onTimePct >= 70
    ? { color: '#fbbf24', label: 'เฝ้าระวัง — ใกล้หลุดเป้า' }
    : { color: '#ef4444', label: 'หลุดเป้า KPI' }

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/accounting', title: <><FileTextOutlined /> งานการเงินและบัญชี</> },
          { href: '/accounting/accounts-payable', title: 'เจ้าหนี้การค้า' },
          { title: 'Dashboard' },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <FaMoneyCheckAlt style={{ fontSize: 26, color: '#10b981' }} />
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>เจ้าหนี้การค้า — Dashboard ภาพรวม</Title>
        </div>
        <Text style={{ color: 'var(--app-text-2)' }}>
          ข้อมูล ณ วันที่ {TODAY} • เป้า KPI: จ่ายภายใน {KPI_PAY_AFTER_INSPECTION_DAYS} วันหลังตรวจรับผ่าน • อัตราจ่ายตรงเวลา ≥ 90%
        </Text>

        {/* ───── KPI top row ───── */}
        <Row gutter={12} style={{ marginTop: 16, marginBottom: 16 }}>
          <Col span={6}>
            <Card style={{ background: 'linear-gradient(135deg,#064e3b,#0f172a)', border: '1px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Statistic title={<span style={{ color: 'var(--app-text-2)' }}>ยอดจ่ายแล้วสะสม</span>}
                  value={stats.totalPaid} precision={0} prefix="฿"
                  styles={{ content: { color: '#10b981', fontSize: 22 } }}
                  formatter={v => Number(v).toLocaleString()} />
                <BankOutlined style={{ fontSize: 32, color: '#10b981', opacity: 0.5 }} />
              </div>
              <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>{stats.paid.length} รายการ</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: 'linear-gradient(135deg,#3b0764,#0f172a)', border: '1px solid #a78bfa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Statistic title={<span style={{ color: 'var(--app-text-2)' }}>ยอดค้างจ่าย</span>}
                  value={stats.totalUnpaid} precision={0} prefix="฿"
                  styles={{ content: { color: '#a78bfa', fontSize: 22 } }}
                  formatter={v => Number(v).toLocaleString()} />
                <DollarCircleOutlined style={{ fontSize: 32, color: '#a78bfa', opacity: 0.5 }} />
              </div>
              <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>{stats.unpaid.length} รายการ</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: 'linear-gradient(135deg,#1e3a8a,#0f172a)', border: '1px solid #60a5fa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Statistic title={<span style={{ color: 'var(--app-text-2)' }}>DPO เฉลี่ย (Invoice→จ่าย)</span>}
                  value={stats.dpo} suffix="วัน"
                  styles={{ content: { color: '#60a5fa', fontSize: 22 } }} />
                <ClockCircleOutlined style={{ fontSize: 32, color: '#60a5fa', opacity: 0.5 }} />
              </div>
              <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>
                ตรวจรับ→จ่าย เฉลี่ย {stats.insp2pay} วัน (เป้า ≤ {KPI_PAY_AFTER_INSPECTION_DAYS})
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', border: `1px solid ${kpiVerdict.color}` }}>
              <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>KPI จ่ายตรงเวลา</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <Progress type="circle" size={56} percent={stats.onTimePct}
                  strokeColor={kpiVerdict.color} trailColor="var(--app-border-strong)"
                  format={p => <Text style={{ color: kpiVerdict.color, fontSize: 13, fontWeight: 700 }}>{p}%</Text>} />
                <div>
                  <Tag color={stats.onTimePct >= 90 ? 'success' : stats.onTimePct >= 70 ? 'warning' : 'error'}>
                    {kpiVerdict.label}
                  </Tag>
                  <div style={{ color: 'var(--app-text-2)', fontSize: 11, marginTop: 4 }}>
                    เป้าหมาย ≥ 90%
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {stats.unpaid.filter(r => dayjs(TODAY).isAfter(dayjs(r.dueDate))).length > 0 && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }}
            icon={<AlertOutlined />}
            message={`มีเจ้าหนี้เกินกำหนด ${stats.unpaid.filter(r => dayjs(TODAY).isAfter(dayjs(r.dueDate))).length} รายการ — กระทบ KPI`}
            action={
              <Link href="/accounting/accounts-payable">
                <Button danger size="small">ไปหน้าจ่าย</Button>
              </Link>
            } />
        )}

        <Row gutter={16}>
          {/* ───── หมวดเงินที่จ่ายไป ───── */}
          <Col span={14}>
            <Card title={<span style={{ color: '#22d3ee' }}><PieChartOutlined /> หมวดเงินที่จ่ายไป (แยกตามประเภทพัสดุ)</span>}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}
              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
              <EChart height={340} option={{
                backgroundColor: 'transparent',
                grid: { left: 110, right: 80, top: 30, bottom: 24 },
                tooltip: {
                  trigger: 'axis', axisPointer: { type: 'shadow' },
                  backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                  textStyle: { color: 'var(--app-text)' },
                  valueFormatter: (v: unknown) => '฿' + Number(v).toLocaleString(),
                },
                legend: { textStyle: { color: 'var(--app-text-2)' }, top: 0, right: 0, icon: 'roundRect' },
                xAxis: {
                  type: 'value', axisLabel: { color: 'var(--app-text-2)',
                    formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v) },
                  splitLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                },
                yAxis: {
                  type: 'category', inverse: true,
                  data: byCategory.map(c => CATEGORY_META[c.cat].label),
                  axisLabel: { color: 'var(--app-text)', fontSize: 12 },
                  axisLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                },
                series: [
                  { name: 'จ่ายแล้ว', type: 'bar', stack: 'a',
                    data: byCategory.map(c => ({ value: c.paid,
                      itemStyle: { color: CATEGORY_META[c.cat].color, borderRadius: [4,0,0,4] } })),
                    barWidth: 18,
                  },
                  { name: 'ค้างจ่าย', type: 'bar', stack: 'a',
                    data: byCategory.map(c => ({ value: c.unpaid,
                      itemStyle: { color: CATEGORY_META[c.cat].color + '55', borderRadius: [0,4,4,0] } })),
                    barWidth: 18,
                    label: { show: true, position: 'right', color: 'var(--app-text)', fontSize: 11,
                      formatter: (p: { dataIndex: number }) => '฿' + byCategory[p.dataIndex].total.toLocaleString() },
                  },
                ],
              }} />
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--app-text-2)', marginTop: 4 }}>
                <span>รวมทั้งหมด {byCategory.length} หมวด • {byCategory.reduce((s,c)=>s+c.count,0)} ใบ</span>
                <span style={{ marginLeft: 'auto' }}>เข้ม = จ่ายแล้ว • อ่อน = ค้างจ่าย</span>
              </div>
            </Card>
          </Col>

          {/* ───── KPI ความรวดเร็วในการจ่าย ───── */}
          <Col span={10}>
            <Card title={<span style={{ color: '#fbbf24' }}><ThunderboltOutlined /> KPI ความรวดเร็วในการจ่าย</span>}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', height: '100%' }}
              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
              <Row gutter={8} style={{ marginBottom: 12 }}>
                <Col span={12}>
                  <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)', textAlign: 'center' }}>
                    <Text style={{ color: 'var(--app-text-2)', fontSize: 11 }}>ตรวจรับ → จ่าย</Text>
                    <div style={{ color: stats.insp2pay <= KPI_PAY_AFTER_INSPECTION_DAYS ? '#10b981' : '#ef4444',
                      fontSize: 22, fontWeight: 700 }}>
                      {stats.insp2pay} <Text style={{ fontSize: 11, color: 'var(--app-text-2)' }}>วัน</Text>
                    </div>
                    <Text style={{ color: 'var(--app-text-2)', fontSize: 10 }}>เป้า ≤ {KPI_PAY_AFTER_INSPECTION_DAYS} วัน</Text>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)', textAlign: 'center' }}>
                    <Text style={{ color: 'var(--app-text-2)', fontSize: 11 }}>Invoice → จ่าย</Text>
                    <div style={{ color: '#60a5fa', fontSize: 22, fontWeight: 700 }}>
                      {stats.dpo} <Text style={{ fontSize: 11, color: 'var(--app-text-2)' }}>วัน</Text>
                    </div>
                    <Text style={{ color: 'var(--app-text-2)', fontSize: 10 }}>DPO (Days Payable Outstanding)</Text>
                  </Card>
                </Col>
              </Row>

              <Text style={{ color: 'var(--app-text)', fontSize: 12, fontWeight: 600 }}>การกระจายเวลาจ่าย เทียบครบกำหนด</Text>
              <EChart height={220} option={{
                backgroundColor: 'transparent',
                tooltip: {
                  trigger: 'item',
                  backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                  textStyle: { color: 'var(--app-text)' },
                  formatter: (p: { name: string; value: number; percent: number }) =>
                    `${p.name}<br/>${p.value} ใบ (${p.percent}%)`,
                },
                legend: {
                  orient: 'vertical', right: 0, top: 'middle',
                  textStyle: { color: 'var(--app-text-2)', fontSize: 11 },
                  itemWidth: 10, itemHeight: 10,
                },
                series: [{
                  type: 'pie', radius: ['45%', '72%'], center: ['32%', '50%'],
                  avoidLabelOverlap: true,
                  itemStyle: { borderColor: 'var(--app-surface)', borderWidth: 2 },
                  label: { show: false }, labelLine: { show: false },
                  data: [
                    { name: 'จ่ายก่อนกำหนด',  value: stats.buckets.early,    itemStyle: { color: '#10b981' } },
                    { name: 'ตรงเวลา',          value: stats.buckets.ontime,   itemStyle: { color: '#22d3ee' } },
                    { name: 'ล่าช้า 1-7 วัน',  value: stats.buckets.late7,    itemStyle: { color: '#fbbf24' } },
                    { name: 'ล่าช้า 8-30 วัน', value: stats.buckets.late30,   itemStyle: { color: '#fb923c' } },
                    { name: 'ล่าช้า > 30 วัน', value: stats.buckets.lateMore, itemStyle: { color: '#ef4444' } },
                  ],
                }],
              }} />
            </Card>
          </Col>
        </Row>

        {/* ───── จ่ายรายเดือน + Top suppliers ───── */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={14}>
            <Card title={<span style={{ color: '#22d3ee' }}><BarChartOutlined /> ยอดจ่ายรายเดือน</span>}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}
              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
              {monthly.length === 0 ? (
                <Text style={{ color: 'var(--app-text-2)' }}>ยังไม่มีข้อมูลการจ่าย</Text>
              ) : (
                <EChart height={300} option={{
                  backgroundColor: 'transparent',
                  grid: { left: 56, right: 16, top: 28, bottom: 32 },
                  tooltip: {
                    trigger: 'axis', axisPointer: { type: 'shadow' },
                    backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                    textStyle: { color: 'var(--app-text)' },
                    valueFormatter: (v: unknown) => '฿' + Number(v).toLocaleString(),
                  },
                  xAxis: {
                    type: 'category', data: monthly.map(([m]) => m),
                    axisLabel: { color: 'var(--app-text-2)' },
                    axisLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                  },
                  yAxis: {
                    type: 'value',
                    axisLabel: { color: 'var(--app-text-2)',
                      formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v) },
                    splitLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                  },
                  series: [{
                    type: 'bar',
                    data: monthly.map(([, v]) => v),
                    barWidth: '50%',
                    itemStyle: {
                      borderRadius: [6, 6, 0, 0],
                      color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                          { offset: 0, color: '#22d3ee' },
                          { offset: 1, color: '#10b981' },
                        ],
                      },
                    },
                    label: { show: true, position: 'top', color: 'var(--app-text)', fontSize: 11,
                      formatter: (p: { value: number }) => '฿' + (p.value/1000).toFixed(1) + 'k' },
                  }],
                }} />
              )}
            </Card>
          </Col>
          <Col span={10}>
            <Card title={<span style={{ color: '#f97316' }}><FaTrophy style={{ marginRight: 6 }} /> Top 5 ผู้จำหน่าย (ตามมูลค่ารวม)</span>}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', height: '100%' }}
              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
              {topSuppliers.length === 0 ? (
                <Text style={{ color: 'var(--app-text-2)' }}>ยังไม่มีข้อมูล</Text>
              ) : (
                <EChart height={300} option={{
                  backgroundColor: 'transparent',
                  grid: { left: 8, right: 80, top: 30, bottom: 8, containLabel: true },
                  tooltip: {
                    trigger: 'axis', axisPointer: { type: 'shadow' },
                    backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                    textStyle: { color: 'var(--app-text)' },
                    formatter: (params: { dataIndex: number }[]) => {
                      const s = topSuppliers[params[0].dataIndex]
                      return `<b>${s.supplier}</b><br/>` +
                        `รวม: ฿${s.total.toLocaleString()}<br/>` +
                        `จ่ายแล้ว: ฿${s.paid.toLocaleString()}<br/>` +
                        `ค้าง: ฿${s.unpaid.toLocaleString()}<br/>` +
                        `${s.count} ใบ`
                    },
                  },
                  legend: { textStyle: { color: 'var(--app-text-2)' }, top: 0, right: 0, icon: 'roundRect' },
                  xAxis: {
                    type: 'value',
                    axisLabel: { color: 'var(--app-text-2)',
                      formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v) },
                    splitLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                  },
                  yAxis: {
                    type: 'category', inverse: true,
                    data: topSuppliers.map((s, i) => `#${i+1} ${s.supplier.length > 18 ? s.supplier.slice(0,18)+'…' : s.supplier}`),
                    axisLabel: { color: 'var(--app-text)', fontSize: 11 },
                    axisLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                  },
                  series: [
                    { name: 'จ่ายแล้ว', type: 'bar', stack: 's',
                      data: topSuppliers.map(s => s.paid), barWidth: 16,
                      itemStyle: { color: '#10b981', borderRadius: [4,0,0,4] },
                    },
                    { name: 'ค้าง', type: 'bar', stack: 's',
                      data: topSuppliers.map(s => s.unpaid), barWidth: 16,
                      itemStyle: { color: '#f97316', borderRadius: [0,4,4,0] },
                      label: { show: true, position: 'right', color: '#a78bfa', fontSize: 11, fontWeight: 600,
                        formatter: (p: { dataIndex: number }) => '฿' + topSuppliers[p.dataIndex].total.toLocaleString() },
                    },
                  ],
                }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* ───── Aging + Cash forecast ───── */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title={<span style={{ color: '#ef4444' }}><WarningOutlined /> Aging — รายการค้างจ่าย</span>}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}
              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
              {(() => {
                const buckets = [
                  { key: 'current', label: 'ยังไม่ครบกำหนด',      val: aging.current.val, cnt: aging.current.cnt, color: '#10b981' },
                  { key: 'b1',      label: 'เกินกำหนด 1-30 วัน',  val: aging.b1.val,      cnt: aging.b1.cnt,      color: '#fbbf24' },
                  { key: 'b2',      label: 'เกินกำหนด 31-60 วัน', val: aging.b2.val,      cnt: aging.b2.cnt,      color: '#fb923c' },
                  { key: 'b3',      label: 'เกินกำหนด 61-90 วัน', val: aging.b3.val,      cnt: aging.b3.cnt,      color: '#ef4444' },
                  { key: 'b4',      label: 'เกินกำหนด > 90 วัน',  val: aging.b4.val,      cnt: aging.b4.cnt,      color: '#dc2626' },
                ]
                const overdueVal = aging.b1.val + aging.b2.val + aging.b3.val + aging.b4.val
                const overdueCnt = aging.b1.cnt + aging.b2.cnt + aging.b3.cnt + aging.b4.cnt
                const totalVal = aging.current.val + overdueVal
                return (
                  <>
                    <EChart height={240} option={{
                      backgroundColor: 'transparent',
                      grid: { left: 8, right: 90, top: 12, bottom: 8, containLabel: true },
                      tooltip: {
                        trigger: 'axis', axisPointer: { type: 'shadow' },
                        backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                        textStyle: { color: 'var(--app-text)' },
                        formatter: (params: { dataIndex: number }[]) => {
                          const b = buckets[params[0].dataIndex]
                          return `<b style="color:${b.color}">${b.label}</b><br/>฿${b.val.toLocaleString()} • ${b.cnt} ใบ`
                        },
                      },
                      xAxis: {
                        type: 'value',
                        axisLabel: { color: 'var(--app-text-2)',
                          formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v) },
                        splitLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                      },
                      yAxis: {
                        type: 'category', inverse: true,
                        data: buckets.map(b => b.label),
                        axisLabel: { color: 'var(--app-text)', fontSize: 11 },
                        axisLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                      },
                      series: [{
                        type: 'bar', barWidth: 16,
                        data: buckets.map(b => ({
                          value: b.val,
                          itemStyle: { color: b.color, borderRadius: [0,4,4,0] },
                        })),
                        label: { show: true, position: 'right', color: 'var(--app-text)', fontSize: 11,
                          formatter: (p: { dataIndex: number; value: number }) =>
                            '฿' + (p.value).toLocaleString() + ` (${buckets[p.dataIndex].cnt})` },
                      }],
                    }} />
                    <Divider style={{ borderColor: 'var(--app-border-strong)', margin: '10px 0 8px' }} />
                    <Row gutter={8}>
                      <Col span={12}>
                        <div style={{ background: 'var(--app-bg)', padding: '8px 6px', borderRadius: 6, textAlign: 'center', borderTop: '2px solid #ef4444' }}>
                          <Text style={{ color: 'var(--app-text-2)', fontSize: 11, display: 'block' }}>เกินกำหนดทั้งหมด</Text>
                          <Text style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>฿{overdueVal.toLocaleString()}</Text>
                          <Text style={{ color: 'var(--app-text-2)', fontSize: 10, display: 'block' }}>{overdueCnt} ใบ</Text>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ background: 'var(--app-bg)', padding: '8px 6px', borderRadius: 6, textAlign: 'center', borderTop: '2px solid #a78bfa' }}>
                          <Text style={{ color: 'var(--app-text-2)', fontSize: 11, display: 'block' }}>ยอดค้างทั้งหมด</Text>
                          <Text style={{ color: '#a78bfa', fontWeight: 700, fontSize: 14 }}>฿{totalVal.toLocaleString()}</Text>
                          <Text style={{ color: 'var(--app-text-2)', fontSize: 10, display: 'block' }}>{stats.unpaid.length} ใบ</Text>
                        </div>
                      </Col>
                    </Row>
                  </>
                )
              })()}
            </Card>
          </Col>
          <Col span={12}>
            <Card title={<span style={{ color: '#a78bfa' }}><RiseOutlined /> Cash Forecast — กระแสเงินที่ต้องจ่ายล่วงหน้า (ถึง 180 วัน)</span>}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}
              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
              {(() => {
                const buckets = [
                  { key: 'd7',       label: 'ภายใน 7 วัน',  val: forecast.d7,       color: '#ef4444' },
                  { key: 'd14',      label: '8-14 วัน',      val: forecast.d14,      color: '#fb923c' },
                  { key: 'd30',      label: '15-30 วัน',     val: forecast.d30,      color: '#fbbf24' },
                  { key: 'd60',      label: '31-60 วัน',     val: forecast.d60,      color: '#facc15' },
                  { key: 'd90',      label: '61-90 วัน',     val: forecast.d90,      color: '#a3e635' },
                  { key: 'd120',     label: '91-120 วัน',    val: forecast.d120,     color: '#22d3ee' },
                  { key: 'd180',     label: '121-180 วัน',   val: forecast.d180,     color: '#60a5fa' },
                  { key: 'd180plus', label: '> 180 วัน',     val: forecast.d180plus, color: '#a78bfa' },
                ]
                let cum = 0
                const cumData = buckets.map(b => { cum += b.val; return cum })
                const total = cum
                const cum30  = forecast.d7 + forecast.d14 + forecast.d30
                const cum90  = cum30 + forecast.d60 + forecast.d90
                const cum180 = cum90 + forecast.d120 + forecast.d180
                return (
                  <>
                    <EChart height={300} option={{
                      backgroundColor: 'transparent',
                      grid: { left: 8, right: 24, top: 30, bottom: 8, containLabel: true },
                      tooltip: {
                        trigger: 'axis', axisPointer: { type: 'cross', crossStyle: { color: 'var(--app-text-3)' } },
                        backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                        textStyle: { color: 'var(--app-text)' },
                        valueFormatter: (v: unknown) => '฿' + Number(v).toLocaleString(),
                      },
                      legend: { textStyle: { color: 'var(--app-text-2)' }, top: 0, right: 0, icon: 'roundRect' },
                      xAxis: {
                        type: 'category', data: buckets.map(b => b.label),
                        axisLabel: { color: 'var(--app-text-2)', fontSize: 10, rotate: 25 },
                        axisLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                      },
                      yAxis: [
                        { type: 'value', name: 'มูลค่า',
                          nameTextStyle: { color: 'var(--app-text-2)', fontSize: 10 },
                          axisLabel: { color: 'var(--app-text-2)',
                            formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v) },
                          splitLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                        },
                        { type: 'value', name: 'สะสม', position: 'right',
                          nameTextStyle: { color: 'var(--app-text-2)', fontSize: 10 },
                          axisLabel: { color: 'var(--app-text-2)',
                            formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v) },
                          splitLine: { show: false },
                        },
                      ],
                      series: [
                        { name: 'รายช่วง', type: 'bar', barWidth: '50%',
                          data: buckets.map(b => ({ value: b.val, itemStyle: { color: b.color, borderRadius: [4,4,0,0] } })),
                        },
                        { name: 'สะสม', type: 'line', yAxisIndex: 1, smooth: true,
                          data: cumData,
                          symbol: 'circle', symbolSize: 7,
                          itemStyle: { color: '#a78bfa' },
                          lineStyle: { width: 2, color: '#a78bfa' },
                          areaStyle: { color: 'rgba(167,139,250,0.15)' },
                        },
                      ],
                    }} />
                    <Divider style={{ borderColor: 'var(--app-border-strong)', margin: '10px 0 8px' }} />
                    <Row gutter={8}>
                      <Col span={8}>
                        <div style={{ background: 'var(--app-bg)', padding: '8px 6px', borderRadius: 6, textAlign: 'center', borderTop: '2px solid #fbbf24' }}>
                          <Text style={{ color: 'var(--app-text-2)', fontSize: 11, display: 'block' }}>รวม ≤ 30 วัน</Text>
                          <Text style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14 }}>฿{cum30.toLocaleString()}</Text>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ background: 'var(--app-bg)', padding: '8px 6px', borderRadius: 6, textAlign: 'center', borderTop: '2px solid #22d3ee' }}>
                          <Text style={{ color: 'var(--app-text-2)', fontSize: 11, display: 'block' }}>รวม ≤ 90 วัน</Text>
                          <Text style={{ color: '#22d3ee', fontWeight: 700, fontSize: 14 }}>฿{cum90.toLocaleString()}</Text>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ background: 'var(--app-bg)', padding: '8px 6px', borderRadius: 6, textAlign: 'center', borderTop: '2px solid #60a5fa' }}>
                          <Text style={{ color: 'var(--app-text-2)', fontSize: 11, display: 'block' }}>รวม ≤ 180 วัน</Text>
                          <Text style={{ color: '#60a5fa', fontWeight: 700, fontSize: 14 }}>฿{cum180.toLocaleString()}</Text>
                        </div>
                      </Col>
                    </Row>
                    <Text style={{ color: 'var(--app-text-2)', fontSize: 11, marginTop: 8, display: 'block' }}>
                      วางแผนกระแสเงินสด • รวมที่ต้องจ่ายล่วงหน้า ฿{total.toLocaleString()} • ไม่รวมเกินกำหนด ({stats.unpaid.filter(r => dayjs(TODAY).isAfter(dayjs(r.dueDate))).length} ใบ)
                    </Text>
                  </>
                )
              })()}
            </Card>
          </Col>
        </Row>

        {/* ───── ประเภทเงินงบประมาณที่ค้างจ่าย ───── */}
        <Card title={<span style={{ color: '#f97316' }}><FundOutlined /> ประเภทเงินงบประมาณที่ค้างจ่าย</span>}
          style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', marginTop: 16 }}
          styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
          {byBudget.length === 0 ? (
            <Text style={{ color: 'var(--app-text-2)' }}>ไม่มียอดค้างจ่าย</Text>
          ) : (() => {
            const totalUnpaid = byBudget.reduce((s, b) => s + b.unpaid, 0)
            const totalCount = byBudget.reduce((s, b) => s + b.count, 0)
            return (
              <Row gutter={24}>
                <Col span={14}>
                  <EChart height={320} option={{
                    backgroundColor: 'transparent',
                    grid: { left: 8, right: 110, top: 12, bottom: 8, containLabel: true },
                    tooltip: {
                      trigger: 'axis', axisPointer: { type: 'shadow' },
                      backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                      textStyle: { color: 'var(--app-text)' },
                      formatter: (params: { dataIndex: number }[]) => {
                        const b = byBudget[params[0].dataIndex]
                        const meta = BUDGET_META[b.type]
                        const pct = Math.round((b.unpaid / totalUnpaid) * 100)
                        return `<b style="color:${meta.color}">${meta.label}</b><br/>` +
                          `ค้างจ่าย: ฿${b.unpaid.toLocaleString()} (${pct}%)<br/>` +
                          `จ่ายแล้ว: ฿${b.paid.toLocaleString()}<br/>` +
                          `${b.count} ใบ`
                      },
                    },
                    xAxis: {
                      type: 'value',
                      axisLabel: { color: 'var(--app-text-2)',
                        formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v) },
                      splitLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                    },
                    yAxis: {
                      type: 'category', inverse: true,
                      data: byBudget.map(b => BUDGET_META[b.type].label),
                      axisLabel: { color: 'var(--app-text)', fontSize: 12 },
                      axisLine: { lineStyle: { color: 'var(--app-border-strong)' } },
                    },
                    series: [{
                      type: 'bar', barWidth: 22,
                      data: byBudget.map(b => ({
                        value: b.unpaid,
                        itemStyle: {
                          borderRadius: [0, 6, 6, 0],
                          color: {
                            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                            colorStops: [
                              { offset: 0, color: BUDGET_META[b.type].color },
                              { offset: 1, color: BUDGET_META[b.type].color + '99' },
                            ],
                          },
                        },
                      })),
                      label: { show: true, position: 'right', color: 'var(--app-text)', fontSize: 11, fontWeight: 600,
                        formatter: (p: { dataIndex: number; value: number }) => {
                          const b = byBudget[p.dataIndex]
                          const pct = Math.round((p.value / totalUnpaid) * 100)
                          return `฿${p.value.toLocaleString()} (${pct}% • ${b.count}ใบ)`
                        } },
                    }],
                  }} />
                </Col>
                <Col span={10}>
                  <EChart height={320} option={{
                    backgroundColor: 'transparent',
                    tooltip: {
                      trigger: 'item',
                      backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)',
                      textStyle: { color: 'var(--app-text)' },
                      formatter: (p: { name: string; value: number; percent: number }) =>
                        `${p.name}<br/>฿${p.value.toLocaleString()} (${p.percent}%)`,
                    },
                    legend: {
                      orient: 'horizontal', bottom: 0, textStyle: { color: 'var(--app-text-2)', fontSize: 11 },
                      itemWidth: 10, itemHeight: 10, type: 'scroll',
                    },
                    title: [
                      { text: 'รวมค้างจ่าย', left: 'center', top: '36%',
                        textStyle: { color: 'var(--app-text-2)', fontSize: 11, fontWeight: 400 } },
                      { text: '฿' + totalUnpaid.toLocaleString(), left: 'center', top: '46%',
                        textStyle: { color: '#f97316', fontSize: 18, fontWeight: 700 } },
                      { text: totalCount + ' ใบ', left: 'center', top: '58%',
                        textStyle: { color: 'var(--app-text-2)', fontSize: 11, fontWeight: 400 } },
                    ],
                    series: [{
                      type: 'pie', radius: ['58%', '82%'], center: ['50%', '46%'],
                      avoidLabelOverlap: true,
                      itemStyle: { borderColor: 'var(--app-surface)', borderWidth: 3 },
                      label: { show: false }, labelLine: { show: false },
                      data: byBudget.map(b => ({
                        name: BUDGET_META[b.type].label, value: b.unpaid,
                        itemStyle: { color: BUDGET_META[b.type].color },
                      })),
                    }],
                  }} />
                </Col>
              </Row>
            )
          })()}
        </Card>

        {/* ───── Largest outstanding ───── */}
        <Card title={<span style={{ color: '#a78bfa' }}><FaChartLine style={{ marginRight: 6 }} /> รายการค้างจ่ายยอดสูง (Top 5)</span>}
          extra={<Link href="/accounting/accounts-payable"><Button type="link" size="small">ดูทั้งหมด <ArrowRightOutlined /></Button></Link>}
          style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', marginTop: 16 }}
          styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}>
          <Table dataSource={largest} columns={largestCols} rowKey="id" size="small" pagination={false}
            locale={{ emptyText: 'ไม่มีรายการค้างจ่าย' }} />
        </Card>
      </div>
    </div>
  )
}

export default function AccountsPayableDashboardPage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      <PageContent />
    </AppThemeProvider>
  )
}
