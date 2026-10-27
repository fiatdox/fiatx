'use client'
import { Checkbox, Form, Typography } from 'antd'
import { withBase } from '@/app/lib/basePath'

const { Text } = Typography

// ข้อตกลงการใช้งานระบบ — จาก GET /api/v1/it/user-requests/consent-terms/{current|id}
export interface ConsentTerm {
  id: number
  version: string
  title: string
  clauses: string[]
}

export async function fetchConsentTerm(id: number | 'current' = 'current'): Promise<ConsentTerm | null> {
  try {
    const res = await fetch(`/api/v1/it/user-requests/consent-terms/${id}`)
    const data = await res.json()
    return data?.success ? (data.data as ConsentTerm) : null
  } catch {
    return null
  }
}

/**
 * กล่องข้อตกลง + ช่องติ๊กยอมรับ (ฟอร์มต้องมี field consent_accepted)
 * self = ผู้ขอยอมรับเอง, staff = เจ้าหน้าที่บันทึกแทน แล้วพิมพ์ให้ผู้ขอลงนาม
 */
export function ConsentBox({ term, mode }: { term: ConsentTerm; mode: 'self' | 'staff' }) {
  return (
    <>
      <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-2" style={{ color: 'var(--app-text-3)' }}>
        ข้อตกลงและเงื่อนไขการใช้งาน (ฉบับ {term.version})
      </div>
      <div
        className="rounded-lg mb-3"
        style={{ maxHeight: 240, overflowY: 'auto', padding: '10px 14px', background: 'var(--app-surface)', border: '1px solid var(--app-border)', fontSize: 13, lineHeight: 1.7 }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{term.title}</div>
        <ol style={{ paddingLeft: 20, margin: 0, listStyle: 'decimal' }}>
          {term.clauses.map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}
        </ol>
      </div>
      <Form.Item
        name="consent_accepted"
        valuePropName="checked"
        rules={[{
          validator: (_, v) => v ? Promise.resolve() : Promise.reject(new Error('กรุณายอมรับข้อตกลงการใช้งานก่อนส่งคำขอ')),
        }]}
      >
        <Checkbox>
          {mode === 'self'
            ? <Text>ข้าพเจ้าได้อ่านและเข้าใจข้อตกลงข้างต้นทั้งหมด และยินยอมปฏิบัติตาม</Text>
            : <Text>ผู้ขอได้อ่านข้อตกลงข้างต้นและยินยอมปฏิบัติตาม (พิมพ์แบบยินยอมให้ผู้ขอลงนาม)</Text>}
        </Checkbox>
      </Form.Item>
    </>
  )
}

// ── พิมพ์แบบยินยอม ───────────────────────────────────────────────────────────

export interface ConsentPrintData {
  request_no: string
  request_date: string
  requester_name: string
  position_name?: string | null
  department?: string | null
  phone?: string | null
  system_name?: string | null
  purpose?: string | null
  license_type?: string | null
  license_no?: string | null
  consent_accepted_at?: string | null
  consent_method?: 'self' | 'staff' | null
  issued_by_name?: string | null
  issued_date?: string | null
}

// escape ค่าที่ผู้ใช้กรอก ก่อนแทรกลง HTML ของหน้าพิมพ์ (document.write ไม่ escape ให้)
const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const thDate = (s?: string | null) => {
  if (!s) return '-'
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s)
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}
const thDateTime = (s?: string | null) => {
  if (!s) return '-'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '-'
    : `${thDate(s)} เวลา ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
}

export function buildConsentHtml(r: ConsentPrintData, term: ConsentTerm): string {
  const font = (f: string) => `${window.location.origin}${withBase(`/fonts/Sarabun/${f}`)}`
  const row = (label: string, value: unknown) =>
    `<tr><th>${label}</th><td>${value == null || value === '' ? '-' : esc(value)}</td></tr>`
  const how = r.consent_method === 'staff'
    ? 'เจ้าหน้าที่งานเทคโนโลยีสารสนเทศบันทึกแทนผู้ขอ'
    : 'ผู้ขอยืนยันผ่านระบบด้วยบัญชีของตนเอง'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"/>
<title>แบบยินยอม ${esc(r.request_no)}</title>
<style>
@font-face{font-family:'Sarabun';src:url('${font('Sarabun-Regular.ttf')}');font-weight:400}
@font-face{font-family:'Sarabun';src:url('${font('Sarabun-Bold.ttf')}');font-weight:700}
@page{size:A4;margin:16mm 16mm 14mm}
*{font-family:'Sarabun',sans-serif;box-sizing:border-box;margin:0;padding:0}
body{color:#111;font-size:14px;line-height:1.55}
h1{font-size:18px;font-weight:700;text-align:center}
.sub{text-align:center;font-size:13px;color:#444;margin-top:2px}
.ref{display:flex;justify-content:space-between;font-size:12px;color:#444;margin:10px 0 8px;border-bottom:1px solid #999;padding-bottom:4px}
.st{font-weight:700;margin:10px 0 4px}
table.info{width:100%;border-collapse:collapse}
table.info th{width:30%;text-align:left;font-weight:400;color:#444;padding:2px 6px 2px 0;vertical-align:top}
table.info td{padding:2px 0;vertical-align:top}
ol{padding-left:22px}
ol li{margin-bottom:3px;text-align:justify}
.ack{margin-top:10px;padding:8px 10px;border:1px solid #999;border-radius:4px;font-size:13px}
.sigs{display:flex;justify-content:space-between;gap:16px;margin-top:28px;page-break-inside:avoid}
.sig{flex:1;text-align:center;font-size:13px}
.line{margin-top:34px}
.foot{margin-top:16px;font-size:11px;color:#666;text-align:right}
</style></head><body>
<h1>แบบยินยอมปฏิบัติตามข้อตกลงการใช้งานระบบสารสนเทศ</h1>
<div class="sub">${esc(term.title)}</div>
<div class="ref"><span>เลขที่คำร้อง ${esc(r.request_no)}</span><span>วันที่ยื่นคำร้อง ${thDate(r.request_date)}</span></div>

<div class="st">ส่วนที่ 1 ข้อมูลผู้ขอใช้งาน</div>
<table class="info">
${row('ชื่อ-สกุล', r.requester_name)}
${row('ตำแหน่ง', r.position_name)}
${row('หน่วยงาน', r.department)}
${row('เบอร์โทร', r.phone)}
${r.license_no ? row('เลขที่ใบอนุญาตประกอบวิชาชีพ', `${r.license_no}${r.license_type ? ` (${r.license_type})` : ''}`) : ''}
${row('ระบบที่ขอใช้งาน', r.system_name)}
${row('วัตถุประสงค์', r.purpose)}
</table>

<div class="st">ส่วนที่ 2 ข้อตกลงและเงื่อนไขการใช้งาน (ฉบับ ${esc(term.version)})</div>
<ol>${term.clauses.map(c => `<li>${esc(c)}</li>`).join('')}</ol>

<div class="ack">
ข้าพเจ้า <b>${esc(r.requester_name)}</b> ได้อ่านและเข้าใจข้อตกลงข้างต้นทั้งหมดแล้ว และยินยอมปฏิบัติตามทุกประการ<br/>
ยอมรับเมื่อ ${thDateTime(r.consent_accepted_at)} · ${how}
</div>

<div class="sigs">
  <div class="sig">ลงชื่อ ......................................................<br/>( ${esc(r.requester_name)} )<br/>ผู้ขอใช้งาน<div class="line">วันที่ ........../........../..........</div></div>
  <div class="sig">ลงชื่อ ......................................................<br/>( ...................................................... )<br/>หัวหน้างาน / ผู้บังคับบัญชา<div class="line">วันที่ ........../........../..........</div></div>
  <div class="sig">ลงชื่อ ......................................................<br/>( ${r.issued_by_name ? esc(r.issued_by_name) : '......................................................'} )<br/>เจ้าหน้าที่งานเทคโนโลยีสารสนเทศ<div class="line">วันที่ ${r.issued_date ? thDate(r.issued_date) : '........../........../..........'}</div></div>
</div>
<div class="foot">พิมพ์เมื่อ ${thDateTime(new Date().toISOString())}</div>
<script>(document.fonts ? document.fonts.ready : Promise.resolve()).then(function(){setTimeout(function(){window.print()},200)})</script>
</body></html>`
}

/** เปิดหน้าพิมพ์แบบยินยอม — คืน false ถ้า popup ถูกบล็อก */
export function printConsentForm(r: ConsentPrintData, term: ConsentTerm): boolean {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(buildConsentHtml(r, term))
  win.document.close()
  win.focus()
  return true
}
