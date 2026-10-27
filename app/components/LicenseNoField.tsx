'use client'
import { Alert, Form, Input } from 'antd'
import { SafetyCertificateOutlined } from '@ant-design/icons'

// กติกาเลขใบอนุญาตประกอบวิชาชีพ — จาก GET /api/v1/it/user-requests/license-rule
export interface LicenseRule {
  position_name: string | null
  license_type: string | null
  last_license_no: string | null
  license_system_ids: number[]
}

// ตรงกับ LICENSE_NO_RE ฝั่ง backend: 3–30 ตัว ต้องมีตัวเลข ใช้ได้เฉพาะตัวอักษรไทย/อังกฤษ ตัวเลข . - / และช่องว่าง
export const LICENSE_NO_RE = /^(?=.*\d)[0-9A-Za-z฀-๿.\-/ ]{3,30}$/

export async function fetchLicenseRule(userId?: number): Promise<LicenseRule | null> {
  try {
    const res = await fetch(`/api/v1/it/user-requests/license-rule${userId ? `?user_id=${userId}` : ''}`)
    const data = await res.json()
    return data?.success ? (data.data as LicenseRule) : null
  } catch {
    return null
  }
}

/** ระบบที่เลือกเป็น HIS และตำแหน่งต้องใช้ใบอนุญาต → ต้องกรอกเลข */
export const needsLicense = (rule: LicenseRule | null, systemId?: number) =>
  !!(rule?.license_type && systemId != null && rule.license_system_ids.includes(systemId))

/** ช่องเลขใบอนุญาต — แสดงเมื่อ needsLicense เป็นจริง (ฟอร์มต้องมี field ชื่อ license_no) */
export function LicenseNoField({ rule, systemName }: { rule: LicenseRule; systemName?: string }) {
  return (
    <>
      <Alert
        type="warning" showIcon className="mb-3"
        title={`ตำแหน่ง${rule.position_name ?? ''} ต้องใช้เลขที่ใบอนุญาตประกอบวิชาชีพ`}
        description={`ระบบ ${systemName ?? 'HIS'} ต้องผูกผู้ใช้กับใบอนุญาต (${rule.license_type}) ก่อนออกรหัส`}
      />
      <Form.Item
        name="license_no"
        label={`เลขที่ใบอนุญาตประกอบวิชาชีพ (${rule.license_type})`}
        normalize={(v: string) => v?.replace(/\s+/g, ' ')}
        rules={[
          { required: true, whitespace: true, message: 'กรุณากรอกเลขที่ใบอนุญาตประกอบวิชาชีพ' },
          { pattern: LICENSE_NO_RE, message: '3–30 ตัว ต้องมีตัวเลข ใช้ได้เฉพาะตัวอักษร ตัวเลข . - /' },
        ]}
        extra={rule.last_license_no ? 'เติมจากคำขอครั้งก่อน — ตรวจสอบให้ตรงกับใบอนุญาตปัจจุบัน' : undefined}
      >
        <Input prefix={<SafetyCertificateOutlined />} placeholder="เช่น ว.12345 / 4511234567 / ภ.12345" maxLength={30} />
      </Form.Item>
    </>
  )
}
