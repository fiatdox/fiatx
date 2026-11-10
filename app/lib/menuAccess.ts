// สิทธิ์การมองเห็นเมนู — แหล่งความจริงเดียวของทั้ง Navbar และหน้าหลัก
// เดิมกฎนี้อยู่ใน Navbar.tsx ที่เดียว ทำให้เมนูลัดหน้า home โชว์ทุกคนโดยไม่สนใจ role
// ย้ายมาไว้ที่นี่เพื่อให้แก้สิทธิ์จุดเดียวแล้วมีผลทุกที่

// กลุ่มสิทธิ์งาน IT ภายใน — ตรงกับ gate ของหน้าจัดการงานซ่อม
export const IT_STAFF_ROLES = ['ADMIN', 'CHIEF_GROUP_IT', 'CHIEF_MISSION_IT', 'IT_STAFF']

// จัดการเลขที่เงินเดือนบุคลากร + ทะเบียนเงินเดือน — ผู้ดูแลระบบ เจ้าหน้าที่ IT และการเงิน/บัญชี (ตรงกับ SALARY_ID_ROLES ฝั่ง backend)
export const SALARY_ID_ROLES = ['ADMIN', 'IT_STAFF', 'ACCOUNT', 'FINANCE']

// จัดการข่าว / เอกสาร / ป๊อปอัปงาน HR — ตรงกับ HR_POST_MANAGER_ROLES ฝั่ง backend
export const HR_POST_MANAGER_ROLES = ['ADMIN', 'HR']

// ตั้งค่าเบี้ยเลี้ยงเดินทางไปราชการ — ผู้ดูแลระบบ และเจ้าหน้าที่งานพัฒนาทรัพยากรบุคคล (HRD) (ตรงกับ ALLOWANCE_ROLES ฝั่ง backend)
export const HRD_ALLOWANCE_ROLES = ['ADMIN', 'HRD']

