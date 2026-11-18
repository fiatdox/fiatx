'use client'
// การประเมินความเสี่ยงของบุคคลภายนอก (3rd Party Risk Assessment) ตามแบบฟอร์มคณะกรรมการพิจารณาความเสี่ยง
//   1 การประเมิน = ผู้ให้บริการ/องค์กรภายนอก 1 ราย ต่อ 1 ครั้งที่ประชุม · ข้อประเมิน 10 หมวด × 8 ข้อ ตาม พ.ร.บ.ไซเบอร์ (แม่แบบในฐานข้อมูล)
//   แต่ละข้อ: กระทบ C/I/A · ด้าน B/F S R I L O · โอกาส × ความรุนแรง · การจัดการ (คำแนะนำให้ผู้ให้บริการ) · ความเสี่ยงคงเหลือ
// เกณฑ์ระดับ ก่อนจัดการ 12.5 / 9.5 / 3.5 · หลังจัดการ 12.5 / 9.5 / 5.01 (ตามแบบฟอร์ม) · ส่งออก Excel ตามแบบฟอร์ม
// เฉพาะเจ้าหน้าที่ IT (menuAccess + proxy.ts + backend requireRoles) · ผู้บันทึกเลือกจากบัญชีเจ้าหน้าที่ IT
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { App, AutoComplete, Button, Card, Checkbox, Col, Collapse, ConfigProvider, DatePicker, Divider, Empty, Form, Input, InputNumber, Modal, Popconfirm, Progress, Radio, Result, Row, Segmented, Select, Space, Table, Tag, Timeline, Tooltip, Typography, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, HistoryOutlined, HomeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { FaFileExcel, FaHandshake, FaMicrochip } from 'react-icons/fa'
import dayjs, { type Dayjs } from 'dayjs'
import { downloadXlsx } from '@/app/lib/styledXlsx'
import Navbar from '@/app/components/Navbar'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import EChart from '@/app/components/EChart'
import { StatCard } from '@/app/components/StatCard'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { PALETTES, barHeight, base, categoryAxis, gap } from '@/app/lib/chartKit'
import { LEVEL_COLOR } from '../risk-register/rrShared'
import {
  AREAS, CIA, DEFAULT_REVIEWER, LEVELS, RESIDUAL_LEVELS, TREATMENT_LABEL, avg2, clusterShort, fmt1, fmt2, isOverdue, levelDef, planParts, thDate,
  type Assessment, type Header, type Item, type Level, type ListRow, type Treatment,
} from './tpShared'
import { buildThirdPartyReport, thirdPartyFilename } from './report'

const { Title, Text } = Typography

const api = async (url: string, method = 'GET', body?: unknown) => {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.success) throw Object.assign(new Error(j.message || 'ดำเนินการไม่สำเร็จ'), { status: res.status, field: j.field })
  return j.data
}
const levelTag = (score: number | null, residual = false, digits = 0) => {
  if (score == null) return <Text type="secondary">-</Text>
  const l = levelDef(score, residual)
  return <Tag color={l.tag} style={{ margin: 0, fontWeight: 600 }}>{digits ? score.toFixed(digits) : score} · {l.label}</Tag>
}
const marks = (keys: string[], defs: { key: string; short?: string; label: string }[]) => (
  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, letterSpacing: 0.5 }}>
    {defs.map(d => <Tooltip key={d.key} title={d.label}><span style={{ opacity: keys.includes(d.key) ? 1 : 0.22, marginRight: 4, fontWeight: keys.includes(d.key) ? 700 : 400 }}>{d.short ?? d.key}</span></Tooltip>)}
  </span>
)
type Staff = { id: number; name: string; position_name: string | null; me: boolean }

