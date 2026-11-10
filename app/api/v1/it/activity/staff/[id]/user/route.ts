import { NextRequest } from 'next/server'
import { proxy } from '../../../../../../_proxy'

// ADMIN: ผูก/ยกเลิกผูกบัญชีผู้ใช้กับเจ้าหน้าที่ ({ user_id: number | null }) — backend ตรวจสิทธิ์
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return proxy(req, `/api/v1/it/activity/staff/${encodeURIComponent(id)}/user`, 'PUT', body)
}
