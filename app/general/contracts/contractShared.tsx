'use client'
// ของใช้ร่วมของหน้าจอระบบคืนหลักประกันสัญญา: เรียก API, ป้ายกำกับ, โครงหน้า, ลิ้นชักรายละเอียดสัญญา
import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert, App, Button, ConfigProvider, Descriptions, Divider, Drawer, Empty, Result, Select, Space, Spin, Table, Tag, theme, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, HomeOutlined } from '@ant-design/icons'
import generatePicker from 'antd/es/date-picker/generatePicker'
import thTH from 'antd/locale/th_TH'
import dayjsGenerateConfig from '@rc-component/picker/generate/dayjs'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import Link from 'next/link'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'

dayjs.extend(buddhistEra)

const { Title, Text } = Typography

// ปีในหัวปฏิทินเป็น พ.ศ. (locale ของ antd ไม่ได้แปลงให้)
const TH_LOCALE = { ...thTH, DatePicker: { ...thTH.DatePicker!, lang: { ...thTH.DatePicker!.lang, yearFormat: 'BBBB' } } }
export const DATE_FORMAT = 'DD/MM/BBBB'

// dayjs แสดงปี พ.ศ. ด้วย BBBB ได้ แต่อ่านกลับจากข้อความที่พิมพ์ไม่ได้ จึงต้องแปลงเอง
// แปลงปีก่อนตรวจวันที่ เพื่อให้ปีอธิกสุรทินถูก เช่น 29/02/2567 คือ ค.ศ. 2024
export const parseThaiDate = (text: string): Dayjs | null => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim())
  if (!m) return null
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const ad = year >= 2400 ? year - 543 : year
  const date = dayjs(new Date(ad, month - 1, day))
  return date.year() === ad && date.month() === month - 1 && date.date() === day ? date : null
}

// ตัวเลือกวันที่ของระบบนี้ แสดงปี พ.ศ. และพิมพ์วันที่ พ.ศ. ลงช่องได้
export const ThaiDatePicker = generatePicker<Dayjs>({
  ...dayjsGenerateConfig,
  locale: { ...dayjsGenerateConfig.locale, parse: (_locale, text) => parseThaiDate(text) },
})

export const fmtDate = (d?: string | null) => (d ? dayjs(d).locale('th').format(DATE_FORMAT) : '—')
export const fmtMoney = (n?: number | null) => (n == null ? '—' : Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
export const toApiDate = (v?: dayjs.Dayjs | null) => (v ? v.format('YYYY-MM-DD') : null)
export const toFormDate = (s?: string | null) => (s ? dayjs(s) : null)

export class ApiError extends Error {
  constructor(message: string, public field?: string) { super(message) }
}

export async function api<T = any>(path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: unknown): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await fetch(`/api/v1/contracts/${path}`, {
    method,
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.success === false) throw new ApiError(j.error?.message ?? j.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่', j.error?.field)
  return j.data as T
}

// ─── ป้ายกำกับ ───────────────────────────────────────────────────────────────
export const WORK_TYPES: Record<string, string> = { construction: 'ก่อสร้าง', purchase: 'ซื้อ', hire: 'จ้าง', maintenance: 'บำรุงรักษา' }
export const DUTIES: Record<string, string> = {
  committee: 'กรรมการตรวจรับ', supervisor: 'ผู้ควบคุมงาน', custodian: 'ผู้ครอบครองพัสดุ', approver: 'หัวหน้าหน่วยงาน/ผู้รับมอบอำนาจ',
}
export const TASK_DUTIES: Record<string, string> = {
  procurement: 'พัสดุ', finance: 'การเงิน', committee: 'กรรมการ/ผู้ครอบครอง', custodian: 'ผู้ครอบครองพัสดุ', approver: 'ผู้อนุมัติ',
}
export const GUARANTEE_TYPES: Record<string, string> = { cash: 'เงินสด', bank_guarantee: 'หนังสือค้ำประกันธนาคาร', other: 'อื่น ๆ' }
export const GUARANTEE_PURPOSES: Record<string, string> = { performance: 'หลักประกันสัญญา', advance: 'ค้ำประกันเงินล่วงหน้า', other: 'อื่น ๆ' }
export const GUARANTEE_STATUS: Record<string, { label: string; color: string }> = {
  held: { label: 'ถือไว้', color: 'blue' }, returned: { label: 'คืนแล้ว', color: 'green' },
  escrow: { label: 'วางทรัพย์แล้ว', color: 'purple' }, treasury: { label: 'ส่งคลังแล้ว', color: 'purple' },
}
export const PAYOUT_METHODS: Record<string, string> = { returned: 'คืนผู้รับจ้าง', escrow: 'วางทรัพย์ที่กรมบังคับคดี', treasury: 'ส่งเงินเข้าคลัง' }
export const AMENDMENT_TYPES: Record<string, string> = { extend_time: 'ขยายเวลา', value: 'เปลี่ยนวงเงิน', warranty: 'เปลี่ยนระยะประกัน', other: 'อื่น ๆ' }
export const DOC_TYPES: Record<string, string> = {
  contract_original: 'ต้นฉบับสัญญา', contract_copy: 'สำเนาสัญญา', project_file: 'แฟ้มโครงการ (TOR/ประกาศ/ผลคัดเลือก)',
  acceptance: 'ใบตรวจรับ', inspection_report: 'รายงานผลตรวจ', defect_letter: 'บันทึกแจ้งชำรุด/หนังสือแจ้งซ่อม', other: 'อื่น ๆ',
}
export const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: 'อยู่ระหว่างดำเนินการ', color: 'processing' }, returned: { label: 'คืนหลักประกันแล้ว', color: 'success' }, cancelled: { label: 'ยกเลิก', color: 'default' },
}
export const RETURN_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'รออนุมัติ', color: 'processing' }, approved: { label: 'อนุมัติแล้ว', color: 'success' }, sent_back: { label: 'ส่งกลับแก้ไข', color: 'warning' },
}

