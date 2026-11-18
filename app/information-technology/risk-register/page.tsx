'use client'
// ทะเบียนความเสี่ยง (Risk Register) ของบริการที่สำคัญ — ปีงบประมาณละ 2 ครั้ง (ครั้งที่ 1 ต.ค.–มี.ค. · ครั้งที่ 2 เม.ย.–ก.ย.) ตามแบบฟอร์มคณะกรรมการพิจารณาความเสี่ยง
//   PART 1 ประเมิน (C/I/A, ด้าน F S R I L O, โอกาส × ความรุนแรง) · PART 2 แผนจัดการ + ความเสี่ยงคงเหลือ · PART 3 ติดตาม
// ระดับ (ตามแบบฟอร์ม): 12.5–25 วิกฤติ · 9.5–12.4 สูง · 3.5–9.4 ปานกลาง · 1–3.4 ต่ำ — ใช้กับคะแนนรายการและคะแนนเฉลี่ยของทะเบียน
// สร้างรอบใหม่ยกรายการที่ยัง Open จากรอบก่อนได้ · ผูกรายการกับบริการในทะเบียน BIA ได้ · ส่งออก Excel ตามแบบฟอร์ม
// เฉพาะเจ้าหน้าที่ IT (menuAccess + proxy.ts + backend requireRoles)
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { App, AutoComplete, Button, Card, Checkbox, Col, ConfigProvider, DatePicker, Divider, Empty, Form, Input, InputNumber, Modal, Popconfirm, Result, Row, Segmented, Select, Space, Table, Tag, Timeline, Tooltip, Typography, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, HistoryOutlined, HomeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { FaClipboardList, FaFileExcel, FaMicrochip } from 'react-icons/fa'
import dayjs, { type Dayjs } from 'dayjs'
import { downloadXlsx } from '@/app/lib/styledXlsx'
import Navbar from '@/app/components/Navbar'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import EChart from '@/app/components/EChart'
import { StatCard } from '@/app/components/StatCard'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { PALETTES } from '@/app/lib/chartKit'
import { AREAS, CATEGORY_LABEL, CIA, LEVELS, LEVEL_COLOR, TREATMENT_LABEL, avg, isOverdue, fyOf, levelOf, periodLabel, periodOf, periodShort, roundOf, thShort, type Category, type Header, type Item, type Level, type ListRow, type Register, type Treatment } from './rrShared'
import { buildRiskReport, filterItems, reportFilename, type ReportOptions } from './report'

const { Title, Text } = Typography

const levelTag = (score: number | null) => score == null ? <Text type="secondary">-</Text> : (() => { const l = LEVELS.find(x => x.key === levelOf(score))!; return <Tag color={l.tag} style={{ margin: 0, fontWeight: 600 }}>{score} · {l.label}</Tag> })()
const mark = (on: boolean) => on ? <span style={{ fontWeight: 700 }}>x</span> : <Text type="secondary">-</Text>
const api = async (url: string, method = 'GET', body?: unknown) => {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.success) throw Object.assign(new Error(j.message || 'ดำเนินการไม่สำเร็จ'), { status: res.status, field: j.field })
  return j.data
}

