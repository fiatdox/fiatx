'use client'
// ตรวจแก้วันลาสะสม — หายอดที่น่าจะผิด (คงเหลือติดลบ / ยกมาเกินเพดาน / ไม่ตรงใบลา / ไม่ตรงเกณฑ์) พร้อมค่าที่แนะนำ
// แก้ทีละแถว (BalanceEditModal) หรือหลายแถวตามค่าที่แนะนำ — ต้องระบุเหตุผล backend เก็บประวัติก่อน/หลังทุกครั้ง
// เฉพาะ ADMIN/HR (ตรงกับ requireRoles ฝั่ง backend)
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Cookies from 'js-cookie'
import {
  Alert, App, Button, Card, Col, Empty, Input, Modal, Row, Segmented, Select, Space, Table, Tag, Tooltip, Typography,
} from 'antd'
import {
  HomeOutlined, SafetyCertificateOutlined, SearchOutlined, EditOutlined, CheckOutlined, CloseCircleOutlined,
  HistoryOutlined, ReloadOutlined, WarningFilled, ArrowRightOutlined,
} from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import { normalizeRoles } from '@/app/lib/menuAccess'
import BalanceEditModal, { type BalanceEditTarget } from '../BalanceEditModal'

const { Title, Text } = Typography

const ALLOWED_ROLES = ['ADMIN', 'HR']

type IssueKey = 'negative' | 'no_rule' | 'cap' | 'carry' | 'used' | 'entitled'
type NumKey = 'carried_in' | 'entitled' | 'used'

interface AuditRow {
  balance_id: number
  user_id: number
  fiscal_year: number
  name: string
  is_active: boolean
  position_name: string | null
  user_type_name: string | null
  mission_name: string | null
  major_name: string | null
  submajor_name: string | null
  leave_type_id: number
  leave_type_code: string
  leave_type_name: string
  carried_in: number
  entitled: number
  used: number
  remaining: number
  note: string | null
  expected_used: number
  prev_remaining: number | null
  rule: { max_days_per_year: number; carry_over: boolean; carry_over_max_days: number | null } | null
  issues: IssueKey[]
  suggest: Partial<Record<NumKey, number>> | null
  suggest_remaining: number | null
  keep_carry_link: boolean
}

interface AuditData { fiscal_year: number; total: number; flagged: number; counts: Record<IssueKey, number>; rows: AuditRow[] }

const ISSUE_META: Record<IssueKey, { label: string; color: string; desc: string }> = {
  negative: { label: 'คงเหลือติดลบ', color: '#ef4444', desc: 'ใช้วันลาเกินยอดยกมา + สิทธิ์ปีนี้' },
  no_rule: { label: 'ไม่มีเกณฑ์สิทธิ์', color: '#f97316', desc: 'ประเภทเจ้าหน้าที่/อายุงานไม่ผ่านเกณฑ์ใด แต่มีการลา — กำหนดสิทธิ์ให้เอง' },
  cap: { label: 'ยกมาเกินเพดาน', color: '#f59e0b', desc: 'ยอดยกมาเกินเพดานสะสมตามเกณฑ์ หรือประเภทนี้สะสมไม่ได้' },
  carry: { label: 'ยกมาไม่ตรงปีก่อน', color: '#8b5cf6', desc: 'ยอดยกมาไม่เท่ากับคงเหลือปีก่อน (ไม่เกินเพดาน)' },
  used: { label: 'ใช้ไปไม่ตรงใบลา', color: '#0ea5e9', desc: 'ยอดใช้ไปไม่เท่ากับวันที่หักจากใบลาจริงของปีงบนี้' },
  entitled: { label: 'สิทธิ์ไม่ตรงเกณฑ์', color: '#6366f1', desc: 'สิทธิ์ปีนี้ไม่ตรงกับเกณฑ์ตามประเภทเจ้าหน้าที่และอายุงาน ณ ต้นปีงบ' },
}
const ISSUE_ORDER: IssueKey[] = ['negative', 'no_rule', 'cap', 'carry', 'used', 'entitled']

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 1 })

