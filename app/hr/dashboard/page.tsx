'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Card, Typography, Breadcrumb, Row, Col,
  Tag, Progress, Space, Divider, Spin, Button
} from 'antd'
import {
  HomeOutlined, TeamOutlined, UserOutlined,
  RiseOutlined, FallOutlined, ReloadOutlined
} from '@ant-design/icons'
import {
  FaUsersCog, FaChartPie, FaUserTimes, FaUserCheck, FaUserTie, FaIdBadge,
  FaSignOutAlt, FaBriefcase
} from 'react-icons/fa'
import Navbar from '../../components/Navbar'
import { AppThemeProvider, useThemeMode } from '@/app/components/ThemeProvider'
import EChart from '../../components/EChart'

const { Title, Text } = Typography

type NV = { name: string; value: number }
type MV = { m: string; value: number }
type PB = { name: string; count: number; female: number; male: number; female_pct: number }
type Summary = { total_staff: number; active_staff: number; exit_ytd: number; retention_rate: number }

// จานสีฝั่งหน้าจอ (สี = การนำเสนอ, ข้อมูลตัวเลขมาจาก API จริง)
const STAFF_TYPE_COLORS = ['#006a5a', '#0d9488', '#14b8a6', '#22c55e', '#84cc16', '#facc15']
const MISSION_COLORS = ['#006a5a', '#0d9488', '#14b8a6', '#22c55e', '#84cc16', '#0891b2', '#3b82f6']
const EXIT_COLORS: Record<string, string> = {
  'เกษียณอายุราชการ': '#6b7280',
  'โอนย้าย': '#f59e0b',
  'ลาออก': '#ef4444',
  'ถูกให้ออก': '#7f1d1d',
  'ไล่ออก': '#b91c1c',
  'เสียชีวิต': '#374151',
}

// helper ดึงข้อมูลจาก proxy — คืน data ถ้าสำเร็จ, ไม่งั้นคืน fallback
async function fetchData<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url)
    const json = await res.json()
    return json?.success ? (json.data as T) : fallback
  } catch {
    return fallback
  }
}

