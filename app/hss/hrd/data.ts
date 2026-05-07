// ──────────────────────────────────────────────────────────────────
// HRD (Human Resource Development) — data layer
// ระบบบริหารและพัฒนาบุคลากรของโรงพยาบาล
// ──────────────────────────────────────────────────────────────────

export type HRDStatus = 'draft' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

export const STATUS_OPTIONS: { value: HRDStatus; label: string; color: string }[] = [
  { value: 'draft',       label: 'ร่าง',         color: 'default'    },
  { value: 'approved',    label: 'อนุมัติ',      color: 'cyan'       },
  { value: 'in_progress', label: 'กำลังดำเนินการ', color: 'processing' },
  { value: 'on_hold',     label: 'พักไว้',       color: 'warning'    },
  { value: 'completed',   label: 'สำเร็จ',       color: 'success'    },
  { value: 'cancelled',   label: 'ยกเลิก',       color: 'error'      },
]

export const PILLAR_OPTIONS = [
  { value: 'core',       label: 'สมรรถนะหลักองค์กร (Core Values)',  color: '#a855f7' },
  { value: 'leadership', label: 'ภาวะผู้นำและบริหาร (Leadership)',   color: '#3b82f6' },
  { value: 'clinical',   label: 'ความเป็นเลิศทางคลินิก (Clinical Excellence)', color: '#10b981' },
  { value: 'digital',    label: 'ดิจิทัลและนวัตกรรม (Digital & Innovation)',   color: '#06b6d4' },
  { value: 'service',    label: 'การบริการและจริยธรรม (Service & Ethics)',     color: '#f59e0b' },
] as const

export const COMPETENCY_TYPE_OPTIONS = [
  { value: 'core',         label: 'สมรรถนะหลัก (Core Competency)',          color: '#a855f7' },
  { value: 'managerial',   label: 'สมรรถนะการบริหาร (Managerial)',           color: '#3b82f6' },
  { value: 'functional',   label: 'สมรรถนะตามภารกิจ (Functional)',           color: '#10b981' },
  { value: 'professional', label: 'สมรรถนะวิชาชีพ (Professional)',           color: '#06b6d4' },
  { value: 'technical',    label: 'สมรรถนะเฉพาะทาง/เทคนิค (Technical)',      color: '#f59e0b' },
] as const

export const TARGET_GROUP_OPTIONS = [
  { value: 'executive',  label: 'ผู้บริหารระดับสูง' },
  { value: 'mid_mgr',    label: 'หัวหน้างาน/ผู้บริหารระดับกลาง' },
  { value: 'physician',  label: 'แพทย์' },
  { value: 'nurse',      label: 'พยาบาลวิชาชีพ' },
  { value: 'allied',     label: 'สหวิชาชีพ (เภสัช เทคนิคการแพทย์ ฯลฯ)' },
  { value: 'support',    label: 'บุคลากรสายสนับสนุน' },
  { value: 'all',        label: 'บุคลากรทุกระดับ' },
]

export const FUNDING_OPTIONS = [
  { value: 'budget',     label: 'งบประมาณแผ่นดิน' },
  { value: 'revenue',    label: 'งบบำรุงโรงพยาบาล' },
  { value: 'sso',        label: 'งบประกันสังคม' },
  { value: 'uc',         label: 'งบกองทุนหลักประกันสุขภาพ (UC)' },
  { value: 'donation',   label: 'งบบริจาค' },
  { value: 'external',   label: 'แหล่งทุนภายนอก/หน่วยงานอื่น' },
]

export const TRAINING_FORMAT_OPTIONS = [
  { value: 'inhouse',    label: 'In-house (ภายใน รพ.)' },
  { value: 'external',   label: 'ส่งอบรมภายนอก' },
  { value: 'online',     label: 'Online / E-Learning' },
  { value: 'hybrid',     label: 'Hybrid' },
  { value: 'workshop',   label: 'Workshop / On-the-Job' },
  { value: 'conference', label: 'ประชุมวิชาการ / สัมมนา' },
]

export const FISCAL_YEAR_OPTIONS = [
  { value: 2024, label: 'ปีงบประมาณ 2567' },
  { value: 2025, label: 'ปีงบประมาณ 2568' },
  { value: 2026, label: 'ปีงบประมาณ 2569' },
  { value: 2027, label: 'ปีงบประมาณ 2570' },
]

// ──────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────
export type Strategy = {
  id: string
  code: string                 // เช่น HRD-S01
  pillar: typeof PILLAR_OPTIONS[number]['value']
  name: string                 // ชื่อยุทธศาสตร์
  vision: string               // ผลลัพธ์ที่คาดหวัง / vision link
  description: string
  owner: string                // ผู้รับผิดชอบหลัก
  ownerPosition: string
  startYear: number
  endYear: number
  status: HRDStatus
  budget: number               // งบประมาณกรอบ 5 ปี
  notes?: string
}

