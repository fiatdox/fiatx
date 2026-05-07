// Strategic Project Roadmap — data model + mockup + localStorage helpers
// ใช้สำหรับโรงพยาบาลขนาดใหญ่ (M2 / S / A) ตามแบบสำนักงานปลัดกระทรวงสาธารณสุข

export type TaskType = 'project' | 'task' | 'milestone'
export type Mission = 'admin' | 'primary' | 'secondary' | 'tertiary' | 'support'
export type ProjectStatus =
  | 'draft'         // ร่าง
  | 'proposed'      // เสนอขออนุมัติ
  | 'approved'      // อนุมัติแล้ว
  | 'in_progress'   // กำลังดำเนินการ
  | 'on_hold'       // ระงับชั่วคราว
  | 'completed'     // เสร็จสิ้น
  | 'cancelled'     // ยกเลิก

export type Priority = 'high' | 'medium' | 'low'

export type ProgressLogEntry = {
  id: string
  date: string            // ISO date
  progress: number        // 0–100
  note: string
  reportedBy: string
  budgetSpentDelta?: number
}

export type Task = {
  id: string
  text: string
  start: string           // ISO date (เก็บเป็น string เพื่อให้ serialize ลง localStorage ได้)
  end: string             // ISO date
  progress?: number
  type: TaskType
  parent?: string
  mission: Mission

  // ── Professional fields ──
  code?: string                 // รหัสโครงการ (เช่น HOS-2026-001)
  status?: ProjectStatus
  priority?: Priority

  owner?: string                // ผู้รับผิดชอบหลัก
  ownerPosition?: string        // ตำแหน่ง
  department?: string           // กลุ่มงาน
  contact?: string              // เบอร์ติดต่อ / email
  team?: string[]               // ทีมงาน

  budgetRequested?: number      // งบที่ขอ
  budgetApproved?: number       // งบที่อนุมัติ
  budgetSpent?: number          // งบที่เบิกจ่ายแล้ว
  budgetSource?: string         // แหล่งเงิน เช่น 'งบประมาณรายจ่าย 2569', 'เงินบำรุง'

  kpiCode?: string              // รหัสตัวชี้วัด
  kpiName?: string              // ชื่อตัวชี้วัด
  kpiTarget?: string            // ค่าเป้าหมาย

  description?: string          // คำอธิบายโครงการ
  expectedOutcome?: string      // ผลลัพธ์ที่คาดหวัง
  vendor?: string               // ผู้รับจ้าง / vendor (ถ้ามี)

  documents?: string[]          // ชื่อเอกสารแนบ (mockup)
  progressLog?: ProgressLogEntry[]
  riskNote?: string             // หมายเหตุความเสี่ยง / อุปสรรค
}

export type LinkRow = {
  id: string
  source: string
  target: string
  type?: 0 | 1 | 2 | 3            // 0=FS finish→start (default)
}

// ──────────────────────────────────────────────────────────────────────────
// Mockup constants
// ──────────────────────────────────────────────────────────────────────────

export const MISSION_OPTIONS: { value: Mission; label: string; color: string }[] = [
  { value: 'admin',     label: 'กลุ่มภารกิจด้านอำนวยการ',                    color: '#a855f7' },
  { value: 'primary',   label: 'กลุ่มภารกิจด้านบริการปฐมภูมิ',                color: '#22c55e' },
  { value: 'secondary', label: 'กลุ่มภารกิจด้านบริการทุติยภูมิและตติยภูมิ',   color: '#06b6d4' },
  { value: 'tertiary',  label: 'กลุ่มภารกิจด้านศูนย์ความเป็นเลิศ (Excellence)', color: '#3b82f6' },
  { value: 'support',   label: 'กลุ่มภารกิจสนับสนุน',                          color: '#f59e0b' },
]

