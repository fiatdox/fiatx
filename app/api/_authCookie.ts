import { NextRequest, NextResponse } from 'next/server'

// cookie auth_token ตั้งจากฝั่ง server เท่านั้น (HttpOnly) — สคริปต์ในหน้าเว็บอ่าน token ไม่ได้ ถ้ามี XSS ก็ขโมย token ไปใช้ที่อื่นไม่ได้
// ทุกหน้าเรียก API ผ่าน route ของ Next.js ซึ่งอ่าน cookie ฝั่ง server (_proxy.ts / proxy.ts) จึงไม่ต้องให้เบราว์เซอร์เห็น token
// อายุ 8 ชม. ให้ตรงกับ JWT ฝั่ง backend (exp: '8h')
export const AUTH_COOKIE = 'auth_token'
export const AUTH_MAX_AGE = 8 * 60 * 60

// Secure เฉพาะเมื่อเข้ามาทาง https (nginx ส่ง X-Forwarded-Proto) — ยังเปิดผ่าน http ได้ตามปกติ
const viaHttps = (req: NextRequest) =>
  (req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')).split(',')[0].trim().toLowerCase() === 'https'

/** ตอบ JSON จาก backend ต่อ — ถ้ามี token ให้เก็บลง cookie HttpOnly แล้วตัด token ออกจาก body ที่ส่งให้เบราว์เซอร์ */
export function respondWithAuthCookie(req: NextRequest, data: unknown, status: number) {
  const { token, ...rest } = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const out = NextResponse.json(rest, { status })
  if (status >= 200 && status < 300 && typeof token === 'string' && token) {
    out.cookies.set(AUTH_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: AUTH_MAX_AGE, secure: viaHttps(req) })
  }
  return out
}

/** ล้าง cookie ของการเข้าสู่ระบบทั้งหมด (auth_token เป็น HttpOnly ฝั่งเบราว์เซอร์ลบเองไม่ได้) */
export function clearAuthCookies(res: NextResponse) {
  for (const c of [AUTH_COOKIE, 'user_data', 'user_type_id']) res.cookies.set(c, '', { path: '/', maxAge: 0 })
  return res
}
