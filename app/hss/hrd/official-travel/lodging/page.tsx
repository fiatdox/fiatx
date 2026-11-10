'use client'
// ตั้งค่าค่าเช่าที่พัก (เดินทางไปราชการ) — ADMIN / HRD
//   1) อัตราเพดานต่อคนต่อคืนตามระดับตำแหน่ง: เหมาจ่าย · จ่ายจริงห้องเดี่ยว · ห้องคู่ + สิทธิ์ชั้นโดยสารเครื่องบิน
//   2) จับคู่ระดับตำแหน่งในข้อมูลบุคลากร → ระดับสิทธิ์ (ไม่จับคู่ = ระดับค่าเริ่มต้น)
//   3) กำหนดรายบุคคล — ยกเว้นจากระดับตำแหน่ง
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Card, Empty, Form, Input, InputNumber, Modal, Popconfirm, Result, Segmented, Select, Space, Spin, Table, Tabs, Tag, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons'
import { FaBed } from 'react-icons/fa'
import { TRAVEL_COLOR, TRAVEL_MENU, TravelApiError, TravelShell, travelApi, travelPost } from '../travelShared'
import { FLIGHT_LABEL, type FlightClass } from '../travelCalc'

const { Title, Text } = Typography

interface LodgingClass {
  id: number; code: string; name: string; lump_sum: number; single_room: number; double_room: number; flight_class: FlightClass
  is_default: boolean; people: number; updated_at: string; updated_by_name: string | null
}
interface LevelRow { id: number; name: string; class_id: number | null; people: number; overridden: number }
interface PersonRow { user_id: number; name: string; position: string | null; level_name: string | null; unit: string | null; class_id: number; note: string | null; working: boolean; updated_at: string; updated_by_name: string | null }
interface LodgingData { classes: LodgingClass[]; levels: LevelRow[]; no_level: number; people: PersonRow[]; limits: { max_rate: number } }
interface LogRow { id: number; entity: 'class' | 'level' | 'person'; entity_id: number; action: 'create' | 'update' | 'delete'; before: Record<string, unknown> | null; after: Record<string, unknown> | null; changed_at: string; changed_by_name: string | null }
interface PersonOpt { id: number; name: string; position: string | null; unit: string | null; lodging_class_id: number; lodging_class_name: string }

const baht = (n: number) => n.toLocaleString('th-TH')
const fmtDateTime = (v: string) => new Date(v).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
const DEFAULT = 'default'

