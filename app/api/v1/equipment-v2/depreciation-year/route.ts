import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  const fy = req.nextUrl.searchParams.get('fy') ?? ''
  return proxy(req, `/api/v1/equipment-v2/depreciation-year?fy=${encodeURIComponent(fy)}`)
}
