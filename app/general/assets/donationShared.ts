// Shared types + fetch helpers ของระบบรับบริจาคครุภัณฑ์ (asset-donation)
// Flow: donation_staff (Form1) -> committee 3 ท่านลงมติ -> procurement (Form2) -> registered

export type DonationType = 'new' | 'used'
export type FormStatus = 'draft' | 'pending_approval' | 'pending_registration' | 'rejected' | 'registered'
export type ReviewDecision = 'approved' | 'rejected'

export const STATUS_LABEL: Record<FormStatus, { label: string; color: string }> = {
  draft:                 { label: 'ร่าง',                  color: 'default' },
  pending_approval:      { label: 'รอกรรมการพิจารณา',      color: 'processing' },
  pending_registration:  { label: 'รอฝ่ายพัสดุขึ้นทะเบียน', color: 'warning' },
  rejected:              { label: 'ไม่อนุมัติ',             color: 'error' },
  registered:            { label: 'ขึ้นทะเบียนแล้ว',        color: 'success' },
}

export type DonationImage = { id: number; donation_item_id: number; file_name: string; original_name: string; uploaded_at: string }

export type DonationItem = {
  id?: number
  item_no?: number
  item_name: string
  item_brand_model?: string | null
  item_qty: number
  item_unit: string
  item_est_value?: number | null
  item_condition_general?: string | null
  asset_registration_no?: string | null
  depreciation_start_date?: string | null
  useful_life_years?: number | null
  custodian_department?: string | null
  repair_condition_note?: string | null
  recorded_by_user_id?: number | null
  recorded_date?: string | null
  images?: DonationImage[]
}

export type CommitteeReview = {
  id: number
  committee_user_id: number
  committee_position: string
  committee_name: string
  decision: ReviewDecision
  comment: string
  reviewed_date: string
}

export type DonationForm = {
  id: number
  form_code: string
  submitted_by_user_id: number
  submitted_by_name?: string
  submitted_by_position?: string
  submitted_date: string
  donor_name: string
  donor_address?: string | null
  donor_phone?: string | null
  donor_purpose?: string | null
  receiving_department: string
  major_id?: number | null
  submajor_id?: number | null
  donation_type: DonationType
  used_exterior_condition?: string | null
  used_tested_working?: boolean | null
  used_estimated_age_years?: number | null
  used_condition_notes?: string | null
  used_acknowledged_by?: string | null
  used_acknowledged_date?: string | null
  status: FormStatus
  approval_date?: string | null
  item_count: number
  created_at: string
  updated_at: string
  items?: DonationItem[]
  committee_reviews?: CommitteeReview[]
  my_review?: CommitteeReview | null
}

export type DonationMeta = {
  departments: { id: number; name: string }[]
  majors: { major_id: number; name: string }[]
  submajors: { submajor_id: number; major_id: number; name: string }[]
  committee: { id: number; user_id: number; committee_position: string; name: string }[]
  used_exterior_conditions: string[]
}

// ── generic fetch helper ──
const jsonReq = async (url: string, method: string, body?: unknown) => {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j?.success === false) throw new Error(j?.error?.message || j?.message || 'ดำเนินการไม่สำเร็จ')
  return j
}

export const apiMeta = (): Promise<{ success: boolean; data: DonationMeta }> => jsonReq('/api/v1/asset-donation/meta', 'GET')
export const apiUserOptions = (search?: string) =>
  jsonReq(`/api/v1/asset-donation/user-options${search ? `?search=${encodeURIComponent(search)}` : ''}`, 'GET')

export const apiListForms = (scope: string, status?: string) =>
  jsonReq(`/api/v1/asset-donation/forms?scope=${scope}${status ? `&status=${status}` : ''}`, 'GET')
export const apiGetForm = (id: number) => jsonReq(`/api/v1/asset-donation/forms/${id}`, 'GET')
export const apiCreateForm = (payload: Partial<DonationForm> & { items: DonationItem[] }) =>
  jsonReq('/api/v1/asset-donation/forms', 'POST', payload)
export const apiUpdateForm = (id: number, payload: Partial<DonationForm> & { items: DonationItem[] }) =>
  jsonReq(`/api/v1/asset-donation/forms/${id}`, 'PUT', payload)
export const apiDeleteForm = (id: number) => jsonReq(`/api/v1/asset-donation/forms/${id}`, 'DELETE')
export const apiSubmitForm = (id: number) => jsonReq(`/api/v1/asset-donation/forms/${id}/submit`, 'POST', {})

export const apiUploadImages = async (formId: number, itemId: number, files: File[]) => {
  const fd = new FormData()
  files.forEach(f => fd.append('images', f))
  const res = await fetch(`/api/v1/asset-donation/forms/${formId}/items/${itemId}/images`, { method: 'POST', body: fd })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j?.success === false) throw new Error(j?.error?.message || 'อัปโหลดรูปไม่สำเร็จ')
  return j
}
export const apiDeleteImage = (formId: number, itemId: number, imageId: number) =>
  jsonReq(`/api/v1/asset-donation/forms/${formId}/items/${itemId}/images/${imageId}`, 'DELETE')
export const donationImageUrl = (imageId: number) => `/api/v1/asset-donation/images/${imageId}/file`

export const apiCommitteeReview = (id: number, decision: ReviewDecision, comment: string) =>
  jsonReq(`/api/v1/asset-donation/forms/${id}/committee-review`, 'POST', { decision, comment })

export const apiRegisterForm = (id: number, items: Partial<DonationItem>[]) =>
  jsonReq(`/api/v1/asset-donation/forms/${id}/registration`, 'POST', { items })

// ── admin master data ──
export const apiListDepartments = () => jsonReq('/api/v1/asset-donation/departments', 'GET')
export const apiCreateDepartment = (payload: { name: string; sort?: number; active?: boolean }) =>
  jsonReq('/api/v1/asset-donation/departments', 'POST', payload)
export const apiUpdateDepartment = (id: number, payload: { name: string; sort?: number; active?: boolean }) =>
  jsonReq(`/api/v1/asset-donation/departments/${id}`, 'PUT', payload)
export const apiDeleteDepartment = (id: number) => jsonReq(`/api/v1/asset-donation/departments/${id}`, 'DELETE')

export const apiListCommitteeMembers = () => jsonReq('/api/v1/asset-donation/committee-members', 'GET')
export const apiCreateCommitteeMember = (payload: { user_id: number; committee_position: string; sort?: number; active?: boolean }) =>
  jsonReq('/api/v1/asset-donation/committee-members', 'POST', payload)
export const apiUpdateCommitteeMember = (id: number, payload: { committee_position: string; sort?: number; active?: boolean }) =>
  jsonReq(`/api/v1/asset-donation/committee-members/${id}`, 'PUT', payload)
export const apiDeleteCommitteeMember = (id: number) => jsonReq(`/api/v1/asset-donation/committee-members/${id}`, 'DELETE')

export const fmtTHB = (n?: number | null) => n == null ? '-' : n.toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' บาท'
