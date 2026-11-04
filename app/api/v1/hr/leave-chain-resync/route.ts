import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ใบลาที่สายอนุมัติไม่ตรงผังปัจจุบัน — เฉพาะ ADMIN (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/leave-chain-resync')
}
