import { NextRequest } from 'next/server'
import { proxyForm } from '../../../../../../../_proxy'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params
  return proxyForm(req, `/api/v1/asset-donation/forms/${id}/items/${itemId}/images`)
}
