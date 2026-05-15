import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  return proxy(req, `/api/v1/users/${id}/change-password`, 'PATCH', body)
}
