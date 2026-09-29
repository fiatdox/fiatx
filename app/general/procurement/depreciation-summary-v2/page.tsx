'use client'
import DepreciationSummaryView from '../depreciation-summary/DepreciationSummaryView'

// สรุปค่าเสื่อมราคาประจำปี — ทะเบียนครุภัณฑ์ระบบใหม่ (EQUIPMENT_V2_HOST)
// ใช้ตรรกะและแบบฟอร์มชุดเดียวกับ V3 ต่างแค่ปลายทาง API และเงื่อนไข trans ที่ V3 ไม่มี
export default function DepreciationSummaryV2Page() {
  return (
    <DepreciationSummaryView
      apiPath="/api/v1/equipment-v2/depreciation-year"
      titleSuffix="(V2)"
      sourceLabel="ทะเบียนครุภัณฑ์ (V2)"
      // แท็บที่ 3 ของ V2 ใช้เป็นทะเบียนรวมของที่ถือครองอยู่ทั้งหมด
      // เอาของที่ยังคิดค่าเสื่อมอยู่มาด้วย พร้อมปีงบที่จะคิดครบ (เจ้าหน้าที่พัสดุขอ)
      // ฝั่ง API ของ V2 ตัดของที่ trans='Y' (ตัดออกจากระบบแล้ว) ออกให้แล้ว
      residualIncludesActive
      exclusionNote="ไม่รวมของที่ถูกตัดออกจากระบบแล้ว (trans=Y) และของที่ไม่ต้องคิดค่าเสื่อม (iscode=2)"
    />
  )
}
