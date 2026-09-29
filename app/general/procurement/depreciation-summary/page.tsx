'use client'
import DepreciationSummaryView from './DepreciationSummaryView'

// สรุปค่าเสื่อมราคาประจำปี — ทะเบียนครุภัณฑ์ V3 (EQUIPMENT_HOST)
//
// V3 เป็นฐานใหม่ที่แยกเฉพาะครุภัณฑ์ออกมาจาก V2 โครงสร้างตารางจึงไม่เหมือนกัน
// ไม่มีคอลัมน์ trans (ตัดออกจากระบบ) ฝั่ง API จึงกรองด้วย iscode IN (6,1,8,4) แทน
export default function DepreciationSummaryPage() {
  return (
    <DepreciationSummaryView
      apiPath="/api/v1/equipment/depreciation-year"
      titleSuffix="(V3)"
      sourceLabel="ทะเบียนครุภัณฑ์ (V3)"
      residualIncludesActive
      exclusionNote="นับเฉพาะรายการที่ iscode เป็น 6, 1, 8 หรือ 4"
    />
  )
}
