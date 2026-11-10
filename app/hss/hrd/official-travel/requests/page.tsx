'use client'
// รายการขออนุมัติเดินทางไปราชการ — ของฉัน (ยื่นเอง/ร่วมเดินทาง) · ทั้งหมด (ADMIN/HRD)
// พิมพ์ PDF · แก้ไข/ยกเลิก (ผู้ขอ ก่อนการเงินยืนยัน) · ยืนยันยอดจากการเงิน (ADMIN/HRD — ยอดนี้เท่านั้นที่ตัดงบ)
// ?open=<id> เปิด PDF ทันที (หลังยื่นคำขอ)
import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { Alert, App, Badge, Button, Card, Descriptions, Empty, Form, Input, InputNumber, Modal, Radio, Segmented, Select, Space, Spin, Steps, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AuditOutlined, CheckCircleOutlined, EditOutlined, FileDoneOutlined, FilePdfOutlined, PlusOutlined, PrinterOutlined, SearchOutlined, StopOutlined, TeamOutlined } from '@ant-design/icons'
import { RequestTravelersDrawer } from '../TravelHistory'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { HRD_TASKS, isHrdTaskKey, TRAVEL_BASE, TRAVEL_COLOR, TRAVEL_MENU, TravelShell, travelApi, travelPost, TravelApiError, type HrdTaskKey } from '../travelShared'
import { BUDGET_TYPES, SIGN_MODE_LABEL, fmtMoney, requestNo, statusOf, thaiDateTime, tripRange, type TravelRequest } from '../travelCalc'
import { SignaturePreview } from '@/app/account/settings/SignatureSettings'

const { Title, Text } = Typography
// react-pdf เรนเดอร์ฝั่ง server ไม่ได้
const TravelRequestPDF = dynamic(() => import('../TravelRequestPDF'), { ssr: false, loading: () => <div style={{ padding: 24 }}><Spin /> กำลังเตรียมเอกสาร...</div> })

interface ListData { rows: TravelRequest[]; total: number; can_manage: boolean; pending_approvals: number }
type Scope = 'mine' | 'approve' | 'all'
const PAGE_SIZE = 20

/** ลำดับการลงนามของคำขอ: ผู้ขอ → หัวหน้าในสาย → ผอ. (กระดาษ) */
const ApprovalSteps = ({ r }: { r: TravelRequest }) => {
  const chain = r.approval_chain ?? []
  const acts = r.approvals ?? []
  // เดินเอกสาร: ลงนามบนกระดาษทุกช่อง ระบบรู้แค่ผลสุดท้ายที่งาน HRD บันทึก
  if (r.sign_mode === 'paper') {
    const done = r.director_result != null, waiting = !done && r.status === 'submitted'
    return <Steps orientation="vertical" size="small" current={-1} items={[
      { title: 'ยื่นในระบบ', content: thaiDateTime(r.created_at), status: 'finish' as const },
      {
        title: 'เดินเอกสารลงนาม', content: <>{['ผู้ขอ', ...chain.map(s => `${s.level_name} (${s.is_acting ? 'รักษาการ ' : ''}${s.approver_name})`), 'ผู้อำนวยการ'].join(' → ')}
          {r.director_result && <div>{r.director_result === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} · บันทึกผล {r.director_at ? thaiDateTime(r.director_at) : ''}{r.director_note ? ` · ${r.director_note}` : ''}</div>}</>,
        status: r.director_result === 'approved' ? 'finish' as const : r.director_result === 'rejected' ? 'error' as const : waiting ? 'process' as const : 'wait' as const,
      },
    ]} />
  }
  const items = [
    { title: 'ผู้ขอลงนาม', content: thaiDateTime(r.created_at), status: 'finish' as const },
    ...chain.map(s => {
      const a = acts.find(x => x.step === s.step)
      const isCur = r.status === 'submitted' && r.approval_stage === 'chain' && r.current_step === s.step
      return {
        title: s.level_name,
        content: <>{s.is_acting ? 'รักษาการ ' : ''}{s.approver_name}{a && <div>{a.action === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} {thaiDateTime(a.acted_at)}{a.comment ? ` · ${a.comment}` : ''}</div>}</>,
        status: a ? (a.action === 'approved' ? 'finish' as const : 'error' as const) : isCur ? 'process' as const : 'wait' as const,
      }
    }),
    {
      title: 'ผู้อำนวยการ (ลงนามบนกระดาษ)',
      content: r.director_result ? <>{r.director_result === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} · บันทึกผล {r.director_at ? thaiDateTime(r.director_at) : ''}{r.director_note ? ` · ${r.director_note}` : ''}</> : r.approval_stage === 'director' && r.status === 'submitted' ? 'รอลงนาม' : '',
      status: r.director_result === 'approved' ? 'finish' as const : r.director_result === 'rejected' ? 'error' as const : r.approval_stage === 'director' && r.status === 'submitted' ? 'process' as const : 'wait' as const,
    },
  ]
  return <Steps orientation="vertical" size="small" current={-1} items={items} />
}

