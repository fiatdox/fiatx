import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params
  return proxy(req, `/api/v1/accounting/salary-ids/links/${linkId}`, 'PATCH', await req.json())
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params
  return proxy(req, `/api/v1/accounting/salary-ids/links/${linkId}`, 'DELETE')
}
