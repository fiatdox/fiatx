'use client'
import React, { useMemo } from 'react'
import {
  Card, Typography, ConfigProvider, Breadcrumb, Row, Col, theme, App,
  Tag, Progress, Space, Statistic, Divider
} from 'antd'
import {
  HomeOutlined, TeamOutlined, UserOutlined, ArrowDownOutlined, ArrowUpOutlined,
  RiseOutlined, FallOutlined
} from '@ant-design/icons'
import {
  FaUsersCog, FaChartPie, FaUserTimes, FaUserCheck, FaUserTie, FaIdBadge,
  FaSignOutAlt, FaBriefcase
} from 'react-icons/fa'
import Navbar from '../../components/Navbar'
import EChart from '../../components/EChart'

const { Title, Text } = Typography

const PageContent = () => {
  const totalStaff = 412
  const activeStaff = 387
  const exitYTD = 25
  const retentionRate = Math.round(((totalStaff - exitYTD) / totalStaff) * 100)

  const staffTypeData = useMemo(() => ([
    { name: 'ข้าราชการ', value: 158, color: '#006a5a' },
    { name: 'พนักงานราชการ', value: 42, color: '#0d9488' },
    { name: 'พนักงานกระทรวงสาธารณสุข', value: 96, color: '#14b8a6' },
    { name: 'ลูกจ้างชั่วคราวรายเดือน', value: 71, color: '#22c55e' },
    { name: 'ลูกจ้างชั่วคราวรายวัน', value: 28, color: '#84cc16' },
    { name: 'ลูกจ้างเหมาบริการ', value: 17, color: '#facc15' },
  ]), [])

  const positionData = useMemo(() => ([
    { name: 'พยาบาลวิชาชีพ', value: 142 },
    { name: 'นักวิชาการสาธารณสุข', value: 38 },
    { name: 'นายแพทย์', value: 32 },
    { name: 'เจ้าพนักงานสาธารณสุข', value: 28 },
    { name: 'เภสัชกร', value: 18 },
    { name: 'นักเทคนิคการแพทย์', value: 14 },
    { name: 'ทันตแพทย์', value: 12 },
    { name: 'นักจัดการงานทั่วไป', value: 22 },
    { name: 'พนักงานช่วยเหลือคนไข้', value: 56 },
    { name: 'พนักงานทั่วไป', value: 50 },
  ]), [])

  const exitReasonData = useMemo(() => ([
    { name: 'เกษียณอายุ', value: 8, color: '#6b7280' },
    { name: 'ย้าย', value: 7, color: '#f59e0b' },
    { name: 'ลาออก', value: 6, color: '#ef4444' },
    { name: 'ไล่ออก', value: 1, color: '#7f1d1d' },
    { name: 'เสียชีวิต', value: 1, color: '#374151' },
    { name: 'อื่นๆ', value: 2, color: '#a855f7' },
  ]), [])

  const exitMonthData = useMemo(() => ([
    { m: 'ม.ค.', value: 1 }, { m: 'ก.พ.', value: 2 }, { m: 'มี.ค.', value: 3 },
    { m: 'เม.ย.', value: 5 }, { m: 'พ.ค.', value: 2 }, { m: 'มิ.ย.', value: 3 },
    { m: 'ก.ค.', value: 4 }, { m: 'ส.ค.', value: 1 }, { m: 'ก.ย.', value: 2 },
    { m: 'ต.ค.', value: 1 }, { m: 'พ.ย.', value: 0 }, { m: 'ธ.ค.', value: 1 },
  ]), [])

  const ageData = useMemo(() => ([
    { name: '20-29 ปี', value: 78 },
    { name: '30-39 ปี', value: 142 },
    { name: '40-49 ปี', value: 108 },
    { name: '50-59 ปี', value: 64 },
    { name: '60+ ปี', value: 20 },
  ]), [])

  const genderData = useMemo(() => ([
    { name: 'หญิง', value: 286, color: '#ec4899' },
    { name: 'ชาย', value: 126, color: '#3b82f6' },
  ]), [])

  const missionGroupData = useMemo(() => ([
    { name: 'กลุ่มภารกิจด้านการพยาบาล', value: 168 },
    { name: 'กลุ่มภารกิจด้านบริการปฐมภูมิ', value: 92 },
    { name: 'กลุ่มภารกิจด้านพัฒนาระบบบริการ', value: 76 },
    { name: 'กลุ่มภารกิจด้านอำนวยการ', value: 76 },
  ]), [])

  // ── ECharts options ─────────────────────────────────────
  const staffTypeOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: staffTypeData.map(d => d.name),
      axisLabel: { color: '#cbd5e1', fontSize: 11, interval: 0, rotate: 18 }
    },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
    series: [{
      type: 'bar',
      data: staffTypeData.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [6, 6, 0, 0] } })),
      label: { show: true, position: 'top', color: '#e2e8f0', fontWeight: 600 },
      barMaxWidth: 56,
    }]
  }), [staffTypeData])

  const positionOption = useMemo(() => {
    const sorted = [...positionData].sort((a, b) => a.value - b.value)
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
              { offset: 0, color: '#0d9488' },
              { offset: 1, color: '#22c55e' }
            ]
          }
        },
        label: { show: true, position: 'right', color: '#e2e8f0', fontWeight: 600 },
        barMaxWidth: 22,
      }]
    }
  }, [positionData])

  const exitReasonOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> คน ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: '#cbd5e1', fontSize: 11 },
      itemWidth: 10, itemHeight: 10
    },
    series: [{
      type: 'pie',
      radius: ['52%', '78%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#0f172a', borderWidth: 2 },
      label: {
        show: true,
        formatter: '{b}\n{c} คน',
        color: '#e2e8f0',
        fontSize: 11
      },
      labelLine: { length: 8, length2: 6 },
      data: exitReasonData.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }]
  }), [exitReasonData])

  const exitMonthOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: exitMonthData.map(d => d.m),
      axisLabel: { color: '#cbd5e1' }
    },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
    series: [{
      type: 'bar',
      data: exitMonthData.map(d => d.value),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#ef4444' },
            { offset: 1, color: '#f59e0b' }
          ]
        }
      },
      label: { show: true, position: 'top', color: '#e2e8f0' },
      barMaxWidth: 28,
    }]
  }), [exitMonthData])

  const ageOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: ageData.map(d => d.name),
      axisLabel: { color: '#cbd5e1', fontSize: 12 }
    },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
    series: [{
      type: 'bar',
      data: ageData.map(d => d.value),
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#06b6d4' }
          ]
        }
      },
      label: { show: true, position: 'top', color: '#e2e8f0', fontWeight: 600 },
      barMaxWidth: 56,
    }]
  }), [ageData])

  const genderOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> คน ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: '#cbd5e1', fontSize: 12 }
    },
    series: [{
      type: 'pie',
      radius: ['58%', '82%'],
      center: ['50%', '42%'],
      itemStyle: { borderColor: '#0f172a', borderWidth: 3 },
      label: { show: true, color: '#e2e8f0', formatter: '{b}\n{d}%', fontSize: 12 },
      data: genderData.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }]
  }), [genderData])

  const missionGroupOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> คน ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: '#cbd5e1', fontSize: 11 },
      itemWidth: 10, itemHeight: 10,
      type: 'scroll'
    },
    series: [{
      type: 'pie',
      radius: ['0%', '70%'],
      center: ['50%', '42%'],
      roseType: 'radius',
      itemStyle: { borderColor: '#0f172a', borderWidth: 2 },
      label: { color: '#e2e8f0', fontSize: 11, formatter: '{c}' },
      data: missionGroupData.map((d, i) => ({
        name: d.name, value: d.value,
        itemStyle: { color: ['#006a5a', '#0d9488', '#14b8a6', '#22c55e'][i % 4] }
      })),
    }]
  }), [missionGroupData])

  const totalExitPct = ((exitYTD / totalStaff) * 100).toFixed(1)

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
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
                  <FaChartPie className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>HR Dashboard ภาพรวม</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                    สรุปข้อมูลบุคลากร ตำแหน่ง ประเภทเจ้าหน้าที่ และอัตราการออกประจำปี
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
            { title: 'บุคลากรทั้งหมด', value: totalStaff, icon: <TeamOutlined />, color: '#006a5a', suffix: 'คน' },
            { title: 'ปฏิบัติงาน', value: activeStaff, icon: <FaUserCheck />, color: '#22c55e', suffix: 'คน' },
            { title: 'ออกจากงานปีนี้', value: exitYTD, icon: <FaSignOutAlt />, color: '#ef4444', suffix: 'คน', extra: `${totalExitPct}%` },
            { title: 'อัตราคงอยู่', value: retentionRate, icon: <RiseOutlined />, color: '#3b82f6', suffix: '%' },
          ].map((stat, i) => (
            <Col xs={12} md={6} key={i}>
              <Card
                style={{ borderRadius: 12, border: 'none' }}
                styles={{ body: { padding: 20 } }}
              >
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
                      {stat.extra && (
                        <Tag color="error" style={{ marginLeft: 'auto', fontSize: 11 }}>{stat.extra}</Tag>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Row 1: staff type + position */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={10}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #006a5a' }}
              title={
                <Space>
                  <FaIdBadge style={{ color: '#0d9488' }} />
                  <span>จำนวนบุคลากรตามประเภทเจ้าหน้าที่</span>
                </Space>
              }
              extra={<Tag color="#006a5a">{staffTypeData.reduce((s, d) => s + d.value, 0)} คน</Tag>}
            >
              <EChart option={staffTypeOption} height={340} />
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #14b8a6' }}
              title={
                <Space>
                  <FaBriefcase style={{ color: '#14b8a6' }} />
                  <span>จำนวนบุคลากรตามตำแหน่ง</span>
                </Space>
              }
              extra={<Tag color="#14b8a6">{positionData.length} ตำแหน่ง</Tag>}
            >
              <EChart option={positionOption} height={340} />
            </Card>
          </Col>
        </Row>

        {/* Row 2: exit reason + exit by month */}
        <Title level={4} style={{ color: '#ef4444', marginTop: 8, marginBottom: 8 }}>
          อัตราการออกจากงาน — ปีงบประมาณ 2569
        </Title>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={10}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #ef4444' }}
              title={
                <Space>
                  <FaUserTimes style={{ color: '#ef4444' }} />
                  <span>สาเหตุการออกจากงาน</span>
                </Space>
              }
              extra={<Tag color="error">{exitYTD} คน</Tag>}
            >
              <EChart option={exitReasonOption} height={340} />
              <Divider style={{ margin: '12px 0' }} />
              <Row gutter={[8, 8]}>
                {exitReasonData.map((d) => (
                  <Col xs={12} key={d.name}>
                    <div className="flex items-center justify-between px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center gap-2">
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: d.color }} />
                        <Text style={{ fontSize: 12, color: '#cbd5e1' }}>{d.name}</Text>
                      </div>
                      <Text strong style={{ color: d.color, fontSize: 13 }}>{d.value}</Text>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #f59e0b' }}
              title={
                <Space>
                  <FallOutlined style={{ color: '#f59e0b' }} />
                  <span>การออกจากงานรายเดือน</span>
                </Space>
              }
              extra={<Tag color="warning">เฉลี่ย {(exitYTD / 12).toFixed(1)} คน/เดือน</Tag>}
            >
              <EChart option={exitMonthOption} height={340} />
            </Card>
          </Col>
        </Row>

        {/* Row 3: age + gender + mission group */}
        <Title level={4} style={{ color: '#0d9488', marginTop: 8, marginBottom: 8 }}>
          ข้อมูลประชากรและโครงสร้างองค์กร
        </Title>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} md={10}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}
              title={
                <Space>
                  <UserOutlined style={{ color: '#3b82f6' }} />
                  <span>ช่วงอายุบุคลากร</span>
                </Space>
              }
            >
              <EChart option={ageOption} height={300} />
            </Card>
          </Col>
          <Col xs={24} md={6}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #ec4899' }}
              title={
                <Space>
                  <FaUserTie style={{ color: '#ec4899' }} />
                  <span>เพศ</span>
                </Space>
              }
            >
              <EChart option={genderOption} height={300} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              variant="borderless"
              style={{ borderRadius: 12, borderLeft: '4px solid #006a5a' }}
              title={
                <Space>
                  <FaChartPie style={{ color: '#006a5a' }} />
                  <span>กลุ่มภารกิจ</span>
                </Space>
              }
            >
              <EChart option={missionGroupOption} height={300} />
            </Card>
          </Col>
        </Row>

        {/* Mission group progress (textual) */}
        <Card variant="borderless" style={{ borderRadius: 12 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: '#14b8a6' }}>
            สัดส่วนบุคลากรในแต่ละกลุ่มภารกิจ
          </Title>
          {missionGroupData.map((d, i) => {
            const pct = Math.round((d.value / totalStaff) * 100)
            const color = ['#006a5a', '#0d9488', '#14b8a6', '#22c55e'][i % 4]
            return (
              <div key={d.name} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <Text style={{ color: '#e2e8f0' }}>{d.name}</Text>
                  <Text strong style={{ color }}>{d.value} คน ({pct}%)</Text>
                </div>
                <Progress percent={pct} strokeColor={color} showInfo={false} size="small" />
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

export default function HrDashboardPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#006a5a', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
