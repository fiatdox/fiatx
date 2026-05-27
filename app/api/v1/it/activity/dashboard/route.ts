import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString()
  return proxy(req, `/api/v1/it/activity/dashboard${qs ? `?${qs}` : ''}`)
}
