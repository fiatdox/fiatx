export type Dimension = {
  key: string
  no: number
  name: string
  short: string
  color: string
  items: AssessItem[]
}

export type AssessItem = {
  key: string
  no: string
  name: string
  maxScore: number
  earnedScore: number
  requiredMax: number
  requiredEarned: number
}

export const STORAGE_KEY = 'smart-hospital-assessment-v1'

export const defaultDimensions: Dimension[] = [
  {
    key: 'infra',
    no: 1,
    name: 'แบบประเมินด้านโครงสร้างพื้นฐาน',
    short: 'Infrastructure',
    color: '#3b82f6',
    items: [
      { key: '1.1', no: '1.1', name: 'ห้อง Data Center ที่เป็นมาตรฐาน', maxScore: 73, earnedScore: 70, requiredMax: 60, requiredEarned: 60 },
      { key: '1.2', no: '1.2', name: 'ระบบ Compute and Storage ที่มีประสิทธิภาพและมั่นคงปลอดภัย', maxScore: 45, earnedScore: 45, requiredMax: 25, requiredEarned: 25 },
      { key: '1.3', no: '1.3', name: 'ระบบสำรองข้อมูล (Backup)', maxScore: 31, earnedScore: 18, requiredMax: 25, requiredEarned: 15 },
      { key: '1.4', no: '1.4', name: 'ระบบเครือข่ายอินเตอร์เน็ต', maxScore: 8, earnedScore: 8, requiredMax: 5, requiredEarned: 5 },
      { key: '1.5', no: '1.5', name: 'ระบบเครือข่ายภายในองค์กร', maxScore: 74, earnedScore: 48, requiredMax: 30, requiredEarned: 25 },
      { key: '1.6', no: '1.6', name: 'Computer and Computer-like device', maxScore: 30, earnedScore: 25, requiredMax: 10, requiredEarned: 10 },
      { key: '1.7', no: '1.7', name: 'Software / Application', maxScore: 15, earnedScore: 0, requiredMax: 10, requiredEarned: 0 },
      { key: '1.8', no: '1.8', name: 'Hospital Information System (HIS)', maxScore: 19, earnedScore: 11, requiredMax: 5, requiredEarned: 5 },
    ],
  },
  {
    key: 'mgmt',
    no: 2,
    name: 'แบบประเมินด้านบริหารจัดการ',
    short: 'Management',
    color: '#8b5cf6',
    items: [
      { key: '2.1', no: '2.1', name: 'ProviderID', maxScore: 35, earnedScore: 17, requiredMax: 15, requiredEarned: 15 },
      { key: '2.2', no: '2.2', name: 'การเชื่อมโยง PHR กระทรวงสาธารณสุข', maxScore: 30, earnedScore: 25, requiredMax: 25, requiredEarned: 20 },
      { key: '2.3', no: '2.3', name: 'Financial management', maxScore: 10, earnedScore: 8, requiredMax: 8, requiredEarned: 8 },
      { key: '2.4', no: '2.4', name: 'การส่งต่อผู้ป่วยด้วยระบบอิเล็กทรอนิกส์', maxScore: 30, earnedScore: 20, requiredMax: 10, requiredEarned: 10 },
      { key: '2.5', no: '2.5', name: 'การสื่อสารองค์กร', maxScore: 14, earnedScore: 5, requiredMax: 10, requiredEarned: 5 },
      { key: '2.6', no: '2.6', name: 'ช่องทางการสื่อสาร (Communication Technology)', maxScore: 14, earnedScore: 14, requiredMax: 10, requiredEarned: 10 },
      { key: '2.7', no: '2.7', name: 'ระบบหนังสือราชการอิเล็กทรอนิกส์', maxScore: 20, earnedScore: 15, requiredMax: 15, requiredEarned: 10 },
      { key: '2.8', no: '2.8', name: 'Payment', maxScore: 10, earnedScore: 10, requiredMax: 10, requiredEarned: 10 },
      { key: '2.9', no: '2.9', name: 'Health ID', maxScore: 10, earnedScore: 10, requiredMax: 10, requiredEarned: 10 },
      { key: '2.10', no: '2.10', name: 'Enterprise Resource Planning (ERP)', maxScore: 17, earnedScore: 5, requiredMax: 10, requiredEarned: 5 },
      { key: '2.11', no: '2.11', name: 'ระบบ Management Information System (MIS)', maxScore: 28, earnedScore: 8, requiredMax: 20, requiredEarned: 5 },
      { key: '2.12', no: '2.12', name: 'Data Governance', maxScore: 52, earnedScore: 19, requiredMax: 22, requiredEarned: 8 },
    ],
  },
  {
    key: 'service',
    no: 3,
    name: 'แบบประเมินด้านการบริการ',
    short: 'Service',
    color: '#10b981',
    items: [
      { key: '3.1', no: '3.1', name: 'ตู้อัจฉริยะบริการ (Kiosk)', maxScore: 17, earnedScore: 13, requiredMax: 10, requiredEarned: 10 },
      { key: '3.2', no: '3.2', name: 'ระบบคิวดิจิทัล (Digital Queue)', maxScore: 16, earnedScore: 10, requiredMax: 10, requiredEarned: 10 },
      { key: '3.3', no: '3.3', name: 'ระบบนัดหมายออนไลน์', maxScore: 40, earnedScore: 5, requiredMax: 25, requiredEarned: 5 },
      { key: '3.4', no: '3.4', name: 'OPD paperless', maxScore: 40, earnedScore: 29, requiredMax: 20, requiredEarned: 20 },
      { key: '3.5', no: '3.5', name: 'IPD paperless', maxScore: 60, earnedScore: 16.5, requiredMax: 33, requiredEarned: 16.5 },
      { key: '3.6', no: '3.6', name: 'ระบบเชื่อมโยงอุปกรณ์ Smart IoT กับ HIS', maxScore: 15, earnedScore: 1.5, requiredMax: 11, requiredEarned: 0.5 },
      { key: '3.7', no: '3.7', name: 'ระบบการแพทย์ทางไกล (Telemedicine)', maxScore: 59, earnedScore: 35, requiredMax: 39, requiredEarned: 27 },
      { key: '3.8', no: '3.8', name: 'ระบบบริการ Home service', maxScore: 18, earnedScore: 5, requiredMax: 12, requiredEarned: 5 },
      { key: '3.9', no: '3.9', name: 'การใช้เทคโนโลยีสารสนเทศขั้นสูง (AI)', maxScore: 10, earnedScore: 0, requiredMax: 5, requiredEarned: 0 },
      { key: '3.10', no: '3.10', name: 'การสร้างนวัตกรรมทางสารสนเทศ', maxScore: 10, earnedScore: 7, requiredMax: 5, requiredEarned: 5 },
      { key: '3.11', no: '3.11', name: 'การออกเอกสารอิเล็กทรอนิกส์ผ่านระบบ MOPH CERT', maxScore: 5, earnedScore: 0, requiredMax: 0, requiredEarned: 0 },
    ],
  },
  {
    key: 'people',
    no: 4,
    name: 'แบบประเมินด้านบุคลากร',
    short: 'People',
    color: '#f59e0b',
    items: [
      { key: '4.1', no: '4.1', name: 'ผู้บริหารสูงสุดขององค์กร', maxScore: 5, earnedScore: 0, requiredMax: 0, requiredEarned: 0 },
      { key: '4.2', no: '4.2', name: 'การอบรมหลักสูตรโดยกระทรวงสาธารณสุข', maxScore: 30, earnedScore: 10, requiredMax: 0, requiredEarned: 0 },
      { key: '4.3', no: '4.3', name: 'การอบรมหลักสูตร E-learning MOPH Academy', maxScore: 60, earnedScore: 0, requiredMax: 0, requiredEarned: 0 },
      { key: '4.4', no: '4.4', name: 'ขับเคลื่อนคณะกรรมการพัฒนาบุคลากรด้านสุขภาพดิจิทัล', maxScore: 5, earnedScore: 0, requiredMax: 0, requiredEarned: 0 },
    ],
  },
]

export const loadDimensions = (): Dimension[] => {
  if (typeof window === 'undefined') return defaultDimensions
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultDimensions
    const parsed = JSON.parse(raw) as Dimension[]
    if (!Array.isArray(parsed) || parsed.length !== defaultDimensions.length) return defaultDimensions
    return parsed
  } catch {
    return defaultDimensions
  }
}

export const saveDimensions = (dims: Dimension[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dims))
}

export const dimensionTotals = (d: Dimension) => {
  const max = d.items.reduce((s, i) => s + i.maxScore, 0)
  const earned = d.items.reduce((s, i) => s + i.earnedScore, 0)
  const reqMax = d.items.reduce((s, i) => s + i.requiredMax, 0)
  const reqEarned = d.items.reduce((s, i) => s + i.requiredEarned, 0)
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0
  const reqPct = reqMax > 0 ? Math.round((reqEarned / reqMax) * 100) : 100
  return { max, earned, reqMax, reqEarned, pct, reqPct }
}