// ── หัวการประเมิน ──
const AssessmentModal = ({ edit, list, bia, onClose, onSaved }: { edit: Header | 'new'; list: ListRow[]; bia: { id: number; name: string }[]; onClose: () => void; onSaved: (id: number) => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<Staff[] | null>(null)
  const vendor = Form.useWatch('vendor_name', form) as string | undefined
  const source = Form.useWatch('source', form) as string | undefined
  // ประเมินซ้ำ: ยกค่าจากครั้งก่อนของรายเดียวกัน (ชื่อตรงกันแบบไม่สนตัวพิมพ์)
  const previous = list.filter(r => vendor && r.vendor_name.trim().toLowerCase() === vendor.trim().toLowerCase())
  useEffect(() => {
    api('/api/v1/it/risk-register/staff').then((rows: Staff[]) => {
      setStaff(rows)
      if (edit === 'new' && !form.getFieldValue('recorder_id')) form.setFieldValue('recorder_id', (rows.find(r => r.me) ?? rows.find(r => r.id === list[0]?.recorder_id))?.id)
    }).catch(e => { setStaff([]); message.error((e as Error).message) })
  }, [edit, form, list, message])
  const staffOptions = [
    ...(staff ?? []).map(u => ({ value: u.id, label: u.name, sub: u.position_name })),
    ...(edit !== 'new' && edit.recorder_id && staff && !staff.some(u => u.id === edit.recorder_id) ? [{ value: edit.recorder_id, label: edit.recorder_name ?? '-', sub: 'ไม่อยู่ในบัญชีเจ้าหน้าที่ IT แล้ว' }] : []),
  ]
  const init = edit === 'new'
    ? { reviewer: DEFAULT_REVIEWER, meeting_date: dayjs(), source: 'template', recorder_role: list[0]?.recorder_role }
    : { ...edit, meeting_date: edit.meeting_date ? dayjs(edit.meeting_date) : null }
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const { source: src, copy_from, ...rest } = v
      const body = { ...rest, meeting_date: v.meeting_date ? (v.meeting_date as Dayjs).format('YYYY-MM-DD') : null, bia_service_id: v.bia_service_id ?? null,
        copy_from: edit === 'new' && src === 'copy' ? copy_from : null }
      const d = edit === 'new' ? await api('/api/v1/it/third-party', 'POST', body) : await api(`/api/v1/it/third-party/${edit.id}`, 'PUT', body)
      message.success(edit === 'new' ? `สร้างการประเมินแล้ว (${d.items} ข้อ)` : 'บันทึกหัวการประเมินแล้ว')
      onSaved(edit === 'new' ? d.id : edit.id)
    } catch (e) { const er = e as Error & { field?: string }; if (er.field) form.setFields([{ name: er.field, errors: [er.message] }]); message.error(er.message) } finally { setSaving(false) }
  }
  return (
    <Modal open title={edit === 'new' ? 'ประเมินความเสี่ยงบุคคลภายนอกรายใหม่' : 'แก้ไขหัวการประเมิน'} onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} width={680} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={init}>
        <Row gutter={12}>
          <Col xs={24}><Form.Item name="vendor_name" label="ชื่อบุคคล/องค์กรภายนอก" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุชื่อ' }]}>
            <AutoComplete options={[...new Set(list.map(r => r.vendor_name))].map(v => ({ value: v }))} filterOption={(q, o) => String(o?.value ?? '').toLowerCase().includes(q.toLowerCase())}>
              <Input maxLength={255} placeholder="เช่น Zero Trust Hosting Provider Co., Ltd." /></AutoComplete>
          </Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="bia_service_id" label="บริการในทะเบียน BIA (ไม่บังคับ)">
            <Select allowClear showSearch={{ optionFilterProp: 'label' }} aria-label="บริการ BIA" options={bia.map(b => ({ value: b.id, label: b.name }))}
              onChange={(v: number | undefined) => { const b = bia.find(x => x.id === v); if (b && !form.getFieldValue('service_name')) form.setFieldValue('service_name', b.name) }} />
          </Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="service_name" label="ระบบบริการที่สำคัญ"><Input maxLength={255} placeholder="เช่น การบริการเก็บข้อมูล (Cloud Hosting Service)" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="reviewer" label="ผู้พิจารณาประเมิน"><Input maxLength={255} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="meeting_date" label="วันที่ทำการประชุมความเสี่ยงพร้อมบันทึก"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="recorder_id" label="ผู้บันทึก (บัญชีเจ้าหน้าที่ IT)" rules={[{ required: true, message: 'เลือกผู้บันทึก' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} loading={!staff} aria-label="ผู้บันทึก" placeholder="เลือกเจ้าหน้าที่ IT" options={staffOptions}
              optionRender={o => <div><div>{o.data.label}</div>{o.data.sub && <Text type="secondary" style={{ fontSize: 12 }}>{o.data.sub}</Text>}</div>} />
          </Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="recorder_role" label="ตำแหน่ง/บทบาท"><Input maxLength={150} placeholder="เช่น สมาชิกคณะกรรมการพิจารณาความเสี่ยง" /></Form.Item></Col>
          <Col xs={24}><Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} maxLength={2000} /></Form.Item></Col>
        </Row>
        {edit === 'new' && <>
          <Form.Item name="source" label="ข้อประเมินตั้งต้น" style={{ marginBottom: 8 }}>
            <Radio.Group options={[{ value: 'template', label: 'แม่แบบ 10 หมวด 80 ข้อ (ยังไม่ให้คะแนน)' }, { value: 'copy', label: 'ยกค่าจากการประเมินครั้งก่อนของรายนี้', disabled: !previous.length }]} />
          </Form.Item>
          {source === 'copy' && <Form.Item name="copy_from" rules={[{ required: true, message: 'เลือกการประเมินครั้งก่อน' }]} style={{ marginBottom: 0 }}>
            <Select aria-label="ยกค่าจาก" placeholder="เลือกการประเมินครั้งก่อน" options={previous.map(p => ({ value: p.id, label: `${thDate(p.meeting_date)} · เฉลี่ย ${fmt2(p.avg_score)} → ${fmt2(p.avg_residual)} (${p.items} ข้อ)` }))} />
          </Form.Item>}
          {!previous.length && vendor && <Text type="secondary" style={{ fontSize: 12 }}>ยังไม่มีการประเมินครั้งก่อนของ “{vendor}” — เริ่มจากแม่แบบ</Text>}
        </>}
      </Form>
    </Modal>
  )
}

