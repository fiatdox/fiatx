import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const qs = new URLSearchParams()
  const status = req.nextUrl.searchParams.get('status')
  if (status) qs.set('status', status)
  // as_user_id = ADMIN ดูประวัติการลาของบุคลากรคนอื่น (backend ตรวจสิทธิ์)
  const asUser = req.nextUrl.searchParams.get('as_user_id')
  if (asUser) qs.set('as_user_id', asUser)
  return proxy(req, `/api/v1/hr/leave-requests/mine${qs.size ? `?${qs}` : ''}`)
}
