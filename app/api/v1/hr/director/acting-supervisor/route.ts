import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/hr/director/acting-supervisor', 'PATCH', body)
}
