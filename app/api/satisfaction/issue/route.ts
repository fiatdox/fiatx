import { NextRequest, NextResponse } from 'next/server'
import { encodeSurveyToken } from '@/app/lib/surveyToken'

// GET /api/satisfaction/issue?id=123 → สร้างลิงก์แบบประเมินเข้ารหัสสำหรับคำร้อง
// จำกัดเฉพาะเจ้าหน้าที่ที่ล็อกอินแล้ว (ต้องมี auth_token) เพื่อไม่ให้ใครก็มินต์ลิงก์ได้
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 })
  }
  const idParam = req.nextUrl.searchParams.get('id')
  const id = Number(idParam)
  if (!idParam || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, message: 'id ไม่ถูกต้อง' }, { status: 400 })
  }
  const surveyToken = encodeSurveyToken(id)
  const origin = req.nextUrl.origin
  return NextResponse.json({
    ok: true,
    token: surveyToken,
    path: `/satisfaction/${surveyToken}`,
    url: `${origin}/satisfaction/${surveyToken}`,
  })
}
