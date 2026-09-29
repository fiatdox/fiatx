'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, Space, Button, Empty, Modal,
  Segmented, Steps, Timeline, Descriptions, Alert, App, Input, Form, Popconfirm,
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, PrinterOutlined, EyeOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  ReloadOutlined, RollbackOutlined, FilterOutlined, DeleteOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import dynamic from 'next/dynamic'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import type { LeaveFormData } from '@/app/components/LeaveFormPDF'

// react-pdf เรนเดอร์ฝั่ง server ไม่ได้ ต้องโหลดตอน client เท่านั้น
const LeaveFormPDF = dynamic(() => import('@/app/components/LeaveFormPDF'), {
  ssr: false,
  loading: () => <div style={{ padding: 24 }}>กำลังเตรียมเอกสาร...</div>,
})

const { Title, Text } = Typography

// ── ข้อมูลหน่วยงานที่พิมพ์ลงหัวกระดาษ ────────────────────────────────────────
// ยังไม่มีตารางตั้งค่าระดับองค์กรในระบบ จึงกำหนดไว้ที่นี่ก่อน
const ORG_NAME = 'โรงพยาบาลพะเยา'
const PROVINCE_OFFICE = 'สำนักงานสาธารณสุขจังหวัดพะเยา'

const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const TH_MONTH_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const beShort = (v: string) => {
  const d = dayjs(v)
  return `${d.date()} ${TH_MONTH_ABBR[d.month()]} ${d.year() + 543}`
}
const beLong = (v: string) => {
  const d = dayjs(v)
  return `${d.date()} เดือน ${TH_MONTH[d.month()]} พ.ศ. ${d.year() + 543}`
}
const nf = (n: number) => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 })

// ── ข้อมูลจาก API ────────────────────────────────────────────────────────────
interface ApiChainStep {
  step: number
  level: string
  level_name: string
  approver_name: string
  unit_name: string | null
  is_acting: boolean
}
interface ApiAction {
  step: number
  action: string
  comment: string | null
  actioned_at: string
  approver_name?: string
  level?: string
}
interface ApiRow {
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
}
interface Profile {
  pname: string | null
  fname: string | null
  lname: string | null
  position_name: string | null
  user_type_name: string | null
  submajor_name: string | null
  major_name: string | null
  mission_name: string | null
}

