import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ดึงรายชื่อผู้ใช้ที่มีสิทธิ์ (role_id) นี้ → { success, data: [{ user_id, role_id, fname, lname, ... }] }
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  return proxy(req, `/api/v1/user-roles/role/${key}`)
}
