'use client'
// แท็บ Dashboard ของบันทึกกิจกรรม IT — วิเคราะห์เชิงลึกจากบันทึกทั้งปีงบที่หน้าโหลดไว้แล้ว
// ตัวกรองแถวบนคุมทุกส่วนของแท็บ และกดที่กราฟ/ตาราง/ข้อค้นพบเพื่อกรองต่อได้ ตัวเลขทุกส่วนคิดจากชุดเดียวกัน
// ส่วนคำนวณอยู่ที่ analytics.ts, option ของกราฟอยู่ที่ charts.ts
import React, { useEffect, useMemo, useState } from 'react'
import { Card, Row, Col, Select, Segmented, Button, Table, Tag, Progress, Typography, Tooltip, Empty } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  FileTextOutlined, ClockCircleOutlined, ThunderboltOutlined, PhoneOutlined, FireOutlined, HourglassOutlined,
  InfoCircleOutlined, WarningOutlined, CheckCircleOutlined, RightOutlined, FilterOutlined, ToolOutlined,
  AuditOutlined, TeamOutlined, EyeOutlined,
} from '@ant-design/icons'
import { StatCard } from '@/app/components/StatCard'
import ChartCard from '@/app/components/ChartCard'
import { PALETTES, barHeight } from '@/app/lib/chartKit'
import type { ActivityLog, MasterData, Nature } from '../types'
import * as A from './analytics'
import { heatOption, hrsText, monthlyOption, natureBarOption, sourceOption, typeOption } from './charts'

const { Text } = Typography

const fmt = (n: number, d = 0) => n.toLocaleString('th-TH', { maximumFractionDigits: d, minimumFractionDigits: d })
const hrs = (min: number) => fmt(min / 60, 1)
const thaiDate = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

const STATUS_TAG: Record<string, string> = { in_progress: 'processing', waiting: 'warning', pending: 'error', done: 'success' }

/** ตัวเลขเทียบเดือนก่อน: ▲/▼ พร้อมบอกว่าดีหรือแย่ (higherIsBad = ยิ่งสูงยิ่งแย่) */
const Delta = ({ now, prev, unit = '', higherIsBad = false, digits = 0 }: {
  now: number; prev: number | null; unit?: string; higherIsBad?: boolean; digits?: number
}) => {
  if (prev == null) return null
  const d = now - prev
  if (Math.abs(d) < 10 ** -digits / 2) return <Text type="secondary" style={{ fontSize: 12 }}> · เท่าเดือนก่อน</Text>
  const bad = d > 0 === higherIsBad
  return (
    <Text type={bad ? 'danger' : 'success'} style={{ fontSize: 12 }}>
      {' · '}{d > 0 ? '▲' : '▼'} {fmt(Math.abs(d), digits)}{unit} จากเดือนก่อน
    </Text>
  )
}

