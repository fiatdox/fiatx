'use client'
// HR Dashboard เชิงลึก — ดึงข้อมูลรายบุคคลแบบไม่ระบุตัวตนครั้งเดียว แล้วสรุปตามขอบเขตที่เลือกที่หน้าเว็บ
// เปลี่ยนตัวกรอง/เจาะลึกได้ทันทีโดยไม่ต้องรอ API และทุกส่วนของหน้าคิดจากชุดเดียวกัน ตัวเลขจึงตรงกันเสมอ
// ส่วนคำนวณอยู่ที่ insights.ts, option ของกราฟอยู่ที่ charts.ts
import React, { useEffect, useMemo, useState } from 'react'
import {
  Card, Typography, Row, Col, Tag, Progress, Button, Select, Tabs, Table, Segmented, Alert, Result, Tooltip,
  ConfigProvider,
} from 'antd'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import type { ColumnsType } from 'antd/es/table'
import { HomeOutlined, ReloadOutlined, InfoCircleOutlined, WarningOutlined, RightOutlined, TeamOutlined, EditOutlined } from '@ant-design/icons'
import { FaUsersCog, FaChartPie, FaVenusMars, FaUserClock, FaSignOutAlt, FaHourglassHalf, FaDatabase } from 'react-icons/fa'
import Navbar from '../../components/Navbar'
import { DashboardSkeleton } from '../../components/Skeleton'
import { AppThemeProvider, useThemeMode } from '@/app/components/ThemeProvider'
import EChart, { type ChartTheme } from '../../components/EChart'
import ChartCard from '../../components/ChartCard'
import { StatCard } from '@/app/components/StatCard'
import * as I from './insights'
import {
  PALETTES, barHeight, exitByUnitOption, positionOption, pyramidOption, reasonColor, retireOption, singleBarOption, unitByTypeOption,
} from './charts'

const { Title, Text } = Typography

const num = (n: number) => n.toLocaleString('th-TH')
const pct1 = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 1 })
const share = (n: number, d: number) => (d > 0 ? (n * 100) / d : 0)
// เปอร์เซ็นต์ความครบปัดลงเสมอ — 1,276/1,278 ต้องไม่ขึ้น 100% (และเครื่องหมายครบ) ทั้งที่ยังขาดอยู่
const floorPct = (n: number) => Math.floor(n)
// ค่าปีงบ "ทุกปี" ใน Segmented (ใส่ null ไม่ได้)
const ALL_FY = 0

type LoadError = { status: number; message: string }

