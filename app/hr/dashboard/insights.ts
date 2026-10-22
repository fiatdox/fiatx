// HR Dashboard เชิงลึก — ส่วนคำนวณ (ไม่ผูกกับ React) ทดสอบกับข้อมูลจริงได้โดยไม่ต้องเปิดหน้าเว็บ
// ข้อมูลเข้า: รายบุคคลแบบไม่ระบุตัวตนจาก GET /api/v1/hr/dashboard/people
// ทุกฟังก์ชันรับชุดที่กรองตามขอบเขต (ด้าน/กลุ่มงาน/หน่วยงาน/ประเภท) แล้ว — ตัวเลขทุกส่วนจึงตรงกันเสมอ

/** หนึ่งแถว = หนึ่งคน (บุคลากรปัจจุบัน หรือผู้ที่ออกจากงานแล้ว) */
export interface Person {
  m: number | null   // ด้าน/ภารกิจ (mission)
  w: number | null   // กลุ่มงาน (major)
  u: number | null   // หน่วยงาน (submajor)
  t: number | null   // ประเภทบุคลากร
  p: number | null   // ตำแหน่ง
  l: number | null   // ระดับ
  s: number | null   // สถานะ
  a: boolean         // บุคลากรปัจจุบัน (is_active = 'Y')
  g: 'F' | 'M' | null
  age: number | null
  retire_fy: number | null  // ปีงบ (พ.ศ.) ที่เกษียณ
  bd: 0 | 1 | 2             // วันเกิด: 0 ไม่มี, 1 ใช้ได้, 2 ผิดปกติ
  h: boolean                // มีวันบรรจุ
  exit_fy: number | null    // ปีงบที่ออกจากงาน (เฉพาะผู้ที่ออกแล้ว)
  ed: boolean               // ปีที่ออกมาจาก work_end_date จริง (ไม่ใช่วันที่แก้ข้อมูล)
}

export interface Named { id: number; name: string; parent?: number | null }

export interface Lookups {
  missions: Named[]; majors: Named[]; submajors: Named[]
  types: Named[]; positions: Named[]; levels: Named[]; statuses: Named[]
}

export interface PeopleData {
  people: Person[]
  lookups: Lookups
  exit_status_ids: number[]
  current_fy: number
  as_of: string
}

/** ขอบเขตที่กำลังดู — null = ทั้งหมด */
export interface Scope { mission: number | null; major: number | null; submajor: number | null; type: number | null }
export const ALL_SCOPE: Scope = { mission: null, major: null, submajor: null, type: null }

/** ปีงบที่ดูข้อมูลการออกจากงาน — null = ทุกปีที่มีในระบบ */
export type ExitFy = number | null

/** ช่วงที่นับว่า "ใกล้เกษียณ" (รวมปีงบปัจจุบัน) */
export const RETIRE_HORIZON = 5

export const NONE = 'ไม่ระบุ'

// ── ค้นชื่อ ──────────────────────────────────────────────────────────────────
export const nameMap = (list: Named[]) => new Map(list.map(x => [x.id, x.name]))

export interface Names {
  mission: Map<number, string>; major: Map<number, string>; submajor: Map<number, string>
  type: Map<number, string>; position: Map<number, string>; status: Map<number, string>
}
export const buildNames = (L: Lookups): Names => ({
  mission: nameMap(L.missions), major: nameMap(L.majors), submajor: nameMap(L.submajors),
  type: nameMap(L.types), position: nameMap(L.positions), status: nameMap(L.statuses),
})
const nm = (map: Map<number, string>, id: number | null) => (id == null ? NONE : map.get(id) ?? `รหัส ${id}`)

// ลูกจ้างชั่วคราว (รายเดือน/รายวัน) — ดูจากชื่อประเภท ไม่ผูกกับรหัส เผื่อรหัสเปลี่ยน
export const temporaryTypeIds = (L: Lookups) => new Set(L.types.filter(t => t.name.includes('ชั่วคราว')).map(t => t.id))

// ── ขอบเขต ──────────────────────────────────────────────────────────────────
export const inScope = (p: Pick<Person, 'm' | 'w' | 'u' | 't'>, s: Scope) =>
  (s.mission == null || p.m === s.mission)
  && (s.major == null || p.w === s.major)
  && (s.submajor == null || p.u === s.submajor)
  && (s.type == null || p.t === s.type)