export const PAY_STATUS: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'ค้างจ่าย', color: 'blue' }, partial: { label: 'จ่ายบางส่วน', color: 'gold' }, paid: { label: 'จ่ายครบ', color: 'green' }, cancelled: { label: 'ยกเลิก', color: 'default' },
}

export const toOptions = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }))

// สถานะครบกำหนดต้องมีทั้งไอคอนและข้อความ ไม่ใช้สีอย่างเดียว
export const DueTag = ({ state, date }: { state?: string | null; date?: string | null }) => {
  if (!date) return <Text type="secondary">—</Text>
  if (state === 'overdue') return <Tag color="error" icon={<ExclamationCircleOutlined />}>เกินกำหนด {fmtDate(date)}</Tag>
  if (state === 'near') return <Tag color="warning" icon={<ClockCircleOutlined />}>ใกล้กำหนด {fmtDate(date)}</Tag>
  if (state === 'normal') return <Tag color="success" icon={<CheckCircleOutlined />}>ปกติ {fmtDate(date)}</Tag>
  return <Text>{fmtDate(date)}</Text>
}

// ─── สิทธิ์ของผู้ใช้ ──────────────────────────────────────────────────────────
export type ScreenKey = 'procurement' | 'finance' | 'inspection' | 'custodian' | 'approval' | 'executive' | 'settings' | 'vendors'
export interface ContractMe {
  uid: number; isAdmin: boolean; isDirector: boolean; isExecutive: boolean; procurement: boolean; finance: boolean; canEditRules: boolean; seeAll: boolean; duties: string[]
  screens: Record<ScreenKey, boolean>
}

