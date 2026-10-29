'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
  App, Typography, Card, Tag, Button, Table, Input, Select, Empty, Statistic, Row as ARow, Col,
  Drawer, Descriptions, Switch, Tooltip, Modal, Checkbox, Space,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, ReloadOutlined, EyeOutlined, LinkOutlined, FileTextOutlined, PrinterOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'
import type { SalarySlipData } from '@/app/components/SalarySlipPDF'
import { MatchBadge, LookupCard, fetchLookup, fmtMt, money, type Lookup, type NameMatch } from './shared'

const { Text } = Typography

type Row = {
  id: string; name: string
  ptype: string | null; ptype_name: string | null
  seccode: string | null; section_name: string | null
  bank: string | null; bankbranch: string | null; acc_masked: string | null
  income: number | null; deduction: number | null; net: number | null
  linked_user: { id: number; name: string } | null
  name_match: NameMatch
}
type Opt = { value: string; label: string }
type Stats = { total: number; in_period: number; linked: number; unlinked: number }
type Month = { mt: string; income: number; deduction: number; net: number }
type Detail = { person: Row; years: number[]; year: number | null; months: Month[] }
type UserHit = { id: number; name: string; username: string; salary_ids: { salary_id: number }[] }
type SlipItem = { code: string; label: string; amount: number }
type Slip = {
  mt: string; salary_ids: string[]; earnings: SlipItem[]; deductions: SlipItem[]; total_earnings: number; total_deductions: number; net: number
  // ผูกกับผู้ใช้แล้วเท่านั้นจึงมีหัวสลิป (ชื่อ/ตำแหน่ง/กลุ่มงาน) ให้พิมพ์ PDF
  linked_user: { id: number; name: string } | null
  employee: { position: string; staff_type: string; department: string } | null
}
// ข้อมูลของหน้าต่างรายละเอียด — slip = null ระหว่างโหลด
type SlipView = { id: string; name: string; mt: string; slip: Slip | null }

const card = { background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }

// PDF สลิปตัวเดียวกับหน้า /accounting/salary — โหลดเฉพาะตอนเปิด (react-pdf ใหญ่ และใช้ฝั่ง client เท่านั้น)
const SalarySlipPDFViewer = dynamic(() => import('@/app/components/SalarySlipPDF'), { ssr: false })
const THAI_MONTHS = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

const toSlipData = (id: string, s: Slip): SalarySlipData | null => s.linked_user && ({
  employee: {
    id,
    salaryNo: s.salary_ids?.length ? s.salary_ids.join(', ') : id,
    name: s.linked_user.name,
    position: s.employee?.position ?? '',
    department: s.employee?.department ?? '',
    staffType: s.employee?.staff_type ?? '',
  },
  monthLabel: `${THAI_MONTHS[Number(s.mt.slice(4, 6))]} พ.ศ. ${s.mt.slice(0, 4)}`,
  earnings: s.earnings.map(i => ({ label: i.label, amount: i.amount })),
  deductions: s.deductions.map(i => ({ label: i.label, amount: i.amount })),
  totalEarnings: s.total_earnings,
  totalDeductions: s.total_deductions,
  netSalary: s.net,
})

