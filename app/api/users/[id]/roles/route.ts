import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ดึงสิทธิ์ (roles) ของผู้ใช้รายคน
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/users/${id}/roles`)
}

// บันทึกสิทธิ์ (roles) ที่กำหนดให้ผู้ใช้
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  return proxy(req, `/api/v1/users/${id}/roles`, 'PUT', body)
}
