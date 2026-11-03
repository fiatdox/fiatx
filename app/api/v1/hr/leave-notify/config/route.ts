import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ค่าตั้งการแจ้งเตือนระบบลา — เฉพาะ ADMIN (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/leave-notify/config')
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/hr/leave-notify/config', 'PUT', body)
}
