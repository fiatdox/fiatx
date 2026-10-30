'use client'
// ปฏิทินการลา (หน้า /hr/leave) — ขอบเขตที่เลือกดูได้มาจาก backend ตามตำแหน่งในผัง:
// ผอ. / ADMIN / HR = ทั้งโรงพยาบาล · หัวหน้า/รักษาการ = หน่วยที่ดูแล · ทุกคน = เพื่อนร่วมกลุ่มงาน (ไม่เห็นประเภทการลา) + ของฉัน
import React, { useEffect, useMemo, useState } from 'react'
import { Card, Select, Button, Tag, Typography, Empty, Spin, Grid, Tooltip } from 'antd'
import { CalendarOutlined, LeftOutlined, RightOutlined, CheckCircleFilled, ClockCircleFilled, StopFilled } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import 'dayjs/locale/th'

dayjs.extend(buddhistEra)

const { Text } = Typography

interface ScopeOption { key: string; label: string; group: string }
interface LeaveEvent {
  id: number
  user_id: number
  employee_name: string
  position_name: string | null
  unit_name: string | null
  leave_type_code: string | null
  leave_type_name: string | null
  start_date: string
  end_date: string
  total_days: number | string
  is_half_day: boolean
  half_day_period: string | null
  status: 'PENDING' | 'APPROVED' | 'CANCEL_PENDING'
  is_mine: boolean
  reason: string | null      // backend ส่งให้เจ้าของใบ, ADMIN/HR และผู้อนุมัติในสาย (เพื่อนร่วมกลุ่มงานไม่เห็น)
  // รออนุมัติ / รออนุมัติยกเลิก: ผู้อนุมัติลำดับที่ใบกำลังรอ — ลำดับก่อนหน้ากดแล้วจะเลื่อนไปลำดับถัดไป
  waiting_for: { step: number; total: number; level_name: string; approver_name: string; is_acting: boolean } | null
}
interface CalendarData { scope: string; options: ScopeOption[]; masked: boolean; events: LeaveEvent[] }

// สีตามประเภทการลา — ประเภทที่ถูกซ่อน (เพื่อนร่วมกลุ่มงาน) เป็นสีเทา
const TYPE_COLOR: Record<string, string> = {
  SICK: '#ef4444', PERS: '#f59e0b', ANNUAL: '#10b981', MAT: '#ec4899', PAT: '#3b82f6', ORDAIN: '#a16207',
  MIL: '#64748b', STUDY: '#8b5cf6', INTL: '#06b6d4', FOLLOW: '#14b8a6', REHAB: '#84cc16',
}
const MASKED_COLOR = '#64748b'
const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
// รออนุมัติ = ลายทางทับสีประเภท (เห็นชัดกว่าสีจาง และยังอ่านสีประเภทได้)
const PENDING_STRIPES = 'repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0 6px, transparent 6px 12px)'
const HOLIDAY_BG = 'rgba(239,68,68,0.10)'
const colorOf = (e: LeaveEvent) => (e.leave_type_code && TYPE_COLOR[e.leave_type_code]) || MASKED_COLOR
const STATUS_LABEL: Record<LeaveEvent['status'], string> = {
  PENDING: 'รออนุมัติ', APPROVED: 'อนุมัติครบทุกลำดับ', CANCEL_PENDING: 'รออนุมัติยกเลิก',
}
// ไอคอนสถานะหน้าแถบ — อ่านสถานะได้โดยไม่ต้องพึ่งสี/ลายทางอย่างเดียว
const STATUS_ICON: Record<LeaveEvent['status'], React.ComponentType<{ style?: React.CSSProperties }>> = {
  APPROVED: CheckCircleFilled, PENDING: ClockCircleFilled, CANCEL_PENDING: StopFilled,
}
const STATUS_COLOR: Record<LeaveEvent['status'], string> = {
  APPROVED: '#10b981', PENDING: '#f59e0b', CANCEL_PENDING: '#ef4444',
}
const StatusIcon = ({ status, color, size = 12 }: { status: LeaveEvent['status']; color?: string; size?: number }) => {
  const Icon = STATUS_ICON[status]
  return <Icon style={{ fontSize: size, color: color ?? STATUS_COLOR[status], flexShrink: 0 }} aria-label={STATUS_LABEL[status]} />
}

