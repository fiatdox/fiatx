'use client'
// ขออนุมัติเดินทางไปราชการ — แบบฟอร์มตามบันทึกข้อความของงานพัฒนาทรัพยากรบุคคล
// ยอดเงินคำนวณสดจากหน้าตั้งค่า (อัตราเบี้ยเลี้ยงรายคน · บาท/กม. · เพดานเส้นทาง) — server คำนวณ/ตรวจซ้ำเป็นตัวจริง
// ?id= แก้ไขคำขอเดิม · บันทึกแล้วไปหน้ารายการพร้อมเปิด PDF
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, AutoComplete, Button, Card, Checkbox, Col, ConfigProvider, Descriptions, Empty, Form, Input, InputNumber, Radio, Result, Row, Segmented, Select, Space, Spin, Table, Tag, TimePicker, Typography } from 'antd'
import thTH from 'antd/locale/th_TH'
import { SaveOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { DATE_FORMAT, ThaiDatePicker } from '@/app/general/contracts/contractShared'
import { TRAVEL_BASE, TRAVEL_COLOR, TRAVEL_MENU, TravelApiError, TravelShell, travelApi, travelPost } from '../travelShared'
import {
  COST_MODES, TH_MONTHS_FULL, tripDatesText, type CostMode,
  FLIGHT_LABEL, budgetTypeLabel, LODGING_MODES, MEMO, MEMO_NO_RE, VEHICLE_MODES, transportExtras, allowanceDays, bahtText, maxMeals, mealCut, personAllowance, durationParts, fmtMoney, requiredDocs, round2, tripNights,
  type BudgetType, type ChainStepLite, type FlightClass, type LodgingMode, type RoomType, type SignMode, type TravelRequest, type VehicleMode,
} from '../travelCalc'
import { SignaturePreview } from '@/app/account/settings/SignatureSettings'
import type { UploadFile } from 'antd'
import { FILE_KIND_LABEL, PendingFilePicker, RequestFiles, requiredKinds, uploadTravelFile, type FileKind } from '../TravelFiles'

const { Title, Text } = Typography
/** สีปุ่มประเภทคำขอ "ไม่เบิกค่าใช้จ่าย" ตอนเลือก */
const COST_NO_CLAIM_COLOR = '#059669'
/** ตัวเลือกแบบปุ่ม (Segmented / Radio ปุ่ม) — ช่องที่เลือกเป็นสีทึบ ตัวอักษรขาว ให้เห็นชัด · ต้องครอบ Form.Item (ไม่ใช่ข้างใน) เพราะ Form.Item ผูกค่ากับลูกตัวแรก */
const pickTheme = (color: string) => ({
  token: { colorPrimary: color },
  components: {
    Segmented: { itemSelectedBg: color, itemSelectedColor: '#fff', itemColor: 'var(--app-text)', itemHoverColor: 'var(--app-text)', trackBg: 'var(--app-bg)', trackPadding: 3 },
    Radio: { buttonSolidCheckedBg: color, buttonSolidCheckedHoverBg: color, buttonSolidCheckedActiveBg: color, buttonSolidCheckedColor: '#fff', buttonColor: 'var(--app-text)' },
  },
})
// ปีในหัวปฏิทินเป็น พ.ศ.
const TH_LOCALE = { ...thTH, DatePicker: { ...thTH.DatePicker!, lang: { ...thTH.DatePicker!.lang, yearFormat: 'BBBB' } } }

interface Person {
  id: number; name: string; position: string | null; unit: string | null; tier_name: string | null; rate: number; working?: boolean; fy_trips?: number
  // ระดับสิทธิ์ค่าที่พัก (บาท/คน/คืน) — จากหน้าตั้งค่าค่าเช่าที่พัก
  lodging_class_name?: string | null; lump_sum?: number; single_room?: number; double_room?: number; flight_class?: FlightClass
}
interface Vehicle { id: number; code: string; name: string; rate_per_km: number }
interface RouteOpt { id: number; mode: 'bus' | 'plane'; origin: string; destination: string; max_fare: number; note: string | null }
interface BudgetOpt { id: number; fiscal_year: number; budget_type: BudgetType; name: string; amount: number; is_active: boolean; remaining: number; pending: number; type_name: string; type_ref_code: string | null; type_sort: number }
/** ค่ารถรับจ้างในจังหวัดพะเยา (ที่พัก/บ้าน ↔ สถานี) แยกอำเภอ — บาท/เที่ยว/คน/วัน ตามที่ สสจ.พะเยา กำหนด */
interface LocalRate { id: number; district: string; rate: number; note: string | null }
interface Meta { me: Person & { has_signature?: boolean }; sign_mode: SignMode; approval_chain?: ChainStepLite[]; vehicles: Vehicle[]; routes: RouteOpt[]; local_rates?: LocalRate[]; budgets: BudgetOpt[]; can_manage: boolean }

/** วันที่ (พ.ศ.) + เวลา → ISO เวลาไทย */
const toIso = (d?: Dayjs | null, t?: Dayjs | null) => d && t ? `${d.format('YYYY-MM-DD')}T${t.format('HH:mm')}:00+07:00` : null
const FIELD_MAP: Record<string, string> = { start_at: 'start_date', end_at: 'end_date', lodging_rooms_by: 'lodging_mode' }
/** ปีงบประมาณ พ.ศ. ของวันที่ (ต.ค. ขึ้นปีงบใหม่) */
const fyOf = (d: Dayjs) => d.year() + 543 + (d.month() >= 9 ? 1 : 0)
const money = (n: number) => `${fmtMoney(n)} บาท`
/** ค่าแท็กซี่ สถานีขนส่ง/สนามบิน ↔ ที่พัก ที่ใช้บ่อย (ต่อเที่ยว) — ปุ่มใส่ให้ แก้ได้ */
const TAXI_RATE = 200
/** สถานีที่ขึ้นรถโดยสาร/เครื่องบินที่ใช้บ่อย — พิมพ์ชื่ออื่นได้ */
const STATION_OPTS = ['สถานีขนส่งผู้โดยสารจังหวัดพะเยา (บขส.)', 'ท่าอากาศยานแม่ฟ้าหลวง เชียงราย', 'ท่าอากาศยานเชียงใหม่', 'สถานีรถไฟลำปาง'].map(value => ({ value }))

/** วันที่ไม่ต้องใช้เบี้ยเลี้ยง/ที่พัก — เลือกหลายวันในเดือนเดียว (ค่า = ['YYYY-MM-DD', ...] เรียงแล้ว) */
const WEEK = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const DayGrid = ({ month, value = [], onChange }: { month?: Dayjs | null; value?: string[]; onChange?: (v: string[]) => void }) => {
  if (!month) return <Text type="secondary">เลือกเดือนก่อน แล้วกดวันที่ที่จะไป</Text>
  const first = month.startOf('month')
  const on = new Set(value)
  const toggle = (k: string) => onChange?.(on.has(k) ? value.filter(x => x !== k) : [...value, k].sort())
  return (
    <div className="day-grid" role="group" aria-label="เลือกวันที่เดินทาง" data-testid="day-grid">
      {WEEK.map(w => <div key={w} className="dg-h">{w}</div>)}
      {Array.from({ length: first.day() }, (_, i) => <div key={`e${i}`} />)}
      {Array.from({ length: month.daysInMonth() }, (_, i) => {
        const d = first.add(i, 'day'), k = d.format('YYYY-MM-DD'), sel = on.has(k)
        return <button type="button" key={k} className={`dg-d${sel ? ' on' : ''}${d.day() === 0 || d.day() === 6 ? ' we' : ''}`} aria-pressed={sel} aria-label={`วันที่ ${i + 1}`} onClick={() => toggle(k)}>{i + 1}</button>
      })}
    </div>
  )
}
const monthLabel = (d: Dayjs) => `${TH_MONTHS_FULL[d.month()]} ${d.year() + 543}`
const NO_CLAIM_MODES = ['gov_car', 'private', 'other']

const RequestForm = () => {
  const { message } = App.useApp()
  const router = useRouter()
  const editId = Number(useSearchParams().get('id')) || null
  const [form] = Form.useForm()
  const [meta, setMeta] = useState<Meta | null>(null)
  // ค่าเริ่มต้นของฟอร์ม — เตรียมให้ครบก่อนแล้วค่อยสร้างฟอร์ม (ฟอร์มยังไม่ mount ตอนโหลด ใช้ setFieldsValue ไม่ได้)
  const [init, setInit] = useState<Record<string, unknown> | null>(null)
  const [orig, setOrig] = useState<TravelRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [people, setPeople] = useState<Map<number, Person>>(new Map())
  const [options, setOptions] = useState<Person[]>([])
  const [searching, setSearching] = useState(false)
  // ห้องพักรายคน (จ่ายจริง) ที่ผู้ขอเลือกเอง — ไม่เลือก = ไปคนเดียวห้องเดี่ยว ไปเป็นคณะห้องคู่
  const [rooms, setRooms] = useState<Record<number, RoomType>>({})
  // ลายเซ็นของผู้ขอ (ต้องมีก่อนยื่น) — undefined = ยังไม่ได้ตรวจ
  const [signature, setSignature] = useState<string | null | undefined>(undefined)
  // ไฟล์แนบที่เลือกไว้ (คำขอใหม่) — อัปโหลดหลังบันทึกคำขอสำเร็จ · คำขอเดิมแนบ/ลบได้ทันทีผ่าน RequestFiles
  const [pending, setPending] = useState<Record<FileKind, UploadFile[]>>({ source: [], plane: [], private_car: [], vehicle_use: [] })
  const [fileErr, setFileErr] = useState<Partial<Record<FileKind, string>>>({})
  const [checkingSig, setCheckingSig] = useState(false)
  const checkSignature = useCallback(async () => {
    setCheckingSig(true)
    try {
      const j = await (await fetch('/api/v1/users/me/signature')).json()
      setSignature(j?.success ? j.data?.image ?? null : null)
    } catch { setSignature(null) } finally { setCheckingSig(false) }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { checkSignature() }, [checkSignature])

  const remember = (list: Person[]) => setPeople(prev => { const m = new Map(prev); list.forEach(p => m.set(p.id, p)); return m })

  const load = useCallback(async () => {
    try {
      const m = await travelApi<Meta>('requests/meta')
      if (!editId) {
        const cur = m.budgets.find(b => b.is_active)
        setInit({ cost_mode: 'claim', vehicle_mode: 'gov_car', budget_id: cur?.id, allowance_days_mode: 'auto', lodging_mode: 'none', home_station_trips: 2,
          trip_dates: [], day_start: dayjs().hour(8).minute(0), day_end: dayjs().hour(16).minute(30) })
        setMeta(m)
        return
      }
      const r = await travelApi<TravelRequest>(`requests/${editId}`)
      if (!r.can_edit) { setLoadError('คำขอนี้แก้ไขไม่ได้แล้ว (ยกเลิก หรือการเงินยืนยันยอดแล้ว)'); return }
      setOrig(r)
      const companions = (r.travelers ?? []).filter(t => !t.is_requester)
      remember(companions.map(t => ({ id: t.user_id, name: t.name, position: t.position, unit: null, tier_name: t.tier_name, rate: t.rate })))
      // ผู้ขอ + ผู้ร่วมเดินทาง: อัตราปัจจุบัน (server คิดใหม่ตอนบันทึก) และจำนวนครั้งในปีงบไม่นับคำขอนี้
      travelApi<Person[]>(`requests/people?ids=${[m.me.id, ...companions.map(c => c.user_id)].join(',')}&except_id=${editId}&fiscal_year=${fyOf(dayjs(r.start_at))}`).then(remember).catch(() => {})
      const st = dayjs(r.start_at), en = dayjs(r.end_at)
      setRooms(Object.fromEntries((r.travelers ?? []).filter(t => t.lodging_room).map(t => [t.user_id, t.lodging_room as RoomType])))
      setMeta(m)
      setInit({
        memo_no: r.memo_no ?? undefined, purpose: r.purpose, subject: r.subject, location: r.location,
        start_date: st, start_time: st, end_date: en, end_time: en,
        cost_mode: r.cost_mode ?? 'claim', trip_dates: r.trip_dates ?? [], trip_month: r.trip_dates?.length ? dayjs(r.trip_dates[0]) : undefined,
        day_start: st, day_end: en, vehicle_request: !!r.vehicle_request,
        companion_ids: companions.map(c => c.user_id),
        allowance_days: r.allowance_days, allowance_days_mode: r.allowance_days === r.allowance_max_days ? 'auto' : 'manual', meals_provided: r.meals_provided || undefined,
        vehicle_mode: r.vehicle_mode, vehicle_id: r.vehicle_id ?? undefined, vehicle_plate: r.vehicle_plate ?? undefined, distance_km: r.distance_km ?? undefined,
        route_id: r.route_id ?? undefined, vehicle_other: r.vehicle_other ?? undefined, transport_amount: r.transport_amount || undefined, toll_amount: r.toll_amount || undefined,
        taxi_go_amount: r.taxi_go_amount || undefined, taxi_back_amount: r.taxi_back_amount || undefined, home_station_amount: r.home_station_amount || undefined,
        home_station_rate_id: r.home_station_rate_id ?? undefined, home_station_trips: r.home_station_trips ?? 2,
        home_station_from: r.home_station_from ?? undefined, home_station_to: r.home_station_to ?? undefined,
        lodging_mode: r.lodging_mode ?? 'none', lodging_nights: r.lodging_nights || undefined,
        lodging_amount: r.lodging_mode === 'actual' ? r.lodging_amount || undefined : undefined, lodging_note: r.lodging_note ?? undefined,
        registration_amount: r.registration_amount || undefined, other_amount: r.other_amount || undefined, other_desc: r.other_desc ?? undefined,
        budget_id: r.budget_id,
      })
    } catch (e) { setLoadError((e as Error).message) }
  }, [editId])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  // ค้นหาผู้ร่วมเดินทาง (หน่วงเวลาพิมพ์)
  const [q, setQ] = useState('')
  useEffect(() => {
    if (q.trim().length < 2) return
    const t = setTimeout(async () => {
      setSearching(true)
      const ref = form.getFieldValue('start_date') ?? form.getFieldValue('trip_month')
      const fy = ref ? `&fiscal_year=${fyOf(ref)}` : ''
      const ex = editId ? `&except_id=${editId}` : ''
      try { const list = await travelApi<Person[]>(`requests/people?search=${encodeURIComponent(q.trim())}${fy}${ex}`); setOptions(list); remember(list) }
      catch { /* ค้นไม่ได้ก็พิมพ์ใหม่ */ } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [q, form, editId])

  // ── ค่าที่ใช้คำนวณสด ──
  const v = Form.useWatch([], form) ?? {}
  const startIso = toIso(v.start_date, v.start_time), endIso = toIso(v.end_date, v.end_time)
  const startMs = startIso ? Date.parse(startIso) : NaN, endMs = endIso ? Date.parse(endIso) : NaN
  const timeOk = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
  // ไม่เบิกค่าใช้จ่าย: เลือกวันในเดือนเดียว ไป-กลับในวันเดียวกัน เวลาเดียวกันทุกวัน
  const costMode: CostMode = v.cost_mode ?? 'claim'
  const noClaim = costMode === 'no_claim'
  const tripDates: string[] = v.trip_dates ?? []
  const dayOk = !!v.day_start && !!v.day_end && v.day_end.format('HH:mm') > v.day_start.format('HH:mm')
  const dateOk = noClaim ? tripDates.length > 0 && dayOk : timeOk
  const calc = timeOk ? allowanceDays(startMs, endMs) : null
  const dur = timeOk ? durationParts(startMs, endMs) : null
  const me = meta?.me
  const companionIds = useMemo<number[]>(() => v.companion_ids ?? [], [v.companion_ids])
  const travelers = useMemo(() => me ? [people.get(me.id) ?? me, ...companionIds.map(id => people.get(id)).filter((p): p is Person => !!p)] : [], [me, companionIds, people])
  const days = v.allowance_days_mode === 'manual' && typeof v.allowance_days === 'number' ? v.allowance_days : calc?.days ?? 0
  const meals = typeof v.meals_provided === 'number' ? v.meals_provided : 0
  const allowance = round2(travelers.reduce((n, t) => n + personAllowance(t.rate, days, meals), 0))
  const mealDeduct = round2(travelers.reduce((n, t) => n + Math.min(t.rate * days, meals * mealCut(t.rate)), 0))
  const mode: VehicleMode | undefined = v.vehicle_mode
  const vehicle = meta?.vehicles.find(x => x.id === v.vehicle_id)
  const route = meta?.routes.find(x => x.id === v.route_id && x.mode === mode)
  const cap = route ? route.max_fare * 2 * travelers.length : null
  const fuel = mode === 'private' && vehicle && v.distance_km > 0 ? round2(v.distance_km * vehicle.rate_per_km) : 0
  const toll = mode === 'private' || mode === 'gov_car' ? v.toll_amount ?? 0 : 0
  const transitMode = mode === 'bus' || mode === 'plane' || mode === 'other'
  const STATION = mode === 'plane' ? 'สนามบิน' : mode === 'bus' ? 'สถานีขนส่ง' : 'สถานี'
  const fare = transitMode ? v.transport_amount ?? 0 : 0
  // ค่าพาหนะย่อย (แท็กซี่ สถานี ↔ ที่พัก · บ้าน ↔ สถานี) — รวมใน ๖.๓
  const extras = transitMode ? transportExtras(v) : 0
  // ที่พัก/บ้าน ↔ สถานี: เพดาน = อัตราของอำเภอ × เที่ยว × จำนวนผู้เดินทาง (ตรงกับ backend)
  const localRates = meta?.local_rates ?? []
  const hsRate = localRates.find(x => x.id === v.home_station_rate_id)
  const hsTrips: number = v.home_station_trips ?? 2
  const hsCap = hsRate ? hsRate.rate * hsTrips * Math.max(1, travelers.length) : null
  const fillHs = (rateId: number | undefined, trips: number) => {
    const r = localRates.find(x => x.id === rateId)
    if (!r) return
    const cur = form.getFieldsValue(['home_station_amount', 'home_station_to'])
    const cap = r.rate * trips * Math.max(1, travelers.length)
    form.setFieldsValue({
      // ว่าง / เกินเพดาน / เท่าเพดานเดิม (ยังไม่ได้แก้เอง) → ใช้เพดานใหม่
      home_station_amount: !cur.home_station_amount || cur.home_station_amount > cap || cur.home_station_amount === hsCap ? cap : cur.home_station_amount,
      home_station_to: cur.home_station_to || (mode === 'bus' ? STATION_OPTS[0].value : undefined),
    })
  }
  const transport = round2(fare + extras)
  // ๖.๒ ค่าเช่าที่พัก — ทั้งคณะใช้รูปแบบเดียว · เพดานรายคน = อัตราตามระดับสิทธิ์ × คืน (ตรงกับ backend computeRequest)
  const maxNights = timeOk ? tripNights(startMs, endMs) : 0
  const lodgingMode: LodgingMode = v.lodging_mode ?? 'none'
  const nights = lodgingMode === 'none' ? 0 : v.lodging_nights ?? 0
  const defRoom: RoomType = travelers.length > 1 ? 'double' : 'single'
  const roomOf = (p: Person): RoomType => rooms[p.id] ?? defRoom
  const lodgingRate = (p: Person) => lodgingMode === 'lump' ? p.lump_sum ?? 0 : lodgingMode === 'actual' ? (roomOf(p) === 'single' ? p.single_room : p.double_room) ?? 0 : 0
  const lodgingCap = round2(travelers.reduce((n, p) => n + lodgingRate(p) * nights, 0))
  const singles = lodgingMode === 'actual' ? travelers.filter(p => roomOf(p) === 'single').length : 0
  const roomCount = singles + Math.ceil((travelers.length - singles) / 2)
  const needLodgingNote = lodgingMode === 'actual' && travelers.length > 1 && singles > 0
  const lodging = lodgingMode === 'lump' ? lodgingCap : lodgingMode === 'actual' ? v.lodging_amount ?? 0 : 0
  const registration = v.registration_amount ?? 0, other = v.other_amount ?? 0
  const total = round2(allowance + lodging + transport + registration + fuel + toll + other)
  const budget = meta?.budgets.find(b => b.id === v.budget_id)
  // ประมาณการของคำขออื่นที่รอยืนยัน (ไม่นับยอดเดิมของคำขอนี้)
  const otherPending = budget ? budget.pending - (orig && orig.budget_id === budget.id ? orig.total_amount : 0) : 0
  const projected = budget ? round2(budget.remaining - otherPending - total) : 0

  // โหมดพาหนะเปลี่ยน → ตั้งค่าพาหนะเริ่มต้นตามเพดาน (ผู้ขอแก้ลดได้)
  const onRouteChange = (id: number) => {
    const r = meta?.routes.find(x => x.id === id)
    if (r) form.setFieldsValue({ transport_amount: r.max_fare * 2 * travelers.length })
  }

  const reloadFiles = async () => {
    if (!editId) return
    try { const r = await travelApi<TravelRequest>(`requests/${editId}`); setOrig(o => o ? { ...o, files: r.files, missing_files: r.missing_files } : o) } catch { /* ไม่เป็นไร */ }
  }
  const save = async () => {
    const f = await form.validateFields().catch(() => null)
    // ไฟล์ที่ต้องแนบตามพาหนะ: หนังสือต้นเรื่องทุกคำขอ · เครื่องบิน · รถยนต์ส่วนตัว
    const need = requiredKinds(form.getFieldValue('vehicle_mode'), form.getFieldValue('cost_mode'), form.getFieldValue('vehicle_request'))
    const lack = need.filter(k => editId ? !(orig?.files ?? []).some(x => x.kind === k) : pending[k].length === 0)
    setFileErr(Object.fromEntries(lack.map(k => [k, `กรุณาแนบ${FILE_KIND_LABEL[k]}`])))
    if (!f) return
    if (lack.length) {
      message.error(`กรุณาแนบ ${lack.map(k => FILE_KIND_LABEL[k]).join(', ')}`)
      document.querySelector('[data-testid=attach-card]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSaving(true)
    const nc = f.cost_mode === 'no_claim'
    const body = nc ? {
      cost_mode: 'no_claim', memo_no: f.memo_no?.trim() || null, purpose: f.purpose, subject: f.subject, location: f.location,
      trip_dates: f.trip_dates ?? [], day_start: f.day_start?.format('HH:mm'), day_end: f.day_end?.format('HH:mm'),
      companion_ids: f.companion_ids ?? [],
      vehicle_mode: f.vehicle_mode, vehicle_id: f.vehicle_id ?? null, vehicle_plate: f.vehicle_plate ?? null, distance_km: f.distance_km ?? null,
      vehicle_other: f.vehicle_other ?? null, vehicle_request: f.vehicle_mode === 'gov_car' && !!f.vehicle_request,
    } : {
      cost_mode: 'claim', vehicle_request: f.vehicle_mode === 'gov_car' && !!f.vehicle_request,
      memo_no: f.memo_no?.trim() || null, purpose: f.purpose, subject: f.subject, location: f.location,
      start_at: toIso(f.start_date, f.start_time), end_at: toIso(f.end_date, f.end_time),
      companion_ids: f.companion_ids ?? [],
      allowance_days: f.allowance_days_mode === 'manual' ? f.allowance_days : null,
      meals_provided: f.meals_provided ?? 0,
      vehicle_mode: f.vehicle_mode, vehicle_id: f.vehicle_id ?? null, vehicle_plate: f.vehicle_plate ?? null, distance_km: f.distance_km ?? null,
      route_id: f.route_id ?? null, vehicle_other: f.vehicle_other ?? null,
      transport_amount: ['bus', 'plane', 'other'].includes(f.vehicle_mode) ? f.transport_amount ?? 0 : 0,
      taxi_go_amount: ['bus', 'plane', 'other'].includes(f.vehicle_mode) ? f.taxi_go_amount ?? 0 : 0,
      taxi_back_amount: ['bus', 'plane', 'other'].includes(f.vehicle_mode) ? f.taxi_back_amount ?? 0 : 0,
      home_station_amount: ['bus', 'plane', 'other'].includes(f.vehicle_mode) ? f.home_station_amount ?? 0 : 0,
      ...(['bus', 'plane', 'other'].includes(f.vehicle_mode) && (f.home_station_amount ?? 0) > 0
        ? { home_station_rate_id: f.home_station_rate_id ?? null, home_station_trips: f.home_station_trips ?? 2, home_station_from: f.home_station_from?.trim() || null, home_station_to: f.home_station_to?.trim() || null }
        : { home_station_rate_id: null, home_station_trips: null, home_station_from: null, home_station_to: null }),
      toll_amount: ['private', 'gov_car'].includes(f.vehicle_mode) ? f.toll_amount ?? 0 : 0,
      lodging_mode: f.lodging_mode ?? 'none',
      lodging_nights: f.lodging_mode && f.lodging_mode !== 'none' ? f.lodging_nights ?? 0 : 0,
      lodging_amount: f.lodging_mode === 'actual' ? f.lodging_amount ?? 0 : 0,
      lodging_rooms_by: f.lodging_mode === 'actual' ? Object.fromEntries(travelers.map(p => [p.id, roomOf(p)])) : undefined,
      lodging_note: needLodgingNote ? f.lodging_note ?? null : null,
      registration_amount: f.registration_amount ?? 0, other_amount: f.other_amount ?? 0, other_desc: f.other_desc ?? null,
      budget_id: f.budget_id,
    }
    try {
      const r = editId ? await travelApi<{ id: number }>(`requests/${editId}`, 'PUT', body) : await travelPost<{ id: number }>('requests', body)
      // คำขอใหม่: อัปโหลดไฟล์ที่เลือกไว้ (เฉพาะประเภทที่ใช้กับพาหนะนี้) — ไม่สำเร็จบางไฟล์ แนบเพิ่มได้ที่รายละเอียดคำขอ
      const failed: string[] = []
      if (!editId) for (const k of need) for (const x of pending[k]) {
        try { await uploadTravelFile(r.id, k, x.originFileObj as File) } catch (e) { failed.push((e as Error).message) }
      }
      if (failed.length) message.warning(`ยื่นคำขอแล้ว แต่แนบไฟล์ไม่สำเร็จ ${failed.length} ไฟล์ — แนบเพิ่มได้ที่รายละเอียดคำขอ (${failed[0]})`, 8)
      else message.success(editId ? 'บันทึกการแก้ไขแล้ว' : 'ยื่นคำขอแล้ว — พิมพ์บันทึกข้อความเพื่อเสนอลงนามได้เลย')
      router.push(`${TRAVEL_BASE}/requests?open=${r.id}`)
    } catch (e) {
      if (e instanceof TravelApiError && e.field === 'signature') { message.error(e.message); checkSignature() }
      else if (e instanceof TravelApiError && e.field) {
        const name = FIELD_MAP[e.field] ?? e.field
        form.setFields([{ name, errors: [e.message] }])
        form.scrollToField(name, { block: 'center' })
      } else message.error((e as Error).message)
    } finally { setSaving(false) }
  }

  if (loadError) return <Result status="warning" title={loadError} extra={<Link href={`${TRAVEL_BASE}/requests`}><Button type="primary">ไปหน้ารายการคำขอ</Button></Link>} />
  if (!meta || !init) return <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>

  const routeOpts = meta.routes.filter(r => r.mode === mode).map(r => ({ value: r.id, label: `${r.origin} ⇄ ${r.destination} · ไม่เกิน ${fmtMoney(r.max_fare)} บาท/เที่ยว${r.note ? ` (${r.note})` : ''}` }))
  // จัดกลุ่มตามประเภทงบ (เช่น P20 เงินบำรุง แตกหลายรายการ) — ค้นหาได้ทั้งชื่องบและชื่อ/รหัสประเภท
  const budgetOpts = [...meta.budgets.filter(b => b.is_active || b.id === orig?.budget_id)
    .reduce((m, b) => {
      const key = b.budget_type
      if (!m.has(key)) m.set(key, { label: budgetTypeLabel({ name: b.type_name, ref_code: b.type_ref_code }, key), options: [] as { value: number; label: string; search: string }[] })
      m.get(key)!.options.push({ value: b.id, label: `${b.name} (ปีงบ ${b.fiscal_year}) · คงเหลือ ${fmtMoney(b.remaining)} บาท`, search: `${b.type_ref_code ?? ''} ${b.type_name} ${b.name}` })
      return m
    }, new Map<string, { label: string; options: { value: number; label: string; search: string }[] }>()).values()]
  const companionOpts = [...new Map([...options, ...companionIds.map(id => people.get(id)).filter((p): p is Person => !!p)].map(p => [p.id, p])).values()]
    .filter(p => p.id !== me?.id)
    .map(p => ({ value: p.id, label: `${p.name}${p.position ? ` · ${p.position}` : ''} · ${fmtMoney(p.rate)} บาท/วัน${p.fy_trips != null ? ` · ปีงบนี้ไปแล้ว ${p.fy_trips} ครั้ง` : ''}` }))
  const costRows = [
    { key: '6.1', label: 'ค่าเบี้ยเลี้ยงเดินทาง', detail: `${travelers.length} คน × ${days} วัน${meals ? ` − อาหารที่ผู้จัดเลี้ยง ${meals} มื้อ` : ''}`, amount: allowance },
    {
      key: '6.2', label: 'ค่าเช่าที่พัก', amount: lodging,
      detail: lodgingMode === 'lump' ? `เหมาจ่าย ${travelers.length} คน × ${nights} คืน` : lodgingMode === 'actual' ? `จ่ายจริง ${roomCount} ห้อง ${nights} คืน · เพดาน ${fmtMoney(lodgingCap)}` : '',
    },
    { key: '6.3', label: 'ค่าพาหนะเดินทาง', detail: [route ? `${route.origin} ⇄ ${route.destination}` : mode === 'other' ? v.vehicle_other ?? '' : '', extras ? `รวมแท็กซี่/บ้าน↔สถานี ${fmtMoney(extras)}` : ''].filter(Boolean).join(' · '), amount: transport },
    { key: '6.4', label: 'ค่าลงทะเบียน / ค่าธรรมเนียม', detail: '', amount: registration },
    { key: '6.5', label: 'ค่าน้ำมันเชื้อเพลิง / ค่าทางด่วน', detail: fuel ? `${v.distance_km} กม. × ${vehicle?.rate_per_km} บาท${toll ? ` + ทางด่วน ${fmtMoney(toll)}` : ''}` : toll ? `ทางด่วน` : '', amount: fuel + toll },
    { key: '6.6', label: 'ค่าใช้จ่ายอื่น ๆ', detail: v.other_desc ?? '', amount: other },
  ]
  const card = { borderRadius: 14, marginBottom: 16 }
  // โหมดการลงนามตามกลุ่มของผู้ขอ — เดินเอกสารไม่ต้องมีลายเซ็นในระบบ
  const paper = meta.sign_mode === 'paper'
  const moneyInput = (max = 1_000_000) => <InputNumber min={0} max={max} precision={2} style={{ width: '100%' }} suffix="บาท" />

  return (
    <ConfigProvider locale={TH_LOCALE}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 320px', minWidth: 0 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{TRAVEL_MENU[0].icon}</div>
        <div style={{ minWidth: 0 }}>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>{editId ? 'แก้ไขคำขออนุมัติเดินทางไปราชการ' : 'ขออนุมัติเดินทางไปราชการ'}</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>กรอกตามบันทึกข้อความ ระบบคำนวณค่าใช้จ่ายตามอัตราที่งานพัฒนาทรัพยากรบุคคลตั้งไว้ แล้วพิมพ์ PDF เสนอลงนาม</Text>
        </div>
        </div>
        <Link href={TRAVEL_MENU[1].href} data-testid="to-requests">
          <Button type="primary" icon={<span style={{ display: 'inline-flex' }}>{TRAVEL_MENU[1].icon}</span>}>{TRAVEL_MENU[1].title}</Button>
        </Link>
      </div>

      <Form form={form} layout="vertical" requiredMark="optional" onFinish={save} scrollToFirstError initialValues={init}>
        <Row gutter={16}>
          <Col xs={24} xl={16}>
            <Card title="ผู้ขอ" style={card} size="small">
              <Descriptions size="small" column={{ xs: 1, sm: 2 }} items={[
                { key: 'n', label: 'ชื่อ-สกุล', children: me?.name },
                { key: 'p', label: 'ตำแหน่ง', children: me?.position ?? '—' },
                { key: 'u', label: 'กลุ่มงาน', children: me?.unit ?? '—' },
                { key: 'r', label: 'อัตราเบี้ยเลี้ยง', children: <>{fmtMoney(me?.rate ?? 0)} บาท/วัน <Tag style={{ marginLeft: 4 }}>{me?.tier_name}</Tag></> },
                { key: 'l', label: 'สิทธิ์ค่าที่พัก', span: 'filled', children: me?.lodging_class_name ? <>{me.lodging_class_name} <Text type="secondary" style={{ fontSize: 12 }}>(เหมาจ่าย {fmtMoney(me.lump_sum ?? 0)} · ห้องเดี่ยว {fmtMoney(me.single_room ?? 0)} · ห้องคู่ {fmtMoney(me.double_room ?? 0)} บาท/คืน)</Text></> : '—' },
              ]} />
            </Card>

            <Card title="รายละเอียดการเดินทาง" style={card} size="small">
              {/* ช่องที่เลือกเป็นสีทึบให้เห็นชัด — เบิก = สีระบบเดินทาง · ไม่เบิก = เขียว (ตรงกับป้าย "ไม่เบิก" ในรายการ)
                  ConfigProvider ต้องครอบ Form.Item ไม่ใช่อยู่ข้างใน — Form.Item ผูกค่ากับลูกตัวแรกโดยตรง */}
              <ConfigProvider theme={pickTheme(costMode === 'no_claim' ? COST_NO_CLAIM_COLOR : TRAVEL_COLOR)}>
                <Form.Item name="cost_mode" label="ประเภทคำขอ" extra={COST_MODES.find(c => c.value === costMode)?.hint}>
                  <Segmented size="large" options={COST_MODES.map(c => ({ value: c.value, label: c.label }))} aria-label="ประเภทคำขอ"
                    style={{ border: '1px solid var(--app-border-strong)' }}
                    onChange={x => { if (x === 'no_claim' && !NO_CLAIM_MODES.includes(form.getFieldValue('vehicle_mode'))) form.setFieldsValue({ vehicle_mode: 'gov_car' }) }} />
                </Form.Item>
              </ConfigProvider>
              <Form.Item name="memo_no" label="เลขที่บันทึกข้อความ"
                extra="ไม่บังคับ — ยังไม่ได้เลขเว้นว่างได้ แล้วกลับมาแก้ไขคำขอเพื่อใส่เลขได้จนกว่าหัวหน้าจะลงนาม · พิมพ์ต่อท้ายบรรทัด “ที่” ในบันทึกข้อความ"
                rules={[{ max: 30, message: 'ไม่เกิน 30 ตัวอักษร' }, { pattern: MEMO_NO_RE, message: 'ใช้ได้เฉพาะตัวเลข ตัวอักษร - / และ .' }]}>
                <Input prefix={<span style={{ color: "var(--app-text-2)" }}>ที่ {MEMO.docPrefix}</span>} placeholder="เช่น 123" maxLength={30} allowClear style={{ maxWidth: 360 }} aria-label="เลขที่บันทึกข้อความ" />
              </Form.Item>
              <Form.Item name="purpose" label="มีความประสงค์ขออนุมัติเดินทางไปราชการ เพื่อ" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุ' }, { max: 300 }]}>
                <AutoComplete options={['เข้าร่วมประชุม', 'เข้ารับการอบรม', 'ศึกษาดูงาน', 'เป็นวิทยากร', 'ปฏิบัติราชการ', 'ออกหน่วยบริการ', 'ออกเยี่ยมบ้าน'].map(value => ({ value }))} placeholder="เช่น เข้าร่วมประชุมวิชาการ" />
              </Form.Item>
              <Form.Item name="subject" label="๑. เรื่อง/วัตถุประสงค์" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุเรื่อง' }, { max: 1000 }]}>
                <Input.TextArea rows={2} placeholder="ชื่อการประชุม/หลักสูตร และวัตถุประสงค์" />
              </Form.Item>
              <Form.Item name="location" label="๒. สถานที่ไปราชการ" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุสถานที่' }, { max: 300 }]}>
                <Input placeholder="เช่น โรงแรม... อำเภอ... จังหวัด..." />
              </Form.Item>
              {noClaim ? <>
                <Row gutter={12}>
                  <Col xs={24} sm={8}>
                    <Form.Item name="trip_month" label="๓. เดือนที่เดินทาง" rules={[{ required: true, message: 'เลือกเดือน' }]}>
                      <ThaiDatePicker picker="month" format={monthLabel} allowClear={false} style={{ width: '100%' }} aria-label="เดือนที่เดินทาง"
                        onChange={() => form.setFieldsValue({ trip_dates: [] })} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={4}><Form.Item name="day_start" label="ออกเวลา" rules={[{ required: true, message: 'ระบุเวลา' }]}><TimePicker format="HH:mm" minuteStep={5} needConfirm={false} allowClear={false} style={{ width: '100%' }} /></Form.Item></Col>
                  <Col xs={12} sm={4}><Form.Item name="day_end" label="กลับถึงเวลา" dependencies={['day_start']}
                    rules={[{ required: true, message: 'ระบุเวลา' }, ({ getFieldValue }) => ({ validator: (_, x) => x && getFieldValue('day_start') && x.format('HH:mm') <= getFieldValue('day_start').format('HH:mm') ? Promise.reject(new Error('ต้องหลังเวลาออก')) : Promise.resolve() })]}>
                    <TimePicker format="HH:mm" minuteStep={5} needConfirm={false} allowClear={false} style={{ width: '100%' }} /></Form.Item></Col>
                </Row>
                <Form.Item name="trip_dates" label="วันที่เดินทาง (กดเลือกได้หลายวัน)" rules={[{ required: true, type: 'array', min: 1, message: 'เลือกวันที่อย่างน้อย ๑ วัน' }]}>
                  <DayGrid month={v.trip_month} />
                </Form.Item>
                {tripDates.length > 0 && (
                  <Alert type="info" showIcon style={{ marginBottom: 8 }} data-testid="trip-summary"
                    title={`เดินทาง ${tripDates.length} วัน: ${tripDatesText(tripDates, true)}${dayOk ? ` · เวลา ${v.day_start.format('HH.mm')}–${v.day_end.format('HH.mm')} น.` : ''}`}
                    description="ไป-กลับในวันเดียวกันทุกวัน · ไม่เบิกค่าใช้จ่าย" />
                )}
              </> : <>
              <Row gutter={12}>
                <Col xs={14} sm={8}><Form.Item name="start_date" label="๓. ออกเดินทางวันที่" rules={[{ required: true, message: 'ระบุวันที่' }]}><ThaiDatePicker format={DATE_FORMAT} allowClear={false} style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={10} sm={4}><Form.Item name="start_time" label="เวลา" rules={[{ required: true, message: 'ระบุเวลา' }]}><TimePicker format="HH:mm" minuteStep={5} needConfirm={false} allowClear={false} style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={14} sm={8}><Form.Item name="end_date" label="กลับถึงวันที่" rules={[{ required: true, message: 'ระบุวันที่' }]}><ThaiDatePicker format={DATE_FORMAT} allowClear={false} style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={10} sm={4}><Form.Item name="end_time" label="เวลา" rules={[{ required: true, message: 'ระบุเวลา' }]}><TimePicker format="HH:mm" minuteStep={5} needConfirm={false} allowClear={false} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              {startIso && endIso && !timeOk && <Alert type="error" showIcon title="วันเวลากลับต้องหลังวันเวลาออกเดินทาง" style={{ marginBottom: 8 }} />}
              {calc && dur && (
                <Alert type="info" showIcon style={{ marginBottom: 8 }}
                  title={`รวมระยะเวลา ${dur.days} วัน ${dur.hours} ชั่วโมง${dur.minutes ? ` ${dur.minutes} นาที` : ''} · ${calc.overnight ? 'พักแรม' : 'ไม่พักแรม'} · เบิกเบี้ยเลี้ยงได้ ${calc.days} วัน`}
                  description="๒๔ ชั่วโมงนับ ๑ วัน เศษเกิน ๑๒ ชั่วโมงนับ ๑ วัน ไม่พักแรมเศษเกิน ๖ ชั่วโมงนับครึ่งวัน" />
              )}
              </>}
            </Card>

            <Card title="๔. ผู้ร่วมเดินทาง" style={card} size="small">
              <Form.Item name="companion_ids" label="ค้นหาชื่อบุคลากร (ไม่ต้องใส่ตัวเอง)" extra="อัตราเบี้ยเลี้ยงของแต่ละคนดึงจากที่งานพัฒนาทรัพยากรบุคคลตั้งไว้">
                <Select mode="multiple" showSearch filterOption={false} onSearch={setQ} options={companionOpts} placeholder="พิมพ์ชื่ออย่างน้อย 2 ตัวอักษร"
                  notFoundContent={searching ? <Spin size="small" /> : q.trim().length < 2 ? 'พิมพ์ชื่อเพื่อค้นหา' : 'ไม่พบ'} maxCount={49} />
              </Form.Item>
              <Table size="small" pagination={false} rowKey="id" dataSource={travelers} scroll={{ x: 'max-content' }}
                columns={[
                  { title: 'ผู้เดินทาง', dataIndex: 'name', render: (n: string, p: Person) => <>{n}{p.id === me?.id && <Tag style={{ marginLeft: 6 }}>ผู้ขอ</Tag>}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{p.position ?? ''}</div></> },
                  { title: 'ปีงบนี้ไปแล้ว', dataIndex: 'fy_trips', align: 'center', width: 110, render: (n?: number) => n == null ? '—' : <Tag color={n > 0 ? 'gold' : undefined} style={{ margin: 0 }}>{n} ครั้ง</Tag> },
                  ...(noClaim ? [] : [
                    { title: 'อัตรา (บาท/วัน)', dataIndex: 'rate', align: 'right' as const, width: 130, render: (r: number) => fmtMoney(r) },
                    { title: 'เบี้ยเลี้ยง', align: 'right' as const, width: 120, render: (_: unknown, p: Person) => fmtMoney(round2(p.rate * days)) },
                  ]),
                  ...(mode === 'plane' ? [{ title: 'สิทธิ์เครื่องบิน', dataIndex: 'flight_class', width: 120, render: (f?: FlightClass) => f ? <Tag color={f === 'business' ? 'purple' : undefined}>{FLIGHT_LABEL[f]}</Tag> : '—' }] : []),
                ]} />
            </Card>

            <Card title="๕. ยานพาหนะที่ใช้ในการเดินทาง" style={card} size="small">
              <ConfigProvider theme={pickTheme(TRAVEL_COLOR)}>
                <Form.Item name="vehicle_mode" rules={[{ required: true, message: 'เลือกยานพาหนะ' }]}>
                  <Radio.Group optionType="button" buttonStyle="solid" options={noClaim ? VEHICLE_MODES.filter(m => NO_CLAIM_MODES.includes(m.value)) : VEHICLE_MODES} />
                </Form.Item>
              </ConfigProvider>
              {mode === 'private' && (
                <Row gutter={12}>
                  <Col xs={24} sm={8}><Form.Item name="vehicle_id" label="ประเภทรถ" rules={[{ required: !noClaim, message: 'เลือกประเภทรถ' }]}>
                    <Select allowClear={noClaim} options={meta.vehicles.map(x => ({ value: x.id, label: noClaim ? x.name : `${x.name} · ${fmtMoney(x.rate_per_km)} บาท/กม.` }))} />
                  </Form.Item></Col>
                  <Col xs={12} sm={6}><Form.Item name="vehicle_plate" label="ทะเบียน" rules={[{ required: true, whitespace: true, message: 'ระบุทะเบียน' }, { max: 50 }]}><Input placeholder="กข 1234 พะเยา" /></Form.Item></Col>
                  <Col xs={12} sm={5}><Form.Item name="distance_km" label={noClaim ? 'ระยะทาง (ต่อวัน)' : 'ระยะทางไป-กลับ'} rules={[{ required: !noClaim, message: 'ระบุระยะทาง' }]}><InputNumber min={0.1} max={5000} precision={1} style={{ width: '100%' }} suffix="กม." /></Form.Item></Col>
                  {!noClaim && <Col xs={24} sm={5}><Form.Item name="toll_amount" label="ค่าทางด่วน">{moneyInput(100_000)}</Form.Item></Col>}
                </Row>
              )}
              {mode === 'gov_car' && (
                <Row gutter={12}>
                  <Col xs={12} sm={8}><Form.Item name="vehicle_plate" label="ทะเบียนรถราชการ" rules={[{ max: 50 }]}><Input /></Form.Item></Col>
                  {!noClaim && <Col xs={12} sm={8}><Form.Item name="toll_amount" label="ค่าทางด่วน">{moneyInput(100_000)}</Form.Item></Col>}
                  <Col xs={24}>
                    <Form.Item name="vehicle_request" valuePropName="checked" style={{ marginBottom: 8 }}>
                      <Checkbox>ขออนุมัติใช้รถราชการ <Text type="secondary" style={{ fontSize: 12 }}>(ต้องแนบหนังสือขออนุมัติใช้รถ)</Text></Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
              )}
              {(mode === 'bus' || mode === 'plane') && (
                routeOpts.length === 0
                  ? <Alert type="warning" showIcon title={`ยังไม่มีเส้นทาง${mode === 'bus' ? 'รถโดยสาร' : 'เครื่องบิน'}ที่งานพัฒนาทรัพยากรบุคคลตั้งไว้`} description="แจ้งงานพัฒนาทรัพยากรบุคคลเพิ่มเส้นทาง หรือเลือก “อื่น ๆ”" />
                  : <Row gutter={12}>
                    <Col xs={24} sm={14}><Form.Item name="route_id" label="เส้นทาง" rules={[{ required: true, message: 'เลือกเส้นทาง' }]}>
                      <Select showSearch optionFilterProp="label" options={routeOpts} onChange={onRouteChange} />
                    </Form.Item></Col>
                    <Col xs={24} sm={10}><Form.Item name="transport_amount" label="ค่าพาหนะที่ขอเบิก (ไป-กลับ ทุกคน)" extra={cap != null ? `ไม่เกิน ${fmtMoney(cap)} บาท (${fmtMoney(route!.max_fare)} × 2 เที่ยว × ${travelers.length} คน)` : undefined}
                      rules={[{ required: true, message: 'ระบุค่าพาหนะ' }, { validator: (_, x) => cap != null && x > cap ? Promise.reject(new Error(`เกินเพดาน ${fmtMoney(cap)} บาท`)) : Promise.resolve() }]}>
                      {moneyInput(cap ?? 1_000_000)}
                    </Form.Item></Col>
                    {mode === 'plane' && <Col xs={24}><Text type="secondary" style={{ fontSize: 12.5 }}>
                      ชั้นธุรกิจสำหรับผู้บริหารระดับสูง · ชั้นประหยัดสำหรับระดับชำนาญการพิเศษ/อาวุโสลงมา (ดูสิทธิ์รายคนในตารางผู้เดินทาง) · ค่าบริการเลือกที่นั่งเบิกไม่ได้
                    </Text></Col>}
                  </Row>
              )}
              {mode === 'other' && (
                <Row gutter={12}>
                  <Col xs={24} sm={14}><Form.Item name="vehicle_other" label="ระบุยานพาหนะ" rules={[{ required: true, whitespace: true, message: 'ระบุยานพาหนะ' }, { max: 200 }]}><Input placeholder="เช่น รถไฟ, รถตู้รับจ้าง" /></Form.Item></Col>
                  {!noClaim && <Col xs={24} sm={10}><Form.Item name="transport_amount" label="ค่าพาหนะ">{moneyInput()}</Form.Item></Col>}
                </Row>
              )}

              {!noClaim && (mode === 'bus' || mode === 'plane' || mode === 'other') && (
                <div className="lodging-box" data-testid="transport-extras">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <Text strong>ค่าพาหนะย่อย <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>(รวมใน ๖.๓ ค่าพาหนะเดินทาง · ไม่มีใบเสร็จใช้แบบ บก.๑๑๑)</Text></Text>
                    <Button size="small" onClick={() => form.setFieldsValue({ taxi_go_amount: TAXI_RATE, taxi_back_amount: TAXI_RATE })}>ใส่ค่าแท็กซี่ {TAXI_RATE} / {TAXI_RATE} บาท</Button>
                  </div>
                  <Row gutter={12}>
                    <Col xs={12} sm={8}><Form.Item name="taxi_go_amount" label="แท็กซี่ขาไป" extra={`${STATION} → ที่พัก`}>{moneyInput(100_000)}</Form.Item></Col>
                    <Col xs={12} sm={8}><Form.Item name="taxi_back_amount" label="แท็กซี่ขากลับ" extra={`ที่พัก → ${STATION}`}>{moneyInput(100_000)}</Form.Item></Col>
                  </Row>
                  <div className="hs-box" data-testid="home-station">
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>ค่ารถรับจ้าง ที่พัก/บ้าน ↔ {STATION}ต้นทาง <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>(ในจังหวัดพะเยา เบิกตามจ่ายจริงไม่เกินอัตราที่ สสจ.พะเยา กำหนด · บาท/เที่ยว/คน)</Text></Text>
                    <Row gutter={12}>
                      <Col xs={24} sm={9}>
                        <Form.Item name="home_station_rate_id" label="อำเภอที่ขึ้นรถ" dependencies={['home_station_amount']}
                          rules={[({ getFieldValue }) => ({ validator: (_, x) => !x && (getFieldValue('home_station_amount') ?? 0) > 0 ? Promise.reject(new Error('เลือกอำเภอที่ขึ้นรถ')) : Promise.resolve() })]}>
                          <Select allowClear placeholder="ไม่เบิก" aria-label="อำเภอที่ขึ้นรถ" popupMatchSelectWidth={false}
                            onChange={(id?: number) => { if (!id) form.setFieldsValue({ home_station_amount: undefined, home_station_from: undefined, home_station_to: undefined }); else fillHs(id, hsTrips) }}
                            options={localRates.map(r => ({ value: r.id, label: <span>{r.district} <Text type="secondary" style={{ fontSize: 12 }}>{r.rate} บาท{r.note ? ` · ${r.note}` : ''}</Text></span> }))}
                            labelRender={o => { const r = localRates.find(x => x.id === o.value); return r ? `อ.${r.district} · ${r.rate} บาท/เที่ยว/คน` : o.label }} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={7}>
                        <ConfigProvider theme={pickTheme(TRAVEL_COLOR)}>
                          <Form.Item name="home_station_trips" label="จำนวนเที่ยว">
                            <Segmented block disabled={!hsRate} options={[{ value: 2, label: 'ไป-กลับ' }, { value: 1, label: 'เที่ยวเดียว' }]} onChange={t => fillHs(v.home_station_rate_id, Number(t))}
                              style={{ border: '1px solid var(--app-border-strong)' }} />
                          </Form.Item>
                        </ConfigProvider>
                      </Col>
                      <Col xs={12} sm={8}>
                        <Form.Item name="home_station_amount" label="จ่ายจริง" dependencies={['home_station_rate_id', 'home_station_trips', 'companion_ids']}
                          extra={hsRate ? `ไม่เกิน ${fmtMoney(hsCap ?? 0)} บาท (${hsRate.rate} × ${hsTrips} เที่ยว × ${travelers.length} คน)` : undefined}
                          rules={[{ validator: (_, x) => hsCap != null && (x ?? 0) > hsCap ? Promise.reject(new Error(`เบิกได้ไม่เกิน ${fmtMoney(hsCap)} บาท`)) : Promise.resolve() }]}>
                          <InputNumber min={0} max={100_000} precision={2} style={{ width: '100%' }} suffix="บาท" disabled={!hsRate} aria-label="ค่ารถรับจ้างจ่ายจริง" />
                        </Form.Item>
                      </Col>
                      {hsRate && <>
                        <Col xs={24} sm={12}>
                          <Form.Item name="home_station_from" label="ขึ้นรถที่" rules={[{ required: true, whitespace: true, message: 'ระบุจุดขึ้นรถ' }, { max: 200 }]}>
                            <Input placeholder={hsRate.note ? `เช่น ${hsRate.note.split('→')[0].trim()}` : `เช่น บ้านพัก อ.${hsRate.district}`} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item name="home_station_to" label={`ไปขึ้น${mode === 'plane' ? 'เครื่องบิน' : 'รถ'}ที่`} rules={[{ required: true, whitespace: true, message: `ระบุ${STATION}ที่ไปขึ้น` }, { max: 200 }]}>
                            <AutoComplete options={STATION_OPTS} placeholder={`ชื่อ${STATION}`} filterOption={(i, o) => !!o?.value.includes(i.trim())} />
                          </Form.Item>
                        </Col>
                      </>}
                    </Row>
                  </div>
                </div>
              )}
            </Card>

            <Card title="เอกสารแนบ" style={card} size="small" data-testid="attach-card">
              {editId && orig
                ? <RequestFiles requestId={editId} files={orig.files ?? []} mode={mode} costMode={costMode} vehicleRequest={v.vehicle_request} editable onChanged={() => { setFileErr({}); reloadFiles() }} />
                : requiredKinds(mode, costMode, v.vehicle_request).length === 0 ? <Text type="secondary">ไม่ต้องแนบเอกสาร (แนบหนังสือต้นเรื่องได้ที่รายละเอียดคำขอหลังยื่น)</Text>
                : requiredKinds(mode, costMode, v.vehicle_request).map(k => (
                  <PendingFilePicker key={k} kind={k} value={pending[k]} error={fileErr[k]}
                    onChange={v => { setPending(p => ({ ...p, [k]: v })); if (v.length) setFileErr(e => ({ ...e, [k]: undefined })) }} />
                ))}
              {editId && Object.values(fileErr).some(Boolean) && <Text type="danger" style={{ fontSize: 12.5 }}>{Object.values(fileErr).filter(Boolean).join(' · ')}</Text>}
            </Card>

            {!noClaim && <Card title="๖. ประมาณการค่าใช้จ่าย" style={card} size="small">
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="allowance_days_mode" label="จำนวนวันเบี้ยเลี้ยง">
                    <Radio.Group options={[{ value: 'auto', label: `ตามระยะเวลา (${calc?.days ?? '-'} วัน)` }, { value: 'manual', label: 'ระบุเอง' }]} />
                  </Form.Item>
                </Col>
                {v.allowance_days_mode === 'manual' && (
                  <Col xs={24} sm={12}>
                    <Form.Item name="allowance_days" label="วันที่ขอเบิก" extra="ลดได้ แต่เพิ่มเกินที่นับได้ไม่ได้ · มีอาหารเลี้ยงให้ระบุจำนวนมื้อด้านล่างแทน"
                      rules={[{ required: true, message: 'ระบุจำนวนวัน' }, { validator: (_, x) => calc && x > calc.days ? Promise.reject(new Error(`ไม่เกิน ${calc.days} วัน`)) : Promise.resolve() }]}>
                      <InputNumber min={0} max={calc?.days ?? 60} step={0.5} precision={1} style={{ width: '100%' }} suffix="วัน" />
                    </Form.Item>
                  </Col>
                )}
              </Row>
              {/* ๖.๑ มื้อที่ผู้จัดเลี้ยง — หักมื้อละ ๑/๓ ของอัตราต่อวันของแต่ละคน */}
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="meals_provided" label="มื้ออาหารที่ผู้จัดเลี้ยง (ประชุม/อบรม)" dependencies={['allowance_days', 'allowance_days_mode', 'start_date', 'start_time', 'end_date', 'end_time']}
                    extra={meals > 0 ? `หักเบี้ยเลี้ยงรวม ${fmtMoney(mealDeduct)} บาท (${[...new Set(travelers.map(t => t.rate))].map(r => `อัตรา ${fmtMoney(r)} หักมื้อละ ${fmtMoney(mealCut(r))}`).join(' · ')} บาท)` : 'เช่น ผู้จัดเลี้ยงอาหารกลางวัน ๒ วัน = ๒ มื้อ · หักมื้อละ ๑ ใน ๓ ของอัตรา (๒๔๐ บาท/วัน หักมื้อละ ๘๐ บาท)'}
                    rules={[{ validator: (_, x) => typeof x === 'number' && x > maxMeals(days) ? Promise.reject(new Error(`ไม่เกิน ${maxMeals(days)} มื้อ (${days} วัน × ๓ มื้อ)`)) : Promise.resolve() }]}>
                    <InputNumber min={0} max={Math.max(0, maxMeals(days))} step={1} precision={0} style={{ width: '100%' }} suffix="มื้อ" placeholder="0" />
                  </Form.Item>
                </Col>
              </Row>
              {/* ๖.๒ ค่าเช่าที่พัก — ทั้งคณะเลือกรูปแบบเดียวกัน */}
              <div className="lodging-box">
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <ConfigProvider theme={pickTheme(TRAVEL_COLOR)}>
                    <Form.Item name="lodging_mode" label="๖.๒ ค่าเช่าที่พัก (ทั้งคณะใช้รูปแบบเดียวกัน)"
                      extra={timeOk && maxNights === 0 ? 'ไป-กลับวันเดียว เบิกค่าที่พักไม่ได้' : LODGING_MODES.find(m => m.value === lodgingMode)?.hint || undefined}
                      rules={[{ validator: (_, x) => x && x !== 'none' && timeOk && maxNights === 0 ? Promise.reject(new Error('ไป-กลับวันเดียว เบิกค่าที่พักไม่ได้')) : Promise.resolve() }]}>
                      <Radio.Group optionType="button" buttonStyle="solid" onChange={e => { if (e.target.value !== 'none' && !form.getFieldValue('lodging_nights') && maxNights > 0) form.setFieldsValue({ lodging_nights: maxNights }) }}
                        options={LODGING_MODES.map(m => ({ value: m.value, label: m.label, disabled: m.value !== 'none' && timeOk && maxNights === 0 }))} />
                    </Form.Item>
                    </ConfigProvider>
                  </Col>
                  {lodgingMode !== 'none' && (
                    <Col xs={12} md={5}>
                      <Form.Item name="lodging_nights" label="จำนวนคืน" extra={maxNights ? `ไม่เกิน ${maxNights} คืน` : undefined}
                        rules={[{ required: true, message: 'ระบุจำนวนคืน' }, { validator: (_, x) => x > maxNights ? Promise.reject(new Error(`ไม่เกิน ${maxNights} คืน`)) : Promise.resolve() }]}>
                        <InputNumber min={1} max={Math.max(maxNights, 1)} precision={0} style={{ width: '100%' }} suffix="คืน" />
                      </Form.Item>
                    </Col>
                  )}
                  {lodgingMode === 'actual' && (
                    <Col xs={12} md={7}>
                      <Form.Item name="lodging_amount" label="ขอเบิก (ตามใบเสร็จ)" extra={<>ไม่เกิน {fmtMoney(lodgingCap)} บาท {lodgingCap > 0 && <a onClick={() => form.setFieldsValue({ lodging_amount: lodgingCap })}>ใส่เต็มเพดาน</a>}</>}
                        rules={[{ required: true, message: 'ระบุค่าที่พัก' }, { validator: (_, x) => x > lodgingCap ? Promise.reject(new Error(`เกินเพดาน ${fmtMoney(lodgingCap)} บาท`)) : x === 0 ? Promise.reject(new Error('ต้องมากกว่า 0')) : Promise.resolve() }]}>
                        {moneyInput(1_000_000)}
                      </Form.Item>
                    </Col>
                  )}
                </Row>
                {lodgingMode !== 'none' && (
                  <Table size="small" pagination={false} rowKey="id" dataSource={travelers} scroll={{ x: 'max-content' }} style={{ marginBottom: 8 }}
                    columns={[
                      { title: 'ผู้เดินทาง', dataIndex: 'name', render: (n: string, p: Person) => <>{n}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{p.lodging_class_name ?? ''}</div></> },
                      ...(lodgingMode === 'actual' ? [{
                        title: 'ห้องพัก', width: 140, render: (_: unknown, p: Person) => (
                          <ConfigProvider theme={pickTheme(TRAVEL_COLOR)}>
                            <Segmented size="small" value={roomOf(p)} onChange={x => setRooms(r => ({ ...r, [p.id]: x as RoomType }))} aria-label={`ห้องพักของ ${p.name}`}
                              options={[{ value: 'single', label: 'เดี่ยว' }, { value: 'double', label: 'คู่' }]} />
                          </ConfigProvider>
                        ),
                      }] : []),
                      { title: 'บาท/คืน', align: 'right' as const, width: 90, render: (_: unknown, p: Person) => fmtMoney(lodgingRate(p)) },
                      { title: `เพดาน (${nights} คืน)`, align: 'right' as const, width: 120, render: (_: unknown, p: Person) => fmtMoney(round2(lodgingRate(p) * nights)) },
                    ]}
                    summary={() => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={lodgingMode === 'actual' ? 3 : 2}><Text strong>{lodgingMode === 'lump' ? 'เหมาจ่ายรวม' : `เพดานรวม · ${roomCount} ห้อง`}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right"><Text strong data-testid="lodging-cap">{fmtMoney(lodgingCap)}</Text></Table.Summary.Cell>
                      </Table.Summary.Row>
                    )} />
                )}
                {needLodgingNote && (
                  <Form.Item name="lodging_note" label="เหตุผลที่พักห้องเดี่ยว" extra="ไปเป็นคณะให้พักห้องคู่ เว้นแต่ไม่เหมาะสม เช่น ต่างเพศ หรือมีเหตุจำเป็น"
                    rules={[{ required: true, whitespace: true, message: 'ระบุเหตุผล' }, { max: 300 }]}>
                    <Input placeholder="เช่น ผู้ร่วมเดินทางต่างเพศ" />
                  </Form.Item>
                )}
              </div>
              <Row gutter={12}>
                <Col xs={24} sm={12}><Form.Item name="registration_amount" label="ค่าลงทะเบียน / ค่าธรรมเนียม">{moneyInput()}</Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item name="other_amount" label="ค่าใช้จ่ายอื่น ๆ">{moneyInput()}</Form.Item></Col>
                {other > 0 && <Col xs={24}><Form.Item name="other_desc" label="ระบุค่าใช้จ่ายอื่น ๆ" rules={[{ required: true, whitespace: true, message: 'ระบุรายการ' }, { max: 200 }]}><Input /></Form.Item></Col>}
              </Row>
            </Card>}
          </Col>

          {/* สรุปยอด + งบ — ติดด้านขวาบนจอกว้าง */}
          <Col xs={24} xl={8}>
            <div className="travel-summary">
              {noClaim ? (
                <Card title="สรุปคำขอ" style={card} size="small" data-testid="no-claim-summary">
                  <Tag color="green" style={{ marginBottom: 8 }}>ไม่เบิกค่าใช้จ่าย</Tag>
                  <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                    <div>วันที่เดินทาง: <b>{tripDates.length ? tripDatesText(tripDates) : '-'}</b> ({tripDates.length} วัน)</div>
                    <div>ผู้เดินทาง: <b>{travelers.length}</b> คน</div>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>ขออนุมัติเดินทางอย่างเดียว ไม่คำนวณเบี้ยเลี้ยง ค่าที่พัก ค่าพาหนะ และไม่ใช้งบประมาณ</Text>
                </Card>
              ) : <>
              <Card title="สรุปค่าใช้จ่าย" style={card} size="small">
                <Table size="small" pagination={false} rowKey="key" dataSource={costRows} showHeader={false}
                  columns={[
                    { dataIndex: 'label', render: (l: string, r) => <><div style={{ fontSize: 13 }}>{r.key} {l}</div>{r.detail && <div style={{ fontSize: 11.5, color: 'var(--app-text-3)' }}>{r.detail}</div>}</> },
                    { dataIndex: 'amount', align: 'right', width: 100, render: (a: number) => a > 0 ? fmtMoney(a) : <Text type="secondary">-</Text> },
                  ]} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
                  <Text strong>รวมทั้งสิ้น</Text>
                  <span style={{ fontSize: 22, fontWeight: 700, color: TRAVEL_COLOR }} data-testid="total">{money(total)}</span>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>({bahtText(total)})</Text>
              </Card>
              <Card title="งบประมาณที่ใช้" style={card} size="small">
                {budgetOpts.length === 0
                  ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีงบที่เปิดใช้ — แจ้งงานพัฒนาทรัพยากรบุคคล" />
                  : <Form.Item name="budget_id" rules={[{ required: true, message: 'เลือกงบประมาณ' }]} style={{ marginBottom: 8 }}>
                    <Select options={budgetOpts} placeholder="เลือกงบประมาณ (พิมพ์ค้นหาชื่องบหรือรหัส เช่น P20)" popupMatchSelectWidth={false} showSearch
                      filterOption={(q, o) => !!o && 'search' in o && String(o.search).toLowerCase().includes(q.trim().toLowerCase())} />
                  </Form.Item>}
                {budget && (
                  <div style={{ fontSize: 12.5, color: 'var(--app-text-2)', lineHeight: 1.7 }}>
                    <div>วงเงิน {money(budget.amount)} · คงเหลือตามยอดที่การเงินยืนยัน <b>{money(budget.remaining)}</b></div>
                    {otherPending > 0 && <div>คำขออื่นรอการเงินยืนยัน {money(otherPending)}</div>}
                  </div>
                )}
                {budget && projected < 0 && (
                  <Alert type="warning" showIcon style={{ marginTop: 8 }} title={`ประมาณการเกินงบคงเหลือ ${money(-projected)}`}
                    description="ยื่นได้ แต่ควรแจ้งงานพัฒนาทรัพยากรบุคคลก่อน — งบจะถูกตัดเมื่อการเงินยืนยันยอดจริง" />
                )}
              </Card>
              </>}
              <Card title="การลงนามและสายอนุมัติ" style={card} size="small">
                {paper ? <>
                  <Alert type="info" showIcon style={{ marginBottom: 10 }} data-testid="paper-mode" title="กลุ่มของท่านใช้การเดินเอกสาร"
                    description="ยื่นแล้วพิมพ์บันทึกข้อความ ลงนามจริงและเสนอตามลำดับด้านล่าง งานพัฒนาทรัพยากรบุคคลบันทึกผลตามเอกสารที่ลงนามแล้ว" />
                  <ol className="travel-chain" data-testid="approval-chain">
                    <li><b>ผู้ขอ</b> ลงนามบนบันทึกข้อความ</li>
                    {meta.approval_chain?.map(s => (
                      <li key={s.step}><b>{s.level_name}</b> {s.is_acting ? '(รักษาการ) ' : ''}{s.approver_name} — ให้ความเห็นและลงนาม</li>
                    ))}
                    <li><b>ผู้อำนวยการ</b> ลงนามอนุมัติ</li>
                  </ol>
                </> : <>
                {signature === undefined ? <Spin size="small" />
                  : signature ? <div style={{ marginBottom: 10 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>ลงนามผู้ขอด้วยลายเซ็นในบัญชีเมื่อกดยื่น</Text>
                    <SignaturePreview src={signature} height={44} />
                  </div>
                  : <Alert type="warning" showIcon style={{ marginBottom: 10 }} data-testid="no-signature"
                    title="ยังไม่ได้ตั้งค่าลายเซ็น — ยื่นคำขอไม่ได้"
                    description={<Space wrap size={6} style={{ marginTop: 4 }}>
                      <Link href="/account/settings?tab=signature" target="_blank" rel="noopener noreferrer"><Button size="small" type="primary">ตั้งค่าลายเซ็น</Button></Link>
                      <Button size="small" loading={checkingSig} onClick={checkSignature}>ตั้งแล้ว ตรวจอีกครั้ง</Button>
                    </Space>} />}
                <ol className="travel-chain" data-testid="approval-chain">
                  <li><b>ผู้ขอ</b> ลงนามในระบบ</li>
                  {meta.approval_chain?.map(s => (
                    <li key={s.step}><b>{s.level_name}</b> {s.is_acting ? '(รักษาการ) ' : ''}{s.approver_name} — อนุมัติและลงนามในระบบ</li>
                  ))}
                  <li><b>ผู้อำนวยการ</b> ลงนามจริงบนบันทึกข้อความที่พิมพ์</li>
                </ol>
                {meta.approval_chain?.length === 0 &&<Text type="secondary" style={{ fontSize: 12 }}>ไม่มีหัวหน้าในสายที่ต้องอนุมัติในระบบ — เสนอผู้อำนวยการโดยตรง</Text>}
                </>}
                {editId && <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>บันทึกการแก้ไขแล้วสายอนุมัติและโหมดการลงนามคิดใหม่ตามผังปัจจุบัน</Text>}
              </Card>
              {!noClaim && <Card title="หลักฐานที่ต้องใช้เบิกจ่าย" style={card} size="small">
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7, color: 'var(--app-text-2)' }} data-testid="required-docs">
                  {requiredDocs({ vehicle_mode: mode, lodging_mode: lodgingMode, registration_amount: registration, transport_amount: fare, extras_amount: extras }).map(x => <li key={x}>{x}</li>)}
                </ol>
                {lodgingMode === 'lump' && <Text type="secondary" style={{ fontSize: 12 }}>ค่าที่พักแบบเหมาจ่ายไม่ต้องแนบใบเสร็จ</Text>}
              </Card>}
              <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
                <Link href={`${TRAVEL_BASE}/requests`}><Button>ยกเลิก</Button></Link>
                <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving} disabled={!dateOk || (!paper && !signature)}>
                  {editId ? 'บันทึกการแก้ไข' : 'ยื่นคำขอและพิมพ์'}
                </Button>
              </Space>
            </div>
          </Col>
        </Row>
      </Form>
      <style jsx global>{`
        @media (min-width: 1200px) { .travel-summary { position: sticky; top: 80px; } }
        .travel-chain { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.7; color: var(--app-text-2); }
        .lodging-box { border: 1px solid var(--app-border); border-radius: 12px; padding: 12px 12px 4px; margin-bottom: 16px; }
        .hs-box { border-top: 1px dashed var(--app-border); padding-top: 10px; }
        .day-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 44px)); gap: 6px; }
        .dg-h { text-align: center; font-size: 12px; color: var(--app-text-3); }
        .dg-d { height: 36px; border-radius: 8px; border: 1px solid var(--app-border); background: var(--app-surface); color: var(--app-text); cursor: pointer; font-size: 14px; }
        .dg-d.we { color: #dc2626; }
        .dg-d:hover { border-color: ${TRAVEL_COLOR}; }
        .dg-d.on { background: ${TRAVEL_COLOR}; border-color: ${TRAVEL_COLOR}; color: #fff; font-weight: 600; }
        .dg-d:focus-visible { outline: 2px solid ${TRAVEL_COLOR}; outline-offset: 2px; }
      `}</style>
    </ConfigProvider>
  )
}

export default function TravelRequestPage() {
  return (
    <TravelShell current={TRAVEL_MENU[0].title}>
      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}><Spin /></div>}>
        <RequestForm />
      </Suspense>
    </TravelShell>
  )
}
