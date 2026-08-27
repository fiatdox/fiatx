import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/asset-donation/user-options' + req.nextUrl.search, 'GET')
}
