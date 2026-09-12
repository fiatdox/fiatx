'use client'
import DepreciationSummaryView from '../depreciation-summary/DepreciationSummaryView'

// สรุปค่าเสื่อมราคาประจำปี — ทะเบียนครุภัณฑ์ระบบใหม่ (EQUIPMENT_V2_HOST)
// ใช้ตรรกะและแบบฟอร์มชุดเดียวกับ V3 ต่างแค่ปลายทาง API
export default function DepreciationSummaryV2Page() {
  return (
    <DepreciationSummaryView
      apiPath="/api/v1/equipment-v2/depreciation-year"
      titleSuffix="(V2)"
      sourceLabel="ทะเบียนครุภัณฑ์ (ระบบใหม่ V2)"
    />
  )
}
