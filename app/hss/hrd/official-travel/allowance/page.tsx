'use client'
// ตั้งค่าเบี้ยเลี้ยงบุคลากร (เดินทางไปราชการ) — ADMIN / HRD
// อัตราเบี้ยเลี้ยงแก้ราคาได้ (เริ่มต้น อัตราปกติ 240 / อัตราพิเศษ 270) บุคลากรผูกกับอัตรา
// บุคลากรสถานะปฏิบัติงานทุกคนอยู่อัตราค่าเริ่มต้น ผู้มีสิทธิ์ย้ายคนส่วนน้อยไปอัตราอื่นเอง
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm, Result, Row, Segmented, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons'
import { FaCoins } from 'react-icons/fa'
import { TRAVEL_COLOR, TRAVEL_MENU, TravelApiError, TravelShell, travelApi } from '../travelShared'

const { Title, Text } = Typography

interface Tier { id: number; code: string; name: string; amount: number; is_default: boolean; updated_at: string; updated_by_name: string | null }
interface Opt { id: number; name: string; mission_id?: number | null; major_id?: number | null }
interface Meta { tiers: Tier[]; missions: Opt[]; majors: Opt[]; submajors: Opt[]; user_types: Opt[]; user_levels: Opt[]; max_amount: number }
interface Person {
  id: number; name: string; position_name: string | null
  mission_name: string | null; major_name: string | null; submajor_name: string | null
  user_type_name: string | null; user_level_name: string | null
  tier_id: number; amount: number; is_default: boolean
  updated_at: string | null; updated_by_name: string | null
}
interface ListData { rows: Person[]; total: number; stats: { total: number; by_tier: { tier_id: number; count: number }[] } }
interface PersonLog { id: number; old_tier_name: string; new_tier_name: string; old_amount: number; new_amount: number; changed_at: string; changed_by_name: string | null }
interface TierLog { id: number; old_name: string; new_name: string; old_amount: number; new_amount: number; changed_at: string; changed_by_name: string | null }

// ตัวกรอง — ชื่อ key ตรงกับ query ของ backend
interface Filters { search: string; tier_id: number | null; mission_id: number | null; major_id: number | null; submajor_id: number | null; user_type_id: number | null; user_level_id: number | null }
const EMPTY: Filters = { search: '', tier_id: null, mission_id: null, major_id: null, submajor_id: null, user_type_id: null, user_level_id: null }
const toQuery = (f: Filters) => {
  const q: Record<string, string> = {}
  for (const [k, v] of Object.entries(f)) if (v !== null && v !== '') q[k] = String(v)
  return q
}

