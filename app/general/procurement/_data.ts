// Shared mock data for procurement workflow:
// PO → Receipt (creates AP) → Inspection (warehouse head records committee result) → Payment

export type ReceiptItem = {
  key: string
  name: string
  unit: string
  qty: number              // รับจริงในรอบนี้
  qtyOrdered?: number      // ที่ควรได้รับรอบนี้ (= remaining ใน PO ตอนเปิดรับ)
  qtyPending?: number      // รอส่งเพิ่ม (ผู้ขายจะส่งให้ในรอบถัดไป)
  unitPrice: number
  shortReason?: ShortReason // เหตุผลถ้ารับไม่ครบ (รวมทั้ง pending และยกเลิก)
  shortNote?: string
  // qtyCancelled (ยกเลิก/ไม่ส่งแล้ว) คำนวณได้จาก qtyOrdered - qty - qtyPending

  // ผลตรวจรับระดับรายการ (กรรมการตรวจรับลงรายบรรทัด)
  inspectStatus?: InspectionStatus
  inspectNote?: string
  qtyPassed?: number       // จำนวนที่ตรวจผ่าน (อาจน้อยกว่า qty ถ้าบางชิ้นเสีย)
  qtyDefect?: number       // จำนวนที่ตรวจไม่ผ่าน/ส่งคืน
}

export type ShortReason =
  | 'out_of_stock'
  | 'delayed'
  | 'damaged'
  | 'spec_mismatch'
  | 'partial_delivery'
  | 'other'

export const SHORT_REASON_LABEL: Record<ShortReason, string> = {
  out_of_stock:     'ของหมด/ของขาด',
  delayed:          'ส่งล่าช้า — รอรอบหน้า',
  damaged:          'ของเสียหาย/ชำรุด',
  spec_mismatch:    'สเปคไม่ตรงตาม PO',
  partial_delivery: 'ผู้ขายส่งบางส่วน',
  other:            'อื่นๆ',
}

export type InspectionStatus = 'pending' | 'passed' | 'rejected' | 'reworking'
export type PaymentStatus = 'unpaid' | 'scheduled' | 'paid' | 'overdue'

export interface ReceiptRecord {
  id: string                 // GR-2026-001 (Goods Receipt)
  poId: string
  supplier: string
  supplierTaxId: string
  invoiceNo: string          // เลขที่ใบส่งของ/ใบกำกับภาษี
  invoiceDate: string        // วันที่ใบส่งของ
  receivedDate: string       // วันที่รับของ
  receivedBy: string         // เจ้าหน้าที่พัสดุ
  creditDays: number         // เครดิตเทอม (วัน)
  dueDate: string            // วันครบกำหนดชำระ
  items: ReceiptItem[]
  totalAmount: number
  inspectionStatus: InspectionStatus
  inspectionDate?: string
  inspectionBy?: string      // หัวหน้าคลัง
  inspectionRemark?: string
  committee?: string[]       // กรรมการตรวจรับ
  paymentStatus: PaymentStatus
  paymentDate?: string
  paymentRef?: string
  remark?: string
}

// KPI: hospital must pay within X days after passed inspection
export const KPI_PAY_AFTER_INSPECTION_DAYS = 30

