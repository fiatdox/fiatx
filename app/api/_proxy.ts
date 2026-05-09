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
  const token = req.cookies.get('auth_token')?.value
  const url = `${BASE}${path}`
  console.log(`[proxy] ${method} ${url} | token: ${token ? token.slice(0, 20) + '…' : 'MISSING'}`)
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  console.log(`[proxy] response ${res.status}`, JSON.stringify(data).slice(0, 120))
  return NextResponse.json(data, { status: res.status })
}