// map: route ของเมนู → role ที่เห็นได้ (route ที่ไม่อยู่ใน map = ทุกคนเห็น)
// เพิ่มเมนูที่ต้องคุมสิทธิ์ได้ที่นี่จุดเดียว
export const MENU_ROLE_REQUIREMENTS: Record<string, string[]> = {
  // เลขที่เงินเดือนบุคลากร — แก้ salary_id ของคนทั้งองค์กร (ตรงกับ SALARY_ID_ROLES ฝั่ง backend)
  // เครื่องมือผู้ดูแล: เมนูอยู่ใน sidebar ขวา (Navbar) และ proxy.ts กั้น URL ตรง
  '/accounting/salary-ids': SALARY_ID_ROLES,
  // กำหนดสิทธิ์การลา — แก้กฎการลาทั้งองค์กร (เฉพาะ ADMIN/HR — ตรงกับ requireRoles ฝั่ง backend)
  '/hr/leave/policy': ['ADMIN', 'HR'],
  // จัดการข่าว / เอกสาร / ป๊อปอัปงาน HR (proxy.ts กั้น URL ตรง, backend requireRoles('ADMIN','HR'))
  '/hr/leave/posts': HR_POST_MANAGER_ROLES,
  // วันลาสะสม — แก้ยอดสะสมและยกยอดรายคน (ADMIN/HR) · ปุ่มยกยอดทั้งองค์กรเฉพาะ ADMIN (backend ตรวจซ้ำ)
  '/hr/leave/balance': ['ADMIN', 'HR'],
  // ตรวจแก้วันลาสะสม — หายอดที่ผิดและแก้ทีละแถว (ADMIN/HR) · แก้หลายแถวพร้อมกันเฉพาะ ADMIN (proxy.ts กั้น URL ตรง, backend ตรวจซ้ำ)
  '/hr/leave/balance-audit': ['ADMIN', 'HR'],
  // ตรวจสอบการโอนยอดวันลาสะสม — รายชื่อบุคลากรทั้งองค์กรที่ยังไม่ได้ตั้งยอด แยกตามประเภท (proxy.ts กั้น URL ตรง)
  '/hr/leave/balance-transfer': ['ADMIN', 'HR'],
  // ตรวจวันลาที่คร่อมวันหยุด + วันหยุดราชการ — แก้จำนวนวันลา/ยอดของทุกคน (proxy.ts กั้น URL ตรง)
  '/hr/leave/day-check': ['ADMIN', 'HR'],
  // โอนประวัติการลา / วันเริ่มงานจากโปรแกรมเดิม — เฉพาะ ADMIN (proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์)
  '/hr/leave/legacy-import': ['ADMIN'],
  // ประวัติการลาเจ้าหน้าที่ทุกคน + ไฟล์แนบ (ใบรับรองแพทย์) — ADMIN / HR และ ผอ./รักษาการ ผอ. (ดู MENU_DIRECTOR_ALSO)
  // backend ตรวจสิทธิ์ใน controller · ปุ่มตรวจวันลาเฉพาะ ADMIN / HR
  '/hr/leave/staff-history': ['ADMIN', 'HR'],
  // ตั้งค่าการแจ้งเตือนระบบลา (หมอพร้อม) — ส่งข้อความถึงบุคลากรทั้งองค์กร เฉพาะ ADMIN (proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์)
  '/hr/leave/notify-settings': ['ADMIN'],
  // ยกเว้นการแจ้งเตือนรายคน — เฉพาะ ADMIN (proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์)
  '/hr/leave/notify-exempt': ['ADMIN'],
  // ปรับสายอนุมัติใบลาที่ยื่นแล้วให้ตรงผัง — แก้ประวัติการอนุมัติ เฉพาะ ADMIN (proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์)
  '/hr/leave/chain-resync': ['ADMIN'],
  // Dashboard วิเคราะห์การลา — ข้อมูลการลาทั้งองค์กรรายบุคคล (proxy.ts กั้น URL ตรง, backend requireRoles('ADMIN','HR'))
  '/hr/leave/dashboard': ['ADMIN', 'HR'],
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
  // Smart Hospital และแผนโครงการ IT — งานวางแผนภายในของ IT ยังไม่เปิดให้ผู้ใช้ทั่วไป
  // (proxy.ts กั้น URL ตรงไว้ด้วย ดู IT_ONLY_PREFIXES)
  '/information-technology/smart-hospital/dashboard': IT_STAFF_ROLES,
  '/information-technology/smart-hospital/edit': IT_STAFF_ROLES,
  '/information-technology/grant-charts': IT_STAFF_ROLES,
  // เคลียร์เซสชัน HIS — เตะผู้ใช้ HOSxP ออกได้ (proxy.ts และ backend /api/v1/his กั้นไว้ด้วย)
  '/information-technology/his-users-session': IT_STAFF_ROLES,
  // ตรวจสอบ/อนุมัติคำขอข้อมูลสถิติ (PDPA) — เฉพาะหัวหน้ากลุ่มงานข้อมูลทางการแพทย์
  '/medical-data/statistics-review': ['ADMIN', 'CHIEF_GROUP_MEDSTAT'],
  // ระบบรับบริจาคครุภัณฑ์ — แยกสิทธิ์ตามขั้นตอน (เจ้าหน้าที่รับบริจาค / กรรมการ / พัสดุ / ผู้ดูแลระบบ)
  '/general/assets/donation-request':      ['ADMIN', 'DONATION_STAFF'],
  '/general/assets/donation-review':       ['ADMIN', 'DONATION_COMMITTEE'],
  '/general/assets/donation-registration': ['ADMIN', 'DONATION_PROCUREMENT'],
  '/general/assets/donation-admin':        ['ADMIN'],
}

  // ตั้งค่าเบี้ยเลี้ยงบุคลากร (เดินทางไปราชการ) — proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์
  '/hss/hrd/official-travel/allowance': HRD_ALLOWANCE_ROLES,
  // ตั้งค่าการเดินทาง (ค่าน้ำมัน/กม. · เพดานราคารถโดยสาร/เครื่องบิน) — proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์การแก้ไข
  '/hss/hrd/official-travel/transport': HRD_ALLOWANCE_ROLES,
  // ตั้งค่าค่าเช่าที่พัก (เพดานตามระดับตำแหน่ง · จับคู่ระดับ · กำหนดรายบุคคล) — proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์
  '/hss/hrd/official-travel/lodging': HRD_ALLOWANCE_ROLES,
  // ตั้งค่าการลงนาม (ลงนามในระบบ / เดินเอกสาร รายกลุ่ม) — proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์
  '/hss/hrd/official-travel/signing': HRD_ALLOWANCE_ROLES,
  // งบประมาณและ Dashboard (เดินทางไปราชการ) — proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์
  '/hss/hrd/official-travel/budget': HRD_ALLOWANCE_ROLES,