// ── ประวัติ ──
const LogTable = ({ rows, classes }: { rows: LogRow[] | null; classes: LodgingClass[] }) => {
  const cname = (id: unknown) => classes.find(c => c.id === id)?.name ?? 'ระดับค่าเริ่มต้น'
  return (
    <Table<LogRow> size="small" rowKey="id" loading={rows === null} dataSource={rows ?? []} pagination={{ pageSize: 15, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีประวัติ" /> }}
      columns={[
        { title: 'วันที่', dataIndex: 'changed_at', render: fmtDateTime, width: 130 },
        {
          title: 'รายการ', render: (_: unknown, r) => {
            const b = r.before ?? {}, a = r.after ?? {}
            if (r.entity === 'class') {
              const f = (x: Record<string, unknown>) => `เหมาจ่าย ${baht(Number(x.lump_sum))} · เดี่ยว ${baht(Number(x.single_room))} · คู่ ${baht(Number(x.double_room))} · ${FLIGHT_LABEL[x.flight_class as FlightClass] ?? ''}`
              return <><b>{String(a.name ?? b.name)}</b><div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>เดิม {f(b)}</div><div style={{ fontSize: 12 }}>ใหม่ {f(a)}</div></>
            }
            const who = String(a.level ?? b.level ?? a.name ?? b.name ?? '')
            return <>{r.entity === 'level' ? 'ระดับตำแหน่ง' : 'รายบุคคล'} <b>{who}</b>: {r.action === 'create' && r.entity === 'person' ? 'กำหนด' : ''}
              {r.action !== 'create' && <>{cname(b.class_id)} → </>}<b>{r.action === 'delete' ? (r.entity === 'person' ? 'ตามระดับตำแหน่ง' : 'ระดับค่าเริ่มต้น') : cname(a.class_id)}</b></>
          },
        },
        { title: 'ผู้แก้ไข', dataIndex: 'changed_by_name', render: (v: string | null) => v ?? '—', width: 150 },
      ]} />
  )
}

// หน้าต่างแก้ไขเป็น component ที่มีฟอร์มของตัวเอง render ด้วย key ของรายการเฉพาะตอนเปิด (ไม่มีค่าค้างจากรายการก่อน)
const ClassEditModal = ({ c, maxRate, onClose, onSaved, onError }: { c: LodgingClass; maxRate: number; onClose: () => void; onSaved: () => Promise<void>; onError: (e: unknown) => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [log, setLog] = useState<LogRow[] | null>(null)
  useEffect(() => { travelApi<LogRow[]>(`lodging/log?entity=class&id=${c.id}`).then(setLog).catch(e => { onError(e); setLog([]) }) }, [c.id, onError])
  const save = async () => {
    const x = await form.validateFields().catch(() => null)
    if (!x) return
    setSaving(true)
    try {
      const r = await travelApi<{ changed: boolean }>(`lodging/classes/${c.id}`, 'PUT', { ...x, name: x.name.trim() })
      message.success(r.changed ? 'บันทึกอัตราค่าที่พักแล้ว — มีผลกับคำขอที่ยื่นใหม่' : 'ไม่มีการเปลี่ยนแปลง')
      onClose()
      await onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else onError(e)
    } finally { setSaving(false) }
  }
  const rate = (name: string, label: string, extra?: string) => (
    <Form.Item name={name} label={label} extra={extra} rules={[{ required: true, message: 'กรุณาระบุอัตรา' }]}>
      <InputNumber min={1} max={maxRate} precision={0} style={{ width: '100%' }} suffix="บาท/คืน" />
    </Form.Item>
  )
  return (
    <Modal title="แก้อัตราค่าเช่าที่พัก" open onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} width={600}>
      <Form form={form} layout="vertical" initialValues={{ name: c.name, lump_sum: c.lump_sum, single_room: c.single_room, double_room: c.double_room, flight_class: c.flight_class }}>
        <Form.Item name="name" label="ระดับตำแหน่ง" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุชื่อระดับ' }, { max: 150 }]}><Input /></Form.Item>
        {rate('lump_sum', 'เหมาจ่าย (ไม่ต้องแนบหลักฐาน)', 'ต่อคนต่อคืน')}
        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 12 }}>
          <div style={{ flex: '1 1 200px' }}>{rate('single_room', 'จ่ายจริง · ห้องพักเดี่ยว')}</div>
          <div style={{ flex: '1 1 200px' }}>{rate('double_room', 'จ่ายจริง · ห้องพักคู่', 'ต่อคน')}</div>
        </div>
        <Form.Item name="flight_class" label="สิทธิ์ชั้นโดยสารเครื่องบิน">
          <Segmented options={[{ value: 'economy', label: FLIGHT_LABEL.economy }, { value: 'business', label: FLIGHT_LABEL.business }]} />
        </Form.Item>
      </Form>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>ประวัติการแก้อัตรา</Text>
      <LogTable rows={log} classes={[c]} />
    </Modal>
  )
}

const ClassesTab = ({ data, onChanged, onError }: { data: LodgingData; onChanged: () => Promise<void>; onError: (e: unknown) => void }) => {
  const [edit, setEdit] = useState<LodgingClass | null>(null)
  const num = (v: number) => <b>{baht(v)}</b>
  return (
    <>
      <Alert type="info" showIcon style={{ marginBottom: 12 }} title="เลือกเบิกได้ 2 รูปแบบ ไปทั้งคณะต้องเลือกรูปแบบเดียวกัน"
        description="เหมาจ่าย ไม่ต้องแนบหลักฐาน · จ่ายจริง ต้องแนบใบเสร็จ และเบิกได้ไม่เกินอัตราห้องเดี่ยว/ห้องคู่ — อัตราทั้งหมดเป็นเพดานต่อคนต่อคืน แก้แล้วมีผลกับคำขอที่ยื่นใหม่ คำขอเดิมใช้อัตรา ณ วันยื่น" />
      <Table<LodgingClass> size="small" rowKey="id" dataSource={data.classes} pagination={false} scroll={{ x: 'max-content' }}
        columns={[
          { title: 'ระดับตำแหน่ง', dataIndex: 'name', render: (n: string, c) => <><span style={{ fontWeight: 500 }}>{n}</span>{c.is_default && <Tag style={{ marginLeft: 6 }}>ค่าเริ่มต้น</Tag>}</> },
          { title: <>เหมาจ่าย<div className="th-sub">บาท</div></>, dataIndex: 'lump_sum', align: 'right', width: 100, render: num },
          { title: <>จ่ายจริง ห้องเดี่ยว<div className="th-sub">บาท</div></>, dataIndex: 'single_room', align: 'right', width: 130, render: num },
          { title: <>จ่ายจริง ห้องคู่<div className="th-sub">บาท/คน</div></>, dataIndex: 'double_room', align: 'right', width: 120, render: num },
          { title: 'เครื่องบิน', dataIndex: 'flight_class', width: 110, render: (f: FlightClass) => <Tag color={f === 'business' ? 'purple' : undefined}>{FLIGHT_LABEL[f]}</Tag> },
          { title: 'บุคลากร', dataIndex: 'people', align: 'right', width: 90, render: (n: number) => `${baht(n)} คน` },
          { title: '', width: 60, align: 'right', render: (_: unknown, c) => <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEdit(c)} aria-label={`แก้อัตรา ${c.name}`} title="แก้อัตรา" /> },
        ]} />
      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>จำนวนบุคลากร = ผู้ที่ปฏิบัติงานอยู่ คิดตามลำดับ กำหนดรายบุคคล → ระดับตำแหน่ง → ค่าเริ่มต้น</Text>
      {edit && <ClassEditModal key={edit.id} c={edit} maxRate={data.limits.max_rate} onClose={() => setEdit(null)} onSaved={onChanged} onError={onError} />}
    </>
  )
}