export type Goal = {
  id: string
  code: string                 // HRD-G01
  strategyId: string           // FK → Strategy.id
  name: string                 // เป้าหมาย
  description: string
  fiscalYear: number
  unit: string                 // หน่วยวัด เช่น คน, ร้อยละ, ครั้ง
  baseline: number
  target: number
  current: number
  owner: string
  department: string
  status: HRDStatus
  notes?: string
}

export type ProgressEntry = {
  id: string
  date: string                 // ISO date
  note: string
  reportedBy: string
  attendees?: number
  spent?: number
}

export type TrainingCourse = {
  id: string
  code: string                 // HRD-T01
  name: string                 // ชื่อหลักสูตร
  competencyType: typeof COMPETENCY_TYPE_OPTIONS[number]['value']
  targetGroup: typeof TARGET_GROUP_OPTIONS[number]['value']
  format: typeof TRAINING_FORMAT_OPTIONS[number]['value']
  fiscalYear: number
  goalId?: string              // FK → Goal.id (optional linkage)
  startDate: string            // ISO
  endDate: string              // ISO
  hours: number                // ชั่วโมงรวม
  seatsPlanned: number
  seatsActual: number
  budgetPlanned: number
  budgetSpent: number
  funding: typeof FUNDING_OPTIONS[number]['value']
  venue: string
  trainer: string              // วิทยากร
  responsible: string          // ผู้ประสานงาน
  department: string
  status: HRDStatus
  objectives: string           // วัตถุประสงค์
  expectedOutcome: string
  evaluationMethod: string     // วิธีวัดผล
  postScore?: number           // คะแนนประเมินเฉลี่ย (0-100)
  satisfaction?: number        // ความพึงพอใจ (0-100)
  progress: ProgressEntry[]
}

// ──────────────────────────────────────────────────────────────────
// DEFAULT MOCK DATA
// ──────────────────────────────────────────────────────────────────
export const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: 'st-01',
    code: 'HRD-S01',
    pillar: 'leadership',
    name: 'พัฒนาผู้นำการเปลี่ยนแปลงทางสุขภาพ (Transformational Health Leader)',
    vision: 'มีผู้บริหารและหัวหน้างานที่สามารถนำองค์กรเข้าสู่ยุค Smart Hospital ได้อย่างมีประสิทธิภาพ',
    description: 'สร้างทักษะภาวะผู้นำเชิงกลยุทธ์ การคิดเชิงระบบ การบริหารการเปลี่ยนแปลง และการตัดสินใจด้วยข้อมูล (Data-driven) สำหรับผู้บริหารทุกระดับ',
    owner: 'นพ.สมชาย วิชาญดี',
    ownerPosition: 'รองผู้อำนวยการฝ่ายการแพทย์',
    startYear: 2025,
    endYear: 2029,
    status: 'in_progress',
    budget: 4500000,
    notes: 'สอดคล้องกับนโยบายกระทรวงเรื่อง Smart Hospital และ HA ขั้น 4'
  },
  {
    id: 'st-02',
    code: 'HRD-S02',
    pillar: 'clinical',
    name: 'ยกระดับสมรรถนะวิชาชีพสู่ความเป็นเลิศทางคลินิก (Clinical Excellence)',
    vision: 'บุคลากรวิชาชีพมีสมรรถนะตามมาตรฐานสภาวิชาชีพและเทียบเท่าระดับ Excellence Center',
    description: 'พัฒนาแพทย์ พยาบาล และสหวิชาชีพในด้าน 5 Service Plan หลัก ได้แก่ มะเร็ง โรคหัวใจ อุบัติเหตุ NCD และทารกแรกเกิด ผ่านการอบรม การส่งศึกษาต่อ และ Fellowship',
    owner: 'พญ.วราภรณ์ คลินิกชั้นเลิศ',
    ownerPosition: 'รองผู้อำนวยการฝ่ายการแพทย์',
    startYear: 2025,
    endYear: 2029,
    status: 'in_progress',
    budget: 12000000,
    notes: 'รวมงบส่งศึกษาต่อ Fellowship 8 สาขา'
  },
  {
    id: 'st-03',
    code: 'HRD-S03',
    pillar: 'digital',
    name: 'พัฒนาทักษะดิจิทัลและการใช้ข้อมูล (Digital Health Workforce)',
    vision: 'บุคลากร 100% ใช้ระบบดิจิทัลของ รพ. ได้คล่อง และมีบุคลากรเชี่ยวชาญด้าน Health Data 5%',
    description: 'พัฒนา Digital Literacy พื้นฐาน, AI ใน Healthcare, Cybersecurity, Data Analytics, และทักษะการใช้งาน HIS/EMR ระดับสูง',
    owner: 'นายภาณุพงศ์ ดิจิทัลล้ำ',
    ownerPosition: 'หัวหน้างานเทคโนโลยีสารสนเทศ',
    startYear: 2026,
    endYear: 2028,
    status: 'approved',
    budget: 3200000,
    notes: 'เชื่อมโยงกับโครงการ Smart Hospital และ HAIT'
  },
  {
    id: 'st-04',
    code: 'HRD-S04',
    pillar: 'service',
    name: 'เสริมสร้างจริยธรรมและหัวใจการให้บริการ (Service Mind & Ethics)',
    vision: 'อัตราข้อร้องเรียนด้านบริการลดลง 50% และความพึงพอใจผู้รับบริการ ≥ 90%',
    description: 'อบรมจิตบริการ การสื่อสารกับผู้ป่วยและญาติ จริยธรรมวิชาชีพ การจัดการข้อร้องเรียน และความปลอดภัยผู้ป่วย (Patient Safety)',
    owner: 'นางสุภาพร ใจรับใช้',
    ownerPosition: 'หัวหน้ากลุ่มงานพัฒนาคุณภาพ',
    startYear: 2025,
    endYear: 2027,
    status: 'in_progress',
    budget: 1800000
  },
  {
    id: 'st-05',
    code: 'HRD-S05',
    pillar: 'core',
    name: 'สร้างวัฒนธรรมการเรียนรู้ตลอดชีวิต (Learning Organization)',
    vision: 'รพ. ผ่านเกณฑ์ Learning Organization และมีการแลกเปลี่ยนเรียนรู้ภายในทุกหน่วยงาน',
    description: 'สร้างระบบ Knowledge Management, ชุมชนนักปฏิบัติ (CoP), การจัดการความรู้ในงาน, ระบบพี่เลี้ยง (Mentor) และ Coaching ในทุกฝ่าย',
    owner: 'นายอนันต์ พัฒนาคน',
    ownerPosition: 'หัวหน้ากลุ่มงานทรัพยากรบุคคล',
    startYear: 2025,
    endYear: 2029,
    status: 'approved',
    budget: 1500000
  },
]

