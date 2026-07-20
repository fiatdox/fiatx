import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

export async function GET(req: NextRequest, { params }: { params: Promise<{ mt: string }> }) {
  const { mt } = await params
  return proxy(req, `/api/v1/accounting/salary/slip/${mt}`)
}
