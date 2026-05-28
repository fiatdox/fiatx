'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Table, Input, Button, Space, ConfigProvider, Card, Tag, Drawer, Form,
  Select, Breadcrumb, Tooltip, Row, Col, DatePicker, Statistic,
  Typography, InputNumber, Tabs, Progress, Alert, theme, Empty, App, Spin,
} from 'antd'
import {
  EditOutlined, DeleteOutlined, SearchOutlined, PlusOutlined, HomeOutlined,
  DesktopOutlined, UserOutlined, BarChartOutlined, CalendarOutlined,
  WarningOutlined, BulbOutlined, RiseOutlined, FallOutlined, FireOutlined,
  TableOutlined, DashboardOutlined, PieChartOutlined,
} from '@ant-design/icons'
import Navbar from '../../../components/Navbar'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import EChart from '@/app/components/EChart'

const { Title, Text } = Typography
const { TextArea } = Input

// =============================================================================
// Types (จัดให้ตรงกับ view core_kon.it_activity_log_summary)
// =============================================================================
type TaskStatus = 'done' | 'in_progress' | 'waiting' | 'pending'
type Priority = 'urgent' | 'normal' | 'low'
type RequestSource = 'call' | 'walk_in' | 'email' | 'alert' | 'scheduled' | 'inspection' | 'other'
type Nature = 'reactive' | 'proactive' | 'neutral'

interface ActivityLog {
  log_id: number
  log_date: string         // YYYY-MM-DD
  log_date_th?: string     // DD/MM/YYYY
  staff_id: number
  staff_name: string
  staff_role?: string | null
  type_code: string
  type_name_th: string
  activity_nature: Nature
  system_code: string
  system_name: string
  status_code: TaskStatus
  status_name: string
  status_color: string
  is_closed: boolean
  start_time: string       // HH:mm
  end_time: string         // HH:mm
  time_slot?: string
  duration_hours?: number
  minutes_used: number
  hours_used?: number
  detail: string
  outcome: string | null
  priority_code: Priority
  priority_name?: string
  priority_color?: string
  source_code: RequestSource
  source_name?: string
  source_is_planned?: boolean
  location: string | null
  asset_code: string | null
  affected_users: number
  is_overtime: boolean
  ticket_id: string | null
}

interface MasterStaff   { staff_id: number; staff_code: string; full_name_th: string; role_th?: string | null }
interface MasterType    { type_code: string; type_name_th: string; nature: Nature; color_hint?: string | null }
interface MasterSystem  { system_code: string; system_name_th: string }
interface MasterStatus  { status_code: TaskStatus; status_name_th: string; color_hex: string; is_closed: boolean; sort_order: number }
interface MasterPriority { priority_code: Priority; priority_name_th: string; color_hex: string }
interface MasterSource  { source_code: RequestSource; source_name_th: string; is_planned: boolean }

interface MasterData {
  staff: MasterStaff[]
  types: MasterType[]
  systems: MasterSystem[]
  statuses: MasterStatus[]
  priorities: MasterPriority[]
  request_sources: MasterSource[]
  config?: { day_start_hour?: number; day_end_hour?: number }
}

// =============================================================================
// Constants
// =============================================================================
const DAY_START = 8
const DAY_END = 17
const HOUR_RANGE = DAY_END - DAY_START

const HOUR_OPTIONS = Array.from({ length: HOUR_RANGE + 1 }, (_, i) => {
  const h = DAY_START + i
  return { label: `${String(h).padStart(2, '0')}:00`, value: `${String(h).padStart(2, '0')}:00` }
})

const getHour = (t: string): number => parseInt(t.split(':')[0], 10)

const STATUS_META: Record<TaskStatus, { color: string; bg: string; ring: string }> = {
  done:        { color: '#22c55e', bg: '#14532d', ring: 'rgba(34,197,94,0.45)' },
  in_progress: { color: '#3b82f6', bg: '#1e3a8a', ring: 'rgba(59,130,246,0.45)' },
  waiting:     { color: '#f59e0b', bg: '#78350f', ring: 'rgba(245,158,11,0.45)' },
  pending:     { color: '#ef4444', bg: '#7f1d1d', ring: 'rgba(239,68,68,0.5)' },
}

const PRIORITY_TAG: Record<Priority, string> = {
  urgent: 'red',
  normal: 'blue',
  low:    'default',
}

const FY_MONTH_LABELS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.']
const CHART_PALETTE = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

const getFiscalYearBE = (d: dayjs.Dayjs): number => {
  const calYear = d.year()
  const month = d.month() + 1
  return (month >= 10 ? calYear + 1 : calYear) + 543
}

const fiscalYearMonths = (fyBE: number): dayjs.Dayjs[] => {
  const startCalYear = fyBE - 543 - 1
  return Array.from({ length: 12 }, (_, i) => {
    const monthIndex = (9 + i) % 12
    const yearOffset = (9 + i) >= 12 ? 1 : 0
    return dayjs(`${startCalYear + yearOffset}-${String(monthIndex + 1).padStart(2, '0')}-01`)
  })
}

