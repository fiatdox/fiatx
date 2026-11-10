import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

// ข้อมูลใบส่งซ่อมสำหรับแก้ไข + ตัวเลือก + ประวัติการแก้ไข (เฉพาะงาน IT)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/it/repair-requests/${id}/edit`, 'GET')
}
