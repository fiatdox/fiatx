'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { normalizeRoles } from '@/app/lib/menuAccess'
import {
  Table, Tag, Card, Typography, Select, Space, Button, Empty, Input, Checkbox, DatePicker,
  Drawer, Descriptions, Timeline, Modal, Spin, App, Avatar, Tooltip, InputNumber, Popconfirm, Tabs, Segmented, ConfigProvider
} from 'antd'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import {
  HomeOutlined, FileTextOutlined, PaperClipOutlined, EyeOutlined, PrinterOutlined, FilterOutlined,
  ClearOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, RollbackOutlined,
  SafetyCertificateOutlined, EditOutlined, SyncOutlined, CalendarOutlined, HistoryOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import dynamic from 'next/dynamic'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider, useThemeMode } from '@/app/components/ThemeProvider'
import type { LeaveFormData } from '@/app/components/LeaveFormPDF'
import AttachmentModal from '../AttachmentModal'
import ChainResyncModal from '../ChainResyncModal'
import LeaveDatesEdit from './LeaveDatesEdit'
import { beShort, nf, parseChain, buildLeaveFormData, type ApiChainStep, type ApiAction } from '@/app/lib/leaveFormData'

// react-pdf เรนเดอร์ฝั่ง server ไม่ได้ ต้องโหลดตอน client เท่านั้น
const LeaveFormPDF = dynamic(() => import('@/app/components/LeaveFormPDF'), {
  ssr: false,
  loading: () => <div style={{ padding: 24 }}>กำลังเตรียมเอกสาร...</div>,
})

const { Title, Text } = Typography

// สีแท็บตามธีม — สีหลัก #10b981 บนพื้นสว่างคอนทราสต์ต่ำ จึงใช้เขียวเข้มในธีมสว่าง และเขียวสว่างในธีมมืด
const TAB_THEME = {
  light: {
    Tabs: { titleFontSize: 15, itemColor: '#1e293b', itemHoverColor: '#047857', itemActiveColor: '#065f46', itemSelectedColor: '#047857', inkBarColor: '#047857' },
    Segmented: { trackBg: '#e2e8f0', itemColor: '#1e293b', itemHoverColor: '#0f172a', itemHoverBg: 'rgba(15, 23, 42, 0.08)', itemActiveBg: 'rgba(15, 23, 42, 0.12)', itemSelectedBg: '#047857', itemSelectedColor: '#ffffff' },
  },
  dark: {
    Tabs: { titleFontSize: 15, itemColor: '#e2e8f0', itemHoverColor: '#34d399', itemActiveColor: '#6ee7b7', itemSelectedColor: '#34d399', inkBarColor: '#34d399' },
    Segmented: { trackBg: '#334155', itemColor: '#e2e8f0', itemHoverColor: '#ffffff', itemHoverBg: 'rgba(255, 255, 255, 0.1)', itemActiveBg: 'rgba(255, 255, 255, 0.16)', itemSelectedBg: '#34d399', itemSelectedColor: '#052e22' },
  },
}

// ── ปีงบประมาณ ───────────────────────────────────────────────────────────────
const currentFY = () => {
  const now = dayjs()
  return now.month() >= 9 ? now.year() + 544 : now.year() + 543
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'รออนุมัติ', color: 'warning', icon: <ClockCircleOutlined /> },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'success', icon: <CheckCircleOutlined /> },
  REJECTED: { label: 'ไม่อนุมัติ', color: 'error', icon: <CloseCircleOutlined /> },
  CANCEL_PENDING: { label: 'รออนุมัติยกเลิก', color: 'processing', icon: <RollbackOutlined /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'default', icon: <RollbackOutlined /> },
}
const statusOf = (s: string) => STATUS_META[String(s).toUpperCase()] ?? STATUS_META.PENDING

// แท็บยกเลิก — ใบเดียวกันมีสถานะการยกเลิกแยกจากสถานะใบ (ไม่อนุมัติการยกเลิก = ใบกลับเป็นอนุมัติแล้ว)
type View = 'leave' | 'cancel'
const LEAVE_STATUS = ['PENDING', 'APPROVED', 'REJECTED']
const CANCEL_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CANCEL_PENDING: STATUS_META.CANCEL_PENDING,
  CANCELLED: STATUS_META.CANCELLED,
  CANCEL_REJECTED: { label: 'ไม่อนุมัติการยกเลิก', color: 'error', icon: <CloseCircleOutlined /> },
}
const WITHDRAWN_META = { label: 'ถอนใบแล้ว', color: 'default', icon: <RollbackOutlined /> }

// สีประจำประเภทการลา — ชุดเดียวกับหน้าสรุปการลา (ลาพักผ่อน / ป่วย / กิจ / คลอด) ประเภทที่เหลือมีสีของตัวเอง
const TYPE_COLOR: Record<string, string> = {
  ANNUAL: '#6366f1', SICK: '#22c55e', PERS: '#f59e0b', MAT: '#ec4899', PAT: '#0ea5e9',
  ORDAIN: '#a16207', MIL: '#64748b', STUDY: '#8b5cf6', INTL: '#14b8a6', FOLLOW: '#e11d48', REHAB: '#84cc16',
}
const LeaveTypeTag = ({ code, name }: { code: string; name: string }) => {
  const c = TYPE_COLOR[code] ?? '#94a3b8'
  return (
    <Tag style={{ marginInlineEnd: 0, background: `${c}1a`, borderColor: `${c}66`, color: 'inherit' }}>
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: c, marginInlineEnd: 6 }} />
      {name.replace(/^การลา/, '')}
    </Tag>
  )
}

// ── การตรวจของงาน HR ─────────────────────────────────────────────────────────
const CHECK_META: Record<string, { label: string; color: string }> = {
  UNCHECKED: { label: 'ยังไม่ตรวจ', color: 'default' },
  VERIFIED: { label: 'ตรวจแล้ว ถูกต้อง', color: 'success' },
  ADJUSTED: { label: 'แก้จำนวนวันแล้ว', color: 'processing' },
}
const checkOf = (r: Row) => {
  // การตรวจล่าสุดคือการแก้วันที่ลา (บันทึกพร้อมกัน) → ป้ายบอกว่าแก้วันที่ ไม่ใช่แก้จำนวนวัน
  const e = r.date_edits?.[0]
  if (r.day_check_status === 'ADJUSTED' && e && r.day_checked_at && Math.abs(Date.parse(e.created_at) - Date.parse(r.day_checked_at)) < 60_000)
    return { label: 'แก้วันที่ลาแล้ว', color: 'processing' }
  return CHECK_META[r.day_check_status ?? 'UNCHECKED']
}
// ตรวจ/แก้ได้เฉพาะใบที่ยังมีผล (ไม่อนุมัติ / ยกเลิกแล้ว ไม่ได้หักวันลา)
const CHECKABLE = ['PENDING', 'APPROVED', 'CANCEL_PENDING']
const spanOf = (r: Row) => dayjs(r.end_date).diff(dayjs(r.start_date), 'day') + 1

