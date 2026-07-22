import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function POST(req: NextRequest) {
  return proxy(req, '/api/v1/it/roadmap/reset', 'POST', {})
}
