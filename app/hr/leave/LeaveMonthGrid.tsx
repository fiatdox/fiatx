'use client'
// ตารางเดือนของการลา — ใช้ร่วมกันระหว่างปฏิทินการลา (/hr/leave/calendar) และหน้าอนุมัติการลา (/hr/leave/approval)
// สัปดาห์ละแถว ใบลาเป็นแถบลากยาวข้ามวันในสัปดาห์ (grid-column span) ข้ามสัปดาห์ตัดเป็นแถบใหม่
import React, { useEffect, useMemo, useState } from 'react'
import { Button, Tooltip, Typography } from 'antd'
import { CalendarOutlined, CheckCircleFilled, ClockCircleFilled, StopFilled } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import 'dayjs/locale/th'

dayjs.extend(buddhistEra)

const { Text } = Typography

export interface LeaveEvent {
  id: number | string
  employee_name: string
  leave_type_code: string | null
  leave_type_name: string | null
  start_date: string
  end_date: string
  total_days: number | string
  is_half_day: boolean
  half_day_period: string | null
  status: 'PENDING' | 'APPROVED' | 'CANCEL_PENDING'
  is_mine: boolean
  reason: string | null
  // รออนุมัติ / รออนุมัติยกเลิก: ผู้อนุมัติลำดับที่ใบกำลังรอ
  waiting_for: { step: number; total: number; level_name: string; approver_name: string; is_acting: boolean } | null
  /** เน้นแถบด้วยกรอบขาว (ไม่ใช่ใบของฉัน) — เช่น หน้าอนุมัติ: ใบที่รอท่านพิจารณา */
  marked?: boolean
}

// สีตามประเภทการลา — ประเภทที่ถูกซ่อน (เพื่อนร่วมกลุ่มงาน) เป็นสีเทา
export const TYPE_COLOR: Record<string, string> = {
  SICK: '#ef4444', PERS: '#f59e0b', ANNUAL: '#10b981', MAT: '#ec4899', PAT: '#3b82f6', ORDAIN: '#a16207',
  MIL: '#64748b', STUDY: '#8b5cf6', INTL: '#06b6d4', FOLLOW: '#14b8a6', REHAB: '#84cc16',
}
export const MASKED_COLOR = '#64748b'
const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
// รออนุมัติ = ลายทางทับสีประเภท (เห็นชัดกว่าสีจาง และยังอ่านสีประเภทได้)
export const PENDING_STRIPES = 'repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0 6px, transparent 6px 12px)'
export const HOLIDAY_BG = 'rgba(239,68,68,0.10)'
export const colorOf = (e: LeaveEvent) => (e.leave_type_code && TYPE_COLOR[e.leave_type_code]) || MASKED_COLOR
export const STATUS_LABEL: Record<LeaveEvent['status'], string> = {
  PENDING: 'รออนุมัติ', APPROVED: 'อนุมัติครบทุกลำดับ', CANCEL_PENDING: 'รออนุมัติยกเลิก',
}
// ไอคอนสถานะหน้าแถบ — อ่านสถานะได้โดยไม่ต้องพึ่งสี/ลายทางอย่างเดียว
const STATUS_ICON: Record<LeaveEvent['status'], React.ComponentType<{ style?: React.CSSProperties }>> = {
  APPROVED: CheckCircleFilled, PENDING: ClockCircleFilled, CANCEL_PENDING: StopFilled,
}
const STATUS_COLOR: Record<LeaveEvent['status'], string> = {
  APPROVED: '#10b981', PENDING: '#f59e0b', CANCEL_PENDING: '#ef4444',
}
export const StatusIcon = ({ status, color, size = 12 }: { status: LeaveEvent['status']; color?: string; size?: number }) => {
  const Icon = STATUS_ICON[status]
  return <Icon style={{ fontSize: size, color: color ?? STATUS_COLOR[status], flexShrink: 0 }} aria-label={STATUS_LABEL[status]} />
}

export const th = (d: Dayjs) => d.locale('th')

/** "รออนุมัติ ลำดับ 2/3: หัวหน้ากลุ่มงาน — ชื่อ (รักษาการ)" */
export const waitingText = (e: LeaveEvent) => e.waiting_for && (
  `${STATUS_LABEL[e.status]} ลำดับ ${e.waiting_for.step}/${e.waiting_for.total}: ${e.waiting_for.level_name}`
  + ` — ${e.waiting_for.approver_name}${e.waiting_for.is_acting ? ' (รักษาการ)' : ''}`
)
export const fmtDay = (iso: string) => th(dayjs(iso)).format('D MMM BB')
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

