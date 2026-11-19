'use client'
// บันทึกข้อความ "รายงานผลการเดินทางไปราชการ" — เสนอหัวหน้าในสายและผู้อำนวยการทราบ (ลงนามรับทราบบนกระดาษ)
// เนื้อหาวาดจาก tiptap JSON โดยตรง (ไม่ผ่าน HTML) · หลายหน้าได้ตามความยาวรายงาน
// ตัดบรรทัดภาษาไทย: แทรก zero-width space ระหว่างคำ (Intl.Segmenter) ให้ react-pdf มีจุดตัดบรรทัด
import { Document, Font, Image, Page, PDFViewer, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import React, { useEffect, useState } from 'react'
import { App, Button, Spin } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import type { JSONContent } from '@tiptap/react'
import { withBase } from '@/app/lib/basePath'
import { canInlinePdf, saveBlob } from '@/app/lib/pdfSupport'
import { MEMO, isNoClaim, memoOrg, requestNo, thaiDate, thaiDateParts, thaiDigits, tripDatesText } from './travelCalc'
import { REPORT_BASE_PT, SARABUN_SCALE } from './reportShared'

Font.register({
  family: 'SarabunRpt',
  fonts: [
    { src: withBase('/fonts/Sarabun/Sarabun-Regular.ttf') },
    { src: withBase('/fonts/Sarabun/Sarabun-Bold.ttf'), fontWeight: 'bold' },
    { src: withBase('/fonts/Sarabun/Sarabun-Italic.ttf'), fontStyle: 'italic' },
    { src: withBase('/fonts/Sarabun/Sarabun-BoldItalic.ttf'), fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

export interface ReportRequestInfo {
  id: number; requester_name: string; requester_position: string | null; requester_unit: string | null
  purpose: string; subject: string; location: string; start_at: string; end_at: string; cost_mode?: string | null; trip_dates?: string[] | null
  travelers: { name: string; position: string | null; is_requester: boolean }[]
  chain: { step: number; level_name: string | null; approver_name: string | null; is_acting: boolean }[]
  director: { name: string; is_acting: boolean } | null
}
export interface ReportData { memo_no: string | null; content: JSONContent; submitted_at: string | null; status: 'draft' | 'submitted' }

const GARUDA = '/assets/docs/jpe4XHmGBReEanQzvr9sZjii.png'
const INK = '#000'
const FS = REPORT_BASE_PT * SARABUN_SCALE
const th = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '' : thaiDigits(String(v)))
const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null
// react-pdf ตัดสระ/วรรณยุกต์ตัวท้ายของข้อความไทย — เติมช่องว่างไม่ตัดคำต่อท้ายทุกบรรทัด (เหมือนบันทึกข้อความขอไปราชการ)
const NB = '\u00A0'
const pad = (t: string) => (t ? t + NB + NB : t)
/** ความกว้างโดยประมาณ (pt) ต่อตัวอักษรที่กินที่ ต่อขนาดตัวอักษร 1 pt — เทียบจากบันทึกข้อความขอไปราชการ (74 ตัว/บรรทัด ที่ 11.5 pt) */
const CHAR_W = 453 / 74 / 11.5
const CONTENT_W = 453 * 0.94   // A4 − ขอบซ้าย 3 ซม. − ขอบขวา 2 ซม. (เผื่อคลาดเคลื่อน)
const visibleLen = (t: string) => t.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, '').length
const INDENT = 2.5 * 28.35

/** ข้อความหนึ่งช่วงที่รูปแบบเดียวกัน */
type Run = { text: string; size: number; bold?: boolean; italic?: boolean; underline?: boolean }
const sameStyle = (a: Run, b: Run) => a.size === b.size && !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.underline === !!b.underline
const widthOf = (t: string, r: Run) => visibleLen(t) * r.size * CHAR_W * (r.bold ? 1.06 : 1) * (r.italic ? 1.03 : 1)
/** ตัดเป็นบรรทัดเองตามคำ (react-pdf หาจุดตัดคำไทยไม่ได้) — first = เยื้องบรรทัดแรก */
const layout = (runs: Run[], avail: number, first = 0): Run[][] => {
  const lines: Run[][] = []
  let cur: Run[] = [], w = first
  const push = () => { lines.push(cur); cur = []; w = 0 }
  const add = (text: string, r: Run) => {
    const last = cur[cur.length - 1]
    if (last && sameStyle(last, r)) last.text += text
    else cur.push({ ...r, text })
  }
  for (const r of runs) {
    for (const piece of r.text.split('\n').flatMap((x, i) => (i ? ['\n', x] : [x]))) {
      if (piece === '\n') { push(); continue }
      const parts = seg ? [...seg.segment(piece)].map(x => x.segment) : piece.split(/(\s+)/)
      for (const part of parts) {
        if (!part) continue
        const pw = widthOf(part, r)
        if (cur.length && w + pw > avail && part.trim()) {
          push()
        }
        if (!cur.length && !part.trim()) continue   // ไม่ขึ้นบรรทัดด้วยช่องว่าง
        add(part, r)
        w += pw
      }
    }
  }
  if (cur.length || !lines.length) lines.push(cur)
  return lines
}
const runStyle = (r: Run) => ({ fontSize: r.size, fontWeight: r.bold ? 'bold' as const : 'normal' as const, fontStyle: r.italic ? 'italic' as const : 'normal' as const, textDecoration: r.underline ? 'underline' as const : 'none' as const })
/** ย่อหน้าที่ตัดบรรทัดเองแล้ว — แต่ละบรรทัดเป็น Text ของตัวเอง */
const Lines = ({ runs, avail = CONTENT_W, indent = 0, align = 'left', mb = 2 }: { runs: Run[]; avail?: number; indent?: number; align?: 'left' | 'center' | 'right'; mb?: number }) => {
  const lines = layout(runs.map(r => ({ ...r, text: thaiDigits(r.text) })), avail, indent)
  return (
    <View style={{ marginBottom: mb }}>
      {lines.map((ln, i) => (
        <Text key={i} style={{ textAlign: align, paddingLeft: i === 0 ? indent : 0, fontSize: Math.max(FS, ...ln.map(r => r.size)) }}>
          {ln.length ? ln.map((r, k) => <Text key={k} style={runStyle(r)}>{k === ln.length - 1 ? pad(r.text) : r.text}</Text>) : ' '}
        </Text>
      ))}
    </View>
  )
}
const plain = (text: string, extra: Partial<Run> = {}): Run[] => [{ text, size: FS, ...extra }]

const s = StyleSheet.create({
  page: { fontFamily: 'SarabunRpt', fontSize: FS, paddingTop: '2.5cm', paddingBottom: '2cm', paddingLeft: '3cm', paddingRight: '2cm', lineHeight: 1.4, color: INK },
  garuda: { position: 'absolute', top: '1.1cm', left: '3cm', width: 42, height: 42 },
  title: { fontSize: 19, fontWeight: 'bold', textAlign: 'center', marginTop: -24, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  head: { fontWeight: 'bold', fontSize: 13.5, marginRight: 6 },
  fill: { flex: 1, borderBottomWidth: 0.6, borderBottomColor: '#6b7280', borderBottomStyle: 'dotted', paddingLeft: 3 },
  box: { borderWidth: 0.8, borderColor: INK, padding: 6, marginTop: 6 },
  footer: { position: 'absolute', bottom: '0.8cm', left: '3cm', right: '2cm', flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#374151' },
  draft: { position: 'absolute', top: '1.3cm', right: '2cm', fontSize: 12, fontWeight: 'bold', color: '#b91c1c', borderWidth: 1, borderColor: '#b91c1c', paddingHorizontal: 6 },
})

// ── วาดเนื้อหา tiptap JSON ──
const ptOf = (v: unknown) => { const n = Number(String(v ?? '').replace('pt', '')); return Number.isFinite(n) && n > 0 ? n * SARABUN_SCALE : undefined }
const runsOf = (nodes: JSONContent[] = []): Run[] => nodes.map(n => {
  if (n.type === 'hardBreak') return { text: '\n', size: FS }
  const marks = n.marks ?? []
  const has = (t: string) => marks.some(m => m.type === t)
  return { text: n.text ?? '', size: ptOf(marks.find(m => m.type === 'textStyle')?.attrs?.fontSize) ?? FS, bold: has('bold'), italic: has('italic'), underline: has('underline') }
})
const Blocks = ({ nodes = [], avail = CONTENT_W }: { nodes?: JSONContent[]; avail?: number }) => <>{nodes.map((n, i) => {
  if (n.type === 'paragraph') {
    const a = n.attrs?.textAlign as string | undefined
    // จัดเต็มบรรทัดไม่ได้เมื่อตัดบรรทัดเอง — ใช้ชิดซ้าย
    const align = a === 'center' || a === 'right' ? a : 'left'
    if (!n.content?.length) return <Text key={i}>{' '}</Text>
    return <Lines key={i} runs={runsOf(n.content)} avail={avail} align={align} />
  }
  if (n.type === 'bulletList' || n.type === 'orderedList') {
    const start = Number(n.attrs?.start) || 1
    const INDENT_LI = 38
    return (
      <View key={i} style={{ marginBottom: 2 }}>
        {(n.content ?? []).map((li, k) => (
          <View key={k} style={{ flexDirection: 'row', paddingLeft: 18 }}>
            <Text style={{ width: 20 }}>{n.type === 'orderedList' ? `${th(start + k)}.` : '•'}</Text>
            <View style={{ flex: 1 }}><Blocks nodes={li.content} avail={avail - INDENT_LI} /></View>
          </View>
        ))}
      </View>
    )
  }
  return null
})}</>

const Box = () => <View style={{ width: 9, height: 9, borderWidth: 0.8, borderColor: INK, marginRight: 4 }} />
const Row = ({ label, value, head = true }: { label: string; value: string; head?: boolean }) => (
  <View style={s.row}><Text style={head ? s.head : { marginRight: 6 }}>{pad(label)}</Text><Text style={s.fill}>{pad(thaiDigits(value))}</Text></View>
)
const Sign = ({ name, role, width = '55%' }: { name?: string | null; role?: string | null; width?: string }) => (
  <View style={{ width, alignSelf: 'flex-end', marginTop: 10 }} wrap={false}>
    <View style={s.row}><Text style={{ marginRight: 4 }}>{pad('(ลงชื่อ)')}</Text><Text style={s.fill}>{' '}</Text></View>
    <View style={s.row}><Text>(</Text><Text style={[s.fill, { textAlign: 'center' }]}>{pad(name ?? ' ')}</Text><Text>)</Text></View>
    {role ? <Text style={{ textAlign: 'center' }}>{pad(thaiDigits(role))}</Text> : null}
  </View>
)

const tripText = (r: ReportRequestInfo) => {
  if (isNoClaim(r) && r.trip_dates?.length) return `ในวันที่ ${tripDatesText(r.trip_dates, true)}`
  const a = thaiDateParts(r.start_at), b = thaiDateParts(r.end_at)
  return a.year === b.year && a.month === b.month && a.day === b.day ? `ในวันที่ ${a.day} ${a.month} พ.ศ. ${a.year}`
    : `ระหว่างวันที่ ${a.day} ${a.month === b.month && a.year === b.year ? '' : `${a.month} พ.ศ. ${a.year} `}ถึงวันที่ ${b.day} ${b.month} พ.ศ. ${b.year}`
}

export const TravelReportDocument = ({ r, report, garudaSrc, printedAt, today }: { r: ReportRequestInfo; report: ReportData; garudaSrc?: string; printedAt: string; today: string }) => {
  const companions = r.travelers.filter(t => !t.is_requester)
  const intro = `ตามที่ข้าพเจ้า ${r.requester_name} ตำแหน่ง ${r.requester_position ?? '-'}${companions.length ? ` พร้อมด้วย ${companions.length <= 3 ? companions.map(c => c.name).join(', ') : `${companions.slice(0, 2).map(c => c.name).join(', ')} และคณะ รวม ${r.travelers.length} คน`}` : ''} ได้รับอนุมัติให้เดินทางไปราชการ เพื่อ${r.purpose} เรื่อง ${r.subject} ณ ${r.location} ${tripText(r)}${isNoClaim(r) ? ' โดยไม่เบิกค่าใช้จ่าย' : ''} นั้น`
  const outro = 'บัดนี้ การเดินทางไปราชการดังกล่าวได้เสร็จสิ้นแล้ว จึงขอรายงานผลการเดินทางไปราชการ ดังนี้'
  return (
    <Document title={`รายงานผลการเดินทางไปราชการ ${requestNo(r.id)}`} author={r.requester_name}>
      <Page size="A4" style={s.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image ของ react-pdf ไม่มี alt */}
        {garudaSrc ? <Image src={garudaSrc} style={s.garuda} /> : null}
        {report.status === 'draft' && <Text style={s.draft}>{pad('ร่าง')}</Text>}
        <Text style={s.title}>{pad('บันทึกข้อความ')}</Text>
        <Row label="ส่วนราชการ" value={memoOrg(r.requester_unit)} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Row label="ที่" value={`${MEMO.docPrefix}${report.memo_no ?? ''}`} /></View>
          <View style={{ flex: 1 }}><Row label="วันที่" value={thaiDate(report.submitted_at ?? today)} /></View>
        </View>
        <Row label="เรื่อง" value="รายงานผลการเดินทางไปราชการ" />
        <View style={[s.row, { marginTop: 4, marginBottom: 6 }]}><Text style={s.head}>{pad('เรียน')}</Text><Text>{pad(MEMO.to)}</Text></View>

        <Lines runs={plain(intro)} indent={INDENT} mb={3} />
        <Lines runs={plain(outro)} indent={INDENT} mb={3} />
        <View style={{ marginTop: 2, marginBottom: 4 }}><Blocks nodes={report.content.content} /></View>
        <Lines runs={plain('จึงเรียนมาเพื่อโปรดทราบ')} indent={INDENT} />
        <Sign name={r.requester_name} role={r.requester_position} />

        {/* ความเห็นหัวหน้าในสาย (ตามผังของคำขอ) และผู้อำนวยการ — ลงนามบนกระดาษ */}
        <View wrap={false} style={{ marginTop: 6 }}>
          {r.chain.map(c => (
            <View key={c.step} style={s.box}>
              <Text style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{pad(`ความเห็น${c.level_name ?? 'หัวหน้า'}`)}</Text>
              <View style={s.row}><Text style={s.fill}>{' '}</Text></View>
              <Sign name={c.approver_name} role={c.is_acting ? `รักษาการ${c.level_name ?? ''}` : c.level_name} width="60%" />
            </View>
          ))}
          <View style={s.box}>
            <Text style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{pad(`ความเห็น${MEMO.to}`)}</Text>
            <View style={[s.row, { alignItems: 'center' }]}><Box /><Text style={{ marginRight: 12 }}>{pad('ทราบ')}</Text><Box /><Text style={{ marginRight: 4 }}>{pad('อื่น ๆ')}</Text><Text style={s.fill}>{' '}</Text></View>
            <Sign name={r.director?.name} role={r.director?.is_acting ? `รักษาการในตำแหน่ง${MEMO.to}` : MEMO.to} width="60%" />
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{pad(`รายงานผลการเดินทาง ${requestNo(r.id)}`)}</Text>
          <Text render={({ pageNumber, totalPages }) => pad(`หน้า ${th(pageNumber)}/${th(totalPages)} · พิมพ์เมื่อ ${printedAt}`)} />
        </View>
      </Page>
    </Document>
  )
}

/** ดู/บันทึก PDF รายงาน (ใช้ในหน้าต่าง) */
export const TravelReportPdfView = ({ r, report }: { r: ReportRequestInfo; report: ReportData }) => {
  const { message } = App.useApp()
  const [garuda, setGaruda] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  // วันที่ของบันทึกข้อความ (ยังไม่ส่ง = วันนี้) และเวลาพิมพ์ — คงที่ตั้งแต่เปิดหน้าต่าง
  const [today] = useState(() => new Date().toISOString())
  const printedAt = thaiDigits(new Date(today).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }))
  useEffect(() => {
    let alive = true
    fetch(withBase(GARUDA), { method: 'HEAD' })
      .then(x => { if (alive) setGaruda(x.ok && (x.headers.get('content-type') ?? '').startsWith('image/') ? withBase(GARUDA) : null) })
      .catch(() => { if (alive) setGaruda(null) })
    return () => { alive = false }
  }, [])
  if (garuda === undefined) return <div style={{ padding: 24 }}><Spin /> กำลังเตรียมเอกสาร...</div>
  const doc = <TravelReportDocument r={r} report={report} garudaSrc={garuda ?? undefined} printedAt={printedAt} today={today} />
  if (canInlinePdf()) return <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar>{doc}</PDFViewer>
  const save = async () => {
    setBusy(true)
    try { saveBlob(new File([await pdf(doc).toBlob()], `รายงานผลการเดินทาง-${requestNo(r.id)}.pdf`, { type: 'application/pdf' }), `รายงานผลการเดินทาง-${requestNo(r.id)}.pdf`) }
    catch { message.error('สร้างไฟล์ PDF ไม่สำเร็จ') } finally { setBusy(false) }
  }
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, color: 'var(--app-text-3)', marginBottom: 12 }}>เครื่องนี้แสดงเอกสารในหน้าเว็บไม่ได้ — บันทึกเป็นไฟล์ PDF แล้วเปิดด้วยแอปในเครื่อง</div>
      <Button type="primary" block size="large" icon={<DownloadOutlined />} loading={busy} onClick={save}>บันทึกเป็น PDF</Button>
    </div>
  )
}
export default TravelReportPdfView
