import { NextRequest } from 'next/server'
import { proxy, proxyForm } from '../../../_proxy'

// แก้ไข (multipart) — backend รับเป็น POST เพราะ proxyForm ส่งได้แค่ POST
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyForm(req, `/api/v1/hr-posts/${id}`)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, `/api/v1/hr-posts/${id}`, 'DELETE')
}
