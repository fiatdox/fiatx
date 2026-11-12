'use client'
// รายการขออนุมัติเดินทางไปราชการ — ของฉัน (ยื่นเอง/ร่วมเดินทาง) · ทั้งหมด (ADMIN/HRD)
// พิมพ์ PDF · แก้ไข/ยกเลิก (ผู้ขอ ก่อนการเงินยืนยัน) · ยืนยันยอดจากการเงิน (ADMIN/HRD — ยอดนี้เท่านั้นที่ตัดงบ)
// ?open=<id> เปิด PDF ทันที (หลังยื่นคำขอ)
import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { Alert, App, Badge, Button, Card, Empty, Form, Input, InputNumber, Modal, Radio, Segmented, Select, Space, Spin, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AuditOutlined, CheckCircleOutlined, ClockCircleOutlined, EditOutlined, FileDoneOutlined, PlusOutlined, PrinterOutlined, ProfileOutlined, SearchOutlined, StopOutlined } from '@ant-design/icons'
import { RequestTravelersDrawer } from '../TravelHistory'
import { StatusBadge } from '../TravelStatus'
import { ApproveModal, TripUrgency } from '../TravelApprove'
import HrdTasks from '../HrdTasks'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { canSeeTravelItem, HRD_ROLES_ITEM, HRD_TASKS, isHrdTaskKey, TRAVEL_BASE, TRAVEL_COLOR, TRAVEL_MENU, TravelShell, travelApi, travelPost, TravelApiError, useTravelRoles, type HrdTaskKey } from '../travelShared'
import { BUDGET_TYPES, MEMO, SIGN_MODE_LABEL, fmtMoney, requestNo, thaiDateTime, tripRange, type TravelRequest } from '../travelCalc'

const { Title, Text } = Typography
// react-pdf เรนเดอร์ฝั่ง server ไม่ได้
const TravelRequestPDF = dynamic(() => import('../TravelRequestPDF'), { ssr: false, loading: () => <div style={{ padding: 24 }}><Spin /> กำลังเตรียมเอกสาร...</div> })

