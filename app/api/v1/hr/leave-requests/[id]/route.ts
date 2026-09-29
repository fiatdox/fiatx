import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return proxy(req, `/api/v1/hr/leave-requests/${encodeURIComponent(id)}`)
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return proxy(req, `/api/v1/hr/leave-requests/${encodeURIComponent(id)}`, 'DELETE')
}
