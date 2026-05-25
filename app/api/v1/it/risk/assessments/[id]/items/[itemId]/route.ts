import { NextRequest } from 'next/server'
import { proxy } from '../../../../../../../_proxy'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/it/risk/assessments/${id}/items/${itemId}`, 'PUT', body)
}