interface ListData { rows: TravelRequest[]; total: number; can_manage: boolean; pending_approvals: number; soon?: { count: number; overdue: number; days: number } }
type Scope = 'mine' | 'approve' | 'all'
const PAGE_SIZE = 20


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
  // ไม่ระบุ ?tab= → ADMIN/HRD เห็นคำขอทั้งหมดเป็นค่าเริ่มต้น · คนอื่นเห็นคำขอของตนเอง (ที่ยื่นเองและที่ร่วมเดินทาง)
  // (backend ตรวจสิทธิ์ scope=all อีกชั้น — คนที่ไม่ใช่ ADMIN/HRD ได้ 403)
  const tabParam = params.get('tab')
  const [scopeSel, setScope] = useState<Scope | null>(tabParam === 'approve' ? 'approve' : tabParam === 'all' ? 'all' : tabParam === 'mine' ? 'mine' : null)
  const roles = useTravelRoles()
  const isManager = !!roles && canSeeTravelItem(HRD_ROLES_ITEM, roles)
  const scope: Scope | null = scopeSel ?? (roles === null ? null : isManager ? 'all' : 'mine')
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
  const [now] = useState(() => Date.now())
  const [data, setData] = useState<ListData | null>(null)
  const soon = data?.soon, soonDays = soon?.days ?? 7
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState<TravelRequest | null>(null)
  const [printLoading, setPrintLoading] = useState<number | null>(null)
  const [actualFor, setActualFor] = useState<TravelRequest | null>(null)
  const [cancelFor, setCancelFor] = useState<TravelRequest | null>(null)
  const [checkFor, setCheckFor] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!scope) return   // รอรู้ role ก่อน (อ่าน cookie หลัง mount) — ไม่ยิงซ้ำสองรอบ
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
  // การ์ดงานที่ต้องดำเนินการ (ADMIN/HRD) — โหลดจำนวนใหม่หลังบันทึกผล ผอ. / ยอดการเงิน / ยกเลิก / อนุมัติ
  const [tasksKey, setTasksKey] = useState(0)
  const afterAct = () => { load(); loadCount(); setTasksKey(k => k + 1) }
  const afterSave = () => { load(); setTasksKey(k => k + 1) }
  // กดการ์ดงาน = กรองตารางในหน้าเดิม (กดการ์ดที่กรองอยู่ซ้ำ = เลิกกรอง)
  const pickTask = (k: HrdTaskKey) => {
    const next = task === k && scope === 'all' ? null : k
    setScope('all'); setTask(next); setStatus(undefined); setPage(1)
    router.replace(`${TRAVEL_BASE}/requests?tab=all${next ? `&task=${next}` : ''}`, { scroll: false })
  }

  const columns: ColumnsType<TravelRequest> = [
    // ลำดับต่อเนื่องข้ามหน้า (หน้า 2 เริ่มที่ 21)
    { title: 'ลำดับ', key: 'no', width: 64, align: 'center', render: (_: unknown, __: TravelRequest, i: number) => <Text type="secondary" data-testid="row-no">{(page - 1) * PAGE_SIZE + i + 1}</Text> },
    {
      title: 'เลขที่', dataIndex: 'id', width: 190,
      render: (id: number, r) => <>
        <Text code>{requestNo(id)}</Text>
        <div style={{ fontSize: 11, marginTop: 2, whiteSpace: 'nowrap' }} data-testid="memo-no">
          {r.memo_no
            ? <Tooltip title="เลขที่บันทึกข้อความ"><Text style={{ fontSize: 11 }}>ที่ {MEMO.docPrefix}{r.memo_no}</Text></Tooltip>
            : null}
        </div>
      </>,
    },
    {
      title: 'เรื่อง', dataIndex: 'subject',
      render: (v: string, r) => <>
        <div style={{ fontWeight: 500 }}>{v}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.location}</Text>
        {scope !== 'mine' && <div style={{ fontSize: 12, color: 'var(--app-text-2)' }} data-testid="requester">{r.requester_name}
          <span style={{ color: 'var(--app-text-3)' }}> · {[r.requester_position, r.requester_unit].filter(Boolean).join(' · ') || '—'}</span></div>}
      </>,
    },
    { title: 'วันเดินทาง', dataIndex: 'start_at', width: 130, responsive: ['md'], render: (_: string, r) => tripRange(r.start_at, r.end_at) },
    {
      // ชื่อผู้เดินทาง (ผู้ขอก่อน) — เกิน 3 คนย่อเป็น "และอีก N คน" ชี้ดูรายชื่อครบ · ช่องค้นหาค้นชื่อผู้เดินทางได้
      title: 'ผู้เดินทาง', dataIndex: 'traveler_count', width: 220, responsive: ['lg'],
      render: (n: number, r) => {
        const names = r.traveler_names ?? []
        const more = names.length - 3
        const count = data?.can_manage ? <a onClick={() => setCheckFor(r.id)} title="ดูรายละเอียดคำขอและประวัติผู้เดินทาง">{n} คน</a> : <Text type="secondary" style={{ fontSize: 12 }}>{n} คน</Text>
        return (
          <div data-testid="travelers" style={{ fontSize: 12, lineHeight: 1.5 }}>
            {names.slice(0, 3).map((x, i) => <div key={i} style={{ fontWeight: i === 0 ? 500 : 400 }}>{x}</div>)}
            {more > 0 && <Tooltip title={<div>{names.slice(3).map((x, i) => <div key={i}>{x}</div>)}</div>}><Text type="secondary" style={{ fontSize: 12 }}>และอีก {more} คน</Text></Tooltip>}
            <div style={{ fontSize: 12 }}>{count}</div>
          </div>
        )
      },
    },
    {
      title: 'ยอดเงินประมาณการ (บาท)', dataIndex: 'total_amount', width: 190, align: 'right',
      render: (v: number, r) => <>
        <div>{fmtMoney(v)}</div>
        {r.status === 'submitted' && r.approval_stage === 'approved' && (r.actual_amount != null
          ? <Tag color="success" style={{ margin: 0 }}>ยืนยัน {fmtMoney(r.actual_amount)}</Tag>
          : <Tag style={{ margin: 0 }}>รอการเงินยืนยัน</Tag>)}
      </>,
    },
    {
      title: 'สถานะ', dataIndex: 'status', width: 190, align: 'center',
      render: (_: string, r) => {
        const tip = r.status === 'cancelled' ? r.cancel_reason : r.status === 'rejected' ? r.reject_reason
          : r.waiting_for ? `${r.waiting_for.is_acting ? 'รักษาการ ' : ''}${r.waiting_for.approver_name}` : null
        return <>
          <Tooltip title={tip ?? undefined}>
            <StatusBadge r={r} />
          </Tooltip>
          {r.sign_mode === 'paper' && <div style={{ fontSize: 11, color: 'var(--app-text-3)', marginTop: 2 }}>{SIGN_MODE_LABEL.paper}</div>}
          <TripUrgency r={r} now={now} days={soonDays} />
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
          {data?.can_manage && <Button type="text" size="small" icon={<ProfileOutlined />} onClick={() => setCheckFor(r.id)} title="รายละเอียดการขออนุมัติ" aria-label={`รายละเอียดการขออนุมัติ ${requestNo(r.id)}`} />}
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
          <Text style={{ color: 'var(--app-text-2)' }}>{isManager ? 'คำขอของบุคลากรทั้งหมด (ผู้ดูแลระบบ / งานพัฒนาทรัพยากรบุคคล)' : 'คำขอที่ยื่นเองและที่ร่วมเดินทาง'} พิมพ์บันทึกข้อความได้ทุกรายการ</Text>
        </div>
        <Link href={`${TRAVEL_BASE}/request`}><Button type="primary" icon={<PlusOutlined />}>ยื่นคำขอใหม่</Button></Link>
      </div>
      {isManager && (
        <>
          <Title level={5} style={{ margin: '0 0 8px', color: 'var(--app-text)' }}>งานที่ต้องดำเนินการ</Title>
          <HrdTasks onPick={pickTask} active={scope === 'all' ? task : null} reloadKey={tasksKey} />
        </>
      )}
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
          <Input allowClear prefix={<SearchOutlined style={{ color: 'var(--app-text-3)' }} />} placeholder="ค้นหาเรื่อง สถานที่ ผู้เดินทาง เลขที่บันทึก" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '1 1 220px', maxWidth: 340 }} />
          <Select allowClear placeholder="ทุกสถานะ" value={status} onChange={x => { setStatus(x); setPage(1) }} style={{ width: 140 }}
            options={[{ value: 'submitted', label: 'ยื่นแล้ว' }, { value: 'rejected', label: 'ไม่อนุมัติ' }, { value: 'cancelled', label: 'ยกเลิก' }]} />
        </div>
        {soon && soon.count > 0 && task !== 'soon' && (
          <Alert type="error" showIcon icon={<ClockCircleOutlined />} style={{ marginBottom: 12 }} data-testid="soon-alert"
            title={<span>ใกล้เดินทางแต่ผู้อำนวยการยังไม่อนุมัติ <b>{soon.count}</b> รายการ{soon.overdue > 0 ? <> (เลยวันออกเดินทางแล้ว <b>{soon.overdue}</b>)</> : null}</span>}
            description={`ออกเดินทางภายใน ${soon.days} วัน — ${isManager ? 'ต้องเร่งติดตามให้ผู้อำนวยการอนุมัติก่อนวันเดินทาง' : 'ติดตามเอกสารให้ผู้อำนวยการอนุมัติก่อนวันเดินทาง'} มิฉะนั้นผู้เดินทางจะไม่มีสิทธิ์เดินทาง`}
            action={scope === 'all' ? <Button size="small" danger onClick={() => { setTask('soon'); setStatus(undefined); setPage(1); router.replace(`${TRAVEL_BASE}/requests?tab=all&task=soon`, { scroll: false }) }}>ดูรายการที่ต้องเร่ง</Button> : undefined} />
        )}
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
      {directorFor && <DirectorModal key={directorFor.id} r={directorFor} onClose={() => setDirectorFor(null)} onSaved={afterSave} />}
      {actualFor && <ActualModal key={actualFor.id} r={actualFor} onClose={() => setActualFor(null)} onSaved={afterSave} />}
      {cancelFor && <CancelModal key={cancelFor.id} r={cancelFor} onClose={() => setCancelFor(null)} onSaved={afterSave} />}
      {checkFor && <RequestTravelersDrawer key={checkFor} requestId={checkFor} onClose={() => setCheckFor(null)} onOpenPdf={id => { setCheckFor(null); openPdf(id) }} />}
      <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 12 }}>
        ยอดประมาณการในคำขอไม่ตัดงบ — งบถูกตัดเมื่องานพัฒนาทรัพยากรบุคคลบันทึกยอดที่การเงินยืนยันแล้ว{data?.rows.some(r => r.actual_at) ? ` · ยืนยันล่าสุด ${thaiDateTime(data.rows.filter(r => r.actual_at).map(r => r.actual_at!).sort().pop()!)}` : ''}
      </Text>
    </>
  )
}

export default function TravelRequestListPage() {
  return (
    <TravelShell current={TRAVEL_MENU[1].title} fluid>
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>}>
        <RequestsContent />
      </Suspense>
    </TravelShell>
  )
}
