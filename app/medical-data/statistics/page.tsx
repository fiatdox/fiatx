'use client'
import { useState, useMemo } from 'react'
import {
  Card, Typography, Breadcrumb, Row, Col, Select, Table, Tag, Space, Segmented,
} from 'antd'
import {
  HomeOutlined, TeamOutlined, MedicineBoxOutlined, RiseOutlined,
  SwapOutlined, ScissorOutlined,
} from '@ant-design/icons'
import { FaChartBar, FaProcedures, FaUserInjured } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import EChart from '@/app/components/EChart'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography

const ACCENT = '#0d9488'
const PALETTE = ['#0d9488', '#22d3ee', '#a78bfa', '#f59e0b', '#f472b6', '#60a5fa', '#34d399', '#fb923c']

// เดือนตามปีงบประมาณ (ต.ค. – ก.ย.)
const MONTHS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.']

interface YearStat {
  opd: number[]
  ipd: number[]
  referIn: number[]
  referOut: number[]
  surgery: number
  bedOccupancy: number  // อัตราครองเตียง %
  topDiseases: { code: string; name: string; count: number }[]
  payments: { name: string; value: number }[]
  departments: { name: string; value: number }[]
}

// ── Mock data ตามปีงบประมาณ ───────────────────────────────────────────────────
const STAT_DATA: Record<string, YearStat> = {
  '2569': {
    opd: [12450, 11980, 12830, 13420, 12110, 13890, 12760, 13510, 14020, 0, 0, 0],
    ipd: [980, 920, 1010, 1120, 990, 1080, 1030, 1095, 1140, 0, 0, 0],
    referIn:  [120, 110, 134, 128, 115, 140, 132, 138, 145, 0, 0, 0],
    referOut: [210, 198, 224, 232, 205, 248, 236, 240, 255, 0, 0, 0],
    surgery: 3120,
    bedOccupancy: 86,
    topDiseases: [
      { code: 'I10',   name: 'ความดันโลหิตสูง', count: 8420 },
      { code: 'E11',   name: 'เบาหวานชนิดที่ 2', count: 7310 },
      { code: 'J00',   name: 'หวัด / ทางเดินหายใจส่วนบน', count: 5240 },
      { code: 'K30',   name: 'อาหารไม่ย่อย / กระเพาะ', count: 3980 },
      { code: 'M54',   name: 'ปวดหลัง', count: 3450 },
      { code: 'N39',   name: 'ติดเชื้อทางเดินปัสสาวะ', count: 2870 },
      { code: 'J45',   name: 'หอบหืด', count: 2410 },
      { code: 'A09',   name: 'ท้องเสีย / ลำไส้อักเสบ', count: 2180 },
      { code: 'E78',   name: 'ไขมันในเลือดสูง', count: 1990 },
      { code: 'F32',   name: 'ภาวะซึมเศร้า', count: 1540 },
    ],
    payments: [
      { name: 'บัตรทอง (UC)', value: 58 },
      { name: 'ประกันสังคม', value: 18 },
      { name: 'ข้าราชการ (จ่ายตรง)', value: 16 },
      { name: 'ชำระเงินเอง', value: 8 },
    ],
    departments: [
      { name: 'อายุรกรรม', value: 28400 },
      { name: 'ศัลยกรรม', value: 14200 },
      { name: 'กุมารเวชกรรม', value: 12800 },
      { name: 'สูติ-นรีเวช', value: 11500 },
      { name: 'ออร์โธปิดิกส์', value: 9800 },
      { name: 'จักษุ', value: 7400 },
    ],
  },
  '2568': {
    opd: [11800, 11200, 12100, 12640, 11500, 13050, 12010, 12720, 13180, 12900, 13320, 12480],
    ipd: [910, 880, 950, 1040, 930, 1010, 970, 1020, 1070, 1050, 1100, 1010],
    referIn:  [108, 102, 120, 118, 106, 128, 122, 126, 132, 130, 136, 124],
    referOut: [195, 188, 210, 218, 196, 230, 222, 226, 238, 234, 244, 228],
    surgery: 3980,
    bedOccupancy: 82,
    topDiseases: [
      { code: 'I10', name: 'ความดันโลหิตสูง', count: 11020 },
      { code: 'E11', name: 'เบาหวานชนิดที่ 2', count: 9540 },
      { code: 'J00', name: 'หวัด / ทางเดินหายใจส่วนบน', count: 6890 },
      { code: 'K30', name: 'อาหารไม่ย่อย / กระเพาะ', count: 5120 },
      { code: 'M54', name: 'ปวดหลัง', count: 4530 },
      { code: 'N39', name: 'ติดเชื้อทางเดินปัสสาวะ', count: 3720 },
      { code: 'J45', name: 'หอบหืด', count: 3180 },
      { code: 'A09', name: 'ท้องเสีย / ลำไส้อักเสบ', count: 2940 },
      { code: 'E78', name: 'ไขมันในเลือดสูง', count: 2610 },
      { code: 'F32', name: 'ภาวะซึมเศร้า', count: 1980 },
    ],
    payments: [
      { name: 'บัตรทอง (UC)', value: 60 },
      { name: 'ประกันสังคม', value: 17 },
      { name: 'ข้าราชการ (จ่ายตรง)', value: 15 },
      { name: 'ชำระเงินเอง', value: 8 },
    ],
    departments: [
      { name: 'อายุรกรรม', value: 36800 },
      { name: 'ศัลยกรรม', value: 18600 },
      { name: 'กุมารเวชกรรม', value: 16400 },
      { name: 'สูติ-นรีเวช', value: 14900 },
      { name: 'ออร์โธปิดิกส์', value: 12600 },
      { name: 'จักษุ', value: 9500 },
    ],
  },
}

