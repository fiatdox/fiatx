import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope') ?? 'pending'
  // as_user_id = ADMIN ดูแบบหัวหน้าคนอื่น (backend ตรวจสิทธิ์)
  const asUser = req.nextUrl.searchParams.get('as_user_id')
  const qs = asUser ? `&as_user_id=${encodeURIComponent(asUser)}` : ''
  return proxy(req, `/api/v1/hr/leave-requests/pending-approval?scope=${encodeURIComponent(scope)}${qs}`)
}
