import { NextRequest, NextResponse } from 'next/server'

const BASE = process.env.NEXT_PUBLIC_API_URL

export function authHeader(req: NextRequest): Record<string, string> {
  const token = req.cookies.get('auth_token')?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function proxy(
  req: NextRequest,
  path: string,
  method = 'GET',
  body?: unknown,
) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  // log เฉพาะ request ที่ผิดพลาด และไม่ log token / response body (กัน PII รั่วลง log)
  if (!res.ok) console.error(`[proxy] ${method} ${path} → ${res.status}`)

  const out = NextResponse.json(data, { status: res.status })

  // 401 = token ใช้ไม่ได้ (หมดอายุ หรือ JWT_SECRET ฝั่ง backend เปลี่ยนไปแล้ว)
  // ล้าง cookie ทิ้งเลย ไม่งั้นผู้ใช้จะค้างอยู่ในสภาพ "ล็อกอินแล้วแต่ทุกอย่าง 401"
  // โดยไม่มีอะไรบอก และกด refresh กี่ครั้งก็ไม่หาย
  if (res.status === 401) {
    for (const c of ['auth_token', 'user_data', 'user_type_id']) {
      out.cookies.set(c, '', { path: '/', maxAge: 0 })
    }
  }
  return out
}

export async function proxyForm(req: NextRequest, path: string) {
  const url = `${BASE}${path}`
  const contentType = req.headers.get('content-type') ?? ''
  const bodyBlob = await req.blob()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType, ...authHeader(req) },
    body: bodyBlob,
  })
  const data = await res.json().catch(() => ({}))
  // log เฉพาะ request ที่ผิดพลาด และไม่ log token / response body (กัน PII รั่วลง log)
  if (!res.ok) console.error(`[proxy] POST ${path} (multipart) → ${res.status}`)
  return NextResponse.json(data, { status: res.status })
}
