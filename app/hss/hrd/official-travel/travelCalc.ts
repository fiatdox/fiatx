// คำนวณ/จัดรูปแบบที่ใช้ร่วมกันระหว่างแบบฟอร์มขออนุมัติกับ PDF — ไม่มี JSX (ใช้ใน react-pdf ได้)
// สูตรนับวันต้องตรงกับ backend: hrdTravelRequestController.allowanceDays

export type VehicleMode = 'gov_car' | 'private' | 'bus' | 'plane' | 'other'
export type BudgetType = 'hospital' | 'budget' | 'project'

export const VEHICLE_MODES: { value: VehicleMode; label: string }[] = [
  { value: 'gov_car', label: 'รถยนต์ราชการ' },
  { value: 'private', label: 'รถส่วนตัว' },
  { value: 'bus', label: 'รถโดยสารประจำทาง' },
  { value: 'plane', label: 'เครื่องบิน' },
  { value: 'other', label: 'อื่น ๆ' },
]
export const BUDGET_TYPES: Record<BudgetType, string> = { hospital: 'เงินบำรุงโรงพยาบาล', budget: 'งบประมาณ', project: 'โครงการ' }

/** ข้อความหัวบันทึกข้อความ — ตามแบบฟอร์มกระดาษของงานพัฒนาทรัพยากรบุคคล */
/** เลขที่บันทึกข้อความ (ส่วนหลัง docPrefix) — ตรงกับ backend: ตัวเลขไทย/อารบิก ตัวอักษร - / . ช่องว่าง */
export const MEMO_NO_RE = /^[0-9๐-๙A-Za-zก-ฮ.\-/ ]*$/
export const MEMO = {
  org: 'กลุ่มงานพัฒนาทรัพยากรบุคคล โรงพยาบาลพะเยา โทร ๒๕๓๗',
  docPrefix: 'พย.๐๐๓๓.๒๐๒/',
  subject: 'ขออนุมัติเดินทางไปราชการและเบิกค่าใช้จ่ายในการเดินทางไปราชการ',
  to: 'ผู้อำนวยการโรงพยาบาลพะเยา',
  hospital: 'โรงพยาบาลพะเยา',
}

const TZ_OFFSET_MS = 7 * 3600 * 1000
const dayKey = (ms: number) => new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10)

/**
 * จำนวนวันเบี้ยเลี้ยงตามระเบียบกระทรวงการคลังว่าด้วยค่าใช้จ่ายในการเดินทางไปราชการ
 * ๒๔ ชม. = ๑ วัน · เศษเกิน ๑๒ ชม. = ๑ วัน · ไม่พักแรม (ไม่ข้ามวัน) เศษเกิน ๖ ชม. = ครึ่งวัน
 */
export const allowanceDays = (startMs: number, endMs: number) => {
  const hours = (endMs - startMs) / 3_600_000
  const overnight = dayKey(startMs) !== dayKey(endMs)
  const full = Math.floor(hours / 24)
  const rem = hours - full * 24
  const extra = rem > 12 ? 1 : !overnight && rem > 6 ? 0.5 : 0
  return { hours, overnight, days: full + extra }
}

/** จำนวนคืนสูงสุดที่เบิกค่าที่พักได้ = จำนวนวันตามปฏิทิน (เวลาไทย) ที่ข้ามไป — ตรงกับ backend tripNights */
export const tripNights = (startMs: number, endMs: number) =>
  Math.max(0, Math.round((Date.parse(dayKey(endMs)) - Date.parse(dayKey(startMs))) / 86_400_000))

// ── ค่าเช่าที่พัก ──
export type LodgingMode = 'none' | 'lump' | 'actual'
export type RoomType = 'single' | 'double'
export type FlightClass = 'business' | 'economy'
export const LODGING_MODES: { value: LodgingMode; label: string; hint: string }[] = [
  { value: 'none', label: 'ไม่เบิก', hint: '' },
  { value: 'lump', label: 'เหมาจ่าย', hint: 'ไม่ต้องแนบหลักฐาน' },
  { value: 'actual', label: 'จ่ายจริง', hint: 'ต้องแนบใบเสร็จ' },
]
export const ROOM_LABEL: Record<RoomType, string> = { single: 'ห้องพักเดี่ยว', double: 'ห้องพักคู่' }
export const FLIGHT_LABEL: Record<FlightClass, string> = { business: 'ชั้นธุรกิจ', economy: 'ชั้นประหยัด' }

