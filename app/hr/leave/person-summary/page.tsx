'use client'
// สรุปประวัติวันลารายบุคคล (ADMIN / HR) — รายชื่อบุคลากรที่ปฏิบัติงาน → กดรายละเอียดดูใบลาในปีงบ
// สรุปตามประเภท และวันลาพักผ่อน (ยกมาจากปีงบก่อน / สิทธิ์ปีนี้ / ใช้ไป / คงเหลือ)
// สิทธิ์: proxy.ts กั้น URL ตรง · backend ตอบ 403 ถ้าไม่ใช่ ADMIN / HR → พากลับหน้าหลัก
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Alert, Button, Card, Col, Descriptions, Drawer, Empty, Grid, Input, Progress, Row, Select, Space, Spin, Statistic, Table, Tag, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  HomeOutlined, FileTextOutlined, FilterOutlined, ClearOutlined, PaperClipOutlined, EyeOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, RollbackOutlined, SolutionOutlined,
} from '@ant-design/icons'
import { FaUmbrellaBeach } from 'react-icons/fa'
import dayjs from 'dayjs'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import AttachmentModal from '../AttachmentModal'
import { beShort, nf } from '@/app/lib/leaveFormData'
import { typeTone } from '@/app/lib/staffTypeTone'

const { Title, Text } = Typography

// ── ชนิดข้อมูลจาก API ──────────────────────────────────────────────────────────
interface Org { id: number; name: string }
interface Meta {
  fiscal_year: number
  missions: Org[]
  majors: (Org & { mission_id: number | null })[]
  submajors: (Org & { major_id: number | null })[]
}
interface PersonRow {
  id: number; name: string; position: string | null; user_type: string | null
  mission_name: string | null; major_name: string | null; submajor_name: string | null
  leave_count: number; leave_days: number; pending_days: number; annual_remaining: number | null
  /** ปีงบนี้ แยกตามรหัสประเภท (เฉพาะใบที่มีผล) — มีเฉพาะประเภทที่ลา */
  by_type?: Record<string, { days: number; count: number }>
}
/** คอลัมน์แยกประเภทในตารางรายชื่อ — ตามลำดับที่งาน HR ใช้ */
const TYPE_COLS: { code: string; title: string }[] = [
  { code: 'PERS', title: 'ลากิจ' },
  { code: 'SICK', title: 'ลาป่วย' },
  { code: 'ANNUAL', title: 'ลาพักผ่อน' },
  { code: 'MAT', title: 'ลาคลอดบุตร' },
  { code: 'PAT', title: 'ลาช่วยภริยาคลอดบุตร' },
]
interface LeaveRow {
  id: number; leave_type_code: string; leave_type_name: string; start_date: string; end_date: string
  total_days: number; days_deducted: number; is_half_day: boolean; half_day_period: string | null
  status: string; reason: string | null; reject_reason: string | null; document_name: string | null; created_at: string
  day_check_status: string | null
}
interface TypeSum { code: string; name_th: string; count: number; days: number; pending_count: number; pending_days: number }
interface Detail {
  fiscal_year: number; current_fiscal_year: number; years: number[]
  person: {
    id: number; name: string; position: string | null; user_type: string | null; mission_name: string | null; major_name: string | null
    submajor_name: string | null; hire_date: string | null; working: boolean; status_name: string | null
  }
  requests: LeaveRow[]
  by_type: TypeSum[]
  totals: { count: number; days: number; pending_count: number; pending_days: number }
  annual: null | {
    carried_in: number; carried_from_fy: number | null; entitled: number; used: number; remaining: number; total: number
    approved_days: number; pending_days: number
  }
}

class Forbidden extends Error {}
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (res.status === 403) throw new Forbidden()
  const j = await res.json().catch(() => null)
  if (!res.ok || !j?.success) throw new Error(j?.message || 'โหลดข้อมูลไม่สำเร็จ')
  return j.data as T
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'รออนุมัติ', color: 'warning', icon: <ClockCircleOutlined /> },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'success', icon: <CheckCircleOutlined /> },
  REJECTED: { label: 'ไม่อนุมัติ', color: 'error', icon: <CloseCircleOutlined /> },
  CANCEL_PENDING: { label: 'รออนุมัติยกเลิก', color: 'processing', icon: <RollbackOutlined /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: 'default', icon: <RollbackOutlined /> },
}
const statusOf = (s: string) => STATUS_META[s] ?? { label: s, color: 'default', icon: null }
const COUNTED = ['APPROVED', 'CANCEL_PENDING']
const dateRange = (r: LeaveRow) => dayjs(r.start_date).isSame(r.end_date, 'day') ? beShort(r.start_date) : `${beShort(r.start_date)} – ${beShort(r.end_date)}`
const halfDay = (r: LeaveRow) => !r.is_half_day ? '' : r.half_day_period === 'PM' || r.half_day_period === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : ' (ครึ่งวันเช้า)'
const unitOf = (p: { mission_name: string | null; major_name: string | null; submajor_name: string | null }) =>
  [p.submajor_name, p.major_name].filter(Boolean).join(' · ') || p.mission_name || '-'
