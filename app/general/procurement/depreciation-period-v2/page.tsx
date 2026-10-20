'use client'
import DepreciationPeriodView from '../depreciation-period/PeriodView'

// สรุปค่าเสื่อมราคาตามงวด (รายเดือน / ถึงวันที่) — ทะเบียนครุภัณฑ์ V2 (EQUIPMENT_V2_HOST)
export default function DepreciationPeriodV2Page() {
  return (
    <DepreciationPeriodView
      apiPath="/api/v1/equipment-v2/depreciation-year"
      titleSuffix="(V2)"
      sourceLabel="ทะเบียนครุภัณฑ์ (V2)"
      exclusionNote="ไม่รวมของที่ถูกตัดออกจากระบบแล้ว (trans=Y) และของที่ไม่ต้องคิดค่าเสื่อม (iscode=2)"
    />
  )
}