// เปรียบเทียบรายปีงบประมาณ (5 ปีย้อนหลัง) — ยอดรวมทั้งปี
interface YearlyCompare { year: string; opd: number; ipd: number; surgery: number; referOut: number }
const YEARLY_COMPARE: YearlyCompare[] = [
  { year: '2565', opd: 138400, ipd: 11250, surgery: 3680, referOut: 2410 },
  { year: '2566', opd: 144200, ipd: 11600, surgery: 3850, referOut: 2520 },
  { year: '2567', opd: 150100, ipd: 12080, surgery: 3920, referOut: 2598 },
  { year: '2568', opd: 148900, ipd: 11940, surgery: 3980, referOut: 2629 },
  { year: '2569', opd: 116970, ipd: 9365,  surgery: 3120, referOut: 2048 }, // ปีปัจจุบัน (ข้อมูลยังไม่ครบปี)
]

type CompareMetric = 'opd' | 'ipd' | 'surgery' | 'referOut'
const COMPARE_METRICS: Record<CompareMetric, { label: string; unit: string; color: string }> = {
  opd:      { label: 'ผู้ป่วยนอก', unit: 'ครั้ง', color: '#0d9488' },
  ipd:      { label: 'ผู้ป่วยใน',  unit: 'ราย',  color: '#22d3ee' },
  surgery:  { label: 'การผ่าตัด',  unit: 'ครั้ง', color: '#f59e0b' },
  referOut: { label: 'ส่งต่อออก',  unit: 'ราย',  color: '#f472b6' },
}

const fmt = (n: number) => n.toLocaleString('th-TH')

const axisBase = {
  axisLine: { lineStyle: { color: 'rgba(148,163,184,0.3)' } },
  axisLabel: { color: '#94a3b8' },
  splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
}

// ── Page ─────────────────────────────────────────────────────────────────────

