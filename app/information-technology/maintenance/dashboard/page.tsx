'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Card, Typography, ConfigProvider, Breadcrumb, Row, Col, theme, App,
  Tag, Progress, Space, Empty, Spin
} from 'antd'
import {
  HomeOutlined, ToolOutlined, ClockCircleOutlined, CheckCircleOutlined,
  RiseOutlined
} from '@ant-design/icons'
import {
  FaMicrochip, FaDesktop, FaTachometerAlt, FaTools, FaFire, FaThLarge, FaUserCog
} from 'react-icons/fa'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { StatCard, type Accent } from '@/app/components/StatCard'
import EChart from '../../../components/EChart'

const { Title, Text } = Typography

type RepairStats = {
  totals: {
    all: number; pending: number; inProgress: number; completed: number; cancelled: number
    avgHours: number | null; medianHours: number | null; completedWithDuration: number
    onTimePct: number | null; onTimeSample: number
  }
  byEquipmentType: { name: string; value: number }[]
  durationByEquipmentType: { name: string; avgHours: number | null; n: number }[]
  heatmap: { name: string; ym: string; value: number }[]
  monthlyReceived: { ym: string; value: number }[]
  monthlyCompleted: { ym: string; value: number }[]
  byAssessment: { name: string; value: number }[]
}

