'use client'
// เคลียร์ค่าใช้จ่ายเดินทาง (เบิกจ่ายจริง) — ชนิดข้อมูล ป้ายสถานะ ขั้นตอน ใบเสร็จ ตารางรายการ ประวัติ ใช้ร่วมหน้าผู้เดินทาง (claim) และหน้า HRD/การเงิน (claims)
// backend: src/controllers/hrdTravelClaimController.ts · คำนวณ src/services/travelClaimCalc.ts
import React, { useState } from 'react'
import { App, Button, Input, InputNumber, Popconfirm, Steps, Tag, Typography, Upload } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { FILE_ACCEPT, FileLink, checkFile, deleteTravelFile, uploadTravelFile, type TravelFile } from './TravelFiles'
import { fmtMoney, thaiDateTime, type LodgingMode, type RoomType, type VehicleMode } from './travelCalc'

const { Text } = Typography

export type ClaimMode = 'advance' | 'reimburse'
export type ClaimStatus = 'draft' | 'hrd' | 'returned' | 'finance' | 'verified' | 'closed'
export type ClaimCategory = 'allowance' | 'lodging' | 'transport' | 'registration' | 'other'
export type ItemCategory = 'allowance' | 'lodging' | 'registration' | 'fuel' | 'toll' | 'fare' | 'taxi' | 'other'
export const CLAIM_CATEGORIES: ClaimCategory[] = ['allowance', 'lodging', 'transport', 'registration', 'other']
export const CATEGORY_LABEL: Record<ClaimCategory, string> = { allowance: 'เบี้ยเลี้ยง', lodging: 'ที่พัก', transport: 'พาหนะ', registration: 'ลงทะเบียน', other: 'อื่น ๆ' }
export const ITEM_LABEL: Record<ItemCategory, string> = { allowance: 'เบี้ยเลี้ยง', lodging: 'ที่พัก', registration: 'ลงทะเบียน', fuel: 'ค่าน้ำมัน', toll: 'ทางด่วน', fare: 'ค่าโดยสาร', taxi: 'แท็กซี่', other: 'อื่น ๆ' }
export const MODE_LABEL: Record<ClaimMode, string> = { advance: 'ล้างเงินยืม', reimburse: 'สำรองจ่าย' }

export interface ClaimItem {
  id: number; category: ItemCategory; user_id: number | null; label: string; detail: string | null; room: RoomType | null
  claimed_amount: number; cap_amount: number | null; computed: boolean; approved_amount: number | null; hrd_note: string | null
}
export interface ClaimHistory { actor_name: string; action: 'submitted' | 'hrd_returned' | 'hrd_passed' | 'finance_returned' | 'verified' | 'closed'; note: string | null; amount: number | null; acted_at: string }
export interface Settlement { refund: number; pay: number }
export interface Claim {
  id: number; request_id: number; mode: ClaimMode; advance_no: string | null; advance_amount: number | null; advance_date: string | null
  actual_start_at: string; actual_end_at: string; meals_provided: number; allowance_days: number; lodging_mode: LodgingMode; lodging_nights: number
  distance_km: number | null; other_desc: string | null; over_reasons: Partial<Record<ClaimCategory, string>>
  claimed: Record<ClaimCategory, number>; approved: Record<ClaimCategory, number> | null; claimed_total: number; approved_total: number | null
  status: ClaimStatus; finance_returned: boolean; submitted_at: string | null; hrd_at: string | null; finance_at: string | null; settle_note: string | null; closed_at: string | null
  items: ClaimItem[]; history: ClaimHistory[]; settlement: Settlement
  /** claim = เบิกจริง · refund = ยกเลิกการเดินทาง คืนเงินยืมเต็มจำนวน */
  kind: 'claim' | 'refund'; absent_user_ids: number[]; person_times: Record<string, { start: string; end: string }>
  submitted_by: number | null; submitted_by_name: string | null
}
export interface ClaimTraveler { user_id: number; name: string; position: string | null; rate: number; is_requester: boolean; lodging_class_name: string | null; lodging: { lump: number; single: number; double: number } }
export interface ClaimRequest {
  id: number; requester_id: number; requester_name: string; subject: string; purpose: string; location: string; start_at: string; end_at: string
  vehicle_mode: VehicleMode; vehicle_plate: string | null; vehicle_name: string | null; rate_per_km: number | null; route_max_fare: number | null; route_text: string | null
  allowance_days: number; meals_provided: number; lodging_mode: LodgingMode; lodging_nights: number; distance_km: number | null
  total_amount: number; actual_amount: number | null; budget_name: string | null; estimate: Record<ClaimCategory, number>
}
export interface ClaimResp {
  request: ClaimRequest; travelers: ClaimTraveler[]; claim: Claim | null; report_status: 'draft' | 'submitted' | null; receipts: TravelFile[]
  can_edit: boolean; can_hrd: boolean; can_finance: boolean; can_close: boolean; claimable: boolean
  /** HRD กำลังเบิกแทนคณะ */
  filing_for_group?: boolean
  /** HRD ที่ตรวจไม่ได้ (ร่วมเดินทาง / เป็นผู้บันทึกแทน) — เหตุผล */
  hrd_blocked?: string | null
}

