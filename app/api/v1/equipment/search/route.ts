import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('keyword') ?? ''
  return proxy(req, `/api/v1/equipment/search?keyword=${encodeURIComponent(keyword)}`)
}
