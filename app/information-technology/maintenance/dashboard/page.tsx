'use client'
import React, { useMemo } from 'react'
import {
  Card, Typography, ConfigProvider, Breadcrumb, Row, Col, theme, App,
  Tag, Progress, Space, Divider, Avatar, Tooltip
} from 'antd'
import {
  HomeOutlined, ToolOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, FireOutlined, RiseOutlined, UserOutlined
} from '@ant-design/icons'
import {
  FaMicrochip, FaDesktop, FaLaptop, FaPrint, FaNetworkWired, FaKeyboard,
  FaTachometerAlt, FaTools, FaExclamationTriangle, FaUserCog, FaBuilding
} from 'react-icons/fa'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { StatCard, type Accent } from '@/app/components/StatCard'
import EChart from '../../../components/EChart'

const { Title, Text } = Typography

const PageContent = () => {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  // ── KPI ──
  const totals = {
    all: 248,
    pending: 21,
    inProgress: 14,
    completed: 207,
    cancelled: 6,
    avgHours: 7.4,
    slaPct: 92,
  }

  // ── Device type breakdown ──
  const deviceTypeData = useMemo(() => ([
    { name: 'Desktop', value: 78, color: '#3b82f6', icon: 'FaDesktop' },
    { name: 'Notebook', value: 52, color: '#8b5cf6', icon: 'FaLaptop' },
    { name: 'Printer', value: 47, color: '#f59e0b', icon: 'FaPrint' },
    { name: 'Network', value: 28, color: '#10b981', icon: 'FaNetworkWired' },
    { name: 'Scanner', value: 21, color: '#06b6d4', icon: 'FaKeyboard' },
    { name: 'Peripheral', value: 22, color: '#ec4899', icon: 'FaKeyboard' },
  ]), [])

  // ── Status pie ──
  const statusData = useMemo(() => ([
    { name: 'รอดำเนินการ', value: totals.pending, color: '#f59e0b' },
    { name: 'กำลังซ่อม', value: totals.inProgress, color: '#3b82f6' },
    { name: 'ซ่อมเสร็จ', value: totals.completed, color: '#22c55e' },
    { name: 'ยกเลิก', value: totals.cancelled, color: '#6b7280' },
  ]), [totals])

  // ── Urgency ──
  const urgencyData = useMemo(() => ([
    { name: 'ด่วนที่สุด', value: 9, color: '#7f1d1d' },
    { name: 'ด่วน', value: 38, color: '#ef4444' },
    { name: 'ปานกลาง', value: 142, color: '#f59e0b' },
    { name: 'ปกติ', value: 59, color: '#22c55e' },
  ]), [])

  // ── Monthly trend ──
  const monthlyData = useMemo(() => ([
    { m: 'ต.ค.', received: 18, completed: 16 },
    { m: 'พ.ย.', received: 22, completed: 20 },
    { m: 'ธ.ค.', received: 26, completed: 24 },
    { m: 'ม.ค.', received: 21, completed: 19 },
    { m: 'ก.พ.', received: 24, completed: 22 },
    { m: 'มี.ค.', received: 28, completed: 26 },
    { m: 'เม.ย.', received: 31, completed: 27 },
    { m: 'พ.ค.', received: 29, completed: 25 },
    { m: 'มิ.ย.', received: 25, completed: 24 },
    { m: 'ก.ค.', received: 24, completed: 24 },
  ]), [])

  // ── Top departments ──
  const departmentData = useMemo(() => ([
    { name: 'งานเวชระเบียน', value: 38 },
    { name: 'งานการพยาบาล OPD', value: 32 },
    { name: 'งานการเงินและบัญชี', value: 27 },
    { name: 'งานพัสดุ', value: 22 },
    { name: 'งาน HR', value: 19 },
    { name: 'งานอุบัติเหตุ ER', value: 17 },
    { name: 'งานเภสัชกรรม', value: 15 },
    { name: 'งานบริหารทั่วไป', value: 14 },
  ]), [])

  // ── Top technicians ──
  const technicianData = useMemo(() => ([
    { name: 'นายวิชัย คอมดี', total: 68, completed: 64, color: '#22c55e' },
    { name: 'นายเทคโน สมาร์ท', total: 54, completed: 50, color: '#3b82f6' },
    { name: 'นายอนันต์ ระบบดี', total: 47, completed: 41, color: '#8b5cf6' },
    { name: 'น.ส.ปริญญา ไอที', total: 41, completed: 39, color: '#ec4899' },
    { name: 'นายสมศักดิ์ เน็ตเวิร์ค', total: 38, completed: 37, color: '#f59e0b' },
  ]), [])

  // ── ECharts options ──
  const deviceTypeOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: deviceTypeData.map(d => d.name),
      axisLabel: { color: 'var(--app-text)', fontSize: 12 }
    },
    yAxis: { type: 'value', axisLabel: { color: 'var(--app-text-2)' } },
    series: [{
      type: 'bar',
      data: deviceTypeData.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [6, 6, 0, 0] } })),
      label: { show: true, position: 'top', color: 'var(--app-text)', fontWeight: 600 },
      barMaxWidth: 48,
    }]
  }), [deviceTypeData])

  const statusOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> รายการ ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: 'var(--app-text)', fontSize: 12 },
      itemWidth: 10, itemHeight: 10
    },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '42%'],
      itemStyle: { borderColor: 'var(--app-bg)', borderWidth: 3 },
      label: { show: true, color: 'var(--app-text)', formatter: '{b}\n{c}', fontSize: 12 },
      data: statusData.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }]
  }), [statusData])

  const urgencyOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 28, bottom: 8, top: 8, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: 'var(--app-text-2)' } },
    yAxis: {
      type: 'category',
      data: urgencyData.map(d => d.name),
      axisLabel: { color: 'var(--app-text)', fontSize: 12 }
    },
    series: [{
      type: 'bar',
      data: urgencyData.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [0, 6, 6, 0] } })),
      label: { show: true, position: 'right', color: 'var(--app-text)', fontWeight: 600 },
      barMaxWidth: 28,
    }]
  }), [urgencyData])

  const monthlyOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: 'var(--app-text)' }, top: 0 },
    grid: { left: 8, right: 16, bottom: 8, top: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: monthlyData.map(d => d.m),
      axisLabel: { color: 'var(--app-text)' }
    },
    yAxis: { type: 'value', axisLabel: { color: 'var(--app-text-2)' } },
    series: [
      {
        name: 'รับแจ้ง',
        type: 'bar',
        data: monthlyData.map(d => d.received),
        itemStyle: { color: '#a855f7', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 22,
      },
      {
        name: 'ซ่อมเสร็จ',
        type: 'line',
        smooth: true,
        data: monthlyData.map(d => d.completed),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#22c55e', width: 3 },
        itemStyle: { color: '#22c55e' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34,197,94,0.35)' },
              { offset: 1, color: 'rgba(34,197,94,0)' }
            ]
          }
        }
      },
    ]
  }), [monthlyData])

  const departmentOption = useMemo(() => {
    const sorted = [...departmentData].sort((a, b) => a.value - b.value)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 28, bottom: 8, top: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: 'var(--app-text-2)' } },
      yAxis: {
        type: 'category',
        data: sorted.map(d => d.name),
        axisLabel: { color: 'var(--app-text)', fontSize: 12 }
      },
      series: [{
        type: 'bar',
        data: sorted.map(d => d.value),
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#6B21A8' },
              { offset: 1, color: '#a855f7' }
            ]
          }
        },
        label: { show: true, position: 'right', color: 'var(--app-text)', fontWeight: 600 },
        barMaxWidth: 22,
      }]
    }
  }, [departmentData])

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
            border: 'none',
            borderRadius: 16,
            marginBottom: 20,
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={16}>
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center rounded-2xl"
                  style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}
                >
                  <FaTools className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>Dashboard งานซ่อมคอมพิวเตอร์</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                    สรุปคำขอซ่อม สถานะงาน อุปกรณ์ และประสิทธิภาพการให้บริการของทีม IT
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

        {/* KPI cards */}
        <Row gutter={[16, 16]} className="mb-4">
          {([
            { title: 'คำขอทั้งหมด', value: totals.all, icon: <ToolOutlined />, accent: 'violet' as Accent, suffix: 'รายการ' },
            { title: 'รอดำเนินการ', value: totals.pending, icon: <ClockCircleOutlined />, accent: 'amber' as Accent, suffix: 'รายการ' },
            { title: 'กำลังซ่อม', value: totals.inProgress, icon: <FaUserCog />, accent: 'cyan' as Accent, suffix: 'รายการ' },
            { title: 'ซ่อมเสร็จ', value: totals.completed, icon: <CheckCircleOutlined />, accent: 'emerald' as Accent, suffix: 'รายการ' },
          ]).map((stat, i) => (
            <Col xs={12} md={6} key={i}>
              <StatCard accent={stat.accent} isDark={isDark} label={stat.title} suffix={stat.suffix} value={stat.value} icon={stat.icon} />
            </Col>
          ))}
        </Row>

        {/* SLA + Avg time row */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} md={12}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #22c55e' }}>
              <div className="flex items-center justify-between mb-2">
                <Space>
                  <RiseOutlined style={{ color: '#22c55e', fontSize: 18 }} />
                  <Text strong style={{ color: 'var(--app-text)' }}>SLA — งานเสร็จในเวลา</Text>
                </Space>
                <Text strong style={{ color: '#22c55e', fontSize: 22 }}>{totals.slaPct}%</Text>
              </div>
              <Progress percent={totals.slaPct} strokeColor={{ from: '#06b6d4', to: '#22c55e' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                เป้าหมาย ≥ 90% — ปัจจุบันผ่านเป้าหมาย
              </Text>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
              <div className="flex items-center justify-between mb-2">
                <Space>
                  <ClockCircleOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                  <Text strong style={{ color: 'var(--app-text)' }}>เวลาเฉลี่ยในการซ่อม</Text>
                </Space>
                <div>
                  <Text strong style={{ color: '#3b82f6', fontSize: 22 }}>{totals.avgHours}</Text>
                  <Text type="secondary" style={{ marginLeft: 4 }}>ชม./รายการ</Text>
                </div>
              </div>
              <Progress percent={Math.min(100, (totals.avgHours / 24) * 100)} strokeColor={{ from: '#3b82f6', to: '#06b6d4' }} showInfo={false} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                เฉลี่ยจากคำขอ {totals.completed} รายการที่เสร็จสิ้น
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Row 1: device type + status */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={14}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}
              title={
                <Space>
                  <FaDesktop style={{ color: '#3b82f6' }} />
                  <span>คำขอซ่อมตามประเภทอุปกรณ์</span>
                </Space>
              }
              extra={<Tag color="processing">{deviceTypeData.reduce((s, d) => s + d.value, 0)} รายการ</Tag>}
            >
              <EChart option={deviceTypeOption} height={320} />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #22c55e' }}
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: '#22c55e' }} />
                  <span>สัดส่วนสถานะคำขอ</span>
                </Space>
              }
            >
              <EChart option={statusOption} height={320} />
            </Card>
          </Col>
        </Row>

        {/* Row 2: urgency + monthly */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={10}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #ef4444' }}
              title={
                <Space>
                  <FireOutlined style={{ color: '#ef4444' }} />
                  <span>ระดับความเร่งด่วน</span>
                </Space>
              }
            >
              <EChart option={urgencyOption} height={300} />
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #a855f7' }}
              title={
                <Space>
                  <FaTachometerAlt style={{ color: '#a855f7' }} />
                  <span>แนวโน้มรายเดือน — รับแจ้ง vs ซ่อมเสร็จ</span>
                </Space>
              }
            >
              <EChart option={monthlyOption} height={300} />
            </Card>
          </Col>
        </Row>

        {/* Row 3: department + technician */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={14}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #6B21A8' }}
              title={
                <Space>
                  <FaBuilding style={{ color: '#a855f7' }} />
                  <span>หน่วยงานที่แจ้งซ่อมมากที่สุด (Top 8)</span>
                </Space>
              }
            >
              <EChart option={departmentOption} height={Math.max(280, departmentData.length * 38)} />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #f59e0b' }}
              title={
                <Space>
                  <FaUserCog style={{ color: '#f59e0b' }} />
                  <span>ประสิทธิภาพช่างซ่อม</span>
                </Space>
              }
            >
              {technicianData.map((t, i) => {
                const pct = Math.round((t.completed / t.total) * 100)
                return (
                  <div key={t.name} className={i === 0 ? '' : 'mt-3'}>
                    <div className="flex items-center justify-between mb-1">
                      <Space>
                        <Avatar size="small" style={{ backgroundColor: t.color }} icon={<UserOutlined />} />
                        <Text style={{ color: 'var(--app-text)' }}>{t.name}</Text>
                      </Space>
                      <div>
                        <Text strong style={{ color: t.color }}>{t.completed}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>/{t.total} ({pct}%)</Text>
                      </div>
                    </div>
                    <Progress percent={pct} strokeColor={t.color} showInfo={false} size="small" />
                  </div>
                )
              })}
              <Divider style={{ margin: '12px 0' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                <Tooltip title="คิดจากจำนวนงานที่ซ่อมเสร็จ ÷ งานที่ได้รับมอบหมาย">
                  อัตราการซ่อมเสร็จของช่างแต่ละคน
                </Tooltip>
              </Text>
            </Card>
          </Col>
        </Row>
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