/** ระดับที่ใช้แตกตารางในขอบเขตนี้: ทั้งหมด → ด้าน, ด้าน → กลุ่มงาน, กลุ่มงาน → หน่วยงาน, หน่วยงาน → ตำแหน่ง */
export type Level = 'mission' | 'major' | 'submajor' | 'position'
export const childLevel = (s: Scope): Level =>
  s.submajor != null ? 'position' : s.major != null ? 'submajor' : s.mission != null ? 'major' : 'mission'

export const LEVEL_LABEL: Record<Level, string> = { mission: 'ด้าน/ภารกิจ', major: 'กลุ่มงาน', submajor: 'หน่วยงาน', position: 'ตำแหน่ง' }

const keyOf = (p: Person, level: Level) =>
  level === 'mission' ? p.m : level === 'major' ? p.w : level === 'submajor' ? p.u : p.p

/** ขอบเขตใหม่เมื่อเจาะลึกเข้าไปในแถว id ของระดับ level (ระดับตำแหน่งเจาะต่อไม่ได้) */
export const drillInto = (s: Scope, level: Level, id: number | null): Scope | null => {
  if (id == null || level === 'position') return null
  if (level === 'mission') return { ...s, mission: id, major: null, submajor: null }
  if (level === 'major') return { ...s, major: id, submajor: null }
  return { ...s, submajor: id }
}

const isExit = (p: Person, fy: ExitFy) => p.exit_fy != null && (fy == null || p.exit_fy === fy)
const pct = (n: number, d: number) => (d > 0 ? (n * 100) / d : 0)

// ── แตกตามหน่วยย่อย ─────────────────────────────────────────────────────────
export interface UnitRow {
  key: string
  id: number | null
  name: string
  staff: number
  share: number          // % ของบุคลากรในขอบเขต
  female: number
  femalePct: number
  temporary: number
  temporaryPct: number
  byType: Map<number | null, number>
  ageAvg: number | null
  ageKnown: number       // คนที่มีอายุ (วันเกิดใช้ได้)
  retireSoon: number     // เกษียณภายใน RETIRE_HORIZON ปีงบ
  overdue: number        // เลยปีงบเกษียณแล้วแต่ยังเป็นบุคลากรปัจจุบัน
  exits: number
  exitsBy: Map<number | null, number>  // ผู้ออกแยกตามสาเหตุ (สถานะ)
  exitRate: number       // ออก / (คงอยู่ + ออก)
  birthCoverage: number  // % ที่มีวันเกิดใช้ได้
}

export const breakdown = (people: Person[], level: Level, names: Names, L: Lookups, fy: ExitFy, currentFy: number): UnitRow[] => {
  const temp = temporaryTypeIds(L)
  const map = level === 'mission' ? names.mission : level === 'major' ? names.major : level === 'submajor' ? names.submajor : names.position
  const acc = new Map<number | null, { staff: Person[]; exits: number; exitsBy: Map<number | null, number> }>()
  for (const p of people) {
    const k = keyOf(p, level)
    let a = acc.get(k)
    if (!a) acc.set(k, a = { staff: [], exits: 0, exitsBy: new Map() })
    if (p.a) a.staff.push(p)
    else if (isExit(p, fy)) {
      a.exits++
      a.exitsBy.set(p.s, (a.exitsBy.get(p.s) ?? 0) + 1)
    }
  }
  const total = people.filter(p => p.a).length
  return [...acc.entries()]
    .filter(([, a]) => a.staff.length > 0 || a.exits > 0)
    .map(([id, a]) => {
      const st = a.staff
      const aged = st.filter(p => p.age != null)
      const female = st.filter(p => p.g === 'F').length
      const temporary = st.filter(p => p.t != null && temp.has(p.t)).length
      const byType = new Map<number | null, number>()
      st.forEach(p => byType.set(p.t, (byType.get(p.t) ?? 0) + 1))
      return {
        key: String(id ?? 'none'),
        id,
        name: nm(map, id),
        staff: st.length,
        share: pct(st.length, total),
        female,
        femalePct: pct(female, st.length),
        temporary,
        temporaryPct: pct(temporary, st.length),
        byType,
        ageAvg: aged.length ? aged.reduce((s, p) => s + (p.age as number), 0) / aged.length : null,
        ageKnown: aged.length,
        retireSoon: st.filter(p => p.retire_fy != null && p.retire_fy >= currentFy && p.retire_fy < currentFy + RETIRE_HORIZON).length,
        overdue: st.filter(p => p.retire_fy != null && p.retire_fy < currentFy).length,
        exits: a.exits,
        exitsBy: a.exitsBy,
        exitRate: pct(a.exits, st.length + a.exits),
        birthCoverage: pct(aged.length, st.length),
      }
    })
    // "ไม่ระบุ" ไว้ท้ายเสมอ ที่เหลือเรียงตามจำนวนคนมากไปน้อย
    .sort((x, y) => (x.id == null ? 1 : y.id == null ? -1 : y.staff - x.staff))
}