export const STATUS_OPTIONS: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'draft',       label: 'ร่าง',                color: 'default'    },
  { value: 'proposed',    label: 'เสนอขออนุมัติ',       color: 'warning'    },
  { value: 'approved',    label: 'อนุมัติแล้ว',         color: 'cyan'       },
  { value: 'in_progress', label: 'กำลังดำเนินการ',      color: 'processing' },
  { value: 'on_hold',     label: 'ระงับชั่วคราว',       color: 'orange'     },
  { value: 'completed',   label: 'เสร็จสิ้น',           color: 'success'    },
  { value: 'cancelled',   label: 'ยกเลิก',              color: 'error'      },
]

export const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high',   label: 'สูง',     color: 'red'    },
  { value: 'medium', label: 'ปานกลาง', color: 'gold'   },
  { value: 'low',    label: 'ต่ำ',     color: 'green'  },
]

export const DEPARTMENT_OPTIONS = [
  'กลุ่มงานบริหารทั่วไป',
  'กลุ่มงานยุทธศาสตร์และแผนงาน',
  'กลุ่มงานสารสนเทศทางการแพทย์',
  'กลุ่มงานเทคนิคบริการ',
  'กลุ่มงานพัฒนาคุณภาพและรูปแบบบริการ',
  'กลุ่มงานประกันสุขภาพ',
  'กลุ่มภารกิจด้านการพยาบาล',
  'กลุ่มงานเภสัชกรรม',
  'กลุ่มงานทันตกรรม',
  'กลุ่มงานพัฒนาระบบบริการสุขภาพ (Service Plan)',
  'กลุ่มงานอาชีวเวชกรรม',
  'กลุ่มงานสุขศึกษา',
]

export const KPI_OPTIONS = [
  { code: 'KPI-001', name: 'ร้อยละ รพ. ผ่านมาตรฐาน Smart Hospital ระดับเงิน',         target: '≥ 80%' },
  { code: 'KPI-002', name: 'ร้อยละการลดใช้พลังงานไฟฟ้าของโรงพยาบาล',                 target: '≥ 10%' },
  { code: 'KPI-003', name: 'ร้อยละผู้ป่วยมะเร็งได้รับการรักษาภายใน 4 สัปดาห์',         target: '≥ 80%' },
  { code: 'KPI-004', name: 'อัตราการครองเตียง (Bed Occupancy Rate)',                  target: '85–90%' },
  { code: 'KPI-005', name: 'ระดับความพึงพอใจผู้รับบริการ',                            target: '≥ 85%' },
  { code: 'KPI-006', name: 'จำนวนครั้งของการเกิดเหตุการณ์ความปลอดภัยทางไซเบอร์',     target: '0 ครั้ง' },
  { code: 'KPI-007', name: 'ร้อยละโครงการที่ดำเนินการแล้วเสร็จตามแผน',                target: '≥ 90%' },
  { code: 'KPI-008', name: 'อัตราการรอดชีวิตของผู้ป่วยโรคหลอดเลือดสมอง',              target: '≥ 95%' },
]

// ──────────────────────────────────────────────────────────────────────────
// Default mock dataset (แผนยุทธศาสตร์โรงพยาบาลขนาดใหญ่ ปี 2569)
// ──────────────────────────────────────────────────────────────────────────

const iso = (y: number, m: number, d: number) => new Date(y, m, d).toISOString()