export default function DashboardTab({ logs, master, fy, fyOptions, onFyChange, loading, isDark, onOpenLog }: {
  logs: ActivityLog[]
  master: MasterData | null
  fy: number
  fyOptions: { label: string; value: number }[]
  onFyChange: (fy: number) => void
  loading: boolean
  isDark: boolean
  onOpenLog: (log: ActivityLog) => void
}) {
  const P = PALETTES[isDark ? 'dark' : 'light']
  const chartTheme = isDark ? 'dark' : 'light'
  const [filter, setFilter] = useState<A.DashFilter>(A.NO_FILTER)
  const patch = (p: Partial<A.DashFilter>) => setFilter(f => ({ ...f, ...p }))

  const all = useMemo(() => A.prepare(logs), [logs])
  const recs = useMemo(() => A.applyFilter(all, filter), [all, filter])
  const k = useMemo(() => A.kpis(recs), [recs])

  // ── เทียบเดือนก่อน (เมื่อเลือกเดือน) — ต.ค. ต้องดึงเดือน ก.ย. จากปีงบก่อนมาเพิ่ม ──
  const prevYm = filter.month ? A.prevMonth(filter.month) : null
  const prevFy = prevYm ? A.fiscalYearOf(A.parseYm(prevYm)) : null
  const [otherFy, setOtherFy] = useState<{ fy: number; recs: A.Rec[] } | null>(null)
  useEffect(() => {
    if (prevFy == null || prevFy === fy || otherFy?.fy === prevFy) return
    let alive = true
    fetch(`/api/v1/it/activity/logs?fiscal_year=${prevFy}&limit=20000`)
      .then(r => r.json())
      .then(j => { if (alive) setOtherFy({ fy: prevFy, recs: A.prepare(j?.success ? j.data ?? [] : []) }) })
      .catch(() => { if (alive) setOtherFy({ fy: prevFy, recs: [] }) })
    return () => { alive = false }
  }, [prevFy, fy, otherFy?.fy])
  const prev = useMemo(() => {
    if (!prevYm || prevFy == null) return null
    const src = prevFy === fy ? all : otherFy?.fy === prevFy ? otherFy.recs : null
    if (!src) return null
    const p = A.kpis(A.applyFilter(src, { ...filter, month: prevYm }))
    return p.n > 0 ? p : null
  }, [prevYm, prevFy, fy, all, otherFy, filter])

  const finds = useMemo(() => A.findings(recs, k, prev, filter), [recs, k, prev, filter])
  const months = useMemo(() => A.monthly(A.applyFilter(all, { ...filter, month: null }), fy), [all, filter, fy])
  const systems = useMemo(() => A.bySystem(recs), [recs])
  const types = useMemo(() => A.byType(recs), [recs])
  const staff = useMemo(() => A.byStaff(recs), [recs])
  const heat = useMemo(() => A.heat(recs), [recs])
  const sources = useMemo(() => A.bySource(recs), [recs])
  const open = useMemo(() => A.openTasks(recs), [recs])
  const assets = useMemo(() => A.repeatAssets(recs), [recs])
  const record = useMemo(() => A.recording(recs), [recs])

  // ── ตัวเลือกของตัวกรอง (นับจากปีงบที่โหลด ไม่ขึ้นกับตัวกรองตัวเอง) ──
  const monthOptions = useMemo(() => {
    const n = new Map<string, number>()
    all.forEach(r => n.set(r.ym, (n.get(r.ym) ?? 0) + 1))
    return A.fyMonths(fy).filter(m => n.has(m)).map(m => ({ value: m, label: `${A.monthLabel(m, true)} (${fmt(n.get(m)!)})` }))
  }, [all, fy])
  const staffOptions = useMemo(() => A.byStaff(all).map(s => ({ value: s.id, label: `${s.name} (${fmt(s.n)})` })), [all])
  const systemOptions = useMemo(() => A.bySystem(all).map(s => ({ value: s.key, label: `${s.name} (${fmt(s.n)})` })), [all])
  const filtered = filter.month != null || filter.staff != null || filter.system != null || filter.nature != null

  // กราฟคู่ในแถวเดียวกันสูงเท่ากัน การ์ดจะได้ไม่มีที่ว่างค้างใต้กราฟ
  const trendHeight = Math.max(320, barHeight(types.length))
  const heatHeight = Math.max(heat.days.length * 44 + 110, barHeight(sources.length))
  const periodLabel = filter.month ? A.monthLabel(filter.month, true) : `ปีงบ ${fy}`
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const runAction = (a?: A.FindingAction) => {
    if (!a) return
    if (a.kind === 'filter') patch(a.patch)
    else scrollTo(a.target)
  }

  const natureCols = (unitLabel: string): ColumnsType<{ key: string } & Record<string, React.ReactNode>> => [
    { title: unitLabel, dataIndex: 'name', fixed: 'left' },
    ...A.NATURES.map(n => ({ title: A.NATURE_LABEL[n], dataIndex: n, align: 'right' as const })),
    { title: 'รวม (ชม.)', dataIndex: 'total', align: 'right' },
    { title: 'งาน', dataIndex: 'n', align: 'right' },
  ]
  const natureRows = (rows: A.NatureRow[]) => rows.map(r => ({
    key: r.key, name: r.name, ...Object.fromEntries(A.NATURES.map(n => [n, hrs(r.nature[n])])), total: hrs(r.minutes), n: fmt(r.n),
  }))

  if (!master && !logs.length) return null

  // ── ตารางเจ้าหน้าที่ ──
  const staffColumns: ColumnsType<A.StaffRow> = [
    {
      title: 'เจ้าหน้าที่', dataIndex: 'name', fixed: 'left', width: 200,
      render: (v: string, r) => filter.staff == null
        ? <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => patch({ staff: r.id })}>{v}</Button>
        : v,
    },
    { title: 'งาน', dataIndex: 'n', align: 'right', width: 80, sorter: (a, b) => a.n - b.n, render: (v: number) => fmt(v) },
    { title: 'ชั่วโมง', dataIndex: 'minutes', align: 'right', width: 90, sorter: (a, b) => a.minutes - b.minutes, defaultSortOrder: 'descend', render: (v: number) => hrs(v) },
    { title: 'วันที่บันทึก', dataIndex: 'days', align: 'right', width: 100, sorter: (a, b) => a.days - b.days },
    {
      title: <Tooltip title="ชั่วโมงที่บันทึกเฉลี่ยต่อวันที่มีบันทึก — ต่ำมากอาจแปลว่าบันทึกไม่ครบ">ชม./วัน</Tooltip>,
      dataIndex: 'avgDayMin', align: 'right', width: 90, sorter: (a, b) => a.avgDayMin - b.avgDayMin, render: (v: number) => hrs(v),
    },
    {
      title: 'สัดส่วนลักษณะงาน', key: 'mix', width: 220,
      render: (_: unknown, r) => (
        <Tooltip title={A.NATURES.map(n => `${A.NATURE_LABEL[n]} ${fmt((r.nature[n] * 100) / (r.minutes || 1))}%`).join(' · ')}>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: P.grid }} aria-label="สัดส่วนเชิงรับ/เชิงรุก/งานกลาง">
            {A.NATURES.map(n => (
              <div key={n} style={{ width: `${(r.nature[n] * 100) / (r.minutes || 1)}%`, background: P.nature[n], borderRight: `1px solid ${P.surface}` }} />
            ))}
          </div>
        </Tooltip>
      ),
    },
    { title: 'เชิงรับ', dataIndex: 'reactivePct', align: 'right', width: 80, sorter: (a, b) => a.reactivePct - b.reactivePct, render: (v: number) => `${fmt(v)}%` },
    { title: 'ด่วน', dataIndex: 'urgent', align: 'right', width: 70, sorter: (a, b) => a.urgent - b.urgent },
    { title: 'ค้าง', dataIndex: 'open', align: 'right', width: 70, sorter: (a, b) => a.open - b.open, render: (v: number) => (v ? <Text type="warning">{v}</Text> : <Text type="secondary">0</Text>) },
    { title: 'งานหลัก', dataIndex: 'topType', width: 160 },
  ]

  // ── ตารางงานค้าง ──
  const openColumns: ColumnsType<A.Rec & { age: number }> = [
    {
      title: 'ค้าง', dataIndex: 'age', width: 90, sorter: (a, b) => a.age - b.age, defaultSortOrder: 'descend',
      render: (v: number) => <Tag color={v > 30 ? 'error' : v > 7 ? 'warning' : 'default'}>{fmt(v)} วัน</Tag>,
    },
    { title: 'วันที่', dataIndex: 'ymd', width: 100, render: (v: string) => thaiDate(v) },
    { title: 'เจ้าหน้าที่', dataIndex: 'staff_name', width: 160 },
    { title: 'ระบบ', dataIndex: 'system_name', width: 140 },
    { title: 'รายละเอียด', dataIndex: 'detail', ellipsis: { showTitle: true } },
    { title: 'สถานะ', dataIndex: 'status_name', width: 120, render: (v: string, r) => <Tag color={STATUS_TAG[r.status_code]}>{v}</Tag> },
    {
      title: '', key: 'go', width: 70, align: 'center', fixed: 'right',
      render: (_: unknown, r) => <Button size="small" icon={<EyeOutlined />} aria-label={`เปิดงาน ${r.detail}`} onClick={() => onOpenLog(r)} />,
    },
  ]

  const assetColumns: ColumnsType<A.AssetRow> = [
    { title: 'รหัสครุภัณฑ์', dataIndex: 'key', width: 160, render: (v: string) => <span className="font-mono">{v}</span> },
    { title: 'ครั้ง', dataIndex: 'n', align: 'right', width: 70 },
    { title: 'ชั่วโมง', dataIndex: 'minutes', align: 'right', width: 80, render: (v: number) => hrs(v) },
    { title: 'ระบบ', dataIndex: 'systems', render: (v: string[]) => v.join(', ') },
    { title: 'ล่าสุด', dataIndex: 'last', width: 100, render: (v: string) => thaiDate(v) },
  ]

  const kpiCards = [
    {
      label: 'รายการบันทึก', value: fmt(k.n), suffix: 'งาน', icon: <FileTextOutlined />, accent: 'purple' as const,
      footer: <><Text type="secondary" style={{ fontSize: 12 }}>{fmt(k.days)} วัน · {fmt(k.staffCount)} คน</Text><Delta now={k.n} prev={prev?.n ?? null} /></>,
    },
    {
      label: 'ชั่วโมงงาน', value: hrs(k.minutes), suffix: 'ชม.', icon: <ClockCircleOutlined />, accent: 'emerald' as const,
      footer: <Text type="secondary" style={{ fontSize: 12 }}>เฉลี่ย {hrs(k.avgStaffDayMin)} ชม./คน/วัน</Text>,
    },
    {
      label: 'งานเชิงรับ', value: fmt(k.reactivePct), suffix: '% ของเวลา', icon: <ToolOutlined />, accent: 'amber' as const,
      footer: <><Text type="secondary" style={{ fontSize: 12 }}>{hrs(k.nature.reactive)} ชม.</Text><Delta now={k.reactivePct} prev={prev?.reactivePct ?? null} unit=" จุด" higherIsBad /></>,
    },
    {
      label: 'งานไม่ได้วางแผน', value: fmt(k.unplannedPct), suffix: '%', icon: <PhoneOutlined />, accent: 'rose' as const,
      footer: <><Text type="secondary" style={{ fontSize: 12 }}>{fmt(k.unplanned)} งาน (โทร/walk-in/อื่น ๆ)</Text><Delta now={k.unplannedPct} prev={prev?.unplannedPct ?? null} unit=" จุด" higherIsBad /></>,
    },
    {
      label: 'งานด่วน', value: fmt(k.urgent), suffix: 'งาน', icon: <FireOutlined />, accent: 'indigo' as const,
      footer: <Text type="secondary" style={{ fontSize: 12 }}>{fmt(k.urgentPct, 1)}% · เฉลี่ย {fmt(k.urgentAvgMin)} นาที/งาน</Text>,
    },
    {
      label: 'งานยังไม่ปิด', value: fmt(k.open), suffix: 'งาน', icon: <HourglassOutlined />, accent: 'slate' as const,
      footer: <Text type="secondary" style={{ fontSize: 12 }}>{k.open ? `ค้างนานสุด ${fmt(k.oldestOpenDays)} วัน` : 'ปิดครบทุกงาน'}</Text>,
      onClick: k.open ? () => scrollTo('act-open') : undefined,
    },
  ]

  return (
    <div className="space-y-4" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
      {/* ── ตัวกรอง (คุมทุกส่วนของแท็บ) ── */}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ปีงบประมาณ</Text>
            <Select value={fy} options={fyOptions} style={{ width: 130 }} onChange={v => { setFilter(f => ({ ...f, month: null })); onFyChange(v) }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>เดือน</Text>
            <Select allowClear placeholder="ทั้งปีงบ" value={filter.month ?? undefined} options={monthOptions} style={{ width: 170 }}
              onChange={v => patch({ month: v ?? null })} notFoundContent="ไม่มีบันทึกในปีงบนี้" />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>เจ้าหน้าที่</Text>
            <Select allowClear placeholder="ทั้งทีม" value={filter.staff ?? undefined} options={staffOptions} style={{ width: 210 }}
              showSearch={{ optionFilterProp: 'label' }} onChange={v => patch({ staff: v ?? null })} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ระบบ</Text>
            <Select allowClear placeholder="ทุกระบบ" value={filter.system ?? undefined} options={systemOptions} style={{ width: 210 }}
              showSearch={{ optionFilterProp: 'label' }} onChange={v => patch({ system: v ?? null })} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ลักษณะงาน</Text>
            <Segmented
              value={filter.nature ?? 'all'}
              onChange={v => patch({ nature: v === 'all' ? null : (v as Nature) })}
              options={[{ label: 'ทั้งหมด', value: 'all' }, ...A.NATURES.map(n => ({ label: A.NATURE_LABEL[n], value: n }))]}
            />
          </div>
          {filtered && <Button type="link" icon={<FilterOutlined />} onClick={() => setFilter(A.NO_FILTER)}>ล้างตัวกรอง</Button>}
        </div>
        {!master && <Text type="secondary" style={{ fontSize: 12 }}>กำลังโหลดข้อมูลตั้งต้น…</Text>}
      </Card>

      {/* ── ตัวเลขสรุป ── */}
      <Row gutter={[16, 16]}>
        {kpiCards.map(c => (
          <Col key={c.label} xs={12} md={8} xl={4}>
            <StatCard label={c.label} value={c.value} suffix={c.suffix} icon={c.icon} accent={c.accent} isDark={isDark} footer={c.footer} onClick={c.onClick} />
          </Col>
        ))}
      </Row>

      {recs.length === 0 ? (
        <Card style={{ borderRadius: 14 }}><Empty description={`ไม่มีบันทึกกิจกรรมใน${periodLabel}ตามตัวกรองที่เลือก`} /></Card>
      ) : (
        <>
          {/* ── ข้อค้นพบสำคัญ (แบบย่อ) ── */}
          {finds.length > 0 && (
            <Card size="small" style={{ borderRadius: 14 }}
              title={<span><InfoCircleOutlined className="mr-2" />ข้อค้นพบสำคัญ · {periodLabel}</span>}
              extra={prev && <Text type="secondary" style={{ fontSize: 12 }}>เทียบกับ {A.monthLabel(prevYm!, true)}</Text>}>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {finds.map(f => {
                  const icon = f.tone === 'warn'
                    ? <WarningOutlined style={{ color: '#d97706', fontSize: 15 }} aria-label="ควรติดตาม" />
                    : f.tone === 'good'
                      ? <CheckCircleOutlined style={{ color: P.nature.proactive, fontSize: 15 }} aria-label="ดี" />
                      : <InfoCircleOutlined style={{ color: P.single, fontSize: 15 }} aria-label="ข้อมูล" />
                  const inner = (
                    <>
                      {icon}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="truncate" style={{ fontWeight: 600, fontSize: 13 }}>{f.title}</div>
                        <div className="truncate" style={{ fontSize: 12, color: 'var(--app-text-2)' }} title={f.detail}>{f.detail}</div>
                      </div>
                      {f.action && <RightOutlined style={{ fontSize: 11, color: 'var(--app-text-3)' }} />}
                    </>
                  )
                  const cls = 'flex items-center gap-2 rounded-lg px-3 py-2 w-full'
                  const box = { border: '1px solid var(--app-border-strong)', background: 'transparent', color: 'inherit' }
                  return f.action
                    ? (
                      <button key={f.key} type="button" onClick={() => runAction(f.action)} style={box}
                        className={`${cls} cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5`}
                        aria-label={`${f.title} — ${f.detail}`}>
                        {inner}
                      </button>
                    )
                    : <div key={f.key} className={cls} style={box}>{inner}</div>
                })}
              </div>
            </Card>
          )}

          {/* ── แนวโน้ม + ประเภทงาน ── */}
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={15}>
              <ChartCard
                title={`ชั่วโมงงานรายเดือน ปีงบ ${fy} (ชม.)`} theme={chartTheme} height={trendHeight}
                note={<Text type="secondary" style={{ fontSize: 12 }}>คลิกแท่งเพื่อดูเฉพาะเดือนนั้น{filter.month && ' · แสดงทุกเดือนเพื่อเทียบ'}</Text>}
                option={monthlyOption(months, P)}
                onChartClick={p => { const m = months[p.dataIndex]; if (m?.n) patch({ month: m.key }) }}
                columns={natureCols('เดือน')} rows={natureRows(months.filter(m => m.n > 0))}
              />
            </Col>
            <Col xs={24} xl={9}>
              <ChartCard
                title="เวลาไปกับงานประเภทไหน" theme={chartTheme} height={trendHeight}
                option={typeOption(types, P)}
                columns={[
                  { title: 'ประเภท', dataIndex: 'name' }, { title: 'ลักษณะ', dataIndex: 'kind' },
                  { title: 'ชม.', dataIndex: 'h', align: 'right' }, { title: 'งาน', dataIndex: 'n', align: 'right' },
                  { title: 'เฉลี่ย/งาน', dataIndex: 'avg', align: 'right' },
                ]}
                rows={types.map(t => ({ key: t.key, name: t.name, kind: A.NATURE_LABEL[t.kind], h: hrs(t.minutes), n: fmt(t.n), avg: `${fmt(t.minutes / t.n)} นาที` }))}
              />
            </Col>
          </Row>

          {/* ── ระบบ + เจ้าหน้าที่ ── */}
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <ChartCard
                title="ชั่วโมงงานตามระบบ แยกลักษณะงาน" theme={chartTheme} height={barHeight(systems.length, 280)}
                note={filter.system == null && <Text type="secondary" style={{ fontSize: 12 }}>ส่วนสีส้มคือเวลาแก้ปัญหา — คลิกแท่งเพื่อดูเฉพาะระบบนั้น</Text>}
                option={natureBarOption(systems, P)}
                onChartClick={p => { const s = systems[p.dataIndex]; if (s && filter.system == null) patch({ system: s.key }) }}
                columns={natureCols('ระบบ')} rows={natureRows(systems)}
              />
            </Col>
            <Col xs={24} xl={12}>
              <ChartCard
                title="ภาระงานรายบุคคล แยกลักษณะงาน" theme={chartTheme} height={barHeight(staff.length, 280)}
                note={filter.staff == null && <Text type="secondary" style={{ fontSize: 12 }}>คลิกแท่งเพื่อดูเฉพาะคนนั้น</Text>}
                option={natureBarOption(staff, P)}
                onChartClick={p => { const s = staff[p.dataIndex]; if (s && filter.staff == null) patch({ staff: s.id }) }}
                columns={natureCols('เจ้าหน้าที่')} rows={natureRows(staff)}
              />
            </Col>
          </Row>

          {/* ── ช่วงเวลา + ที่มาของงาน ── */}
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={15}>
              <ChartCard
                title="ช่วงเวลาที่งานหนาแน่น (ชั่วโมงงาน)" theme={chartTheme} height={heatHeight}
                note={<Text type="secondary" style={{ fontSize: 12 }}>รวมชั่วโมงงานที่ทับแต่ละช่วงชั่วโมง ใช้วางเวรและเลือกช่วงทำงานเชิงรุก</Text>}
                option={heatOption(heat, P, isDark)}
                columns={[
                  { title: 'วัน', dataIndex: 'day', fixed: 'left' },
                  ...heat.hours.map(h => ({ title: `${String(h).padStart(2, '0')}:00`, dataIndex: `h${h}`, align: 'right' as const })),
                ]}
                rows={heat.days.map((d, di) => ({
                  key: String(d), day: A.DOW_LABEL[d],
                  ...Object.fromEntries(heat.hours.map((h, hi) => [`h${h}`, hrs(heat.minutes[di][hi])])),
                }))}
              />
            </Col>
            <Col xs={24} xl={9}>
              <ChartCard
                title="งานมาจากไหน" theme={chartTheme} height={heatHeight}
                option={sourceOption(sources, P)}
                columns={[
                  { title: 'ที่มา', dataIndex: 'name' }, { title: 'ประเภท', dataIndex: 'kind' },
                  { title: 'งาน', dataIndex: 'n', align: 'right' }, { title: 'สัดส่วน', dataIndex: 'pct', align: 'right' },
                ]}
                rows={sources.map(s => ({ key: s.key, name: s.name, kind: s.planned ? 'วางแผน' : 'ขัดจังหวะ', n: fmt(s.n), pct: `${fmt((s.n * 100) / k.n, 1)}%` }))}
              />
            </Col>
          </Row>

          {/* ── รายบุคคล ── */}
          <Card style={{ borderRadius: 14 }} title={<span><TeamOutlined className="mr-2" />สรุปรายบุคคล · {periodLabel}</span>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>ชั่วโมงคือเวลาที่บันทึก ไม่ใช่เวลาทำงานทั้งหมด</Text>}>
            <Table<A.StaffRow> rowKey="key" size="small" columns={staffColumns} dataSource={staff} pagination={false} scroll={{ x: 1150 }} />
          </Card>

          {/* ── งานค้าง ── */}
          <Card id="act-open" style={{ borderRadius: 14, scrollMarginTop: 80 }}
            title={<span><HourglassOutlined className="mr-2" />งานที่ยังไม่ปิด ({fmt(open.length)})</span>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>เรียงค้างนานก่อน · กดปุ่มเพื่อเปิดดู/ปิดงาน</Text>}>
            <Table
              rowKey="log_id" size="small" columns={openColumns} dataSource={open} scroll={{ x: 1000 }}
              pagination={open.length > 8 ? { pageSize: 8 } : false}
              locale={{ emptyText: 'ไม่มีงานค้างในขอบเขตนี้' }}
            />
          </Card>

          {/* ── ครุภัณฑ์ซ่อมซ้ำ + ความครบของการบันทึก ── */}
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <Card id="act-assets" style={{ borderRadius: 14, height: '100%', scrollMarginTop: 80 }}
                title={<span><ThunderboltOutlined className="mr-2" />ครุภัณฑ์ที่ซ่อมซ้ำ ({fmt(assets.length)})</span>}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>งานเชิงรับ ≥ 2 ครั้ง · กดแถวเพื่อดูประวัติ</Text>}>
                <Table<A.AssetRow>
                  rowKey="key" size="small" columns={assetColumns} dataSource={assets}
                  pagination={assets.length > 8 ? { pageSize: 8 } : false}
                  locale={{ emptyText: 'ไม่พบครุภัณฑ์ที่ซ่อมซ้ำ (หรือยังไม่ได้ระบุรหัสครุภัณฑ์ในงานซ่อม)' }}
                  expandable={{
                    expandRowByClick: true,
                    expandedRowRender: a => (
                      <div className="flex flex-col gap-1">
                        {a.logs.map(l => (
                          <div key={l.log_id} className="flex gap-3 text-xs">
                            <span className="shrink-0" style={{ width: 70, color: 'var(--app-text-2)' }}>{thaiDate(l.ymd)}</span>
                            <span className="shrink-0" style={{ width: 130 }}>{l.staff_name}</span>
                            <span className="flex-1">{l.detail}{l.outcome && <span style={{ color: 'var(--app-text-2)' }}> → {l.outcome}</span>}</span>
                            <span className="shrink-0" style={{ color: 'var(--app-text-2)' }}>{hrsText(l.minutes_used)}</span>
                          </div>
                        ))}
                      </div>
                    ),
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card id="act-record" style={{ borderRadius: 14, height: '100%', scrollMarginTop: 80 }}
                title={<span><AuditOutlined className="mr-2" />ความครบของการบันทึก</span>}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>หลักฐานประกอบ HAIT</Text>}>
                {record.map(r => (
                  <div key={r.key} className="mb-3">
                    <div className="flex justify-between">
                      <Text>{r.label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{fmt(r.have)} / {fmt(r.total)}</Text>
                    </div>
                    {/* ปัดลง — 99.6% ต้องไม่ขึ้นครบ 100% */}
                    <Progress percent={Math.floor(r.pct)} size="small" strokeColor={r.pct < 50 ? P.nature.reactive : P.single} />
                    {r.note && <Text type="secondary" style={{ fontSize: 12 }}>{r.note}</Text>}
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}
