import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// การประเมินความเสี่ยงของบุคคลภายนอก (3rd Party) — เฉพาะเจ้าหน้าที่ IT (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/it/third-party')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/it/third-party', 'POST', body)
}
