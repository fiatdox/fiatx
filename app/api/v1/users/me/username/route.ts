import { NextRequest } from 'next/server'
import { authHeader, clientHeaders } from '../../../../_proxy'
import { clearAuthCookies, respondWithAuthCookie } from '../../../../_authCookie'

// ตั้งชื่อผู้ใช้ใหม่ — backend ออก token ใหม่ (ของเดิมยังถือชื่อเก่า + ธงบังคับเปลี่ยน) → เก็บทับใน cookie HttpOnly ทันที
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/me/username`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...clientHeaders(req), ...authHeader(req) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) console.error(`[proxy] PATCH /api/v1/users/me/username → ${res.status}`)
  const out = respondWithAuthCookie(req, data, res.status)
  return res.status === 401 ? clearAuthCookies(out) : out
}
