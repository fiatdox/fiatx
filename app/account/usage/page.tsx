'use client'
// สถิติการเข้าใช้งานระบบแต่ละหน้า — นับจากการเปิดหน้าที่ Navbar ส่งไปบันทึก (ตาราง app_page_views)
// เลือกช่วงได้ 4 แบบ: รายเดือน / ไตรมาส / ปีงบประมาณ / กำหนดช่วงเอง — ทุกแบบแปลงเป็นช่วงวันที่ก่อนส่งให้ backend
// กดแถวในตารางหน้าเพื่อดูแนวโน้ม ช่วงเวลา และกลุ่มงานของหน้านั้นหน้าเดียว
import React, { useEffect, useMemo, useState } from 'react'
import {
  Typography, Breadcrumb, Card, Row, Col, Segmented, DatePicker, Select, Table, Input, Tag, Alert, Result, Empty, Button, ConfigProvider, Grid,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { HomeOutlined, SearchOutlined, CloseOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { FaChartBar, FaEye, FaUsers, FaCalendarDay, FaFileAlt } from 'react-icons/fa'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import 'dayjs/locale/th'
import thTH from 'antd/locale/th_TH'
import Navbar, { ROUTE_LABELS } from '@/app/components/Navbar'
import { AppThemeProvider, useThemeMode } from '@/app/components/ThemeProvider'
import { DashboardSkeleton } from '@/app/components/Skeleton'
import { StatCard } from '@/app/components/StatCard'
import ChartCard from '@/app/components/ChartCard'
import type { ChartTheme } from '@/app/components/EChart'
import { PALETTES, base, valueAxis, categoryAxis, barHeight, num, type Palette, type EChartsCoreOption } from '@/app/lib/chartKit'

const { Title, Text } = Typography

dayjs.extend(buddhistEra)
// จัดรูปด้วย locale ไทยตรง ๆ — locale ตั้งต้นของ dayjs ฝั่ง server เป็นอังกฤษ
const th = (d: dayjs.Dayjs) => d.locale('th')
// locale ของ antd ไม่ได้แปลงปีในหัวปฏิทินเป็น พ.ศ. ให้
const TH_LOCALE = { ...thTH, DatePicker: { ...thTH.DatePicker!, lang: { ...thTH.DatePicker!.lang, yearFormat: 'BBBB' } } }

const MAX_RANGE_DAYS = 731 // ตรงกับ backend
const DOW_LABEL = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'] // ISO 1–7

type Mode = 'month' | 'quarter' | 'fy' | 'range'
type PageRow = { path: string; views: number; users: number; last_at: string }
type Stats = {
  from: string; to: string; days: number; granularity: 'day' | 'month'; path: string | null
  summary: { views: number; users: number; pages: number; user_days: number }
  previous: { views: number; users: number }
  pages: PageRow[]
  series: { bucket: string; views: number; users: number }[]
  heat: { dow: number; hour: number; views: number }[]
  departments: { name: string; views: number; users: number }[]
}
type LoadResult = { key: string; data?: Stats; error?: { status: number; message: string } }

// ── ปีงบประมาณ (1 ต.ค. – 30 ก.ย.) ─────────────────────────────────────────────
const fyOf = (d: dayjs.Dayjs) => (d.month() >= 9 ? d.year() + 544 : d.year() + 543)
// ไตรมาส 1 = ต.ค.–ธ.ค., 2 = ม.ค.–มี.ค., 3 = เม.ย.–มิ.ย., 4 = ก.ค.–ก.ย.
const quarterOf = (d: dayjs.Dayjs) => (d.month() >= 9 ? 1 : Math.floor(d.month() / 3) + 2)
const quarterStart = (fy: number, q: number) =>
  q === 1 ? dayjs(`${fy - 544}-10-01`) : dayjs(`${fy - 543}-${String((q - 2) * 3 + 1).padStart(2, '0')}-01`)
const Q_LABEL = ['', 'ต.ค.–ธ.ค.', 'ม.ค.–มี.ค.', 'เม.ย.–มิ.ย.', 'ก.ค.–ก.ย.']

const fmtRange = (a: dayjs.Dayjs, b: dayjs.Dayjs) => `${th(a).format('D MMM BBBB')} – ${th(b).format('D MMM BBBB')}`
const pct1 = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 1 })
const delta = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null)

