'use client'
// อนุมัติการเดินทางไปราชการ — หัวหน้ากลุ่มงาน / หัวหน้ากลุ่มภารกิจ (ผู้อนุมัติในสาย) พิจารณาและลงนามในระบบ
// ผู้อำนวยการลงนามบนกระดาษ งาน HRD บันทึกผลภายหลัง จึงไม่มีขั้น ผอ. ในหน้านี้
// แบ่งกลุ่มเหมือนหน้าอนุมัติการลา: รอท่านพิจารณา · รอขั้นอื่น · ผ่านสายแล้ว · ไม่อนุมัติ · ยกเลิก — backend คืนเฉพาะคำขอที่ผู้ใช้อยู่ในสาย/เคยกด
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Input, Modal, Row, Spin, Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AuditOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, HourglassOutlined, PrinterOutlined, SearchOutlined, StopOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { TRAVEL_APPROVAL_ITEM, TRAVEL_BASE, TRAVEL_COLOR, TravelShell, travelApi } from '../travelShared'
import { fmtMoney, requestNo, tripRange, type TravelRequest } from '../travelCalc'
import { StatusBadge } from '../TravelStatus'
import { ApproveModal, TripUrgency } from '../TravelApprove'
import { SignaturePreview } from '@/app/account/settings/SignatureSettings'

const { Title, Text } = Typography
const TravelRequestPDF = dynamic(() => import('../TravelRequestPDF'), { ssr: false, loading: () => <div style={{ padding: 24 }}><Spin /> กำลังเตรียมเอกสาร...</div> })

type Bucket = 'mine' | 'inprogress' | 'passed' | 'rejected' | 'cancelled'
const BUCKETS: { key: Bucket; label: string; sub: string; color: string; icon: React.ReactNode }[] = [
  { key: 'mine', label: 'รอท่านพิจารณา', sub: 'กดอนุมัติได้ทันที', color: '#f59e0b', icon: <HourglassOutlined /> },
  { key: 'inprogress', label: 'รอขั้นอื่น', sub: 'ท่านผ่านแล้ว หรือยังไม่ถึงคิว', color: '#0ea5e9', icon: <ClockCircleOutlined /> },
  { key: 'passed', label: 'ผ่านสายแล้ว', sub: 'รอ/ได้ผลคำสั่งผู้อำนวยการ', color: '#10b981', icon: <CheckCircleOutlined /> },
  { key: 'rejected', label: 'ไม่อนุมัติ', sub: 'จบที่ขั้นใดขั้นหนึ่ง', color: '#ef4444', icon: <CloseCircleOutlined /> },
  { key: 'cancelled', label: 'ยกเลิก', sub: 'ผู้ขอหรือ HRD ยกเลิก', color: '#64748b', icon: <StopOutlined /> },
]
const isBucket = (v: unknown): v is Bucket => BUCKETS.some(b => b.key === v)
const PAGE_SIZE = 20
interface ListData { rows: TravelRequest[]; total: number; buckets?: Record<Bucket, number>; soon?: { days: number } }

