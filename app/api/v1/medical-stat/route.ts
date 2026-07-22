import { NextRequest } from 'next/server'
import { proxy, proxyForm } from '../../_proxy'

export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/medical-stat' + req.nextUrl.search)
}

export async function POST(req: NextRequest) {
  return proxyForm(req, '/api/v1/medical-stat')   // multipart (sample files)
}