export const MOCK_RECEIPTS: ReceiptRecord[] = [
  {
    id: 'GR-2026-001',
    poId: 'PO-2026-001',
    supplier: 'บริษัท MedTech Asia Co., Ltd.',
    supplierTaxId: '0105556789012',
    invoiceNo: 'INV-MTA-2604-018',
    invoiceDate: '2026-04-12',
    receivedDate: '2026-04-13',
    receivedBy: 'น.ส.สุดา พัสดุดี',
    creditDays: 30,
    dueDate: '2026-05-12',
    items: [
      { key: '1', name: 'Electrode Module Nihon Kohden ECG-2150', unit: 'ชุด', qty: 1, unitPrice: 12000,
        inspectStatus: 'passed', qtyPassed: 1, inspectNote: 'ตรงสเปค มีใบรับประกัน' },
      { key: '2', name: 'Lead wire 10-lead สายต่อ ECG', unit: 'เส้น', qty: 5, unitPrice: 600,
        inspectStatus: 'passed', qtyPassed: 5, inspectNote: 'ครบ 5 เส้น สายไม่ขาด' },
    ],
    totalAmount: 15000,
    inspectionStatus: 'passed',
    inspectionDate: '2026-04-15',
    inspectionBy: 'นายวิชัย คลังเก่ง (หัวหน้าคลัง)',
    inspectionRemark: 'ตรงตามสเปค ครบถ้วน มีใบรับประกัน 1 ปี',
    committee: ['นพ.สมชาย รักษาดี', 'นางพรพิมล จัดซื้อชอบ', 'นายธนา ตรวจรับ'],
    paymentStatus: 'paid',
    paymentDate: '2026-04-28',
    paymentRef: 'PAY-2604-091',
    remark: '',
  },
  {
    id: 'GR-2026-002',
    poId: 'PO-2026-003',
    supplier: 'บริษัท Bangkok Lab Supplies',
    supplierTaxId: '0105549887766',
    invoiceNo: 'BLS-2026/0421',
    invoiceDate: '2026-04-18',
    receivedDate: '2026-04-19',
    receivedBy: 'น.ส.สุดา พัสดุดี',
    creditDays: 45,
    dueDate: '2026-06-03',
    items: [
      { key: '1', name: 'น้ำยาตรวจ CBC reagent 5L', unit: 'แกลลอน', qty: 4, unitPrice: 8500,
        inspectStatus: 'passed', qtyPassed: 4, inspectNote: 'lot ตรง วันหมดอายุยังเหลือ > 1 ปี' },
      { key: '2', name: 'Pipette tip 1000μL (1000/box)', unit: 'กล่อง', qty: 10, unitPrice: 450,
        inspectStatus: 'passed', qtyPassed: 10, inspectNote: 'ครบ 10 กล่อง ปิดผนึกเรียบร้อย' },
    ],
    totalAmount: 38500,
    inspectionStatus: 'passed',
    inspectionDate: '2026-04-22',
    inspectionBy: 'นายวิชัย คลังเก่ง (หัวหน้าคลัง)',
    inspectionRemark: 'ตรวจรับครบถ้วน lot number ตรงกับใบส่งของ',
    committee: ['ภญ.อัจฉรา ยาดี', 'นายธนา ตรวจรับ', 'น.ส.มาลี ปฏิบัติ'],
    paymentStatus: 'unpaid',
    remark: '',
  },
  {
    id: 'GR-2026-003',
    poId: 'PO-2026-004',
    supplier: 'หจก.ครุภัณฑ์การแพทย์ไทย',
    supplierTaxId: '0103552233445',
    invoiceNo: 'TMS-INV-26-0117',
    invoiceDate: '2026-04-20',
    receivedDate: '2026-04-21',
    receivedBy: 'นายเอกชัย รับของ',
    creditDays: 30,
    dueDate: '2026-05-21',
    items: [
      { key: '1', name: 'เตียงผู้ป่วย 3 ไก ปรับไฟฟ้า', unit: 'เตียง', qty: 2, unitPrice: 45000 },
      { key: '2', name: 'รถเข็นวีลแชร์อะลูมิเนียม', unit: 'คัน', qty: 4, unitPrice: 6500 },
    ],
    totalAmount: 116000,
    inspectionStatus: 'pending',
    committee: ['นพ.สมชาย รักษาดี', 'นางพรพิมล จัดซื้อชอบ', 'นายวิชัย คลังเก่ง'],
    paymentStatus: 'unpaid',
    remark: 'รอกรรมการตรวจรับนัดหมายตรวจ',
  },
  {
    id: 'GR-2026-004',
    poId: 'PO-2026-005',
    supplier: 'บริษัท HP Thailand Official',
    supplierTaxId: '0107536001234',
    invoiceNo: 'HP-TH-2604-3387',
    invoiceDate: '2026-03-25',
    receivedDate: '2026-03-26',
    receivedBy: 'น.ส.สุดา พัสดุดี',
    creditDays: 30,
    dueDate: '2026-04-25',
    items: [
      { key: '1', name: 'Fuser Unit HP CF367-67906 LaserJet M507', unit: 'ชิ้น', qty: 1, unitPrice: 2400,
        inspectStatus: 'passed', qtyPassed: 1, inspectNote: 'ของแท้ HP serial ตรงใบรับประกัน' },
      { key: '2', name: 'Toner HP 89X (CF289X)', unit: 'ตลับ', qty: 3, unitPrice: 6800,
        inspectStatus: 'passed', qtyPassed: 3, inspectNote: 'ครบ 3 ตลับ ผนึกซีลเรียบร้อย' },
    ],
    totalAmount: 22800,
    inspectionStatus: 'passed',
    inspectionDate: '2026-03-30',
    inspectionBy: 'นายวิชัย คลังเก่ง (หัวหน้าคลัง)',
    inspectionRemark: 'ของแท้ มี serial ตรงตามใบรับประกัน',
    committee: ['นายธนา ตรวจรับ', 'น.ส.มาลี ปฏิบัติ', 'นายสุรชัย ไอที'],
    paymentStatus: 'overdue',
    remark: 'รอเอกสารเพิ่มเติมจากผู้ขาย',
  },
  {
    id: 'GR-2026-005',
    poId: 'PO-2026-006',
    supplier: 'บริษัท Siam Office Supply',
    supplierTaxId: '0105500998877',
    invoiceNo: 'SOS-2604-1188',
    invoiceDate: '2026-04-22',
    receivedDate: '2026-04-23',
    receivedBy: 'นายเอกชัย รับของ',
    creditDays: 30,
    dueDate: '2026-05-23',
    items: [
      { key: '1', name: 'กระดาษ A4 80g (500 แผ่น/รีม)', unit: 'รีม', qty: 40, qtyOrdered: 50, qtyPending: 8, unitPrice: 110,
        shortReason: 'partial_delivery', shortNote: 'รถผู้ขายขนได้แค่ 40 รีม รอบหน้าส่งอีก 8 รีม (อีก 2 รีมยกเลิก)',
        inspectStatus: 'passed', qtyPassed: 40, inspectNote: 'กระดาษคุณภาพดี ไม่มีปัญหา' },
      { key: '2', name: 'หมึกปริ้น Brother TN-2480', unit: 'ตลับ', qty: 6, qtyOrdered: 6, unitPrice: 1850,
        inspectStatus: 'rejected', qtyPassed: 4, qtyDefect: 2,
        inspectNote: '2 ตลับชำรุด กล่องบุบ ผนึกเสีย ขอเปลี่ยนใหม่' },
      { key: '3', name: 'แฟ้มเก็บเอกสาร A4 (3 ห่วง)', unit: 'แฟ้ม', qty: 0, qtyOrdered: 20, qtyPending: 20, unitPrice: 95,
        shortReason: 'out_of_stock', shortNote: 'ของหมด รอเข้าสต็อกผู้ขาย คาดว่าได้ใน 7 วัน' },
    ],
    totalAmount: 15500,
    inspectionStatus: 'rejected',
    inspectionDate: '2026-04-25',
    inspectionBy: 'นายวิชัย คลังเก่ง (หัวหน้าคลัง)',
    inspectionRemark: 'หมึกปริ้น 2 ตลับชำรุด ขอเปลี่ยนใหม่',
    committee: ['นางพรพิมล จัดซื้อชอบ', 'นายธนา ตรวจรับ'],
    paymentStatus: 'unpaid',
    remark: 'แจ้งผู้ขายเปลี่ยนสินค้าแล้ว รอส่งใหม่',
  },
  {
    id: 'GR-2026-006',
    poId: 'PO-2026-007',
    supplier: 'บริษัท Pharma Plus Distribution',
    supplierTaxId: '0105547788991',
    invoiceNo: 'PPD-2604-0552',
    invoiceDate: '2026-04-15',
    receivedDate: '2026-04-16',
    receivedBy: 'ภญ.วราภรณ์ คลังยา',
    creditDays: 60,
    dueDate: '2026-06-15',
    items: [
      { key: '1', name: 'Paracetamol 500mg (1000 เม็ด/ขวด)', unit: 'ขวด', qty: 20, unitPrice: 320,
        inspectStatus: 'passed', qtyPassed: 20, inspectNote: 'lot/expire ตรง ขวดผนึกครบ' },
      { key: '2', name: 'Amoxicillin 500mg (100 แคป/แผง)', unit: 'แผง', qty: 30, unitPrice: 180,
        inspectStatus: 'passed', qtyPassed: 30, inspectNote: 'lot ตรง วันหมดอายุ > 18 เดือน' },
    ],
    totalAmount: 11800,
    inspectionStatus: 'passed',
    inspectionDate: '2026-04-18',
    inspectionBy: 'ภญ.วราภรณ์ คลังยา (หัวหน้าคลังยา)',
    inspectionRemark: 'lot/expire ตรงตาม spec',
    committee: ['ภญ.อัจฉรา ยาดี', 'ภก.สมศักดิ์ ตรวจยา'],
    paymentStatus: 'scheduled',
    remark: 'นัดจ่ายตามกำหนดเครดิตเทอม',
  },
]

