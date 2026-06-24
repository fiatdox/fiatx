import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

// ดึงเอกสาร PR ที่บันทึกไว้ในฐานข้อมูล (เลข PR, รายละเอียด, เอกสารที่เสนอ)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/it/repair-requests/${id}/pr`)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/it/repair-requests/${id}/pr`, 'POST', body)
}
