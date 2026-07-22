import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/it/roadmap/kpi/${encodeURIComponent(code)}`, 'PUT', body)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return proxy(req, `/api/v1/it/roadmap/kpi/${encodeURIComponent(code)}`, 'DELETE')
}
