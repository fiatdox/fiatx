import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// นับจำนวนวันลา (ไม่นับเสาร์-อาทิตย์ / วันหยุดราชการ ตามประเภทการลา)
export async function GET(req: NextRequest) {
  return proxy(req, `/api/v1/hr/leave-days/count?${req.nextUrl.searchParams.toString()}`)
}