// ── หัวทะเบียน ──
const RegisterModal = ({ edit, latest, onClose, onSaved }: { edit: Header | 'new'; latest: ListRow | null; onClose: () => void; onSaved: (id: number) => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  // ผู้บันทึก = บัญชีเจ้าหน้าที่ IT · รอบใหม่ตั้งเป็นผู้ใช้ปัจจุบันก่อน (ถ้าเป็น IT) ไม่งั้นใช้ผู้บันทึกรอบก่อน
  const [staff, setStaff] = useState<{ id: number; name: string; position_name: string | null; me: boolean }[] | null>(null)
  useEffect(() => {
    api('/api/v1/it/risk-register/staff').then((rows: { id: number; name: string; position_name: string | null; me: boolean }[]) => {
      setStaff(rows)
      if (edit === 'new' && !form.getFieldValue('recorder_id')) form.setFieldValue('recorder_id', (rows.find(r => r.me) ?? rows.find(r => r.id === latest?.recorder_id))?.id)
    }).catch(e => { setStaff([]); message.error((e as Error).message) })
  }, [edit, form, latest, message])
  const staffOptions = [
    ...(staff ?? []).map(u => ({ value: u.id, label: u.name, sub: u.position_name })),
    // ผู้บันทึกเดิมที่ไม่อยู่ในบัญชี IT แล้ว — ยังแสดงชื่อเดิมได้
    ...(edit !== 'new' && edit.recorder_id && staff && !staff.some(u => u.id === edit.recorder_id) ? [{ value: edit.recorder_id, label: edit.recorder_name ?? '-', sub: 'ไม่อยู่ในบัญชีเจ้าหน้าที่ IT แล้ว' }] : []),
  ]
  // รอบใหม่: รอบปัจจุบันตามวันนี้ ถ้ามีแล้วต่อจากรอบล่าสุด
  const now = periodOf(), fyNow = fyOf(now)
  const nextP = !latest || latest.period < now ? now : roundOf(latest.period) === 1 ? `${fyOf(latest.period)}-2` : `${fyOf(latest.period) + 1}-1`
  const fyOptions = [...new Set([fyNow - 2, fyNow - 1, fyNow, fyNow + 1, fyOf(nextP), ...(edit === 'new' ? [] : [fyOf(edit.period)])])].sort()
  const init = edit === 'new'
    ? { fy: fyOf(nextP), round: roundOf(nextP), meeting_date: dayjs(), copy: !!latest, recorder_role: latest?.recorder_role, location: latest?.location, address: latest?.address, critical_service: latest?.critical_service }
    : { ...edit, fy: fyOf(edit.period), round: roundOf(edit.period), meeting_date: edit.meeting_date ? dayjs(edit.meeting_date) : null }
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const { fy, round, ...rest } = v
      const body = { ...rest, period: `${fy}-${round}`, meeting_date: v.meeting_date ? (v.meeting_date as Dayjs).format('YYYY-MM-DD') : null, copy_from: edit === 'new' && v.copy && latest ? latest.id : null }
      const d = edit === 'new' ? await api('/api/v1/it/risk-register', 'POST', body) : await api(`/api/v1/it/risk-register/${edit.id}`, 'PUT', body)
      message.success(edit === 'new' ? `สร้างทะเบียน${periodShort(body.period)}แล้ว${d?.copied ? ` ยกรายการที่ยัง Open มา ${d.copied} รายการ` : ''}` : 'บันทึกหัวทะเบียนแล้ว')
      onSaved(edit === 'new' ? d.id : edit.id)
    } catch (e) { const er = e as Error & { field?: string }; if (er.field) form.setFields([{ name: er.field, errors: [er.message] }]); message.error(er.message) } finally { setSaving(false) }
  }
  return (
    <Modal open title={edit === 'new' ? 'สร้างทะเบียนความเสี่ยงรอบใหม่' : 'แก้ไขหัวทะเบียน'} onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} width={640} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={init}>
        <Row gutter={12}>
          <Col xs={8}><Form.Item name="fy" label="ปีงบประมาณ (พ.ศ.)" rules={[{ required: true, message: 'เลือกปีงบประมาณ' }]}><Select aria-label="ปีงบประมาณ" options={fyOptions.map(y => ({ value: y, label: String(y) }))} /></Form.Item></Col>
          <Col xs={16}><Form.Item name="round" label="ครั้งที่" rules={[{ required: true, message: 'เลือกครั้งที่' }]}><Segmented block aria-label="ครั้งที่" options={[{ value: 1, label: 'ครั้งที่ 1 (ต.ค. – มี.ค.)' }, { value: 2, label: 'ครั้งที่ 2 (เม.ย. – ก.ย.)' }]} /></Form.Item></Col>
          <Col xs={24}><Form.Item name="meeting_date" label="วันที่ประชุมความเสี่ยงพร้อมบันทึก"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          <Col xs={12}><Form.Item name="recorder_id" label="ผู้บันทึก (บัญชีเจ้าหน้าที่ IT)" rules={[{ required: true, message: 'เลือกผู้บันทึก' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} loading={!staff} aria-label="ผู้บันทึก" placeholder="เลือกเจ้าหน้าที่ IT" options={staffOptions}
              optionRender={o => <div><div>{o.data.label}</div>{o.data.sub && <Text type="secondary" style={{ fontSize: 12 }}>{o.data.sub}</Text>}</div>} />
          </Form.Item></Col>
          <Col xs={12}><Form.Item name="recorder_role" label="ตำแหน่ง/บทบาท"><Input maxLength={150} placeholder="เช่น สมาชิกคณะกรรมการพิจารณาความเสี่ยง" /></Form.Item></Col>
          <Col xs={24}><Form.Item name="location" label="สถานที่"><Input maxLength={255} /></Form.Item></Col>
          <Col xs={24}><Form.Item name="address" label="ที่อยู่"><Input maxLength={500} /></Form.Item></Col>
          <Col xs={24}><Form.Item name="critical_service" label="ระบบบริการที่สำคัญ"><Input maxLength={255} placeholder="เช่น All application as HIS" /></Form.Item></Col>
          <Col xs={24}><Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} maxLength={2000} /></Form.Item></Col>
        </Row>
        {edit === 'new' && latest && <Form.Item name="copy" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Checkbox>ยกรายการที่ยัง Open จากทะเบียน{periodShort(latest.period)} ({latest.open_items} รายการ) มาทบทวนต่อ</Checkbox>
        </Form.Item>}
      </Form>
    </Modal>
  )
}

