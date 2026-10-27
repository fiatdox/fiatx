import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const year = req.nextUrl.searchParams.get('year')
  return proxy(req, `/api/v1/accounting/salary-register/${encodeURIComponent(id)}${year ? `?year=${encodeURIComponent(year)}` : ''}`)
}
