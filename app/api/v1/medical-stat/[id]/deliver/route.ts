import { NextRequest } from 'next/server'
import { proxyForm } from '../../../../_proxy'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyForm(req, `/api/v1/medical-stat/${id}/deliver`)   // multipart (optional result files)
}
