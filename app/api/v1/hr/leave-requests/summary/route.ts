import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ส่งต่อเฉพาะ from/to ที่เป็นรูปแบบวันที่จริง เพื่อไม่ให้ query แปลก ๆ หลุดไปถึง backend
const ymd = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const k of ['from', 'to']) {
    const v = sp.get(k)
    if (v && ymd.test(v)) qs.set(k, v)
  }
  const suffix = qs.size > 0 ? `?${qs.toString()}` : ''
  return proxy(req, `/api/v1/hr/leave-requests/summary${suffix}`)
}
