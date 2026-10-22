// ชนิดข้อมูลของบันทึกกิจกรรม IT — ใช้ร่วมกันระหว่างหน้า (page.tsx) และ Dashboard (dashboard/*)
export type TaskStatus = 'done' | 'in_progress' | 'waiting' | 'pending'
export type Priority = 'urgent' | 'normal' | 'low'
export type RequestSource = 'call' | 'walk_in' | 'email' | 'alert' | 'scheduled' | 'inspection' | 'other'
export type Nature = 'reactive' | 'proactive' | 'neutral'

export interface ActivityLog {
  log_id: number
  log_date: string         // YYYY-MM-DD
  log_date_th?: string     // DD/MM/YYYY
  staff_id: number
  staff_name: string
  staff_role?: string | null
  type_code: string
  type_name_th: string
  activity_nature: Nature
  system_code: string
  system_name: string
  status_code: TaskStatus
  status_name: string
  status_color: string
  is_closed: boolean
  start_time: string       // HH:mm
  end_time: string         // HH:mm
  time_slot?: string
  duration_hours?: number
  minutes_used: number
  hours_used?: number
  detail: string
  outcome: string | null
  priority_code: Priority
  priority_name?: string
  priority_color?: string
  source_code: RequestSource
  source_name?: string
  source_is_planned?: boolean
  location: string | null
  asset_code: string | null
  affected_users: number
  is_overtime: boolean
  ticket_id: string | null
}

export interface MasterStaff   { staff_id: number; staff_code: string; full_name_th: string; role_th?: string | null }
export interface MasterType    { type_code: string; type_name_th: string; nature: Nature; color_hint?: string | null }
export interface MasterSystem  { system_code: string; system_name_th: string }
export interface MasterStatus  { status_code: TaskStatus; status_name_th: string; color_hex: string; is_closed: boolean; sort_order: number }
export interface MasterPriority { priority_code: Priority; priority_name_th: string; color_hex: string }
export interface MasterSource  { source_code: RequestSource; source_name_th: string; is_planned: boolean }

export interface MasterData {
  staff: MasterStaff[]
  types: MasterType[]
  systems: MasterSystem[]
  statuses: MasterStatus[]
  priorities: MasterPriority[]
  request_sources: MasterSource[]
  config?: { day_start_hour?: number; day_end_hour?: number }
}
