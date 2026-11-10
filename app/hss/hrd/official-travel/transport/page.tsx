'use client'
// ตั้งค่าการเดินทาง (เดินทางไปราชการ) — ADMIN / HRD
//   1) พาหนะส่วนตัว: เบิกค่าน้ำมันตามระยะทาง บาท/กม. แยกประเภทรถ
//   2) รถโดยสารประจำทาง 3) เครื่องบิน: เพดานราคาต่อเที่ยวตามเส้นทาง ใช้ได้ทั้งไปและกลับ
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { App, AutoComplete, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm, Result, Row, Space, Table, Tabs, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, HistoryOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { FaBus, FaCar, FaMotorcycle, FaPlane, FaRoute } from 'react-icons/fa'
import { TRAVEL_COLOR, TRAVEL_MENU, TravelApiError, TravelShell, travelApi, travelPost } from '../travelShared'

const { Title, Text } = Typography

type Mode = 'bus' | 'plane'
interface Vehicle { id: number; code: string; name: string; rate_per_km: number; updated_at: string; updated_by_name: string | null }
interface RouteRow { id: number; mode: Mode; origin: string; destination: string; max_fare: number; note: string | null; updated_at: string; updated_by_name: string | null }
interface TransportData { vehicles: Vehicle[]; routes: RouteRow[]; can_edit: boolean; limits: { max_rate: number; max_fare: number } }
interface LogRow { id: number; entity_id: number; action: 'create' | 'update' | 'delete'; before: Record<string, unknown> | null; after: Record<string, unknown> | null; changed_at: string; changed_by_name: string | null }

const MODE_INFO: Record<Mode, { label: string; icon: React.ReactNode; hint: string }> = {
  bus: { label: 'รถโดยสารประจำทาง', icon: <FaBus />, hint: 'ผู้เดินทางเบิกค่าโดยสารได้ไม่เกินราคาที่ตั้งต่อเที่ยว เส้นทางหนึ่งใช้ได้ทั้งขาไปและขากลับ' },
  plane: { label: 'เครื่องบิน', icon: <FaPlane />, hint: 'ผู้เดินทางเบิกค่าโดยสารได้ไม่เกินราคาที่ตั้งต่อเที่ยว เส้นทางหนึ่งใช้ได้ทั้งขาไปและขากลับ' },
}
const VEHICLE_ICON: Record<string, React.ReactNode> = { motorcycle: <FaMotorcycle />, car: <FaCar /> }
const DEFAULT_ORIGIN = 'พะเยา'
// ตัวเลือกช่วยกรอกต้นทาง/ปลายทาง — พิมพ์ชื่ออื่นได้ (อำเภอ/สนามบิน)
const PROVINCES = ['กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี']

const baht = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 })
const fmtDateTime = (v: string) => new Date(v).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
const ACTION_LABEL = { create: 'เพิ่ม', update: 'แก้ไข', delete: 'ลบ' } as const

// ── ประวัติ (ใช้ร่วม รถ/เส้นทาง) ──
const LogTable = ({ rows, entity }: { rows: LogRow[] | null; entity: 'vehicle' | 'route' }) => (
  <Table<LogRow>
    size="small" rowKey="id" loading={rows === null} dataSource={rows ?? []} pagination={false} scroll={{ x: 'max-content' }}
    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีประวัติ" /> }}
    columns={[
      { title: 'วันที่', dataIndex: 'changed_at', render: fmtDateTime, width: 130 },
      {
        title: 'รายการ', render: (_: unknown, r) => {
          if (entity === 'vehicle') {
            const b = r.before as { name: string; rate_per_km: number } | null, a = r.after as { name: string; rate_per_km: number } | null
            return <>{b && a && <>{baht(b.rate_per_km)} → <b>{baht(a.rate_per_km)}</b> บาท/กม.</>}{b && a && b.name !== a.name && <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{b.name} → {a.name}</div>}</>
          }
          const b = r.before as { origin: string; destination: string; max_fare: number } | null, a = r.after as { origin: string; destination: string; max_fare: number } | null
          const route = (x: { origin: string; destination: string }) => `${x.origin} ⇄ ${x.destination}`
          return <>
            <b>{ACTION_LABEL[r.action]}</b>{' '}
            {r.action === 'create' && a && <>{route(a)} · {baht(a.max_fare)} บาท</>}
            {r.action === 'delete' && b && <>{route(b)} · {baht(b.max_fare)} บาท</>}
            {r.action === 'update' && a && b && <>{route(a)} · {b.max_fare !== a.max_fare ? <>{baht(b.max_fare)} → <b>{baht(a.max_fare)}</b></> : baht(a.max_fare)} บาท
              {route(a) !== route(b) && <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>เดิม {route(b)}</div>}</>}
          </>
        },
      },
      { title: 'ผู้แก้ไข', dataIndex: 'changed_by_name', render: (v: string | null) => v ?? '—', width: 150 },
    ]}
  />
)