/** หลักฐานที่ต้องใช้เบิกจ่าย ตามรูปแบบการเดินทางและค่าใช้จ่ายของคำขอ */
/** ค่าพาหนะย่อย (แท็กซี่ไป/กลับ + บ้าน↔สถานี) */
export const transportExtras = (d: { taxi_go_amount?: number | null; taxi_back_amount?: number | null; home_station_amount?: number | null }) =>
  round2((d.taxi_go_amount ?? 0) + (d.taxi_back_amount ?? 0) + (d.home_station_amount ?? 0))
/** ๖.๓ ค่าพาหนะเดินทางทั้งหมด = ค่าโดยสาร + ค่าพาหนะย่อย */
export const transportTotal = (d: { transport_amount?: number | null; taxi_go_amount?: number | null; taxi_back_amount?: number | null; home_station_amount?: number | null }) =>
  round2((d.transport_amount ?? 0) + transportExtras(d))

export const requiredDocs = (d: { vehicle_mode?: VehicleMode; lodging_mode?: LodgingMode; registration_amount?: number; transport_amount?: number; extras_amount?: number }) => {
  const docs = ['หนังสืออนุมัติเดินทาง (บันทึกข้อความนี้ที่ลงนามแล้ว)', 'แบบรายงานการเดินทาง (แบบ ๘๗๐๘)']
  if (d.lodging_mode === 'actual') docs.push('ใบเสร็จรับเงินค่าที่พัก (เบิกแบบจ่ายจริง)')
  if (d.vehicle_mode === 'plane') docs.push('ใบเสร็จรับเงินค่าโดยสาร / กากบัตรโดยสาร (Boarding Pass) — ค่าบริการเลือกที่นั่งเบิกไม่ได้')
  if ((d.vehicle_mode === 'bus' || d.vehicle_mode === 'other') && (d.transport_amount ?? 0) > 0) docs.push('ใบรับรองแทนใบเสร็จรับเงิน (แบบ บก.๑๑๑) สำหรับค่าพาหนะรับจ้างที่ไม่มีใบเสร็จ')
  if ((d.extras_amount ?? 0) > 0) docs.push('ใบรับรองแทนใบเสร็จรับเงิน (แบบ บก.๑๑๑) สำหรับค่าแท็กซี่ / ค่าเดินทางไปสถานีขนส่ง')
  if ((d.registration_amount ?? 0) > 0) docs.push('ใบเสร็จรับเงินค่าลงทะเบียน')
  return docs
}

/** ระยะเวลาเป็น วัน / ชั่วโมง / นาที */
export const durationParts = (startMs: number, endMs: number) => {
  const mins = Math.max(0, Math.round((endMs - startMs) / 60_000))
  return { days: Math.floor(mins / 1440), hours: Math.floor((mins % 1440) / 60), minutes: mins % 60 }
}

export const round2 = (n: number) => Math.round(n * 100) / 100
/** หักเบี้ยเลี้ยงต่อมื้อที่ผู้จัดเลี้ยง = ๑/๓ ของอัตราต่อวัน (๒๔๐ → ๘๐ · ๒๗๐ → ๙๐) — ตรงกับ backend mealCut */
export const mealCut = (rate: number) => round2(rate / 3)
/** เบี้ยเลี้ยงรายคน = อัตรา × วัน − มื้อที่ผู้จัดเลี้ยง × (อัตรา ÷ ๓) — ตรงกับ backend personAllowance */
export const personAllowance = (rate: number, days: number, meals = 0) => Math.max(0, round2(rate * days - meals * mealCut(rate)))
/** จำนวนมื้อที่หักได้สูงสุด = วัน × ๓ มื้อ */
export const maxMeals = (days: number) => Math.floor(days * 3)

// ── ตัวเลข / เงิน ──
const TH_DIGITS = '๐๑๒๓๔๕๖๗๘๙'
export const thaiDigits = (s: string | number) => String(s).replace(/[0-9]/g, d => TH_DIGITS[Number(d)])
/** 1234 → "1,234" · 1234.5 → "1,234.50" */
export const fmtMoney = (n: number) => n.toLocaleString('en-US', Number.isInteger(n) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtNum = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })

