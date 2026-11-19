// ของใช้ร่วมระหว่างหน้า "ทะเบียนทรัพย์สินงาน IT" กับ "ประเมินความเสี่ยงทรัพย์สิน"
// ข้อมูลครุภัณฑ์มาจาก GET /api/v1/it/assets (ทะเบียน V3 + V2 หมวดคอมพิวเตอร์)

export type Kind = 'computer' | 'notebook' | 'all_in_one' | 'server' | 'tablet' | 'monitor' | 'printer' | 'scanner' | 'ups' | 'network' | 'cctv' | 'other'
export type StatusGroup = 'in_use' | 'repair' | 'pending' | 'disposed' | 'other'
export interface Asset {
  key: string; source: 'v3' | 'v2'; noid: string; name: string | null; model: string | null; type: string | null; kind: Kind
  department: string | null; location: string | null; receive: string | null; fy: number | null; price: number | null; life_years: number | null
  status_code: string | null; status: string | null; status_group: StatusGroup; money_type: string | null; supplier: string | null
  docno: string | null; notes: string | null; repairs: number; open_repairs: number; last_repair: string | null
}

export const KIND_LABEL: Record<Kind, string> = {
  computer: 'คอมพิวเตอร์ (PC)', notebook: 'โน้ตบุ๊ก', all_in_one: 'All-in-One', server: 'เครื่องแม่ข่าย (Server)', tablet: 'แท็บเล็ต',
  monitor: 'จอภาพ', printer: 'เครื่องพิมพ์', scanner: 'สแกนเนอร์', ups: 'เครื่องสำรองไฟ (UPS)', network: 'อุปกรณ์เครือข่าย', cctv: 'กล้องวงจรปิด', other: 'อื่น ๆ',
}
export const SOURCE_LABEL = { v3: 'V3 ปัจจุบัน', v2: 'V2 เดิม' }
// สถานะ: "ถือครองอยู่" = ใช้งาน + ส่งซ่อม/แจ้งชำรุด + รอจำหน่าย/ดำเนินการ (ยังไม่ออกจากทะเบียน)
export const STATUS_FILTERS: { value: string; label: string; match: (g: StatusGroup) => boolean }[] = [
  { value: 'held', label: 'ถือครองอยู่', match: g => g !== 'disposed' },
  { value: 'in_use', label: 'ใช้งานอยู่', match: g => g === 'in_use' },
  { value: 'repair', label: 'ส่งซ่อม / แจ้งชำรุด', match: g => g === 'repair' },
  { value: 'pending', label: 'รอจำหน่าย / กำลังดำเนินการ', match: g => g === 'pending' },
  { value: 'disposed', label: 'ออกจากทะเบียนแล้ว', match: g => g === 'disposed' },
  { value: 'all', label: 'ทุกสถานะ', match: () => true },
]
export const STATUS_COLOR: Record<StatusGroup, string> = { in_use: 'success', repair: 'warning', pending: 'processing', disposed: 'default', other: 'default' }
export type AgeState = 'expired' | 'soon' | 'ok' | 'unknown'
export const AGE_LABEL: Record<AgeState, string> = { expired: 'ครบอายุแล้ว', soon: 'ครบอายุภายใน 1 ปี', ok: 'ยังไม่ครบอายุ', unknown: 'ไม่มีข้อมูลอายุ' }

