// IT Project Roadmap — data model + mockup + localStorage helpers
// แผนโครงการของกลุ่มงานเทคโนโลยีสารสนเทศ โรงพยาบาล

export type TaskType = 'project' | 'task' | 'milestone'
export type Mission = 'infra' | 'security' | 'application' | 'support' | 'smart'
export type ProjectStatus =
  | 'draft'
  | 'proposed'
  | 'approved'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

export type Priority = 'high' | 'medium' | 'low'

export type ProgressLogEntry = {
  id: string
  date: string
  progress: number
  note: string
  reportedBy: string
  budgetSpentDelta?: number
}

export type Task = {
  id: string
  text: string
  start: string
  end: string
  progress?: number
  type: TaskType
  parent?: string
  mission: Mission

  code?: string
  status?: ProjectStatus
  priority?: Priority

  owner?: string
  ownerPosition?: string
  department?: string
  contact?: string
  team?: string[]

  budgetRequested?: number
  budgetApproved?: number
  budgetSpent?: number
  budgetSource?: string

  kpiCode?: string
  kpiName?: string
  kpiTarget?: string

  description?: string
  expectedOutcome?: string
  vendor?: string

  documents?: string[]
  progressLog?: ProgressLogEntry[]
  riskNote?: string
}

export type LinkRow = {
  id: string
  source: string
  target: string
  type?: 0 | 1 | 2 | 3
}

// ──────────────────────────────────────────────────────────────────────────
// Mockup constants
// ──────────────────────────────────────────────────────────────────────────

export const MISSION_OPTIONS: { value: Mission; label: string; color: string }[] = [
  { value: 'infra',       label: 'โครงสร้างพื้นฐาน (Network/Server)',     color: '#3b82f6' },
  { value: 'security',    label: 'ความปลอดภัยทางไซเบอร์',                   color: '#ef4444' },
  { value: 'application', label: 'พัฒนาระบบงาน / Application',              color: '#a855f7' },
  { value: 'support',     label: 'บริการผู้ใช้ / Helpdesk',                  color: '#22c55e' },
  { value: 'smart',       label: 'Smart Hospital',                           color: '#06b6d4' },
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
  'งานพัฒนาระบบสารสนเทศ',
  'งานเครือข่ายและโครงสร้างพื้นฐาน',
  'งานความปลอดภัยทางไซเบอร์',
  'งานบริการผู้ใช้ (Helpdesk)',
  'งานวิเคราะห์ข้อมูลและรายงาน',
  'กลุ่มงานสารสนเทศทางการแพทย์',
]

export const KPI_OPTIONS = [
  { code: 'IT-001', name: 'ระยะเวลาตอบสนอง Helpdesk เฉลี่ย',                       target: '≤ 4 ชม.' },
  { code: 'IT-002', name: 'อัตราระบบสารสนเทศหลัก Uptime',                            target: '≥ 99.5%' },
  { code: 'IT-003', name: 'จำนวนเหตุการณ์ความปลอดภัยทางไซเบอร์',                    target: '0 ครั้ง' },
  { code: 'IT-004', name: 'ร้อยละผู้ใช้ที่เข้าถึงระบบ Smart Hospital',                target: '≥ 80%' },
  { code: 'IT-005', name: 'ระดับความพึงพอใจผู้ใช้บริการ IT',                         target: '≥ 85%' },
  { code: 'IT-006', name: 'ร้อยละ Ticket ปิดงานภายใน SLA',                            target: '≥ 90%' },
  { code: 'IT-007', name: 'ร้อยละบุคลากรผ่านการอบรม Cyber Awareness',               target: '≥ 95%' },
  { code: 'IT-008', name: 'ร้อยละการสำรองข้อมูลสำเร็จตามแผน',                       target: '100%' },
]

// ──────────────────────────────────────────────────────────────────────────
// Default mock dataset (แผนโครงการ IT ปี 2569)
// ──────────────────────────────────────────────────────────────────────────

const iso = (y: number, m: number, d: number) => new Date(y, m, d).toISOString()

