import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/asset-donation/forms' + req.nextUrl.search, 'GET')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/asset-donation/forms', 'POST', body)
}