// ชื่อหน้าจากเมนู — หน้าย่อย (เช่น /x/:id) ใช้ชื่อเมนูแม่ที่ใกล้ที่สุด
const MENU_ROUTES = Object.keys(ROUTE_LABELS).filter(r => r !== '/home').sort((a, b) => b.length - a.length)
const pageInfo = (path: string): { label: string; group: string } => {
  const exact = ROUTE_LABELS[path]
  if (exact) return exact
  const parent = MENU_ROUTES.find(r => path.startsWith(`${r}/`))
  if (parent) return { label: `${ROUTE_LABELS[parent].label} › ${path.slice(parent.length + 1)}`, group: ROUTE_LABELS[parent].group }
  return { label: path, group: 'อื่น ๆ (ไม่อยู่ในเมนู)' }
}

// ── option ของกราฟ ─────────────────────────────────────────────────────────────
const trendOption = (s: Stats, P: Palette): EChartsCoreOption => {
  const daily = s.granularity === 'day'
  const labels = s.series.map(x => (daily ? th(dayjs(x.bucket)).format('D MMM') : th(dayjs(`${x.bucket}-01`)).format('MMM BB')))
  const full = s.series.map(x => (daily ? th(dayjs(x.bucket)).format('dddd D MMMM BBBB') : th(dayjs(`${x.bucket}-01`)).format('MMMM BBBB')))
  const b = base(P, num)
  const series = [
    { name: 'การเปิดหน้า', key: 'views' as const, color: P.types[0] },
    { name: 'ผู้ใช้งาน (คน)', key: 'users' as const, color: P.types[1] },
  ]
  return {
    ...b,
    tooltip: {
      ...b.tooltip, axisPointer: { type: daily ? 'line' : 'shadow' },
      formatter: (ps: { dataIndex: number; marker: string; seriesName: string; value: number }[]) =>
        `${full[ps[0].dataIndex]}<br/>${ps.map(p => `${p.marker}${p.seriesName} <b>${num(p.value)}</b>`).join('<br/>')}`,
    },
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: labels, boundaryGap: !daily, axisLabel: { color: P.muted }, axisLine: { lineStyle: { color: P.grid } }, axisTick: { show: false } },
    yAxis: valueAxis(P),
    series: series.map(x => daily
      ? { name: x.name, type: 'line', data: s.series.map(r => r[x.key]), smooth: 0.2, showSymbol: s.series.length <= 31, symbolSize: 8,
          lineStyle: { width: 2, color: x.color }, itemStyle: { color: x.color, borderColor: P.surface, borderWidth: 2 },
          areaStyle: x.key === 'views' ? { color: x.color, opacity: 0.08 } : undefined }
      : { name: x.name, type: 'bar', data: s.series.map(r => r[x.key]), barMaxWidth: 22, barGap: '10%',
          itemStyle: { color: x.color, borderRadius: [4, 4, 0, 0], borderColor: P.surface, borderWidth: 1 } }),
  }
}

// narrow = จอมือถือ: ตัดชื่อสั้นลงให้แกนค่ายังมีที่วาง
const hbarOption = (labels: string[], values: number[], P: Palette, extra: (i: number) => string, color = P.single, narrow = false): EChartsCoreOption => ({
  ...base(P, num),
  legend: { show: false },
  tooltip: {
    ...base(P, num).tooltip,
    formatter: (ps: { dataIndex: number; name: string; value: number }[]) => `${ps[0].name}<br/><b>${num(ps[0].value)}</b> ครั้ง · ${extra(ps[0].dataIndex)}`,
  },
  // top เว้นที่ให้ปุ่ม PNG/SVG ของการ์ด ไม่ให้ทับแท่งบนสุด
  grid: { left: 8, right: 56, top: 32, bottom: 8, containLabel: true },
  xAxis: { ...valueAxis(P), splitNumber: narrow ? 2 : 5 },
  yAxis: categoryAxis(P, labels, true, undefined, narrow ? 12 : 30),
  series: [{
    type: 'bar', barMaxWidth: 22, data: values,
    itemStyle: { color, borderRadius: [0, 4, 4, 0] },
    label: { show: true, position: 'right', color: P.text, formatter: (p: { value: number }) => num(p.value) },
  }],
})