const fetchJson = async <T,>(url: string): Promise<{ data?: T; error?: LoadError }> => {
  try {
    const res = await fetch(url)
    const json = await res.json().catch(() => null)
    if (res.ok && json?.success) return { data: json.data }
    return { error: { status: res.status, message: json?.message || 'โหลดข้อมูลไม่สำเร็จ' } }
  } catch {
    return { error: { status: 0, message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' } }
  }
}
const fetchPeople = () => fetchJson<I.PeopleData>('/api/v1/hr/dashboard/people')

// รายชื่อที่ข้อมูลอายุต้องแก้ — โหลดเมื่อเปิดแท็บอายุ (key = รอบรีเฟรชที่โหลดมา)
type IssuesState = { key: number; list?: I.AgeIssue[]; error?: LoadError }

const PageContent = () => {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  const P = PALETTES[isDark ? 'dark' : 'light']
  const chartTheme: ChartTheme = isDark ? 'dark' : 'light'

  const [data, setData] = useState<I.PeopleData | null>(null)
  const [error, setError] = useState<LoadError | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const [scope, setScope] = useState<I.Scope>(I.ALL_SCOPE)
  const [exitFy, setExitFy] = useState<I.ExitFy>(null)
  const [tab, setTab] = useState('org')

  useEffect(() => {
    let alive = true
    fetchPeople().then(r => {
      if (!alive) return
      if (r.data) { setData(r.data); setError(null) } else setError(r.error ?? null)
      setLoading(false)
    })
    return () => { alive = false }
  }, [reloadKey])

  const [issues, setIssues] = useState<IssuesState | null>(null)
  useEffect(() => {
    if (tab !== 'age' || issues?.key === reloadKey) return
    let alive = true
    fetchJson<{ issues: I.AgeIssue[] }>('/api/v1/hr/dashboard/age-issues').then(r => {
      if (alive) setIssues({ key: reloadKey, list: r.data?.issues, error: r.error })
    })
    return () => { alive = false }
  }, [tab, reloadKey, issues?.key])
  const issuesLoading = tab === 'age' && issues?.key !== reloadKey
  const reload = () => { setLoading(true); setReloadKey(k => k + 1) }

  const names = useMemo(() => (data ? I.buildNames(data.lookups) : null), [data])
  const scoped = useMemo(() => (data ? data.people.filter(p => I.inScope(p, scope)) : []), [data, scope])
  const level = I.childLevel(scope)
  const fyLabel = exitFy == null ? 'ทุกปีงบที่บันทึก' : `ปีงบ ${exitFy}`

  const rows = useMemo(
    () => (data && names ? I.breakdown(scoped, level, names, data.lookups, exitFy, data.current_fy) : []),
    [data, names, scoped, level, exitFy],
  )
  const k = useMemo(() => (data ? I.kpis(scoped, data.lookups, exitFy, data.current_fy) : null), [data, scoped, exitFy])
  const finds = useMemo(() => (k ? I.findings(rows, level, k, fyLabel) : []), [rows, level, k, fyLabel])

  // ── ตัวกรอง: ตัวเลือกสร้างจากรหัสที่บุคลากรบันทึกไว้จริง ไม่ใช่จากตารางหน่วยงาน ──
  // ตารางหน่วยงานกับข้อมูลคนไม่ตรงกันหลายราย (คนในหน่วยงาน A ถูกบันทึกกลุ่มงาน B ทั้งที่ตาราง A อยู่ใต้กลุ่มงาน C)
  // ถ้ากรองตัวเลือกตามตาราง หน่วยงานที่เจาะลึกเข้าไปจะไม่อยู่ในรายการ และช่องจะโชว์รหัสดิบแทนชื่อ
  // นับคนจากชุดที่ผ่านตัวกรองระดับบนแล้ว ตัวเลือกจึงบอกได้ว่าเลือกแล้วจะเหลือกี่คน
  const filterOptions = useMemo(() => {
    if (!data) return null
    const staff = data.people.filter(p => p.a)
    const opt = (list: I.Named[], key: (p: I.Person) => number | null, within: I.Scope, selected: number | null) => {
      const n = new Map<number, number>()
      for (const p of staff) {
        const id = key(p)
        if (id != null && I.inScope(p, within)) n.set(id, (n.get(id) ?? 0) + 1)
      }
      return list
        // ค่าที่เลือกอยู่ต้องมีในรายการเสมอ (เช่นหน่วยงานที่เหลือแต่ผู้ที่ออกแล้ว) ไม่งั้นช่องโชว์รหัส
        .filter(x => n.has(x.id) || x.id === selected)
        .map(x => ({ value: x.id, label: `${x.name} (${num(n.get(x.id) ?? 0)})` }))
    }
    const L = data.lookups
    return {
      missions: opt(L.missions, p => p.m, { ...I.ALL_SCOPE, type: scope.type }, scope.mission),
      majors: opt(L.majors, p => p.w, { ...I.ALL_SCOPE, mission: scope.mission, type: scope.type }, scope.major),
      submajors: opt(L.submajors, p => p.u, { ...scope, submajor: null }, scope.submajor),
      types: opt(L.types, p => p.t, { ...scope, type: null }, scope.type),
    }
  }, [data, scope])

  const exitFyOptions = useMemo(() => {
    if (!data) return []
    const years = [...new Set([data.current_fy, ...I.exitYears(data.people)])].sort((a, b) => b - a)
    return [
      { label: 'ทุกปีงบ', value: ALL_FY },
      ...years.map(y => ({ label: `ปีงบ ${y}${y === data.current_fy ? ' (ปัจจุบัน)' : ''}`, value: y })),
    ]
  }, [data])

  const drill = (lvl: I.Level, id: number | null) => {
    const next = I.drillInto(scope, lvl, id)
    if (next) { setScope(next); setTab('org') }
  }

  // ทางเดินของขอบเขต: ทั้งโรงพยาบาล › ด้าน › กลุ่มงาน › หน่วยงาน (กดย้อนขึ้นได้)
  const path = names && [
    { label: 'ทั้งโรงพยาบาล', to: { ...scope, mission: null, major: null, submajor: null }, show: true },
    { label: names.mission.get(scope.mission ?? -1), to: { ...scope, major: null, submajor: null }, show: scope.mission != null },
    { label: names.major.get(scope.major ?? -1), to: { ...scope, submajor: null }, show: scope.major != null },
    { label: names.submajor.get(scope.submajor ?? -1), to: scope, show: scope.submajor != null },
  ].filter(x => x.show)

  const thaiDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'long' })

  // ── สถานะโหลด / ข้อผิดพลาด ──────────────────────────────────────────────────
  const body = (() => {
    if (!data && loading) return <DashboardSkeleton />
    if (!data && error?.status === 403) {
      return <Result status="403" title="ไม่มีสิทธิ์เข้าถึง" subTitle="Dashboard นี้เปิดให้ผู้ดูแลระบบและงานทรัพยากรบุคคลเท่านั้น" />
    }
    if (!data || !names || !k || !filterOptions) {
      return (
        <Alert type="error" showIcon title="โหลดข้อมูลไม่สำเร็จ" description={error?.message}
          action={<Button onClick={reload}>ลองอีกครั้ง</Button>} />
      )
    }
    const L = data.lookups
    const levelLabel = I.LEVEL_LABEL[level]
    const unitName = (x: { w: number | null; u: number | null }) =>
      x.u != null ? names.submajor.get(x.u) ?? `รหัส ${x.u}` : x.w != null ? names.major.get(x.w) ?? `รหัส ${x.w}` : I.NONE
    const drillable = level !== 'position'

    // ── ตารางหน่วยย่อย (ใช้คู่กับกราฟในแท็บโครงสร้าง และเป็นทางเจาะลึก) ──
    const unitColumns: ColumnsType<I.UnitRow> = [
      {
        title: levelLabel, dataIndex: 'name', fixed: 'left', width: 260,
        render: (v: string, r) => drillable && r.id != null
          ? <Button type="link" style={{ padding: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => drill(level, r.id)}>{v}</Button>
          : <Text type={r.id == null ? 'secondary' : undefined}>{v}</Text>,
      },
      {
        title: 'บุคลากร', dataIndex: 'staff', width: 110, align: 'right', sorter: (a, b) => a.staff - b.staff,
        render: (v: number, r) => <><b>{num(v)}</b> <Text type="secondary" style={{ fontSize: 12 }}>{pct1(r.share)}%</Text></>,
      },
      { title: 'หญิง', dataIndex: 'femalePct', width: 80, align: 'right', sorter: (a, b) => a.femalePct - b.femalePct, render: (v: number) => `${pct1(v)}%` },
      {
        title: 'ลูกจ้างชั่วคราว', dataIndex: 'temporaryPct', width: 120, align: 'right', sorter: (a, b) => a.temporaryPct - b.temporaryPct,
        render: (v: number, r) => <>{pct1(v)}% <Text type="secondary" style={{ fontSize: 12 }}>({num(r.temporary)})</Text></>,
      },
      {
        title: <Tooltip title="เฉลี่ยจากคนที่มีวันเกิด — n คือจำนวนคนที่ใช้คำนวณ">อายุเฉลี่ย</Tooltip>,
        dataIndex: 'ageAvg', width: 110, align: 'right', sorter: (a, b) => (a.ageAvg ?? -1) - (b.ageAvg ?? -1),
        render: (v: number | null, r) => v == null ? <Text type="secondary">-</Text>
          : <>{pct1(v)} <Text type="secondary" style={{ fontSize: 12 }}>n={num(r.ageKnown)}</Text></>,
      },
      {
        title: `เกษียณ ${I.RETIRE_HORIZON} ปีงบ`, dataIndex: 'retireSoon', width: 120, align: 'right', sorter: (a, b) => a.retireSoon - b.retireSoon,
        render: (v: number, r) => <>{num(v)}{r.overdue > 0 && <Tooltip title="เลยปีงบเกษียณแล้วแต่ยังเป็นบุคลากร"><Tag color="warning" style={{ marginLeft: 6, marginRight: 0 }}>เลย {r.overdue}</Tag></Tooltip>}</>,
      },
      {
        title: 'ออกจากงาน', dataIndex: 'exits', width: 120, align: 'right', sorter: (a, b) => a.exitRate - b.exitRate,
        render: (v: number, r) => v === 0 ? <Text type="secondary">0</Text> : <>{num(v)} <Text type="secondary" style={{ fontSize: 12 }}>{pct1(r.exitRate)}%</Text></>,
      },
      {
        title: 'มีวันเกิด', dataIndex: 'birthCoverage', width: 120, sorter: (a, b) => a.birthCoverage - b.birthCoverage,
        render: (v: number) => <Progress percent={floorPct(v)} size="small" strokeColor={P.single} />,
      },
      ...(drillable ? [{
        title: '', key: 'go', width: 56, align: 'center' as const,
        render: (_: unknown, r: I.UnitRow) => r.id != null && (
          <Button size="small" type="text" icon={<RightOutlined />} aria-label={`เจาะลึก ${r.name}`} onClick={() => drill(level, r.id)} />
        ),
      }] : []),
    ]
    const unitTotal = {
      staff: rows.reduce((s, r) => s + r.staff, 0),
      temporary: rows.reduce((s, r) => s + r.temporary, 0),
      retire: rows.reduce((s, r) => s + r.retireSoon, 0),
      exits: rows.reduce((s, r) => s + r.exits, 0),
    }

    // ── ข้อมูลของแต่ละแท็บ ──
    const pyr = I.agePyramid(scoped)
    const forecast = I.retirementForecast(scoped, data.current_fy, 10)
    const pos = I.topPositions(scoped, names, 15)
    const reasons = I.exitReasons(scoped, names, exitFy)
    const exitUnits = rows.filter(r => r.exits > 0).sort((a, b) => b.exits - a.exits)
    const cover = I.coverage(scoped, L)
    const scopedIssues = issues?.list?.filter(x => I.inScope(x, scope)) ?? []
    const issueColumns: ColumnsType<I.AgeIssue> = [
      { title: 'ชื่อ-สกุล', dataIndex: 'name', width: 220, fixed: 'left' },
      { title: 'ตำแหน่ง', dataIndex: 'p', width: 200, render: (v: number | null) => (v == null ? I.NONE : names.position.get(v) ?? `รหัส ${v}`) },
      { title: 'หน่วยงาน / กลุ่มงาน', key: 'unit', width: 240, render: (_: unknown, r) => unitName(r) },
      {
        title: 'วันเกิดที่บันทึก', dataIndex: 'birthday', width: 140,
        render: (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString('th-TH', { dateStyle: 'medium' }),
      },
      { title: 'อายุ', dataIndex: 'age', width: 80, align: 'right', sorter: (a, b) => a.age - b.age, render: (v: number) => `${v} ปี` },
      {
        title: 'ต้องตรวจ', dataIndex: 'issue', width: 190,
        filters: [{ text: 'เลยปีงบเกษียณ', value: 'overdue' }, { text: 'วันเกิดผิดปกติ', value: 'implausible' }],
        onFilter: (v, r) => r.issue === v,
        render: (v: I.AgeIssue['issue'], r) => v === 'overdue'
          ? <Tooltip title="ตรวจว่าเกษียณแล้ว (เปลี่ยนสถานะ) จ้างต่อ หรือวันเกิดบันทึกผิด"><Tag color="warning">เลยเกษียณ ปีงบ {r.retire_fy}</Tag></Tooltip>
          : <Tooltip title="อายุคำนวณได้นอกช่วง 18–70 ปี — ปีเกิดน่าจะบันทึกผิด"><Tag color="error">วันเกิดผิดปกติ</Tag></Tooltip>,
      },
      {
        title: '', key: 'edit', width: 90, align: 'center', fixed: 'right',
        render: (_: unknown, r) => (
          <Button size="small" icon={<EditOutlined />} href={`/hr/users?edit=${r.id}`} target="_blank" aria-label={`แก้ไขข้อมูล ${r.name}`}>
            แก้ไข
          </Button>
        ),
      },
    ]
    const unitCover = I.unitCoverage(scoped, level, names)
    const typeIdsInForecast = [...forecast.byType.keys()]
    const forecastTypeName = (id: number | null) => (id == null ? 'ไม่ระบุประเภท' : names.type.get(id) ?? `ประเภท ${id}`)
    const ageNote = (
      <Alert
        type="info" showIcon className="mb-3"
        title={`คิดจาก ${num(k.ageKnown)} คนที่มีวันเกิด (${pct1(share(k.ageKnown, k.staff))}% ของบุคลากรในขอบเขตนี้)`}
        description="คนที่ยังไม่มีวันเกิดในระบบไม่ถูกนับ ตัวเลขจริงของแต่ละช่วงอายุและจำนวนผู้เกษียณจึงสูงกว่าที่เห็น — เติมวันเกิดได้ที่หน้าทะเบียนบุคลากร"
      />
    )

    return (
      <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
        {/* ── ตัวกรอง (คุมทุกส่วนของหน้า) ── */}
        <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <div className="flex flex-wrap items-end gap-3">
            {[
              { label: 'ด้าน/ภารกิจ', value: scope.mission, options: filterOptions.missions, width: 230,
                onChange: (v?: number) => setScope({ ...scope, mission: v ?? null, major: null, submajor: null }) },
              { label: 'กลุ่มงาน', value: scope.major, options: filterOptions.majors, width: 260,
                // ไม่เติมระดับบนให้ตามตารางหน่วยงาน — ข้อมูลคนกับตารางไม่ตรงกันหลายราย เติมแล้วคนจะหายจากผลกรอง
                onChange: (v?: number) => setScope({ ...scope, major: v ?? null, submajor: null }) },
              { label: 'หน่วยงาน', value: scope.submajor, options: filterOptions.submajors, width: 260,
                onChange: (v?: number) => setScope({ ...scope, submajor: v ?? null }) },
              { label: 'ประเภทบุคลากร', value: scope.type, options: filterOptions.types, width: 230,
                onChange: (v?: number) => setScope({ ...scope, type: v ?? null }) },
            ].map(f => (
              <div key={f.label}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{f.label}</Text>
                <Select
                  allowClear placeholder="ทั้งหมด" style={{ width: f.width }} value={f.value ?? undefined}
                  options={f.options} onChange={f.onChange} showSearch={{ optionFilterProp: 'label' }}
                  notFoundContent="ไม่มีรายการในขอบเขตที่เลือก"
                />
              </div>
            ))}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ปีงบของการออกจากงาน</Text>
              <Segmented
                value={exitFy ?? ALL_FY} options={exitFyOptions}
                onChange={v => setExitFy(Number(v) === ALL_FY ? null : Number(v))}
              />
            </div>
            {(scope.mission != null || scope.major != null || scope.submajor != null || scope.type != null || exitFy != null) && (
              <Button type="link" onClick={() => { setScope(I.ALL_SCOPE); setExitFy(null) }}>ล้างตัวกรอง</Button>
            )}
          </div>
          {path && path.length > 1 && (
            <Breadcrumb
              className="mt-3"
              items={path.map((x, i) => ({
                title: i < path.length - 1
                  ? <a onClick={e => { e.preventDefault(); setScope(x.to) }} href="#">{x.label}</a>
                  : <b>{x.label}</b>,
              }))}
            />
          )}
        </Card>

        {/* ── ตัวเลขสรุป ── */}
        <Row gutter={[16, 16]} className="mb-4">
          {[
            { label: 'บุคลากรปัจจุบัน', value: num(k.staff), suffix: 'คน', icon: <TeamOutlined />, accent: 'teal' as const,
              footer: `ปฏิบัติงาน ${num(k.working)} คน` },
            { label: 'สัดส่วนหญิง : ชาย', value: `${Math.round(share(k.female, k.female + k.male))} : ${Math.round(share(k.male, k.female + k.male))}`,
              suffix: '%', icon: <FaVenusMars />, accent: 'violet' as const, footer: `หญิง ${num(k.female)} · ชาย ${num(k.male)} คน` },
            { label: 'ลูกจ้างชั่วคราว', value: pct1(share(k.temporary, k.staff)), suffix: '%', icon: <FaUserClock />, accent: 'amber' as const,
              footer: `${num(k.temporary)} คน (รายเดือน/รายวัน)` },
            { label: `เกษียณใน ${I.RETIRE_HORIZON} ปีงบ`, value: `≥ ${num(k.retireSoon)}`, suffix: 'คน', icon: <FaHourglassHalf />, accent: 'indigo' as const,
              footer: `คิดจาก ${num(k.ageKnown)} คนที่มีวันเกิด` },
            { label: 'ออกจากงาน', value: num(k.exits), suffix: 'คน', icon: <FaSignOutAlt />, accent: 'rose' as const,
              footer: `อัตรา ${pct1(k.exitRate)}% · ${fyLabel}` },
            { label: 'มีข้อมูลวันเกิด', value: pct1(share(k.ageKnown, k.staff)), suffix: '%', icon: <FaDatabase />, accent: 'slate' as const,
              footer: `${num(k.ageKnown)} จาก ${num(k.staff)} คน` },
          ].map(s => (
            <Col key={s.label} xs={12} md={8} xl={4}>
              <StatCard
                label={s.label} value={s.value} suffix={s.suffix} icon={s.icon} accent={s.accent} isDark={isDark}
                footer={<Text type="secondary" style={{ fontSize: 12 }}>{s.footer}</Text>}
              />
            </Col>
          ))}
        </Row>

        {/* ── ข้อค้นพบสำคัญ (แบบย่อ: เรื่องละช่อง กดเพื่อเจาะลึก/เปิดแท็บรายละเอียด) ── */}
        {finds.length > 0 && (
          <Card
            size="small"
            style={{ borderRadius: 14, marginBottom: 16 }}
            title={<span><InfoCircleOutlined className="mr-2" />ข้อค้นพบสำคัญ</span>}
            extra={(
              <Tooltip title={`อันดับสูงสุด/ต่ำสุดเทียบเฉพาะ${levelLabel}ที่มีบุคลากรตั้งแต่ ${I.MIN_UNIT} คนขึ้นไป`}>
                <Text type="secondary" style={{ fontSize: 12 }}>เทียบ{levelLabel} ≥ {I.MIN_UNIT} คน</Text>
              </Tooltip>
            )}
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {finds.map(f => {
                const go = f.drill
                  ? () => drill(f.drill!.level, f.drill!.id)
                  : f.tab ? () => setTab(f.tab!) : undefined
                const inner = (
                  <>
                    {f.tone === 'warn'
                      ? <WarningOutlined style={{ color: '#d97706', fontSize: 15 }} aria-label="ควรติดตาม" />
                      : <InfoCircleOutlined style={{ color: P.single, fontSize: 15 }} aria-label="ข้อมูล" />}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="truncate" style={{ fontWeight: 600, fontSize: 13 }}>{f.title}</div>
                      <div className="truncate" style={{ fontSize: 12, color: 'var(--app-text-2)' }} title={f.detail}>{f.detail}</div>
                    </div>
                    {go && <RightOutlined style={{ fontSize: 11, color: 'var(--app-text-3)' }} />}
                  </>
                )
                const cls = 'flex items-center gap-2 rounded-lg px-3 py-2 w-full'
                const box = { border: '1px solid var(--app-border-strong)', background: 'transparent', color: 'inherit' }
                return go
                  ? (
                    <button
                      key={f.key} type="button" onClick={go} style={box}
                      className={`${cls} cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5`}
                      aria-label={`${f.title} — ${f.detail}`}
                    >
                      {inner}
                    </button>
                  )
                  : <div key={f.key} className={cls} style={box}>{inner}</div>
              })}
            </div>
          </Card>
        )}

        {/* ── รายละเอียด ── */}
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: '4px 16px 16px' } }}>
          <ConfigProvider theme={{ components: { Tabs: {
            itemSelectedColor: isDark ? '#5eead4' : '#006a5a',
            inkBarColor: isDark ? '#5eead4' : '#006a5a',
            itemHoverColor: isDark ? '#99f6e4' : '#0d9488',
          } } }}>
          <Tabs
            activeKey={tab} onChange={setTab}
            items={[
              {
                key: 'org', label: `โครงสร้าง (${levelLabel})`,
                children: (
                  <div className="flex flex-col gap-4">
                    <div>
                      <Text strong>บุคลากรแยกตาม{levelLabel} ตามประเภทบุคลากร</Text>
                      {drillable && <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>คลิกชื่อในตารางเพื่อเจาะลึก</Text>}
                      <EChart option={unitByTypeOption(rows, L.types, P)} height={barHeight(rows.filter(r => r.staff > 0).length)} theme={chartTheme} showToolbar />
                    </div>
                    <Table<I.UnitRow>
                      rowKey="key" size="small" columns={unitColumns} dataSource={rows}
                      pagination={rows.length > 20 ? { pageSize: 20 } : false} scroll={{ x: 1100 }}
                      summary={() => (
                        <Table.Summary.Row style={{ fontWeight: 600 }}>
                          <Table.Summary.Cell index={0}>รวม</Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">{num(unitTotal.staff)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">{pct1(share(k.female, k.staff))}%</Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">{pct1(share(unitTotal.temporary, unitTotal.staff))}%</Table.Summary.Cell>
                          <Table.Summary.Cell index={4} />
                          <Table.Summary.Cell index={5} align="right">{num(unitTotal.retire)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">{num(unitTotal.exits)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={7} colSpan={drillable ? 2 : 1} />
                        </Table.Summary.Row>
                      )}
                    />
                  </div>
                ),
              },
              {
                key: 'age', label: 'อายุและการเกษียณ',
                children: (
                  <>
                    {ageNote}
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={11}>
                        <ChartCard
                          title="ปิรามิดอายุ (หญิง / ชาย)" theme={chartTheme} height={360}
                          option={pyramidOption(pyr.female, pyr.male, P)}
                          columns={[
                            { title: 'ช่วงอายุ', dataIndex: 'band' },
                            { title: 'หญิง', dataIndex: 'female', align: 'right' },
                            { title: 'ชาย', dataIndex: 'male', align: 'right' },
                            { title: 'รวม', dataIndex: 'total', align: 'right' },
                          ]}
                          rows={I.AGE_BANDS.map((b, i) => ({
                            key: b, band: `${b} ปี`, female: num(pyr.female[i]), male: num(pyr.male[i]), total: num(pyr.female[i] + pyr.male[i]),
                          })).reverse()}
                        />
                      </Col>
                      <Col xs={24} lg={13}>
                        <ChartCard
                          title={`ผู้เกษียณรายปีงบ ${forecast.fys[0]}–${forecast.fys.at(-1)}`} theme={chartTheme} height={360}
                          note={<Text type="secondary" style={{ fontSize: 12 }}>เกษียณ ณ สิ้นปีงบที่อายุครบ 60 ปี (เกิด 2 ต.ค. เป็นต้นไปเกษียณปีงบถัดไป)</Text>}
                          option={retireOption(forecast.fys, forecast.byType, L.types, P)}
                          columns={[
                            { title: 'ปีงบ', dataIndex: 'fy', fixed: 'left', width: 70 },
                            ...typeIdsInForecast.map(id => ({ title: forecastTypeName(id), dataIndex: `t${id}`, align: 'right' as const })),
                            { title: 'รวม', dataIndex: 'total', align: 'right' },
                          ]}
                          rows={forecast.fys.map((fy, i) => ({
                            key: String(fy), fy,
                            ...Object.fromEntries(typeIdsInForecast.map(id => [`t${id}`, num(forecast.byType.get(id)![i])])),
                            total: num(typeIdsInForecast.reduce<number>((s, id) => s + forecast.byType.get(id)![i], 0)),
                          }))}
                        />
                      </Col>
                    </Row>
                    <Card
                      className="mt-4" style={{ borderRadius: 14 }}
                      title={(
                        <span>
                          <WarningOutlined className="mr-2" style={{ color: '#d97706' }} />
                          รายชื่อที่ต้องตรวจข้อมูลอายุ{issues?.list && ` (${num(scopedIssues.length)} คน)`}
                        </span>
                      )}
                      extra={<Text type="secondary" style={{ fontSize: 12 }}>แก้ไขจะเปิดทะเบียนบุคลากรในแท็บใหม่ · แก้เสร็จกดรีเฟรช</Text>}
                    >
                      {issues?.error
                        ? <Alert type="error" showIcon title="โหลดรายชื่อไม่สำเร็จ" description={issues.error.message} />
                        : (
                          <Table<I.AgeIssue>
                            rowKey="id" size="small" columns={issueColumns} dataSource={scopedIssues}
                            loading={issuesLoading} scroll={{ x: 1150 }}
                            pagination={scopedIssues.length > 10 ? { pageSize: 10 } : false}
                            locale={{ emptyText: issuesLoading ? ' ' : 'ไม่พบบุคลากรที่ข้อมูลอายุผิดปกติในขอบเขตนี้' }}
                          />
                        )}
                    </Card>
                  </>
                ),
              },
              {
                key: 'position', label: 'ตำแหน่ง',
                children: (
                  <ChartCard
                    title={`${pos.rows.length} ตำแหน่งที่มีบุคลากรมากที่สุด แยกหญิง / ชาย`} theme={chartTheme}
                    height={barHeight(pos.rows.length, 260)}
                    note={pos.others.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        อีก {num(pos.others.length)} ตำแหน่ง รวม {num(pos.others.reduce((s, r) => s + r.total, 0))} คน ไม่ได้แสดงในกราฟ
                      </Text>
                    )}
                    option={positionOption(pos.rows, P)}
                    columns={[
                      { title: 'ตำแหน่ง', dataIndex: 'name' },
                      { title: 'หญิง', dataIndex: 'female', align: 'right' },
                      { title: 'ชาย', dataIndex: 'male', align: 'right' },
                      { title: 'รวม', dataIndex: 'total', align: 'right' },
                    ]}
                    rows={[...pos.rows, ...pos.others].map(r => ({
                      key: String(r.id ?? 'none'), name: r.name, female: num(r.female), male: num(r.male), total: num(r.total),
                    }))}
                  />
                ),
              },
              {
                key: 'exit', label: `การออกจากงาน (${num(k.exits)})`,
                children: (
                  <>
                    <Alert
                      type={k.exitsDated < k.exits ? 'warning' : 'info'} showIcon className="mb-3"
                      title={`ออกจากงาน ${num(k.exits)} คน · ${fyLabel}`}
                      description={k.exits === 0
                        ? 'ไม่มีผู้ออกจากงานในขอบเขตและปีงบที่เลือก'
                        : `มีวันที่สิ้นสุดการปฏิบัติงานจริง ${num(k.exitsDated)} จาก ${num(k.exits)} คน — ที่เหลือใช้วันที่แก้ไขข้อมูลล่าสุดแทน ปีงบของคนกลุ่มนั้นจึงอาจคลาดได้`}
                    />
                    {k.exits > 0 && (
                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={10}>
                          <ChartCard
                            title="สาเหตุการออกจากงาน" theme={chartTheme} height={barHeight(reasons.length, 200)}
                            option={singleBarOption(reasons.map(r => r.name), reasons.map(r => r.n), P,
                              i => `${pct1(share(reasons[i].n, k.exits))}% ของผู้ที่ออก`,
                              reasons.map(r => reasonColor(data.exit_status_ids, r.id, P)))}
                            columns={[
                              { title: 'สาเหตุ', dataIndex: 'name' },
                              { title: 'คน', dataIndex: 'n', align: 'right' },
                              { title: 'สัดส่วน', dataIndex: 'pct', align: 'right' },
                            ]}
                            rows={reasons.map(r => ({ key: String(r.id ?? 'none'), name: r.name, n: num(r.n), pct: `${pct1(share(r.n, k.exits))}%` }))}
                          />
                        </Col>
                        <Col xs={24} lg={14}>
                          <ChartCard
                            title={`ผู้ออกจากงานแยกตาม${levelLabel} ตามสาเหตุ`} theme={chartTheme} height={barHeight(exitUnits.length, 200) + 24}
                            option={exitByUnitOption(exitUnits, reasons, data.exit_status_ids, P)}
                            columns={[
                              { title: levelLabel, dataIndex: 'name', fixed: 'left', width: 200 },
                              ...reasons.map(x => ({ title: x.name, dataIndex: `r${x.id}`, align: 'right' as const })),
                              { title: 'รวม', dataIndex: 'exits', align: 'right' },
                              { title: 'คงอยู่', dataIndex: 'staff', align: 'right' },
                              { title: 'อัตราการออก', dataIndex: 'rate', align: 'right' },
                            ]}
                            rows={exitUnits.map(r => ({
                              key: r.key, name: r.name,
                              ...Object.fromEntries(reasons.map(x => [`r${x.id}`, num(r.exitsBy.get(x.id) ?? 0)])),
                              exits: num(r.exits), staff: num(r.staff), rate: `${pct1(r.exitRate)}%`,
                            }))}
                          />
                        </Col>
                      </Row>
                    )}
                  </>
                ),
              },
              {
                key: 'quality', label: 'คุณภาพข้อมูล',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={9}>
                      <Card title="ความครบของข้อมูลบุคลากร" style={{ borderRadius: 14, height: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                          ช่องที่ขาดมากทำให้การวิเคราะห์ส่วนที่ใช้ช่องนั้นต่ำกว่าความจริง
                        </Text>
                        {cover.map(c => (
                          <div key={c.key} className="mb-3">
                            <div className="flex justify-between">
                              <Text>{c.label}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>{num(c.have)} / {num(c.total)} คน</Text>
                            </div>
                            <Progress percent={floorPct(c.pct)} size="small" strokeColor={P.single} />
                            {c.note && <Text type="warning" style={{ fontSize: 12 }}><WarningOutlined /> {c.note}</Text>}
                          </div>
                        ))}
                      </Card>
                    </Col>
                    <Col xs={24} lg={15}>
                      <Card title={`ความครบแยกตาม${levelLabel} (ขาดมากก่อน)`} style={{ borderRadius: 14, height: '100%' }}>
                        <Table
                          rowKey="key" size="small" dataSource={unitCover}
                          pagination={unitCover.length > 15 ? { pageSize: 15 } : false}
                          columns={[
                            { title: levelLabel, dataIndex: 'name' },
                            { title: 'คน', dataIndex: 'staff', align: 'right', width: 70, render: (v: number) => num(v) },
                            ...(['birth', 'submajor', 'level', 'hire'] as const).map(key => ({
                              title: { birth: 'วันเกิด', submajor: 'หน่วยงาน', level: 'ระดับ', hire: 'วันบรรจุ' }[key],
                              dataIndex: key, align: 'right' as const, width: 90,
                              sorter: (a: I.UnitCoverage, b: I.UnitCoverage) => a[key] - b[key],
                              render: (v: number) => <Text type={v < 50 ? 'danger' : v < 90 ? 'warning' : undefined}>{floorPct(v)}%</Text>,
                            })),
                          ]}
                        />
                      </Card>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
          </ConfigProvider>
        </Card>
      </div>
    )
  })()

  return (
    <div className="min-h-screen w-full bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8 max-w-375 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: 'Dashboard ภาพรวม' },
          ]}
          className="mb-4"
        />

        <Card
          style={{
            background: 'linear-gradient(135deg, #006a5a 0%, #0d9488 50%, #14b8a6 100%)',
            border: 'none', borderRadius: 16, marginBottom: 16,
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={16}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}>
                  <FaChartPie className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>HR Dashboard ภาพรวม</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                    วิเคราะห์กำลังคนตามหน่วยงาน — เลือกขอบเขต หรือคลิกในตาราง/ข้อค้นพบเพื่อเจาะลึก
                    {data && ` · ข้อมูล ณ ${thaiDate(data.as_of)}`}
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="text-right flex items-center justify-end gap-2">
                <Button
                  ghost icon={<ReloadOutlined />} loading={loading} onClick={reload}
                  style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}
                >
                  รีเฟรช
                </Button>
                {data && (
                  <Tag style={{ background: 'rgba(255,255,255,0.18)', borderColor: 'transparent', color: '#fff', fontSize: 13, padding: '4px 12px' }}>
                    ปีงบประมาณ {data.current_fy}
                  </Tag>
                )}
              </div>
            </Col>
          </Row>
        </Card>

        {body}
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
