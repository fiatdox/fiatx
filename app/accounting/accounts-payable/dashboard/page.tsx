'use client'
// Dashboard เจ้าหนี้การค้า อ่านจากทะเบียนเจ้าหนี้กลาง: ยอดจ่ายรายเดือน อายุหนี้ กระแสเงินที่ต้องจ่าย ผู้รับจ้างค้างสูงสุด
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Row, Select, Table, Typography } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import { FaTachometerAlt } from 'react-icons/fa'
import Link from 'next/link'
import dayjs from 'dayjs'
import EChart from '@/app/components/EChart'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { api, cardStyle, ContractPage, DueTag, fmtMoney, StatCard } from '@/app/general/contracts/contractShared'

const { Text } = Typography

/* eslint-disable @typescript-eslint/no-explicit-any */
// ปีงบประมาณ พ.ศ. N เริ่ม 1 ต.ค. ของปีก่อน ถึง 30 ก.ย.
const fyOf = (d: dayjs.Dayjs) => d.year() + 543 + (d.month() >= 9 ? 1 : 0)
const fyRange = (fy: number) => [`${fy - 544}-10-01`, `${fy - 543}-09-30`] as const
const MONTHS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.']
const isOpen = (p: any) => p.pay_status === 'unpaid' || p.pay_status === 'partial'
const short = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n))

// ช่วงอายุหนี้เรียงจากเบาไปหนัก จึงใช้สีเดียวไล่อ่อนไปเข้ม
const AGING = [
  { label: 'ยังไม่ถึงกำหนด/ไม่ระบุ', test: (d: number) => d <= 0, color: '#94a3b8' },
  { label: 'เกิน 1-30 วัน', test: (d: number) => d >= 1 && d <= 30, color: '#fca5a5' },
  { label: 'เกิน 31-60 วัน', test: (d: number) => d >= 31 && d <= 60, color: '#f87171' },
  { label: 'เกิน 61-90 วัน', test: (d: number) => d >= 61 && d <= 90, color: '#dc2626' },
  { label: 'เกิน 90 วัน', test: (d: number) => d > 90, color: '#991b1b' },
]
const FORECAST = [
  { label: 'เกินกำหนดแล้ว', test: (d: number) => d < 0 },
  { label: 'ภายใน 7 วัน', test: (d: number) => d >= 0 && d <= 7 },
  { label: '8-30 วัน', test: (d: number) => d >= 8 && d <= 30 },
  { label: '31-60 วัน', test: (d: number) => d >= 31 && d <= 60 },
  { label: '61-90 วัน', test: (d: number) => d >= 61 && d <= 90 },
  { label: 'มากกว่า 90 วัน', test: (d: number) => d > 90 },
]

