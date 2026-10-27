import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

export async function GET(req: NextRequest, { params }: { params: Promise<{ salaryId: string }> }) {
  const { salaryId } = await params
  const uid = req.nextUrl.searchParams.get('user_id')
  return proxy(req, `/api/v1/accounting/salary-ids/lookup/${encodeURIComponent(salaryId)}${uid ? `?user_id=${encodeURIComponent(uid)}` : ''}`)
}