const LevelsTab = ({ data, onChanged, onError }: { data: LodgingData; onChanged: () => Promise<void>; onError: (e: unknown) => void }) => {
  const { message } = App.useApp()
  const [busy, setBusy] = useState<number | null>(null)
  const def = data.classes.find(c => c.is_default)
  const opts = [...data.classes.filter(c => !c.is_default).map(c => ({ value: c.id, label: c.name })), { value: DEFAULT, label: `ค่าเริ่มต้น · ${def?.name ?? ''}` }]
  const change = async (l: LevelRow, v: number | string) => {
    setBusy(l.id)
    try {
      await travelApi(`lodging/levels/${l.id}`, 'PUT', { class_id: v === DEFAULT ? null : v })
      message.success(`ระดับ ${l.name} ใช้ ${v === DEFAULT ? 'ระดับค่าเริ่มต้น' : data.classes.find(c => c.id === v)?.name} แล้ว`)
      await onChanged()
    } catch (e) { onError(e) } finally { setBusy(null) }
  }
  return (
    <>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        ระดับตำแหน่งจากข้อมูลบุคลากร จับคู่กับระดับสิทธิ์ค่าที่พัก — เปลี่ยนแล้วมีผลกับทุกคนในระดับนั้นทันที (ยกเว้นคนที่กำหนดรายบุคคลไว้)
      </Text>
      <Table<LevelRow> size="small" rowKey="id" dataSource={data.levels} pagination={false} scroll={{ x: 'max-content' }}
        columns={[
          { title: 'ระดับตำแหน่ง (ข้อมูลบุคลากร)', dataIndex: 'name', render: (n: string) => <span style={{ fontWeight: 500 }}>{n}</span> },
          { title: 'บุคลากร', dataIndex: 'people', align: 'right', width: 150, render: (n: number, l) => <>{baht(n)} คน{l.overridden > 0 && <div style={{ fontSize: 11.5, color: 'var(--app-text-3)' }}>กำหนดรายบุคคล {l.overridden}</div>}</> },
          {
            title: 'ระดับสิทธิ์ค่าที่พัก', width: 380, render: (_: unknown, l) => (
              <Select value={l.class_id ?? DEFAULT} options={opts} onChange={v => change(l, v)} loading={busy === l.id} disabled={busy !== null}
                style={{ width: '100%', minWidth: 260 }} aria-label={`ระดับสิทธิ์ของระดับ ${l.name}`} popupMatchSelectWidth={false} />
            ),
          },
        ]}
        footer={() => <Text type="secondary" style={{ fontSize: 12.5 }}>ไม่ระบุระดับตำแหน่ง {baht(data.no_level)} คน → ใช้ระดับค่าเริ่มต้น ({def?.name}) · กำหนดเป็นรายคนได้ที่แท็บ “กำหนดรายบุคคล”</Text>} />
    </>
  )
}

