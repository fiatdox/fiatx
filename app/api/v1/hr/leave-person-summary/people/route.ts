import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// รายชื่อบุคลากรที่ปฏิบัติงาน + สรุปวันลาย่อ (ADMIN / HR — backend ตรวจสิทธิ์) ส่งต่อเฉพาะตัวกรองที่รู้จัก
const KEYS = ['fiscal_year', 'mission_id', 'major_id', 'submajor_id', 'q', 'page', 'page_size']

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const k of KEYS) {
    const v = sp.get(k)
    if (v) qs.set(k, v.slice(0, 100))
  }
  const suffix = qs.size > 0 ? `?${qs.toString()}` : ''
  return proxy(req, `/api/v1/hr/leave-person-summary/people${suffix}`)
}
