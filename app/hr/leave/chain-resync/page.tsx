'use client'
// ปรับสายอนุมัติของใบลาที่ยื่นแล้วให้ตรงผังปัจจุบัน — เฉพาะ ADMIN (proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์)
// หน้านี้แค่ชี้ว่าใบไหนไม่ตรงผัง · ปรับได้ทีละใบ กดจากใบนั้นเอง · ไม่แตะสถานะและยอดวันลา · ค่าเดิมเก็บในประวัติ
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import dayjs, { type Dayjs } from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import {
  Alert, App, Button, Card, DatePicker, Empty, Input, Result, Segmented, Space, Table, Tag, Tooltip, Typography,
} from 'antd'
import {
  HomeOutlined, ReloadOutlined, SearchOutlined, SyncOutlined, WarningOutlined,
} from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import { normalizeRoles } from '@/app/lib/menuAccess'
import ChainResyncModal, { ChainList, type ChainStep } from '../ChainResyncModal'

dayjs.extend(buddhistEra)

const { Title, Text } = Typography

interface Item {
  id: number; user_id: number; owner_name: string; unit_name: string; leave_type_name: string | null
  start_date: string; end_date: string; status: string; is_legacy: boolean; current_step: number
  chain: ChainStep[]; chart: ChainStep[]; next_step: number; changes: string[]; blocked: string | null; rewrites_real_clicks: boolean
}
interface ScanResponse { items: Item[]; scanned: number; legacy_configured: boolean; log_ready: boolean }
interface LogRow {
  id: number; request_id: number; note: string | null; created_at: string; actor_name: string; owner_name: string
  before: { current_step: number; approval_chain: ChainStep[] }
  after: { current_step: number; approval_chain: ChainStep[]; changes: string[] }
}

const STATUS: Record<string, { label: string; color: string }> = {
  APPROVED: { label: 'อนุมัติแล้ว', color: 'green' },
  PENDING: { label: 'รออนุมัติ', color: 'gold' },
  CANCEL_PENDING: { label: 'รออนุมัติยกเลิก', color: 'orange' },
}
const lvNo = (id: number) => `LV-${String(id).padStart(6, '0')}`
const fmtDate = (iso: string) => dayjs(iso).format('DD/MM/BBBB')
const daysBetween = (from: string, to: string) => dayjs(to).diff(dayjs(from), 'day') + 1

