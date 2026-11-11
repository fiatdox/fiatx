'use client'
// เดินทางไปราชการ — บุคลากรขอไปราชการ งานพัฒนาทรัพยากรบุคคล (พรส) ดูแลผู้เดินทางและงบประมาณตามหมวดหมู่
import React, { useEffect, useState } from 'react'
import { Col, Row, Tag, Typography } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import { FaPlaneDeparture } from 'react-icons/fa'
import Link from 'next/link'
import { canSeeTravelItem, HRD_ROLES_ITEM, TRAVEL_APPROVAL_ITEM, TRAVEL_COLOR, TRAVEL_MENU, TRAVEL_TASKS_ITEM, TravelShell, travelApi, useTravelRoles } from './travelShared'

const { Title, Text } = Typography

export default function OfficialTravelPage() {
  const roles = useTravelRoles()
  // คำขอที่รอผู้ใช้อนุมัติ + เป็นผู้อนุมัติไหม (หัวหน้ากลุ่มงาน/ภารกิจ) — การ์ดอนุมัติเห็นเฉพาะผู้อนุมัติ
  const [approver, setApprover] = useState<{ pending: number; is_approver: boolean } | null>(null)
  useEffect(() => {
    let alive = true
    travelApi<{ pending: number; is_approver?: boolean }>('requests/approvals/count')
      .then(x => { if (alive) setApprover({ pending: x.pending, is_approver: !!x.is_approver || x.pending > 0 }) }).catch(() => {})
    return () => { alive = false }
  }, [])
  const pending = approver?.pending ?? 0
  // งานที่ต้องดำเนินการ (ADMIN / HRD) และอนุมัติการเดินทาง (ผู้อนุมัติ) ขึ้นก่อน
  const visible = TRAVEL_MENU.filter(it => canSeeTravelItem(it, roles) && (!it.approver || !!approver?.is_approver))
  const first = [TRAVEL_TASKS_ITEM, TRAVEL_APPROVAL_ITEM]
  const items = [...first.filter(it => visible.includes(it)), ...visible.filter(it => !first.includes(it))]
  const isManager = !!roles && canSeeTravelItem(HRD_ROLES_ITEM, roles)
  // จำนวนงานค้างของ HRD — ป้ายบนการ์ดงานที่ต้องดำเนินการ (null = ยังไม่โหลด/โหลดไม่ได้)
  const [tasks, setTasks] = useState<number | null>(null)
  useEffect(() => {
    if (!isManager) return
    let alive = true
    travelApi<{ director: { count: number }; actual: { count: number }; soon: { count: number }; budgets: { alerts: unknown[]; no_active: boolean } }>('requests/hrd-tasks')
      .then(d => { if (alive) setTasks(d.director.count + d.actual.count + d.soon.count + d.budgets.alerts.length + (d.budgets.no_active ? 1 : 0)) }).catch(() => {})
    return () => { alive = false }
  }, [isManager])
  return (
    <TravelShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0, fontSize: 24,
          background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FaPlaneDeparture />
        </div>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>เดินทางไปราชการ</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>
            {isManager ? 'ขออนุมัติไปราชการ ติดตามคำขอ ตั้งค่าเบี้ยเลี้ยง ค่าพาหนะ และงบประมาณ' : 'ขออนุมัติไปราชการและติดตามคำขอ'}
          </Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {items.map((it, i) => (
          <Col xs={24} md={12} xl={items.length >= 5 ? 8 : Math.max(6, 24 / items.length)} key={it.href}>
            <Link href={it.href} className="travel-menu-card" style={{
              display: 'flex', flexDirection: 'column', gap: 12, height: '100%',
              padding: '20px 20px 18px', borderRadius: 16,
              border: '1px solid var(--app-border)', background: 'var(--app-surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, fontSize: 20,
                  background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {it.icon}
                </div>
                {it === TRAVEL_APPROVAL_ITEM && pending > 0
                  ? <Tag color="red" style={{ margin: 0 }} data-testid="pending-badge">รอพิจารณา {pending}</Tag>
                  : it === TRAVEL_TASKS_ITEM && tasks != null
                    ? <Tag color={tasks ? 'red' : 'green'} style={{ margin: 0 }} data-testid="tasks-badge">{tasks ? `ค้าง ${tasks} เรื่อง` : 'ไม่มีงานค้าง'}</Tag>
                    : <Text style={{ color: 'var(--app-text-3)', fontSize: 12 }}>{i + 1}</Text>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--app-text)', marginBottom: 4 }}>{it.title}</div>
                <div style={{ fontSize: 13, color: 'var(--app-text-2)', lineHeight: 1.5 }}>{it.desc}</div>
              </div>
              <div style={{ color: TRAVEL_COLOR, fontSize: 13, fontWeight: 500 }}>
                เข้าใช้งาน <ArrowRightOutlined className="travel-menu-arrow" />
              </div>
            </Link>
          </Col>
        ))}
      </Row>

      <style jsx global>{`
        .travel-menu-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
        .travel-menu-card:hover {
          transform: translateY(-3px);
          border-color: ${TRAVEL_COLOR} !important;
          box-shadow: 0 10px 26px -10px color-mix(in srgb, ${TRAVEL_COLOR} 55%, transparent);
        }
        .travel-menu-arrow { transition: transform 0.18s ease; }
        .travel-menu-card:hover .travel-menu-arrow { transform: translateX(3px); }
      `}</style>
    </TravelShell>
  )
}
