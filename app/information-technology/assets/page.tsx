'use client'
// ทะเบียนทรัพย์สินงาน IT (IT Asset Register) — ครุภัณฑ์หมวดคอมพิวเตอร์จากทะเบียนครุภัณฑ์ V3 (ปัจจุบัน) + V2 (เดิม)
// ข้อมูลอ่านอย่างเดียวจากระบบครุภัณฑ์ (แก้ไขที่ระบบครุภัณฑ์) · เฉพาะเจ้าหน้าที่ IT (menuAccess + proxy.ts + backend requireRoles)
// ชนิดอุปกรณ์ IT จัดที่ backend จากชื่อประเภท/ชื่อครุภัณฑ์ · อายุการใช้งาน = นับจากวันที่ได้รับ เทียบอายุตามทะเบียน (ปี)
// จำนวนครั้งแจ้งซ่อม = จับเลขครุภัณฑ์กับคำขอในระบบแจ้งซ่อม
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Col, ConfigProvider, Descriptions, Drawer, Empty, Input, Result, Row, Select, Space, Table, Tag, Tooltip, Typography, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ClearOutlined, HomeOutlined, ReloadOutlined, SearchOutlined, ToolOutlined, WarningOutlined } from '@ant-design/icons'
import { FaBoxes, FaDesktop, FaFileExcel, FaMicrochip, FaMoneyBillWave, FaTools } from 'react-icons/fa'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import EChart from '@/app/components/EChart'
import { StatCard } from '@/app/components/StatCard'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { PALETTES, clip, escHtml } from '@/app/lib/chartKit'
import { AGE_LABEL, KIND_LABEL, SOURCE_LABEL, STATUS_COLOR, STATUS_FILTERS, ageState, ageYears, money, short, thDate, type AgeState, type Asset, type Kind } from './assetShared'

const { Title, Text } = Typography

// ช่วงอายุสำหรับกราฟ — ปีเต็มนับจากวันที่ได้รับ
const AGE_BUCKETS = [
  { label: '< 1 ปี', lo: 0, hi: 1 }, { label: '1–2 ปี', lo: 1, hi: 2 }, { label: '2–3 ปี', lo: 2, hi: 3 }, { label: '3–5 ปี', lo: 3, hi: 5 },
  { label: '5–7 ปี', lo: 5, hi: 7 }, { label: '7–10 ปี', lo: 7, hi: 10 }, { label: '10 ปีขึ้นไป', lo: 10, hi: Infinity },
]

