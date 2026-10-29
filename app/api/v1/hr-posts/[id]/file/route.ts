import { NextRequest, NextResponse } from 'next/server'
import { authHeader, clientHeaders } from '../../../../_proxy'

// สตรีมไฟล์แนบจาก backend (proxy ปกติ json-parse ไม่ได้กับไฟล์ไบนารี) — ส่งชื่อไฟล์เดิมต่อด้วย
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/hr-posts/${id}/file`, {
    headers: { ...clientHeaders(req), ...authHeader(req) },
  })
  if (!res.ok) {
    return NextResponse.json({ success: false }, { status: res.status })
  }
  const headers: Record<string, string> = {
    'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
  }
  const disposition = res.headers.get('content-disposition')
  if (disposition) headers['Content-Disposition'] = disposition
  return new NextResponse(res.body, { status: res.status, headers })
}