export const STATUS_LABEL = {
  inspection: {
    pending:   { label: 'รอตรวจรับ',  color: 'processing' },
    passed:    { label: 'ตรวจรับผ่าน', color: 'success' },
    rejected:  { label: 'ไม่ผ่าน',     color: 'error' },
    reworking: { label: 'รอแก้ไข',     color: 'warning' },
  } as Record<InspectionStatus, { label: string; color: string }>,
  payment: {
    unpaid:    { label: 'รอจ่าย',     color: 'warning'    },
    scheduled: { label: 'นัดจ่ายแล้ว', color: 'processing' },
    paid:      { label: 'จ่ายแล้ว',    color: 'success'    },
    overdue:   { label: 'เกินกำหนด',   color: 'error'      },
  } as Record<PaymentStatus, { label: string; color: string }>,
}

// Reference "today" used across procurement pages so KPI countdowns are deterministic
export const TODAY = '2026-05-02'

// ─────────────────────────────────────────────────────────────────────────────
// PO data — มาจากระบบ Inventory ภายนอก (เว็บนี้ดึงมาแสดงเพื่อบันทึกการรับของ)
// ─────────────────────────────────────────────────────────────────────────────

export type POStatus = 'sent' | 'partial' | 'completed'

export interface POItem {
  key: string
  name: string
  unit: string
  qty: number          // จำนวนสั่งทั้งหมดใน PO
  unitPrice: number
  received: number     // รับสะสมแล้ว
}

