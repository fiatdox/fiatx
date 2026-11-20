'use client'
// ตรวจการเบิกค่าใช้จ่ายเดินทาง — HRD (ตรวจยอด/สิทธิ์ ปรับยอดรายรายการพร้อมเหตุผล → ส่งการเงิน หรือส่งกลับ) และการเงิน (ยืนยัน/ตีกลับ HRD · ไม่แก้ยอด → ปิดเรื่อง)
// ไม่ผ่าน HRD ไม่ถึงการเงิน · ทุกยอดปิดที่การเงิน · สิทธิ์ตรวจที่ backend (src/controllers/hrdTravelClaimController.ts)
import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Card, ConfigProvider, Empty, Grid, Input, Radio, Result, Spin, Tag, Typography } from 'antd'
import { CheckOutlined, RollbackOutlined, SendOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { TRAVEL_BASE, TRAVEL_COLOR, TravelApiError, TravelShell, travelApi } from '../travelShared'
import { requestNo, thaiDateShort, thaiDateTime } from '../travelCalc'
import {
  CategoryTable, ClaimHistoryList, ClaimItemsTable, ClaimStatusTag, ClaimSteps, MODE_LABEL, ReceiptFiles, SettlementBox,
  lastNote, money2, type ClaimMode, type ClaimResp, type ClaimStatus, type HrdEdits, type Settlement,
} from '../claimShared'

const { Title, Text } = Typography
type Queue = 'hrd' | 'finance_returned' | 'returned' | 'overdue' | 'finance' | 'verified' | 'closed'
const QUEUE: Record<Queue, { label: string; color: string; hint: string }> = {
  hrd: { label: 'รอ HRD ตรวจ', color: '#0d9488', hint: 'ผู้เดินทางส่งเบิกแล้ว — ตรวจยอดและสิทธิ์ ปรับยอดได้รายรายการ แล้วส่งการเงิน' },
  finance_returned: { label: 'การเงินตีกลับ', color: '#ea580c', hint: 'การเงินตีกลับให้ HRD ตรวจใหม่ — ดูเหตุผลจากการเงิน' },
  returned: { label: 'ส่งกลับผู้เดินทาง', color: '#64748b', hint: 'รอผู้เดินทางแก้ไขแล้วส่งใหม่' },
  overdue: { label: 'ยังไม่ส่งเบิก', color: '#dc2626', hint: 'ผอ. อนุมัติและเดินทางกลับนานแล้ว แต่ยังไม่ส่งเบิก' },
  finance: { label: 'รอการเงินตรวจ', color: '#2563eb', hint: 'HRD ตรวจแล้ว — การเงินยืนยันยอด หรือตีกลับ HRD (ไม่แก้ยอด)' },
  verified: { label: 'รอคืนเงิน/จ่ายเพิ่ม', color: '#7c3aed', hint: 'ยืนยันยอดแล้ว — รอผู้ยืมคืนเงิน หรือการเงินจ่ายเงิน แล้วปิดเรื่อง' },
  closed: { label: 'ปิดเรื่องแล้ว', color: '#047857', hint: 'เสร็จสิ้น' },
}
interface Row {
  request_id: number; subject: string; location: string; start_at: string; end_at: string; requester_name: string; estimate_total: number; traveler_count: number
  id: number | null; kind: 'claim' | 'refund' | null; mode: ClaimMode | null; status: ClaimStatus | null; finance_returned: boolean | null; claimed_total: number | null; approved_total: number | null
  advance_amount: number | null; submitted_at: string | null; hrd_at: string | null; over_count: number | null; settlement: Settlement | null
}
interface ListResp { queue: Queue; queues: Queue[]; counts: Record<Queue, number>; overdue_days: number; rows: Row[]; can_hrd: boolean; can_finance: boolean }
const card: React.CSSProperties = { borderRadius: 12 }
const solid = { components: { Radio: { buttonSolidCheckedBg: '#0d9488', buttonSolidCheckedHoverBg: '#0f766e', buttonSolidCheckedActiveBg: '#115e59' } } }

const Detail = ({ requestId, onDone }: { requestId: number; onDone: () => void }) => {
  const { message } = App.useApp()
  const [d, setD] = useState<ClaimResp | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [edits, setEdits] = useState<HrdEdits>({})
  const [action, setAction] = useState<'pass' | 'return'>('pass')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setD(await travelApi<ClaimResp>(`claims/request/${requestId}`)); setError(null) }
    catch (e) { setError(e instanceof TravelApiError && e.status === 403 ? 'ไม่มีสิทธิ์ดูการเบิกนี้' : (e as Error).message) }
  }, [requestId])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { setD(null); setEdits({}); setNote(''); setAction('pass'); load() }, [load])
  if (error) return <Alert type="warning" showIcon title={error} />
  if (!d) return <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>
  const r = d.request, c = d.claim
  if (!c) return (
    <Card style={card}>
      <Title level={5} style={{ marginTop: 0 }}>{requestNo(r.id)} · {r.subject}</Title>
      <Text>{r.requester_name} · กลับถึง {thaiDateTime(r.end_at)} · ประมาณการ {money2(r.total_amount)} บาท</Text>
      <Alert style={{ marginTop: 12 }} type="warning" showIcon title="ผู้ขอยังไม่ส่งเบิก" description="ระบบแจ้งเตือนผู้ขอในหน้ารายการคำขอแล้ว — ติดตามให้ส่งเบิกพร้อมรายงานการเดินทาง" />
      {d.can_edit && d.travelers.length > 1 && (
        <Link href={`${TRAVEL_BASE}/claim?id=${r.id}`} data-testid="file-for-group"><Button type="primary" style={{ marginTop: 12 }}>เบิกแทนคณะ ({d.travelers.length} คน)</Button></Link>
      )}
    </Card>
  )
  const edit = (id: number, v: { amount?: number | null; note?: string }) => setEdits(p => ({ ...p, [id]: { amount: v.amount !== undefined ? v.amount : p[id]?.amount ?? null, note: v.note !== undefined ? v.note : p[id]?.note ?? '' } }))
  const approvedOf = (id: number, claimed: number) => edits[id]?.amount ?? claimed
  const hrdTotal = Math.round(c.items.reduce((s, i) => s + (d.can_hrd ? approvedOf(i.id, i.claimed_amount) : i.approved_amount ?? i.claimed_amount), 0) * 100) / 100
  const changed = c.items.filter(i => Math.abs(approvedOf(i.id, i.claimed_amount) - i.claimed_amount) > 0.004)
  const missingNote = changed.some(i => !(edits[i.id]?.note ?? '').trim())
  const financeNote = c.finance_returned ? lastNote(c.history, 'finance_returned') : null
  const act = async (path: string, body: unknown, key: string) => {
    setBusy(key)
    try {
      const res = await fetch(`/api/v1/hrd/travel/claims/${c.id}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.success === false) { message.error(j.message ?? 'บันทึกไม่สำเร็จ'); return }
      message.success(j.message ?? 'บันทึกแล้ว'); onDone()
    } catch (e) { message.error((e as Error).message) } finally { setBusy(null) }
  }
  const approvedByCat = d.can_hrd ? (() => {
    const map: Record<string, string> = { allowance: 'allowance', lodging: 'lodging', registration: 'registration', fuel: 'transport', toll: 'transport', fare: 'transport', taxi: 'transport', other: 'other' }
    const out = { allowance: 0, lodging: 0, transport: 0, registration: 0, other: 0 } as Record<'allowance' | 'lodging' | 'transport' | 'registration' | 'other', number>
    for (const i of c.items) out[map[i.category] as keyof typeof out] += approvedOf(i.id, i.claimed_amount)
    return out
  })() : c.approved
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} data-testid="claim-detail">
      <Card style={card} size="small">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <Title level={5} style={{ margin: 0 }}>{requestNo(r.id)} · {MODE_LABEL[c.mode]}{c.mode === 'advance' ? ` ${c.advance_no ?? ''} (${money2(c.advance_amount)})` : ''}</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>{r.subject} · {r.location}</Text>
            <div style={{ fontSize: 13 }}>{r.requester_name} (ผู้ขอ){d.travelers.length > 1 ? ` + ${d.travelers.length - 1} คน` : ''}{c.kind === 'refund' ? ' · ยกเลิกการเดินทาง' : ` · เดินทางจริง ${thaiDateTime(c.actual_start_at)} – ${thaiDateTime(c.actual_end_at)} · เบี้ยเลี้ยง ${c.allowance_days} วัน`}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <ClaimStatusTag status={c.status} financeReturned={c.finance_returned} />
            <Link href={`${TRAVEL_BASE}/report?id=${r.id}`} style={{ fontSize: 13 }}>รายงานการเดินทาง ›</Link>
          </div>
        </div>
        <div style={{ marginTop: 12 }}><ClaimSteps status={c.status} /></div>
      </Card>
      {c.kind === 'refund' && <Alert type="warning" showIcon data-testid="refund-note" title={`ยกเลิกการเดินทาง — คืนเงินยืมเต็มจำนวน ${money2(c.advance_amount)} บาท`}
        description={d.can_hrd ? 'ไม่มีรายการค่าใช้จ่าย — ตรวจเลขที่สัญญายืมและยอดเงินยืม แล้วส่งการเงินรับคืน' : undefined} />}
      {d.hrd_blocked && <Alert type="info" showIcon data-testid="hrd-blocked" title={d.hrd_blocked} />}
      {(c.absent_user_ids?.length ?? 0) > 0 && <Alert type="info" showIcon title={`ไม่ได้เดินทาง (ตัดออก): ${d.travelers.filter(t => c.absent_user_ids.includes(t.user_id)).map(t => t.name).join(', ')}`} />}
      {c.submitted_by && c.submitted_by !== r.requester_id && c.kind === 'claim' && <Alert type="info" showIcon title={`HRD บันทึกเบิกแทนคณะ: ${c.submitted_by_name ?? '-'}`} />}
      {financeNote && d.can_hrd && <Alert type="warning" showIcon title="การเงินตีกลับ" description={<div style={{ whiteSpace: 'pre-wrap' }}>{financeNote}</div>} data-testid="finance-returned" />}
      {d.can_finance && <Alert type="info" showIcon title="มาถึงการเงินหลัง HRD ตรวจยอดและสิทธิ์แล้ว · การเงินยืนยันหรือตีกลับเท่านั้น ไม่แก้ยอด" />}

      {c.kind !== 'refund' && <Card title="รายการเบิก" style={card} size="small" extra={d.can_hrd ? <Text type="secondary" style={{ fontSize: 12 }}>แก้ยอดในช่อง &quot;HRD อนุมัติ&quot; ได้ — แก้แล้วต้องใส่เหตุผล</Text> : undefined}>
        <ClaimItemsTable items={c.items} {...(d.can_hrd ? { edits, onEdit: edit } : {})} />
      </Card>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 14 }}>
        {c.kind !== 'refund' && <Card title="สรุปรายหมวด" style={card} size="small">
          <CategoryTable estimate={r.estimate} claimed={c.claimed} approved={approvedByCat} reasons={c.over_reasons} />
        </Card>}
        <Card title={c.mode === 'advance' ? 'ล้างเงินยืม' : 'เบิกคืน'} style={card} size="small">
          <SettlementBox mode={c.mode} advance={c.advance_amount} total={hrdTotal} label="HRD อนุมัติ" />
          {c.settle_note && <Text type="secondary" style={{ display: 'block', fontSize: 12.5, marginTop: 8 }}>ปิดเรื่อง: {c.settle_note}</Text>}
        </Card>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 14 }}>
        <Card title={`ใบเสร็จ/หลักฐาน (${d.receipts.length})`} style={card} size="small"><ReceiptFiles requestId={r.id} files={d.receipts} editable={false} /></Card>
        <Card title="ประวัติ" style={card} size="small"><ClaimHistoryList history={c.history} /></Card>
      </div>

      {d.can_hrd && (
        <Card title="ผลการตรวจ (HRD)" style={card} size="small" data-testid="hrd-actions">
          <ConfigProvider theme={solid}>
            <Radio.Group value={action} onChange={e => setAction(e.target.value)} optionType="button" buttonStyle="solid"
              options={c.kind === 'refund'
                // คืนเงินยืม (ยกเลิกเดินทาง) ไม่มีอะไรให้ผู้เดินทางแก้ — ส่งการเงินรับคืนอย่างเดียว
                ? [{ value: 'pass', label: `ส่งการเงินรับคืน ${money2(c.advance_amount)} บาท` }]
                : [{ value: 'pass', label: `ส่งการเงิน ${money2(hrdTotal)} บาท` }, { value: 'return', label: 'ส่งกลับให้ผู้เดินทางแก้ไข' }]} />
          </ConfigProvider>
          <Input.TextArea rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} style={{ marginTop: 10 }} aria-label="หมายเหตุผลการตรวจ"
            placeholder={action === 'return' ? 'สิ่งที่ต้องแก้ (บังคับ) เช่น ขาดใบเสร็จค่าที่พัก ยอดไม่ตรงใบเสร็จ' : 'หมายเหตุถึงการเงิน (ไม่บังคับ)'} status={action === 'return' && !note.trim() ? 'warning' : undefined} />
          {action === 'pass' && changed.length > 0 && <Text style={{ display: 'block', fontSize: 12.5, marginTop: 6, color: '#9a3412' }}>ปรับยอด {changed.length} รายการ{missingNote ? ' — ใส่เหตุผลให้ครบทุกรายการที่ปรับ' : ''}</Text>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            {action === 'pass'
              ? <Button type="primary" icon={<SendOutlined />} loading={busy === 'hrd'} disabled={missingNote} style={{ background: '#0f766e' }}
                  onClick={() => act('hrd', { action: 'pass', note: note.trim() || null, items: changed.map(i => ({ id: i.id, approved_amount: approvedOf(i.id, i.claimed_amount), hrd_note: edits[i.id]?.note ?? '' })) }, 'hrd')}>{c.kind === 'refund' ? `ส่งการเงินรับคืน ${money2(c.advance_amount)}` : `ส่งการเงิน ${money2(hrdTotal)}`}</Button>
              : <Button icon={<RollbackOutlined />} loading={busy === 'hrd'} disabled={!note.trim()} onClick={() => act('hrd', { action: 'return', note }, 'hrd')}>ส่งกลับผู้เดินทาง</Button>}
          </div>
        </Card>
      )}
      {d.can_finance && (
        <Card title="ผลการตรวจ (การเงิน)" style={card} size="small" data-testid="finance-actions">
          <Input.TextArea rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} aria-label="หมายเหตุการเงิน"
            placeholder="เหตุผล (บังคับเมื่อตีกลับ) เช่น ใบเสร็จตัวจริงไม่ครบ ยอดในใบเสร็จไม่ตรงกับที่ HRD อนุมัติ" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <Button icon={<RollbackOutlined />} loading={busy === 'freturn'} disabled={!note.trim() || !!busy} onClick={() => act('finance', { action: 'return', note }, 'freturn')}>ตีกลับให้ HRD ตรวจใหม่</Button>
            <Button type="primary" icon={<CheckOutlined />} loading={busy === 'verify'} disabled={!!busy} onClick={() => act('finance', { action: 'verify', note: note.trim() || null }, 'verify')}>ตรวจถูกต้อง ยืนยันยอด {money2(c.approved_total)}</Button>
          </div>
        </Card>
      )}
      {d.can_close && (
        <Card title={c.settlement.refund > 0 ? `รอผู้ยืมคืนเงิน ${money2(c.settlement.refund)} บาท` : `รอการเงินจ่าย${c.mode === 'advance' ? 'เพิ่ม' : 'คืน'} ${money2(c.settlement.pay)} บาท`} style={card} size="small" data-testid="close-actions">
          <Input value={note} maxLength={300} onChange={e => setNote(e.target.value)} placeholder="หลักฐาน เช่น ใบเสร็จรับเงินคืน เล่ม/เลขที่ หรือเลขที่ฎีกา/วันที่โอน" aria-label="หลักฐานการคืน/จ่ายเงิน" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <Button type="primary" loading={busy === 'close'} disabled={!note.trim()} onClick={() => act('close', { note }, 'close')}>ปิดเรื่อง</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

const ClaimsContent = () => {
  const router = useRouter()
  const sp = useSearchParams()
  const screens = Grid.useBreakpoint()
  const [list, setList] = useState<ListResp | null>(null)
  const [error, setError] = useState<string | null>(null)
  const queue = (sp.get('queue') ?? '') as Queue
  const sel = Number(sp.get('id')) || null
  const load = useCallback(async () => {
    try { setList(await travelApi<ListResp>(`claims${queue ? `?queue=${queue}` : ''}`)); setError(null) }
    catch (e) { setError(e instanceof TravelApiError && e.status === 403 ? 'หน้านี้สำหรับเจ้าหน้าที่ HRD และการเงิน' : (e as Error).message) }
  }, [queue])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  const go = (q: Queue, id?: number | null) => router.replace(`${TRAVEL_BASE}/claims?queue=${q}${id ? `&id=${id}` : ''}`, { scroll: false })
  if (error) return <Result status="403" title={error} extra={<Link href={`${TRAVEL_BASE}/requests`}><Button>กลับรายการคำขอ</Button></Link>} />
  if (!list) return <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>
  const current = list.queue
  const selected = list.rows.find(x => x.request_id === sel) ? sel : null
  const narrow = screens.lg === false
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'flex-end', marginBottom: 14 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>ตรวจการเบิกค่าใช้จ่ายเดินทาง</Title>
          <Text type="secondary">{list.can_hrd && list.can_finance ? 'HRD และการเงิน' : list.can_hrd ? 'เจ้าหน้าที่ HRD — ตรวจยอดและสิทธิ์ก่อนส่งการเงิน' : 'การเงิน — ยืนยันยอดหรือตีกลับ HRD'}</Text>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }} data-testid="claim-queues">
        {list.queues.map(q => {
          const on = q === current
          return (
            <button key={q} type="button" data-queue={q} onClick={() => go(q)} title={QUEUE[q].hint}
              style={{ flex: 'none', padding: '8px 14px', minHeight: 40, borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: on ? 600 : 400,
                border: `1px solid ${on ? QUEUE[q].color : 'var(--app-border)'}`, background: on ? QUEUE[q].color : 'var(--app-card-bg, #fff)', color: on ? '#fff' : 'inherit' }}>
              {q === 'overdue' ? `ยังไม่ส่งเบิก (เกิน ${list.overdue_days} วัน)` : QUEUE[q].label} {list.counts[q] ?? 0}
            </button>
          )
        })}
      </div>
      <Text type="secondary" style={{ display: 'block', fontSize: 12.5, marginBottom: 10 }}>{QUEUE[current].hint}</Text>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
        {(!narrow || !selected) && (
          <nav aria-label="รายการเบิก" style={{ flex: '1 1 300px', minWidth: 0, maxWidth: narrow ? 'none' : 380, background: 'var(--app-card-bg, #fff)', border: '1px solid var(--app-border)', borderRadius: 12, overflow: 'hidden' }} data-testid="claim-list">
            {list.rows.length === 0 && <Empty style={{ padding: 24 }} description="ไม่มีรายการ" />}
            {list.rows.map(x => {
              const on = x.request_id === selected
              return (
                <a key={x.request_id} href={`${TRAVEL_BASE}/claims?queue=${current}&id=${x.request_id}`} onClick={e => { e.preventDefault(); go(current, x.request_id) }} data-testid="claim-row"
                  style={{ display: 'block', padding: '12px 14px', borderBottom: '1px solid var(--app-border)', textDecoration: 'none', color: 'inherit', background: on ? 'rgba(99,102,241,0.08)' : undefined, borderLeft: `3px solid ${on ? TRAVEL_COLOR : 'transparent'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <b>{requestNo(x.request_id)}</b>
                    {x.kind === 'refund' ? <Tag color="volcano" style={{ marginInlineEnd: 0 }}>คืนเงินยืม (ยกเลิก)</Tag>
                      : x.mode ? <Tag color={x.mode === 'advance' ? 'geekblue' : 'green'} style={{ marginInlineEnd: 0 }}>{MODE_LABEL[x.mode]}</Tag> : <Tag color="red" style={{ marginInlineEnd: 0 }}>ยังไม่ส่ง</Tag>}
                  </div>
                  <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.subject} · {x.traveler_count} คน</div>
                  <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>
                    {x.requester_name} · {x.kind === 'refund' ? `คืน ${money2(x.advance_amount)}` : x.id ? `ขอเบิก ${money2(x.claimed_total)}${x.approved_total != null && current !== 'hrd' ? ` · อนุมัติ ${money2(x.approved_total)}` : ''}` : `กลับ ${thaiDateShort(x.end_at)}`}
                    {(x.over_count ?? 0) > 0 && current === 'hrd' && <span style={{ color: '#c2410c' }}> · เกินประมาณการ {x.over_count} หมวด</span>}
                  </div>
                </a>
              )
            })}
          </nav>
        )}
        <div style={{ flex: '999 1 600px', minWidth: 0 }}>
          {selected ? <>
            {narrow && <Button style={{ marginBottom: 10 }} onClick={() => go(current)}>‹ กลับรายการ</Button>}
            <Detail key={selected} requestId={selected} onDone={() => { load(); go(current) }} />
          </> : !narrow && <Card style={card}><Empty description="เลือกรายการทางซ้ายเพื่อตรวจ" /></Card>}
        </div>
      </div>
    </>
  )
}

export default function ClaimsPage() {
  return (
    <TravelShell current="ตรวจการเบิกค่าใช้จ่าย" fluid>
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>}><ClaimsContent /></Suspense>
    </TravelShell>
  )
}
