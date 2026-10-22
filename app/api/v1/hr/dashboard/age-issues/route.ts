import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// รายชื่อบุคลากรที่เลยปีงบเกษียณ / วันเกิดผิดปกติ สำหรับแก้ข้อมูล (backend จำกัด ADMIN/HR)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/dashboard/age-issues')
}