const heatOption = (s: Stats, P: Palette, isDark: boolean, narrow = false): EChartsCoreOption => {
  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)
  const max = Math.max(1, ...s.heat.map(h => h.views))
  const map = new Map(s.heat.map(h => [`${h.dow}-${h.hour}`, h.views]))
  const data = [1, 2, 3, 4, 5, 6, 7].flatMap((dow, di) => hours.map((_, hr) => {
    const v = map.get(`${dow}-${hr}`) ?? 0
    // ช่องค่าสูงสลับสีตัวอักษรให้อ่านออก (โหมดมืด ramp กลับด้าน)
    return { value: [hr, di, v], label: { color: v > max * 0.5 ? (isDark ? '#0f172a' : '#ffffff') : P.text } }
  }))
  return {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text },
      formatter: (p: { data: { value: [number, number, number] } }) =>
        `วัน${DOW_LABEL[p.data.value[1] + 1]} ${hours[p.data.value[0]]}–${String(p.data.value[0]).padStart(2, '0')}:59<br/><b>${num(p.data.value[2])}</b> ครั้ง`,
    },
    grid: { left: 8, right: 8, top: 32, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: hours.map(h => h.slice(0, 2)), axisLabel: { color: P.muted, interval: narrow ? 5 : 0 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'category', data: DOW_LABEL.slice(1).map(d => (narrow ? d.slice(0, 2) : d)), inverse: true, axisLabel: { color: P.text }, axisLine: { show: false }, axisTick: { show: false } },
    visualMap: {
      min: 0, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
      itemWidth: 12, itemHeight: 160, text: ['มาก', 'น้อย'], textStyle: { color: P.muted }, inRange: { color: P.seq },
    },
    series: [{
      type: 'heatmap', data,
      itemStyle: { borderColor: P.surface, borderWidth: narrow ? 1 : 2, borderRadius: narrow ? 2 : 4 },
      // จอแคบช่องเล็กเกินใส่ตัวเลข — ดูค่าจาก tooltip หรือมุมมองตาราง
      label: { show: !narrow, fontSize: 10, formatter: (p: { value: [number, number, number] }) => (p.value[2] > 0 ? num(p.value[2]) : '') },
      emphasis: { itemStyle: { borderColor: P.text, borderWidth: 1 } },
    }],
  }
}

