'use client'
import DepreciationSummaryView from './DepreciationSummaryView'

// สรุปค่าเสื่อมราคาประจำปี — ทะเบียนครุภัณฑ์ระบบเดิม (EQUIPMENT_HOST)
export default function DepreciationSummaryPage() {
  return (
    <DepreciationSummaryView
      apiPath="/api/v1/equipment/depreciation-year"
      titleSuffix="(V3)"
      sourceLabel="ทะเบียนครุภัณฑ์ (ระบบเดิม V3)"
    />
  )
}
