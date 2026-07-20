import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/users/me/salary-id')
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/users/me/salary-id', 'PATCH', body)
}