const parseChain = (raw: ApiRow['approval_chain']): ApiChainStep[] => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
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
  const [rows, setRows] = useState<ApiRow[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
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
      const json = await (await fetch('/api/v1/hr/leave-requests/mine')).json()
      if (json?.success && Array.isArray(json.data)) {
        setRows(json.data)
        setProfile(json.profile ?? null)
      } else {
        setRows([])
      }
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

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

  /** ใบที่ยังไม่มีผู้อนุมัติคนใดกดเลย ลบทิ้งได้จริง */
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
  const toFormData = (r: ApiRow): LeaveFormData => {
    const chain = parseChain(r.approval_chain)
    const actionOf = (step: number) => r.actions?.find(a => Number(a.step) === Number(step))
    const opinionOf = (level: string) => {
      const c = chain.find(x => x.level === level)
      if (!c) return null
      const act = actionOf(c.step)
      return {
        // ยังไม่อนุมัติก็ปล่อยว่างให้เซ็นด้วยมือ ไม่ใส่ข้อความแทนให้เอง
        comment: act ? (act.action === 'REJECTED' ? 'ไม่อนุญาต' : 'เห็นควรอนุญาต') : '',
        name: act ? c.approver_name : '',
        position: act ? `${c.level_name}${c.is_acting ? ' (รักษาการ)' : ''}` : '',
        date: act ? beShort(act.actioned_at) : '',
      }
    }

    // คำสั่งอนุญาต = ขั้นสุดท้ายของสายอนุมัติ (ผู้มีอำนาจสั่งการ)
    const lastStep = chain.length > 0 ? chain[chain.length - 1] : null
    const lastAct = lastStep ? actionOf(lastStep.step) : undefined
    const order = {
      approved: lastAct ? lastAct.action !== 'REJECTED' : null,
      name: lastAct && lastStep ? lastStep.approver_name : '',
      position: lastAct && lastStep ? `${lastStep.level_name}${lastStep.is_acting ? ' (รักษาการ)' : ''}` : '',
      date: lastAct ? beShort(lastAct.actioned_at) : '',
    }

    // สถิติการลา: นับเฉพาะใบที่อนุมัติแล้ว ประเภทเดียวกัน ปีงบเดียวกัน และเริ่มลาก่อนใบนี้
    const prior = rows.filter(x =>
      x.id !== r.id
      && Number(x.leave_type_id) === Number(r.leave_type_id)
      && Number(x.fiscal_year) === Number(r.fiscal_year)
      && String(x.status).toUpperCase() === 'APPROVED'
      && (dayjs(x.start_date).isBefore(dayjs(r.start_date), 'day')
        || (dayjs(x.start_date).isSame(dayjs(r.start_date), 'day') && x.id < r.id))
    ).reduce((a, x) => a + Number(x.total_days), 0)
    const thisDays = Number(r.total_days)

    const subject = (r.leave_type_name || '').replace(/^การ/, '')
    const annual = r.entitled_per_year
    return {
      orgName: ORG_NAME,
      provinceOffice: PROVINCE_OFFICE,
      writtenDate: beLong(r.created_at),
      subject,
      fullName,
      userType: profile?.user_type_name ?? '',
      position: profile?.position_name ?? '',
      unitName: profile?.major_name ?? profile?.submajor_name ?? '',
      carriedDays: nf(Number(r.carried_in) || 0),
      annualDays: annual != null ? nf(annual) : '',
      totalDays: annual != null ? nf((Number(r.carried_in) || 0) + annual) : '',
      startDate: beShort(r.start_date),
      endDate: beShort(r.end_date),
      requestedDays: nf(Number(r.total_days)),
      contact: '',
      substitute: '',
      note: r.reason ?? '',
      unitHead: opinionOf('SUBMAJOR'),
      majorHead: opinionOf('MAJOR') ?? opinionOf('MISSION') ?? opinionOf('DIRECTOR'),
      order,
      statPrior: nf(prior),
      statThis: nf(thisDays),
      statTotal: nf(prior + thisDays),
    }
  }

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
          <Tag color="green" style={{ marginInlineEnd: 0, fontSize: 11 }}>
            {nf(Number(r.total_days))} วัน{r.is_half_day ? ` (ครึ่งวัน${r.half_day_period === 'PM' ? 'บ่าย' : 'เช้า'})` : ''}
          </Tag>
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
            {String(r.status).toUpperCase() === 'PENDING' && waiting && (
              <div style={{ fontSize: 11, color: 'var(--app-text-2)' }}>
                รอ{waiting.level_name} · {waiting.approver_name}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'จัดการ', key: 'action', align: 'center' as const, width: 210, fixed: 'right' as const,
      render: (_: unknown, r: ApiRow) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetail(r)}>รายละเอียด</Button>
          <Button size="small" type="primary" icon={<PrinterOutlined />} onClick={() => setPrinting(r)}>พิมพ์</Button>
          {/* ยังไม่มีผู้อนุมัติคนใดกด = ลบทิ้งได้ · กดไปแล้ว = ถอนใบ เก็บประวัติไว้ */}
          {String(r.status).toUpperCase() === 'PENDING' && (
            (r.actions?.length ?? 0) === 0 ? (
              <Popconfirm
                title="ลบใบลานี้"
                description="ยังไม่มีผู้อนุมัติคนใดดำเนินการ ลบออกจากระบบถาวร"
                okText="ลบ" okButtonProps={{ danger: true }} cancelText="ปิด"
                onConfirm={() => removeRequest(r)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} loading={acting}>ลบ</Button>
              </Popconfirm>
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
          {String(r.status).toUpperCase() === 'APPROVED' && !r.cancellation_id && (
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
            <Title level={3} className="m-0">ประวัติการลาของฉัน</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ใบลาทุกใบที่ท่านยื่น พร้อมพิมพ์แบบใบลาเพื่อเสนอลงนาม
              {fullName && <> · {fullName}</>}
            </Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={reload}>รีเฟรช</Button>
            <Button type="primary" href="/hr/leave">ยื่นใบลาใหม่</Button>
          </Space>
        </div>

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

        <Card variant="borderless" className="mb-3 shadow-sm" styles={{ body: { padding: 14 } }}>
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
                  className="mb-3 rounded-xl"
                  styles={{ body: { padding: '18px 20px 6px' } }}
                  style={{ background: 'var(--app-surface)' }}
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

              <Descriptions
                bordered
                size="small"
                column={{ xs: 1, sm: 2, md: 3 }}
                className="mb-3"
                styles={{ label: { width: 110, whiteSpace: 'nowrap' } }}
              >
                <Descriptions.Item label="ประเภทการลา">{detail.leave_type_name}</Descriptions.Item>
                <Descriptions.Item label="ช่วงวันที่">
                  {beShort(detail.start_date)} – {beShort(detail.end_date)}
                </Descriptions.Item>
                <Descriptions.Item label="จำนวนวัน">
                  <Text strong style={{ color: '#10b981' }}>{nf(Number(detail.total_days))} วัน</Text>
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
                <Descriptions.Item label="เหตุผล" span={{ xs: 1, sm: 2, md: 3 }}>
                  {detail.reason || '-'}
                </Descriptions.Item>
                {detail.reject_reason && (
                  <Descriptions.Item label="เหตุผลที่ไม่อนุมัติ" span={{ xs: 1, sm: 2, md: 3 }}>
                    <Text type="danger">{detail.reject_reason}</Text>
                  </Descriptions.Item>
                )}
                {detail.cancellation_reason && (
                  <Descriptions.Item label="เหตุผลที่ขอยกเลิก" span={{ xs: 1, sm: 2, md: 3 }}>
                    {detail.cancellation_reason}
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
            {String(printing.leave_type_code) !== 'ANNUAL' && (
              <Alert
                type="info"
                showIcon
                style={{ margin: 12 }}
                title="แบบฟอร์มนี้อ้างอิงจากแบบใบลาพักผ่อน"
                description="ประเภทการลาอื่นยังไม่ได้กำหนดแบบฟอร์มเฉพาะไว้ในระบบ หัวข้อและช่องกรอกจะยังเป็นโครงเดียวกัน กรุณาตรวจก่อนเสนอลงนาม"
              />
            )}
            <div style={{ height: String(printing.leave_type_code) !== 'ANNUAL' ? 'calc(80vh - 96px)' : '80vh' }}>
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
        <Alert
          type="warning"
          showIcon
          className="mb-3"
          title="คำขอยกเลิกต้องผ่านการอนุมัติตามสายเดิมอีกครั้ง"
          description="วันลาจะถูกคืนให้ก็ต่อเมื่อผู้บังคับบัญชาอนุมัติการยกเลิกครบทุกขั้น"
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
