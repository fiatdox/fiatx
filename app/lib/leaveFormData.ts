// ── แปลงใบลาเป็นข้อมูลแบบใบลาที่พิมพ์ (LeaveFormPDF) ─────────────────────────
// ใช้ร่วมกัน: ประวัติการลาของฉัน (/hr/leave/history) และสถิติการลา (/hr/leave/status)
import dayjs from 'dayjs'
import type { LeaveFormData, SpmCode } from '@/app/components/LeaveFormPDF'

// ── ข้อมูลหน่วยงานที่พิมพ์ลงหัวกระดาษ ────────────────────────────────────────
// ยังไม่มีตารางตั้งค่าระดับองค์กรในระบบ จึงกำหนดไว้ที่นี่ก่อน
export const ORG_NAME = 'โรงพยาบาลพะเยา'
export const PROVINCE_OFFICE = 'สำนักงานสาธารณสุขจังหวัดพะเยา'

const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const TH_MONTH_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export const beShort = (v: string) => {
  const d = dayjs(v)
  return `${d.date()} ${TH_MONTH_ABBR[d.month()]} ${d.year() + 543}`
}
export const beLong = (v: string) => {
  const d = dayjs(v)
  return `${d.date()} ${TH_MONTH[d.month()]} ${d.year() + 543}`
}
/** ประเภทที่พิมพ์ด้วยแบบใบลาป่วย กิจส่วนตัว ลาคลอดบุตร (ตามลำดับในแบบฟอร์ม) */
const SPM_CODES: readonly SpmCode[] = ['SICK', 'PERS', 'MAT']
export const nf = (n: number) => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 })

export interface ApiChainStep {
  step: number
  level: string
  level_name: string
  approver_id: number
  approver_name: string
  unit_name: string | null
  is_acting: boolean
  /** ผู้อนุมัตินอกระบบ (นพ.สสจ.) — ผู้กดในระบบคือ HR ที่บันทึกผล ไม่ใช่ผู้ลงนาม */
  external?: boolean
}
export interface ApiAction {
  step: number
  action: string
  comment: string | null
  actioned_at: string
  approver_id?: number
  approver_name?: string
  level?: string
}

/** ฟิลด์ของใบลาที่ใช้กรอกแบบฟอร์ม (GET /leave-requests/mine และ /leave-requests/:id/print) */
export interface LeaveFormRow {
  id: number
  leave_type_id: number
  leave_type_name: string
  leave_type_code: string
  start_date: string
  end_date: string
  total_days: string | number
  is_half_day: boolean
  half_day_period: string | null
  status: string
  reason: string | null
  approval_chain: ApiChainStep[] | string | null
  actions: ApiAction[]
  created_at: string
  fiscal_year: number
  carried_in: number
  entitled_per_year: number | null
  substitute_name: string | null
  contact_info: string | null
}

export interface LeaveProfile {
  pname: string | null
  fname: string | null
  lname: string | null
  position_name: string | null
  user_type_name: string | null
  submajor_name: string | null
  major_name: string | null
  mission_name: string | null
}

export type Approvers = Record<string, { pname: string | null; fname: string | null; lname: string | null }>

/** ตำแหน่งตามผัง ณ วันยื่นใบลา — หัวหน้า{หน่วย} / รองผู้อำนวยการ{ด้าน...} / ผู้อำนวยการ{โรงพยาบาล} · รักษาการนำหน้า */
export const chainTitle = (c: ApiChainStep) => {
  const unit = (c.unit_name ?? '').trim()
  if (c.level === 'PROVINCIAL') return c.unit_name ? c.unit_name.replace(/^สำนักงาน/, 'นายแพทย์') : c.level_name
  const base = c.level === 'DIRECTOR' ? `ผู้อำนวยการ${ORG_NAME}`
    : c.level === 'MISSION' ? (unit.startsWith('ด้าน') ? `รองผู้อำนวยการ${unit}` : `หัวหน้ากลุ่มภารกิจ${unit}`)
    : unit ? `หัวหน้า${unit}` : c.level_name
  return c.is_acting ? `รักษาการ${base}` : base
}

export const parseChain = (raw: LeaveFormRow['approval_chain']): ApiChainStep[] => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