const PageContent = ({ isDark }: { isDark: boolean }) => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<Asset[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [source, setSource] = useState<'all' | 'v3' | 'v2'>('all')
  const [kind, setKind] = useState<Kind | null>(null)
  const [dept, setDept] = useState<string | null>(null)
  const [status, setStatus] = useState('held')
  const [age, setAge] = useState<AgeState | null>(null)
  const [detail, setDetail] = useState<Asset | null>(null)
  const P = PALETTES[isDark ? 'dark' : 'light']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/it/assets')
      if (res.status === 403) { setDenied(true); return }
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'โหลดทะเบียนครุภัณฑ์ไม่สำเร็จ')
      setRows(json.data)
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const statusMatch = STATUS_FILTERS.find(s => s.value === status)!.match
  // ฐานของสถิติ = ตัวกรองทะเบียน + สถานะ (การ์ดและกราฟไม่ขึ้นกับคำค้น/ชนิด/หน่วยงาน/อายุ เพื่อใช้เป็นภาพรวมแล้วกดกรองต่อ)
  const base = useMemo(() => (rows ?? []).filter(a => (source === 'all' || a.source === source) && statusMatch(a.status_group)), [rows, source, statusMatch])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return base.filter(a => (!kind || a.kind === kind) && (!dept || (a.department ?? 'ไม่ระบุหน่วยงาน') === dept) && (!age || ageState(a) === age)
      && (!s || [a.noid, a.name, a.model, a.type, a.department, a.location, a.docno, a.supplier, a.notes].some(v => v?.toLowerCase().includes(s))))
  }, [base, q, kind, dept, age])
  const active = !!(q.trim() || kind || dept || age || source !== 'all' || status !== 'held')
  const clear = () => { setQ(''); setKind(null); setDept(null); setAge(null); setSource('all'); setStatus('held') }

  const held = (rows ?? []).filter(a => (source === 'all' || a.source === source) && a.status_group !== 'disposed')
  const stats = {
    held: held.length,
    value: held.reduce((n, a) => n + (a.price ?? 0), 0),
    expired: held.filter(a => ageState(a) === 'expired').length,
    repair: held.filter(a => a.status_group === 'repair').length,
  }

  // ── กราฟ (จากชุดที่กรองแล้ว) ──
  const count = <K extends string>(list: Asset[], f: (a: Asset) => K) => { const m = new Map<K, number>(); for (const a of list) m.set(f(a), (m.get(f(a)) ?? 0) + 1); return m }
  const kindCounts = [...count(filtered, a => a.kind)].sort((a, b) => b[1] - a[1])
  const deptCounts = [...count(filtered, a => a.department ?? 'ไม่ระบุหน่วยงาน')].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const ageCounts = AGE_BUCKETS.map(b => {
    const inB = filtered.filter(a => { const y = ageYears(a.receive); return y != null && y >= b.lo && y < b.hi })
    return { ...b, total: inB.length, expired: inB.filter(a => ageState(a) === 'expired').length }
  })
  const tip = { backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text } }
  const hbar = (data: [string, number][], color: string, labelOf: (k: string) => string) => ({
    backgroundColor: 'transparent', tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { dataIndex: number }[]) => `${escHtml(labelOf(data[p[0].dataIndex][0]))}<br/><b>${data[p[0].dataIndex][1].toLocaleString('th-TH')}</b> รายการ<br/><i>กดเพื่อกรอง</i>` },
    grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, axisLabel: { color: P.muted, fontSize: 11 }, splitLine: { lineStyle: { color: P.grid } } },
    yAxis: { type: 'category', inverse: true, data: data.map(d => clip(labelOf(d[0]), 24)), axisLabel: { color: P.text, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: P.grid } } },
    series: [{ type: 'bar', barMaxWidth: 16, cursor: 'pointer', data: data.map(d => d[1]), itemStyle: { color, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', fontSize: 10.5, color: P.muted, formatter: (p: { value: number }) => p.value.toLocaleString('th-TH') } }],
  })
  const kindOption = hbar(kindCounts, P.types[0], k => KIND_LABEL[k as Kind])
  const deptOption = hbar(deptCounts, P.types[2], k => k)
  const ageOption = {
    backgroundColor: 'transparent',
    legend: { bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: P.muted, fontSize: 11 } },
    tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { dataIndex: number }[]) => { const b = ageCounts[p[0].dataIndex]; return `อายุ ${b.label}<br/>ทั้งหมด <b>${b.total.toLocaleString('th-TH')}</b> รายการ<br/>ครบอายุการใช้งานแล้ว <b>${b.expired.toLocaleString('th-TH')}</b>` } },
    grid: { left: 8, right: 8, top: 16, bottom: 32, containLabel: true },
    xAxis: { type: 'category', data: ageCounts.map(b => b.label), axisLabel: { color: P.text, fontSize: 10.5, interval: 0 }, axisTick: { show: false }, axisLine: { lineStyle: { color: P.grid } } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: P.muted, fontSize: 11 }, splitLine: { lineStyle: { color: P.grid } } },
    series: [
      { name: 'ยังไม่ครบอายุ', type: 'bar', stack: 'a', barMaxWidth: 36, data: ageCounts.map(b => b.total - b.expired), itemStyle: { color: P.types[0], borderColor: P.surface, borderWidth: 1 } },
      { name: 'ครบอายุการใช้งานแล้ว', type: 'bar', stack: 'a', barMaxWidth: 36, data: ageCounts.map(b => b.expired), itemStyle: { color: P.types[3], borderColor: P.surface, borderWidth: 1, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', fontSize: 10.5, color: P.muted, formatter: (p: { dataIndex: number }) => ageCounts[p.dataIndex].total ? ageCounts[p.dataIndex].total.toLocaleString('th-TH') : '' } },
    ],
  }

  const columns: ColumnsType<Asset> = [
    { title: 'เลขครุภัณฑ์', dataIndex: 'noid', width: 190, fixed: 'left', sorter: (a, b) => a.noid.localeCompare(b.noid),
      render: (v: string, a) => <><a onClick={() => setDetail(a)} style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{v}</a><div><Tag style={{ margin: 0, fontSize: 11 }} color={a.source === 'v3' ? 'blue' : undefined}>{SOURCE_LABEL[a.source]}</Tag></div></> },
    { title: 'ชื่อ / รุ่น', dataIndex: 'name', width: 260, render: (v: string | null, a) => <><div>{v ?? '-'}</div>{a.model && <Text type="secondary" style={{ fontSize: 12 }}>{a.model}</Text>}</> },
    { title: 'ชนิด', dataIndex: 'kind', width: 150, render: (k: Kind, a) => <Tooltip title={a.type}>{KIND_LABEL[k]}</Tooltip> },
    { title: 'หน่วยงาน / ที่ตั้ง', dataIndex: 'department', width: 230, sorter: (a, b) => (a.department ?? '').localeCompare(b.department ?? ''),
      render: (v: string | null, a) => <><div>{v ?? '-'}</div>{a.location && <Text type="secondary" style={{ fontSize: 12 }}>{a.location}</Text>}</> },
    { title: 'วันที่ได้รับ / อายุ', dataIndex: 'receive', width: 160, sorter: (a, b) => (a.receive ?? '').localeCompare(b.receive ?? ''),
      render: (v: string | null, a) => { const y = ageYears(v); const st = ageState(a); return <><div>{thDate(v)}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{y == null ? '-' : `${y.toFixed(1)} ปี`}{a.life_years ? ` / ${a.life_years} ปี` : ''}</Text>
        {st === 'expired' && <Tag color="orange" style={{ marginLeft: 6, fontSize: 11 }}>ครบอายุ</Tag>}{st === 'soon' && <Tag color="gold" style={{ marginLeft: 6, fontSize: 11 }}>ใกล้ครบ</Tag>}</> } },
    { title: 'ราคา (บาท)', dataIndex: 'price', width: 120, align: 'right', sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0), render: (v: number | null) => v == null ? '-' : money(v) },
    { title: 'สถานะ', dataIndex: 'status', width: 140, render: (v: string | null, a) => <Tag color={STATUS_COLOR[a.status_group]} style={{ margin: 0 }}>{v ?? '-'}</Tag> },
    { title: 'แจ้งซ่อม', dataIndex: 'repairs', width: 96, align: 'center', sorter: (a, b) => a.repairs - b.repairs,
      render: (n: number, a) => n ? <Tooltip title={`ล่าสุด ${thDate(a.last_repair)}${a.open_repairs ? ` · ค้าง ${a.open_repairs} งาน` : ''}`}><Tag color={a.open_repairs ? 'red' : 'purple'} style={{ margin: 0 }}><ToolOutlined /> {n}</Tag></Tooltip> : <Text type="secondary">-</Text> },
  ]

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered.map(a => ({
      'ทะเบียน': SOURCE_LABEL[a.source], 'เลขครุภัณฑ์': a.noid, 'ชื่อครุภัณฑ์': a.name ?? '', 'ยี่ห้อ/รุ่น': a.model ?? '', 'ประเภท (ทะเบียน)': a.type ?? '',
      'ชนิดอุปกรณ์ IT': KIND_LABEL[a.kind], 'หน่วยงาน': a.department ?? '', 'สถานที่ตั้ง': a.location ?? '', 'วันที่ได้รับ': a.receive ?? '', 'ปีงบ': a.fy ?? '',
      'อายุ (ปี)': (() => { const y = ageYears(a.receive); return y == null ? '' : Math.round(y * 10) / 10 })(), 'อายุใช้งานตามทะเบียน (ปี)': a.life_years ?? '',
      'สถานะอายุ': AGE_LABEL[ageState(a)], 'ราคา (บาท)': a.price ?? '', 'ประเภทเงิน': a.money_type ?? '', 'ผู้ขาย': a.supplier ?? '', 'เลขที่เอกสาร': a.docno ?? '',
      'สถานะ': a.status ?? '', 'จำนวนครั้งแจ้งซ่อม': a.repairs, 'หมายเหตุ': a.notes ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'IT Asset Register')
    XLSX.writeFile(wb, `ทะเบียนทรัพย์สินงาน IT-${new Date().toLocaleDateString('sv-SE')}.xlsx`, { compression: true })
  }

  if (denied) return <Result status="403" title="ไม่มีสิทธิ์เข้าถึง" subTitle="ทะเบียนทรัพย์สินงาน IT เปิดให้เฉพาะเจ้าหน้าที่งานคอมพิวเตอร์และผู้ดูแลระบบ" />
  const deptOpts = [...new Set((rows ?? []).map(a => a.department ?? 'ไม่ระบุหน่วยงาน'))].sort((a, b) => a.localeCompare(b, 'th')).map(d => ({ value: d, label: d }))

  return (
    <>
      <Card style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%)', border: 'none', borderRadius: 16, marginBottom: 20 }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}>
            <FaBoxes className="text-2xl text-white" />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>ทะเบียนทรัพย์สินงาน IT</Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>ครุภัณฑ์คอมพิวเตอร์จากทะเบียนครุภัณฑ์ V3 (ปัจจุบัน) และ V2 (เดิม) · ข้อมูลอ่านอย่างเดียว แก้ไขที่ระบบครุภัณฑ์</Text>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>โหลดใหม่</Button>
            <Button icon={<FaFileExcel />} onClick={exportExcel} disabled={!filtered.length}>Excel ({filtered.length.toLocaleString('th-TH')})</Button>
          </Space>
        </div>
      </Card>

      {!rows ? <Card loading style={{ borderRadius: 16 }} /> : <>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} lg={6}><StatCard accent="sky" isDark={isDark} label="ถือครองอยู่" value={stats.held.toLocaleString('th-TH')} suffix="รายการ" icon={<FaDesktop />}
            onClick={() => { clear() }} footer={<Text type="secondary" style={{ fontSize: 12 }}>ไม่รวมที่ขายทอดตลาด/ตัดออกจากทะเบียน</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="emerald" isDark={isDark} label="มูลค่าตามราคาที่ได้มา" value={short(stats.value)} suffix="บาท" icon={<FaMoneyBillWave />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>รวมราคาต่อหน่วยของที่ถือครองอยู่</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="amber" isDark={isDark} label="ครบอายุการใช้งานแล้ว" value={stats.expired.toLocaleString('th-TH')} suffix="รายการ" icon={<WarningOutlined />}
            onClick={() => { setStatus('held'); setAge('expired') }} footer={<Text type="secondary" style={{ fontSize: 12 }}>{stats.held ? `${Math.round(stats.expired / stats.held * 100)}% ของที่ถือครอง · กดเพื่อดูรายการ` : '-'}</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="rose" isDark={isDark} label="ส่งซ่อม / แจ้งชำรุด" value={stats.repair.toLocaleString('th-TH')} suffix="รายการ" icon={<FaTools />}
            onClick={() => setStatus('repair')} footer={<Text type="secondary" style={{ fontSize: 12 }}>สถานะในทะเบียนครุภัณฑ์ · กดเพื่อดูรายการ</Text>} /></Col>
        </Row>

        <Card style={{ borderRadius: 16, marginBottom: 16 }} styles={{ body: { padding: 12 } }}>
          <div className="asset-filters">
            <Input allowClear prefix={<SearchOutlined />} placeholder="ค้นหาเลขครุภัณฑ์ ชื่อ รุ่น ที่ตั้ง เลขเอกสาร…" value={q} onChange={e => setQ(e.target.value)} aria-label="ค้นหาครุภัณฑ์" />
            <Select value={source} onChange={setSource} aria-label="ทะเบียน" options={[{ value: 'all', label: 'ทุกทะเบียน (V3 + V2)' }, { value: 'v3', label: 'ทะเบียน V3 (ปัจจุบัน)' }, { value: 'v2', label: 'ทะเบียน V2 (เดิม)' }]} />
            <Select value={status} onChange={setStatus} aria-label="สถานะ" options={STATUS_FILTERS.map(s => ({ value: s.value, label: s.label }))} />
            <Select allowClear placeholder="ทุกชนิดอุปกรณ์" value={kind ?? undefined} onChange={v => setKind(v ?? null)} aria-label="ชนิดอุปกรณ์"
              options={(Object.keys(KIND_LABEL) as Kind[]).map(k => ({ value: k, label: KIND_LABEL[k] }))} />
            <Select allowClear showSearch placeholder="ทุกหน่วยงาน" value={dept ?? undefined} onChange={v => setDept(v ?? null)} aria-label="หน่วยงาน" options={deptOpts} popupMatchSelectWidth={false} />
            <Select allowClear placeholder="ทุกช่วงอายุ" value={age ?? undefined} onChange={v => setAge(v ?? null)} aria-label="อายุการใช้งาน"
              options={(['expired', 'soon', 'ok', 'unknown'] as AgeState[]).map(s => ({ value: s, label: AGE_LABEL[s] }))} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13 }} data-testid="asset-count">แสดง <b>{filtered.length.toLocaleString('th-TH')}</b> รายการ · มูลค่า <b>{money(filtered.reduce((n, a) => n + (a.price ?? 0), 0))}</b> บาท</Text>
            {active && <Button size="small" type="link" icon={<ClearOutlined />} onClick={clear}>ล้างตัวกรอง</Button>}
          </div>
        </Card>

        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={8}>
            <Card title="ชนิดอุปกรณ์" size="small" style={{ borderRadius: 16, height: '100%' }} extra={<Text type="secondary" style={{ fontSize: 12 }}>กดแท่งเพื่อกรอง</Text>}>
              {kindCounts.length ? <EChart theme={isDark ? 'dark' : 'light'} height={Math.max(220, kindCounts.length * 28 + 30)} option={kindOption}
                onClick={p => { const k = kindCounts[p.dataIndex]; if (k) setKind(k[0]) }} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="อายุการใช้งาน (นับจากวันที่ได้รับ)" size="small" style={{ borderRadius: 16, height: '100%' }}>
              {filtered.length ? <EChart theme={isDark ? 'dark' : 'light'} height={280} option={ageOption} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              <Text type="secondary" style={{ fontSize: 12 }}>ครบอายุ = อายุตั้งแต่ได้รับ ≥ อายุการใช้งานตามทะเบียน ใช้วางแผนทดแทน</Text>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="หน่วยงานที่ถือครองมากที่สุด 10 อันดับ" size="small" style={{ borderRadius: 16, height: '100%' }} extra={<Text type="secondary" style={{ fontSize: 12 }}>กดแท่งเพื่อกรอง</Text>}>
              {deptCounts.length ? <EChart theme={isDark ? 'dark' : 'light'} height={Math.max(220, deptCounts.length * 28 + 30)} option={deptOption}
                onClick={p => { const d = deptCounts[p.dataIndex]; if (d) setDept(d[0]) }} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>
          </Col>
        </Row>

        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 12 } }}>
          <Table size="small" rowKey="key" dataSource={filtered} columns={columns} scroll={{ x: 1350 }} loading={loading}
            pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100], showTotal: t => `${t.toLocaleString('th-TH')} รายการ` }}
            onRow={a => ({ onDoubleClick: () => setDetail(a) })}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่พบครุภัณฑ์ตามตัวกรอง" /> }} />
        </Card>
      </>}

      <Drawer open={!!detail} onClose={() => setDetail(null)} size={520} title={detail ? <span style={{ fontFamily: 'monospace' }}>{detail.noid}</span> : ''}>
        {detail && <>
          <Descriptions column={1} size="small" bordered styles={{ label: { width: 150 } }} items={[
            { key: 'src', label: 'ทะเบียน', children: SOURCE_LABEL[detail.source] },
            { key: 'name', label: 'ชื่อครุภัณฑ์', children: detail.name ?? '-' },
            { key: 'model', label: 'ยี่ห้อ / รุ่น', children: detail.model ?? '-' },
            { key: 'type', label: 'ประเภท (ทะเบียน)', children: detail.type ?? '-' },
            { key: 'kind', label: 'ชนิดอุปกรณ์ IT', children: KIND_LABEL[detail.kind] },
            { key: 'dept', label: 'หน่วยงาน', children: detail.department ?? '-' },
            { key: 'loc', label: 'สถานที่ตั้ง', children: detail.location ?? '-' },
            { key: 'recv', label: 'วันที่ได้รับ', children: `${thDate(detail.receive)}${detail.fy ? ` · ปีงบ ${detail.fy}` : ''}` },
            { key: 'age', label: 'อายุ', children: (() => { const y = ageYears(detail.receive); return `${y == null ? '-' : `${y.toFixed(1)} ปี`}${detail.life_years ? ` จากอายุการใช้งาน ${detail.life_years} ปี` : ''} · ${AGE_LABEL[ageState(detail)]}` })() },
            { key: 'price', label: 'ราคา', children: detail.price == null ? '-' : `${money(detail.price)} บาท` },
            { key: 'money', label: 'ประเภทเงิน', children: detail.money_type ?? '-' },
            { key: 'sup', label: 'ผู้ขาย', children: detail.supplier ?? '-' },
            { key: 'doc', label: 'เลขที่เอกสาร', children: detail.docno ?? '-' },
            { key: 'st', label: 'สถานะ', children: <Tag color={STATUS_COLOR[detail.status_group]}>{detail.status ?? '-'}</Tag> },
            { key: 'rep', label: 'แจ้งซ่อมในระบบ', children: detail.repairs ? `${detail.repairs} ครั้ง · ล่าสุด ${thDate(detail.last_repair)}${detail.open_repairs ? ` · ค้าง ${detail.open_repairs} งาน` : ''}` : 'ยังไม่เคยแจ้งซ่อม' },
            { key: 'note', label: 'หมายเหตุ', children: detail.notes ?? '-' },
          ]} />
          <Space style={{ marginTop: 16 }} wrap>
            <Link href="/information-technology/maintenance/manage"><Button icon={<ToolOutlined />}>ไปหน้าจัดการงานซ่อม</Button></Link>
            <Link href={`/information-technology/assets/risk?q=${encodeURIComponent(detail.noid)}`}><Button icon={<WarningOutlined />}>ประเมินความเสี่ยง</Button></Link>
          </Space>
        </>}
      </Drawer>

      <style jsx global>{`
        .asset-filters { display: grid; grid-template-columns: 2fr repeat(5, minmax(0, 1fr)); gap: 8px; }
        @media (max-width: 1199px) { .asset-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 575px) { .asset-filters { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
    </>
  )
}

export default function ItAssetRegisterPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#0369a1', borderRadius: 8 } }}>
      <App>
        <div className="min-h-screen w-full bg-app-bg text-app-text">
          <Navbar />
          <div className="p-4 md:p-8 max-w-[1500px] mx-auto">
            <Breadcrumb className="mb-4" items={[
              { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
              { title: <><FaMicrochip className="inline mr-1" /> งานคอมพิวเตอร์ฯ</> },
              { title: 'ทะเบียนทรัพย์สินงาน IT' },
            ]} />
            <PageContent isDark={isDark} />
          </div>
        </div>
      </App>
    </ConfigProvider>
  )
}
