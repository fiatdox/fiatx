'use client'
// พิจารณาคำขอ (อนุมัติ / ไม่อนุมัติ พร้อมลงนาม) และป้ายใกล้เดินทาง — ใช้ร่วมกันหน้ารายการคำขอและหน้าอนุมัติการเดินทาง
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Descriptions, Form, Input, Modal, Space, Spin, Tag, Tooltip, Typography } from 'antd'
import { AuditOutlined, CheckCircleOutlined, ExclamationCircleOutlined, FilePdfOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { travelApi } from './travelShared'
import { fmtMoney, requestBudgetType, requestNo, tripRange, type TravelRequest } from './travelCalc'
import { ApprovalSteps } from './TravelStatus'
import { SignaturePreview } from '@/app/account/settings/SignatureSettings'

const { Text } = Typography

/** ป้ายเร่งด่วน: ใกล้/เลยวันออกเดินทางแต่ ผอ. ยังไม่อนุมัติ — ไม่อนุมัติทัน ผู้เดินทางจะไม่มีสิทธิ์เดินทาง */
export const TripUrgency = ({ r, now, days }: { r: TravelRequest; now: number; days: number }) => {
  if (r.status !== 'submitted' || r.approval_stage === 'approved') return null
  const DAY = 86_400_000
  const left = Math.floor((Date.parse(r.start_at) - now) / DAY)   // วันเต็มที่เหลือก่อนออกเดินทาง
  if (left >= days) return null
  const overdue = Date.parse(r.start_at) < now
  const label = overdue ? 'เลยวันออกเดินทางแล้ว' : left === 0 ? 'เดินทางภายใน 24 ชม.' : `อีก ${left} วันเดินทาง`
  const stage = r.approval_stage === 'director' ? 'รอผู้อำนวยการอนุมัติ' : 'ยังค้างในสายอนุมัติ ยังไม่ถึงผู้อำนวยการ'
  return (
    <Tooltip title={`${stage} — ต้องเร่งให้อนุมัติก่อนวันเดินทาง มิฉะนั้นผู้เดินทางจะไม่มีสิทธิ์เดินทาง`}>
      <div data-testid="trip-urgency" data-level={overdue || left <= 2 ? 'critical' : 'warn'} style={{ marginTop: 4 }}>
        <Tag color={overdue || left <= 2 ? 'red' : 'orange'} variant="solid" icon={<ExclamationCircleOutlined />} style={{ margin: 0, fontWeight: 600 }}>{label}</Tag>
        <div style={{ fontSize: 11, color: 'var(--app-text-2)', marginTop: 2 }}>เร่งให้ ผอ. อนุมัติ</div>
      </div>
    </Tooltip>
  )
}

// ── อนุมัติ / ไม่อนุมัติ พร้อมลงนาม (ผู้อนุมัติของขั้นปัจจุบัน) ──
export const ApproveModal = ({ id, onClose, onSaved, onOpenPdf }: { id: number; onClose: () => void; onSaved: () => void; onOpenPdf: (id: number) => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [r, setR] = useState<TravelRequest | null>(null)
  const [sig, setSig] = useState<string | null | undefined>(undefined)
  const [saving, setSaving] = useState<'approve' | 'reject' | null>(null)
  const loadSig = useCallback(async () => {
    try { const j = await (await fetch('/api/v1/users/me/signature')).json(); setSig(j?.success ? j.data?.image ?? null : null) } catch { setSig(null) }
  }, [])
  useEffect(() => {
    travelApi<TravelRequest>(`requests/${id}`).then(setR).catch(e => { message.error((e as Error).message); onClose() })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
    loadSig()
  }, [id, message, onClose, loadSig])
  const act = async (kind: 'approve' | 'reject') => {
    const v = await form.validateFields(kind === 'reject' ? ['comment'] : []).catch(() => null)
    if (!v) return
    const comment = (form.getFieldValue('comment') ?? '').trim()
    if (kind === 'reject' && !comment) { form.setFields([{ name: 'comment', errors: ['ระบุเหตุผลที่ไม่อนุมัติ'] }]); return }
    setSaving(kind)
    try {
      const res = await fetch(`/api/v1/hrd/travel/requests/${id}/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment: comment || null }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.success === false) {
        if (j.field === 'comment') form.setFields([{ name: 'comment', errors: [j.message] }])
        else { message.error(j.message ?? 'บันทึกไม่สำเร็จ'); if (j.field === 'signature') loadSig() }
        return
      }
      message.success(j.message ?? 'บันทึกแล้ว')
      onClose(); onSaved()
    } catch { message.error('บันทึกไม่สำเร็จ') } finally { setSaving(null) }
  }
  return (
    <Modal open title={<span><AuditOutlined style={{ marginRight: 8 }} />พิจารณาคำขอ {requestNo(id)}</span>} onCancel={onClose} width={720}
      footer={r && r.can_approve ? [
        <Button key="x" onClick={onClose}>ปิด</Button>,
        <Button key="r" danger loading={saving === 'reject'} disabled={!sig || saving === 'approve'} onClick={() => act('reject')}>ไม่อนุมัติ</Button>,
        <Button key="a" type="primary" icon={<CheckCircleOutlined />} loading={saving === 'approve'} disabled={!sig || saving === 'reject'} onClick={() => act('approve')}>อนุมัติและลงนาม</Button>,
      ] : [<Button key="x" onClick={onClose}>ปิด</Button>]}>
      {!r ? <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div> : <>
        <Descriptions size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 12 }} items={[
          { key: 'n', label: 'ผู้ขอ', children: <>{r.requester_name}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{[r.requester_position, r.requester_unit].filter(Boolean).join(' · ')}</div></> },
          { key: 'd', label: 'วันเดินทาง', children: tripRange(r.start_at, r.end_at) },
          { key: 's', label: 'เรื่อง', span: 'filled', children: <>{r.purpose} · {r.subject}</> },
          { key: 'l', label: 'สถานที่', span: 'filled', children: r.location },
          { key: 't', label: 'ผู้เดินทาง', children: `${r.travelers?.length ?? 0} คน` },
          { key: 'm', label: 'ประมาณการ', children: <b>{fmtMoney(r.total_amount)} บาท</b> },
          { key: 'b', label: 'งบประมาณ', span: 'filled', children: `${requestBudgetType(r)} · ${r.budget_name}` },
        ]} />
        <Button icon={<FilePdfOutlined />} onClick={() => onOpenPdf(r.id)} style={{ marginBottom: 12 }}>ดูบันทึกข้อความ / บัญชีแนบท้าย</Button>
        <ApprovalSteps r={r} />
        {r.can_approve ? <>
          {sig === undefined ? <Spin size="small" />
            : sig ? <div style={{ margin: '4px 0 12px' }}><Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ลงนามด้วยลายเซ็นในบัญชีของท่าน</Text><SignaturePreview src={sig} height={44} /></div>
              : <Alert type="warning" showIcon style={{ margin: '4px 0 12px' }} data-testid="no-signature" title="ยังไม่ได้ตั้งค่าลายเซ็น — อนุมัติไม่ได้"
                description={<Space wrap size={6} style={{ marginTop: 4 }}>
                  <Link href="/account/settings?tab=signature" target="_blank" rel="noopener noreferrer"><Button size="small" type="primary">ตั้งค่าลายเซ็น</Button></Link>
                  <Button size="small" onClick={loadSig}>ตั้งแล้ว ตรวจอีกครั้ง</Button>
                </Space>} />}
          <Form form={form} layout="vertical">
            <Form.Item name="comment" label="ความเห็น (ไม่อนุมัติต้องระบุเหตุผล)" rules={[{ max: 300 }]}>
              <Input.TextArea rows={2} placeholder="เช่น เห็นควรอนุมัติ" />
            </Form.Item>
          </Form>
        </> : <Alert type="info" showIcon title={r.waiting_for ? `ขั้นนี้รอ${r.waiting_for.level_name} (${r.waiting_for.approver_name})` : 'คำขอนี้ไม่ได้รอท่านอนุมัติ'} />}
      </>}
    </Modal>
  )
}

