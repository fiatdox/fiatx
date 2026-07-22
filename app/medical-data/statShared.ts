// Shared types + helpers for the medical-statistics-request module (client-side).
import Cookies from 'js-cookie'

export const ACCENT = '#0d9488'
export const HEAD_ROLES = ['CHIEF_GROUP_MEDSTAT', 'ADMIN']

export type StatStatus = 'pending' | 'processing' | 'delivered' | 'rejected'

export interface StatFile { id: number; kind: 'sample' | 'result'; stored_name: string; original_name: string; created_at: string }
export interface RestrictedField { id: number; field_name: string; note?: string | null }
export interface HistoryItem { id: number; step_name: string; action: string; note?: string | null; created_at: string; actor_name?: string | null }

export interface StatRequest {
  id: number
  request_no: string
  requester_id: number
  requester_name: string
  requester_department?: string | null
  email?: string | null
  purpose_category_id?: number | null
  purpose_category_name?: string | null
  purpose_detail?: string | null
  data_detail?: string | null
  period_from?: string | null
  period_to?: string | null
  format?: string | null
  urgency_id?: number | null
  urgency_name?: string | null
  urgency_color?: string | null
  status: StatStatus
  review_type?: 'full' | 'partial' | null
  review_note?: string | null
  reviewed_by_name?: string | null
  reviewed_at?: string | null
  assigned_to?: number | null
  assigned_to_name?: string | null
  delivered_note?: string | null
  delivered_at?: string | null
  created_at: string
  updated_at: string
  // detail-only
  files?: StatFile[]
  restricted_fields?: RestrictedField[]
  history?: HistoryItem[]
}

export interface PurposeCategory { id: number; name: string; description?: string }
export interface UrgencyLevel { id: number; code: string; name: string; color_hex: string }
export interface StatMeta { purpose_categories: PurposeCategory[]; urgency_levels: UrgencyLevel[]; formats: string[] }
export interface StatStaff { id: number; name: string; position_name?: string }

export const STATUS_CONFIG: Record<StatStatus, { label: string; color: string; step: number }> = {
  pending:    { label: 'รอตรวจสอบ (PDPA)', color: 'orange',     step: 1 },
  processing: { label: 'กำลังจัดทำข้อมูล',  color: 'processing', step: 2 },
  delivered:  { label: 'ส่งมอบแล้ว',        color: 'success',    step: 3 },
  rejected:   { label: 'ไม่อนุมัติ',        color: 'error',      step: -1 },
}

export const STEP_ITEMS = [
  { title: 'ยื่นคำขอ' },
  { title: 'ตรวจสอบ/อนุมัติ' },
  { title: 'จัดทำข้อมูล' },
  { title: 'ส่งมอบ' },
]

export const roles = (): string[] => {
  try {
    const raw = Cookies.get('user_data')
    if (!raw) return []
    return (JSON.parse(raw).roles ?? []).map((r: string) => String(r).toUpperCase())
  } catch { return [] }
}
export const hasRole = (allowed: string[]) => roles().some(r => allowed.map(a => a.toUpperCase()).includes(r))

export const fmtDate = (s?: string | null) => {
  if (!s) return '-'
  const d = new Date(s)
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export const fmtDateTime = (s?: string | null) => {
  if (!s) return '-'
  const d = new Date(s)
  return isNaN(d.getTime()) ? String(s)
    : d.toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json()
}