const DIG = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const POS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']
/** อ่านจำนวนเต็มไม่เกินหกหลัก */
const readGroup = (n: number) => {
  const s = String(n)
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]), pos = s.length - 1 - i
    if (d === 0) continue
    if (pos === 0 && d === 1 && s.length > 1) out += 'เอ็ด'
    else if (pos === 1 && d === 2) out += 'ยี่' + POS[1]
    else if (pos === 1 && d === 1) out += POS[1]
    else out += DIG[d] + POS[pos]
  }
  return out
}
const readInt = (n: number): string => n >= 1_000_000
  ? readInt(Math.floor(n / 1_000_000)) + 'ล้าน' + readGroup(n % 1_000_000)
  : readGroup(n)
/** จำนวนเงินเป็นตัวอักษร เช่น 1920 → "หนึ่งพันเก้าร้อยยี่สิบบาทถ้วน" */
export const bahtText = (amount: number) => {
  const total = Math.round(Math.abs(amount) * 100)
  const baht = Math.floor(total / 100), satang = total % 100
  if (baht === 0 && satang === 0) return 'ศูนย์บาทถ้วน'
  return (baht ? readInt(baht) + 'บาท' : '') + (satang ? readInt(satang) + 'สตางค์' : 'ถ้วน')
}

// ── วันที่แบบไทย ──
export const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
export const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
/** แยกส่วนวันที่ตามเวลาไทย */
export const thaiDateParts = (iso: string | number | Date) => {
  const d = new Date(new Date(iso).getTime() + TZ_OFFSET_MS)
  return {
    day: d.getUTCDate(), month: TH_MONTHS_FULL[d.getUTCMonth()], monthShort: TH_MONTHS_SHORT[d.getUTCMonth()], year: d.getUTCFullYear() + 543,
    time: `${String(d.getUTCHours()).padStart(2, '0')}.${String(d.getUTCMinutes()).padStart(2, '0')}`,
  }
}
export const thaiDate = (iso: string | number | Date) => { const p = thaiDateParts(iso); return `${p.day} ${p.month} ${p.year}` }
export const thaiDateShort = (iso: string | number | Date) => { const p = thaiDateParts(iso); return `${p.day} ${p.monthShort} ${String(p.year).slice(2)}` }
export const thaiDateTime = (iso: string | number | Date) => { const p = thaiDateParts(iso); return `${p.day} ${p.monthShort} ${String(p.year).slice(2)} ${p.time} น.` }

/** ช่วงวันเดินทางแบบสั้น เช่น "1–3 ธ.ค. 69" */
export const tripRange = (start: string, end: string) => {
  const a = thaiDateParts(start), b = thaiDateParts(end)
  if (a.year === b.year && a.month === b.month) return a.day === b.day ? `${a.day} ${a.monthShort} ${String(a.year).slice(2)}` : `${a.day}–${b.day} ${a.monthShort} ${String(a.year).slice(2)}`
  return `${thaiDateShort(start)} – ${thaiDateShort(end)}`
}

export const requestNo = (id: number) => `TR-${String(id).padStart(6, '0')}`

// ── รูปข้อมูลคำขอจาก API (GET /requests/:id) ──
export interface TravelerRow {
  user_id: number; name: string; position: string | null; tier_id: number | null; tier_name: string | null; rate: number; is_requester: boolean
  lodging_class_id?: number | null; lodging_class_name?: string | null; lodging_room?: RoomType | null; lodging_rate?: number | null; lodging_cap?: number
  flight_class?: FlightClass | null
  prior_trips?: number   // ไปราชการแล้วในปีงบเดียวกัน ก่อนครั้งนี้
  fy_trips?: number      // ทั้งปีงบ ไม่นับครั้งนี้
}
/** ผู้ลงนามช่องความเห็น — กดในระบบแล้วมีผล ความเห็น วันเวลา และสำเนาลายเซ็น */
export interface Signer {
  name: string; position: string | null; is_acting: boolean; unit: string | null
  action?: 'approved' | 'rejected'; comment?: string | null; acted_at?: string; signature?: string
}
export type ApprovalStage = 'chain' | 'director' | 'approved'
export interface ApprovalRow { step: number; level: 'MAJOR' | 'MISSION'; approver_name: string; approver_position: string | null; is_acting: boolean; unit_name: string | null; action: 'approved' | 'rejected'; comment: string | null; acted_at: string }
export interface ChainStepLite { step: number; level?: string; level_name: string; approver_name: string; is_acting: boolean; unit_name: string | null }

