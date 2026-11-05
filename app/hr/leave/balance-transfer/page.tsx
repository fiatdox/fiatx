'use client'
// ตรวจสอบการโอนยอดวันลาพักผ่อนสะสม — ใครยังไม่ได้โอน/ตั้งยอดในปีงบนี้ แยกตามประเภทบุคลากร
// หน้านี้อ่านอย่างเดียว · ปุ่ม "เพิ่มยอด / ตั้งยอด" เปิดหน้าต่างให้ HR กรอกเอง (BalanceEditModal)
// เฉพาะ ADMIN/HR (ตรงกับ requireRoles ฝั่ง backend)
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Cookies from 'js-cookie'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import {
  Alert, App, Button, Card, Col, Empty, Input, Progress, Row, Segmented, Select, Space, Table, Tag, Tooltip, Typography,
} from 'antd'
import {
  HomeOutlined, SearchOutlined, PlusOutlined, EditOutlined, CloseCircleOutlined, HistoryOutlined,
  ReloadOutlined, FileExcelOutlined, CloudSyncOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import { normalizeRoles } from '@/app/lib/menuAccess'
import BalanceEditModal, { type BalanceEditTarget } from '../BalanceEditModal'

const { Title, Text } = Typography

const ALLOWED_ROLES = ['ADMIN', 'HR']

type Status = 'imported' | 'hr' | 'rolled' | 'auto' | 'none'

interface TransferRow {
  user_id: number
  name: string
  position_name: string | null
  user_type_id: number | null
  user_type_name: string
  mission_name: string | null
  major_name: string | null
  submajor_name: string | null
  service_start: string | null
  status: Status
  missing: boolean
  balance_id: number | null
  carried_in: number | null
  entitled: number | null
  used: number | null
  remaining: number | null
  note: string | null
  rule: { max_days_per_year: number; carry_over: boolean; carry_over_max_days: number | null } | null
  has_right: boolean
}

type TypeSummary = { user_type_id: number | null; user_type_name: string; total: number; missing: number; missing_with_right: number } & Record<Status, number>

interface TransferData {
  fiscal_year: number
  leave_type_id: number
  total: number
  missing: number
  missing_with_right: number
  by_type: TypeSummary[]
  rows: TransferRow[]
}

const STATUS_META: Record<Status, { label: string; color: string; desc: string }> = {
  imported: { label: 'โอนจากโปรแกรมเดิม', color: 'green', desc: 'มียอดสะสมจากโปรแกรมการลาเดิมแล้ว' },
  hr: { label: 'HR ตั้งยอดเอง', color: 'blue', desc: 'HR เพิ่มหรือแก้ยอดในระบบนี้แล้ว' },
  rolled: { label: 'ยกยอดจากปีก่อน', color: 'cyan', desc: 'ระบบยกยอดคงเหลือจากปีงบก่อนให้' },
  auto: { label: 'มีเฉพาะจากใบลา', color: 'orange', desc: 'ระบบสร้างแถวตอนยื่นใบลา แต่ยังไม่ได้ตั้งยอดยกมา' },
  none: { label: 'ยังไม่มีข้อมูล', color: 'red', desc: 'ยังไม่มียอดลาพักผ่อนของปีงบนี้เลย' },
}
const STATUS_ORDER: Status[] = ['none', 'auto', 'imported', 'hr', 'rolled']

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 1 })
const fmtDate = (s: string | null) => s ? dayjs(s).toDate().toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-'
/** อายุงานถึงวันนี้ เช่น "3 ปี 2 เดือน" */
const serviceAge = (s: string | null) => {
  if (!s) return null
  const months = dayjs().diff(dayjs(s), 'month')
  if (months < 0) return null
  const y = Math.floor(months / 12), m = months % 12
  return [y ? `${y} ปี` : '', m ? `${m} เดือน` : '', !y && !m ? 'ไม่ถึงเดือน' : ''].filter(Boolean).join(' ')
}

