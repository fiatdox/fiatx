import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/asset-donation/committee-members/${id}`, 'PUT', body)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/asset-donation/committee-members/${id}`, 'DELETE')
}
