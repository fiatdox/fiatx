'use client'
// เจ้าหน้าที่ HRD ตรวจคำขอ (ขั้นแรก ก่อนเข้าสายหัวหน้า): ผ่าน · ส่งกลับให้ผู้ขอแก้ไข · ไม่อนุมัติ (จบคำขอ)
import React, { useEffect, useState } from 'react'
import { Alert, App, Button, Checkbox, ConfigProvider, Descriptions, Form, Input, Modal, Radio, Select, Spin, Tag, Typography } from 'antd'
import { FilePdfOutlined, FileSearchOutlined } from '@ant-design/icons'
import { TRAVEL_COLOR, travelApi } from './travelShared'
import { fmtMoney, isNoClaim, requestBudgetText, requestDates, requestNo, SIGN_MODE_LABEL, thaiDateTime, type HrdReview, type TravelRequest } from './travelCalc'
import { FILE_KIND_LABEL, RequestFiles } from './TravelFiles'

const { Text } = Typography

export type ReviewResult = HrdReview['action']
export const REVIEW_LABEL: Record<ReviewResult, string> = { passed: 'ตรวจผ่าน', returned: 'ส่งกลับแก้ไข', rejected: 'ไม่อนุมัติ' }
const REVIEW_COLOR: Record<ReviewResult, string> = { passed: '#16a34a', returned: '#d97706', rejected: '#dc2626' }
/** ข้อความยาวสุดของผลการตรวจ (ตรงกับ backend / คอลัมน์ note) */
export const REVIEW_NOTE_MAX = 1000

// เรื่องที่ส่งกลับให้แก้ไขบ่อย — ติ๊กแล้วรวมเป็นข้อความแจ้งผู้ขอ (ไฟล์ที่ยังไม่แนบเพิ่มให้อัตโนมัติ)
const NAME_ISSUE = 'ชื่อผู้เดินทางไม่ตรงตามเอกสารต้นเรื่อง'
const COMMON_ISSUES = [
  NAME_ISSUE,
  'วันที่เดินทางไม่ตรงตามเอกสารต้นเรื่อง',
  'สถานที่ไม่ตรงตามเอกสารต้นเรื่อง',
  'เรื่อง/วัตถุประสงค์ไม่ตรงตามเอกสารต้นเรื่อง',
  'ค่าใช้จ่ายไม่ถูกต้อง หรือเกินสิทธิ์',
  'ไฟล์แนบไม่ชัดเจน อ่านไม่ออก',
]
interface ReviewForm { result: ReviewResult; issues?: string[]; names?: string[]; note?: string }
/** ข้อความที่ส่งให้ผู้ขอ: รายการที่ติ๊ก (ชื่อที่ไม่ตรงต่อท้าย) + รายละเอียดเพิ่มเติม */
export const composeReviewNote = (v: Partial<ReviewForm>) => [
  ...(v.result === 'returned' ? v.issues ?? [] : []).map(i => i === NAME_ISSUE && v.names?.length ? `- ${i}: ${v.names.join(', ')}` : `- ${i}`),
  v.note?.trim() ?? '',
].filter(Boolean).join('\n')

/** ประวัติการตรวจของ HRD (ตรวจได้หลายรอบเมื่อส่งกลับแก้ไข) */
export const ReviewHistory = ({ reviews }: { reviews: HrdReview[] }) => <>
  {reviews.map((v, i) => (
    <div key={i} style={{ fontSize: 12.5 }}>
      <span style={{ color: REVIEW_COLOR[v.action], fontWeight: 600 }}>{REVIEW_LABEL[v.action]}</span> · {v.reviewer_name} · {thaiDateTime(v.acted_at)}
      {v.note && <div style={{ color: 'var(--app-text-2)', whiteSpace: 'pre-wrap' }}>{v.note}</div>}
    </div>
  ))}
</>