const PAGE_SIZE = 50
const baht = (n: number) => n.toLocaleString('th-TH')
const fmtDateTime = (v: string) => new Date(v).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const AllowanceContent = () => {
  const { message } = App.useApp()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number[]>([])
  const [savingIds, setSavingIds] = useState<number[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [personLog, setPersonLog] = useState<{ person: Person; rows: PersonLog[] | null } | null>(null)
  const [tierEdit, setTierEdit] = useState<Tier | null>(null)

  const onError = useCallback((e: unknown) => {
    if (e instanceof TravelApiError && e.status === 403) setDenied(true)
    else message.error((e as Error).message)
  }, [message])

  const tiers = useMemo(() => meta?.tiers ?? [], [meta])
  const tierById = useMemo(() => new Map(tiers.map(t => [t.id, t])), [tiers])
  const countOf = (id: number) => data?.stats.by_tier.find(s => s.tier_id === id)?.count

  const loadMeta = useCallback(async () => {
    try { setMeta(await travelApi<Meta>('allowance/meta')) } catch (e) { onError(e) }
  }, [onError])
  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams({ ...toQuery(filters), limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) })
    try { setData(await travelApi<ListData>(`allowance?${q}`)) }
    catch (e) { onError(e) } finally { setLoading(false) }
  }, [filters, page, onError])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { loadMeta() }, [loadMeta])
  // พิมพ์ค้นหาแล้วรอสักครู่ค่อยยิง
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => f.search === search.trim() ? f : { ...f, search: search.trim() })
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const patch = (p: Partial<Filters>) => { setFilters(f => ({ ...f, ...p })); setPage(1) }
  const filterActive = Object.entries(filters).some(([, v]) => v !== null && v !== '')
  const clearFilters = () => { setSearch(''); setFilters(EMPTY); setPage(1) }

  // ตัวเลือกที่แคบลงตามกัน: กลุ่มภารกิจ → กลุ่มงาน → หน่วยงาน/ตึก
  const majorOpts = (meta?.majors ?? []).filter(m => !filters.mission_id || m.mission_id === filters.mission_id)
  const submajorOpts = (meta?.submajors ?? []).filter(s => filters.major_id ? s.major_id === filters.major_id : !filters.mission_id || majorOpts.some(m => m.id === s.major_id))
  const opts = (xs: Opt[] | undefined) => (xs ?? []).map(x => ({ value: x.id, label: x.name }))

  const afterSave = async () => { await Promise.all([load(), loadMeta()]) }
  const setOne = async (p: Person, tierId: number) => {
    setSavingIds(s => [...s, p.id])
    try {
      const r = await travelApi<{ amount: number }>('allowance', 'PUT', { user_ids: [p.id], tier_id: tierId })
      message.success(`ตั้งเบี้ยเลี้ยง ${p.name} เป็น ${tierById.get(tierId)?.name ?? ''} ${baht(r.amount)} บาท`)
      await load()
    } catch (e) { onError(e) } finally { setSavingIds(s => s.filter(x => x !== p.id)) }
  }
  const setMany = async (tier: Tier, mode: 'selected' | 'filtered') => {
    setBulkSaving(true)
    try {
      const body = mode === 'selected'
        ? { tier_id: tier.id, user_ids: selected }
        : { tier_id: tier.id, filter: toQuery(filters), expected_total: data?.total ?? 0 }
      const r = await travelApi<{ changed: number; unchanged: number }>('allowance', 'PUT', body)
      message.success(r.changed > 0
        ? `ย้ายไป${tier.name} ${baht(tier.amount)} บาทแล้ว ${baht(r.changed)} คน${r.unchanged ? ` (อีก ${baht(r.unchanged)} คนอยู่อัตรานี้แล้ว)` : ''}`
        : `ทุกคนอยู่${tier.name}อยู่แล้ว`)
      setSelected([])
      await load()
    } catch (e) { onError(e); await load() } finally { setBulkSaving(false) }
  }

  const openPersonLog = async (p: Person) => {
    setPersonLog({ person: p, rows: null })
    try { const rows = await travelApi<PersonLog[]>(`allowance/${p.id}/log`); setPersonLog(s => s && { ...s, rows }) }
    catch (e) { onError(e); setPersonLog(s => s && { ...s, rows: [] }) }
  }
  if (denied) {
    return <Result status="403" title="ไม่มีสิทธิ์ตั้งค่าเบี้ยเลี้ยง" subTitle="เฉพาะผู้ดูแลระบบและเจ้าหน้าที่งานพัฒนาทรัพยากรบุคคล (HRD)" />
  }

  const defaultTier = tiers.find(t => t.is_default)
  const columns: ColumnsType<Person> = [
    {
      title: 'ชื่อ-สกุล', dataIndex: 'name',
      render: (v: string, r) => <><div style={{ fontWeight: 500 }}>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.position_name ?? '—'}</Text></>,
    },
    {
      title: 'สังกัด', dataIndex: 'major_name', responsive: ['md'],
      render: (v: string | null, r) => <>
        <div>{v ?? '—'}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{[r.submajor_name, r.mission_name].filter(Boolean).join(' · ') || ' '}</Text>
      </>,
    },
    {
      title: 'ประเภท / ระดับ', dataIndex: 'user_type_name', responsive: ['lg'],
      render: (v: string | null, r) => <><div>{v ?? '—'}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.user_level_name ?? ' '}</Text></>,
    },
    {
      title: 'เบี้ยเลี้ยง (บาท/วัน)', dataIndex: 'tier_id', width: 200,
      render: (v: number, r) => (
        <Space size={8} wrap>
          <Segmented<number>
            size="small" value={v} disabled={savingIds.includes(r.id)}
            className={`rate-seg${tierById.get(v)?.is_default ? '' : ' is-special'}`}
            options={tiers.map(t => ({ value: t.id, label: <span title={t.name}>{baht(t.amount)}</span> }))}
            onChange={x => setOne(r, x)}
            aria-label={`อัตราเบี้ยเลี้ยงของ ${r.name}`}
          />
          {r.is_default && <Tag style={{ margin: 0 }}>ค่าเริ่มต้น</Tag>}
        </Space>
      ),
    },
    {
      title: 'ตั้งค่าล่าสุด', dataIndex: 'updated_at', width: 190, responsive: ['xl'],
      render: (v: string | null, r) => v
        ? <><div style={{ fontSize: 13 }}>{r.updated_by_name ?? '—'}</div><Text type="secondary" style={{ fontSize: 12 }}>{fmtDateTime(v)}</Text></>
        : <Text type="secondary">—</Text>,
    },
    {
      title: '', width: 48, align: 'center',
      render: (_: unknown, r) => r.is_default ? null : <Button type="text" size="small" icon={<HistoryOutlined />} onClick={() => openPersonLog(r)} aria-label={`ประวัติการเปลี่ยนอัตราของ ${r.name}`} title="ประวัติการเปลี่ยนอัตรา" />,
    },
  ]

  const tile = (active: boolean, accent: string): React.CSSProperties => ({
    height: '100%', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', position: 'relative',
    background: 'var(--app-surface)', border: `1px solid ${active ? accent : 'var(--app-border)'}`,
    boxShadow: active ? `0 0 0 1px ${accent}` : 'none', transition: 'border-color .15s, box-shadow .15s',
  })
  const pickTier = (id: number | null) => patch({ tier_id: id })
  const tileKeys = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FaCoins />
        </div>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>ตั้งค่าเบี้ยเลี้ยงบุคลากร</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>
            บุคลากรที่ปฏิบัติงานทุกคนอยู่{defaultTier ? `${defaultTier.name} ${baht(defaultTier.amount)} บาท/วัน` : 'อัตราค่าเริ่มต้น'}เป็นค่าเริ่มต้น ย้ายเฉพาะผู้ที่มีสิทธิ์ไปอัตราอื่น
          </Text>
        </div>
      </div>

      {/* การ์ดอัตรา: กดเพื่อกรอง · ปุ่มดินสอแก้ราคา */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <div role="button" tabIndex={0} aria-pressed={filters.tier_id === null} style={tile(filters.tier_id === null, 'var(--app-text-2)')}
            onClick={() => pickTier(null)} onKeyDown={tileKeys(() => pickTier(null))}>
            <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>บุคลากรที่ปฏิบัติงาน</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.3 }}>
              {data ? baht(data.stats.total) : '—'} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--app-text-3)' }}>คน</span>
            </div>
          </div>
        </Col>
        {tiers.map(t => {
          const active = filters.tier_id === t.id
          const accent = t.is_default ? '#64748b' : TRAVEL_COLOR
          return (
            <Col xs={12} sm={8} key={t.id}>
              <div role="button" tabIndex={0} aria-pressed={active} data-tier={t.code} style={tile(active, accent)}
                onClick={() => pickTier(t.id)} onKeyDown={tileKeys(() => pickTier(t.id))}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--app-text-2)', paddingRight: 28 }}>
                  <span>{t.name}</span>{t.is_default && <Tag style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>ค่าเริ่มต้น</Tag>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.is_default ? 'var(--app-text)' : TRAVEL_COLOR }}>{baht(t.amount)} บาท/วัน</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.3 }}>
                  {countOf(t.id) !== undefined ? baht(countOf(t.id)!) : '—'} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--app-text-3)' }}>คน</span>
                </div>
                <Button size="small" type="text" icon={<EditOutlined />} aria-label={`แก้ราคา${t.name}`} title="แก้ชื่อ/ราคา"
                  style={{ position: 'absolute', top: 8, right: 8 }}
                  onClick={e => { e.stopPropagation(); setTierEdit(t) }} onKeyDown={e => e.stopPropagation()} />
              </div>
            </Col>
          )
        })}
      </Row>

      <Card styles={{ body: { padding: 12 } }} style={{ borderRadius: 14 }}>
        {/* ตัวกรอง */}
        <div className="allow-filters">
          <Input allowClear prefix={<SearchOutlined style={{ color: 'var(--app-text-3)' }} />} placeholder="ค้นหาชื่อ ตำแหน่ง หรือชื่อผู้ใช้"
            value={search} onChange={e => setSearch(e.target.value)} className="f-search" />
          <Select allowClear showSearch optionFilterProp="label" placeholder="ทุกกลุ่มภารกิจ" value={filters.mission_id ?? undefined}
            onChange={v => patch({ mission_id: v ?? null, major_id: null, submajor_id: null })} options={opts(meta?.missions)} aria-label="กลุ่มภารกิจ" />
          <Select allowClear showSearch optionFilterProp="label" placeholder="ทุกกลุ่มงาน" value={filters.major_id ?? undefined}
            onChange={v => patch({ major_id: v ?? null, submajor_id: null })} options={opts(majorOpts)} aria-label="กลุ่มงาน" />
          <Select allowClear showSearch optionFilterProp="label" placeholder="ทุกหน่วยงาน/ตึก" value={filters.submajor_id ?? undefined}
            onChange={v => patch({ submajor_id: v ?? null })} options={opts(submajorOpts)} aria-label="หน่วยงาน/ตึก" />
          <Select allowClear showSearch optionFilterProp="label" placeholder="ทุกประเภทบุคลากร" value={filters.user_type_id ?? undefined}
            onChange={v => patch({ user_type_id: v ?? null })} options={opts(meta?.user_types)} aria-label="ประเภทบุคลากร" />
          <Select allowClear showSearch optionFilterProp="label" placeholder="ทุกระดับ" value={filters.user_level_id ?? undefined}
            onChange={v => patch({ user_level_id: v ?? null })} options={opts(meta?.user_levels)} aria-label="ระดับ" />
        </div>

        {/* แถบผลการกรอง + ตั้งค่าหลายคน */}
        <div className="allow-bar" style={{ background: selected.length ? `${TRAVEL_COLOR}12` : 'var(--app-bg)', borderColor: selected.length ? `${TRAVEL_COLOR}40` : 'var(--app-border)' }}>
          {selected.length > 0 ? (
            <>
              <Text strong>เลือก {baht(selected.length)} คน</Text>
              <div style={{ flex: 1 }} />
              {tiers.map(t => (
                <Popconfirm key={t.id} title={`ย้าย ${baht(selected.length)} คนที่เลือกไป${t.name} ${baht(t.amount)} บาท/วัน?`} okText="ย้าย" cancelText="ไม่ย้าย" onConfirm={() => setMany(t, 'selected')}>
                  <Button size="small" type={t.is_default ? 'default' : 'primary'} loading={bulkSaving}>ตั้งเป็น {baht(t.amount)} บาท</Button>
                </Popconfirm>
              ))}
              <Button size="small" type="text" onClick={() => setSelected([])}>ล้างที่เลือก</Button>
            </>
          ) : (
            <>
              <Text>{filterActive ? 'ผลการกรอง' : 'ทั้งหมด'} <b>{data ? baht(data.total) : '—'}</b> คน</Text>
              {filterActive && <Button size="small" type="link" onClick={clearFilters} style={{ padding: 0 }}>ล้างตัวกรอง</Button>}
              <div style={{ flex: 1 }} />
              {filterActive && (data?.total ?? 0) > 0 && (
                <Space size={6} wrap>
                  <Text type="secondary" style={{ fontSize: 13 }}>ตั้งทั้ง {baht(data!.total)} คนเป็น</Text>
                  {tiers.map(t => (
                    <Popconfirm key={t.id} okText="ย้ายทั้งหมด" cancelText="ไม่ย้าย" onConfirm={() => setMany(t, 'filtered')}
                      title={`ย้ายทั้ง ${baht(data!.total)} คนตามตัวกรองไป${t.name} ${baht(t.amount)} บาท/วัน?`}
                      description="ทุกคนในผลการกรองจะถูกย้าย ไม่ใช่เฉพาะหน้านี้">
                      <Button size="small" type={t.is_default ? 'default' : 'primary'} ghost={!t.is_default} loading={bulkSaving}>{baht(t.amount)} บาท</Button>
                    </Popconfirm>
                  ))}
                </Space>
              )}
            </>
          )}
        </div>

        <Table<Person>
          size="small" rowKey="id" loading={loading} columns={columns} dataSource={data?.rows ?? []}
          rowSelection={{ selectedRowKeys: selected, onChange: keys => setSelected(keys as number[]), preserveSelectedRowKeys: true }}
          pagination={{ current: page, pageSize: PAGE_SIZE, total: data?.total ?? 0, showSizeChanger: false, onChange: setPage, showTotal: t => `ทั้งหมด ${baht(t)} คน`, hideOnSinglePage: true }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="ไม่พบบุคลากร" /> }}
        />
      </Card>

      <style jsx global>{`
        .allow-filters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
        .allow-filters .f-search { grid-column: span 1; }
        @media (max-width: 991px) { .allow-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 575px) { .allow-filters { grid-template-columns: minmax(0, 1fr); } }
        .allow-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 12px; border-radius: 10px; border: 1px solid; }
        /* อัตราที่ไม่ใช่ค่าเริ่มต้น = ส่วนน้อยที่ถูกตั้งเอง — ให้เห็นชัดในตาราง */
        .rate-seg.is-special .ant-segmented-item-selected,
        .rate-seg.is-special .ant-segmented-thumb { background: ${TRAVEL_COLOR}; color: #fff; }
      `}</style>

      <Modal title={`ประวัติการเปลี่ยนอัตรา · ${personLog?.person.name ?? ''}`} open={!!personLog} onCancel={() => setPersonLog(null)} footer={null}>
        <Table<PersonLog>
          size="small" rowKey="id" loading={personLog?.rows === null} dataSource={personLog?.rows ?? []} pagination={false}
          locale={{ emptyText: <Empty description="ยังไม่มีประวัติ" /> }}
          columns={[
            { title: 'วันที่', dataIndex: 'changed_at', render: fmtDateTime },
            { title: 'เปลี่ยน', render: (_: unknown, r) => <>{baht(r.old_amount)} → <b>{baht(r.new_amount)}</b><div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{r.old_tier_name} → {r.new_tier_name}</div></> },
            { title: 'ผู้ตั้งค่า', dataIndex: 'changed_by_name', render: (v: string | null) => v ?? '—' },
          ]}
        />
      </Modal>

      {tierEdit && <TierEditModal key={tierEdit.id} tier={tierEdit} people={countOf(tierEdit.id) ?? 0} maxAmount={meta?.max_amount ?? 10000}
        onClose={() => setTierEdit(null)} onSaved={afterSave} onError={onError} />}
    </>
  )
}

