import { NextRequest } from 'next/server'
import { proxy } from '../../_proxy'

// ทะเบียนโมดูล — ฝั่ง backend จำกัดสิทธิ์ ADMIN ไว้แล้ว
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/modules')
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/modules', 'PUT', body)
}
