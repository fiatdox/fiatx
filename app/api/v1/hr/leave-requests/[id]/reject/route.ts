import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/hr/leave-requests/${encodeURIComponent(id)}/reject`, 'POST', await req.json().catch(() => ({})))
}
