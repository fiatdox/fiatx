import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  return proxy(req, `/api/v1/hr/holidays?${req.nextUrl.searchParams.toString()}`)
}

// เพิ่มวันหยุด — backend จำกัดเฉพาะ ADMIN / HR
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/hr/holidays', 'POST', body)
}
