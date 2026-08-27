// สิทธิ์การมองเห็นเมนู — แหล่งความจริงเดียวของทั้ง Navbar และหน้าหลัก
// เดิมกฎนี้อยู่ใน Navbar.tsx ที่เดียว ทำให้เมนูลัดหน้า home โชว์ทุกคนโดยไม่สนใจ role
// ย้ายมาไว้ที่นี่เพื่อให้แก้สิทธิ์จุดเดียวแล้วมีผลทุกที่

// กลุ่มสิทธิ์งาน IT ภายใน — ตรงกับ gate ของหน้าจัดการงานซ่อม
export const IT_STAFF_ROLES = ['ADMIN', 'CHIEF_GROUP_IT', 'CHIEF_MISSION_IT', 'IT_STAFF']

// map: route ของเมนู → role ที่เห็นได้ (route ที่ไม่อยู่ใน map = ทุกคนเห็น)
// เพิ่มเมนูที่ต้องคุมสิทธิ์ได้ที่นี่จุดเดียว
export const MENU_ROLE_REQUIREMENTS: Record<string, string[]> = {
  // เลขที่เงินเดือนบุคลากร — แก้ salary_id ของคนทั้งองค์กร (ตรงกับ SALARY_ID_ROLES ฝั่ง backend)
  '/accounting/salary-ids': ['ADMIN', 'FINANCE', 'IT_STAFF'],
  // กำหนดสิทธิ์การลา — แก้กฎการลาทั้งองค์กร (เฉพาะ ADMIN/HR — ตรงกับ requireRoles ฝั่ง backend)
  '/hr/leave/policy': ['ADMIN', 'HR'],
  // วันลาสะสม — แก้ยอดสะสม/ยกยอดปีงบประมาณของบุคลากรทั้งองค์กร (เฉพาะ ADMIN/HR)
  '/hr/leave/balance': ['ADMIN', 'HR'],
  // ผังผู้บริหาร — แต่งตั้งหัวหน้า/ผอ. (อยู่หลัง requireRoles('ADMIN','HR') ใน hrRoutes)
  '/hr/settings/supervisor': ['ADMIN', 'HR'],
  // ทะเบียนบุคลากร — สร้าง/แก้ไข/ระงับบัญชี (ตรงกับ requireRoles ใน userRoutes)
  '/hr/users': ['ADMIN', 'HR', 'IT_STAFF'],
  // Dashboard ภาพรวมบุคลากร — ข้อมูลรวมทั้งองค์กร
  '/hr/dashboard': ['ADMIN', 'HR'],
  // งานซ่อมคอมพิวเตอร์ — หน้าจัดการ (เฉพาะเจ้าหน้าที่ IT)
  '/information-technology/maintenance/manage': IT_STAFF_ROLES,
  // HAIT — เครื่องมือภายในของงาน IT (เฉพาะเจ้าหน้าที่ IT)
  '/information-technology/hait': IT_STAFF_ROLES,
  '/information-technology/hait/sla': IT_STAFF_ROLES,
  '/information-technology/hait/incident-reports': IT_STAFF_ROLES,
  '/information-technology/hait/activity': IT_STAFF_ROLES,
  '/information-technology/hait/risk-management': IT_STAFF_ROLES,
  // ตรวจสอบ/อนุมัติคำขอข้อมูลสถิติ (PDPA) — เฉพาะหัวหน้ากลุ่มงานข้อมูลทางการแพทย์
  '/medical-data/statistics-review': ['ADMIN', 'CHIEF_GROUP_MEDSTAT'],
  // ระบบรับบริจาคครุภัณฑ์ — แยกสิทธิ์ตามขั้นตอน (เจ้าหน้าที่รับบริจาค / กรรมการ / พัสดุ / ผู้ดูแลระบบ)
  '/general/assets/donation-request':      ['ADMIN', 'DONATION_STAFF'],
  '/general/assets/donation-review':       ['ADMIN', 'DONATION_COMMITTEE'],
  '/general/assets/donation-registration': ['ADMIN', 'DONATION_PROCUREMENT'],
  '/general/assets/donation-admin':        ['ADMIN'],
}

// เมนูที่สิทธิ์ไม่ได้มาจาก role แต่มาจากการถูกแต่งตั้งเป็นหัวหน้าหน่วย (เช็คกับ backend)
// อนุมัติการลา — เฉพาะหัวหน้า/รักษาการ กลุ่มภารกิจ · กลุ่มงาน · หน่วยงาน (หรือ ผอ./ADMIN)
export const MENU_SUPERVISOR_ONLY = ['/hr/leave/approval']

/** normalize roles จาก cookie user_data ให้เป็นตัวพิมพ์ใหญ่ */
export const normalizeRoles = (roles?: unknown): string[] =>
  Array.isArray(roles) ? roles.map(r => String(r).toUpperCase()) : []

// ── สวิตช์เปิด/ปิดโมดูล (ตาราง app_modules — ผู้ดูแลระบบคุมที่ /account/modules) ──
// รายการที่ปิดคือ route_prefix เช่น '/hr/leave' → ซ่อนทั้งสาขา

/** จับคู่แบบทั้งเซกเมนต์ — '/general/maintenance' ต้องไม่ไปโดน '/general/maintenance-request' */
const underPrefix = (route: string, prefix: string) =>
  route === prefix || route.startsWith(`${prefix}/`)

/** โมดูลของเส้นทางนี้เปิดใช้งานอยู่ไหม (disabled ว่าง = เปิดหมด) */
export const isRouteEnabled = (route: string, disabledPrefixes: string[]): boolean =>
  !disabledPrefixes.some(p => underPrefix(route, p))

/**
 * เห็นเมนูนี้ได้ไหม — route ที่ไม่ได้กำหนดสิทธิ์ = เห็นได้ทุกคน
 * isLeaveApprover: null = ยังไม่รู้ผล (ซ่อนไว้ก่อน กันเมนูกะพริบให้คนที่ไม่มีสิทธิ์เห็น)
 * disabledPrefixes: โมดูลที่ผู้ดูแลระบบปิดไว้ — ปิดแล้วซ่อนทุกคนรวมถึง ADMIN
 */
export const canSeeMenu = (
  key: string,
  userRoles: string[],
  isLeaveApprover: boolean | null,
  disabledPrefixes: string[] = [],
): boolean => {
  if (!isRouteEnabled(key, disabledPrefixes)) return false
  if (MENU_SUPERVISOR_ONLY.includes(key)) return isLeaveApprover === true
  const req = MENU_ROLE_REQUIREMENTS[key]
  return !req || req.some(r => userRoles.includes(r))
}
