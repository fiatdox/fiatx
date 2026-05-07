'use client'
import React, { useMemo } from 'react'
import {
  Card, Typography, ConfigProvider, Breadcrumb, Row, Col, theme, App,
  Tag, Progress, Space, Divider, Avatar
} from 'antd'
import {
  HomeOutlined, CarOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, EnvironmentOutlined, RiseOutlined, UserOutlined
} from '@ant-design/icons'
import {
  FaCar, FaGasPump, FaRoad, FaTachometerAlt, FaMapMarkedAlt, FaUserTie,
  FaClipboardList, FaChartPie, FaBuilding
} from 'react-icons/fa'
import Navbar from '../../../components/Navbar'
import EChart from '../../../components/EChart'

const { Title, Text } = Typography

const PageContent = () => {
  // ── KPI summary (mock) ─────────────────────────────────
  const totalRequests = 168
  const pendingCount = 14
  const approvedCount = 138
  const rejectedCount = 16
  const totalKm = 28450
  const totalFuelCost = 142800
  const avgKmPerTrip = Math.round(totalKm / approvedCount)
  const utilizationPct = 78

  // ── Status breakdown ───────────────────────────────────
  const statusData = useMemo(() => ([
    { name: 'รอธุรการ', value: 6, color: '#f59e0b' },
    { name: 'รอผู้บริหาร', value: 5, color: '#a855f7' },
    { name: 'รอจัดสรรรถ', value: 3, color: '#3b82f6' },
    { name: 'อนุมัติแล้ว', value: 138, color: '#22c55e' },
    { name: 'ไม่อนุมัติ', value: 16, color: '#ef4444' },
  ]), [])

  // ── Monthly trips (request vs completed) ───────────────
  const monthData = useMemo(() => ([
    { m: 'ต.ค.', req: 12, done: 11 },
    { m: 'พ.ย.', req: 14, done: 13 },
    { m: 'ธ.ค.', req: 18, done: 16 },
    { m: 'ม.ค.', req: 16, done: 14 },
    { m: 'ก.พ.', req: 13, done: 12 },
    { m: 'มี.ค.', req: 19, done: 18 },
    { m: 'เม.ย.', req: 22, done: 20 },
    { m: 'พ.ค.', req: 17, done: 15 },
    { m: 'มิ.ย.', req: 14, done: 13 },
    { m: 'ก.ค.', req: 11, done: 10 },
    { m: 'ส.ค.', req: 8,  done: 7 },
    { m: 'ก.ย.', req: 4,  done: 4 },
  ]), [])

  // ── Fleet utilization ──────────────────────────────────
  const fleetData = useMemo(() => ([
    { plate: 'นข-1111', type: 'รถตู้',     trips: 48, km: 8420, hours: 312, color: '#3b82f6' },
    { plate: 'ฮฮ-2222', type: 'รถตู้',     trips: 41, km: 7180, hours: 286, color: '#3b82f6' },
    { plate: 'บบ-3333', type: 'รถกระบะ',   trips: 32, km: 5640, hours: 198, color: '#f97316' },
    { plate: 'ฉฉ-9999', type: 'รถพยาบาล', trips: 17, km: 7210, hours: 124, color: '#ef4444' },
  ]), [])

  // ── Top destinations ───────────────────────────────────
  const destinationData = useMemo(() => ([
    { name: 'กระทรวงสาธารณสุข นนทบุรี', value: 28 },
    { name: 'ศาลากลางจังหวัด',            value: 24 },
    { name: 'สำนักงานสาธารณสุขจังหวัด',    value: 22 },
    { name: 'โรงพยาบาลศูนย์',              value: 18 },
    { name: 'อย. นนทบุรี',                value: 12 },
    { name: 'สำนักงานเขตสุขภาพ',           value: 10 },
    { name: 'โรงแรมสัมมนา',                value: 9 },
    { name: 'อื่นๆ',                       value: 15 },
  ]), [])

  // ── Department usage ───────────────────────────────────
  const departmentData = useMemo(() => ([
    { name: 'กลุ่มงานบริหารทั่วไป',  value: 36, color: '#006a5a' },
    { name: 'กลุ่มงานการแพทย์',      value: 28, color: '#0d9488' },
    { name: 'กลุ่มงานเภสัชกรรม',     value: 22, color: '#14b8a6' },
    { name: 'กลุ่มงานการพยาบาล',     value: 26, color: '#22c55e' },
    { name: 'กลุ่มงานทันตกรรม',      value: 12, color: '#84cc16' },
    { name: 'กลุ่มงานพัสดุ',         value: 14, color: '#facc15' },
  ]), [])

  // ── Fuel cost trend ────────────────────────────────────
  const fuelMonthData = useMemo(() => ([
    { m: 'ต.ค.', cost: 9800 },  { m: 'พ.ย.', cost: 11200 },
    { m: 'ธ.ค.', cost: 14600 }, { m: 'ม.ค.', cost: 12400 },
    { m: 'ก.พ.', cost: 10800 }, { m: 'มี.ค.', cost: 15200 },
    { m: 'เม.ย.', cost: 17400 },{ m: 'พ.ค.', cost: 13800 },
    { m: 'มิ.ย.', cost: 12100 },{ m: 'ก.ค.', cost: 10300 },
    { m: 'ส.ค.', cost: 8400 },  { m: 'ก.ย.', cost: 6800 },
  ]), [])

  // ── Driver performance ─────────────────────────────────
  const driverData = useMemo(() => ([
    { name: 'นายสมชาย รักงาน',   trips: 52, km: 9120, rating: 96 },
    { name: 'นายสมศักดิ์ ใจดี',  trips: 44, km: 7680, rating: 92 },
    { name: 'นายวิโรจน์ ขยันดี', trips: 36, km: 6240, rating: 88 },
    { name: 'นายสมเกียรติ ตรงเวลา', trips: 19, km: 5410, rating: 94 },
  ]), [])

  // ── ECharts options ────────────────────────────────────
  const statusOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> รายการ ({d}%)' },
    legend: {
      bottom: 0, type: 'scroll',
      textStyle: { color: '#cbd5e1', fontSize: 11 },
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

  const monthOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, textStyle: { color: '#cbd5e1' }, data: ['คำขอใช้รถ', 'เดินทางเสร็จสิ้น'] },
    grid: { left: 8, right: 16, bottom: 8, top: 36, containLabel: true },
    xAxis: { type: 'category', data: monthData.map(d => d.m), axisLabel: { color: '#cbd5e1' } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
    series: [
      {
        name: 'คำขอใช้รถ',
        type: 'bar',
        data: monthData.map(d => d.req),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#0d9488' }, { offset: 1, color: '#14b8a6' }]
          }
        },
        barMaxWidth: 18
      },
      {
        name: 'เดินทางเสร็จสิ้น',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: monthData.map(d => d.done),
        lineStyle: { color: '#facc15', width: 3 },
        itemStyle: { color: '#facc15' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(250, 204, 21, 0.30)' },
              { offset: 1, color: 'rgba(250, 204, 21, 0.02)' }
            ]
          }
        }
      },
    ]
  }), [monthData])

  const destinationOption = useMemo(() => {
    const sorted = [...destinationData].sort((a, b) => a.value - b.value)
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
              { offset: 0, color: '#006a5a' },
              { offset: 1, color: '#22c55e' }
            ]
          }
        },
        label: { show: true, position: 'right', color: '#e2e8f0', fontWeight: 600 },
        barMaxWidth: 22,
      }]
    }
  }, [destinationData])

  const departmentOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: departmentData.map(d => d.name),
      axisLabel: { color: '#cbd5e1', fontSize: 11, interval: 0, rotate: 18 }
    },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
    series: [{
      type: 'bar',
      data: departmentData.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [6, 6, 0, 0] } })),
      label: { show: true, position: 'top', color: '#e2e8f0', fontWeight: 600 },
      barMaxWidth: 48,
    }]
  }), [departmentData])

  const fleetOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, textStyle: { color: '#cbd5e1' }, data: ['จำนวนเที่ยว', 'ระยะทาง (กม.)', 'ชั่วโมงใช้งาน'] },
    grid: { left: 8, right: 48, bottom: 8, top: 36, containLabel: true },
    xAxis: { type: 'category', data: fleetData.map(d => d.plate), axisLabel: { color: '#cbd5e1' } },
    yAxis: [
      { type: 'value', name: 'เที่ยว / ชม.', axisLabel: { color: '#94a3b8' }, nameTextStyle: { color: '#94a3b8' } },
      { type: 'value', name: 'กิโลเมตร', axisLabel: { color: '#94a3b8' }, nameTextStyle: { color: '#94a3b8' } },
    ],
    series: [
      {
        name: 'จำนวนเที่ยว',
        type: 'bar',
        data: fleetData.map(d => d.trips),
        itemStyle: { color: '#06b6d4', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 20,
        label: { show: true, position: 'top', color: '#e2e8f0' },
      },
      {
        name: 'ชั่วโมงใช้งาน',
        type: 'bar',
        data: fleetData.map(d => d.hours),
        itemStyle: { color: '#a855f7', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 20,
        label: { show: true, position: 'top', color: '#e2e8f0' },
      },
      {
        name: 'ระยะทาง (กม.)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 8,
        data: fleetData.map(d => d.km),
        lineStyle: { color: '#facc15', width: 3 },
        itemStyle: { color: '#facc15' },
      },
    ]
  }), [fleetData])

  const fuelOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `฿${v.toLocaleString()}` },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: { type: 'category', data: fuelMonthData.map(d => d.m), axisLabel: { color: '#cbd5e1' } },
    yAxis: {
      type: 'value', axisLabel: { color: '#94a3b8', formatter: (v: number) => `฿${(v / 1000).toFixed(0)}k` }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      data: fuelMonthData.map(d => d.cost),
      lineStyle: { color: '#f97316', width: 3 },
      itemStyle: { color: '#f97316' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(249, 115, 22, 0.4)' },
            { offset: 1, color: 'rgba(249, 115, 22, 0.02)' }
          ]
        }
      },
      label: { show: true, position: 'top', color: '#cbd5e1', fontSize: 10, formatter: (p: { value: number }) => `฿${(p.value / 1000).toFixed(1)}k` }
    }]
  }), [fuelMonthData])

  const totalTrips = fleetData.reduce((s, d) => s + d.trips, 0)

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FaBuilding className="inline mr-1" /> งานบริหารงานทั่วไป</> },
            { title: <><FaCar className="inline mr-1" /> รถราชการ</> },
            { title: 'Dashboard ภาพรวม' },
          ]}
          className="mb-4"
        />

        {/* Header banner */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #006a5a 0%, #0d9488 50%, #14b8a6 100%)',
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
                  <FaCar className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>Dashboard รถราชการ</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                    สรุปการใช้รถส่วนกลาง คำขอ ระยะทาง ค่าน้ำมัน และประสิทธิภาพการให้บริการ
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
            { title: 'คำขอใช้รถทั้งหมด', value: totalRequests, icon: <FaClipboardList />, color: '#006a5a', suffix: 'รายการ' },
            { title: 'รออนุมัติ',         value: pendingCount,  icon: <ClockCircleOutlined />, color: '#f59e0b', suffix: 'รายการ' },
            { title: 'อนุมัติแล้ว',       value: approvedCount, icon: <CheckCircleOutlined />, color: '#22c55e', suffix: 'รายการ' },
            { title: 'ไม่อนุมัติ',        value: rejectedCount, icon: <CloseCircleOutlined />, color: '#ef4444', suffix: 'รายการ' },
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

        {/* Secondary KPI: km / fuel cost / utilization */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
              <Space align="center" size="middle">
                <Avatar size={44} style={{ background: '#3b82f61f', color: '#3b82f6' }} icon={<FaRoad />} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>ระยะทางรวมทั้งปี</Text>
                  <div className="flex items-baseline gap-2">
                    <Text strong style={{ fontSize: 26, color: '#3b82f6' }}>{totalKm.toLocaleString()}</Text>
                    <Text type="secondary">กม.</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>เฉลี่ย {avgKmPerTrip} กม./เที่ยว</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #f97316' }}>
              <Space align="center" size="middle">
                <Avatar size={44} style={{ background: '#f973161f', color: '#f97316' }} icon={<FaGasPump />} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>ค่าน้ำมันรวมทั้งปี</Text>
                  <div className="flex items-baseline gap-2">
                    <Text strong style={{ fontSize: 26, color: '#f97316' }}>฿{totalFuelCost.toLocaleString()}</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>เฉลี่ย ฿{Math.round(totalFuelCost / 12).toLocaleString()}/เดือน</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #22c55e' }}>
              <Space align="center" size="middle">
                <Avatar size={44} style={{ background: '#22c55e1f', color: '#22c55e' }} icon={<RiseOutlined />} />
                <div className="flex-1">
                  <Text type="secondary" style={{ fontSize: 12 }}>อัตราการใช้รถ (Utilization)</Text>
                  <div className="flex items-baseline gap-2">
                    <Text strong style={{ fontSize: 26, color: '#22c55e' }}>{utilizationPct}%</Text>
                  </div>
                  <Progress percent={utilizationPct} strokeColor="#22c55e" showInfo={false} size="small" />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Row: status donut + monthly trend */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={9}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #14b8a6' }}
              title={<Space><FaChartPie style={{ color: '#14b8a6' }} /><span>สถานะคำขอใช้รถ</span></Space>}
              extra={<Tag color="#14b8a6">{totalRequests} รายการ</Tag>}
            >
              <EChart option={statusOption} height={340} />
            </Card>
          </Col>
          <Col xs={24} lg={15}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #0d9488' }}
              title={<Space><RiseOutlined style={{ color: '#0d9488' }} /><span>คำขอ vs เดินทางเสร็จสิ้น (รายเดือน)</span></Space>}
              extra={<Tag color="success">เฉลี่ย {(approvedCount / 12).toFixed(1)} เที่ยว/เดือน</Tag>}
            >
              <EChart option={monthOption} height={340} />
            </Card>
          </Col>
        </Row>

        {/* Section: Fleet utilization */}
        <Title level={4} style={{ color: '#0d9488', marginTop: 8, marginBottom: 8 }}>
          การใช้งานรถในฝูงบิน (Fleet Utilization)
        </Title>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={15}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #06b6d4' }}
              title={<Space><CarOutlined style={{ color: '#06b6d4' }} /><span>เที่ยว / ระยะทาง / ชั่วโมงใช้งาน</span></Space>}
              extra={<Tag color="cyan">{totalTrips} เที่ยวสะสม</Tag>}
            >
              <EChart option={fleetOption} height={340} />
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #f97316' }}
              title={<Space><FaGasPump style={{ color: '#f97316' }} /><span>ค่าน้ำมันรายเดือน</span></Space>}
              extra={<Tag color="orange">฿{totalFuelCost.toLocaleString()}</Tag>}
            >
              <EChart option={fuelOption} height={340} />
            </Card>
          </Col>
        </Row>

        {/* Fleet detail strip */}
        <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: '#06b6d4' }}>
            รายละเอียดรถแต่ละคัน
          </Title>
          <Row gutter={[12, 12]}>
            {fleetData.map((v) => {
              const pct = Math.round((v.trips / 60) * 100)
              return (
                <Col xs={24} sm={12} md={6} key={v.plate}>
                  <Card
                    size="small"
                    style={{ borderRadius: 10, borderLeft: `4px solid ${v.color}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Tag color={v.type === 'รถตู้' ? 'blue' : v.type === 'รถกระบะ' ? 'orange' : 'red'}>{v.type}</Tag>
                      <Text strong style={{ color: '#e2e8f0' }}>{v.plate}</Text>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <Text type="secondary">เที่ยว</Text>
                      <Text strong style={{ color: v.color }}>{v.trips}</Text>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <Text type="secondary">ระยะทาง</Text>
                      <Text strong style={{ color: '#facc15' }}>{v.km.toLocaleString()} กม.</Text>
                    </div>
                    <div className="flex justify-between text-xs mb-2">
                      <Text type="secondary">ชั่วโมงใช้งาน</Text>
                      <Text strong style={{ color: '#a855f7' }}>{v.hours} ชม.</Text>
                    </div>
                    <Progress percent={Math.min(pct, 100)} strokeColor={v.color} size="small" />
                  </Card>
                </Col>
              )
            })}
          </Row>
        </Card>

        {/* Row: top destinations + departments */}
        <Title level={4} style={{ color: '#006a5a', marginTop: 8, marginBottom: 8 }}>
          ปลายทาง / หน่วยงานที่ใช้รถ
        </Title>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={12}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #006a5a' }}
              title={<Space><EnvironmentOutlined style={{ color: '#006a5a' }} /><span>ปลายทางที่ขอใช้รถบ่อยที่สุด</span></Space>}
              extra={<Tag color="success">Top {destinationData.length}</Tag>}
            >
              <EChart option={destinationOption} height={360} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #14b8a6' }}
              title={<Space><FaMapMarkedAlt style={{ color: '#14b8a6' }} /><span>หน่วยงานที่ใช้รถ</span></Space>}
              extra={<Tag color="cyan">{departmentData.reduce((s, d) => s + d.value, 0)} เที่ยว</Tag>}
            >
              <EChart option={departmentOption} height={360} />
            </Card>
          </Col>
        </Row>

        {/* Driver performance */}
        <Card variant="borderless" style={{ borderRadius: 12 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: '#a855f7' }}>
            <FaUserTie style={{ marginRight: 8 }} />
            ประสิทธิภาพพนักงานขับรถ
          </Title>
          <Divider style={{ margin: '8px 0 16px' }} />
          {driverData.map((d) => {
            const ratingColor = d.rating >= 95 ? '#22c55e' : d.rating >= 90 ? '#facc15' : '#f97316'
            return (
              <div key={d.name} className="mb-4">
                <Row gutter={[12, 8]} align="middle">
                  <Col xs={24} md={7}>
                    <Space>
                      <Avatar size={32} icon={<UserOutlined />} style={{ background: '#a855f71f', color: '#a855f7' }} />
                      <Text strong style={{ color: '#e2e8f0' }}>{d.name}</Text>
                    </Space>
                  </Col>
                  <Col xs={8} md={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>เที่ยว</Text>
                    <div><Text strong style={{ color: '#06b6d4' }}>{d.trips}</Text></div>
                  </Col>
                  <Col xs={8} md={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>ระยะทาง</Text>
                    <div><Text strong style={{ color: '#facc15' }}>{d.km.toLocaleString()} กม.</Text></div>
                  </Col>
                  <Col xs={8} md={3}>
                    <Text type="secondary" style={{ fontSize: 12 }}>ความพึงพอใจ</Text>
                    <div><Text strong style={{ color: ratingColor }}>{d.rating}%</Text></div>
                  </Col>
                  <Col xs={24} md={6}>
                    <Progress percent={d.rating} strokeColor={ratingColor} showInfo={false} />
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

export default function VehicleDashboardPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#006a5a', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
