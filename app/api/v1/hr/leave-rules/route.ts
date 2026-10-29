import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ค่าตั้งของระบบลา เช่น ลาล่วงหน้าได้สูงสุดกี่วัน (env LEAVE_MAX_ADVANCE_DAYS ฝั่ง backend)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/leave-rules')
}