// ── อนุมัติ / ไม่อนุมัติ พร้อมลงนาม (ผู้อนุมัติของขั้นปัจจุบัน) ──
const ApproveModal = ({ id, onClose, onSaved, onOpenPdf }: { id: number; onClose: () => void; onSaved: () => void; onOpenPdf: (id: number) => void }) => {
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
          { key: 'b', label: 'งบประมาณ', span: 'filled', children: `${BUDGET_TYPES[r.budget_type]} · ${r.budget_name}` },
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

// ── บันทึกผลคำสั่ง ผอ. ตามบันทึกข้อความที่ลงนามจริงแล้ว (ADMIN/HRD) ──
const DirectorModal = ({ r, onClose, onSaved }: { r: TravelRequest; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const result = Form.useWatch('result', form)
  const submit = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      await travelPost(`requests/${r.id}/director`, { result: v.result, note: v.note?.trim() || null })
      message.success(v.result === 'approved' ? 'บันทึกว่าผู้อำนวยการอนุมัติแล้ว — บันทึกยอดยืนยันจากการเงินได้' : 'บันทึกว่าผู้อำนวยการไม่อนุมัติแล้ว')
      onClose(); onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else message.error((e as Error).message)
    } finally { setSaving(false) }
  }
  return (
    <Modal open title={`บันทึกผลคำสั่งผู้อำนวยการ · ${requestNo(r.id)}`} onCancel={onClose} onOk={submit} okText="บันทึกผล" cancelText="ยกเลิก" confirmLoading={saving}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        title={r.sign_mode === 'paper' ? 'เดินเอกสาร — บันทึกตามบันทึกข้อความที่ลงนามครบแล้ว' : 'บันทึกตามบันทึกข้อความที่ผู้อำนวยการลงนามจริงแล้ว'}
        description={<>{r.requester_name} · {r.subject}{r.sign_mode === 'paper' && <div>หัวหน้าไม่อนุมัติในเอกสาร ให้เลือก “ไม่อนุมัติ” แล้วระบุเหตุผล</div>}</>} />
      <Form form={form} layout="vertical" initialValues={{ result: 'approved' }}>
        <Form.Item name="result" label="คำสั่งผู้อำนวยการ" rules={[{ required: true }]}>
          <Radio.Group optionType="button" options={[{ value: 'approved', label: 'อนุมัติ' }, { value: 'rejected', label: 'ไม่อนุมัติ' }]} />
        </Form.Item>
        <Form.Item name="note" label={result === 'rejected' ? 'เหตุผลที่ไม่อนุมัติ' : 'หมายเหตุ (ถ้ามี)'} rules={[{ required: result === 'rejected', whitespace: true, message: 'ระบุเหตุผล' }, { max: 300 }]}>
          <Input placeholder={result === 'rejected' ? 'ตามที่ผู้อำนวยการเขียนในคำสั่ง' : 'เช่น เลขที่หนังสือ'} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── ยืนยันยอดจากการเงิน ── (ฟอร์มของตัวเอง render เฉพาะตอนเปิด)
const ActualModal = ({ r, onClose, onSaved }: { r: TravelRequest; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState<'save' | 'clear' | null>(null)
  const submit = async (clear: boolean) => {
    const v = clear ? {} : await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(clear ? 'clear' : 'save')
    try {
      await travelApi(`requests/${r.id}/actual`, 'PUT', clear ? { actual_amount: null } : { actual_amount: v.actual_amount, actual_note: v.actual_note ?? null })
      message.success(clear ? 'ล้างยอดยืนยันแล้ว — กลับเป็นประมาณการรอยืนยัน' : `ยืนยันยอด ${fmtMoney(v.actual_amount)} บาท แล้ว ตัดงบเรียบร้อย`)
      onClose(); onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else message.error((e as Error).message)
    } finally { setSaving(null) }
  }
  return (
    <Modal open title={`ยืนยันยอดเบิกจ่ายจากการเงิน · ${requestNo(r.id)}`} onCancel={onClose}
      footer={[
        r.actual_amount != null && <Button key="c" danger loading={saving === 'clear'} onClick={() => submit(true)}>ล้างยอดยืนยัน</Button>,
        <Button key="x" onClick={onClose}>ยกเลิก</Button>,
        <Button key="s" type="primary" loading={saving === 'save'} onClick={() => submit(false)}>บันทึกยอดยืนยัน</Button>,
      ]}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }} title="ยอดที่บันทึกนี้เท่านั้นที่ตัดงบประมาณ"
        description={`${r.requester_name} · ${r.subject} · ประมาณการ ${fmtMoney(r.total_amount)} บาท · ${BUDGET_TYPES[r.budget_type]} ${r.budget_name}`} />
      <Form form={form} layout="vertical" initialValues={{ actual_amount: r.actual_amount ?? r.total_amount, actual_note: r.actual_note ?? undefined }}>
        <Form.Item name="actual_amount" label="ยอดที่การเงินยืนยัน" rules={[{ required: true, message: 'ระบุยอด' }]}>
          <InputNumber min={0} max={1_000_000} precision={2} style={{ width: '100%' }} suffix="บาท" />
        </Form.Item>
        <Form.Item name="actual_note" label="อ้างอิง / หมายเหตุ" rules={[{ max: 300 }]}>
          <Input placeholder="เช่น เลขที่ใบสำคัญ / ฎีกา" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── ยกเลิกคำขอ ──
const CancelModal = ({ r, onClose, onSaved }: { r: TravelRequest; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      await travelPost(`requests/${r.id}/cancel`, { reason: v.reason ?? null })
      message.success(`ยกเลิกคำขอ ${requestNo(r.id)} แล้ว`)
      onClose(); onSaved()
    } catch (e) { message.error((e as Error).message) } finally { setSaving(false) }
  }
  return (
    <Modal open title={`ยกเลิกคำขอ ${requestNo(r.id)}`} onCancel={onClose} onOk={submit} okText="ยกเลิกคำขอ" okButtonProps={{ danger: true }} cancelText="ไม่ยกเลิก" confirmLoading={saving}>
      <Text>{r.subject}</Text>
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="reason" label="เหตุผล (ถ้ามี)" rules={[{ max: 300 }]}><Input placeholder="เช่น เลื่อนการประชุม" /></Form.Item>
      </Form>
    </Modal>
  )
}

const RequestsContent = () => {
  const { message } = App.useApp()
  const router = useRouter()
  const params = useSearchParams()
  // ?tab=approve — ลิงก์จากป้ายรออนุมัติบนเมนู · ?tab=all&task= — การ์ดงานที่ต้องดำเนินการของ HRD (backend ตรวจสิทธิ์ scope=all)
  const [scope, setScope] = useState<Scope>(params.get('tab') === 'approve' ? 'approve' : params.get('tab') === 'all' ? 'all' : 'mine')
  const [task, setTask] = useState<HrdTaskKey | null>(() => { const t = params.get('task'); return isHrdTaskKey(t) ? t : null })
  const [approveFor, setApproveFor] = useState<number | null>(null)
  const [directorFor, setDirectorFor] = useState<TravelRequest | null>(null)
  // แสดงแท็บรออนุมัติเมื่อมีคำขอรอ หรือเคยอยู่ในสายอนุมัติ
  const [approver, setApprover] = useState<{ pending: number; involved: boolean } | null>(null)
  const loadCount = useCallback(() => { travelApi<{ pending: number; involved: boolean }>('requests/approvals/count').then(setApprover).catch(() => {}) }, [])
  useEffect(() => { loadCount() }, [loadCount])
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState<TravelRequest | null>(null)
  const [printLoading, setPrintLoading] = useState<number | null>(null)
  const [actualFor, setActualFor] = useState<TravelRequest | null>(null)
  const [cancelFor, setCancelFor] = useState<TravelRequest | null>(null)
  const [checkFor, setCheckFor] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams({ scope, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) })
    if (query) q.set('search', query)
    if (status) q.set('status', status)
    if (task && scope === 'all') q.set('task', task)
    try {
      const d = await travelApi<ListData>(`requests?${q}`)
      setData(d)
      setApprover(a => a && d.pending_approvals != null ? { ...a, pending: d.pending_approvals } : a)
    }
    catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [scope, page, query, status, task, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const openPdf = useCallback(async (id: number) => {
    setPrintLoading(id)
    try { setPrinting(await travelApi<TravelRequest>(`requests/${id}`)) }
    catch (e) { message.error((e as Error).message) } finally { setPrintLoading(null) }
  }, [message])
  // หลังยื่นคำขอ: เปิด PDF ทันที แล้วล้าง ?open ออกจาก URL
  const openId = Number(params.get('open')) || null
  useEffect(() => {
    if (!openId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- เปิด PDF จากลิงก์ (โหลดข้อมูลจาก API)
    openPdf(openId)
    router.replace(`${TRAVEL_BASE}/requests`)
  }, [openId, openPdf, router])
  const afterAct = () => { load(); loadCount() }

  const columns: ColumnsType<TravelRequest> = [
    { title: 'เลขที่', dataIndex: 'id', width: 104, render: (id: number) => <Text code>{requestNo(id)}</Text> },
    {
      title: 'เรื่อง', dataIndex: 'subject',
      render: (v: string, r) => <>
        <div style={{ fontWeight: 500 }}>{v}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.location}</Text>
        {scope !== 'mine' && <div style={{ fontSize: 12, color: 'var(--app-text-2)' }}>{r.requester_name} · {r.requester_unit ?? '—'}</div>}
      </>,
    },
    { title: 'วันเดินทาง', dataIndex: 'start_at', width: 130, responsive: ['md'], render: (_: string, r) => tripRange(r.start_at, r.end_at) },
    {
      title: 'ผู้เดินทาง', dataIndex: 'traveler_count', width: 90, align: 'center', responsive: ['lg'],
      render: (n: number, r) => data?.can_manage ? <a onClick={() => setCheckFor(r.id)} title="ตรวจประวัติผู้เดินทาง">{n} คน</a> : `${n} คน`,
    },
    {
      title: 'ยอดเงิน (บาท)', dataIndex: 'total_amount', width: 160, align: 'right',
      render: (v: number, r) => <>
        <div>{fmtMoney(v)} <Text type="secondary" style={{ fontSize: 11 }}>ประมาณการ</Text></div>
        {r.status === 'submitted' && r.approval_stage === 'approved' && (r.actual_amount != null
          ? <Tag color="success" style={{ margin: 0 }}>ยืนยัน {fmtMoney(r.actual_amount)}</Tag>
          : <Tag style={{ margin: 0 }}>รอการเงินยืนยัน</Tag>)}
      </>,
    },
    {
      title: 'สถานะ', dataIndex: 'status', width: 150, align: 'center',
      render: (_: string, r) => {
        const st = statusOf(r)
        const tip = r.status === 'cancelled' ? r.cancel_reason : r.status === 'rejected' ? r.reject_reason
          : r.waiting_for ? `${r.waiting_for.is_acting ? 'รักษาการ ' : ''}${r.waiting_for.approver_name}` : null
        return <>
          <Tooltip title={tip ?? undefined}><Tag color={st.color} style={{ margin: 0 }}>{st.label}</Tag></Tooltip>
          {r.sign_mode === 'paper' && <div style={{ fontSize: 11, color: 'var(--app-text-3)', marginTop: 2 }}>{SIGN_MODE_LABEL.paper}</div>}
        </>
      },
    },
    {
      title: '', width: 200, align: 'right',
      render: (_: unknown, r) => (
        <Space size={0}>
          {r.can_approve && <Button type="primary" size="small" icon={<AuditOutlined />} onClick={() => setApproveFor(r.id)} title="พิจารณาอนุมัติ" aria-label={`พิจารณา ${requestNo(r.id)}`} style={{ marginRight: 4 }}>พิจารณา</Button>}
          {!r.can_approve && scope === 'approve' && <Button type="text" size="small" icon={<AuditOutlined />} onClick={() => setApproveFor(r.id)} title="ดูการอนุมัติ" aria-label={`ดูการอนุมัติ ${requestNo(r.id)}`} />}
          <Button type="text" size="small" icon={<PrinterOutlined />} loading={printLoading === r.id} onClick={() => openPdf(r.id)} title="พิมพ์ PDF" aria-label={`พิมพ์ ${requestNo(r.id)}`} />
          {r.can_record_director && <Button type="text" size="small" icon={<FileDoneOutlined style={{ color: '#ca8a04' }} />} onClick={() => setDirectorFor(r)} title={r.sign_mode === 'paper' ? 'บันทึกผลตามเอกสารที่ลงนามแล้ว' : 'บันทึกผลคำสั่ง ผอ.'} aria-label={`บันทึกผล ผอ. ${requestNo(r.id)}`} />}
          {data?.can_manage && <Button type="text" size="small" icon={<TeamOutlined />} onClick={() => setCheckFor(r.id)} title="ตรวจประวัติผู้เดินทาง" aria-label={`ตรวจประวัติผู้เดินทาง ${requestNo(r.id)}`} />}
          {r.can_edit && <Link href={`${TRAVEL_BASE}/request?id=${r.id}`}><Button type="text" size="small" icon={<EditOutlined />} title="แก้ไข" aria-label={`แก้ไข ${requestNo(r.id)}`} /></Link>}
          {r.can_record_actual && <Button type="text" size="small" icon={<CheckCircleOutlined style={{ color: '#16a34a' }} />} onClick={() => setActualFor(r)} title="ยืนยันยอดจากการเงิน" aria-label={`ยืนยันยอด ${requestNo(r.id)}`} />}
          {r.can_cancel && <Button type="text" size="small" danger icon={<StopOutlined />} onClick={() => setCancelFor(r)} title="ยกเลิกคำขอ" aria-label={`ยกเลิก ${requestNo(r.id)}`} />}
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{TRAVEL_MENU[1].icon}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>รายการขออนุมัติเดินทางไปราชการ</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>คำขอที่ยื่นเองและที่ร่วมเดินทาง พิมพ์บันทึกข้อความได้ทุกรายการ</Text>
        </div>
        <Link href={`${TRAVEL_BASE}/request`}><Button type="primary" icon={<PlusOutlined />}>ยื่นคำขอใหม่</Button></Link>
      </div>
      <Card styles={{ body: { padding: 12 } }} style={{ borderRadius: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {(data?.can_manage || approver?.involved || (approver?.pending ?? 0) > 0 || scope !== 'mine') && (
            <Segmented value={scope} onChange={x => { setScope(x as Scope); setTask(null); setPage(1) }}
              options={[
                { value: 'mine', label: 'ของฉัน' },
                ...(approver?.involved || (approver?.pending ?? 0) > 0 || scope === 'approve'
                  ? [{ value: 'approve', label: <Badge count={approver?.pending ?? 0} size="small" offset={[8, -2]}><span>รออนุมัติ</span></Badge> }] : []),
                ...(data?.can_manage ? [{ value: 'all', label: 'ทั้งหมด' }] : []),
              ]} />
          )}
          <Input allowClear prefix={<SearchOutlined style={{ color: 'var(--app-text-3)' }} />} placeholder="ค้นหาเรื่อง สถานที่ ผู้ขอ" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '1 1 220px', maxWidth: 340 }} />
          <Select allowClear placeholder="ทุกสถานะ" value={status} onChange={x => { setStatus(x); setPage(1) }} style={{ width: 140 }}
            options={[{ value: 'submitted', label: 'ยื่นแล้ว' }, { value: 'rejected', label: 'ไม่อนุมัติ' }, { value: 'cancelled', label: 'ยกเลิก' }]} />
        </div>
        {task && scope === 'all' && (
          <Alert type="info" showIcon style={{ marginBottom: 12 }} data-testid="task-filter"
            title={<span>กรองงานที่ต้องดำเนินการ: <b>{HRD_TASKS[task].title}</b></span>}
            description={HRD_TASKS[task].hint}
            action={<Button size="small" onClick={() => { setTask(null); setPage(1); router.replace(`${TRAVEL_BASE}/requests?tab=all`, { scroll: false }) }}>แสดงทั้งหมด</Button>} />
        )}
        <Table<TravelRequest> size="small" rowKey="id" loading={loading} columns={columns} dataSource={data?.rows ?? []} scroll={{ x: 'max-content' }}
          pagination={{ current: page, pageSize: PAGE_SIZE, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false, hideOnSinglePage: true, showTotal: t => `ทั้งหมด ${t} รายการ` }}
          locale={{ emptyText: scope === 'approve' ? <Empty description="ไม่มีคำขอที่รอท่านอนุมัติ" />
            : <Empty description={scope === 'mine' ? 'ยังไม่มีคำขอ' : 'ไม่พบคำขอ'}><Link href={`${TRAVEL_BASE}/request`}><Button type="primary">ยื่นคำขอแรก</Button></Link></Empty> }} />
      </Card>

      <Modal title={<span><PrinterOutlined style={{ marginRight: 8 }} />บันทึกข้อความขออนุมัติเดินทางไปราชการ — {printing ? requestNo(printing.id) : ''}</span>}
        open={!!printing} onCancel={() => setPrinting(null)} width="92vw" style={{ top: 16 }} styles={{ body: { height: '80vh', padding: 0 } }} footer={null} destroyOnHidden>
        {printing && <TravelRequestPDF data={printing} />}
      </Modal>
      {approveFor && <ApproveModal key={approveFor} id={approveFor} onClose={() => setApproveFor(null)} onSaved={afterAct} onOpenPdf={openPdf} />}
      {directorFor && <DirectorModal key={directorFor.id} r={directorFor} onClose={() => setDirectorFor(null)} onSaved={load} />}
      {actualFor && <ActualModal key={actualFor.id} r={actualFor} onClose={() => setActualFor(null)} onSaved={load} />}
      {cancelFor && <CancelModal key={cancelFor.id} r={cancelFor} onClose={() => setCancelFor(null)} onSaved={load} />}
      {checkFor && <RequestTravelersDrawer key={checkFor} requestId={checkFor} onClose={() => setCheckFor(null)} />}
      <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 12 }}>
        ยอดประมาณการในคำขอไม่ตัดงบ — งบถูกตัดเมื่องานพัฒนาทรัพยากรบุคคลบันทึกยอดที่การเงินยืนยันแล้ว{data?.rows.some(r => r.actual_at) ? ` · ยืนยันล่าสุด ${thaiDateTime(data.rows.filter(r => r.actual_at).map(r => r.actual_at!).sort().pop()!)}` : ''}
      </Text>
    </>
  )
}

export default function TravelRequestListPage() {
  return (
    <TravelShell current={TRAVEL_MENU[1].title}>
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>}>
        <RequestsContent />
      </Suspense>
    </TravelShell>
  )
}