export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'g-01', code: 'HRD-G01', strategyId: 'st-01',
    name: 'หัวหน้างานผ่านหลักสูตรพัฒนาผู้นำ ≥ 80%',
    description: 'หัวหน้ากลุ่มงาน/หัวหน้าฝ่าย ผ่านหลักสูตร Strategic Leadership อย่างน้อย 24 ชม./ปี',
    fiscalYear: 2026,
    unit: 'ร้อยละ', baseline: 45, target: 80, current: 62,
    owner: 'นายอนันต์ พัฒนาคน', department: 'กลุ่มงานทรัพยากรบุคคล',
    status: 'in_progress'
  },
  {
    id: 'g-02', code: 'HRD-G02', strategyId: 'st-01',
    name: 'แผนสืบทอดตำแหน่ง (Succession Plan) ครบทุกตำแหน่งหลัก',
    description: 'มี Successor Pool ที่พร้อมรับตำแหน่งหัวหน้างานสำคัญทุกตำแหน่งภายใน 2 ปี',
    fiscalYear: 2027,
    unit: 'ตำแหน่ง', baseline: 8, target: 25, current: 12,
    owner: 'นพ.สมชาย วิชาญดี', department: 'ฝ่ายบริหาร',
    status: 'in_progress'
  },
  {
    id: 'g-03', code: 'HRD-G03', strategyId: 'st-02',
    name: 'แพทย์เฉพาะทางด้านมะเร็งเพิ่มขึ้น',
    description: 'ส่งแพทย์ศึกษาต่อ Fellowship Oncology / Radiation Oncology / Hematology',
    fiscalYear: 2026,
    unit: 'คน', baseline: 3, target: 8, current: 5,
    owner: 'พญ.วราภรณ์ คลินิกชั้นเลิศ', department: 'ฝ่ายการแพทย์',
    status: 'in_progress'
  },
  {
    id: 'g-04', code: 'HRD-G04', strategyId: 'st-02',
    name: 'พยาบาลผ่านหลักสูตรเฉพาะทาง 4 เดือน',
    description: 'พยาบาลในแผนกหลัก (ICU, ER, OR, NICU) ผ่านหลักสูตรเฉพาะทาง',
    fiscalYear: 2026,
    unit: 'คน', baseline: 18, target: 35, current: 22,
    owner: 'นางวิไล หัวใจการพยาบาล', department: 'กลุ่มการพยาบาล',
    status: 'in_progress'
  },
  {
    id: 'g-05', code: 'HRD-G05', strategyId: 'st-03',
    name: 'บุคลากรผ่านการประเมิน Digital Literacy',
    description: 'บุคลากรทุกคนผ่านเกณฑ์ Digital Literacy ระดับพื้นฐาน',
    fiscalYear: 2026,
    unit: 'ร้อยละ', baseline: 55, target: 95, current: 78,
    owner: 'นายภาณุพงศ์ ดิจิทัลล้ำ', department: 'งานเทคโนโลยีสารสนเทศ',
    status: 'in_progress'
  },
  {
    id: 'g-06', code: 'HRD-G06', strategyId: 'st-03',
    name: 'มีบุคลากรเชี่ยวชาญด้าน Health Data Analytics',
    description: 'พัฒนาบุคลากรเฉพาะทางด้านการวิเคราะห์ข้อมูลสุขภาพ',
    fiscalYear: 2027,
    unit: 'คน', baseline: 2, target: 12, current: 4,
    owner: 'นายภาณุพงศ์ ดิจิทัลล้ำ', department: 'งานเทคโนโลยีสารสนเทศ',
    status: 'approved'
  },
  {
    id: 'g-07', code: 'HRD-G07', strategyId: 'st-04',
    name: 'ลดข้อร้องเรียนด้านบริการ',
    description: 'อบรม Service Mind ทุกหน่วยงานและลดอัตราข้อร้องเรียน',
    fiscalYear: 2026,
    unit: 'เรื่อง/ปี', baseline: 48, target: 24, current: 33,
    owner: 'นางสุภาพร ใจรับใช้', department: 'กลุ่มงานพัฒนาคุณภาพ',
    status: 'in_progress'
  },
  {
    id: 'g-08', code: 'HRD-G08', strategyId: 'st-04',
    name: 'ความพึงพอใจผู้รับบริการ',
    description: 'ระดับความพึงพอใจของผู้รับบริการในระดับดีมากขึ้นไป',
    fiscalYear: 2026,
    unit: 'ร้อยละ', baseline: 82, target: 92, current: 87,
    owner: 'นางสุภาพร ใจรับใช้', department: 'กลุ่มงานพัฒนาคุณภาพ',
    status: 'in_progress'
  },
  {
    id: 'g-09', code: 'HRD-G09', strategyId: 'st-05',
    name: 'จำนวนเวที KM/CoP ภายใน รพ.',
    description: 'จัดเวทีแลกเปลี่ยนเรียนรู้ภายในทุกเดือน',
    fiscalYear: 2026,
    unit: 'ครั้ง/ปี', baseline: 4, target: 24, current: 11,
    owner: 'นายอนันต์ พัฒนาคน', department: 'กลุ่มงานทรัพยากรบุคคล',
    status: 'in_progress'
  },
  {
    id: 'g-10', code: 'HRD-G10', strategyId: 'st-05',
    name: 'ชั่วโมงพัฒนาตนเองเฉลี่ย',
    description: 'บุคลากรมีชั่วโมงพัฒนาตนเองเฉลี่ย ≥ 20 ชม./คน/ปี',
    fiscalYear: 2026,
    unit: 'ชม./คน/ปี', baseline: 12, target: 20, current: 16,
    owner: 'นายอนันต์ พัฒนาคน', department: 'กลุ่มงานทรัพยากรบุคคล',
    status: 'in_progress'
  },
]

