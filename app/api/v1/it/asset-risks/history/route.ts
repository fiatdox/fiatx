import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ประวัติการประเมินความเสี่ยงของครุภัณฑ์หนึ่งรายการ (?asset_key=)
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('asset_key') ?? ''
  return proxy(req, `/api/v1/it/asset-risks/history?asset_key=${encodeURIComponent(key)}`)
}
