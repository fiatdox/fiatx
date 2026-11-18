// ชนิดข้อมูลและค่าคงที่ของทะเบียนความเสี่ยง — ใช้ร่วมกันระหว่างหน้าเว็บและรายงาน Excel
import dayjs from 'dayjs'

export type Category = 'strategic' | 'operational' | 'financial' | 'compliance' | 'reputational' | 'cyber'
export type Treatment = 'mitigate' | 'accept' | 'transfer' | 'avoid' | 'monitor'
export interface Item {
  id: number; register_id: number; identified_date: string; category: Category; asset_group: string; bia_service_id: number | null; bia_service_name: string | null
  threat: string; vulnerability: string | null; controls: string | null; cia: string[]; impact_areas: string[]; likelihood: number; impact: number; score: number
  owner: string | null; treatment: Treatment; treatment_plan: string | null; progress_pct: number; due_date: string | null
  residual_areas: string[]; residual_likelihood: number | null; residual_impact: number | null; residual_score: number | null
  status: 'open' | 'closed'; follow_up: string | null; copied_from: number | null; updated_at: string; updated_by_name: string | null
}
export interface Header {
  id: number; period: string; recorder_id: number | null; recorder_name: string | null; recorder_role: string | null; meeting_date: string | null; location: string | null; address: string | null
  critical_service: string | null; notes: string | null; updated_at: string; updated_by_name: string | null
}
export interface ListRow extends Header { items: number; open_items: number; avg_score: number | null; avg_residual: number | null }
export interface Register extends Header { items: Item[] }

export const CATEGORY_LABEL: Record<Category, string> = { strategic: 'Strategic', operational: 'Operational', financial: 'Financial', compliance: 'Compliance', reputational: 'Reputational', cyber: 'Cyber Security' }
export const TREATMENT_LABEL: Record<Treatment, string> = { mitigate: 'Mitigate Risk', accept: 'Accept Risk', transfer: 'Transfer Risk', avoid: 'Avoid Risk', monitor: 'Continue Monitoring' }
export const CIA = [{ key: 'C', label: 'Confidentiality (ความลับ)' }, { key: 'I', label: 'Integrity (ความถูกต้อง)' }, { key: 'A', label: 'Availability (ความพร้อมใช้)' }]
// ความรุนแรงแต่ละด้าน — ตัวอักษรตามแบบฟอร์ม
export const AREAS = [
  { key: 'F', label: 'F Financial (การเงิน)' }, { key: 'S', label: 'S Service (การให้บริการ)' }, { key: 'R', label: 'R Reputation (ชื่อเสียง)' },
  { key: 'I', label: 'I Image (ภาพลักษณ์)' }, { key: 'L', label: 'L Law (กฎหมาย)' }, { key: 'O', label: 'O Other (อื่น ๆ)' },
]
export type Level = 'critical' | 'high' | 'medium' | 'low'
export const LEVELS: { key: Level; label: string; range: string; min: number; tag: string; desc: string }[] = [
  { key: 'critical', label: 'วิกฤติ', range: '12.5 – 25', min: 12.5, tag: 'red', desc: 'ต้องดำเนินการโดยทันทีและวางแผนจัดการความเสี่ยง' },
  { key: 'high', label: 'สูง', range: '9.5 – 12.4', min: 9.5, tag: 'volcano', desc: 'ต้องดำเนินการบางอย่างเพื่อลดความเสี่ยง' },
  { key: 'medium', label: 'ปานกลาง', range: '3.5 – 9.4', min: 3.5, tag: 'gold', desc: 'ต้องติดตามและอาจมีมาตรการป้องกัน' },
  { key: 'low', label: 'ต่ำ', range: '1 – 3.4', min: 0, tag: 'green', desc: 'ติดตามเป็นระยะ ยังไม่ต้องดำเนินการเพิ่มเติม' },
]
export const levelOf = (score: number): Level => LEVELS.find(l => score >= l.min)!.key
export const levelLabel = (score: number | null) => score == null ? '' : LEVELS.find(l => l.key === levelOf(score))!.label
export const LEVEL_COLOR = { light: { critical: '#e34948', high: '#eb6834', medium: '#eda100', low: '#1baf7a' }, dark: { critical: '#e66767', high: '#d95926', medium: '#c98500', low: '#199e70' } }
export const thShort = (s: string | null) => s ? dayjs(s).toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'
// รอบทะเบียน = ปีงบประมาณ (พ.ศ.) + ครั้งที่ ปีละ 2 ครั้ง: 'YYYY-1' ต.ค.–มี.ค. · 'YYYY-2' เม.ย.–ก.ย.
export const fyOf = (p: string) => Number(p.slice(0, 4))
export const roundOf = (p: string) => Number(p.slice(5))
export const periodOf = (d: string | Date = new Date()) => {
  const x = dayjs(d), y = x.year() + 543, m = x.month() + 1
  return m >= 10 ? `${y + 1}-1` : m <= 3 ? `${y}-1` : `${y}-2`
}
export const periodEnd = (p: string) => `${fyOf(p) - 543}-${roundOf(p) === 1 ? '03-31' : '09-30'}`
const yy = (n: number) => String(n).slice(2)
export const periodRange = (p: string) => roundOf(p) === 1 ? `ต.ค. ${yy(fyOf(p) - 1)} – มี.ค. ${yy(fyOf(p))}` : `เม.ย. – ก.ย. ${yy(fyOf(p))}`
export const periodLabel = (p: string) => `ปีงบประมาณ ${fyOf(p)} ครั้งที่ ${roundOf(p)} (${periodRange(p)})`
export const periodShort = (p: string) => `ปีงบ ${fyOf(p)} ครั้งที่ ${roundOf(p)}`
export const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 10) / 10 : null
export const isOverdue = (i: Item, today: string) => i.status === 'open' && !!i.due_date && i.due_date < today && i.progress_pct < 100
