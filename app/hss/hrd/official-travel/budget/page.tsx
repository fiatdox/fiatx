'use client'
// งบประมาณและ Dashboard (เดินทางไปราชการ) — ADMIN / HRD
// ตัวเลขจริง = ยอดที่การเงินยืนยันแล้วเท่านั้น · คงเหลือ = วงเงิน − ยืนยันแล้ว
// "รอยืนยัน" = ประมาณการในคำขอที่การเงินยังไม่ยืนยัน — แสดงประกอบการวางแผน ไม่ตัดงบ
// ประเภทงบ (ช่องติ๊กในบันทึกข้อความ) ADMIN/HRD เพิ่มเองได้ที่แท็บ "ประเภทงบ" — รายการย่อยของประเภท (เช่น P20 แตก 19 รายการ) = งบในแท็บตั้งค่างบประมาณ
// Dashboard เจาะลึก: กรองตามงบ ประเภทงบ กลุ่มภารกิจ กลุ่มงาน กลุ่มสาขาวิชาชีพ บุคลากร สถานะ — กดแถว/แท่งกราฟเพื่อกรองต่อ
// กลุ่มสาขาวิชาชีพ: backend จัดจากชื่อตำแหน่ง ณ วันยื่น · สัดส่วนผู้ได้เดินทาง = คนที่ได้ไป ÷ บุคลากรปัจจุบันในกลุ่ม
// ยอดรายคน = เบี้ยเลี้ยงของคนนั้น + ค่าใช้จ่ายร่วมของคำขอหารเท่ากัน (รวมทุกคน = ยอดของคำขอ)
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Progress, Result, Row, Segmented, Select, Space, Spin, Switch, Table, Tabs, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AppstoreOutlined, BulbOutlined, CheckCircleOutlined, ClearOutlined, ClockCircleOutlined, DashboardOutlined, EditOutlined, FilterOutlined, HistoryOutlined, PlusOutlined, SafetyCertificateOutlined, SettingOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons'
import EChart from '@/app/components/EChart'
import { PALETTES, type Palette } from '@/app/lib/chartKit'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { TRAVEL_COLOR, TRAVEL_MENU, TravelApiError, TravelShell, travelApi, travelPost, useBudgetTypes } from '../travelShared'
import { TH_MONTHS_SHORT, budgetTypeLabel, fmtMoney, requestNo, thaiDateTime, tripRange, type BudgetType, type BudgetTypeRow } from '../travelCalc'

type BudgetTypes = ReturnType<typeof useBudgetTypes>
import { TravelHistoryDrawer } from '../TravelHistory'

const { Title, Text } = Typography

interface Budget {
  id: number; fiscal_year: number; budget_type: BudgetType; name: string; amount: number; note: string | null; is_active: boolean
  updated_at: string; updated_by_name: string | null
  spent: number; pending: number; remaining: number; projected: number; requests: number; confirmed: number; travelers: number
}
interface Filters { budget_id: number | null; budget_type: BudgetType | null; mission_id: number | null; major_id: number | null; profession: ProfessionKey | null; user_id: number | null; status: 'confirmed' | 'pending' | null }
const NO_FILTER: Filters = { budget_id: null, budget_type: null, mission_id: null, major_id: null, profession: null, user_id: null, status: null }
interface Dashboard {
  fiscal_year: number; current_fiscal_year: number
  totals: { amount: number; spent: number; pending: number; remaining: number; projected: number; requests: number; confirmed: number }
  budgets: Budget[]
  filtered: { spent: number; pending: number; people: number; requests: number; confirmed: number }
  by_budget: { budget_id: number; budget_name: string; budget_type: BudgetType; spent: number; pending: number; requests: number; people: number }[]
  monthly: { month: string; spent: number; pending: number; requests: number }[]
  by_unit: { major_id: number | null; unit: string; spent: number; pending: number; people: number; requests: number }[]
  by_person: { user_id: number; name: string; unit: string; trips: number; days: number; allowance: number; spent: number; pending: number; budgets: string }[]
  requests: { id: number; subject: string; location: string; start_at: string; requester_name: string; budget_id: number; budget_name: string; budget_type: BudgetType; total_amount: number; actual_amount: number | null; travelers: number; share: number; matched: number; names: string }[]
  categories: { key: string; amount: number }[]
  by_profession: { key: ProfessionKey; spent: number; pending: number; people: number; person_trips: number; requests: number; days: number; allowance: number; headcount: number }[]
  monthly_profession: { month: string; key: ProfessionKey; amount: number }[]
}
interface Opt { id: number; name: string; mission_id?: number | null }
interface BudgetList { rows: Budget[]; years: number[]; current_fiscal_year: number }
interface LogRow { id: number; action: 'create' | 'update'; before: Partial<Budget> | null; after: Partial<Budget> | null; changed_at: string; changed_by_name: string | null }

// สี: ยืนยันแล้ว = ครามเข้ม · รอยืนยัน = ครามอ่อน (ประมาณการ) · คงเหลือติดลบ = แดง (สถานะ)
const C_SPENT = TRAVEL_COLOR
const C_PENDING = '#a5b4fc'
const C_NEG = '#dc2626'
const ACCENT = { amount: '#0ea5e9', remaining: '#10b981', pending: '#f59e0b' }
const CATEGORY_LABEL: Record<string, string> = { allowance: 'เบี้ยเลี้ยง', lodging: 'ที่พัก', transport: 'พาหนะ/น้ำมัน/ทางด่วน', other: 'ลงทะเบียนและอื่น ๆ' }
const short = (n: number) => Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n))
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 1000) / 10 : 0

// กลุ่มสาขาวิชาชีพ — ลำดับคงที่ สีติดกับกลุ่ม (ไม่ใช่อันดับ) · 8 สีแรกจาก chartKit (ตรวจ CVD แล้ว) · พนักงาน = เทาเข้ม · ผู้บริหาร/ไม่ระบุ = เทาอ่อน
type ProfessionKey = 'doctor' | 'nurse' | 'pharmacist' | 'dentist' | 'allied' | 'public_health' | 'support' | 'technical' | 'operation' | 'executive' | 'unknown'
const PROFESSIONS: { key: ProfessionKey; label: string; hint: string }[] = [
  { key: 'doctor', label: 'แพทย์', hint: 'นายแพทย์' },
  { key: 'nurse', label: 'พยาบาล', hint: 'พยาบาลวิชาชีพ พยาบาลเทคนิค' },
  { key: 'pharmacist', label: 'เภสัชกร', hint: 'เภสัชกร' },
  { key: 'dentist', label: 'ทันตแพทย์', hint: 'ทันตแพทย์' },
  { key: 'allied', label: 'สหวิชาชีพ', hint: 'เทคนิคการแพทย์ กายภาพบำบัด รังสี จิตวิทยา กิจกรรมบำบัด โภชนาการ แพทย์แผนไทย ฯลฯ' },
  { key: 'public_health', label: 'สาธารณสุข', hint: 'นักวิชาการสาธารณสุข เจ้าพนักงานสาธารณสุข/ทันตสาธารณสุข' },
  { key: 'support', label: 'สายสนับสนุน', hint: 'นักวิชาการ/นักจัดการ นิติกร วิศวกร ฯลฯ' },
  { key: 'technical', label: 'สายเทคนิค (เจ้าพนักงาน)', hint: 'เจ้าพนักงาน นายช่าง เจ้าหน้าที่' },
  { key: 'operation', label: 'พนักงานและลูกจ้าง', hint: 'พนักงาน ผู้ช่วย ช่าง ฯลฯ' },
  { key: 'executive', label: 'ผู้บริหาร', hint: 'ผู้อำนวยการ' },
  { key: 'unknown', label: 'ไม่ระบุตำแหน่ง', hint: 'ไม่มีข้อมูลตำแหน่ง' },
]
const PROF_LABEL = Object.fromEntries(PROFESSIONS.map(p => [p.key, p.label])) as Record<ProfessionKey, string>
const profColor = (P: Palette, k: ProfessionKey, dark: boolean) => {
  const i = PROFESSIONS.findIndex(p => p.key === k)
  const eight = [...P.types, P.female, P.male]
  if (i >= 0 && i < 8) return eight[i]
  if (k === 'operation') return dark ? '#94a3b8' : '#475569'
  return dark ? '#475569' : '#cbd5e1'
}
// หมวดค่าใช้จ่าย = ramp สีครามไล่ระดับตามลำดับหมวด — ไม่ชนกับสีกลุ่มวิชาชีพในหน้าเดียวกัน
const CAT_SHADES = { light: ['#312e81', '#4f46e5', '#818cf8', '#c7d2fe'], dark: ['#c7d2fe', '#818cf8', '#6366f1', '#3730a3'] }
// ไล่สีในแท่ง (บนเข้ม → ล่างจางลงเล็กน้อย / แนวนอน ซ้ายจาง → ขวาเข้ม)
const grad = (c: string, horizontal = false) => ({
  type: 'linear', x: 0, y: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1,
  colorStops: horizontal ? [{ offset: 0, color: `${c}b3` }, { offset: 1, color: c }] : [{ offset: 0, color: c }, { offset: 1, color: `${c}b3` }],
})
const swatchHtml = (c: string) => `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${c};margin-right:6px"></span>`
const swatch = (c: string) => <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: c, marginRight: 6 }} />

