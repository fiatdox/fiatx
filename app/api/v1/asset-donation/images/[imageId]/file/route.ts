import { NextRequest, NextResponse } from 'next/server'

// สตรีมไฟล์รูปครุภัณฑ์จาก backend (proxy ปกติ json-parse ไม่ได้กับไฟล์ไบนารี)
export async function GET(req: NextRequest, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params
  const token = req.cookies.get('auth_token')?.value
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/asset-donation/images/${imageId}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    return NextResponse.json({ success: false }, { status: res.status })
  }
  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
    },
  })
}
