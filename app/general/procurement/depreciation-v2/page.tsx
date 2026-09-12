'use client'
import DepreciationView from '../depreciation/DepreciationView'
import { classForAssetcatidV2 } from '../depreciation/assetClasses'

// ทะเบียนครุภัณฑ์ระบบใหม่ (EQUIPMENT_V2_HOST) — ใช้ตรรกะคำนวณชุดเดียวกับหน้าเดิม
// ต่างกันแค่ปลายทาง API และตารางจับคู่หมวด เพราะ assetcatid เป็นคนละชุดกัน
export default function DepreciationV2Page() {
  return (
    <DepreciationView
      apiPath="/api/v1/equipment-v2/search"
      resolveClass={classForAssetcatidV2}
      titleSuffix="(ระบบใหม่ V2)"
      sourceLabel="ทะเบียนครุภัณฑ์ (ระบบใหม่ V2)"
    />
  )
}
