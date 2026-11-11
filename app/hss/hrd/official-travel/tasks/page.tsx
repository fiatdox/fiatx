'use client'
// งานที่ต้องดำเนินการของงานพัฒนาทรัพยากรบุคคล — เฉพาะ ADMIN / HRD (proxy.ts กั้น URL ตรง, backend ตอบ 403 คนอื่น)
import React from 'react'
import { Typography } from 'antd'
import { canSeeTravelItem, TRAVEL_COLOR, TRAVEL_TASKS_ITEM, TravelShell, useTravelRoles } from '../travelShared'
import HrdTasks from '../HrdTasks'

const { Title, Text } = Typography

export default function TravelTasksPage() {
  // สิทธิ์อ่านจาก cookie ฝั่ง client — รอรู้สิทธิ์ก่อนค่อยแสดง (HrdTasks ไม่ render ฝั่ง server กัน hydration mismatch)
  const roles = useTravelRoles()
  return (
    <TravelShell current={TRAVEL_TASKS_ITEM.title}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{TRAVEL_TASKS_ITEM.icon}</div>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>{TRAVEL_TASKS_ITEM.title}</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>{TRAVEL_TASKS_ITEM.desc}</Text>
        </div>
      </div>
      {roles && canSeeTravelItem(TRAVEL_TASKS_ITEM, roles) && <HrdTasks />}
    </TravelShell>
  )
}
