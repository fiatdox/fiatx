import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// สรุปการเข้าใช้งาน — ฝั่ง backend จำกัดสิทธิ์ ADMIN / เจ้าหน้าที่ IT ไว้แล้ว
export async function GET(req: NextRequest) {
  return proxy(req, `/api/v1/page-views/stats${req.nextUrl.search}`)
}
