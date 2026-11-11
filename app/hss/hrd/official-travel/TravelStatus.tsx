'use client'
// สถานะคำขอ (badge แยกสี) และลำดับการลงนาม — ใช้ร่วมกันหน้ารายการคำขอและ drawer รายละเอียด
import React from 'react'
import { Steps, Tag } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, StopOutlined } from '@ant-design/icons'
import { statusOf, thaiDateTime, type StatusKey, type TravelRequest } from './travelCalc'

// ไอคอนประจำสถานะ — สีอย่างเดียวไม่พอสำหรับคนตาบอดสี
const STATUS_ICON: Record<StatusKey, React.ReactNode> = {
  step1: <ClockCircleOutlined />, step2: <ClockCircleOutlined />, director: <ClockCircleOutlined />,
  approved: <CheckCircleOutlined />, rejected: <CloseCircleOutlined />, cancelled: <StopOutlined />,
}

export const StatusBadge = ({ r }: { r: Parameters<typeof statusOf>[0] }) => {
  const st = statusOf(r)
  return (
    <Tag color={st.color} variant="outlined" icon={STATUS_ICON[st.key]} data-testid="status-badge" data-status={st.key}
      style={{ margin: 0, fontWeight: 600, borderRadius: 999, paddingInline: 10 }}>{st.label}</Tag>
  )
}

/** ลำดับการลงนามของคำขอ: ผู้ขอ → หัวหน้าในสาย → ผอ. (กระดาษ) */
export const ApprovalSteps = ({ r }: { r: TravelRequest }) => {
  const chain = r.approval_chain ?? []
  const acts = r.approvals ?? []
  // เดินเอกสาร: ลงนามบนกระดาษทุกช่อง ระบบรู้แค่ผลสุดท้ายที่งาน HRD บันทึก
  if (r.sign_mode === 'paper') {
    const done = r.director_result != null, waiting = !done && r.status === 'submitted'
    return <Steps orientation="vertical" size="small" current={-1} items={[
      { title: 'ยื่นในระบบ', content: thaiDateTime(r.created_at), status: 'finish' as const },
      {
        title: 'เดินเอกสารลงนาม', content: <>{['ผู้ขอ', ...chain.map(s => `${s.level_name} (${s.is_acting ? 'รักษาการ ' : ''}${s.approver_name})`), 'ผู้อำนวยการ'].join(' → ')}
          {r.director_result && <div>{r.director_result === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} · บันทึกผล {r.director_at ? thaiDateTime(r.director_at) : ''}{r.director_note ? ` · ${r.director_note}` : ''}</div>}</>,
        status: r.director_result === 'approved' ? 'finish' as const : r.director_result === 'rejected' ? 'error' as const : waiting ? 'process' as const : 'wait' as const,
      },
    ]} />
  }
  const items = [
    { title: 'ผู้ขอลงนาม', content: thaiDateTime(r.created_at), status: 'finish' as const },
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
      content: r.director_result ? <>{r.director_result === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} · บันทึกผล {r.director_at ? thaiDateTime(r.director_at) : ''}{r.director_note ? ` · ${r.director_note}` : ''}</> : r.approval_stage === 'director' && r.status === 'submitted' ? 'รอลงนาม' : '',
      status: r.director_result === 'approved' ? 'finish' as const : r.director_result === 'rejected' ? 'error' as const : r.approval_stage === 'director' && r.status === 'submitted' ? 'process' as const : 'wait' as const,
    },
  ]
  return <Steps orientation="vertical" size="small" current={-1} items={items} />
}