// ─── โครงหน้า: Navbar, breadcrumb, ตรวจสิทธิ์หน้าจอ ─────────────────────────
export function ContractPage({ title, icon, screen, subtitle, crumbs, children }: {
  title: string
  icon: React.ReactNode
  screen?: ScreenKey
  subtitle?: string
  /** แทน breadcrumb ระหว่างหน้าหลักกับชื่อหน้า สำหรับหน้าที่อยู่นอกเมนูสัญญา */
  crumbs?: { href?: string; title: React.ReactNode }[]
  children: (me: ContractMe) => React.ReactNode
}) {
  const { mode } = useThemeMode()
  const [me, setMe] = useState<ContractMe | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  useEffect(() => { api<ContractMe>('me').then(setMe).catch(e => setFailed(e.message)) }, [])
  const denied = !!me && !!screen && !me.screens[screen]
  return (
    <ConfigProvider locale={TH_LOCALE} theme={{ algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#0891b2', borderRadius: 8 } }}>
      <App>
        <div className="min-h-screen bg-app-bg text-app-text">
          <Navbar />
          <div className="p-4 md:p-8">
            <Breadcrumb className="mb-4" items={[
              { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
              ...(crumbs ?? [
                { href: '/general', title: 'งานทั่วไป' },
                ...(screen ? [{ href: '/general/contracts', title: 'สัญญาและหลักประกัน' }] : []),
              ]),
              { title },
            ]} />
            <div className="flex items-center gap-3 mb-1">
              <span style={{ fontSize: 22, color: '#0891b2', display: 'inline-flex' }} aria-hidden>{icon}</span>
              <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>{title}</Title>
            </div>
            {subtitle && <Text type="secondary">{subtitle}</Text>}
            <div className="mt-4">
              {failed && <Alert type="error" showIcon title="โหลดสิทธิ์ผู้ใช้ไม่สำเร็จ" description={failed} />}
              {!me && !failed && <div className="py-16 text-center"><Spin /></div>}
              {denied && (
                <Result status="403" title="หน้าจอนี้ไม่ใช่งานของคุณ" subTitle="หน้านี้เปิดตามหน่วยงานหรือหน้าที่ที่ได้รับมอบหมายในสัญญา"
                  extra={<Link href="/general/contracts"><Button type="primary">กลับหน้ารวม</Button></Link>} />
              )}
              {me?.isAdmin && screen !== 'settings' && <Alert className="mb-4" type="info" showIcon title="ผู้ดูแลระบบดูได้ทุกหน้า แต่แก้ไขได้เฉพาะหน้าตั้งค่าเริ่มต้น" />}
              {me && !denied && children(me)}
            </div>
          </div>
        </div>
      </App>
    </ConfigProvider>
  )
}

export const cardStyle: React.CSSProperties = { background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }

// ─── เลือกบุคลากร (ค้นหาจาก backend) ─────────────────────────────────────────
export function UserSelect({ value, onChange, initial, placeholder, allowClear, ariaLabel }: {
  value?: number | null
  onChange?: (v: number | null) => void
  initial?: { value: number; label: string }[]
  placeholder?: string
  allowClear?: boolean
  ariaLabel?: string
}) {
  const [options, setOptions] = useState<{ value: number; label: string }[]>(initial ?? [])
  const [loading, setLoading] = useState(false)
  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const rows = await api<{ id: number; name: string; position_name: string | null }[]>(`user-options?search=${encodeURIComponent(q)}`)
      const found = rows.map(r => ({ value: r.id, label: r.position_name ? `${r.name} (${r.position_name})` : r.name }))
      // คงคนที่เลือกไว้แล้วในตัวเลือก ไม่งั้นช่องจะแสดงเป็นตัวเลข
      setOptions(prev => [...prev.filter(p => p.value === value && !found.some(f => f.value === p.value)), ...found])
    } catch { /* ค้นไม่สำเร็จให้ใช้ตัวเลือกเดิม */ } finally { setLoading(false) }
  }, [value])
  return (
    <Select showSearch={{ filterOption: false, onSearch: search }} allowClear={allowClear} value={value ?? undefined} onChange={v => onChange?.(v ?? null)}
      options={options} loading={loading} placeholder={placeholder ?? 'พิมพ์ชื่อเพื่อค้นหา'} style={{ width: '100%' }}
      aria-label={ariaLabel} notFoundContent="พิมพ์ชื่อเพื่อค้นหา" onOpenChange={o => { if (o && options.length === 0) search('') }} />
  )
}

// ─── ลิ้นชักรายละเอียดสัญญา ───────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ContractDetail = any

const miniTable = (columns: ColumnsType<any>, data: any[], empty: string) => (
  <Table size="small" rowKey="id" columns={columns} dataSource={data} pagination={false} scroll={{ x: 'max-content' }}
    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} /> }} />
)