export const CLAIM_STATUS: Record<ClaimStatus, { label: string; color: string }> = {
  draft: { label: 'ร่าง — ยังไม่ส่ง', color: 'default' },
  hrd: { label: 'รอ HRD ตรวจ', color: 'cyan' },
  returned: { label: 'HRD ส่งกลับแก้ไข', color: 'orange' },
  finance: { label: 'รอการเงินตรวจ', color: 'blue' },
  verified: { label: 'ยืนยันยอดแล้ว · รอคืน/จ่ายเงิน', color: 'purple' },
  closed: { label: 'ปิดเรื่องแล้ว', color: 'green' },
}
export const ClaimStatusTag = ({ status, financeReturned }: { status: ClaimStatus | null | undefined; financeReturned?: boolean }) => status
  ? <Tag color={financeReturned && status === 'hrd' ? 'volcano' : CLAIM_STATUS[status].color} style={{ marginInlineEnd: 0 }}>{financeReturned && status === 'hrd' ? 'การเงินตีกลับ · รอ HRD' : CLAIM_STATUS[status].label}</Tag>
  : <Tag style={{ marginInlineEnd: 0 }}>ยังไม่เบิก</Tag>

const baht = (n: number | null | undefined) => n == null ? '-' : fmtMoney(n)
export const money2 = (n: number | null | undefined) => n == null ? '-' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** ขั้นตอน: ผู้เดินทาง → HRD → การเงิน → ปิดเรื่อง */
export const ClaimSteps = ({ status }: { status: ClaimStatus | null }) => {
  const cur = !status || status === 'draft' || status === 'returned' ? 0 : status === 'hrd' ? 1 : status === 'finance' ? 2 : 3
  return (
    <Steps size="small" current={cur} responsive={false} titlePlacement="vertical" status={status === 'returned' ? 'error' : status === 'closed' ? 'finish' : 'process'}
      items={[
        { title: 'ผู้เดินทางบันทึก', content: status === 'returned' ? 'ส่งกลับแก้ไข' : status === 'draft' || !status ? 'กำลังกรอก' : 'ส่งแล้ว' },
        { title: 'HRD ตรวจ', content: 'ยอดและสิทธิ์' },
        { title: 'การเงินตรวจ', content: 'ยืนยัน/ตีกลับ' },
        { title: 'ปิดเรื่อง', content: status === 'closed' ? 'เรียบร้อย' : 'คืน/จ่ายเงิน' },
      ]} />
  )
}

