'use client'
// หัวเพจงานทรัพยากรบุคคล + การ์ดข้อมูลการทำงานของผู้ login — ใช้ร่วมกันใน /hr/leave และ /hr/leave/calendar
import React, { useEffect, useState } from 'react'
import { Card, Typography, Tag, Avatar } from 'antd'
import { NotificationOutlined, UserOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface WorkProfile {
  name: string
  position: string
  staff_type: string | null
  mission: string | null
  major: string | null
  submajor: string | null
  hire_date: string | null
}

/** อายุงานนับจากวันที่เข้าทำงานถึงวันนี้ — "X ปี Y เดือน Z วัน" (ตัดหน่วยที่เป็น 0) */
const tenureText = (hire: string) => {
  const start = new Date(`${hire}T00:00:00`)
  const now = new Date()
  let y = now.getFullYear() - start.getFullYear()
  let m = now.getMonth() - start.getMonth()
  let d = now.getDate() - start.getDate()
  if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate() }
  if (m < 0) { y--; m += 12 }
  if (y < 0) return '-'
  const parts = [y && `${y} ปี`, m && `${m} เดือน`, d && `${d} วัน`].filter(Boolean)
  return parts.length ? parts.join(' ') : 'เริ่มงานวันนี้'
}

const fmtLongDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })

export default function LeaveHeader() {
  const [profile, setProfile] = useState<WorkProfile | null>(null)
  useEffect(() => {
    fetch('/api/v1/users/me/work-profile')
      .then(r => r.json())
      .then(j => { if (j?.success) setProfile(j.data) })
      .catch(() => { /* ไม่มีข้อมูลก็ไม่แสดงการ์ด */ })
  }, [])

  return (
    <>
      <Card style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)', border: 'none', borderRadius: 16, marginBottom: 24 }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
            <NotificationOutlined className="text-2xl text-white" />
          </div>
          <div>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>งานทรัพยากรบุคคล</Title>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
              ข่าวประชาสัมพันธ์ และเอกสารระเบียบการลา แบบฟอร์ม หนังสือเวียน
            </Text>
          </div>
        </div>
      </Card>

      {profile && (
        // จอกว้าง: ชื่อ-ตำแหน่งซ้าย ข้อมูลงาน 5 ช่องขวาในแถวเดียว · แท็บเล็ต 3 คอลัมน์ · มือถือ 2 คอลัมน์
        <Card style={{ borderRadius: 12, border: 'none', marginBottom: 16 }} styles={{ body: { padding: '14px 18px' } }}>
          <div className="flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-6">
            <div className="flex items-center gap-3 xl:w-[30%] shrink-0" style={{ minWidth: 0 }}>
              <Avatar size={44} icon={<UserOutlined />} style={{ backgroundColor: '#10b9811f', color: '#10b981', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ fontSize: 16 }}>{profile.name || '—'}</Text>
                <div className="flex flex-wrap items-center gap-x-2">
                  <Text type="secondary" style={{ fontSize: 13 }}>{profile.position || 'ไม่ระบุตำแหน่ง'}</Text>
                  {profile.staff_type && <Tag color="green" style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>{profile.staff_type}</Tag>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 flex-1 xl:pl-6 xl:border-l xl:border-app-border">
              {[
                { label: 'กลุ่มภารกิจ', value: profile.mission },
                { label: 'กลุ่มงาน', value: profile.major },
                { label: 'หน่วยงาน', value: profile.submajor },
                { label: 'วันที่เข้าทำงาน', value: profile.hire_date && fmtLongDate(profile.hire_date) },
                { label: 'อายุงาน', value: profile.hire_date && tenureText(profile.hire_date) },
              ].map(f => (
                <div key={f.label} style={{ minWidth: 0 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.4 }}>{f.label}</Text>
                  <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: f.value || undefined }}>{f.value || '—'}</Text>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </>
  )
}
