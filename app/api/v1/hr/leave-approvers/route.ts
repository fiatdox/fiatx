import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// รายชื่อหัวหน้า/รักษาการทุกระดับ และ ผอ. (ADMIN/HR — backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/leave-approvers')
}
