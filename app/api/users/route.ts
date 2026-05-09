import { NextRequest } from 'next/server'
import { proxy } from '../_proxy'

export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/users/')
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  return proxy(req, '/api/v1/users/', 'POST', body)
}
