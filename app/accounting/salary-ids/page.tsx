'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Tag, theme, Button, Table,
  Input, Select, Space, Empty, Alert, Statistic, Row, Col, Progress, Result,
  Drawer, Divider, Tooltip, Tabs, Checkbox,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  HomeOutlined, SearchOutlined, DeleteOutlined, ReloadOutlined,
  PlusOutlined, StarFilled, StarOutlined, SettingOutlined,
} from '@ant-design/icons'
import { FaIdCard } from 'react-icons/fa'
import RegisterTab from '@/app/accounting/salary-register/RegisterTab'
import { MatchBadge, LookupCard, fetchLookup, type Lookup, type NameMatch } from '@/app/accounting/salary-register/shared'
import Cookies from 'js-cookie'
import Swal from 'sweetalert2'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { SALARY_ID_ROLES as ALLOWED_ROLES } from '@/app/lib/menuAccess'

const { Title, Text } = Typography


type SalaryLinkBrief = { salary_id: number; is_current: boolean; source: string; note: string | null; payroll_name?: string | null; name_match?: NameMatch }
type Row = {
  id: number
  username: string
  name: string
  position_name?: string | null
  major_name?: string | null
  submajor_name?: string | null
  salary_ids: SalaryLinkBrief[]
}
type Stats = { total: number; filled: number; missing: number; self_only?: number; total_links: number; multi_id_users: number }
type Major = { major_id: number; name: string; staff_count: number }
type Period = { from: string | null; to: string | null; count: number }
// id = null → เลขที่ผู้ใช้กรอกเอง (users.salary_id) ยังไม่อยู่ในตารางผูก
type Linked = { id: number | null; salary_id: number; is_current: boolean; source: string; note: string | null; period: Period | null; payroll_name?: string | null; name_match?: NameMatch }
type Suggestion = {
  salary_id: number; fname: string; lname: string
  match: 'id_card' | 'name'; confidence: 'high' | 'medium'
  period: Period | null; taken_by: string | null
}

// mt = พ.ศ. YYYYMM00 → "มิ.ย. 2569"
const TH_MON = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const fmtMt = (mt: string | null) => {
  if (!mt || mt.length < 6) return '-'
  return `${TH_MON[Number(mt.slice(4, 6))] ?? ''} ${mt.slice(0, 4)}`
}
const fmtPeriod = (p: Period | null) =>
  p && p.from ? `${fmtMt(p.from)} – ${fmtMt(p.to)} (${p.count} งวด)` : 'ไม่มีข้อมูลเงินเดือน'

