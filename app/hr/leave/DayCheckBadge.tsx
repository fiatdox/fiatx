'use client'
import { Tag, Tooltip } from 'antd'
import { SafetyCertificateOutlined, ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

// ผลการตรวจจำนวนวันของงานทรัพยากรบุคคล — ใช้ทั้งหน้าใบลาของผู้ลาและหน้าอนุมัติ
export interface DayCheckInfo {
  day_check_status?: 'VERIFIED' | 'ADJUSTED' | null
  day_check_note?: string | null
  day_checked_at?: string | null
  day_checked_by_name?: string | null
}

const stamp = (v: string) => {
  const d = dayjs(v)
  return `${d.format('DD/MM/')}${d.year() + 543} ${d.format('HH:mm')} น.`
}

/** ข้อความรายละเอียดการตรวจ (ผู้ตรวจ · วันที่บันทึก · หมายเหตุ) */
export const dayCheckDetail = (c: DayCheckInfo) => [
  c.day_checked_by_name && `ตรวจโดย ${c.day_checked_by_name}`,
  c.day_checked_at && `บันทึกเมื่อ ${stamp(c.day_checked_at)}`,
  c.day_check_note && `หมายเหตุ: ${c.day_check_note}`,
].filter(Boolean).join(' · ')

/** ป้ายสถานะการตรวจ — showPending = แสดง "รอ HR ตรวจ" เมื่อยังไม่ตรวจ */
const DayCheckBadge = ({ c, showPending = false }: { c: DayCheckInfo; showPending?: boolean }) => {
  if (!c.day_check_status) {
    return showPending
      ? <Tag icon={<ClockCircleOutlined />} style={{ marginInlineEnd: 0 }}>รอ HR ตรวจวันลา</Tag>
      : null
  }
  const adjusted = c.day_check_status === 'ADJUSTED'
  return (
    <Tooltip title={dayCheckDetail(c) || undefined}>
      <Tag color={adjusted ? 'processing' : 'success'} icon={<SafetyCertificateOutlined />} style={{ marginInlineEnd: 0 }}>
        {adjusted ? 'HR แก้จำนวนวันแล้ว' : 'HR ตรวจวันลาแล้ว'}
      </Tag>
    </Tooltip>
  )
}

export default DayCheckBadge
