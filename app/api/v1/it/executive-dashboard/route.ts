import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// Dashboard ผู้บริหาร (ความเสี่ยง + ทรัพย์สิน IT) — backend ตรวจสิทธิ์ (ADMIN · CHIEF_MISSION_IT · CHIEF_GROUP_IT · IT_STAFF · ผอ./รักษาการ ผอ.)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/it/executive-dashboard')
}
