'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
  App, Typography, Card, Tag, Button, Table, Input, Select, Empty, Statistic, Row as ARow, Col,
  Drawer, Descriptions, Switch, Tooltip, Modal, Checkbox, Space,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, ReloadOutlined, EyeOutlined, LinkOutlined } from '@ant-design/icons'
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

const card = { background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }

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
      title: '', width: 60, align: 'center',
      render: (_, r) => <Tooltip title="ดูประวัติรายงวด"><Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)} /></Tooltip>,
    },
  ]

  const monthCols: ColumnsType<Month> = [
    { title: 'งวด', dataIndex: 'mt', render: (v: string) => fmtMt(v) },
    { title: 'รายรับ', dataIndex: 'income', align: 'right', render: money },
    { title: 'รายการหัก', dataIndex: 'deduction', align: 'right', render: money },
    { title: 'สุทธิ', dataIndex: 'net', align: 'right', render: (v: number) => <Text strong>{money(v)}</Text> },
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
