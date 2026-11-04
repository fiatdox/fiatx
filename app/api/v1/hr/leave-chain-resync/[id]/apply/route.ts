import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

// ปรับสายอนุมัติของใบนี้ตามผังปัจจุบัน — เฉพาะ ADMIN (backend ตรวจสิทธิ์)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/hr/leave-chain-resync/${encodeURIComponent(id)}/apply`, 'POST', body)
}