export interface PurchaseOrder {
  id: string
  prIds: string[]
  supplier: string
  supplierTel: string
  supplierEmail: string
  createdDate: string
  expectedDate: string
  status: POStatus
  totalAmount: number
  items: POItem[]
  remark: string
}

export const PO_STATUS_TAG: Record<POStatus, { label: string; color: string }> = {
  sent:      { label: 'รอรับสินค้า', color: 'processing' },
  partial:   { label: 'รับบางส่วน',  color: 'warning'    },
  completed: { label: 'รับครบแล้ว',  color: 'success'    },
}

export const MOCK_POS: PurchaseOrder[] = [
  // ── PO ที่รับครบแล้ว (อ้างอิงโดย GR เก่า)
  {
    id: 'PO-2026-001', prIds: ['PR-2026-001'],
    supplier: 'บริษัท MedTech Asia Co., Ltd.',
    supplierTel: '02-555-1100', supplierEmail: 'sale@medtech.co.th',
    createdDate: '2026-04-05', expectedDate: '2026-04-15',
    status: 'completed', totalAmount: 15000,
    items: [
      { key: '1', name: 'Electrode Module Nihon Kohden ECG-2150', unit: 'ชุด',  qty: 1, unitPrice: 12000, received: 1 },
      { key: '2', name: 'Lead wire 10-lead สายต่อ ECG',           unit: 'เส้น', qty: 5, unitPrice: 600,   received: 5 },
    ],
    remark: 'รับครบ ตรวจสอบแล้ว',
  },

  // ── 5 รายการ PO รอรับสินค้า (ตามที่ขอ)
  {
    id: 'PO-2026-008', prIds: ['PR-2026-014'],
    supplier: 'บริษัท Bangkok Lab Supplies',
    supplierTel: '02-318-7700', supplierEmail: 'order@bangkoklab.co.th',
    createdDate: '2026-04-22', expectedDate: '2026-05-05',
    status: 'sent', totalAmount: 73600,
    items: [
      { key: '1', name: 'น้ำยาตรวจ HbA1c reagent (4L)', unit: 'แกลลอน', qty: 6,  unitPrice: 9200, received: 0 },
      { key: '2', name: 'Microtube 1.5mL (1000/box)',   unit: 'กล่อง',  qty: 12, unitPrice: 480,  received: 0 },
      { key: '3', name: 'Glove ไนไตรล์ size M',         unit: 'กล่อง',  qty: 25, unitPrice: 520,  received: 0 },
    ],
    remark: 'แจ้งล่วงหน้า 1 วันก่อนส่ง',
  },
  {
    id: 'PO-2026-009', prIds: ['PR-2026-016'],
    supplier: 'หจก.ครุภัณฑ์การแพทย์ไทย',
    supplierTel: '02-712-4421', supplierEmail: 'sales@thaimed.co.th',
    createdDate: '2026-04-25', expectedDate: '2026-05-08',
    status: 'sent', totalAmount: 84000,
    items: [
      { key: '1', name: 'รถเข็นเครื่องมือแพทย์ 3 ชั้น', unit: 'คัน', qty: 4, unitPrice: 8500, received: 0 },
      { key: '2', name: 'เสาน้ำเกลือสแตนเลส 5 ขา',     unit: 'ต้น', qty: 10, unitPrice: 5000, received: 0 },
    ],
    remark: 'จัดส่งทยอยได้',
  },
  {
    id: 'PO-2026-010', prIds: ['PR-2026-018'],
    supplier: 'บริษัท Pharma Plus Distribution',
    supplierTel: '02-633-9090', supplierEmail: 'order@pharmaplus.co.th',
    createdDate: '2026-04-26', expectedDate: '2026-05-04',
    status: 'partial', totalAmount: 28800,
    items: [
      { key: '1', name: 'Ceftriaxone 1g inj.',  unit: 'vial', qty: 200, unitPrice:  85, received: 120 },
      { key: '2', name: 'NSS 1000mL',           unit: 'ขวด',  qty: 100, unitPrice: 45, received: 100 },
      { key: '3', name: 'D5W 500mL',            unit: 'ขวด',  qty: 150, unitPrice: 50, received:   0 },
    ],
    remark: 'ส่งล็อตแรกแล้ว รอลอตที่สองเร็วๆ นี้',
  },
  {
    id: 'PO-2026-011', prIds: ['PR-2026-019'],
    supplier: 'บริษัท Siam Office Supply',
    supplierTel: '02-260-1188', supplierEmail: 'sales@siamoffice.co.th',
    createdDate: '2026-04-28', expectedDate: '2026-05-06',
    status: 'sent', totalAmount: 19400,
    items: [
      { key: '1', name: 'กระดาษ A4 80g',                 unit: 'รีม',  qty: 60, unitPrice: 110,  received: 0 },
      { key: '2', name: 'ปากกาลูกลื่นน้ำเงิน (50/กล่อง)', unit: 'กล่อง', qty: 8,  unitPrice: 280,  received: 0 },
      { key: '3', name: 'ลวดเย็บกระดาษเบอร์ 10',          unit: 'แพ็ก', qty: 30, unitPrice: 35,   received: 0 },
      { key: '4', name: 'แฟ้มเก็บเอกสาร 2 ห่วง',         unit: 'แฟ้ม', qty: 40, unitPrice: 75,   received: 0 },
    ],
    remark: 'ส่งภายใน 1 สัปดาห์',
  },
  {
    id: 'PO-2026-012', prIds: ['PR-2026-021'],
    supplier: 'บริษัท HP Thailand Official',
    supplierTel: '02-353-9000', supplierEmail: 'service@hp.co.th',
    createdDate: '2026-04-29', expectedDate: '2026-05-10',
    status: 'sent', totalAmount: 41600,
    items: [
      { key: '1', name: 'Toner HP 89X (CF289X)',                 unit: 'ตลับ', qty: 4, unitPrice: 6800, received: 0 },
      { key: '2', name: 'Drum HP CF289X (Imaging unit)',         unit: 'ชิ้น', qty: 2, unitPrice: 5400, received: 0 },
      { key: '3', name: 'Maintenance Kit LaserJet M507 (110V)',  unit: 'ชุด',  qty: 1, unitPrice: 3600, received: 0 },
    ],
    remark: 'มี serial — ขอเอกสารใบรับประกันแนบมาด้วย',
  },
]

