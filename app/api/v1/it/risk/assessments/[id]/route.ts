import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/it/risk/assessments/${id}`)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/it/risk/assessments/${id}`, 'PATCH', body)
}
