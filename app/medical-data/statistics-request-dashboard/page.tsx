'use client'
import { useState, useEffect, useMemo } from 'react'
import { Card, Typography, Breadcrumb, Row, Col, Spin, Empty, App } from 'antd'
import { HomeOutlined } from '@ant-design/icons'
import { FaChartPie } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider, useThemeMode } from '@/app/components/ThemeProvider'
import EChart from '@/app/components/EChart'
import { ACCENT, apiGet } from '../statShared'

const { Title, Text } = Typography
const PALETTE = ['#0d9488', '#22d3ee', '#a78bfa', '#f59e0b', '#f472b6', '#60a5fa', '#34d399', '#fb923c']

interface NV { name: string; value: number; color?: string }
interface DashData {
  totals: { total: number; pending: number; processing: number; delivered: number; rejected: number }
  by_purpose: NV[]
  by_urgency: NV[]
  by_status: NV[]
  by_month: { ym: string; value: number }[]
  by_department: NV[]
}

const STATUS_LABEL: Record<string, string> = { pending: 'รอตรวจสอบ', processing: 'กำลังจัดทำ', delivered: 'ส่งมอบแล้ว', rejected: 'ไม่อนุมัติ' }

const PageContent = () => {
  const { message } = App.useApp()
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  // ECharts วาดบน canvas -> ใช้ CSS var ไม่ได้ ต้องกำหนดสีจริงตามโหมด
  const txt = isDark ? '#94a3b8' : '#475569'
  const split = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)'
  const tip = { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', textStyle: { color: isDark ? '#e2e8f0' : '#334155' } }

  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/v1/medical-stat/dashboard')
      .then(j => { if (j.success) setData(j.data); else message.error('โหลดข้อมูลไม่สำเร็จ') })
      .finally(() => setLoading(false))
  }, [message])

  // จุดประสงค์: ผู้ขอเอาข้อมูลไปทำอะไร (แกนหลักของ dashboard นี้)
  const purposeOption = useMemo(() => {
    const d = [...(data?.by_purpose ?? [])].sort((a, b) => a.value - b.value)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tip },
      grid: { left: 8, right: 30, top: 10, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: txt }, splitLine: { lineStyle: { color: split } } },
      yAxis: { type: 'category', data: d.map(x => x.name), axisLabel: { color: txt }, axisLine: { lineStyle: { color: split } } },
      series: [{ type: 'bar', barWidth: 16, data: d.map((x, i) => ({ value: x.value, itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [0, 6, 6, 0] } })), label: { show: true, position: 'right', color: txt } }],
    }
  }, [data, isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  const urgencyOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', ...tip },
    legend: { bottom: 0, textStyle: { color: txt } },
    series: [{ type: 'pie', radius: ['45%', '70%'], center: ['50%', '44%'], data: (data?.by_urgency ?? []).map(x => ({ name: x.name, value: x.value, itemStyle: { color: x.color ?? undefined } })), label: { color: txt, formatter: '{b}\n{c}' } }],
  }), [data, isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  const statusOption = useMemo(() => {
    const colorMap: Record<string, string> = { pending: '#f59e0b', processing: '#0ea5e9', delivered: '#10b981', rejected: '#ef4444' }
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', ...tip },
      legend: { bottom: 0, textStyle: { color: txt } },
      series: [{ type: 'pie', radius: ['45%', '70%'], center: ['50%', '44%'], data: (data?.by_status ?? []).map(x => ({ name: STATUS_LABEL[x.name] ?? x.name, value: x.value, itemStyle: { color: colorMap[x.name] } })), label: { color: txt, formatter: '{b}\n{c}' } }],
    }
  }, [data, isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  const monthOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...tip },
    grid: { left: 8, right: 16, top: 20, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: (data?.by_month ?? []).map(x => x.ym), axisLabel: { color: txt }, axisLine: { lineStyle: { color: split } } },
    yAxis: { type: 'value', axisLabel: { color: txt }, splitLine: { lineStyle: { color: split } } },
    series: [{ type: 'bar', barWidth: 18, data: (data?.by_month ?? []).map(x => x.value), itemStyle: { borderRadius: [6, 6, 0, 0], color: ACCENT } }],
  }), [data, isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  const deptOption = useMemo(() => {
    const d = [...(data?.by_department ?? [])].sort((a, b) => a.value - b.value)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tip },
      grid: { left: 8, right: 30, top: 10, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: txt }, splitLine: { lineStyle: { color: split } } },
      yAxis: { type: 'category', data: d.map(x => x.name), axisLabel: { color: txt }, axisLine: { lineStyle: { color: split } } },
      series: [{ type: 'bar', barWidth: 14, data: d.map((x, i) => ({ value: x.value, itemStyle: { color: PALETTE[(i + 3) % PALETTE.length], borderRadius: [0, 6, 6, 0] } })), label: { show: true, position: 'right', color: txt } }],
    }
  }, [data, isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  const t = data?.totals
  const cards = [
    { label: 'คำขอทั้งหมด', v: t?.total ?? 0, c: '#0891b2' },
    { label: 'รอตรวจสอบ', v: t?.pending ?? 0, c: '#f59e0b' },
    { label: 'กำลังจัดทำ', v: t?.processing ?? 0, c: ACCENT },
    { label: 'ส่งมอบแล้ว', v: t?.delivered ?? 0, c: '#10b981' },
    { label: 'ไม่อนุมัติ', v: t?.rejected ?? 0, c: '#ef4444' },
  ]

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: 'งานข้อมูลทางการแพทย์' },
          { title: 'Dashboard คำขอข้อมูล' },
        ]} className="mb-6" />
        <div className="mb-6">
          <Title level={2} className="m-0" style={{ display: 'flex', alignItems: 'center', gap: 10, color: ACCENT }}><FaChartPie /> Dashboard คำขอข้อมูลสถิติ</Title>
          <Text type="secondary">ภาพรวมคำขอ และสถิติว่าผู้ขอนำข้อมูลไปใช้เพื่อจุดประสงค์ใด</Text>
        </div>

        <Spin spinning={loading}>
          {!data ? <Empty description="ยังไม่มีข้อมูล" /> : (
            <>
              <Row gutter={16} className="mb-6">
                {cards.map((s, i) => (
                  <Col xs={12} md={Math.floor(24 / cards.length)} key={i}>
                    <Card variant="borderless" className="rounded-xl text-center">
                      <div style={{ fontSize: 30, fontWeight: 700, color: s.c }}>{s.v}</div>
                      <Text type="secondary">{s.label}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card variant="borderless" className="rounded-xl" title="จุดประสงค์การขอข้อมูล (นำไปทำอะไร)">
                    <EChart option={purposeOption} height={320} />
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card variant="borderless" className="rounded-xl" title="สัดส่วนตามความเร่งด่วน">
                    <EChart option={urgencyOption} height={320} />
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card variant="borderless" className="rounded-xl" title="สัดส่วนตามสถานะ">
                    <EChart option={statusOption} height={300} />
                  </Card>
                </Col>
                <Col xs={24} lg={14}>
                  <Card variant="borderless" className="rounded-xl" title="จำนวนคำขอรายเดือน (12 เดือนล่าสุด)">
                    <EChart option={monthOption} height={300} />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card variant="borderless" className="rounded-xl" title="หน่วยงานที่ขอข้อมูลมากที่สุด (Top 10)">
                    <EChart option={deptOption} height={320} />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Spin>
      </div>
    </div>
  )
}

export default function StatisticsRequestDashboardPage() {
  return <AppThemeProvider colorPrimary={ACCENT}><PageContent /></AppThemeProvider>
}
