import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// หัวหน้าและบุคลากรที่ถูกยกเว้นการแจ้งเตือนระบบลา — เฉพาะ ADMIN (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/leave-notify/exempt')
}