// เมนูที่สิทธิ์ไม่ได้มาจาก role แต่มาจากการถูกแต่งตั้งเป็นหัวหน้าหน่วย (เช็คกับ backend)
// อนุมัติการลา — เฉพาะหัวหน้า/รักษาการ กลุ่มภารกิจ · กลุ่มงาน · หน่วยงาน (หรือ ผอ./ADMIN)
export const MENU_SUPERVISOR_ONLY = ['/hr/leave/approval']

// เมนูที่ ผอ. / รักษาการ ผอ. (hr_settings — ไม่ใช่ role) เห็นได้ด้วย นอกเหนือจาก role ใน MENU_ROLE_REQUIREMENTS
export const MENU_DIRECTOR_ALSO = ['/hr/leave/staff-history']

/** normalize roles จาก cookie user_data ให้เป็นตัวพิมพ์ใหญ่ */
export const normalizeRoles = (roles?: unknown): string[] =>
  Array.isArray(roles) ? roles.map(r => String(r).toUpperCase()) : []

// ── สวิตช์เปิด/ปิดโมดูล (ตาราง app_modules — ผู้ดูแลระบบคุมที่ /account/modules) ──
// รายการที่ปิดคือ route_prefix เช่น '/hr/leave' → ซ่อนทั้งสาขา

/** จับคู่แบบทั้งเซกเมนต์ — '/general/maintenance' ต้องไม่ไปโดน '/general/maintenance-request' */
export const underPrefix = (route: string, prefix: string) =>
  route === prefix || route.startsWith(`${prefix}/`)

/**
 * โมดูลของเส้นทางนี้เปิดใช้งานอยู่ไหม (disabled ว่าง = เปิดหมด)
 * รายการจาก backend: '/x' = ปิดทั้งสาขา · '=/x' = ปิดหน้านั้นหน้าเดียว
 * · '+/x' / '+=/x' = ข้อยกเว้นที่เปิดอยู่ใต้สาขาที่ปิด — กฎที่เจาะจงกว่าชนะ (ตรงหน้าเดียว > prefix ยาวกว่า)
 *   เช่น ['/hr/leave', '+=/hr/leave'] = เห็นเฉพาะหน้าแรกของระบบการลา
 */
export const isRouteEnabled = (route: string, disabledPrefixes: string[]): boolean => {
  const score = (p: string) => p.startsWith('=')
    ? (route === p.slice(1) ? Number.MAX_SAFE_INTEGER : -1)
    : (underPrefix(route, p) ? p.length : -1)
  let off = -1, on = -1
  for (const p of disabledPrefixes) {
    if (p.startsWith('+')) on = Math.max(on, score(p.slice(1)))
    else off = Math.max(off, score(p))
  }
  return off < 0 || on > off
}

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
  isDirector = false,
): boolean => {
  if (!isRouteEnabled(key, disabledPrefixes)) return false
  if (MENU_SUPERVISOR_ONLY.includes(key)) return isLeaveApprover === true
  if (isDirector && MENU_DIRECTOR_ALSO.includes(key)) return true
  const req = MENU_ROLE_REQUIREMENTS[key]
  return !req || req.some(r => userRoles.includes(r))
}