const PageContent = () => {
  const { message } = App.useApp()

  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  useEffect(() => {
    let ok = false
    try { ok = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles).some(r => ALLOWED_ROLES.includes(r)) } catch { /* cookie เสีย */ }
    void Promise.resolve().then(() => setHasAccess(ok))
  }, [])

  const [fiscalYears, setFiscalYears] = useState<number[]>([])
  const [fiscalYear, setFiscalYear] = useState<number | null>(null)
  useEffect(() => {
    if (!hasAccess) return
    fetch('/api/v1/hr/leave-balances/meta')
      .then(r => r.json())
      .then(j => { if (j?.success) { setFiscalYears(j.data.fiscal_years); setFiscalYear(j.data.current_fiscal_year) } })
      .catch(() => message.error('ไม่สามารถโหลดข้อมูลตั้งต้นได้'))
  }, [hasAccess, message])

  const [reloadKey, setReloadKey] = useState(0)
  const queryKey = fiscalYear ? `${fiscalYear}|${reloadKey}` : null
  const [data, setData] = useState<{ key: string; value: TransferData | null; error?: string } | null>(null)
  useEffect(() => {
    if (!hasAccess || !queryKey || !fiscalYear) return
    let alive = true
    fetch(`/api/v1/hr/leave-balances/transfer-status?fiscal_year=${fiscalYear}`)
      .then(r => r.json())
      .then(j => { if (alive) setData(j?.success ? { key: queryKey, value: j.data } : { key: queryKey, value: null, error: j?.message ?? 'โหลดข้อมูลไม่สำเร็จ' }) })
      .catch(() => { if (alive) setData({ key: queryKey, value: null, error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' }) })
    return () => { alive = false }
  }, [hasAccess, queryKey, fiscalYear])
  const loading = !!queryKey && data?.key !== queryKey
  const td = data?.value ?? null
  const reload = () => setReloadKey(k => k + 1)

  // ── ตัวกรอง ────────────────────────────────────────────────────────────────
  const [view, setView] = useState<'missing' | 'done' | 'all'>('missing')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)       // user_type_id เป็นข้อความ ('none' = ไม่ระบุ)
  const [statusFilter, setStatusFilter] = useState<Status | null>(null)
  const [rightOnly, setRightOnly] = useState(true)
  const [search, setSearch] = useState('')
  // สังกัด — เลือกไล่จากกลุ่มภารกิจ → กลุ่มงาน → หน่วยงาน/ตึก (ตัวเลือกชั้นล่างแสดงเฉพาะที่อยู่ใต้ชั้นบนที่เลือก)
  const [missionFilter, setMissionFilter] = useState<string | null>(null)
  const [majorFilter, setMajorFilter] = useState<string | null>(null)
  const [submajorFilter, setSubmajorFilter] = useState<string | null>(null)
  const typeKey = (id: number | null) => id != null ? String(id) : 'none'

  const unitOptions = useMemo(() => {
    const all = td?.rows ?? []
    const count = (list: TransferRow[], pick: (r: TransferRow) => string | null) => {
      const m = new Map<string, number>()
      for (const r of list) { const k = pick(r); if (k) m.set(k, (m.get(k) ?? 0) + 1) }
      return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, 'th')).map(([k, n]) => ({ value: k, label: `${k} (${n})` }))
    }
    const inMission = missionFilter ? all.filter(r => r.mission_name === missionFilter) : all
    const inMajor = majorFilter ? inMission.filter(r => r.major_name === majorFilter) : inMission
    return {
      mission: count(all, r => r.mission_name),
      major: count(inMission, r => r.major_name),
      submajor: count(inMajor, r => r.submajor_name),
    }
  }, [td, missionFilter, majorFilter])

  const rows = useMemo(() => {
    const q = search.trim()
    return (td?.rows ?? []).filter(r =>
      (view === 'all' || (view === 'missing' ? r.missing : !r.missing))
      && (!typeFilter || typeKey(r.user_type_id) === typeFilter)
      && (!statusFilter || r.status === statusFilter)
      && (!missionFilter || r.mission_name === missionFilter)
      && (!majorFilter || r.major_name === majorFilter)
      && (!submajorFilter || r.submajor_name === submajorFilter)
      && (view !== 'missing' || !rightOnly || r.has_right)
      && (!q || r.name.includes(q) || (r.position_name ?? '').includes(q)))
  }, [td, view, typeFilter, statusFilter, rightOnly, search, missionFilter, majorFilter, submajorFilter])
  const noOf = useMemo(() => new Map(rows.map((r, i) => [r.user_id, i + 1])), [rows])

  // ── เพิ่ม/ตั้งยอด ─────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<BalanceEditTarget | null>(null)
  const openEdit = (r: TransferRow) => {
    if (!td) return
    setEditing({
      balance_id: r.balance_id, user_id: r.user_id, leave_type_id: td.leave_type_id, fiscal_year: td.fiscal_year,
      name: r.name, leave_type_name: 'การลาพักผ่อน',
      carried_in: r.carried_in ?? 0,
      // ยังไม่มีแถว — เสนอสิทธิ์ปีนี้ตามเกณฑ์ไว้ก่อน HR ปรับได้
      entitled: r.entitled ?? r.rule?.max_days_per_year ?? 0,
      used: r.used ?? 0,
      note: r.note,
    })
  }

  const exportExcel = () => {
    if (!td) return
    const sheet = rows.map((r, i) => ({
      'ลำดับ': i + 1,
      'ชื่อ-สกุล': r.name,
      'ตำแหน่ง': r.position_name ?? '',
      'ประเภทบุคลากร': r.user_type_name,
      'กลุ่มภารกิจ': r.mission_name ?? '',
      'กลุ่มงาน': r.major_name ?? '',
      'หน่วยงาน': r.submajor_name ?? '',
      'วันเริ่มงาน': r.service_start ?? '',
      'อายุงาน': serviceAge(r.service_start) ?? '',
      'สถานะ': STATUS_META[r.status].label,
      'สิทธิ์สะสม': r.has_right ? `ได้ (เพดาน ${r.rule?.carry_over_max_days ?? '-'} วัน)` : 'ไม่มี',
      'ยกมา': r.carried_in ?? '',
      'สิทธิ์ปีนี้': r.entitled ?? '',
      'ใช้ไปแล้ว': r.used ?? '',
      'คงเหลือ': r.remaining ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(sheet)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `ปีงบ ${td.fiscal_year}`)
    XLSX.writeFile(wb, `สถานะโอนยอดวันลาสะสม_ปีงบ${td.fiscal_year}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`)
  }

  // ── ตารางสรุปแยกประเภทบุคลากร ─────────────────────────────────────────────────
  const typeColumns = [
    {
      title: 'ประเภทบุคลากร', key: 'type',
      render: (_: unknown, t: TypeSummary) => <Text strong>{t.user_type_name}</Text>,
    },
    { title: 'ทั้งหมด', dataIndex: 'total', key: 'total', width: 80, align: 'center' as const },
    ...STATUS_ORDER.map(st => ({
      title: <Tooltip title={STATUS_META[st].desc}><span>{STATUS_META[st].label}</span></Tooltip>,
      key: st, width: 110, align: 'center' as const,
      render: (_: unknown, t: TypeSummary) => t[st]
        ? (
          <Button
            type="link" size="small" style={{ padding: 0, fontWeight: 600 }}
            onClick={e => { e.stopPropagation(); setTypeFilter(typeKey(t.user_type_id)); setStatusFilter(st); setView('all') }}
          >
            {t[st]}
          </Button>
        )
        : <Text type="secondary">-</Text>,
    })),
    {
      title: <Tooltip title="ยังไม่ได้โอน และผ่านเกณฑ์สิทธิ์สะสม — ควรตั้งยอดก่อนขึ้นปีงบใหม่"><span>ต้องดำเนินการ</span></Tooltip>,
      key: 'need', width: 110, align: 'center' as const,
      render: (_: unknown, t: TypeSummary) => t.missing_with_right
        ? <Tag color="red" style={{ marginInlineEnd: 0, fontWeight: 600 }}>{t.missing_with_right}</Tag>
        : <Tag color="success" style={{ marginInlineEnd: 0 }}>ครบ</Tag>,
    },
    {
      title: 'โอนแล้ว', key: 'pct', width: 160,
      render: (_: unknown, t: TypeSummary) => {
        const done = t.total - t.missing
        return <Progress percent={t.total ? Math.round(done * 100 / t.total) : 0} size="small" format={() => `${done}/${t.total}`} />
      },
    },
  ]

  // ── ตารางรายบุคคล ────────────────────────────────────────────────────────────
  const numOrDash = (v: number | null) => v == null ? <Text type="secondary">-</Text> : fmt(v)
  const columns = [
    { title: 'ลำดับ', key: 'no', width: 64, align: 'center' as const, render: (_: unknown, r: TransferRow) => <Text type="secondary">{noOf.get(r.user_id)}</Text> },
    {
      title: 'บุคลากร', key: 'name', width: 260,
      render: (_: unknown, r: TransferRow) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>{r.position_name ?? '-'}</Text></div>
          <div><Text type="secondary" style={{ fontSize: 11 }}>{r.submajor_name || r.major_name || r.mission_name || '-'}</Text></div>
        </div>
      ),
    },
    { title: 'ประเภทบุคลากร', dataIndex: 'user_type_name', key: 'type', width: 170 },
    {
      title: 'วันเริ่มงาน', key: 'service', width: 140,
      render: (_: unknown, r: TransferRow) => r.service_start
        ? <div><Text style={{ fontSize: 13 }}>{fmtDate(r.service_start)}</Text><div><Text type="secondary" style={{ fontSize: 11 }}>{serviceAge(r.service_start)}</Text></div></div>
        : <Text type="secondary">ไม่มีข้อมูล</Text>,
    },
    {
      title: 'สถานะ', key: 'status', width: 150,
      render: (_: unknown, r: TransferRow) => (
        <Tooltip title={STATUS_META[r.status].desc}><Tag color={STATUS_META[r.status].color} style={{ marginInlineEnd: 0 }}>{STATUS_META[r.status].label}</Tag></Tooltip>
      ),
    },
    {
      title: 'สิทธิ์สะสม', key: 'right', width: 120, align: 'center' as const,
      render: (_: unknown, r: TransferRow) => r.has_right
        ? <Text style={{ fontSize: 12 }}>เพดาน {r.rule?.carry_over_max_days ?? '-'} วัน</Text>
        : <Tooltip title={r.rule ? 'ประเภทนี้สะสมวันลาไม่ได้' : 'ไม่ผ่านเกณฑ์สิทธิ์ลาพักผ่อน ณ ต้นปีงบ (ประเภทบุคลากร/อายุงาน)'}><Tag style={{ marginInlineEnd: 0 }}>ไม่มี</Tag></Tooltip>,
    },
    { title: 'ยกมา', key: 'ci', width: 80, align: 'center' as const, render: (_: unknown, r: TransferRow) => numOrDash(r.carried_in) },
    { title: 'สิทธิ์ปีนี้', key: 'en', width: 80, align: 'center' as const, render: (_: unknown, r: TransferRow) => numOrDash(r.entitled) },
    { title: 'ใช้ไป', key: 'us', width: 80, align: 'center' as const, render: (_: unknown, r: TransferRow) => numOrDash(r.used) },
    {
      title: 'คงเหลือ', key: 'rem', width: 90, align: 'center' as const,
      render: (_: unknown, r: TransferRow) => r.remaining == null ? <Text type="secondary">-</Text>
        : <Text strong style={{ color: r.remaining < 0 ? '#ef4444' : '#10b981' }}>{fmt(r.remaining)}</Text>,
    },
    {
      title: 'จัดการ', key: 'action', width: 120, align: 'center' as const, fixed: 'right' as const,
      render: (_: unknown, r: TransferRow) => r.balance_id
        ? <Button size="small" icon={<EditOutlined />} type={r.missing ? 'primary' : 'default'} onClick={() => openEdit(r)}>{r.missing ? 'ตั้งยอด' : 'แก้ไข'}</Button>
        : <Button size="small" icon={<PlusOutlined />} type="primary" onClick={() => openEdit(r)}>เพิ่มยอด</Button>,
    },
  ]

  if (hasAccess === false) {
    return (
      <div className="min-h-dvh bg-app-bg text-app-text">
        <Navbar />
        <div className="p-6 md:p-8 flex justify-center">
          <Card style={{ borderRadius: 12, maxWidth: 480, marginTop: 60, textAlign: 'center' }}>
            <CloseCircleOutlined style={{ fontSize: 48, color: '#ef4444', marginBottom: 16 }} />
            <Title level={4} style={{ marginTop: 0 }}>ไม่มีสิทธิ์เข้าถึง</Title>
            <Text type="secondary">หน้าตรวจสอบการโอนยอดวันลาสะสมเปิดให้เฉพาะผู้ดูแลระบบและงานทรัพยากรบุคคลเท่านั้น</Text>
            <div className="mt-5"><Button type="primary" href="/home"><HomeOutlined /> กลับหน้าหลัก</Button></div>
          </Card>
        </div>
      </div>
    )
  }

  const typeOptions = (td?.by_type ?? []).map(t => ({ value: typeKey(t.user_type_id), label: `${t.user_type_name} (${t.total})` }))
  const filterLabel = [
    typeFilter && td?.by_type.find(t => typeKey(t.user_type_id) === typeFilter)?.user_type_name,
    statusFilter && STATUS_META[statusFilter].label,
    submajorFilter ?? majorFilter ?? missionFilter,
  ].filter(Boolean).join(' · ')

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { href: '/hr/leave', title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
            { title: 'ตรวจสอบการโอนยอดวันลาสะสม' },
          ]}
          className="mb-4"
        />

        <Card style={{ background: 'linear-gradient(135deg, #0e7490 0%, #0f766e 55%, #047857 100%)', border: 'none', borderRadius: 16, marginBottom: 16 }}>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-4" style={{ minWidth: 0 }}>
              <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <CloudSyncOutlined className="text-2xl text-white" />
              </div>
              <div style={{ minWidth: 0 }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>ตรวจสอบการโอนยอดวันลาสะสม</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                  ลาพักผ่อน · ใครยังไม่ได้โอน/ตั้งยอดสะสมของปีงบนี้ แยกตามประเภทบุคลากร — ควรตั้งยอดให้ครบก่อนขึ้นปีงบใหม่ (1 ต.ค.)
                </Text>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <Link href="/hr/leave/balance-audit">
                <Button size="large" icon={<SafetyCertificateOutlined />} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ตรวจแก้ยอดที่ผิด</Button>
              </Link>
              <Link href="/hr/leave/balance">
                <Button size="large" icon={<HistoryOutlined />} style={{ backgroundColor: '#fff', color: '#0f766e', border: 'none', fontWeight: 600 }}>วันลาสะสม</Button>
              </Link>
            </div>
          </div>
        </Card>

        {data?.error && data.key === queryKey && <Alert type="error" showIcon title={data.error} className="mb-4" />}

        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {[
            { label: 'บุคลากรที่ปฏิบัติงาน', value: td?.total, color: '#0f766e', hint: 'นับเฉพาะบัญชีที่เปิดใช้งาน' },
            { label: 'โอน / ตั้งยอดแล้ว', value: td ? td.total - td.missing : undefined, color: '#10b981', hint: 'โอนจากโปรแกรมเดิม · HR ตั้งเอง · ยกยอดจากปีก่อน' },
            { label: 'ยังไม่ได้โอน', value: td?.missing, color: '#f59e0b', hint: 'มีเฉพาะจากใบลา + ยังไม่มีข้อมูล' },
            { label: 'ต้องดำเนินการ', value: td?.missing_with_right, color: '#ef4444', hint: 'ยังไม่ได้โอน และมีสิทธิ์สะสมลาพักผ่อน' },
          ].map(c => (
            <Col key={c.label} xs={12} md={6}>
              <Card style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: 14 } }}>
                <Text style={{ fontSize: 13 }}>{c.label}</Text>
                <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: c.color }}>{loading || c.value == null ? '…' : c.value.toLocaleString('th-TH')}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>{c.hint}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          style={{ borderRadius: 12, border: 'none', marginBottom: 16 }}
          styles={{ body: { padding: 0 } }}
          title={<span>สรุปแยกตามประเภทบุคลากร <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>— กดตัวเลขเพื่อดูรายชื่อ</Text></span>}
          extra={
            <Space>
              <Select size="small" style={{ width: 130 }} value={fiscalYear} onChange={setFiscalYear} options={fiscalYears.map(y => ({ value: y, label: `ปีงบ ${y}` }))} />
              <Button size="small" icon={<ReloadOutlined />} onClick={reload} loading={loading}>รีเฟรช</Button>
            </Space>
          }
        >
          <Table
            rowKey={t => typeKey(t.user_type_id)}
            loading={loading}
            dataSource={td?.by_type ?? []}
            columns={typeColumns}
            pagination={false}
            size="middle"
            scroll={{ x: 1000 }}
            onRow={t => ({
              onClick: () => { setTypeFilter(typeKey(t.user_type_id)); setStatusFilter(null); setView('missing') },
              style: { cursor: 'pointer', background: typeFilter === typeKey(t.user_type_id) ? 'rgba(16,185,129,0.08)' : undefined },
            })}
            summary={list => list.length > 1 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><Text strong>รวม</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center"><Text strong>{td?.total}</Text></Table.Summary.Cell>
                {STATUS_ORDER.map((st, i) => (
                  <Table.Summary.Cell key={st} index={2 + i} align="center"><Text strong>{list.reduce((a, t) => a + t[st], 0)}</Text></Table.Summary.Cell>
                ))}
                <Table.Summary.Cell index={7} align="center"><Text strong type="danger">{td?.missing_with_right}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={8} />
              </Table.Summary.Row>
            ) : null}
          />
        </Card>

        <Card
          style={{ borderRadius: 12, border: 'none' }}
          styles={{ body: { padding: 0 } }}
          title={<span>รายชื่อ{filterLabel ? ` — ${filterLabel}` : ''}</span>}
          extra={<Button icon={<FileExcelOutlined />} onClick={exportExcel} disabled={!rows.length}>Export Excel</Button>}
        >
          <div className="flex flex-wrap items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--app-border, rgba(0,0,0,0.06))' }}>
            <Segmented
              value={view}
              onChange={v => { setView(v as typeof view); setStatusFilter(null) }}
              options={[
                { value: 'missing', label: 'ยังไม่ได้โอน' },
                { value: 'done', label: 'โอนแล้ว' },
                { value: 'all', label: 'ทั้งหมด' },
              ]}
            />
            <Select
              allowClear placeholder="ทุกประเภทบุคลากร" style={{ minWidth: 220 }}
              value={typeFilter ?? undefined} onChange={(v?: string) => setTypeFilter(v ?? null)} options={typeOptions}
            />
            <Select
              allowClear placeholder="ทุกสถานะ" style={{ minWidth: 170 }}
              value={statusFilter ?? undefined} onChange={(v?: Status) => setStatusFilter(v ?? null)}
              options={STATUS_ORDER.map(st => ({ value: st, label: STATUS_META[st].label }))}
            />
            {view === 'missing' && (
              <Segmented
                value={rightOnly ? 'right' : 'all'}
                onChange={v => setRightOnly(v === 'right')}
                options={[{ value: 'right', label: 'เฉพาะที่มีสิทธิ์สะสม' }, { value: 'all', label: 'รวมที่ไม่มีสิทธิ์' }]}
              />
            )}
            <Select
              allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="ทุกกลุ่มภารกิจ" style={{ minWidth: 200 }} popupMatchSelectWidth={false}
              value={missionFilter ?? undefined} options={unitOptions.mission}
              onChange={(v?: string) => { setMissionFilter(v ?? null); setMajorFilter(null); setSubmajorFilter(null) }}
            />
            <Select
              allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="ทุกกลุ่มงาน" style={{ minWidth: 200 }} popupMatchSelectWidth={false}
              value={majorFilter ?? undefined} options={unitOptions.major}
              onChange={(v?: string) => { setMajorFilter(v ?? null); setSubmajorFilter(null) }}
            />
            <Select
              allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="ทุกหน่วยงาน/ตึก" style={{ minWidth: 200 }} popupMatchSelectWidth={false}
              value={submajorFilter ?? undefined} options={unitOptions.submajor}
              onChange={(v?: string) => setSubmajorFilter(v ?? null)}
            />
            <Input allowClear placeholder="ค้นหาชื่อ / ตำแหน่ง" prefix={<SearchOutlined />} style={{ maxWidth: 240 }} value={search} onChange={e => setSearch(e.target.value)} />
            {(typeFilter || statusFilter || search || missionFilter || majorFilter || submajorFilter) && (
              <Button type="link" onClick={() => {
                setTypeFilter(null); setStatusFilter(null); setSearch('')
                setMissionFilter(null); setMajorFilter(null); setSubmajorFilter(null)
              }}>ล้างตัวกรอง</Button>
            )}
          </div>
          <Table
            rowKey="user_id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            size="middle"
            scroll={{ x: 1350 }}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `ทั้งหมด ${t} คน` }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={view === 'missing' ? 'โอนยอดครบแล้ว' : 'ไม่พบรายชื่อตามเงื่อนไข'} /> }}
          />
        </Card>

        <Card style={{ marginTop: 16, borderRadius: 12, border: 'none' }} styles={{ body: { padding: 16 } }}>
          <Text strong>ถ้าไม่ได้ตั้งยอดก่อนขึ้นปีงบใหม่</Text>
          <ul style={{ margin: '6px 0 0', paddingInlineStart: 20, fontSize: 13 }}>
            <li><b>ยังไม่มีข้อมูล</b> — ระบบถือว่าไม่เคยลาและเหลือเต็มสิทธิ์ 1 ปี แล้วยกยอดให้ไม่เกินเพดาน (อาจน้อยกว่าวันสะสมจริง)</li>
            <li><b>มีเฉพาะจากใบลา</b> — ยอดยกมาเป็น 0 ระบบยกยอดเฉพาะสิทธิ์ปีนี้ที่เหลือ</li>
            <li><b>ไม่มีสิทธิ์สะสม</b> (เช่น ลูกจ้างรายวัน หรืออายุงานยังไม่ถึงเกณฑ์) — ไม่ต้องตั้งยอดสะสม</li>
            <li>ยอดที่เพิ่มหรือแก้ในหน้านี้บันทึกพร้อมเหตุผลและเก็บประวัติไว้เหมือนหน้าวันลาสะสม</li>
          </ul>
        </Card>

        <BalanceEditModal target={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
      </div>
    </div>
  )
}

export default function LeaveBalanceTransferPage() {
  return (
    <AppThemeProvider colorPrimary="#0f766e">
      <PageContent />
    </AppThemeProvider>
  )
}
