import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ใบลาที่ควรตรวจจำนวนวัน — backend จำกัดเฉพาะ ADMIN / HR
export async function GET(req: NextRequest) {
  return proxy(req, `/api/v1/hr/leave-day-check?${req.nextUrl.searchParams.toString()}`)
}