// ── ตัวเลขสรุป ──────────────────────────────────────────────────────────────
export interface Kpis {
  staff: number
  working: number        // สถานะ "ปฏิบัติงาน"
  female: number
  male: number
  temporary: number
  retireSoon: number
  overdue: number
  ageKnown: number
  exits: number
  exitRate: number
  exitsDated: number
}

export const kpis = (people: Person[], L: Lookups, fy: ExitFy, currentFy: number): Kpis => {
  const temp = temporaryTypeIds(L)
  const working = L.statuses.find(s => s.name === 'ปฏิบัติงาน')?.id
  const st = people.filter(p => p.a)
  const ex = people.filter(p => !p.a && isExit(p, fy))
  return {
    staff: st.length,
    working: st.filter(p => p.s === working).length,
    female: st.filter(p => p.g === 'F').length,
    male: st.filter(p => p.g === 'M').length,
    temporary: st.filter(p => p.t != null && temp.has(p.t)).length,
    retireSoon: st.filter(p => p.retire_fy != null && p.retire_fy >= currentFy && p.retire_fy < currentFy + RETIRE_HORIZON).length,
    overdue: st.filter(p => p.retire_fy != null && p.retire_fy < currentFy).length,
    ageKnown: st.filter(p => p.age != null).length,
    exits: ex.length,
    exitRate: pct(ex.length, st.length + ex.length),
    exitsDated: ex.filter(p => p.ed).length,
  }
}

// ── อายุ / เกษียณ ───────────────────────────────────────────────────────────
export const AGE_BANDS = ['18–24', '25–29', '30–34', '35–39', '40–44', '45–49', '50–54', '55–59', '60+']
const ageBand = (a: number) => (a < 25 ? 0 : a >= 60 ? 8 : Math.floor((a - 20) / 5))

/** ปิรามิดอายุ: จำนวนหญิง/ชายต่อช่วงอายุ (เฉพาะคนที่มีวันเกิดใช้ได้และระบุเพศ) */
export const agePyramid = (people: Person[]) => {
  const female = AGE_BANDS.map(() => 0)
  const male = AGE_BANDS.map(() => 0)
  for (const p of people) {
    if (!p.a || p.age == null) continue
    if (p.g === 'F') female[ageBand(p.age)]++
    else if (p.g === 'M') male[ageBand(p.age)]++
  }
  return { female, male }
}

/** คาดการณ์เกษียณรายปีงบ แยกตามประเภทบุคลากร — years ปีนับจากปีงบปัจจุบัน */
export const retirementForecast = (people: Person[], currentFy: number, years = 10) => {
  const fys = Array.from({ length: years }, (_, i) => currentFy + i)
  const byType = new Map<number | null, number[]>()
  for (const p of people) {
    if (!p.a || p.retire_fy == null) continue
    const i = p.retire_fy - currentFy
    if (i < 0 || i >= years) continue
    let row = byType.get(p.t)
    if (!row) byType.set(p.t, row = fys.map(() => 0))
    row[i]++
  }
  return { fys, byType }
}

// ── ตำแหน่ง ─────────────────────────────────────────────────────────────────
export const topPositions = (people: Person[], names: Names, n = 15) => {
  const acc = new Map<number | null, { female: number; male: number; other: number }>()
  for (const p of people) {
    if (!p.a) continue
    let a = acc.get(p.p)
    if (!a) acc.set(p.p, a = { female: 0, male: 0, other: 0 })
    if (p.g === 'F') a.female++
    else if (p.g === 'M') a.male++
    else a.other++
  }
  const rows = [...acc.entries()].map(([id, a]) => ({
    id, name: nm(names.position, id), ...a, total: a.female + a.male + a.other,
  })).sort((x, y) => y.total - x.total)
  return { rows: rows.slice(0, n), others: rows.slice(n), positions: rows.length }
}

// ── การออกจากงาน ────────────────────────────────────────────────────────────
export const exitReasons = (people: Person[], names: Names, fy: ExitFy) => {
  const acc = new Map<number | null, number>()
  people.filter(p => !p.a && isExit(p, fy)).forEach(p => acc.set(p.s, (acc.get(p.s) ?? 0) + 1))
  return [...acc.entries()].map(([id, n]) => ({ id, name: nm(names.status, id), n })).sort((a, b) => b.n - a.n)
}

