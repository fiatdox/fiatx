import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

type Ctx = { params: Promise<{ itemId: string }> }
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { itemId } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/it/third-party/items/${encodeURIComponent(itemId)}`, 'PUT', body)
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { itemId } = await params
  return proxy(req, `/api/v1/it/third-party/items/${encodeURIComponent(itemId)}`, 'DELETE')
}
