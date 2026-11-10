import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ADMIN: รายชื่อเจ้าหน้าที่บันทึกกิจกรรม + บัญชีผู้ใช้ที่ผูก (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/it/activity/staff-links')
}