const shortType = (name: string) => name.replace(/^การลา/, '')

// ── รายละเอียดรายคน ──────────────────────────────────────────────────────────
const PersonDetail = ({ userId, onClose }: { userId: number | null; onClose: () => void }) => {
  const router = useRouter()
  const [fy, setFy] = useState<number | null>(null)
  const [data, setData] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doc, setDoc] = useState<LeaveRow | null>(null)

  useEffect(() => {
    if (userId == null) return
    let alive = true
    void Promise.resolve().then(() => { if (alive) { setLoading(true); setError(null) } })
    getJson<Detail>(`/api/v1/hr/leave-person-summary/${userId}${fy ? `?fiscal_year=${fy}` : ''}`)
      .then(d => { if (alive) setData(d) })
      .catch(e => { if (!alive) return; if (e instanceof Forbidden) router.replace('/home'); else setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [userId, fy, router])

  const close = () => { onClose(); setFy(null); setData(null) }
  const d = data && data.person.id === userId ? data : null
  const a = d?.annual

  const cols: ColumnsType<LeaveRow> = [
    {
      title: 'วันที่ลา', key: 'date', width: 200,
      render: (_, r) => <div><div>{dateRange(r)}<Text type="secondary" style={{ fontSize: 12 }}>{halfDay(r)}</Text></div>
        <Text type="secondary" style={{ fontSize: 11 }}>ยื่นเมื่อ {beShort(r.created_at)}</Text></div>,
    },
    { title: 'ประเภท', dataIndex: 'leave_type_name', key: 'type', width: 150, render: (v: string) => shortType(v) },
    {
      title: 'วัน', key: 'days', width: 70, align: 'center',
      render: (_, r) => r.status === 'CANCELLED' || r.status === 'REJECTED'
        ? <Tooltip title="ไม่นับเป็นวันลา"><Text delete type="secondary">{nf(r.total_days)}</Text></Tooltip>
        : r.day_check_status === 'ADJUSTED' && r.days_deducted !== r.total_days
          ? <Tooltip title={`งาน HR ปรับจาก ${nf(r.total_days)} วัน`}><Text strong>{nf(r.days_deducted)}*</Text></Tooltip>
          : <Text strong>{nf(r.days_deducted)}</Text>,
    },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 140, render: (s: string) => { const m = statusOf(s); return <Tag color={m.color} icon={m.icon}>{m.label}</Tag> } },
    {
      title: 'เหตุผล', dataIndex: 'reason', key: 'reason', ellipsis: { showTitle: false },
      render: (v: string | null, r) => <Tooltip title={v}><span>{v || '-'}</span>{r.reject_reason ? <div><Text type="danger" style={{ fontSize: 12 }}>ไม่อนุมัติ: {r.reject_reason}</Text></div> : null}</Tooltip>,
    },
    {
      title: 'ไฟล์แนบ', key: 'doc', width: 80, align: 'center',
      render: (_, r) => r.document_name
        ? <Tooltip title={`ดูไฟล์แนบ: ${r.document_name}`}><Button type="text" icon={<PaperClipOutlined style={{ color: '#2563eb', fontSize: 16 }} />} aria-label="ดูไฟล์แนบ" onClick={() => setDoc(r)} /></Tooltip>
        : <Text type="secondary">-</Text>,
    },
  ]

  const typeRows = d ? d.by_type.filter(t => t.count || t.pending_count) : []
  const typeCols: ColumnsType<TypeSum> = [
    { title: 'ประเภทการลา', dataIndex: 'name_th', key: 'name', render: (v: string) => shortType(v) },
    { title: 'ครั้ง', dataIndex: 'count', key: 'count', width: 70, align: 'center', render: (v: number) => <Text strong>{nf(v)}</Text> },
    { title: 'วัน', dataIndex: 'days', key: 'days', width: 80, align: 'center', render: (v: number) => <Text strong>{nf(v)}</Text> },
    {
      title: 'รออนุมัติ', key: 'pending', width: 120, align: 'center',
      render: (_, t) => t.pending_count ? <Text type="warning">{nf(t.pending_count)} ครั้ง · {nf(t.pending_days)} วัน</Text> : <Text type="secondary">-</Text>,
    },
  ]

  return (
    <Drawer
      open={userId != null} onClose={close} size="min(1100px, 100vw)" destroyOnHidden
      title={d ? <span><SolutionOutlined className="mr-2" />{d.person.name}</span> : 'สรุปวันลารายบุคคล'}
      extra={d && (
        <Space>
          <Text type="secondary">ปีงบประมาณ</Text>
          <Select aria-label="ปีงบประมาณ" value={d.fiscal_year} onChange={setFy} style={{ width: 150 }}
            options={d.years.map(y => ({ value: y, label: `${y}${y === d.current_fiscal_year ? ' (ปัจจุบัน)' : ''}` }))} popupMatchSelectWidth={false} />
        </Space>
      )}
    >
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      {!d ? <div className="py-16 text-center"><Spin /></div> : (
        <Spin spinning={loading}>
          <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 3 }} style={{ marginBottom: 16 }} data-testid="person-info">
            <Descriptions.Item label="ตำแหน่ง">{d.person.position ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="ประเภทบุคลากร">{d.person.user_type ? <Tag color={typeTone(d.person.user_type).tag} style={{ margin: 0 }}>{d.person.user_type}</Tag> : '-'}</Descriptions.Item>
            <Descriptions.Item label="วันเริ่มงาน">{d.person.hire_date ? beShort(d.person.hire_date) : '-'}</Descriptions.Item>
            <Descriptions.Item label="กลุ่มภารกิจ">{d.person.mission_name ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="กลุ่มงาน">{d.person.major_name ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="หน่วยงาน">{d.person.submajor_name ?? '-'}</Descriptions.Item>
            {!d.person.working && <Descriptions.Item label="สถานะ"><Tag color="red">{d.person.status_name ?? 'ไม่ได้ปฏิบัติงาน'}</Tag></Descriptions.Item>}
          </Descriptions>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {/* วันลาพักผ่อน */}
            <Col xs={24} lg={11}>
              <Card size="small" data-testid="annual-card" className="h-full"
                title={<span><FaUmbrellaBeach className="inline mr-2" style={{ color: '#14b8a6' }} />วันลาพักผ่อน ปีงบ {d.fiscal_year}</span>}>
                {!a ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มียอดวันลาพักผ่อนของปีงบนี้" /> : (
                  <>
                    <Row gutter={[8, 12]}>
                      <Col span={8}><Statistic title={`สะสมยกมา${a.carried_from_fy ? ` (ปีงบ ${a.carried_from_fy})` : ''}`} value={a.carried_in} formatter={v => nf(Number(v))} suffix="วัน" /></Col>
                      <Col span={8}><Statistic title="สิทธิ์ปีนี้" value={a.entitled} formatter={v => nf(Number(v))} suffix="วัน" /></Col>
                      <Col span={8}><Statistic title="รวมสิทธิ์" value={a.total} formatter={v => nf(Number(v))} suffix="วัน" styles={{ content: { fontWeight: 700 } }} /></Col>
                      <Col span={12}>
                        <Statistic title="ใช้ไปแล้ว" value={a.used} formatter={v => nf(Number(v))} suffix="วัน" styles={{ content: { color: '#f59e0b' } }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>อนุมัติแล้ว {nf(a.approved_days)}{a.pending_days ? ` · รออนุมัติ ${nf(a.pending_days)}` : ''} วัน</Text>
                      </Col>
                      <Col span={12}>
                        <Statistic title="คงเหลือ" value={a.remaining} formatter={v => nf(Number(v))} suffix="วัน"
                          styles={{ content: { color: a.remaining < 0 ? '#ef4444' : '#10b981', fontWeight: 700 } }} />
                      </Col>
                    </Row>
                    <Tooltip title={`ใช้ ${nf(a.used)} จาก ${nf(a.total)} วัน`}>
                      <Progress percent={a.total > 0 ? Math.round(Math.min(a.used / a.total, 1) * 100) : 0} strokeColor="#f59e0b" style={{ marginTop: 8, marginBottom: 0 }} />
                    </Tooltip>
                    {Math.abs(a.used - a.approved_days - a.pending_days) > 0.001 && (
                      <Text type="secondary" style={{ fontSize: 11 }}>ยอดใช้ตามบัญชีวันลาต่างจากผลรวมใบลาในระบบ {nf(Math.abs(a.used - a.approved_days - a.pending_days))} วัน (เช่น ยอดโอนจากโปรแกรมเดิม)</Text>
                    )}
                  </>
                )}
              </Card>
            </Col>
            {/* สรุปตามประเภท */}
            <Col xs={24} lg={13}>
              <Card size="small" className="h-full" data-testid="type-summary"
                title={`สรุปการลาตามประเภท · รวม ${nf(d.totals.count)} ครั้ง ${nf(d.totals.days)} วัน`}
                styles={{ body: { padding: 0 } }}>
                <Table<TypeSum> rowKey="code" size="small" pagination={false} dataSource={typeRows} columns={typeCols}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีการลาในปีงบนี้" /> }}
                  summary={() => typeRows.length > 1 ? (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}><Text strong>รวม</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="center"><Text strong>{nf(d.totals.count)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="center"><Text strong>{nf(d.totals.days)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="center">{d.totals.pending_count ? <Text type="warning">{nf(d.totals.pending_count)} ครั้ง · {nf(d.totals.pending_days)} วัน</Text> : '-'}</Table.Summary.Cell>
                    </Table.Summary.Row>
                  ) : null} />
                <div className="px-3 py-2"><Text type="secondary" style={{ fontSize: 11 }}>นับใบที่อนุมัติแล้ว (รวมใบที่รออนุมัติยกเลิก) · ใบที่ยกเลิก/ไม่อนุมัติไม่นับ</Text></div>
              </Card>
            </Col>
          </Row>

          <Title level={5} style={{ marginBottom: 8 }}>ประวัติการลา ปีงบ {d.fiscal_year} ({nf(d.requests.length)} ใบ)</Title>
          <Table<LeaveRow> rowKey="id" size="small" dataSource={d.requests} columns={cols} data-testid="leave-table"
            pagination={d.requests.length > 20 ? { pageSize: 20, showSizeChanger: false } : false} scroll={{ x: 820 }}
            rowClassName={r => COUNTED.includes(r.status) ? '' : 'leave-row-muted'}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`ไม่มีใบลาในปีงบ ${d.fiscal_year}`} /> }} />
        </Spin>
      )}

      <AttachmentModal
        doc={doc && doc.document_name ? { id: doc.id, name: doc.document_name, title: d?.person.name, subtitle: `${shortType(doc.leave_type_name)} · ${dateRange(doc)}` } : null}
        onClose={() => setDoc(null)} zIndex={1100}
      />
    </Drawer>
  )
}

