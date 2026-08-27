import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/accounting/salary-ids/meta')
}
