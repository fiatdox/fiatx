import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qs = new URLSearchParams({ leave_type_id: sp.get('leave_type_id') ?? '' })
  const start = sp.get('start_date')
  if (start) qs.set('start_date', start)
  return proxy(req, `/api/v1/hr/leave-requests/quota?${qs.toString()}`)
}
