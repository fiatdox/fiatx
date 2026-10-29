import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/hr/leave-day-check/${encodeURIComponent(id)}/adjust`, 'POST', body)
}