/** ใบเสร็จ/หลักฐานการเบิก — editable = แนบ/ลบได้ (ผู้ขอ ขณะร่าง/ถูกส่งกลับ) */
export const ReceiptFiles = ({ requestId, files, editable, onChanged }: { requestId: number; files: TravelFile[]; editable: boolean; onChanged?: () => void }) => {
  const { message } = App.useApp()
  const [busy, setBusy] = useState<string | null>(null)
  const add = async (file: File) => {
    const err = checkFile(file)
    if (err) { message.error(err); return }
    setBusy('add')
    try { await uploadTravelFile(requestId, 'receipt', file); message.success(`แนบ ${file.name} แล้ว`); onChanged?.() }
    catch (e) { message.error((e as Error).message) } finally { setBusy(null) }
  }
  const remove = async (f: TravelFile) => {
    setBusy(`d${f.id}`)
    try { await deleteTravelFile(requestId, f.id); onChanged?.() } catch (e) { message.error((e as Error).message) } finally { setBusy(null) }
  }
  return (
    <div data-testid="receipts" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {files.length === 0 && <Text type="secondary" style={{ fontSize: 13 }}>ยังไม่มีไฟล์</Text>}
      {files.map(f => (
        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ flex: 1, minWidth: 0 }}><FileLink requestId={requestId} f={f} /></span>
          {editable && (
            <Popconfirm title={`ลบ ${f.original_name}?`} okText="ลบ" okButtonProps={{ danger: true }} cancelText="ไม่ลบ" onConfirm={() => remove(f)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={busy === `d${f.id}`} aria-label={`ลบไฟล์ ${f.original_name}`} />
            </Popconfirm>
          )}
        </div>
      ))}
      {editable && (
        <Upload accept={FILE_ACCEPT} multiple showUploadList={false} beforeUpload={f => { add(f); return false }}>
          <Button icon={<UploadOutlined />} loading={busy === 'add'}>แนบใบเสร็จ (PDF/รูป ไม่เกิน 10MB ต่อไฟล์)</Button>
        </Upload>
      )}
    </div>
  )
}

/** ตารางสรุปรายหมวด: ประมาณการ · ขอเบิก · (HRD อนุมัติ) */
export const CategoryTable = ({ estimate, claimed, approved, reasons }: {
  estimate: Record<ClaimCategory, number>; claimed: Record<ClaimCategory, number>; approved?: Record<ClaimCategory, number> | null; reasons?: Partial<Record<ClaimCategory, string>>
}) => {
  const sum = (r: Record<ClaimCategory, number>) => CLAIM_CATEGORIES.reduce((s, c) => s + Number(r[c] ?? 0), 0)
  const cell: React.CSSProperties = { padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }} data-testid="category-table">
        <thead><tr style={{ color: 'var(--app-text-3)', fontSize: 12 }}>
          <th style={{ ...cell, textAlign: 'left' }}>หมวด</th><th style={cell}>ประมาณการ</th><th style={cell}>ขอเบิก</th>{approved && <th style={cell}>HRD อนุมัติ</th>}
        </tr></thead>
        <tbody>
          {CLAIM_CATEGORIES.filter(c => estimate[c] || claimed[c] || approved?.[c]).map(c => {
            const over = Number(claimed[c] ?? 0) > Number(estimate[c] ?? 0) + 0.004
            return (
              <React.Fragment key={c}>
                <tr style={{ borderTop: '1px solid var(--app-border)' }}>
                  <td style={{ ...cell, textAlign: 'left' }}>{CATEGORY_LABEL[c]}</td>
                  <td style={cell}>{money2(estimate[c] ?? 0)}</td>
                  <td style={{ ...cell, color: over ? '#c2410c' : undefined, fontWeight: over ? 600 : undefined }}>{money2(claimed[c] ?? 0)}{over ? ' ▲' : ''}</td>
                  {approved && <td style={{ ...cell, fontWeight: 600, color: Math.abs((approved[c] ?? 0) - (claimed[c] ?? 0)) > 0.004 ? '#c2410c' : undefined }}>{money2(approved[c] ?? 0)}</td>}
                </tr>
                {over && reasons?.[c] && <tr><td colSpan={approved ? 4 : 3} style={{ padding: '0 8px 6px', fontSize: 12, color: '#9a3412' }}>เหตุผลที่เกิน: {reasons[c]}</td></tr>}
              </React.Fragment>
            )
          })}
          <tr style={{ borderTop: '2px solid var(--app-border)', fontWeight: 700 }}>
            <td style={{ ...cell, textAlign: 'left' }}>รวม</td><td style={cell}>{money2(sum(estimate))}</td><td style={cell}>{money2(sum(claimed))}</td>{approved && <td style={cell}>{money2(sum(approved))}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** ผลการล้างเงินยืม / เบิกคืน */
export const SettlementBox = ({ mode, advance, total, label = 'ใช้จริง' }: { mode: ClaimMode; advance: number | null; total: number; label?: string }) => {
  const d = mode === 'advance' ? Math.round((Number(advance ?? 0) - total) * 100) / 100 : null
  const row = (a: React.ReactNode, b: React.ReactNode, strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: strong ? 700 : undefined, fontSize: strong ? 15.5 : 14, fontVariantNumeric: 'tabular-nums' }}><span>{a}</span><span>{b}</span></div>
  )
  return (
    <div data-testid="settlement" style={{ background: 'var(--app-bg)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {mode === 'advance' ? <>
        {row('เงินยืม', money2(advance))}
        {row(label, money2(total))}
        <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: 6, color: 'var(--ant-color-primary)' }}>
          {d! > 0 ? row('ผู้ยืมต้องคืนเงิน', `${money2(d)} บาท`, true) : d! < 0 ? row('การเงินจ่ายเพิ่ม', `${money2(-d!)} บาท`, true) : row('ล้างเงินยืมพอดี', '0.00', true)}
        </div>
      </> : <>
        {row(label, money2(total))}
        <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: 6, color: 'var(--ant-color-primary)' }}>{row('การเงินจ่ายคืน', `${money2(total)} บาท`, true)}</div>
      </>}
    </div>
  )
}

