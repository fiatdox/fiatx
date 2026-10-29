import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('user_id')
  const qs = uid ? `?user_id=${encodeURIComponent(uid)}` : ''
  return proxy(req, `/api/v1/users/me/colleagues${qs}`)
}
