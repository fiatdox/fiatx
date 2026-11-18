import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// Business Impact Analysis — ทะเบียนบริการ (เฉพาะเจ้าหน้าที่ IT — backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/it/bia')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/it/bia', 'POST', body)
}
