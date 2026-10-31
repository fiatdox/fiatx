'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Table, Tag, Card, Typography, Space, Button, Empty, Modal,
  Segmented, Steps, Timeline, Descriptions, Alert, App, Input, Form, Popconfirm, Select,
} from 'antd'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import {
  HomeOutlined, FileTextOutlined, PrinterOutlined, EyeOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  ReloadOutlined, RollbackOutlined, FilterOutlined, DeleteOutlined, EditOutlined, UserSwitchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Cookies from 'js-cookie'
import dynamic from 'next/dynamic'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import { normalizeRoles } from '@/app/lib/menuAccess'
import DayCheckBadge, { dayCheckDetail, type DayCheckInfo } from '../DayCheckBadge'
import type { LeaveFormData } from '@/app/components/LeaveFormPDF'
import {
  beShort, nf, parseChain, buildLeaveFormData,
  type ApiChainStep, type ApiAction, type LeaveProfile, type Approvers,
} from '@/app/lib/leaveFormData'

// ประเภทที่มีแบบฟอร์มของตัวเอง: แบบใบลาพักผ่อน / แบบใบลาป่วย กิจส่วนตัว ลาคลอดบุตร — ประเภทอื่นยืมแบบใบลาพักผ่อน
const OWN_FORM_CODES = ['ANNUAL', 'SICK', 'PERS', 'MAT']

// react-pdf เรนเดอร์ฝั่ง server ไม่ได้ ต้องโหลดตอน client เท่านั้น
const LeaveFormPDF = dynamic(() => import('@/app/components/LeaveFormPDF'), {
  ssr: false,
  loading: () => <div style={{ padding: 24 }}>กำลังเตรียมเอกสาร...</div>,
})

const { Title, Text } = Typography

// ── ข้อมูลจาก API ────────────────────────────────────────────────────────────
interface ApiRow extends DayCheckInfo {
  id: number
  leave_type_id: number
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
  current_step: number
  approval_chain: ApiChainStep[] | string | null
  actions: ApiAction[]
  created_at: string
  fiscal_year: number
  carried_in: number
  entitled_per_year: number | null
  cancellation_id: number | null
  cancellation_status: string | null
  cancellation_reason: string | null
  /** คำขอยกเลิกรอบล่าสุด — ขอใหม่ได้ถ้ารอบก่อนไม่ได้รับอนุมัติ */
  cancellation_refunded_days: string | number | null
  cancellation_reject_comment: string | null
  substitute_name: string | null
  contact_info: string | null
}
const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'ร่าง', color: 'default', icon: <FileTextOutlined /> },
  PENDING: { label: 'รออนุมัติ', color: 'warning', icon: <ClockCircleOutlined /> },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'success', icon: <CheckCircleOutlined /> },
  REJECTED: { label: 'ไม่อนุมัติ', color: 'error', icon: <CloseCircleOutlined /> },
  CANCEL_PENDING: { label: 'รออนุมัติยกเลิก', color: 'processing', icon: <RollbackOutlined /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'default', icon: <RollbackOutlined /> },
}
const statusOf = (s: string) => STATUS_META[String(s).toUpperCase()] ?? STATUS_META.PENDING

type FilterKey = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

