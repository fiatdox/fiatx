'use client'
import DepreciationPeriodView from './PeriodView'

// สรุปค่าเสื่อมราคาตามงวด (รายเดือน / ถึงวันที่) — ทะเบียนครุภัณฑ์ V3 (EQUIPMENT_HOST)
// ใช้สูตรชุดเดียวกับรายงานรายปี ต่างแค่คิดจากช่วงวันที่ที่ผู้ใช้ระบุ
export default function DepreciationPeriodPage() {
  return (
    <DepreciationPeriodView
      apiPath="/api/v1/equipment/depreciation-year"
      titleSuffix="(V3)"
      sourceLabel="ทะเบียนครุภัณฑ์ (V3)"
      exclusionNote="นับเฉพาะรายการที่ iscode เป็น 6, 1, 8 หรือ 4"
    />
  )
}