/** ช่วงวันที่ของตารางเดือน (มีวันของเดือนก่อน/ถัดไปติดมาในแถวแรก/แถวสุดท้าย) */
export const monthRange = (month: Dayjs) => ({
  from: month.subtract(7, 'day').format('YYYY-MM-DD'),
  to: month.endOf('month').add(7, 'day').format('YYYY-MM-DD'),
})

/** วันหยุดราชการในช่วง (งาน HR จัดการที่ /hr/leave/day-check) — โหลดแยก ไม่บล็อกปฏิทิน */
export const useHolidays = (range: { from: string; to: string } | null) => {
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map())
  const from = range?.from, to = range?.to
  useEffect(() => {
    if (!from || !to) return
    let alive = true
    fetch(`/api/v1/hr/holidays?${new URLSearchParams({ from, to })}`)
      .then(r => r.json())
      .then(j => {
        if (!alive || !j?.success) return
        setHolidays(new Map((j.data as { holiday_date: string; name_th: string }[]).map(h => [h.holiday_date, h.name_th])))
      })
      .catch(() => { /* ไม่มีวันหยุดก็แสดงปฏิทินตามปกติ */ })
    return () => { alive = false }
  }, [from, to])
  return holidays
}

/** ปุ่มกลับไปเดือนปัจจุบัน — พื้นเขียวเข้ม ตัวอักษรขาว (คอนทราสต์ ~5.6:1 ทั้งโหมดมืดและสว่าง) */
export const ThisMonthButton = ({ onClick }: { month?: Dayjs; onClick: () => void }) => (
  <Button
    size="small" shape="round" icon={<CalendarOutlined />} onClick={onClick} className="hover:opacity-85"
    style={{ marginInlineStart: 8, fontWeight: 600, background: '#047857', borderColor: '#047857', color: '#fff' }}
  >
    เดือนนี้
  </Button>
)

/** คำอธิบายสี / สถานะ — แสดงเฉพาะที่มีในรายการ */
export const LeaveLegend = ({ events, holidays, markedLabel }: { events: LeaveEvent[]; holidays: Map<string, string>; markedLabel?: string }) => {
  const types = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of events) seen.set(e.leave_type_name ?? 'ลา', colorOf(e))
    return [...seen.entries()]
  }, [events])
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {types.map(([label, color]) => (
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
      {markedLabel && events.some(e => e.marked) && (
        <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
          <span style={{ width: 14, height: 10, borderRadius: 2, backgroundColor: MASKED_COLOR, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.85)', display: 'inline-block' }} />
          <Text style={{ fontSize: 12 }}>{markedLabel}</Text>
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
  )
}

export default function LeaveMonthGrid({ month, events, holidays, onEventClick }: {
  month: Dayjs
  events: LeaveEvent[]
  holidays: Map<string, string>
  onEventClick?: (e: LeaveEvent) => void
}) {
  // จัดเลนต่อสัปดาห์: ใบของฉัน/ใบที่เน้น ขึ้นก่อน แล้วเรียงตามวันเริ่ม
  const weeks = useMemo(() => {
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
        .sort((a, b) => Number(b.is_mine || !!b.marked) - Number(a.is_mine || !!a.marked)
          || a.start_date.localeCompare(b.start_date) || b.end_date.localeCompare(a.end_date))
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

  const todayStr = dayjs().format('YYYY-MM-DD')
  const cellBorder = '1px solid var(--app-border-strong)'

  return (
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
                <div
                  onClick={onEventClick ? () => onEventClick(e) : undefined}
                  style={{
                    gridColumn: `${s + 1} / ${en + 2}`, gridRow: lane + 1,
                    margin: `0 ${contR ? 0 : 4}px 0 ${contL ? 0 : 4}px`,
                    backgroundColor: colorOf(e),
                    backgroundImage: e.status === 'APPROVED' ? undefined : PENDING_STRIPES,
                    color: '#fff', fontSize: 12, lineHeight: 1.45, padding: '2px 6px', minWidth: 0,
                    borderRadius: `${contL ? 0 : 4}px ${contR ? 0 : 4}px ${contR ? 0 : 4}px ${contL ? 0 : 4}px`,
                    boxShadow: e.is_mine || e.marked ? 'inset 0 0 0 2px rgba(255,255,255,0.85)' : undefined,
                    cursor: onEventClick ? 'pointer' : undefined,
                  }}
                >
                  <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
                    <StatusIcon status={e.status} color="#fff" size={13} />
                    {e.is_mine && (
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 2px rgba(255,255,255,0.35)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontWeight: e.is_mine || e.marked ? 700 : 500 }}>{barText(e)}</span>
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
}