// ── ข้อประเมิน ──
const ItemModal = ({ edit, assessment, owners, defaultCluster, onClose, onSaved }: { edit: Item | 'new'; assessment: Assessment; owners: string[]; defaultCluster?: number; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const L = Form.useWatch('likelihood', form) as number | undefined, I = Form.useWatch('impact', form) as number | undefined
  const RL = Form.useWatch('residual_likelihood', form) as number | undefined, RI = Form.useWatch('residual_impact', form) as number | undefined
  const init = edit === 'new'
    ? { cluster_no: defaultCluster ?? assessment.clusters[0]?.cluster_no, cia: CIA.map(c => c.key), impact_areas: AREAS.map(a => a.key), treatment: 'mitigate', progress_pct: 0, residual_cia: CIA.map(c => c.key), residual_areas: AREAS.map(a => a.key) }
    : { ...edit, due_date: edit.due_date ? dayjs(edit.due_date) : null }
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const body = { ...v, due_date: v.due_date ? (v.due_date as Dayjs).format('YYYY-MM-DD') : null,
        likelihood: v.likelihood ?? null, impact: v.impact ?? null, residual_likelihood: v.residual_likelihood ?? null, residual_impact: v.residual_impact ?? null }
      if (edit === 'new') await api(`/api/v1/it/third-party/${assessment.id}/items`, 'POST', body)
      else await api(`/api/v1/it/third-party/items/${edit.id}`, 'PUT', body)
      message.success('บันทึกข้อประเมินแล้ว')
      onSaved()
    } catch (e) { const er = e as Error & { field?: string }; if (er.field) form.setFields([{ name: er.field, errors: [er.message] }]); message.error(er.message) } finally { setSaving(false) }
  }
  const scale = Array.from({ length: 5 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
  const pair = (a: string, b: string) => ({ validator: () => (form.getFieldValue(a) == null) === (form.getFieldValue(b) == null) ? Promise.resolve() : Promise.reject(new Error('ระบุทั้งโอกาสเกิดและความรุนแรง')) })
  return (
    <Modal open title={edit === 'new' ? 'เพิ่มข้อประเมิน' : `ข้อ ${edit.item_no}`} onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} width={900} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={init}>
        {edit === 'new'
          ? <Form.Item name="cluster_no" label="หมวดหมู่ความเสี่ยง (Risk Cluster)" rules={[{ required: true }]}><Select aria-label="หมวด" options={assessment.clusters.map(c => ({ value: c.cluster_no, label: `${c.cluster_no}. ${c.name}` }))} /></Form.Item>
          : <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>{edit.cluster_no}. {edit.cluster_name}</Text>}
        <Form.Item name="risk" label="ความเสี่ยง (ข้อประเมิน)" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุ' }]}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
        <Row gutter={12}>
          <Col xs={24} md={12}><Form.Item name="threat" label="ภัยคุกคาม (Threat)"><Input.TextArea rows={2} maxLength={1000} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="vulnerability" label="ช่องโหว่ (Vulnerability)"><Input.TextArea rows={2} maxLength={2000} /></Form.Item></Col>
        </Row>
        <Divider titlePlacement="start" style={{ marginTop: 0 }}>การประเมินความเสี่ยง</Divider>
        <Row gutter={12}>
          <Col xs={24} md={8}><Form.Item name="cia" label="กระทบต่อ"><Checkbox.Group options={CIA.map(c => ({ value: c.key, label: <Tooltip title={c.label}>{c.key}</Tooltip> }))} /></Form.Item></Col>
          <Col xs={24} md={16}><Form.Item name="impact_areas" label="ความรุนแรงแต่ละด้าน"><Checkbox.Group options={AREAS.map(a => ({ value: a.key, label: <Tooltip title={a.label}>{a.short}</Tooltip> }))} /></Form.Item></Col>
          <Col xs={12} md={8}><Form.Item name="likelihood" label="โอกาสเกิด (Likelihood)" extra="4–5 = ใช่" rules={[pair('likelihood', 'impact')]} dependencies={['impact']}><Segmented block options={scale} aria-label="โอกาสเกิด" /></Form.Item></Col>
          <Col xs={12} md={8}><Form.Item name="impact" label="ความรุนแรง (Impact)" rules={[pair('likelihood', 'impact')]} dependencies={['likelihood']}><Segmented block options={scale} aria-label="ความรุนแรง" /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="ระดับความเสี่ยง"><Space><span data-testid="tp-score">{L && I ? levelTag(L * I) : <Text type="secondary">ยังไม่ประเมิน</Text>}</span>
            {(L || I) && <Button size="small" type="link" onClick={() => form.setFieldsValue({ likelihood: undefined, impact: undefined })}>ล้าง</Button>}</Space></Form.Item></Col>
        </Row>
        <Divider titlePlacement="start">การจัดการความเสี่ยง (คำแนะนำให้แก่ผู้ให้บริการ)</Divider>
        <Row gutter={12}>
          <Col xs={24} md={8}><Form.Item name="treatment" label="ตัวเลือกการตอบสนอง" rules={[{ required: true }]}><Select aria-label="ตัวเลือกการตอบสนอง" options={(Object.keys(TREATMENT_LABEL) as Treatment[]).map(t => ({ value: t, label: TREATMENT_LABEL[t] }))} /></Form.Item></Col>
          <Col xs={12} md={8}><Form.Item name="progress_pct" label="สถานะความคืบหน้า (%)"><InputNumber min={0} max={100} step={5} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={12} md={8}><Form.Item name="due_date" label="คาดว่าดำเนินการแล้วเสร็จ"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          <Col xs={24}><Form.Item name="treatment_plan" label="การจัดการความเสี่ยง" extra='คั่นแต่ละข้อด้วย " | "'><Input.TextArea rows={3} maxLength={4000} /></Form.Item></Col>
          <Col xs={24}><Form.Item name="owner" label="ผู้รับผิดชอบ"><AutoComplete options={owners.map(o => ({ value: o }))} filterOption={(q, o) => String(o?.value ?? '').includes(q)}><Input maxLength={255} /></AutoComplete></Form.Item></Col>
        </Row>
        <Divider titlePlacement="start">ความเสี่ยงคงเหลือหลังจัดการ</Divider>
        <Row gutter={12}>
          <Col xs={24} md={8}><Form.Item name="residual_cia" label="กระทบต่อ"><Checkbox.Group options={CIA.map(c => ({ value: c.key, label: <Tooltip title={c.label}>{c.key}</Tooltip> }))} /></Form.Item></Col>
          <Col xs={24} md={16}><Form.Item name="residual_areas" label="ความรุนแรงแต่ละด้าน"><Checkbox.Group options={AREAS.map(a => ({ value: a.key, label: <Tooltip title={a.label}>{a.short}</Tooltip> }))} /></Form.Item></Col>
          <Col xs={8} md={6}><Form.Item name="residual_likelihood" label="โอกาสเกิด" rules={[pair('residual_likelihood', 'residual_impact')]} dependencies={['residual_impact']}><Select allowClear aria-label="โอกาสเกิดคงเหลือ" options={scale} placeholder="-" /></Form.Item></Col>
          <Col xs={8} md={6}><Form.Item name="residual_impact" label="ความรุนแรง" rules={[pair('residual_likelihood', 'residual_impact')]} dependencies={['residual_likelihood']}><Select allowClear aria-label="ความรุนแรงคงเหลือ" options={scale} placeholder="-" /></Form.Item></Col>
          <Col xs={8} md={12}><Form.Item label="ระดับความเสี่ยงที่คงเหลือ"><div data-testid="tp-residual">{RL && RI ? levelTag(RL * RI, true) : '-'}</div></Form.Item></Col>
          <Col xs={24}><Form.Item name="further_action" label="ดำเนินการเพิ่มเติมเพื่อลดความเสี่ยงให้น้อยลงอีก"><AutoComplete options={[{ value: 'เฝ้าติดตามเป็นระยะ' }]}><Input maxLength={2000} /></AutoComplete></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  )
}