export function ContractDrawer({ id, onClose, renderActions, renderExtraColumns, refreshKey }: {
  id: number | null
  onClose: () => void
  renderActions?: (d: ContractDetail, reload: () => void) => React.ReactNode
  renderExtraColumns?: (d: ContractDetail, reload: () => void) => { tasks?: ColumnsType<any>; documents?: ColumnsType<any>; defects?: ColumnsType<any>; guarantees?: ColumnsType<any> }
  refreshKey?: number
}) {
  // ผูกผลกับ id ที่โหลดมา เปิดสัญญาอื่นจะไม่เห็นข้อมูลของฉบับก่อนค้างอยู่
  const [loaded, setLoaded] = useState<{ id: number; data?: ContractDetail; error?: string } | null>(null)
  const load = useCallback(() => {
    if (id == null) return
    api(`list/${id}`).then(data => setLoaded({ id, data })).catch(e => setLoaded({ id, error: e.message }))
  }, [id])
  useEffect(() => { load() }, [load, refreshKey])
  const d = loaded?.id === id ? loaded?.data ?? null : null
  const error = loaded?.id === id ? loaded?.error ?? null : null
  const extra = d && renderExtraColumns ? renderExtraColumns(d, load) : {}
  return (
    <Drawer title={d ? `${d.contract_no} — ${d.project_name}` : 'รายละเอียดสัญญา'} open={id != null} onClose={onClose} size={980} destroyOnHidden>
      {error && <Alert type="error" showIcon title={error} />}
      {!d && !error && <div className="py-16 text-center"><Spin /></div>}
      {d && (
        <>
          <Space wrap className="mb-3">
            <Tag color={CONTRACT_STATUS[d.status]?.color}>{CONTRACT_STATUS[d.status]?.label}</Tag>
            {renderActions?.(d, load)}
          </Space>
          {d.status === 'cancelled' && <Alert className="mb-3" type="warning" showIcon title={`ยกเลิกแล้ว: ${d.cancel_reason ?? '-'}`} />}
          <Descriptions size="small" bordered column={{ xs: 1, md: 2 }} styles={{ label: { width: 150, color: 'var(--app-text-2)' } }}>
            <Descriptions.Item label="ประเภทงาน">{WORK_TYPES[d.work_type]}</Descriptions.Item>
            <Descriptions.Item label="หน่วยงานเจ้าของ">{d.owner_major_name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="ผู้รับจ้าง">{d.vendor_name}</Descriptions.Item>
            {d.can.see_money
              ? <Descriptions.Item label="วงเงิน">{fmtMoney(d.contract_value)} บาท</Descriptions.Item>
              : <Descriptions.Item label="วงเงิน"><Text type="secondary">เฉพาะพัสดุ การเงิน และผู้อนุมัติ</Text></Descriptions.Item>}
            {d.can.see_money && <Descriptions.Item label="ผู้ติดต่อ">{[d.vendor_contact, d.vendor_phone].filter(Boolean).join(' · ') || '—'}</Descriptions.Item>}
            {d.can.see_money && <Descriptions.Item label="เลขผู้เสียภาษี">{d.vendor_tax_id ?? '—'}</Descriptions.Item>}
            <Descriptions.Item label="วันลงนาม">{fmtDate(d.signed_date)}</Descriptions.Item>
            <Descriptions.Item label="วันส่งมอบ">{fmtDate(d.delivered_date)}</Descriptions.Item>
            <Descriptions.Item label="วันตรวจรับ">{fmtDate(d.accepted_date)}</Descriptions.Item>
            <Descriptions.Item label="ระยะประกัน">{d.warranty_months} เดือน</Descriptions.Item>
            <Descriptions.Item label="วันหมดประกัน (T)"><Text strong>{fmtDate(d.warranty_end_date)}</Text></Descriptions.Item>
            <Descriptions.Item label="รอบตรวจตามสัญญา">{d.periodic_months ? `ทุก ${d.periodic_months} เดือน` : 'ไม่มี'}</Descriptions.Item>
            {d.special_terms && <Descriptions.Item label="เงื่อนไขพิเศษ" span={2}>{d.special_terms}</Descriptions.Item>}
          </Descriptions>

          <Divider titlePlacement="left">งานตามกำหนด</Divider>
          {miniTable([
            { title: 'งาน', dataIndex: 'title' },
            { title: 'ผู้รับผิดชอบ', dataIndex: 'duty', render: (v: string) => TASK_DUTIES[v] },
            { title: 'กำหนด', dataIndex: 'due_date', render: (v: string, r: any) => r.status === 'open' ? <DueTag state={r.due_state} date={v} /> : fmtDate(v) },
            { title: 'สถานะ', dataIndex: 'status', render: (v: string, r: any) => v === 'done' ? <Tag color="success" icon={<CheckCircleOutlined />}>เสร็จ {r.done_at ? dayjs(r.done_at).locale('th').format(DATE_FORMAT) : ''}</Tag> : <Tag>ยังไม่เสร็จ</Tag> },
            ...(extra.tasks ?? []),
          ], d.tasks, 'ยังไม่มีงาน — พัสดุตั้งวันหมดประกันแล้วระบบจะสร้างงานให้')}

          <Divider titlePlacement="left">ผู้รับผิดชอบ</Divider>
          {miniTable([
            { title: 'หน้าที่', dataIndex: 'duty', render: (v: string) => DUTIES[v] },
            { title: 'ผู้รับผิดชอบ', dataIndex: 'user_name' },
            { title: 'ผู้สำรอง', dataIndex: 'backup_name', render: (v: string | null) => v ?? '—' },
          ], d.staff, 'ยังไม่ได้มอบหมาย')}

          {d.can.see_money && (
            <>
              <Divider titlePlacement="left">หลักประกัน</Divider>
              {miniTable([
                { title: 'ประเภท', dataIndex: 'guarantee_type', render: (v: string, r: any) => <>{GUARANTEE_TYPES[v]}{r.doc_no ? ` · ${r.doc_no}` : ''}</> },
                { title: 'จำนวนเงิน', dataIndex: 'amount', align: 'right', render: fmtMoney },
                { title: 'หมดอายุ', dataIndex: 'expiry_date', render: (v: string | null, r: any) => r.expiring ? <Tag color="error" icon={<ExclamationCircleOutlined />}>{fmtDate(v)} ไม่คุ้มวันหมดประกัน</Tag> : fmtDate(v) },
                { title: 'ที่เก็บ', dataIndex: 'storage_location' },
                { title: 'สถานะ', dataIndex: 'status', render: (v: string, r: any) => <><Tag color={GUARANTEE_STATUS[v]?.color}>{GUARANTEE_STATUS[v]?.label}</Tag>{r.paid_date ? fmtDate(r.paid_date) : ''}</> },
                { title: 'ยอดสุทธิ', dataIndex: 'net_amount', align: 'right', render: (v: number | null, r: any) => v == null ? '—' : <>{fmtMoney(v)}{r.deduct_amount > 0 ? <Text type="secondary"> (หัก {fmtMoney(r.deduct_amount)})</Text> : null}</> },
                ...(extra.guarantees ?? []),
              ], d.guarantees, 'การเงินยังไม่ได้บันทึกหลักประกัน')}

              <Divider titlePlacement="left">เรื่องเสนอคืน</Divider>
              {miniTable([
                { title: 'วันพ้นภาระ', dataIndex: 'released_date', render: fmtDate },
                { title: 'กำหนดคืน', dataIndex: 'due_date', render: fmtDate },
                { title: 'ผู้เสนอ', dataIndex: 'proposer_name' },
                { title: 'สถานะ', dataIndex: 'status', render: (v: string) => <Tag color={RETURN_STATUS[v]?.color}>{RETURN_STATUS[v]?.label}</Tag> },
                { title: 'ผู้พิจารณา', dataIndex: 'decider_name', render: (v: string | null) => v ?? '—' },
                { title: 'หมายเหตุ', dataIndex: 'decision_note', render: (v: string | null, r: any) => v ?? r.memo ?? '—' },
              ], d.returns, 'ยังไม่มีเรื่องเสนอคืน')}

              <Divider titlePlacement="left">ทะเบียนเอกสาร</Divider>
              {miniTable([
                { title: 'เอกสาร', dataIndex: 'title', render: (v: string, r: any) => <>{v} <Text type="secondary">({DOC_TYPES[r.doc_type] ?? r.doc_type})</Text></> },
                { title: 'ผู้ถือ', dataIndex: 'holder_name' },
                { title: 'ผู้เก็บสำรอง', dataIndex: 'backup_name', render: (v: string | null) => v ?? '—' },
                { title: 'ที่เก็บ', dataIndex: 'location' },
                { title: 'ตรวจนับล่าสุด', dataIndex: 'last_checked_date', render: (v: string | null, r: any) => v ? <>{fmtDate(v)} {r.check_result === 'missing' ? <Tag color="error">ไม่พบ</Tag> : <Tag color="success">พบ</Tag>}</> : '—' },
                ...(extra.documents ?? []),
              ], d.documents, 'ยังไม่ได้ลงทะเบียนเอกสาร')}
            </>
          )}

          <Divider titlePlacement="left">ผลการตรวจ</Divider>
          {miniTable([
            { title: 'วันที่ตรวจ', dataIndex: 'inspected_date', render: fmtDate },
            { title: 'รอบ', dataIndex: 'kind', render: (v: string) => v === 'final' ? 'รอบสุดท้าย' : 'ตามรอบสัญญา' },
            { title: 'ผู้ตรวจ', dataIndex: 'inspector_name' },
            { title: 'ผล', dataIndex: 'result', render: (v: string) => v === 'pass' ? <Tag color="success" icon={<CheckCircleOutlined />}>ไม่พบชำรุด</Tag> : <Tag color="error" icon={<ExclamationCircleOutlined />}>พบชำรุด</Tag> },
            { title: 'รายละเอียด', dataIndex: 'detail', render: (v: string | null) => v ?? '—' },
          ], d.inspections, 'ยังไม่มีผลตรวจ')}

          <Divider titlePlacement="left">ความชำรุด</Divider>
          {miniTable([
            { title: 'วันที่พบ', dataIndex: 'found_date', render: fmtDate },
            { title: 'รายละเอียด', dataIndex: 'detail' },
            { title: 'ผู้แจ้ง', dataIndex: 'reporter_name' },
            { title: 'แจ้งผู้รับจ้าง', dataIndex: 'notified_vendor_date', render: fmtDate },
            { title: 'สถานะ', dataIndex: 'fixed_date', render: (v: string | null) => v ? <Tag color="success" icon={<CheckCircleOutlined />}>ซ่อมเสร็จ {fmtDate(v)}</Tag> : <Tag color="error" icon={<ExclamationCircleOutlined />}>ค้าง</Tag> },
            ...(extra.defects ?? []),
          ], d.defects, 'ไม่มีรายการชำรุด')}

          <Divider titlePlacement="left">บันทึกแก้ไขสัญญา</Divider>
          {miniTable([
            { title: 'เลขที่', dataIndex: 'amendment_no' },
            { title: 'วันที่', dataIndex: 'amendment_date', render: fmtDate },
            { title: 'ประเภท', dataIndex: 'change_type', render: (v: string) => AMENDMENT_TYPES[v] },
            { title: 'รายละเอียด', dataIndex: 'detail' },
            { title: 'วันหมดประกัน', dataIndex: 'new_warranty_end_date', render: (v: string | null, r: any) => v ? <>{fmtDate(r.old_warranty_end_date)} → {fmtDate(v)}</> : '—' },
            { title: 'เดือนประกัน', dataIndex: 'add_warranty_months', align: 'right', render: (v: number) => v ? (v > 0 ? `+${v}` : v) : '—' },
          ], d.amendments, 'ไม่มีการแก้ไขสัญญา')}

          {d.audit?.length > 0 && (
            <>
              <Divider titlePlacement="left">ประวัติการทำรายการ</Divider>
              {miniTable([
                { title: 'เวลา', dataIndex: 'created_at', render: (v: string) => dayjs(v).locale('th').format('DD/MM/BBBB HH:mm') },
                { title: 'ผู้ทำรายการ', dataIndex: 'actor_name' },
                { title: 'รายการ', dataIndex: 'action' },
                { title: 'ข้อมูล', dataIndex: 'entity' },
              ], d.audit, '')}
            </>
          )}
        </>
      )}
    </Drawer>
  )
}