/** ปีงบที่มีผู้ออกจากงาน (ใหม่ไปเก่า) — เป็นตัวเลือกของตัวกรอง */
export const exitYears = (people: Person[]) =>
  [...new Set(people.map(p => p.exit_fy).filter((y): y is number => y != null))].sort((a, b) => b - a)

// ── คุณภาพข้อมูล ────────────────────────────────────────────────────────────
export interface FieldCoverage { key: string; label: string; have: number; total: number; pct: number; note?: string }

/** คนที่หน่วยงานไม่ได้อยู่ใต้กลุ่มงานที่บันทึกไว้ (ตามตารางหน่วยงาน) — ตัวกรองจึงต้องสร้างตัวเลือกจากข้อมูลคน ไม่ใช่จากตารางหน่วยงาน */
export const orgMismatch = (people: Person[], L: Lookups) => {
  const parent = new Map(L.submajors.map(s => [s.id, s.parent ?? null]))
  return people.filter(p => p.a && p.u != null && parent.has(p.u) && parent.get(p.u) !== p.w).length
}

export const coverage = (people: Person[], L: Lookups): FieldCoverage[] => {
  const st = people.filter(p => p.a)
  const f = (key: string, label: string, ok: (p: Person) => boolean, note?: string): FieldCoverage => {
    const have = st.filter(ok).length
    return { key, label, have, total: st.length, pct: pct(have, st.length), note }
  }
  const badBirth = st.filter(p => p.bd === 2).length
  const mismatch = orgMismatch(st, L)
  return [
    f('gender', 'เพศ', p => p.g != null),
    f('type', 'ประเภทบุคลากร', p => p.t != null),
    f('position', 'ตำแหน่ง', p => p.p != null),
    f('major', 'กลุ่มงาน', p => p.w != null),
    f('submajor', 'หน่วยงาน', p => p.u != null,
      mismatch ? `${mismatch} คนหน่วยงานไม่อยู่ใต้กลุ่มงานที่บันทึก (ตามตารางหน่วยงาน)` : undefined),
    f('level', 'ระดับ', p => p.l != null),
    f('birthday', 'วันเกิด (ใช้ได้)', p => p.bd === 1, badBirth ? `วันเกิดผิดปกติอีก ${badBirth} คน (อายุคำนวณได้ต่ำกว่า 18 หรือเกิน 70 ปี)` : undefined),
    f('hire', 'วันบรรจุ', p => p.h),
  ]
}

// ── ข้อค้นพบสำคัญ ───────────────────────────────────────────────────────────
// เลือกเฉพาะเรื่องที่ "ควรรู้/ควรทำอะไรต่อ" และบอกเสมอว่าข้อมูลครบแค่ไหน
// เทียบหน่วยย่อยกันเฉพาะหน่วยที่มีคนพอจะเทียบได้ (MIN_UNIT) ไม่ให้หน่วย 2 คนขึ้นอันดับเพราะคนเดียว
export const MIN_UNIT = 10

// แบบย่อ: หัวเรื่องคือตัวเลข รายละเอียดเหลือวลีสั้น ๆ บรรทัดเดียว (คำอธิบายเต็มอยู่ในแท็บที่เกี่ยวข้อง)
export interface Finding {
  key: string
  tone: 'info' | 'warn'
  title: string
  detail: string
  drill?: { level: Level; id: number }
  /** เปิดแท็บที่มีรายละเอียด/รายชื่อของเรื่องนี้ */
  tab?: string
}

const fmt = (n: number, d = 0) => n.toLocaleString('th-TH', { maximumFractionDigits: d, minimumFractionDigits: d })