export const DEFAULT_TASKS: Task[] = [
  // ═════════ แผน 1: Digital Transformation ═════════
  {
    id: '1',
    code: 'HOS-2026-D01',
    text: 'ยุทธศาสตร์ดิจิทัล (Digital Transformation)',
    start: iso(2026, 0, 1), end: iso(2026, 5, 30),
    progress: 70, type: 'project', mission: 'admin',
    status: 'in_progress', priority: 'high',
    owner: 'นายแพทย์ สมชาย ดิจิทัล',
    ownerPosition: 'รองผู้อำนวยการฝ่ายการแพทย์',
    department: 'กลุ่มงานสารสนเทศทางการแพทย์',
    contact: '081-234-5678',
    team: ['นายเอก เทคโน', 'นางสาวบี โปรแกรม', 'นายซี เน็ตเวิร์ก'],
    budgetRequested: 8500000, budgetApproved: 7800000, budgetSpent: 5460000,
    budgetSource: 'งบประมาณรายจ่าย 2569 + เงินบำรุง',
    kpiCode: 'KPI-001',
    kpiName: 'ร้อยละ รพ. ผ่านมาตรฐาน Smart Hospital ระดับเงิน',
    kpiTarget: '≥ 80%',
    description: 'ยกระดับระบบบริการของโรงพยาบาลให้เป็น Smart Hospital เต็มรูปแบบ ครอบคลุม HIS, Smart Queue, HIE และ Cybersecurity',
    expectedOutcome: 'ผ่านการประเมิน Smart Hospital ระดับเงินจากกระทรวงสาธารณสุข ภายในปีงบประมาณ 2569',
    documents: ['TOR-2026-D01.pdf', 'Master Plan IT.pdf', 'Risk Assessment.xlsx'],
    progressLog: [
      { id: 'pl-1-1', date: iso(2026, 1, 28), progress: 35, note: 'อยู่ระหว่างวางระบบ HIS เฟส 1', reportedBy: 'นพ.สมชาย', budgetSpentDelta: 2100000 },
      { id: 'pl-1-2', date: iso(2026, 3, 30), progress: 55, note: 'HIS go-live สำเร็จ เริ่ม Smart Queue', reportedBy: 'นพ.สมชาย', budgetSpentDelta: 1800000 },
      { id: 'pl-1-3', date: iso(2026, 4, 30), progress: 70, note: 'Smart Queue เปิดใช้บางคลินิก', reportedBy: 'นพ.สมชาย', budgetSpentDelta: 1560000 },
    ],
  },
  {
    id: '11',
    code: 'HOS-2026-D01-A1',
    text: 'อัปเกรดระบบข้อมูลผู้ป่วย (HIS)',
    start: iso(2026, 0, 1), end: iso(2026, 2, 15),
    progress: 100, type: 'task', parent: '1', mission: 'admin',
    status: 'completed', priority: 'high',
    owner: 'นางสาวบี โปรแกรม', department: 'กลุ่มงานสารสนเทศทางการแพทย์',
    budgetRequested: 4200000, budgetApproved: 4000000, budgetSpent: 3950000,
    description: 'อัปเกรด HIS เป็น HOSxP_PCU เวอร์ชันล่าสุด รองรับ FHIR + Cloud backup',
    documents: ['Contract-HIS.pdf'],
    vendor: 'บริษัท HOSxP จำกัด',
    progressLog: [
      { id: 'pl-11-1', date: iso(2026, 2, 10), progress: 100, note: 'ติดตั้งและฝึกอบรมเรียบร้อย', reportedBy: 'นางสาวบี' },
    ],
  },
  {
    id: '12',
    code: 'HOS-2026-D01-A2',
    text: 'พัฒนาระบบคิวออนไลน์ (Smart Queue)',
    start: iso(2026, 2, 16), end: iso(2026, 4, 15),
    progress: 60, type: 'task', parent: '1', mission: 'admin',
    status: 'in_progress', priority: 'medium',
    owner: 'นายเอก เทคโน', department: 'กลุ่มงานสารสนเทศทางการแพทย์',
    budgetRequested: 1800000, budgetApproved: 1800000, budgetSpent: 980000,
    description: 'ระบบคิวออนไลน์ผ่าน LINE OA + ตู้ Kiosk',
    riskNote: 'ขาดเครื่อง Kiosk รุ่นที่กำหนด — ต้องเปลี่ยน spec',
  },
  {
    id: '13',
    code: 'HOS-2026-D01-A3',
    text: 'เชื่อมต่อข้อมูลสุขภาพ (HIE API)',
    start: iso(2026, 4, 16), end: iso(2026, 5, 30),
    progress: 10, type: 'task', parent: '1', mission: 'admin',
    status: 'approved', priority: 'medium',
    owner: 'นายซี เน็ตเวิร์ก', department: 'กลุ่มงานสารสนเทศทางการแพทย์',
    budgetRequested: 1500000, budgetApproved: 1300000, budgetSpent: 130000,
    description: 'เชื่อม API กับ HIE ของกระทรวง + รพ.เครือข่ายในจังหวัด',
  },

  // ═════════ แผน 2: Green Hospital ═════════
  {
    id: '2',
    code: 'HOS-2026-G01',
    text: 'โรงพยาบาลสีเขียว (Green & Clean Hospital)',
    start: iso(2026, 1, 1), end: iso(2026, 8, 30),
    progress: 45, type: 'project', mission: 'support',
    status: 'in_progress', priority: 'medium',
    owner: 'นางสุภาพร อนุรักษ์',
    ownerPosition: 'หัวหน้ากลุ่มงานเทคนิคบริการ',
    department: 'กลุ่มงานเทคนิคบริการ',
    contact: '02-555-1234 ต่อ 2301',
    budgetRequested: 12000000, budgetApproved: 10500000, budgetSpent: 4725000,
    budgetSource: 'งบประมาณรายจ่าย 2569',
    kpiCode: 'KPI-002', kpiName: 'ร้อยละการลดใช้พลังงานไฟฟ้าของโรงพยาบาล', kpiTarget: '≥ 10%',
    description: 'ปรับปรุงอาคารและระบบสนับสนุนให้เป็นมิตรกับสิ่งแวดล้อม ลดการใช้พลังงานและลดของเสียทางการแพทย์',
    expectedOutcome: 'ลดค่าไฟฟ้าได้ ≥ 10% เทียบปีฐาน + ผ่านเกณฑ์ Green Hospital ระดับทอง',
    documents: ['Master Plan Green.pdf', 'Energy Audit 2025.pdf'],
    progressLog: [
      { id: 'pl-2-1', date: iso(2026, 2, 28), progress: 25, note: 'ติดตั้ง Solar Rooftop เฟส 1 เสร็จ', reportedBy: 'นางสุภาพร', budgetSpentDelta: 3500000 },
      { id: 'pl-2-2', date: iso(2026, 4, 30), progress: 45, note: 'เริ่มปรับปรุงระบบบำบัดน้ำเสีย', reportedBy: 'นางสุภาพร', budgetSpentDelta: 1225000 },
    ],
  },
  {
    id: '21',
    code: 'HOS-2026-G01-A1',
    text: 'ติดตั้ง Solar Rooftop อาคารผู้ป่วยใน',
    start: iso(2026, 1, 1), end: iso(2026, 2, 28),
    progress: 100, type: 'task', parent: '2', mission: 'support',
    status: 'completed', priority: 'high',
    owner: 'นายธนา ไฟฟ้า', department: 'กลุ่มงานเทคนิคบริการ',
    budgetRequested: 5500000, budgetApproved: 5500000, budgetSpent: 5450000,
    vendor: 'บริษัท SolarCell Thai จำกัด',
    description: 'ระบบ 250 kWp พร้อม inverter + monitoring',
    documents: ['Solar Contract.pdf', 'COD Certificate.pdf'],
  },
  {
    id: '22',
    code: 'HOS-2026-G01-A2',
    text: 'ปรับปรุงระบบบำบัดน้ำเสีย',
    start: iso(2026, 3, 1), end: iso(2026, 6, 15),
    progress: 25, type: 'task', parent: '2', mission: 'support',
    status: 'in_progress', priority: 'high',
    owner: 'นายธนา ไฟฟ้า', department: 'กลุ่มงานเทคนิคบริการ',
    budgetRequested: 4500000, budgetApproved: 3800000, budgetSpent: 950000,
    description: 'ติดตั้งระบบ MBR ทดแทนระบบเดิม',
  },
  {
    id: '23',
    code: 'HOS-2026-G01-A3',
    text: 'รณรงค์ลดพลาสติกทางการแพทย์',
    start: iso(2026, 2, 15), end: iso(2026, 8, 30),
    progress: 15, type: 'task', parent: '2', mission: 'support',
    status: 'in_progress', priority: 'low',
    owner: 'นางสุภาพร อนุรักษ์', department: 'กลุ่มงานเทคนิคบริการ',
    budgetRequested: 500000, budgetApproved: 400000, budgetSpent: 80000,
  },

  // ═════════ แผน 3: Cancer Excellence Center ═════════
  {
    id: '3',
    code: 'HOS-2026-C01',
    text: 'ศูนย์ความเป็นเลิศโรคมะเร็ง (Cancer Excellence)',
    start: iso(2026, 2, 1), end: iso(2026, 11, 20),
    progress: 30, type: 'project', mission: 'tertiary',
    status: 'in_progress', priority: 'high',
    owner: 'แพทย์หญิง นภัสสร มะเร็งวิทยา',
    ownerPosition: 'หัวหน้าศูนย์มะเร็ง',
    department: 'กลุ่มงานพัฒนาระบบบริการสุขภาพ (Service Plan)',
    contact: '081-789-1234',
    team: ['พญ.นภัสสร', 'นพ.วิจิตร รังสีรักษา', 'นางพัชรา พยาบาลมะเร็ง'],
    budgetRequested: 185000000, budgetApproved: 165000000, budgetSpent: 49500000,
    budgetSource: 'งบลงทุนกระทรวงสาธารณสุข + เงินบำรุง',
    kpiCode: 'KPI-003', kpiName: 'ร้อยละผู้ป่วยมะเร็งได้รับการรักษาภายใน 4 สัปดาห์', kpiTarget: '≥ 80%',
    description: 'ก่อสร้างศูนย์มะเร็งครบวงจร พร้อมเครื่องฉายรังสีเร่งอนุภาค (LINAC) เพื่อลดการส่งต่อผู้ป่วยไป รพ. ระดับ A',
    expectedOutcome: 'ผู้ป่วยมะเร็งในเขตสุขภาพได้รับการรักษาในพื้นที่ ลดเวลารอ ≤ 4 สัปดาห์',
    documents: ['Master Plan Cancer Center.pdf', 'Linac Technical Spec.pdf', 'EIA Report.pdf'],
    riskNote: 'ระยะเวลานำเข้าเครื่อง LINAC อาจล่าช้าเนื่องจากการขนส่ง',
    progressLog: [
      { id: 'pl-3-1', date: iso(2026, 3, 30), progress: 18, note: 'ลงเสาเข็มเสร็จ เริ่มโครงสร้าง', reportedBy: 'พญ.นภัสสร', budgetSpentDelta: 28000000 },
      { id: 'pl-3-2', date: iso(2026, 4, 30), progress: 30, note: 'โครงสร้างชั้น 1 เสร็จ', reportedBy: 'พญ.นภัสสร', budgetSpentDelta: 21500000 },
    ],
  },
  {
    id: '31',
    code: 'HOS-2026-C01-A1',
    text: 'ก่อสร้างอาคารศูนย์รังสีรักษาและมะเร็ง',
    start: iso(2026, 2, 1), end: iso(2026, 8, 30),
    progress: 50, type: 'task', parent: '3', mission: 'tertiary',
    status: 'in_progress', priority: 'high',
    owner: 'นายอภิชาติ โยธา', department: 'กลุ่มงานเทคนิคบริการ',
    budgetRequested: 95000000, budgetApproved: 95000000, budgetSpent: 47500000,
    vendor: 'บริษัท เมดิคอลคอนสตรัคชั่น จำกัด',
  },
  {
    id: '32',
    code: 'HOS-2026-C01-A2',
    text: 'จัดซื้อเครื่องฉายรังสีเร่งอนุภาค (LINAC)',
    start: iso(2026, 7, 1), end: iso(2026, 9, 30),
    progress: 0, type: 'task', parent: '3', mission: 'tertiary',
    status: 'approved', priority: 'high',
    owner: 'พญ.นภัสสร', department: 'กลุ่มงานพัฒนาระบบบริการสุขภาพ (Service Plan)',
    budgetRequested: 65000000, budgetApproved: 60000000, budgetSpent: 0,
    description: 'จัดซื้อเครื่อง LINAC พร้อม TPS และ QA system',
  },
  {
    id: '33',
    code: 'HOS-2026-C01-A3',
    text: 'อบรมแพทย์และนักรังสีเทคนิค',
    start: iso(2026, 8, 15), end: iso(2026, 10, 30),
    progress: 0, type: 'task', parent: '3', mission: 'tertiary',
    status: 'approved', priority: 'medium',
    owner: 'นพ.วิจิตร รังสีรักษา', department: 'กลุ่มงานพัฒนาระบบบริการสุขภาพ (Service Plan)',
    budgetRequested: 2500000, budgetApproved: 2000000, budgetSpent: 0,
  },
  {
    id: '34',
    code: 'HOS-2026-C01-M1',
    text: 'เปิดบริการศูนย์มะเร็งครบวงจร (Milestone)',
    start: iso(2026, 11, 15), end: iso(2026, 11, 15),
    type: 'milestone', parent: '3', mission: 'tertiary',
    status: 'approved', priority: 'high',
    owner: 'พญ.นภัสสร', department: 'กลุ่มงานพัฒนาระบบบริการสุขภาพ (Service Plan)',
    description: 'พิธีเปิดและเริ่มให้บริการเต็มรูปแบบ',
  },
]

