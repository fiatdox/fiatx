import { NextRequest, NextResponse } from 'next/server'
import { authHeader } from '../../../../../_proxy'

const BASE = process.env.NEXT_PUBLIC_API_URL

export async function GET(req: NextRequest, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params
  const res = await fetch(`${BASE}/api/v1/it/repair-request-images/${imageId}/file`, {
    headers: { ...authHeader(req) },
  })
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    status: res.status,
    headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=3600' },
  })
}