const PageContent = () => {
  const { message } = App.useApp()

  const [rows, setRows] = useState<Row[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [majors, setMajors] = useState<Major[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'missing' | 'filled'>('missing')
  const [majorId, setMajorId] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Drawer จัดการเลขของ 1 คน
  const [openId, setOpenId] = useState<number | null>(null)
  const [detail, setDetail] = useState<{ user: { id: number; name: string; username: string }; linked: Linked[]; suggestions: Suggestion[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [manualId, setManualId] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'people' | 'register'>('people')
  // อ่าน ?tab= หลัง mount — อ่านตอน render แรกจะได้ค่าไม่ตรงกับ HTML จาก server (hydration mismatch)
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (new URLSearchParams(window.location.search).get('tab') === 'register') setTab('register')
    })
  }, [])
  // ตรวจเลขก่อนผูกเอง: ดูชื่อในทะเบียนเงินเดือนเทียบกับผู้ใช้
  const [manualLookup, setManualLookup] = useState<Lookup | null>(null)
  const [manualChecking, setManualChecking] = useState(false)
  const [manualConfirmed, setManualConfirmed] = useState(false)

  const load = async (opts?: { search?: string; status?: string; majorId?: number; page?: number; pageSize?: number }) => {
    const s = opts?.search ?? search
    const st = opts?.status ?? status
    const mj = opts?.majorId !== undefined ? opts.majorId : majorId
    const p = opts?.page ?? page
    const ps = opts?.pageSize ?? pageSize
    setLoading(true)
    try {
      const qs = new URLSearchParams({ status: st, limit: String(ps), offset: String((p - 1) * ps) })
      if (s.trim()) qs.set('search', s.trim())
      if (mj) qs.set('major_id', String(mj))
      const j = await fetch(`/api/v1/accounting/salary-ids?${qs.toString()}`).then(r => r.json())
      if (!j?.success) { message.error(j?.message || 'โหลดข้อมูลไม่สำเร็จ'); return }
      setRows(j.data.rows ?? [])
      setTotal(j.data.total ?? 0)
      setStats(j.data.stats ?? null)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      Promise.resolve().then(() => load()),
      fetch('/api/v1/accounting/salary-ids/meta').then(r => r.json())
        .then(j => { if (j?.success) setMajors(j.data.majors ?? []) }).catch(() => {}),
    ])
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSearchChange = (v: string) => {
    setSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); load({ search: v, page: 1 }) }, 400)
  }

  const openDetail = async (userId: number) => {
    setOpenId(userId)
    setManualId('')
    setDetailLoading(true)
    try {
      const j = await fetch(`/api/v1/accounting/salary-ids/${userId}`).then(r => r.json())
      if (!j?.success) { message.error(j?.message || 'โหลดข้อมูลไม่สำเร็จ'); return }
      setDetail(j.data)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshDetail = async () => {
    if (openId != null) await openDetail(openId)
    await load()
  }

  const checkManual = async () => {
    if (!manualId || openId == null) return
    setManualChecking(true); setManualLookup(null); setManualConfirmed(false)
    const res = await fetchLookup(manualId, openId)
    setManualChecking(false)
    if (res.ok) setManualLookup(res.data); else message.error(res.message)
  }

  const addLink = async (salaryId: number, source: string, note?: string) => {
    if (openId == null) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/accounting/salary-ids/${openId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salary_id: salaryId, source, note: note ?? null }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j.message || 'ผูกเลขไม่สำเร็จ'); return }
      message.success(`ผูกเลขที่เงินเดือน ${salaryId} แล้ว`)
      setManualId(''); setManualLookup(null); setManualConfirmed(false)
      await refreshDetail()
    } catch (e) { message.error((e as Error).message) } finally { setBusy(false) }
  }

  const setCurrent = async (link: Linked) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/accounting/salary-ids/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_current: true }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j.message || 'ตั้งค่าไม่สำเร็จ'); return }
      message.success(`ตั้งเลข ${link.salary_id} เป็นเลขปัจจุบันแล้ว`)
      await refreshDetail()
    } catch (e) { message.error((e as Error).message) } finally { setBusy(false) }
  }

  const removeLink = (link: Linked) => {
    Swal.fire({
      title: 'ยกเลิกการผูกเลขนี้?',
      html: `<div style="text-align:left;font-size:14px;line-height:1.8">
               <div>เลขที่เงินเดือน <b>${link.salary_id}</b></div>
               <div>ช่วงงวด: ${fmtPeriod(link.period)}</div>
               <div style="margin-top:10px;padding:10px;border-radius:8px;background:#fef3c7;color:#92400e">
                 เจ้าของบัญชีจะ<b>ไม่เห็นสลิปในช่วงนี้</b>อีกต่อไป
               </div>
             </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยกเลิกการผูก',
      cancelButtonText: 'ปิด',
    }).then(async r => {
      if (!r.isConfirmed) return
      setBusy(true)
      try {
        const res = await fetch(`/api/v1/accounting/salary-ids/links/${link.id}`, { method: 'DELETE' })
        const j = await res.json()
        if (!res.ok || !j.success) { message.error(j.message || 'ยกเลิกไม่สำเร็จ'); return }
        message.success('ยกเลิกการผูกแล้ว')
        await refreshDetail()
      } catch (e) { message.error((e as Error).message) } finally { setBusy(false) }
    })
  }

  const cols: ColumnsType<Row> = [
    {
      title: 'ชื่อ-นามสกุล', dataIndex: 'name',
      render: (v: string, r) => (
        <div>
          <div>{v}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.username}{r.position_name ? ` · ${r.position_name}` : ''}</Text>
        </div>
      ),
    },
    {
      title: 'สังกัด', dataIndex: 'major_name', responsive: ['lg'],
      render: (v: string | null, r) => (
        <div>
          <div style={{ fontSize: 12 }}>{v ?? '-'}</div>
          {r.submajor_name && <Text type="secondary" style={{ fontSize: 11 }}>{r.submajor_name}</Text>}
        </div>
      ),
    },
    {
      title: 'เลขที่เงินเดือน / ชื่อในทะเบียน', dataIndex: 'salary_ids', width: 380,
      render: (list: SalaryLinkBrief[]) =>
        list.length === 0
          ? <Tag color="warning">ยังไม่ผูก</Tag>
          : (
            <Space size={4} wrap>
              {list.map(s => (
                <Tag key={s.salary_id} color={s.is_current ? 'success' : 'default'} style={{ margin: 0 }}>
                  {s.is_current && <StarFilled style={{ fontSize: 10, marginRight: 4 }} />}
                  <span style={{ fontFamily: 'monospace' }}>{s.salary_id}</span>
                  {s.source === 'self' && <Tooltip title="ผู้ใช้กรอกเองในหน้าตั้งค่า — ยังไม่ได้ยืนยันผูก"><span style={{ marginLeft: 4, opacity: 0.7 }}>(กรอกเอง)</span></Tooltip>}
                  {s.payroll_name && <span style={{ marginLeft: 6 }}>{s.payroll_name}</span>}
                  <span style={{ marginLeft: 6 }}><MatchBadge match={s.name_match ?? 'unknown'} payName={s.payroll_name} /></span>
                </Tag>
              ))}
              {list.length > 1 && <Tag color="blue">{list.length} เลข</Tag>}
            </Space>
          ),
    },
    {
      title: '', width: 90, align: 'center' as const,
      render: (_, r) => (
        <Button size="small" icon={<SettingOutlined />} onClick={() => openDetail(r.id)}>จัดการ</Button>
      ),
    },
  ]

  const pct = stats && stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/accounting', title: 'การเงินและบัญชี' },
          { title: 'เลขที่เงินเดือนบุคลากร' },
        ]} />

        <div className="flex items-center gap-3 mb-2">
          <FaIdCard style={{ fontSize: 24, color: '#006a5a' }} />
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>เลขที่เงินเดือนบุคลากร</Title>
        </div>
        <Text type="secondary">
          ผูกเลขที่เงินเดือนเพื่อให้บุคลากรดูสลิปได้ — 1 คนผูกได้หลายเลข กรณีเปลี่ยนเลขตอนบรรจุ ระบบจะรวมสลิปทุกช่วงให้ต่อเนื่อง
        </Text>

        <Tabs
          className="mt-4" activeKey={tab} onChange={(k) => setTab(k as 'people' | 'register')}
          items={[
            { key: 'people', label: 'บุคลากรในระบบ (ผูกเลข)', children: (
              <>
        <Row gutter={[12, 12]} className="mt-6 mb-4">
          <Col xs={12} md={6}>
            <Card size="small" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
              <Statistic title="บุคลากรทั้งหมด" value={stats?.total ?? 0} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
              <Statistic title="ผูกแล้ว" value={stats?.filled ?? 0} styles={{ content: { color: '#10b981' } }} />
              {!!stats?.self_only && <Text type="secondary" style={{ fontSize: 12 }}>กรอกเองรอยืนยัน {stats.self_only.toLocaleString()} คน</Text>}
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
              <Statistic title="ยังไม่ผูก" value={stats?.missing ?? 0}
                styles={{ content: { color: (stats?.missing ?? 0) > 0 ? '#f59e0b' : undefined } }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>ความคืบหน้า</Text>
              <Progress percent={pct} size="small" strokeColor="#006a5a" />
              <Text type="secondary" style={{ fontSize: 11 }}>
                ผูกไว้ {stats?.total_links ?? 0} เลข · มีหลายเลข {stats?.multi_id_users ?? 0} คน
              </Text>
            </Card>
          </Col>
        </Row>

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }} styles={{ body: { padding: 12 } }}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Input
              allowClear prefix={<SearchOutlined />}
              placeholder="ค้นหาชื่อ / ชื่อผู้ใช้ / เลขที่เงินเดือน"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <Select
              value={status} style={{ width: 150 }}
              onChange={(v) => { setStatus(v); setPage(1); load({ status: v, page: 1 }) }}
              options={[
                { value: 'missing', label: 'ยังไม่ผูก' },
                { value: 'filled', label: 'ผูกแล้ว' },
                { value: 'all', label: 'ทั้งหมด' },
              ]}
            />
            <Select
              allowClear showSearch optionFilterProp="label"
              placeholder="ทุกกลุ่มงาน" style={{ minWidth: 220 }}
              value={majorId}
              onChange={(v) => { setMajorId(v); setPage(1); load({ majorId: v, page: 1 }) }}
              options={majors.map(m => ({ value: m.major_id, label: `${m.name} (${m.staff_count})` }))}
            />
            <Button icon={<ReloadOutlined />} onClick={() => load()}>รีเฟรช</Button>
          </div>

          <Table
            columns={cols} dataSource={rows} rowKey="id" loading={loading} size="small"
            pagination={{
              current: page, pageSize, total, showSizeChanger: true,
              pageSizeOptions: [20, 50, 100, 200],
              showTotal: (t) => `ทั้งหมด ${t.toLocaleString()} คน`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); load({ page: p, pageSize: ps }) },
            }}
            locale={{ emptyText: <Empty description="ไม่พบบุคลากรตามเงื่อนไขที่เลือก" /> }}
          />
        </Card>
              </>
            ) },
            { key: 'register', label: 'ทะเบียนเงินเดือน (salarydb)', children: <RegisterTab /> },
          ]}
        />
      </div>

      <Drawer
        title={detail ? `เลขที่เงินเดือน — ${detail.user.name}` : 'เลขที่เงินเดือน'}
        open={openId != null}
        onClose={() => { setOpenId(null); setDetail(null) }}
        size={640}
        loading={detailLoading}
        destroyOnHidden
      >
        {detail && (
          <>
            <Divider titlePlacement="left" style={{ marginTop: 0 }}>เลขที่ผูกไว้ ({detail.linked.length})</Divider>
            {detail.linked.length === 0 ? (
              <Empty description="ยังไม่ได้ผูกเลขที่เงินเดือน — เจ้าของบัญชีจะยังดูสลิปไม่ได้" />
            ) : detail.linked.map(l => (
              <Card key={l.id ?? `self-${l.salary_id}`} size="small" className="mb-2"
                style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Space size={6}>
                      <Text strong style={{ fontFamily: 'monospace', fontSize: 15 }}>{l.salary_id}</Text>
                      {l.is_current && <Tag color="success">เลขปัจจุบัน</Tag>}
                      {l.source === 'auto_pid' && <Tag color="blue">ค้นจากเลขบัตร</Tag>}
                      {l.source === 'migrated' && <Tag>ข้อมูลเดิม</Tag>}
                      {l.id == null && <Tag color="gold">ผู้ใช้กรอกเอง — ยังไม่ยืนยัน</Tag>}
                    </Space>
                    <div>
                      <Text style={{ fontSize: 13 }}>ชื่อในทะเบียน: {l.payroll_name ?? "ไม่พบเลขนี้ในทะเบียนปัจจุบัน"}</Text>{' '}
                      <MatchBadge match={l.name_match ?? 'unknown'} payName={l.payroll_name} />
                      {l.name_match === 'mismatch' && <Tag color="error" style={{ marginLeft: 6 }}>ชื่อไม่ตรง — ตรวจสอบ</Tag>}
                    </div>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>{fmtPeriod(l.period)}</Text></div>
                    {l.note && <div><Text type="secondary" style={{ fontSize: 11 }}>{l.note}</Text></div>}
                  </div>
                  {l.id == null ? (
                    <Tooltip title="ตรวจชื่อแล้ว ย้ายเข้าตารางผูกเลขอย่างเป็นทางการ">
                      <Button size="small" type="primary" loading={busy} onClick={() => addLink(l.salary_id, 'self', 'ยืนยันจากเลขที่ผู้ใช้กรอกเอง')}>ยืนยันผูก</Button>
                    </Tooltip>
                  ) : (
                  <Space size={4}>
                    {!l.is_current && (
                      <Tooltip title="ตั้งเป็นเลขปัจจุบัน">
                        <Button size="small" icon={<StarOutlined />} loading={busy} onClick={() => setCurrent(l)} />
                      </Tooltip>
                    )}
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeLink(l)} />
                  </Space>
                  )}
                </div>
              </Card>
            ))}

            <Divider titlePlacement="left">เลขที่ระบบค้นเจอ ({detail.suggestions.length})</Divider>
            {detail.suggestions.length === 0 ? (
              <Alert type="info" showIcon title="ไม่พบเลขอื่นในฐานข้อมูลเงินเดือน" />
            ) : (
              <>
                <Alert type="info" showIcon className="mb-3"
                  title="ตรวจสอบก่อนผูกทุกครั้ง"
                  description="เลขที่จับคู่จาก 'เลขบัตรประชาชน' แม่นยำสูง · ที่จับคู่จาก 'ชื่อ-สกุล' อาจเป็นคนละคนที่ชื่อซ้ำกัน กรุณาตรวจสอบช่วงงวดให้สอดคล้องกับประวัติการทำงานก่อนผูก" />
                {detail.suggestions.map(s => (
                  <Card key={s.salary_id} size="small" className="mb-2"
                    style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <Space size={6}>
                          <Text strong style={{ fontFamily: 'monospace', fontSize: 15 }}>{s.salary_id}</Text>
                          {s.match === 'id_card'
                            ? <Tag color="success">ตรงเลขบัตร</Tag>
                            : <Tag color="warning">ตรงชื่อ-สกุล</Tag>}
                        </Space>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>{s.fname} {s.lname}</Text></div>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>{fmtPeriod(s.period)}</Text></div>
                        {s.taken_by && <Text type="danger" style={{ fontSize: 11 }}>ผูกกับ {s.taken_by} แล้ว</Text>}
                      </div>
                      <Button
                        size="small" type="primary" icon={<PlusOutlined />}
                        disabled={!!s.taken_by} loading={busy}
                        onClick={() => addLink(s.salary_id, s.match === 'id_card' ? 'auto_pid' : 'manual',
                          s.match === 'name' ? 'จับคู่จากชื่อ-สกุล' : undefined)}
                      >ผูก</Button>
                    </div>
                  </Card>
                ))}
              </>
            )}

            <Divider titlePlacement="left">ผูกเลขเอง</Divider>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="กรอกเลขที่เงินเดือน"
                value={manualId}
                inputMode="numeric"
                onChange={(e) => { setManualId(e.target.value.replace(/\D/g, '')); setManualLookup(null); setManualConfirmed(false) }}
                onPressEnter={checkManual}
              />
              <Button loading={manualChecking} disabled={!manualId} onClick={checkManual}>ตรวจสอบ</Button>
            </Space.Compact>
            {manualLookup && <LookupCard lk={manualLookup} userName={detail.user.name} />}
            {manualLookup && manualLookup.name_match === 'mismatch' && !manualLookup.taken_by && (
              <Checkbox className="mt-3" checked={manualConfirmed} onChange={(e) => setManualConfirmed(e.target.checked)}>
                ตรวจสอบแล้ว ยืนยันว่าเป็นบุคคลเดียวกัน (เช่น เปลี่ยนชื่อ-สกุล)
              </Checkbox>
            )}
            <Button
              type="primary" className="mt-3" block loading={busy} icon={<PlusOutlined />}
              disabled={!manualLookup || !!manualLookup.taken_by || (manualLookup.name_match === 'mismatch' && !manualConfirmed)}
              onClick={() => addLink(Number(manualId), 'manual', manualLookup?.name_match === 'mismatch' ? 'ชื่อไม่ตรงทะเบียน ยืนยันโดยเจ้าหน้าที่' : undefined)}
            >ผูกเลข {manualId}</Button>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
              ใช้เมื่อระเบียนเงินเดือนเก่าไม่มีเลขบัตรและชื่อสะกดไม่ตรง จึงค้นอัตโนมัติไม่เจอ — ต้องกด &quot;ตรวจสอบ&quot; ดูชื่อในทะเบียนก่อนผูกทุกครั้ง
            </Text>
          </>
        )}
      </Drawer>
    </div>
  )
}

export default function SalaryIdsPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    const raw = Cookies.get('user_data')
    let roles: string[] = []
    if (raw) { try { roles = (JSON.parse(raw).roles ?? []).map((r: string) => String(r).toUpperCase()) } catch { /* ignore */ } }
    Promise.resolve().then(() => setAllowed(roles.some(r => ALLOWED_ROLES.includes(r))))
  }, [])

  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#006a5a', borderRadius: 8 } }}>
      <App>
        {allowed === false ? (
          <div className="min-h-screen bg-app-bg text-app-text">
            <Navbar />
            <div className="p-6 md:p-8">
              <Result
                status="403"
                title="ไม่มีสิทธิ์เข้าถึงหน้านี้"
                subTitle="หน้าจัดการเลขที่เงินเดือนสงวนไว้สำหรับเจ้าหน้าที่การเงิน เจ้าหน้าที่ไอที และผู้ดูแลระบบเท่านั้น"
                extra={<Button type="primary" href="/accounting">กลับหน้าการเงินและบัญชี</Button>}
              />
            </div>
          </div>
        ) : allowed === null ? null : <PageContent />}
      </App>
    </ConfigProvider>
  )
}
