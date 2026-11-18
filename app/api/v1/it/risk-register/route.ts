import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ทะเบียนความเสี่ยง (Risk Register) ปีงบประมาณละ 2 ครั้ง — เฉพาะเจ้าหน้าที่ IT (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/it/risk-register')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/it/risk-register', 'POST', body)
}
