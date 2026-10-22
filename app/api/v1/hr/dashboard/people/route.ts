import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ข้อมูลรายบุคคลแบบไม่ระบุตัวตนสำหรับ HR Dashboard เชิงลึก (backend จำกัด ADMIN/HR)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/dashboard/people')
}