// readOnly = ผอ. / รักษาการ ผอ. — เห็นผลการตรวจ แต่ตรวจ/แก้/ยกเลิกไม่ได้ (เฉพาะ ADMIN / HR)
const DayCheck = ({ r, onDone, readOnly = false, leaveTypeId = null }: { r: Row; onDone: () => void; readOnly?: boolean; leaveTypeId?: number | null }) => {
  const { message } = App.useApp()
  const [mode, setMode] = useState<'view' | 'verify' | 'adjust' | 'dates'>('view')
  const [days, setDays] = useState<number | null>(Number(r.total_days))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const m = checkOf(r)
  const inForm = Number(r.total_days)
  const differs = Number(r.rule_days) > 0 && Number(r.rule_days) !== inForm
  const max = r.is_half_day ? spanOf(r) - 0.5 : spanOf(r)
  const canCheck = CHECKABLE.includes(String(r.status).toUpperCase())
  // แก้วันที่ลาได้เฉพาะใบรออนุมัติ/อนุมัติแล้ว — ใบระหว่างขอยกเลิกต้องรอผลก่อน
  const canEditDates = ['PENDING', 'APPROVED'].includes(String(r.status).toUpperCase())

  // ยกเลิกผลการตรวจ — ใบกลับเป็นยังไม่ตรวจ ผู้ลาแก้จำนวนวันได้อีก และแบบใบลาไม่พิมพ์ชื่อผู้ตรวจ
  const cancelCheck = async () => {
    setSaving(true)
    try {
      const j = await (await fetch(`/api/v1/hr/leave-day-check/${r.id}/cancel`, { method: 'POST' })).json()
      if (!j?.success) { message.error(j?.message ?? 'ยกเลิกไม่สำเร็จ'); return }
      message.success(j.message ?? 'ยกเลิกการตรวจสอบแล้ว')
      onDone()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const cancelButton = r.day_check_status ? (
    <Popconfirm
      title="ยกเลิกผลการตรวจสอบ?"
      description={<span>ใบนี้จะกลับเป็น &quot;ยังไม่ตรวจ&quot; และแบบใบลาจะไม่พิมพ์ชื่อผู้ตรวจสอบ{r.day_check_status === 'ADJUSTED' ? <><br />จำนวนวันที่แก้ไว้จะคงเดิม</> : null}</span>}
      okText="ยกเลิกการตรวจ" cancelText="ไม่" okButtonProps={{ danger: true }}
      onConfirm={cancelCheck}
    >
      <Button danger icon={<RollbackOutlined />} loading={saving}>ยกเลิกการตรวจสอบ</Button>
    </Popconfirm>
  ) : null

  const save = async () => {
    if (mode === 'adjust') {
      if (!days || days <= 0) { message.warning('กรุณาระบุจำนวนวัน'); return }
      if (!note.trim()) { message.warning('กรุณาระบุเหตุผลที่แก้จำนวนวัน'); return }
    }
    setSaving(true)
    try {
      const url = `/api/v1/hr/leave-day-check/${r.id}/${mode === 'adjust' ? 'adjust' : 'verify'}`
      const body = mode === 'adjust' ? { total_days: days, note: note.trim() } : { note: note.trim() || null }
      const j = await (await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })).json()
      if (!j?.success) { message.error(j?.message ?? 'บันทึกไม่สำเร็จ'); return }
      message.success(j.message ?? 'บันทึกแล้ว')
      setMode('view'); setNote('')
      onDone()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card size="small" styles={{ body: { padding: 14 } }}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Tag color={m.color} icon={<SafetyCertificateOutlined />} style={{ marginInlineEnd: 0 }}>{m.label}</Tag>
        {r.day_checked_at && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            โดย {r.day_checked_by_name ?? '-'} · บันทึกเมื่อ {beShort(r.day_checked_at)} {dayjs(r.day_checked_at).format('HH:mm')} น.
          </Text>
        )}
      </div>
      <Descriptions
        column={1} size="small"
        styles={{ label: { width: 170 } }}
        items={[
          { key: 'form', label: 'จำนวนวันในใบลา', children: <Text strong>{nf(inForm)} วัน</Text> },
          {
            key: 'rule', label: `นับตามกฎ (${r.count_working_days_only ? 'วันทำการ' : 'วันปฏิทิน'})`,
            children: (
              <Space size={8} wrap>
                <Text>{nf(Number(r.rule_days))} วัน</Text>
                {differs
                  ? <Tag color="warning" style={{ marginInlineEnd: 0 }}>ไม่ตรงกับใบลา</Tag>
                  : <Tag color="success" style={{ marginInlineEnd: 0 }}>ตรงกัน</Tag>}
              </Space>
            ),
          },
          ...(r.day_check_note ? [{ key: 'note', label: 'หมายเหตุการตรวจ', children: r.day_check_note }] : []),
        ]}
      />
      {(r.date_edits?.length ?? 0) > 0 && (
        <div className="mt-2" data-testid="date-edits">
          <Text type="secondary" style={{ fontSize: 12 }}><HistoryOutlined /> ประวัติการแก้วันที่ลา {r.date_edits!.length} ครั้ง</Text>
          <div className="mt-1 flex flex-col gap-1">
            {r.date_edits!.map(e => (
              <div key={e.id} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, background: 'var(--app-bg)' }}>
                <div>
                  <del style={{ color: 'var(--app-text-3)' }}>{editRange(e.before)} ({nf(e.before.total_days)} วัน)</del>
                  {' → '}<Text strong style={{ fontSize: 12 }}>{editRange(e.after)} ({nf(e.after.total_days)} วัน)</Text>
                  {e.refunded_days > 0 && <Tag color="green" style={{ marginInlineStart: 6, fontSize: 11 }}>คืน {nf(e.refunded_days)} วัน</Tag>}
                </div>
                <div style={{ color: 'var(--app-text-3)' }}>{e.reason} · {e.actor_name ?? '-'} · {beShort(e.created_at)} {dayjs(e.created_at).format('HH:mm')} น.</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {differs && r.count_working_days_only && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          จำนวนวันในใบมากกว่าวันทำการ อาจเป็นการลาในวันที่มีเวร (เสาร์-อาทิตย์/วันหยุด) — ตรวจกับตารางเวรก่อนยืนยัน
        </Text>
      )}

      {readOnly ? null : !canCheck ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Text type="secondary" style={{ fontSize: 12 }}>ใบที่ไม่อนุมัติหรือยกเลิกแล้ว ไม่ต้องตรวจจำนวนวัน</Text>
          {cancelButton}
        </div>
      ) : mode === 'view' ? (
        <Space className="mt-3" wrap>
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setMode('verify')}>
            {r.day_check_status ? 'ยืนยันใหม่ว่าถูกต้อง' : 'ยืนยันว่าถูกต้อง'}
          </Button>
          <Button icon={<EditOutlined />} onClick={() => { setDays(inForm); setMode('adjust') }}>แก้จำนวนวัน</Button>
          {canEditDates && (
            <Button icon={<CalendarOutlined />} data-testid="edit-dates-btn" onClick={() => setMode('dates')}>แก้วันที่ลา</Button>
          )}
          {cancelButton}
          {!canEditDates && <Text type="secondary" style={{ fontSize: 12 }}>ใบระหว่างขอยกเลิก แก้วันที่ได้หลังทราบผลการยกเลิก</Text>}
        </Space>
      ) : mode === 'dates' ? (
        <LeaveDatesEdit r={r} leaveTypeId={leaveTypeId} onCancel={() => setMode('view')} onSaved={() => { setMode('view'); onDone() }} />
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {mode === 'adjust' && (
            <Space size={8} wrap>
              <Text>จำนวนวันที่ถูกต้อง</Text>
              <InputNumber
                value={days} onChange={v => setDays(v == null ? null : Number(v))}
                min={0.5} max={max} step={0.5} style={{ width: 110 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>วัน (ไม่เกิน {nf(max)} วันตามช่วงวันที่)</Text>
            </Space>
          )}
          <Input.TextArea
            value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500} showCount
            placeholder={mode === 'adjust' ? 'เหตุผลที่แก้จำนวนวัน (จำเป็น)' : 'หมายเหตุ (ไม่บังคับ)'}
          />
          {mode === 'adjust' && (
            <Text type="secondary" style={{ fontSize: 12 }}>บันทึกแล้วระบบปรับยอดวันลาที่หักไว้ของเจ้าหน้าที่ตามจำนวนใหม่ทันที</Text>
          )}
          <Space>
            <Button type="primary" loading={saving} onClick={save}>บันทึก</Button>
            <Button disabled={saving} onClick={() => { setMode('view'); setNote('') }}>ยกเลิก</Button>
          </Space>
        </div>
      )}
    </Card>
  )
}

interface DateEditSnap { start_date: string; end_date: string; is_half_day: boolean; half_day_period: string | null; total_days: number }
const editRange = (x: DateEditSnap) =>
  `${dayjs(x.start_date).isSame(x.end_date, 'day') ? beShort(x.start_date) : `${beShort(x.start_date)} – ${beShort(x.end_date)}`}${x.is_half_day ? (x.half_day_period === 'PM' ? ' ครึ่งวันบ่าย' : ' ครึ่งวันเช้า') : ''}`

// ช่องวันที่แสดงปี พ.ศ. (format BBBB) — ต้องเปิด plugin ไม่งั้นขึ้นตัวอักษร BBBB ตรง ๆ
dayjs.extend(buddhistEra)

const lvNo = (id: number) => `LV-${String(id).padStart(6, '0')}`

// ── ข้อมูลจาก API ────────────────────────────────────────────────────────────
interface Row {
  id: number
  user_id: number
  employee_name: string
  position_name: string | null
  user_type_name: string | null
  unit_name: string | null
  leave_type_name: string
  leave_type_code: string
  start_date: string
  end_date: string
  total_days: string | number
  is_half_day: boolean
  half_day_period: string | null
  status: string
  reason: string | null
  reject_reason: string | null
  contact_info: string | null
  substitute_name: string | null
  document_name: string | null
  current_step: number | null
  approval_chain: ApiChainStep[] | string | null
  created_at: string
  updated_at: string
  cancellation_id: number | null
  cancellation_status: string | null
  cancellation_reason: string | null
  cancelled_by_name: string | null
  cancellation_created_at: string | null
  cancellation_updated_at: string | null
  cancellation_refunded_days: string | number | null
  cancellation_reject_comment: string | null
  cancellation_actions: ApiAction[]
  actions: ApiAction[]
  count_working_days_only: boolean
  rule_days: number
  day_check_status: 'VERIFIED' | 'ADJUSTED' | null
  day_check_note: string | null
  day_checked_at: string | null
  day_checked_by_name: string | null
  /** ประวัติการแก้วันที่ลาโดย HR (ใหม่สุดก่อน) */
  date_edits?: { id: number; before: DateEditSnap; after: DateEditSnap; refunded_days: number; reason: string; created_at: string; actor_name: string | null }[]
}
interface LeaveType { id: number; code: string; name_th: string }

const dateRange = (r: Row) =>
  dayjs(r.start_date).isSame(r.end_date, 'day')
    ? beShort(r.start_date)
    : `${beShort(r.start_date)} – ${beShort(r.end_date)}`

const halfDayLabel = (r: Row) =>
  !r.is_half_day ? '' : r.half_day_period === 'PM' || r.half_day_period === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : ' (ครึ่งวันเช้า)'

// ── ไฟล์แนบ: รูปแสดงในหน้า PDF ฝังเป็น iframe ชนิดอื่นเปิดแท็บใหม่ ───────────────
const Attachment = ({ r, onOpen }: { r: Row; onOpen: () => void }) => {
  if (!r.document_name) return <Text type="secondary">ไม่มีไฟล์แนบ</Text>
  return (
    <Space size={8} wrap>
      <PaperClipOutlined />
      <Text>{r.document_name}</Text>
      <Button size="small" type="primary" ghost icon={<EyeOutlined />} onClick={onOpen}>ดูไฟล์แนบ</Button>
    </Space>
  )
}


// ── ประวัติการอนุมัติ: ขั้นที่กดแล้ว + ขั้นที่ยังรอ ──────────────────────────────
const ApprovalTimeline = ({ r }: { r: Row }) => {
  const chain = parseChain(r.approval_chain)
  const acts = [...r.actions].sort((a, b) => dayjs(a.actioned_at).valueOf() - dayjs(b.actioned_at).valueOf())
  const pending = String(r.status).toUpperCase() === 'PENDING'
    ? chain.filter(c => Number(c.step) >= Number(r.current_step ?? 1) && !acts.some(a => Number(a.step) === Number(c.step)))
    : []
  if (acts.length === 0 && pending.length === 0) return <Text type="secondary">ไม่มีประวัติการอนุมัติ</Text>
  const levelOf = (step: number) => chain.find(c => Number(c.step) === Number(step))?.level_name
  return (
    <Timeline
      items={[
        ...acts.map(a => {
          const rejected = a.action === 'REJECTED'
          return {
            color: rejected ? 'red' : 'green',
            content: (
              <div style={{ lineHeight: 1.5 }}>
                <Space size={8} wrap>
                  <Text strong>ขั้นที่ {a.step}{levelOf(a.step) ? ` · ${levelOf(a.step)}` : ''}</Text>
                  <Tag color={rejected ? 'error' : 'success'} style={{ marginInlineEnd: 0 }}>
                    {rejected ? 'ไม่อนุมัติ' : 'อนุมัติ'}
                  </Tag>
                </Space>
                <div><Text>{a.approver_name ?? '-'}</Text></div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {beShort(a.actioned_at)} {dayjs(a.actioned_at).format('HH:mm')} น.
                </Text>
                {a.comment && <div><Text type="secondary" style={{ fontSize: 12 }}>“{a.comment}”</Text></div>}
              </div>
            ),
          }
        }),
        ...pending.map((c, i) => ({
          color: i === 0 ? 'blue' : 'gray',
          content: (
            <div style={{ lineHeight: 1.5 }}>
              <Space size={8} wrap>
                <Text strong>ขั้นที่ {c.step} · {c.level_name}{c.is_acting && ' (รักษาการ)'}</Text>
                <Tag style={{ marginInlineEnd: 0 }}>{i === 0 ? 'กำลังรอ' : 'ยังไม่ถึงคิว'}</Tag>
              </Space>
              <div><Text type="secondary">{c.approver_name}</Text></div>
            </div>
          ),
        })),
      ]}
    />
  )
}

// ── การขอยกเลิก ─────────────────────────────────────────────────────────────
const hasCancellation = (r: Row) => r.cancellation_status != null

const cancelMetaOf = (r: Row) => {
  const s = String(r.status).toUpperCase()
  if (s === 'CANCEL_PENDING') return CANCEL_META.CANCEL_PENDING
  if (s === 'CANCELLED') return r.cancellation_status === 'APPROVED' ? CANCEL_META.CANCELLED : WITHDRAWN_META
  return r.cancellation_status === 'REJECTED' ? CANCEL_META.CANCEL_REJECTED : statusOf(s)
}

/** ผู้ขอยกเลิก — ใบที่ถอนก่อนอนุมัติไม่มีแถวคำขอยกเลิก และถอนได้เฉพาะเจ้าของใบ */
const cancellerOf = (r: Row) => r.cancelled_by_name?.trim() || r.employee_name

/** ขั้นที่คำขอยกเลิกรออยู่ — ไม่ใช่ CANCEL_PENDING = จบแล้ว */
const cancelWaitingOf = (r: Row) => {
  if (String(r.status).toUpperCase() !== 'CANCEL_PENDING') return null
  const chain = parseChain(r.approval_chain)
  const step = chain.find(c => Number(c.step) === Number(r.current_step))
  return step ? { step, total: chain.length } : null
}

const CancelProgress = ({ r }: { r: Row }) => {
  const small = { fontSize: 12 }
  const s = String(r.status).toUpperCase()
  if (s === 'CANCEL_PENDING') {
    const w = cancelWaitingOf(r)
    if (!w) return <Text type="secondary" style={small}>-</Text>
    return (
      <div style={{ lineHeight: 1.35 }}>
        <Text style={small}>รอขั้นที่ {w.step.step}/{w.total} · {w.step.level_name}{w.step.is_acting ? ' (รักษาการ)' : ''}</Text>
        <div><Text type="secondary" style={small}>{w.step.approver_name}</Text></div>
      </div>
    )
  }
  if (s === 'CANCELLED' && r.cancellation_status !== 'APPROVED') return <Text type="secondary" style={small}>ถอนใบก่อนอนุมัติครบ</Text>
  // โอนจากโปรแกรมเดิมที่ยกเลิกสำเร็จแล้ว — เวลาในระบบนี้คือเวลาโอน ไม่ใช่เวลาที่อนุมัติจริง
  if (s === 'CANCELLED' && !r.cancellation_actions?.length) return <Text type="secondary" style={small}>ยกเลิกสำเร็จในโปรแกรมเดิม</Text>
  const at = r.cancellation_updated_at ? beShort(r.cancellation_updated_at) : '-'
  return s === 'CANCELLED'
    ? <Text type="secondary" style={small}>อนุมัติครบเมื่อ {at}</Text>
    : (
      <div style={{ lineHeight: 1.35 }}>
        <Text type="secondary" style={small}>ไม่อนุมัติเมื่อ {at} — ใบยังมีผล</Text>
        {r.cancellation_reject_comment && <div><Text type="secondary" style={small}>“{r.cancellation_reject_comment}”</Text></div>}
      </div>
    )
}

/** ประวัติการกดในรอบขอยกเลิก + ขั้นที่ยังรอ */
const CancelTimeline = ({ r }: { r: Row }) => {
  const chain = parseChain(r.approval_chain)
  const acts = r.cancellation_actions ?? []
  const levelOf = (step: number) => chain.find(c => Number(c.step) === Number(step))?.level_name
  const pending = cancelWaitingOf(r) ? chain.filter(c => Number(c.step) >= Number(r.current_step)) : []
  if (acts.length === 0 && pending.length === 0) return <Text type="secondary">ไม่มีการกดในรอบขอยกเลิก</Text>
  return (
    <Timeline
      items={[
        ...acts.map(a => {
          const rejected = a.action === 'REJECTED'
          return {
            color: rejected ? 'red' : 'green',
            content: (
              <div style={{ lineHeight: 1.5 }}>
                <Space size={8} wrap>
                  <Text strong>ขั้นที่ {a.step}{levelOf(a.step) ? ` · ${levelOf(a.step)}` : ''}</Text>
                  <Tag color={rejected ? 'error' : 'success'} style={{ marginInlineEnd: 0 }}>{rejected ? 'ไม่อนุมัติการยกเลิก' : 'อนุมัติการยกเลิก'}</Tag>
                </Space>
                <div><Text>{a.approver_name ?? '-'}</Text></div>
                <Text type="secondary" style={{ fontSize: 12 }}>{beShort(a.actioned_at)} {dayjs(a.actioned_at).format('HH:mm')} น.</Text>
                {a.comment && <div><Text type="secondary" style={{ fontSize: 12 }}>“{a.comment}”</Text></div>}
              </div>
            ),
          }
        }),
        ...pending.map((c, i) => ({
          color: i === 0 ? 'blue' : 'gray',
          content: (
            <div style={{ lineHeight: 1.5 }}>
              <Space size={8} wrap>
                <Text strong>ขั้นที่ {c.step} · {c.level_name}{c.is_acting && ' (รักษาการ)'}</Text>
                <Tag style={{ marginInlineEnd: 0 }}>{i === 0 ? 'กำลังรอ' : 'ยังไม่ถึงคิว'}</Tag>
              </Space>
              <div><Text type="secondary">{c.approver_name}</Text></div>
            </div>
          ),
        })),
      ]}
    />
  )
}

// ── หน้า ─────────────────────────────────────────────────────────────────────
const StaffLeaveHistoryContent = () => {
  const { message } = App.useApp()
  const router = useRouter()
  // ADMIN / HR ตรวจวันลาได้ · ผอ. / รักษาการ ผอ. ดูอย่างเดียว (backend กั้นปุ่มตรวจด้วย requireRoles)
  const [canEdit, setCanEdit] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [resyncId, setResyncId] = useState<number | null>(null)
  useEffect(() => {
    let roles: string[] = []
    try { roles = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles) } catch { /* cookie เสีย = ไม่มีสิทธิ์แก้ */ }
    void Promise.resolve().then(() => {
      setCanEdit(roles.includes('ADMIN') || roles.includes('HR'))
      setIsAdmin(roles.includes('ADMIN'))
    })
  }, [])
  const { mode } = useThemeMode()
  const [view, setView] = useState<View>('leave')
  const [counts, setCounts] = useState<{
    leave_total: number; cancel_total: number; cancel_pending: number; cancel_approved: number; cancel_rejected: number
  } | null>(null)
  const [fy, setFy] = useState<number | null>(currentFY())
  const [typeId, setTypeId] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [hasDoc, setHasDoc] = useState(false)
  // ช่วงวันที่ — หาผู้ที่ลาคาบเกี่ยวช่วงนี้ (ใช้แทนปีงบ: เลือกช่วงแล้วปีงบเป็น "ทุกปี")
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [years, setYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [types, setTypes] = useState<LeaveType[]>([])
  const [detail, setDetail] = useState<Row | null>(null)
  const [viewingDoc, setViewingDoc] = useState<Row | null>(null)
  const [check, setCheck] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [printing, setPrinting] = useState<{ id: number; data: LeaveFormData | null } | null>(null)

  useEffect(() => {
    fetch('/api/v1/hr/leave-types/full')
      .then(r => r.json())
      .then(j => setTypes(j?.success && Array.isArray(j.data) ? j.data : []))
      .catch(() => setTypes([]))
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ view, page: String(page), page_size: String(pageSize) })
        if (fy) qs.set('fiscal_year', String(fy))
        if (typeId) qs.set('leave_type_id', String(typeId))
        if (status) qs.set('status', status)
        if (hasDoc) qs.set('has_document', '1')
        if (range?.[0]) qs.set('date_from', range[0].format('YYYY-MM-DD'))
        if (range?.[1]) qs.set('date_to', range[1].format('YYYY-MM-DD'))
        if (check) qs.set('check', check)
        if (q) qs.set('q', q)
        const res = await fetch(`/api/v1/hr/leave-requests/staff-history?${qs}`)
        // ไม่ใช่ ADMIN / HR / ผอ. — proxy ไม่ได้กั้นหน้านี้ (สิทธิ์ ผอ. ไม่ได้มาจาก role) จึงพากลับหน้าหลักที่นี่
        if (res.status === 403) { router.replace('/home'); return }
        const j = await res.json()
        if (!alive) return
        if (!j?.success) message.error(j?.message ?? 'โหลดข้อมูลไม่สำเร็จ')
        const data: Row[] = j?.success && Array.isArray(j.data) ? j.data : []
        setRows(data)
        // แผงรายละเอียดที่เปิดอยู่ใช้ข้อมูลล่าสุดหลังบันทึกการตรวจ
        setDetail(d => d ? (data.find(x => x.id === d.id) ?? d) : d)
        setTotal(Number(j?.pagination?.total) || 0)
        setCounts(j?.counts ?? null)
        if (Array.isArray(j?.fiscal_years)) setYears(j.fiscal_years.map(Number))
      } catch {
        if (alive) { setRows([]); setTotal(0) }
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [view, fy, typeId, status, hasDoc, check, range, q, page, pageSize, reloadKey, message, router])

  // เปลี่ยนตัวกรองแล้วกลับไปหน้า 1 เสมอ
  const filter = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1) }
  // สถานะและการตรวจสอบใช้คนละชุดในแต่ละแท็บ — ตัวกรองอื่นคงไว้เพื่อเทียบข้ามแท็บได้
  const changeView = (v: View) => { setView(v); setStatus(null); setCheck(null); setPage(1) }
  const filtersOn = typeId != null || status != null || check != null || hasDoc || q !== '' || range != null
  const clearFilters = () => {
    setTypeId(null); setStatus(null); setCheck(null); setHasDoc(false); setSearch(''); setQ(''); setRange(null); setPage(1)
  }

  const openPrint = async (id: number) => {
    setPrinting({ id, data: null })
    try {
      const j = await (await fetch(`/api/v1/hr/leave-requests/${id}/print`)).json()
      if (!j?.success || !j.data?.request) {
        message.error(j?.message ?? 'โหลดข้อมูลใบลาไม่สำเร็จ')
        setPrinting(null)
        return
      }
      setPrinting({ id, data: buildLeaveFormData(j.data.request, { rows: j.data.rows ?? [], profile: j.data.profile ?? null, approvers: j.data.approvers ?? {} }) })
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
      setPrinting(null)
    }
  }

  // เฉพาะปีงบที่มีใบลาจริง + ปีงบปัจจุบันเสมอ (ยังไม่มีใบก็เลือกได้)
  const fyOptions = [
    { value: 0, label: 'ทุกปีงบประมาณ' },
    ...[...new Set([currentFY(), ...years])].sort((a, b) => b - a).map(y => ({ value: y, label: `ปีงบ ${y}` })),
  ]

  const columns = [
    {
      title: 'ลำดับ', key: 'no', width: 64, align: 'center' as const,
      render: (_: unknown, __: Row, i: number) => <Text type="secondary">{nf((page - 1) * pageSize + i + 1)}</Text>,
    },
    {
      title: 'ชื่อเจ้าหน้าที่', key: 'employee', width: 260,
      render: (_: unknown, r: Row) => (
        <Space size={10}>
          <Avatar size={30} style={{ background: 'var(--app-surface-2, #334155)', fontSize: 13, flexShrink: 0 }}>
            {r.employee_name.replace(/^(นาย|นางสาว|นาง|น\.ส\.|ดร\.|พญ\.|นพ\.|ทพ\.|ภก\.)\s*/, '').charAt(0)}
          </Avatar>
          <div style={{ lineHeight: 1.35 }}>
            <Text strong>{r.employee_name}</Text>
            <div><Text type="secondary" style={{ fontSize: 12 }}>{r.position_name ?? '-'}</Text></div>
          </div>
        </Space>
      ),
    },
    {
      title: 'สังกัด', dataIndex: 'unit_name', key: 'unit', width: 200,
      render: (t: string | null) => <Text style={{ fontSize: 13 }}>{t ?? '-'}</Text>,
    },
    {
      title: 'ประเภทการลา', dataIndex: 'leave_type_name', key: 'type', width: 170,
      render: (t: string, r: Row) => <LeaveTypeTag code={r.leave_type_code} name={t} />,
    },
    {
      title: 'วันที่ยื่นลา', dataIndex: 'created_at', key: 'created', width: 130,
      render: (v: string) => (
        <div style={{ lineHeight: 1.3 }}>
          <Text>{beShort(v)}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{dayjs(v).format('HH:mm')} น.</Text></div>
        </div>
      ),
    },
    {
      title: 'วันที่ลา', key: 'date', width: 210,
      render: (_: unknown, r: Row) => <Text>{dateRange(r)}{halfDayLabel(r)}</Text>,
    },
    {
      title: 'วัน', dataIndex: 'total_days', key: 'days', width: 64, align: 'center' as const,
      render: (v: string | number) => <Text strong>{nf(Number(v))}</Text>,
    },
    {
      title: 'เหตุผล', dataIndex: 'reason', key: 'reason', width: 220,
      render: (t: string | null) => t
        ? <Text style={{ fontSize: 13, maxWidth: 220 }} ellipsis={{ tooltip: t }}>{t}</Text>
        : <Text type="secondary">-</Text>,
    },
    {
      title: 'สถานะ', dataIndex: 'status', key: 'status', width: 140, align: 'center' as const,
      render: (s: string) => {
        // ในแท็บใบลา CANCELLED = ถอนก่อนอนุมัติ (ใบที่มีคำขอยกเลิกอยู่แท็บยกเลิก)
        const m = String(s).toUpperCase() === 'CANCELLED' ? WITHDRAWN_META : statusOf(s)
        return <Tag color={m.color} icon={m.icon} style={{ marginInlineEnd: 0 }}>{m.label}</Tag>
      },
    },
    {
      title: 'ตรวจสอบ', key: 'check', width: 150, align: 'center' as const,
      render: (_: unknown, r: Row) => {
        const m = checkOf(r)
        return <Tag color={m.color} style={{ marginInlineEnd: 0 }}>{m.label}</Tag>
      },
    },
    {
      title: 'ไฟล์แนบ', key: 'doc', width: 80, align: 'center' as const,
      render: (_: unknown, r: Row) => r.document_name
        ? (
          <Tooltip title={`ดูไฟล์แนบ: ${r.document_name}`}>
            <Button type="text" size="small" icon={<PaperClipOutlined style={{ fontSize: 16, color: 'var(--ant-color-primary)' }} />} onClick={() => setViewingDoc(r)} />
          </Tooltip>
        )
        : <Text type="secondary">-</Text>,
    },
    {
      title: '', key: 'act', width: 110, align: 'center' as const, fixed: 'right' as const,
      render: (_: unknown, r: Row) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setDetail(r)}>รายละเอียด</Button>
      ),
    },
  ]

  const col = (key: string) => columns.find(c => c.key === key)!
  const cancelColumns = [
    col('no'),
    {
      title: 'ผู้ขอยกเลิก', key: 'canceller', width: 260,
      render: (_: unknown, r: Row) => {
        const name = cancellerOf(r)
        return (
          <Space size={10}>
            <Avatar size={30} style={{ background: 'var(--app-surface-2, #334155)', fontSize: 13, flexShrink: 0 }}>
              {name.replace(/^(นาย|นางสาว|นาง|น\.ส\.|ดร\.|พญ\.|นพ\.|ทพ\.|ภก\.)\s*/, '').charAt(0)}
            </Avatar>
            <div style={{ lineHeight: 1.35 }}>
              <Text strong>{name}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {name === r.employee_name ? (r.position_name ?? '-') : `ใบลาของ ${r.employee_name}`}
                </Text>
              </div>
            </div>
          </Space>
        )
      },
    },
    col('unit'), col('type'),
    {
      title: 'บันทึกคำขอเมื่อ', key: 'cancel_at', width: 130,
      render: (_: unknown, r: Row) => {
        const at = r.cancellation_created_at ?? r.updated_at
        return (
          <div style={{ lineHeight: 1.3 }}>
            <Text>{beShort(at)}</Text>
            <div><Text type="secondary" style={{ fontSize: 12 }}>{dayjs(at).format('HH:mm')} น.</Text></div>
          </div>
        )
      },
    },
    col('date'), col('days'),
    {
      title: 'เหตุผลที่ขอยกเลิก', dataIndex: 'cancellation_reason', key: 'cancel_reason', width: 220,
      render: (t: string | null) => t
        ? <Text style={{ fontSize: 13, maxWidth: 220 }} ellipsis={{ tooltip: t }}>{t}</Text>
        : <Text type="secondary">-</Text>,
    },
    {
      title: 'สถานะการยกเลิก', key: 'cancel_status', width: 170, align: 'center' as const,
      render: (_: unknown, r: Row) => {
        const m = cancelMetaOf(r)
        return <Tag color={m.color} icon={m.icon} style={{ marginInlineEnd: 0 }}>{m.label}</Tag>
      },
    },
    {
      title: 'ความคืบหน้า', key: 'cancel_progress', width: 260,
      render: (_: unknown, r: Row) => <CancelProgress r={r} />,
    },
    {
      title: 'คืนวันลา', dataIndex: 'cancellation_refunded_days', key: 'cancel_refund', width: 80, align: 'center' as const,
      render: (v: string | number | null) => v != null && Number(v) > 0 ? <Text strong>{nf(Number(v))}</Text> : <Text type="secondary">-</Text>,
    },
    col('doc'), col('act'),
  ]

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-6">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบบริหารการลา</> },
            { title: 'ประวัติการลาเจ้าหน้าที่' },
          ]}
          className="mb-4"
        />
        <div className="mb-4">
          <Title level={3} className="m-0">ประวัติการลาเจ้าหน้าที่</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ใบลาของบุคลากรทุกคน พร้อมรายละเอียด ประวัติการอนุมัติ และไฟล์แนบ (เฉพาะงานทรัพยากรบุคคล / ผู้ดูแลระบบ)
          </Text>
        </div>

        <ConfigProvider theme={{ components: TAB_THEME[mode] }}>
          <Tabs
            activeKey={view}
            onChange={k => changeView(k as View)}
            items={[
              { key: 'leave', label: `ใบลา${counts ? ` (${nf(counts.leave_total)})` : ''}` },
              {
                key: 'cancel',
                label: `ยกเลิก${counts ? ` (รอ ${nf(counts.cancel_pending)} / อนุมัติ ${nf(counts.cancel_approved)})` : ''}`,
              },
            ]}
          />

          {view === 'cancel' && (
            <Segmented
              style={{ marginBottom: 16 }}
              value={status ?? 'ALL'}
              onChange={v => { setStatus(v === 'ALL' ? null : String(v)); setPage(1) }}
              options={[
                { value: 'ALL', label: `ทั้งหมด (${nf(counts?.cancel_total ?? 0)})` },
                { value: 'CANCEL_PENDING', label: `รออนุมัติ (${nf(counts?.cancel_pending ?? 0)})` },
                { value: 'CANCELLED', label: `อนุมัติแล้ว (${nf(counts?.cancel_approved ?? 0)})` },
                ...(counts?.cancel_rejected ? [{ value: 'CANCEL_REJECTED', label: `ไม่อนุมัติ (${nf(counts.cancel_rejected)})` }] : []),
              ]}
            />
          )}
        </ConfigProvider>

        {/* ── ตัวกรอง ─────────────────────────────────────────────────────── */}
        <Card style={{ marginBottom: 16 }} variant="borderless" className="shadow-sm" styles={{ body: { padding: 14 } }}>
          <div className="flex flex-wrap items-center gap-3">
            <Text type="secondary" style={{ fontSize: 12 }}><FilterOutlined /> กรองข้อมูล</Text>
            <Select
              value={fy ?? 0} onChange={filter((v: number) => { setFy(v || null); if (v) setRange(null) })}
              options={fyOptions} style={{ width: 160 }}
            />
            <Tooltip title="แสดงผู้ที่ลาคาบเกี่ยวช่วงนี้ — ใบที่เริ่มก่อนหรือสิ้นสุดหลังช่วงก็นับ">
              <DatePicker.RangePicker
                value={range} format="DD/MM/BBBB" allowEmpty={[true, true]}
                placeholder={['ลาตั้งแต่วันที่', 'ถึงวันที่']} style={{ width: 260 }}
                onChange={v => {
                  const next = v && (v[0] || v[1]) ? [v[0], v[1]] as [Dayjs | null, Dayjs | null] : null
                  setRange(next); if (next) setFy(null); setPage(1)
                }}
                presets={[
                  { label: 'วันนี้', value: [dayjs(), dayjs()] },
                  { label: 'สัปดาห์นี้', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
                  { label: 'เดือนนี้', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                  { label: 'เดือนที่แล้ว', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                ]}
              />
            </Tooltip>
            <Input.Search
              value={search} onChange={e => setSearch(e.target.value)} allowClear
              onSearch={v => { setQ(v.trim()); setPage(1) }}
              placeholder="ค้นหาชื่อ-สกุล" style={{ width: 240 }}
            />
            <Select
              value={typeId} onChange={filter(setTypeId)} allowClear showSearch optionFilterProp="label"
              placeholder="ประเภทการลา (ทั้งหมด)" style={{ minWidth: 220 }}
              options={types.map(t => ({ value: t.id, label: t.name_th.replace(/^การลา/, '') }))}
            />
            {view === 'leave' && (
              <>
                <Select
                  value={status} onChange={filter(setStatus)} allowClear
                  placeholder="สถานะ (ทั้งหมด)" style={{ minWidth: 190 }}
                  options={[
                    ...LEAVE_STATUS.map(value => ({ value, label: STATUS_META[value].label })),
                    { value: 'CANCELLED', label: WITHDRAWN_META.label },
                  ]}
                />
                <Select
                  value={check} onChange={filter(setCheck)} allowClear
                  placeholder="การตรวจสอบ (ทั้งหมด)" style={{ minWidth: 190 }}
                  options={Object.entries(CHECK_META).map(([value, m]) => ({ value, label: m.label }))}
                />
              </>
            )}
            <Checkbox checked={hasDoc} onChange={e => { setHasDoc(e.target.checked); setPage(1) }}>
              เฉพาะที่มีไฟล์แนบ
            </Checkbox>
            <Button type="text" size="small" icon={<ClearOutlined />} disabled={!filtersOn} onClick={clearFilters}>
              ล้างตัวกรอง
            </Button>
          </div>
        </Card>

        <Card variant="borderless" className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <Table<Row>
            columns={view === 'cancel' ? cancelColumns : columns}
            dataSource={rows}
            rowKey="id"
            loading={loading}
            size="middle"
            scroll={{ x: 'max-content' }}
            onRow={r => ({ onDoubleClick: () => setDetail(r) })}
            pagination={{
              current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: [20, 50, 100],
              showTotal: t => `ทั้งหมด ${nf(t)} ใบ`,
              onChange: (p, s) => { setPage(s !== pageSize ? 1 : p); setPageSize(s) },
            }}
            locale={{ emptyText: <Empty description="ไม่พบใบลาตามเงื่อนไขที่เลือก" /> }}
          />
        </Card>
      </div>

      {/* ── รายละเอียดใบลา ── */}
      <Drawer
        title={detail ? <span>{lvNo(detail.id)} · {detail.employee_name}</span> : 'รายละเอียดใบลา'}
        open={detail != null}
        onClose={() => setDetail(null)}
        size={720}
        destroyOnHidden
        extra={detail && (
          <Button
            icon={<PrinterOutlined />}
            loading={printing?.id === detail.id && !printing.data}
            onClick={() => openPrint(detail.id)}
          >
            พิมพ์ใบลา
          </Button>
        )}
      >
        {detail && (
          <Space orientation="vertical" size={20} style={{ width: '100%' }}>
            <Descriptions
              column={1} size="small" bordered
              styles={{ label: { width: 160 } }}
              items={[
                { key: 'emp', label: 'ผู้ลา', children: detail.employee_name },
                { key: 'pos', label: 'ตำแหน่ง', children: detail.position_name ?? '-' },
                { key: 'utype', label: 'ประเภทบุคลากร', children: detail.user_type_name ?? '-' },
                { key: 'unit', label: 'สังกัด', children: detail.unit_name ?? '-' },
                { key: 'type', label: 'ประเภทการลา', children: <LeaveTypeTag code={detail.leave_type_code} name={detail.leave_type_name} /> },
                { key: 'date', label: 'วันที่ลา', children: `${dateRange(detail)}${halfDayLabel(detail)}` },
                { key: 'days', label: 'จำนวนวัน', children: `${nf(Number(detail.total_days))} วัน` },
                {
                  key: 'status', label: 'สถานะ',
                  children: (() => {
                    const m = statusOf(detail.status)
                    return <Tag color={m.color} icon={m.icon} style={{ marginInlineEnd: 0 }}>{m.label}</Tag>
                  })(),
                },
                { key: 'reason', label: 'เหตุผล', children: detail.reason || '-' },
                ...(detail.reject_reason ? [{ key: 'rej', label: 'เหตุผลที่ไม่อนุมัติ', children: detail.reject_reason }] : []),
                ...(hasCancellation(detail) ? [{ key: 'canceller', label: 'ผู้ขอยกเลิก', children: cancellerOf(detail) }] : []),
                ...(detail.cancellation_reason ? [{ key: 'cancel', label: 'เหตุผลที่ขอยกเลิก', children: detail.cancellation_reason }] : []),
                { key: 'contact', label: 'ติดต่อระหว่างลา', children: detail.contact_info || '-' },
                { key: 'sub', label: 'ผู้ปฏิบัติหน้าที่แทน', children: detail.substitute_name || '-' },
                {
                  key: 'created', label: 'ยื่นเมื่อ',
                  children: `${beShort(detail.created_at)} ${dayjs(detail.created_at).format('HH:mm')} น.`,
                },
              ]}
            />

            <div>
              <Title level={5}>การตรวจสอบของงาน HR</Title>
              <DayCheck key={`${detail.id}-${detail.day_checked_at ?? ''}-${detail.total_days}-${detail.start_date}-${detail.end_date}`} r={detail} readOnly={!canEdit}
                leaveTypeId={types.find(t => t.code === detail.leave_type_code)?.id ?? null} onDone={() => setReloadKey(k => k + 1)} />
            </div>

            <div>
              <Title level={5}>ไฟล์แนบ</Title>
              <Attachment r={detail} onOpen={() => setViewingDoc(detail)} />
            </div>

            <div>
              <Title level={5}>ประวัติการอนุมัติ</Title>
              <ApprovalTimeline r={detail} />
              {isAdmin && (
                <Button size="small" icon={<SyncOutlined />} className="mt-2" onClick={() => setResyncId(detail.id)}>
                  ตรวจ / ปรับสายอนุมัติตามผัง
                </Button>
              )}
            </div>

            {hasCancellation(detail) && (
              <div>
                <Space size={8} wrap className="mb-2">
                  <Title level={5} style={{ margin: 0 }}>การขอยกเลิก</Title>
                  {(() => {
                    const m = cancelMetaOf(detail)
                    return <Tag color={m.color} icon={m.icon} style={{ marginInlineEnd: 0 }}>{m.label}</Tag>
                  })()}
                  {Number(detail.cancellation_refunded_days) > 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>คืนวันลา {nf(Number(detail.cancellation_refunded_days))} วัน</Text>
                  )}
                </Space>
                <CancelTimeline r={detail} />
              </div>
            )}
          </Space>
        )}
      </Drawer>

      <ChainResyncModal
        requestId={resyncId}
        onClose={() => setResyncId(null)}
        onDone={() => { setResyncId(null); setDetail(null); setReloadKey(k => k + 1) }}
      />

      {/* ── ไฟล์แนบ ── */}
      <AttachmentModal
        doc={viewingDoc && viewingDoc.document_name ? {
          id: viewingDoc.id, name: viewingDoc.document_name, title: viewingDoc.employee_name,
          subtitle: `${viewingDoc.leave_type_name.replace(/^การลา/, '')} · ${dateRange(viewingDoc)}`,
        } : null}
        onClose={() => setViewingDoc(null)}
      />

      {/* ── พิมพ์แบบใบลา ── */}
      <Modal
        title={<span><PrinterOutlined className="mr-2" />แบบใบลา — {lvNo(printing?.id ?? 0)}</span>}
        open={!!printing?.data}
        onCancel={() => setPrinting(null)}
        width="92vw"
        style={{ top: 16 }}
        styles={{ body: { height: '80vh', padding: 0 } }}
        footer={null}
        destroyOnHidden
      >
        {printing?.data ? <LeaveFormPDF data={printing.data} /> : <Spin />}
      </Modal>
    </div>
  )
}

const StaffLeaveHistoryPage = () => (
  <AppThemeProvider colorPrimary="#10b981">
    <StaffLeaveHistoryContent />
  </AppThemeProvider>
)

export default StaffLeaveHistoryPage
