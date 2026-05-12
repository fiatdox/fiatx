import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ user_type_id: string }> }
) {
  const { user_type_id } = await params
  return proxy(req, `/api/v1/hr/leave-entitlements/${user_type_id}`)
}