/** แถบใช้งบ: ยืนยันแล้ว (เข้ม) + รอยืนยัน (อ่อน) เทียบวงเงิน */
const UsageBar = ({ amount, spent, pending }: { amount: number; spent: number; pending: number }) => (
  <Progress size="small" showInfo={false} percent={Math.min(100, pct(spent + pending, amount))}
    success={{ percent: Math.min(100, pct(spent, amount)), strokeColor: C_SPENT }} strokeColor={C_PENDING} />
)

// การ์ดตัวเลข: แถบสีด้านบน + ไอคอนสีประจำการ์ด (ตัวเลขใช้สีข้อความ ยกเว้นคงเหลือติดลบ)
const Stat = ({ label, value, note, color, accent, icon }: { label: string; value: string; note?: React.ReactNode; color?: string; accent: string; icon: React.ReactNode }) => (
  <Card size="small" style={{ borderRadius: 14, height: '100%', borderTop: `4px solid ${accent}`, background: `linear-gradient(160deg, ${accent}14 0%, transparent 60%), var(--app-surface)` }}
    styles={{ body: { padding: '12px 16px 14px' } }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `${accent}22`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{icon}</span>
      <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>{label}</div>
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color: color ?? 'var(--app-text)', lineHeight: 1.3, marginTop: 6 }}>{value} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--app-text-3)' }}>บาท</span></div>
    {note && <div style={{ fontSize: 12, color: 'var(--app-text-3)', marginTop: 2 }}>{note}</div>}
  </Card>
)

