import { NextRequest } from 'next/server'
import { proxy } from '../../../../../../../../_proxy'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string; imageId: string }> }) {
  const { id, itemId, imageId } = await params
  return proxy(req, `/api/v1/asset-donation/forms/${id}/items/${itemId}/images/${imageId}`, 'DELETE')
}