export const findings = (rows: UnitRow[], level: Level, k: Kpis, fyLabel: string): Finding[] => {
  const out: Finding[] = []
  const named = rows.filter(r => r.id != null)
  const big = named.filter(r => r.staff >= MIN_UNIT)
  const drill = (r: UnitRow) => (level !== 'position' && r.id != null ? { level, id: r.id } : undefined)

  if (named.length > 1) {
    const top = named.reduce((a, b) => (b.staff > a.staff ? b : a))
    out.push({
      key: 'largest', tone: 'info',
      title: `มากที่สุด ${fmt(top.staff)} คน (${fmt(top.share, 1)}%)`,
      detail: top.name,
      drill: drill(top),
    })
  }

  if (k.staff > 0 && k.temporary > 0) {
    const worst = big.filter(r => r.temporary > 0).sort((a, b) => b.temporaryPct - a.temporaryPct)[0]
    out.push({
      key: 'temporary', tone: pct(k.temporary, k.staff) >= 30 ? 'warn' : 'info',
      title: `ลูกจ้างชั่วคราว ${fmt(pct(k.temporary, k.staff), 1)}%`,
      detail: worst ? `สูงสุด ${worst.name} ${fmt(worst.temporaryPct, 0)}%` : `${fmt(k.temporary)} คน`,
      drill: worst ? drill(worst) : undefined,
    })
  }

  if (k.ageKnown > 0) {
    const most = named.filter(r => r.retireSoon > 0).sort((a, b) => b.retireSoon - a.retireSoon)[0]
    out.push({
      key: 'retire', tone: k.retireSoon > 0 ? 'warn' : 'info',
      title: `เกษียณใน ${RETIRE_HORIZON} ปีงบ ≥ ${fmt(k.retireSoon)} คน`,
      detail: `มีวันเกิดแค่ ${fmt(pct(k.ageKnown, k.staff), 0)}%` + (most ? ` · มากสุด ${most.name}` : ''),
      drill: most ? drill(most) : undefined,
    })
  }

  if (k.overdue > 0) {
    out.push({
      key: 'overdue', tone: 'warn',
      title: `เลยเกษียณแต่ยังปฏิบัติงาน ${fmt(k.overdue)} คน`,
      detail: 'ตรวจสถานะหรือวันเกิด',
      tab: 'age',
    })
  }

  if (k.exits > 0) {
    const worst = big.filter(r => r.exits > 0).sort((a, b) => b.exitRate - a.exitRate)[0]
    out.push({
      key: 'exit', tone: k.exitRate >= 10 ? 'warn' : 'info',
      title: `ออกจากงาน ${fmt(k.exits)} คน (${fmt(k.exitRate, 1)}%)`,
      detail: worst ? `สูงสุด ${worst.name} ${fmt(worst.exitRate, 1)}%` : fyLabel,
      drill: worst ? drill(worst) : undefined,
    })
  }

  const noUnit = rows.find(r => r.id == null && level === 'submajor')
  if (noUnit && noUnit.staff > 0) {
    out.push({
      key: 'nounit', tone: 'warn',
      title: `ไม่ระบุหน่วยงาน ${fmt(noUnit.staff)} คน`,
      detail: 'ระบุที่ทะเบียนบุคลากร',
      tab: 'quality',
    })
  }

  return out
}

// ── รายชื่อที่ข้อมูลอายุต้องแก้ (GET /api/v1/hr/dashboard/age-issues — มีชื่อ จึงแยกจากชุดไม่ระบุตัวตน) ──
export interface AgeIssue {
  id: number
  name: string
  m: number | null; w: number | null; u: number | null; t: number | null; p: number | null; s: number | null
  birthday: string        // YYYY-MM-DD (ค.ศ. แปลงแล้ว)
  age: number
  retire_fy: number | null
  issue: 'overdue' | 'implausible'
}

/** ความครบของข้อมูลต่อหน่วยย่อย (% ของบุคลากรปัจจุบัน) — เรียงหน่วยที่ขาดมากไว้ก่อน ให้รู้ว่าควรเติมที่ไหน */
export interface UnitCoverage {
  key: string; id: number | null; name: string; staff: number
  birth: number; submajor: number; level: number; hire: number
}

export const unitCoverage = (people: Person[], level: Level, names: Names): UnitCoverage[] => {
  const map = level === 'mission' ? names.mission : level === 'major' ? names.major : level === 'submajor' ? names.submajor : names.position
  const acc = new Map<number | null, Person[]>()
  for (const p of people) {
    if (!p.a) continue
    const k = keyOf(p, level)
    const list = acc.get(k)
    if (list) list.push(p)
    else acc.set(k, [p])
  }
  return [...acc.entries()].map(([id, st]) => ({
    key: String(id ?? 'none'), id, name: nm(map, id), staff: st.length,
    birth: pct(st.filter(p => p.bd === 1).length, st.length),
    submajor: pct(st.filter(p => p.u != null).length, st.length),
    level: pct(st.filter(p => p.l != null).length, st.length),
    hire: pct(st.filter(p => p.h).length, st.length),
  })).sort((a, b) => a.birth - b.birth || b.staff - a.staff)
}
