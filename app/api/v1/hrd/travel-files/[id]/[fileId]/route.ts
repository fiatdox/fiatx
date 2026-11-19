import { NextRequest, NextResponse } from 'next/server'
import { authHeader, clientHeaders, proxy } from '../../../../../_proxy'

type Ctx = { params: Promise<{ id: string; fileId: string }> }
const ids = async ({ params }: Ctx) => {
  const p = await params
  const id = Number(p.id), fileId = Number(p.fileId)
  return Number.isInteger(id) && id > 0 && Number.isInteger(fileId) && fileId > 0 ? { id, fileId } : null
}

// เปิดไฟล์แนบของคำขอไปราชการ — สิทธิ์เดียวกับการดูคำขอ (backend ตรวจ)
export async function GET(req: NextRequest, ctx: Ctx) {
  const x = await ids(ctx)
  if (!x) return NextResponse.json({ success: false, message: 'ไม่พบไฟล์แนบ' }, { status: 404 })
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/hrd/travel/requests/${x.id}/files/${x.fileId}`, {
    headers: { ...clientHeaders(req), ...authHeader(req) },
  })
  if (!res.ok) return NextResponse.json(await res.json().catch(() => ({ success: false })), { status: res.status })
  const headers: Record<string, string> = { 'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }
  const disposition = res.headers.get('content-disposition')
  if (disposition) headers['Content-Disposition'] = disposition
  return new NextResponse(res.body, { status: res.status, headers })
}

// ลบไฟล์แนบ — ผู้ขอ หรือ ADMIN/HRD ขณะคำขอยังไม่ยกเลิก/ไม่ถูกปฏิเสธ (backend ตรวจ)
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const x = await ids(ctx)
  if (!x) return NextResponse.json({ success: false, message: 'ไม่พบไฟล์แนบ' }, { status: 404 })
  return proxy(req, `/api/v1/hrd/travel/requests/${x.id}/files/${x.fileId}/delete`, 'POST', {})
}
