import { NextRequest, NextResponse } from 'next/server'
import { authHeader, clientHeaders } from '../../../../../_proxy'

type Ctx = { params: Promise<{ id: string }> }

// สตรีมไฟล์แนบของใบลา (ใบรับรองแพทย์ ฯลฯ) — สิทธิ์เดียวกับการพิมพ์ใบลา (backend ตรวจ)
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/hr/leave-requests/${encodeURIComponent(id)}/document`, {
    headers: { ...clientHeaders(req), ...authHeader(req) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ success: false }))
    return NextResponse.json(body, { status: res.status })
  }
  const headers: Record<string, string> = {
    'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
  }
  const disposition = res.headers.get('content-disposition')
  if (disposition) headers['Content-Disposition'] = disposition
  return new NextResponse(res.body, { status: res.status, headers })
}
