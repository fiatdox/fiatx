import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// วิเคราะห์การลาเชิงลึกรายปีงบ (ADMIN / HR — backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  const fy = req.nextUrl.searchParams.get('fiscal_year')
  const qs = fy && /^\d{4}$/.test(fy) ? `?fiscal_year=${fy}` : ''
  return proxy(req, `/api/v1/hr/leave-analytics${qs}`)
}
