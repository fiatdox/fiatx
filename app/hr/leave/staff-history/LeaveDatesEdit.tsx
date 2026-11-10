'use client'
// HR แก้วันที่ลา — ผู้ลาขอยกเลิกบางวัน (ต้นใบ / ท้ายใบ / ครึ่งวันสุดท้าย) ของใบที่ยื่นหรืออนุมัติแล้ว
// เลือกได้เฉพาะวันในช่วงเดิม · จำนวนวันนับตามกฎของประเภทให้อัตโนมัติ (แก้เองได้ เช่น เจ้าหน้าที่เวร)
// บันทึก → POST /api/v1/hr/leave-day-check/:id/dates · backend คืนวันลาส่วนต่างทันที
import { useEffect, useState } from 'react'
import { Alert, App, Button, Checkbox, DatePicker, Input, InputNumber, Segmented, Space, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { beShort, nf } from '@/app/lib/leaveFormData'

const { Text } = Typography

export interface DatesEditRow {
  id: number
  start_date: string
  end_date: string
  total_days: string | number
  is_half_day: boolean
  half_day_period: string | null
  status: string
}

const ymd = (d: Dayjs) => d.format('YYYY-MM-DD')
const rangeText = (s: string, e: string, half: boolean, p: string | null) =>
  `${dayjs(s).isSame(e, 'day') ? beShort(s) : `${beShort(s)} – ${beShort(e)}`}${half ? (p === 'PM' ? ' (ครึ่งวันบ่าย)' : ' (ครึ่งวันเช้า)') : ''}`

export default function LeaveDatesEdit({ r, leaveTypeId, onCancel, onSaved }: {
  r: DatesEditRow; leaveTypeId: number | null; onCancel: () => void; onSaved: () => void
}) {
  const { message } = App.useApp()
  const orig: [Dayjs, Dayjs] = [dayjs(r.start_date).startOf('day'), dayjs(r.end_date).startOf('day')]
  const before = Number(r.total_days)
  const [range, setRange] = useState<[Dayjs, Dayjs]>(orig)
  const [half, setHalf] = useState(!!r.is_half_day)
  const [period, setPeriod] = useState<'AM' | 'PM'>(r.half_day_period === 'AM' ? 'AM' : 'PM')
  const [computed, setComputed] = useState<number | null>(null)
  const [days, setDays] = useState<number | null>(null)
  const [touchedDays, setTouchedDays] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const start = ymd(range[0]), end = ymd(range[1])
  const span = range[1].diff(range[0], 'day') + 1
  const max = half ? span - 0.5 : span

  // นับวันตามกฎของประเภท (วันทำการ/วันปฏิทิน + วันหยุดราชการ) ทุกครั้งที่ช่วงเปลี่ยน
  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ start_date: start, end_date: end, is_half_day: String(half) })
    if (leaveTypeId) qs.set('leave_type_id', String(leaveTypeId))
    fetch(`/api/v1/hr/leave-days/count?${qs}`).then(x => x.json()).then(j => {
      if (!alive) return
      const n = j?.success ? Number(j.data?.computed_days) : null
      setComputed(n)
      if (!touchedDays) setDays(n)
    }).catch(() => { if (alive) setComputed(null) })
    return () => { alive = false }
  }, [start, end, half, leaveTypeId, touchedDays])

  const finalDays = days ?? computed
  const refund = finalDays != null ? Math.round((before - finalDays) * 10) / 10 : null
  const unchanged = start === r.start_date.slice(0, 10) && end === r.end_date.slice(0, 10) && half === !!r.is_half_day
    && (!half || period === r.half_day_period) && finalDays === before
  const tooMany = finalDays != null && finalDays > before

  const save = async () => {
    if (unchanged) { message.info('วันที่และจำนวนวันเหมือนเดิม'); return }
    if (!finalDays || finalDays <= 0) { message.warning('กรุณาระบุจำนวนวัน'); return }
    if (tooMany) { message.warning('จำนวนวันใหม่มากกว่าเดิม — ถ้าจะลาเพิ่ม ให้ผู้ลายื่นใบใหม่'); return }
    if (!note.trim()) { message.warning('กรุณาระบุเหตุผลที่แก้วันที่ลา'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/hr/leave-day-check/${r.id}/dates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: start, end_date: end, is_half_day: half, half_day_period: half ? period : null, total_days: finalDays, note: note.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) { message.error(j?.message ?? 'บันทึกไม่สำเร็จ'); return }
      message.success(j.message ?? 'แก้วันที่ลาแล้ว')
      onSaved()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3" data-testid="leave-dates-edit">
      <Text type="secondary" style={{ fontSize: 12 }}>
        เดิม: <Text strong style={{ fontSize: 12 }}>{rangeText(r.start_date, r.end_date, !!r.is_half_day, r.half_day_period)}</Text> · {nf(before)} วัน
        — เลือกวันที่ยังลาอยู่ (เฉพาะในช่วงเดิม)
      </Text>
      <Space wrap size={8}>
        <DatePicker.RangePicker
          value={range} format="DD/MM/BBBB" allowClear={false} aria-label="ช่วงวันที่ลาใหม่"
          disabledDate={d => d.isBefore(orig[0], 'day') || d.isAfter(orig[1], 'day')}
          defaultPickerValue={orig}
          onChange={v => { if (v?.[0] && v?.[1]) setRange([v[0].startOf('day'), v[1].startOf('day')]) }}
        />
        <Checkbox checked={half} onChange={e => setHalf(e.target.checked)}>มีครึ่งวัน</Checkbox>
        {half && (
          <Segmented size="small" value={period} onChange={v => setPeriod(v as 'AM' | 'PM')}
            options={[{ value: 'AM', label: 'ครึ่งวันเช้า' }, { value: 'PM', label: 'ครึ่งวันบ่าย' }]} />
        )}
      </Space>
      <Space wrap size={8}>
        <Text>จำนวนวัน</Text>
        <InputNumber
          value={finalDays} min={0.5} max={Math.max(0.5, max)} step={0.5} style={{ width: 100 }} aria-label="จำนวนวันใหม่"
          onChange={v => { setTouchedDays(true); setDays(v == null ? null : Number(v)) }}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          นับตามกฎได้ {computed == null ? '…' : nf(computed)} วัน
          {touchedDays && computed != null && finalDays !== computed && (
            <Button type="link" size="small" style={{ padding: '0 4px', height: 'auto' }} onClick={() => { setTouchedDays(false); setDays(computed) }}>ใช้ค่าที่นับได้</Button>
          )}
        </Text>
      </Space>
      {!unchanged && finalDays != null && (
        tooMany
          ? <Alert type="error" showIcon title="จำนวนวันใหม่มากกว่าเดิม — แก้วันที่ใช้สำหรับยกเลิกบางวันเท่านั้น ถ้าจะลาเพิ่มให้ผู้ลายื่นใบใหม่" />
          : <Alert type="info" showIcon data-testid="leave-dates-preview"
              title={<span>ใหม่: <b>{rangeText(start, end, half, period)}</b> · {nf(finalDays)} วัน
                {refund != null && refund > 0 && <> · {String(r.status).toUpperCase() === 'PENDING' ? 'ลดวันที่ขอลา' : 'คืนวันลา'} <b>{nf(refund)} วัน</b></>}</span>} />
      )}
      <Input.TextArea
        value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500} showCount
        placeholder="เหตุผลที่แก้วันที่ลา (จำเป็น) เช่น ผู้ลาขอยกเลิกวันที่ 4–5 เพราะกลับมาปฏิบัติงาน"
      />
      <Space>
        <Button type="primary" loading={saving} disabled={unchanged || tooMany} onClick={save}>บันทึกวันที่ลาใหม่</Button>
        <Button disabled={saving} onClick={onCancel}>ยกเลิก</Button>
      </Space>
    </div>
  )
}
