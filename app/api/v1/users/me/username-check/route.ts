import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('username') ?? ''
  return proxy(req, `/api/v1/users/me/username-check?username=${encodeURIComponent(u)}`)
}
