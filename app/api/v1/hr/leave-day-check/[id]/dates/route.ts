import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

type Ctx = { params: Promise<{ id: string }> }

// HR แก้วันที่ลา (ผู้ลาขอยกเลิกบางวัน) — คืนวันลาส่วนต่างทันที
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/hr/leave-day-check/${encodeURIComponent(id)}/dates`, 'POST', body)
}
