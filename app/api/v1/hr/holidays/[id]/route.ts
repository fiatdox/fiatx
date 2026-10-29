import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/hr/holidays/${encodeURIComponent(id)}`, 'PATCH', body)
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return proxy(req, `/api/v1/hr/holidays/${encodeURIComponent(id)}`, 'DELETE')
}
