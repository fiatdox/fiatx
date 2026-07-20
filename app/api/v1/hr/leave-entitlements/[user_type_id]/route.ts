import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// หมายเหตุ: โฟลเดอร์นี้ใช้ชื่อ segment "user_type_id" — GET ดึงสิทธิ์ตามประเภทเจ้าหน้าที่ (หน้า /hr/leave)
// ส่วน PATCH/DELETE ด้านล่างรับ "id" ของแถว hr_leave_entitlements (หน้า /hr/leave/policy)
// Next.js ไม่ยอมให้ dynamic segment ชื่อต่างกันในระดับ path เดียวกัน จึงต้องรวมไว้ไฟล์เดียว

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ user_type_id: string }> }
) {
  const { user_type_id } = await params
  return proxy(req, `/api/v1/hr/leave-entitlements/${user_type_id}`)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ user_type_id: string }> }
) {
  const id = (await params).user_type_id
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/hr/leave-entitlements/${id}`, 'PATCH', body)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ user_type_id: string }> }
) {
  const id = (await params).user_type_id
  return proxy(req, `/api/v1/hr/leave-entitlements/${id}`, 'DELETE')
}
