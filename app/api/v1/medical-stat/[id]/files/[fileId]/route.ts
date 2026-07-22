import { NextRequest, NextResponse } from 'next/server'

// สตรีมไฟล์แนบจาก backend (proxy ปกติ json-parse ไม่ได้กับไฟล์ไบนารี)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params
  const token = req.cookies.get('auth_token')?.value
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/medical-stat/${id}/files/${fileId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    return NextResponse.json({ success: false }, { status: res.status })
  }
  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      'Content-Disposition': res.headers.get('content-disposition') ?? 'attachment',
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
    },
  })
}