const HISTORY_LABEL: Record<ClaimHistory['action'], string> = {
  submitted: 'ส่งเบิก', hrd_returned: 'HRD ส่งกลับแก้ไข', hrd_passed: 'HRD ตรวจแล้ว ส่งการเงิน', finance_returned: 'การเงินตีกลับ HRD', verified: 'การเงินยืนยันยอด', closed: 'ปิดเรื่อง',
}
export const ClaimHistoryList = ({ history }: { history: ClaimHistory[] }) => history.length === 0 ? <Text type="secondary">ยังไม่มี</Text> : (
  <ol data-testid="claim-history" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5 }}>
    {history.map((h, i) => (
      <li key={i}>
        <Text type="secondary">{thaiDateTime(h.acted_at)}</Text> · <b>{HISTORY_LABEL[h.action]}</b>{h.amount != null && h.action !== 'closed' ? ` ${money2(h.amount)} บาท` : ''} — {h.actor_name}
        {h.note && <div style={{ whiteSpace: 'pre-wrap', color: 'var(--app-text-2)' }}>{h.note}</div>}
      </li>
    ))}
  </ol>
)

/** ยอดที่ HRD กรอกในหน้าตรวจ (ต่อรายการ) */
export type HrdEdits = Record<number, { amount: number | null; note: string }>

/**
 * ตารางรายการเบิก — แสดงยอดขอ เพดาน ยอด HRD อนุมัติ และเหตุผลที่ปรับ
 * edits/onEdit = HRD แก้ยอดอนุมัติรายรายการได้ (ยอดต่างจากที่ขอต้องมีเหตุผล — backend ตรวจซ้ำ)
 */