export const ReviewModal = ({ id, onClose, onSaved, onOpenPdf }: { id: number; onClose: () => void; onSaved: () => void; onOpenPdf: (id: number) => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [r, setR] = useState<TravelRequest | null>(null)
  const [saving, setSaving] = useState(false)
  const result = Form.useWatch('result', form) as ReviewResult | undefined
  const issues = Form.useWatch('issues', form) as string[] | undefined
  useEffect(() => {
    travelApi<TravelRequest>(`requests/${id}`).then(setR).catch(e => { message.error((e as Error).message); onClose() })
  }, [id, message, onClose])

  const submit = async () => {
    const v = await form.validateFields().catch(() => null) as ReviewForm | null
    if (!v) return
    const note = composeReviewNote(v)
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/hrd/travel/requests/${id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ result: v.result, note: note || null }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.success === false) {
        if (j.field === 'note') form.setFields([{ name: 'note', errors: [j.message] }])
        else message.error(j.message ?? 'บันทึกไม่สำเร็จ')
        return
      }
      message.success(j.message ?? 'บันทึกผลการตรวจแล้ว')
      onClose(); onSaved()
    } catch { message.error('บันทึกไม่สำเร็จ') } finally { setSaving(false) }
  }

  const missing = r?.missing_files ?? []
  // เลือก "ส่งกลับ" ครั้งแรก: ติ๊กไฟล์ที่ยังไม่แนบให้
  const missingIssues = missing.map(k => `ยังไม่ได้แนบ${FILE_KIND_LABEL[k]}`)
  const onValues = (ch: Partial<ReviewForm>) => {
    if (ch.result === 'returned' && !(form.getFieldValue('issues') ?? []).length && missingIssues.length) form.setFieldsValue({ issues: missingIssues })
  }
  return (
    <Modal open title={<span><FileSearchOutlined style={{ marginRight: 8 }} />ตรวจคำขอ {requestNo(id)}</span>} onCancel={onClose} width={720}
      footer={r?.can_hrd_review ? [
        <Button key="x" onClick={onClose}>ปิด</Button>,
        <Button key="s" type="primary" danger={result === 'rejected'} loading={saving} onClick={submit}>บันทึกผลการตรวจ</Button>,
      ] : [<Button key="x" onClick={onClose}>ปิด</Button>]}>
      {!r ? <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div> : <>
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }} style={{ marginBottom: 12 }} items={[
          { key: 'n', label: 'ผู้ขอ', children: <>{r.requester_name}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{[r.requester_position, r.requester_unit].filter(Boolean).join(' · ')}</div>
            {r.capacity_label && <Tag color="purple" style={{ marginTop: 4 }} data-testid="review-capacity">ในฐานะ{r.capacity_label}</Tag>}</> },
          { key: 'd', label: 'วันเดินทาง', children: requestDates(r) },
          { key: 's', label: 'เรื่อง', span: 'filled', children: <>{r.purpose} · {r.subject}</> },
          { key: 'l', label: 'สถานที่', span: 'filled', children: r.location },
          { key: 't', label: 'ผู้เดินทาง', children: `${r.travelers?.length ?? 0} คน` },
          { key: 'm', label: 'ประมาณการ', children: isNoClaim(r) ? <Tag color="green" style={{ margin: 0 }}>ไม่เบิกค่าใช้จ่าย</Tag> : <b>{fmtMoney(r.total_amount)} บาท</b> },
          { key: 'b', label: 'งบประมาณ', span: 'filled', children: requestBudgetText(r) },
          { key: 'sm', label: 'การลงนาม', span: 'filled', children: `${SIGN_MODE_LABEL[r.sign_mode] ?? ''} · ยื่นเมื่อ ${thaiDateTime(r.updated_at ?? r.created_at)}` },
        ]} />
        <Button icon={<FilePdfOutlined />} onClick={() => onOpenPdf(r.id)} style={{ marginBottom: 12 }}>ดูบันทึกข้อความ / บัญชีแนบท้าย</Button>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>เอกสารแนบ</div>
        <div style={{ marginBottom: 12 }}><RequestFiles requestId={r.id} files={r.files ?? []} mode={r.vehicle_mode} costMode={r.cost_mode} vehicleRequest={r.vehicle_request} /></div>
        {(r.reviews?.length ?? 0) > 0 && <>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>การตรวจครั้งก่อน</div>
          <div style={{ marginBottom: 12 }}><ReviewHistory reviews={r.reviews!} /></div>
        </>}
        {r.can_hrd_review ? (
          <Form form={form} layout="vertical" initialValues={{ result: 'passed' }} onValuesChange={onValues}>
            <ConfigProvider theme={{ components: { Radio: { buttonSolidCheckedBg: TRAVEL_COLOR, buttonSolidCheckedHoverBg: TRAVEL_COLOR, buttonSolidCheckedActiveBg: TRAVEL_COLOR } } }}>
              <Form.Item name="result" label="ผลการตรวจ" rules={[{ required: true }]}>
                <Radio.Group optionType="button" buttonStyle="solid" data-testid="review-result" options={[
                  { value: 'passed', label: 'ผ่าน ส่งต่อหัวหน้า' }, { value: 'returned', label: 'ส่งกลับให้แก้ไข' }, { value: 'rejected', label: 'ไม่อนุมัติ' },
                ]} />
              </Form.Item>
            </ConfigProvider>
            {result === 'passed' && missing.length > 0 && <Alert type="warning" showIcon style={{ marginBottom: 12 }} data-testid="review-missing" title={`ยังไม่ได้แนบ ${missing.map(k => FILE_KIND_LABEL[k]).join(' · ')} — ควรส่งกลับให้แก้ไข หรือแนบให้ก่อนกดผ่าน`} />}
            {result === 'rejected' && <Alert type="error" showIcon style={{ marginBottom: 12 }} title="ไม่อนุมัติ = จบคำขอ ผู้ขอต้องยื่นคำขอใหม่" />}
            {result === 'returned' && <>
              <Form.Item name="issues" label="เรื่องที่ต้องแก้ไข (เลือกได้หลายข้อ)" style={{ marginBottom: 8 }}>
                <Checkbox.Group data-testid="review-issues" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '4px 12px' }}
                  options={[...missingIssues, ...COMMON_ISSUES].map(x => ({ value: x, label: x }))} />
              </Form.Item>
              {issues?.includes(NAME_ISSUE) && (
                <Form.Item name="names" label="ผู้เดินทางที่ชื่อไม่ตรง" rules={[{ required: true, message: 'เลือกผู้เดินทางที่ชื่อไม่ตรง' }]}>
                  <Select mode="multiple" data-testid="review-names" placeholder="เลือกชื่อ" options={(r.travelers ?? []).map(t => ({ value: t.name, label: t.name }))} />
                </Form.Item>
              )}
            </>}
            <Form.Item name="note" label={result === 'returned' ? 'รายละเอียดเพิ่มเติม (แจ้งผู้ขอ)' : result === 'rejected' ? 'เหตุผลที่ไม่อนุมัติ' : 'หมายเหตุ (ถ้ามี)'}
              dependencies={['issues', 'names', 'result']}
              rules={[{
                validator: (_, x) => {
                  const all = composeReviewNote({ ...form.getFieldsValue(), note: x })
                  if (result !== 'passed' && !all) return Promise.reject(new Error(result === 'returned' ? 'เลือกเรื่องที่ต้องแก้ไข หรือพิมพ์รายละเอียด' : 'ระบุเหตุผล'))
                  if (all.length > REVIEW_NOTE_MAX) return Promise.reject(new Error(`ยาวเกิน ${REVIEW_NOTE_MAX} ตัวอักษร`))
                  return Promise.resolve()
                },
              }]}>
              <Input.TextArea rows={3} placeholder={result === 'returned' ? 'เช่น ชื่อในหนังสือต้นเรื่องเป็น นางสาว… · แก้วันที่กลับเป็น ๒๕ พ.ย.' : undefined} />
            </Form.Item>
          </Form>
        ) : <Text type="secondary">คำขอนี้ไม่ได้รอการตรวจ{r.approval_stage === 'returned' ? ' — ส่งกลับให้ผู้ขอแก้ไขแล้ว' : ''}</Text>}
      </>}
    </Modal>
  )
}
