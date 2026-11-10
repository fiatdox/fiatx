'use client'
// งบประมาณและ Dashboard (เดินทางไปราชการ) — ADMIN / HRD
// ตัวเลขจริง = ยอดที่การเงินยืนยันแล้วเท่านั้น · คงเหลือ = วงเงิน − ยืนยันแล้ว
// "รอยืนยัน" = ประมาณการในคำขอที่การเงินยังไม่ยืนยัน — แสดงประกอบการวางแผน ไม่ตัดงบ
// Dashboard เจาะลึก: กรองตามงบ ประเภทงบ กลุ่มภารกิจ กลุ่มงาน บุคลากร สถานะ — กดแถว/แท่งกราฟเพื่อกรองต่อ
// ยอดรายคน = เบี้ยเลี้ยงของคนนั้น + ค่าใช้จ่ายร่วมของคำขอหารเท่ากัน (รวมทุกคน = ยอดของคำขอ)
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Progress, Radio, Result, Row, Segmented, Select, Space, Spin, Switch, Table, Tabs, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ClearOutlined, EditOutlined, FilterOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons'
import EChart from '@/app/components/EChart'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { TRAVEL_COLOR, TRAVEL_MENU, TravelApiError, TravelShell, travelApi, travelPost } from '../travelShared'
import { BUDGET_TYPES, TH_MONTHS_SHORT, fmtMoney, requestNo, thaiDateTime, tripRange, type BudgetType } from '../travelCalc'
import { TravelHistoryDrawer } from '../TravelHistory'

const { Title, Text } = Typography

interface Budget {
  id: number; fiscal_year: number; budget_type: BudgetType; name: string; amount: number; note: string | null; is_active: boolean
  updated_at: string; updated_by_name: string | null
  spent: number; pending: number; remaining: number; projected: number; requests: number; confirmed: number; travelers: number
}
interface Filters { budget_id: number | null; budget_type: BudgetType | null; mission_id: number | null; major_id: number | null; user_id: number | null; status: 'confirmed' | 'pending' | null }
const NO_FILTER: Filters = { budget_id: null, budget_type: null, mission_id: null, major_id: null, user_id: null, status: null }
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
}
interface Opt { id: number; name: string; mission_id?: number | null }
interface BudgetList { rows: Budget[]; years: number[]; current_fiscal_year: number }
interface LogRow { id: number; action: 'create' | 'update'; before: Partial<Budget> | null; after: Partial<Budget> | null; changed_at: string; changed_by_name: string | null }

// สี: ยืนยันแล้ว = ครามเข้ม · รอยืนยัน = ครามอ่อน (ประมาณการ) · คงเหลือติดลบ = แดง (สถานะ)
const C_SPENT = TRAVEL_COLOR
const C_PENDING = '#a5b4fc'
const C_NEG = '#dc2626'
const CATEGORY_LABEL: Record<string, string> = { allowance: 'เบี้ยเลี้ยง', lodging: 'ที่พัก', transport: 'พาหนะ/น้ำมัน/ทางด่วน', other: 'ลงทะเบียนและอื่น ๆ' }
const short = (n: number) => Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n))
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 1000) / 10 : 0
const swatch = (c: string) => <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: c, marginRight: 6 }} />

/** แถบใช้งบ: ยืนยันแล้ว (เข้ม) + รอยืนยัน (อ่อน) เทียบวงเงิน */
const UsageBar = ({ amount, spent, pending }: { amount: number; spent: number; pending: number }) => (
  <Progress size="small" showInfo={false} percent={Math.min(100, pct(spent + pending, amount))}
    success={{ percent: Math.min(100, pct(spent, amount)), strokeColor: C_SPENT }} strokeColor={C_PENDING} />
)

const Stat = ({ label, value, note, color }: { label: string; value: string; note?: React.ReactNode; color?: string }) => (
  <Card size="small" style={{ borderRadius: 14, height: '100%' }} styles={{ body: { padding: '14px 16px' } }}>
    <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: color ?? 'var(--app-text)', lineHeight: 1.3 }}>{value} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--app-text-3)' }}>บาท</span></div>
    {note && <div style={{ fontSize: 12, color: 'var(--app-text-3)', marginTop: 2 }}>{note}</div>}
  </Card>
)