// หน้าต่างแก้ไขแต่ละตัวเป็น component ที่มีฟอร์มของตัวเอง และ render ด้วย key ของรายการเฉพาะตอนเปิด
// → เปิดรายการใหม่ได้ฟอร์มใหม่เสมอ ไม่มีค่าของรายการก่อนค้าง (ถ้าใช้ฟอร์มร่วม เปิดเร็วระหว่างหน้าต่างเดิมกำลังปิดจะบันทึกทับผิดรายการ)

// ── พาหนะส่วนตัว ──
const VehicleEditModal = ({ v, maxRate, onClose, onSaved, onError }: { v: Vehicle; maxRate: number; onClose: () => void; onSaved: () => Promise<void>; onError: (e: unknown) => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [log, setLog] = useState<LogRow[] | null>(null)
  useEffect(() => {
    travelApi<LogRow[]>(`transport/log?entity=vehicle&id=${v.id}`).then(setLog).catch(e => { onError(e); setLog([]) })
  }, [v.id, onError])
  const save = async () => {
    const x = await form.validateFields().catch(() => null)
    if (!x) return
    setSaving(true)
    try {
      const r = await travelApi<{ changed: boolean }>(`transport/vehicles/${v.id}`, 'PUT', { name: x.name.trim(), rate_per_km: x.rate_per_km })
      message.success(r.changed ? `บันทึก${x.name.trim()} ${baht(x.rate_per_km)} บาท/กม. แล้ว` : 'ไม่มีการเปลี่ยนแปลง')
      onClose()
      await onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else onError(e)
    } finally { setSaving(false) }
  }
  return (
    <Modal title={`แก้อัตรา${v.name}`} open onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving}>
      <Form form={form} layout="vertical" initialValues={{ name: v.name, rate_per_km: v.rate_per_km }}>
        <Form.Item name="name" label="ประเภทรถ" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุประเภทรถ' }, { max: 100 }]}><Input /></Form.Item>
        <Form.Item name="rate_per_km" label="อัตราเบิก (บาท/กม.)" rules={[{ required: true, message: 'กรุณาระบุอัตรา' }]} extra="ทศนิยมได้ 2 ตำแหน่ง เช่น 2.50">
          <InputNumber min={0.01} max={maxRate} step={0.25} precision={2} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>ประวัติการแก้อัตรา</Text>
      <LogTable rows={log} entity="vehicle" />
    </Modal>
  )
}

const VehiclePanel = ({ data, onChanged, onError }: { data: TransportData; onChanged: () => Promise<void>; onError: (e: unknown) => void }) => {
  const [edit, setEdit] = useState<Vehicle | null>(null)
  return (
    <>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        เดินทางด้วยพาหนะส่วนตัวเบิกค่าน้ำมันตามระยะทาง: ระยะทาง (กม.) × อัตราของประเภทรถ
      </Text>
      <Row gutter={[12, 12]}>
        {data.vehicles.map(v => (
          <Col xs={24} sm={12} key={v.id}>
            <div className="vehicle-card" data-vehicle={v.code}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, fontSize: 20, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {VEHICLE_ICON[v.code] ?? <FaCar />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--app-text-2)' }}>{v.name}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.25 }}>
                    {baht(v.rate_per_km)} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--app-text-3)' }}>บาท/กม.</span>
                  </div>
                </div>
                {data.can_edit && <Button icon={<EditOutlined />} onClick={() => setEdit(v)} aria-label={`แก้อัตรา${v.name}`}>แก้อัตรา</Button>}
              </div>
              <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--app-text-3)' }}>
                ตัวอย่าง: 100 กม. เบิกได้ {baht(v.rate_per_km * 100)} บาท
                {v.updated_by_name && <> · แก้ล่าสุดโดย {v.updated_by_name} {fmtDateTime(v.updated_at)}</>}
              </div>
            </div>
          </Col>
        ))}
      </Row>
      {edit && <VehicleEditModal key={edit.id} v={edit} maxRate={data.limits.max_rate} onClose={() => setEdit(null)} onSaved={onChanged} onError={onError} />}
    </>
  )
}

// ── เส้นทาง รถโดยสาร / เครื่องบิน ──
const filterPlace = (input: string, o?: { value: string }) => !!o && o.value.includes(input.trim())

