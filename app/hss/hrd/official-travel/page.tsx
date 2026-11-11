'use client'
// เดินทางไปราชการ — บุคลากรขอไปราชการ งานพัฒนาทรัพยากรบุคคล (พรส) ดูแลผู้เดินทางและงบประมาณตามหมวดหมู่
import React, { useEffect, useState } from 'react'
import { Badge, Card, Col, Row, Tooltip, Typography } from 'antd'
import { RightOutlined, ToolOutlined } from '@ant-design/icons'
import { FaPlaneDeparture } from 'react-icons/fa'
import Link from 'next/link'
import { canSeeTravelItem, HRD_ROLES_ITEM, TRAVEL_APPROVAL_ITEM, TRAVEL_COLOR, TRAVEL_MENU, TRAVEL_TASKS_ITEM, TravelShell, travelApi, useTravelRoles, type TravelMenuItem } from './travelShared'

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
  const tools = items.filter(it => it.roles && it !== TRAVEL_TASKS_ITEM)
  // ตัวเลข/ข้อความเน้นบนการ์ด (อนุมัติ = รอพิจารณา · งานที่ต้องดำเนินการ = งานค้าง)
  const cardInfo = (it: TravelMenuItem): { desc: string; badge?: number; badgeColor?: string; highlight?: string; testid?: string } => {
    if (it === TRAVEL_APPROVAL_ITEM && approver) {
      return pending > 0
        ? { desc: `รอพิจารณา ${pending} รายการ`, badge: pending, badgeColor: '#f59e0b', highlight: '#d97706', testid: 'pending-badge' }
        : { desc: 'ไม่มีคำขอรอพิจารณา' }
    }
    if (it === TRAVEL_TASKS_ITEM && tasks != null) {
      return tasks > 0
        ? { desc: `ค้าง ${tasks} เรื่อง — กดเพื่อดำเนินการ`, badge: tasks, badgeColor: '#ef4444', highlight: '#dc2626', testid: 'tasks-badge' }
        : { desc: 'ไม่มีงานค้าง', testid: 'tasks-badge' }
    }
    return { desc: it.short ?? it.desc }
  }
  const renderCards = (list: TravelMenuItem[]) => (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {list.map(it => {
        const c = it.color ?? TRAVEL_COLOR
        const info = cardInfo(it)
        return (
          <Col key={it.href} xs={24} sm={12} lg={8} xl={6}>
            <Link href={it.href} style={{ display: 'block', height: '100%' }}>
              <Card hoverable style={{ borderRadius: 12, border: 'none', height: '100%' }} styles={{ body: { padding: 16 } }}>
                <Tooltip title={it.desc} placement="bottom" mouseEnterDelay={0.6}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 44, height: 44, flexShrink: 0, fontSize: 20, borderRadius: 12, color: c, backgroundColor: `${c}1f`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {it.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <Text strong style={{ fontSize: 15 }}>{it.title}</Text>
                      <div data-testid={info.testid}>
                        {info.highlight
                          ? <Text strong style={{ fontSize: 12, color: info.highlight }}>{info.desc}</Text>
                          : <Text type="secondary" style={{ fontSize: 12 }}>{info.desc}</Text>}
                      </div>
                    </div>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!!info.badge && <Badge count={info.badge} overflowCount={999} color={info.badgeColor} />}
                      <RightOutlined style={{ color: 'var(--app-text-3)' }} />
                    </span>
                  </div>
                </Tooltip>
              </Card>
            </Link>
          </Col>
        )
      })}
    </Row>
  )
  return (
    <TravelShell fluid>
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

      {renderCards(items.filter(it => !it.roles || it === TRAVEL_TASKS_ITEM))}

      {tools.length > 0 && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, margin: '8px 0 12px' }}>
            <Text strong style={{ fontSize: 15 }}><ToolOutlined style={{ color: TRAVEL_COLOR }} /> ตั้งค่างานพัฒนาทรัพยากรบุคคล</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>แสดงตามสิทธิ์ของท่าน ({(roles ?? []).filter(r => HRD_ROLES_ITEM.roles!.includes(r)).join(' / ')})</Text>
          </div>
          {renderCards(tools)}
        </>
      )}
    </TravelShell>
  )
}
