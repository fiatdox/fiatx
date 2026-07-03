'use client'
import React, { useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Button, Table,
  Row, Col, Alert, Progress, App
} from 'antd'
import {
  HomeOutlined, FileTextOutlined,
  CheckCircleOutlined, FieldTimeOutlined, FundOutlined, TeamOutlined
} from '@ant-design/icons'
import { FaWarehouse } from 'react-icons/fa'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import EChart from '@/app/components/EChart'
import { MOCK_RECEIPTS, ReceiptRecord, STATUS_LABEL, TODAY, KPI_PAY_AFTER_INSPECTION_DAYS, MOCK_POS } from '../_data'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const PageContent = () => {
  const receipts = MOCK_RECEIPTS
  const pos = MOCK_POS

  const stats = useMemo(() => {
    const awaitingReceipt = pos.filter(p => p.status === 'sent' || p.status === 'partial').length
    const awaitingInspection = receipts.filter(r => r.inspectionStatus === 'pending').length
    const passedAwaitingPay = receipts.filter(r => r.inspectionStatus === 'passed' && r.paymentStatus !== 'paid').length
    const overdue = receipts.filter(r =>
      r.inspectionStatus === 'passed' && r.paymentStatus !== 'paid' && dayjs(r.dueDate).isBefore(dayjs(TODAY))
    ).length

    const totalUnpaidAmt = receipts
      .filter(r => r.inspectionStatus === 'passed' && r.paymentStatus !== 'paid')
      .reduce((s, r) => s + r.totalAmount, 0)

    const paid = receipts.filter(r => r.paymentStatus === 'paid')
    const paidOnTime = paid.filter(r => r.paymentDate && dayjs(r.paymentDate).diff(dayjs(r.dueDate), 'day') <= 0).length
    const onTimePct = paid.length === 0 ? 100 : Math.round(paidOnTime / paid.length * 100)
    const totalPaidAmt = paid.reduce((s, r) => s + r.totalAmount, 0)

    return { awaitingReceipt, awaitingInspection, passedAwaitingPay, overdue, totalUnpaidAmt, totalPaidAmt, onTimePct, paidCount: paid.length }
  }, [receipts, pos])

  // เจ้าหนี้ใกล้ครบกำหนด (top 5)
  const upcoming = useMemo(() => receipts
    .filter(r => r.inspectionStatus === 'passed' && r.paymentStatus !== 'paid')
    .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)))
    .slice(0, 6), [receipts])

  // จำนวน PO รายเดือนแบ่งตามหมวด + ยอดสะสมปีงบประมาณ (mock)
  const poByMonth = useMemo(() => {
    const categories = [
      { key: 'med',    label: 'เวชภัณฑ์/ยา',          color: '#10b981' },
      { key: 'equip',  label: 'ครุภัณฑ์การแพทย์',     color: '#22d3ee' },
      { key: 'lab',    label: 'วัสดุวิทยาศาสตร์',     color: '#a78bfa' },
      { key: 'office', label: 'วัสดุสำนักงาน',        color: '#fbbf24' },
      { key: 'it',     label: 'วัสดุคอมพิวเตอร์',     color: '#fb923c' },
      { key: 'other',  label: 'อื่นๆ',                color: '#64748b' },
    ] as const

    // ปีงบประมาณไทย: ต.ค. ปีก่อน → ก.ย. ปีปัจจุบัน
    const monthly: Array<{ month: string; counts: Record<string, number> }> = [
      { month: 'ต.ค.',  counts: { med: 5, equip: 2, lab: 2, office: 3, it: 1, other: 1 } },
      { month: 'พ.ย.',  counts: { med: 4, equip: 3, lab: 2, office: 2, it: 1, other: 0 } },
      { month: 'ธ.ค.',  counts: { med: 6, equip: 4, lab: 3, office: 4, it: 2, other: 1 } },
      { month: 'ม.ค.',  counts: { med: 5, equip: 2, lab: 2, office: 3, it: 2, other: 1 } },
      { month: 'ก.พ.',  counts: { med: 4, equip: 3, lab: 3, office: 2, it: 1, other: 0 } },
      { month: 'มี.ค.', counts: { med: 7, equip: 4, lab: 3, office: 3, it: 2, other: 1 } },
      { month: 'เม.ย.', counts: { med: 5, equip: 2, lab: 2, office: 2, it: 1, other: 1 } },
      { month: 'พ.ค.',  counts: { med: 6, equip: 3, lab: 3, office: 3, it: 2, other: 0 } },
      { month: 'มิ.ย.', counts: { med: 5, equip: 4, lab: 2, office: 2, it: 1, other: 1 } },
      { month: 'ก.ค.',  counts: { med: 4, equip: 3, lab: 2, office: 3, it: 2, other: 1 } },
      { month: 'ส.ค.',  counts: { med: 6, equip: 2, lab: 3, office: 2, it: 1, other: 0 } },
      { month: 'ก.ย.',  counts: { med: 5, equip: 3, lab: 2, office: 3, it: 1, other: 1 } },
    ]

    let running = 0
    const cumulative = monthly.map(m => {
      const sum = categories.reduce((s, c) => s + (m.counts[c.key] || 0), 0)
      running += sum
      return running
    })
    const total = running

    // ปีงบประมาณ พ.ศ. (ปัจจุบัน 2026 → ปีงบ 2569)
    const fiscalYear = TODAY ? new Date(TODAY).getFullYear() + 543 + (new Date(TODAY).getMonth() >= 9 ? 1 : 0) : 2569

    return { categories, monthly, cumulative, total, fiscalYear }
  }, [])

  // มูลค่ารับเข้า / จ่ายออก รายเดือน (mock)
  const monthly = useMemo(() => {
    const months: Record<string, { received: number; paid: number }> = {}
    receipts.forEach(r => {
      const m = dayjs(r.receivedDate).format('YYYY-MM')
      months[m] = months[m] || { received: 0, paid: 0 }
      months[m].received += r.totalAmount
      if (r.paymentStatus === 'paid' && r.paymentDate) {
        const pm = dayjs(r.paymentDate).format('YYYY-MM')
        months[pm] = months[pm] || { received: 0, paid: 0 }
        months[pm].paid += r.totalAmount
      }
    })
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b))
  }, [receipts])

  const upcomingCols = [
    { title: 'เลขที่ใบรับ', dataIndex: 'id', key: 'id', width: 120,
      render: (v: string) => <Text style={{ color: '#22d3ee', fontWeight: 600 }}>{v}</Text> },
    { title: 'ผู้จำหน่าย', dataIndex: 'supplier', key: 'sup', ellipsis: true },
    { title: 'ครบกำหนด', dataIndex: 'dueDate', key: 'dd', width: 110,
      render: (v: string) => <Text style={{ color: '#60a5fa' }}>{v}</Text> },
    { title: 'คงเหลือ', key: 'days', width: 110,
      render: (_: any, r: ReceiptRecord) => {
        const d = dayjs(r.dueDate).diff(dayjs(TODAY), 'day')
        const color = d < 0 ? '#ef4444' : d <= 3 ? '#fb923c' : d <= 7 ? '#fbbf24' : '#6ee7b7'
        return <Text style={{ color, fontWeight: 600 }}>{d < 0 ? `เกิน ${Math.abs(d)} วัน` : `เหลือ ${d} วัน`}</Text>
      }},
    { title: 'มูลค่า', dataIndex: 'totalAmount', key: 'amt', width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
          { title: 'งานพัสดุ — Dashboard' },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <FaWarehouse style={{ fontSize: 26, color: '#FF6500' }} />
          <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>งานพัสดุ — ภาพรวม</Title>
        </div>
        <Text style={{ color: '#94a3b8' }}>วันที่ระบบ: {TODAY} • KPI การจ่าย: ภายใน {KPI_PAY_AFTER_INSPECTION_DAYS} วันหลังตรวจรับผ่าน</Text>

        {stats.overdue > 0 && (
          <Alert type="error" showIcon style={{ marginTop: 16 }}
            message={`เจ้าหนี้เกินกำหนด ${stats.overdue} รายการ`}
            description="กรุณาดำเนินการจ่ายโดยด่วน หรือบันทึกเหตุผลที่จ่ายล่าช้าใน /accounting/accounts-payable"
            action={
              <Link href="/accounting/accounts-payable">
                <Button danger size="small">ดำเนินการ</Button>
              </Link>
            } />
        )}

        <Row gutter={16} style={{ marginTop: 16 }}>
          {/* KPI gauge */}
          <Col xs={24} md={8}>
            <Card title={<span style={{ color: '#10b981' }}><CheckCircleOutlined /> KPI การจ่ายตรงเวลา</span>}
              style={{ background: '#1e293b', border: '1px solid #334155', height: '100%' }}
              styles={{
                header: { borderBottom: '1px solid #334155' },
                body: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', minHeight: 360 },
              }}>
              <Progress type="dashboard" percent={stats.onTimePct} strokeColor={
                stats.onTimePct >= 90 ? '#10b981' : stats.onTimePct >= 70 ? '#fbbf24' : '#ef4444'
              } railColor="#334155" size={160} />

              <Row gutter={12} style={{ width: '100%', marginTop: 16 }}>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: 'rgba(15,23,42,0.6)', border: '1px solid #334155' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>จ่ายแล้ว</Text>
                    <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>{stats.paidCount}</div>
                    <Text style={{ color: '#94a3b8', fontSize: 10 }}>รายการ</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: 'rgba(15,23,42,0.6)', border: '1px solid #334155' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>มูลค่ารวม</Text>
                    <div style={{ color: '#10b981', fontSize: 16, fontWeight: 700 }}>฿{(stats.totalPaidAmt/1000).toFixed(0)}k</div>
                    <Text style={{ color: '#94a3b8', fontSize: 10 }}>บาท</Text>
                  </div>
                </Col>
              </Row>

              <Alert type={stats.onTimePct >= 90 ? 'success' : stats.onTimePct >= 70 ? 'warning' : 'error'}
                showIcon style={{ marginTop: 14, width: '100%' }}
                message={
                  stats.onTimePct >= 90 ? 'KPI ผ่านเป้าหมาย (≥90%)'
                  : stats.onTimePct >= 70 ? 'ใกล้หลุดเป้า — ต้องเร่งจ่าย'
                  : 'หลุดเป้าหมาย KPI'
                } />
            </Card>
          </Col>

          {/* Upcoming due */}
          <Col xs={24} md={16}>
            <Card title={<span style={{ color: '#fbbf24' }}><FieldTimeOutlined /> เจ้าหนี้ใกล้ครบกำหนด (Top 6)</span>}
              extra={<Link href="/accounting/accounts-payable"><Button size="small" type="link">ดูทั้งหมด</Button></Link>}
              style={{ background: '#1e293b', border: '1px solid #334155', height: '100%' }}
              styles={{ header: { borderBottom: '1px solid #334155' }, body: { padding: 8 } }}>
              <Table dataSource={upcoming} columns={upcomingCols} rowKey="id" size="small"
                pagination={false} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col xs={24} xl={12}>
        {/* Monthly bar chart */}
        <Card title={<span style={{ color: '#22d3ee' }}><FundOutlined /> มูลค่ารับเข้า / จ่ายออก รายเดือน</span>}
          style={{ background: '#1e293b', border: '1px solid #334155', height: '100%' }}
          styles={{ header: { borderBottom: '1px solid #334155' } }}>
          {monthly.length === 0 ? (
            <Text style={{ color: '#94a3b8' }}>ยังไม่มีข้อมูล</Text>
          ) : (
            <EChart height={340} option={{
              backgroundColor: 'transparent',
              grid: { left: 56, right: 16, top: 36, bottom: 36 },
              tooltip: {
                trigger: 'axis', axisPointer: { type: 'shadow' },
                backgroundColor: '#0f172a', borderColor: '#334155',
                textStyle: { color: '#e2e8f0' },
                valueFormatter: (v: unknown) => '฿' + Number(v).toLocaleString(),
              },
              legend: {
                textStyle: { color: '#94a3b8' }, top: 0, right: 0, icon: 'roundRect',
                data: ['รับเข้า (เจ้าหนี้ใหม่)', 'จ่ายออก'],
              },
              xAxis: {
                type: 'category', data: monthly.map(([m]) => m),
                axisLabel: { color: '#94a3b8' },
                axisLine: { lineStyle: { color: '#334155' } },
              },
              yAxis: {
                type: 'value',
                axisLabel: { color: '#94a3b8',
                  formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v) },
                splitLine: { lineStyle: { color: '#334155' } },
              },
              series: [
                {
                  name: 'รับเข้า (เจ้าหนี้ใหม่)', type: 'bar', barWidth: 22,
                  data: monthly.map(([, v]) => v.received),
                  itemStyle: {
                    borderRadius: [6, 6, 0, 0],
                    color: {
                      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [
                        { offset: 0, color: '#FF6500' },
                        { offset: 1, color: '#fbbf24' },
                      ],
                    },
                  },
                  label: { show: true, position: 'top', color: '#fbbf24', fontSize: 10,
                    formatter: (p: { value: number }) => p.value > 0 ? '฿' + (p.value/1000).toFixed(0) + 'k' : '' },
                },
                {
                  name: 'จ่ายออก', type: 'bar', barWidth: 22,
                  data: monthly.map(([, v]) => v.paid),
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
                  label: { show: true, position: 'top', color: '#10b981', fontSize: 10,
                    formatter: (p: { value: number }) => p.value > 0 ? '฿' + (p.value/1000).toFixed(0) + 'k' : '' },
                },
              ],
            }} />
          )}
        </Card>
          </Col>

          <Col xs={24} xl={12}>
        {/* PO รายเดือนแบ่งตามหมวด — ปีงบประมาณ + เส้นยอดสะสม */}
        <Card
          title={<span style={{ color: '#10b981' }}><TeamOutlined /> การออก PO รายเดือน (แบ่งตามหมวด) — ปีงบประมาณ {poByMonth.fiscalYear}</span>}
          extra={
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12,
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)',
            }}>
              <span style={{ color: '#94a3b8' }}>ยอดสะสมทั้งปี</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>{poByMonth.total} ใบ</span>
            </span>
          }
          style={{ background: '#1e293b', border: '1px solid #334155', height: '100%' }}
          styles={{ header: { borderBottom: '1px solid #334155' } }}
        >
          <EChart
            height={340}
            option={{
              backgroundColor: 'transparent',
              grid: { left: 56, right: 64, top: 36, bottom: 50, containLabel: true },
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                textStyle: { color: '#e2e8f0' },
                formatter: (params: Array<{ axisValue: string; seriesName: string; value: number; color: string; seriesType: string }>) => {
                  const bars = params.filter(p => p.seriesType === 'bar')
                  const line = params.find(p => p.seriesType === 'line')
                  const monthTotal = bars.reduce((s, p) => s + (p.value || 0), 0)
                  const rows = bars
                    .filter(p => p.value > 0)
                    .map(p => `<div style="display:flex;justify-content:space-between;gap:14px;padding:1px 0"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>${p.seriesName}</span><b style="color:#e2e8f0">${p.value} ใบ</b></div>`)
                    .join('') || '<div style="color:#64748b;font-size:11px">—</div>'
                  const lineRow = line
                    ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #334155;display:flex;justify-content:space-between;gap:14px"><span><span style="display:inline-block;width:10px;height:2px;background:${line.color};margin-right:6px;vertical-align:middle"></span>${line.seriesName}</span><b style="color:#fbbf24">${line.value} ใบ</b></div>`
                    : ''
                  return `<div style="font-weight:600;margin-bottom:6px;color:#fff">${params[0].axisValue}</div>
                    <div style="color:#10b981;font-weight:600;margin:2px 0">รวมเดือนนี้ ${monthTotal} ใบ</div>${rows}${lineRow}`
                },
              },
              legend: {
                top: 0,
                right: 0,
                textStyle: { color: '#cbd5e1', fontSize: 11 },
                icon: 'roundRect',
                itemWidth: 12,
                itemHeight: 8,
                data: [...poByMonth.categories.map(c => c.label), 'ยอดสะสม (ใบ)'],
              },
              xAxis: {
                type: 'category',
                data: poByMonth.monthly.map(m => m.month),
                axisLabel: { color: '#cbd5e1', fontSize: 11 },
                axisLine: { lineStyle: { color: '#334155' } },
              },
              yAxis: [
                {
                  type: 'value',
                  name: 'PO ต่อเดือน (ใบ)',
                  nameTextStyle: { color: '#94a3b8', fontSize: 11 },
                  axisLabel: { color: '#94a3b8' },
                  splitLine: { lineStyle: { color: '#334155' } },
                },
                {
                  type: 'value',
                  name: 'ยอดสะสม (ใบ)',
                  nameTextStyle: { color: '#fbbf24', fontSize: 11 },
                  axisLabel: { color: '#fbbf24' },
                  splitLine: { show: false },
                },
              ],
              series: [
                ...poByMonth.categories.map((cat, idx) => ({
                  name: cat.label,
                  type: 'bar' as const,
                  stack: 'po',
                  barWidth: 22,
                  yAxisIndex: 0,
                  emphasis: { focus: 'series' as const },
                  itemStyle: {
                    color: cat.color,
                    borderRadius: idx === poByMonth.categories.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0],
                  },
                  data: poByMonth.monthly.map(m => m.counts[cat.key]),
                  label: {
                    show: true,
                    color: '#0f172a',
                    fontSize: 10,
                    fontWeight: 600,
                    formatter: (p: { value: number }) => p.value > 0 ? String(p.value) : '',
                  },
                })),
                {
                  name: 'ยอดสะสม (ใบ)',
                  type: 'line' as const,
                  yAxisIndex: 1,
                  smooth: true,
                  symbol: 'circle',
                  symbolSize: 7,
                  data: poByMonth.cumulative,
                  itemStyle: { color: '#fbbf24' },
                  lineStyle: { color: '#fbbf24', width: 3, shadowColor: 'rgba(251,191,36,0.45)', shadowBlur: 8 },
                  areaStyle: {
                    color: {
                      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [
                        { offset: 0, color: 'rgba(251,191,36,0.25)' },
                        { offset: 1, color: 'rgba(251,191,36,0.02)' },
                      ],
                    },
                  },
                  label: {
                    show: true,
                    position: 'top' as const,
                    color: '#fbbf24',
                    fontSize: 10,
                    fontWeight: 600,
                    formatter: (p: { value: number }) => String(p.value),
                  },
                  z: 4,
                },
              ],
            }}
          />
        </Card>
          </Col>
        </Row>

        {/* Status breakdown */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card title={<span style={{ color: '#22d3ee' }}>สถานะการตรวจรับ</span>}
              style={{ background: '#1e293b', border: '1px solid #334155', height: '100%' }}
              styles={{ header: { borderBottom: '1px solid #334155' } }}>
              {(() => {
                const items = (['pending', 'passed', 'reworking', 'rejected'] as const).map(st => {
                  const cnt = receipts.filter(r => r.inspectionStatus === st).length
                  const color = STATUS_LABEL.inspection[st].color === 'success' ? '#10b981'
                    : STATUS_LABEL.inspection[st].color === 'error' ? '#ef4444'
                    : STATUS_LABEL.inspection[st].color === 'warning' ? '#fbbf24' : '#22d3ee'
                  return { name: STATUS_LABEL.inspection[st].label, value: cnt, color }
                })
                return (
                  <EChart height={300} option={{
                    backgroundColor: 'transparent',
                    tooltip: {
                      trigger: 'item',
                      backgroundColor: '#0f172a', borderColor: '#334155',
                      textStyle: { color: '#e2e8f0' },
                      formatter: (p: { name: string; value: number; percent: number }) =>
                        `${p.name}<br/>${p.value} ใบ (${p.percent}%)`,
                    },
                    legend: {
                      orient: 'horizontal', bottom: 0, left: 'center',
                      textStyle: { color: '#cbd5e1', fontSize: 11 },
                      itemWidth: 10, itemHeight: 10, itemGap: 14,
                    },
                    title: [
                      { text: 'รวม', left: 'center', top: '38%',
                        textAlign: 'center',
                        textStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 400 } },
                      { text: String(receipts.length), left: 'center', top: '46%',
                        textAlign: 'center',
                        textStyle: { color: '#22d3ee', fontSize: 22, fontWeight: 700 } },
                    ],
                    series: [{
                      type: 'pie', radius: ['54%', '78%'], center: ['50%', '46%'],
                      avoidLabelOverlap: true,
                      itemStyle: { borderColor: '#1e293b', borderWidth: 2 },
                      label: { show: false }, labelLine: { show: false },
                      data: items.map(i => ({ name: i.name, value: i.value, itemStyle: { color: i.color } })),
                    }],
                  }} />
                )
              })()}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title={<span style={{ color: '#a78bfa' }}>สถานะการจ่ายเงิน</span>}
              style={{ background: '#1e293b', border: '1px solid #334155', height: '100%' }}
              styles={{ header: { borderBottom: '1px solid #334155' } }}>
              {(() => {
                const items = (['unpaid', 'scheduled', 'paid', 'overdue'] as const).map(st => {
                  const cnt = receipts.filter(r => r.paymentStatus === st).length
                  const color = STATUS_LABEL.payment[st].color === 'success' ? '#10b981'
                    : STATUS_LABEL.payment[st].color === 'error' ? '#ef4444'
                    : STATUS_LABEL.payment[st].color === 'warning' ? '#fbbf24' : '#a78bfa'
                  return { name: STATUS_LABEL.payment[st].label, value: cnt, color }
                })
                return (
                  <EChart height={300} option={{
                    backgroundColor: 'transparent',
                    tooltip: {
                      trigger: 'item',
                      backgroundColor: '#0f172a', borderColor: '#334155',
                      textStyle: { color: '#e2e8f0' },
                      formatter: (p: { name: string; value: number; percent: number }) =>
                        `${p.name}<br/>${p.value} ใบ (${p.percent}%)`,
                    },
                    legend: {
                      orient: 'horizontal', bottom: 0, left: 'center',
                      textStyle: { color: '#cbd5e1', fontSize: 11 },
                      itemWidth: 10, itemHeight: 10, itemGap: 14,
                    },
                    title: [
                      { text: 'รวม', left: 'center', top: '38%',
                        textAlign: 'center',
                        textStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 400 } },
                      { text: String(receipts.length), left: 'center', top: '46%',
                        textAlign: 'center',
                        textStyle: { color: '#a78bfa', fontSize: 22, fontWeight: 700 } },
                    ],
                    series: [{
                      type: 'pie', radius: ['54%', '78%'], center: ['50%', '46%'],
                      avoidLabelOverlap: true,
                      itemStyle: { borderColor: '#1e293b', borderWidth: 2 },
                      label: { show: false }, labelLine: { show: false },
                      data: items.map(i => ({ name: i.name, value: i.value, itemStyle: { color: i.color } })),
                    }],
                  }} />
                )
              })()}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default function ProcurementDashboardPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
