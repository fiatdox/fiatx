import { NextRequest } from 'next/server'
import { proxy, proxyForm } from '../../_proxy'

export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr-posts', 'GET')
}

// multipart — มีไฟล์แนบได้
export async function POST(req: NextRequest) {
  return proxyForm(req, '/api/v1/hr-posts')
}