const th = (d: Dayjs) => d.locale('th')

/** "รออนุมัติ ลำดับ 2/3: หัวหน้ากลุ่มงาน — ชื่อ (รักษาการ)" */
const waitingText = (e: LeaveEvent) => e.waiting_for && (
  `${STATUS_LABEL[e.status]} ลำดับ ${e.waiting_for.step}/${e.waiting_for.total}: ${e.waiting_for.level_name}`
  + ` — ${e.waiting_for.approver_name}${e.waiting_for.is_acting ? ' (รักษาการ)' : ''}`
)
const fmtDay = (iso: string) => th(dayjs(iso)).format('D MMM BB')
const fmtFull = (iso: string) => th(dayjs(iso)).format('D MMM BBBB')
/** ข้อความบนแถบ — "ชื่อ วันที่ 19 ต.ค. 2569 – 21 ต.ค. 2569" */
const barText = (e: LeaveEvent) =>
  `${e.employee_name} วันที่ ${fmtFull(e.start_date)}${e.end_date !== e.start_date ? ` – ${fmtFull(e.end_date)}` : ''}`

interface Segment { e: LeaveEvent; s: number; en: number; lane: number; contL: boolean; contR: boolean }

const eventTitle = (e: LeaveEvent) => [
  e.employee_name,
  e.leave_type_name ?? 'ลา',
  `${fmtDay(e.start_date)}${e.end_date !== e.start_date ? ` – ${fmtDay(e.end_date)}` : ''}`,
  e.is_half_day ? `ครึ่งวัน${e.half_day_period === 'AM' ? 'เช้า' : e.half_day_period === 'PM' ? 'บ่าย' : ''}` : `${Number(e.total_days)} วัน`,
  waitingText(e) || STATUS_LABEL[e.status],
  e.reason ? `เหตุผล: ${e.reason}` : '',
].filter(Boolean).join(' · ')