// ── หน้าหลัก: รายชื่อบุคลากร ───────────────────────────────────────────────────
const PersonSummaryContent = () => {
  const router = useRouter()
  const params = useSearchParams()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mission, setMission] = useState<number | null>(null)
  const [major, setMajor] = useState<number | null>(null)
  const [submajor, setSubmajor] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [rows, setRows] = useState<PersonRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const openId = Number(params.get('user')) || null
  const screens = Grid.useBreakpoint()

  const fail = useCallback((e: unknown) => {
    if (e instanceof Forbidden) router.replace('/home')
    else setError((e as Error).message)
  }, [router])

  useEffect(() => { getJson<Meta>('/api/v1/hr/leave-person-summary/meta').then(setMeta).catch(fail) }, [fail])

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (mission) qs.set('mission_id', String(mission))
    if (major) qs.set('major_id', String(major))
    if (submajor) qs.set('submajor_id', String(submajor))
    if (search) qs.set('q', search)
    void Promise.resolve().then(() => { if (alive) setLoading(true) })
    getJson<{ rows: PersonRow[]; total: number }>(`/api/v1/hr/leave-person-summary/people?${qs}`)
      .then(d => { if (alive) { setRows(d.rows); setTotal(d.total); setError(null) } })
      .catch(e => { if (alive) fail(e) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [mission, major, submajor, search, page, pageSize, fail])

  // เปิด/ปิดรายละเอียดผ่าน ?user= — กดย้อนกลับในเบราว์เซอร์ปิด Drawer ได้ และส่งลิงก์ให้คนอื่นได้
  const openPerson = (id: number | null) => {
    const sp = new URLSearchParams(params.toString())
    if (id) sp.set('user', String(id)); else sp.delete('user')
    router.push(`/hr/leave/person-summary${sp.size ? `?${sp}` : ''}`, { scroll: false })
  }

  const majorOpts = useMemo(() => (meta?.majors ?? []).filter(m => !mission || m.mission_id === mission).map(m => ({ value: m.id, label: m.name })), [meta, mission])
  const subOpts = useMemo(() => {
    const majorIds = new Set(majorOpts.map(m => m.value))
    return (meta?.submajors ?? []).filter(s => major ? s.major_id === major : !mission || (s.major_id != null && majorIds.has(s.major_id))).map(s => ({ value: s.id, label: s.name }))
  }, [meta, major, mission, majorOpts])
  const filtered = !!(mission || major || submajor || search)
  const clear = () => { setMission(null); setMajor(null); setSubmajor(null); setQ(''); setSearch(''); setPage(1) }
  const fy = meta?.fiscal_year

  // คอลัมน์เยอะ (แยกประเภทลา) — จัดให้พอดีจอ 1440 · จอเล็กกว่าเลื่อนแนวนอน: จอ md ขึ้นไปตรึงลำดับ/ชื่อไว้ซ้าย และปุ่มรายละเอียดไว้ขวา ไม่หลงแถว
  // มือถือไม่ตรึง (คอลัมน์ตรึงกินพื้นที่จอแคบเกินไป)
  const pin = !!screens.md
  const cols: ColumnsType<PersonRow> = [
    {
      // ลำดับต่อเนื่องข้ามหน้า (หน้า 2 ขนาด 20 เริ่มที่ 21)
      title: 'ลำดับ', key: 'no', width: 64, align: 'center', fixed: pin ? 'left' : undefined,
      render: (_, __, i) => <Text type="secondary" data-testid="people-no">{nf((page - 1) * pageSize + i + 1)}</Text>,
    },
    {
      title: 'ชื่อ - สกุล', key: 'name', fixed: pin ? 'left' : undefined,
      render: (_, r) => <div style={{ minWidth: 150, fontWeight: 600 }}>{r.name}</div>,
    },
    {
      title: 'ตำแหน่ง', dataIndex: 'position', key: 'position', responsive: ['sm'],
      render: (v: string | null) => <div style={{ minWidth: 120, maxWidth: 160 }}>{v ?? <Text type="secondary">-</Text>}</div>,
    },
    {
      title: 'ประเภทเจ้าหน้าที่', dataIndex: 'user_type', key: 'user_type', responsive: ['md'],
      render: (v: string | null) => v ? <Tag color={typeTone(v).tag} style={{ margin: 0 }} data-testid="user-type-tag">{v}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'สังกัด', key: 'unit', responsive: ['md'],
      render: (_, r) => <div style={{ minWidth: 140, maxWidth: 180 }}>{unitOf(r)}</div>,
    },
    {
      // วันลาปีงบ แยกประเภท (วัน + จำนวนครั้ง) และรวมทุกประเภท (รวมประเภทอื่นที่ไม่ได้แยกคอลัมน์ เช่น อุปสมบท / ศึกษาต่อ)
      title: `วันลาปีงบ ${fy ?? ''}`, key: 'fy',
      children: [
        ...TYPE_COLS.map(t => ({
          title: t.title, key: `t-${t.code}`, width: 72, align: 'center' as const,
          render: (_: unknown, r: PersonRow) => {
            const x = r.by_type?.[t.code]
            return x?.count
              ? <div data-testid={`type-${t.code}`}><Text strong>{nf(x.days)}</Text><div style={{ fontSize: 11, color: 'var(--app-text-3)' }}>{nf(x.count)} ครั้ง</div></div>
              : <Text type="secondary">-</Text>
          },
        })),
        {
          title: 'รวม', key: 'fy-total', width: 72, align: 'center' as const,
          render: (_: unknown, r: PersonRow) => r.leave_count
            ? <div><Text strong>{nf(r.leave_days)}</Text><div style={{ fontSize: 11, color: 'var(--app-text-3)' }}>{nf(r.leave_count)} ครั้ง</div></div>
            : <Text type="secondary">-</Text>,
        },
      ],
    },
    {
      title: 'รออนุมัติ', dataIndex: 'pending_days', key: 'pending', width: 80, align: 'center', responsive: ['lg'],
      render: (v: number) => v ? <Text type="warning">{nf(v)} วัน</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'พักผ่อนคงเหลือ', dataIndex: 'annual_remaining', key: 'annual', width: 96, align: 'center',
      render: (v: number | null) => v == null ? <Text type="secondary">-</Text> : <Text strong style={{ color: v < 0 ? '#ef4444' : '#0d9488' }}>{nf(v)} วัน</Text>,
    },
    {
      // ปุ่มไอคอน (ประหยัดที่ให้คอลัมน์ตัวเลข) — ดับเบิลคลิกแถวก็เปิดได้
      title: '', key: 'act', width: 56, align: 'center', fixed: pin ? 'right' : undefined,
      render: (_, r) => <Tooltip title="ดูรายละเอียดการลา"><Button size="small" type="primary" ghost icon={<EyeOutlined />} aria-label="รายละเอียด" onClick={() => openPerson(r.id)} /></Tooltip>,
    },
  ]

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-6">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/hr/leave', title: <><FileTextOutlined /> ระบบบริหารการลา</> },
            { title: 'สรุปวันลารายบุคคล' },
          ]}
          className="mb-4"
        />
        <div className="mb-4">
          <Title level={3} className="m-0">สรุปวันลารายบุคคล</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            บุคลากรที่ปฏิบัติงานตามทะเบียนบุคลากร · กดรายละเอียดเพื่อดูประวัติการลา สรุปตามประเภท และวันลาพักผ่อนสะสม/คงเหลือ (เฉพาะงานทรัพยากรบุคคล / ผู้ดูแลระบบ)
          </Text>
        </div>

        {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}

        <Card style={{ marginBottom: 16 }} variant="borderless" className="shadow-sm" styles={{ body: { padding: 14 } }}>
          <div className="flex flex-wrap items-center gap-3">
            <Text type="secondary" style={{ fontSize: 12 }}><FilterOutlined /> กรองข้อมูล</Text>
            <Select aria-label="กลุ่มภารกิจ" placeholder="กลุ่มภารกิจทั้งหมด" allowClear showSearch optionFilterProp="label" style={{ width: 240 }}
              value={mission ?? undefined} options={(meta?.missions ?? []).map(m => ({ value: m.id, label: m.name }))}
              onChange={(v?: number) => { setMission(v ?? null); setMajor(null); setSubmajor(null); setPage(1) }} />
            <Select aria-label="กลุ่มงาน" placeholder="กลุ่มงานทั้งหมด" allowClear showSearch optionFilterProp="label" style={{ width: 240 }}
              value={major ?? undefined} options={majorOpts}
              onChange={(v?: number) => { setMajor(v ?? null); setSubmajor(null); setPage(1) }} />
            <Select aria-label="หน่วยงาน" placeholder="หน่วยงานทั้งหมด" allowClear showSearch optionFilterProp="label" style={{ width: 240 }}
              value={submajor ?? undefined} options={subOpts} notFoundContent="ไม่มีหน่วยงานย่อย"
              onChange={(v?: number) => { setSubmajor(v ?? null); setPage(1) }} />
            <Input.Search aria-label="ค้นหาชื่อ" placeholder="ค้นหาชื่อ - สกุล" allowClear style={{ width: 240 }}
              value={q} onChange={e => { setQ(e.target.value); if (!e.target.value) { setSearch(''); setPage(1) } }}
              onSearch={v => { setSearch(v.trim()); setPage(1) }} />
            {filtered && <Button icon={<ClearOutlined />} onClick={clear}>ล้างตัวกรอง</Button>}
            <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }} data-testid="people-count">ทั้งหมด {nf(total)} คน</Text>
          </div>
        </Card>

        <Card variant="borderless" className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <Table<PersonRow> rowKey="id" size="small" loading={loading} dataSource={rows} columns={cols} data-testid="people-table"
            onRow={r => ({ onDoubleClick: () => openPerson(r.id) })} scroll={{ x: 'max-content' }}
            pagination={{
              current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: [20, 50, 100],
              showTotal: (t, [a, b]) => `${nf(a)}–${nf(b)} จาก ${nf(t)} คน`,
              onChange: (p, s) => { setPage(s !== pageSize ? 1 : p); setPageSize(s) },
            }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่พบบุคลากรตามตัวกรอง" /> }} />
        </Card>
      </div>

      <PersonDetail userId={openId} onClose={() => openPerson(null)} />

      <style jsx global>{`
        .leave-row-muted td { opacity: .6; }
      `}</style>
    </div>
  )
}

export default function PersonSummaryPage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      {/* useSearchParams ต้องอยู่ใต้ Suspense */}
      <Suspense fallback={null}><PersonSummaryContent /></Suspense>
    </AppThemeProvider>
  )
}
