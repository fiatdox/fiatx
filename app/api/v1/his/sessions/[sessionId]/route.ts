import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return proxy(req, `/api/v1/his/sessions/${sessionId}`, 'DELETE')
}
