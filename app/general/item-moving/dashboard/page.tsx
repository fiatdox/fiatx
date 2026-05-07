'use client'
import React, { useMemo } from 'react'
import {
  Card, Typography, ConfigProvider, Breadcrumb, Row, Col, theme, App,
  Tag, Progress, Space, Divider, Avatar
} from 'antd'
import {
  HomeOutlined, ClockCircleOutlined, CheckCircleOutlined, SyncOutlined,
  FileDoneOutlined, EnvironmentOutlined, RiseOutlined, UserOutlined
} from '@ant-design/icons'
import {
  FaTruck, FaTools, FaChair, FaSeedling, FaTree, FaBuilding,
  FaTachometerAlt, FaChartPie, FaUsersCog, FaClipboardList
} from 'react-icons/fa'
import Navbar from '../../../components/Navbar'
import EChart from '../../../components/EChart'

const { Title, Text } = Typography

const PageContent = () => {
  // ── KPI summary (mock) ─────────────────────────────────
  const totalRequests = 246
  const pendingCount = 18
  const inProgressCount = 14
  const completedCount = 208
  const cancelledCount = 6
  const avgHours = 4.2
  const onTimePct = 91

  // ── Status breakdown ───────────────────────────────────
  const statusData = useMemo(() => ([
    { name: 'รอรับเรื่อง',     value: pendingCount,    color: '#f59e0b' },
    { name: 'กำลังดำเนินการ', value: inProgressCount, color: '#3b82f6' },
    { name: 'เสร็จสิ้น',       value: completedCount,  color: '#22c55e' },
    { name: 'ยกเลิก',          value: cancelledCount,  color: '#ef4444' },
  ]), [pendingCount, inProgressCount, completedCount, cancelledCount])

  // ── Job types ──────────────────────────────────────────
  const jobTypeData = useMemo(() => ([
    { name: 'ขนย้ายสิ่งของ / ครุภัณฑ์', value: 92, icon: <FaTruck />,    color: '#FF6500' },
    { name: 'จัดห้องประชุม / สถานที่',  value: 68, icon: <FaChair />,    color: '#f97316' },
    { name: 'ตัดหญ้า / จัดสวน',         value: 42, icon: <FaSeedling />, color: '#22c55e' },
    { name: 'ปรับทัศนียภาพพื้นที่',     value: 28, icon: <FaTree />,     color: '#0d9488' },
    { name: 'อื่นๆ',                    value: 16, icon: <FaTools />,    color: '#a855f7' },
  ]), [])

  // ── Monthly trend ──────────────────────────────────────
  const monthData = useMemo(() => ([
    { m: 'ต.ค.', req: 18, done: 17 },
    { m: 'พ.ย.', req: 22, done: 20 },
    { m: 'ธ.ค.', req: 28, done: 26 },
    { m: 'ม.ค.', req: 24, done: 22 },
    { m: 'ก.พ.', req: 20, done: 19 },
    { m: 'มี.ค.', req: 26, done: 24 },
    { m: 'เม.ย.', req: 32, done: 28 },
    { m: 'พ.ค.', req: 24, done: 22 },
    { m: 'มิ.ย.', req: 18, done: 17 },
    { m: 'ก.ค.', req: 14, done: 13 },
    { m: 'ส.ค.', req: 12, done: 11 },
    { m: 'ก.ย.', req: 8,  done: 7 },
  ]), [])

  // ── Top locations ──────────────────────────────────────
  const locationData = useMemo(() => ([
    { name: 'ห้องประชุมใหญ่ (อาคารอำนวยการ)', value: 38 },
    { name: 'อาคารผู้ป่วยนอก',                value: 34 },
    { name: 'ลานจอดรถ / ทางเข้าหลัก',          value: 26 },
    { name: 'อาคารผู้ป่วยใน 1',                 value: 22 },
    { name: 'ห้องประชุมเล็ก ชั้น 3',           value: 18 },
    { name: 'สวนหย่อม / ลานหน้าตึก',           value: 16 },
    { name: 'คลังพัสดุ',                       value: 14 },
    { name: 'อื่นๆ',                           value: 24 },
  ]), [])

  // ── Department usage ───────────────────────────────────
  const departmentData = useMemo(() => ([
    { name: 'กลุ่มงานบริหารทั่วไป',  value: 48, color: '#FF6500' },
    { name: 'กลุ่มงานการพยาบาล',     value: 42, color: '#f97316' },
    { name: 'กลุ่มงานการแพทย์',      value: 36, color: '#facc15' },
    { name: 'กลุ่มงานเภสัชกรรม',     value: 24, color: '#a3e635' },
    { name: 'กลุ่มงานพัสดุ',         value: 22, color: '#22c55e' },
    { name: 'กลุ่มงานทันตกรรม',      value: 14, color: '#0d9488' },
  ]), [])

  // ── Avg completion time per job type (hours) ───────────
  const completionTimeData = useMemo(() => ([
    { name: 'ขนย้ายสิ่งของ', value: 3.8 },
    { name: 'จัดสถานที่',    value: 5.2 },
    { name: 'ตัดหญ้า',       value: 4.5 },
    { name: 'ปรับทัศนียภาพ', value: 6.8 },
    { name: 'อื่นๆ',         value: 2.4 },
  ]), [])

  // ── Field staff performance ────────────────────────────
  const staffData = useMemo(() => ([
    { name: 'นายถวิล ขยันยิ่ง',   jobs: 62, onTime: 96 },
    { name: 'นายประสาน รักงาน',  jobs: 54, onTime: 92 },
    { name: 'นายสมพร แข็งแรง',   jobs: 48, onTime: 89 },
    { name: 'นายวิชัย ตรงเวลา',  jobs: 42, onTime: 94 },
  ]), [])

  // ── ECharts options ────────────────────────────────────
  const statusOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> รายการ ({d}%)' },
    legend: {
      bottom: 0, type: 'scroll',
      textStyle: { color: '#cbd5e1', fontSize: 12 },
      itemWidth: 10, itemHeight: 10
    },
    series: [{
      type: 'pie',
      radius: ['52%', '78%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#0f172a', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c}', color: '#e2e8f0', fontSize: 11 },
      labelLine: { length: 8, length2: 6 },
      data: statusData.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }]
  }), [statusData])

  const jobTypeOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: jobTypeData.map(d => d.name),
      axisLabel: { color: '#cbd5e1', fontSize: 11, interval: 0, rotate: 14 }
    },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
    series: [{
      type: 'bar',
      data: jobTypeData.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [6, 6, 0, 0] } })),
      label: { show: true, position: 'top', color: '#e2e8f0', fontWeight: 600 },
      barMaxWidth: 56,
    }]
  }), [jobTypeData])

  const monthOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, textStyle: { color: '#cbd5e1' }, data: ['คำขอ', 'เสร็จสิ้น'] },
    grid: { left: 8, right: 16, bottom: 8, top: 36, containLabel: true },
    xAxis: { type: 'category', data: monthData.map(d => d.m), axisLabel: { color: '#cbd5e1' } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
    series: [
      {
        name: 'คำขอ',
        type: 'bar',
        data: monthData.map(d => d.req),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#FF6500' }, { offset: 1, color: '#facc15' }]
          }
        },
        barMaxWidth: 18
      },
      {
        name: 'เสร็จสิ้น',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: monthData.map(d => d.done),
        lineStyle: { color: '#22c55e', width: 3 },
        itemStyle: { color: '#22c55e' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34, 197, 94, 0.30)' },
              { offset: 1, color: 'rgba(34, 197, 94, 0.02)' }
            ]
          }
        }
      },
    ]
  }), [monthData])

  const locationOption = useMemo(() => {
    const sorted = [...locationData].sort((a, b) => a.value - b.value)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 32, bottom: 8, top: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
      yAxis: {
        type: 'category',
        data: sorted.map(d => d.name),
        axisLabel: { color: '#cbd5e1', fontSize: 12 }
      },
      series: [{
        type: 'bar',
        data: sorted.map(d => d.value),
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#FF6500' },
              { offset: 1, color: '#facc15' }
            ]
          }
        },
        label: { show: true, position: 'right', color: '#e2e8f0', fontWeight: 600 },
        barMaxWidth: 22,
      }]
    }
  }, [locationData])

  const departmentOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> งาน ({d}%)' },
    legend: {
      bottom: 0, type: 'scroll',
      textStyle: { color: '#cbd5e1', fontSize: 11 },
      itemWidth: 10, itemHeight: 10
    },
    series: [{
      type: 'pie',
      radius: ['0%', '70%'],
      center: ['50%', '42%'],
      roseType: 'radius',
      itemStyle: { borderColor: '#0f172a', borderWidth: 2 },
      label: { color: '#e2e8f0', fontSize: 11, formatter: '{c}' },
      data: departmentData.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }]
  }), [departmentData])

  const completionTimeOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v} ชม.` },
    grid: { left: 8, right: 24, bottom: 8, top: 16, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: (v: number) => `${v}h` } },
    yAxis: {
      type: 'category',
      data: completionTimeData.map(d => d.name),
      axisLabel: { color: '#cbd5e1' }
    },
    series: [{
      type: 'bar',
      data: completionTimeData.map(d => d.value),
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#06b6d4' }
          ]
        }
      },
      label: { show: true, position: 'right', color: '#e2e8f0', fontWeight: 600, formatter: (p: { value: number }) => `${p.value} ชม.` },
      barMaxWidth: 22,
    }]
  }), [completionTimeData])

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FaBuilding className="inline mr-1" /> งานบริหารงานทั่วไป</> },
            { title: <><FaTruck className="inline mr-1" /> ขอย้ายสิ่งของ / จัดสถานที่</> },
            { title: 'Dashboard ภาพรวม' },
          ]}
          className="mb-4"
        />

        {/* Header banner */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #FF6500 0%, #f97316 50%, #facc15 100%)',
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
                  <FaTruck className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>Dashboard งานสนาม / ขอย้ายสิ่งของ</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                    สรุปคำขอบริการขนย้าย จัดสถานที่ ตัดหญ้า ปรับภูมิทัศน์ และประสิทธิภาพการให้บริการ
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="text-right">
                <Tag color="white" style={{ background: 'rgba(255,255,255,0.18)', borderColor: 'transparent', color: '#fff', fontSize: 13, padding: '4px 12px' }}>
                  ปีงบประมาณ 2569
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* KPI cards */}
        <Row gutter={[16, 16]} className="mb-4">
          {[
            { title: 'คำขอทั้งหมด',     value: totalRequests,   icon: <FaClipboardList />,     color: '#FF6500', suffix: 'รายการ' },
            { title: 'รอรับเรื่อง',     value: pendingCount,    icon: <ClockCircleOutlined />, color: '#f59e0b', suffix: 'รายการ' },
            { title: 'กำลังดำเนินการ', value: inProgressCount, icon: <SyncOutlined spin />,   color: '#3b82f6', suffix: 'รายการ' },
            { title: 'เสร็จสิ้น',       value: completedCount,  icon: <CheckCircleOutlined />, color: '#22c55e', suffix: 'รายการ' },
          ].map((stat, i) => (
            <Col xs={12} md={6} key={i}>
              <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: 20 } }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 48, height: 48, backgroundColor: `${stat.color}1f`, color: stat.color, fontSize: 22 }}
                  >
                    {stat.icon}
                  </div>
                  <div className="flex-1">
                    <Text type="secondary" style={{ fontSize: 12 }}>{stat.title}</Text>
                    <div className="flex items-baseline gap-2">
                      <Text strong style={{ fontSize: 28, lineHeight: 1.1, color: stat.color }}>{stat.value}</Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>{stat.suffix}</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* SLA row */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} md={12}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #22c55e' }}>
              <Space align="center" size="middle" style={{ width: '100%' }}>
                <Avatar size={44} style={{ background: '#22c55e1f', color: '#22c55e' }} icon={<FileDoneOutlined />} />
                <div className="flex-1">
                  <Text type="secondary" style={{ fontSize: 12 }}>ส่งงานตรงเวลา (On-time)</Text>
                  <div className="flex items-baseline gap-2">
                    <Text strong style={{ fontSize: 26, color: '#22c55e' }}>{onTimePct}%</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>จาก {completedCount} งาน</Text>
                  </div>
                  <Progress percent={onTimePct} strokeColor="#22c55e" showInfo={false} size="small" />
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
              <Space align="center" size="middle" style={{ width: '100%' }}>
                <Avatar size={44} style={{ background: '#3b82f61f', color: '#3b82f6' }} icon={<ClockCircleOutlined />} />
                <div className="flex-1">
                  <Text type="secondary" style={{ fontSize: 12 }}>ระยะเวลาเฉลี่ยต่องาน</Text>
                  <div className="flex items-baseline gap-2">
                    <Text strong style={{ fontSize: 26, color: '#3b82f6' }}>{avgHours}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>ชั่วโมง / งาน</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>ตั้งแต่รับเรื่อง → ปิดงาน</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Row: status + monthly trend */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={9}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #f59e0b' }}
              title={<Space><FaChartPie style={{ color: '#f59e0b' }} /><span>สถานะคำขอ</span></Space>}
              extra={<Tag color="orange">{totalRequests} รายการ</Tag>}
            >
              <EChart option={statusOption} height={340} />
            </Card>
          </Col>
          <Col xs={24} lg={15}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #FF6500' }}
              title={<Space><RiseOutlined style={{ color: '#FF6500' }} /><span>คำขอ vs เสร็จสิ้น (รายเดือน)</span></Space>}
              extra={<Tag color="success">เฉลี่ย {(completedCount / 12).toFixed(1)} งาน/เดือน</Tag>}
            >
              <EChart option={monthOption} height={340} />
            </Card>
          </Col>
        </Row>

        {/* Job types section */}
        <Title level={4} style={{ color: '#FF6500', marginTop: 8, marginBottom: 8 }}>
          แยกตามประเภทงาน
        </Title>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={14}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #FF6500' }}
              title={<Space><FaTools style={{ color: '#FF6500' }} /><span>จำนวนงานแต่ละประเภท</span></Space>}
            >
              <EChart option={jobTypeOption} height={320} />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #06b6d4' }}
              title={<Space><ClockCircleOutlined style={{ color: '#06b6d4' }} /><span>ระยะเวลาเฉลี่ยต่อประเภทงาน</span></Space>}
            >
              <EChart option={completionTimeOption} height={320} />
            </Card>
          </Col>
        </Row>

        {/* Job type cards */}
        <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: '#facc15' }}>
            สัดส่วนงานแต่ละประเภท
          </Title>
          <Row gutter={[12, 12]}>
            {jobTypeData.map((j) => {
              const totalJobs = jobTypeData.reduce((s, d) => s + d.value, 0)
              const pct = Math.round((j.value / totalJobs) * 100)
              return (
                <Col xs={12} md={8} lg={Math.floor(24 / jobTypeData.length) || 4} key={j.name}>
                  <Card
                    size="small"
                    style={{ borderRadius: 10, borderTop: `3px solid ${j.color}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar size={32} style={{ background: `${j.color}1f`, color: j.color, fontSize: 16 }} icon={j.icon} />
                      <Text strong style={{ color: '#e2e8f0', fontSize: 12 }}>{j.name}</Text>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <Text strong style={{ fontSize: 22, color: j.color }}>{j.value}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>งาน ({pct}%)</Text>
                    </div>
                    <Progress percent={pct} strokeColor={j.color} showInfo={false} size="small" />
                  </Card>
                </Col>
              )
            })}
          </Row>
        </Card>

        {/* Locations + departments */}
        <Title level={4} style={{ color: '#0d9488', marginTop: 8, marginBottom: 8 }}>
          พื้นที่ปฏิบัติงาน / หน่วยงานที่ขอบริการ
        </Title>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={14}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #FF6500' }}
              title={<Space><EnvironmentOutlined style={{ color: '#FF6500' }} /><span>สถานที่ขอบริการบ่อยที่สุด</span></Space>}
              extra={<Tag color="orange">Top {locationData.length}</Tag>}
            >
              <EChart option={locationOption} height={360} />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #14b8a6' }}
              title={<Space><FaBuilding style={{ color: '#14b8a6' }} /><span>หน่วยงานที่ขอบริการ</span></Space>}
              extra={<Tag color="cyan">{departmentData.reduce((s, d) => s + d.value, 0)} งาน</Tag>}
            >
              <EChart option={departmentOption} height={360} />
            </Card>
          </Col>
        </Row>

        {/* Field staff performance */}
        <Card variant="borderless" style={{ borderRadius: 12 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: '#a855f7' }}>
            <FaUsersCog style={{ marginRight: 8 }} />
            ประสิทธิภาพเจ้าหน้าที่งานสนาม
          </Title>
          <Divider style={{ margin: '8px 0 16px' }} />
          {staffData.map((s) => {
            const onTimeColor = s.onTime >= 95 ? '#22c55e' : s.onTime >= 90 ? '#facc15' : '#f97316'
            return (
              <div key={s.name} className="mb-4">
                <Row gutter={[12, 8]} align="middle">
                  <Col xs={24} md={8}>
                    <Space>
                      <Avatar size={32} icon={<UserOutlined />} style={{ background: '#a855f71f', color: '#a855f7' }} />
                      <Text strong style={{ color: '#e2e8f0' }}>{s.name}</Text>
                    </Space>
                  </Col>
                  <Col xs={12} md={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>งานที่รับ</Text>
                    <div><Text strong style={{ color: '#06b6d4' }}>{s.jobs}</Text></div>
                  </Col>
                  <Col xs={12} md={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>ตรงเวลา</Text>
                    <div><Text strong style={{ color: onTimeColor }}>{s.onTime}%</Text></div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Progress percent={s.onTime} strokeColor={onTimeColor} showInfo={false} />
                  </Col>
                </Row>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

export default function ItemMovingDashboardPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