const PersonModal = ({ edit, classes, onClose, onSaved, onError }: { edit: PersonRow | 'new'; classes: LodgingClass[]; onClose: () => void; onSaved: () => Promise<void>; onError: (e: unknown) => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<PersonOpt[]>([])
  const [searching, setSearching] = useState(false)
  useEffect(() => {
    if (q.trim().length < 2) return
    const t = setTimeout(async () => {
      setSearching(true)
      try { setOpts(await travelApi<PersonOpt[]>(`requests/people?search=${encodeURIComponent(q.trim())}`)) } catch { /* พิมพ์ใหม่ */ } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [q])
  const userId = Form.useWatch('user_id', form)
  const picked = opts.find(o => o.id === userId)
  const save = async () => {
    const x = await form.validateFields().catch(() => null)
    if (!x) return
    setSaving(true)
    try {
      const r = await travelPost<{ changed: boolean }>('lodging/people', { user_id: edit === 'new' ? x.user_id : edit.user_id, class_id: x.class_id, note: x.note?.trim() || null })
      message.success(r.changed ? 'บันทึกระดับรายบุคคลแล้ว' : 'ไม่มีการเปลี่ยนแปลง')
      onClose()
      await onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else onError(e)
    } finally { setSaving(false) }
  }
  return (
    <Modal title={edit === 'new' ? 'กำหนดระดับค่าที่พักรายบุคคล' : `แก้ระดับค่าที่พัก · ${edit.name}`} open onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving}>
      <Form form={form} layout="vertical" initialValues={edit === 'new' ? {} : { class_id: edit.class_id, note: edit.note ?? undefined }}>
        {edit === 'new' && (
          <Form.Item name="user_id" label="บุคลากร" rules={[{ required: true, message: 'เลือกบุคลากร' }]}
            extra={picked ? `ปัจจุบัน: ${picked.lodging_class_name}` : undefined}>
            <Select showSearch filterOption={false} onSearch={setQ} placeholder="พิมพ์ชื่ออย่างน้อย 2 ตัวอักษร"
              notFoundContent={searching ? <Spin size="small" /> : q.trim().length < 2 ? 'พิมพ์ชื่อเพื่อค้นหา' : 'ไม่พบ'}
              options={opts.map(o => ({ value: o.id, label: `${o.name}${o.position ? ` · ${o.position}` : ''}` }))} />
          </Form.Item>
        )}
        <Form.Item name="class_id" label="ระดับสิทธิ์ค่าที่พัก" rules={[{ required: true, message: 'เลือกระดับ' }]}>
          <Select options={classes.map(c => ({ value: c.id, label: `${c.name} · เหมาจ่าย ${baht(c.lump_sum)}` }))} popupMatchSelectWidth={false} />
        </Form.Item>
        <Form.Item name="note" label="เหตุผล" rules={[{ max: 200 }]}><Input placeholder="เช่น ผู้อำนวยการโรงพยาบาล, ข้อมูลระดับยังไม่ปรับ" /></Form.Item>
      </Form>
    </Modal>
  )
}

const PeopleTab = ({ data, onChanged, onError }: { data: LodgingData; onChanged: () => Promise<void>; onError: (e: unknown) => void }) => {
  const { message } = App.useApp()
  const [edit, setEdit] = useState<PersonRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const remove = async (p: PersonRow) => {
    setDeleting(p.user_id)
    try { await travelPost(`lodging/people/${p.user_id}/delete`); message.success(`${p.name} กลับไปใช้ตามระดับตำแหน่งแล้ว`); await onChanged() }
    catch (e) { onError(e) } finally { setDeleting(null) }
  }
  const cname = (id: number) => data.classes.find(c => c.id === id)?.name ?? '—'
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text type="secondary" style={{ flex: '1 1 300px' }}>คนที่กำหนดไว้ใช้ระดับนี้แทนระดับตามตำแหน่ง เช่น ผู้บริหาร หรือคนที่ข้อมูลระดับตำแหน่งยังไม่ตรง</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEdit('new')}>กำหนดรายบุคคล</Button>
      </div>
      <Table<PersonRow> size="small" rowKey="user_id" dataSource={data.people} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่ได้กำหนดรายบุคคล — ทุกคนใช้ตามระดับตำแหน่ง" /> }}
        rowClassName={p => p.working ? '' : 'lodging-row-gone'}
        columns={[
          { title: 'บุคลากร', dataIndex: 'name', render: (n: string, p) => <><span style={{ fontWeight: 500 }}>{n}</span>{!p.working && <Tag style={{ marginLeft: 6 }}>ไม่ได้ปฏิบัติงาน</Tag>}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{[p.position, p.unit].filter(Boolean).join(' · ')}</div></> },
          { title: 'ระดับตำแหน่ง', dataIndex: 'level_name', width: 130, render: (v: string | null) => v ?? <Text type="secondary">—</Text> },
          { title: 'ระดับสิทธิ์ค่าที่พัก', dataIndex: 'class_id', render: (id: number) => <Tag color="purple" style={{ whiteSpace: 'normal' }}>{cname(id)}</Tag> },
          { title: 'เหตุผล', dataIndex: 'note', render: (v: string | null) => v ?? <Text type="secondary">—</Text> },
          {
            title: '', width: 96, align: 'right', render: (_: unknown, p) => (
              <Space size={0}>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEdit(p)} aria-label={`แก้ระดับ ${p.name}`} title="แก้ไข" />
                <Popconfirm title={`เลิกกำหนดรายบุคคลของ ${p.name}?`} description="กลับไปใช้ระดับตามตำแหน่ง" okText="เลิกกำหนด" okButtonProps={{ danger: true }} cancelText="ไม่" onConfirm={() => remove(p)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleting === p.user_id} aria-label={`เลิกกำหนด ${p.name}`} title="เลิกกำหนด" />
                </Popconfirm>
              </Space>
            ),
          },
        ]} />
      {edit && <PersonModal key={edit === 'new' ? 'new' : edit.user_id} edit={edit} classes={data.classes} onClose={() => setEdit(null)} onSaved={onChanged} onError={onError} />}
    </>
  )
}