export const buildLeaveFormData = (r: LeaveFormRow, ctx: { rows: LeaveFormRow[]; profile: LeaveProfile | null; approvers: Approvers }): LeaveFormData => {
  const { rows, profile, approvers } = ctx
  // ลายมือชื่อผู้มอบงาน — ผู้ลายื่นในระบบเอง ถือว่ายืนยันแล้ว ใส่ชื่อ สกุล (ไม่มีคำนำหน้า)
  const signName = profile ? `${profile.fname ?? ''} ${profile.lname ?? ''}`.replace(/\s+/g, ' ').trim() : ''
  const fullName = profile ? `${profile.pname ?? ''}${profile.fname ?? ''} ${profile.lname ?? ''}`.replace(/\s+/g, ' ').trim() : ''
  const chain = parseChain(r.approval_chain)
  const actionOf = (step: number) => r.actions?.find(a => Number(a.step) === Number(step))
  // ความเห็นที่ผู้อนุมัติพิมพ์เอง — ข้อความตั้งต้นของระบบ (อนุมัติ / อนุมัติ (แบบกลุ่ม)) แทนด้วยถ้อยคำในแบบฟอร์ม
  const opinionText = (act: ApiAction) => {
    const c = (act.comment ?? '').trim()
    const own = c && !/^อนุมัติ(\s*\(แบบกลุ่ม\))?$/.test(c) ? c : ''
    if (act.action === 'REJECTED') return own ? `ไม่อนุญาต — ${own}` : 'ไม่อนุญาต'
    return own || 'เห็นควรอนุญาต'
  }
  // คำสั่งอนุญาต = ขั้นสุดท้ายของสายอนุมัติ (ผู้มีอำนาจสั่งการ) — ไม่ซ้ำในช่องความเห็น
  const lastStep = chain.length > 0 ? chain[chain.length - 1] : null
  // ผู้อนุมัติในสาย: (ลงชื่อ) = ชื่อ สกุล เมื่ออนุมัติแล้ว · (วงเล็บ) = คำนำหน้าชื่อ สกุล และตำแหน่งตามผัง แสดงทุกครั้ง
  // อนุมัติแล้วใช้ผู้ที่กดจริง (ใบที่โอนจากระบบเดิมอาจไม่ใช่คนเดียวกับสายปัจจุบัน)
  const person = (c: ApiChainStep, act?: ApiAction) => {
    // นพ.สสจ. ลงนามในกระดาษเอง — ไม่ใส่ชื่อ HR ที่กดบันทึกผล · ชื่อในวงเล็บใส่เมื่อตั้งชื่อบุคคลไว้ (ไม่ใช่ชื่อตำแหน่ง)
    if (c.external) return { sign: '', full: c.approver_name === chainTitle(c) ? '' : c.approver_name }
    const a = approvers[String(act?.approver_id ?? c.approver_id)]
    const fallback = act?.approver_name ?? c.approver_name
    const sign = a ? `${a.fname ?? ''} ${a.lname ?? ''}`.trim() : fallback
    const full = a ? `${a.pname ?? ''}${a.fname ?? ''} ${a.lname ?? ''}`.trim() : fallback
    return { sign, full }
  }
  const opinionOf = (level: string) => {
    const c = chain.find(x => x.level === level)
    if (!c || (c === lastStep && chain.length > 1)) return null
    const act = actionOf(c.step)
    const p = person(c, act)
    return {
      // ยังไม่อนุมัติ: ความเห็น/ลงชื่อ/วันที่ ปล่อยว่างให้เซ็นด้วยมือ
      comment: act ? opinionText(act) : '',
      signName: act ? p.sign : '',
      name: p.full,
      position: chainTitle(c),
      date: act ? beShort(act.actioned_at) : '',
    }
  }

  const lastAct = lastStep ? actionOf(lastStep.step) : undefined
  const lastOwn = lastAct ? opinionText(lastAct) : ''
  const order = {
    approved: lastAct ? lastAct.action !== 'REJECTED' : null,
    // ช่องคำสั่งติ๊กอนุญาต/ไม่อนุญาตแล้ว — ใส่เฉพาะความเห็นที่ผู้สั่งพิมพ์เอง
    comment: ['เห็นควรอนุญาต', 'ไม่อนุญาต'].includes(lastOwn) ? '' : lastOwn.replace(/^ไม่อนุญาต — /, ''),
    signName: lastAct && lastStep ? person(lastStep, lastAct).sign : '',
    name: lastStep ? person(lastStep, lastAct).full : '',
    position: lastStep ? chainTitle(lastStep) : '',
    date: lastAct ? beShort(lastAct.actioned_at) : '',
  }

  // ใบที่อนุมัติแล้วและเริ่มลาก่อนใบนี้ (วันเดียวกันดูลำดับการยื่น)
  const before = rows.filter(x =>
    x.id !== r.id
    && String(x.status).toUpperCase() === 'APPROVED'
    && (dayjs(x.start_date).isBefore(dayjs(r.start_date), 'day')
      || (dayjs(x.start_date).isSame(dayjs(r.start_date), 'day') && x.id < r.id)))
  // สถิติการลา: ประเภทเดียวกัน ปีงบเดียวกัน
  const priorOf = (code: string) => before
    .filter(x => String(x.leave_type_code) === code && Number(x.fiscal_year) === Number(r.fiscal_year))
    .reduce((a, x) => a + Number(x.total_days), 0)
  const code = String(r.leave_type_code)
  const prior = priorOf(code)
  const thisDays = Number(r.total_days)

  // แบบใบลาป่วย กิจส่วนตัว ลาคลอดบุตร — ครั้งสุดท้ายที่ลา 3 ประเภทนี้ (ทุกปีงบ) + สถิติแยกประเภท
  let spm: LeaveFormData['spm'] = null
  if ((SPM_CODES as readonly string[]).includes(code)) {
    const last = before
      .filter(x => (SPM_CODES as readonly string[]).includes(String(x.leave_type_code)))
      .sort((a, b) => dayjs(b.start_date).diff(dayjs(a.start_date)) || b.id - a.id)[0]
    const dash = (n: number) => (n ? nf(n) : '-')
    spm = {
      kind: code as SpmCode,
      last: last ? {
        kind: String(last.leave_type_code) as SpmCode,
        startDate: beShort(last.start_date),
        endDate: beShort(last.end_date),
        days: nf(Number(last.total_days)),
      } : null,
      stats: SPM_CODES.map(c => {
        const p = priorOf(c), t = c === code ? thisDays : 0
        return { kind: c, prior: dash(p), this: dash(t), total: dash(p + t) }
      }),
    }
  }

  const subject = (r.leave_type_name || '').replace(/^การ/, '')
  const annual = r.entitled_per_year
  return {
    refNo: `LV-${String(r.id).padStart(6, '0')}`,
    printedAt: `${beShort(dayjs().toISOString())} ${dayjs().format('HH:mm')} น.`,
    isAnnual: String(r.leave_type_code) === 'ANNUAL',
    orgName: ORG_NAME,
    provinceOffice: PROVINCE_OFFICE,
    writtenDate: beLong(r.created_at),
    subject,
    fullName,
    signName,
    userType: profile?.user_type_name ?? '',
    position: profile?.position_name ?? '',
    unitName: profile?.major_name ?? profile?.submajor_name ?? '',
    carriedDays: nf(Number(r.carried_in) || 0),
    annualDays: annual != null ? nf(annual) : '',
    totalDays: annual != null ? nf((Number(r.carried_in) || 0) + annual) : '',
    startDate: beShort(r.start_date),
    endDate: beShort(r.end_date),
    requestedDays: nf(Number(r.total_days)),
    halfDayLabel: r.is_half_day ? `มีครึ่งวัน${r.half_day_period === 'AM' ? 'เช้า' : r.half_day_period === 'PM' ? 'บ่าย' : ''}` : '',
    contact: r.contact_info ?? '',
    substitute: r.substitute_name ?? '',
    note: r.reason ?? '',
    unitHead: opinionOf('SUBMAJOR'),
    majorHead: opinionOf('MAJOR') ?? opinionOf('MISSION'),
    order,
    statPrior: nf(prior),
    statThis: nf(thisDays),
    statTotal: nf(prior + thisDays),
    spm,
  }
}