export const DEFAULT_TASKS: Task[] = [
  // ═════════ โครงการ 1: Cybersecurity Hardening ═════════
  {
    id: '1',
    code: 'IT-2026-S01',
    text: 'โครงการเสริมสร้างความปลอดภัยทางไซเบอร์',
    start: iso(2026, 0, 15), end: iso(2026, 6, 31),
    progress: 55, type: 'project', mission: 'security',
    status: 'in_progress', priority: 'high',
    owner: 'นายชัยพร ไซเบอร์',
    ownerPosition: 'หัวหน้างานความปลอดภัยทางไซเบอร์',
    department: 'งานความปลอดภัยทางไซเบอร์',
    contact: '081-234-5678',
    team: ['นายชัยพร ไซเบอร์', 'นางสาวอนันต์ ไฟร์วอลล์', 'นายภูมิ Pentest'],
    budgetRequested: 4500000, budgetApproved: 3800000, budgetSpent: 2090000,
    budgetSource: 'งบประมาณรายจ่าย 2569',
    kpiCode: 'IT-003',
    kpiName: 'จำนวนเหตุการณ์ความปลอดภัยทางไซเบอร์',
    kpiTarget: '0 ครั้ง',
    description: 'ปรับปรุงระบบรักษาความปลอดภัยทั้ง Firewall, EDR, SIEM และ Awareness Training ตามแนวทาง พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล',
    expectedOutcome: 'ผ่านการประเมิน Cybersecurity ของกระทรวง + ลดเหตุการณ์ Phishing ≥ 80%',
    documents: ['TOR-Security-2026.pdf', 'Risk Assessment.xlsx', 'Pentest Report 2025.pdf'],
    progressLog: [
      { id: 'pl-1-1', date: iso(2026, 1, 28), progress: 25, note: 'ติดตั้ง Next-Gen Firewall ที่ Core เสร็จ', reportedBy: 'นายชัยพร', budgetSpentDelta: 1200000 },
      { id: 'pl-1-2', date: iso(2026, 3, 30), progress: 45, note: 'เปิดใช้ EDR บนเครื่องผู้ใช้ 70%', reportedBy: 'นายชัยพร', budgetSpentDelta: 580000 },
      { id: 'pl-1-3', date: iso(2026, 4, 30), progress: 55, note: 'อบรม Cyber Awareness รอบ 1 — ผู้เข้าร่วม 320 คน', reportedBy: 'นายชัยพร', budgetSpentDelta: 310000 },
    ],
  },
  {
    id: '11',
    code: 'IT-2026-S01-A1',
    text: 'จัดซื้อและติดตั้ง Next-Gen Firewall',
    start: iso(2026, 0, 15), end: iso(2026, 2, 15),
    progress: 100, type: 'task', parent: '1', mission: 'security',
    status: 'completed', priority: 'high',
    owner: 'นางสาวอนันต์ ไฟร์วอลล์', department: 'งานความปลอดภัยทางไซเบอร์',
    budgetRequested: 1800000, budgetApproved: 1800000, budgetSpent: 1750000,
    vendor: 'บริษัท SecureNet จำกัด',
    description: 'ติดตั้ง Fortigate 600F ทดแทนเครื่องเดิม + HA pair',
    documents: ['Contract-FW.pdf'],
  },
  {
    id: '12',
    code: 'IT-2026-S01-A2',
    text: 'ติดตั้งระบบ EDR บนเครื่องผู้ใช้ทั้งหมด',
    start: iso(2026, 2, 1), end: iso(2026, 4, 15),
    progress: 70, type: 'task', parent: '1', mission: 'security',
    status: 'in_progress', priority: 'high',
    owner: 'นายภูมิ Pentest', department: 'งานความปลอดภัยทางไซเบอร์',
    budgetRequested: 1200000, budgetApproved: 1100000, budgetSpent: 770000,
    description: 'Deploy CrowdStrike Falcon บนเครื่อง 480 เครื่อง',
    riskNote: 'เครื่องเก่าบางส่วนสเปคไม่รองรับ — ต้องเปลี่ยนเครื่อง 25 เครื่อง',
  },
  {
    id: '13',
    code: 'IT-2026-S01-A3',
    text: 'อบรม Cyber Awareness บุคลากร',
    start: iso(2026, 3, 1), end: iso(2026, 5, 30),
    progress: 50, type: 'task', parent: '1', mission: 'security',
    status: 'in_progress', priority: 'medium',
    owner: 'นายชัยพร ไซเบอร์', department: 'งานความปลอดภัยทางไซเบอร์',
    budgetRequested: 600000, budgetApproved: 500000, budgetSpent: 240000,
    description: 'อบรมผ่าน e-learning + Phishing simulation 4 ครั้งต่อปี',
  },
  {
    id: '14',
    code: 'IT-2026-S01-M1',
    text: 'ผ่านการประเมิน Cybersecurity Audit',
    start: iso(2026, 6, 31), end: iso(2026, 6, 31),
    type: 'milestone', parent: '1', mission: 'security',
    status: 'approved', priority: 'high',
    owner: 'นายชัยพร ไซเบอร์', department: 'งานความปลอดภัยทางไซเบอร์',
    description: 'ผ่านการประเมินจากผู้ตรวจประเมินภายนอก',
  },

  // ═════════ โครงการ 2: HIS Phase 2 + HIE Integration ═════════
  {
    id: '2',
    code: 'IT-2026-A01',
    text: 'อัปเกรดระบบ HIS เฟส 2 + เชื่อม HIE กระทรวง',
    start: iso(2026, 1, 1), end: iso(2026, 8, 30),
    progress: 40, type: 'project', mission: 'application',
    status: 'in_progress', priority: 'high',
    owner: 'นางสาวบี โปรแกรม',
    ownerPosition: 'นักวิชาการคอมพิวเตอร์ชำนาญการ',
    department: 'งานพัฒนาระบบสารสนเทศ',
    contact: '02-555-1234 ต่อ 1801',
    team: ['นางสาวบี โปรแกรม', 'นายเอก นักพัฒนา', 'นางสาวเจน ทดสอบระบบ'],
    budgetRequested: 6500000, budgetApproved: 5800000, budgetSpent: 2320000,
    budgetSource: 'เงินบำรุง',
    kpiCode: 'IT-002', kpiName: 'อัตราระบบสารสนเทศหลัก Uptime', kpiTarget: '≥ 99.5%',
    description: 'อัปเกรด HIS รองรับ FHIR + เชื่อมต่อ HIE ของกระทรวง + Dashboard รายงานผู้บริหาร',
    expectedOutcome: 'แลกเปลี่ยนข้อมูลผู้ป่วยกับ รพ.เครือข่ายได้แบบ real-time, รายงานผู้บริหารแบบ Self-service',
    documents: ['Master Plan HIS.pdf', 'API Spec FHIR.pdf'],
    progressLog: [
      { id: 'pl-2-1', date: iso(2026, 2, 28), progress: 20, note: 'วิเคราะห์ระบบและออกแบบ schema เสร็จ', reportedBy: 'นางสาวบี', budgetSpentDelta: 850000 },
      { id: 'pl-2-2', date: iso(2026, 4, 30), progress: 40, note: 'พัฒนา FHIR Adapter เสร็จ 60%', reportedBy: 'นางสาวบี', budgetSpentDelta: 1470000 },
    ],
  },
  {
    id: '21',
    code: 'IT-2026-A01-A1',
    text: 'ออกแบบและพัฒนา FHIR Adapter',
    start: iso(2026, 1, 1), end: iso(2026, 4, 30),
    progress: 65, type: 'task', parent: '2', mission: 'application',
    status: 'in_progress', priority: 'high',
    owner: 'นายเอก นักพัฒนา', department: 'งานพัฒนาระบบสารสนเทศ',
    budgetRequested: 1500000, budgetApproved: 1500000, budgetSpent: 980000,
  },
  {
    id: '22',
    code: 'IT-2026-A01-A2',
    text: 'เชื่อมต่อ API กับ HIE กระทรวง',
    start: iso(2026, 5, 1), end: iso(2026, 7, 30),
    progress: 0, type: 'task', parent: '2', mission: 'application',
    status: 'approved', priority: 'high',
    owner: 'นางสาวบี โปรแกรม', department: 'งานพัฒนาระบบสารสนเทศ',
    budgetRequested: 1200000, budgetApproved: 1100000, budgetSpent: 0,
    description: 'ผ่าน Sandbox testing ก่อน Production',
  },
  {
    id: '23',
    code: 'IT-2026-A01-A3',
    text: 'พัฒนา Executive Dashboard',
    start: iso(2026, 4, 1), end: iso(2026, 7, 15),
    progress: 25, type: 'task', parent: '2', mission: 'application',
    status: 'in_progress', priority: 'medium',
    owner: 'นางสาวเจน ทดสอบระบบ', department: 'งานวิเคราะห์ข้อมูลและรายงาน',
    budgetRequested: 1800000, budgetApproved: 1500000, budgetSpent: 380000,
    description: 'Dashboard บน Power BI / Metabase สำหรับผู้บริหาร',
  },
  {
    id: '24',
    code: 'IT-2026-A01-M1',
    text: 'Go-live HIS เฟส 2 + HIE',
    start: iso(2026, 8, 30), end: iso(2026, 8, 30),
    type: 'milestone', parent: '2', mission: 'application',
    status: 'approved', priority: 'high',
    owner: 'นางสาวบี โปรแกรม', department: 'งานพัฒนาระบบสารสนเทศ',
    description: 'เปิดใช้งานเต็มรูปแบบหลัง UAT',
  },

  // ═════════ โครงการ 3: Smart Hospital Silver ═════════
  {
    id: '3',
    code: 'IT-2026-SH01',
    text: 'ยกระดับ Smart Hospital สู่ระดับเงิน',
    start: iso(2026, 2, 1), end: iso(2026, 10, 30),
    progress: 30, type: 'project', mission: 'smart',
    status: 'in_progress', priority: 'high',
    owner: 'นพ.สมชาย ดิจิทัล',
    ownerPosition: 'รองผู้อำนวยการฝ่ายการแพทย์',
    department: 'กลุ่มงานสารสนเทศทางการแพทย์',
    contact: '081-789-1234',
    team: ['นพ.สมชาย', 'นางสาวบี โปรแกรม', 'นายชัยพร ไซเบอร์'],
    budgetRequested: 5500000, budgetApproved: 4800000, budgetSpent: 1440000,
    budgetSource: 'เงินบำรุง + งบประมาณ 2569',
    kpiCode: 'IT-004', kpiName: 'ร้อยละผู้ใช้ที่เข้าถึงระบบ Smart Hospital', kpiTarget: '≥ 80%',
    description: 'พัฒนาให้ผ่านเกณฑ์ Smart Hospital ระดับเงินครบ 7 ด้านของกระทรวง',
    expectedOutcome: 'ผ่านการประเมิน Smart Hospital ระดับเงินจากกระทรวงสาธารณสุข ภายในปีงบประมาณ',
    documents: ['Smart Hospital Master Plan.pdf', 'Self Assessment.xlsx'],
    riskNote: 'ระบบ Smart Queue ยังขาดเครื่อง Kiosk รุ่นที่กำหนด',
    progressLog: [
      { id: 'pl-3-1', date: iso(2026, 3, 30), progress: 18, note: 'Smart Queue เปิด 3 คลินิก', reportedBy: 'นพ.สมชาย', budgetSpentDelta: 760000 },
      { id: 'pl-3-2', date: iso(2026, 4, 30), progress: 30, note: 'Mobile App OPD รับ feedback กลุ่มทดลอง', reportedBy: 'นพ.สมชาย', budgetSpentDelta: 680000 },
    ],
  },
  {
    id: '31',
    code: 'IT-2026-SH01-A1',
    text: 'พัฒนา Smart Queue + ตู้ Kiosk',
    start: iso(2026, 2, 1), end: iso(2026, 5, 30),
    progress: 55, type: 'task', parent: '3', mission: 'smart',
    status: 'in_progress', priority: 'medium',
    owner: 'นายเอก นักพัฒนา', department: 'งานพัฒนาระบบสารสนเทศ',
    budgetRequested: 1800000, budgetApproved: 1600000, budgetSpent: 880000,
    description: 'ระบบคิวผ่าน LINE OA + ตู้ Kiosk 8 จุด',
  },
  {
    id: '32',
    code: 'IT-2026-SH01-A2',
    text: 'พัฒนา Mobile App ผู้ป่วยนอก',
    start: iso(2026, 3, 15), end: iso(2026, 7, 30),
    progress: 35, type: 'task', parent: '3', mission: 'smart',
    status: 'in_progress', priority: 'medium',
    owner: 'นางสาวบี โปรแกรม', department: 'งานพัฒนาระบบสารสนเทศ',
    budgetRequested: 1500000, budgetApproved: 1300000, budgetSpent: 380000,
    description: 'นัดหมาย / ดูผล Lab / ใบสั่งยา ผ่าน Mobile App',
  },
  {
    id: '33',
    code: 'IT-2026-SH01-A3',
    text: 'ติดตั้ง Tele-medicine Endpoint',
    start: iso(2026, 6, 1), end: iso(2026, 9, 30),
    progress: 0, type: 'task', parent: '3', mission: 'smart',
    status: 'approved', priority: 'medium',
    owner: 'นายชัยพร ไซเบอร์', department: 'งานเครือข่ายและโครงสร้างพื้นฐาน',
    budgetRequested: 1200000, budgetApproved: 1100000, budgetSpent: 0,
    description: 'ติดตั้งจุด Tele-medicine 6 คลินิก',
  },
  {
    id: '34',
    code: 'IT-2026-SH01-M1',
    text: 'ผ่านประเมิน Smart Hospital ระดับเงิน',
    start: iso(2026, 10, 30), end: iso(2026, 10, 30),
    type: 'milestone', parent: '3', mission: 'smart',
    status: 'approved', priority: 'high',
    owner: 'นพ.สมชาย ดิจิทัล', department: 'กลุ่มงานสารสนเทศทางการแพทย์',
    description: 'การประเมินจากกระทรวง',
  },

  // ═════════ โครงการ 4: Network & Datacenter ═════════
  {
    id: '4',
    code: 'IT-2026-N01',
    text: 'ปรับปรุงโครงข่ายและ Datacenter',
    start: iso(2026, 0, 1), end: iso(2026, 4, 30),
    progress: 80, type: 'project', mission: 'infra',
    status: 'in_progress', priority: 'high',
    owner: 'นายซี เน็ตเวิร์ก',
    ownerPosition: 'หัวหน้างานเครือข่าย',
    department: 'งานเครือข่ายและโครงสร้างพื้นฐาน',
    contact: '02-555-1234 ต่อ 1820',
    budgetRequested: 3800000, budgetApproved: 3500000, budgetSpent: 2800000,
    kpiCode: 'IT-002', kpiName: 'อัตราระบบสารสนเทศหลัก Uptime', kpiTarget: '≥ 99.5%',
    description: 'ปรับปรุง Core Switch + UPS + Backup link',
    expectedOutcome: 'Uptime ≥ 99.5% ลด downtime ที่ไม่ได้วางแผน',
    documents: ['Network Topology 2026.pdf'],
  },
  {
    id: '41',
    code: 'IT-2026-N01-A1',
    text: 'เปลี่ยน Core Switch + Stack',
    start: iso(2026, 0, 1), end: iso(2026, 1, 28),
    progress: 100, type: 'task', parent: '4', mission: 'infra',
    status: 'completed', priority: 'high',
    owner: 'นายซี เน็ตเวิร์ก', department: 'งานเครือข่ายและโครงสร้างพื้นฐาน',
    budgetRequested: 1800000, budgetApproved: 1800000, budgetSpent: 1780000,
    vendor: 'บริษัท CiscoTH จำกัด',
  },
  {
    id: '42',
    code: 'IT-2026-N01-A2',
    text: 'ติดตั้ง UPS ระบบใหม่ + Generator test',
    start: iso(2026, 2, 1), end: iso(2026, 3, 30),
    progress: 70, type: 'task', parent: '4', mission: 'infra',
    status: 'in_progress', priority: 'high',
    owner: 'นายซี เน็ตเวิร์ก', department: 'งานเครือข่ายและโครงสร้างพื้นฐาน',
    budgetRequested: 1200000, budgetApproved: 1100000, budgetSpent: 770000,
  },
  {
    id: '43',
    code: 'IT-2026-N01-A3',
    text: 'จัดทำเส้น Backup Internet',
    start: iso(2026, 3, 1), end: iso(2026, 4, 30),
    progress: 40, type: 'task', parent: '4', mission: 'infra',
    status: 'in_progress', priority: 'medium',
    owner: 'นายซี เน็ตเวิร์ก', department: 'งานเครือข่ายและโครงสร้างพื้นฐาน',
    budgetRequested: 600000, budgetApproved: 500000, budgetSpent: 200000,
  },
]

