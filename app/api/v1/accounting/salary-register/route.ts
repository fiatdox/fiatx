import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const k of ['mt', 'search', 'ptype', 'seccode', 'link', 'scope', 'limit', 'offset']) {
    const v = sp.get(k)
    if (v) qs.set(k, v)
  }
  return proxy(req, `/api/v1/accounting/salary-register?${qs.toString()}`)
}