const RouteEditModal = ({ mode, edit, places, maxFare, onClose, onSaved, onError }: {
  mode: Mode; edit: RouteRow | 'new'; places: { value: string }[]; maxFare: number
  onClose: () => void; onSaved: () => Promise<void>; onError: (e: unknown) => void
}) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    const body = { mode, origin: v.origin.trim(), destination: v.destination.trim(), max_fare: v.max_fare, note: v.note?.trim() || null }
    try {
      if (edit === 'new') await travelPost('transport/routes', body)
      else await travelApi(`transport/routes/${edit.id}`, 'PUT', body)
      message.success(`บันทึกเส้นทาง ${body.origin} ⇄ ${body.destination} ${baht(body.max_fare)} บาทแล้ว`)
      onClose()
      await onSaved()
    } catch (e) {
      if (e instanceof TravelApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      else onError(e)
    } finally { setSaving(false) }
  }
  return (
    <Modal title={edit === 'new' ? `เพิ่มเส้นทาง${MODE_INFO[mode].label}` : `แก้ไขเส้นทาง${MODE_INFO[mode].label}`} open onCancel={onClose} onOk={save}
      okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving}>
      <Form form={form} layout="vertical"
        initialValues={edit === 'new' ? { origin: DEFAULT_ORIGIN } : { origin: edit.origin, destination: edit.destination, max_fare: edit.max_fare, note: edit.note ?? undefined }}>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="origin" label="ต้นทาง" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุต้นทาง' }, { max: 100 }]}>
              <AutoComplete options={places} filterOption={filterPlace} placeholder="เช่น พะเยา" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="destination" label="ปลายทาง" dependencies={['origin']}
              rules={[{ required: true, whitespace: true, message: 'กรุณาระบุปลายทาง' }, { max: 100 },
                ({ getFieldValue }) => ({ validator: (_, v) => v && v.trim() === String(getFieldValue('origin') ?? '').trim() ? Promise.reject(new Error('ต้นทางและปลายทางต้องไม่ซ้ำกัน')) : Promise.resolve() })]}>
              <AutoComplete options={places} filterOption={filterPlace} placeholder="เช่น กรุงเทพมหานคร" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="max_fare" label="เบิกได้ไม่เกิน (บาท/เที่ยว)" rules={[{ required: true, message: 'กรุณาระบุราคา' }]} extra="ใช้ได้ทั้งขาไปและขากลับ">
          <InputNumber min={1} max={maxFare} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="note" label="หมายเหตุ" rules={[{ max: 200 }]}>
          <Input placeholder="เช่น รถ VIP 24 ที่นั่ง, ชั้นประหยัด" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

const RoutePanel = ({ mode, data, onChanged, onError }: { mode: Mode; data: TransportData; onChanged: () => Promise<void>; onError: (e: unknown) => void }) => {
  const { message } = App.useApp()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<RouteRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [log, setLog] = useState<LogRow[] | null | undefined>(undefined)
  const rows = data.routes.filter(r => r.mode === mode && (!q || `${r.origin} ${r.destination} ${r.note ?? ''}`.includes(q.trim())))
  const places = useMemo(() => {
    const used = data.routes.flatMap(r => [r.origin, r.destination])
    return [...new Set([...used, ...PROVINCES])].map(value => ({ value }))
  }, [data.routes])

  const remove = async (r: RouteRow) => {
    setDeleting(r.id)
    try {
      await travelPost(`transport/routes/${r.id}/delete`)
      message.success(`ลบเส้นทาง ${r.origin} ⇄ ${r.destination} แล้ว`)
      await onChanged()
    } catch (e) { onError(e) } finally { setDeleting(null) }
  }
  const openLog = async () => {
    setLog(null)
    try { setLog(await travelApi<LogRow[]>(`transport/log?entity=route&mode=${mode}`)) } catch (e) { onError(e); setLog([]) }
  }

  const columns: ColumnsType<RouteRow> = [
    {
      title: 'เส้นทาง', render: (_: unknown, r) => <>
        <span style={{ fontWeight: 500 }}>{r.origin} <span style={{ color: 'var(--app-text-3)' }}>⇄</span> {r.destination}</span>
        {/* จอเล็กซ่อนคอลัมน์ราคา — แสดงใต้ชื่อเส้นทางแทน */}
        <div className="fare-inline">เบิกได้ไม่เกิน <b>{baht(r.max_fare)}</b> บาท/เที่ยว</div>
      </>,
    },
    { title: 'เบิกได้ไม่เกิน (บาท/เที่ยว)', dataIndex: 'max_fare', align: 'right', width: 190, responsive: ['sm'], render: (v: number) => <b>{baht(v)}</b> },
    { title: 'หมายเหตุ', dataIndex: 'note', responsive: ['md'], render: (v: string | null) => v ?? <Text type="secondary">—</Text> },
    {
      title: 'แก้ล่าสุด', dataIndex: 'updated_at', width: 180, responsive: ['lg'],
      render: (v: string, r) => <><div style={{ fontSize: 13 }}>{r.updated_by_name ?? '—'}</div><Text type="secondary" style={{ fontSize: 12 }}>{fmtDateTime(v)}</Text></>,
    },
    ...(data.can_edit ? [{
      title: '', width: 96, align: 'right' as const,
      render: (_: unknown, r: RouteRow) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEdit(r)} aria-label={`แก้ไขเส้นทาง ${r.origin} ${r.destination}`} title="แก้ไข" />
          <Popconfirm title={`ลบเส้นทาง ${r.origin} ⇄ ${r.destination}?`} description="ผู้เดินทางจะเลือกเส้นทางนี้ไม่ได้อีก ประวัติยังเก็บไว้" okText="ลบ" okButtonProps={{ danger: true }} cancelText="ไม่ลบ" onConfirm={() => remove(r)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleting === r.id} aria-label={`ลบเส้นทาง ${r.origin} ${r.destination}`} title="ลบ" />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{MODE_INFO[mode].hint}</Text>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Input allowClear prefix={<SearchOutlined style={{ color: 'var(--app-text-3)' }} />} placeholder="ค้นหาต้นทาง ปลายทาง" value={q} onChange={e => setQ(e.target.value)} style={{ flex: '1 1 220px', maxWidth: 320 }} />
        <div style={{ flex: 1 }} />
        <Button icon={<HistoryOutlined />} onClick={openLog}>ประวัติ</Button>
        {data.can_edit && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEdit('new')}>เพิ่มเส้นทาง</Button>}
      </div>
      <Table<RouteRow> size="small" rowKey="id" columns={columns} dataSource={rows} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description={q ? 'ไม่พบเส้นทาง' : `ยังไม่มีเส้นทาง${MODE_INFO[mode].label}`} /> }} />

      {edit && <RouteEditModal key={edit === 'new' ? 'new' : edit.id} mode={mode} edit={edit} places={places} maxFare={data.limits.max_fare}
        onClose={() => setEdit(null)} onSaved={onChanged} onError={onError} />}

      <Modal title={`ประวัติเส้นทาง${MODE_INFO[mode].label}`} open={log !== undefined} onCancel={() => setLog(undefined)} footer={null} width={640} destroyOnHidden>
        <LogTable rows={log ?? null} entity="route" />
      </Modal>
    </>
  )
}

