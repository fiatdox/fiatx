// ค่าที่ใช้ร่วมระหว่างตัวแก้ไขรายงาน (ReportEditor) กับ PDF (TravelReportPDF) — แยกไฟล์ไม่ให้ PDF ดึง tiptap มาด้วย
import type { JSONContent } from '@tiptap/react'

/** ขนาดตัวอักษร (pt แบบ TH SarabunPSK ที่คุ้นกับหนังสือราชการ: ปกติ 16) — ตรงกับ backend REPORT_FONT_SIZES · ค่าว่าง = ขนาดปกติ */
export const REPORT_FONT_SIZES = ['12pt', '14pt', '16pt', '18pt', '20pt', '24pt']
export const REPORT_BASE_PT = 16
/** Sarabun กว้างกว่า TH SarabunPSK — ย่อทุกขนาดด้วยอัตราเดียวกัน (16 → 11.5 pt เท่าเนื้อความบันทึกข้อความขอไปราชการ) */
export const SARABUN_SCALE = 11.5 / 16
export const emptyDoc = (): JSONContent => ({ type: 'doc', content: [{ type: 'paragraph' }] })
/** แม่แบบหัวข้อรายงานผลการเดินทาง */
export const reportTemplate = (): JSONContent => {
  const h = (t: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text: t, marks: [{ type: 'bold' }] }] })
  const p = (t = ''): JSONContent => (t ? { type: 'paragraph', content: [{ type: 'text', text: t }] } : { type: 'paragraph' })
  return {
    type: 'doc', content: [
      h('๑. สรุปสาระสำคัญ / ผลการปฏิบัติงาน'), p(),
      h('๒. ประโยชน์ที่ได้รับ (ต่อตนเอง หน่วยงาน และองค์กร)'), p(),
      h('๓. ปัญหา อุปสรรค และข้อเสนอแนะ'), p(),
      h('๔. การนำความรู้มาเผยแพร่ / ขยายผล'), p(),
    ],
  }
}
/** มีข้อความจริงหรือไม่ (ไม่นับหัวข้อแม่แบบที่เป็นตัวหนาล้วน) */
export const docText = (d?: JSONContent | null): string => {
  if (!d) return ''
  if (d.type === 'text') return d.text ?? ''
  return (d.content ?? []).map(docText).join(d.type === 'doc' || d.type?.endsWith('List') ? '\n' : '')
}
