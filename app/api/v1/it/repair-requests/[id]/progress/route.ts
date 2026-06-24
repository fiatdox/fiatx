import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/it/repair-requests/${id}/progress`)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/it/repair-requests/${id}/progress`, 'POST', body)
}