const TransportContent = () => {
  const { message } = App.useApp()
  const [data, setData] = useState<TransportData | null>(null)
  const [denied, setDenied] = useState(false)
  const onError = useCallback((e: unknown) => {
    if (e instanceof TravelApiError && e.status === 403) setDenied(true)
    else message.error((e as Error).message)
  }, [message])
  const load = useCallback(async () => {
    try { setData(await travelApi<TransportData>('transport')) } catch (e) { onError(e) }
  }, [onError])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  if (denied) return <Result status="403" title="ไม่มีสิทธิ์ตั้งค่าการเดินทาง" subTitle="เฉพาะผู้ดูแลระบบและเจ้าหน้าที่งานพัฒนาทรัพยากรบุคคล (HRD)" />
  const count = (m: Mode) => data?.routes.filter(r => r.mode === m).length ?? 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FaRoute />
        </div>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>ตั้งค่าการเดินทาง</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>อัตราและเพดานราคาที่ผู้เดินทางไปราชการเบิกได้ แก้ไขได้เมื่อราคาเปลี่ยน ทุกการแก้ไขเก็บประวัติไว้</Text>
        </div>
      </div>
      <Card styles={{ body: { padding: '4px 16px 16px' } }} style={{ borderRadius: 14 }} loading={!data}>
        {data && (
          <Tabs
            items={[
              { key: 'private', icon: <FaCar />, label: 'พาหนะส่วนตัว', children: <VehiclePanel data={data} onChanged={load} onError={onError} /> },
              { key: 'bus', icon: <FaBus />, label: `รถประจำทาง (${count('bus')})`, children: <RoutePanel mode="bus" data={data} onChanged={load} onError={onError} /> },
              { key: 'plane', icon: <FaPlane />, label: `เครื่องบิน (${count('plane')})`, children: <RoutePanel mode="plane" data={data} onChanged={load} onError={onError} /> },
            ]}
          />
        )}
      </Card>
      <style jsx global>{`
        .vehicle-card { height: 100%; padding: 16px; border-radius: 14px; border: 1px solid var(--app-border); background: var(--app-surface); }
        .fare-inline { display: none; font-size: 12.5px; color: var(--app-text-2); margin-top: 2px; }
        @media (max-width: 575px) { .fare-inline { display: block; } }
      `}</style>
    </>
  )
}

export default function TravelTransportPage() {
  return (
    <TravelShell current={TRAVEL_MENU[3].title}>
      <TransportContent />
    </TravelShell>
  )
}
