'use client'
// เขียน/ดูรายงานผลการเดินทางไปราชการ (?id=<คำขอ>) — ผู้ขอเขียนหลังเดินทาง แล้วพิมพ์บันทึกข้อความเสนอหัวหน้าในสายและผู้อำนวยการทราบ
// ผู้บริหาร/HRD เปิดหน้านี้ดูแบบอ่านอย่างเดียว (สิทธิ์ตรวจที่ backend)
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Card, Descriptions, Input, Modal, Popconfirm, Result, Space, Spin, Tag, Typography } from 'antd'
import { EyeOutlined, FileTextOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { JSONContent } from '@tiptap/react'
import { TRAVEL_BASE, TRAVEL_COLOR, TravelApiError, TravelShell, travelApi } from '../travelShared'
import { MEMO, MEMO_NO_RE, isNoClaim, requestDates, requestNo, thaiDateTime } from '../travelCalc'
import { docText, reportTemplate } from '../reportShared'
import type { ReportData, ReportRequestInfo } from '../TravelReportPDF'

const { Title, Text } = Typography
const ReportEditor = dynamic(() => import('../ReportEditor').then(m => m.ReportEditor), { ssr: false, loading: () => <div style={{ padding: 24 }}><Spin /></div> })
const ReportPdf = dynamic(() => import('../TravelReportPDF'), { ssr: false, loading: () => <div style={{ padding: 24 }}><Spin /> กำลังเตรียมเอกสาร...</div> })

interface ReportResp {
  request: ReportRequestInfo
  report: (ReportData & { id: number; updated_at: string; updated_by_name: string | null }) | null
  can_edit: boolean; can_submit: boolean
}

const ReportContent = () => {
  const { message } = App.useApp()
  const id = Number(useSearchParams().get('id')) || null
  const [data, setData] = useState<ReportResp | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<JSONContent | null>(null)
  const [memoNo, setMemoNo] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null)
  const [preview, setPreview] = useState(false)
  const loaded = useRef(false)

  const load = useCallback(async () => {
    if (!id) { setError('ไม่พบคำขอ'); return }
    try {
      const d = await travelApi<ReportResp>(`requests/${id}/report`)
      setData(d)
      if (!loaded.current) { setContent(d.report?.content ?? reportTemplate()); setMemoNo(d.report?.memo_no ?? ''); loaded.current = true }
    } catch (e) { setError(e instanceof TravelApiError && e.status === 404 ? 'ไม่พบรายงาน หรือไม่มีสิทธิ์ดูรายงานนี้' : (e as Error).message) }
  }, [id])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  // เตือนก่อนออกจากหน้าเมื่อยังไม่บันทึก
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const save = async (submit: boolean) => {
    if (!content) return
    const memo = memoNo.trim()
    if (memo && (memo.length > 30 || !MEMO_NO_RE.test(memo))) { message.error('เลขที่บันทึกข้อความใช้ได้เฉพาะตัวเลข ตัวอักษร - / และ .'); return }
    if (submit && docText(content).replace(/\s/g, '').length < 10) { message.error('กรุณาเขียนรายงานผลการเดินทาง'); return }
    setSaving(submit ? 'submit' : 'draft')
    try {
      const res = await fetch(`/api/v1/hrd/travel/requests/${id}/report`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memo_no: memo || null, content, submit }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.success === false) throw new Error(j.message ?? 'บันทึกไม่สำเร็จ')
      setDirty(false)
      message.success(submit || data?.report?.status === 'submitted' ? 'บันทึกรายงานแล้ว — พิมพ์บันทึกข้อความเสนอผู้บริหารทราบได้เลย' : 'บันทึกร่างแล้ว')
      await load()
      if (submit) setPreview(true)
    } catch (e) { message.error((e as Error).message) } finally { setSaving(null) }
  }

  if (error) return <Result status="warning" title={error} extra={<Link href={`${TRAVEL_BASE}/reports`}><Button type="primary">ไปหน้ารายงานการเดินทาง</Button></Link>} />
  if (!data || !content) return <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>
  const r = data.request, rep = data.report
  const submitted = rep?.status === 'submitted'
  const editable = data.can_edit
  const reportForPdf: ReportData = { memo_no: memoNo.trim() || null, content, submitted_at: rep?.submitted_at ?? null, status: submitted ? 'submitted' : 'draft' }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileTextOutlined /></div>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>รายงานผลการเดินทางไปราชการ</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>เขียนสรุปผลหลังเดินทาง แล้วพิมพ์บันทึกข้อความเสนอหัวหน้าในสายและผู้อำนวยการทราบ</Text>
        </div>
        <Space wrap>
          <Tag color={submitted ? 'green' : rep ? 'gold' : 'default'} style={{ margin: 0 }}>{submitted ? 'ส่งรายงานแล้ว' : rep ? 'ร่าง' : 'ยังไม่เขียน'}</Tag>
          <Button icon={<EyeOutlined />} onClick={() => setPreview(true)}>ดูบันทึกข้อความ (PDF)</Button>
        </Space>
      </div>

      <Card size="small" style={{ borderRadius: 14, marginBottom: 16 }} title={`คำขอ ${requestNo(r.id)}`}>
        <Descriptions size="small" column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }} items={[
          { key: 'p', label: 'ผู้รายงาน', children: <div><div>{r.requester_name}</div><div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{[r.requester_position, r.requester_unit].filter(Boolean).join(' · ')}</div></div> },
          { key: 'd', label: 'วันเดินทาง', children: <>{requestDates(r)}{isNoClaim(r) && <Tag color="green" style={{ marginLeft: 6 }}>ไม่เบิกค่าใช้จ่าย</Tag>}</> },
          { key: 's', label: 'เรื่อง', span: 'filled', children: <>{r.purpose} · {r.subject}</> },
          { key: 'l', label: 'สถานที่', span: 'filled', children: r.location },
          { key: 't', label: 'ผู้เดินทาง', span: 'filled', children: r.travelers.map(t => t.name).join(', ') },
          { key: 'c', label: 'เสนอ', span: 'filled', children: [...r.chain.map(c => `${c.level_name ?? ''} (${c.approver_name ?? '-'})`), `${MEMO.to}${r.director ? ` (${r.director.name})` : ''}`].join(' → ') },
        ]} />
      </Card>

      {editable && !data.can_submit && <Alert type="info" showIcon style={{ marginBottom: 12 }} title="ยังไม่ถึงวันเดินทาง — เขียนและบันทึกร่างไว้ก่อนได้ ส่งรายงานได้เมื่อถึงวันเดินทางแล้ว" />}
      {!editable && <Alert type="info" showIcon style={{ marginBottom: 12 }} title={rep ? 'ดูรายงานแบบอ่านอย่างเดียว' : 'ผู้เดินทางยังไม่ได้เขียนรายงาน'} />}

      {(editable || rep) && (
        <Card size="small" style={{ borderRadius: 14, marginBottom: 16 }}
          title={<Space wrap><span>เนื้อหารายงาน</span><Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>ปรับขนาดตัวอักษร ตัวหนา รายการ และจัดแนวได้จากแถบเครื่องมือ · ขนาดปกติ 16 เท่าหนังสือราชการ</Text></Space>}
          extra={rep && <Text type="secondary" style={{ fontSize: 12 }}>แก้ล่าสุด {thaiDateTime(rep.updated_at)}{rep.updated_by_name ? ` · ${rep.updated_by_name}` : ''}</Text>}>
          <div style={{ marginBottom: 12, maxWidth: 360 }}>
            <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>เลขที่บันทึกข้อความ <Text type="secondary" style={{ fontSize: 12 }}>(ไม่บังคับ)</Text></Text>
            <Input prefix={<span style={{ color: 'var(--app-text-2)' }}>ที่ {MEMO.docPrefix}</span>} value={memoNo} maxLength={30} disabled={!editable} aria-label="เลขที่บันทึกข้อความรายงาน"
              onChange={e => { setMemoNo(e.target.value); setDirty(true) }} />
          </div>
          <ReportEditor value={content} editable={editable} onChange={v => { setContent(v); setDirty(true) }} />
          {editable && (
            <Space wrap style={{ marginTop: 12, width: '100%', justifyContent: 'flex-end' }}>
              {dirty && <Text type="warning" style={{ fontSize: 12 }}>ยังไม่ได้บันทึก</Text>}
              {!submitted && <Button icon={<SaveOutlined />} loading={saving === 'draft'} disabled={!!saving} onClick={() => save(false)}>บันทึกร่าง</Button>}
              {submitted
                ? <Button type="primary" icon={<SaveOutlined />} loading={saving === 'draft'} disabled={!!saving} onClick={() => save(false)}>บันทึกการแก้ไข</Button>
                : <Popconfirm title="ส่งรายงานผลการเดินทาง?" description="หัวหน้าในสาย ผู้อำนวยการ และงาน HRD จะเห็นรายงานนี้ · แก้ไขต่อได้" okText="ส่งรายงาน" cancelText="ยังไม่ส่ง"
                    onConfirm={() => save(true)} disabled={!data.can_submit}>
                  <Button type="primary" icon={<SendOutlined />} loading={saving === 'submit'} disabled={!!saving || !data.can_submit}>ส่งรายงาน</Button>
                </Popconfirm>}
            </Space>
          )}
        </Card>
      )}

      <Modal title={`บันทึกข้อความรายงานผลการเดินทาง ${requestNo(r.id)}`} open={preview} onCancel={() => setPreview(false)} footer={null}
        width="92vw" style={{ top: 16 }} styles={{ body: { height: '80vh', padding: 0 } }} destroyOnHidden>
        {preview && <ReportPdf r={r} report={reportForPdf} />}
      </Modal>
    </>
  )
}

export default function TravelReportPage() {
  return (
    <TravelShell current="รายงานผลการเดินทางไปราชการ">
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>}><ReportContent /></Suspense>
    </TravelShell>
  )
}
