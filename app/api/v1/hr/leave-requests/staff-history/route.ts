import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ประวัติการลาเจ้าหน้าที่ทุกคน (ADMIN / HR — backend ตรวจสิทธิ์) ส่งต่อเฉพาะตัวกรองที่รู้จัก
const KEYS = ['fiscal_year', 'leave_type_id', 'status', 'q', 'has_document', 'check', 'page', 'page_size']

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const k of KEYS) {
    const v = sp.get(k)
    if (v) qs.set(k, v.slice(0, 100))
  }
  const suffix = qs.size > 0 ? `?${qs.toString()}` : ''
  return proxy(req, `/api/v1/hr/leave-requests/staff-history${suffix}`)
}