export const DEFAULT_TRAININGS: TrainingCourse[] = [
  {
    id: 't-01', code: 'HRD-T01',
    name: 'Strategic Leadership for Smart Hospital',
    competencyType: 'managerial', targetGroup: 'mid_mgr', format: 'hybrid',
    fiscalYear: 2026, goalId: 'g-01',
    startDate: '2026-06-15', endDate: '2026-08-30', hours: 48,
    seatsPlanned: 40, seatsActual: 38,
    budgetPlanned: 850000, budgetSpent: 320000, funding: 'revenue',
    venue: 'ห้องประชุมใหญ่ ชั้น 7 และระบบ Online',
    trainer: 'รศ.ดร.วิทยา ภาวะผู้นำ — สถาบันบัณฑิตพัฒนบริหารศาสตร์',
    responsible: 'นายอนันต์ พัฒนาคน',
    department: 'กลุ่มงานทรัพยากรบุคคล',
    status: 'in_progress',
    objectives: 'พัฒนาทักษะการคิดเชิงกลยุทธ์ การบริหารการเปลี่ยนแปลง และภาวะผู้นำสำหรับ รพ. ยุคดิจิทัล',
    expectedOutcome: 'หัวหน้างาน 38 คน ผ่านการประเมินภาวะผู้นำระดับ ≥ B+ และมีแผนปฏิบัติการของหน่วยตน',
    evaluationMethod: 'Pre/Post Test + Action Learning Project + 360-degree feedback',
    postScore: 78, satisfaction: 88,
    progress: [
      { id: 'p-1', date: '2026-06-15', note: 'เปิดอบรม Module 1: Strategic Thinking ผู้เข้าอบรม 38/40 คน', reportedBy: 'นายอนันต์', attendees: 38, spent: 120000 },
      { id: 'p-2', date: '2026-07-10', note: 'จบ Module 2: Change Management — คะแนน Pre/Post +18%', reportedBy: 'นายอนันต์', attendees: 37, spent: 200000 }
    ]
  },
  {
    id: 't-02', code: 'HRD-T02',
    name: 'หลักสูตรการพยาบาลเฉพาะทาง สาขาการพยาบาลผู้ป่วยวิกฤต (4 เดือน)',
    competencyType: 'professional', targetGroup: 'nurse', format: 'external',
    fiscalYear: 2026, goalId: 'g-04',
    startDate: '2026-07-01', endDate: '2026-10-31', hours: 640,
    seatsPlanned: 8, seatsActual: 8,
    budgetPlanned: 720000, budgetSpent: 720000, funding: 'budget',
    venue: 'คณะพยาบาลศาสตร์ มหาวิทยาลัยมหิดล',
    trainer: 'คณาจารย์คณะพยาบาลศาสตร์ ม.มหิดล',
    responsible: 'นางวิไล หัวใจการพยาบาล',
    department: 'กลุ่มการพยาบาล (ICU)',
    status: 'in_progress',
    objectives: 'พัฒนาพยาบาลให้มีสมรรถนะเฉพาะทางในการดูแลผู้ป่วยวิกฤตระดับสูง',
    expectedOutcome: 'พยาบาล 8 คน ได้รับวุฒิบัตรเฉพาะทาง และพร้อมประจำหน่วย ICU',
    evaluationMethod: 'การสอบทฤษฎีและปฏิบัติของสภาการพยาบาล',
    progress: [
      { id: 'p-3', date: '2026-07-15', note: 'พยาบาลทั้ง 8 คนรายงานตัวที่ ม.มหิดลเรียบร้อย', reportedBy: 'นางวิไล', attendees: 8 }
    ]
  },
  {
    id: 't-03', code: 'HRD-T03',
    name: 'Digital Literacy & Cybersecurity Awareness',
    competencyType: 'core', targetGroup: 'all', format: 'online',
    fiscalYear: 2026, goalId: 'g-05',
    startDate: '2026-04-01', endDate: '2026-09-30', hours: 12,
    seatsPlanned: 850, seatsActual: 612,
    budgetPlanned: 180000, budgetSpent: 95000, funding: 'revenue',
    venue: 'ระบบ E-Learning โรงพยาบาล',
    trainer: 'ทีมงาน IT ของโรงพยาบาล + วิทยากรภายนอก',
    responsible: 'นายภาณุพงศ์ ดิจิทัลล้ำ',
    department: 'งานเทคโนโลยีสารสนเทศ',
    status: 'in_progress',
    objectives: 'บุคลากรทุกคนรู้เท่าทันภัยไซเบอร์ และใช้ระบบ HIS/EMR ได้อย่างปลอดภัย',
    expectedOutcome: 'บุคลากร ≥ 95% ผ่านเกณฑ์ Digital Literacy และผ่านการทดสอบ Cybersecurity 80 คะแนน',
    evaluationMethod: 'แบบทดสอบออนไลน์ + Phishing Simulation',
    postScore: 84, satisfaction: 79,
    progress: [
      { id: 'p-4', date: '2026-04-01', note: 'เปิดระบบ E-Learning ผู้ลงทะเบียน 612 คน', reportedBy: 'นายภาณุพงศ์', attendees: 612, spent: 95000 }
    ]
  },
  {
    id: 't-04', code: 'HRD-T04',
    name: 'Service Mind & Patient Communication Excellence',
    competencyType: 'core', targetGroup: 'all', format: 'inhouse',
    fiscalYear: 2026, goalId: 'g-07',
    startDate: '2026-05-10', endDate: '2026-08-20', hours: 18,
    seatsPlanned: 320, seatsActual: 245,
    budgetPlanned: 240000, budgetSpent: 145000, funding: 'revenue',
    venue: 'ห้องประชุมขนาดกลาง 3 รอบ',
    trainer: 'อ.เพ็ญศรี การบริการดี — สถาบันพัฒนาบุคลิกภาพ',
    responsible: 'นางสุภาพร ใจรับใช้',
    department: 'กลุ่มงานพัฒนาคุณภาพ',
    status: 'in_progress',
    objectives: 'ปรับปรุงทักษะการสื่อสารและจิตบริการของบุคลากรด่านหน้า',
    expectedOutcome: 'ลดข้อร้องเรียนด้านบริการ ≥ 30%',
    evaluationMethod: 'Role-play assessment + ความพึงพอใจผู้รับบริการ',
    postScore: 82, satisfaction: 91
  ,
    progress: [
      { id: 'p-5', date: '2026-05-10', note: 'รอบที่ 1: ผู้เข้าอบรม 95 คน — Role play คะแนนเฉลี่ย 81', reportedBy: 'นางสุภาพร', attendees: 95, spent: 60000 },
      { id: 'p-6', date: '2026-06-22', note: 'รอบที่ 2: ผู้เข้าอบรม 80 คน', reportedBy: 'นางสุภาพร', attendees: 80, spent: 45000 }
    ]
  },
  {
    id: 't-05', code: 'HRD-T05',
    name: 'Health Data Analytics with Python & Power BI',
    competencyType: 'technical', targetGroup: 'allied', format: 'workshop',
    fiscalYear: 2026, goalId: 'g-06',
    startDate: '2026-09-01', endDate: '2026-11-30', hours: 60,
    seatsPlanned: 15, seatsActual: 0,
    budgetPlanned: 320000, budgetSpent: 0, funding: 'revenue',
    venue: 'ห้องคอมพิวเตอร์ ชั้น 5',
    trainer: 'ทีม Data Engineer จาก สวรส. + อ.จากมหาวิทยาลัยเกษตรศาสตร์',
    responsible: 'นายภาณุพงศ์ ดิจิทัลล้ำ',
    department: 'งานเทคโนโลยีสารสนเทศ',
    status: 'approved',
    objectives: 'สร้างนักวิเคราะห์ข้อมูลสุขภาพให้ใช้ Python และ Power BI ได้',
    expectedOutcome: 'ผู้ผ่านอบรม 15 คน สร้าง Dashboard ภายในของหน่วยตนได้',
    evaluationMethod: 'Project-based: ส่ง Dashboard 1 ชิ้น + Pre/Post Test',
    progress: []
  },
  {
    id: 't-06', code: 'HRD-T06',
    name: 'Fellowship Oncology Training (12 เดือน)',
    competencyType: 'professional', targetGroup: 'physician', format: 'external',
    fiscalYear: 2026, goalId: 'g-03',
    startDate: '2026-07-01', endDate: '2027-06-30', hours: 1920,
    seatsPlanned: 2, seatsActual: 2,
    budgetPlanned: 2400000, budgetSpent: 1200000, funding: 'budget',
    venue: 'คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย',
    trainer: 'คณาจารย์ภาควิชาอายุรศาสตร์ จุฬาฯ',
    responsible: 'พญ.วราภรณ์ คลินิกชั้นเลิศ',
    department: 'ฝ่ายการแพทย์',
    status: 'in_progress',
    objectives: 'เพิ่มแพทย์เฉพาะทางสาขามะเร็งวิทยา',
    expectedOutcome: 'แพทย์ 2 คนได้รับวุฒิบัตร Fellow Oncology',
    evaluationMethod: 'การประเมินของแพทยสภา',
    progress: [
      { id: 'p-7', date: '2026-07-01', note: 'แพทย์ทั้ง 2 ท่านเริ่ม Fellowship ที่จุฬาฯ', reportedBy: 'พญ.วราภรณ์', attendees: 2, spent: 600000 }
    ]
  },
  {
    id: 't-07', code: 'HRD-T07',
    name: 'Coaching for Leaders Workshop',
    competencyType: 'managerial', targetGroup: 'mid_mgr', format: 'workshop',
    fiscalYear: 2026, goalId: 'g-02',
    startDate: '2026-08-12', endDate: '2026-08-14', hours: 18,
    seatsPlanned: 30, seatsActual: 0,
    budgetPlanned: 180000, budgetSpent: 0, funding: 'revenue',
    venue: 'โรงแรมในจังหวัด',
    trainer: 'ICF-Certified Coach',
    responsible: 'นายอนันต์ พัฒนาคน',
    department: 'กลุ่มงานทรัพยากรบุคคล',
    status: 'approved',
    objectives: 'สร้างวัฒนธรรม Coaching ในระดับหัวหน้างาน',
    expectedOutcome: 'หัวหน้างาน 30 คน นำ Coaching Conversation ไปใช้กับทีม',
    evaluationMethod: 'Coaching Practice + Reflection Journal',
    progress: []
  },
  {
    id: 't-08', code: 'HRD-T08',
    name: 'AI in Healthcare: From Diagnosis to Decision Support',
    competencyType: 'technical', targetGroup: 'physician', format: 'conference',
    fiscalYear: 2026,
    startDate: '2026-10-15', endDate: '2026-10-17', hours: 24,
    seatsPlanned: 12, seatsActual: 0,
    budgetPlanned: 360000, budgetSpent: 0, funding: 'donation',
    venue: 'ศูนย์ประชุมแห่งชาติสิริกิติ์',
    trainer: 'วิทยากรนานาชาติ',
    responsible: 'นพ.สมชาย วิชาญดี',
    department: 'ฝ่ายการแพทย์',
    status: 'approved',
    objectives: 'อัปเดตเทคโนโลยี AI ทางการแพทย์ระดับนานาชาติ',
    expectedOutcome: 'แพทย์ 12 ท่าน นำ AI Use Case มาประยุกต์ใน รพ.',
    evaluationMethod: 'รายงานการประยุกต์ใช้ + Knowledge Sharing',
    progress: []
  },
  {
    id: 't-09', code: 'HRD-T09',
    name: 'การช่วยฟื้นคืนชีพขั้นสูง (ACLS Provider)',
    competencyType: 'professional', targetGroup: 'nurse', format: 'inhouse',
    fiscalYear: 2026,
    startDate: '2026-03-15', endDate: '2026-03-17', hours: 16,
    seatsPlanned: 60, seatsActual: 60,
    budgetPlanned: 145000, budgetSpent: 145000, funding: 'budget',
    venue: 'ห้องฝึกทักษะ Simulation ชั้น 3',
    trainer: 'ทีม ACLS Instructor ของ รพ. (Certified)',
    responsible: 'นางวิไล หัวใจการพยาบาล',
    department: 'กลุ่มการพยาบาล',
    status: 'completed',
    objectives: 'พยาบาลทุกคนผ่าน ACLS Provider ตามมาตรฐาน AHA',
    expectedOutcome: 'พยาบาล 60 คน ผ่านเกณฑ์ ACLS 100%',
    evaluationMethod: 'การสอบ AHA Standard',
    postScore: 92, satisfaction: 95,
    progress: [
      { id: 'p-8', date: '2026-03-17', note: 'อบรมเสร็จสิ้น ผ่านเกณฑ์ 60/60 คน (100%)', reportedBy: 'นางวิไล', attendees: 60, spent: 145000 }
    ]
  },
  {
    id: 't-10', code: 'HRD-T10',
    name: 'KM Forum & Best Practice Sharing (รายเดือน)',
    competencyType: 'core', targetGroup: 'all', format: 'inhouse',
    fiscalYear: 2026, goalId: 'g-09',
    startDate: '2026-01-15', endDate: '2026-12-15', hours: 24,
    seatsPlanned: 200, seatsActual: 142,
    budgetPlanned: 80000, budgetSpent: 38000, funding: 'revenue',
    venue: 'ห้องประชุมใหญ่ + Online',
    trainer: 'หัวหน้างานแต่ละหน่วยตามหัวข้อ',
    responsible: 'นายอนันต์ พัฒนาคน',
    department: 'กลุ่มงานทรัพยากรบุคคล',
    status: 'in_progress',
    objectives: 'สร้างเวทีแลกเปลี่ยนเรียนรู้ภายในและขยายผล Best Practice',
    expectedOutcome: 'จัดได้อย่างน้อยเดือนละ 2 ครั้ง รวม 24 ครั้ง',
    evaluationMethod: 'จำนวนการจัด + ผลตอบรับผู้เข้าร่วม',
    postScore: 80, satisfaction: 86,
    progress: [
      { id: 'p-9', date: '2026-01-20', note: 'เริ่ม KM Forum หัวข้อ Patient Safety — ผู้เข้าร่วม 75 คน', reportedBy: 'นายอนันต์', attendees: 75 },
      { id: 'p-10', date: '2026-04-12', note: 'KM Forum หัวข้อ Lean ใน รพ. — 67 คน', reportedBy: 'นายอนันต์', attendees: 67 }
    ]
  },
  {
    id: 't-11', code: 'HRD-T11',
    name: 'จริยธรรมและกฎหมายทางการแพทย์',
    competencyType: 'core', targetGroup: 'physician', format: 'inhouse',
    fiscalYear: 2026,
    startDate: '2026-09-10', endDate: '2026-09-10', hours: 6,
    seatsPlanned: 80, seatsActual: 0,
    budgetPlanned: 40000, budgetSpent: 0, funding: 'revenue',
    venue: 'ห้องประชุมใหญ่ ชั้น 7',
    trainer: 'นิติกรกระทรวงสาธารณสุข + แพทยสภา',
    responsible: 'นพ.สมชาย วิชาญดี',
    department: 'ฝ่ายการแพทย์',
    status: 'approved',
    objectives: 'ทบทวนกฎหมายและจริยธรรมที่เกี่ยวข้องกับวิชาชีพแพทย์',
    expectedOutcome: 'แพทย์ ≥ 80% ของ รพ. เข้าอบรมและผ่านการประเมิน',
    evaluationMethod: 'แบบทดสอบความรู้',
    progress: []
  },
  {
    id: 't-12', code: 'HRD-T12',
    name: 'Lean Management & Process Improvement',
    competencyType: 'managerial', targetGroup: 'mid_mgr', format: 'workshop',
    fiscalYear: 2026,
    startDate: '2026-11-01', endDate: '2026-11-15', hours: 24,
    seatsPlanned: 30, seatsActual: 0,
    budgetPlanned: 220000, budgetSpent: 0, funding: 'revenue',
    venue: 'ห้องประชุม + พื้นที่ปฏิบัติการ',
    trainer: 'ที่ปรึกษา Lean Healthcare',
    responsible: 'นางสุภาพร ใจรับใช้',
    department: 'กลุ่มงานพัฒนาคุณภาพ',
    status: 'approved',
    objectives: 'พัฒนาทักษะการลดความสูญเปล่าและปรับปรุงกระบวนการ',
    expectedOutcome: 'แต่ละทีมส่ง Lean Project 1 โครงการ',
    evaluationMethod: 'Project Presentation + Cost-saving Analysis',
    progress: []
  },
]