const PageContent = () => {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  // ECharts วาดบน canvas — resolve var(--app-*) ไม่ได้ ต้องใช้ hex จริงและปรับตามโหมด
  const cText = isDark ? '#e2e8f0' : '#334155'   // ป้ายข้อมูลหลัก
  const cAxis = isDark ? '#94a3b8' : '#64748b'   // ป้ายแกน / legend
  const cSlice = isDark ? '#1e293b' : '#ffffff'  // เส้นคั่นชิ้นพาย (สีพื้นการ์ด)

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [staffTypes, setStaffTypes] = useState<NV[]>([])
  const [positions, setPositions] = useState<NV[]>([])
  const [positionBubbles, setPositionBubbles] = useState<PB[]>([])
  const [exitReasons, setExitReasons] = useState<NV[]>([])
  const [exitMonthly, setExitMonthly] = useState<MV[]>([])
  const [ageGroups, setAgeGroups] = useState<NV[]>([])
  const [genders, setGenders] = useState<NV[]>([])
  const [missionGroups, setMissionGroups] = useState<NV[]>([])

  const loadAll = async () => {
    setLoading(true)
    const B = '/api/v1/hr/dashboard'
    const [sm, st, po, pb, er, em, ag, ge, mg] = await Promise.all([
      fetchData<Summary | null>(`${B}/summary`, null),
      fetchData<NV[]>(`${B}/staff-types`, []),
      fetchData<NV[]>(`${B}/positions`, []),
      fetchData<PB[]>(`${B}/position-bubbles`, []),
      fetchData<NV[]>(`${B}/exit-reasons`, []),
      fetchData<MV[]>(`${B}/exit-monthly`, []),
      fetchData<NV[]>(`${B}/age-groups`, []),
      fetchData<NV[]>(`${B}/genders`, []),
      fetchData<NV[]>(`${B}/mission-groups`, []),
    ])
    setSummary(sm); setStaffTypes(st); setPositions(po); setPositionBubbles(pb); setExitReasons(er)
    setExitMonthly(em); setAgeGroups(ag); setGenders(ge); setMissionGroups(mg)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // ── ผูกสีเข้ากับข้อมูลจริง ─────────────────────────────────
  const staffTypeData = useMemo(
    () => staffTypes.map((d, i) => ({ ...d, color: STAFF_TYPE_COLORS[i % STAFF_TYPE_COLORS.length] })),
    [staffTypes]
  )
  const exitReasonData = useMemo(
    () => exitReasons.map(d => ({ ...d, color: EXIT_COLORS[d.name] ?? '#a855f7' })),
    [exitReasons]
  )
  const genderData = useMemo(
    () => genders.map(d => ({ ...d, color: d.name === 'หญิง' ? '#ec4899' : '#3b82f6' })),
    [genders]
  )

  const totalStaff = summary?.total_staff ?? 0
  const activeStaff = summary?.active_staff ?? 0
  const exitYTD = summary?.exit_ytd ?? 0
  const retentionRate = summary?.retention_rate ?? 0
  const totalExitPct = totalStaff > 0 ? ((exitYTD / totalStaff) * 100).toFixed(1) : '0.0'

  // ── ECharts options ─────────────────────────────────────
  const staffTypeOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: staffTypeData.map(d => d.name),
      axisLine: { lineStyle: { color: cAxis } },
      axisLabel: { color: cAxis, fontSize: 11, interval: 0, rotate: 18 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)' } },
      axisLabel: { color: cAxis }
    },
    series: [{
      type: 'bar',
      data: staffTypeData.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [6, 6, 0, 0] } })),
      label: { show: true, position: 'top', color: cText, fontWeight: 600 },
      barMaxWidth: 56,
    }]
  }), [staffTypeData, isDark, cAxis, cText])

  const positionOption = useMemo(() => {
    const sorted = [...positions].sort((a, b) => a.value - b.value)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 32, bottom: 8, top: 8, containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)' } },
        axisLabel: { color: cAxis }
      },
      yAxis: {
        type: 'category',
        data: sorted.map(d => d.name),
        axisLabel: { color: cAxis, fontSize: 12 }
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
        label: { show: true, position: 'right', color: cText, fontWeight: 600 },
        barMaxWidth: 22,
      }]
    }
  }, [positions, isDark, cAxis, cText])

  const positionPieOption = useMemo(() => {
    // สีชิ้น = แยกตามตำแหน่ง (ให้ทุกชิ้นสีต่างกัน) — กระจายเฉดด้วย golden-angle
    // เพื่อให้ชิ้นที่อยู่ติดกันไม่ได้สีใกล้กัน
    const sliceColor = (i: number) => {
      const hue = (i * 137.508) % 360
      // พาสเทล (นุ่ม สว่าง) ไม่ซ้ำเฉด: ลดความจัดของสี + ดันความสว่างสูง
      return `hsl(${hue.toFixed(1)}, ${isDark ? '68%' : '74%'}, ${isDark ? '76%' : '82%'})`
    }
    const total = positionBubbles.reduce((s, b) => s + b.count, 0)
    return {
      backgroundColor: 'transparent',
      // จำนวนบุคลากรทั้งหมด แสดงตรงกลางโดนัท (ตรงกับ center ของ pie ที่ 30%,52%)
      title: {
        text: total.toLocaleString(),
        subtext: 'บุคลากรทั้งหมด (คน)',
        left: '30%',
        top: '51%',
        textAlign: 'center',
        textVerticalAlign: 'middle',
        textStyle: { color: cText, fontSize: 30, fontWeight: 800 },
        subtextStyle: { color: cAxis, fontSize: 12 },
      },
      tooltip: {
        trigger: 'item',
        formatter: (p: { data: { name: string; female: number; male: number; value: number }; percent: number }) => {
          const d = p.data
          return `<b>${d.name}</b><br/>จำนวน: <b>${d.value}</b> คน (${p.percent}%)`
            + `<br/><span style="color:#ec4899">■</span> หญิง ${d.female} คน (${Math.round((d.female / d.value) * 100)}%)`
            + `<br/><span style="color:#3b82f6">■</span> ชาย ${d.male} คน (${Math.round((d.male / d.value) * 100)}%)`
        },
      },
      legend: {
        type: 'scroll', orient: 'vertical', right: 8, top: 10, bottom: 10,
        textStyle: { color: cAxis, fontSize: 11 },
        pageTextStyle: { color: cAxis },
        pageIconColor: '#0d9488', pageIconInactiveColor: cAxis,
        formatter: (name: string) => (name.length > 16 ? name.slice(0, 16) + '…' : name),
      },
      series: [{
        type: 'pie',
        radius: ['30%', '58%'],
        center: ['30%', '52%'],
        avoidLabelOverlap: true,
        minAngle: 2,
        itemStyle: { borderColor: cSlice, borderWidth: 1 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true, scaleSize: 6,
          label: { show: true, color: cText, fontSize: 13, fontWeight: 700, formatter: '{b}\n{c} คน' },
        },
        // เส้นชี้ + ชื่อ/จำนวน เฉพาะ 20 อันดับที่มากสุด (ข้อมูลเรียงจากมาก→น้อยจาก backend)
        data: positionBubbles.map((b, i) => ({
          name: b.name, value: b.count, female: b.female, male: b.male,
          itemStyle: { color: sliceColor(i) },
          label: i < 20
            ? { show: true, color: cText, fontSize: 11, fontWeight: 600, formatter: '{b}\n{c} คน' }
            : { show: false },
          labelLine: i < 20
            ? { show: true, length: 10, length2: 12, lineStyle: { color: cAxis } }
            : { show: false },
        })),
      }],
    }
  }, [positionBubbles, isDark, cAxis, cText, cSlice])

  const exitReasonOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> คน ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: cAxis, fontSize: 11 },
      itemWidth: 10, itemHeight: 10
    },
    series: [{
      type: 'pie',
      radius: ['52%', '78%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: cSlice, borderWidth: 2 },
      label: {
        show: true,
        formatter: '{b}\n{c} คน',
        color: cText,
        fontSize: 11
      },
      labelLine: { length: 8, length2: 6 },
      data: exitReasonData.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }]
  }), [exitReasonData, cAxis, cSlice, cText])

  const exitMonthOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: exitMonthly.map(d => d.m),
      axisLine: { lineStyle: { color: cAxis } },
      axisLabel: { color: cAxis }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)' } },
      axisLabel: { color: cAxis }
    },
    series: [{
      type: 'bar',
      data: exitMonthly.map(d => d.value),
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
      label: { show: true, position: 'top', color: cText },
      barMaxWidth: 28,
    }]
  }), [exitMonthly, isDark, cAxis, cText])

  const ageOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, bottom: 8, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: ageGroups.map(d => d.name),
      axisLine: { lineStyle: { color: cAxis } },
      axisLabel: { color: cAxis, fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)' } },
      axisLabel: { color: cAxis }
    },
    series: [{
      type: 'bar',
      data: ageGroups.map(d => d.value),
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
      label: { show: true, position: 'top', color: cText, fontWeight: 600 },
      barMaxWidth: 56,
    }]
  }), [ageGroups, isDark, cAxis, cText])

  const genderOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> คน ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: cAxis, fontSize: 12 }
    },
    series: [{
      type: 'pie',
      radius: ['58%', '82%'],
      center: ['50%', '42%'],
      itemStyle: { borderColor: cSlice, borderWidth: 3 },
      label: { show: true, color: cText, formatter: '{b}\n{d}%', fontSize: 12 },
      data: genderData.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }]
  }), [genderData, cAxis, cSlice, cText])

  const missionGroupOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> คน ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: cAxis, fontSize: 11 },
      itemWidth: 10, itemHeight: 10,
      type: 'scroll'
    },
    series: [{
      type: 'pie',
      radius: ['0%', '70%'],
      center: ['50%', '42%'],
      roseType: 'radius',
      itemStyle: { borderColor: cSlice, borderWidth: 2 },
      label: { color: cText, fontSize: 11, formatter: '{c}' },
      data: missionGroups.map((d, i) => ({
        name: d.name, value: d.value,
        itemStyle: { color: MISSION_COLORS[i % MISSION_COLORS.length] }
      })),
    }]
  }), [missionGroups, cAxis, cSlice, cText])

  const staffTypeTotal = staffTypeData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="min-h-screen w-full bg-app-bg text-app-text">
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
              <div className="text-right flex items-center justify-end gap-2">
                <Button
                  ghost icon={<ReloadOutlined />} loading={loading} onClick={loadAll}
                  style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}
                >
                  รีเฟรช
                </Button>
                <Tag style={{ background: 'rgba(255,255,255,0.18)', borderColor: 'transparent', color: '#fff', fontSize: 13, padding: '4px 12px' }}>
                  ปีงบประมาณ {new Date().getFullYear() + 543}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        <Spin spinning={loading} description="กำลังโหลดข้อมูลบุคลากร...">
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
                        <Text strong style={{ fontSize: 28, lineHeight: 1.1, color: stat.color }}>{stat.value.toLocaleString()}</Text>
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
                extra={<Tag color="#006a5a">{staffTypeTotal.toLocaleString()} คน</Tag>}
              >
                <EChart option={staffTypeOption} height={340} showToolbar />
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
                extra={<Tag color="#14b8a6">{positions.length} รายการ</Tag>}
              >
                <EChart option={positionOption} height={340} showToolbar />
              </Card>
            </Col>
          </Row>

          {/* Bubble chart: ตำแหน่ง (ขนาด = จำนวน, สี = สัดส่วนเพศ) */}
          <Title level={4} style={{ color: '#0d9488', marginTop: 8, marginBottom: 8 }}>
            ภาพรวมตำแหน่ง — จำนวน × สัดส่วนเพศ (ญ / ช)
          </Title>
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24}>
              <Card
                variant="borderless"
                style={{ borderRadius: 12, borderLeft: '4px solid #0d9488' }}
                title={
                  <Space>
                    <FaBriefcase style={{ color: '#0d9488' }} />
                    <span>สัดส่วนบุคลากรตามตำแหน่ง</span>
                  </Space>
                }
                extra={<Tag color="#0d9488">{positionBubbles.length} ตำแหน่ง · {positionBubbles.reduce((s, b) => s + b.count, 0).toLocaleString()} คน</Tag>}
              >
                <EChart option={positionPieOption} height={520} showToolbar />
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <Text type="secondary" style={{ fontSize: 12 }}>● ขนาดชิ้น = สัดส่วนจำนวนบุคลากร · แต่ละสี = คนละตำแหน่ง</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>● เส้นชี้ชื่อ + จำนวน = 20 อันดับที่มากสุด · ที่เหลือชี้ที่ชิ้นเพื่อดู</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>● หญิง / ชาย ดูใน tooltip · เลื่อนดูรายชื่อครบใน legend ด้านขวา</Text>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Row 2: exit reason + exit by month */}
          <Title level={4} style={{ color: '#ef4444', marginTop: 8, marginBottom: 8 }}>
            อัตราการออกจากงาน — ปีงบประมาณ {new Date().getFullYear() + 543}
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
                <EChart option={exitReasonOption} height={340} showToolbar />
                <Divider style={{ margin: '12px 0' }} />
                <Row gutter={[8, 8]}>
                  {exitReasonData.map((d) => (
                    <Col xs={12} key={d.name}>
                      <div className="flex items-center justify-between px-2 py-1 rounded" style={{ background: 'rgba(148,163,184,0.08)' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: d.color }} />
                          <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>{d.name}</Text>
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
                <EChart option={exitMonthOption} height={340} showToolbar />
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
                <EChart option={ageOption} height={300} showToolbar />
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
                <EChart option={genderOption} height={300} showToolbar />
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
                <EChart option={missionGroupOption} height={300} showToolbar />
              </Card>
            </Col>
          </Row>

          {/* Mission group progress (textual) */}
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: '#14b8a6' }}>
              สัดส่วนบุคลากรในแต่ละกลุ่มภารกิจ
            </Title>
            {missionGroups.map((d, i) => {
              const pct = activeStaff > 0 ? Math.round((d.value / activeStaff) * 100) : 0
              const color = MISSION_COLORS[i % MISSION_COLORS.length]
              return (
                <div key={d.name} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <Text style={{ color: 'var(--app-text)' }}>{d.name}</Text>
                    <Text strong style={{ color }}>{d.value.toLocaleString()} คน ({pct}%)</Text>
                  </div>
                  <Progress percent={pct} strokeColor={color} showInfo={false} size="small" />
                </div>
              )
            })}
          </Card>
        </Spin>
      </div>
    </div>
  )
}

export default function HrDashboardPage() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PageContent />
    </AppThemeProvider>
  )
}