const PageContent = () => {
  const { message } = App.useApp()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  useEffect(() => {
    let ok = false
    try { ok = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles).includes('ADMIN') } catch { /* cookie เสีย */ }
    void Promise.resolve().then(() => setHasAccess(ok))
  }, [])

  const [tab, setTab] = useState<'scan' | 'log'>('scan')
  const [scan, setScan] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('all')
  const [keyword, setKeyword] = useState('')
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [resyncId, setResyncId] = useState<number | null>(null)
  const [log, setLog] = useState<LogRow[]>([])
  const [logLoading, setLogLoading] = useState(false)

  const loadScan = useCallback(async () => {
    setLoading(true)
    try {
      const j = await fetch('/api/v1/hr/leave-chain-resync').then(r => r.json())
      if (!j?.success) { message.error(j?.message ?? 'ตรวจสายอนุมัติไม่สำเร็จ'); return }
      setScan(j.data)
    } catch {
      message.error('ตรวจสายอนุมัติไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [message])

  const loadLog = useCallback(async () => {
    setLogLoading(true)
    try {
      const j = await fetch('/api/v1/hr/leave-chain-resync/log').then(r => r.json())
      if (j?.success) setLog(j.data); else message.error(j?.message ?? 'โหลดประวัติไม่สำเร็จ')
    } catch {
      message.error('โหลดประวัติไม่สำเร็จ')
    } finally {
      setLogLoading(false)
    }
  }, [message])

  useEffect(() => {
    if (hasAccess) void Promise.resolve().then(loadScan)
  }, [hasAccess, loadScan])
  useEffect(() => {
    if (hasAccess && tab === 'log') void Promise.resolve().then(loadLog)
  }, [hasAccess, tab, loadLog])

  // ช่วงวันที่ — ได้ใบที่ช่วงลา "คาบเกี่ยว" ช่วงนี้ (เริ่มก่อน/จบหลังช่วงก็นับ) เลือกข้างเดียวได้
  const rangeFrom = range?.[0]?.format('YYYY-MM-DD') ?? null
  const rangeTo = range?.[1]?.format('YYYY-MM-DD') ?? null
  const items = useMemo(() => (scan?.items ?? []).filter(i =>
    (!rangeFrom || i.end_date >= rangeFrom) && (!rangeTo || i.start_date <= rangeTo)), [scan, rangeFrom, rangeTo])
  const counts = useMemo(() => {
    const n: Record<string, number> = {}
    for (const i of items) n[i.status] = (n[i.status] ?? 0) + 1
    return n
  }, [items])
  const shown = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    return items.filter(i => (status === 'all' || i.status === status) && (!k
      || i.owner_name.toLowerCase().includes(k) || i.unit_name.toLowerCase().includes(k)
      || lvNo(i.id).toLowerCase().includes(k) || String(i.id).includes(k)
      || [...i.chain, ...i.chart].some(s => s.approver_name.toLowerCase().includes(k))))
  }, [items, status, keyword])
  /** ใบที่ช่วงลาเลยช่วงที่เลือกออกไป — บอกว่าทับกันกี่วัน (นับวันปฏิทิน) */
  const overlapOf = (r: Item) => {
    if (!rangeFrom && !rangeTo) return null
    const from = rangeFrom && rangeFrom > r.start_date ? rangeFrom : r.start_date
    const to = rangeTo && rangeTo < r.end_date ? rangeTo : r.end_date
    const total = daysBetween(r.start_date, r.end_date)
    const hit = daysBetween(from, to)
    return hit < total ? { hit, total, from, to } : null
  }

  const columns = [
    {
      title: 'ใบลา', key: 'req', width: 230,
      render: (_: unknown, r: Item) => (
        <div>
          <Text strong>{r.owner_name}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{r.unit_name}</Text></div>
          <div style={{ fontSize: 12 }}>
            <Text type="secondary">{lvNo(r.id)} · {(r.leave_type_name ?? '').replace(/^การลา/, 'ลา')}</Text>
          </div>
          <div style={{ fontSize: 12 }}><Text type="secondary">{fmtDate(r.start_date)}{r.end_date !== r.start_date ? ` – ${fmtDate(r.end_date)}` : ''}</Text></div>
          {(() => {
            const o = overlapOf(r)
            return o && (
              <Tooltip title={`ทับช่วงที่เลือก ${fmtDate(o.from)}${o.to !== o.from ? ` – ${fmtDate(o.to)}` : ''} (นับวันปฏิทิน)`}>
                <Tag color="orange" style={{ marginTop: 4, marginInlineEnd: 0, fontSize: 11 }}>คาบเกี่ยว {o.hit} จาก {o.total} วัน</Tag>
              </Tooltip>
            )
          })()}
        </div>
      ),
    },
    {
      title: 'สถานะ', key: 'status', width: 120,
      render: (_: unknown, r: Item) => (
        <Space orientation="vertical" size={4}>
          <Tag color={STATUS[r.status]?.color} style={{ marginInlineEnd: 0 }}>{STATUS[r.status]?.label ?? r.status}</Tag>
          {r.is_legacy && <Tag style={{ marginInlineEnd: 0 }}>โปรแกรมเดิม</Tag>}
        </Space>
      ),
    },
    { title: 'สายปัจจุบันของใบ', key: 'chain', width: 280, render: (_: unknown, r: Item) => <ChainList steps={r.chain} other={r.chart} /> },
    { title: 'สายตามผังปัจจุบัน', key: 'chart', width: 280, render: (_: unknown, r: Item) => <ChainList steps={r.chart} other={r.chain} /> },
    {
      title: 'สิ่งที่จะเปลี่ยน', key: 'changes',
      render: (_: unknown, r: Item) => r.blocked
        ? <Alert type="error" showIcon title={r.blocked} style={{ fontSize: 12, padding: '4px 8px' }} />
        : (
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            {r.changes.map(c => <div key={c}>• {c}</div>)}
            {r.rewrites_real_clicks && (
              <Tooltip title="ใบนี้สร้างในระบบใหม่ แถวที่จะเปลี่ยนคือการกดอนุมัติจริงของผู้อนุมัติ">
                <Tag color="red" icon={<WarningOutlined />} style={{ marginTop: 4 }}>แก้การกดจริง</Tag>
              </Tooltip>
            )}
          </div>
        ),
    },
    {
      title: '', key: 'act', width: 110, fixed: 'right' as const, align: 'center' as const,
      render: (_: unknown, r: Item) => (
        <Button size="small" type="primary" icon={<SyncOutlined />} disabled={!!r.blocked} onClick={() => setResyncId(r.id)}>ปรับใบนี้</Button>
      ),
    },
  ]

  const logColumns = [
    { title: 'เมื่อ', key: 'at', width: 150, render: (_: unknown, r: LogRow) => dayjs(r.created_at).format('DD/MM/BBBB HH:mm') },
    { title: 'ผู้ปรับ', dataIndex: 'actor_name', key: 'actor', width: 180 },
    {
      title: 'ใบลา', key: 'req', width: 200,
      render: (_: unknown, r: LogRow) => <div><Text strong>{lvNo(r.request_id)}</Text><div><Text type="secondary" style={{ fontSize: 12 }}>{r.owner_name}</Text></div></div>,
    },
    { title: 'สายเดิม', key: 'before', width: 280, render: (_: unknown, r: LogRow) => <ChainList steps={r.before?.approval_chain ?? []} other={r.after?.approval_chain} /> },
    { title: 'สายใหม่', key: 'after', width: 280, render: (_: unknown, r: LogRow) => <ChainList steps={r.after?.approval_chain ?? []} other={r.before?.approval_chain} /> },
    {
      title: 'รายละเอียด', key: 'detail',
      render: (_: unknown, r: LogRow) => (
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          {(r.after?.changes ?? []).map(c => <div key={c}>• {c}</div>)}
          {r.note && <div><Text type="secondary">หมายเหตุ: {r.note}</Text></div>}
        </div>
      ),
    },
  ]

  if (hasAccess === false) {
    return (
      <div className="min-h-dvh bg-app-bg text-app-text">
        <Navbar />
        <Result status="403" title="ไม่มีสิทธิ์เข้าถึง" subTitle="หน้านี้สำหรับผู้ดูแลระบบ (ADMIN) เท่านั้น" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 mx-auto" style={{ maxWidth: 1600 }}>
        <Breadcrumb
          className="mb-4"
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { href: '/hr/leave', title: <><FaCalendarAlt className="inline mr-1" /> ระบบการลา</> },
            { title: 'ปรับสายอนุมัติตามผัง' },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <Title level={4} style={{ margin: 0 }}><SyncOutlined className="mr-2" />ปรับสายอนุมัติตามผัง</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>ใบลาที่ยื่นแล้วแต่สายอนุมัติไม่ตรงผังผู้บริหารปัจจุบัน</Text>
          </div>
          <Segmented
            value={tab}
            onChange={v => setTab(v as 'scan' | 'log')}
            options={[{ value: 'scan', label: 'ใบที่ไม่ตรงผัง' }, { value: 'log', label: 'ประวัติการปรับ' }]}
          />
        </div>

        {tab === 'scan' && (
          <>
            {scan && !scan.log_ready && (
              <Alert className="mb-4" type="error" showIcon title="ยังไม่ได้สร้างตารางประวัติ — รัน src/db/hr_leave_chain_resync.sql ก่อนจึงจะปรับได้" />
            )}
            <Alert
              className="mb-4" type="warning" showIcon
              title="ปรับได้ทีละใบ — การปรับจะแก้ประวัติการอนุมัติของใบนั้น ให้เป็นไปตามผังวันนี้"
              description={(
                <ul style={{ margin: '4px 0 0', paddingInlineStart: 18, fontSize: 13 }}>
                  <li>ใบเก่าอาจถูกต้องตามผังในวันที่ลา — ตรวจก่อนเลือก โดยเฉพาะผู้ลาที่เคยย้ายหน่วย หรือหัวหน้าที่เคยดำรงตำแหน่งจริง</li>
                  <li>คงวันที่และความเห็นเดิม · ขั้นใหม่จะมีบันทึกการกดเฉพาะใบจากโปรแกรมเดิมที่ระดับนั้นกดไว้จริง · ไม่เปลี่ยนสถานะใบลาและยอดวันลา</li>
                  <li>ใบรออนุมัติ: ผู้อนุมัติคนใหม่จะเห็นในคิว แต่ระบบไม่ส่งแจ้งเตือนทันทีให้</li>
                </ul>
              )}
            />

            <Card style={{ borderRadius: 12, border: 'none', marginBottom: 12 }} styles={{ body: { padding: 14 } }}>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  value={status}
                  onChange={v => setStatus(v as string)}
                  options={[
                    { value: 'all', label: `ทั้งหมด (${items.length})` },
                    { value: 'APPROVED', label: `อนุมัติแล้ว (${counts.APPROVED ?? 0})` },
                    { value: 'PENDING', label: `รออนุมัติ (${counts.PENDING ?? 0})` },
                    { value: 'CANCEL_PENDING', label: `รอยกเลิก (${counts.CANCEL_PENDING ?? 0})` },
                  ]}
                />
                <Input
                  value={keyword} onChange={e => setKeyword(e.target.value)} allowClear prefix={<SearchOutlined />}
                  placeholder="ค้นหาผู้ลา · หน่วยงาน · เลขที่ · ผู้อนุมัติ" style={{ width: 300 }}
                />
                <Tooltip title="แสดงผู้ที่ลาคาบเกี่ยวช่วงนี้ — ใบที่เริ่มก่อนหรือสิ้นสุดหลังช่วงก็นับ">
                  <DatePicker.RangePicker
                    value={range}
                    onChange={v => setRange(v && (v[0] || v[1]) ? v as [Dayjs | null, Dayjs | null] : null)}
                    format="DD/MM/BBBB"
                    allowEmpty={[true, true]}
                    placeholder={['ลาตั้งแต่วันที่', 'ถึงวันที่']}
                    style={{ width: 260 }}
                    presets={[
                      { label: 'วันนี้', value: [dayjs(), dayjs()] },
                      { label: 'สัปดาห์นี้', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
                      { label: 'เดือนนี้', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                      { label: 'เดือนที่แล้ว', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                    ]}
                  />
                </Tooltip>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {scan && <Text type="secondary" style={{ fontSize: 12 }}>ตรวจ {scan.scanned.toLocaleString()} ใบ</Text>}
                  <Button icon={<ReloadOutlined />} loading={loading} onClick={loadScan}>ตรวจใหม่</Button>
                </div>
              </div>
            </Card>

            <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: 0 } }}>
              <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={shown}
                scroll={{ x: 1400 }}
                pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} ใบ` }}
                locale={{ emptyText: <Empty description={!scan ? 'กำลังตรวจ...' : scan.items.length ? 'ไม่มีใบในเงื่อนไขที่เลือก' : 'ทุกใบตรงผังปัจจุบัน'} /> }}
              />
            </Card>
          </>
        )}

        {tab === 'log' && (
          <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: 0 } }}>
            <Table
              rowKey="id" loading={logLoading} columns={logColumns} dataSource={log} scroll={{ x: 1300 }}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              locale={{ emptyText: <Empty description="ยังไม่มีการปรับ" /> }}
            />
          </Card>
        )}
      </div>

      <ChainResyncModal
        requestId={resyncId}
        onClose={() => setResyncId(null)}
        onDone={() => { setResyncId(null); void loadScan() }}
      />
    </div>
  )
}

export default function LeaveChainResyncPage() {
  return (
    <AppThemeProvider colorPrimary="#0284c7">
      <PageContent />
    </AppThemeProvider>
  )
}