// ──────────────────────────────────────────────────────────────────
// LOCAL STORAGE
// ──────────────────────────────────────────────────────────────────
const KEY_STRATEGIES = 'fiatx.hrd.strategies.v1'
const KEY_GOALS      = 'fiatx.hrd.goals.v1'
const KEY_TRAININGS  = 'fiatx.hrd.trainings.v1'

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

export const loadStrategies = (): Strategy[] => {
  if (typeof window === 'undefined') return DEFAULT_STRATEGIES
  return safeParse(localStorage.getItem(KEY_STRATEGIES), DEFAULT_STRATEGIES)
}
export const saveStrategies = (rows: Strategy[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_STRATEGIES, JSON.stringify(rows))
}

export const loadGoals = (): Goal[] => {
  if (typeof window === 'undefined') return DEFAULT_GOALS
  return safeParse(localStorage.getItem(KEY_GOALS), DEFAULT_GOALS)
}
export const saveGoals = (rows: Goal[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_GOALS, JSON.stringify(rows))
}

export const loadTrainings = (): TrainingCourse[] => {
  if (typeof window === 'undefined') return DEFAULT_TRAININGS
  return safeParse(localStorage.getItem(KEY_TRAININGS), DEFAULT_TRAININGS)
}
export const saveTrainings = (rows: TrainingCourse[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_TRAININGS, JSON.stringify(rows))
}

