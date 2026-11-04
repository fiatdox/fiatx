import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ประวัติการปรับสายอนุมัติ — เฉพาะ ADMIN (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get('limit')
  return proxy(req, `/api/v1/hr/leave-chain-resync/log${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`)
}