const DashboardTab = ({ fy, bt }: { fy: number; bt: BudgetTypes }) => {
  const { message } = App.useApp()
  const { mode } = useThemeMode()
  const theme = mode === 'dark' ? 'dark' : 'light'
  const [f, setF] = useState<Filters>(NO_FILTER)
  const [d, setD] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<{ missions: Opt[]; majors: Opt[] }>({ missions: [], majors: [] })
  const [personOpts, setPersonOpts] = useState<{ value: number; label: string }[]>([])
  const [personQ, setPersonQ] = useState('')
  const [historyFor, setHistoryFor] = useState<number | null>(null)
  const [monthBy, setMonthBy] = useState<'status' | 'profession'>('status')
  const P = PALETTES[theme]
  const dark = theme === 'dark'

  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams({ fiscal_year: String(fy) })
    for (const [k, v] of Object.entries(f)) if (v !== null) q.set(k, String(v))
    try { setD(await travelApi<Dashboard>(`budgets/dashboard?${q}`)) } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [fy, f, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  useEffect(() => {
    travelApi<{ missions: Opt[]; majors: Opt[] }>('allowance/meta').then(m => setOrgs({ missions: m.missions, majors: m.majors })).catch(() => {})
  }, [])
  // ค้นหาบุคลากรสำหรับตัวกรอง
  useEffect(() => {
    if (personQ.trim().length < 2) return
    const t = setTimeout(() => {
      travelApi<{ id: number; name: string; unit: string | null }[]>(`requests/people?search=${encodeURIComponent(personQ.trim())}`)
        .then(list => setPersonOpts(list.map(p => ({ value: p.id, label: `${p.name}${p.unit ? ` · ${p.unit}` : ''}` })))).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [personQ])

  const patch = (p: Partial<Filters>) => setF(x => ({ ...x, ...p }))
  const pickPerson = (id: number, name: string) => { setPersonOpts(o => o.some(x => x.value === id) ? o : [...o, { value: id, label: name }]); patch({ user_id: id }) }
  const active = Object.values(f).some(v => v !== null)
  const personLevel = f.mission_id !== null || f.major_id !== null || f.user_id !== null || f.status !== null

  // ปีงบ พ.ศ. → ต.ค. (ปีก่อน) ถึง ก.ย.
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m = (9 + i) % 12, y = fy - 543 - (i < 3 ? 1 : 0)
    const key = `${y}-${String(m + 1).padStart(2, '0')}`
    const r = d?.monthly.find(x => x.month === key)
    return { key, label: `${TH_MONTHS_SHORT[m]} ${String(y + 543).slice(2)}`, spent: r?.spent ?? 0, pending: r?.pending ?? 0, requests: r?.requests ?? 0 }
  }), [d, fy])
  // กลุ่มวิชาชีพที่มียอดในปี (ลำดับคงที่) — ใช้ในกราฟรายเดือนแบบแยกกลุ่ม
  const profWithAmount = useMemo(() => PROFESSIONS.filter(p => (d?.monthly_profession ?? []).some(x => x.key === p.key && x.amount > 0)), [d])

  if (!d) return <Card loading style={{ borderRadius: 14 }} />
  if (d.budgets.length === 0) return <Empty style={{ padding: 48 }} description={`ยังไม่มีงบประมาณปีงบ ${fy} — เพิ่มที่แท็บ “ตั้งค่างบประมาณ”`} />

  // ภาพรวมงบ: ทั้งปี หรือเฉพาะงบ/ประเภทที่กรอง (คงเหลือเป็นเรื่องของงบทั้งก้อน ไม่ขึ้นกับตัวกรองบุคคล)
  const scope = d.budgets.filter(b => (f.budget_id === null || b.id === f.budget_id) && (f.budget_type === null || b.budget_type === f.budget_type))
  const sum = (k: 'amount' | 'spent' | 'pending' | 'remaining' | 'projected') => scope.reduce((n, b) => n + b[k], 0)
  const scopeLabel = f.budget_id ? scope[0]?.name ?? '' : f.budget_type ? bt.label(f.budget_type) : `${scope.length} งบ`
  const budgetById = new Map(d.budgets.map(b => [b.id, b]))
  const majorOpts = orgs.majors.filter(m => !f.mission_id || m.mission_id === f.mission_id)

  const axis = { axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { opacity: 0.3 } } }
  const tip = { backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text } }
  const stack = (name: string, color: string, data: number[], top: boolean, label?: (i: number) => string) => ({
    name, type: 'bar', stack: 'use', barMaxWidth: 22, data, emphasis: { focus: 'series' },
    itemStyle: { color: grad(color), borderColor: P.surface, borderWidth: 1, borderRadius: top ? [5, 5, 0, 0] : 0 },
    label: label ? { show: true, position: 'top', fontSize: 10, color: P.muted, formatter: (p: { dataIndex: number }) => label(p.dataIndex) } : undefined,
  })
  const monthTotal = (i: number) => { const v = months[i].spent + months[i].pending; return v ? short(v) : '' }
  const monthBase = {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 8, top: 20, bottom: 32, containLabel: true },
    xAxis: { type: 'category', data: months.map(m => m.label), axisLabel: { fontSize: 10, interval: 0, rotate: 45 } },
    yAxis: { type: 'value', ...axis, axisLabel: { fontSize: 11, formatter: short } },
  }
  const monthlyOption = monthBy === 'status' ? {
    ...monthBase,
    legend: { bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: P.muted } },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { dataIndex: number }[]) => { const m = months[p[0].dataIndex]; return `${m.label}<br/>ยืนยันแล้ว <b>${fmtMoney(m.spent)}</b> บาท<br/>รอยืนยัน <b>${fmtMoney(m.pending)}</b> บาท<br/>${m.requests} คำขอ` } },
    series: [stack('ยืนยันแล้ว', C_SPENT, months.map(m => m.spent), false), stack('รอยืนยัน (ประมาณการ)', C_PENDING, months.map(m => m.pending), true, monthTotal)],
  } : {
    ...monthBase,
    legend: { bottom: 0, type: 'scroll', icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: P.muted } },
    tooltip: {
      ...tip, trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (p: { dataIndex: number; seriesIndex: number; seriesName: string; value: number }[]) => {
        const m = months[p[0].dataIndex]
        const rows = p.filter(x => x.value > 0).sort((x, y) => y.value - x.value)
          .map(x => `${swatchHtml(profColor(P, profWithAmount[x.seriesIndex].key, dark))}${x.seriesName} <b>${fmtMoney(x.value)}</b>`).join('<br/>')
        return `${m.label} · รวม <b>${fmtMoney(m.spent + m.pending)}</b> บาท${rows ? `<br/>${rows}` : ''}`
      },
    },
    series: profWithAmount.map((pr, si) => {
      const last = si === profWithAmount.length - 1
      return stack(pr.label, profColor(P, pr.key, dark), months.map(m => d.monthly_profession.find(x => x.month === m.key && x.key === pr.key)?.amount ?? 0), last, last ? monthTotal : undefined)
    }),
  }
  const units = d.by_unit
  const unitOption = {
    backgroundColor: 'transparent',
    legend: { bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: P.muted } },
    grid: { left: 8, right: 40, top: 8, bottom: 32, containLabel: true },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { dataIndex: number }[]) => { const u = units[p[0].dataIndex]; return `${u.unit}<br/>ยืนยันแล้ว <b>${fmtMoney(u.spent)}</b> บาท<br/>รอยืนยัน <b>${fmtMoney(u.pending)}</b> บาท<br/>${u.people} คน · ${u.requests} คำขอ<br/><i>กดเพื่อกรองกลุ่มงานนี้</i>` } },
    xAxis: { type: 'value', ...axis, splitNumber: 3, axisLabel: { fontSize: 11, formatter: short } },
    yAxis: { type: 'category', data: units.map(u => u.unit.length > 22 ? u.unit.slice(0, 21) + '…' : u.unit), inverse: true, axisLabel: { fontSize: 11 } },
    series: [
      { name: 'ยืนยันแล้ว', type: 'bar', stack: 'u', barMaxWidth: 16, cursor: 'pointer', data: units.map(u => u.spent), itemStyle: { color: grad(C_SPENT, true), borderColor: P.surface, borderWidth: 1 } },
      { name: 'รอยืนยัน (ประมาณการ)', type: 'bar', stack: 'u', barMaxWidth: 16, cursor: 'pointer', data: units.map(u => u.pending), itemStyle: { color: grad(C_PENDING, true), borderColor: P.surface, borderWidth: 1, borderRadius: [0, 5, 5, 0] },
        label: { show: true, position: 'right', fontSize: 10, color: P.muted, formatter: (p: { dataIndex: number }) => short(units[p.dataIndex].spent + units[p.dataIndex].pending) } },
    ],
  }
  const catTotal = d.categories.reduce((n, c) => n + c.amount, 0)
  const catColors = CAT_SHADES[theme]
  const centerLabel = (v: string, l: string) => ({
    show: true, position: 'center', formatter: () => `{v|${v}}\n{l|${l}}`,
    rich: { v: { fontSize: 21, fontWeight: 700, color: P.text, lineHeight: 28 }, l: { fontSize: 11, color: P.muted } },
  })
  const catOption = {
    backgroundColor: 'transparent',
    tooltip: { ...tip, trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) => `${p.name}<br/><b>${fmtMoney(p.value)}</b> บาท · ${p.percent}%` },
    series: [{
      type: 'pie', radius: ['56%', '84%'], padAngle: 2, itemStyle: { borderRadius: 6 }, label: centerLabel(short(catTotal), 'บาท (ประมาณการ)'),
      emphasis: { scale: true, scaleSize: 4 }, labelLine: { show: false },
      data: d.categories.map((c, i) => ({ name: CATEGORY_LABEL[c.key], value: c.amount, itemStyle: { color: catColors[i] } })),
    }],
  }

  // ── กลุ่มสาขาวิชาชีพ ──
  const profs = d.by_profession.map(p => ({ ...p, label: PROF_LABEL[p.key], color: profColor(P, p.key, dark), total: p.spent + p.pending, coverage: pct(p.people, p.headcount) }))
  const profTotal = profs.reduce((n, p) => n + p.total, 0)
  const travelled = profs.filter(p => p.people > 0)
  const byTotal = [...travelled].sort((a, b) => b.total - a.total)
  const topSpend = byTotal[0]
  const topCoverage = travelled.filter(p => p.headcount > 0).sort((a, b) => b.coverage - a.coverage)[0]
  const topAvg = [...travelled].sort((a, b) => b.total / b.people - a.total / a.people)[0]
  const notYet = profs.filter(p => p.people === 0 && p.headcount > 0 && p.key !== 'unknown')
  const profDonut = {
    backgroundColor: 'transparent',
    tooltip: { ...tip, trigger: 'item', formatter: (p: { name: string; value: number; percent: number; dataIndex: number }) => { const r = byTotal[p.dataIndex]; return `${p.name}<br/><b>${fmtMoney(p.value)}</b> บาท · ${p.percent}%<br/>${r.people} คน · ${r.person_trips} คน-ครั้ง<br/><i>กดเพื่อกรองกลุ่มนี้</i>` } },
    series: [{
      type: 'pie', radius: ['52%', '82%'], padAngle: 2, cursor: 'pointer', itemStyle: { borderRadius: 6 },
      label: centerLabel(short(profTotal), `บาท · ${travelled.reduce((n, p) => n + p.people, 0)} คน`),
      emphasis: { scale: true, scaleSize: 5 }, labelLine: { show: false },
      data: byTotal.map(p => ({ name: p.label, value: p.total, itemStyle: { color: p.color } })),
    }],
  }
  const covRows = profs.filter(p => p.headcount > 0)
  const coverageOption = {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 104, top: 8, bottom: 8, containLabel: true },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { dataIndex: number }[]) => { const r = covRows[p[0].dataIndex]; return `${r.label}<br/>ได้เดินทาง <b>${r.people}</b> จาก ${r.headcount} คน (${r.coverage}%)<br/>ยอด ${fmtMoney(r.total)} บาท<br/><i>กดเพื่อกรองกลุ่มนี้</i>` } },
    xAxis: { type: 'value', max: (v: { max: number }) => Math.min(100, Math.max(10, Math.ceil(v.max / 10) * 10)), ...axis, splitNumber: 4, axisLabel: { fontSize: 11, formatter: (v: number) => `${v}%` } },
    yAxis: { type: 'category', inverse: true, data: covRows.map(r => r.label), axisLabel: { fontSize: 11 }, axisTick: { show: false } },
    series: [{
      type: 'bar', barMaxWidth: 16, cursor: 'pointer', showBackground: true, backgroundStyle: { color: dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)', borderRadius: 5 },
      data: covRows.map(r => ({ value: Math.min(100, r.coverage), itemStyle: { color: grad(r.color, true), borderRadius: [0, 5, 5, 0] } })),
      label: { show: true, position: 'right', fontSize: 10.5, color: P.muted, formatter: (p: { dataIndex: number }) => { const r = covRows[p.dataIndex]; return `${r.people}/${r.headcount} คน · ${r.coverage}%` } },
    }],
  }
  type ProfRow = typeof profs[number]
  const dash = <Text type="secondary">-</Text>
  const profCols: ColumnsType<ProfRow> = [
    { title: 'กลุ่มสาขาวิชาชีพ', dataIndex: 'label', render: (l: string, r) => <Tooltip title={PROFESSIONS.find(p => p.key === r.key)?.hint}>{filterLink(<span style={{ whiteSpace: 'nowrap' }}>{swatch(r.color)}<b>{l}</b></span>, () => patch({ profession: r.key }), 'กรองเฉพาะกลุ่มนี้')}</Tooltip> },
    { title: 'บุคลากร', dataIndex: 'headcount', align: 'center', width: 76, sorter: (a, b) => a.headcount - b.headcount },
    { title: 'ได้เดินทาง', dataIndex: 'people', align: 'center', width: 88, sorter: (a, b) => a.people - b.people, render: (n: number) => n ? <b>{n}</b> : <Text type="secondary">0</Text> },
    { title: 'สัดส่วนผู้ได้เดินทาง', dataIndex: 'coverage', width: 170, sorter: (a, b) => a.coverage - b.coverage,
      render: (v: number, r) => r.headcount ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Progress size="small" showInfo={false} percent={Math.min(100, v)} strokeColor={r.color} style={{ flex: 1, margin: 0 }} /><span style={{ fontSize: 12, width: 44, textAlign: 'right' }}>{v}%</span></div> : dash },
    { title: 'คน-ครั้ง', dataIndex: 'person_trips', align: 'center', width: 76, responsive: ['md'], sorter: (a, b) => a.person_trips - b.person_trips },
    { title: 'วัน', dataIndex: 'days', align: 'center', width: 60, responsive: ['md'], sorter: (a, b) => a.days - b.days },
    { title: 'ใช้จริง', dataIndex: 'spent', align: 'right', width: 104, sorter: (a, b) => a.spent - b.spent, render: (v: number) => v ? <span style={{ color: C_SPENT, fontWeight: 600 }}>{fmtMoney(v)}</span> : dash },
    { title: 'รอยืนยัน', dataIndex: 'pending', align: 'right', width: 104, responsive: ['sm'], sorter: (a, b) => a.pending - b.pending, render: (v: number) => v ? fmtMoney(v) : dash },
    { title: 'สัดส่วนยอด', dataIndex: 'total', align: 'right', width: 96, defaultSortOrder: 'descend', sorter: (a, b) => a.total - b.total, render: (v: number) => v ? `${pct(v, profTotal)}%` : dash },
    { title: 'เฉลี่ย/คน', key: 'avg', align: 'right', width: 100, responsive: ['lg'], sorter: (a, b) => (a.people ? a.total / a.people : 0) - (b.people ? b.total / b.people : 0), render: (_: unknown, r) => r.people ? fmtMoney(Math.round(r.total / r.people)) : dash },
    { title: 'เฉลี่ย/คน-ครั้ง', key: 'avgTrip', align: 'right', width: 110, responsive: ['xl'], render: (_: unknown, r) => r.person_trips ? fmtMoney(Math.round(r.total / r.person_trips)) : dash },
  ]
  const insight = (icon: React.ReactNode, color: string, title: string, body: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, background: `${color}14`, border: `1px solid ${color}33`, height: '100%' }}>
      <span style={{ color, fontSize: 18, lineHeight: 1.2 }}>{icon}</span>
      <div style={{ minWidth: 0 }}><div style={{ fontSize: 12, color: 'var(--app-text-2)' }}>{title}</div><div style={{ fontSize: 13.5, color: 'var(--app-text)' }}>{body}</div></div>
    </div>
  )
  const filterLink = (label: React.ReactNode, onClick: () => void, title: string) => <a onClick={onClick} title={title}>{label}</a>

  const budgetCols: ColumnsType<Dashboard['by_budget'][number]> = [
    { title: 'งบ', dataIndex: 'budget_name', render: (n: string, b) => <>{filterLink(<b>{n}</b>, () => patch({ budget_id: b.budget_id }), 'กรองเฉพาะงบนี้')}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{bt.label(b.budget_type)}</div></> },
    { title: 'ใช้จริง', dataIndex: 'spent', align: 'right', width: 110, render: (v: number) => <span style={{ color: C_SPENT, fontWeight: 600 }}>{fmtMoney(v)}</span> },
    { title: 'รอยืนยัน', dataIndex: 'pending', align: 'right', width: 110, render: (v: number) => v > 0 ? fmtMoney(v) : <Text type="secondary">-</Text> },
    { title: 'บุคลากร', dataIndex: 'people', align: 'center', width: 80, responsive: ['md'], render: (n: number) => `${n} คน` },
    { title: 'คำขอ', dataIndex: 'requests', align: 'center', width: 70, responsive: ['md'] },
    {
      title: personLevel ? 'สัดส่วนของวงเงิน (ตามตัวกรอง)' : 'การใช้งบ', width: 200, responsive: ['sm'],
      render: (_: unknown, b) => { const bud = budgetById.get(b.budget_id); if (!bud) return null; return <><UsageBar amount={bud.amount} spent={b.spent} pending={b.pending} /><Text type="secondary" style={{ fontSize: 11 }}>วงเงิน {fmtMoney(bud.amount)} · ใช้จริง {pct(b.spent, bud.amount)}%{b.pending > 0 ? ` · รวมรอยืนยัน ${pct(b.spent + b.pending, bud.amount)}%` : ''}</Text></> },
    },
  ]
  const personCols: ColumnsType<Dashboard['by_person'][number]> = [
    { title: 'บุคลากร', dataIndex: 'name', render: (n: string, p) => <>{filterLink(<b>{n}</b>, () => pickPerson(p.user_id, n), 'กรองเฉพาะคนนี้')}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{p.unit || '—'}</div></> },
    { title: 'ใช้งบ', dataIndex: 'budgets', responsive: ['lg'], render: (v: string) => <span style={{ fontSize: 12.5 }}>{v}</span> },
    { title: 'ครั้ง', dataIndex: 'trips', width: 64, align: 'center', render: (n: number) => <Tag color={n >= 3 ? 'gold' : undefined} style={{ margin: 0 }}>{n}</Tag> },
    { title: 'วัน', dataIndex: 'days', width: 56, align: 'center', responsive: ['md'] },
    { title: 'ใช้จริง', dataIndex: 'spent', width: 104, align: 'right', render: (v: number) => <span style={{ color: C_SPENT, fontWeight: 600 }}>{fmtMoney(v)}</span> },
    { title: 'รอยืนยัน', dataIndex: 'pending', width: 104, align: 'right', responsive: ['sm'], render: (v: number) => v > 0 ? fmtMoney(v) : <Text type="secondary">-</Text> },
    { title: '', width: 92, align: 'right', render: (_: unknown, p) => <Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryFor(p.user_id)} aria-label={`ประวัติของ ${p.name}`}>ประวัติ</Button> },
  ]
  const requestCols: ColumnsType<Dashboard['requests'][number]> = [
    { title: 'คำขอ', dataIndex: 'subject', render: (s: string, r) => <><div>{s}</div><Text type="secondary" style={{ fontSize: 12 }}>{requestNo(r.id)} · {tripRange(r.start_at, r.start_at)} · {r.location}</Text></> },
    { title: 'งบ', dataIndex: 'budget_name', width: 170, responsive: ['md'], render: (n: string, r) => filterLink(n, () => patch({ budget_id: r.budget_id }), 'กรองเฉพาะงบนี้') },
    { title: 'ผู้เดินทาง', dataIndex: 'names', width: 210, responsive: ['lg'], render: (n: string, r) => <Tooltip title={n}><span style={{ fontSize: 12.5 }}>{r.matched < r.travelers ? `${n} (${r.matched}/${r.travelers} คน)` : `${r.travelers} คน · ${n.length > 40 ? n.slice(0, 39) + '…' : n}`}</span></Tooltip> },
    {
      title: personLevel ? 'ยอดตามตัวกรอง' : 'ยอด (บาท)', dataIndex: 'share', width: 150, align: 'right',
      render: (v: number, r) => <>
        <div style={{ fontWeight: 600 }}>{fmtMoney(v)}</div>
        {r.actual_amount != null ? <Tag color="success" style={{ margin: 0 }}>ยืนยันแล้ว</Tag> : <Tag style={{ margin: 0 }}>รอยืนยัน</Tag>}
        {v !== (r.actual_amount ?? r.total_amount) && <div style={{ fontSize: 11, color: 'var(--app-text-3)' }}>ทั้งคำขอ {fmtMoney(r.actual_amount ?? r.total_amount)}</div>}
      </>,
    },
  ]

  return (
    <Spin spinning={loading} delay={200}>
      {/* ── ตัวกรอง ── */}
      <Card size="small" style={{ borderRadius: 14, marginBottom: 12 }} styles={{ body: { padding: 12 } }}>
        <div className="dash-filters">
          <Select allowClear placeholder="ทุกงบ" value={f.budget_id ?? undefined} onChange={v => patch({ budget_id: v ?? null })} aria-label="งบ"
            options={d.budgets.map(b => ({ value: b.id, label: b.name }))} popupMatchSelectWidth={false} />
          <Select allowClear placeholder="ทุกประเภทงบ" value={f.budget_type ?? undefined} onChange={v => patch({ budget_type: v ?? null })} aria-label="ประเภทงบ"
            options={(bt.types ?? []).map(t => ({ value: t.code, label: budgetTypeLabel(t) }))} popupMatchSelectWidth={false} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="ทุกกลุ่มภารกิจ" value={f.mission_id ?? undefined} aria-label="กลุ่มภารกิจ"
            onChange={v => patch({ mission_id: v ?? null, major_id: null })} options={orgs.missions.map(m => ({ value: m.id, label: m.name }))} popupMatchSelectWidth={false} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="ทุกกลุ่มงาน" value={f.major_id ?? undefined} aria-label="กลุ่มงาน"
            onChange={v => patch({ major_id: v ?? null })} options={majorOpts.map(m => ({ value: m.id, label: m.name }))} popupMatchSelectWidth={false} />
          <Select allowClear placeholder="ทุกกลุ่มสาขาวิชาชีพ" value={f.profession ?? undefined} aria-label="กลุ่มสาขาวิชาชีพ" onChange={v => patch({ profession: v ?? null })} popupMatchSelectWidth={false}
            options={PROFESSIONS.map(p => ({ value: p.key, label: <span>{swatch(profColor(P, p.key, dark))}{p.label}</span>, title: p.label }))} />
          <Select allowClear showSearch filterOption={false} onSearch={setPersonQ} placeholder="ทุกคน (พิมพ์ชื่อ)" value={f.user_id ?? undefined} aria-label="บุคลากร"
            onChange={v => patch({ user_id: v ?? null })} options={personOpts} notFoundContent={personQ.trim().length < 2 ? 'พิมพ์ชื่ออย่างน้อย 2 ตัวอักษร' : 'ไม่พบ'} popupMatchSelectWidth={false} />
          <Segmented value={f.status ?? 'all'} onChange={v => patch({ status: v === 'all' ? null : v as Filters['status'] })}
            options={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'confirmed', label: 'ยืนยันแล้ว' }, { value: 'pending', label: 'รอยืนยัน' }]} />
        </div>
        {active && <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <FilterOutlined style={{ color: TRAVEL_COLOR }} />
          <Text style={{ fontSize: 13 }}>ตามตัวกรอง: ใช้จริง <b style={{ color: C_SPENT }}>{fmtMoney(d.filtered.spent)}</b> บาท · รอยืนยัน <b>{fmtMoney(d.filtered.pending)}</b> บาท · {d.filtered.people} คน · {d.filtered.requests} คำขอ</Text>
          <Button size="small" type="link" icon={<ClearOutlined />} onClick={() => setF(NO_FILTER)}>ล้างตัวกรอง</Button>
        </div>}
      </Card>

      {/* ── ภาพรวมงบ ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={12} lg={6}><Stat accent={ACCENT.amount} icon={<WalletOutlined />} label="วงเงิน" value={fmtMoney(sum('amount'))} note={`${scopeLabel} · ปีงบ ${fy}`} /></Col>
        <Col xs={12} lg={6}><Stat accent={C_SPENT} icon={<CheckCircleOutlined />} label="ใช้จริง (การเงินยืนยัน)" value={fmtMoney(sum('spent'))} color={C_SPENT} note={`${pct(sum('spent'), sum('amount'))}% ของวงเงิน`} /></Col>
        <Col xs={12} lg={6}><Stat accent={sum('remaining') < 0 ? C_NEG : ACCENT.remaining} icon={<SafetyCertificateOutlined />} label="คงเหลือ" value={fmtMoney(sum('remaining'))} color={sum('remaining') < 0 ? C_NEG : undefined} note="วงเงิน − ยอดที่การเงินยืนยัน" /></Col>
        <Col xs={12} lg={6}><Stat accent={ACCENT.pending} icon={<ClockCircleOutlined />} label="รอการเงินยืนยัน" value={fmtMoney(sum('pending'))} note={<>หากเบิกตามประมาณการเหลือ <b style={{ color: sum('projected') < 0 ? C_NEG : undefined }}>{fmtMoney(sum('projected'))}</b></>} /></Col>
      </Row>

      <Card size="small" title="ใช้งบไหน" extra={<Text type="secondary" style={{ fontSize: 12 }}>กดชื่องบเพื่อกรอง</Text>} style={{ borderRadius: 14, marginBottom: 12 }}>
        <Table size="small" rowKey="budget_id" pagination={false} dataSource={d.by_budget} columns={budgetCols} scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการตามตัวกรอง" /> }} />
        <Space size={16} style={{ marginTop: 8, fontSize: 12, color: 'var(--app-text-2)' }} wrap>
          <span>{swatch(C_SPENT)}ใช้จริง (การเงินยืนยัน)</span><span>{swatch(C_PENDING)}รอยืนยัน (ประมาณการ ไม่ตัดงบ)</span>
        </Space>
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} lg={14}>
          <Card size="small" title="การใช้งบรายเดือน" style={{ borderRadius: 14, height: '100%' }}
            extra={<Segmented size="small" value={monthBy} onChange={v => setMonthBy(v as typeof monthBy)} aria-label="แยกกราฟรายเดือนตาม"
              options={[{ value: 'status', label: 'ตามสถานะ' }, { value: 'profession', label: 'ตามกลุ่มวิชาชีพ' }]} />}>
            <Text type="secondary" style={{ fontSize: 12 }}>ตามเดือนที่ออกเดินทาง ปีงบ {fy} (ต.ค.–ก.ย.){monthBy === 'profession' ? ' · รวมยืนยันแล้วและรอยืนยัน' : ''}</Text>
            {months.every(m => !m.spent && !m.pending) ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการตามตัวกรอง" style={{ padding: '40px 0' }} /> : <EChart theme={theme} height={280} option={monthlyOption} />}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title="แยกตามกลุ่มงานผู้เดินทาง" style={{ borderRadius: 14, height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>กดแท่งเพื่อกรองกลุ่มงาน</Text>
            {units.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการตามตัวกรอง" style={{ padding: '40px 0' }} /> :
              <EChart theme={theme} height={Math.max(200, units.length * 30 + 60)} option={unitOption}
                onClick={p => { const u = units[p.dataIndex]; if (u?.major_id) patch({ major_id: u.major_id }) }} />}
          </Card>
        </Col>
      </Row>

      {/* ── กลุ่มสาขาวิชาชีพที่ได้เดินทาง ── */}
      <Card size="small" style={{ borderRadius: 14, marginBottom: 12 }} data-testid="profession-section"
        title={<span><TeamOutlined style={{ color: TRAVEL_COLOR, marginRight: 8 }} />กลุ่มสาขาวิชาชีพที่ได้เดินทาง</span>}
        extra={<Text type="secondary" style={{ fontSize: 12 }}>จัดกลุ่มจากตำแหน่ง ณ วันยื่น · กดกลุ่มเพื่อกรอง</Text>}>
        {travelled.length === 0 && covRows.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการตามตัวกรอง" /> : <>
          {travelled.length > 0 && <Row gutter={[10, 10]} style={{ marginBottom: 12 }} data-testid="profession-insights">
            {topSpend && <Col xs={24} sm={12} xl={6}>{insight(<WalletOutlined />, topSpend.color, 'ใช้งบมากที่สุด', <><b>{topSpend.label}</b> {pct(topSpend.total, profTotal)}% ของยอด ({fmtMoney(topSpend.total)} บาท)</>)}</Col>}
            {topCoverage && <Col xs={24} sm={12} xl={6}>{insight(<TeamOutlined />, topCoverage.color, 'ได้เดินทางทั่วถึงที่สุด', <><b>{topCoverage.label}</b> {topCoverage.people}/{topCoverage.headcount} คน ({topCoverage.coverage}%)</>)}</Col>}
            {topAvg && <Col xs={24} sm={12} xl={6}>{insight(<BulbOutlined />, topAvg.color, 'เฉลี่ยต่อคนสูงที่สุด', <><b>{topAvg.label}</b> {fmtMoney(Math.round(topAvg.total / topAvg.people))} บาท/คน</>)}</Col>}
            <Col xs={24} sm={12} xl={6}>{insight(<AppstoreOutlined />, notYet.length ? ACCENT.pending : ACCENT.remaining, 'ยังไม่มีผู้ได้เดินทาง',
              notYet.length ? <Tooltip title={notYet.map(p => `${p.label} (${p.headcount} คน)`).join(', ')}><span>{notYet.slice(0, 3).map(p => p.label).join(', ')}{notYet.length > 3 ? ` และอีก ${notYet.length - 3} กลุ่ม` : ''}</span></Tooltip> : 'ทุกกลุ่มได้เดินทางแล้ว')}</Col>
          </Row>}
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={24} lg={9}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>สัดส่วนยอดใช้งบตามกลุ่ม</div>
              {travelled.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีผู้เดินทาง" style={{ padding: '40px 0' }} /> : <>
                <EChart theme={theme} height={230} option={profDonut} onClick={p => { const r = byTotal[p.dataIndex]; if (r) patch({ profession: r.key }) }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'center', fontSize: 12, color: 'var(--app-text-2)' }}>
                  {byTotal.map(p => <span key={p.key}>{swatch(p.color)}{p.label} {pct(p.total, profTotal)}%</span>)}
                </div>
              </>}
            </Col>
            <Col xs={24} lg={15}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>สัดส่วนผู้ได้เดินทางต่อบุคลากรในกลุ่ม <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>(บุคลากรที่ปฏิบัติงานอยู่ปัจจุบัน{f.mission_id || f.major_id ? ' ตามกลุ่มภารกิจ/กลุ่มงานที่กรอง' : ''})</Text></div>
              <EChart theme={theme} height={Math.max(200, covRows.length * 30 + 30)} option={coverageOption} onClick={p => { const r = covRows[p.dataIndex]; if (r) patch({ profession: r.key }) }} />
            </Col>
          </Row>
          <Table size="small" rowKey="key" dataSource={profs} columns={profCols} pagination={false} scroll={{ x: 'max-content' }}
            summary={() => profs.length > 1 ? (
              <Table.Summary.Row style={{ fontWeight: 600 }}>
                <Table.Summary.Cell index={0}>รวม</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">{profs.reduce((n, p) => n + p.headcount, 0)}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="center">{profs.reduce((n, p) => n + p.people, 0)}</Table.Summary.Cell>
                <Table.Summary.Cell index={3}>{pct(profs.reduce((n, p) => n + p.people, 0), profs.reduce((n, p) => n + p.headcount, 0))}%</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center">{profs.reduce((n, p) => n + p.person_trips, 0)}</Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="center">{profs.reduce((n, p) => n + p.days, 0)}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">{fmtMoney(profs.reduce((n, p) => n + p.spent, 0))}</Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">{fmtMoney(profs.reduce((n, p) => n + p.pending, 0))}</Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">100%</Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="right">{(() => { const n = profs.reduce((a, p) => a + p.people, 0); return n ? fmtMoney(Math.round(profTotal / n)) : '-' })()}</Table.Summary.Cell>
                <Table.Summary.Cell index={10} align="right">{(() => { const n = profs.reduce((a, p) => a + p.person_trips, 0); return n ? fmtMoney(Math.round(profTotal / n)) : '-' })()}</Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null} />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
            ยอดรายกลุ่ม = ผลรวมยอดรายคนของผู้เดินทางในกลุ่ม (รวมยืนยันแล้วและรอยืนยัน) · คน-ครั้ง = จำนวนคนคูณจำนวนครั้งที่เดินทาง · ชี้ชื่อกลุ่มเพื่อดูตำแหน่งที่อยู่ในกลุ่ม
          </Text>
        </>}
      </Card>

      <Card size="small" title={`ใช้กับใคร (${d.by_person.length} คน)`} extra={<Text type="secondary" style={{ fontSize: 12 }}>ยอดรายคน = เบี้ยเลี้ยงของคนนั้น + ค่าใช้จ่ายร่วมหารเท่ากัน</Text>} style={{ borderRadius: 14, marginBottom: 12 }}>
        <Table size="small" rowKey="user_id" dataSource={d.by_person} columns={personCols} scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการตามตัวกรอง" /> }} />
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={9}>
          <Card size="small" title="แยกหมวดค่าใช้จ่าย (ประมาณการ)" style={{ borderRadius: 14, height: '100%' }}>
            {catTotal === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการ" /> : <>
              <EChart theme={theme} height={190} option={catOption} />
              {d.categories.map((c, i) => (
                <div key={c.key} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{swatch(catColors[i])}{CATEGORY_LABEL[c.key]}</span><span>{fmtMoney(c.amount)} บาท · {pct(c.amount, catTotal)}%</span></div>
                  <Progress size="small" showInfo={false} percent={pct(c.amount, catTotal)} strokeColor={catColors[i]} />
                </div>
              ))}
            </>}
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          <Card size="small" title={`คำขอ (${d.requests.length})`} style={{ borderRadius: 14, height: '100%' }}>
            <Table size="small" rowKey="id" dataSource={d.requests} columns={requestCols} scroll={{ x: 'max-content' }} pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการตามตัวกรอง" /> }} />
          </Card>
        </Col>
      </Row>

      {historyFor && <TravelHistoryDrawer key={historyFor} userId={historyFor} fiscalYear={fy} onClose={() => setHistoryFor(null)} />}
      <style jsx global>{`
        .dash-filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
        @media (max-width: 1199px) { .dash-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 991px) { .dash-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 575px) { .dash-filters { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
    </Spin>
  )
}

// ── ตั้งค่างบประมาณ ──
const BudgetModal = ({ edit, fy, bt, onClose, onSaved }: { edit: Budget | 'new'; fy: number; bt: BudgetTypes; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [log, setLog] = useState<LogRow[] | null>(edit === 'new' ? [] : null)
  useEffect(() => {
    if (edit === 'new') return
    travelApi<LogRow[]>(`budgets/${edit.id}/log`).then(setLog).catch(() => setLog([]))
  }, [edit])
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    const body = { ...v, name: v.name.trim(), note: v.note?.trim() || null }
    try {
      if (edit === 'new') await travelPost('budgets', body)
      else await travelApi(`budgets/${edit.id}`, 'PUT', body)
      message.success(`บันทึก${body.name} ${fmtMoney(body.amount)} บาทแล้ว`)
      onClose(); onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else message.error((e as Error).message)
    } finally { setSaving(false) }
  }
  const used = edit !== 'new' && edit.requests > 0
  // ประเภทที่เลือกได้ = ที่เปิดใช้ + ประเภทเดิมของงบนี้ (แม้ปิดใช้แล้ว)
  const typeOpts = (bt.types ?? []).filter(t => t.is_active || (edit !== 'new' && t.code === edit.budget_type))
    .map(t => ({ value: t.code, label: `${budgetTypeLabel(t)}${t.is_active ? '' : ' (ปิดใช้)'}` }))
  const watchedType = Form.useWatch('budget_type', form) as string | undefined
  const itemLabel = watchedType ? bt.byCode.get(watchedType)?.item_label ?? 'รายการงบ' : 'รายการงบ'
  return (
    <Modal open title={edit === 'new' ? 'เพิ่มงบประมาณ' : `แก้ไข${edit.name}`} onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} width={560}>
      {used && <Alert type="info" showIcon style={{ marginBottom: 12 }} title={`มีคำขอใช้งบนี้ ${edit.requests} รายการ — เปลี่ยนประเภทหรือปีงบไม่ได้`} description={`ลดวงเงินได้ไม่ต่ำกว่ายอดที่การเงินยืนยันแล้ว ${fmtMoney(edit.spent)} บาท`} />}
      <Form form={form} layout="vertical"
        initialValues={edit === 'new' ? { fiscal_year: fy, budget_type: (bt.types ?? []).find(t => t.is_active)?.code, is_active: true } : { fiscal_year: edit.fiscal_year, budget_type: edit.budget_type, name: edit.name, amount: edit.amount, note: edit.note ?? undefined, is_active: edit.is_active }}>
        <Row gutter={12}>
          <Col xs={10}><Form.Item name="fiscal_year" label="ปีงบประมาณ (พ.ศ.)" rules={[{ required: true, message: 'ระบุปีงบ' }]}><InputNumber min={2500} max={2700} precision={0} style={{ width: '100%' }} disabled={used} /></Form.Item></Col>
          <Col xs={14}><Form.Item name="is_active" label="เปิดให้เลือกในคำขอ" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>
        <Form.Item name="budget_type" label="ประเภท (ช่องที่ติ๊กในบันทึกข้อความ)" rules={[{ required: true, message: 'เลือกประเภทงบ' }]}
          extra="เพิ่ม/แก้ประเภทได้ที่แท็บ “ประเภทงบ”">
          <Select disabled={used} options={typeOpts} placeholder="เลือกประเภทงบ" showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item name="name" label="ชื่องบ" extra={itemLabel ? `ชื่อนี้จะพิมพ์ในบรรทัด “${itemLabel}” ของบันทึกข้อความ` : 'ชื่อนี้จะพิมพ์ใต้บรรทัดประเภทงบในบันทึกข้อความ (ไม่มีคำนำหน้า)'} rules={[{ required: true, whitespace: true, message: 'ระบุชื่องบ' }, { max: 200 }]}>
          <Input placeholder="เช่น งบพัฒนาบุคลากร เงินบำรุงโรงพยาบาล" />
        </Form.Item>
        <Form.Item name="amount" label="วงเงิน" rules={[{ required: true, message: 'ระบุวงเงิน' }]}>
          <InputNumber min={0.01} max={1_000_000_000} precision={2} style={{ width: '100%' }} suffix="บาท" />
        </Form.Item>
        <Form.Item name="note" label="หมายเหตุ" rules={[{ max: 300 }]}><Input /></Form.Item>
      </Form>
      {edit !== 'new' && <>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>ประวัติการแก้ไข</Text>
        <Table<LogRow> size="small" rowKey="id" pagination={false} loading={log === null} dataSource={log ?? []} scroll={{ x: 'max-content' }}
          columns={[
            { title: 'วันที่', dataIndex: 'changed_at', width: 130, render: thaiDateTime },
            { title: 'รายการ', render: (_: unknown, r) => r.action === 'create' ? <>เพิ่มงบ วงเงิน {fmtMoney(r.after?.amount ?? 0)}</> : <>
              {r.before?.amount !== r.after?.amount && <div>วงเงิน {fmtMoney(r.before?.amount ?? 0)} → <b>{fmtMoney(r.after?.amount ?? 0)}</b></div>}
              {r.before?.name !== r.after?.name && <div>ชื่อ {r.before?.name} → {r.after?.name}</div>}
              {r.before?.is_active !== r.after?.is_active && <div>{r.after?.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</div>}
              {r.before?.note !== r.after?.note && <div>แก้หมายเหตุ</div>}
            </> },
            { title: 'ผู้แก้ไข', dataIndex: 'changed_by_name', width: 140, render: (v: string | null) => v ?? '—' },
          ]} />
      </>}
    </Modal>
  )
}

const SettingsTab = ({ fy, bt, onChanged }: { fy: number; bt: BudgetTypes; onChanged: () => void }) => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<Budget[] | null>(null)
  const [edit, setEdit] = useState<Budget | 'new' | null>(null)
  // ตัวกรอง (ฝั่งหน้าเว็บ — งบของปีงบเดียวมีไม่มาก)
  const [fType, setFType] = useState<string | null>(null)
  const [fText, setFText] = useState('')
  const [fStatus, setFStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const load = useCallback(async () => {
    try { setRows((await travelApi<BudgetList>(`budgets?fiscal_year=${fy}`)).rows) } catch (e) { message.error((e as Error).message) }
  }, [fy, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  const columns: ColumnsType<Budget> = [
    { title: 'ประเภท', dataIndex: 'budget_type', width: 200, render: (v: BudgetType) => bt.label(v) },
    { title: 'ชื่องบ', dataIndex: 'name', render: (n: string, b) => <><div style={{ fontWeight: 500 }}>{n}</div>{b.note && <Text type="secondary" style={{ fontSize: 12 }}>{b.note}</Text>}</> },
    { title: 'วงเงิน (บาท)', dataIndex: 'amount', align: 'right', width: 130, render: fmtMoney },
    { title: 'ใช้จริง', dataIndex: 'spent', align: 'right', width: 120, responsive: ['md'], render: fmtMoney },
    { title: 'คงเหลือ', dataIndex: 'remaining', align: 'right', width: 120, render: (v: number) => <span style={{ color: v < 0 ? C_NEG : undefined, fontWeight: 600 }}>{fmtMoney(v)}</span> },
    { title: 'สถานะ', dataIndex: 'is_active', width: 100, align: 'center', render: (v: boolean) => v ? <Tag color="success">เปิดใช้</Tag> : <Tag>ปิดใช้งาน</Tag> },
    { title: 'แก้ล่าสุด', dataIndex: 'updated_at', width: 170, responsive: ['xl'], render: (v: string, b) => <><div style={{ fontSize: 13 }}>{b.updated_by_name ?? '—'}</div><Text type="secondary" style={{ fontSize: 12 }}>{thaiDateTime(v)}</Text></> },
    { title: '', width: 56, align: 'center', render: (_: unknown, b) => <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEdit(b)} title="แก้ไข/ประวัติ" aria-label={`แก้ไข ${b.name}`} /> },
  ]
  const q = fText.trim().toLowerCase()
  const filtering = !!(fType || q || fStatus !== 'all')
  // เรียงตามลำดับประเภท แล้วชื่องบ — รายการย่อยของประเภทเดียวกันอยู่ติดกัน
  const shown = (rows ?? [])
    .filter(b => (!fType || b.budget_type === fType)
      && (fStatus === 'all' || (fStatus === 'active') === b.is_active)
      && (!q || `${b.name} ${b.note ?? ''} ${bt.label(b.budget_type)}`.toLowerCase().includes(q)))
    .sort((a, b) => (bt.byCode.get(a.budget_type)?.sort_order ?? 9999) - (bt.byCode.get(b.budget_type)?.sort_order ?? 9999) || Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, 'th'))
  const sum = shown.reduce((a, b) => ({ amount: a.amount + b.amount, spent: a.spent + b.spent, remaining: a.remaining + b.remaining }), { amount: 0, spent: 0, remaining: 0 })
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text type="secondary" style={{ flex: 1, minWidth: 220 }}>ตั้งงบที่ใช้เดินทางไปราชการของปีงบ {fy} ผู้ขอเลือกงบนี้ในแบบฟอร์ม · ตัดงบเมื่อการเงินยืนยันยอด</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEdit('new')}>เพิ่มงบประมาณ</Button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }} data-testid="budget-filters">
        <FilterOutlined style={{ color: 'var(--app-text-3)' }} />
        <Select allowClear placeholder="ทุกประเภทงบ" value={fType ?? undefined} onChange={v => setFType(v ?? null)} aria-label="กรองประเภทงบ"
          style={{ minWidth: 220 }} popupMatchSelectWidth={false} showSearch optionFilterProp="label"
          options={(bt.types ?? []).map(t => ({ value: t.code, label: `${budgetTypeLabel(t)}${t.is_active ? '' : ' (ปิดใช้)'}` }))} />
        <Input allowClear placeholder="ค้นหาชื่องบ / หมายเหตุ" value={fText} onChange={e => setFText(e.target.value)} aria-label="ค้นหางบ" style={{ flex: '1 1 200px', maxWidth: 300 }} />
        <Segmented value={fStatus} onChange={v => setFStatus(v as typeof fStatus)}
          options={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'active', label: 'เปิดใช้' }, { value: 'inactive', label: 'ปิดใช้งาน' }]} />
        {filtering && <Button icon={<ClearOutlined />} onClick={() => { setFType(null); setFText(''); setFStatus('all') }}>ล้างตัวกรอง</Button>}
        {rows && <Text type="secondary" style={{ marginInlineStart: 'auto', fontSize: 12 }} data-testid="budget-count">
          แสดง {shown.length} / {rows.length} งบ · วงเงิน {fmtMoney(sum.amount)} · คงเหลือ {fmtMoney(sum.remaining)} บาท
        </Text>}
      </div>
      <Table<Budget> size="small" rowKey="id" loading={rows === null} columns={columns} pagination={false} scroll={{ x: 'max-content' }}
        dataSource={shown}
        locale={{ emptyText: <Empty description={filtering ? 'ไม่พบงบตามตัวกรอง' : `ยังไม่มีงบปีงบ ${fy}`} /> }} />
      {edit && <BudgetModal key={edit === 'new' ? 'new' : edit.id} edit={edit} fy={fy} bt={bt} onClose={() => setEdit(null)} onSaved={() => { load(); onChanged() }} />}
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}><HistoryOutlined /> ทุกการเพิ่ม/แก้ไขเก็บประวัติ ดูได้ในหน้าต่างแก้ไขของแต่ละงบ</Text>
    </>
  )
}

// ── ประเภทงบ — ADMIN / HRD เพิ่ม แก้ชื่อ รหัสงบ ลำดับ เปิด/ปิดใช้ (ไม่มีลบ: งบและคำขอเดิมอ้างอยู่) ──
const TypeModal = ({ edit, onClose, onSaved }: { edit: BudgetTypeRow | 'new'; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    const body = { ...v, name: v.name.trim(), ref_code: v.ref_code?.trim() || null, item_label: v.item_label?.trim() ?? '' }
    try {
      if (edit === 'new') await travelPost('budget-types', body)
      else await travelApi(`budget-types/${edit.code}`, 'PUT', body)
      message.success(`บันทึกประเภท ${body.ref_code ? `${body.ref_code} · ` : ''}${body.name} แล้ว`)
      onClose(); onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else message.error((e as Error).message)
    } finally { setSaving(false) }
  }
  return (
    <Modal open title={edit === 'new' ? 'เพิ่มประเภทงบ' : `แก้ไขประเภท ${budgetTypeLabel(edit)}`} onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} width={520}>
      <Form form={form} layout="vertical"
        initialValues={edit === 'new' ? { item_label: 'รายการงบ', is_active: true } : { name: edit.name, ref_code: edit.ref_code ?? undefined, item_label: edit.item_label, sort_order: edit.sort_order, is_active: edit.is_active }}>
        <Row gutter={12}>
          <Col xs={9}>
            <Form.Item name="ref_code" label="รหัสงบ" tooltip="รหัสที่การเงินใช้ เช่น P20 — ไม่บังคับ ห้ามซ้ำ"
              rules={[{ pattern: /^[A-Za-z0-9.\-/]{0,20}$/, message: 'อังกฤษ/ตัวเลข/. - / ไม่เกิน 20 ตัว' }]}>
              <Input placeholder="เช่น P20" maxLength={20} />
            </Form.Item>
          </Col>
          <Col xs={15}>
            <Form.Item name="name" label="ชื่อประเภท (ข้อความข้างช่องติ๊ก)" rules={[{ required: true, whitespace: true, message: 'ระบุชื่อประเภท' }, { max: 100 }]}>
              <Input placeholder="เช่น เงินบำรุงโรงพยาบาล" maxLength={100} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={15}>
            <Form.Item name="item_label" label="ข้อความหน้าชื่องบในบันทึกข้อความ" tooltip="บรรทัดใต้ประเภทงบ เช่น “รายการงบ ...” หรือ “ชื่อโครงการ ...” — เว้นว่าง = พิมพ์ชื่องบโดยไม่มีคำนำหน้า" rules={[{ max: 30 }]}>
              <Input placeholder="(ว่าง = ไม่มีคำนำหน้า)" maxLength={30} allowClear />
            </Form.Item>
          </Col>
          <Col xs={9}>
            <Form.Item name="sort_order" label="ลำดับ" tooltip="ลำดับช่องติ๊กในบันทึกข้อความและในรายการ (น้อยขึ้นก่อน) — เว้นว่าง = ต่อท้าย">
              <InputNumber min={0} max={9999} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="is_active" label="เปิดใช้" valuePropName="checked" extra="ปิดใช้ = ตั้งงบใหม่ด้วยประเภทนี้ไม่ได้ และไม่แสดงช่องติ๊กในบันทึกข้อความใหม่ (งบและคำขอเดิมยังอยู่)">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}

const TypesTab = ({ bt, onChanged }: { bt: BudgetTypes; onChanged: () => void }) => {
  const [edit, setEdit] = useState<BudgetTypeRow | 'new' | null>(null)
  const columns: ColumnsType<BudgetTypeRow> = [
    { title: 'ลำดับ', dataIndex: 'sort_order', width: 70, align: 'center' },
    { title: 'รหัสงบ', dataIndex: 'ref_code', width: 100, render: (v: string | null) => v ? <Tag color="purple" style={{ margin: 0 }}>{v}</Tag> : <Text type="secondary">—</Text> },
    { title: 'ชื่อประเภท (ช่องติ๊ก)', dataIndex: 'name', render: (n: string) => <b>{n}</b> },
    { title: 'หน้าชื่องบในบันทึกข้อความ', dataIndex: 'item_label', width: 190, responsive: ['md'], render: (v: string) => v || <Text type="secondary">(ไม่มีคำนำหน้า)</Text> },
    { title: 'รายการงบ', dataIndex: 'budgets', width: 100, align: 'center', render: (n: number) => n ? `${n} รายการ` : <Text type="secondary">—</Text> },
    { title: 'สถานะ', dataIndex: 'is_active', width: 100, align: 'center', render: (v: boolean) => v ? <Tag color="success">เปิดใช้</Tag> : <Tag>ปิดใช้</Tag> },
    { title: '', width: 56, align: 'center', render: (_: unknown, t) => <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEdit(t)} title="แก้ไข" aria-label={`แก้ไข ${t.name}`} /> },
  ]
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text type="secondary" style={{ flex: 1, minWidth: 220 }}>
          ประเภทงบ = ช่องที่ติ๊กในบันทึกข้อความ (เช่น P20 เงินบำรุง · P21 งบผู้ไปราชการผู้บริหาร) · รายการย่อยของแต่ละประเภทตั้งเป็นงบในแท็บ “ตั้งค่างบประมาณ” แยกวงเงินได้
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEdit('new')}>เพิ่มประเภทงบ</Button>
      </div>
      <Table<BudgetTypeRow> size="small" rowKey="code" loading={bt.types === null} columns={columns} dataSource={bt.types ?? []} pagination={false} scroll={{ x: 'max-content' }} />
      {edit && <TypeModal key={edit === 'new' ? 'new' : edit.code} edit={edit} onClose={() => setEdit(null)} onSaved={() => { bt.reload(); onChanged() }} />}
    </>
  )
}

const BudgetContent = () => {
  const { message } = App.useApp()
  const [years, setYears] = useState<number[] | null>(null)
  const [fy, setFy] = useState<number | null>(null)
  const [denied, setDenied] = useState(false)
  const [version, setVersion] = useState(0)
  const bt = useBudgetTypes()
  useEffect(() => {
    travelApi<BudgetList>('budgets')
      .then(r => { setYears(r.years); setFy(r.current_fiscal_year) })
      .catch(e => { if (e instanceof TravelApiError && e.status === 403) setDenied(true); else message.error((e as Error).message) })
  }, [message])
  if (denied) return <Result status="403" title="ไม่มีสิทธิ์ดูงบประมาณ" subTitle="เฉพาะผู้ดูแลระบบและเจ้าหน้าที่งานพัฒนาทรัพยากรบุคคล (HRD)" />
  const yearOpts = [...new Set([...(years ?? []), ...(fy ? [fy, fy + 1] : [])])].sort((a, b) => b - a).map(y => ({ value: y, label: `ปีงบประมาณ ${y}` }))
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{TRAVEL_MENU[6].icon}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>งบประมาณเดินทางไปราชการ</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>ตัวเลขใช้จริงมาจากยอดที่การเงินยืนยันเท่านั้น ประมาณการในคำขอแสดงเป็นยอดรอยืนยัน</Text>
        </div>
        {fy && <Select value={fy} onChange={setFy} options={yearOpts} style={{ width: 180 }} aria-label="ปีงบประมาณ" />}
      </div>
      {fy && (
        <Card styles={{ body: { padding: '12px 16px 16px' } }} style={{ borderRadius: 14 }}>
          <Tabs className="budget-tabs" destroyOnHidden items={[
            { key: 'dash', label: 'Dashboard', icon: <DashboardOutlined />, children: <DashboardTab key={`${fy}-${version}`} fy={fy} bt={bt} /> },
            { key: 'settings', label: 'ตั้งค่างบประมาณ', icon: <SettingOutlined />, children: <SettingsTab key={version} fy={fy} bt={bt} onChanged={() => setVersion(v => v + 1)} /> },
            { key: 'types', label: 'ประเภทงบ', icon: <AppstoreOutlined />, children: <TypesTab bt={bt} onChanged={() => setVersion(v => v + 1)} /> },
          ]} />
          {/* แท็บแบบเม็ดยา: แท็บที่เลือกพื้นครามทึบ ตัวอักษรขาว · แท็บอื่นพื้นครามจาง */}
          <style jsx global>{`
            .budget-tabs > .ant-tabs-nav { margin-bottom: 16px; }
            .budget-tabs > .ant-tabs-nav::before { border-bottom-color: var(--app-border); }
            .budget-tabs > .ant-tabs-nav .ant-tabs-ink-bar { display: none; }
            .budget-tabs > .ant-tabs-nav .ant-tabs-tab {
              padding: 8px 18px; margin: 0 8px 10px 0 !important; border-radius: 10px; font-weight: 500;
              background: ${TRAVEL_COLOR}14; border: 1px solid ${TRAVEL_COLOR}33; transition: background .15s, box-shadow .15s;
            }
            .budget-tabs > .ant-tabs-nav .ant-tabs-tab .ant-tabs-tab-btn { color: ${TRAVEL_COLOR}; }
            .budget-tabs > .ant-tabs-nav .ant-tabs-tab:hover { background: ${TRAVEL_COLOR}26; }
            .budget-tabs > .ant-tabs-nav .ant-tabs-tab.ant-tabs-tab-active {
              background: linear-gradient(135deg, ${TRAVEL_COLOR} 0%, #8b5cf6 100%); border-color: transparent;
              box-shadow: 0 4px 12px ${TRAVEL_COLOR}55;
            }
            .budget-tabs > .ant-tabs-nav .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff; font-weight: 600; }
            .budget-tabs > .ant-tabs-nav .ant-tabs-tab-btn:focus-visible { outline: 2px solid ${TRAVEL_COLOR}; outline-offset: 2px; }
            html[data-theme="dark"] .budget-tabs > .ant-tabs-nav .ant-tabs-tab:not(.ant-tabs-tab-active) .ant-tabs-tab-btn { color: #a5b4fc; }
          `}</style>
        </Card>
      )}
    </>
  )
}

export default function TravelBudgetPage() {
  return (
    <TravelShell current={TRAVEL_MENU[6].title}>
      <BudgetContent />
    </TravelShell>
  )
}