const LodgingContent = () => {
  const { message } = App.useApp()
  const [data, setData] = useState<LodgingData | null>(null)
  const [denied, setDenied] = useState(false)
  const [log, setLog] = useState<LogRow[] | null | undefined>(undefined)
  const onError = useCallback((e: unknown) => {
    if (e instanceof TravelApiError && e.status === 403) setDenied(true)
    else message.error((e as Error).message)
  }, [message])
  const load = useCallback(async () => {
    try { setData(await travelApi<LodgingData>('lodging')) } catch (e) { onError(e) }
  }, [onError])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  const openLog = async () => {
    setLog(null)
    try { setLog(await travelApi<LogRow[]>('lodging/log')) } catch (e) { onError(e); setLog([]) }
  }

  if (denied) return <Result status="403" title="ไม่มีสิทธิ์ตั้งค่าค่าเช่าที่พัก" subTitle="เฉพาะผู้ดูแลระบบและเจ้าหน้าที่งานพัฒนาทรัพยากรบุคคล (HRD)" />
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FaBed />
        </div>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>ตั้งค่าค่าเช่าที่พัก</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>อัตราเพดานตามระดับตำแหน่ง ใช้คำนวณค่าที่พักในคำขอไปราชการ ทุกการแก้ไขเก็บประวัติไว้</Text>
        </div>
      </div>
      <Card styles={{ body: { padding: '4px 16px 16px' } }} style={{ borderRadius: 14 }} loading={!data}>
        {data && (
          <Tabs
            tabBarExtraContent={<Button icon={<HistoryOutlined />} onClick={openLog}>ประวัติ</Button>}
            items={[
              { key: 'classes', label: 'อัตราตามระดับตำแหน่ง', children: <ClassesTab data={data} onChanged={load} onError={onError} /> },
              { key: 'levels', label: 'จับคู่ระดับตำแหน่ง', children: <LevelsTab data={data} onChanged={load} onError={onError} /> },
              { key: 'people', label: `กำหนดรายบุคคล (${data.people.length})`, children: <PeopleTab data={data} onChanged={load} onError={onError} /> },
            ]}
          />
        )}
      </Card>
      <Modal title="ประวัติการตั้งค่าค่าเช่าที่พัก" open={log !== undefined} onCancel={() => setLog(undefined)} footer={null} width={720} destroyOnHidden>
        <LogTable rows={log ?? null} classes={data?.classes ?? []} />
      </Modal>
      <style jsx global>{`
        .th-sub { font-size: 11px; font-weight: 400; color: var(--app-text-3); }
        .lodging-row-gone td { color: var(--app-text-3) !important; }
      `}</style>
    </>
  )
}

export default function TravelLodgingPage() {
  return (
    <TravelShell current={TRAVEL_MENU[4].title}>
      <LodgingContent />
    </TravelShell>
  )
}