const DashboardContent = () => {
  const { message } = App.useApp()
  const { mode } = useThemeMode()
  const chartTheme = mode === 'dark' ? 'dark' : 'light'
  const [fy, setFy] = useState(() => fyOf(dayjs()))
  const [payables, setPayables] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [from, to] = fyRange(fy)
      const [p, y] = await Promise.all([api('payables'), api(`payments?from=${from}&to=${to}`)])
      setPayables(p)
      setPayments(y)
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [fy, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const todayStr = dayjs().format('YYYY-MM-DD')
  const s = useMemo(() => {
    const today = dayjs(todayStr)
    const [from, to] = fyRange(fy)
    const open = payables.filter(isOpen)
    const overdueDays = (p: any) => p.due_date ? today.diff(dayjs(p.due_date), 'day') : 0
    const monthly = MONTHS.map(() => 0)
    payments.forEach(y => {
      const d = dayjs(y.paid_date)
      monthly[(d.month() + 3) % 12] += y.amount
    })
    // ปิดหนี้ครบในปีงบนี้: ใช้วัด KPI ตรงเวลาและระยะเวลาจ่าย
    const closed = payables.filter(p => p.pay_status === 'paid' && p.last_paid_date >= from && p.last_paid_date <= to)
    const judged = closed.filter(p => p.due_date)
    const vendorMap = new Map<string, number>()
    open.forEach(p => vendorMap.set(p.vendor_name, (vendorMap.get(p.vendor_name) ?? 0) + p.balance))
    return {
      paidFy: payments.reduce((n, y) => n + y.amount, 0),
      outstanding: open.reduce((n, p) => n + p.balance, 0),
      overdue: open.filter(p => p.due_state === 'overdue'),
      onTimePct: judged.length ? Math.round(judged.filter(p => p.last_paid_date <= p.due_date).length / judged.length * 100) : null,
      judged: judged.length,
      avgDays: closed.length ? Math.round(closed.reduce((n, p) => n + dayjs(p.last_paid_date).diff(dayjs(p.invoice_date), 'day'), 0) / closed.length) : null,
      monthly,
      aging: AGING.map(a => {
        const rows = open.filter(p => a.test(overdueDays(p)))
        return { ...a, value: rows.reduce((n, p) => n + p.balance, 0), count: rows.length }
      }),
      forecast: [
        ...FORECAST.map(f => {
          const rows = open.filter(p => p.due_date && f.test(dayjs(p.due_date).diff(today, 'day')))
          return { label: f.label, value: rows.reduce((n, p) => n + p.balance, 0), count: rows.length }
        }),
        (() => { const rows = open.filter(p => !p.due_date); return { label: 'ไม่ระบุวันครบกำหนด', value: rows.reduce((n, p) => n + p.balance, 0), count: rows.length } })(),
      ],
      topVendors: [...vendorMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      topItems: [...open].sort((a, b) => b.balance - a.balance).slice(0, 5),
    }
  }, [payables, payments, fy, todayStr])

  const fyOptions = useMemo(() => {
    const now = fyOf(dayjs())
    return Array.from({ length: 5 }, (_, i) => now - i).map(v => ({ value: v, label: `ปีงบประมาณ ${v}` }))
  }, [])

  const tooltip = { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, valueFormatter: (v: number) => `${fmtMoney(v)} บาท` }
  const barCard = (title: string, cats: string[], data: { value: number; itemStyle?: object }[], horizontal = false, color = '#0891b2') => (
    <Card size="small" title={title} style={{ ...cardStyle, height: '100%' }}>
      <EChart theme={chartTheme} height={260} option={{
        backgroundColor: 'transparent',
        grid: { left: 8, right: horizontal ? 56 : 8, top: 16, bottom: 8, containLabel: true },
        tooltip,
        [horizontal ? 'yAxis' : 'xAxis']: { type: 'category', data: cats, inverse: horizontal, axisLabel: { fontSize: 11, width: horizontal ? 150 : undefined, overflow: 'truncate' } },
        [horizontal ? 'xAxis' : 'yAxis']: { type: 'value', axisLabel: { formatter: short }, splitLine: { lineStyle: { opacity: 0.3 } } },
        series: [{
          type: 'bar', barMaxWidth: 22, itemStyle: { color, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
          label: { show: true, position: horizontal ? 'right' : 'top', fontSize: 10, formatter: (p: { value: number }) => p.value > 0 ? short(p.value) : '' },
          data,
        }],
      }} />
    </Card>
  )

  const empty = !loading && payables.length === 0 && payments.length === 0
  return (
    <>
      <div className="flex flex-wrap gap-2 justify-between items-center mb-4" style={{ marginTop: -8 }}>
        <Select value={fy} onChange={setFy} options={fyOptions} style={{ width: 190 }} aria-label="ปีงบประมาณ" />
        <Link href="/accounting/accounts-payable"><Button type="primary">ไปหน้ากำหนดจ่าย <ArrowRightOutlined /></Button></Link>
      </div>

      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={12} lg={6}><StatCard loading={loading} title="จ่ายแล้ว (บาท)" value={fmtMoney(s.paidFy)} note={`ปีงบ ${fy}`} /></Col>
        <Col xs={12} lg={6}><StatCard loading={loading} title="ค้างจ่าย (บาท)" value={fmtMoney(s.outstanding)} note="ณ วันนี้" /></Col>
        <Col xs={12} lg={6}><StatCard loading={loading} title="KPI จ่ายตรงเวลา" value={s.onTimePct ?? '—'} unit={s.onTimePct == null ? undefined : '%'} note={`จากที่จ่ายครบ ${s.judged} รายการ`} /></Col>
        <Col xs={12} lg={6}><StatCard loading={loading} title="ระยะเวลาจ่ายเฉลี่ย" value={s.avgDays ?? '—'} unit={s.avgDays == null ? undefined : 'วัน'} note="ใบแจ้งหนี้ถึงจ่ายครบ" /></Col>
      </Row>

      {s.overdue.length > 0 && (
        <Alert className="mb-4" type="error" showIcon title={`เกินกำหนดจ่าย ${s.overdue.length} รายการ รวม ${fmtMoney(s.overdue.reduce((n, p) => n + p.balance, 0))} บาท`}
          action={<Link href="/accounting/accounts-payable"><Button size="small" danger>ดูรายการ</Button></Link>} />
      )}

      {empty ? (
        <Card style={cardStyle}><Empty description="ยังไม่มีข้อมูลเจ้าหนี้ — การเงินบันทึกได้ที่หน้ากำหนดจ่ายหรือทะเบียนผู้รับจ้าง" /></Card>
      ) : (
        <>
          <Row gutter={[12, 12]} className="mb-3">
            <Col xs={24} lg={12}>{barCard(`ยอดจ่ายรายเดือน ปีงบ ${fy}`, MONTHS, s.monthly.map(value => ({ value })))}</Col>
            <Col xs={24} lg={12}>{barCard('อายุหนี้ค้างจ่าย (นับจากวันครบกำหนด)', s.aging.map(a => `${a.label} (${a.count})`), s.aging.map(a => ({ value: a.value, itemStyle: { color: a.color } })), true)}</Col>
          </Row>
          <Row gutter={[12, 12]} className="mb-3">
            <Col xs={24} lg={12}>{barCard('เงินที่ต้องจ่ายตามวันครบกำหนด', s.forecast.map(f => `${f.label} (${f.count})`), s.forecast.map(f => ({ value: f.value })), true, '#6366f1')}</Col>
            <Col xs={24} lg={12}>{barCard('ผู้รับจ้างที่ค้างจ่ายสูงสุด 5 อันดับ', s.topVendors.map((v, i) => `${i + 1}. ${v.name}`), s.topVendors.map(v => ({ value: v.value })), true, '#0d9488')}</Col>
          </Row>
          <Card size="small" title="รายการค้างจ่ายยอดสูงสุด 5 อันดับ" style={cardStyle}>
            <Table size="small" rowKey="id" pagination={false} dataSource={s.topItems} scroll={{ x: 760 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการค้างจ่าย" /> }}
              columns={[
                { title: 'ผู้รับจ้าง', dataIndex: 'vendor_name' },
                { title: 'รายการ', dataIndex: 'description', render: (v: string, r: any) => <>{v}{r.invoice_no && <div style={{ fontSize: 12 }}><Text type="secondary">ใบแจ้งหนี้ {r.invoice_no}</Text></div>}</> },
                { title: 'ครบกำหนด', dataIndex: 'due_date', width: 180, render: (v: string | null, r: any) => <DueTag state={r.due_state} date={v} /> },
                { title: 'ค้างจ่าย', dataIndex: 'balance', width: 130, align: 'right', render: (v: number) => <Text strong>{fmtMoney(v)}</Text> },
              ]} />
          </Card>
        </>
      )}
    </>
  )
}

export default function AccountsPayableDashboardPage() {
  return (
    <ContractPage screen="vendors" title="เจ้าหนี้การค้า — Dashboard" icon={<FaTachometerAlt />}
      subtitle="ยอดจ่าย อายุหนี้ และเงินที่ต้องเตรียมจ่าย จากทะเบียนเจ้าหนี้กลาง"
      crumbs={[{ href: '/accounting', title: 'งานการเงินและบัญชี' }, { href: '/accounting/accounts-payable', title: 'เจ้าหนี้การค้า' }]}>
      {() => <DashboardContent />}
    </ContractPage>
  )
}