const formatMinutes = (m: number) => {
  if (m < 60) return `${m} นาที`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} ชม.` : `${h} ชม. ${r} น.`
}

const toThaiDate = (ymd: string) => {
  if (!ymd) return '-'
  const d = dayjs(ymd)
  return d.isValid() ? d.format('DD/MM/YYYY') : ymd
}

// =============================================================================
// Page Content
// =============================================================================
function ActivityPageContent() {
  const { message: messageApi } = App.useApp()

  // ----- Master + logs state -----
  const [master, setMaster] = useState<MasterData | null>(null)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)

  // ----- UI state -----
  const [searchText, setSearchText] = useState('')
  const [filterStaff, setFilterStaff] = useState<number | undefined>()
  const [filterStatus, setFilterStatus] = useState<TaskStatus | undefined>()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null)
  const [scheduleDate, setScheduleDate] = useState<dayjs.Dayjs>(dayjs())
  const [analysisRange, setAnalysisRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [dashboardYear, setDashboardYear] = useState<number>(getFiscalYearBE(dayjs()))
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  // ----- API helpers -----
  const loadMaster = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/it/activity/master')
      const json = await res.json()
      if (json?.success) setMaster(json.data)
      else messageApi.error(json?.error?.message || 'โหลดข้อมูลตั้งต้นไม่สำเร็จ')
    } catch {
      messageApi.error('โหลดข้อมูลตั้งต้นไม่สำเร็จ')
    }
  }, [messageApi])

  const loadLogs = useCallback(async (fyBE: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/it/activity/logs?fiscal_year=${fyBE}&limit=1000`)
      const json = await res.json()
      if (json?.success) setLogs(json.data || [])
      else messageApi.error(json?.error?.message || 'โหลดรายการกิจกรรมไม่สำเร็จ')
    } catch {
      messageApi.error('โหลดรายการกิจกรรมไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [messageApi])

  useEffect(() => { loadMaster() }, [loadMaster])
  useEffect(() => { loadLogs(dashboardYear) }, [dashboardYear, loadLogs])

  // ----- Derived dictionaries from master -----
  const staffOptions = useMemo(
    () => master?.staff.map(s => ({ label: s.full_name_th, value: s.staff_id })) ?? [],
    [master],
  )
  const typeOptions = useMemo(
    () => master?.types.map(t => ({ label: t.type_name_th, value: t.type_code })) ?? [],
    [master],
  )
  const systemOptions = useMemo(
    () => master?.systems.map(s => ({ label: s.system_name_th, value: s.system_code })) ?? [],
    [master],
  )
  const statusOptions = useMemo(
    () => master?.statuses.map(s => ({ label: s.status_name_th, value: s.status_code })) ?? [],
    [master],
  )
  const priorityOptions = useMemo(
    () => master?.priorities.map(p => ({ label: p.priority_name_th, value: p.priority_code })) ?? [],
    [master],
  )
  const sourceOptions = useMemo(
    () => master?.request_sources.map(s => ({ label: s.source_name_th, value: s.source_code })) ?? [],
    [master],
  )
  const typeColor: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    master?.types.forEach(t => { map[t.type_code] = t.color_hint || 'default' })
    return map
  }, [master])
  const statusLabel: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    master?.statuses.forEach(s => { map[s.status_code] = s.status_name_th })
    return map
  }, [master])
  const priorityLabel: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    master?.priorities.forEach(p => { map[p.priority_code] = p.priority_name_th })
    return map
  }, [master])
  // ----- Filters for list tab -----
  const filtered = useMemo(() => logs.filter(l => {
    const matchSearch = !searchText
      || l.detail.toLowerCase().includes(searchText.toLowerCase())
      || l.staff_name.includes(searchText)
      || l.type_name_th.includes(searchText)
      || (l.asset_code || '').toLowerCase().includes(searchText.toLowerCase())
      || (l.ticket_id || '').toLowerCase().includes(searchText.toLowerCase())
    const matchStaff = !filterStaff || l.staff_id === filterStaff
    const matchStatus = !filterStatus || l.status_code === filterStatus
    return matchSearch && matchStaff && matchStatus
  }), [logs, searchText, filterStaff, filterStatus])

  // ----- Analysis (วิเคราะห์ Pain Points) — derive from logs -----
  const analysisLogs = useMemo(() => {
    if (!analysisRange) return logs
    return logs.filter(l => {
      const d = dayjs(l.log_date)
      return !d.isBefore(analysisRange[0], 'day') && !d.isAfter(analysisRange[1], 'day')
    })
  }, [logs, analysisRange])

  const analysisTotalMinutes = useMemo(() => analysisLogs.reduce((s, l) => s + l.minutes_used, 0), [analysisLogs])
  const analysisTotalHours = analysisTotalMinutes / 60

  const byActivityType = useMemo(() => (master?.types ?? [])
    .map(t => {
      const matching = analysisLogs.filter(l => l.type_code === t.type_code)
      const minutes = matching.reduce((s, l) => s + l.minutes_used, 0)
      return { code: t.type_code, label: t.type_name_th, count: matching.length, minutes, hours: minutes / 60 }
    })
    .filter(x => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes), [master, analysisLogs])

  const bySystem = useMemo(() => (master?.systems ?? [])
    .map(s => {
      const matching = analysisLogs.filter(l => l.system_code === s.system_code)
      const minutes = matching.reduce((sum, l) => sum + l.minutes_used, 0)
      return { code: s.system_code, label: s.system_name_th, count: matching.length, minutes, hours: minutes / 60 }
    })
    .filter(x => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes), [master, analysisLogs])

  const reactiveMinutes = useMemo(() => analysisLogs.filter(l => l.activity_nature === 'reactive').reduce((s, l) => s + l.minutes_used, 0), [analysisLogs])
  const proactiveMinutes = useMemo(() => analysisLogs.filter(l => l.activity_nature === 'proactive').reduce((s, l) => s + l.minutes_used, 0), [analysisLogs])
  const reactivePercent = analysisTotalMinutes > 0 ? Math.round((reactiveMinutes / analysisTotalMinutes) * 100) : 0
  const proactivePercent = analysisTotalMinutes > 0 ? Math.round((proactiveMinutes / analysisTotalMinutes) * 100) : 0

  const byStaff = useMemo(() => (master?.staff ?? []).map(s => {
    const staffLogs = analysisLogs.filter(l => l.staff_id === s.staff_id)
    const staffMinutes = staffLogs.reduce((sum, l) => sum + l.minutes_used, 0)
    const topType = [...(master?.types ?? [])]
      .map(t => ({ label: t.type_name_th, code: t.type_code, minutes: staffLogs.filter(l => l.type_code === t.type_code).reduce((sum, l) => sum + l.minutes_used, 0) }))
      .sort((a, b) => b.minutes - a.minutes)[0]
    return { name: s.full_name_th, id: s.staff_id, count: staffLogs.length, minutes: staffMinutes, hours: staffMinutes / 60, topType: topType && topType.minutes > 0 ? topType.label : '-', topTypeCode: topType?.code || '' }
  }).filter(s => s.minutes > 0).sort((a, b) => b.minutes - a.minutes), [master, analysisLogs])

  const maintenanceLogs = useMemo(() => analysisLogs.filter(l => l.type_code === 'maintenance'), [analysisLogs])
  const painPointSystem = useMemo(() => (master?.systems ?? [])
    .map(s => {
      const sysLogs = maintenanceLogs.filter(l => l.system_code === s.system_code)
      const m = sysLogs.reduce((sum, l) => sum + l.minutes_used, 0)
      return { system: s.system_name_th, hours: m / 60, minutes: m, count: sysLogs.length }
    })
    .filter(x => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes), [master, maintenanceLogs])

  const insights = useMemo(() => {
    const out: { type: 'warning' | 'info' | 'success'; message: string }[] = []
    if (reactivePercent > 50) {
      out.push({ type: 'warning', message: `${reactivePercent}% ของเวลาทั้งหมดเป็นงานซ่อมบำรุงเชิงรับ — ควรวางแผน Preventive Maintenance เพื่อลดงานฉุกเฉิน` })
    }
    if (painPointSystem[0]?.count >= 2) {
      out.push({ type: 'warning', message: `"${painPointSystem[0].system}" เป็นระบบที่ต้องซ่อมบ่อยที่สุด (${painPointSystem[0].count} ครั้ง / ${painPointSystem[0].hours.toFixed(1)} ชม.) — ควรพิจารณาจัดหาอุปกรณ์สำรองหรืออัปเกรด` })
    }
    if (bySystem[0] && bySystem[0].minutes / (analysisTotalMinutes || 1) > 0.4) {
      out.push({ type: 'info', message: `ระบบ "${bySystem[0].label}" กินเวลาทีมมากที่สุด (${Math.round(bySystem[0].minutes / analysisTotalMinutes * 100)}%) — ควรพิจารณาจัดสรรทรัพยากรหรือ Automation` })
    }
    if (proactiveMinutes > reactiveMinutes) {
      out.push({ type: 'success', message: `ทีมใช้เวลากับงานเชิงรุก (${(proactiveMinutes / 60).toFixed(1)} ชม.) มากกว่างานซ่อมบำรุงเชิงรับ (${(reactiveMinutes / 60).toFixed(1)} ชม.) — ดีมาก แสดงถึงการบริหารงานเชิงป้องกัน` })
    }
    if (byStaff.length > 1 && byStaff[0].minutes / byStaff[byStaff.length - 1].minutes > 2) {
      out.push({ type: 'info', message: `ภาระงานไม่สมดุล — ${byStaff[0].name} มีเวลางานสูงกว่าคนอื่นอย่างมีนัยสำคัญ ควรพิจารณาจัดสรรงานใหม่` })
    }
    return out
  }, [analysisTotalMinutes, bySystem, byStaff, painPointSystem, reactiveMinutes, proactiveMinutes, reactivePercent])

  // ----- Schedule tab -----
  const logsForDate = useMemo(() => {
    const ymd = scheduleDate.format('YYYY-MM-DD')
    return logs.filter(l => dayjs(l.log_date).format('YYYY-MM-DD') === ymd)
  }, [logs, scheduleDate])

  const staffInDate = useMemo(() => {
    const ids = new Set(logsForDate.map(l => l.staff_id))
    return (master?.staff ?? []).filter(s => ids.has(s.staff_id))
  }, [master, logsForDate])

  const dayTotalMinutes = useMemo(() => logsForDate.reduce((s, l) => s + l.minutes_used, 0), [logsForDate])

  // ----- Dashboard (FY-scoped) -----
  const fyOptions = useMemo(() => {
    const years = new Set<number>()
    logs.forEach(l => years.add(getFiscalYearBE(dayjs(l.log_date))))
    const current = getFiscalYearBE(dayjs())
    years.add(current)
    years.add(dashboardYear)
    return Array.from(years).sort((a, b) => b - a).map(y => ({ label: `ปีงบ ${y}`, value: y }))
  }, [logs, dashboardYear])

  const fyLogs = logs // logs ถูกโหลดตาม dashboardYear แล้ว
  const fyTotalMinutes = useMemo(() => fyLogs.reduce((s, l) => s + l.minutes_used, 0), [fyLogs])
  const fyTotalHours = fyTotalMinutes / 60
  const fyDistinctDays = useMemo(() => new Set(fyLogs.map(l => dayjs(l.log_date).format('YYYY-MM-DD'))).size, [fyLogs])
  const fyOpenCount = useMemo(() => fyLogs.filter(l => !l.is_closed).length, [fyLogs])
  const fyTopType = useMemo(() => {
    const map = new Map<string, number>()
    fyLogs.forEach(l => map.set(l.type_name_th, (map.get(l.type_name_th) ?? 0) + l.minutes_used))
    let best = { type: '-', minutes: 0 }
    map.forEach((m, t) => { if (m > best.minutes) best = { type: t, minutes: m } })
    return best
  }, [fyLogs])

  // ---- Chart 1: Donut — สัดส่วนประเภทกิจกรรม ----
  const chartTypeDonut = useMemo(() => {
    const data = (master?.types ?? [])
      .map((t, i) => ({
        name: t.type_name_th,
        value: fyLogs.filter(l => l.type_code === t.type_code).reduce((s, l) => s + l.minutes_used, 0),
        itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
      }))
      .filter(d => d.value > 0)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) => `${p.name}<br/>${p.value} นาที (${p.percent}%)` },
      legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 2 },
        label: { formatter: '{d}%', fontSize: 11, color: '#e2e8f0' },
        labelLine: { length: 8, length2: 8 },
        data,
      }],
    }
  }, [master, fyLogs])

  // ---- Chart 2: Horizontal Bar — ชั่วโมงรวมตามระบบ ----
  const chartSystemBar = useMemo(() => {
    const data = (master?.systems ?? [])
      .map(s => ({
        name: s.system_name_th,
        value: fyLogs.filter(l => l.system_code === s.system_code).reduce((sum, l) => sum + l.minutes_used, 0) / 60,
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => a.value - b.value)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}: ${p[0].value.toFixed(1)} ชม.` },
      grid: { left: 90, right: 50, top: 20, bottom: 30 },
      xAxis: { type: 'value', name: 'ชม.', nameTextStyle: { color: '#94a3b8' }, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { color: '#e2e8f0', fontSize: 11 } },
      series: [{
        type: 'bar',
        data: data.map((d, i) => ({
          value: Number(d.value.toFixed(1)),
          itemStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [
              { offset: 0, color: CHART_PALETTE[i % CHART_PALETTE.length] + '55' },
              { offset: 1, color: CHART_PALETTE[i % CHART_PALETTE.length] },
            ]},
            borderRadius: [0, 6, 6, 0],
          },
        })),
        label: { show: true, position: 'right', formatter: '{c} ชม.', color: '#e2e8f0', fontSize: 11 },
        barWidth: '60%',
      }],
    }
  }, [master, fyLogs])

  // ---- Chart 3: Line — แนวโน้มชั่วโมงงานรายเดือน ----
  const chartMonthlyLine = useMemo(() => {
    const months = fiscalYearMonths(dashboardYear)
    const totalSeries = months.map(m => {
      const ml = fyLogs.filter(l => {
        const d = dayjs(l.log_date)
        return d.month() === m.month() && d.year() === m.year()
      })
      return Number((ml.reduce((s, l) => s + l.minutes_used, 0) / 60).toFixed(1))
    })
    const reactiveSeries = months.map(m => {
      const ml = fyLogs.filter(l => {
        const d = dayjs(l.log_date)
        return d.month() === m.month() && d.year() === m.year() && l.activity_nature === 'reactive'
      })
      return Number((ml.reduce((s, l) => s + l.minutes_used, 0) / 60).toFixed(1))
    })
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { color: '#e2e8f0' } },
      grid: { left: 50, right: 30, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: FY_MONTH_LABELS, boundaryGap: false, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', name: 'ชม.', nameTextStyle: { color: '#94a3b8' }, axisLabel: { color: '#94a3b8' } },
      series: [
        {
          name: 'ชั่วโมงรวม',
          type: 'line',
          smooth: true,
          data: totalSeries,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: '#a855f7' },
          itemStyle: { color: '#a855f7' },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
              { offset: 0, color: 'rgba(168,85,247,0.45)' },
              { offset: 1, color: 'rgba(168,85,247,0)' },
            ]},
          },
        },
        {
          name: 'งานเชิงรับ (ซ่อม)',
          type: 'line',
          smooth: true,
          data: reactiveSeries,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 2, color: '#ef4444' },
          itemStyle: { color: '#ef4444' },
        },
      ],
    }
  }, [fyLogs, dashboardYear])

  // ---- Chart 4: Stacked Bar — Reactive vs Proactive vs Neutral รายเดือน ----
  const chartNatureStack = useMemo(() => {
    const months = fiscalYearMonths(dashboardYear)
    const seriesData = (['reactive', 'proactive', 'neutral'] as const).map(nat => {
      return months.map(m => {
        const ml = fyLogs.filter(l => {
          const d = dayjs(l.log_date)
          return d.month() === m.month() && d.year() === m.year() && l.activity_nature === nat
        })
        return Number((ml.reduce((s, l) => s + l.minutes_used, 0) / 60).toFixed(1))
      })
    })
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, textStyle: { color: '#e2e8f0' } },
      grid: { left: 50, right: 30, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: FY_MONTH_LABELS, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', name: 'ชม.', nameTextStyle: { color: '#94a3b8' }, axisLabel: { color: '#94a3b8' } },
      series: [
        { name: 'เชิงรับ',  type: 'bar', stack: 'nat', data: seriesData[0], itemStyle: { color: '#ef4444', borderRadius: [0, 0, 0, 0] }, barWidth: '60%' },
        { name: 'เชิงรุก',  type: 'bar', stack: 'nat', data: seriesData[1], itemStyle: { color: '#22c55e' } },
        { name: 'กลาง',     type: 'bar', stack: 'nat', data: seriesData[2], itemStyle: { color: '#a855f7', borderRadius: [6, 6, 0, 0] } },
      ],
    }
  }, [fyLogs, dashboardYear])

  // ---- Chart 5: Stacked Bar — ภาระงานรายบุคคลแยกตามสถานะ ----
  const chartStaffStack = useMemo(() => {
    const staffArr = master?.staff ?? []
    const statusArr = (['done', 'in_progress', 'waiting', 'pending'] as TaskStatus[])
    const series = statusArr.map((st, i, arr) => ({
      name: statusLabel[st] || st,
      type: 'bar' as const,
      stack: 'staff',
      barWidth: '55%',
      itemStyle: {
        color: STATUS_META[st].color,
        borderRadius: i === arr.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0],
      },
      data: staffArr.map(s =>
        Number((fyLogs.filter(l => l.staff_id === s.staff_id && l.status_code === st).reduce((sum, l) => sum + l.minutes_used, 0) / 60).toFixed(1)),
      ),
      label: { show: true, color: '#fff', fontSize: 10, formatter: (p: { value: number }) => p.value > 0 ? String(p.value) : '' },
    }))
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, textStyle: { color: '#e2e8f0' } },
      grid: { left: 50, right: 30, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: staffArr.map(s => s.full_name_th), axisLabel: { color: '#e2e8f0', fontSize: 11, interval: 0 } },
      yAxis: { type: 'value', name: 'ชม.', nameTextStyle: { color: '#94a3b8' }, axisLabel: { color: '#94a3b8' } },
      series,
    }
  }, [master, fyLogs, statusLabel])

  // ---- Chart 6: Heatmap — slot × วันในสัปดาห์ ----
  const chartHeatmap = useMemo(() => {
    const hourLabels = Array.from({ length: HOUR_RANGE }, (_, i) => `${String(DAY_START + i).padStart(2, '0')}:00`)
    const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    const data: [number, number, number][] = []
    let maxCount = 0
    for (let h = 0; h < HOUR_RANGE; h++) {
      for (let d = 0; d < 7; d++) {
        const slotHour = DAY_START + h
        const count = fyLogs.filter(l => {
          const date = dayjs(l.log_date)
          if (date.day() !== d) return false
          const sh = getHour(l.start_time)
          const eh = getHour(l.end_time)
          return sh <= slotHour && slotHour < eh
        }).length
        data.push([h, d, count])
        if (count > maxCount) maxCount = count
      }
    }
    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        formatter: (p: { data: [number, number, number] }) => `${dayLabels[p.data[1]]} ${hourLabels[p.data[0]]}<br/>มี <b>${p.data[2]}</b> งาน`,
      },
      grid: { left: 50, right: 20, top: 20, bottom: 70 },
      xAxis: { type: 'category', data: hourLabels, splitArea: { show: true }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'category', data: dayLabels, splitArea: { show: true }, axisLabel: { color: '#e2e8f0' } },
      visualMap: {
        min: 0,
        max: Math.max(maxCount, 1),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 5,
        textStyle: { color: '#94a3b8' },
        inRange: { color: ['#1e293b', '#6B21A8', '#ec4899', '#ef4444'] },
      },
      series: [{
        type: 'heatmap',
        data,
        label: { show: true, fontSize: 10, color: '#fff' },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    }
  }, [fyLogs])

  // ---- Chart 7: Pie Rose — ระดับความเร่งด่วน ----
  const chartPriorityRose = useMemo(() => {
    const data = (master?.priorities ?? []).map(p => ({
      name: p.priority_name_th,
      value: fyLogs.filter(l => l.priority_code === p.priority_code).length,
      itemStyle: { color: p.color_hex },
    })).filter(d => d.value > 0)
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} งาน ({d}%)' },
      legend: { bottom: 0, textStyle: { color: '#e2e8f0' } },
      series: [{
        type: 'pie',
        roseType: 'radius',
        radius: ['25%', '70%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 4, borderColor: '#0f172a', borderWidth: 2 },
        label: { color: '#e2e8f0', formatter: '{b}\n{c}' },
        data,
      }],
    }
  }, [master, fyLogs])

  // ---- Chart 8: Donut — ที่มาของงาน ----
  const chartRequestSource = useMemo(() => {
    const sources = (master?.request_sources ?? []).map((s, i) => ({
      name: s.source_name_th,
      value: fyLogs.filter(l => l.source_code === s.source_code).length,
      itemStyle: {
        color: s.is_planned ? CHART_PALETTE[2 + (i % 2)] : CHART_PALETTE[3 + (i % 3)],
      },
    })).filter(d => d.value > 0)
    const plannedCount = fyLogs.filter(l => l.source_is_planned === true).length
    const interruptCount = fyLogs.length - plannedCount
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} งาน ({d}%)' },
      legend: { bottom: 0, type: 'scroll', textStyle: { color: '#e2e8f0', fontSize: 10 } },
      title: {
        text: `วางแผน ${plannedCount} | ขัดจังหวะ ${interruptCount}`,
        left: 'center',
        top: '40%',
        textStyle: { color: '#94a3b8', fontSize: 12, fontWeight: 'normal' },
      },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 2 },
        label: { color: '#e2e8f0', formatter: '{d}%' },
        data: sources,
      }],
    }
  }, [master, fyLogs])

  // ---- Chart 9: Horizontal Bar — Top ครุภัณฑ์ ----
  const chartTopAssets = useMemo(() => {
    const assetMap = new Map<string, { count: number; minutes: number }>()
    fyLogs.filter(l => l.asset_code && l.type_code === 'maintenance').forEach(l => {
      const key = l.asset_code!
      const cur = assetMap.get(key) ?? { count: 0, minutes: 0 }
      assetMap.set(key, { count: cur.count + 1, minutes: cur.minutes + l.minutes_used })
    })
    const arr = Array.from(assetMap.entries())
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => a.count - b.count)
      .slice(-10)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: { dataIndex: number }[]) => {
          const item = arr[p[0].dataIndex]
          return `${item.code}<br/>ซ่อม: <b>${item.count}</b> ครั้ง<br/>เวลา: <b>${(item.minutes / 60).toFixed(1)}</b> ชม.`
        },
      },
      grid: { left: 110, right: 50, top: 20, bottom: 30 },
      xAxis: { type: 'value', name: 'ครั้ง', nameTextStyle: { color: '#94a3b8' }, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'category', data: arr.map(a => a.code), axisLabel: { color: '#e2e8f0', fontSize: 10 } },
      series: [{
        type: 'bar',
        barWidth: '60%',
        data: arr.map((a, i) => ({
          value: a.count,
          itemStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [
              { offset: 0, color: '#ef444455' },
              { offset: 1, color: CHART_PALETTE[(arr.length - 1 - i) % CHART_PALETTE.length] },
            ]},
            borderRadius: [0, 6, 6, 0],
          },
        })),
        label: { show: true, position: 'right', formatter: '{c}', color: '#e2e8f0' },
      }],
    }
  }, [fyLogs])

  // ----- CRUD handlers -----
  const openAddDrawer = () => {
    setEditingLog(null)
    form.resetFields()
    form.setFieldsValue({
      log_date: dayjs(),
      start_time: '08:00',
      end_time: '09:00',
      minutes_used: 60,
      status_code: 'done',
      priority_code: 'normal',
      source_code: 'other',
      affected_users: 0,
      is_overtime: false,
    })
    setIsDrawerOpen(true)
  }

  const openEditDrawer = async (log: ActivityLog) => {
    setEditingLog(log)
    // เลือก fetch fresh จาก /logs/{id} เพื่อข้อมูลล่าสุด
    try {
      const res = await fetch(`/api/v1/it/activity/logs/${log.log_id}`)
      const json = await res.json()
      const data: ActivityLog = json?.success ? json.data : log
      form.setFieldsValue({
        log_date: dayjs(data.log_date),
        staff_id: data.staff_id,
        type_code: data.type_code,
        system_code: data.system_code,
        status_code: data.status_code,
        priority_code: data.priority_code,
        source_code: data.source_code,
        start_time: data.start_time.slice(0, 5),
        end_time: data.end_time.slice(0, 5),
        minutes_used: data.minutes_used,
        detail: data.detail,
        outcome: data.outcome ?? '',
        location: data.location ?? '',
        asset_code: data.asset_code ?? '',
        affected_users: data.affected_users ?? 0,
        is_overtime: data.is_overtime ?? false,
        ticket_id: data.ticket_id ?? '',
      })
    } catch {
      // fallback ใช้ข้อมูลใน row
      form.setFieldsValue({
        ...log,
        log_date: dayjs(log.log_date),
      })
    }
    setIsDrawerOpen(true)
  }

  const handleDelete = (log: ActivityLog) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ต้องการลบรายการกิจกรรมนี้ใช่หรือไม่',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }).then(async result => {
      if (!result.isConfirmed) return
      try {
        const res = await fetch(`/api/v1/it/activity/logs/${log.log_id}`, { method: 'DELETE' })
        const json = await res.json()
        if (json?.success) {
          messageApi.success('ลบรายการเรียบร้อยแล้ว')
          await loadLogs(dashboardYear)
        } else {
          messageApi.error(json?.error?.message || 'ลบไม่สำเร็จ')
        }
      } catch {
        messageApi.error('ลบไม่สำเร็จ')
      }
    })
  }

  const handleSave = async (values: {
    log_date: dayjs.Dayjs
    staff_id: number
    type_code: string
    system_code: string
    status_code: TaskStatus
    priority_code: Priority
    source_code: RequestSource
    start_time: string
    end_time: string
    minutes_used: number
    detail: string
    outcome?: string
    location?: string
    asset_code?: string
    affected_users?: number
    is_overtime?: boolean
    ticket_id?: string
  }) => {
    if (getHour(values.end_time) <= getHour(values.start_time)) {
      messageApi.error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')
      return
    }
    const payload = {
      log_date: values.log_date.format('YYYY-MM-DD'),
      staff_id: values.staff_id,
      type_code: values.type_code,
      system_code: values.system_code,
      status_code: values.status_code,
      priority_code: values.priority_code,
      source_code: values.source_code,
      start_time: values.start_time,
      end_time: values.end_time,
      minutes_used: values.minutes_used,
      detail: values.detail,
      outcome: values.outcome || null,
      location: values.location || null,
      asset_code: values.asset_code || null,
      affected_users: values.affected_users ?? 0,
      is_overtime: values.is_overtime ?? false,
      ticket_id: values.ticket_id || null,
    }
    setSubmitting(true)
    try {
      const url = editingLog
        ? `/api/v1/it/activity/logs/${editingLog.log_id}`
        : '/api/v1/it/activity/logs'
      const method = editingLog ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json?.success) {
        messageApi.success(editingLog ? 'แก้ไขเรียบร้อยแล้ว' : 'บันทึกกิจกรรมเรียบร้อยแล้ว')
        setIsDrawerOpen(false)
        form.resetFields()
        await loadLogs(dashboardYear)
      } else {
        messageApi.error(json?.error?.message || 'บันทึกไม่สำเร็จ')
      }
    } catch {
      messageApi.error('บันทึกไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  // ----- Columns for list table -----
  const columns = [
    {
      title: 'วันที่',
      dataIndex: 'log_date',
      key: 'log_date',
      width: 110,
      render: (d: string) => toThaiDate(d),
    },
    {
      title: 'เจ้าหน้าที่',
      dataIndex: 'staff_name',
      key: 'staff_name',
      render: (name: string) => (
        <Space><UserOutlined className="text-purple-600" /><Text>{name}</Text></Space>
      ),
    },
    {
      title: 'ช่วงเวลา',
      key: 'slot',
      width: 130,
      render: (_: unknown, r: ActivityLog) => (
        <Text className="font-mono text-sm">{r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}</Text>
      ),
    },
    {
      title: 'ประเภท',
      dataIndex: 'type_name_th',
      key: 'type_name_th',
      render: (_: string, r: ActivityLog) => <Tag color={typeColor[r.type_code] || 'default'}>{r.type_name_th}</Tag>,
      width: 120,
    },
    {
      title: 'รายละเอียด',
      dataIndex: 'detail',
      key: 'detail',
      render: (d: string, r: ActivityLog) => (
        <div>
          <div className="text-sm">{d}</div>
          <div className="text-xs text-gray-500">ระบบ: {r.system_name}</div>
        </div>
      ),
    },
    {
      title: 'เวลาที่ใช้',
      dataIndex: 'minutes_used',
      key: 'minutes_used',
      width: 110,
      render: (m: number) => (
        <div>
          <Text strong>{m}</Text>
          <Text type="secondary" className="text-xs ml-1">นาที</Text>
          <div className="text-[10px] text-gray-500">({formatMinutes(m)})</div>
        </div>
      ),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status_code',
      key: 'status_code',
      width: 130,
      render: (s: TaskStatus, r: ActivityLog) => {
        const meta = STATUS_META[s]
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
            style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}55` }}
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.ring}` }} />
            {r.status_name || statusLabel[s] || s}
          </span>
        )
      },
    },
    {
      title: 'ด่วน',
      dataIndex: 'priority_code',
      key: 'priority_code',
      width: 90,
      render: (p: Priority, r: ActivityLog) => (
        <div className="flex items-center gap-1">
          <Tag color={PRIORITY_TAG[p]} className="m-0 text-xs">
            {r.priority_name || priorityLabel[p] || p}
          </Tag>
          {r.is_overtime && <Tag color="volcano" className="m-0 text-xs">OT</Tag>}
        </div>
      ),
    },
    {
      title: 'ผลลัพธ์',
      dataIndex: 'outcome',
      key: 'outcome',
      render: (o: string | null) => <Text className="text-xs">{o || '-'}</Text>,
    },
    {
      title: 'จัดการ',
      key: 'action',
      width: 90,
      render: (_: unknown, record: ActivityLog) => (
        <Space>
          <Tooltip title="แก้ไข"><Button type="text" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} /></Tooltip>
          <Tooltip title="ลบ"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} /></Tooltip>
        </Space>
      ),
    },
  ]

  // ----- Tooltip for schedule cells -----
  const dotTooltip = (t: ActivityLog) => {
    const meta = STATUS_META[t.status_code]
    return (
      <div className="text-xs space-y-1 min-w-55">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Tag color={typeColor[t.type_code] || 'default'} className="m-0">{t.type_name_th}</Tag>
          <span style={{ color: meta.color }} className="font-semibold">● {t.status_name || statusLabel[t.status_code]}</span>
          <Tag color={PRIORITY_TAG[t.priority_code]} className="m-0 text-[10px]">
            {t.priority_name || priorityLabel[t.priority_code]}
          </Tag>
          {t.is_overtime && <Tag color="volcano" className="m-0 text-[10px]">OT</Tag>}
        </div>
        <div className="font-semibold leading-snug">{t.detail}</div>
        <div className="opacity-80">ระบบ: {t.system_name}</div>
        <div className="opacity-80">ช่วงเวลา: <span className="font-mono">{t.start_time.slice(0,5)} – {t.end_time.slice(0,5)}</span> · {formatMinutes(t.minutes_used)}</div>
        {t.source_name && <div className="opacity-80">ที่มา: {t.source_name}</div>}
        {t.location && <div className="opacity-80">สถานที่: {t.location}</div>}
        {t.asset_code && <div className="opacity-80">ครุภัณฑ์: <span className="font-mono">{t.asset_code}</span></div>}
        {t.affected_users > 0 && <div className="opacity-80">ผู้กระทบ: {t.affected_users} คน</div>}
        {t.ticket_id && <div className="opacity-80">Ticket: <span className="font-mono">{t.ticket_id}</span></div>}
        {t.outcome && <div className="pt-1 border-t border-white/10 opacity-90">ผลลัพธ์: {t.outcome}</div>}
      </div>
    )
  }

  // =============================================================================
  // Render
  // =============================================================================
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/information-technology', title: <><DesktopOutlined /> งานคอมพิวเตอร์ฯ</> },
            { href: '/information-technology/hait', title: 'HAIT ข้อ 4' },
            { title: 'บันทึกกิจกรรม IT' },
          ]}
          className="mb-6"
        />

        <div className="max-w-full mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <Title level={2} style={{ color: '#6B21A8', margin: 0 }}>บันทึกกิจกรรมการทำงาน IT</Title>
              <Text type="secondary">ข้อมูลกิจกรรมและการทำงานของเจ้าหน้าที่ฝ่าย IT ทุกคน</Text>
            </div>
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openAddDrawer} disabled={!master}>
              บันทึกกิจกรรมใหม่
            </Button>
          </div>

          <Spin spinning={loading || !master}>
          <Tabs
            defaultActiveKey="dashboard"
            items={[
              {
                key: 'dashboard',
                label: <span><DashboardOutlined /> Dashboard</span>,
                children: (
                  <div className="space-y-6">
                    <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <DashboardOutlined style={{ color: '#a855f7', fontSize: 18 }} />
                          <Text strong className="text-base">สรุปกิจกรรม IT ตามปีงบประมาณ</Text>
                        </div>
                        <div className="flex items-center gap-2">
                          <Text type="secondary" className="text-xs">เลือกปีงบ:</Text>
                          <Select
                            value={dashboardYear}
                            onChange={v => setDashboardYear(v)}
                            options={fyOptions}
                            style={{ minWidth: 140 }}
                          />
                        </div>
                      </div>
                    </Card>

                    <Row gutter={[16, 16]}>
                      <Col xs={12} sm={6}>
                        <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #a855f7' }}>
                          <Statistic title="รายการบันทึก" value={fyLogs.length} suffix="รายการ" styles={{ content: { color: '#a855f7' } }} />
                          <Text type="secondary" className="text-xs">{fyDistinctDays} วันทำงาน</Text>
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #22c55e' }}>
                          <Statistic title="ชั่วโมงรวม" value={fyTotalHours.toFixed(1)} suffix="ชม." styles={{ content: { color: '#22c55e' } }} />
                          <Text type="secondary" className="text-xs">{fyTotalMinutes.toLocaleString()} นาที</Text>
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #3b82f6' }}>
                          <Statistic title="ประเภทงานยอดนิยม" value={fyTopType.type} styles={{ content: { color: '#3b82f6', fontSize: 20 } }} />
                          <Text type="secondary" className="text-xs">{(fyTopType.minutes / 60).toFixed(1)} ชม. ใช้กับงานนี้</Text>
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12, borderBottom: '3px solid #ef4444' }}>
                          <Statistic title="งานยังไม่ปิด" value={fyOpenCount} suffix="งาน" styles={{ content: { color: '#ef4444' } }} />
                          <Text type="secondary" className="text-xs">in_progress / waiting / pending</Text>
                        </Card>
                      </Col>
                    </Row>

                    {fyLogs.length === 0 ? (
                      <Empty description={`ยังไม่มีข้อมูลในปีงบ ${dashboardYear}`} />
                    ) : (
                      <>
                        <Row gutter={[16, 16]}>
                          <Col xs={24} lg={10}>
                            <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}
                              title={<span><PieChartOutlined style={{ color: '#a855f7' }} /> สัดส่วนประเภทกิจกรรม</span>}
                              extra={<Text type="secondary" className="text-xs">วัดเป็นนาที</Text>}>
                              <EChart option={chartTypeDonut} height={320} />
                            </Card>
                          </Col>
                          <Col xs={24} lg={14}>
                            <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}
                              title={<span><BarChartOutlined style={{ color: '#3b82f6' }} /> ชั่วโมงรวมตามระบบ</span>}
                              extra={<Text type="secondary" className="text-xs">เรียงจากมากที่สุด</Text>}>
                              <EChart option={chartSystemBar} height={320} />
                            </Card>
                          </Col>
                        </Row>

                        <Row gutter={[16, 16]}>
                          <Col xs={24}>
                            <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}
                              title={<span><RiseOutlined style={{ color: '#a855f7' }} /> แนวโน้มชั่วโมงงานรายเดือน (ต.ค. – ก.ย.)</span>}
                              extra={<Text type="secondary" className="text-xs">เปรียบเทียบงานรวม vs งานเชิงรับ</Text>}>
                              <EChart option={chartMonthlyLine} height={300} />
                            </Card>
                          </Col>
                        </Row>

                        <Row gutter={[16, 16]}>
                          <Col xs={24} lg={14}>
                            <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}
                              title={<span><BarChartOutlined style={{ color: '#ef4444' }} /> งานเชิงรับ vs เชิงรุก รายเดือน</span>}
                              extra={<Text type="secondary" className="text-xs">stacked รายเดือน</Text>}>
                              <EChart option={chartNatureStack} height={300} />
                            </Card>
                          </Col>
                          <Col xs={24} lg={10}>
                            <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}
                              title={<span><UserOutlined style={{ color: '#22c55e' }} /> ภาระงานรายบุคคล (แยกตามสถานะ)</span>}
                              extra={<Text type="secondary" className="text-xs">ชม.รวม + ratio งานปิด</Text>}>
                              <EChart option={chartStaffStack} height={300} />
                            </Card>
                          </Col>
                        </Row>

                        <Row gutter={[16, 16]}>
                          <Col xs={24}>
                            <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}
                              title={<span><CalendarOutlined style={{ color: '#ec4899' }} /> ความหนาแน่นงาน — slot เวลา × วันในสัปดาห์</span>}
                              extra={<Text type="secondary" className="text-xs">นับจำนวนงานที่อยู่ใน slot นั้น</Text>}>
                              <EChart option={chartHeatmap} height={300} />
                            </Card>
                          </Col>
                        </Row>

                        <Row gutter={[16, 16]}>
                          <Col xs={24} lg={8}>
                            <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}
                              title={<span><FireOutlined style={{ color: '#ef4444' }} /> ระดับความเร่งด่วน</span>}
                              extra={<Text type="secondary" className="text-xs">นับเป็นจำนวนงาน</Text>}>
                              <EChart option={chartPriorityRose} height={300} />
                            </Card>
                          </Col>
                          <Col xs={24} lg={8}>
                            <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}
                              title={<span><BulbOutlined style={{ color: '#f59e0b' }} /> ที่มาของงาน</span>}
                              extra={<Text type="secondary" className="text-xs">วางแผน vs ขัดจังหวะ</Text>}>
                              <EChart option={chartRequestSource} height={300} />
                            </Card>
                          </Col>
                          <Col xs={24} lg={8}>
                            <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}
                              title={<span><WarningOutlined style={{ color: '#f59e0b' }} /> Top ครุภัณฑ์ซ่อมบ่อย</span>}
                              extra={<Text type="secondary" className="text-xs">วางแผนเปลี่ยน/อัปเกรด</Text>}>
                              <EChart option={chartTopAssets} height={300} />
                            </Card>
                          </Col>
                        </Row>
                      </>
                    )}
                  </div>
                ),
              },
              {
                key: 'list',
                label: <span><CalendarOutlined /> รายการกิจกรรม</span>,
                children: (
                  <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                    <div className="mb-4 flex flex-col sm:flex-row gap-3 flex-wrap">
                      <Input
                        placeholder="ค้นหากิจกรรม / ครุภัณฑ์ / ticket ..."
                        prefix={<SearchOutlined />}
                        allowClear
                        onChange={e => setSearchText(e.target.value)}
                        style={{ maxWidth: 320 }}
                      />
                      <Select
                        placeholder="กรองตามเจ้าหน้าที่"
                        allowClear
                        options={staffOptions}
                        onChange={v => setFilterStaff(v)}
                        style={{ minWidth: 200 }}
                      />
                      <Select
                        placeholder="กรองตามสถานะ"
                        allowClear
                        options={statusOptions}
                        onChange={v => setFilterStatus(v as TaskStatus | undefined)}
                        style={{ minWidth: 180 }}
                      />
                    </div>
                    <Table
                      columns={columns}
                      dataSource={filtered}
                      rowKey="log_id"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 'max-content' }}
                    />
                  </Card>
                ),
              },
              {
                key: 'schedule',
                label: <span><TableOutlined /> ตารางงานรายวัน</span>,
                children: (
                  <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                    <div className="mb-5 flex flex-wrap items-center gap-4 justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-slate-300">เลือกวันที่:</span>
                        <DatePicker
                          value={scheduleDate}
                          onChange={d => d && setScheduleDate(d)}
                          format="DD/MM/YYYY"
                          allowClear={false}
                        />
                        <span className="text-sm text-slate-400">
                          {logsForDate.length > 0
                            ? `${logsForDate.length} งาน · ${staffInDate.length} เจ้าหน้าที่ · ${formatMinutes(dayTotalMinutes)} รวม`
                            : 'ไม่มีข้อมูลในวันนี้'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {(Object.keys(STATUS_META) as TaskStatus[]).map(k => (
                          <span key={k} className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                            <span className="w-3 h-3 rounded-full" style={{ background: STATUS_META[k].color, boxShadow: `0 0 8px ${STATUS_META[k].ring}` }} />
                            {statusLabel[k] || k}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Table
                        pagination={false}
                        bordered
                        size="middle"
                        scroll={{ x: 'max-content' }}
                        rowKey="key"
                        locale={{ emptyText: <Empty description="ไม่มีข้อมูลกิจกรรมในวันที่เลือก" /> }}
                        dataSource={(master?.staff ?? []).map(s => ({ key: s.staff_id, staffName: s.full_name_th }))}
                        columns={[
                          {
                            title: <span className="text-sm font-semibold">เจ้าหน้าที่</span>,
                            dataIndex: 'staffName',
                            key: 'staffName',
                            width: 200,
                            fixed: 'left' as const,
                            render: (name: string, row: { key: number }) => {
                              const tasks = logsForDate.filter(l => l.staff_id === row.key)
                              const totalMin = tasks.reduce((s, t) => s + t.minutes_used, 0)
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-700/30 border border-purple-500/40 shrink-0">
                                    <UserOutlined style={{ color: '#a855f7' }} />
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-slate-100">{name}</div>
                                    <div className="text-[10px] text-slate-400">{tasks.length} งาน · {formatMinutes(totalMin)}</div>
                                  </div>
                                </div>
                              )
                            },
                          },
                          ...Array.from({ length: HOUR_RANGE }, (_, i) => DAY_START + i).map(slot => ({
                            title: (
                              <div className="text-center font-mono text-xs font-semibold" style={{ color: '#a855f7' }}>
                                {`${String(slot).padStart(2, '0')}:00`}
                                <div className="font-normal" style={{ fontSize: 10, color: '#94a3b8' }}>
                                  –{`${String(slot + 1).padStart(2, '0')}:00`}
                                </div>
                              </div>
                            ),
                            key: `slot-${slot}`,
                            width: 160,
                            render: (_: unknown, record: { key: number }) => {
                              const starting = logsForDate.filter(l =>
                                l.staff_id === record.key && getHour(l.start_time) === slot,
                              )
                              const continuing = logsForDate.filter(l =>
                                l.staff_id === record.key &&
                                getHour(l.start_time) < slot &&
                                getHour(l.end_time) > slot,
                              )
                              if (!starting.length && !continuing.length) {
                                return <div className="text-center text-slate-700 text-xs py-3 select-none">–</div>
                              }
                              return (
                                <div className="flex flex-col gap-1.5">
                                  {starting.map(t => {
                                    const meta = STATUS_META[t.status_code]
                                    const spans = getHour(t.end_time) - getHour(t.start_time)
                                    return (
                                      <Tooltip key={t.log_id} title={dotTooltip(t)}>
                                        <div
                                          className="flex items-center gap-2 rounded-lg p-1.5 cursor-pointer transition-transform hover:scale-[1.03]"
                                          style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}55` }}
                                        >
                                          <div
                                            className="rounded-full flex flex-col items-center justify-center font-bold text-white shrink-0"
                                            style={{
                                              width: 40,
                                              height: 40,
                                              background: `radial-gradient(circle at 30% 30%, ${meta.color}, ${meta.color}cc 65%, ${meta.bg})`,
                                              border: `1.5px solid ${meta.color}`,
                                              boxShadow: `0 0 8px ${meta.ring}`,
                                            }}
                                          >
                                            <div style={{ fontSize: 11, lineHeight: 1 }}>{t.minutes_used}</div>
                                            <div style={{ fontSize: 8, opacity: 0.85, marginTop: 1 }}>นาที</div>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 flex-wrap">
                                              <Tag
                                                color={typeColor[t.type_code] || 'default'}
                                                className="m-0"
                                                style={{ fontSize: 10, padding: '0 4px', lineHeight: '14px', marginInlineEnd: 0 }}
                                              >
                                                {t.type_name_th}
                                              </Tag>
                                              {spans > 1 && (
                                                <span className="text-[10px] font-mono" style={{ color: meta.color }}>×{spans}ชม.</span>
                                              )}
                                            </div>
                                            <div
                                              className="text-[10px] text-slate-300 leading-snug mt-0.5"
                                              style={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                              }}
                                            >
                                              {t.detail}
                                            </div>
                                          </div>
                                        </div>
                                      </Tooltip>
                                    )
                                  })}
                                  {continuing.map(t => {
                                    const meta = STATUS_META[t.status_code]
                                    return (
                                      <Tooltip
                                        key={`c-${t.log_id}`}
                                        title={<>{t.detail}<br /><em>(ต่อเนื่องจาก {t.start_time.slice(0,5)})</em></>}
                                      >
                                        <div
                                          className="flex items-center justify-center gap-2 rounded-lg py-1.5 cursor-pointer"
                                          style={{ background: `${meta.color}08`, border: `1px dashed ${meta.color}55` }}
                                        >
                                          <span className="inline-block w-2 h-2 rounded-full" style={{ background: meta.color, opacity: 0.6 }} />
                                          <span className="text-[10px] italic" style={{ color: meta.color }}>↕ ต่อเนื่อง</span>
                                        </div>
                                      </Tooltip>
                                    )
                                  })}
                                </div>
                              )
                            },
                          })),
                        ]}
                      />
                  </Card>
                ),
              },
              {
                key: 'analysis',
                label: <span><BarChartOutlined /> วิเคราะห์ Pain Points</span>,
                children: (
                  <div className="space-y-6">
                    <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                      <div className="flex flex-wrap items-center gap-3">
                        <BarChartOutlined style={{ color: '#6B21A8', fontSize: 16 }} />
                        <Text strong>วิเคราะห์ช่วงวันที่:</Text>
                        <DatePicker.RangePicker
                          value={analysisRange}
                          onChange={v => setAnalysisRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                          format="DD/MM/YYYY"
                          allowClear
                          placeholder={['วันเริ่มต้น', 'วันสิ้นสุด']}
                        />
                        {analysisRange ? (
                          <Text type="secondary" className="text-xs">
                            พบ <Text strong>{analysisLogs.length}</Text> รายการ · <Text strong>{analysisTotalHours.toFixed(1)}</Text> ชม.
                          </Text>
                        ) : (
                          <Text type="secondary" className="text-xs">แสดงข้อมูลทั้งหมด ({logs.length} รายการ)</Text>
                        )}
                      </div>
                    </Card>

                    {insights.length > 0 && (
                      <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12, borderLeft: '4px solid #f59e0b' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <BulbOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                          <Title level={5} style={{ color: '#f59e0b', margin: 0 }}>Insights อัตโนมัติ</Title>
                        </div>
                        <div className="space-y-3">
                          {insights.map((ins, i) => (
                            <Alert key={i} type={ins.type} title={ins.message} showIcon className="text-sm" />
                          ))}
                        </div>
                      </Card>
                    )}

                    <Row gutter={[24, 24]}>
                      <Col xs={24} lg={12}>
                        <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}>
                          <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">⏱ เวลาหายไปกับงานอะไรมากที่สุด</Title>
                          <Text type="secondary" className="text-xs block mb-4">เรียงตามเวลารวม (วิเคราะห์ภาระงานจริง)</Text>
                          <div className="space-y-3">
                            {byActivityType.map((item, idx) => {
                              const pct = analysisTotalMinutes ? Math.round((item.minutes / analysisTotalMinutes) * 100) : 0
                              const isTop = idx === 0
                              return (
                                <div key={item.code}>
                                  <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                      {isTop && <FireOutlined style={{ color: '#ef4444' }} />}
                                      <Tag color={typeColor[item.code] || 'default'} className="m-0">{item.label}</Tag>
                                      <Text type="secondary" className="text-xs">{item.count} รายการ</Text>
                                    </div>
                                    <Text strong className={isTop ? 'text-red-500' : 'text-slate-300'}>
                                      {item.hours.toFixed(1)} ชม. ({pct}%)
                                    </Text>
                                  </div>
                                  <Progress percent={pct} showInfo={false} strokeColor={isTop ? '#ef4444' : '#a855f7'} size="small" />
                                </div>
                              )
                            })}
                          </div>
                        </Card>
                      </Col>

                      <Col xs={24} lg={12}>
                        <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}>
                          <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">🖥 ระบบที่กินเวลาทีมมากที่สุด</Title>
                          <Text type="secondary" className="text-xs block mb-4">ระบุ Pain Point ว่าระบบไหนต้องการความสนใจมาก</Text>
                          <div className="space-y-3">
                            {bySystem.map((item, idx) => {
                              const pct = analysisTotalMinutes ? Math.round((item.minutes / analysisTotalMinutes) * 100) : 0
                              const isTop = idx === 0
                              return (
                                <div key={item.code}>
                                  <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                      {isTop && <WarningOutlined style={{ color: '#f59e0b' }} />}
                                      <Text className={isTop ? 'text-amber-500 font-semibold' : 'text-slate-200'}>{item.label}</Text>
                                      <Text type="secondary" className="text-xs">{item.count} ครั้ง</Text>
                                    </div>
                                    <Text strong className={isTop ? 'text-amber-500' : 'text-slate-300'}>
                                      {item.hours.toFixed(1)} ชม. ({pct}%)
                                    </Text>
                                  </div>
                                  <Progress percent={pct} showInfo={false} strokeColor={isTop ? '#f59e0b' : '#3b82f6'} size="small" />
                                </div>
                              )
                            })}
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                      <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">📊 สัดส่วนงานเชิงรับ vs งานเชิงรุก</Title>
                      <Text type="secondary" className="text-xs block mb-4">
                        งานเชิงรับ = ซ่อมบำรุง | งานเชิงรุก = ดูแลระบบ, ติดตั้ง, พัฒนาระบบ — ยิ่งงานเชิงรับสูง ยิ่งบ่งชี้ว่ามีปัญหาซ้ำซาก
                      </Text>
                      <Row gutter={[24, 24]} align="middle">
                        <Col xs={24} md={12}>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="flex items-center gap-2">
                                  <FallOutlined style={{ color: '#ef4444' }} />
                                  <Text>งานเชิงรับ (Reactive)</Text>
                                </span>
                                <Text strong className="text-red-500">{(reactiveMinutes / 60).toFixed(1)} ชม. ({reactivePercent}%)</Text>
                              </div>
                              <Progress percent={reactivePercent} showInfo={false} strokeColor="#ef4444" />
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="flex items-center gap-2">
                                  <RiseOutlined style={{ color: '#22c55e' }} />
                                  <Text>งานเชิงรุก (Proactive)</Text>
                                </span>
                                <Text strong className="text-green-500">{(proactiveMinutes / 60).toFixed(1)} ชม. ({proactivePercent}%)</Text>
                              </div>
                              <Progress percent={proactivePercent} showInfo={false} strokeColor="#22c55e" />
                            </div>
                          </div>
                        </Col>
                        <Col xs={24} md={12}>
                          <div
                            className="p-4 rounded-lg text-center"
                            style={{
                              background: reactivePercent > 50 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                              border: `1px solid ${reactivePercent > 50 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                            }}
                          >
                            {reactivePercent > 50 ? (
                              <>
                                <WarningOutlined className="text-3xl text-red-500 mb-2 block" />
                                <Text strong className="text-red-500 block">⚠ งานเชิงรับสูงเกินไป</Text>
                                <Text type="secondary" className="text-xs">แนะนำ: วางแผน Preventive Maintenance<br />เพื่อลดงานฉุกเฉินในปีถัดไป</Text>
                              </>
                            ) : (
                              <>
                                <RiseOutlined className="text-3xl text-green-500 mb-2 block" />
                                <Text strong className="text-green-500 block">✓ สัดส่วนดี</Text>
                                <Text type="secondary" className="text-xs">ทีมให้ความสำคัญกับงานเชิงป้องกัน<br />มากกว่าการแก้ปัญหาเฉพาะหน้า</Text>
                              </>
                            )}
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    <Row gutter={[24, 24]}>
                      <Col xs={24} lg={12}>
                        <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                          <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">🔧 Pain Point — ระบบที่ต้องซ่อมบ่อยที่สุด</Title>
                          <Text type="secondary" className="text-xs block mb-4">ใช้วางแผนจัดหาอุปกรณ์สำรองหรืออัปเกรดในปีถัดไป</Text>
                          {painPointSystem.length === 0 ? (
                            <Text type="secondary">ยังไม่มีข้อมูลงานซ่อมบำรุง</Text>
                          ) : (
                            <div className="space-y-2">
                              {painPointSystem.map((item, idx) => (
                                <div key={item.system} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold w-5 text-center ${idx === 0 ? 'text-red-500' : 'text-slate-400'}`}>{idx + 1}</span>
                                    <Text className={idx === 0 ? 'text-red-500 font-semibold' : 'text-slate-200'}>{item.system}</Text>
                                  </div>
                                  <div className="text-right">
                                    <Text strong className={idx === 0 ? 'text-red-500' : 'text-slate-300'}>{item.count} ครั้ง</Text>
                                    <Text type="secondary" className="text-xs block">{item.hours.toFixed(1)} ชม.</Text>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      </Col>

                      <Col xs={24} lg={12}>
                        <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                          <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">👤 ภาระงานรายบุคคล</Title>
                          <Text type="secondary" className="text-xs block mb-4">ดูว่าใครรับภาระมากเกินไป เพื่อวางแผนจัดสรรงาน</Text>
                          <div className="space-y-3">
                            {byStaff.map((s, idx) => {
                              const pct = analysisTotalMinutes ? Math.round((s.minutes / analysisTotalMinutes) * 100) : 0
                              const isTop = idx === 0 && byStaff.length > 1 && pct > 50
                              return (
                                <div key={s.id}>
                                  <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                      <UserOutlined className={isTop ? 'text-orange-500' : 'text-purple-400'} />
                                      <Text className={isTop ? 'text-orange-500 font-semibold' : 'text-slate-200'}>{s.name}</Text>
                                    </div>
                                    <div className="text-right">
                                      <Text strong className={isTop ? 'text-orange-500' : 'text-slate-300'}>{s.hours.toFixed(1)} ชม.</Text>
                                      <Tag color={typeColor[s.topTypeCode] || 'default'} className="ml-2 text-xs">{s.topType}</Tag>
                                    </div>
                                  </div>
                                  <Progress percent={pct} showInfo={false} strokeColor={isTop ? '#f97316' : '#6B21A8'} size="small" />
                                </div>
                              )
                            })}
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                ),
              },
            ]}
          />
          </Spin>
        </div>
      </div>

      <Drawer
        title={editingLog ? 'แก้ไขกิจกรรม' : 'บันทึกกิจกรรมใหม่'}
        open={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); form.resetFields() }}
        size="large"
        footer={
          <Space className="float-right">
            <Button onClick={() => { setIsDrawerOpen(false); form.resetFields() }}>ยกเลิก</Button>
            <Button type="primary" onClick={() => form.submit()} loading={submitting}>บันทึก</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="วันที่" name="log_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="เจ้าหน้าที่" name="staff_id" rules={[{ required: true, message: 'กรุณาเลือกเจ้าหน้าที่' }]}>
                <Select options={staffOptions} placeholder="เลือกเจ้าหน้าที่" showSearch />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="เริ่มเวลา (slot)" name="start_time" rules={[{ required: true, message: 'กรุณาเลือกเวลาเริ่ม' }]}>
                <Select options={HOUR_OPTIONS} placeholder="08:00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ถึงเวลา (slot)" name="end_time" rules={[{ required: true, message: 'กรุณาเลือกเวลาสิ้นสุด' }]}>
                <Select options={HOUR_OPTIONS} placeholder="09:00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="เวลาที่ใช้ (นาที)" name="minutes_used" rules={[{ required: true }]}>
                <InputNumber min={5} max={600} step={5} style={{ width: '100%' }} suffix="นาที" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ประเภทกิจกรรม" name="type_code" rules={[{ required: true }]}>
                <Select options={typeOptions} placeholder="เลือกประเภท" showSearch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ระบบที่เกี่ยวข้อง" name="system_code" rules={[{ required: true }]}>
                <Select options={systemOptions} placeholder="เลือกระบบ" showSearch />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="สถานะงาน" name="status_code" rules={[{ required: true }]}>
                <Select
                  options={statusOptions.map(o => ({
                    ...o,
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_META[o.value as TaskStatus]?.color }} />
                        {o.label}
                      </span>
                    ),
                  }))}
                  placeholder="เลือกสถานะ"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ความเร่งด่วน" name="priority_code" rules={[{ required: true }]} initialValue="normal">
                <Select options={priorityOptions} placeholder="เลือกระดับ" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ที่มาของงาน" name="source_code" rules={[{ required: true }]} initialValue="other">
                <Select options={sourceOptions} placeholder="เลือกที่มา" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="รายละเอียดกิจกรรม" name="detail" rules={[{ required: true, message: 'กรุณาระบุรายละเอียด' }]}>
            <TextArea rows={3} placeholder="อธิบายกิจกรรมที่ทำในวันนี้" />
          </Form.Item>
          <Form.Item label="ผลลัพธ์ / สิ่งที่กำลังรอ" name="outcome">
            <TextArea rows={2} placeholder="ระบุผลลัพธ์ หรือถ้ายังไม่เสร็จ ระบุสิ่งที่กำลังรอ เช่น รออะไหล่ รอผู้ใช้ทดสอบ" />
          </Form.Item>

          <div className="text-xs text-slate-400 mb-2 border-t border-slate-700 pt-3">รายละเอียดเพิ่มเติม (ไม่บังคับ)</div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="สถานที่ / ห้อง" name="location">
                <Input placeholder="เช่น อาคาร OPD ชั้น 2 ห้องตรวจ 5" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="รหัสครุภัณฑ์ / Asset" name="asset_code">
                <Input placeholder="เช่น PC-OPD-205" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="ผู้ใช้ที่กระทบ (คน)" name="affected_users" initialValue={0}>
                <InputNumber min={0} max={9999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="งานนอกเวลา" name="is_overtime" initialValue={false}>
                <Select
                  options={[
                    { value: false, label: 'ในเวลา' },
                    { value: true,  label: 'นอกเวลา (OT)' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="เลข Ticket / อ้างอิง" name="ticket_id">
                <Input placeholder="เช่น HD-2026-0412" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </div>
  )
}

export default function ActivityPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6B21A8', borderRadius: 8 } }}>
      <App>
        <ActivityPageContent />
      </App>
    </ConfigProvider>
  )
}