const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${TH_MON[m - 1]} ${String(y + 543).slice(-2)}`
}

const ASSESSMENT_COLORS: Record<string, string> = {
  'ซ่อมได้ — ไม่ใช้อะไหล่': '#22c55e',
  'ซ่อมได้ — ใช้อะไหล่ในคลัง': '#06b6d4',
  'ซ่อมได้ — ต้องสั่งซื้ออะไหล่': '#f59e0b',
  'ซ่อมไม่ได้ — แนะนำซื้อทดแทน': '#f97316',
  'ซ่อมไม่ได้ — จ้างบริษัทภายนอก': '#ef4444',
  'ยังไม่ประเมิน': '#6b7280',
}

const PageContent = () => {
  const { message } = App.useApp()
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  const [stats, setStats] = useState<RepairStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/it/repair-requests/stats')
        const json = await res.json()
        if (json?.success) setStats(json.data)
        else message.error(json?.message || 'โหลดข้อมูลไม่สำเร็จ')
      } catch {
        message.error('โหลดข้อมูลไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── สี canvas ตามธีม (ECharts วาดบน canvas ใช้ var(--app-*) ไม่ได้) ──
  const cAxis = isDark ? '#e2e8f0' : '#334155'
  const cMuted = isDark ? '#94a3b8' : '#64748b'
  const cGrid = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)'

  const totals = stats?.totals

  // ── "ซ่อมอะไรบ่อย" — ประเภทอุปกรณ์ ──
  const equipmentOption = useMemo(() => {
    const data = stats?.byEquipmentType ?? []
    if (data.length === 0) return null
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 24, bottom: 8, top: 16, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: cMuted }, splitLine: { lineStyle: { color: cGrid } } },
      yAxis: {
        type: 'category', inverse: true,
        data: data.map(d => d.name),
        axisLabel: { color: cAxis, fontSize: 12 },
      },
      series: [{
        type: 'bar',
        data: data.map((d, i) => ({
          value: d.value,
          itemStyle: { color: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#f43f5e'][i % 7], borderRadius: [0, 6, 6, 0] },
        })),
        label: { show: true, position: 'right', color: cAxis, fontWeight: 600 },
        barMaxWidth: 26,
      }],
    }
  }, [stats, cAxis, cMuted, cGrid])

  // ── สัดส่วนสถานะ ──
  const statusOption = useMemo(() => {
    if (!totals) return null
    const data = [
      { name: 'รอดำเนินการ', value: totals.pending, color: '#f59e0b' },
      { name: 'กำลังซ่อม', value: totals.inProgress, color: '#3b82f6' },
      { name: 'ซ่อมเสร็จ', value: totals.completed, color: '#22c55e' },
      { name: 'ปฏิเสธ', value: totals.cancelled, color: '#6b7280' },
    ].filter(d => d.value > 0)
    if (data.length === 0) return null
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> รายการ ({d}%)' },
      legend: { bottom: 0, textStyle: { color: cAxis, fontSize: 12 }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie',
        radius: ['55%', '78%'],
        center: ['50%', '42%'],
        itemStyle: { borderColor: isDark ? '#1e293b' : '#ffffff', borderWidth: 3 },
        label: { show: true, color: cAxis, formatter: '{b}\n{c}', fontSize: 12 },
        data: data.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
      }],
    }
  }, [totals, cAxis, isDark])

  // ── ระยะเวลาที่ซ่อม — เฉลี่ยต่อประเภทอุปกรณ์ ──
  const durationOption = useMemo(() => {
    const data = (stats?.durationByEquipmentType ?? []).filter(d => d.avgHours != null)
    if (data.length === 0) return null
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (p: { dataIndex: number }[]) => {
          const d = data[p[0].dataIndex]
          return `<b>${d.name}</b><br/>เฉลี่ย ${d.avgHours} ชม. (${d.n} รายการ)`
        },
      },
      grid: { left: 8, right: 40, bottom: 8, top: 16, containLabel: true },
      xAxis: { type: 'value', name: 'ชั่วโมง', axisLabel: { color: cMuted }, splitLine: { lineStyle: { color: cGrid } } },
      yAxis: {
        type: 'category', inverse: true,
        data: data.map(d => d.name),
        axisLabel: { color: cAxis, fontSize: 12 },
      },
      series: [{
        type: 'bar',
        data: data.map(d => ({ value: d.avgHours, itemStyle: { color: '#3b82f6', borderRadius: [0, 6, 6, 0] } })),
        label: { show: true, position: 'right', color: cAxis, fontWeight: 600, formatter: '{c} ชม.' },
        barMaxWidth: 26,
      }],
    }
  }, [stats, cAxis, cMuted, cGrid])

  // ── Heatmap ประเภทอุปกรณ์ × เดือน ──
  const heatmapOption = useMemo(() => {
    const rows = stats?.heatmap ?? []
    if (rows.length === 0) return null
    const equipNames = Array.from(new Set(rows.map(r => r.name)))
    const months = Array.from(new Set(rows.map(r => r.ym))).sort()
    const maxVal = Math.max(...rows.map(r => r.value), 1)
    const data = rows.map(r => [months.indexOf(r.ym), equipNames.indexOf(r.name), r.value])
    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        formatter: (p: { data: [number, number, number] }) =>
          `${equipNames[p.data[1]]}<br/>${monthLabel(months[p.data[0]])}: <b>${p.data[2]}</b> รายการ`,
      },
      grid: { left: 8, right: 16, top: 16, bottom: 60, containLabel: true },
      xAxis: {
        type: 'category', data: months.map(monthLabel),
        splitArea: { show: true },
        axisLabel: { color: cAxis, fontSize: 11, rotate: 30 },
      },
      yAxis: {
        type: 'category', data: equipNames,
        splitArea: { show: true },
        axisLabel: { color: cAxis, fontSize: 11 },
      },
      visualMap: {
        min: 0, max: maxVal, calculable: true, orient: 'horizontal',
        left: 'center', bottom: 0,
        textStyle: { color: cMuted },
        inRange: { color: isDark ? ['#1e293b', '#3b82f6', '#a855f7'] : ['#eef2ff', '#818cf8', '#6d28d9'] },
      },
      series: [{
        type: 'heatmap',
        data,
        label: { show: true, color: isDark ? '#0f172a' : '#ffffff', fontWeight: 700 },
        itemStyle: { borderColor: isDark ? '#0f172a' : '#ffffff', borderWidth: 2 },
      }],
    }
  }, [stats, cAxis, cMuted, isDark])

  // ── Line + Bar รายเดือน: รับแจ้ง vs ซ่อมเสร็จ ──
  const monthlyOption = useMemo(() => {
    const received = stats?.monthlyReceived ?? []
    const completed = stats?.monthlyCompleted ?? []
    if (received.length === 0 && completed.length === 0) return null
    const months = Array.from(new Set([...received.map(r => r.ym), ...completed.map(r => r.ym)])).sort()
    const recMap = new Map(received.map(r => [r.ym, r.value]))
    const comMap = new Map(completed.map(r => [r.ym, r.value]))
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: cAxis }, top: 0 },
      grid: { left: 8, right: 16, bottom: 8, top: 36, containLabel: true },
      xAxis: { type: 'category', data: months.map(monthLabel), axisLabel: { color: cAxis } },
      yAxis: { type: 'value', axisLabel: { color: cMuted }, splitLine: { lineStyle: { color: cGrid } } },
      series: [
        {
          name: 'รับแจ้ง', type: 'bar',
          data: months.map(m => recMap.get(m) ?? 0),
          itemStyle: { color: '#a855f7', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 26,
        },
        {
          name: 'ซ่อมเสร็จ', type: 'line', smooth: true,
          data: months.map(m => comMap.get(m) ?? 0),
          symbol: 'circle', symbolSize: 8,
          lineStyle: { color: '#22c55e', width: 3 },
          itemStyle: { color: '#22c55e' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(34,197,94,0.35)' },
                { offset: 1, color: 'rgba(34,197,94,0)' },
              ],
            },
          },
        },
      ],
    }
  }, [stats, cAxis, cMuted, cGrid])

  // ── ความยากง่าย (ผลประเมินซ่อม) ──
  const assessmentOption = useMemo(() => {
    const data = stats?.byAssessment ?? []
    if (data.length === 0) return null
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> รายการ ({d}%)' },
      legend: { bottom: 0, textStyle: { color: cAxis, fontSize: 11 }, itemWidth: 10, itemHeight: 10, type: 'scroll' },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '42%'],
        itemStyle: { borderColor: isDark ? '#1e293b' : '#ffffff', borderWidth: 3 },
        label: { show: true, color: cAxis, formatter: '{d}%', fontSize: 12 },
        data: data.map(d => ({ name: d.name, value: d.value, itemStyle: { color: ASSESSMENT_COLORS[d.name] ?? '#94a3b8' } })),
      }],
    }
  }, [stats, cAxis, isDark])

  const empty = <Empty description={<span style={{ color: 'var(--app-text-2)' }}>ยังไม่มีข้อมูล</span>} style={{ padding: '40px 0' }} />

  return (
    <div className="min-h-screen w-full bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaMicrochip className="inline mr-1" /> งานคอมพิวเตอร์ฯ</> },
            { title: 'Dashboard งานซ่อมคอมพิวเตอร์' },
          ]}
          className="mb-4"
        />

        {/* Header banner */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #4C1D95 0%, #6B21A8 50%, #9333EA 100%)',
            border: 'none', borderRadius: 16, marginBottom: 20,
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={16}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}>
                  <FaTools className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>Dashboard งานซ่อมคอมพิวเตอร์</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                    สถิติจริงจากข้อมูลที่บันทึกในระบบแจ้งซ่อม
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="text-right">
                <Link href="/information-technology/maintenance">
                  <Tag color="white" style={{ background: 'rgba(255,255,255,0.2)', borderColor: 'transparent', color: '#fff', fontSize: 13, padding: '6px 14px', cursor: 'pointer' }}>
                    <ToolOutlined /> ไปหน้าแจ้งซ่อม
                  </Tag>
                </Link>
              </div>
            </Col>
          </Row>
        </Card>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : !totals ? empty : (
          <>
            {/* KPI cards */}
            <Row gutter={[16, 16]} className="mb-4">
              {([
                { title: 'คำขอทั้งหมด', value: totals.all, icon: <ToolOutlined />, accent: 'violet' as Accent },
                { title: 'รอดำเนินการ', value: totals.pending, icon: <ClockCircleOutlined />, accent: 'amber' as Accent },
                { title: 'กำลังซ่อม', value: totals.inProgress, icon: <FaUserCog />, accent: 'cyan' as Accent },
                { title: 'ซ่อมเสร็จ', value: totals.completed, icon: <CheckCircleOutlined />, accent: 'emerald' as Accent },
              ]).map((stat, i) => (
                <Col xs={12} md={6} key={i}>
                  <StatCard accent={stat.accent} isDark={isDark} label={stat.title} suffix="รายการ" value={stat.value} icon={stat.icon} />
                </Col>
              ))}
            </Row>

            {/* Duration + SLA row — "ระยะเวลาที่ซ่อม" */}
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={24} md={8}>
                <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
                  <div className="flex items-center justify-between mb-2">
                    <Space><ClockCircleOutlined style={{ color: '#3b82f6', fontSize: 18 }} /><Text strong style={{ color: 'var(--app-text)' }}>เวลาเฉลี่ยในการซ่อม</Text></Space>
                  </div>
                  {totals.avgHours == null ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>ยังไม่มีงานที่ซ่อมเสร็จ</Text>
                  ) : (
                    <>
                      <Text strong style={{ color: '#3b82f6', fontSize: 22 }}>{totals.avgHours}</Text>
                      <Text type="secondary" style={{ marginLeft: 4 }}>ชม./รายการ</Text>
                      <Progress percent={Math.min(100, (totals.avgHours / 72) * 100)} strokeColor={{ from: '#3b82f6', to: '#06b6d4' }} showInfo={false} style={{ marginTop: 8 }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>เฉลี่ยจากคำขอ {totals.completedWithDuration} รายการที่เสร็จสิ้น</Text>
                    </>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #8b5cf6' }}>
                  <div className="flex items-center justify-between mb-2">
                    <Space><FaTachometerAlt style={{ color: '#8b5cf6' }} /><Text strong style={{ color: 'var(--app-text)' }}>เวลามัธยฐาน (Median)</Text></Space>
                  </div>
                  {totals.medianHours == null ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>ยังไม่มีงานที่ซ่อมเสร็จ</Text>
                  ) : (
                    <>
                      <Text strong style={{ color: '#8b5cf6', fontSize: 22 }}>{totals.medianHours}</Text>
                      <Text type="secondary" style={{ marginLeft: 4 }}>ชม./รายการ</Text>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                        ค่ากึ่งกลาง — ไม่ถูกดึงโดยรายการที่ใช้เวลานานผิดปกติ
                      </Text>
                    </>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #22c55e' }}>
                  <div className="flex items-center justify-between mb-2">
                    <Space><RiseOutlined style={{ color: '#22c55e', fontSize: 18 }} /><Text strong style={{ color: 'var(--app-text)' }}>ซ่อมตรงกำหนด</Text></Space>
                    {totals.onTimePct != null && <Text strong style={{ color: '#22c55e', fontSize: 22 }}>{totals.onTimePct}%</Text>}
                  </div>
                  {totals.onTimePct == null ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>ยังไม่มีข้อมูลกำหนดเสร็จ (estimated_completion_date)</Text>
                  ) : (
                    <>
                      <Progress percent={totals.onTimePct} strokeColor={{ from: '#06b6d4', to: '#22c55e' }} showInfo={false} />
                      <Text type="secondary" style={{ fontSize: 12 }}>เทียบกับกำหนดเสร็จ {totals.onTimeSample} รายการ</Text>
                    </>
                  )}
                </Card>
              </Col>
            </Row>

            {/* Row 1: อะไรซ่อมบ่อย + สถานะ */}
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={24} lg={14}>
                <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}
                  title={<Space><FaDesktop style={{ color: '#3b82f6' }} /><span>ซ่อมอะไรบ่อย — ตามประเภทอุปกรณ์</span></Space>}
                  extra={<Tag color="processing">{(stats?.byEquipmentType ?? []).reduce((s, d) => s + d.value, 0)} รายการ</Tag>}
                >
                  {equipmentOption ? <EChart option={equipmentOption} height={Math.max(260, (stats?.byEquipmentType.length ?? 0) * 42)} /> : empty}
                </Card>
              </Col>
              <Col xs={24} lg={10}>
                <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #22c55e' }}
                  title={<Space><CheckCircleOutlined style={{ color: '#22c55e' }} /><span>สัดส่วนสถานะคำขอ</span></Space>}
                >
                  {statusOption ? <EChart option={statusOption} height={300} /> : empty}
                </Card>
              </Col>
            </Row>

            {/* Row 2: ระยะเวลาซ่อมตามอุปกรณ์ + ความยากง่าย */}
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={24} lg={14}>
                <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #06b6d4' }}
                  title={<Space><ClockCircleOutlined style={{ color: '#06b6d4' }} /><span>ระยะเวลาซ่อมเฉลี่ย — แยกตามประเภทอุปกรณ์</span></Space>}
                >
                  {durationOption ? <EChart option={durationOption} height={Math.max(260, (stats?.durationByEquipmentType.length ?? 0) * 42)} /> : empty}
                </Card>
              </Col>
              <Col xs={24} lg={10}>
                <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #f97316' }}
                  title={<Space><FaFire style={{ color: '#f97316' }} /><span>ความยากง่าย — ผลประเมินซ่อม</span></Space>}
                >
                  {assessmentOption ? <EChart option={assessmentOption} height={300} /> : empty}
                </Card>
              </Col>
            </Row>

            {/* Row 3: Heatmap */}
            <Row gutter={[16, 16]} className="mb-4">
              <Col span={24}>
                <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #a855f7' }}
                  title={<Space><FaThLarge style={{ color: '#a855f7' }} /><span>Heatmap ความถี่การซ่อม — ประเภทอุปกรณ์ × เดือน</span></Space>}
                >
                  {heatmapOption ? <EChart option={heatmapOption} height={Math.max(280, (new Set(stats?.heatmap.map(h => h.name)).size) * 44 + 100)} /> : empty}
                </Card>
              </Col>
            </Row>

            {/* Row 4: แนวโน้มรายเดือน */}
            <Row gutter={[16, 16]} className="mb-4">
              <Col span={24}>
                <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #a855f7' }}
                  title={<Space><FaTachometerAlt style={{ color: '#a855f7' }} /><span>แนวโน้มรายเดือน — รับแจ้ง vs ซ่อมเสร็จ</span></Space>}
                >
                  {monthlyOption ? <EChart option={monthlyOption} height={320} /> : empty}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </div>
    </div>
  )
}

export default function ITMaintenanceDashboardPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#6B21A8', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
