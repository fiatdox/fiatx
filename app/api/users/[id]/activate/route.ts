import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/users/${id}/activate`, 'PATCH')
}
