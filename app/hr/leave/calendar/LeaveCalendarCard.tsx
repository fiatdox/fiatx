'use client'
// ปฏิทินการลา (หน้า /hr/leave) — ขอบเขตที่เลือกดูได้มาจาก backend ตามตำแหน่งในผัง:
// ผอ. / ADMIN / HR = ทั้งโรงพยาบาล · หัวหน้า/รักษาการ = หน่วยที่ดูแล · ทุกคน = เพื่อนร่วมกลุ่มงาน (ไม่เห็นประเภทการลา) + ของฉัน
// เลือกดูหน่วยตามลำดับ กลุ่มภารกิจ → กลุ่มงาน → หน่วยงาน: ผอ. ADMIN HR ทุกหน่วย · หัวหน้า/รักษาการ เฉพาะสายตัวเอง — ใบนอกสายอนุมัติเห็นแค่ว่า "ลา" (ADMIN / HR เห็นครบ)
// ADMIN: ดูแบบบุคลากรคนอื่น (as role) เพื่อตรวจการมองเห็น — backend ตรวจสิทธิ์ที่ as_user_id
import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Card, Select, Button, Tag, Typography, Empty, Spin, Grid, Row, Col } from 'antd'
import { CalendarOutlined, LeftOutlined, RightOutlined, UserSwitchOutlined } from '@ant-design/icons'
import Cookies from 'js-cookie'
import dayjs, { type Dayjs } from 'dayjs'
import { normalizeRoles } from '@/app/lib/menuAccess'
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
interface UnitOption { kind: 'mission' | 'major' | 'submajor'; id: number; name: string; parent_id: number | null }
interface CalendarData { scope: string; options: ScopeOption[]; units?: UnitOption[]; masked: boolean; events: LeaveEvent[] }

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

  // ── ADMIN: ดูแบบบุคลากรคนอื่น — ตรวจว่าแต่ละคนเห็นปฏิทินอย่างไร ──
  const [isAdmin, setIsAdmin] = useState(false)
  const [viewAs, setViewAs] = useState<number | null>(null)
  const [staffOptions, setStaffOptions] = useState<{ value: number; label: string }[]>([])
  useEffect(() => {
    let admin = false
    try { admin = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles).includes('ADMIN') } catch { /* cookie เสีย = ไม่ใช่ ADMIN */ }
    if (!admin) return
    void Promise.resolve().then(() => setIsAdmin(true))
    fetch('/api/v1/users')
      .then(r => r.json())
      .then(j => {
        if (!j?.success || !Array.isArray(j.data)) return
        setStaffOptions(j.data
          .filter((u: { is_active?: string }) => u.is_active !== 'N')
          .map((u: { id: number; pname?: string; fname?: string; lname?: string; position_name?: string }) => ({
            value: Number(u.id),
            label: `${u.pname ?? ''}${u.fname ?? ''} ${u.lname ?? ''}`.trim() + (u.position_name ? ` · ${u.position_name}` : ''),
          })))
      })
      .catch(() => { /* ไม่มีรายชื่อ = ใช้โหมดนี้ไม่ได้ */ })
  }, [])

  // ดึงทั้งตารางเดือน (มีวันของเดือนก่อน/ถัดไปติดมาในแถวแรก/แถวสุดท้าย)
  const range = useMemo(() => month && monthRange(month), [month])
  const requestKey = range ? `${range.from}|${range.to}|${scope ?? ''}|${viewAs ?? ''}` : null
  const loading = requestKey !== loadedKey

  useEffect(() => {
    if (!range || !requestKey) return
    let alive = true
    const qs = new URLSearchParams({ from: range.from, to: range.to, ...(scope ? { scope } : {}), ...(viewAs ? { as_user_id: String(viewAs) } : {}) })
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
  }, [range, scope, viewAs, requestKey])

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

  // ── เลือกหน่วยตามลำดับ — ค่าทั้ง 3 ช่องคำนวณจาก scope เดียว เลือกหน่วยล่างแล้วหน่วยบนตามให้เอง ──
  const units = useMemo(() => data?.units ?? [], [data])
  const unitsOf = (kind: UnitOption['kind']) => units.filter(u => u.kind === kind)
  const findUnit = (kind: UnitOption['kind'], id: number | null | undefined) => units.find(u => u.kind === kind && u.id === id)
  const [scopeKind, scopeIdText] = (currentScope ?? '').split(':')
  const scopeId = Number(scopeIdText) || null
  const selSubmajor = scopeKind === 'submajor' ? scopeId : null
  // หน่วยงานบางหน่วยมีกลุ่มงานแม่ที่ไม่ได้ใช้งานแล้ว — ไม่มีในตัวเลือก จึงถือว่าไม่ได้เลือก ไม่งั้นช่องจะแสดงเป็นตัวเลข
  const selMajor = scopeKind === 'major' ? scopeId : findUnit('major', findUnit('submajor', selSubmajor)?.parent_id)?.id ?? null
  // หัวหน้าเห็นเฉพาะหน่วยในสาย — หน่วยแม่อาจไม่อยู่ในตัวเลือก จึงถือว่าไม่ได้เลือกเช่นกัน
  const selMission = scopeKind === 'mission' ? scopeId : findUnit('mission', findUnit('major', selMajor)?.parent_id)?.id ?? null
  const majorOptions = unitsOf('major')
    .filter(u => !selMission || u.parent_id === selMission)
    .map(u => ({ value: u.id, label: u.name }))
  const submajorOptions = unitsOf('submajor')
    .filter(u => selMajor ? u.parent_id === selMajor : !selMission || findUnit('major', u.parent_id)?.parent_id === selMission)
    // ชื่อหน่วยงานซ้ำกันได้ในต่างกลุ่มงาน — ยังไม่ได้เลือกกลุ่มงานให้บอกกลุ่มงานกำกับไว้
    .map(u => {
      const parent = selMajor ? null : findUnit('major', u.parent_id)?.name
      return { value: u.id, label: parent ? `${u.name} (${parent})` : u.name }
    })
  // ระดับที่ไม่มีหน่วยให้เลือก (เช่น หัวหน้ากลุ่มงานไม่มีกลุ่มภารกิจ) ไม่ต้องแสดงช่อง
  const pickerLevels = ([
    ['mission', 'กลุ่มภารกิจ', selMission, unitsOf('mission').map(u => ({ value: u.id, label: u.name })), (v?: number) => setScope(v ? `mission:${v}` : null)],
    ['major', 'กลุ่มงาน', selMajor, majorOptions, (v?: number) => setScope(v ? `major:${v}` : selMission ? `mission:${selMission}` : null)],
    ['submajor', 'หน่วยงาน', selSubmajor, submajorOptions, (v?: number) => setScope(v ? `submajor:${v}` : selMajor ? `major:${selMajor}` : null)],
  ] as const).filter(([kind]) => unitsOf(kind).length > 0)
  const unitPicker = units.length > 0 && (
    <Row gutter={[12, 8]} style={{ marginBottom: 12 }}>
      {pickerLevels.map(([, label, value, options, onChange]) => (
        <Col key={label} xs={24} md={Math.floor(24 / pickerLevels.length)}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{label}</Text>
          <Select
            allowClear
            placeholder="ทั้งหมด"
            className="w-full"
            value={value ?? undefined}
            onChange={onChange}
            options={options}
            showSearch={{ optionFilterProp: 'label' }}
            notFoundContent="ไม่มีหน่วยในระดับที่เลือก"
            aria-label={`เลือก${label}`}
          />
        </Col>
      ))}
    </Row>
  )

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
          value={data?.options.some(o => o.key === currentScope) ? currentScope ?? undefined : undefined}
          placeholder="เลือกตามหน่วยด้านล่าง"
          onChange={v => setScope(v)}
          options={selectOptions}
          showSearch={{ optionFilterProp: 'label' }}
          style={{ width: narrow ? 180 : 280 }}
          popupMatchSelectWidth={false}
          aria-label="เลือกขอบเขตการมองเห็น"
        />
      )}
    >
      {isAdmin && (
        <div style={{ marginBottom: 12 }}>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <Text strong style={{ whiteSpace: 'nowrap' }}><UserSwitchOutlined /> ดูแบบบุคลากร (ADMIN)</Text>
            <Select
              showSearch={{ optionFilterProp: 'label' }} allowClear
              className="w-full md:max-w-120"
              placeholder="ดูของตัวเอง — หรือค้นหาชื่อ เพื่อดูปฏิทินแบบที่คนนั้นเห็น"
              options={staffOptions}
              value={viewAs ?? undefined}
              onChange={(v?: number) => { setViewAs(v ?? null); setScope(null) }}
              aria-label="ดูแบบบุคลากร"
            />
          </div>
          {viewAs != null && (
            <Alert
              style={{ marginTop: 10 }} type="warning" showIcon
              title={`กำลังดูแบบ ${staffOptions.find(o => o.value === viewAs)?.label ?? `ผู้ใช้ #${viewAs}`}`}
              description="ตัวเลือกหน่วยและข้อมูลการลาด้านล่างคือสิ่งที่คนนี้เห็นจริง รวมถึงข้อมูลที่ถูกซ่อน"
            />
          )}
        </div>
      )}
      {error ? <Empty description={error} /> : (
        <Spin spinning={loading || !month}>
          {unitPicker}
          {header}
          {data?.masked && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
              {currentScope === 'team'
                ? 'ปฏิทินเพื่อนร่วมกลุ่มงานแสดงเฉพาะว่าใครลาวันไหน ไม่แสดงประเภทการลาของผู้อื่น'
                : 'แสดงประเภทการลาเฉพาะใบที่ท่านอยู่ในสายอนุมัติ ใบอื่นแสดงเฉพาะว่าใครลาวันไหน'}
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
