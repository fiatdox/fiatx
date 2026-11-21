'use client'
// HRD เปลี่ยนแปลงคำขอหลังยื่น — เลื่อนวันเดินทาง (หลัง ผอ. อนุมัติ) · คิดสายอนุมัติใหม่ตามผังปัจจุบัน (เปลี่ยนตัวหัวหน้า) · แก้ผู้ร่วมเดินทาง
// backend: POST /requests/:id/reschedule · POST /requests/:id/chain (dry_run = ตัวอย่าง) — เก็บประวัติทุกครั้ง
import React, { useEffect, useState } from 'react'
import { Alert, App, Col, Input, Modal, Row, Select, Spin, TimePicker, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { DATE_FORMAT, ThaiDatePicker } from '@/app/general/contracts/contractShared'
import { TravelApiError } from './travelShared'
import { requestNo, thaiDateTime, type ChainStepLite, type TravelRequest } from './travelCalc'

const { Text } = Typography
const join = (d: Dayjs | null, t: Dayjs | null) => d && t ? d.hour(t.hour()).minute(t.minute()).second(0).millisecond(0) : null
const post = async (path: string, body: unknown) => {
  const res = await fetch(`/api/v1/hrd/travel/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.success === false) throw new TravelApiError(j.message ?? 'เกิดข้อผิดพลาด', res.status, j.field)
  return { data: j.data, message: j.message as string | undefined }
}

/** เลื่อนวันเดินทาง (คำขอที่ ผอ. อนุมัติแล้ว ยังไม่ส่งเบิก) */
export const RescheduleModal = ({ r, onClose, onSaved }: { r: TravelRequest; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const st = dayjs(r.start_at), en = dayjs(r.end_at)
  const [v, setV] = useState({ sd: st as Dayjs | null, stt: st as Dayjs | null, ed: en as Dayjs | null, et: en as Dayjs | null, note: '' })
  const [saving, setSaving] = useState(false)
  const s = join(v.sd, v.stt), e = join(v.ed, v.et)
  const bad = !s || !e || !e.isAfter(s)
  const submit = async () => {
    if (bad || !v.note.trim()) return
    setSaving(true)
    try { const x = await post(`requests/${r.id}/reschedule`, { start_at: s!.toISOString(), end_at: e!.toISOString(), note: v.note }); message.success(x.message ?? 'เลื่อนวันแล้ว'); onClose(); onSaved() }
    catch (err) { message.error((err as Error).message) } finally { setSaving(false) }
  }
  return (
    <Modal open title={`เลื่อนวันเดินทาง ${requestNo(r.id)}`} onCancel={onClose} onOk={submit} okText="บันทึกวันใหม่" cancelText="ยกเลิก" confirmLoading={saving}
      okButtonProps={{ disabled: bad || !v.note.trim() }} data-testid="reschedule-modal">
      <Text>{r.subject}</Text>
      <div style={{ fontSize: 13, color: 'var(--app-text-3)', margin: '4px 0 12px' }}>เดิม {thaiDateTime(r.start_at)} – {thaiDateTime(r.end_at)}</div>
      <Row gutter={[10, 8]}>
        <Col xs={14}><Text style={{ fontSize: 13 }}>ออกเดินทาง</Text><ThaiDatePicker format={DATE_FORMAT} allowClear={false} value={v.sd} onChange={x => setV({ ...v, sd: x })} style={{ width: '100%' }} aria-label="วันออกเดินทางใหม่" /></Col>
        <Col xs={10}><Text style={{ fontSize: 13 }}>เวลา</Text><TimePicker format="HH:mm" allowClear={false} needConfirm={false} value={v.stt} onChange={x => setV({ ...v, stt: x })} style={{ width: '100%' }} aria-label="เวลาออกเดินทางใหม่" /></Col>
        <Col xs={14}><Text style={{ fontSize: 13 }}>กลับถึง</Text><ThaiDatePicker format={DATE_FORMAT} allowClear={false} value={v.ed} onChange={x => setV({ ...v, ed: x })} style={{ width: '100%' }} aria-label="วันกลับถึงใหม่" /></Col>
        <Col xs={10}><Text style={{ fontSize: 13 }}>เวลา</Text><TimePicker format="HH:mm" allowClear={false} needConfirm={false} value={v.et} onChange={x => setV({ ...v, et: x })} style={{ width: '100%' }} aria-label="เวลากลับถึงใหม่" /></Col>
        <Col span={24}><Text style={{ fontSize: 13 }}>เหตุผล / หนังสืออ้างอิง (บังคับ)</Text>
          <Input.TextArea rows={2} maxLength={500} value={v.note} onChange={x => setV({ ...v, note: x.target.value })} placeholder="เช่น หนังสือแจ้งเลื่อนการประชุม ที่ … ลงวันที่ …" aria-label="เหตุผลการเลื่อน" /></Col>
      </Row>
      {bad && <Text type="danger" style={{ fontSize: 12 }}>วันเวลากลับต้องหลังวันเวลาออกเดินทาง</Text>}
      <Alert type="info" showIcon style={{ marginTop: 10 }} title="ประมาณการเดิมคงไว้ · ยอดจริงคิดตอนเบิก (เกินประมาณการต้องให้เหตุผล) · ส่งเบิกแล้วเลื่อนไม่ได้" />
    </Modal>
  )
}

const ChainList = ({ steps }: { steps: ChainStepLite[] }) => steps.length === 0
  ? <Text type="secondary">ไม่มีขั้นในระบบ — เสนอผู้อำนวยการโดยตรง</Text>
  : <ol style={{ margin: 0, paddingLeft: 20 }}>{steps.map(s => <li key={s.step}><b>{s.level_name}</b> {s.is_acting ? '(รักษาการ) ' : ''}{s.approver_name}{s.unit_name ? ` · ${s.unit_name}` : ''}</li>)}</ol>

/** คิดสายอนุมัติใหม่ตามผังปัจจุบัน — แสดงก่อน/หลังก่อนบันทึก */
export const ChainResyncModal = ({ r, onClose, onSaved }: { r: TravelRequest; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [preview, setPreview] = useState<{ changed: boolean; before: ChainStepLite[]; after: ChainStepLite[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let alive = true
    post(`requests/${r.id}/chain`, { dry_run: true }).then(x => { if (alive) setPreview(x.data) }).catch(e => { if (alive) setError((e as Error).message) })
    return () => { alive = false }
  }, [r.id])
  const submit = async () => {
    setSaving(true)
    try { const x = await post(`requests/${r.id}/chain`, { note: note.trim() || null }); message.success(x.message ?? 'บันทึกแล้ว'); onClose(); onSaved() }
    catch (e) { message.error((e as Error).message) } finally { setSaving(false) }
  }
  return (
    <Modal open title={`คิดสายอนุมัติใหม่ ${requestNo(r.id)}`} onCancel={onClose} onOk={submit} okText="ใช้สายใหม่" cancelText="ปิด" confirmLoading={saving}
      okButtonProps={{ disabled: !preview?.changed }} data-testid="chain-modal">
      <Text type="secondary" style={{ fontSize: 13 }}>ใช้เมื่อเปลี่ยนตัวหัวหน้า/รักษาการ — ขั้นที่หัวหน้ากดไปแล้วคงไว้ · ขั้นที่ยังไม่ถึงคิดใหม่จากผังปัจจุบัน · หัวหน้าที่ร่วมเดินทางถูกข้าม</Text>
      {error ? <Alert type="warning" showIcon style={{ marginTop: 12 }} title={error} />
        : !preview ? <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
        : <>
          <Row gutter={12} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12}><Text strong>สายปัจจุบัน</Text><div data-testid="chain-before"><ChainList steps={preview.before} /></div></Col>
            <Col xs={24} sm={12}><Text strong>ตามผังปัจจุบัน</Text><div data-testid="chain-after"><ChainList steps={preview.after} /></div></Col>
          </Row>
          {preview.changed
            ? <Input style={{ marginTop: 12 }} maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="หมายเหตุ (ไม่บังคับ) เช่น แต่งตั้งหัวหน้ากลุ่มงานคนใหม่" aria-label="หมายเหตุการเปลี่ยนสาย" />
            : <Alert type="success" showIcon style={{ marginTop: 12 }} title="สายอนุมัติตรงกับผังปัจจุบันแล้ว ไม่ต้องเปลี่ยน" />}
        </>}
    </Modal>
  )
}

interface PersonOpt { id: number; name: string; position: string | null; unit: string | null }
/** แก้ผู้ร่วมเดินทาง (หลังหัวหน้าเริ่มอนุมัติ) — เพิ่ม/ลบ/เปลี่ยนตัว ต้องมีเหตุผล */
export const TravelersModal = ({ r, onClose, onSaved }: { r: TravelRequest; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [orig, setOrig] = useState<number[] | null>(null)
  const [value, setValue] = useState<number[]>([])
  const [known, setKnown] = useState<Map<number, PersonOpt>>(new Map())
  const [opts, setOpts] = useState<PersonOpt[]>([])
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remember = (list: PersonOpt[]) => setKnown(prev => { const m = new Map(prev); list.forEach(p => m.set(p.id, p)); return m })
  useEffect(() => {
    let alive = true
    fetch(`/api/v1/hrd/travel/requests/${r.id}`).then(x => x.json()).then(j => {
      if (!alive) return
      if (!j?.success) { setError(j?.message ?? 'โหลดคำขอไม่สำเร็จ'); return }
      const comps = (j.data.travelers ?? []).filter((t: { is_requester: boolean }) => !t.is_requester) as { user_id: number; name: string; position: string | null }[]
      remember(comps.map(t => ({ id: t.user_id, name: t.name, position: t.position, unit: null })))
      setOrig(comps.map(t => t.user_id)); setValue(comps.map(t => t.user_id))
    }).catch(e => { if (alive) setError((e as Error).message) })
    return () => { alive = false }
  }, [r.id])
  // ค้นหาบุคลากร (หน่วงเวลาพิมพ์)
  useEffect(() => {
    if (q.trim().length < 2) return
    // พิมพ์ต่อ = ยกเลิกคำค้นเดิม — ผลของคำเก่าที่ตอบช้าไม่ทับผลของคำล่าสุด
    const ctl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/v1/hrd/travel/requests/people?search=${encodeURIComponent(q.trim())}`, { signal: ctl.signal }).then(x => x.json()).then(j => {
        if (ctl.signal.aborted) return
        const list = (j?.data ?? []) as PersonOpt[]
        setOpts(list.filter(p => p.id !== r.requester_id)); remember(list)
      }).catch(() => {})
    }, 300)
    return () => { clearTimeout(t); ctl.abort() }
  }, [q, r.requester_id])
  const added = orig ? value.filter(v => !orig.includes(v)) : []
  const removed = orig ? orig.filter(v => !value.includes(v)) : []
  const label = (id: number) => { const p = known.get(id); return p ? `${p.name}${p.position ? ` · ${p.position}` : ''}` : `#${id}` }
  const submit = async () => {
    setSaving(true)
    try { const x = await post(`requests/${r.id}/travelers`, { companion_ids: value, note }); message.success(x.message ?? 'บันทึกแล้ว'); onClose(); onSaved() }
    catch (e) { message.error((e as Error).message) } finally { setSaving(false) }
  }
  const options = [...new Map([...value.map(id => [id, { value: id, label: label(id) }] as const), ...opts.map(p => [p.id, { value: p.id, label: label(p.id) }] as const)]).values()]
  return (
    <Modal open title={`แก้ผู้ร่วมเดินทาง ${requestNo(r.id)}`} onCancel={onClose} onOk={submit} okText="บันทึกรายชื่อใหม่" cancelText="ยกเลิก" confirmLoading={saving} width={620}
      okButtonProps={{ disabled: !orig || (!added.length && !removed.length) || !note.trim() }} data-testid="travelers-modal">
      <Text>{r.subject}</Text>
      <div style={{ fontSize: 13, color: 'var(--app-text-3)', margin: '4px 0 10px' }}>ผู้ขอ: {r.requester_name} (เปลี่ยนไม่ได้)</div>
      {error ? <Alert type="warning" showIcon title={error} /> : !orig ? <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div> : <>
        <Text style={{ fontSize: 13 }}>ผู้ร่วมเดินทาง ({value.length} คน)</Text>
        <Select mode="multiple" style={{ width: '100%' }} value={value} onChange={setValue} showSearch filterOption={false} onSearch={setQ} options={options}
          placeholder="พิมพ์ชื่ออย่างน้อย 2 ตัวอักษรเพื่อเพิ่ม" notFoundContent={q.trim().length < 2 ? 'พิมพ์ชื่อเพื่อค้นหา' : 'ไม่พบ'} aria-label="ผู้ร่วมเดินทาง" />
        {(added.length > 0 || removed.length > 0) && (
          <div style={{ fontSize: 13, marginTop: 8 }} data-testid="travelers-diff">
            {added.length > 0 && <div style={{ color: '#047857' }}>เพิ่ม: {added.map(label).join(', ')}</div>}
            {removed.length > 0 && <div style={{ color: '#b91c1c' }}>ลบ: {removed.map(label).join(', ')}</div>}
          </div>
        )}
        <Text style={{ display: 'block', fontSize: 13, marginTop: 12 }}>เหตุผล / หนังสืออ้างอิง (บังคับ)</Text>
        <Input.TextArea rows={2} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น หนังสือแจ้งเปลี่ยนตัวผู้เข้าประชุม ที่ … ลงวันที่ …" aria-label="เหตุผลการแก้ผู้ร่วมเดินทาง" />
        <Alert type="info" showIcon style={{ marginTop: 10 }} title="คนเดิมคงอัตรา ณ วันยื่น · คนใหม่ใช้อัตราปัจจุบัน · ประมาณการเดิมคงไว้ ยอดจริงคิดตอนเบิก · ส่งเบิกแล้วแก้ไม่ได้ (ใช้ “ไม่ได้เดินทาง” ตอนเบิกแทน)" />
      </>}
    </Modal>
  )
}