/** ทะเบียนเงินเดือน (salarydb) — ใช้เป็นแท็บในหน้า "เลขที่เงินเดือนบุคลากร" ผูกเลขให้ผู้ใช้ได้จากที่นี่ */
export default function RegisterTab() {
  const { message } = App.useApp()

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [periods, setPeriods] = useState<string[]>([])
  const [ptypes, setPtypes] = useState<Opt[]>([])
  const [sections, setSections] = useState<Opt[]>([])
  const [loading, setLoading] = useState(true)

  const [mt, setMt] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [ptype, setPtype] = useState<string | undefined>()
  const [seccode, setSeccode] = useState<string | undefined>()
  const [link, setLink] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [onlyPeriod, setOnlyPeriod] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // รายละเอียดรายการรับ/หักของงวดที่เลือก
  const [slipView, setSlipView] = useState<SlipView | null>(null)
  const [pdfData, setPdfData] = useState<SalarySlipData | null>(null)
  const openSlip = async (id: string, name: string, m: string) => {
    setSlipView({ id, name, mt: m, slip: null })
    try {
      const j = await fetch(`/api/v1/accounting/salary-register/${id}/slip/${m}`).then(r => r.json())
      if (!j?.success) { message.error(j?.message || 'โหลดรายละเอียดไม่สำเร็จ'); setSlipView(null); return }
      // ผู้ใช้อาจกดงวดอื่นไปแล้วระหว่างรอ — ใส่ผลเฉพาะงวดที่ยังเปิดอยู่
      setSlipView(v => (v && v.id === id && v.mt === m ? { ...v, slip: j.data } : v))
    } catch (e) {
      message.error((e as Error).message)
      setSlipView(null)
    }
  }

  // ผูกเลขให้ผู้ใช้
  const [linkRow, setLinkRow] = useState<Row | null>(null)
  const [userHits, setUserHits] = useState<UserHit[]>([])
  const [userId, setUserId] = useState<number | undefined>()
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const userTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  type Opts = { mt?: string; search?: string; ptype?: string | null; seccode?: string | null; link?: string; onlyPeriod?: boolean; page?: number; pageSize?: number }
  const load = async (o?: Opts) => {
    const m = o?.mt ?? mt
    const s = o?.search ?? search
    const pt = o && 'ptype' in o ? o.ptype : ptype
    const sc = o && 'seccode' in o ? o.seccode : seccode
    const lk = o?.link ?? link
    const op = o?.onlyPeriod ?? onlyPeriod
    const p = o?.page ?? page
    const ps = o?.pageSize ?? pageSize
    setLoading(true)
    try {
      const qs = new URLSearchParams({ link: lk, scope: op ? 'period' : 'all', limit: String(ps), offset: String((p - 1) * ps) })
      if (m) qs.set('mt', m)
      if (s.trim()) qs.set('search', s.trim())
      if (pt) qs.set('ptype', pt)
      if (sc) qs.set('seccode', sc)
      const j = await fetch(`/api/v1/accounting/salary-register?${qs.toString()}`).then(r => r.json())
      if (!j?.success) { message.error(j?.message || 'โหลดข้อมูลไม่สำเร็จ'); return }
      setRows(j.data.rows ?? [])
      setTotal(j.data.total ?? 0)
      setStats(j.data.stats ?? null)
      setPeriods(j.data.periods ?? [])
      setPtypes(j.data.ptypes ?? [])
      setSections(j.data.sections ?? [])
      setMt(j.data.mt)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => load())
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      if (userTimer.current) clearTimeout(userTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reload = (o: Opts) => { setPage(1); load({ ...o, page: 1 }) }

  const onSearchChange = (v: string) => {
    setSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => reload({ search: v }), 400)
  }

  const openDetail = async (id: string, year?: number) => {
    setOpenId(id)
    setDetailLoading(true)
    try {
      const j = await fetch(`/api/v1/accounting/salary-register/${id}${year ? `?year=${year}` : ''}`).then(r => r.json())
      if (!j?.success) { message.error(j?.message || 'โหลดข้อมูลไม่สำเร็จ'); return }
      setDetail(j.data)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }

  // ── ผูกเลขให้ผู้ใช้ ──
  const searchUsers = (q: string) => {
    if (userTimer.current) clearTimeout(userTimer.current)
    userTimer.current = setTimeout(async () => {
      if (q.trim().length < 2) { setUserHits([]); return }
      try {
        const j = await fetch(`/api/v1/accounting/salary-ids?search=${encodeURIComponent(q.trim())}&status=all&limit=20`).then(r => r.json())
        if (j?.success) setUserHits(j.data.rows ?? [])
      } catch { /* ignore */ }
    }, 300)
  }

  const openLink = (r: Row) => {
    setLinkRow(r); setUserHits([]); setUserId(undefined); setLookup(null); setConfirmed(false)
  }

  const pickUser = async (uid: number) => {
    if (!linkRow) return
    setUserId(uid); setLookup(null); setConfirmed(false); setLookupLoading(true)
    const res = await fetchLookup(linkRow.id, uid)
    setLookupLoading(false)
    if (res.ok) setLookup(res.data); else message.error(res.message)
  }

  const submitLink = async () => {
    if (!linkRow || !userId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/accounting/salary-ids/${userId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salary_id: Number(linkRow.id), source: 'register', note: lookup?.name_match === 'mismatch' ? 'ผูกจากทะเบียน (ชื่อไม่ตรง ยืนยันโดยเจ้าหน้าที่)' : null }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j.message || 'ผูกเลขไม่สำเร็จ'); return }
      message.success(`ผูกเลขที่เงินเดือน ${linkRow.id} แล้ว`)
      setLinkRow(null)
      await load()
    } catch (e) { message.error((e as Error).message) } finally { setBusy(false) }
  }

  const selectedUser = userHits.find(u => u.id === userId)
  const canSubmit = !!userId && !!lookup && !lookup.taken_by && (lookup.name_match !== 'mismatch' || confirmed)

  const cols: ColumnsType<Row> = [
    { title: 'เลขที่เงินเดือน', dataIndex: 'id', width: 120, render: (v: string) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
    { title: 'ชื่อ-สกุล (ทะเบียนเงินเดือน)', dataIndex: 'name', render: (v: string) => v || '-' },
    { title: 'ประเภท', dataIndex: 'ptype_name', width: 130, render: (v: string | null) => (v ? <Tag>{v}</Tag> : '-') },
    { title: 'หน่วยงาน', dataIndex: 'section_name', width: 150, render: (v: string | null) => v ?? '-' },
    {
      title: 'ธนาคาร / บัญชี', width: 160,
      render: (_, r) => (r.bank || r.acc_masked
        ? <div><div>{r.bank ?? '-'}{r.bankbranch ? ` · ${r.bankbranch}` : ''}</div><Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.acc_masked ?? '-'}</Text></div>
        : '-'),
    },
    { title: 'สุทธิ', dataIndex: 'net', width: 110, align: 'right', render: (v: number | null) => <Text strong style={{ color: v == null ? undefined : '#10b981' }}>{money(v)}</Text> },
    {
      title: 'ผู้ใช้ที่ผูก', dataIndex: 'linked_user', width: 220,
      render: (u: Row['linked_user'], r) => (u
        ? <Space size={6}><Tag color="green" style={{ margin: 0 }}>{u.name}</Tag><MatchBadge match={r.name_match} payName={r.name} /></Space>
        : <Button size="small" icon={<LinkOutlined />} onClick={() => openLink(r)}>ผูก</Button>),
    },
    {
      title: '', width: 96, align: 'center',
      render: (_, r) => (
        <Space size={4}>
          {/* รายละเอียดของงวดที่เลือกอยู่ — มีเฉพาะคนที่มีเงินเดือนในงวดนั้น */}
          {r.net != null && mt && (
            <Tooltip title={`รายละเอียดเงินเดือน ${fmtMt(mt)}`}>
              <Button size="small" icon={<FileTextOutlined />} onClick={() => openSlip(r.id, r.name, mt)} />
            </Tooltip>
          )}
          <Tooltip title="ดูประวัติรายงวด"><Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)} /></Tooltip>
        </Space>
      ),
    },
  ]

  const monthCols: ColumnsType<Month> = [
    { title: 'งวด', dataIndex: 'mt', render: (v: string) => fmtMt(v) },
    { title: 'รายรับ', dataIndex: 'income', align: 'right', render: money },
    { title: 'รายการหัก', dataIndex: 'deduction', align: 'right', render: money },
    { title: 'สุทธิ', dataIndex: 'net', align: 'right', render: (v: number) => <Text strong>{money(v)}</Text> },
    {
      title: '', key: 'slip', width: 100, align: 'center',
      render: (_, r) => detail && (
        <Button size="small" icon={<FileTextOutlined />} onClick={() => openSlip(detail.person.id, detail.person.name, r.mt)}>รายละเอียด</Button>
      ),
    },
  ]

  return (
    <>
      <ARow gutter={[12, 12]} className="mb-4">
        <Col xs={12} md={6}><Card size="small" style={card}><Statistic title="ทะเบียนทั้งหมด" value={stats?.total ?? 0} /></Card></Col>
        <Col xs={12} md={6}><Card size="small" style={card}><Statistic title={`มีเงินเดือนในงวด ${mt ? fmtMt(mt) : ''}`} value={stats?.in_period ?? 0} styles={{ content: { color: '#10b981' } }} /></Card></Col>
        <Col xs={12} md={6}><Card size="small" style={card}><Statistic title="ผูกกับผู้ใช้แล้ว" value={stats?.linked ?? 0} /></Card></Col>
        <Col xs={12} md={6}><Card size="small" style={card}><Statistic title="ยังไม่ผูก" value={stats?.unlinked ?? 0} styles={{ content: { color: '#f59e0b' } }} /></Card></Col>
      </ARow>

      <Card style={card} styles={{ body: { padding: 12 } }}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input
            allowClear prefix={<SearchOutlined />} placeholder="ค้นหาชื่อ / เลขที่เงินเดือน"
            value={search} onChange={(e) => onSearchChange(e.target.value)} style={{ maxWidth: 240 }}
          />
          <Select
            value={mt} style={{ width: 130 }} placeholder="งวด"
            onChange={(v) => { setMt(v); reload({ mt: v }) }}
            options={periods.map(p => ({ value: p, label: fmtMt(p) }))}
          />
          <Select
            allowClear placeholder="ทุกประเภท" style={{ width: 160 }} value={ptype}
            onChange={(v) => { setPtype(v); reload({ ptype: v ?? null }) }}
            options={ptypes.map(o => ({ value: o.value, label: o.label }))}
          />
          <Select
            allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="ทุกหน่วยงาน" style={{ width: 190 }} value={seccode}
            onChange={(v) => { setSeccode(v); reload({ seccode: v ?? null }) }}
            options={sections.map(o => ({ value: o.value, label: o.label }))}
          />
          <Select
            value={link} style={{ width: 150 }}
            onChange={(v) => { setLink(v); reload({ link: v }) }}
            options={[
              { value: 'all', label: 'ผูกผู้ใช้: ทั้งหมด' },
              { value: 'linked', label: 'ผูกแล้ว' },
              { value: 'unlinked', label: 'ยังไม่ผูก' },
            ]}
          />
          <span className="flex items-center gap-2">
            <Switch checked={onlyPeriod} onChange={(v) => { setOnlyPeriod(v); reload({ onlyPeriod: v }) }} />
            <Text type="secondary">เฉพาะผู้มีเงินเดือนในงวดนี้</Text>
          </span>
          <Button icon={<ReloadOutlined />} onClick={() => load()}>รีเฟรช</Button>
        </div>

        <Table
          columns={cols} dataSource={rows} rowKey="id" loading={loading} size="small" scroll={{ x: 1150 }}
          pagination={{
            current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: [20, 50, 100, 200],
            showTotal: (t) => `ทั้งหมด ${t.toLocaleString()} รายการ`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); load({ page: p, pageSize: ps }) },
          }}
          locale={{ emptyText: <Empty description="ไม่พบรายการตามเงื่อนไขที่เลือก" /> }}
        />
      </Card>

      <Modal
        title={linkRow ? `ผูกเลขที่เงินเดือน ${linkRow.id} — ${linkRow.name}` : 'ผูกเลขที่เงินเดือน'}
        open={!!linkRow} onCancel={() => setLinkRow(null)} destroyOnHidden width={560}
        okText="ผูกเลขนี้" cancelText="ยกเลิก" onOk={submitLink}
        okButtonProps={{ disabled: !canSubmit, loading: busy }}
      >
        <Text type="secondary">เลือกผู้ใช้ในระบบที่เป็นเจ้าของเลขนี้ ระบบจะเทียบชื่อ-สกุลกับทะเบียนเงินเดือนให้ตรวจสอบก่อนผูก</Text>
        <Select
          className="mt-3" style={{ width: '100%' }} showSearch={{ filterOption: false, onSearch: searchUsers }}
          placeholder="พิมพ์ชื่อ หรือชื่อผู้ใช้ อย่างน้อย 2 ตัวอักษร"
          value={userId} onChange={pickUser} loading={lookupLoading}
          notFoundContent={<Text type="secondary">พิมพ์เพื่อค้นหา</Text>}
          options={userHits.map(u => ({
            value: u.id,
            label: `${u.name} (${u.username})${u.salary_ids.length > 0 ? ` · มีเลขแล้ว ${u.salary_ids.length}` : ''}`,
          }))}
        />
        {lookup && <LookupCard lk={lookup} userName={selectedUser?.name} />}
        {lookup && lookup.name_match === 'mismatch' && !lookup.taken_by && (
          <Checkbox className="mt-3" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}>
            ตรวจสอบแล้ว ยืนยันว่าเป็นบุคคลเดียวกัน (เช่น เปลี่ยนชื่อ-สกุล)
          </Checkbox>
        )}
      </Modal>

      <Modal
        title={slipView ? `รายละเอียดเงินเดือน ${fmtMt(slipView.mt)} — ${slipView.name}` : 'รายละเอียดเงินเดือน'}
        open={!!slipView} onCancel={() => setSlipView(null)} footer={null} width={720} destroyOnHidden
        loading={!!slipView && !slipView.slip}
      >
        {slipView?.slip && (() => {
          const s = slipView.slip
          return (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Text type="secondary">เลขที่เงินเดือน <Text strong style={{ fontFamily: 'monospace' }}>{slipView.id}</Text></Text>
                {s.linked_user ? (
                  <Button type="primary" icon={<PrinterOutlined />} onClick={() => setPdfData(toSlipData(slipView.id, s))}>
                    พิมพ์สลิป PDF
                  </Button>
                ) : (
                  <Tooltip title="ผูกเลขที่เงินเดือนนี้กับผู้ใช้ก่อน จึงจะมีชื่อ ตำแหน่ง และกลุ่มงานสำหรับหัวสลิป">
                    <Button icon={<PrinterOutlined />} disabled>พิมพ์สลิป PDF (ยังไม่ผูกผู้ใช้)</Button>
                  </Tooltip>
                )}
              </div>
              <ARow gutter={[24, 16]} className="mt-3">
                {([
                  ['รายการรับ', s.earnings, s.total_earnings, '#10b981'],
                  ['รายการหัก', s.deductions, s.total_deductions, '#ef4444'],
                ] as const).map(([title, items, total, color]) => (
                  <Col xs={24} md={12} key={title}>
                    <div style={{ fontWeight: 600, color, borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 4 }}>
                      {title} <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>{items.length} รายการ</Text>
                    </div>
                    {items.length === 0 && <Text type="secondary" style={{ fontSize: 13 }}>ไม่มีรายการ</Text>}
                    {items.map(it => (
                      <div key={it.code} className="flex justify-between gap-3" style={{ padding: '5px 0', fontSize: 14, borderBottom: '1px dashed var(--app-border)' }}>
                        <span>{it.label}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(it.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3" style={{ padding: '6px 0 0', fontSize: 14, fontWeight: 700 }}>
                      <span>รวม{title}</span>
                      <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{money(total)}</span>
                    </div>
                  </Col>
                ))}
              </ARow>
              <div className="mt-4 flex flex-wrap justify-between gap-2" style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--app-border-strong)' }}>
                <Text>รายรับ {money(s.total_earnings)} − รายการหัก {money(s.total_deductions)}</Text>
                <Text strong style={{ color: '#0284c7', fontSize: 16 }}>เงินสุทธิ {money(s.net)} บาท</Text>
              </div>
            </>
          )
        })()}
      </Modal>

      <Modal
        title={pdfData ? `สลิปเงินเดือน ${pdfData.monthLabel} — ${pdfData.employee.name}` : 'สลิปเงินเดือน'}
        open={!!pdfData} onCancel={() => setPdfData(null)} footer={null}
        width="90%" style={{ top: 24, maxWidth: 1100 }}
        styles={{ body: { padding: 0, height: '80vh' } }}
        destroyOnHidden
      >
        {pdfData && (
          <div style={{ width: '100%', height: '100%' }}>
            <SalarySlipPDFViewer data={pdfData} />
          </div>
        )}
      </Modal>

      <Drawer
        title={detail ? `ประวัติเงินเดือน — ${detail.person.name}` : 'ประวัติเงินเดือน'}
        open={openId != null} size={560}
        onClose={() => { setOpenId(null); setDetail(null) }}
        loading={detailLoading}
      >
        {detail && (
          <>
            <Descriptions size="small" column={1} bordered className="mb-4">
              <Descriptions.Item label="เลขที่เงินเดือน">{detail.person.id}</Descriptions.Item>
              <Descriptions.Item label="ประเภทบุคลากร">{detail.person.ptype_name ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{detail.person.section_name ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="บัญชีธนาคาร">{detail.person.bank ?? '-'} {detail.person.acc_masked ?? ''}</Descriptions.Item>
              <Descriptions.Item label="ผู้ใช้ในระบบ">
                {detail.person.linked_user
                  ? <Space size={6}><Tag color="green" style={{ margin: 0 }}>{detail.person.linked_user.name}</Tag><MatchBadge match={detail.person.name_match} payName={detail.person.name} /></Space>
                  : <Text type="secondary">ยังไม่ผูก</Text>}
              </Descriptions.Item>
            </Descriptions>
            {detail.years.length === 0 ? (
              <Empty description="ไม่มีข้อมูลเงินเดือนรายงวดของเลขนี้" />
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <Text>ปี พ.ศ.</Text>
                  <Select
                    value={detail.year ?? undefined} style={{ width: 120 }}
                    onChange={(y) => openDetail(detail.person.id, y)}
                    options={detail.years.map(y => ({ value: y, label: String(y) }))}
                  />
                </div>
                <Table columns={monthCols} dataSource={detail.months} rowKey="mt" size="small" pagination={false} />
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  )
}
