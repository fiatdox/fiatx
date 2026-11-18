'use client'
// Dashboard ผู้บริหาร — ทะเบียนความเสี่ยง (Risk Register) + ทะเบียนทรัพย์สินงาน IT
// สำหรับหัวหน้ากลุ่มภารกิจดิจิทัล (CHIEF_MISSION_IT) หัวหน้ากลุ่มงาน IT (CHIEF_GROUP_IT) เจ้าหน้าที่ IT (IT_STAFF) และ ผอ./รักษาการ ผอ. (+ ADMIN) — อ่านอย่างเดียว ตัวเลขสรุปจาก GET /api/v1/it/executive-dashboard
// ผอ. ไม่ใช่ role จึงไม่กั้นที่ proxy.ts — backend ตรวจสิทธิ์ ตอบ 403 แล้วหน้านี้แสดงไม่มีสิทธิ์
import React, { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Col, ConfigProvider, Empty, Result, Row, Segmented, Space, Table, Tag, Tooltip, Typography, theme } from 'antd'
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons'
import { FaChartLine, FaClipboardList, FaExclamationTriangle, FaHourglassEnd, FaMicrochip, FaShieldAlt, FaTools, FaWarehouse } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import EChart from '@/app/components/EChart'
import { StatCard } from '@/app/components/StatCard'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { PALETTES, barHeight, base, categoryAxis, gap, num, valueAxis } from '@/app/lib/chartKit'
import { CATEGORY_LABEL, LEVELS, LEVEL_COLOR, TREATMENT_LABEL as RR_TREATMENT, levelOf, periodLabel, periodShort, thShort, type Category, type Level, type Treatment } from '../risk-register/rrShared'
import { KIND_LABEL, LEVEL_COLOR as AR_COLOR, RISK_LEVELS, TREATMENT_LABEL as AR_TREATMENT, short, type Kind, type RiskLevel } from '../assets/assetShared'

const { Title, Text } = Typography

interface Round { id: number; period: string; items: number; open: number; closed: number; avg_score: number | null; avg_residual: number | null; avg_progress: number | null; levels: Record<Level, number>; overdue: number }
interface Cell { likelihood: number; impact: number; n: number }
interface TopItem { id: number; threat: string; asset_group: string; category: Category; score: number; level: Level; residual_score: number | null; owner: string | null; treatment: Treatment; progress_pct: number; due_date: string | null; status: 'open' | 'closed'; overdue: boolean }
interface Latest { period: string; recorder_name: string | null; meeting_date: string | null; matrix: Cell[]; residual_matrix: Cell[]; treatments: Record<string, number>; categories: Record<string, number>; top: TopItem[] }
interface KindRow { kind: Kind; held: number; in_use: number; repair: number; expired: number; soon: number; value: number }
interface AssetTop { noid: string; name: string | null; kind: Kind; department: string | null; score: number; level: RiskLevel; treatment: string; due_date: string | null; overdue: boolean }
interface Assets {
  totals: { held: number; value: number; disposed: number; in_use: number; repair: number; pending: number; expired: number; soon: number; unknown_age: number; open_repairs: number; frequent_repairs: number }
  kinds: KindRow[]; by_fy: { fy: number; count: number; value: number }[]; departments: { department: string; held: number; expired: number }[]
  risk: { overall: Record<RiskLevel, number>; overall_suggested: Record<RiskLevel, number>; overall_kinds: { kind: Kind; levels: Record<RiskLevel, number> }[]; assessed: number; levels: Record<RiskLevel, number>; treatments: Record<string, number>; overdue: number; review_due: number; top: AssetTop[] }
}
interface Data { as_of: string; today: string; risk_register: { rounds: Round[]; latest: Latest | null }; assets: Assets | null; asset_error: string | null }

const pct = (a: number, b: number) => b ? Math.round(a / b * 1000) / 10 : 0
const Section = ({ icon, title, extra }: { icon: React.ReactNode; title: string; extra?: React.ReactNode }) => (
  <div className="mb-3 mt-2 flex flex-wrap items-center gap-2">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>{icon}</span>
    <Title level={4} style={{ margin: 0 }}>{title}</Title>
    {extra && <div style={{ marginLeft: 'auto' }}>{extra}</div>}
  </div>
)
const card = { borderRadius: 16, height: '100%' }

