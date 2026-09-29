import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope') ?? 'pending'
  return proxy(req, `/api/v1/hr/leave-requests/pending-approval?scope=${encodeURIComponent(scope)}`)
}
