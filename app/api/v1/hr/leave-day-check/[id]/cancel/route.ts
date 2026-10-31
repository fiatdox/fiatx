import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

type Ctx = { params: Promise<{ id: string }> }

// ยกเลิกผลการตรวจจำนวนวันลา (ADMIN/HR — backend ตรวจสิทธิ์)
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return proxy(req, `/api/v1/hr/leave-day-check/${encodeURIComponent(id)}/cancel`, 'POST', {})
}