// ── รายการความเสี่ยง ──
const ItemModal = ({ edit, registerId, bia, owners, onClose, onSaved }: { edit: Item | 'new'; registerId: number; bia: { id: number; name: string }[]; owners: string[]; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const L = Form.useWatch('likelihood', form) as number | undefined, I = Form.useWatch('impact', form) as number | undefined
  const RL = Form.useWatch('residual_likelihood', form) as number | undefined, RI = Form.useWatch('residual_impact', form) as number | undefined
  const init = edit === 'new'
    ? { identified_date: dayjs(), category: 'operational', cia: [], impact_areas: [], likelihood: 3, impact: 3, treatment: 'mitigate', progress_pct: 0, residual_areas: [], status: 'open' }
    : { ...edit, identified_date: dayjs(edit.identified_date), due_date: edit.due_date ? dayjs(edit.due_date) : null }
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const body = { ...v, identified_date: (v.identified_date as Dayjs).format('YYYY-MM-DD'), due_date: v.due_date ? (v.due_date as Dayjs).format('YYYY-MM-DD') : null,
        residual_likelihood: v.residual_likelihood ?? null, residual_impact: v.residual_impact ?? null, bia_service_id: v.bia_service_id ?? null }
      if (edit === 'new') await api(`/api/v1/it/risk-register/${registerId}/items`, 'POST', body)
      else await api(`/api/v1/it/risk-register/items/${edit.id}`, 'PUT', body)
      message.success('บันทึกรายการความเสี่ยงแล้ว')
      onSaved()
    } catch (e) { const er = e as Error & { field?: string }; if (er.field) form.setFields([{ name: er.field, errors: [er.message] }]); message.error(er.message) } finally { setSaving(false) }
  }
  const scale = Array.from({ length: 5 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
  return (
    <Modal open title={edit === 'new' ? 'เพิ่มรายการความเสี่ยง' : 'แก้ไขรายการความเสี่ยง'} onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} width={880} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={init}>
        <Divider titlePlacement="start" style={{ marginTop: 0 }}>PART 1 : Risk Assessment, Record and 1st Evaluation</Divider>
        <Row gutter={12}>
          <Col xs={12} md={6}><Form.Item name="identified_date" label="วันที่ระบุความเสี่ยง" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          <Col xs={12} md={6}><Form.Item name="category" label="กลุ่มความเสี่ยง" rules={[{ required: true }]}><Select aria-label="กลุ่มความเสี่ยง" options={(Object.keys(CATEGORY_LABEL) as Category[]).map(c => ({ value: c, label: CATEGORY_LABEL[c] }))} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="bia_service_id" label="บริการในทะเบียน BIA (ไม่บังคับ)">
            <Select allowClear showSearch optionFilterProp="label" aria-label="บริการ BIA" options={bia.map(b => ({ value: b.id, label: b.name }))}
              onChange={(v: number | undefined) => { const b = bia.find(x => x.id === v); if (b && !form.getFieldValue('asset_group')) form.setFieldValue('asset_group', b.name) }} />
          </Form.Item></Col>
          <Col xs={24}><Form.Item name="asset_group" label="หมวดหมู่ทรัพย์สิน (Asset Group) / ระบบงาน (System)" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุ' }]}>
            <AutoComplete options={bia.map(b => ({ value: b.name }))} filterOption={(q, o) => String(o?.value ?? '').toLowerCase().includes(q.toLowerCase())}><Input maxLength={255} /></AutoComplete>
          </Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="threat" label="ภัยคุกคาม (Threat)" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุภัยคุกคาม' }]}><Input.TextArea rows={2} maxLength={1000} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="vulnerability" label="ช่องโหว่ (Vulnerability)"><Input.TextArea rows={2} maxLength={2000} /></Form.Item></Col>
          <Col xs={24}><Form.Item name="controls" label="มาตรการควบคุมในปัจจุบัน"><Input.TextArea rows={2} maxLength={2000} /></Form.Item></Col>
          <Col xs={24} md={9}><Form.Item name="cia" label="กระทบต่อ"><Checkbox.Group options={CIA.map(c => ({ value: c.key, label: <Tooltip title={c.label}>{c.key}</Tooltip> }))} /></Form.Item></Col>
          <Col xs={24} md={15}><Form.Item name="impact_areas" label="ความรุนแรงแต่ละด้าน"><Checkbox.Group options={AREAS.map(a => ({ value: a.key, label: <Tooltip title={a.label}>{a.key}</Tooltip> }))} /></Form.Item></Col>
          <Col xs={12} md={8}><Form.Item name="likelihood" label="โอกาสเกิด (Likelihood) A" rules={[{ required: true }]}><Segmented block options={scale} aria-label="โอกาสเกิด" /></Form.Item></Col>
          <Col xs={12} md={8}><Form.Item name="impact" label="ความรุนแรง (Impact) B" rules={[{ required: true }]}><Segmented block options={scale} aria-label="ความรุนแรง" /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="ระดับความเสี่ยง C = A × B"><div data-testid="rr-score">{L && I ? levelTag(L * I) : '-'}</div></Form.Item></Col>
          <Col xs={24}><Form.Item name="owner" label="เจ้าของความเสี่ยง (Risk Owner)"><AutoComplete options={owners.map(o => ({ value: o }))} filterOption={(q, o) => String(o?.value ?? '').includes(q)}><Input maxLength={255} /></AutoComplete></Form.Item></Col>
        </Row>
        <Divider titlePlacement="start">PART 2 : Risk Treatment Plan and Risk Residual</Divider>
        <Row gutter={12}>
          <Col xs={24} md={8}><Form.Item name="treatment" label="ตัวเลือกการตอบสนอง" rules={[{ required: true }]}><Select aria-label="ตัวเลือกการตอบสนอง" options={(Object.keys(TREATMENT_LABEL) as Treatment[]).map(t => ({ value: t, label: TREATMENT_LABEL[t] }))} /></Form.Item></Col>
          <Col xs={12} md={8}><Form.Item name="progress_pct" label="สถานะความคืบหน้า (%)"><InputNumber min={0} max={100} step={10} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={12} md={8}><Form.Item name="due_date" label="คาดว่าดำเนินการแล้วเสร็จ"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          <Col xs={24}><Form.Item name="treatment_plan" label="แผนจัดการความเสี่ยง (Risk Treatment Plan)"><Input.TextArea rows={2} maxLength={2000} /></Form.Item></Col>
          <Col xs={24} md={9}><Form.Item name="residual_areas" label="ความรุนแรงคงเหลือแต่ละด้าน"><Checkbox.Group options={AREAS.map(a => ({ value: a.key, label: <Tooltip title={a.label}>{a.key}</Tooltip> }))} /></Form.Item></Col>
          <Col xs={8} md={5}><Form.Item name="residual_likelihood" label="โอกาสเกิด"><Select allowClear aria-label="โอกาสเกิดคงเหลือ" options={scale} placeholder="-" /></Form.Item></Col>
          <Col xs={8} md={5}><Form.Item name="residual_impact" label="ความรุนแรง"><Select allowClear aria-label="ความรุนแรงคงเหลือ" options={scale} placeholder="-" /></Form.Item></Col>
          <Col xs={8} md={5}><Form.Item label="ระดับคงเหลือ"><div data-testid="rr-residual">{RL && RI ? levelTag(RL * RI) : '-'}</div></Form.Item></Col>
        </Row>
        <Divider titlePlacement="start">PART 3 : Follow Up</Divider>
        <Row gutter={12}>
          <Col xs={24} md={6}><Form.Item name="status" label="สถานะ"><Segmented block options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} aria-label="สถานะ" /></Form.Item></Col>
          <Col xs={24} md={18}><Form.Item name="follow_up" label="สถานะความคืบหน้า (การติดตาม)"><Input.TextArea rows={2} maxLength={2000} placeholder="เช่น เริ่มดำเนินการ คาดว่าจะแล้วเสร็จ 30 ก.ย." /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  )
}