const PageContent = () => {
  const [year, setYear] = useState('2569')
  const [trendMode, setTrendMode] = useState<'opd' | 'ipd'>('opd')
  const d = STAT_DATA[year]

  const kpis = useMemo(() => {
    const opdTotal = d.opd.reduce((a, b) => a + b, 0)
    const ipdTotal = d.ipd.reduce((a, b) => a + b, 0)
    const referOutTotal = d.referOut.reduce((a, b) => a + b, 0)
    return [
      { label: 'ผู้ป่วยนอก (ครั้ง)', value: opdTotal,  icon: <FaUserInjured />,  color: ACCENT },
      { label: 'ผู้ป่วยใน (ราย)',   value: ipdTotal,  icon: <FaProcedures />,   color: '#22d3ee' },
      { label: 'อัตราครองเตียง',    value: d.bedOccupancy, suffix: '%', icon: <RiseOutlined />, color: '#a78bfa' },
      { label: 'การผ่าตัด (ครั้ง)', value: d.surgery, icon: <ScissorOutlined />, color: '#f59e0b' },
      { label: 'ส่งต่อออก (ราย)',   value: referOutTotal, icon: <SwapOutlined />, color: '#f472b6' },
    ]
  }, [d])

  // แนวโน้มผู้ป่วยรายเดือน (OPD bar + เส้นค่าเฉลี่ย, สลับ OPD/IPD)
  const trendOption = useMemo(() => {
    const series = trendMode === 'opd' ? d.opd : d.ipd
    const color = trendMode === 'opd' ? ACCENT : '#22d3ee'
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 16, top: 20, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: MONTHS, ...axisBase },
      yAxis: { type: 'value', ...axisBase },
      series: [{
        type: 'bar', barWidth: 18, data: series,
        itemStyle: { borderRadius: [6, 6, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color }, { offset: 1, color: color + '88' }] } },
      }],
    }
  }, [d, trendMode])

  // 10 อันดับโรค
  const diseaseOption = useMemo(() => ({
    grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', ...axisBase },
    yAxis: { type: 'category', data: [...d.topDiseases].reverse().map(x => x.name), ...axisBase },
    series: [{
      type: 'bar', barWidth: 14,
      data: [...d.topDiseases].reverse().map(x => x.count),
      itemStyle: { color: ACCENT, borderRadius: [0, 6, 6, 0] },
      label: { show: true, position: 'right', color: '#cbd5e1', formatter: (p: { value: number }) => fmt(p.value) },
    }],
  }), [d])

  // สัดส่วนสิทธิการรักษา
  const paymentOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' }, type: 'scroll' },
    series: [{
      type: 'pie', radius: ['52%', '76%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
      label: { show: true, formatter: '{d}%', color: '#cbd5e1' },
      data: d.payments.map((p, i) => ({ value: p.value, name: p.name, itemStyle: { color: PALETTE[i % PALETTE.length] } })),
    }],
  }), [d])

  // ผู้ป่วยตามแผนก
  const deptOption = useMemo(() => ({
    grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', ...axisBase },
    yAxis: { type: 'category', data: [...d.departments].reverse().map(x => x.name), ...axisBase },
    series: [{
      type: 'bar', barWidth: 16,
      data: [...d.departments].reverse().map(x => x.value),
      itemStyle: { color: '#a78bfa', borderRadius: [0, 6, 6, 0] },
      label: { show: true, position: 'right', color: '#cbd5e1', formatter: (p: { value: number }) => fmt(p.value) },
    }],
  }), [d])

  // เปรียบเทียบ 5 ปีย้อนหลัง — แสดงทุกตัวชี้วัดพร้อมกัน (แท่งกลุ่ม, 2 แกน Y)
  const compareOption = useMemo(() => {
    const mk = (m: CompareMetric, axis: number) => ({
      name: COMPARE_METRICS[m].label, type: 'bar' as const, yAxisIndex: axis, barMaxWidth: 22,
      data: YEARLY_COMPARE.map(y => y[m]),
      itemStyle: { color: COMPARE_METRICS[m].color, borderRadius: [4, 4, 0, 0] as [number, number, number, number] },
    })
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmt(v) },
      legend: { top: 0, textStyle: { color: '#94a3b8' } },
      grid: { left: 8, right: 8, top: 44, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: YEARLY_COMPARE.map(y => `ปีงบ ${y.year}`), ...axisBase },
      yAxis: [
        { type: 'value', name: 'ผู้ป่วยนอก', ...axisBase },
        {
          type: 'value', name: 'ใน / ผ่าตัด / ส่งต่อ', position: 'right',
          axisLine: { lineStyle: { color: 'rgba(148,163,184,0.3)' } }, axisLabel: { color: '#94a3b8' }, splitLine: { show: false },
        },
      ],
      series: [mk('opd', 0), mk('ipd', 1), mk('surgery', 1), mk('referOut', 1)],
    }
  }, [])

  // การส่งต่อผู้ป่วย refer in/out
  const referOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { color: '#94a3b8' }, data: ['รับส่งต่อ (Refer in)', 'ส่งต่อออก (Refer out)'] },
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: MONTHS, boundaryGap: false, ...axisBase },
    yAxis: { type: 'value', ...axisBase },
    series: [
      { name: 'รับส่งต่อ (Refer in)', type: 'line', smooth: true, symbol: 'circle', symbolSize: 7, data: d.referIn,
        lineStyle: { color: '#34d399', width: 3 }, itemStyle: { color: '#34d399' }, areaStyle: { color: 'rgba(52,211,153,0.12)' } },
      { name: 'ส่งต่อออก (Refer out)', type: 'line', smooth: true, symbol: 'circle', symbolSize: 7, data: d.referOut,
        lineStyle: { color: '#f472b6', width: 3 }, itemStyle: { color: '#f472b6' }, areaStyle: { color: 'rgba(244,114,182,0.10)' } },
    ],
  }), [d])

  const diseaseColumns = [
    { title: 'ลำดับ', key: 'rank', width: 70, align: 'center' as const, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: 'รหัส ICD-10', dataIndex: 'code', key: 'code', width: 120, render: (v: string) => <Tag color={ACCENT}>{v}</Tag> },
    { title: 'กลุ่มโรค', dataIndex: 'name', key: 'name' },
    { title: 'จำนวน (ครั้ง)', dataIndex: 'count', key: 'count', align: 'right' as const, width: 140, render: (v: number) => <Text strong>{fmt(v)}</Text> },
  ]

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: 'งานข้อมูลทางการแพทย์' },
            { title: 'เวชสถิติ / สถิติผู้ป่วย' },
          ]}
          className="mb-6"
        />

        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <Title level={2} className="m-0" style={{ display: 'flex', alignItems: 'center', gap: 10, color: ACCENT }}>
              <FaChartBar /> เวชสถิติ / สถิติผู้ป่วย
            </Title>
            <Text type="secondary">ภาพรวมสถิติการให้บริการผู้ป่วยของโรงพยาบาล</Text>
          </div>
          <Space>
            <Text type="secondary">ปีงบประมาณ</Text>
            <Select
              value={year}
              onChange={setYear}
              style={{ width: 140 }}
              options={Object.keys(STAT_DATA).sort((a, b) => Number(b) - Number(a)).map(y => ({ value: y, label: `ปีงบ ${y}` }))}
            />
          </Space>
        </div>

        {/* KPI */}
        <Row gutter={[16, 16]} className="mb-6">
          {kpis.map((k, i) => (
            <Col key={i} flex="1 1 180px" style={{ minWidth: 160 }}>
              <Card variant="borderless" className="rounded-xl h-full" style={{ borderTop: `3px solid ${k.color}` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <Text type="secondary" style={{ fontSize: 13 }}>{k.label}</Text>
                    <div style={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1.3 }}>
                      {fmt(k.value)}{k.suffix ?? ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 26, color: k.color, opacity: 0.5 }}>{k.icon}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* เปรียบเทียบ 5 ปีย้อนหลัง */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24}>
            <Card
              variant="borderless"
              className="rounded-xl"
              title={<span><FaChartBar style={{ color: ACCENT, marginRight: 8 }} />เปรียบเทียบรายปีงบประมาณ (5 ปีย้อนหลัง)</span>}
            >
              <EChart option={compareOption} height={320} showToolbar />
              <Text type="secondary" style={{ fontSize: 12 }}>
                * แกนซ้าย = ผู้ป่วยนอก, แกนขวา = ผู้ป่วยใน/ผ่าตัด/ส่งต่อ — ข้อมูลปีงบ 2569 ยังไม่ครบปี
              </Text>
            </Card>
          </Col>
        </Row>

        {/* แนวโน้ม + สิทธิการรักษา */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={16}>
            <Card
              variant="borderless"
              className="rounded-xl h-full"
              title={<span><RiseOutlined style={{ color: ACCENT, marginRight: 8 }} />แนวโน้มผู้ป่วยรายเดือน</span>}
              extra={
                <Segmented
                  size="small"
                  value={trendMode}
                  onChange={(v) => setTrendMode(v as 'opd' | 'ipd')}
                  options={[{ label: 'ผู้ป่วยนอก', value: 'opd' }, { label: 'ผู้ป่วยใน', value: 'ipd' }]}
                />
              }
            >
              <EChart option={trendOption} height={300} showToolbar />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card variant="borderless" className="rounded-xl h-full" title={<span><TeamOutlined style={{ color: ACCENT, marginRight: 8 }} />สัดส่วนตามสิทธิการรักษา</span>}>
              <EChart option={paymentOption} height={300} />
            </Card>
          </Col>
        </Row>

        {/* 10 อันดับโรค + แผนก */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={12}>
            <Card variant="borderless" className="rounded-xl h-full" title={<span><MedicineBoxOutlined style={{ color: ACCENT, marginRight: 8 }} />10 อันดับกลุ่มโรค (ICD-10)</span>}>
              <EChart option={diseaseOption} height={360} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card variant="borderless" className="rounded-xl h-full" title={<span><FaProcedures style={{ color: '#a78bfa', marginRight: 8 }} />ผู้ป่วยนอกตามกลุ่มงาน</span>}>
              <EChart option={deptOption} height={360} />
            </Card>
          </Col>
        </Row>

        {/* การส่งต่อ */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24}>
            <Card variant="borderless" className="rounded-xl" title={<span><SwapOutlined style={{ color: ACCENT, marginRight: 8 }} />การส่งต่อผู้ป่วย (Refer) รายเดือน</span>}>
              <EChart option={referOption} height={300} showToolbar />
            </Card>
          </Col>
        </Row>

        {/* ตาราง 10 อันดับโรค */}
        <Card variant="borderless" className="rounded-xl" title={<span><MedicineBoxOutlined style={{ color: ACCENT, marginRight: 8 }} />ตาราง 10 อันดับกลุ่มโรค</span>}>
          <Table
            columns={diseaseColumns}
            dataSource={d.topDiseases}
            rowKey="code"
            pagination={false}
            size="middle"
          />
        </Card>
      </div>
    </div>
  )
}

const StatisticsPage = () => (
  <AppThemeProvider colorPrimary={ACCENT}>
    <PageContent />
  </AppThemeProvider>
)

export default StatisticsPage
