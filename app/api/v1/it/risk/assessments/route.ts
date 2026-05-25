import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString()
  return proxy(req, `/api/v1/it/risk/assessments${qs ? `?${qs}` : ''}`)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/it/risk/assessments', 'POST', body)
}
