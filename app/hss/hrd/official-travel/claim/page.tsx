'use client'
// เบิกค่าใช้จ่ายจริง (เคลียร์ค่าใช้จ่าย) ของคำขอหนึ่ง (?id=<คำขอ>) — ผู้ขอเบิกแทนทั้งคณะ
// ส่วนที่คิดจากกติกา (เบี้ยเลี้ยง · ที่พักเหมาจ่าย · ค่าน้ำมันรถส่วนตัว) ระบบคิดให้ แก้ไม่ได้ · ส่วนที่ต้องตามใบเสร็จมีเพดานกัน
// ตัวเลขบนหน้านี้เป็นตัวอย่างระหว่างกรอก — backend คิดใหม่และตรวจทุกช่องตอนบันทึก (src/services/travelClaimCalc.ts)
// ผู้ร่วมเดินทาง / HRD / การเงิน เปิดดูแบบอ่านอย่างเดียว
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Checkbox, Col, ConfigProvider, Descriptions, Input, InputNumber, Radio, Result, Row, Select, Space, Spin, TimePicker, Typography } from 'antd'
import { SaveOutlined, SendOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DATE_FORMAT, ThaiDatePicker } from '@/app/general/contracts/contractShared'
import { TRAVEL_BASE, TRAVEL_COLOR, TravelApiError, TravelShell, travelApi } from '../travelShared'
import { allowanceDays, maxMeals, personAllowance, requestNo, round2, thaiDateTime, tripNights, type LodgingMode, type RoomType } from '../travelCalc'
import {
  CATEGORY_LABEL, CLAIM_CATEGORIES, CategoryTable, ClaimHistoryList, ClaimItemsTable, ClaimStatusTag, ClaimSteps, ReceiptFiles, SettlementBox,
  lastNote, money2, type ClaimCategory, type ClaimMode, type ClaimResp,
} from '../claimShared'

const { Title, Text } = Typography
const card: React.CSSProperties = { borderRadius: 12 }
// ปุ่มตัวเลือกที่เลือกแล้วเป็นสีทึบ (แบบเดียวกับหน้ายื่นคำขอ)
const solid = { components: { Radio: { buttonSolidCheckedBg: TRAVEL_COLOR, buttonSolidCheckedHoverBg: '#4f46e5', buttonSolidCheckedActiveBg: '#4338ca' } } }

/** absent = ไม่ได้เดินทาง (ตัดออก ไม่นับประวัติ) · own = เวลาไป-กลับของคนนี้ต่างจากคณะ (กลับก่อน/ไปไม่ครบวัน) */
interface PersonInput { room: RoomType; lodging: number | null; registration: number | null; absent: boolean; own: boolean; sd: Dayjs | null; stt: Dayjs | null; ed: Dayjs | null; et: Dayjs | null }
interface FormState {
  mode: ClaimMode; advanceNo: string; advanceAmount: number | null; advanceDate: Dayjs | null
  startDate: Dayjs | null; startTime: Dayjs | null; endDate: Dayjs | null; endTime: Dayjs | null; meals: number
  lodgingMode: LodgingMode; nights: number | null; people: Record<number, PersonInput>
  km: number | null; toll: number | null; fare: number | null; taxi: number | null; other: number | null; otherDesc: string
  reasons: Partial<Record<ClaimCategory, string>>; confirmed: boolean
}
const join = (d: Dayjs | null, t: Dayjs | null) => d && t ? d.hour(t.hour()).minute(t.minute()).second(0).millisecond(0) : null

