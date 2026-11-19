import { NextRequest } from 'next/server'
import { proxyForm } from '../../../../_proxy'

type Ctx = { params: Promise<{ id: string }> }

// แนบไฟล์ของคำขอไปราชการ (multipart: kind, file) — backend ตรวจสิทธิ์ / ชนิด / ขนาด
// แยกจาก /api/v1/hrd/travel/[...path] เพราะเส้นนั้นอ่าน body เป็น JSON
export async function POST(req: NextRequest, { params }: Ctx) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) return Response.json({ success: false, message: 'ไม่พบคำขอ' }, { status: 404 })
  return proxyForm(req, `/api/v1/hrd/travel/requests/${id}/files`)
}
