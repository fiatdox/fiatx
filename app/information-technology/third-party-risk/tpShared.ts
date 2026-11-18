// ชนิดข้อมูลและค่าคงที่ของการประเมินความเสี่ยงบุคคลภายนอก (3rd Party Risk Assessment) — ใช้ร่วมกันระหว่างหน้าเว็บและรายงาน Excel
import { TREATMENT_LABEL, type Treatment } from '../risk-register/rrShared'

export { TREATMENT_LABEL, type Treatment }
export interface Item {
  id: number; assessment_id: number; cluster_no: number; cluster_name: string; item_no: string; sort: number
  risk: string; threat: string | null; vulnerability: string | null; cia: string[]; impact_areas: string[]
  likelihood: number | null; impact: number | null; score: number | null
  treatment: Treatment; treatment_plan: string | null; owner: string | null; progress_pct: number; due_date: string | null
  residual_cia: string[]; residual_areas: string[]; residual_likelihood: number | null; residual_impact: number | null; residual_score: number | null
  further_action: string | null; copied_from: number | null; updated_at: string; updated_by_name: string | null
}
export interface Header {
  id: number; vendor_name: string; service_name: string | null; bia_service_id: number | null; bia_service_name: string | null; reviewer: string | null
  recorder_id: number | null; recorder_name: string | null; recorder_role: string | null; meeting_date: string | null; notes: string | null
  updated_at: string; updated_by_name: string | null
}
export interface ListRow extends Header { items: number; assessed: number; avg_score: number | null; avg_residual: number | null; avg_progress: number | null }
export interface Cluster { cluster_no: number; name: string }
export interface Assessment extends Header { items: Item[]; clusters: Cluster[] }

export const CIA = [{ key: 'C', label: 'Confidentiality (ความลับ)' }, { key: 'I', label: 'Integrity (ความถูกต้อง)' }, { key: 'A', label: 'Availability (ความพร้อมใช้)' }]
// ความรุนแรงแต่ละด้าน — แบบฟอร์มนี้ใช้หัว "B/F" (Business/Financial) แทน F
export const AREAS = [
  { key: 'F', short: 'B/F', label: 'B/F Business / Financial (ธุรกิจ / การเงิน)' }, { key: 'S', short: 'S', label: 'S Service (การให้บริการ)' },
  { key: 'R', short: 'R', label: 'R Reputation (ชื่อเสียง)' }, { key: 'I', short: 'I', label: 'I Image (ภาพลักษณ์)' },
  { key: 'L', short: 'L', label: 'L Law (กฎหมาย)' }, { key: 'O', short: 'O', label: 'O Other (อื่น ๆ)' },
]

export type Level = 'critical' | 'high' | 'medium' | 'low'
interface LevelDef { key: Level; label: string; range: string; min: number; tag: string; desc: string }
// ก่อนจัดการ (ตามแบบฟอร์ม)
export const LEVELS: LevelDef[] = [
  { key: 'critical', label: 'วิกฤติ', range: '12.5 – 25', min: 12.5, tag: 'red', desc: 'เป็นความเสี่ยงขั้นวิกฤติ ต้องมีการดำเนินการโดยทันทีและมีการวางแผนจัดการความเสี่ยง' },
  { key: 'high', label: 'สูง', range: '9.5 – 12.4', min: 9.5, tag: 'volcano', desc: 'เป็นความเสี่ยงสูง ต้องมีการดำเนินการบางอย่างเพื่อลดความเสี่ยง' },
  { key: 'medium', label: 'ปานกลาง', range: '3.5 – 9.4', min: 3.5, tag: 'gold', desc: 'เป็นความเสี่ยงปานกลาง ต้องมีการติดตามและอาจมีมาตรการป้องกัน' },
  { key: 'low', label: 'ต่ำ', range: '1 – 3.4', min: 0, tag: 'green', desc: 'เป็นความเสี่ยงต่ำ ต้องมีการติดตามเป็นระยะ แต่ยังไม่ต้องมีการดำเนินการใดๆเพิ่มเติม' },
]
// หลังจัดการ (ความเสี่ยงคงเหลือ) — แบบฟอร์มใช้เกณฑ์ปานกลาง/ต่ำต่างจากก่อนจัดการ (5.01 – 9.4 / 1 – 5.0)
export const RESIDUAL_LEVELS: LevelDef[] = [
  { key: 'critical', label: 'วิกฤติ', range: '12.5 – 25', min: 12.5, tag: 'red', desc: 'เป็นความเสี่ยงขั้นวิกฤติ ต้องมีการดำเนินการโดยทันที' },
  { key: 'high', label: 'สูง', range: '9.5 – 12.4', min: 9.5, tag: 'volcano', desc: 'เป็นความเสี่ยงสูง ต้องมีการดำเนินการบางอย่างเพื่อลดความเสี่ยง' },
  { key: 'medium', label: 'ปานกลาง', range: '5.01 – 9.4', min: 5.01, tag: 'gold', desc: 'เป็นความเสี่ยงปานกลาง ต้องมีการติดตามและอาจมีมาตรการป้องกัน' },
  { key: 'low', label: 'ต่ำ', range: '1 – 5.0', min: 0, tag: 'green', desc: 'ต้องมีการติดตามเป็นระยะ แต่ยังไม่ต้องมีการดำเนินการใดๆเพิ่มเติม' },
]
export const levelDef = (score: number, residual = false) => (residual ? RESIDUAL_LEVELS : LEVELS).find(l => score >= l.min)!
export const levelOf = (score: number, residual = false): Level => levelDef(score, residual).key

// ค่าเฉลี่ย 2 ตำแหน่ง (ปัดครึ่งขึ้นแบบแบบฟอร์ม Excel) — ข้อที่ยังไม่ประเมินไม่นับ
export const avg2 = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100 + 1e-9) / 100 : null }
export const fmt2 = (n: number | null) => n == null ? '-' : n.toFixed(2)
export const fmt1 = (n: number | null) => n == null ? '-' : (Math.round(n * 10 + 1e-9) / 10).toFixed(1)
// แผนจัดการในแบบฟอร์มคั่นแต่ละข้อด้วย " | "
export const planParts = (s: string | null) => (s ?? '').split('|').map(x => x.trim()).filter(Boolean)
export const isOverdue = (i: Item, today: string) => !!i.due_date && i.due_date < today && i.progress_pct < 100
export const thDate = (s: string | null) => s ? new Date(`${s}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'
// ชื่อหมวดแบบสั้น (ตัดวงเล็บอ้างอิงกฎหมายออก) สำหรับป้ายกราฟ
export const clusterShort = (name: string) => name.replace(/\s*\(.*\)\s*$/, '')
export const DEFAULT_REVIEWER = 'คณะกรรมการพิจารณาความเสี่ยง'
