import { NextRequest } from 'next/server'
import { proxy } from '../_proxy'

// เพิ่มสิทธิ์ให้ผู้ใช้ — รับเป็นชุด (array) [{ user_id, role_id }, ...]
export async function POST(req: NextRequest) {
  const body = await req.json()
  return proxy(req, '/api/v1/user-roles/', 'POST', body)
}