export const ClaimItemsTable = ({ items, edits, onEdit }: {
  items: ClaimItem[]; edits?: HrdEdits; onEdit?: (id: number, v: { amount?: number | null; note?: string }) => void
}) => {
  const editing = !!(edits && onEdit)
  const showApproved = editing || items.some(i => i.approved_amount != null)
  const cell: React.CSSProperties = { padding: '8px 10px', borderTop: '1px solid var(--app-border)', verticalAlign: 'top' }
  const num: React.CSSProperties = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
  const total = (f: (i: ClaimItem) => number) => items.reduce((s, i) => s + f(i), 0)
  const approvedOf = (i: ClaimItem) => editing ? (edits![i.id]?.amount ?? i.claimed_amount) : (i.approved_amount ?? i.claimed_amount)
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--app-border)', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 640 }} data-testid="claim-items">
        <thead><tr style={{ background: 'var(--app-bg)', fontSize: 12.5 }}>
          <th style={{ ...cell, borderTop: 0, textAlign: 'left' }}>รายการ</th>
          <th style={{ ...num, borderTop: 0 }}>ขอเบิก</th>
          <th style={{ ...num, borderTop: 0 }}>เพดาน</th>
          {showApproved && <th style={{ ...num, borderTop: 0 }}>HRD อนุมัติ</th>}
        </tr></thead>
        <tbody>
          {items.map(i => {
            const ap = approvedOf(i)
            const changed = Math.abs(ap - i.claimed_amount) > 0.004
            return (
              <tr key={i.id} style={{ background: changed ? 'rgba(249, 115, 22, 0.08)' : undefined }} data-testid={`item-${i.id}`}>
                <td style={cell}>
                  <Tag style={{ marginInlineEnd: 6 }}>{ITEM_LABEL[i.category]}</Tag><span style={{ fontWeight: 500 }}>{i.label}</span>
                  {i.detail && <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{i.detail}{i.computed ? ' · ระบบคิด' : ''}</div>}
                  {editing && changed && (
                    <div style={{ marginTop: 6 }}>
                      <Input size="small" placeholder="เหตุผลที่ปรับยอด (บังคับ)" value={edits![i.id]?.note ?? ''} maxLength={300} aria-label={`เหตุผลที่ปรับ ${i.label}`}
                        status={(edits![i.id]?.note ?? '').trim() ? undefined : 'error'} onChange={e => onEdit!(i.id, { note: e.target.value })} />
                    </div>
                  )}
                  {!editing && i.hrd_note && <div style={{ fontSize: 12, color: '#9a3412', marginTop: 2 }}>HRD: {i.hrd_note}</div>}
                </td>
                <td style={num}>{money2(i.claimed_amount)}</td>
                <td style={{ ...num, color: 'var(--app-text-3)' }}>{i.cap_amount != null ? money2(i.cap_amount) : '-'}</td>
                {showApproved && <td style={{ ...num, fontWeight: 600, color: changed ? '#c2410c' : undefined }}>
                  {editing
                    ? <InputNumber size="small" min={0} max={1000000} precision={2} value={edits![i.id]?.amount ?? i.claimed_amount} style={{ width: 120 }} aria-label={`ยอดอนุมัติ ${i.label}`}
                        onChange={v => onEdit!(i.id, { amount: v })} />
                    : money2(ap)}
                  {changed && <div style={{ fontSize: 11.5, fontWeight: 400 }}>ปรับ {ap - i.claimed_amount > 0 ? '+' : '−'}{money2(Math.abs(ap - i.claimed_amount))}</div>}
                </td>}
              </tr>
            )
          })}
          <tr style={{ fontWeight: 700, background: 'var(--app-bg)' }}>
            <td style={cell}>รวม {items.length} รายการ</td>
            <td style={num}>{money2(total(i => i.claimed_amount))}</td><td style={num} />
            {showApproved && <td style={num}>{money2(Math.round(total(approvedOf) * 100) / 100)}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** ข้อความล่าสุดที่ HRD ส่งกลับ (ให้ผู้เดินทางแก้) */
export const lastNote = (history: ClaimHistory[], action: ClaimHistory['action']) => [...history].reverse().find(h => h.action === action)?.note ?? null

export { baht }