export const DEFAULT_LINKS: LinkRow[] = [
  { id: 'l1', source: '11', target: '12', type: 0 },
  { id: 'l2', source: '12', target: '13', type: 0 },
  { id: 'l3', source: '21', target: '22', type: 0 },
  { id: 'l4', source: '31', target: '32', type: 0 },
  { id: 'l5', source: '32', target: '34', type: 0 },
  { id: 'l6', source: '33', target: '34', type: 0 },
]

// ──────────────────────────────────────────────────────────────────────────
// localStorage helpers (เผื่อไว้ก่อน — เริ่มเปิดใช้ได้ทันที)
// ──────────────────────────────────────────────────────────────────────────

const TASKS_KEY = 'fiatx.grant-charts.tasks.v1'
const LINKS_KEY = 'fiatx.grant-charts.links.v1'

export const loadTasks = (): Task[] => {
  if (typeof window === 'undefined') return DEFAULT_TASKS
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (!raw) return DEFAULT_TASKS
    const parsed = JSON.parse(raw) as Task[]
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_TASKS
  } catch {
    return DEFAULT_TASKS
  }
}

export const saveTasks = (tasks: Task[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export const loadLinks = (): LinkRow[] => {
  if (typeof window === 'undefined') return DEFAULT_LINKS
  try {
    const raw = localStorage.getItem(LINKS_KEY)
    if (!raw) return DEFAULT_LINKS
    const parsed = JSON.parse(raw) as LinkRow[]
    return Array.isArray(parsed) ? parsed : DEFAULT_LINKS
  } catch {
    return DEFAULT_LINKS
  }
}

export const saveLinks = (links: LinkRow[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(LINKS_KEY, JSON.stringify(links))
}

export const resetAll = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TASKS_KEY)
  localStorage.removeItem(LINKS_KEY)
}

// ──────────────────────────────────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────────────────────────────────

export const formatTHB = (n?: number) => {
  if (n == null) return '-'
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 }) + ' บาท'
}

export const budgetUtilization = (spent?: number, approved?: number) => {
  if (!approved || approved <= 0) return 0
  return Math.round(((spent ?? 0) / approved) * 100)
}

export const getProgressColor = (progress: number) => {
  if (progress >= 100) return { fill: '#10b981', label: 'เสร็จสิ้น',     tagColor: 'success' as const }
  if (progress <= 0)   return { fill: '#ef4444', label: 'ยังไม่เริ่ม',    tagColor: 'error' as const }
  if (progress < 40)   return { fill: '#f59e0b', label: 'ล่าช้า',         tagColor: 'warning' as const }
  return                       { fill: '#3b82f6', label: 'กำลังดำเนิน',   tagColor: 'processing' as const }
}

export const getMissionMeta = (mission: Mission) =>
  MISSION_OPTIONS.find(m => m.value === mission) ?? MISSION_OPTIONS[0]

export const getStatusMeta = (status?: ProjectStatus) =>
  STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0]

export const getPriorityMeta = (priority?: Priority) =>
  PRIORITY_OPTIONS.find(p => p.value === priority) ?? PRIORITY_OPTIONS[1]
