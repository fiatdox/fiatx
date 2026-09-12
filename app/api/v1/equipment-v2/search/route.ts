import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  const k = req.nextUrl.searchParams.get('keyword') ?? ''
  return proxy(req, `/api/v1/equipment-v2/search?keyword=${encodeURIComponent(k)}`)
}