const ApprovalContent = () => {
  const { message, modal } = App.useApp()
  const router = useRouter()
  const params = useSearchParams()
  const [bucket, setBucket] = useState<Bucket>(() => { const b = params.get('bucket'); return isBucket(b) ? b : 'mine' })
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approveFor, setApproveFor] = useState<number | null>(null)
  const [printing, setPrinting] = useState<TravelRequest | null>(null)
  const [printLoading, setPrintLoading] = useState<number | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [bulk, setBulk] = useState<{ sig: string | null | undefined; comment: string; running: boolean } | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1) }, 350); return () => clearTimeout(t) }, [search])
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ scope: 'approve', bucket, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) })
      if (q) qs.set('search', q)
      setData(await travelApi<ListData>(`requests?${qs}`)); setError(null)
    } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }, [bucket, page, q])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  useEffect(() => { setSelected([]) }, [bucket, page, q])   // eslint-disable-line react-hooks/set-state-in-effect -- ล้างที่เลือกเมื่อเปลี่ยนชุดข้อมูล

  const pick = (b: Bucket) => { setBucket(b); setPage(1); router.replace(`${TRAVEL_BASE}/approval?bucket=${b}`, { scroll: false }) }
  const openPdf = useCallback(async (id: number) => {
    setPrintLoading(id)
    try { setPrinting(await travelApi<TravelRequest>(`requests/${id}`)) } catch (e) { message.error((e as Error).message) } finally { setPrintLoading(null) }
  }, [message])

  // ── อนุมัติหลายใบพร้อมกัน (ลงนามด้วยลายเซ็นในบัญชี) ──
  const openBulk = async () => {
    setBulk({ sig: undefined, comment: '', running: false })
    try { const j = await (await fetch('/api/v1/users/me/signature')).json(); setBulk(b => b && { ...b, sig: j?.success ? j.data?.image ?? null : null }) }
    catch { setBulk(b => b && { ...b, sig: null }) }
  }
  const runBulk = async () => {
    if (!bulk) return
    setBulk({ ...bulk, running: true })
    const fails: string[] = []
    let ok = 0
    for (const id of selected) {
      try {
        const res = await fetch(`/api/v1/hrd/travel/requests/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment: bulk.comment.trim() || null }) })
        const j = await res.json().catch(() => ({}))
        if (!res.ok || j.success === false) fails.push(`${requestNo(id)}: ${j.message ?? 'ไม่สำเร็จ'}`); else ok++
      } catch { fails.push(`${requestNo(id)}: เชื่อมต่อไม่ได้`) }
    }
    setBulk(null); setSelected([])
    if (fails.length) modal.warning({ title: `อนุมัติสำเร็จ ${ok} ใบ · ไม่สำเร็จ ${fails.length} ใบ`, content: <ul style={{ paddingLeft: 18, margin: 0 }}>{fails.map(f => <li key={f}>{f}</li>)}</ul> })
    else message.success(`อนุมัติและลงนามแล้ว ${ok} ใบ`)
    load()
  }

  const counts = data?.buckets
  const columns: ColumnsType<TravelRequest> = useMemo(() => [
    { title: 'ลำดับ', width: 64, align: 'center', render: (_: unknown, __: TravelRequest, i: number) => <span data-testid="row-no">{(page - 1) * PAGE_SIZE + i + 1}</span> },
    { title: 'เลขที่', dataIndex: 'id', width: 120, render: (v: number) => <Text code style={{ fontSize: 12 }}>{requestNo(v)}</Text> },
    {
      title: 'ผู้ขอ / เรื่อง', dataIndex: 'subject',
      render: (v: string, r) => <>
        <div style={{ fontWeight: 600 }} data-testid="requester">{r.requester_name}
          <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--app-text-3)' }}> · {[r.requester_position, r.requester_unit].filter(Boolean).join(' · ')}</span></div>
        <div>{v}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.location}</Text>
      </>,
    },
    { title: 'วันเดินทาง', dataIndex: 'start_at', width: 130, render: (_: string, r) => tripRange(r.start_at, r.end_at) },
    { title: 'ผู้เดินทาง', dataIndex: 'traveler_count', width: 90, align: 'center', render: (n: number) => `${n ?? 1} คน` },
    { title: 'ยอดเงินประมาณการ (บาท)', dataIndex: 'total_amount', width: 170, align: 'right', render: (v: number) => fmtMoney(v) },
    {
      title: 'สถานะ', dataIndex: 'status', width: 200, align: 'center',
      render: (_: string, r) => {
        const tip = r.status === 'cancelled' ? r.cancel_reason : r.status === 'rejected' ? r.reject_reason
          : r.waiting_for ? `${r.waiting_for.is_acting ? 'รักษาการ ' : ''}${r.waiting_for.approver_name}` : null
        return <><Tooltip title={tip ?? undefined}><StatusBadge r={r} /></Tooltip><TripUrgency r={r} now={now} days={data?.soon?.days ?? 7} /></>
      },
    },
    {
      title: '', width: 150, align: 'right',
      render: (_: unknown, r) => <>
        {r.can_approve
          ? <Button type="primary" size="small" icon={<AuditOutlined />} onClick={() => setApproveFor(r.id)} aria-label={`พิจารณา ${requestNo(r.id)}`} style={{ marginRight: 4 }}>พิจารณา</Button>
          : <Button type="text" size="small" icon={<AuditOutlined />} onClick={() => setApproveFor(r.id)} title="ดูการอนุมัติ" aria-label={`ดูการอนุมัติ ${requestNo(r.id)}`} />}
        <Button type="text" size="small" icon={<PrinterOutlined />} loading={printLoading === r.id} onClick={() => openPdf(r.id)} title="พิมพ์ PDF" aria-label={`พิมพ์ ${requestNo(r.id)}`} />
      </>,
    },
  ], [page, now, data?.soon?.days, printLoading, openPdf])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{TRAVEL_APPROVAL_ITEM.icon}</div>
        <div style={{ minWidth: 0 }}>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>{TRAVEL_APPROVAL_ITEM.title}</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>หัวหน้ากลุ่มงาน / หัวหน้ากลุ่มภารกิจ พิจารณาและลงนามในระบบตามลำดับ — ผู้อำนวยการลงนามบนกระดาษ งานพัฒนาทรัพยากรบุคคลบันทึกผล</Text>
        </div>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {BUCKETS.map(b => {
          const on = bucket === b.key, n = counts?.[b.key] ?? 0
          return (
            <Col key={b.key} style={{ flex: "1 1 150px" }}>
              <button type="button" onClick={() => pick(b.key)} data-testid={`bucket-${b.key}`} aria-pressed={on}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '12px 14px', borderRadius: 14, background: 'var(--app-surface)',
                  border: `1px solid ${on ? b.color : 'var(--app-border)'}`, boxShadow: on ? `0 0 0 2px ${b.color}33` : 'none', color: 'inherit', font: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: b.color, fontWeight: 600, fontSize: 13 }}>{b.icon} {b.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, color: n ? b.color : 'var(--app-text-3)' }} data-testid={`bucket-${b.key}-count`}>{counts ? n : '–'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--app-text-3)' }}>{b.sub}</div>
              </button>
            </Col>
          )
        })}
      </Row>

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 12 } }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <Input allowClear prefix={<SearchOutlined style={{ color: 'var(--app-text-3)' }} />} placeholder="ค้นหาเรื่อง สถานที่ ผู้เดินทาง เลขที่บันทึก" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '1 1 220px', maxWidth: 340 }} />
          {bucket === 'mine' && (
            <Button type="primary" icon={<CheckCircleOutlined />} disabled={!selected.length} onClick={openBulk} data-testid="bulk-approve">
              อนุมัติที่เลือก{selected.length ? ` (${selected.length})` : ''}
            </Button>
          )}
        </div>
        {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
        <Table<TravelRequest> size="small" rowKey="id" loading={loading} columns={columns} dataSource={data?.rows ?? []} scroll={{ x: 'max-content' }}
          rowSelection={bucket === 'mine' ? { selectedRowKeys: selected, onChange: k => setSelected(k as number[]), getCheckboxProps: r => ({ disabled: !r.can_approve }) } : undefined}
          pagination={{ current: page, pageSize: PAGE_SIZE, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false, hideOnSinglePage: true, showTotal: t => `ทั้งหมด ${t} รายการ` }}
          locale={{ emptyText: <Empty description={bucket === 'mine' ? 'ไม่มีคำขอที่รอท่านพิจารณา' : 'ไม่มีคำขอในกลุ่มนี้'} /> }} />
      </Card>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
        ต้องการดูคำขอของตัวเอง ไปที่ <Link href={`${TRAVEL_BASE}/requests`}>รายการขออนุมัติเดินทางไปราชการ</Link>
      </Text>

      {approveFor && <ApproveModal key={approveFor} id={approveFor} onClose={() => setApproveFor(null)} onSaved={load} onOpenPdf={openPdf} />}
      <Modal title={<span><PrinterOutlined style={{ marginRight: 8 }} />บันทึกข้อความขออนุมัติเดินทางไปราชการ — {printing ? requestNo(printing.id) : ''}</span>}
        open={!!printing} onCancel={() => setPrinting(null)} width="92vw" style={{ top: 16 }} styles={{ body: { height: '80vh', padding: 0 } }} footer={null} destroyOnHidden>
        {printing && <TravelRequestPDF data={printing} />}
      </Modal>
      <Modal open={!!bulk} title={`อนุมัติและลงนาม ${selected.length} ใบ`} onCancel={() => !bulk?.running && setBulk(null)} okText="อนุมัติและลงนาม" cancelText="ยกเลิก"
        okButtonProps={{ disabled: !bulk?.sig, loading: bulk?.running, icon: <CheckCircleOutlined /> }} onOk={runBulk} destroyOnHidden>
        {bulk?.sig === undefined ? <Spin size="small" />
          : bulk.sig ? <div style={{ marginBottom: 12 }}><Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ลงนามทุกใบด้วยลายเซ็นในบัญชีของท่าน</Text><SignaturePreview src={bulk.sig} height={44} /></div>
            : <Alert type="warning" showIcon style={{ marginBottom: 12 }} data-testid="bulk-no-signature" title="ยังไม่ได้ตั้งค่าลายเซ็น — อนุมัติไม่ได้"
              description={<Link href="/account/settings?tab=signature" target="_blank" rel="noopener noreferrer">ตั้งค่าลายเซ็น</Link>} />}
        <Input.TextArea rows={2} maxLength={300} placeholder="ความเห็น (ไม่บังคับ) เช่น เห็นควรอนุมัติ — ใช้กับทุกใบที่เลือก" value={bulk?.comment ?? ''}
          onChange={e => setBulk(b => b && { ...b, comment: e.target.value })} disabled={bulk?.running} />
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>ไม่อนุมัติต้องระบุเหตุผลรายใบ — กด “พิจารณา” ทีละใบ</Text>
      </Modal>
    </>
  )
}

export default function TravelApprovalPage() {
  return (
    <TravelShell current={TRAVEL_APPROVAL_ITEM.title} fluid>
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>}>
        <ApprovalContent />
      </Suspense>
    </TravelShell>
  )
}