const PageContent = ({ isDark }: { isDark: boolean }) => {
  const { message } = App.useApp()
  const [data, setData] = useState<Data | null>(null)
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [matrixMode, setMatrixMode] = useState<'inherent' | 'residual'>('inherent')
  const P = PALETTES[isDark ? 'dark' : 'light']
  const LC = LEVEL_COLOR[isDark ? 'dark' : 'light'], AC = AR_COLOR[isDark ? 'dark' : 'light']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/it/executive-dashboard')
      const j = await res.json().catch(() => ({}))
      if (res.status === 403 || res.status === 401) { setDenied(true); return }
      if (!res.ok || !j.success) throw new Error(j.message || 'โหลดข้อมูลไม่สำเร็จ')
      setData(j.data)
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  if (denied) return <Result status="403" title="ไม่มีสิทธิ์เข้าถึง" subTitle="Dashboard นี้เปิดให้เจ้าหน้าที่และหัวหน้างาน IT และผู้อำนวยการ" />
  if (!data) return <Card loading style={{ borderRadius: 16 }} />

  const { rounds, latest } = data.risk_register
  const last = rounds[rounds.length - 1]
  const lvOf = (s: number | null) => s == null ? null : LEVELS.find(l => l.key === levelOf(s))!
  const tag = (s: number | null) => { const l = lvOf(s); return l ? <Tag color={l.tag} style={{ margin: 0, fontWeight: 600 }}>{s} · {l.label}</Tag> : <Text type="secondary">-</Text> }

  // ── Risk matrix ของรอบล่าสุด ──
  const cells = latest ? (matrixMode === 'inherent' ? latest.matrix : latest.residual_matrix) : []
  const cnt = new Map(cells.map(c => [`${c.likelihood}-${c.impact}`, c.n]))
  const matrixOption = {
    backgroundColor: 'transparent',
    tooltip: { backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text }, formatter: (p: { value: number[] }) => `โอกาส ${p.value[1] + 1} × ความรุนแรง ${p.value[0] + 1} = ${p.value[3]}<br/>${lvOf(p.value[3])!.label} · <b>${p.value[2]}</b> รายการ` },
    visualMap: { show: false, type: 'piecewise', dimension: 3, pieces: [{ min: 12.5, max: 25, color: LC.critical }, { min: 9.5, max: 12.4, color: LC.high }, { min: 3.5, max: 9.4, color: LC.medium }, { min: 0, max: 3.4, color: LC.low }] },
    grid: { left: 8, right: 8, top: 8, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: ['1', '2', '3', '4', '5'], name: 'ความรุนแรง (Impact) →', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: P.muted }, axisLabel: { color: P.text }, axisTick: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: ['1', '2', '3', '4', '5'], name: 'โอกาสเกิด →', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: P.muted }, axisLabel: { color: P.text }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{ type: 'heatmap', data: [1, 2, 3, 4, 5].flatMap(l => [1, 2, 3, 4, 5].map(m => { const c = cnt.get(`${l}-${m}`) ?? 0; return { value: [m - 1, l - 1, c, l * m], itemStyle: { opacity: c ? 0.92 : 0.2, borderColor: P.surface, borderWidth: 2, borderRadius: 6 } } })),
      label: { show: true, color: '#fff', fontWeight: 700, fontSize: 13, formatter: (p: { value: number[] }) => p.value[2] ? String(p.value[2]) : '' } }],
  }
  // ── แนวโน้มแต่ละรอบ: จำนวนรายการตามระดับ (แท่งซ้อน) ──
  const roundOption = {
    ...base(P, v => `${num(v)} รายการ`),
    legend: { ...base(P, num).legend, data: LEVELS.map(l => l.label) },
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: rounds.map(r => periodShort(r.period).replace('ปีงบ ', '').replace(' ครั้งที่ ', '/')), axisLabel: { color: P.text }, axisTick: { show: false }, axisLine: { lineStyle: { color: P.grid } } },
    yAxis: valueAxis(P),
    tooltip: { ...base(P, num).tooltip, formatter: (ps: { dataIndex: number; marker: string; seriesName: string; value: number }[]) => {
      const r = rounds[ps[0].dataIndex]
      return `<b>${periodLabel(r.period)}</b><br/>${ps.map(p => `${p.marker}${p.seriesName} ${p.value}`).join('<br/>')}<br/>คะแนนเฉลี่ย ${r.avg_score ?? '-'} · คงเหลือเฉลี่ย ${r.avg_residual ?? '-'}`
    } },
    series: [...LEVELS].reverse().map(l => ({ name: l.label, type: 'bar', stack: 'lv', barMaxWidth: 36, itemStyle: { color: LC[l.key], ...gap(P) }, data: rounds.map(r => r.levels[l.key]) })),
  }

  const A = data.assets
  const ageOption = A && {
    ...base(P, v => `${num(v)} เครื่อง`),
    grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
    xAxis: valueAxis(P), yAxis: categoryAxis(P, A.kinds.map(k => KIND_LABEL[k.kind]), true, A.kinds.map(k => k.held), 22),
    series: [
      { name: 'ครบอายุแล้ว', color: AC.very_high, data: A.kinds.map(k => k.expired) },
      { name: 'ครบอายุภายใน 1 ปี', color: AC.medium, data: A.kinds.map(k => k.soon) },
      { name: 'ยังไม่ครบอายุ', color: AC.low, data: A.kinds.map(k => k.held - k.expired - k.soon) },
    ].map(s => ({ ...s, type: 'bar', stack: 'age', barMaxWidth: 18, itemStyle: { color: s.color, ...gap(P) } })),
  }
  const riskKinds = A ? A.risk.overall_kinds.filter(k => A.kinds.some(x => x.kind === k.kind)) : []
  const assetRiskOption = A && {
    ...base(P, v => `${num(v)} เครื่อง`),
    grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
    xAxis: valueAxis(P), yAxis: categoryAxis(P, riskKinds.map(k => KIND_LABEL[k.kind]), true, undefined, 22),
    series: RISK_LEVELS.map(l => ({ name: l.label, type: 'bar', stack: 'r', barMaxWidth: 18, itemStyle: { color: AC[l.key], ...gap(P) }, data: riskKinds.map(k => k.levels[l.key]) })),
  }
  const fyOption = A && {
    ...base(P, v => `${num(v)} เครื่อง`),
    legend: { show: false },
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: A.by_fy.map(f => String(f.fy)), axisLabel: { color: P.text }, axisTick: { show: false }, axisLine: { lineStyle: { color: P.grid } } },
    yAxis: valueAxis(P),
    tooltip: { ...base(P, num).tooltip, formatter: (ps: { dataIndex: number }[]) => { const f = A.by_fy[ps[0].dataIndex]; return `ปีงบประมาณ ${f.fy}<br/>${num(f.count)} เครื่อง · มูลค่า ${short(f.value)} บาท` } },
    series: [{ name: 'จำนวน', type: 'bar', barMaxWidth: 32, itemStyle: { color: P.single, borderRadius: [4, 4, 0, 0] }, data: A.by_fy.map(f => f.count) }],
  }
  const deptOption = A && {
    ...base(P, v => `${num(v)} เครื่อง`),
    grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
    xAxis: valueAxis(P), yAxis: categoryAxis(P, A.departments.map(d => d.department), true, A.departments.map(d => d.held), 24),
    series: [
      { name: 'ครบอายุแล้ว', color: AC.very_high, data: A.departments.map(d => d.expired) },
      { name: 'ยังไม่ครบอายุ / ไม่มีข้อมูล', color: P.single, data: A.departments.map(d => d.held - d.expired) },
    ].map(s => ({ ...s, type: 'bar', stack: 'd', barMaxWidth: 18, itemStyle: { color: s.color, ...gap(P) } })),
  }
  const highAssets = A ? A.risk.overall.very_high + A.risk.overall.high : 0

  return (
    <>
      <Card style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)', border: 'none', borderRadius: 16, marginBottom: 20 }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}><FaChartLine className="text-2xl text-white" /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>Dashboard ความเสี่ยงและทรัพย์สิน IT</Title>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14 }}>สำหรับผู้บริหาร · ทะเบียนความเสี่ยงของบริการที่สำคัญ และทะเบียนครุภัณฑ์คอมพิวเตอร์ · ข้อมูล ณ {new Date(data.as_of).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>โหลดใหม่</Button>
        </div>
      </Card>

      {/* ── ทะเบียนความเสี่ยง ── */}
      <Section icon={<FaClipboardList />} title="ทะเบียนความเสี่ยง (Risk Register)" extra={latest && <Text type="secondary">{periodLabel(latest.period)}{latest.meeting_date ? ` · ประชุม ${thShort(latest.meeting_date)}` : ''}</Text>} />
      {!last || !latest ? <Card style={{ ...card, marginBottom: 24 }}><Empty description="ยังไม่มีทะเบียนความเสี่ยง" /></Card> : <>
        <Row gutter={[16, 16]} className="mb-4" data-testid="ex-rr-cards">
          <Col xs={12} lg={6}><StatCard accent="teal" isDark={isDark} label="ผลประเมินเฉลี่ยรอบล่าสุด" value={last.avg_score ?? '-'} icon={<FaShieldAlt />}
            footer={<Space size={6} wrap>{last.avg_score != null && <Tag color={lvOf(last.avg_score)!.tag} style={{ margin: 0 }}>{lvOf(last.avg_score)!.label}</Tag>}<Text type="secondary" style={{ fontSize: 12 }}>คงเหลือเฉลี่ย {last.avg_residual ?? '-'}</Text></Space>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="rose" isDark={isDark} label="ระดับวิกฤติ / สูง" value={last.levels.critical + last.levels.high} suffix="รายการ" icon={<FaExclamationTriangle />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>วิกฤติ {last.levels.critical} · สูง {last.levels.high} · จากทั้งหมด {last.items}</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="emerald" isDark={isDark} label="ความคืบหน้าแผนจัดการเฉลี่ย" value={last.avg_progress ?? '-'} suffix="%" icon={<FaChartLine />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>Open {last.open} · Closed {last.closed}</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="amber" isDark={isDark} label="เลยกำหนดเสร็จ (ยัง Open)" value={last.overdue} suffix="รายการ" icon={<FaHourglassEnd />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>ความคืบหน้ายังไม่ถึง 100%</Text>} /></Col>
        </Row>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={10}>
            <Card size="small" style={card} title="Risk Matrix รอบล่าสุด" extra={<Segmented size="small" value={matrixMode} onChange={v => setMatrixMode(v as typeof matrixMode)} options={[{ value: 'inherent', label: 'ก่อนจัดการ' }, { value: 'residual', label: 'คงเหลือ' }]} />}>
              <EChart theme={isDark ? 'dark' : 'light'} height={280} option={matrixOption} />
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card size="small" style={card} title={`จำนวนรายการตามระดับ แต่ละรอบ (${rounds.length} รอบ)`}>
              <EChart theme={isDark ? 'dark' : 'light'} height={280} option={roundOption} />
            </Card>
          </Col>
        </Row>
        <Card size="small" style={{ borderRadius: 16, marginBottom: 16 }} title="ผลการประเมินแต่ละรอบ">
          <Table<Round> size="small" rowKey="id" pagination={false} scroll={{ x: 760 }} dataSource={[...rounds].reverse()} data-testid="ex-rounds" columns={[
            { title: 'รอบการประเมิน', dataIndex: 'period', render: (p: string) => periodLabel(p) },
            { title: 'รายการ', dataIndex: 'items', align: 'center', width: 70 },
            { title: 'วิกฤติ / สูง', key: 'ch', align: 'center', width: 90, render: (_: unknown, r) => `${r.levels.critical} / ${r.levels.high}` },
            { title: 'คะแนนเฉลี่ย', dataIndex: 'avg_score', align: 'center', width: 120, render: (v: number | null) => tag(v) },
            { title: 'คงเหลือเฉลี่ย', dataIndex: 'avg_residual', align: 'center', width: 120, render: (v: number | null) => tag(v) },
            { title: 'ความคืบหน้า', dataIndex: 'avg_progress', align: 'center', width: 100, render: (v: number | null) => v == null ? '-' : `${v}%` },
            { title: 'เลยกำหนด', dataIndex: 'overdue', align: 'center', width: 90, render: (v: number) => v ? <Text type="danger" strong>{v}</Text> : 0 },
          ]} />
        </Card>
        <Card size="small" style={{ borderRadius: 16, marginBottom: 28 }} title={`ความเสี่ยงระดับวิกฤติและสูง — ${periodShort(latest.period)}`}
          extra={<Text type="secondary" style={{ fontSize: 12 }}>{Object.entries(latest.treatments).map(([k, n]) => `${RR_TREATMENT[k as Treatment] ?? k} ${n}`).join(' · ')}</Text>}>
          <Table<TopItem> size="small" rowKey="id" pagination={false} scroll={{ x: 980 }} dataSource={latest.top} data-testid="ex-rr-top"
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการระดับวิกฤติหรือสูง" /> }} columns={[
              { title: 'ระบบงาน / ภัยคุกคาม', key: 't', render: (_: unknown, i) => <><div style={{ fontWeight: 600 }}>{i.threat}</div><Text type="secondary" style={{ fontSize: 12 }}>{i.asset_group} · {CATEGORY_LABEL[i.category]}</Text></> },
              { title: 'ระดับ', dataIndex: 'score', width: 110, align: 'center', render: (v: number) => tag(v) },
              { title: 'คงเหลือ', dataIndex: 'residual_score', width: 110, align: 'center', render: (v: number | null) => tag(v) },
              { title: 'การตอบสนอง', dataIndex: 'treatment', width: 150, render: (v: Treatment) => RR_TREATMENT[v] },
              { title: 'เจ้าของความเสี่ยง', dataIndex: 'owner', width: 200, render: (v: string | null) => v ?? '-' },
              { title: 'ความคืบหน้า', dataIndex: 'progress_pct', width: 95, align: 'center', render: (v: number) => `${v}%` },
              { title: 'คาดว่าเสร็จ', dataIndex: 'due_date', width: 100, render: (v: string | null, i) => v ? <Text type={i.overdue ? 'danger' : undefined} strong={i.overdue}>{thShort(v)}</Text> : '-' },
              { title: 'สถานะ', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'open' ? 'processing' : 'default'} style={{ margin: 0 }}>{v === 'open' ? 'Open' : 'Closed'}</Tag> },
            ]} />
        </Card>
      </>}

      {/* ── ทรัพย์สินงาน IT ── */}
      <Section icon={<FaWarehouse />} title="ทะเบียนทรัพย์สินงาน IT (ครุภัณฑ์คอมพิวเตอร์)" extra={A && <Text type="secondary">ถือครองอยู่ {num(A.totals.held)} รายการ · ออกจากทะเบียนแล้ว {num(A.totals.disposed)}</Text>} />
      {!A ? <Card style={card}><Result status="warning" title={data.asset_error ?? 'ไม่มีข้อมูลทะเบียนครุภัณฑ์'} subTitle="ส่วนทะเบียนความเสี่ยงด้านบนยังใช้ได้ตามปกติ" /></Card> : <>
        <Row gutter={[16, 16]} className="mb-4" data-testid="ex-asset-cards">
          <Col xs={12} lg={6}><StatCard accent="cyan" isDark={isDark} label="ครุภัณฑ์ที่ถือครองอยู่" value={num(A.totals.held)} suffix="รายการ" icon={<FaWarehouse />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>มูลค่ารวม {short(A.totals.value)} บาท</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="rose" isDark={isDark} label="ครบอายุการใช้งานแล้ว" value={num(A.totals.expired)} suffix={`(${pct(A.totals.expired, A.totals.held)}%)`} icon={<FaHourglassEnd />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>จะครบอายุภายใน 1 ปี อีก {num(A.totals.soon)} รายการ</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="amber" isDark={isDark} label="ส่งซ่อม / แจ้งชำรุด" value={num(A.totals.repair)} suffix="รายการ" icon={<FaTools />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>งานซ่อมค้างในระบบ {num(A.totals.open_repairs)} งาน</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="violet" isDark={isDark} label="ความเสี่ยงสูงมาก / สูง" value={num(highAssets)} suffix="รายการ" icon={<FaShieldAlt />}
            footer={<Tooltip title="ครุภัณฑ์ที่ยังไม่ประเมิน ใช้ค่าที่ระบบเสนอจากอายุใช้งาน ประวัติซ่อม ชนิดอุปกรณ์ และหน่วยงาน">
              <Text type="secondary" style={{ fontSize: 12 }}>สูงมาก {num(A.risk.overall.very_high)} · ประเมินแล้ว {num(A.risk.assessed)} รายการ</Text></Tooltip>} /></Col>
        </Row>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={12}>
            <Card size="small" style={card} title="อายุการใช้งานตามชนิดอุปกรณ์">
              <EChart theme={isDark ? 'dark' : 'light'} height={barHeight(A.kinds.length)} option={ageOption!} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" style={card} title="ระดับความเสี่ยงตามชนิดอุปกรณ์" extra={<Tooltip title="ใช้ผลประเมินจริงถ้ามี ไม่งั้นใช้ค่าที่ระบบเสนอ"><Text type="secondary" style={{ fontSize: 12 }}>ประเมินแล้ว {num(A.risk.assessed)} / {num(A.totals.held)}</Text></Tooltip>}>
              <EChart theme={isDark ? 'dark' : 'light'} height={barHeight(riskKinds.length)} option={assetRiskOption!} />
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={10}>
            <Card size="small" style={card} title="ครุภัณฑ์ที่ได้รับ ตามปีงบประมาณ (10 ปีล่าสุด)">
              <EChart theme={isDark ? 'dark' : 'light'} height={300} option={fyOption!} />
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card size="small" style={card} title="หน่วยงานที่ถือครองมากที่สุด 10 อันดับ">
              <EChart theme={isDark ? 'dark' : 'light'} height={barHeight(A.departments.length, 300)} option={deptOption!} />
            </Card>
          </Col>
        </Row>
        <Card size="small" style={{ borderRadius: 16 }} title="ครุภัณฑ์ที่ประเมินแล้วว่าเสี่ยงสูง (10 อันดับ)"
          extra={<Text type="secondary" style={{ fontSize: 12 }}>เลยกำหนดแผน {A.risk.overdue} · ถึงรอบทบทวน {A.risk.review_due}</Text>}>
          <Table<AssetTop> size="small" rowKey="noid" pagination={false} scroll={{ x: 820 }} dataSource={A.risk.top} data-testid="ex-asset-top"
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={A.risk.assessed ? 'ไม่มีครุภัณฑ์ที่ประเมินแล้วว่าเสี่ยงสูง' : 'ยังไม่มีผลประเมินความเสี่ยงทรัพย์สิน — ตัวเลขด้านบนเป็นค่าที่ระบบเสนอ'} /> }} columns={[
              { title: 'เลขครุภัณฑ์ / ชื่อ', key: 'n', render: (_: unknown, a) => <><div style={{ fontWeight: 600 }}>{a.name ?? '-'}</div><Text type="secondary" style={{ fontSize: 12 }}>{a.noid} · {KIND_LABEL[a.kind] ?? a.kind}</Text></> },
              { title: 'หน่วยงาน', dataIndex: 'department', width: 200, render: (v: string | null) => v ?? '-' },
              { title: 'ระดับ', dataIndex: 'score', width: 110, align: 'center', render: (v: number, a) => { const l = RISK_LEVELS.find(x => x.key === a.level)!; return <Tag color={l.tag} style={{ margin: 0, fontWeight: 600 }}>{v} · {l.label}</Tag> } },
              { title: 'แนวทางจัดการ', dataIndex: 'treatment', width: 140, render: (v: string) => AR_TREATMENT[v] ?? v },
              { title: 'กำหนดเสร็จ', dataIndex: 'due_date', width: 110, render: (v: string | null, a) => v ? <Text type={a.overdue ? 'danger' : undefined} strong={a.overdue}>{thShort(v)}</Text> : '-' },
            ]} />
        </Card>
      </>}
    </>
  )
}

export default function ItExecutiveDashboardPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#0f766e', borderRadius: 8 } }}>
      <App>
        <div className="min-h-screen w-full bg-app-bg text-app-text">
          <Navbar />
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
            <Breadcrumb className="mb-4" items={[
              { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
              { title: <><FaMicrochip className="inline mr-1" /> งานคอมพิวเตอร์ฯ</> },
              { title: 'Dashboard ความเสี่ยงและทรัพย์สิน IT' },
            ]} />
            <PageContent isDark={isDark} />
          </div>
        </div>
      </App>
    </ConfigProvider>
  )
}