/** โหมดการลงนาม (ตั้งตามกลุ่ม): ลงนามในระบบ (ผอ. เซ็นจริง) / เดินเอกสารให้เซ็นเองทุกช่อง */
export type SignMode = 'esign' | 'paper'
export const SIGN_MODE_LABEL: Record<SignMode, string> = { esign: 'ลงนามในระบบ', paper: 'เดินเอกสาร' }

/** สถานะคำขอสำหรับแสดงผล — key ใช้เลือกไอคอน, color คือสี Tag ของ antd */
export type StatusKey = 'step1' | 'step2' | 'director' | 'approved' | 'rejected' | 'cancelled'
// รออนุมัติทุกขั้น = เทา (ไอคอนนาฬิกา) · อนุมัติ = เขียว · ยกเลิก/ไม่อนุมัติ = แดง (แยกกันด้วยไอคอนและข้อความ)
export const STATUS_COLOR: Record<StatusKey, string> = { step1: 'default', step2: 'default', director: 'default', approved: 'green', rejected: 'red', cancelled: 'red' }
export const statusOf = (r: Pick<TravelRequest, 'status' | 'approval_stage' | 'waiting_for' | 'sign_mode' | 'current_step'>): { key: StatusKey; label: string; color: string } => {
  const key: StatusKey = r.status === 'cancelled' ? 'cancelled' : r.status === 'rejected' ? 'rejected'
    : r.approval_stage === 'approved' ? 'approved' : r.approval_stage === 'director' ? 'director'
      : (r.current_step ?? 1) >= 2 ? 'step2' : 'step1'
  const label = key === 'cancelled' ? 'ยกเลิก' : key === 'rejected' ? 'ไม่อนุมัติ' : key === 'approved' ? 'อนุมัติแล้ว'
    : key === 'director' ? (r.sign_mode === 'paper' ? 'รอผลเดินเอกสาร' : 'รอ ผอ. ลงนาม')
      : r.waiting_for ? `รอ${r.waiting_for.level_name}` : 'รออนุมัติ'
  return { key, label, color: STATUS_COLOR[key] }
}
export interface TravelRequest {
  id: number; memo_no?: string | null; requester_id: number; requester_name: string; requester_position: string | null; requester_unit: string | null
  purpose: string; subject: string; location: string; start_at: string; end_at: string; overnight: boolean
  allowance_max_days: number; allowance_days: number; meals_provided?: number
  vehicle_mode: VehicleMode; vehicle_id: number | null; vehicle_name: string | null; vehicle_plate: string | null
  distance_km: number | null; rate_per_km: number | null; route_id: number | null; route_text: string | null; route_max_fare: number | null; vehicle_other: string | null
  allowance_amount: number; lodging_mode: LodgingMode; lodging_rooms: number; lodging_nights: number; lodging_amount: number; lodging_cap: number; lodging_note: string | null
  transport_amount: number
  /** ค่าพาหนะย่อย (รวมใน ๖.๓): แท็กซี่ สถานี/สนามบิน ↔ ที่พัก ขาไป/ขากลับ · บ้าน ↔ สถานี ไป-กลับ */
  taxi_go_amount?: number; taxi_back_amount?: number; home_station_amount?: number
  registration_amount: number; fuel_amount: number; toll_amount: number; other_amount: number; other_desc: string | null; total_amount: number
  budget_id: number; budget_type: BudgetType; budget_name: string; actual_amount: number | null; actual_note: string | null; actual_at: string | null
  status: 'submitted' | 'rejected' | 'cancelled'; cancel_reason: string | null; cancelled_at: string | null; created_at: string; updated_at: string
  sign_mode: SignMode; approval_stage: ApprovalStage; approval_chain?: ChainStepLite[]; current_step: number; reject_reason: string | null
  director_result: 'approved' | 'rejected' | null; director_note: string | null; director_at: string | null
  requester_signature?: string | null; approvals?: ApprovalRow[]
  waiting_for?: { level_name: string; approver_name: string; is_acting: boolean } | null
  travelers?: TravelerRow[]; traveler_count?: number; traveler_names?: string[]; fiscal_year?: number
  signers?: { major: Signer | null; mission: Signer | null; director: Signer | null }
  can_edit?: boolean; can_cancel?: boolean; can_record_actual?: boolean; can_approve?: boolean; can_record_director?: boolean
}