type LevelFilter = 'all' | Level | 'none' | 'overdue'

const PageContent = ({ isDark }: { isDark: boolean }) => {
  const { message } = App.useApp()
  const [list, setList] = useState<ListRow[] | null>(null)
  const [selId, setSelId] = useState<number | null>(null)
  const [data, setData] = useState<Assessment | null>(null)
  const [bia, setBia] = useState<{ id: number; name: string }[]>([])
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [headModal, setHeadModal] = useState<Header | 'new' | null>(null)
  const [itemModal, setItemModal] = useState<{ edit: Item | 'new'; cluster?: number } | null>(null)
  const [log, setLog] = useState<{ id: number; action: string; changed_at: string; changed_by_name: string | null; item_no: string | null; risk: string | null }[] | null>(null)
  const [q, setQ] = useState('')
  const [lvF, setLvF] = useState<LevelFilter>('all')
  const [open, setOpen] = useState<string[] | null>(null)
  const P = PALETTES[isDark ? 'dark' : 'light']
  const LC = LEVEL_COLOR[isDark ? 'dark' : 'light']
  const today = dayjs().format('YYYY-MM-DD')

  const loadList = useCallback(async (select?: number) => {
    try {
      const rows: ListRow[] = await api('/api/v1/it/third-party')
      setList(rows)
      setSelId(cur => select ?? (cur && rows.some(r => r.id === cur) ? cur : rows[0]?.id ?? null))
    } catch (e) { if ((e as { status?: number }).status === 403) setDenied(true); else message.error((e as Error).message) }
  }, [message])
  const loadOne = useCallback(async (id: number) => {
    setLoading(true)
    try { setData(await api(`/api/v1/it/third-party/${id}`)) } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { loadList() }, [loadList])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดการประเมินที่เลือก
  useEffect(() => { if (selId) loadOne(selId); else setData(null) }, [selId, loadOne])
  useEffect(() => { fetch('/api/v1/it/bia').then(r => r.json()).then(j => { if (j.success) setBia(j.data.filter((s: { is_active: boolean }) => s.is_active).map((s: { id: number; name: string }) => ({ id: s.id, name: s.name }))) }).catch(() => {}) }, [])
  const reloadAll = () => { loadList(); if (selId) loadOne(selId) }

  const items = useMemo(() => data?.items ?? [], [data])
  const owners = useMemo(() => [...new Set(items.map(i => i.owner).filter((x): x is string => !!x))], [items])
  const avgScore = avg2(items.map(i => i.score)), avgRes = avg2(items.map(i => i.residual_score))
  const assessed = items.filter(i => i.score != null).length
  const clusters = useMemo(() => (data?.clusters ?? []).map(c => {
    const xs = items.filter(i => i.cluster_no === c.cluster_no)
    return { ...c, items: xs, avg: avg2(xs.map(i => i.score)), res: avg2(xs.map(i => i.residual_score)) }
  }).filter(c => c.items.length), [data, items])
  const match = (i: Item) => {
    const s = q.trim().toLowerCase()
    if (s && ![i.item_no, i.risk, i.threat, i.vulnerability, i.treatment_plan, i.owner].some(x => (x ?? '').toLowerCase().includes(s))) return false
    if (lvF === 'none') return i.score == null
    if (lvF === 'overdue') return isOverdue(i, today)
    return lvF === 'all' || (i.score != null && levelDef(i.score).key === lvF)
  }
  const filtering = !!q.trim() || lvF !== 'all'

  const openLog = async () => { if (!data) return; try { setLog(await api(`/api/v1/it/third-party/${data.id}/log`)) } catch (e) { message.error((e as Error).message) } }
  const delItem = async (i: Item) => { try { await api(`/api/v1/it/third-party/items/${i.id}`, 'DELETE'); message.success(`ลบข้อ ${i.item_no} แล้ว`); reloadAll() } catch (e) { message.error((e as Error).message) } }
  const exportXlsx = () => { if (!data) return; try { downloadXlsx(buildThirdPartyReport(data), thirdPartyFilename(data)); message.success('สร้างไฟล์ Excel แล้ว') } catch (e) { message.error((e as Error).message || 'สร้างไฟล์ไม่สำเร็จ') } }

  // ── ค่าเฉลี่ยรายหมวด ก่อน/หลังจัดการ (แท่งคู่ แกนเดียว) — tooltip มาตรฐานของ ECharts (escape ชื่อให้เอง) ──
  const clusterOption = {
    ...base(P, v => v.toFixed(2)),
    grid: { left: 8, right: 24, top: 30, bottom: 8, containLabel: true },
    xAxis: { type: 'value', min: 0, max: 25, interval: 5, axisLabel: { color: P.muted }, splitLine: { lineStyle: { color: P.grid } } },
    yAxis: categoryAxis(P, clusters.map(c => `${c.cluster_no}. ${clusterShort(c.name)}`), true, undefined, 28),
    series: [
      { name: 'ก่อนจัดการ', type: 'bar', barMaxWidth: 12, barGap: '20%', data: clusters.map(c => ({ value: c.avg ?? 0, itemStyle: { color: c.avg == null ? P.other : LC[levelDef(c.avg).key], borderRadius: [0, 4, 4, 0], ...gap(P) } })) },
      { name: 'หลังจัดการ', type: 'bar', barMaxWidth: 12, data: clusters.map(c => ({ value: c.res ?? 0, itemStyle: { color: c.res == null ? P.other : LC[levelDef(c.res, true).key], opacity: 0.55, borderRadius: [0, 4, 4, 0], ...gap(P) } })) },
    ],
    legend: { ...base(P, String).legend, data: ['ก่อนจัดการ', 'หลังจัดการ'] },
  }

  const columns: ColumnsType<Item> = [
    { title: 'ข้อ', dataIndex: 'item_no', width: 52, fixed: 'left', render: (v: string, i) => <>{v}{i.copied_from && <div><Tooltip title="ยกค่ามาจากการประเมินครั้งก่อน"><Tag style={{ fontSize: 10, margin: 0, padding: '0 3px' }}>ยกมา</Tag></Tooltip></div>}</> },
    { title: 'ความเสี่ยง / ภัยคุกคาม / ช่องโหว่', key: 'risk', width: 300, render: (_: unknown, i) => <>
      <div style={{ fontWeight: 600 }}>{i.risk}</div>
      {i.threat && <div style={{ fontSize: 12 }}><Text type="secondary">ภัย:</Text> {i.threat}</div>}
      {i.vulnerability && <div style={{ fontSize: 12 }}><Text type="secondary">ช่องโหว่:</Text> {i.vulnerability}</div>}</> },
    { title: 'กระทบ / ด้าน', key: 'cia', width: 150, render: (_: unknown, i) => <>{marks(i.cia, CIA)}<br />{marks(i.impact_areas, AREAS)}</> },
    { title: 'L × I', key: 'li', width: 64, align: 'center', render: (_: unknown, i) => i.likelihood ? `${i.likelihood} × ${i.impact}` : <Text type="secondary">-</Text> },
    { title: 'ระดับ', dataIndex: 'score', width: 104, align: 'center', render: (v: number | null) => v == null ? <Tag style={{ margin: 0 }}>ยังไม่ประเมิน</Tag> : levelTag(v) },
    { title: 'การจัดการความเสี่ยง (คำแนะนำให้ผู้ให้บริการ)', key: 'plan', width: 330, render: (_: unknown, i) => <>
      <Text type="secondary" style={{ fontSize: 12 }}>{TREATMENT_LABEL[i.treatment]}</Text>
      <ul style={{ margin: '2px 0 0', paddingLeft: 16, fontSize: 12.5 }}>{planParts(i.treatment_plan).map((p, k) => <li key={k}>{p}</li>)}</ul></> },
    { title: 'ผู้รับผิดชอบ', dataIndex: 'owner', width: 130, render: (v: string | null) => v ?? '-' },
    { title: 'ความคืบหน้า', dataIndex: 'progress_pct', width: 110, render: (v: number) => <Progress percent={v} size="small" strokeColor={v >= 100 ? undefined : P.single} /> },
    { title: 'คาดว่าเสร็จ', dataIndex: 'due_date', width: 92, render: (v: string | null, i) => v ? <Text type={isOverdue(i, today) ? 'danger' : undefined} strong={isOverdue(i, today)}>{thDate(v)}</Text> : '-' },
    { title: 'คงเหลือ', key: 'res', width: 120, align: 'center', render: (_: unknown, i) => <>{levelTag(i.residual_score, true)}{i.residual_likelihood && <div style={{ fontSize: 11 }}><Text type="secondary">{i.residual_likelihood} × {i.residual_impact}</Text></div>}</> },
    { title: 'ดำเนินการเพิ่มเติม', dataIndex: 'further_action', width: 140, render: (v: string | null) => v ?? '-' },
    { title: '', key: 'act', width: 84, fixed: 'right', align: 'center', render: (_: unknown, i) => <Space size={4}>
      <Button size="small" icon={<EditOutlined />} onClick={() => setItemModal({ edit: i })} aria-label={`แก้ไขข้อ ${i.item_no}`} />
      <Popconfirm title={`ลบข้อ ${i.item_no}?`} description="ค่าเดิมเก็บไว้ในประวัติ" okText="ลบ" cancelText="ไม่ลบ" okButtonProps={{ danger: true }} onConfirm={() => delItem(i)}>
        <Button size="small" danger icon={<DeleteOutlined />} aria-label={`ลบข้อ ${i.item_no}`} />
      </Popconfirm></Space> },
  ]

  if (denied) return <Result status="403" title="ไม่มีสิทธิ์เข้าถึง" subTitle="การประเมินความเสี่ยงบุคคลภายนอกเปิดให้เฉพาะเจ้าหน้าที่งานคอมพิวเตอร์และผู้ดูแลระบบ" />
  const avgBox = (title: string, score: number | null, residual: boolean, testid: string) => {
    const l = score == null ? null : levelDef(score, residual)
    return (
      <div className="tp-avg" data-testid={testid}>
        <Text type="secondary" style={{ fontSize: 12.5 }}>{title}</Text>
        <div className="flex items-center gap-3" style={{ margin: '4px 0 8px' }}>
          <span style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, color: l ? LC[l.key] : undefined }}>{fmt1(score)}</span>
          {l && <Tag color={l.tag} style={{ margin: 0, fontWeight: 600 }}>{l.label}</Tag>}
        </div>
        <table className="tp-legend"><tbody>{(residual ? RESIDUAL_LEVELS : LEVELS).map(d => <tr key={d.key}>
          <td><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: LC[d.key], marginRight: 6 }} /><b>{d.range}</b></td><td>{d.desc}</td></tr>)}</tbody></table>
      </div>
    )
  }
  const activeKeys = open ?? clusters.map(c => String(c.cluster_no))
  const critHigh = items.filter(i => i.score != null && i.score >= 9.5).length

  return (
    <>
      <Card style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)', border: 'none', borderRadius: 16, marginBottom: 20 }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}><FaHandshake className="text-2xl text-white" /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>การประเมินความเสี่ยงของบุคคลภายนอก</Title>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14 }}>3rd Party Risk Assessment · ผู้ให้บริการ/องค์กรภายนอกที่เกี่ยวข้องกับระบบบริการที่สำคัญ · 10 หมวดตาม พ.ร.บ.ไซเบอร์</Text>
          </div>
          <Space wrap>
            <Select style={{ minWidth: 260 }} value={selId ?? undefined} onChange={v => { setSelId(v); setOpen(null) }} placeholder="เลือกการประเมิน" aria-label="เลือกการประเมิน" showSearch={{ optionFilterProp: 'label' }}
              options={(list ?? []).map(r => ({ value: r.id, label: `${r.vendor_name} · ${thDate(r.meeting_date)}` }))} />
            <Button icon={<PlusOutlined />} onClick={() => setHeadModal('new')}>ประเมินรายใหม่</Button>
            <Button icon={<ReloadOutlined />} onClick={reloadAll} loading={loading} aria-label="โหลดใหม่" />
          </Space>
        </div>
      </Card>

      {!list ? <Card loading style={{ borderRadius: 16 }} /> : !data ? (
        <Card style={{ borderRadius: 16 }}><Empty description="ยังไม่มีการประเมินความเสี่ยงบุคคลภายนอก"><Button type="primary" icon={<PlusOutlined />} onClick={() => setHeadModal('new')}>เริ่มประเมินรายแรก</Button></Empty></Card>
      ) : <>
        <Card size="small" className="mb-4" style={{ borderRadius: 16 }} title={<span>{data.vendor_name}</span>}
          extra={<Space size={4} wrap><Button size="small" icon={<EditOutlined />} onClick={() => setHeadModal(data)}>แก้ไขหัว</Button><Button size="small" icon={<HistoryOutlined />} onClick={openLog}>ประวัติ</Button><Button size="small" icon={<FaFileExcel />} onClick={exportXlsx}>Excel ตามแบบฟอร์ม</Button></Space>}>
          <Row gutter={[24, 16]}>
            <Col xs={24} xl={8}>
              <div className="tp-head" data-testid="tp-header">
                <div><Text type="secondary">ผู้พิจารณาประเมิน</Text><div>{data.reviewer ?? '-'}</div></div>
                <div><Text type="secondary">ผู้บันทึก</Text><div>{[data.recorder_name, data.recorder_role].filter(Boolean).join(', ') || '-'}</div></div>
                <div><Text type="secondary">วันที่ทำการประชุมความเสี่ยงพร้อมบันทึก</Text><div>{thDate(data.meeting_date)}</div></div>
                <div><Text type="secondary">ระบบบริการที่สำคัญ</Text><div>{data.service_name ?? '-'}{data.bia_service_name && data.bia_service_name !== data.service_name && <Text type="secondary"> (BIA: {data.bia_service_name})</Text>}</div></div>
                {data.notes && <div><Text type="secondary">หมายเหตุ</Text><div>{data.notes}</div></div>}
              </div>
            </Col>
            <Col xs={24} md={12} xl={8}>{avgBox('ผลการประเมินความเสี่ยง (เฉลี่ย) โดยรวมของ 3rd party เจ้านี้', avgScore, false, 'tp-avg')}</Col>
            <Col xs={24} md={12} xl={8}>{avgBox('ผลการประเมินความเสี่ยง (เฉลี่ย) หลังจัดการความเสี่ยง', avgRes, true, 'tp-avg-res')}</Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]} className="mb-4" data-testid="tp-cards">
          <Col xs={12} lg={6}><StatCard accent="teal" isDark={isDark} label="ประเมินแล้ว" value={`${assessed}/${items.length}`} suffix="ข้อ" icon={<FaHandshake />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>{clusters.length} หมวด · ยังไม่ประเมิน {items.length - assessed} ข้อ</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="rose" isDark={isDark} label="วิกฤติ / สูง (ก่อนจัดการ)" value={critHigh} suffix="ข้อ" icon={<FaHandshake />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>วิกฤติ {items.filter(i => i.score != null && i.score >= 12.5).length} · สูง {items.filter(i => i.score != null && i.score >= 9.5 && i.score < 12.5).length}</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="emerald" isDark={isDark} label="ความคืบหน้าเฉลี่ย" value={avg2(items.map(i => i.progress_pct))?.toFixed(1) ?? '-'} suffix="%" icon={<FaHandshake />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>เสร็จ 100% แล้ว {items.filter(i => i.progress_pct >= 100).length} ข้อ</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="amber" isDark={isDark} label="เลยกำหนดเสร็จ" value={items.filter(i => isOverdue(i, today)).length} suffix="ข้อ" icon={<FaHandshake />}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>ความคืบหน้ายังไม่ถึง 100%</Text>} onClick={() => setLvF('overdue')} /></Col>
        </Row>

        <Card size="small" className="mb-4" style={{ borderRadius: 16 }} title="ระดับความเสี่ยงเฉลี่ยรายหมวด (ก่อน / หลังจัดการ)">
          <EChart theme={isDark ? 'dark' : 'light'} height={barHeight(clusters.length * 1.4, 300)} option={clusterOption} />
        </Card>

        <Card size="small" style={{ borderRadius: 16 }} title="ข้อประเมินตามหมวด (Risk Cluster)"
          extra={<Space wrap size={8}>
            <Input allowClear prefix={<SearchOutlined />} placeholder="ค้นหาข้อ / ความเสี่ยง / ผู้รับผิดชอบ" value={q} onChange={e => setQ(e.target.value)} style={{ width: 240 }} aria-label="ค้นหาข้อประเมิน" />
            <Select value={lvF} onChange={setLvF} style={{ width: 170 }} aria-label="กรองระดับ" options={[{ value: 'all', label: 'ทุกระดับ' }, ...LEVELS.map(l => ({ value: l.key, label: `ระดับ${l.label}` })), { value: 'none', label: 'ยังไม่ประเมิน' }, { value: 'overdue', label: 'เลยกำหนดเสร็จ' }]} />
            <Button size="small" onClick={() => setOpen(activeKeys.length ? [] : clusters.map(c => String(c.cluster_no)))}>{activeKeys.length ? 'ย่อทั้งหมด' : 'ขยายทั้งหมด'}</Button>
          </Space>}>
          <Collapse activeKey={filtering ? clusters.map(c => String(c.cluster_no)) : activeKeys} onChange={k => setOpen(k as string[])} data-testid="tp-clusters"
            items={clusters.map(c => {
              const rows = c.items.filter(match)
              return {
                key: String(c.cluster_no),
                label: <div className="flex flex-wrap items-center gap-2"><b>{c.cluster_no}. {c.name}</b><Text type="secondary" style={{ fontSize: 12 }}>{c.items.length} ข้อ{filtering ? ` · ตรงเงื่อนไข ${rows.length}` : ''}</Text></div>,
                extra: <Space size={6} onClick={e => e.stopPropagation()}>
                  <Tooltip title="ระดับความเสี่ยงโดยเฉลี่ยของหมวด">{levelTag(c.avg, false, 2)}</Tooltip>
                  <Tooltip title="คงเหลือเฉลี่ยหลังจัดการ">{levelTag(c.res, true, 2)}</Tooltip>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => setItemModal({ edit: 'new', cluster: c.cluster_no })} aria-label={`เพิ่มข้อในหมวด ${c.cluster_no}`} />
                </Space>,
                children: <Table<Item> size="small" rowKey="id" pagination={false} columns={columns} dataSource={rows} scroll={{ x: 1680 }}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีข้อที่ตรงเงื่อนไข" /> }} />,
              }
            })} />
        </Card>
      </>}

      {headModal && <AssessmentModal edit={headModal} list={list ?? []} bia={bia} onClose={() => setHeadModal(null)} onSaved={id => { setHeadModal(null); loadList(id); loadOne(id) }} />}
      {itemModal && data && <ItemModal key={itemModal.edit === 'new' ? `new-${itemModal.cluster}` : itemModal.edit.id} edit={itemModal.edit} assessment={data} owners={owners} defaultCluster={itemModal.cluster}
        onClose={() => setItemModal(null)} onSaved={() => { setItemModal(null); reloadAll() }} />}
      <Modal open={log !== null} title="ประวัติการแก้ไข" footer={null} onCancel={() => setLog(null)} width={600}>
        {log?.length ? <Timeline items={log.map(l => ({ content: <span style={{ fontSize: 12.5 }}>
          {({ create_assessment: 'สร้างการประเมิน', update_assessment: 'แก้หัวการประเมิน', create: 'เพิ่มข้อ', update: 'แก้ข้อ', delete: 'ลบข้อ', copy: 'ยกค่าจากการประเมินครั้งก่อน' } as Record<string, string>)[l.action] ?? l.action}
          {l.item_no ? ` ${l.item_no}` : ''}{l.risk ? `: ${l.risk}` : ''}<br /><Text type="secondary">{dayjs(l.changed_at).format('DD/MM/YYYY HH:mm')} · {l.changed_by_name ?? '-'}</Text></span> }))} /> : <Text type="secondary">ไม่มีประวัติ</Text>}
      </Modal>
      <style jsx global>{`
        .tp-head { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; font-size: 13.5px; }
        .tp-avg { border: 1px solid var(--app-border, rgba(0,0,0,0.08)); border-radius: 12px; padding: 12px 14px; height: 100%; }
        .tp-legend { font-size: 12px; border-collapse: collapse; }
        .tp-legend td { padding: 2px 6px 2px 0; vertical-align: top; }
        .tp-legend td:first-child { white-space: nowrap; }
      `}</style>
    </>
  )
}

export default function ItThirdPartyRiskPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#0f766e', borderRadius: 8 } }}>
      <App>
        <div className="min-h-screen w-full bg-app-bg text-app-text">
          <Navbar />
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
            <Breadcrumb className="mb-4" items={[
              { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
              { title: <><FaMicrochip className="inline mr-1" /> งานคอมพิวเตอร์ฯ</> },
              { title: 'ประเมินความเสี่ยงบุคคลภายนอก' },
            ]} />
            <PageContent isDark={isDark} />
          </div>
        </div>
      </App>
    </ConfigProvider>
  )
}