/** เหตุผลเฉพาะแถว — ใช้เป็น tooltip ของป้ายปัญหา */
const issueDetail = (k: IssueKey, r: AuditRow) => {
  switch (k) {
    case 'used': return `ใบลาจริงหักไป ${fmt(r.expected_used)} วัน แต่ยอดบันทึกไว้ ${fmt(r.used)} วัน`
    case 'entitled': return `เกณฑ์กำหนด ${fmt(r.rule?.max_days_per_year ?? 0)} วัน/ปี แต่บันทึกไว้ ${fmt(r.entitled)} วัน`
    case 'cap': return r.rule?.carry_over ? `เพดานสะสม ${fmt(r.rule.carry_over_max_days ?? 0)} วัน แต่ยกมา ${fmt(r.carried_in)} วัน` : 'ประเภทเจ้าหน้าที่นี้สะสมวันลาไม่ได้'
    case 'carry': return `คงเหลือปีก่อน ${fmt(r.prev_remaining ?? 0)} วัน (ไม่เกินเพดาน = ${fmt(r.suggest?.carried_in ?? 0)}) แต่ยกมา ${fmt(r.carried_in)} วัน`
    case 'no_rule': return `${r.user_type_name ?? 'ประเภทเจ้าหน้าที่นี้'} ไม่ผ่านเกณฑ์สิทธิ์ ณ ต้นปีงบ — ตรวจสอบระเบียบแล้วกำหนดสิทธิ์ปีนี้ให้เอง`
    default: return ISSUE_META[k].desc
  }
}

