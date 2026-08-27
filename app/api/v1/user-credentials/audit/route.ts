import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qs = new URLSearchParams({ limit: sp.get('limit') ?? '100' })
  const t = sp.get('target_user_id')
  if (t) qs.set('target_user_id', t)
  return proxy(req, `/api/v1/user-credentials/audit?${qs.toString()}`)
}