// ── รายงาน Excel ตามแบบฟอร์ม ──
const ReportModal = ({ list, current, onClose }: { list: ListRow[]; current: Register; onClose: () => void }) => {
  const { message } = App.useApp()
  const [ids, setIds] = useState<number[]>([current.id])
  const [status, setStatus] = useState<ReportOptions['status']>('all')
  const [levels, setLevels] = useState<Level[]>(LEVELS.map(l => l.key))
  const [categories, setCategories] = useState<Category[]>([])
  const [parts, setParts] = useState<string[]>(['registers', 'summary', 'signature'])
  const [busy, setBusy] = useState(false)
  // เผื่อรายการรอบยังไม่รีเฟรช (เพิ่งสร้างรอบใหม่) — ให้มีรอบที่เปิดอยู่เสมอ
  const rows: ListRow[] = list.some(r => r.id === current.id) ? list
    : [{ ...current, items: current.items.length, open_items: current.items.filter(i => i.status === 'open').length, avg_score: null, avg_residual: null }, ...list]
  const sorted = [...rows].sort((a, b) => b.period.localeCompare(a.period))
  const fy = fyOf(current.period)
  const fyIds = sorted.filter(r => fyOf(r.period) === fy).map(r => r.id)
  const chosen = sorted.filter(r => ids.includes(r.id))
  const opts = { status, levels: levels.length === LEVELS.length ? [] : levels, categories }
  const preview = ids.length === 1 && ids[0] === current.id ? filterItems(current.items, opts).length : null
  const err = !ids.length ? 'เลือกอย่างน้อย 1 รอบ' : !levels.length ? 'เลือกระดับความเสี่ยงอย่างน้อย 1 ระดับ' : !parts.includes('registers') && !parts.includes('summary') ? 'เลือกแผ่นงานอย่างน้อย 1 แบบ' : null
  const run = async () => {
    if (err) { message.warning(err); return }
    setBusy(true)
    try {
      const regs: Register[] = await Promise.all(chosen.map(r => r.id === current.id ? current : api(`/api/v1/it/risk-register/${r.id}`)))
      const data = buildRiskReport(regs, { ...opts, registers: parts.includes('registers'), summary: parts.includes('summary'), signature: parts.includes('signature') })
      downloadXlsx(data, reportFilename(regs))
      message.success('สร้างรายงานแล้ว')
      onClose()
    } catch (e) { message.error((e as Error).message || 'สร้างรายงานไม่สำเร็จ') } finally { setBusy(false) }
  }
  return (
    <Modal open title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><FaFileExcel style={{ color: '#1d6f42', flexShrink: 0 }} />รายงานทะเบียนความเสี่ยง (Excel ตามแบบฟอร์ม)</span>} onCancel={onClose} onOk={run}
      okText="ดาวน์โหลด Excel" cancelText="ปิด" confirmLoading={busy} okButtonProps={{ disabled: !!err }} width={640} destroyOnHidden>
      <Form layout="vertical">
        <Form.Item label="รอบการประเมิน" extra={<Space size={4} wrap style={{ marginTop: 6 }}>
          <Button size="small" onClick={() => setIds([current.id])}>รอบที่เปิดอยู่</Button>
          <Button size="small" onClick={() => setIds(fyIds)}>ปีงบประมาณ {fy} ({fyIds.length} รอบ)</Button>
          <Button size="small" onClick={() => setIds(sorted.map(r => r.id))}>ทั้งหมด ({sorted.length})</Button>
        </Space>}>
          <Select mode="multiple" value={ids} onChange={setIds} aria-label="รอบในรายงาน" placeholder="เลือกรอบ" maxTagCount="responsive"
            options={sorted.map(r => ({ value: r.id, label: `${periodShort(r.period)} (${r.items} รายการ)` }))} />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} md={10}><Form.Item label="สถานะ"><Segmented block value={status} onChange={v => setStatus(v as typeof status)} options={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} /></Form.Item></Col>
          <Col xs={24} md={14}><Form.Item label="ระดับความเสี่ยง (ก่อนจัดการ)"><Checkbox.Group value={levels} onChange={v => setLevels(v as Level[])} options={LEVELS.map(l => ({ value: l.key, label: l.label }))} /></Form.Item></Col>
        </Row>
        <Form.Item label="กลุ่มความเสี่ยง"><Select mode="multiple" allowClear value={categories} onChange={setCategories} placeholder="ทุกกลุ่ม" aria-label="กลุ่มความเสี่ยงในรายงาน"
          options={(Object.keys(CATEGORY_LABEL) as Category[]).map(c => ({ value: c, label: CATEGORY_LABEL[c] }))} /></Form.Item>
        <Form.Item label="แผ่นงานในไฟล์" style={{ marginBottom: 8 }}>
          <Checkbox.Group value={parts} onChange={v => setParts(v as string[])} style={{ display: 'flex', flexDirection: 'column', gap: 6 }} options={[
            { value: 'registers', label: 'ทะเบียนความเสี่ยงตามแบบฟอร์ม (PART 1/2/3) — 1 แผ่นต่อรอบ' },
            { value: 'signature', label: 'ช่องลงนาม ผู้บันทึก / ผู้ทบทวน / ผู้อนุมัติ ท้ายทะเบียน', disabled: !parts.includes('registers') },
            { value: 'summary', label: 'สรุปผล (เทียบแต่ละรอบ, Risk Matrix, จำแนกตามการตอบสนอง/กลุ่ม) + รายการวิกฤติ-สูง' },
          ]} />
        </Form.Item>
        <Text type={err ? 'danger' : 'secondary'} style={{ fontSize: 12.5 }} data-testid="rr-report-preview">
          {err ?? `${chosen.length} รอบ${preview != null ? ` · ${preview} รายการตามตัวกรอง` : ` · ${chosen.reduce((n, r) => n + r.items, 0)} รายการก่อนกรอง`} · กระดาษ A3 แนวนอน พิมพ์พอดีความกว้าง หัวตารางซ้ำทุกหน้า`}
        </Text>
      </Form>
    </Modal>
  )
}

