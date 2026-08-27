import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/users/me/username', 'PATCH', body)
}