const PageContent = () => {
  const { message } = App.useApp()

  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  // แก้หลายรายการพร้อมกันเฉพาะ ADMIN — งาน HR แก้ทีละแถว (backend ตรวจซ้ำ)
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    let roles: string[] = []
    try { roles = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles) } catch { /* cookie เสีย */ }
    void Promise.resolve().then(() => {
      setHasAccess(roles.some(r => ALLOWED_ROLES.includes(r)))
      setIsAdmin(roles.includes('ADMIN'))
    })
  }, [])

  // ── ตัวเลือกตั้งต้น ──────────────────────────────────────────────────────────
  const [fiscalYears, setFiscalYears] = useState<number[]>([])
  const [fiscalYear, setFiscalYear] = useState<number | null>(null)
  const [leaveTypes, setLeaveTypes] = useState<{ id: number; name_th: string }[]>([])
  useEffect(() => {
    if (!hasAccess) return
    Promise.all([
      fetch('/api/v1/hr/leave-balances/meta').then(r => r.json()),
      fetch('/api/v1/hr/leave-types/full').then(r => r.json()),
    ]).then(([meta, lt]) => {
      if (meta?.success) { setFiscalYears(meta.data.fiscal_years); setFiscalYear(meta.data.current_fiscal_year) }
      if (lt?.success) setLeaveTypes(lt.data)
    }).catch(() => message.error('ไม่สามารถโหลดข้อมูลตั้งต้นได้'))
  }, [hasAccess, message])

  const [leaveTypeId, setLeaveTypeId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'flagged' | 'all'>('flagged')
  const [issueFilter, setIssueFilter] = useState<IssueKey | null>(null)

  // ── ข้อมูลตรวจ — โหลดใหม่เมื่อเปลี่ยนปี/ประเภท หรือหลังแก้ไข ────────────────────
  const [reloadKey, setReloadKey] = useState(0)
  const queryKey = fiscalYear ? `${fiscalYear}|${leaveTypeId ?? ''}|${reloadKey}` : null
  const [data, setData] = useState<{ key: string; value: AuditData | null; error?: string } | null>(null)
  useEffect(() => {
    if (!hasAccess || !queryKey || !fiscalYear) return
    let alive = true
    const params = new URLSearchParams({ fiscal_year: String(fiscalYear) })
    if (leaveTypeId) params.set('leave_type_id', String(leaveTypeId))
    fetch(`/api/v1/hr/leave-balances/audit?${params}`)
      .then(r => r.json())
      .then(j => { if (alive) setData(j?.success ? { key: queryKey, value: j.data } : { key: queryKey, value: null, error: j?.message ?? 'โหลดข้อมูลไม่สำเร็จ' }) })
      .catch(() => { if (alive) setData({ key: queryKey, value: null, error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' }) })
    return () => { alive = false }
  }, [hasAccess, queryKey, fiscalYear, leaveTypeId])
  const loading = !!queryKey && data?.key !== queryKey
  const audit = data?.value ?? null
  const reload = () => setReloadKey(k => k + 1)

  const rows = useMemo(() => {
    const q = search.trim()
    return (audit?.rows ?? []).filter(r =>
      (view === 'all' || r.issues.length > 0)
      && (!issueFilter || r.issues.includes(issueFilter))
      && (!q || r.name.includes(q)))
  }, [audit, view, issueFilter, search])
  const noOf = useMemo(() => new Map(rows.map((r, i) => [r.balance_id, i + 1])), [rows])

  // ── แก้ทีละแถว ───────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<BalanceEditTarget | null>(null)
  const openEdit = (r: AuditRow) => setEditing({
    balance_id: r.balance_id, user_id: r.user_id, leave_type_id: r.leave_type_id, fiscal_year: r.fiscal_year,
    name: r.name, leave_type_name: r.leave_type_name,
    carried_in: r.carried_in, entitled: r.entitled, used: r.used, note: r.note,
    suggest: r.suggest, keep_carry_link: r.keep_carry_link,
  })

  // ── แก้หลายแถวตามค่าที่แนะนำ ───────────────────────────────────────────────────
  const [selected, setSelected] = useState<number[]>([])
  const selectedRows = useMemo(() => rows.filter(r => selected.includes(r.balance_id) && r.suggest), [rows, selected])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkReason, setBulkReason] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const runBulk = async () => {
    if (!bulkReason.trim()) { message.warning('กรุณาระบุเหตุผลที่แก้ไขยอดวันลา'); return }
    setBulkSaving(true)
    try {
      const res = await fetch('/api/v1/hr/leave-balances/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: bulkReason.trim(),
          items: selectedRows.map(r => ({ id: r.balance_id, ...r.suggest, ...(r.keep_carry_link ? { keep_carry_link: true } : {}) })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) { message.error(json.message || 'แก้ไขไม่สำเร็จ'); return }
      message.success(`แก้ไขยอดวันลา ${json.data.updated} รายการเรียบร้อย`)
      setBulkOpen(false); setBulkReason(''); setSelected([]); reload()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setBulkSaving(false)
    }
  }

  // ── ตาราง ──────────────────────────────────────────────────────────────────
  const numCell = (k: NumKey) => function NumCell(_: unknown, r: AuditRow) {
    const next = r.suggest?.[k]
    return (
      <span style={{ whiteSpace: 'nowrap' }}>
        {next != null ? <Text delete type="secondary">{fmt(r[k])}</Text> : fmt(r[k])}
        {next != null && <Text strong style={{ color: '#10b981' }}> → {fmt(next)}</Text>}
      </span>
    )
  }

  const columns = [
    { title: 'ลำดับ', key: 'no', width: 64, align: 'center' as const, render: (_: unknown, r: AuditRow) => <Text type="secondary">{noOf.get(r.balance_id)}</Text> },
    {
      title: 'บุคลากร', key: 'name', width: 260,
      render: (_: unknown, r: AuditRow) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
          {!r.is_active && <Tag style={{ marginInlineStart: 6 }}>พ้นสภาพ</Tag>}
          <div><Text type="secondary" style={{ fontSize: 11 }}>{[r.position_name, r.user_type_name].filter(Boolean).join(' · ')}</Text></div>
          <div><Text type="secondary" style={{ fontSize: 11 }}>{r.submajor_name || r.major_name || r.mission_name || '-'}</Text></div>
        </div>
      ),
    },
    { title: 'ประเภท', dataIndex: 'leave_type_name', key: 'type', width: 130, render: (v: string) => <Text style={{ fontSize: 13 }}>{v.replace(/^การลา/, 'ลา')}</Text> },
    { title: 'ยกมา', key: 'carried_in', width: 100, align: 'center' as const, render: numCell('carried_in') },
    { title: 'สิทธิ์ปีนี้', key: 'entitled', width: 100, align: 'center' as const, render: numCell('entitled') },
    { title: 'ใช้ไปแล้ว', key: 'used', width: 100, align: 'center' as const, render: numCell('used') },
    {
      title: 'คงเหลือ', key: 'remaining', width: 110, align: 'center' as const,
      render: (_: unknown, r: AuditRow) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          <Text strong style={{ color: r.remaining < 0 ? '#ef4444' : undefined }} delete={r.suggest_remaining != null}>{fmt(r.remaining)}</Text>
          {r.suggest_remaining != null && <Text strong style={{ color: r.suggest_remaining < 0 ? '#ef4444' : '#10b981' }}> → {fmt(r.suggest_remaining)}</Text>}
        </span>
      ),
    },
    {
      title: 'ปัญหาที่พบ', key: 'issues',
      render: (_: unknown, r: AuditRow) => r.issues.length ? (
        <Space size={4} wrap>
          {r.issues.map(k => (
            <Tooltip key={k} title={issueDetail(k, r)}>
              <Tag color={ISSUE_META[k].color} style={{ marginInlineEnd: 0, cursor: 'help' }}>{ISSUE_META[k].label}</Tag>
            </Tooltip>
          ))}
        </Space>
      ) : <Tag color="success" icon={<CheckOutlined />} style={{ marginInlineEnd: 0 }}>ปกติ</Tag>,
    },
    {
      title: 'จัดการ', key: 'action', width: 110, align: 'center' as const, fixed: 'right' as const,
      render: (_: unknown, r: AuditRow) => (
        <Button size="small" type={r.issues.length ? 'primary' : 'default'} icon={<EditOutlined />} onClick={() => openEdit(r)}>แก้ไข</Button>
      ),
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
            <Text type="secondary">หน้าตรวจแก้วันลาสะสมเปิดให้เฉพาะผู้ดูแลระบบและงานทรัพยากรบุคคลเท่านั้น</Text>
            <div className="mt-5"><Button type="primary" href="/home"><HomeOutlined /> กลับหน้าหลัก</Button></div>
          </Card>
        </div>
      </div>
    )
  }

  const counts = audit?.counts
  const flaggedSelectable = rows.filter(r => r.suggest).map(r => r.balance_id)

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { href: '/hr/leave', title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
            { title: 'ตรวจแก้วันลาสะสม' },
          ]}
          className="mb-4"
        />

        <Card style={{ background: 'linear-gradient(135deg, #0f766e 0%, #047857 55%, #065f46 100%)', border: 'none', borderRadius: 16, marginBottom: 16 }}>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-4" style={{ minWidth: 0 }}>
              <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <SafetyCertificateOutlined className="text-2xl text-white" />
              </div>
              <div style={{ minWidth: 0 }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>ตรวจแก้วันลาสะสม</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                  หายอดวันลาที่น่าจะผิด พร้อมค่าที่ควรเป็น — {isAdmin ? 'แก้ได้ทีละรายการหรือหลายรายการพร้อมกัน' : 'แก้ทีละรายการ'} ทุกการแก้ไขต้องระบุเหตุผลและเก็บประวัติไว้
                </Text>
              </div>
            </div>
            <div className="flex gap-2 md:ml-auto">
              <Link href="/hr/leave/balance">
                <Button size="large" icon={<HistoryOutlined />} style={{ backgroundColor: '#fff', color: '#047857', border: 'none', fontWeight: 600 }}>วันลาสะสม</Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: 16, borderRadius: 12, border: 'none' }} styles={{ body: { padding: 16 } }}>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={12} md={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>ปีงบประมาณ</Text>
              <Select className="w-full" value={fiscalYear} onChange={v => { setFiscalYear(v); setSelected([]) }} options={fiscalYears.map(y => ({ value: y, label: `พ.ศ. ${y}` }))} />
            </Col>
            <Col xs={12} md={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>ประเภทการลา</Text>
              <Select
                className="w-full" allowClear placeholder="ทุกประเภท"
                value={leaveTypeId ?? undefined}
                onChange={(v?: number) => { setLeaveTypeId(v ?? null); setSelected([]) }}
                options={leaveTypes.map(t => ({ value: t.id, label: t.name_th }))}
              />
            </Col>
            <Col xs={24} md={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>ค้นหาชื่อ</Text>
              <Input allowClear placeholder="ชื่อ-สกุล" prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} />
            </Col>
            <Col xs={24} md={8}>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Segmented
                  value={view}
                  onChange={v => { setView(v as 'flagged' | 'all'); setIssueFilter(null) }}
                  options={[
                    { value: 'flagged', label: `ต้องตรวจ (${audit?.flagged ?? '…'})` },
                    { value: 'all', label: `ทั้งหมด (${audit?.total ?? '…'})` },
                  ]}
                />
                <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>รีเฟรช</Button>
              </div>
            </Col>
          </Row>
        </Card>

        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {ISSUE_ORDER.map(k => {
            const n = counts?.[k] ?? 0
            const active = issueFilter === k
            return (
              <Col key={k} xs={12} md={8} xl={4}>
                <Card
                  hoverable={n > 0}
                  onClick={() => { if (n > 0) { setIssueFilter(active ? null : k); setView('flagged') } }}
                  style={{ borderRadius: 12, height: '100%', border: active ? `2px solid ${ISSUE_META[k].color}` : '2px solid transparent', opacity: n ? 1 : 0.6, cursor: n ? 'pointer' : 'default' }}
                  styles={{ body: { padding: 14 } }}
                >
                  <div className="flex items-center justify-between">
                    <Text style={{ fontSize: 13 }}>{ISSUE_META[k].label}</Text>
                    {n > 0 && <WarningFilled style={{ color: ISSUE_META[k].color }} />}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: n ? ISSUE_META[k].color : 'var(--app-text-3)' }}>{loading ? '…' : n}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{ISSUE_META[k].desc}</Text>
                </Card>
              </Col>
            )
          })}
        </Row>

        {data?.error && data.key === queryKey && <Alert type="error" showIcon title={data.error} className="mb-4" />}

        <Card
          style={{ borderRadius: 12, border: 'none' }}
          styles={{ body: { padding: 0 } }}
          title={
            <span>
              รายการยอดวันลา{issueFilter ? ` — ${ISSUE_META[issueFilter].label}` : view === 'flagged' ? ' ที่ต้องตรวจ' : ''}
              {issueFilter && <Button type="link" size="small" onClick={() => setIssueFilter(null)}>ล้างตัวกรอง</Button>}
            </span>
          }
          extra={isAdmin ? (
            <Space wrap>
              {flaggedSelectable.length > 0 && (
                <Button size="small" onClick={() => setSelected(flaggedSelectable)}>เลือกทั้งหมดที่มีค่าแนะนำ ({flaggedSelectable.length})</Button>
              )}
              <Button type="primary" icon={<ArrowRightOutlined />} disabled={!selectedRows.length} onClick={() => setBulkOpen(true)}>
                แก้ตามที่แนะนำ{selectedRows.length ? ` (${selectedRows.length})` : ''}
              </Button>
            </Space>
          ) : undefined}
        >
          <Table
            rowKey="balance_id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            size="middle"
            scroll={{ x: 1180 }}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `ทั้งหมด ${t} รายการ` }}
            rowSelection={isAdmin ? {
              selectedRowKeys: selected,
              onChange: keys => setSelected(keys as number[]),
              getCheckboxProps: (r: AuditRow) => ({ disabled: !r.suggest }),
            } : undefined}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={view === 'flagged' ? 'ไม่พบยอดวันลาที่ต้องตรวจ' : 'ไม่มีข้อมูลวันลาสะสมในปีงบนี้'} />,
            }}
          />
        </Card>

        <Card style={{ marginTop: 16, borderRadius: 12, border: 'none' }} styles={{ body: { padding: 16 } }}>
          <Text strong>หลักการตรวจ</Text>
          <ul style={{ margin: '6px 0 0', paddingInlineStart: 20, fontSize: 13 }}>
            <li><b>ใช้ไปไม่ตรงใบลา</b> — เทียบกับผลรวมวันที่หักจากใบลาจริงของปีงบนั้น (รวมใบที่รออนุมัติและใบที่โอนจากโปรแกรมเดิม)</li>
            <li><b>สิทธิ์ไม่ตรงเกณฑ์</b> — เทียบกับหน้ากำหนดสิทธิ์การลา ตามประเภทเจ้าหน้าที่และอายุงาน ณ วันที่ 1 ต.ค. ของปีงบ</li>
            <li><b>ยกมาไม่ตรงปีก่อน / เกินเพดาน</b> — เฉพาะลาพักผ่อน ยกมาได้ไม่เกินคงเหลือปีก่อนและเพดานสะสมตามเกณฑ์</li>
            <li><b>ไม่มีเกณฑ์สิทธิ์</b> — ระบบแนะนำค่าไม่ได้ กรุณาตรวจสอบระเบียบแล้วกด &quot;แก้ไข&quot; เพื่อกำหนดสิทธิ์ปีนี้เอง</li>
            <li>เมื่อแก้ยอดของปีใด ยอดยกมาของปีถัดไปที่ระบบยกยอดให้จะปรับตามอัตโนมัติ</li>
          </ul>
        </Card>

        <BalanceEditModal target={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />

        <Modal
          title={<Space><ArrowRightOutlined style={{ color: '#10b981' }} /><span>แก้ยอดวันลาตามค่าที่แนะนำ {selectedRows.length} รายการ</span></Space>}
          open={bulkOpen}
          onCancel={() => setBulkOpen(false)}
          onOk={runBulk}
          okText="ยืนยันแก้ไข"
          cancelText="ยกเลิก"
          confirmLoading={bulkSaving}
          width={640}
        >
          <Alert type="warning" showIcon className="mb-3" title="ยอดวันลาคงเหลือของบุคลากรจะเปลี่ยนทันที — ตรวจสอบรายการก่อนยืนยัน" />
          <Table
            size="small" rowKey="balance_id" pagination={false} scroll={{ y: 260 }}
            dataSource={selectedRows}
            columns={[
              { title: 'บุคลากร', dataIndex: 'name', key: 'name' },
              { title: 'ประเภท', dataIndex: 'leave_type_name', key: 'type', render: (v: string) => v.replace(/^การลา/, 'ลา') },
              {
                title: 'แก้เป็น', key: 'sugg',
                render: (_: unknown, r: AuditRow) => (
                  <Space size={4} wrap>
                    {(Object.entries(r.suggest ?? {}) as [NumKey, number][]).map(([k, v]) => (
                      <Tag key={k} style={{ marginInlineEnd: 0 }}>{{ carried_in: 'ยกมา', entitled: 'สิทธิ์', used: 'ใช้ไป' }[k]} {fmt(r[k])} → <b>{fmt(v)}</b></Tag>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
          <div className="mt-3">
            <Text>เหตุผลที่แก้ไข <Text type="danger">*</Text></Text>
            <Input
              className="mt-1" maxLength={255} value={bulkReason} onChange={e => setBulkReason(e.target.value)}
              placeholder="เช่น ปรับยอดยกมาให้ไม่เกินเพดานสะสมตามระเบียบ"
            />
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default function LeaveBalanceAuditPage() {
  return (
    <AppThemeProvider colorPrimary="#047857">
      <PageContent />
    </AppThemeProvider>
  )
}