// หน้าต่างแก้ราคา — ฟอร์มของตัวเอง render ด้วย key ของอัตราเฉพาะตอนเปิด → ไม่มีค่าของอัตราก่อนค้าง
const TierEditModal = ({ tier, people, maxAmount, onClose, onSaved, onError }: {
  tier: Tier; people: number; maxAmount: number; onClose: () => void; onSaved: () => Promise<void>; onError: (e: unknown) => void
}) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [log, setLog] = useState<TierLog[] | null>(null)
  useEffect(() => {
    travelApi<TierLog[]>(`allowance/tiers/${tier.id}/log`).then(setLog).catch(e => { onError(e); setLog([]) })
  }, [tier.id, onError])
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const r = await travelApi<{ changed: boolean }>(`allowance/tiers/${tier.id}`, 'PUT', { name: v.name.trim(), amount: v.amount })
      message.success(r.changed ? `บันทึก${v.name.trim()} ${baht(v.amount)} บาท/วันแล้ว` : 'ไม่มีการเปลี่ยนแปลง')
      onClose()
      await onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.status === 409) form.setFields([{ name: e.message.includes('ชื่อ') ? 'name' : 'amount', errors: [e.message] }])
      else onError(e)
    } finally { setSaving(false) }
  }
  return (
    <Modal title={`แก้ไข${tier.name}`} open onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving}>
      <Alert type="warning" showIcon style={{ marginBottom: 16 }}
        title={`มีผลกับบุคลากร ${baht(people)} คนในอัตรานี้ทันที`}
        description="คำขอไปราชการที่ยื่นหลังบันทึกจะใช้ราคาใหม่" />
      <Form form={form} layout="vertical" initialValues={{ name: tier.name, amount: tier.amount }}>
        <Form.Item name="name" label="ชื่ออัตรา" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุชื่ออัตรา' }, { max: 100, message: 'ไม่เกิน 100 ตัวอักษร' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="amount" label="ราคา (บาท/วัน)" rules={[{ required: true, message: 'กรุณาระบุราคา' }]}>
          <InputNumber min={1} max={maxAmount} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>ประวัติการแก้ราคา</Text>
      <Table<TierLog>
        size="small" rowKey="id" loading={log === null} dataSource={log ?? []} pagination={false}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่เคยแก้ราคา" /> }}
        columns={[
          { title: 'วันที่', dataIndex: 'changed_at', render: fmtDateTime },
          { title: 'ราคา', render: (_: unknown, r) => <>{baht(r.old_amount)} → <b>{baht(r.new_amount)}</b>{r.old_name !== r.new_name && <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{r.old_name} → {r.new_name}</div>}</> },
          { title: 'ผู้แก้', dataIndex: 'changed_by_name', render: (v: string | null) => v ?? '—' },
        ]}
      />
    </Modal>
  )
}

export default function TravelAllowancePage() {
  return (
    <TravelShell current={TRAVEL_MENU[2].title}>
      <AllowanceContent />
    </TravelShell>
  )
}