const ClaimContent = () => {
  const { message } = App.useApp()
  const id = Number(useSearchParams().get('id')) || null
  const [data, setData] = useState<ClaimResp | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState<FormState | null>(null)
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null)
  const [errField, setErrField] = useState<string | null>(null)

  const load = useCallback(async (initForm = true) => {
    if (!id) { setError('ไม่พบคำขอ'); return }
    try {
      const d = await travelApi<ClaimResp>(`claims/request/${id}`)
      setData(d)
      if (!initForm) return
      const c = d.claim, r = d.request
      const st = dayjs(c?.actual_start_at ?? r.start_at), en = dayjs(c?.actual_end_at ?? r.end_at)
      const people: Record<number, PersonInput> = {}
      for (const t of d.travelers) {
        const li = c?.items.find(i => i.category === 'lodging' && i.user_id === t.user_id)
        const ri = c?.items.find(i => i.category === 'registration' && i.user_id === t.user_id)
        const pt = c?.person_times?.[String(t.user_id)]
        const ps = dayjs(pt?.start ?? c?.actual_start_at ?? r.start_at), pe = dayjs(pt?.end ?? c?.actual_end_at ?? r.end_at)
        people[t.user_id] = { room: li?.room ?? (d.travelers.length > 1 ? 'double' : 'single'), lodging: li && !li.computed ? li.claimed_amount : null, registration: ri?.claimed_amount ?? null,
          absent: !!c?.absent_user_ids?.includes(t.user_id), own: !!pt, sd: ps, stt: ps, ed: pe, et: pe }
      }
      const amt = (k: string) => c?.items.filter(i => i.category === k).reduce((s, i) => s + i.claimed_amount, 0) || null
      setF({
        mode: c?.mode ?? 'advance', advanceNo: c?.advance_no ?? '', advanceAmount: c?.advance_amount ?? null, advanceDate: c?.advance_date ? dayjs(c.advance_date) : null,
        startDate: st, startTime: st, endDate: en, endTime: en, meals: c?.meals_provided ?? r.meals_provided ?? 0,
        lodgingMode: c?.lodging_mode ?? r.lodging_mode ?? 'none', nights: c ? c.lodging_nights || null : r.lodging_nights || null, people,
        km: c?.distance_km ?? r.distance_km ?? null, toll: amt('toll'), fare: amt('fare'), taxi: amt('taxi'), other: amt('other'), otherDesc: c?.other_desc ?? '',
        reasons: c?.over_reasons ?? {}, confirmed: false,
      })
    } catch (e) { setError(e instanceof TravelApiError && (e.status === 403 || e.status === 404) ? 'ไม่พบคำขอ หรือไม่มีสิทธิ์ดูการเบิกนี้' : (e as Error).message) }
  }, [id])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(p => p ? { ...p, [k]: v } : p)
  const setPerson = (uid: number, v: Partial<PersonInput>) => setF(p => p ? { ...p, people: { ...p.people, [uid]: { ...p.people[uid], ...v } } } : p)

  // ── ตัวอย่างยอดระหว่างกรอก (สูตรเดียวกับ backend) ──
  const calc = useMemo(() => {
    if (!data || !f) return null
    const s = join(f.startDate, f.startTime), e = join(f.endDate, f.endTime)
    const ok = !!s && !!e && e.isAfter(s)
    const days = ok ? allowanceDays(s!.valueOf(), e!.valueOf()).days : 0
    const maxNights = ok ? tripNights(s!.valueOf(), e!.valueOf()) : 0
    const nights = f.lodgingMode === 'none' ? 0 : Math.min(f.nights ?? 0, maxNights)
    const rows = data.travelers.map(t => {
      const p = f.people[t.user_id]
      if (p?.absent) return { t, absent: true, days: 0, nights: 0, allowance: 0, cap: 0, lodging: 0, registration: 0, overCap: false, badTime: false }
      // เวลารายคน (กลับก่อน/ไปไม่ครบวัน) — ต้องอยู่ในช่วงของคณะ
      const ps = p?.own ? join(p.sd, p.stt) : s, pe = p?.own ? join(p.ed, p.et) : e
      const pok = ok && !!ps && !!pe && pe.isAfter(ps) && !ps.isBefore(s!) && !pe.isAfter(e!)
      const pdays = pok ? allowanceDays(ps!.valueOf(), pe!.valueOf()).days : 0
      const pn = pok ? Math.min(nights, tripNights(ps!.valueOf(), pe!.valueOf())) : 0
      const allowance = personAllowance(t.rate, pdays, Math.min(f.meals, maxMeals(pdays)))
      const rate = f.lodgingMode === 'lump' ? t.lodging.lump : p?.room === 'single' ? t.lodging.single : t.lodging.double
      const cap = round2(rate * pn)
      const lodging = f.lodgingMode === 'lump' ? cap : f.lodgingMode === 'actual' ? Number(p?.lodging ?? 0) : 0
      return { t, absent: false, days: pdays, nights: pn, allowance, cap, lodging, registration: Number(p?.registration ?? 0), overCap: f.lodgingMode === 'actual' && lodging > cap + 0.004, badTime: !!p?.own && !pok }
    })
    const presentN = rows.filter(x => !x.absent).length
    const mode = data.request.vehicle_mode
    const fuel = mode === 'private' ? round2(Number(f.km ?? 0) * Number(data.request.rate_per_km ?? 0)) : 0
    const transport = round2(fuel + (mode === 'gov_car' || mode === 'private' ? Number(f.toll ?? 0) : 0) + (['bus', 'plane', 'other'].includes(mode) ? Number(f.fare ?? 0) + Number(f.taxi ?? 0) : 0))
    const claimed: Record<ClaimCategory, number> = {
      allowance: round2(rows.reduce((x, r) => x + r.allowance, 0)), lodging: round2(rows.reduce((x, r) => x + r.lodging, 0)),
      transport, registration: round2(rows.reduce((x, r) => x + r.registration, 0)), other: round2(Number(f.other ?? 0)),
    }
    const total = round2(CLAIM_CATEGORIES.reduce((x, c) => x + claimed[c], 0))
    const over = CLAIM_CATEGORIES.filter(c => claimed[c] > (data.request.estimate[c] ?? 0) + 0.004)
    const fareCap = (mode === 'bus' || mode === 'plane') && data.request.route_max_fare != null ? data.request.route_max_fare * 2 * presentN : null
    return { ok, days, maxNights, nights, rows, presentN, fuel, claimed, total, over, fareCap, hours: ok ? e!.diff(s!, 'minute') / 60 : 0 }
  }, [data, f])

  const save = async (submit: boolean) => {
    if (!data || !f || !calc) return
    const s = join(f.startDate, f.startTime), e = join(f.endDate, f.endTime)
    setSaving(submit ? 'submit' : 'draft'); setErrField(null)
    try {
      const body = {
        submit, confirmed: f.confirmed, mode: f.mode,
        ...(f.mode === 'advance' ? { advance_no: f.advanceNo.trim() || null, advance_amount: f.advanceAmount, advance_date: f.advanceDate?.format('YYYY-MM-DD') ?? null } : {}),
        actual_start_at: s?.toISOString() ?? null, actual_end_at: e?.toISOString() ?? null, meals_provided: f.meals,
        lodging_mode: f.lodgingMode, lodging_nights: f.lodgingMode === 'none' ? 0 : f.nights,
        travelers: data.travelers.map(t => {
          const p = f.people[t.user_id]
          if (p?.absent) return { user_id: t.user_id, absent: true }
          return { user_id: t.user_id, room: p?.room, lodging_amount: f.lodgingMode === 'actual' ? p?.lodging ?? 0 : 0, registration_amount: p?.registration ?? 0,
            ...(p?.own ? { actual_start_at: join(p.sd, p.stt)?.toISOString() ?? null, actual_end_at: join(p.ed, p.et)?.toISOString() ?? null } : {}) }
        }),
        distance_km: data.request.vehicle_mode === 'private' ? f.km : null, toll_amount: f.toll ?? 0, fare_amount: f.fare ?? 0, taxi_amount: f.taxi ?? 0,
        other_amount: f.other ?? 0, other_desc: f.otherDesc.trim() || null,
        over_reasons: Object.fromEntries(calc.over.map(c => [c, f.reasons[c]?.trim() ?? ''])),
      }
      const res = await fetch(`/api/v1/hrd/travel/claims/request/${data.request.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.success === false) { setErrField(j.field ?? null); message.error(j.message ?? 'บันทึกไม่สำเร็จ'); return }
      message.success(j.message ?? 'บันทึกแล้ว')
      await load(submit)
    } catch (err) { message.error((err as Error).message) } finally { setSaving(null) }
  }

  if (error) return <Result status="warning" title={error} extra={<Link href={`${TRAVEL_BASE}/requests`}><Button>กลับรายการคำขอ</Button></Link>} />
  if (!data || !f || !calc) return <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>
  const r = data.request, c = data.claim
  const returnedNote = c?.status === 'returned' ? lastNote(c.history, 'hrd_returned') : null
  const mode = r.vehicle_mode
  const bad = (k: string) => errField === k || errField?.startsWith(`${k}.`) ? 'error' as const : undefined

  const header = (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>เบิกค่าใช้จ่ายจริง</Title>
        <Text type="secondary">อ้างอิง <b>{requestNo(r.id)}</b> · {r.subject} · {r.location} · ผู้เดินทาง {data.travelers.length} คน</Text>
      </div>
      <ClaimStatusTag status={c?.status} />
    </div>
  )

  // ── อ่านอย่างเดียว (ส่งแล้ว / ผู้ร่วมเดินทาง / HRD / การเงิน) ──
  if (!data.can_edit) {
    if (!c) return <>{header}<Alert type="info" showIcon title={data.claimable ? 'ผู้ขอยังไม่ได้บันทึกการเบิก' : 'คำขอนี้ยังเบิกไม่ได้ — ต้องให้ผู้อำนวยการอนุมัติการเดินทางก่อน'} /></>
    return (
      <>
        {header}
        <Card style={{ ...card, marginBottom: 14 }} size="small"><ClaimSteps status={c.status} /></Card>
        <Row gutter={[14, 14]}>
          <Col xs={24} lg={16}>
            {c.kind === 'refund' && <Alert type="warning" showIcon style={{ marginBottom: 14 }} title={`ยกเลิกการเดินทาง — คืนเงินยืมเต็มจำนวน ${money2(c.advance_amount)} บาท`} />}
            {(c.absent_user_ids?.length ?? 0) > 0 && <Alert type="info" showIcon style={{ marginBottom: 14 }} data-testid="absent-note"
              title={`ไม่ได้เดินทาง (ไม่นับในประวัติ): ${data.travelers.filter(t => c.absent_user_ids.includes(t.user_id)).map(t => t.name).join(', ')}`} />}
            {c.kind !== 'refund' && <Card title="รายการเบิก" style={card} size="small"><ClaimItemsTable items={c.items} /></Card>}
            <Card title="ประวัติ" style={{ ...card, marginTop: 14 }} size="small"><ClaimHistoryList history={c.history} /></Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="สรุปยอด" style={card} size="small">
              <CategoryTable estimate={r.estimate} claimed={c.claimed} approved={c.approved} reasons={c.over_reasons} />
              <div style={{ marginTop: 10 }}><SettlementBox mode={c.mode} advance={c.advance_amount} total={c.approved_total ?? c.claimed_total} label={c.approved_total != null ? 'HRD อนุมัติ' : 'ขอเบิก'} /></div>
              {c.settle_note && <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12.5 }}>ปิดเรื่อง: {c.settle_note}</Text>}
            </Card>
            <Card title="ใบเสร็จ/หลักฐาน" style={{ ...card, marginTop: 14 }} size="small"><ReceiptFiles requestId={r.id} files={data.receipts} editable={false} /></Card>
          </Col>
        </Row>
      </>
    )
  }

  // ── แบบฟอร์มผู้ขอ ──
  const reportOk = data.report_status === 'submitted'
  const needReceipts = calc.rows.some(x => (f.lodgingMode === 'actual' && x.lodging > 0) || x.registration > 0) || Number(f.toll ?? 0) + Number(f.fare ?? 0) + Number(f.taxi ?? 0) + Number(f.other ?? 0) > 0
  const missingReason = calc.over.filter(k => !f.reasons[k]?.trim())
  const blockers = [
    !reportOk && 'ส่งรายงานการเดินทาง',
    needReceipts && data.receipts.length === 0 && 'แนบใบเสร็จ',
    missingReason.length > 0 && `ระบุเหตุผลที่เบิกเกินประมาณการ (${missingReason.map(k => CATEGORY_LABEL[k]).join(', ')})`,
    calc.rows.some(x => x.overCap) && 'ค่าที่พักเกินเพดาน',
    calc.presentN === 0 && 'ต้องมีผู้เดินทางจริงอย่างน้อย 1 คน (ไม่ได้ไปทั้งคณะ ให้ยกเลิกคำขอ)',
    calc.rows.some(x => x.badTime) && 'เวลาไป-กลับรายคนต้องอยู่ในช่วงเดินทางของคณะ',
    !f.confirmed && 'ติ๊กยืนยันว่าตรวจยอดกับใบเสร็จแล้ว',
  ].filter(Boolean) as string[]
  const money = (v: number | null, on: (n: number | null) => void, label: string, field: string, max?: number) => (
    <InputNumber min={0} max={max ?? 1000000} precision={2} value={v} onChange={on} style={{ width: '100%' }} aria-label={label} status={bad(field)}
      formatter={x => x === undefined || x === null || `${x}` === '' ? '' : `${x}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={x => (x ?? '').replace(/,/g, '') as unknown as number} />
  )
  return (
    <>
      {header}
      <Card style={{ ...card, marginBottom: 14 }} size="small"><ClaimSteps status={c?.status ?? null} /></Card>
      {data.filing_for_group && <Alert type="info" showIcon style={{ marginBottom: 14 }} data-testid="filing-for-group" title="ท่านกำลังเบิกแทนคณะ (เจ้าหน้าที่ HRD)"
        description="ผู้ที่บันทึกส่งจะตรวจการเบิกนี้เองไม่ได้ — เจ้าหน้าที่ HRD คนอื่นเป็นผู้ตรวจ · ต้องส่งรายงานการเดินทางก่อนเหมือนกัน" />}
      {returnedNote && <Alert type="warning" showIcon style={{ marginBottom: 14 }} data-testid="claim-returned" title="HRD ส่งกลับให้แก้ไข"
        description={<div style={{ whiteSpace: 'pre-wrap' }}>{returnedNote}</div>} />}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 620px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 1 รูปแบบ */}
          <Card title="1. รูปแบบการเบิก" style={card} size="small">
            <ConfigProvider theme={solid}>
              <Radio.Group value={f.mode} onChange={e => set('mode', e.target.value)} optionType="button" buttonStyle="solid" data-testid="claim-mode"
                options={[{ value: 'advance', label: 'ยืมเงินแล้ว — ล้างเงินยืม' }, { value: 'reimburse', label: 'สำรองจ่ายเอง — ขอเบิกคืน' }]} />
            </ConfigProvider>
            <Text type="secondary" style={{ display: 'block', fontSize: 12.5, margin: '6px 0 10px' }}>
              {f.mode === 'advance' ? 'ใช้จริงน้อยกว่าเงินยืม = คืนเงินส่วนที่เหลือ · มากกว่า = การเงินจ่ายเพิ่ม' : 'การเงินจ่ายคืนตามยอดที่ HRD และการเงินตรวจแล้ว'}
            </Text>
            {f.mode === 'advance' && (
              <Row gutter={12}>
                <Col xs={24} sm={8}><Text style={{ fontSize: 13 }}>เลขที่สัญญายืมเงิน</Text><Input value={f.advanceNo} onChange={e => set('advanceNo', e.target.value)} maxLength={50} status={bad('advance_no')} aria-label="เลขที่สัญญายืมเงิน" /></Col>
                <Col xs={12} sm={8}><Text style={{ fontSize: 13 }}>จำนวนเงินยืม (บาท)</Text>{money(f.advanceAmount, v => set('advanceAmount', v), 'จำนวนเงินยืม', 'advance_amount')}</Col>
                <Col xs={12} sm={8}><Text style={{ fontSize: 13 }}>วันที่รับเงินยืม</Text><ThaiDatePicker format={DATE_FORMAT} value={f.advanceDate} onChange={v => set('advanceDate', v)} style={{ width: '100%' }} aria-label="วันที่รับเงินยืม" placeholder="เลือกวันที่" /></Col>
              </Row>
            )}
          </Card>

          {/* 2 เวลาจริง */}
          <Card title="2. วันเวลาเดินทางจริง" style={card} size="small" extra={<Text type="secondary" style={{ fontSize: 12 }}>ระบบคิดวันเบี้ยเลี้ยงจากเวลานี้</Text>}>
            <Row gutter={[12, 8]}>
              <Col xs={14} sm={7}><Text style={{ fontSize: 13 }}>ออกเดินทาง</Text><ThaiDatePicker format={DATE_FORMAT} allowClear={false} value={f.startDate} onChange={v => set('startDate', v)} style={{ width: '100%' }} status={bad('actual_start_at')} aria-label="วันที่ออกเดินทางจริง" /></Col>
              <Col xs={10} sm={5}><Text style={{ fontSize: 13 }}>เวลา</Text><TimePicker format="HH:mm" allowClear={false} value={f.startTime} onChange={v => set('startTime', v)} style={{ width: '100%' }} needConfirm={false} aria-label="เวลาออกเดินทางจริง" /></Col>
              <Col xs={14} sm={7}><Text style={{ fontSize: 13 }}>กลับถึง</Text><ThaiDatePicker format={DATE_FORMAT} allowClear={false} value={f.endDate} onChange={v => set('endDate', v)} style={{ width: '100%' }} status={bad('actual_end_at')} aria-label="วันที่กลับถึงจริง" /></Col>
              <Col xs={10} sm={5}><Text style={{ fontSize: 13 }}>เวลา</Text><TimePicker format="HH:mm" allowClear={false} value={f.endTime} onChange={v => set('endTime', v)} style={{ width: '100%' }} needConfirm={false} aria-label="เวลากลับถึงจริง" /></Col>
              <Col xs={24} sm={8}><Text style={{ fontSize: 13 }}>มื้อที่ผู้จัดเลี้ยง</Text><InputNumber min={0} max={maxMeals(calc.days)} precision={0} value={f.meals} onChange={v => set('meals', v ?? 0)} style={{ width: '100%' }} status={bad('meals_provided')} aria-label="มื้อที่ผู้จัดเลี้ยง" suffix="มื้อ" /></Col>
            </Row>
            <div data-testid="days-note" style={{ marginTop: 10, fontSize: 13, background: calc.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 10px' }}>
              {calc.ok ? <>{Math.floor(calc.hours)} ชม. {Math.round((calc.hours % 1) * 60)} นาที → <b>เบิกเบี้ยเลี้ยงได้ {calc.days} วัน</b>{f.meals ? ` · หักอาหาร ${f.meals} มื้อ มื้อละ ⅓ ของอัตรา` : ''} · พักได้ไม่เกิน {calc.maxNights} คืน</> : 'วันเวลากลับต้องหลังวันเวลาออกเดินทาง'}
            </div>
          </Card>

          {/* 3 รายคน */}
          <Card title={`3. ค่าใช้จ่ายรายคน (เบิกแทนทั้งคณะ ${data.travelers.length} คน)`} style={card} size="small">
            <Row gutter={12} style={{ marginBottom: 10 }}>
              <Col xs={24} sm={14}>
                <Text style={{ fontSize: 13 }}>ค่าเช่าที่พัก</Text>
                <ConfigProvider theme={solid}>
                  <Radio.Group value={f.lodgingMode} onChange={e => set('lodgingMode', e.target.value)} optionType="button" buttonStyle="solid" style={{ display: 'flex' }}
                    options={[{ value: 'none', label: 'ไม่เบิก' }, { value: 'lump', label: 'เหมาจ่าย' }, { value: 'actual', label: 'จ่ายจริง' }]} />
                </ConfigProvider>
              </Col>
              {f.lodgingMode !== 'none' && <Col xs={24} sm={10}><Text style={{ fontSize: 13 }}>จำนวนคืน</Text>
                <InputNumber min={1} max={Math.max(1, calc.maxNights)} precision={0} value={f.nights} onChange={v => set('nights', v)} style={{ width: '100%' }} status={bad('lodging_nights')} aria-label="จำนวนคืนที่พัก" suffix={`คืน (≤ ${calc.maxNights})`} /></Col>}
            </Row>
            <div style={{ overflowX: 'auto', border: '1px solid var(--app-border)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 620 }} data-testid="people-table">
                <thead><tr style={{ background: 'var(--app-bg)', fontSize: 12.5 }}>
                  {['ผู้เดินทาง', 'เบี้ยเลี้ยง', ...(f.lodgingMode === 'none' ? [] : ['ที่พัก', 'เพดาน']), 'ลงทะเบียน'].map((h, i) => <th key={h} style={{ padding: '8px 10px', textAlign: i ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {calc.rows.map(x => { const p = f.people[x.t.user_id]; return (
                    <React.Fragment key={x.t.user_id}>
                    <tr style={{ borderTop: '1px solid var(--app-border)', opacity: x.absent ? 0.55 : 1 }} data-testid={`person-${x.t.user_id}`}>
                      <td style={{ padding: '8px 10px' }}><b style={{ textDecoration: x.absent ? 'line-through' : undefined }}>{x.t.name}</b>{x.t.is_requester ? ' (ผู้ขอ)' : ''}
                        <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{money2(x.t.rate)} บาท/วัน{x.t.lodging_class_name ? ` · ที่พัก${x.t.lodging_class_name}` : ''}{!x.absent && p?.own ? ` · ${x.days} วัน ${x.nights} คืน` : ''}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', marginTop: 4, fontSize: 12.5 }}>
                          <Checkbox checked={!!p?.absent} onChange={e => setPerson(x.t.user_id, { absent: e.target.checked })} aria-label={`ไม่ได้เดินทาง ${x.t.name}`}>ไม่ได้เดินทาง</Checkbox>
                          {!x.absent && <Checkbox checked={!!p?.own} onChange={e => setPerson(x.t.user_id, { own: e.target.checked })} aria-label={`เวลาต่างจากคณะ ${x.t.name}`}>กลับก่อน/ไปไม่ครบวัน</Checkbox>}
                        </div>
                        {!x.absent && f.lodgingMode === 'actual' && <Select size="small" value={f.people[x.t.user_id]?.room} onChange={v => setPerson(x.t.user_id, { room: v })} style={{ width: 120, marginTop: 4 }} aria-label={`ห้องพัก ${x.t.name}`}
                          options={[{ value: 'double', label: 'ห้องคู่' }, { value: 'single', label: 'ห้องเดี่ยว' }]} />}
                        {x.absent && <div style={{ fontSize: 12, color: '#b45309' }}>ตัดออกจากการเบิก — ไม่นับในประวัติการไปราชการ</div>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', background: 'var(--app-bg)', fontVariantNumeric: 'tabular-nums' }} title="ระบบคิดให้">{money2(x.allowance)}</td>
                      {f.lodgingMode !== 'none' && <td style={{ padding: '8px 10px', textAlign: 'right', width: 140 }}>
                        {x.absent ? '-' : f.lodgingMode === 'lump' ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money2(x.lodging)}</span>
                          : <InputNumber size="small" min={0} precision={2} value={f.people[x.t.user_id]?.lodging} onChange={v => setPerson(x.t.user_id, { lodging: v })} style={{ width: 120 }}
                              status={x.overCap || bad(`travelers.${x.t.user_id}`) ? 'error' : undefined} aria-label={`ค่าที่พัก ${x.t.name}`} />}
                      </td>}
                      {f.lodgingMode !== 'none' && <td style={{ padding: '8px 10px', textAlign: 'right', color: x.overCap ? '#dc2626' : 'var(--app-text-3)', fontVariantNumeric: 'tabular-nums' }}>{money2(x.cap)}</td>}
                      <td style={{ padding: '8px 10px', textAlign: 'right', width: 140 }}>
                        {x.absent ? '-' : <InputNumber size="small" min={0} precision={2} value={f.people[x.t.user_id]?.registration} onChange={v => setPerson(x.t.user_id, { registration: v })} style={{ width: 120 }} aria-label={`ค่าลงทะเบียน ${x.t.name}`} />}
                      </td>
                    </tr>
                    {!x.absent && p?.own && (
                      <tr data-testid={`person-times-${x.t.user_id}`}><td colSpan={f.lodgingMode === 'none' ? 3 : 5} style={{ padding: '0 10px 10px', background: x.badTime ? 'rgba(239,68,68,0.06)' : 'var(--app-bg)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12.5, paddingTop: 8 }}>
                          <span>ไป</span>
                          <ThaiDatePicker size="small" format={DATE_FORMAT} allowClear={false} value={p.sd} onChange={v => setPerson(x.t.user_id, { sd: v })} style={{ width: 130 }} aria-label={`วันไป ${x.t.name}`} />
                          <TimePicker size="small" format="HH:mm" allowClear={false} needConfirm={false} value={p.stt} onChange={v => setPerson(x.t.user_id, { stt: v })} style={{ width: 90 }} aria-label={`เวลาไป ${x.t.name}`} />
                          <span>กลับถึง</span>
                          <ThaiDatePicker size="small" format={DATE_FORMAT} allowClear={false} value={p.ed} onChange={v => setPerson(x.t.user_id, { ed: v })} style={{ width: 130 }} aria-label={`วันกลับ ${x.t.name}`} />
                          <TimePicker size="small" format="HH:mm" allowClear={false} needConfirm={false} value={p.et} onChange={v => setPerson(x.t.user_id, { et: v })} style={{ width: 90 }} aria-label={`เวลากลับ ${x.t.name}`} />
                          <span style={{ color: x.badTime ? '#dc2626' : 'var(--app-text-3)' }}>{x.badTime ? 'ต้องอยู่ในช่วงเดินทางของคณะ' : `→ เบี้ยเลี้ยง ${x.days} วัน · ที่พัก ${x.nights} คืน`}</span>
                        </div>
                      </td></tr>
                    )}
                    </React.Fragment>
                  ) })}
                </tbody>
              </table>
            </div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>ช่องสีเทา = ระบบคิดตามสิทธิ์ · {f.lodgingMode === 'actual' ? 'ที่พักจ่ายจริงกรอกตามใบเสร็จของแต่ละคน ไม่เกินเพดาน' : f.lodgingMode === 'lump' ? 'เหมาจ่ายคิดตามระดับสิทธิ์ ไม่ต้องแนบใบเสร็จ' : 'ไม่เบิกค่าที่พัก'}</Text>
          </Card>

          {/* 4 พาหนะ + อื่น ๆ */}
          <Card title="4. ค่าพาหนะและค่าใช้จ่ายอื่น (รวมคณะ)" style={card} size="small"
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{({ gov_car: 'รถยนต์ราชการ', private: 'รถยนต์ส่วนตัว', bus: 'รถโดยสารประจำทาง', plane: 'เครื่องบิน', other: 'อื่น ๆ' } as const)[mode]}{r.vehicle_plate ? ` ${r.vehicle_plate}` : ''}{r.route_text ? ` · ${r.route_text}` : ''}</Text>}>
            <Row gutter={[12, 10]}>
              {mode === 'private' && <Col xs={24} sm={12}><Text style={{ fontSize: 13 }}>ระยะทางจริงไป-กลับ</Text>
                <InputNumber min={0.1} max={5000} precision={1} value={f.km} onChange={v => set('km', v)} style={{ width: '100%' }} status={bad('distance_km')} aria-label="ระยะทางจริง" suffix="กม." />
                <Text type="secondary" style={{ fontSize: 12 }}>ค่าน้ำมัน = {money2(r.rate_per_km)} บาท/กม. → <b>{money2(calc.fuel)}</b> (ระบบคิด)</Text></Col>}
              {(mode === 'gov_car' || mode === 'private') && <Col xs={24} sm={12}><Text style={{ fontSize: 13 }}>ค่าทางด่วน</Text>{money(f.toll, v => set('toll', v), 'ค่าทางด่วน', 'toll_amount')}</Col>}
              {(mode === 'bus' || mode === 'plane' || mode === 'other') && <>
                <Col xs={24} sm={12}><Text style={{ fontSize: 13 }}>ค่าโดยสารไป-กลับทั้งคณะ</Text>{money(f.fare, v => set('fare', v), 'ค่าโดยสาร', 'fare_amount')}
                  {calc.fareCap != null && <Text type="secondary" style={{ fontSize: 12 }}>ไม่เกิน {money2(calc.fareCap)} บาท</Text>}</Col>
                <Col xs={24} sm={12}><Text style={{ fontSize: 13 }}>ค่าแท็กซี่/รถรับจ้าง</Text>{money(f.taxi, v => set('taxi', v), 'ค่าแท็กซี่', 'taxi_amount')}</Col>
              </>}
              <Col xs={24} sm={12}><Text style={{ fontSize: 13 }}>ค่าใช้จ่ายอื่น</Text>{money(f.other, v => set('other', v), 'ค่าใช้จ่ายอื่น', 'other_amount')}</Col>
              {Number(f.other ?? 0) > 0 && <Col xs={24} sm={12}><Text style={{ fontSize: 13 }}>รายการค่าใช้จ่ายอื่น</Text><Input value={f.otherDesc} maxLength={200} onChange={e => set('otherDesc', e.target.value)} status={bad('other_desc')} aria-label="รายการค่าใช้จ่ายอื่น" /></Col>}
            </Row>
          </Card>

          {/* 5 หลักฐาน + รายงาน */}
          <Card title="5. ใบเสร็จและรายงานการเดินทาง" style={card} size="small">
            <Row gutter={[14, 12]}>
              <Col xs={24} md={14}>
                <Text strong style={{ fontSize: 13 }}>ใบเสร็จ/หลักฐานการเบิก</Text>
                <div style={{ marginTop: 6 }}><ReceiptFiles requestId={r.id} files={data.receipts} editable onChanged={() => load(false)} /></div>
                {needReceipts && data.receipts.length === 0 && <Text type="danger" style={{ fontSize: 12 }}>มียอดตามใบเสร็จ — ต้องแนบอย่างน้อย 1 ไฟล์</Text>}
              </Col>
              <Col xs={24} md={10}>
                <Text strong style={{ fontSize: 13 }}>รายงานการเดินทาง</Text>
                <div style={{ marginTop: 6, padding: 10, borderRadius: 10, border: `1px ${reportOk ? 'solid' : 'dashed'} ${reportOk ? 'var(--app-border)' : '#f59e0b'}`, background: reportOk ? undefined : 'rgba(245,158,11,0.08)' }} data-testid="report-box">
                  {reportOk ? <Text style={{ color: '#047857' }}>ส่งรายงานแล้ว</Text> : <Text>{data.report_status === 'draft' ? 'รายงานยังเป็นร่าง' : 'ยังไม่ได้เขียนรายงาน'} — ต้องส่งคู่กับการเบิก</Text>}
                  <div><Link href={`${TRAVEL_BASE}/report?id=${r.id}`}>{reportOk ? 'ดูรายงาน ›' : 'เขียน/ส่งรายงาน ›'}</Link></div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>

        {/* สรุปยอด */}
        <aside style={{ flex: '1 1 300px', minWidth: 0, position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="สรุปยอด" style={card} size="small">
            <CategoryTable estimate={r.estimate} claimed={calc.claimed} />
            {calc.over.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="over-reasons">
                {calc.over.map(k => (
                  <div key={k}>
                    <Text style={{ fontSize: 12.5, color: '#9a3412', fontWeight: 600 }}>{CATEGORY_LABEL[k]}เกินประมาณการ {money2(calc.claimed[k] - (r.estimate[k] ?? 0))} บาท — เหตุผล (HRD ตรวจ)</Text>
                    <Input.TextArea rows={2} maxLength={300} value={f.reasons[k] ?? ''} onChange={e => set('reasons', { ...f.reasons, [k]: e.target.value })} status={bad(`over_reasons.${k}`) || (!f.reasons[k]?.trim() ? 'warning' : undefined)} aria-label={`เหตุผลที่${CATEGORY_LABEL[k]}เกินประมาณการ`} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12 }}><SettlementBox mode={f.mode} advance={f.advanceAmount} total={calc.total} /></div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>ยอดสุดท้ายยืนยันหลัง HRD และการเงินตรวจ</Text>
            <Checkbox checked={f.confirmed} onChange={e => set('confirmed', e.target.checked)} style={{ marginTop: 10 }} data-testid="confirm">ข้าพเจ้าตรวจยอดตรงกับใบเสร็จทุกใบแล้ว</Checkbox>
            {blockers.length > 0 && <Alert type="info" showIcon style={{ marginTop: 10, fontSize: 12.5 }} title="ก่อนส่ง HRD" description={<ul style={{ margin: 0, paddingLeft: 18 }}>{blockers.map(b => <li key={b}>{b}</li>)}</ul>} />}
            <Space orientation="vertical" style={{ width: '100%', marginTop: 12 }}>
              <Button type="primary" block size="large" icon={<SendOutlined />} loading={saving === 'submit'} disabled={blockers.length > 0 || !!saving} onClick={() => save(true)}>ส่งให้ HRD ตรวจ</Button>
              <Button block icon={<SaveOutlined />} loading={saving === 'draft'} disabled={!!saving} onClick={() => save(false)}>บันทึกร่าง</Button>
            </Space>
          </Card>
          <Card size="small" style={card}>
            <Descriptions size="small" column={1} items={[
              { key: 'a', label: 'ขออนุมัติ', children: `${thaiDateTime(r.start_at)} – ${thaiDateTime(r.end_at)}` },
              { key: 'b', label: 'ประมาณการ', children: `${money2(r.total_amount)} บาท` },
              { key: 'c', label: 'งบ', children: r.budget_name ?? '-' },
            ]} />
          </Card>
        </aside>
      </div>
    </>
  )
}

export default function ClaimPage() {
  return (
    <TravelShell current="เบิกค่าใช้จ่ายจริง">
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>}><ClaimContent /></Suspense>
    </TravelShell>
  )
}
