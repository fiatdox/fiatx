import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/it/roadmap/links/${id}`, 'DELETE')
}
