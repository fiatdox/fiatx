import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/hr/leave-balances/rollover', 'POST', body)
}
