import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ลายเซ็นของผู้ล็อกอิน (ตั้งค่าบัญชี > ลายเซ็น) — backend ใช้ตัวตนจาก JWT
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/users/me/signature')
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/users/me/signature', 'PUT', body)
}

export async function DELETE(req: NextRequest) {
  return proxy(req, '/api/v1/users/me/signature', 'DELETE')
}
