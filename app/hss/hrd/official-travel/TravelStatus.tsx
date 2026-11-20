'use client'
// สถานะคำขอ (badge แยกสี) และลำดับการลงนาม — ใช้ร่วมกันหน้ารายการคำขอและ drawer รายละเอียด
import React from 'react'
import { Steps, Tag, Tooltip } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, RollbackOutlined, StopOutlined } from '@ant-design/icons'
import { statusOf, thaiDateTime, type StatusKey, type TravelRequest } from './travelCalc'
import { ReviewHistory } from './HrdReview'

// ไอคอนประจำสถานะ — สีอย่างเดียวไม่พอสำหรับคนตาบอดสี
const STATUS_ICON: Record<StatusKey, React.ReactNode> = {
  hrd: <ClockCircleOutlined />, returned: <RollbackOutlined />, step1: <ClockCircleOutlined />, step2: <ClockCircleOutlined />, director: <ClockCircleOutlined />,
  approved: <CheckCircleOutlined />, rejected: <CloseCircleOutlined />, cancelled: <StopOutlined />,
}

export const StatusBadge = ({ r }: { r: Parameters<typeof statusOf>[0] }) => {
  const st = statusOf(r)
  return (
    <Tag color={st.color} variant="outlined" icon={STATUS_ICON[st.key]} data-testid="status-badge" data-status={st.key}
      style={{ margin: 0, fontWeight: 600, borderRadius: 999, paddingInline: 10 }}>{st.label}</Tag>
  )
}

// ── ความคืบหน้าแบบย่อ (ตารางรายการคำขอ — แบบเดียวกับหน้าอนุมัติลา): Steps แนวนอนทีละขั้น ยื่น → HRD ตรวจ → หัวหน้าในสาย → ผอ. → การเงินยืนยันยอด ──
type PState = 'done' | 'current' | 'returned' | 'error' | 'wait'
const P_STEP: Record<PState, 'finish' | 'process' | 'error' | 'wait'> = { done: 'finish', current: 'process', returned: 'process', error: 'error', wait: 'wait' }
const P_TEXT: Record<PState, string> = { done: 'เสร็จแล้ว', current: 'กำลังดำเนินการ', returned: 'ส่งกลับแก้ไข', error: 'ไม่อนุมัติ', wait: 'ยังไม่ถึง' }
type ProgressInput = Pick<TravelRequest, 'status' | 'approval_stage' | 'approval_chain' | 'current_step' | 'sign_mode' | 'actual_amount' | 'cost_mode' | 'hrd_reviewed'>
export const progressOf = (r: ProgressInput) => {
  const stage = r.approval_stage
  // label = ชื่อเต็ม (ข้อความสถานะ/tooltip) · short = ชื่อใต้ขั้น
  // ไม่มีขั้น "ยื่น" (เหมือนสายอนุมัติลา) — เริ่มที่ขั้นแรกที่ต้องพิจารณา
  const steps: { key: string; label: string; short: string }[] = []
  if (r.hrd_reviewed || stage === 'hrd' || stage === 'returned') steps.push({ key: 'hrd', label: 'เจ้าหน้าที่ HRD ตรวจ', short: 'HRD' })
  if (r.sign_mode === 'paper') steps.push({ key: 'director', label: 'เดินเอกสารเสนอผู้อำนวยการ', short: 'เดินเอกสาร' })
  else {
    for (const s of r.approval_chain ?? []) steps.push({ key: `chain-${s.step}`, label: s.level_name, short: s.level_name.replace('หัวหน้า', 'หน.') })
    steps.push({ key: 'director', label: 'ผู้อำนวยการลงนาม', short: 'ผอ.' })
  }
  if (r.cost_mode !== 'no_claim') steps.push({ key: 'finance', label: 'การเงินยืนยันยอด', short: 'การเงิน' })
  const curKey = stage === 'hrd' || stage === 'returned' ? 'hrd' : stage === 'chain' ? `chain-${r.current_step}` : stage === 'director' ? 'director'
    : r.cost_mode !== 'no_claim' && r.actual_amount == null ? 'finance' : null
  const cur = curKey ? steps.findIndex(s => s.key === curKey) : steps.length
  const items = steps.map((s, i) => ({
    ...s,
    state: (r.status === 'cancelled' ? 'wait'
      : i < cur ? 'done' : i > cur ? 'wait'
        : r.status === 'rejected' ? 'error' : stage === 'returned' ? 'returned' : 'current') as PState,
  }))
  const at = items[cur]
  const caption = r.status === 'cancelled' ? 'ยกเลิกแล้ว'
    : r.status === 'rejected' ? `ไม่อนุมัติที่ขั้น${at?.label ?? ''}`
      : !at ? 'ครบทุกขั้น'
        : stage === 'returned' ? 'รอผู้ขอแก้ไขตามที่ HRD ส่งกลับ'
          : `ขั้นที่ ${cur + 1}/${items.length} · รอ${at.label}`
  return { items, caption, cur, done: !at && r.status === 'submitted' }
}
export const RequestProgress = ({ r }: { r: ProgressInput }) => {
  const p = progressOf(r)
  return (
    <div data-testid="progress" data-caption={p.caption} aria-label={`ความคืบหน้า: ${p.caption}`}>
      <Steps size="small" titlePlacement="vertical" responsive={false} current={Math.min(p.cur, p.items.length - 1)} className="travel-progress"
        items={p.items.map(s => ({
          title: <Tooltip title={`${s.label} · ${P_TEXT[s.state]}`}>
            <span style={{ fontSize: 11, lineHeight: 1.25, display: 'inline-block', color: s.state === 'returned' ? '#d97706' : undefined }}>{s.short}</span>
          </Tooltip>,
          status: P_STEP[s.state],
        }))} />
    </div>
  )
}
/** ขั้นที่ x/n (แสดงข้างป้ายสถานะ) */
export const progressCount = (r: ProgressInput) => {
  const p = progressOf(r)
  return r.status === 'submitted' && p.cur < p.items.length ? `ขั้นที่ ${p.cur + 1}/${p.items.length}` : null
}