export const resetAll = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY_STRATEGIES)
  localStorage.removeItem(KEY_GOALS)
  localStorage.removeItem(KEY_TRAININGS)
}

// ──────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────
export const formatTHB = (n: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n)

export const formatCompactTHB = (n: number) => {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)} ล้าน`
  if (n >= 1_000)     return `฿${(n / 1_000).toFixed(0)}K`
  return `฿${n.toLocaleString()}`
}

export const getPillarMeta = (v: string) => PILLAR_OPTIONS.find(p => p.value === v) ?? PILLAR_OPTIONS[0]
export const getStatusMeta = (v: HRDStatus) => STATUS_OPTIONS.find(s => s.value === v) ?? STATUS_OPTIONS[0]
export const getCompetencyMeta = (v: string) => COMPETENCY_TYPE_OPTIONS.find(c => c.value === v) ?? COMPETENCY_TYPE_OPTIONS[0]
export const getTargetGroupLabel = (v: string) => TARGET_GROUP_OPTIONS.find(t => t.value === v)?.label ?? v
export const getFundingLabel = (v: string) => FUNDING_OPTIONS.find(f => f.value === v)?.label ?? v
export const getFormatLabel = (v: string) => TRAINING_FORMAT_OPTIONS.find(f => f.value === v)?.label ?? v

export const goalAchievement = (g: Goal) => {
  if (g.target === g.baseline) return g.current >= g.target ? 100 : 0
  const pct = ((g.current - g.baseline) / (g.target - g.baseline)) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

export const trainingProgressPct = (t: TrainingCourse) => {
  if (t.seatsPlanned <= 0) return 0
  return Math.min(100, Math.round((t.seatsActual / t.seatsPlanned) * 100))
}

export const budgetUtilization = (planned: number, spent: number) => {
  if (planned <= 0) return 0
  return Math.round((spent / planned) * 100)
}

export const newId = () => 'id-' + Math.random().toString(36).slice(2, 10)