const DashboardTab = ({ fy }: { fy: number }) => {
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

  if (!d) return <Card loading style={{ borderRadius: 14 }} />
  if (d.budgets.length === 0) return <Empty style={{ padding: 48 }} description={`ยังไม่มีงบประมาณปีงบ ${fy} — เพิ่มที่แท็บ “ตั้งค่างบประมาณ”`} />

  // ภาพรวมงบ: ทั้งปี หรือเฉพาะงบ/ประเภทที่กรอง (คงเหลือเป็นเรื่องของงบทั้งก้อน ไม่ขึ้นกับตัวกรองบุคคล)
  const scope = d.budgets.filter(b => (f.budget_id === null || b.id === f.budget_id) && (f.budget_type === null || b.budget_type === f.budget_type))
  const sum = (k: 'amount' | 'spent' | 'pending' | 'remaining' | 'projected') => scope.reduce((n, b) => n + b[k], 0)
  const scopeLabel = f.budget_id ? scope[0]?.name ?? '' : f.budget_type ? BUDGET_TYPES[f.budget_type] : `${scope.length} งบ`
  const budgetById = new Map(d.budgets.map(b => [b.id, b]))
  const majorOpts = orgs.majors.filter(m => !f.mission_id || m.mission_id === f.mission_id)

  const axis = { axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { opacity: 0.3 } } }
  const stack = (name: string, color: string, data: number[], label?: (i: number) => string) => ({
    name, type: 'bar', stack: 'use', barMaxWidth: 22, data, itemStyle: { color, borderColor: 'transparent', borderWidth: 1 },
    label: label ? { show: true, position: 'top', fontSize: 10, formatter: (p: { dataIndex: number }) => label(p.dataIndex) } : undefined,
  })
  const monthlyOption = {
    backgroundColor: 'transparent',
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 8, top: 20, bottom: 32, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { dataIndex: number }[]) => { const m = months[p[0].dataIndex]; return `${m.label}<br/>ยืนยันแล้ว <b>${fmtMoney(m.spent)}</b> บาท<br/>รอยืนยัน <b>${fmtMoney(m.pending)}</b> บาท<br/>${m.requests} คำขอ` } },
    xAxis: { type: 'category', data: months.map(m => m.label), axisLabel: { fontSize: 10, interval: 0, rotate: 45 } },
    yAxis: { type: 'value', ...axis, axisLabel: { fontSize: 11, formatter: short } },
    series: [stack('ยืนยันแล้ว', C_SPENT, months.map(m => m.spent)), stack('รอยืนยัน (ประมาณการ)', C_PENDING, months.map(m => m.pending), i => { const v = months[i].spent + months[i].pending; return v ? short(v) : '' })],
  }
  const units = d.by_unit
  const unitOption = {
    backgroundColor: 'transparent',
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 40, top: 8, bottom: 32, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { dataIndex: number }[]) => { const u = units[p[0].dataIndex]; return `${u.unit}<br/>ยืนยันแล้ว <b>${fmtMoney(u.spent)}</b> บาท<br/>รอยืนยัน <b>${fmtMoney(u.pending)}</b> บาท<br/>${u.people} คน · ${u.requests} คำขอ<br/><i>กดเพื่อกรองกลุ่มงานนี้</i>` } },
    xAxis: { type: 'value', ...axis, splitNumber: 3, axisLabel: { fontSize: 11, formatter: short } },
    yAxis: { type: 'category', data: units.map(u => u.unit.length > 22 ? u.unit.slice(0, 21) + '…' : u.unit), inverse: true, axisLabel: { fontSize: 11 } },
    series: [
      { name: 'ยืนยันแล้ว', type: 'bar', stack: 'u', barMaxWidth: 16, cursor: 'pointer', data: units.map(u => u.spent), itemStyle: { color: C_SPENT, borderColor: 'transparent', borderWidth: 1 } },
      { name: 'รอยืนยัน (ประมาณการ)', type: 'bar', stack: 'u', barMaxWidth: 16, cursor: 'pointer', data: units.map(u => u.pending), itemStyle: { color: C_PENDING, borderColor: 'transparent', borderWidth: 1, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', fontSize: 10, formatter: (p: { dataIndex: number }) => short(units[p.dataIndex].spent + units[p.dataIndex].pending) } },
    ],
  }
  const catTotal = d.categories.reduce((n, c) => n + c.amount, 0)
  const filterLink = (label: React.ReactNode, onClick: () => void, title: string) => <a onClick={onClick} title={title}>{label}</a>

  const budgetCols: ColumnsType<Dashboard['by_budget'][number]> = [
    { title: 'งบ', dataIndex: 'budget_name', render: (n: string, b) => <>{filterLink(<b>{n}</b>, () => patch({ budget_id: b.budget_id }), 'กรองเฉพาะงบนี้')}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{BUDGET_TYPES[b.budget_type]}</div></> },
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
            options={(Object.keys(BUDGET_TYPES) as BudgetType[]).map(k => ({ value: k, label: BUDGET_TYPES[k] }))} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="ทุกกลุ่มภารกิจ" value={f.mission_id ?? undefined} aria-label="กลุ่มภารกิจ"
            onChange={v => patch({ mission_id: v ?? null, major_id: null })} options={orgs.missions.map(m => ({ value: m.id, label: m.name }))} popupMatchSelectWidth={false} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="ทุกกลุ่มงาน" value={f.major_id ?? undefined} aria-label="กลุ่มงาน"
            onChange={v => patch({ major_id: v ?? null })} options={majorOpts.map(m => ({ value: m.id, label: m.name }))} popupMatchSelectWidth={false} />
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
        <Col xs={12} lg={6}><Stat label="วงเงิน" value={fmtMoney(sum('amount'))} note={`${scopeLabel} · ปีงบ ${fy}`} /></Col>
        <Col xs={12} lg={6}><Stat label="ใช้จริง (การเงินยืนยัน)" value={fmtMoney(sum('spent'))} color={C_SPENT} note={`${pct(sum('spent'), sum('amount'))}% ของวงเงิน`} /></Col>
        <Col xs={12} lg={6}><Stat label="คงเหลือ" value={fmtMoney(sum('remaining'))} color={sum('remaining') < 0 ? C_NEG : undefined} note="วงเงิน − ยอดที่การเงินยืนยัน" /></Col>
        <Col xs={12} lg={6}><Stat label="รอการเงินยืนยัน" value={fmtMoney(sum('pending'))} note={<>หากเบิกตามประมาณการเหลือ <b style={{ color: sum('projected') < 0 ? C_NEG : undefined }}>{fmtMoney(sum('projected'))}</b></>} /></Col>
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
          <Card size="small" title="การใช้งบรายเดือน" style={{ borderRadius: 14, height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>ตามเดือนที่ออกเดินทาง ปีงบ {fy} (ต.ค.–ก.ย.)</Text>
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

      <Card size="small" title={`ใช้กับใคร (${d.by_person.length} คน)`} extra={<Text type="secondary" style={{ fontSize: 12 }}>ยอดรายคน = เบี้ยเลี้ยงของคนนั้น + ค่าใช้จ่ายร่วมหารเท่ากัน</Text>} style={{ borderRadius: 14, marginBottom: 12 }}>
        <Table size="small" rowKey="user_id" dataSource={d.by_person} columns={personCols} scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการตามตัวกรอง" /> }} />
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={9}>
          <Card size="small" title="แยกหมวดค่าใช้จ่าย (ประมาณการ)" style={{ borderRadius: 14, height: '100%' }}>
            {catTotal === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการ" /> : d.categories.map(c => (
              <div key={c.key} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{CATEGORY_LABEL[c.key]}</span><span>{fmtMoney(c.amount)} บาท · {pct(c.amount, catTotal)}%</span></div>
                <Progress size="small" showInfo={false} percent={pct(c.amount, catTotal)} strokeColor={C_SPENT} />
              </div>
            ))}
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
        .dash-filters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        @media (max-width: 991px) { .dash-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 575px) { .dash-filters { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
    </Spin>
  )
}

// ── ตั้งค่างบประมาณ ──
const BudgetModal = ({ edit, fy, onClose, onSaved }: { edit: Budget | 'new'; fy: number; onClose: () => void; onSaved: () => void }) => {
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
  return (
    <Modal open title={edit === 'new' ? 'เพิ่มงบประมาณ' : `แก้ไข${edit.name}`} onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} width={560}>
      {used && <Alert type="info" showIcon style={{ marginBottom: 12 }} title={`มีคำขอใช้งบนี้ ${edit.requests} รายการ — เปลี่ยนประเภทหรือปีงบไม่ได้`} description={`ลดวงเงินได้ไม่ต่ำกว่ายอดที่การเงินยืนยันแล้ว ${fmtMoney(edit.spent)} บาท`} />}
      <Form form={form} layout="vertical"
        initialValues={edit === 'new' ? { fiscal_year: fy, budget_type: 'hospital', is_active: true } : { fiscal_year: edit.fiscal_year, budget_type: edit.budget_type, name: edit.name, amount: edit.amount, note: edit.note ?? undefined, is_active: edit.is_active }}>
        <Row gutter={12}>
          <Col xs={10}><Form.Item name="fiscal_year" label="ปีงบประมาณ (พ.ศ.)" rules={[{ required: true, message: 'ระบุปีงบ' }]}><InputNumber min={2500} max={2700} precision={0} style={{ width: '100%' }} disabled={used} /></Form.Item></Col>
          <Col xs={14}><Form.Item name="is_active" label="เปิดให้เลือกในคำขอ" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>
        <Form.Item name="budget_type" label="ประเภท (ช่องที่ติ๊กในบันทึกข้อความ)" rules={[{ required: true }]}>
          <Radio.Group disabled={used} options={(Object.keys(BUDGET_TYPES) as BudgetType[]).map(k => ({ value: k, label: BUDGET_TYPES[k] }))} />
        </Form.Item>
        <Form.Item name="name" label="ชื่องบ" extra="ประเภทโครงการ ชื่อนี้จะพิมพ์ในบรรทัด “ชื่อโครงการ” ของบันทึกข้อความ" rules={[{ required: true, whitespace: true, message: 'ระบุชื่องบ' }, { max: 200 }]}>
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

const SettingsTab = ({ fy, onChanged }: { fy: number; onChanged: () => void }) => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<Budget[] | null>(null)
  const [edit, setEdit] = useState<Budget | 'new' | null>(null)
  const load = useCallback(async () => {
    try { setRows((await travelApi<BudgetList>(`budgets?fiscal_year=${fy}`)).rows) } catch (e) { message.error((e as Error).message) }
  }, [fy, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  const columns: ColumnsType<Budget> = [
    { title: 'ประเภท', dataIndex: 'budget_type', width: 150, render: (v: BudgetType) => BUDGET_TYPES[v] },
    { title: 'ชื่องบ', dataIndex: 'name', render: (n: string, b) => <><div style={{ fontWeight: 500 }}>{n}</div>{b.note && <Text type="secondary" style={{ fontSize: 12 }}>{b.note}</Text>}</> },
    { title: 'วงเงิน (บาท)', dataIndex: 'amount', align: 'right', width: 130, render: fmtMoney },
    { title: 'ใช้จริง', dataIndex: 'spent', align: 'right', width: 120, responsive: ['md'], render: fmtMoney },
    { title: 'คงเหลือ', dataIndex: 'remaining', align: 'right', width: 120, render: (v: number) => <span style={{ color: v < 0 ? C_NEG : undefined, fontWeight: 600 }}>{fmtMoney(v)}</span> },
    { title: 'สถานะ', dataIndex: 'is_active', width: 100, align: 'center', render: (v: boolean) => v ? <Tag color="success">เปิดใช้</Tag> : <Tag>ปิดใช้งาน</Tag> },
    { title: 'แก้ล่าสุด', dataIndex: 'updated_at', width: 170, responsive: ['xl'], render: (v: string, b) => <><div style={{ fontSize: 13 }}>{b.updated_by_name ?? '—'}</div><Text type="secondary" style={{ fontSize: 12 }}>{thaiDateTime(v)}</Text></> },
    { title: '', width: 56, align: 'center', render: (_: unknown, b) => <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEdit(b)} title="แก้ไข/ประวัติ" aria-label={`แก้ไข ${b.name}`} /> },
  ]
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text type="secondary" style={{ flex: 1, minWidth: 220 }}>ตั้งงบที่ใช้เดินทางไปราชการของปีงบ {fy} ผู้ขอเลือกงบนี้ในแบบฟอร์ม · ตัดงบเมื่อการเงินยืนยันยอด</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEdit('new')}>เพิ่มงบประมาณ</Button>
      </div>
      <Table<Budget> size="small" rowKey="id" loading={rows === null} columns={columns} dataSource={rows ?? []} pagination={false} scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description={`ยังไม่มีงบปีงบ ${fy}`} /> }} />
      {edit && <BudgetModal key={edit === 'new' ? 'new' : edit.id} edit={edit} fy={fy} onClose={() => setEdit(null)} onSaved={() => { load(); onChanged() }} />}
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}><HistoryOutlined /> ทุกการเพิ่ม/แก้ไขเก็บประวัติ ดูได้ในหน้าต่างแก้ไขของแต่ละงบ</Text>
    </>
  )
}

const BudgetContent = () => {
  const { message } = App.useApp()
  const [years, setYears] = useState<number[] | null>(null)
  const [fy, setFy] = useState<number | null>(null)
  const [denied, setDenied] = useState(false)
  const [version, setVersion] = useState(0)
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
        <Card styles={{ body: { padding: '4px 16px 16px' } }} style={{ borderRadius: 14 }}>
          <Tabs destroyOnHidden items={[
            { key: 'dash', label: 'Dashboard', children: <DashboardTab key={`${fy}-${version}`} fy={fy} /> },
            { key: 'settings', label: 'ตั้งค่างบประมาณ', children: <SettingsTab fy={fy} onChanged={() => setVersion(v => v + 1)} /> },
          ]} />
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
