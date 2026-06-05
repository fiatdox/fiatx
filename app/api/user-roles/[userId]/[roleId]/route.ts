import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ลบสิทธิ์ของผู้ใช้รายคน (คู่ user_id + role_id)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; roleId: string }> },
) {
  const { userId, roleId } = await params
  return proxy(req, `/api/v1/user-roles/${userId}/${roleId}`, 'DELETE')
}
