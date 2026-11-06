import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

// ตั้งการยกเว้นการแจ้งเตือนรายคน — เฉพาะ ADMIN (backend ตรวจสิทธิ์)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/hr/leave-notify/exempt/${encodeURIComponent(userId)}`, 'PUT', body)
}