const today = new Date()
export const parseDate = (s: string | null) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return y ? new Date(y, (m || 1) - 1, d || 1) : null }
export const ageYears = (s: string | null) => { const d = parseDate(s); return d ? (today.getTime() - d.getTime()) / (365.25 * 864e5) : null }
export const ageState = (a: Asset): AgeState => {
  const age = ageYears(a.receive)
  if (age == null || !a.life_years) return 'unknown'
  if (age >= a.life_years) return 'expired'
  return a.life_years - age <= 1 ? 'soon' : 'ok'
}
export const AGE_TAG: Record<AgeState, string> = { expired: 'red', soon: 'orange', ok: 'green', unknown: 'default' }
/** อายุเป็น "x ปี y เดือน" (ปัดลงเป็นเดือน) */
export const ageText = (y: number | null) => {
  if (y == null) return '-'
  const m = Math.max(0, Math.floor(y * 12 + 1e-9))
  return m < 12 ? `${m} เดือน` : `${Math.floor(m / 12)} ปี${m % 12 ? ` ${m % 12} เดือน` : ''}`
}
/** วันที่ครบอายุการใช้งานตามทะเบียน (วันที่ได้รับ + อายุการใช้งาน) */
export const lifeEnd = (a: Asset) => {
  const d = parseDate(a.receive)
  if (!d || !a.life_years) return null
  const e = new Date(d); e.setMonth(e.getMonth() + Math.round(a.life_years * 12))
  return e
}
export const thDate = (s: string | null) => { const d = parseDate(s); return d ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' }
export const money = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const short = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)} ล้าน` : n.toLocaleString('th-TH')

// ── ประเมินความเสี่ยง (โอกาส × ผลกระทบ 5×5) ──
export type RiskLevel = 'low' | 'medium' | 'high' | 'very_high'
export const RISK_LEVELS: { key: RiskLevel; label: string; range: string; min: number; tag: string }[] = [
  { key: 'very_high', label: 'สูงมาก', range: '15–25', min: 15, tag: 'red' },
  { key: 'high', label: 'สูง', range: '9–14', min: 9, tag: 'volcano' },
  { key: 'medium', label: 'ปานกลาง', range: '4–8', min: 4, tag: 'gold' },
  { key: 'low', label: 'ต่ำ', range: '1–3', min: 1, tag: 'green' },
]
export const levelOf = (score: number): RiskLevel => RISK_LEVELS.find(l => score >= l.min)!.key
export const LEVEL_LABEL = Object.fromEntries(RISK_LEVELS.map(l => [l.key, l.label])) as Record<RiskLevel, string>
// สีสถานะของระดับความเสี่ยง (ใช้กับกราฟ — ป้ายข้อความใช้ Tag ของ antd)
export const LEVEL_COLOR: Record<'light' | 'dark', Record<RiskLevel, string>> = {
  light: { low: '#1baf7a', medium: '#eda100', high: '#eb6834', very_high: '#e34948' },
  dark: { low: '#199e70', medium: '#c98500', high: '#d95926', very_high: '#e66767' },
}
export const LIKELIHOOD_LABEL = ['', 'น้อยมาก', 'น้อย', 'ปานกลาง', 'สูง', 'สูงมาก']
export const IMPACT_LABEL = ['', 'น้อยมาก', 'น้อย', 'ปานกลาง', 'สูง', 'รุนแรง']

export const THREATS: { key: string; label: string }[] = [
  { key: 'hw_failure', label: 'ฮาร์ดแวร์เสื่อม / ชำรุด' },
  { key: 'power', label: 'ไฟฟ้าดับ / ไฟกระชาก' },
  { key: 'malware', label: 'มัลแวร์ / แรนซัมแวร์' },
  { key: 'unauthorized', label: 'เข้าถึงโดยไม่ได้รับอนุญาต' },
  { key: 'theft', label: 'สูญหาย / ถูกขโมย' },
  { key: 'disaster', label: 'อัคคีภัย / น้ำท่วม / ภัยธรรมชาติ' },
  { key: 'eol_software', label: 'ระบบปฏิบัติการ/ซอฟต์แวร์หมดการสนับสนุน' },
  { key: 'data_loss', label: 'ข้อมูลสูญหาย (ไม่มีสำรองข้อมูล)' },
  { key: 'network_outage', label: 'เครือข่ายขัดข้อง' },
]
export const THREAT_LABEL = Object.fromEntries(THREATS.map(t => [t.key, t.label])) as Record<string, string>
export const TREATMENTS: { key: string; label: string; hint: string }[] = [
  { key: 'mitigate', label: 'ลดความเสี่ยง', hint: 'เพิ่มมาตรการ เช่น บำรุงรักษา สำรองข้อมูล UPS' },
  { key: 'replace', label: 'จัดหาทดแทน', hint: 'ตั้งงบเปลี่ยนเครื่องใหม่' },
  { key: 'transfer', label: 'ถ่ายโอนความเสี่ยง', hint: 'สัญญาบำรุงรักษา (MA) / ประกัน' },
  { key: 'avoid', label: 'หลีกเลี่ยง / เลิกใช้', hint: 'ย้ายงานออก แล้วจำหน่าย' },
  { key: 'accept', label: 'ยอมรับความเสี่ยง', hint: 'ความเสี่ยงต่ำ ติดตามตามรอบ' },
]
export const TREATMENT_LABEL = Object.fromEntries(TREATMENTS.map(t => [t.key, t.label])) as Record<string, string>

export interface RiskRow {
  id: number; asset_key: string; source: 'v3' | 'v2'; noid: string; asset_name: string | null; asset_kind: string | null; department: string | null
  likelihood: number; impact: number; score: number; suggested_likelihood: number | null; suggested_impact: number | null
  threats: string[]; controls: string | null; treatment: string; treatment_plan: string | null; owner_name: string | null
  due_date: string | null; next_review: string | null; notes: string | null; assessed_at: string; assessed_by_name: string | null; times?: number
}

// ── ค่าที่ระบบเสนอ (ใช้ตั้งต้นก่อนเจ้าหน้าที่ประเมินจริง) ──
// โอกาสเกิด: เริ่ม 1 · ใช้งานเกินอายุ +1 · เกิน 2 เท่าของอายุ +1 · เคยแจ้งซ่อม +1 · ซ่อม ≥ 3 ครั้งหรือกำลังส่งซ่อม/แจ้งชำรุด +1
// ผลกระทบ: ตามชนิดอุปกรณ์ (Server/เครือข่าย กระทบทั้งโรงพยาบาล) · อยู่ในหน่วยงานวิกฤต +1
const KIND_IMPACT: Record<Kind, number> = { server: 5, network: 5, ups: 3, computer: 3, notebook: 3, all_in_one: 3, cctv: 3, printer: 2, scanner: 2, monitor: 2, tablet: 2, other: 1 }
const CRITICAL_DEPT = /ฉุกเฉิน|อุบัติเหตุ|ICU|ไอซียู|วิกฤต|ผ่าตัด|ห้องคลอด|ไตเทียม|สารสนเทศ|คอมพิวเตอร์|ศูนย์ข้อมูล/i
export const suggestRisk = (a: Asset) => {
  const lr: string[] = []; let l = 1
  const age = ageYears(a.receive)
  if (age != null && a.life_years) {
    if (age >= a.life_years) { l++; lr.push(`ใช้งาน ${age.toFixed(1)} ปี เกินอายุการใช้งาน ${a.life_years} ปี`) }
    if (age >= a.life_years * 2) { l++; lr.push('ใช้งานเกิน 2 เท่าของอายุการใช้งาน') }
    if (age < a.life_years) lr.push(`ใช้งาน ${age.toFixed(1)} ปี ยังไม่ครบอายุ ${a.life_years} ปี`)
  } else lr.push('ไม่มีข้อมูลวันที่ได้รับหรืออายุการใช้งาน')
  if (a.repairs >= 1) { l++; lr.push(`แจ้งซ่อมในระบบ ${a.repairs} ครั้ง`) }
  if (a.repairs >= 3 || a.status_group === 'repair') { l++; lr.push(a.status_group === 'repair' ? `สถานะในทะเบียน: ${a.status}` : 'แจ้งซ่อมบ่อย (≥ 3 ครั้ง)') }
  const ir: string[] = []; let i = KIND_IMPACT[a.kind]
  ir.push(`${KIND_LABEL[a.kind]}: ผลกระทบพื้นฐาน ${i}`)
  if (a.department && CRITICAL_DEPT.test(a.department)) { i++; ir.push(`อยู่ในหน่วยงานที่ต้องให้บริการต่อเนื่อง (${a.department})`) }
  return { likelihood: Math.min(5, l), impact: Math.min(5, i), likelihoodReasons: lr, impactReasons: ir }
}
// ภัยคุกคามตั้งต้นตามชนิดอุปกรณ์ — ผู้ประเมินเพิ่ม/ลดได้
export const DEFAULT_THREATS: Record<Kind, string[]> = {
  server: ['hw_failure', 'power', 'malware', 'unauthorized', 'data_loss', 'disaster'],
  network: ['hw_failure', 'power', 'network_outage', 'unauthorized'],
  computer: ['hw_failure', 'malware', 'eol_software', 'unauthorized'], all_in_one: ['hw_failure', 'malware', 'eol_software', 'unauthorized'],
  notebook: ['hw_failure', 'malware', 'eol_software', 'unauthorized', 'theft'], tablet: ['hw_failure', 'theft', 'unauthorized'],
  ups: ['hw_failure', 'power'], cctv: ['hw_failure', 'power', 'unauthorized'], printer: ['hw_failure'], scanner: ['hw_failure'], monitor: ['hw_failure'], other: ['hw_failure'],
}
