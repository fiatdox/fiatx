'use client'
// ปฏิทินการลา (หน้า /hr/leave) — ขอบเขตที่เลือกดูได้มาจาก backend ตามตำแหน่งในผัง:
// ผอ. / ADMIN / HR = ทั้งโรงพยาบาล · หัวหน้า/รักษาการ = หน่วยที่ดูแล · ทุกคน = เพื่อนร่วมกลุ่มงาน (ไม่เห็นประเภทการลา) + ของฉัน
import React, { useEffect, useMemo, useState } from 'react'
import { Card, Select, Button, Tag, Typography, Empty, Spin, Grid } from 'antd'
import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import LeaveMonthGrid, {
  LeaveLegend, ThisMonthButton, StatusIcon, STATUS_LABEL, colorOf, fmtDay, monthRange, th, useHolidays, waitingText,
  type LeaveEvent as GridEvent,
} from '../LeaveMonthGrid'

const { Text } = Typography

interface ScopeOption { key: string; label: string; group: string }
interface LeaveEvent extends GridEvent {
  id: number
  user_id: number
  position_name: string | null
  unit_name: string | null
}
interface CalendarData { scope: string; options: ScopeOption[]; masked: boolean; events: LeaveEvent[] }

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
  const range = useMemo(() => month && monthRange(month), [month])
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
  const holidays = useHolidays(range)

  const events = useMemo(() => data?.events ?? [], [data])
  const currentScope = scope ?? data?.scope ?? null

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
        <ThisMonthButton month={month} onClick={() => setMonth(dayjs().startOf('month'))} />
      </div>
      <LeaveLegend events={events} holidays={holidays} />
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
            <LeaveMonthGrid month={month} events={events} holidays={holidays} />
          ))}
        </Spin>
      )}
    </Card>
  )
}
