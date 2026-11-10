'use client'
// เดินทางไปราชการ — บุคลากรขอไปราชการ งานพัฒนาทรัพยากรบุคคล (พรส) ดูแลผู้เดินทางและงบประมาณตามหมวดหมู่
import React, { useEffect, useState } from 'react'
import { Col, Row, Tag, Typography } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import { FaPlaneDeparture } from 'react-icons/fa'
import Link from 'next/link'
import { canSeeTravelItem, HRD_ROLES_ITEM, TRAVEL_BASE, TRAVEL_COLOR, TRAVEL_MENU, TravelShell, travelApi, useTravelRoles } from './travelShared'
import HrdTasks from './HrdTasks'

const { Title, Text } = Typography
const REQUESTS_HREF = `${TRAVEL_BASE}/requests`

export default function OfficialTravelPage() {
  const roles = useTravelRoles()
  const items = TRAVEL_MENU.filter(it => canSeeTravelItem(it, roles))
  // คำขอที่รอผู้ใช้อนุมัติ (หัวหน้ากลุ่มงาน/ภารกิจ) — ป้ายบนการ์ดรายการคำขอ กดแล้วไปแท็บรออนุมัติ
  const [pending, setPending] = useState(0)
  useEffect(() => {
    let alive = true
    travelApi<{ pending: number }>('requests/approvals/count').then(x => { if (alive) setPending(x.pending) }).catch(() => {})
    return () => { alive = false }
  }, [])
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
            {items.length === TRAVEL_MENU.length ? 'ขออนุมัติไปราชการ ติดตามคำขอ ตั้งค่าเบี้ยเลี้ยง ค่าพาหนะ และงบประมาณ' : 'ขออนุมัติไปราชการและติดตามคำขอ'}
          </Text>
        </div>
      </div>

      {/* งานที่ต้องดำเนินการ — ADMIN / HRD เท่านั้น */}
      {roles && canSeeTravelItem(HRD_ROLES_ITEM, roles) && <HrdTasks />}

      <Row gutter={[16, 16]}>
        {items.map((it, i) => (
          <Col xs={24} md={12} xl={items.length >= 5 ? 8 : Math.max(6, 24 / items.length)} key={it.href}>
            <Link href={it.href === REQUESTS_HREF && pending > 0 ? `${it.href}?tab=approve` : it.href} className="travel-menu-card" style={{
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
                {it.href === REQUESTS_HREF && pending > 0
                  ? <Tag color="red" style={{ margin: 0 }} data-testid="pending-badge">รออนุมัติ {pending}</Tag>
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