// ─── หน้า ─────────────────────────────────────────────────────────────────────
const LeaveHistoryContent = () => {
  const { message } = App.useApp()
  // ADMIN / HR แก้ใบลาของตัวเองได้แม้งาน HR ตรวจแล้ว — ผู้ลาทั่วไปแก้ไม่ได้ (backend ตรวจซ้ำ)
  const [isHr, setIsHr] = useState(false)
  // ADMIN: ดูประวัติการลาของบุคลากรคนอื่นแบบที่เจ้าตัวเห็น — อ่านอย่างเดียว ไม่มีปุ่มแก้ไข / ลบ / ถอน / ขอยกเลิก
  const [isAdmin, setIsAdmin] = useState(false)
  const [viewAs, setViewAs] = useState<number | null>(null)
  const [staffOptions, setStaffOptions] = useState<{ value: number; label: string }[]>([])
  const readOnly = viewAs != null
  useEffect(() => {
    let hr = false, admin = false
    try {
      const roles = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles)
      hr = roles.some(r => r === 'ADMIN' || r === 'HR')
      admin = roles.includes('ADMIN')
    } catch { /* cookie เสีย = ผู้ใช้ทั่วไป */ }
    void Promise.resolve().then(() => { setIsHr(hr); setIsAdmin(admin) })
    if (!admin) return
    fetch('/api/v1/users')
      .then(r => r.json())
      .then(j => {
        if (!j?.success || !Array.isArray(j.data)) return
        setStaffOptions(j.data
          .filter((u: { is_active?: string }) => u.is_active !== 'N')
          .map((u: { id: number; pname?: string; fname?: string; lname?: string; position_name?: string }) => ({
            value: Number(u.id),
            label: `${u.pname ?? ''}${u.fname ?? ''} ${u.lname ?? ''}`.trim() + (u.position_name ? ` · ${u.position_name}` : ''),
          })))
      })
      .catch(() => { /* ไม่มีรายชื่อ = ใช้โหมดนี้ไม่ได้ */ })
  }, [])
  const [rows, setRows] = useState<ApiRow[]>([])
  const [profile, setProfile] = useState<LeaveProfile | null>(null)
  const [approvers, setApprovers] = useState<Approvers>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('ALL')
  const [detail, setDetail] = useState<ApiRow | null>(null)
  const [printing, setPrinting] = useState<ApiRow | null>(null)
  const [cancelling, setCancelling] = useState<ApiRow | null>(null)
  const [cancelForm] = Form.useForm()
  const [acting, setActing] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const json = await (await fetch(`/api/v1/hr/leave-requests/mine${viewAs ? `?as_user_id=${viewAs}` : ''}`)).json()
      if (json?.success && Array.isArray(json.data)) {
        setRows(json.data)
        setProfile(json.profile ?? null)
        setApprovers(json.approvers ?? {})
      } else {
        setRows([])
      }
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [viewAs])

  useEffect(() => { reload() }, [reload])

  const fullName = useMemo(() => {
    if (!profile) return ''
    return `${profile.pname ?? ''}${profile.fname ?? ''} ${profile.lname ?? ''}`.replace(/\s+/g, ' ').trim()
  }, [profile])

  const filtered = useMemo(() => rows.filter(r => {
    const st = String(r.status).toUpperCase()
    switch (filter) {
      case 'PENDING': return st === 'PENDING' || st === 'CANCEL_PENDING'
      case 'APPROVED': return st === 'APPROVED'
      case 'REJECTED': return st === 'REJECTED' || st === 'CANCELLED'
      default: return true
    }
  }), [rows, filter])

  const summary = useMemo(() => {
    const st = (s: string) => rows.filter(r => String(r.status).toUpperCase() === s)
    const approvedDays = st('APPROVED').reduce((a, r) => a + Number(r.total_days), 0)
    return {
      total: rows.length,
      pending: st('PENDING').length + st('CANCEL_PENDING').length,
      approved: st('APPROVED').length,
      approvedDays,
    }
  }, [rows])

  // ── ขอยกเลิกใบที่อนุมัติแล้ว ──────────────────────────────────────────────
  const submitCancel = async () => {
    const values = await cancelForm.validateFields()
    if (!cancelling) return
    setActing(true)
    try {
      const res = await fetch(`/api/v1/hr/leave-requests/${cancelling.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: values.reason }),
      })
      const json = await res.json()
      if (!json?.success) { message.error(json?.message ?? 'ส่งคำขอยกเลิกไม่สำเร็จ'); return }
      message.success(json.message ?? 'ส่งคำขอยกเลิกเรียบร้อย')
      setCancelling(null)
      cancelForm.resetFields()
      await reload()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setActing(false)
    }
  }

  /** ใบที่ยังไม่มีผู้อนุมัติคนใดกดเลย ลบทิ้งหรือแก้ไขได้ (แก้ไขที่ฟอร์ม /hr/leave/new?edit=<id>) */
  const removeRequest = async (r: ApiRow) => {
    setActing(true)
    try {
      const res = await fetch(`/api/v1/hr/leave-requests/${r.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json?.success) { message.error(json?.message ?? 'ลบใบลาไม่สำเร็จ'); return }
      message.success(json.message ?? 'ลบใบลาเรียบร้อย')
      await reload()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setActing(false)
    }
  }

  /** มีคนในสายอนุมัติกดไปแล้ว ลบไม่ได้ — ถอนใบแทน เพื่อเก็บประวัติการกดไว้ */
  const withdraw = async (r: ApiRow) => {
    setActing(true)
    try {
      const res = await fetch(`/api/v1/hr/leave-requests/${r.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'ผู้ยื่นขอถอนใบลา' }),
      })
      const json = await res.json()
      if (!json?.success) { message.error(json?.message ?? 'ถอนใบลาไม่สำเร็จ'); return }
      message.success(json.message ?? 'ถอนใบลาเรียบร้อย')
      await reload()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setActing(false)
    }
  }

  // ── แปลงใบลาหนึ่งใบเป็นข้อมูลสำหรับแบบฟอร์มที่พิมพ์ ────────────────────────
  const toFormData = (r: ApiRow): LeaveFormData => buildLeaveFormData(r, { rows, profile, approvers })

  const columns = [
    {
      title: 'เลขที่ใบลา', dataIndex: 'id', key: 'id', width: 120,
      render: (v: number, r: ApiRow) => (
        <div style={{ lineHeight: 1.35 }}>
          <Text strong style={{ fontSize: 12 }}>LV-{String(v).padStart(6, '0')}</Text>
          <div style={{ fontSize: 11, color: 'var(--app-text-2)' }}>ยื่น {beShort(r.created_at)}</div>
        </div>
      ),
    },
    {
      title: 'ประเภทการลา', dataIndex: 'leave_type_name', key: 'type', width: 180,
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'ช่วงวันที่ลา', key: 'range', width: 220,
      render: (_: unknown, r: ApiRow) => (
        <div style={{ lineHeight: 1.35 }}>
          <div style={{ fontSize: 12 }}>{beShort(r.start_date)} – {beShort(r.end_date)}</div>
          <Space size={4} wrap>
            <Tag color="green" style={{ marginInlineEnd: 0, fontSize: 11 }}>
              {nf(Number(r.total_days))} วัน{r.is_half_day ? ` (ครึ่งวัน${r.half_day_period === 'PM' ? 'บ่าย' : 'เช้า'})` : ''}
            </Tag>
            <DayCheckBadge c={r} />
          </Space>
        </div>
      ),
    },
    {
      title: 'ปีงบ', dataIndex: 'fiscal_year', key: 'fy', width: 80, align: 'center' as const,
      render: (v: number) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'สถานะ', key: 'status', width: 200,
      render: (_: unknown, r: ApiRow) => {
        const m = statusOf(r.status)
        const chain = parseChain(r.approval_chain)
        const waiting = chain.find(c => Number(c.step) === Number(r.current_step))
        return (
          <div style={{ lineHeight: 1.35 }}>
            <Tag icon={m.icon} color={m.color} style={{ marginInlineEnd: 0 }}>{m.label}</Tag>
            {['PENDING', 'CANCEL_PENDING'].includes(String(r.status).toUpperCase()) && waiting && (
              <div style={{ fontSize: 11, color: 'var(--app-text-2)' }}>
                รอ{waiting.level_name} · {waiting.approver_name}
              </div>
            )}
            {String(r.status).toUpperCase() === 'CANCELLED' && Number(r.cancellation_refunded_days) > 0 && (
              <div style={{ fontSize: 11, color: 'var(--app-text-2)' }}>
                คืนวันลา {nf(Number(r.cancellation_refunded_days))} วัน
              </div>
            )}
            {String(r.status).toUpperCase() === 'APPROVED' && r.cancellation_status === 'REJECTED' && (
              <div style={{ fontSize: 11, color: 'var(--ant-color-error)' }}>ไม่อนุมัติการยกเลิก</div>
            )}
          </div>
        )
      },
    },
    {
      title: 'จัดการ', key: 'action', align: 'center' as const, width: 280, fixed: 'right' as const,
      render: (_: unknown, r: ApiRow) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetail(r)}>รายละเอียด</Button>
          <Button size="small" type="primary" icon={<PrinterOutlined />} onClick={() => setPrinting(r)}>พิมพ์</Button>
          {/* ยังไม่มีผู้อนุมัติคนใดกด = ลบทิ้งได้ · กดไปแล้ว = ถอนใบ เก็บประวัติไว้ */}
          {!readOnly && String(r.status).toUpperCase() === 'PENDING' && (
            (r.actions?.length ?? 0) === 0 ? (
              <>
              {(!r.day_check_status || isHr) && (
                <Button size="small" icon={<EditOutlined />} href={`/hr/leave/new?edit=${r.id}`}>แก้ไข</Button>
              )}
              <Popconfirm
                title="ลบใบลานี้"
                description="ยังไม่มีผู้อนุมัติคนใดดำเนินการ ลบออกจากระบบถาวร"
                okText="ลบ" okButtonProps={{ danger: true }} cancelText="ปิด"
                onConfirm={() => removeRequest(r)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} loading={acting}>ลบ</Button>
              </Popconfirm>
              </>
            ) : (
              <Popconfirm
                title="ถอนใบลานี้"
                description="มีผู้อนุมัติดำเนินการไปแล้ว ลบไม่ได้ — ถอนใบเพื่อเก็บประวัติไว้"
                okText="ถอนใบลา" cancelText="ปิด"
                onConfirm={() => withdraw(r)}
              >
                <Button size="small" danger icon={<RollbackOutlined />} loading={acting}>ถอน</Button>
              </Popconfirm>
            )
          )}
          {!readOnly && String(r.status).toUpperCase() === 'APPROVED' && r.cancellation_status !== 'PENDING' && (
            <Button
              size="small" danger icon={<RollbackOutlined />}
              onClick={() => { setCancelling(r); cancelForm.resetFields() }}
            >
              ขอยกเลิก
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const statCards = [
    { label: 'ใบลาทั้งหมด', value: nf(summary.total), unit: 'ใบ', color: '#8b5cf6' },
    { label: 'รออนุมัติ', value: nf(summary.pending), unit: 'ใบ', color: '#f59e0b' },
    { label: 'อนุมัติแล้ว', value: nf(summary.approved), unit: 'ใบ', color: '#10b981' },
    { label: 'วันลาที่อนุมัติแล้ว', value: nf(summary.approvedDays), unit: 'วัน', color: '#0ea5e9' },
  ]

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-6">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบบริหารการลา</> },
            { title: 'ประวัติการลาของฉัน' },
          ]}
          className="mb-4"
        />

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={3} className="m-0">{readOnly ? 'ประวัติการลา' : 'ประวัติการลาของฉัน'}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {readOnly ? 'ใบลาทุกใบของบุคลากรที่เลือก (ดูอย่างเดียว)' : 'ใบลาทุกใบที่ท่านยื่น พร้อมพิมพ์แบบใบลาเพื่อเสนอลงนาม'}
              {fullName && <> · {fullName}</>}
            </Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={reload}>รีเฟรช</Button>
            {!readOnly && <Button type="primary" href="/hr/leave/new">ยื่นใบลาใหม่</Button>}
          </Space>
        </div>

        {isAdmin && (
          <Card variant="borderless" className="mb-3 shadow-sm" styles={{ body: { padding: 14 } }}>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <Text strong style={{ whiteSpace: 'nowrap' }}><UserSwitchOutlined /> ดูแบบเจ้าหน้าที่ (ADMIN)</Text>
              <Select
                showSearch allowClear
                className="w-full md:max-w-120"
                placeholder="ดูของตัวเอง — หรือค้นหาชื่อบุคลากรเพื่อดูประวัติการลาแบบที่เจ้าตัวเห็น"
                options={staffOptions}
                value={viewAs ?? undefined}
                optionFilterProp="label"
                onChange={(v?: number) => { setViewAs(v ?? null); setDetail(null); setFilter('ALL') }}
              />
            </div>
            {readOnly ? (
              <Alert
                className="mt-3" type="warning" showIcon
                title={`กำลังดูแบบ ${staffOptions.find(o => o.value === viewAs)?.label ?? `ผู้ใช้ #${viewAs}`}`}
                description="โหมดดูอย่างเดียว — ไม่มีสิทธิ์แก้ไข ลบ ถอน หรือขอยกเลิกใบลาแทนเจ้าหน้าที่ (ดูรายละเอียดและพิมพ์แบบใบลาได้)"
              />
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ใช้ตรวจสอบว่าเจ้าหน้าที่แต่ละคนเห็นประวัติการลาของตัวเองอย่างไร · อ่านอย่างเดียว
              </Text>
            )}
          </Card>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map(c => (
            <Card key={c.label} variant="borderless" className="rounded-xl shadow-sm" styles={{ body: { padding: 16 } }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{c.label}</Text>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: c.color }}>
                {c.value} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--app-text-2)' }}>{c.unit}</span>
              </div>
            </Card>
          ))}
        </div>

        <Card style={{ marginBottom: 12 }} variant="borderless" className="shadow-sm" styles={{ body: { padding: 14 } }}>
          <div className="flex flex-wrap items-center gap-3">
            <Text type="secondary" style={{ fontSize: 12 }}><FilterOutlined /> กรองสถานะ</Text>
            <Segmented
              value={filter}
              onChange={v => setFilter(v as FilterKey)}
              options={[
                { value: 'ALL', label: `ทั้งหมด (${rows.length})` },
                { value: 'PENDING', label: 'รออนุมัติ' },
                { value: 'APPROVED', label: 'อนุมัติแล้ว' },
                { value: 'REJECTED', label: 'ไม่อนุมัติ / ยกเลิก' },
              ]}
            />
          </div>
        </Card>

        <Card
          variant="borderless"
          className="rounded-xl shadow-sm"
          title={<span style={{ fontSize: 15, fontWeight: 600 }}>รายการใบลา</span>}
          extra={<Tag>{filtered.length} ใบ</Tag>}
        >
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 15, showTotal: t => `ทั้งหมด ${t} ใบ` }}
            locale={{ emptyText: <Empty description="ยังไม่มีใบลาในระบบ" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Card>
      </div>

      {/* ── รายละเอียดใบลา ── */}
      <Modal
        title={detail ? (
          <Space size={10} wrap>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              ใบลา LV-{String(detail.id).padStart(6, '0')}
            </span>
            <Tag icon={statusOf(detail.status).icon} color={statusOf(detail.status).color} style={{ marginInlineEnd: 0 }}>
              {statusOf(detail.status).label}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {detail.leave_type_name} · {nf(Number(detail.total_days))} วัน
            </Text>
          </Space>
        ) : ''}
        open={!!detail}
        onCancel={() => setDetail(null)}
        width="min(1040px, 94vw)"
        styles={{ body: { maxHeight: '72vh', overflowY: 'auto', paddingTop: 8 } }}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>ปิด</Button>
            <Button type="primary" icon={<PrinterOutlined />} onClick={() => { setPrinting(detail); setDetail(null) }}>
              พิมพ์แบบใบลา
            </Button>
          </Space>
        }
      >
        {detail && (() => {
          const chain = parseChain(detail.approval_chain)
          const actionOf = (step: number) => detail.actions?.find(a => Number(a.step) === Number(step))
          const st = String(detail.status).toUpperCase()
          return (
            <div>
              {/* ความคืบหน้าอยู่บนสุด — เป็นสิ่งที่ผู้ยื่นอยากรู้ก่อนเพื่อน */}
              {chain.length > 0 && (
                <Card
                  variant="borderless"
                  className="rounded-xl"
                  styles={{ body: { padding: '18px 20px 6px' } }}
                  style={{ marginBottom: 12, background: 'var(--app-surface)' }}
                >
                  <Steps
                    size="small"
                    current={st === 'APPROVED' ? chain.length : Number(detail.current_step) - 1}
                    status={st === 'REJECTED' ? 'error' : st === 'APPROVED' ? 'finish' : 'process'}
                    items={chain.map(c => ({
                      title: c.level_name,
                      content: (
                        <span style={{ fontSize: 12 }}>
                          {c.approver_name}{c.is_acting && ' (รักษาการ)'}
                        </span>
                      ),
                    }))}
                  />
                </Card>
              )}

              <Descriptions style={{ marginBottom: 12 }}
                bordered
                size="small"
                column={{ xs: 1, sm: 2, md: 3 }}
               
                styles={{ label: { width: 110, whiteSpace: 'nowrap' } }}
              >
                <Descriptions.Item label="ประเภทการลา">{detail.leave_type_name}</Descriptions.Item>
                <Descriptions.Item label="ช่วงวันที่">
                  {beShort(detail.start_date)} – {beShort(detail.end_date)}
                </Descriptions.Item>
                <Descriptions.Item label="จำนวนวัน">
                  <Text strong style={{ color: '#10b981' }}>{nf(Number(detail.total_days))} วัน</Text>
                  {' '}<DayCheckBadge c={detail} showPending={['PENDING', 'APPROVED', 'CANCEL_PENDING'].includes(String(detail.status).toUpperCase())} />
                  {detail.day_check_status && (
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{dayCheckDetail(detail)}</Text></div>
                  )}
                  {detail.day_check_status && !isHr && (
                    <div><Text type="secondary" style={{ fontSize: 12 }}>งาน HR ตรวจจำนวนวันแล้ว — ผู้ลาแก้ไขใบนี้ไม่ได้ ติดต่องาน HR หากต้องแก้ไข</Text></div>
                  )}
                  {detail.is_half_day && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {' '}(ครึ่งวัน{detail.half_day_period === 'PM' ? 'บ่าย' : 'เช้า'})
                    </Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="ปีงบประมาณ">{detail.fiscal_year}</Descriptions.Item>
                <Descriptions.Item label="ยื่นเมื่อ">{beShort(detail.created_at)}</Descriptions.Item>
                <Descriptions.Item label="สิทธิ์ที่ใช้อ้างอิง">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ยกมา {nf(Number(detail.carried_in) || 0)} วัน
                    {detail.entitled_per_year != null && ` · ประจำปี ${nf(detail.entitled_per_year)} วัน`}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="เหตุผล" span="filled">
                  {detail.reason || '-'}
                </Descriptions.Item>
                {detail.contact_info && (
                  <Descriptions.Item label="ติดต่อระหว่างลา" span="filled">{detail.contact_info}</Descriptions.Item>
                )}
                {detail.substitute_name && (
                  <Descriptions.Item label="ผู้ปฏิบัติงานแทน" span="filled">{detail.substitute_name}</Descriptions.Item>
                )}
                {detail.reject_reason && (
                  <Descriptions.Item label="เหตุผลที่ไม่อนุมัติ" span="filled">
                    <Text type="danger">{detail.reject_reason}</Text>
                  </Descriptions.Item>
                )}
                {detail.cancellation_reason && (
                  <Descriptions.Item label="เหตุผลที่ขอยกเลิก" span="filled">
                    {detail.cancellation_reason}
                  </Descriptions.Item>
                )}
                {detail.cancellation_status === 'REJECTED' && (
                  <Descriptions.Item label="ไม่อนุมัติการยกเลิก" span="filled">
                    <Text type="danger">{detail.cancellation_reject_comment || '-'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}> · ยังลาตามเดิม ขอยกเลิกใหม่ได้</Text>
                  </Descriptions.Item>
                )}
                {detail.cancellation_status === 'APPROVED' && (
                  <Descriptions.Item label="คืนวันลา" span="filled">
                    {nf(Number(detail.cancellation_refunded_days) || 0)} วัน
                  </Descriptions.Item>
                )}
              </Descriptions>

              {chain.length > 0 && (
                <Card
                  variant="borderless"
                  className="rounded-xl"
                  style={{ background: 'var(--app-surface)' }}
                  title={<span style={{ fontSize: 13 }}>ประวัติการอนุมัติ</span>}
                  styles={{ body: { paddingBottom: 0 } }}
                >
                  <Timeline
                    items={chain.map(c => {
                      const act = actionOf(c.step)
                      const waiting = !act && Number(c.step) === Number(detail.current_step) && st === 'PENDING'
                      return {
                        color: act ? (act.action === 'REJECTED' ? 'red' : 'green') : waiting ? 'blue' : 'gray',
                        content: (
                          <div style={{ lineHeight: 1.5 }}>
                            <Space size={8} wrap>
                              <Text strong>ขั้นที่ {c.step} · {c.level_name}{c.is_acting && ' (รักษาการ)'}</Text>
                              {act
                                ? <Tag color={act.action === 'REJECTED' ? 'error' : 'success'} style={{ marginInlineEnd: 0 }}>
                                  {act.action === 'REJECTED' ? 'ไม่อนุมัติ' : 'อนุมัติ'}
                                </Tag>
                                : waiting
                                  ? <Tag color="warning" style={{ marginInlineEnd: 0 }}>กำลังรอ</Tag>
                                  : <Tag style={{ marginInlineEnd: 0 }}>ยังไม่ถึงคิว</Tag>}
                              {act && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {dayjs(act.actioned_at).format('DD/MM/')}{dayjs(act.actioned_at).year() + 543}
                                  {dayjs(act.actioned_at).format(' HH:mm')} น.
                                </Text>
                              )}
                            </Space>
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {c.approver_name}{c.unit_name ? ` — ${c.unit_name}` : ''}
                              </Text>
                            </div>
                            {act?.comment && act.comment !== 'อนุมัติ' && (
                              <div style={{ fontSize: 12, color: '#fbbf24' }}>“{act.comment}”</div>
                            )}
                          </div>
                        ),
                      }
                    })}
                  />
                </Card>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* ── พิมพ์แบบใบลา ── */}
      <Modal
        title={<span><PrinterOutlined className="mr-2" />แบบใบลา — LV-{String(printing?.id ?? 0).padStart(6, '0')}</span>}
        open={!!printing}
        onCancel={() => setPrinting(null)}
        width="92vw"
        style={{ top: 16 }}
        styles={{ body: { height: '80vh', padding: 0 } }}
        footer={null}
        destroyOnHidden
      >
        {printing && (
          <>
            {!OWN_FORM_CODES.includes(String(printing.leave_type_code)) && (
              <Alert
                type="info"
                showIcon
                style={{ margin: 12 }}
                title="แบบฟอร์มนี้ใช้โครงเดียวกับแบบใบลาพักผ่อน"
                description="ประเภทการลานี้ยังไม่มีแบบฟอร์มเฉพาะในระบบ — ตัดส่วนวันลาสะสม/สิทธิ์ออกแล้ว กรุณาตรวจก่อนเสนอลงนาม"
              />
            )}
            <div style={{ height: !OWN_FORM_CODES.includes(String(printing.leave_type_code)) ? 'calc(80vh - 96px)' : '80vh' }}>
              <LeaveFormPDF data={toFormData(printing)} />
            </div>
          </>
        )}
      </Modal>

      {/* ── ขอยกเลิกใบลา ── */}
      <Modal
        title="ขอยกเลิกใบลา"
        open={!!cancelling}
        onCancel={() => setCancelling(null)}
        onOk={submitCancel}
        confirmLoading={acting}
        okText="ส่งคำขอยกเลิก"
        cancelText="ปิด"
      >
        <Alert style={{ marginBottom: 12 }}
          type="warning"
          showIcon
         
          title="คำขอยกเลิกต้องผ่านการอนุมัติตามสายเดิมอีกครั้ง"
          description={`เมื่อผู้บังคับบัญชาอนุมัติการยกเลิกครบทุกขั้น ระบบจะคืนวันลา ${nf(Number(cancelling?.total_days) || 0)} วันเข้ายอดคงเหลือให้อัตโนมัติ`}
        />
        <Form form={cancelForm} layout="vertical">
          <Form.Item name="reason" label="เหตุผลที่ขอยกเลิก" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
            <Input.TextArea rows={3} placeholder="ระบุเหตุผล..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

const LeaveHistoryPage = () => (
  <AppThemeProvider colorPrimary="#10b981">
    <LeaveHistoryContent />
  </AppThemeProvider>
)

export default LeaveHistoryPage
