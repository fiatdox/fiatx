import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ผลที่จะเกิดถ้าปรับสายอนุมัติของใบนี้ — เฉพาะ ADMIN (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/hr/leave-chain-resync/${encodeURIComponent(id)}`)
}
