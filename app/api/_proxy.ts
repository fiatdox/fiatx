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
  return NextResponse.json(data, { status: res.status })
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