export const DEFAULT_LINKS: LinkRow[] = [
  { id: 'l1', source: '11', target: '12', type: 0 },
  { id: 'l2', source: '12', target: '14', type: 0 },
  { id: 'l3', source: '13', target: '14', type: 0 },
  { id: 'l4', source: '21', target: '22', type: 0 },
  { id: 'l5', source: '22', target: '24', type: 0 },
  { id: 'l6', source: '23', target: '24', type: 0 },
  { id: 'l7', source: '31', target: '34', type: 0 },
  { id: 'l8', source: '32', target: '34', type: 0 },
  { id: 'l9', source: '33', target: '34', type: 0 },
  { id: 'l10', source: '41', target: '42', type: 0 },
  { id: 'l11', source: '42', target: '43', type: 0 },
]

// ──────────────────────────────────────────────────────────────────────────
// localStorage helpers (namespace แยกจาก HSS strategy)
// ──────────────────────────────────────────────────────────────────────────

const TASKS_KEY = 'fiatx.it-grant-charts.tasks.v1'
const LINKS_KEY = 'fiatx.it-grant-charts.links.v1'

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
  return                       { fill: '#a855f7', label: 'กำลังดำเนิน',   tagColor: 'processing' as const }
}

export const getMissionMeta = (mission: Mission) =>
  MISSION_OPTIONS.find(m => m.value === mission) ?? MISSION_OPTIONS[0]

export const getStatusMeta = (status?: ProjectStatus) =>
  STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0]

export const getPriorityMeta = (priority?: Priority) =>
  PRIORITY_OPTIONS.find(p => p.value === priority) ?? PRIORITY_OPTIONS[1]
