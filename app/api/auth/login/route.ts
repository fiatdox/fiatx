import { NextRequest } from 'next/server'
import { clientHeaders } from '../../_proxy'
import { respondWithAuthCookie } from '../../_authCookie'

// เข้าสู่ระบบ — สำเร็จแล้วเก็บ token ลง cookie HttpOnly (ไม่ส่ง token ให้เบราว์เซอร์) · ต้องยืนยัน MFA = ยังไม่มี token ส่งต่อ challenge ตามเดิม
export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...clientHeaders(req) },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return respondWithAuthCookie(req, data, res.status)
}
