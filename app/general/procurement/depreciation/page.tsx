'use client'
import DepreciationView from './DepreciationView'
import { classForAssetcatid } from './assetClasses'

// ทะเบียนครุภัณฑ์ระบบเดิม (EQUIPMENT_HOST)
export default function DepreciationPage() {
  return (
    <DepreciationView
      apiPath="/api/v1/equipment/search"
      resolveClass={classForAssetcatid}
      titleSuffix="(V3)"
      sourceLabel="ทะเบียนครุภัณฑ์ (ระบบเดิม V3)"
    />
  )
}
