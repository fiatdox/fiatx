// ตัวชี้วัดงานยุทธศาสตร์ — ข้อมูลตัวอย่าง (ยังไม่เชื่อมฐานข้อมูล) ใช้ร่วมกันระหว่างหน้า KPI และหน้าแรกงานยุทธศาสตร์
// ---- Types ----
export interface KPI {
  id: number
  kpiName: string
  department: string
  unit: string
  target: number
  actual: number
  fiscalYear: number
  quarter: 1 | 2 | 3 | 4
  description: string
  trend: 'up' | 'down' | 'stable'
}

// ---- Mock Data ----
export const kpiData: KPI[] = [
  // Q1/2568
  { id: 1,  kpiName: 'ร้อยละแผนยุทธศาสตร์ที่ดำเนินการแล้วเสร็จตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 80, actual: 85, fiscalYear: 2568, quarter: 1, description: 'โครงการที่ดำเนินการแล้วเสร็จตามกรอบเวลาที่กำหนด', trend: 'up' },
  { id: 2,  kpiName: 'จำนวนโครงการที่ผ่านการประเมิน PDCA', department: 'งานพัฒนาคุณภาพ', unit: 'โครงการ', target: 10, actual: 8, fiscalYear: 2568, quarter: 1, description: 'โครงการพัฒนาคุณภาพที่ผ่านวงจร PDCA ครบถ้วน', trend: 'stable' },
  { id: 3,  kpiName: 'ร้อยละความพึงพอใจผู้ใช้ระบบ IT', department: 'งานเทคโนโลยีสารสนเทศ', unit: '%', target: 85, actual: 88, fiscalYear: 2568, quarter: 1, description: 'ผลสำรวจความพึงพอใจผู้ใช้งานระบบสารสนเทศ', trend: 'up' },
  { id: 4,  kpiName: 'จำนวนครั้งกิจกรรมสุขศึกษาในชุมชน', department: 'งานสุขศึกษา', unit: 'ครั้ง', target: 12, actual: 10, fiscalYear: 2568, quarter: 1, description: 'กิจกรรมให้ความรู้ด้านสุขภาพแก่ประชาชนในชุมชน', trend: 'stable' },
  { id: 5,  kpiName: 'ปริมาณขยะติดเชื้อที่กำจัดถูกต้อง', department: 'งานสิ่งแวดล้อม', unit: '%', target: 100, actual: 100, fiscalYear: 2568, quarter: 1, description: 'สัดส่วนขยะติดเชื้อที่ผ่านกระบวนการกำจัดตามมาตรฐาน', trend: 'stable' },
  { id: 6,  kpiName: 'ร้อยละการเบิกจ่ายงบประมาณตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 75, actual: 60, fiscalYear: 2568, quarter: 1, description: 'สัดส่วนการเบิกจ่ายงบประมาณเทียบกับแผนที่กำหนด', trend: 'down' },

  // Q2/2568
  { id: 7,  kpiName: 'ร้อยละแผนยุทธศาสตร์ที่ดำเนินการแล้วเสร็จตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 80, actual: 72, fiscalYear: 2568, quarter: 2, description: 'โครงการที่ดำเนินการแล้วเสร็จตามกรอบเวลาที่กำหนด', trend: 'down' },
  { id: 8,  kpiName: 'จำนวนโครงการที่ผ่านการประเมิน PDCA', department: 'งานพัฒนาคุณภาพ', unit: 'โครงการ', target: 10, actual: 11, fiscalYear: 2568, quarter: 2, description: 'โครงการพัฒนาคุณภาพที่ผ่านวงจร PDCA ครบถ้วน', trend: 'up' },
  { id: 9,  kpiName: 'ร้อยละ Uptime ของระบบ HIS', department: 'งานเทคโนโลยีสารสนเทศ', unit: '%', target: 99, actual: 99.5, fiscalYear: 2568, quarter: 2, description: 'ความพร้อมใช้งานของระบบ HIS ตลอด 24 ชั่วโมง', trend: 'up' },
  { id: 10, kpiName: 'จำนวนครั้งกิจกรรมสุขศึกษาในชุมชน', department: 'งานสุขศึกษา', unit: 'ครั้ง', target: 12, actual: 14, fiscalYear: 2568, quarter: 2, description: 'กิจกรรมให้ความรู้ด้านสุขภาพแก่ประชาชนในชุมชน', trend: 'up' },
  { id: 11, kpiName: 'ร้อยละน้ำเสียที่ผ่านการบำบัดได้มาตรฐาน', department: 'งานสิ่งแวดล้อม', unit: '%', target: 100, actual: 96, fiscalYear: 2568, quarter: 2, description: 'น้ำเสียที่ผ่านระบบบำบัดและมีค่าตามมาตรฐาน', trend: 'down' },
  { id: 12, kpiName: 'ร้อยละการเบิกจ่ายงบประมาณตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 75, actual: 78, fiscalYear: 2568, quarter: 2, description: 'สัดส่วนการเบิกจ่ายงบประมาณเทียบกับแผนที่กำหนด', trend: 'up' },

  // Q3/2568
  { id: 13, kpiName: 'ร้อยละแผนยุทธศาสตร์ที่ดำเนินการแล้วเสร็จตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 80, actual: 90, fiscalYear: 2568, quarter: 3, description: 'โครงการที่ดำเนินการแล้วเสร็จตามกรอบเวลาที่กำหนด', trend: 'up' },
  { id: 14, kpiName: 'จำนวนโครงการที่ผ่านการประเมิน PDCA', department: 'งานพัฒนาคุณภาพ', unit: 'โครงการ', target: 10, actual: 5, fiscalYear: 2568, quarter: 3, description: 'โครงการพัฒนาคุณภาพที่ผ่านวงจร PDCA ครบถ้วน', trend: 'down' },
  { id: 15, kpiName: 'ร้อยละความพึงพอใจผู้ใช้ระบบ IT', department: 'งานเทคโนโลยีสารสนเทศ', unit: '%', target: 85, actual: 82, fiscalYear: 2568, quarter: 3, description: 'ผลสำรวจความพึงพอใจผู้ใช้งานระบบสารสนเทศ', trend: 'down' },
  { id: 16, kpiName: 'จำนวนครั้งกิจกรรมสุขศึกษาในชุมชน', department: 'งานสุขศึกษา', unit: 'ครั้ง', target: 12, actual: 12, fiscalYear: 2568, quarter: 3, description: 'กิจกรรมให้ความรู้ด้านสุขภาพแก่ประชาชนในชุมชน', trend: 'stable' },
  { id: 17, kpiName: 'ปริมาณขยะติดเชื้อที่กำจัดถูกต้อง', department: 'งานสิ่งแวดล้อม', unit: '%', target: 100, actual: 98, fiscalYear: 2568, quarter: 3, description: 'สัดส่วนขยะติดเชื้อที่ผ่านกระบวนการกำจัดตามมาตรฐาน', trend: 'stable' },

  // Q4/2568
  { id: 18, kpiName: 'ร้อยละแผนยุทธศาสตร์ที่ดำเนินการแล้วเสร็จตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 80, actual: 93, fiscalYear: 2568, quarter: 4, description: 'โครงการที่ดำเนินการแล้วเสร็จตามกรอบเวลาที่กำหนด', trend: 'up' },
  { id: 19, kpiName: 'จำนวนโครงการที่ผ่านการประเมิน PDCA', department: 'งานพัฒนาคุณภาพ', unit: 'โครงการ', target: 10, actual: 10, fiscalYear: 2568, quarter: 4, description: 'โครงการพัฒนาคุณภาพที่ผ่านวงจร PDCA ครบถ้วน', trend: 'up' },
  { id: 20, kpiName: 'ร้อยละ Uptime ของระบบ HIS', department: 'งานเทคโนโลยีสารสนเทศ', unit: '%', target: 99, actual: 99.8, fiscalYear: 2568, quarter: 4, description: 'ความพร้อมใช้งานของระบบ HIS ตลอด 24 ชั่วโมง', trend: 'up' },
  { id: 21, kpiName: 'ร้อยละน้ำเสียที่ผ่านการบำบัดได้มาตรฐาน', department: 'งานสิ่งแวดล้อม', unit: '%', target: 100, actual: 100, fiscalYear: 2568, quarter: 4, description: 'น้ำเสียที่ผ่านระบบบำบัดและมีค่าตามมาตรฐาน', trend: 'up' },
  { id: 22, kpiName: 'ร้อยละการเบิกจ่ายงบประมาณตามแผน', department: 'งานยุทธศาสตร์', unit: '%', target: 75, actual: 45, fiscalYear: 2568, quarter: 4, description: 'สัดส่วนการเบิกจ่ายงบประมาณเทียบกับแผนที่กำหนด', trend: 'down' },
]

// ---- Helpers ----
export const departments = [...new Set(kpiData.map(k => k.department))].sort()
export const fiscalYears = [...new Set(kpiData.map(k => k.fiscalYear))].sort((a, b) => b - a)

export const getAchievePct = (kpi: KPI): number => {
  if (kpi.target === 0) return 100
  return Math.round((kpi.actual / kpi.target) * 100)
}

/** ระดับผลเทียบเป้า — ≥100 บรรลุ · ≥75 ใกล้เป้า · ≥50 เสี่ยง · ต่ำกว่า = ไม่บรรลุ */
export const achieveLevel = (pct: number): { key: 'met' | 'near' | 'risk' | 'miss'; label: string; color: string; tagColor: string } => {
  if (pct >= 100) return { key: 'met', label: 'บรรลุเป้า', color: '#10b981', tagColor: 'success' }
  if (pct >= 75)  return { key: 'near', label: 'ใกล้เป้า', color: '#3b82f6', tagColor: 'processing' }
  if (pct >= 50)  return { key: 'risk', label: 'เสี่ยง', color: '#f59e0b', tagColor: 'warning' }
  return { key: 'miss', label: 'ไม่บรรลุ', color: '#ef4444', tagColor: 'error' }
}

/** ไตรมาสล่าสุดที่มีข้อมูล */
export const latestPeriod = () => {
  const fy = fiscalYears[0]
  const quarter = Math.max(...kpiData.filter(k => k.fiscalYear === fy).map(k => k.quarter))
  return { fy, quarter }
}
