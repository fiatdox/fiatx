import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { existsSync } from 'fs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('images') as File[]

    if (!files.length) {
      return NextResponse.json({ success: true, files: [] })
    }

    const uploadDir = join(process.cwd(), 'public', 'it', 'maintenance')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const savedFiles: string[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const filename = `${randomUUID()}.${ext}`
      const bytes = await file.arrayBuffer()
      await writeFile(join(uploadDir, filename), Buffer.from(bytes))
      savedFiles.push(filename)
    }

    return NextResponse.json({ success: true, files: savedFiles })
  } catch (err) {
    console.error('[upload] error:', err)
    return NextResponse.json({ success: false, message: 'อัปโหลดไฟล์ล้มเหลว' }, { status: 500 })
  }
}