const PageContent = ({ isDark }: { isDark: boolean }) => {
  const { message } = App.useApp()
  const [list, setList] = useState<ListRow[] | null>(null)
  const [regId, setRegId] = useState<number | null>(null)
  const [reg, setReg] = useState<Register | null>(null)
  const [bia, setBia] = useState<{ id: number; name: string }[]>([])
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [regModal, setRegModal] = useState<Header | 'new' | null>(null)
  const [itemModal, setItemModal] = useState<Item | 'new' | null>(null)
  const [log, setLog] = useState<{ id: number; action: string; changed_at: string; changed_by_name: string | null; threat: string | null }[] | null>(null)
  const [matrixMode, setMatrixMode] = useState<'inherent' | 'residual'>('inherent')
  const [statusF, setStatusF] = useState<'all' | 'open' | 'closed'>('all')
  const [report, setReport] = useState(false)
  const P = PALETTES[isDark ? 'dark' : 'light']
  const LC = LEVEL_COLOR[isDark ? 'dark' : 'light']

  const loadList = useCallback(async (select?: number) => {
    try {
      const rows: ListRow[] = await api('/api/v1/it/risk-register')
      setList(rows)
      setRegId(cur => select ?? (cur && rows.some(r => r.id === cur) ? cur : rows[0]?.id ?? null))
    } catch (e) { if ((e as { status?: number }).status === 403) setDenied(true); else message.error((e as Error).message) }
  }, [message])
  const loadReg = useCallback(async (id: number) => {
    setLoading(true)
    try { setReg(await api(`/api/v1/it/risk-register/${id}`)) } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { loadList() }, [loadList])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดทะเบียนที่เลือก
  useEffect(() => { if (regId) loadReg(regId); else setReg(null) }, [regId, loadReg])
  useEffect(() => { fetch('/api/v1/it/bia').then(r => r.json()).then(j => { if (j.success) setBia(j.data.filter((s: { is_active: boolean }) => s.is_active).map((s: { id: number; name: string }) => ({ id: s.id, name: s.name }))) }).catch(() => {}) }, [])
  const reloadAll = () => { loadList(); if (regId) loadReg(regId) }

  const items = useMemo(() => reg?.items ?? [], [reg])
  const shown = items.filter(i => statusF === 'all' || i.status === statusF)
  const owners = useMemo(() => [...new Set(items.map(i => i.owner).filter(Boolean) as string[])], [items])
  const avgScore = avg(items.map(i => i.score))
  const avgResidual = avg(items.filter(i => i.residual_score != null).map(i => i.residual_score!))
  const today = dayjs().format('YYYY-MM-DD')
  const overdue = items.filter(i => isOverdue(i, today)).length

  const delItem = async (it: Item) => {
    try { await api(`/api/v1/it/risk-register/items/${it.id}`, 'DELETE'); message.success('ลบรายการแล้ว'); reloadAll() } catch (e) { message.error((e as Error).message) }
  }
  const openLog = async () => { setLog([]); try { setLog(await api(`/api/v1/it/risk-register/${regId}/log`)) } catch (e) { message.error((e as Error).message); setLog(null) } }

  // Risk matrix (ก่อนจัดการ / คงเหลือ)
  const counts = new Map<string, number>()
  for (const i of items) {
    const l = matrixMode === 'inherent' ? i.likelihood : i.residual_likelihood, m = matrixMode === 'inherent' ? i.impact : i.residual_impact
    if (l && m) counts.set(`${l}-${m}`, (counts.get(`${l}-${m}`) ?? 0) + 1)
  }
  const matrixOption = {
    backgroundColor: 'transparent',
    tooltip: { backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text }, formatter: (p: { value: number[] }) => `โอกาส ${p.value[1] + 1} × ความรุนแรง ${p.value[0] + 1} = ${p.value[3]}<br/>${LEVELS.find(l => l.key === levelOf(p.value[3]))!.label} · <b>${p.value[2]}</b> รายการ` },
    visualMap: { show: false, type: 'piecewise', dimension: 3, pieces: [{ min: 12.5, max: 25, color: LC.critical }, { min: 9.5, max: 12.4, color: LC.high }, { min: 3.5, max: 9.4, color: LC.medium }, { min: 0, max: 3.4, color: LC.low }] },
    grid: { left: 8, right: 8, top: 8, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: ['1', '2', '3', '4', '5'], name: 'ความรุนแรง (Impact) →', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: P.muted }, axisLabel: { color: P.text }, axisTick: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: ['1', '2', '3', '4', '5'], name: 'โอกาสเกิด →', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: P.muted }, axisLabel: { color: P.text }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{ type: 'heatmap', data: [1, 2, 3, 4, 5].flatMap(l => [1, 2, 3, 4, 5].map(m => { const c = counts.get(`${l}-${m}`) ?? 0; return { value: [m - 1, l - 1, c, l * m], itemStyle: { opacity: c ? 0.92 : 0.2, borderColor: P.surface, borderWidth: 2, borderRadius: 6 } } })),
      label: { show: true, color: '#fff', fontWeight: 700, fontSize: 13, formatter: (p: { value: number[] }) => p.value[2] ? String(p.value[2]) : '' } }],
  }

  const columns: ColumnsType<Item> = [
    { title: 'PART 1 : Risk Assessment, Record and 1st Evaluation', children: [
      { title: 'วันที่ระบุ', dataIndex: 'identified_date', width: 90, fixed: 'left', render: (v: string, i) => <>{thShort(v)}{i.copied_from && <div><Tooltip title="ยกมาจากทะเบียนรอบก่อน"><Tag style={{ fontSize: 10.5, margin: 0 }}>ยกมา</Tag></Tooltip></div>}</> },
      { title: 'กลุ่มความเสี่ยง', dataIndex: 'category', width: 110, render: (v: Category) => CATEGORY_LABEL[v] },
      { title: 'Asset Group / System', dataIndex: 'asset_group', width: 190, render: (v: string, i) => <>{v}{i.bia_service_name && i.bia_service_name !== v && <div><Text type="secondary" style={{ fontSize: 11.5 }}>BIA: {i.bia_service_name}</Text></div>}</> },
      { title: 'ภัยคุกคาม (Threat)', dataIndex: 'threat', width: 160 },
      { title: 'ช่องโหว่ (Vulner.)', dataIndex: 'vulnerability', width: 220, render: (v: string | null) => v ?? '-' },
      { title: 'มาตรการควบคุมในปัจจุบัน', dataIndex: 'controls', width: 220, render: (v: string | null) => v ? <span style={{ whiteSpace: 'pre-line' }}>{v}</span> : '-' },
      { title: 'กระทบต่อ', children: CIA.map(c => ({ title: <Tooltip title={c.label}>{c.key}</Tooltip>, key: `cia-${c.key}`, width: 34, align: 'center' as const, render: (_: unknown, i: Item) => mark(i.cia.includes(c.key)) })) },
      { title: 'ความรุนแรงแต่ละด้าน', children: AREAS.map(a => ({ title: <Tooltip title={a.label}>{a.key}</Tooltip>, key: `area-${a.key}`, width: 34, align: 'center' as const, render: (_: unknown, i: Item) => mark(i.impact_areas.includes(a.key)) })) },
      { title: 'A', dataIndex: 'likelihood', width: 40, align: 'center' },
      { title: 'B', dataIndex: 'impact', width: 40, align: 'center' },
      { title: 'ระดับ (C)', dataIndex: 'score', width: 110, sorter: (a, b) => a.score - b.score, render: (v: number) => levelTag(v) },
      { title: 'เจ้าของความเสี่ยง', dataIndex: 'owner', width: 170, render: (v: string | null) => v ?? '-' },
    ] },
    { title: 'PART 2 : Risk Treatment Plan and Risk Residual', children: [
      { title: 'การตอบสนอง', dataIndex: 'treatment', width: 130, render: (v: Treatment) => TREATMENT_LABEL[v] },
      { title: 'แผนจัดการความเสี่ยง', dataIndex: 'treatment_plan', width: 220, render: (v: string | null) => v ?? '-' },
      { title: 'ความคืบหน้า', dataIndex: 'progress_pct', width: 90, align: 'center', render: (v: number) => `${v}%` },
      { title: 'คาดว่าเสร็จ', dataIndex: 'due_date', width: 95, render: (v: string | null, i) => v ? <Text type={isOverdue(i, today) ? 'danger' : undefined}>{thShort(v)}</Text> : '-' },
      { title: 'ความเสี่ยงคงเหลือ (Risk Residual)', children: [
        ...AREAS.map(a => ({ title: <Tooltip title={a.label}>{a.key}</Tooltip>, key: `r-${a.key}`, width: 34, align: 'center' as const, render: (_: unknown, i: Item) => mark(i.residual_areas.includes(a.key)) })),
        { title: 'A', key: 'rl', width: 40, align: 'center' as const, render: (_: unknown, i: Item) => i.residual_likelihood ?? '-' },
        { title: 'B', key: 'ri', width: 40, align: 'center' as const, render: (_: unknown, i: Item) => i.residual_impact ?? '-' },
        { title: 'ระดับคงเหลือ', key: 'rs', width: 110, render: (_: unknown, i: Item) => levelTag(i.residual_score) },
      ] },
    ] },
    { title: 'PART 3 : Follow Up', children: [
      { title: 'สถานะ', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'open' ? 'processing' : 'default'} style={{ margin: 0 }}>{v === 'open' ? 'Open' : 'Closed'}</Tag> },
      { title: 'ความคืบหน้า (ติดตาม)', dataIndex: 'follow_up', width: 200, render: (v: string | null) => v ?? '-' },
    ] },
    { title: '', key: 'act', width: 92, fixed: 'right', align: 'center', render: (_: unknown, i) => <Space size={4}>
      <Button size="small" icon={<EditOutlined />} onClick={() => setItemModal(i)} aria-label={`แก้ไข ${i.threat}`} />
      <Popconfirm title="ลบรายการความเสี่ยงนี้?" description="ค่าเดิมเก็บไว้ในประวัติ" okText="ลบ" cancelText="ไม่ลบ" okButtonProps={{ danger: true }} onConfirm={() => delItem(i)}>
        <Button size="small" danger icon={<DeleteOutlined />} aria-label={`ลบ ${i.threat}`} />
      </Popconfirm></Space> },
  ]

  if (denied) return <Result status="403" title="ไม่มีสิทธิ์เข้าถึง" subTitle="ทะเบียนความเสี่ยงเปิดให้เฉพาะเจ้าหน้าที่งานคอมพิวเตอร์และผู้ดูแลระบบ" />
  const latest = list?.[0] ?? null
  const avgLevel = avgScore == null ? null : LEVELS.find(l => l.key === levelOf(avgScore))!

  return (
    <>
      <Card style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)', border: 'none', borderRadius: 16, marginBottom: 20 }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}><FaClipboardList className="text-2xl text-white" /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>ทะเบียนความเสี่ยง (Risk Register)</Title>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14 }}>ของบริการที่สำคัญของหน่วยงาน · บันทึกปีงบประมาณละ 2 ครั้งตามการประชุมคณะกรรมการพิจารณาความเสี่ยง</Text>
          </div>
          <Space wrap>
            <Select style={{ minWidth: 200 }} value={regId ?? undefined} onChange={setRegId} placeholder="เลือกรอบ" aria-label="เลือกทะเบียน"
              options={(list ?? []).map(r => ({ value: r.id, label: `${periodShort(r.period)} (${r.items} รายการ)` }))} />
            <Button icon={<PlusOutlined />} onClick={() => setRegModal('new')}>รอบใหม่</Button>
            <Button icon={<ReloadOutlined />} onClick={reloadAll} loading={loading} aria-label="โหลดใหม่" />
          </Space>
        </div>
      </Card>

      {!list ? <Card loading style={{ borderRadius: 16 }} /> : !reg ? (
        <Card style={{ borderRadius: 16 }}><Empty description="ยังไม่มีทะเบียนความเสี่ยง"><Button type="primary" icon={<PlusOutlined />} onClick={() => setRegModal('new')}>สร้างทะเบียนรอบแรก</Button></Empty></Card>
      ) : <>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={15}>
            <Card size="small" style={{ borderRadius: 16, height: '100%' }} title={<span>{periodLabel(reg.period)}</span>}
              extra={<Space size={4}><Button size="small" icon={<EditOutlined />} onClick={() => setRegModal(reg)}>แก้ไขหัวทะเบียน</Button><Button size="small" icon={<HistoryOutlined />} onClick={openLog}>ประวัติ</Button><Button size="small" icon={<FaFileExcel />} onClick={() => setReport(true)}>รายงาน Excel</Button></Space>}>
              <div className="rr-head" data-testid="rr-header">
                <div><Text type="secondary">ผู้บันทึก</Text><div>{[reg.recorder_name, reg.recorder_role].filter(Boolean).join(' , ') || '-'}</div></div>
                <div><Text type="secondary">วันที่ประชุมความเสี่ยงพร้อมบันทึก</Text><div>{thShort(reg.meeting_date)}</div></div>
                <div><Text type="secondary">สถานที่</Text><div>{reg.location ?? '-'}</div></div>
                <div><Text type="secondary">ที่อยู่</Text><div>{reg.address ?? '-'}</div></div>
                <div style={{ gridColumn: '1 / -1' }}><Text type="secondary">ระบบบริการที่สำคัญ</Text><div>{reg.critical_service ?? '-'}</div></div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div data-testid="rr-avg">
                  <Text type="secondary" style={{ fontSize: 12 }}>ผลการประเมินความเสี่ยง (เฉลี่ย) โดยรวมของทะเบียน</Text>
                  <div style={{ fontSize: 30, fontWeight: 800, color: avgLevel ? LC[avgLevel.key] : undefined, lineHeight: 1.2 }}>{avgScore ?? '-'} {avgLevel && <Tag color={avgLevel.tag} style={{ verticalAlign: 'middle' }}>{avgLevel.label}</Tag>}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>ความเสี่ยงคงเหลือเฉลี่ย {avgResidual ?? '-'}</Text>
                </div>
                <table className="rr-legend"><tbody>{LEVELS.map(l => <tr key={l.key}><td><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: LC[l.key] }} /></td><td style={{ whiteSpace: 'nowrap' }}><b>{l.range}</b></td><td>เป็นความเสี่ยง{l.key === 'critical' ? 'ขั้น' : ''}{l.label} {l.desc}</td></tr>)}</tbody></table>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <Card size="small" title="Risk Matrix" style={{ borderRadius: 16, height: '100%' }}
              extra={<Segmented size="small" value={matrixMode} onChange={v => setMatrixMode(v as typeof matrixMode)} options={[{ value: 'inherent', label: 'ก่อนจัดการ' }, { value: 'residual', label: 'คงเหลือ' }]} />}>
              <EChart theme={isDark ? 'dark' : 'light'} height={280} option={matrixOption} />
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} lg={6}><StatCard accent="teal" isDark={isDark} label="รายการความเสี่ยง" value={items.length} suffix="รายการ" icon={<FaClipboardList />} footer={<Text type="secondary" style={{ fontSize: 12 }}>Open {items.filter(i => i.status === 'open').length} · Closed {items.filter(i => i.status === 'closed').length}</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="rose" isDark={isDark} label="ระดับวิกฤติ / สูง (ก่อนจัดการ)" value={items.filter(i => i.score >= 9.5).length} suffix="รายการ" icon={<FaClipboardList />} footer={<Text type="secondary" style={{ fontSize: 12 }}>วิกฤติ {items.filter(i => i.score >= 12.5).length} · สูง {items.filter(i => i.score >= 9.5 && i.score < 12.5).length}</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="emerald" isDark={isDark} label="ความคืบหน้าเฉลี่ย" value={avg(items.map(i => i.progress_pct)) ?? 0} suffix="%" icon={<FaClipboardList />} footer={<Text type="secondary" style={{ fontSize: 12 }}>เสร็จ 100% แล้ว {items.filter(i => i.progress_pct === 100).length} รายการ</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="amber" isDark={isDark} label="เลยกำหนดเสร็จ (ยัง Open)" value={overdue} suffix="รายการ" icon={<FaClipboardList />} footer={<Text type="secondary" style={{ fontSize: 12 }}>กำหนดเสร็จผ่านมาแล้ว ความคืบหน้ายังไม่ 100%</Text>} /></Col>
        </Row>
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 12 } }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setItemModal('new')}>เพิ่มรายการความเสี่ยง</Button>
            <Segmented value={statusF} onChange={v => setStatusF(v as typeof statusF)} options={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>C/I/A = Confidentiality/Integrity/Availability · F S R I L O = Financial, Service, Reputation, Image, Law, Other</Text>
          </div>
          <Table size="small" bordered rowKey="id" loading={loading} dataSource={shown} columns={columns} scroll={{ x: 3300 }} pagination={false} data-testid="rr-table"
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีรายการความเสี่ยงในรอบนี้" /> }} />
        </Card>
      </>}

      {regModal && <RegisterModal edit={regModal} latest={latest} onClose={() => setRegModal(null)} onSaved={id => { setRegModal(null); loadList(id); loadReg(id) }} />}
      {itemModal && reg && <ItemModal key={itemModal === 'new' ? 'new' : itemModal.id} edit={itemModal} registerId={reg.id} bia={bia} owners={owners} onClose={() => setItemModal(null)} onSaved={() => { setItemModal(null); reloadAll() }} />}
      {report && reg && list && <ReportModal list={list} current={reg} onClose={() => setReport(false)} />}
      <Modal open={log !== null} title="ประวัติการแก้ไขทะเบียน" footer={null} onCancel={() => setLog(null)} width={560}>
        {log?.length ? <Timeline items={log.map(l => ({ content: <span style={{ fontSize: 12.5 }}>{({ create_register: 'สร้างทะเบียน', update_register: 'แก้หัวทะเบียน', create: 'เพิ่มรายการ', update: 'แก้รายการ', delete: 'ลบรายการ', copy: 'ยกรายการจากรอบก่อน' } as Record<string, string>)[l.action] ?? l.action}{l.threat ? `: ${l.threat}` : ''}<br /><Text type="secondary">{dayjs(l.changed_at).format('DD/MM/YYYY HH:mm')} · {l.changed_by_name ?? '-'}</Text></span> }))} /> : <Text type="secondary">ไม่มีประวัติ</Text>}
      </Modal>
      <style jsx global>{`
        .rr-head { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; font-size: 13.5px; }
        @media (max-width: 575px) { .rr-head { grid-template-columns: minmax(0, 1fr); } }
        .rr-legend { font-size: 12.5px; flex: 1; min-width: 260px; }
        .rr-legend td { padding: 2px 6px; vertical-align: top; }
      `}</style>
    </>
  )
}

export default function ItRiskRegisterPage() {
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
              { title: 'ทะเบียนความเสี่ยง' },
            ]} />
            <PageContent isDark={isDark} />
          </div>
        </div>
      </App>
    </ConfigProvider>
  )
}
