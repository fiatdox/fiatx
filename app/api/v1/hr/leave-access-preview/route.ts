import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ADMIN ดูหน้าการลาแบบเจ้าหน้าที่ (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('user_id') ?? ''
  return proxy(req, `/api/v1/hr/leave-access-preview?user_id=${encodeURIComponent(uid)}`)
}
