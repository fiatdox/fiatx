import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  return proxy(req, `/api/v1/hr/leave-requests/mine${status ? `?status=${encodeURIComponent(status)}` : ''}`)
}
