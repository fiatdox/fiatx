import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qs = new URLSearchParams({ limit: sp.get('limit') ?? '200' })
  // ไม่ส่ง from/to = backend ใช้ค่าเริ่มต้น (เฉพาะวันปัจจุบัน)
  const from = sp.get('from')
  const to = sp.get('to')
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  return proxy(req, `/api/v1/mfa/audit?${qs.toString()}`)
}
