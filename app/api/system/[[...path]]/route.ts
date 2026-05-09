import { NextRequest } from 'next/server'
import { proxy } from '../../_proxy'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params
  const apiPath = `/api/v1/system/${(path ?? []).join('/')}`
  return proxy(req, apiPath)
}
