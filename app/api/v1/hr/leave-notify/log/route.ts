import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get('limit')
  return proxy(req, `/api/v1/hr/leave-notify/log${limit ? `?limit=${encodeURIComponent(limit.slice(0, 4))}` : ''}`)
}