/** ขั้นเจ้าหน้าที่ HRD ตรวจ — คำขอที่ยื่นก่อนมีขั้นนี้ (ไม่มีประวัติการตรวจ และผ่านขั้นนี้ไปแล้ว) ไม่แสดง */
const hrdStep = (r: TravelRequest) => {
  const reviews = r.reviews ?? []
  const waiting = r.status === 'submitted' && (r.approval_stage === 'hrd' || r.approval_stage === 'returned')
  if (!reviews.length && !waiting) return []
  const last = reviews[reviews.length - 1]
  return [{
    title: 'เจ้าหน้าที่ HRD ตรวจคำขอ',
    content: <>{reviews.length > 0 && <ReviewHistory reviews={reviews} />}
      {r.status === 'submitted' && r.approval_stage === 'hrd' && <div>{reviews.length ? 'ผู้ขอแก้ไขแล้ว รอตรวจอีกครั้ง' : 'รอตรวจ'}</div>}
      {r.status === 'submitted' && r.approval_stage === 'returned' && <div>รอผู้ขอแก้ไขแล้วส่งใหม่</div>}</>,
    status: waiting ? 'process' as const : last?.action === 'rejected' ? 'error' as const : 'finish' as const,
  }]
}

/** ลำดับการลงนามของคำขอ: ผู้ขอ → HRD ตรวจ → หัวหน้าในสาย → ผอ. (กระดาษ) */
export const ApprovalSteps = ({ r }: { r: TravelRequest }) => {
  const chain = r.approval_chain ?? []
  const acts = r.approvals ?? []
  // เดินเอกสาร: ลงนามบนกระดาษทุกช่อง ระบบรู้แค่ผลสุดท้ายที่งาน HRD บันทึก
  if (r.sign_mode === 'paper') {
    const done = r.director_result != null, waiting = !done && r.status === 'submitted' && r.approval_stage === 'director'
    return <Steps orientation="vertical" size="small" current={-1} items={[
      { title: 'ยื่นในระบบ', content: thaiDateTime(r.created_at), status: 'finish' as const },
      ...hrdStep(r),
      {
        title: 'เดินเอกสารลงนาม', content: <>{['ผู้ขอ', ...chain.map(s => `${s.level_name} (${s.is_acting ? 'รักษาการ ' : ''}${s.approver_name})`), 'ผู้อำนวยการ'].join(' → ')}
          {r.director_result && <div>{r.director_result === 'approved' ? 'อนุมัติ เดินทางได้' : 'ไม่อนุมัติ'} · HRD แจ้งผู้เดินทาง {r.director_at ? thaiDateTime(r.director_at) : ''}{r.director_by_name ? ` (${r.director_by_name})` : ''}{r.director_note ? ` · ${r.director_note}` : ''}</div>}</>,
        status: r.director_result === 'approved' ? 'finish' as const : r.director_result === 'rejected' ? 'error' as const : waiting ? 'process' as const : 'wait' as const,
      },
    ]} />
  }
  const items = [
    { title: 'ผู้ขอลงนาม', content: thaiDateTime(r.created_at), status: 'finish' as const },
    ...hrdStep(r),
    ...chain.map(s => {
      const a = acts.find(x => x.step === s.step)
      const isCur = r.status === 'submitted' && r.approval_stage === 'chain' && r.current_step === s.step
      return {
        title: s.level_name,
        content: <>{s.is_acting ? 'รักษาการ ' : ''}{s.approver_name}{a && <div>{a.action === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} {thaiDateTime(a.acted_at)}{a.comment ? ` · ${a.comment}` : ''}</div>}</>,
        status: a ? (a.action === 'approved' ? 'finish' as const : 'error' as const) : isCur ? 'process' as const : 'wait' as const,
      }
    }),
    {
      title: 'ผู้อำนวยการ (ลงนามบนกระดาษ)',
      content: r.director_result ? <>{r.director_result === 'approved' ? 'อนุมัติ เดินทางได้' : 'ไม่อนุมัติ'} · HRD แจ้งผู้เดินทาง {r.director_at ? thaiDateTime(r.director_at) : ''}{r.director_by_name ? ` (${r.director_by_name})` : ''}{r.director_note ? ` · ${r.director_note}` : ''}</> : r.approval_stage === 'director' && r.status === 'submitted' ? 'รอลงนาม' : '',
      status: r.director_result === 'approved' ? 'finish' as const : r.director_result === 'rejected' ? 'error' as const : r.approval_stage === 'director' && r.status === 'submitted' ? 'process' as const : 'wait' as const,
    },
  ]
  return <Steps orientation="vertical" size="small" current={-1} items={items} />
}
