import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/mfa/config')
}

export async function PUT(req: NextRequest) {
  return proxy(req, '/api/v1/mfa/config', 'PUT', await req.json())
}
