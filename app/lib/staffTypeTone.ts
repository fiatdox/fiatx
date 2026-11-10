// สีตามประเภทบุคลากร — ใช้ร่วมกันทุกหน้า (ทะเบียนบุคลากร, สรุปวันลารายบุคคล) ให้ประเภทเดียวกันสีเดียวกัน
// จับจากชื่อ (id ต่างฐานอาจไม่ตรงกัน) — ประเภทที่ไม่รู้จักวนสีสำรองตาม id ให้สีคงที่ต่อประเภท
// ลำดับสำคัญ: ใช้คำที่ตรงก่อน — "รายวัน" ต้องมาก่อน "ลูกจ้างชั่วคราว" ไม่งั้นรายวันได้สีเดียวกับรายเดือน
export interface Tone { tag: string; hex: string }

export const TYPE_TONES: [string, Tone][] = [
  ['พนักงานราชการ', { tag: 'cyan', hex: '#0891b2' }],
  ['ข้าราชการ', { tag: 'blue', hex: '#1d4ed8' }],
  ['ลูกจ้างประจำ', { tag: 'purple', hex: '#7c3aed' }],
  ['พนักงานกระทรวง', { tag: 'green', hex: '#15803d' }],
  ['รายวัน', { tag: 'gold', hex: '#ca8a04' }],
  ['ลูกจ้างชั่วคราว', { tag: 'orange', hex: '#ea580c' }],
]
const SPARE_TONES: Tone[] = [
  { tag: 'magenta', hex: '#c026d3' }, { tag: 'geekblue', hex: '#4338ca' },
  { tag: 'volcano', hex: '#dc2626' }, { tag: 'lime', hex: '#65a30d' },
]
export const NO_TONE: Tone = { tag: 'default', hex: '#64748b' }

/** สีของประเภทบุคลากร — ไม่รู้จัก: สีสำรองตาม id (ไม่ส่ง id = สีกลาง) */
export const typeTone = (name?: string | null, id?: number): Tone => {
  if (!name) return NO_TONE
  return TYPE_TONES.find(([k]) => name.includes(k))?.[1] ?? (id == null ? NO_TONE : SPARE_TONES[id % SPARE_TONES.length])
}