export default function LeaveCalendarCard() {
  const screens = Grid.useBreakpoint()
  const narrow = !screens.md
  // ตั้งเดือนหลัง mount — กัน hydration mismatch ข้ามวัน/เขตเวลา
  const [month, setMonth] = useState<Dayjs | null>(null)
  useEffect(() => { void Promise.resolve().then(() => setMonth(dayjs().startOf('month'))) }, [])
  const [scope, setScope] = useState<string | null>(null)
  const [data, setData] = useState<CalendarData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  // ดึงทั้งตารางเดือน (มีวันของเดือนก่อน/ถัดไปติดมาในแถวแรก/แถวสุดท้าย)
  const range = useMemo(() => month && {
    from: month.subtract(7, 'day').format('YYYY-MM-DD'),
    to: month.endOf('month').add(7, 'day').format('YYYY-MM-DD'),
  }, [month])
  const requestKey = range ? `${range.from}|${range.to}|${scope ?? ''}` : null
  const loading = requestKey !== loadedKey

  useEffect(() => {
    if (!range || !requestKey) return
    let alive = true
    const qs = new URLSearchParams({ from: range.from, to: range.to, ...(scope ? { scope } : {}) })
    fetch(`/api/v1/hr/leave-calendar?${qs}`)
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        if (!j?.success) { setError(j?.message || 'โหลดปฏิทินการลาไม่สำเร็จ'); return }
        setError(null)
        setData(j.data)
      })
      .catch(() => alive && setError('โหลดปฏิทินการลาไม่สำเร็จ'))
      .finally(() => alive && setLoadedKey(requestKey))
    return () => { alive = false }
  }, [range, scope, requestKey])

  // วันหยุดราชการ (งาน HR จัดการที่ /hr/leave/day-check) — โหลดแยก ไม่บล็อกปฏิทิน
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    if (!range) return
    let alive = true
    fetch(`/api/v1/hr/holidays?${new URLSearchParams({ from: range.from, to: range.to })}`)
      .then(r => r.json())
      .then(j => {
        if (!alive || !j?.success) return
        setHolidays(new Map((j.data as { holiday_date: string; name_th: string }[]).map(h => [h.holiday_date, h.name_th])))
      })
      .catch(() => { /* ไม่มีวันหยุดก็แสดงปฏิทินตามปกติ */ })
    return () => { alive = false }
  }, [range])

  const events = useMemo(() => data?.events ?? [], [data])
  const currentScope = scope ?? data?.scope ?? null

  // ตารางเดือนแบบสัปดาห์ละแถว — ใบลาเป็นแถบลากยาวข้ามวันในสัปดาห์ (grid-column span) ข้ามสัปดาห์ตัดเป็นแถบใหม่
  // จัดเลนต่อสัปดาห์: ใบของฉันขึ้นก่อน แล้วเรียงตามวันเริ่ม
  const weeks = useMemo(() => {
    if (!month) return []
    const first = month.startOf('month')
    const last = month.endOf('month')
    const gridEnd = last.add(6 - last.day(), 'day')
    const out: { days: Dayjs[]; segs: Segment[] }[] = []
    for (let w = first.subtract(first.day(), 'day'); !w.isAfter(gridEnd, 'day'); w = w.add(7, 'day')) {
      const days = Array.from({ length: 7 }, (_, i) => w.add(i, 'day'))
      const ws = days[0].format('YYYY-MM-DD')
      const we = days[6].format('YYYY-MM-DD')
      const laneEnd: number[] = []
      const segs = events
        .filter(e => e.end_date >= ws && e.start_date <= we)
        .sort((a, b) => Number(b.is_mine) - Number(a.is_mine) || a.start_date.localeCompare(b.start_date) || b.end_date.localeCompare(a.end_date))
        .map(e => {
          const s = e.start_date < ws ? 0 : dayjs(e.start_date).diff(w, 'day')
          const en = e.end_date > we ? 6 : dayjs(e.end_date).diff(w, 'day')
          let lane = laneEnd.findIndex(x => x < s)
          if (lane === -1) { lane = laneEnd.length; laneEnd.push(en) } else laneEnd[lane] = en
          return { e, s, en, lane, contL: e.start_date < ws, contR: e.end_date > we }
        })
      out.push({ days, segs })
    }
    return out
  }, [month, events])

  const todayStr = month ? dayjs().format('YYYY-MM-DD') : ''
  const cellBorder = '1px solid var(--app-border-strong)'

  const monthGrid = month && (
    <div style={{ border: cellBorder, borderRadius: 8, overflow: 'hidden' }}>
      <div className="grid grid-cols-7" style={{ background: 'var(--app-bg)' }}>
        {WEEKDAYS.map((d, i) => (
          <div key={d} style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600, textAlign: 'center', borderLeft: i ? cellBorder : 'none', color: i === 0 ? '#ef4444' : 'var(--app-text-2)' }}>{d}</div>
        ))}
      </div>
      {weeks.map(week => (
        <div key={week.days[0].format('YYYY-MM-DD')} style={{ position: 'relative', borderTop: cellBorder, minHeight: 112 }}>
          {/* พื้นหลังช่องวัน — เสาร์อาทิตย์สีเข้มกว่า · วันหยุดราชการสีแดงอ่อน */}
          <div className="grid grid-cols-7" style={{ position: 'absolute', inset: 0 }}>
            {week.days.map((d, i) => (
              <div key={i} style={{
                borderLeft: i ? cellBorder : 'none',
                background: holidays.has(d.format('YYYY-MM-DD')) ? HOLIDAY_BG : d.day() === 0 || d.day() === 6 ? 'var(--app-bg)' : 'transparent',
              }} />
            ))}
          </div>
          <div className="grid grid-cols-7" style={{ position: 'relative' }}>
            {week.days.map((d, i) => {
              const isToday = d.format('YYYY-MM-DD') === todayStr
              const inMonth = d.month() === month.month()
              const holiday = holidays.get(d.format('YYYY-MM-DD'))
              return (
                <div key={i} className="flex items-start justify-end gap-1" style={{ padding: '4px 8px', fontSize: 13, minWidth: 0 }}>
                  {holiday && (
                    <Tooltip title={holiday}>
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: 11, lineHeight: '24px', color: '#ef4444', fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: inMonth ? 1 : 0.6,
                      }}>{holiday}</span>
                    </Tooltip>
                  )}
                  <span style={{
                    display: 'inline-block', minWidth: 24, height: 24, lineHeight: '24px', textAlign: 'center', borderRadius: 12, flexShrink: 0,
                    background: isToday ? '#10b981' : 'transparent',
                    color: isToday ? '#fff' : !inMonth ? 'var(--app-text-3)' : d.day() === 0 || holiday ? '#ef4444' : 'var(--app-text)',
                    fontWeight: isToday || holiday ? 700 : 400,
                  }}>{d.date()}</span>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-7" style={{ position: 'relative', rowGap: 3, paddingBottom: 6 }}>
            {week.segs.map(({ e, s, en, lane, contL, contR }) => (
              <Tooltip key={e.id} title={eventTitle(e)}>
                <div style={{
                  gridColumn: `${s + 1} / ${en + 2}`, gridRow: lane + 1,
                  margin: `0 ${contR ? 0 : 4}px 0 ${contL ? 0 : 4}px`,
                  backgroundColor: colorOf(e),
                  backgroundImage: e.status === 'APPROVED' ? undefined : PENDING_STRIPES,
                  color: '#fff', fontSize: 12, lineHeight: 1.45, padding: '2px 6px', minWidth: 0,
                  borderRadius: `${contL ? 0 : 4}px ${contR ? 0 : 4}px ${contR ? 0 : 4}px ${contL ? 0 : 4}px`,
                  boxShadow: e.is_mine ? 'inset 0 0 0 2px rgba(255,255,255,0.85)' : undefined,
                }}>
                  <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
                    <StatusIcon status={e.status} color="#fff" size={13} />
                    {e.is_mine && (
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 2px rgba(255,255,255,0.35)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontWeight: e.is_mine ? 700 : 500 }}>{barText(e)}</span>
                  </div>
                  {(e.is_mine || e.reason) && (
                    <div style={{ opacity: 0.95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.leave_type_name ?? 'ลา'}{e.reason ? ` · เหตุผล: ${e.reason}` : ''}
                    </div>
                  )}
                  {e.waiting_for && (
                    <div style={{ fontSize: 11, opacity: 0.95 }}>
                      {STATUS_LABEL[e.status]} ลำดับ {e.waiting_for.step}/{e.waiting_for.total} · {e.waiting_for.approver_name}{e.waiting_for.is_acting ? ' (รักษาการ)' : ''}
                    </div>
                  )}
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  // ประเภทที่มีในเดือนนี้ — ใช้ทำคำอธิบายสี
  const legend = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of events) seen.set(e.leave_type_name ?? 'ลา', colorOf(e))
    return [...seen.entries()]
  }, [events])

  const monthEvents = useMemo(() => {
    if (!month) return []
    const a = month.format('YYYY-MM-DD')
    const b = month.endOf('month').format('YYYY-MM-DD')
    return events.filter(e => e.end_date >= a && e.start_date <= b)
  }, [events, month])

  // ตัวเลือกจัดกลุ่มตามบทบาท (ผอ. / หัวหน้า / รักษาการ / เจ้าหน้าที่)
  const selectOptions = useMemo(() => {
    const groups = new Map<string, { value: string; label: string }[]>()
    for (const o of data?.options ?? []) groups.set(o.group, [...(groups.get(o.group) ?? []), { value: o.key, label: o.label }])
    return [...groups.entries()].map(([label, options]) => ({ label, options }))
  }, [data])

  const header = month && (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-1">
        <Button size="small" icon={<LeftOutlined />} onClick={() => setMonth(month.subtract(1, 'month'))} aria-label="เดือนก่อน" />
        <Text strong style={{ minWidth: 130, textAlign: 'center', fontSize: 15 }}>{th(month).format('MMMM BBBB')}</Text>
        <Button size="small" icon={<RightOutlined />} onClick={() => setMonth(month.add(1, 'month'))} aria-label="เดือนถัดไป" />
        <Button size="small" type="link" onClick={() => setMonth(dayjs().startOf('month'))}>เดือนนี้</Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {legend.map(([label, color]) => (
          <span key={label} className="flex items-center gap-1" style={{ fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
            <Text style={{ fontSize: 12 }}>{label}</Text>
          </span>
        ))}
        {events.some(e => e.is_mine) && (
          <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px #10b98140', display: 'inline-block' }} />
            <Text style={{ fontSize: 12 }}>การลาของฉัน (มีกรอบขาว)</Text>
          </span>
        )}
        {(['APPROVED', 'PENDING', 'CANCEL_PENDING'] as const).filter(st => events.some(e => e.status === st)).map(st => (
          <span key={st} className="flex items-center gap-1" style={{ fontSize: 12 }}>
            <StatusIcon status={st} />
            <Text style={{ fontSize: 12 }}>{STATUS_LABEL[st]}</Text>
          </span>
        ))}
        {events.some(e => e.status !== 'APPROVED') && (
          <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
            <span style={{ width: 14, height: 10, borderRadius: 2, backgroundColor: MASKED_COLOR, backgroundImage: PENDING_STRIPES, display: 'inline-block' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>ลายทาง = รออนุมัติ</Text>
          </span>
        )}
        {holidays.size > 0 && (
          <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
            <span style={{ width: 14, height: 10, borderRadius: 2, backgroundColor: HOLIDAY_BG, border: '1px solid #ef4444', display: 'inline-block' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>วันหยุดราชการ</Text>
          </span>
        )}
      </div>
    </div>
  )

  return (
    <Card
      style={{ borderRadius: 12, border: 'none', marginBottom: 24 }}
      title={<span className="flex items-center gap-2"><CalendarOutlined style={{ color: '#10b981' }} /> ปฏิทินการลา</span>}
      extra={selectOptions.length > 0 && (
        <Select
          value={currentScope ?? undefined}
          onChange={v => setScope(v)}
          options={selectOptions}
          style={{ width: narrow ? 180 : 280 }}
          popupMatchSelectWidth={false}
          aria-label="เลือกขอบเขตการมองเห็น"
        />
      )}
    >
      {error ? <Empty description={error} /> : (
        <Spin spinning={loading || !month}>
          {header}
          {data?.masked && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
              ปฏิทินเพื่อนร่วมกลุ่มงานแสดงเฉพาะว่าใครลาวันไหน ไม่แสดงประเภทการลาของผู้อื่น
            </Text>
          )}
          {month && (narrow ? (
            monthEvents.length === 0 ? <Empty description="ไม่มีการลาในเดือนนี้" /> : (
              <div className="flex flex-col">
                {monthEvents.map((e, i) => (
                  <div key={e.id} className="flex items-start gap-2" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--app-border-strong)' : 'none' }}>
                    {e.is_mine
                      ? <span style={{ width: 10, height: 10, marginTop: 6, borderRadius: '50%', background: colorOf(e), boxShadow: `0 0 0 2px ${colorOf(e)}40`, flexShrink: 0 }} />
                      : <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: colorOf(e), opacity: e.status === 'APPROVED' ? 1 : 0.55, flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <span className="flex items-center gap-1.5">
                        <StatusIcon status={e.status} />
                        <Text strong>{e.employee_name}</Text>
                      </span>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {e.leave_type_name ?? 'ลา'} · {fmtDay(e.start_date)}{e.end_date !== e.start_date ? ` – ${fmtDay(e.end_date)}` : ''}
                        </Text>
                        <Tag color={e.status === 'APPROVED' ? 'success' : e.status === 'PENDING' ? 'warning' : 'error'} style={{ marginInlineStart: 6, fontSize: 11 }}>
                          {STATUS_LABEL[e.status]}
                        </Tag>
                      </div>
                      {e.reason && <div><Text style={{ fontSize: 12 }}>เหตุผล: {e.reason}</Text></div>}
                      {e.waiting_for && <div><Text style={{ fontSize: 12, color: '#d97706' }}>{waitingText(e)}</Text></div>}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            monthGrid
          ))}
        </Spin>
      )}
    </Card>
  )
}
