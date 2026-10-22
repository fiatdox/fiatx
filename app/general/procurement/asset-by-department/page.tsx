'use client'
import AssetByDeptView from './AssetByDeptView'

// รายงานครุภัณฑ์แยกตามหน่วยงาน — ทะเบียนครุภัณฑ์ V3 (EQUIPMENT_HOST)
// แทนรายงาน deprecia_v3_dep ของระบบเดิม
export default function AssetByDepartmentPage() {
  return (
    <AssetByDeptView
      apiPath="/api/v1/equipment/by-department"
      version="V3"
      scopeNotes={[
        'เฉพาะครุภัณฑ์สถานะส่งซ่อม และอยู่ในหน่วยงาน (เงื่อนไขเดียวกับรายงานเดิม)',
        'ไม่รวมที่แจ้งชำรุด รอจำหน่าย หรือขายทอดตลาดแล้ว',
        'นับทุกหน่วยงาน ทุกหมวด ทุกปีงบ — รายงานเดิมตกหน่วยงานรหัส 212179–212190, หมวดกีฬา/สินทรัพย์ไม่มีตัวตน และปีงบ 2534',
      ]}
    />
  )
}
