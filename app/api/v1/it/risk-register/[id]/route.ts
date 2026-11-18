import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

type Ctx = { params: Promise<{ id: string }> }
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return proxy(req, `/api/v1/it/risk-register/${encodeURIComponent(id)}`)
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/it/risk-register/${encodeURIComponent(id)}`, 'PUT', body)
}