// ── หน้า ───────────────────────────────────────────────────────────────────────
const PageContent = () => {
  const { mode: themeMode } = useThemeMode()
  const isDark = themeMode === 'dark'
  const P = PALETTES[isDark ? 'dark' : 'light']
  const chartTheme: ChartTheme = isDark ? 'dark' : 'light'
  const screens = Grid.useBreakpoint()
  const narrow = screens.md === false

  // วันนี้ตั้งหลัง mount — คิดตอน render ฝั่ง server จะได้วันที่ไม่ตรงกับเครื่องผู้ใช้ (hydration mismatch)
  const [today, setToday] = useState<dayjs.Dayjs | null>(null)
  useEffect(() => { void Promise.resolve().then(() => setToday(dayjs().startOf('day'))) }, [])

  const [mode, setMode] = useState<Mode>('month')
  const [month, setMonth] = useState<dayjs.Dayjs | null>(null)
  const [fy, setFy] = useState<number | null>(null)
  const [quarter, setQuarter] = useState<number | null>(null)
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [path, setPath] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // ช่วงวันที่ของตัวเลือกปัจจุบัน — ส่วนที่ยังไม่ถึงตัดที่วันนี้ (กราฟไม่ดิ่งเป็น 0 ในวันอนาคต)
  const period = useMemo(() => {
    if (!today) return null
    const fyV = fy ?? fyOf(today)
    let start: dayjs.Dayjs, end: dayjs.Dayjs, title: string
    if (mode === 'month') {
      const m = month ?? today.startOf('month')
      start = m.startOf('month'); end = m.endOf('month').startOf('day'); title = th(m).format('MMMM BBBB')
    } else if (mode === 'quarter') {
      const q = quarter ?? quarterOf(today)
      start = quarterStart(fyV, q); end = start.add(3, 'month').subtract(1, 'day'); title = `ไตรมาส ${q} ปีงบประมาณ ${fyV} (${Q_LABEL[q]})`
    } else if (mode === 'fy') {
      start = dayjs(`${fyV - 544}-10-01`); end = dayjs(`${fyV - 543}-09-30`); title = `ปีงบประมาณ ${fyV}`
    } else {
      const r = range ?? [today.subtract(29, 'day'), today]
      start = r[0].startOf('day'); end = r[1].startOf('day'); title = 'ช่วงเวลาที่กำหนด'
    }
    const partial = end.isAfter(today)
    const to = partial ? today : end
    return { start, end, to, partial, title, fyV, days: to.diff(start, 'day') + 1 }
  }, [today, mode, month, fy, quarter, range])

  const tooLong = !!period && period.days > MAX_RANGE_DAYS
  const notStarted = !!period && period.start.isAfter(period.to)
  const reqKey = period && !tooLong && !notStarted
    ? `from=${period.start.format('YYYY-MM-DD')}&to=${period.to.format('YYYY-MM-DD')}${path ? `&path=${encodeURIComponent(path)}` : ''}`
    : null

  // เก็บผลพร้อม key ของคำขอ — loading = ยังไม่ได้ผลของคำขอล่าสุด (ไม่ต้อง setState ตอนเริ่มโหลด)
  const [result, setResult] = useState<LoadResult | null>(null)
  useEffect(() => {
    if (!reqKey) return
    let alive = true
    fetch(`/api/v1/page-views/stats?${reqKey}`)
      .then(async res => {
        const j = await res.json().catch(() => null)
        if (!alive) return
        if (res.ok && j?.success) setResult({ key: reqKey, data: j.data })
        else setResult({ key: reqKey, error: { status: res.status, message: j?.message || 'โหลดสถิติไม่สำเร็จ' } })
      })
      .catch(() => { if (alive) setResult({ key: reqKey, error: { status: 0, message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' } }) })
    return () => { alive = false }
  }, [reqKey])
  const loading = !!reqKey && result?.key !== reqKey
  // ระหว่างโหลดช่วงใหม่ยังแสดงข้อมูลชุดเดิมไว้ (จางลง) ไม่ให้หน้ากระพริบเป็นโครงว่าง
  const stats = result?.data ?? null

  const fyOptions = useMemo(() => {
    if (!today) return []
    const cur = fyOf(today)
    return [0, 1, 2, 3, 4].map(i => ({ value: cur - i, label: `ปีงบประมาณ ${cur - i}${i === 0 ? ' (ปัจจุบัน)' : ''}` }))
  }, [today])

  const pageRows = useMemo(() => {
    const total = stats?.pages.reduce((a, p) => a + p.views, 0) ?? 0
    return (stats?.pages ?? []).map(p => ({ ...p, ...pageInfo(p.path), share: total ? (p.views * 100) / total : 0 }))
  }, [stats])
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? pageRows.filter(r => r.label.toLowerCase().includes(q) || r.path.includes(q) || r.group.toLowerCase().includes(q)) : pageRows
  }, [pageRows, search])

  const groups = useMemo(() => {
    const m = new Map<string, { views: number; pages: number }>()
    for (const r of pageRows) {
      const g = m.get(r.group) ?? { views: 0, pages: 0 }
      g.views += r.views; g.pages += 1
      m.set(r.group, g)
    }
    return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.views - a.views)
  }, [pageRows])

  const selectedLabel = path ? pageInfo(path).label : null

  // ── ตัวควบคุมช่วงเวลา ──
  const controls = today && (
    <Card style={{ borderRadius: 14, marginBottom: 16 }}>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ดูตาม</Text>
          <Segmented<Mode>
            value={mode} onChange={setMode}
            options={[
              { label: 'รายเดือน', value: 'month' }, { label: 'ไตรมาส', value: 'quarter' },
              { label: 'ปีงบประมาณ', value: 'fy' }, { label: 'ช่วงเวลา', value: 'range' },
            ]}
          />
        </div>
        {mode === 'month' && (
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>เดือน</Text>
            <DatePicker
              picker="month" allowClear={false} value={month ?? today.startOf('month')} onChange={v => v && setMonth(v)}
              format={v => th(v).format('MMMM BBBB')} disabledDate={d => d.isAfter(today, 'month')} style={{ width: 180 }}
            />
          </div>
        )}
        {(mode === 'quarter' || mode === 'fy') && (
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ปีงบประมาณ</Text>
            <Select value={period?.fyV} options={fyOptions} onChange={setFy} style={{ width: 200 }} />
          </div>
        )}
        {mode === 'quarter' && (
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ไตรมาส</Text>
            <Segmented<number>
              value={quarter ?? quarterOf(today)} onChange={setQuarter}
              options={[1, 2, 3, 4].map(q => ({
                value: q, label: `Q${q}`,
                // ไตรมาสที่ยังไม่เริ่มกดไม่ได้
                disabled: quarterStart(period?.fyV ?? fyOf(today), q).isAfter(today),
              }))}
            />
          </div>
        )}
        {mode === 'range' && (
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ช่วงวันที่</Text>
            <DatePicker.RangePicker
              allowClear={false} value={range ?? [today.subtract(29, 'day'), today]}
              onChange={v => v?.[0] && v[1] && setRange([v[0], v[1]])}
              format="DD/MM/BBBB" disabledDate={d => d.isAfter(today, 'day')}
              presets={[
                { label: '7 วันล่าสุด', value: [today.subtract(6, 'day'), today] },
                { label: '30 วันล่าสุด', value: [today.subtract(29, 'day'), today] },
                { label: '90 วันล่าสุด', value: [today.subtract(89, 'day'), today] },
              ]}
            />
          </div>
        )}
        {period && (
          <div style={{ paddingBottom: 6 }}>
            <Text strong>{period.title}</Text>
            <Text type="secondary"> · {fmtRange(period.start, period.to)}{period.partial && ' (ถึงวันนี้)'} · {num(Math.max(period.days, 0))} วัน</Text>
          </div>
        )}
      </div>
      {path && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Text type="secondary">ดูเฉพาะหน้า</Text>
          <Tag color="blue" closable closeIcon={<CloseOutlined />} onClose={() => setPath(null)} style={{ fontSize: 13, padding: '2px 8px' }}>
            {selectedLabel} <span style={{ opacity: 0.7 }}>({path})</span>
          </Tag>
        </div>
      )}
    </Card>
  )

  // ── เนื้อหา ──
  let body: React.ReactNode
  const err = result?.key === reqKey ? result?.error : undefined
  if (tooLong) body = <Alert type="warning" showIcon title={`เลือกช่วงได้ไม่เกิน ${num(MAX_RANGE_DAYS)} วัน`} />
  else if (notStarted) body = <Card style={{ borderRadius: 14 }}><Empty description="ช่วงเวลานี้ยังไม่เริ่ม" /></Card>
  else if (err?.status === 403) body = <Result status="403" title="ไม่มีสิทธิ์เข้าถึง" subTitle="หน้านี้สงวนไว้สำหรับผู้ดูแลระบบและเจ้าหน้าที่ IT" />
  else if (err) body = <Alert type="error" showIcon title="โหลดสถิติไม่สำเร็จ" description={err.message} />
  else if (!stats) body = <DashboardSkeleton />
  else {
    const s = stats.summary
    const cards = [
      { label: 'การเปิดหน้า', value: num(s.views), suffix: 'ครั้ง', icon: <FaEye />, accent: 'sky' as const, d: delta(s.views, stats.previous.views) },
      { label: 'ผู้ใช้งาน', value: num(s.users), suffix: 'คน', icon: <FaUsers />, accent: 'emerald' as const, d: delta(s.users, stats.previous.users) },
      { label: 'เฉลี่ยต่อวัน', value: num(Math.round(s.views / Math.max(stats.days, 1))), suffix: 'ครั้ง', icon: <FaCalendarDay />, accent: 'amber' as const,
        foot: `${pct1(s.user_days ? s.views / s.user_days : 0)} หน้า ต่อคนต่อวัน` },
      path
        ? { label: 'สัดส่วนของทั้งระบบ', value: pct1(pageRows.find(r => r.path === path)?.share ?? 0), suffix: '%', icon: <FaFileAlt />, accent: 'violet' as const,
            foot: 'ของการเปิดหน้าทั้งหมดในช่วงนี้' }
        : { label: 'หน้าที่ถูกใช้งาน', value: num(s.pages), suffix: 'หน้า', icon: <FaFileAlt />, accent: 'violet' as const,
            foot: `จาก ${num(groups.length)} กลุ่มเมนู` },
    ]
    const top = pageRows.slice(0, 15)
    const deptRows = stats.departments
    const unit = stats.granularity === 'day' ? 'วัน' : 'เดือน'

    const columns: ColumnsType<(typeof pageRows)[number]> = [
      { title: '#', key: 'rank', width: 52, align: 'right', render: (_, r) => pageRows.indexOf(r) + 1 },
      {
        title: 'หน้า', dataIndex: 'label', ellipsis: true,
        render: (v: string, r) => (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: r.path === path ? 700 : 500 }}>{v}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.path}</Text>
          </div>
        ),
      },
      { title: 'กลุ่มเมนู', dataIndex: 'group', ellipsis: true, width: 220, responsive: ['lg'] },
      { title: 'การเปิด', dataIndex: 'views', width: 100, align: 'right', sorter: (a, b) => a.views - b.views, render: num },
      { title: 'ผู้ใช้', dataIndex: 'users', width: 90, align: 'right', sorter: (a, b) => a.users - b.users, render: num },
      {
        title: 'สัดส่วน', dataIndex: 'share', width: 170, responsive: ['md'],
        render: (v: number) => (
          <div className="flex items-center gap-2">
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--app-border)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(v * 2, 100)}%`, height: '100%', borderRadius: 3, background: P.single }} />
            </div>
            <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', minWidth: 44, textAlign: 'right' }}>{pct1(v)}%</span>
          </div>
        ),
      },
      {
        title: 'ใช้ล่าสุด', dataIndex: 'last_at', width: 150, responsive: ['md'], sorter: (a, b) => a.last_at.localeCompare(b.last_at),
        render: (v: string) => th(dayjs(v)).format('D MMM BB HH:mm'),
      },
    ]

    body = (
      <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity .2s' }}>
        <Row gutter={[16, 16]} className="mb-4">
          {cards.map(c => (
            <Col key={c.label} xs={12} xl={6}>
              <StatCard
                label={c.label} value={c.value} suffix={c.suffix} icon={c.icon} accent={c.accent} isDark={isDark}
                footer={'d' in c
                  ? (c.d == null
                    ? <Text type="secondary" style={{ fontSize: 12 }}>ไม่มีข้อมูลช่วงก่อนหน้าให้เทียบ</Text>
                    : <Text type="secondary" style={{ fontSize: 12 }}>
                        {c.d >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {pct1(Math.abs(c.d))}% จากช่วงก่อนหน้า ({num(stats.days)} วัน)
                      </Text>)
                  : <Text type="secondary" style={{ fontSize: 12 }}>{c.foot}</Text>}
              />
            </Col>
          ))}
        </Row>

        {s.views === 0 ? (
          <Card style={{ borderRadius: 14 }}><Empty description="ไม่มีการเข้าใช้งานในช่วงเวลานี้" /></Card>
        ) : (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <ChartCard
                title={`แนวโน้มการเข้าใช้งานราย${unit}${selectedLabel ? ` · ${selectedLabel}` : ''}`} theme={chartTheme} height={320}
                option={trendOption(stats, P)}
                columns={[
                  { title: unit === 'วัน' ? 'วันที่' : 'เดือน', dataIndex: 'label' },
                  { title: 'การเปิดหน้า', dataIndex: 'views', align: 'right' },
                  { title: 'ผู้ใช้งาน (คน)', dataIndex: 'users', align: 'right' },
                ]}
                rows={stats.series.map(x => ({
                  key: x.bucket,
                  label: unit === 'วัน' ? th(dayjs(x.bucket)).format('D MMM BBBB') : th(dayjs(`${x.bucket}-01`)).format('MMMM BBBB'),
                  views: num(x.views), users: num(x.users),
                }))}
              />
            </Col>
            {!path && (
              <>
                <Col xs={24} xl={14}>
                  <ChartCard
                    title={`หน้าที่ใช้งานมากที่สุด ${top.length} อันดับ`} theme={chartTheme} height={barHeight(top.length)}
                    note={<Text type="secondary" style={{ fontSize: 12 }}>คลิกแท่งเพื่อดูเฉพาะหน้านั้น</Text>}
                    option={hbarOption(top.map(r => r.label), top.map(r => r.views), P, i => `${num(top[i].users)} คน`, P.single, narrow)}
                    onChartClick={p => top[p.dataIndex] && setPath(top[p.dataIndex].path)}
                    columns={[
                      { title: 'หน้า', dataIndex: 'label' },
                      { title: 'การเปิด', dataIndex: 'views', align: 'right' },
                      { title: 'ผู้ใช้', dataIndex: 'users', align: 'right' },
                    ]}
                    rows={top.map(r => ({ key: r.path, label: r.label, views: num(r.views), users: num(r.users) }))}
                  />
                </Col>
                <Col xs={24} xl={10}>
                  <ChartCard
                    title="การเปิดหน้าตามกลุ่มเมนู" theme={chartTheme} height={barHeight(groups.length)}
                    option={hbarOption(groups.map(g => g.name), groups.map(g => g.views), P, i => `${num(groups[i].pages)} หน้า`, P.types[2], narrow)}
                    columns={[
                      { title: 'กลุ่มเมนู', dataIndex: 'name' },
                      { title: 'การเปิด', dataIndex: 'views', align: 'right' },
                      { title: 'จำนวนหน้า', dataIndex: 'pages', align: 'right' },
                    ]}
                    rows={groups.map(g => ({ key: g.name, name: g.name, views: num(g.views), pages: num(g.pages) }))}
                  />
                </Col>
              </>
            )}
            <Col xs={24} xl={14}>
              <ChartCard
                title="ช่วงเวลาที่ใช้งาน (วัน × ชั่วโมง)" theme={chartTheme}
                option={heatOption(stats, P, isDark, narrow)} height={narrow ? 300 : 340}
                columns={[
                  { title: 'วัน', dataIndex: 'dow' },
                  ...[...Array(24).keys()].map(h => ({ title: String(h).padStart(2, '0'), dataIndex: `h${h}`, align: 'right' as const })),
                ]}
                rows={[1, 2, 3, 4, 5, 6, 7].map(d => ({
                  key: String(d), dow: DOW_LABEL[d],
                  ...Object.fromEntries([...Array(24).keys()].map(h => [`h${h}`, num(stats.heat.find(x => x.dow === d && x.hour === h)?.views ?? 0)])),
                }))}
              />
            </Col>
            <Col xs={24} xl={10}>
              <ChartCard
                title={`กลุ่มงานที่ใช้งาน ${deptRows.length} อันดับแรก`} theme={chartTheme} height={Math.max(340, barHeight(deptRows.length))}
                option={hbarOption(deptRows.map(d => d.name), deptRows.map(d => d.views), P, i => `${num(deptRows[i].users)} คน`, P.types[3], narrow)}
                columns={[
                  { title: 'กลุ่มงาน', dataIndex: 'name' },
                  { title: 'การเปิด', dataIndex: 'views', align: 'right' },
                  { title: 'ผู้ใช้', dataIndex: 'users', align: 'right' },
                ]}
                rows={deptRows.map(d => ({ key: d.name, name: d.name, views: num(d.views), users: num(d.users) }))}
              />
            </Col>
          </Row>
        )}

        <Card
          title={`การเข้าใช้งานรายหน้า (${num(pageRows.length)} หน้า)`} style={{ borderRadius: 14, marginTop: 16 }}
        >
          <Input
            allowClear prefix={<SearchOutlined />} placeholder="ค้นหาชื่อหน้า / path / กลุ่ม" value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320, marginBottom: 8 }}
          />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            คลิกแถวเพื่อดูแนวโน้ม ช่วงเวลา และกลุ่มงานของหน้านั้น · ผู้ใช้ = จำนวนคนไม่ซ้ำ · สัดส่วนเทียบกับการเปิดหน้าทั้งหมดในช่วงนี้
          </Text>
          <Table
            size="small" rowKey="path" columns={columns} dataSource={filteredRows}
            pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
            onRow={r => ({ onClick: () => setPath(r.path === path ? null : r.path), style: { cursor: 'pointer' } })}
            rowClassName={r => (r.path === path ? 'ant-table-row-selected' : '')}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-375 mx-auto">
        <Breadcrumb
          className="mb-4"
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: 'ผู้ดูแลระบบ' },
            { title: 'สถิติการเข้าใช้งานระบบ' },
          ]}
        />
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: 'rgba(14,165,233,0.15)', color: '#0ea5e9' }}>
            <FaChartBar className="text-xl" />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>สถิติการเข้าใช้งานระบบ</Title>
            <Text type="secondary">นับทุกครั้งที่ผู้ใช้เปิดหน้า (เปิดหน้าเดิมซ้ำภายใน 10 วินาทีไม่นับ) · เวลาไทย</Text>
          </div>
          {path && <Button className="ml-auto" onClick={() => setPath(null)}>ดูทุกหน้า</Button>}
        </div>
        {controls}
        {body}
      </div>
    </div>
  )
}

export default function UsageStatsPage() {
  return (
    <AppThemeProvider colorPrimary="#0ea5e9">
      <ConfigProvider locale={TH_LOCALE}>
        <PageContent />
      </ConfigProvider>
    </AppThemeProvider>
  )
}
