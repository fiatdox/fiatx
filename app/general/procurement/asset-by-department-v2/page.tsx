'use client'
import AssetByDeptView from '../asset-by-department/AssetByDeptView'

// รายงานครุภัณฑ์แยกตามหน่วยงาน — ทะเบียนครุภัณฑ์ V2 (EQUIPMENT_V2_HOST)
// แทนรายงาน deprecia_v2_dep ของระบบเดิม
export default function AssetByDepartmentV2Page() {
  return (
    <AssetByDeptView
      apiPath="/api/v1/equipment-v2/by-department"
      version="V2"
      scopeNotes={[
        'เฉพาะครุภัณฑ์ที่ยังถือครองอยู่: สถานะส่งซ่อม อยู่ในหน่วยงาน หรือกำลังดำเนินการ',
        'ไม่รวมที่ขายทอดตลาด โอนย้าย ย้ายไป V3 หรือถูกตัดออกจากระบบแล้ว',
        'ไม่รวมสถานีอนามัย 21 แห่งที่แยกออกไปแล้ว (รหัส 202102–202122)',
      ]}
    />
  )
}
