'use client'
import React from 'react'
import { Alert, Tooltip, Typography } from 'antd'
import { CheckCircleFilled, ExclamationCircleFilled, QuestionCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

export type NameMatch = 'match' | 'mismatch' | 'unknown'
export type Period = { from: string | null; to: string | null; count: number }
export type Lookup = {
  salary_id: number; name: string
  ptype_name: string | null; section_name: string | null
  period: Period | null; taken_by: string | null; name_match: NameMatch
}

// mt = พ.ศ. YYYYMM00 → "ต.ค. 2569"
const TH_MON = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
export const fmtMt = (mt: string | null) =>
  !mt || mt.length < 6 ? '-' : `${TH_MON[Number(mt.slice(4, 6))] ?? ''} ${mt.slice(0, 4)}`
export const fmtPeriod = (p: Period | null) =>
  p && p.from ? `${fmtMt(p.from)} – ${fmtMt(p.to)} (${p.count} งวด)` : 'ไม่มีข้อมูลเงินเดือน'
export const money = (n: number | null | undefined) =>
  n == null ? '-' : n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** ไอคอนผลตรวจชื่อ: ตรง = เขียว, ไม่ตรง = แดง (ต้องตรวจสอบ), ไม่ทราบ = เทา */
export function MatchBadge({ match, payName }: { match: NameMatch; payName?: string | null }) {
  if (match === 'match') {
    return <Tooltip title={`ชื่อตรงกับทะเบียนเงินเดือน${payName ? `: ${payName}` : ''}`}><CheckCircleFilled style={{ color: '#10b981' }} /></Tooltip>
  }
  if (match === 'mismatch') {
    return <Tooltip title={`ชื่อไม่ตรงกับทะเบียนเงินเดือน${payName ? ` (ทะเบียน: ${payName})` : ''} — กรุณาตรวจสอบ`}><ExclamationCircleFilled style={{ color: '#ef4444' }} /></Tooltip>
  }
  return <Tooltip title="ไม่มีชื่อในทะเบียนให้เทียบ"><QuestionCircleOutlined style={{ color: '#9ca3af' }} /></Tooltip>
}

/** ดูข้อมูลเลขที่เงินเดือนก่อนผูก พร้อมเทียบชื่อกับผู้ใช้ */
export async function fetchLookup(salaryId: number | string, userId?: number): Promise<{ ok: true; data: Lookup } | { ok: false; message: string }> {
  try {
    const qs = userId ? `?user_id=${userId}` : ''
    const j = await fetch(`/api/v1/accounting/salary-ids/lookup/${salaryId}${qs}`).then(r => r.json())
    return j?.success ? { ok: true, data: j.data } : { ok: false, message: j?.message || 'ค้นหาเลขที่เงินเดือนไม่สำเร็จ' }
  } catch (e) {
    return { ok: false, message: (e as Error).message }
  }
}

/** การ์ดสรุปผลตรวจ — สีตามผลเทียบชื่อ */
export function LookupCard({ lk, userName }: { lk: Lookup; userName?: string }) {
  const type = lk.taken_by ? 'error' : lk.name_match === 'match' ? 'success' : lk.name_match === 'mismatch' ? 'warning' : 'info'
  const head = lk.taken_by
    ? `เลขนี้ถูกผูกกับ ${lk.taken_by} แล้ว`
    : lk.name_match === 'match' ? 'ชื่อตรงกับทะเบียนเงินเดือน'
      : lk.name_match === 'mismatch' ? 'ชื่อไม่ตรงกับทะเบียนเงินเดือน — ตรวจสอบก่อนผูก'
        : 'ข้อมูลในทะเบียนเงินเดือน'
  return (
    <Alert
      type={type} showIcon className="mt-2"
      title={head}
      description={
        <div style={{ lineHeight: 1.8 }}>
          <div>ชื่อในทะเบียน: <Text strong>{lk.name || '-'}</Text></div>
          {userName && <div>ชื่อผู้ใช้ในระบบ: <Text strong>{userName}</Text></div>}
          <div>ประเภท: {lk.ptype_name ?? '-'} · หน่วยงาน: {lk.section_name ?? '-'}</div>
          <div>ช่วงงวด: {fmtPeriod(lk.period)}</div>
        </div>
      }
    />
  )
}
