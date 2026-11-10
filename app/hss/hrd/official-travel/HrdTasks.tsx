'use client'
// งานที่ต้องดำเนินการของ HRD (หน้าแรกเดินทางไปราชการ) — เห็นเฉพาะ ADMIN / HRD (backend ตอบ 403 คนอื่น)
// การ์ดละหนึ่งงาน: จำนวน + ตัวอย่าง 3 ใบ + ลิงก์ไปรายการคำขอที่กรองงานนั้นไว้ (?tab=all&task=)
import React, { useEffect, useState } from 'react'
import { Alert, Col, Row, Skeleton, Tag, Typography } from 'antd'
import { ArrowRightOutlined, CheckCircleFilled } from '@ant-design/icons'
import { FaClipboardCheck, FaCoins, FaExclamationTriangle, FaWallet } from 'react-icons/fa'
import Link from 'next/link'
import { HRD_TASKS, TRAVEL_BASE, travelApi, type HrdTaskKey } from './travelShared'
import { fmtMoney, requestNo, thaiDateShort } from './travelCalc'

const { Text } = Typography

interface TaskItem {
  id: number; requester_name: string; requester_unit: string | null; subject: string; location: string
  start_at: string; end_at: string; sign_mode: 'esign' | 'paper'; total_amount: number; waiting_for?: string | null
}
interface BudgetAlert { id: number; name: string; amount: number; spent: number; pending: number; remaining: number; projected: number; is_active: boolean }
interface Tasks {
  fiscal_year: number; soon_days: number
  director: { count: number; paper: number; items: TaskItem[] }
  actual: { count: number; returned: number; items: TaskItem[] }
  soon: { count: number; overdue: number; items: TaskItem[] }
  budgets: { count: number; no_active: boolean; alerts: BudgetAlert[] }
}

const ICON: Record<HrdTaskKey, React.ReactNode> = { director: <FaClipboardCheck />, actual: <FaWallet />, soon: <FaExclamationTriangle /> }
const BUDGET_COLOR = '#7c3aed'
const listHref = (k: HrdTaskKey) => `${TRAVEL_BASE}/requests?tab=all&task=${k}`

const Shell = ({ color, icon, title, count, unit, sub, href, cta, children, testId }: {
  color: string; icon: React.ReactNode; title: string; count: number; unit: string; sub?: React.ReactNode
  href: string; cta: string; children?: React.ReactNode; testId: string
}) => (
  <div data-testid={testId} className="hrd-task-card" style={{
    height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 14,
    background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderTop: `3px solid ${count ? color : 'var(--app-border)'}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}1a`, color }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--app-text)', lineHeight: 1.35 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span data-testid={`${testId}-count`} style={{ fontSize: 26, fontWeight: 800, color: count ? color : 'var(--app-text-3)', lineHeight: 1.1 }}>{count}</span>
          <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>{unit}</Text>
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--app-text-2)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
    <div style={{ flex: 1 }}>
      {count === 0
        ? <Text style={{ color: 'var(--app-text-3)', fontSize: 12 }}><CheckCircleFilled style={{ color: '#10b981', marginRight: 6 }} />ไม่มีงานค้าง</Text>
        : children}
    </div>
    <Link href={href} style={{ color, fontSize: 13, fontWeight: 500 }}>{cta} <ArrowRightOutlined /></Link>
  </div>
)

/** แถวตัวอย่างคำขอ — ลิงก์ไปรายการที่กรองงานนี้ไว้ (เรียงลำดับเดียวกัน คำขอนี้อยู่ต้นรายการ) */
const ItemRow = ({ it, note, task }: { it: TaskItem; note?: React.ReactNode; task: HrdTaskKey }) => (
  <Link href={listHref(task)} className="hrd-task-item" style={{ display: 'block', padding: '6px 8px', borderRadius: 8, color: 'inherit' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: 600 }} ellipsis>{it.requester_name}</Text>
      <Text style={{ fontSize: 11, color: 'var(--app-text-3)', whiteSpace: 'nowrap' }}>{requestNo(it.id)}</Text>
    </div>
    <div style={{ fontSize: 12, color: 'var(--app-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.subject} · {it.location}</div>
    <div style={{ fontSize: 11, color: 'var(--app-text-3)' }}>{note}</div>
  </Link>
)

export default function HrdTasks() {
  const [data, setData] = useState<Tasks | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(0)   // เวลาที่โหลด — ใช้แยก "กลับแล้ว / เลยวันเดินทาง" (render ต้องไม่เรียก Date.now())
  useEffect(() => {
    let alive = true
    travelApi<Tasks>('requests/hrd-tasks').then(d => { if (alive) { setData(d); setNow(Date.now()) } }).catch(e => { if (alive) setError((e as Error).message) })
    return () => { alive = false }
  }, [])

  const total = data ? data.director.count + data.actual.count + data.soon.count + data.budgets.alerts.length + (data.budgets.no_active ? 1 : 0) : 0

  return (
    <section data-testid="hrd-tasks" style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text strong style={{ fontSize: 16, color: 'var(--app-text)' }}>งานที่ต้องดำเนินการ</Text>
        {data && (total ? <Tag color="red" style={{ margin: 0 }}>{total} เรื่อง</Tag> : <Tag color="green" style={{ margin: 0 }}>ไม่มีงานค้าง</Tag>)}
        <Text style={{ color: 'var(--app-text-3)', fontSize: 12 }}>เฉพาะงานพัฒนาทรัพยากรบุคคล / ผู้ดูแลระบบ</Text>
      </div>
      {error && <Alert type="warning" showIcon title={error} />}
      {!data && !error && <Row gutter={[16, 16]}>{[0, 1, 2, 3].map(i => <Col key={i} xs={24} md={12} xl={6}><Skeleton active paragraph={{ rows: 3 }} /></Col>)}</Row>}
      {data && (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}>
            <Shell testId="task-director" color={HRD_TASKS.director.color} icon={ICON.director} title={HRD_TASKS.director.title} count={data.director.count} unit="คำขอ"
              sub={data.director.count ? `เดินเอกสาร ${data.director.paper} · ลงนามในระบบ ${data.director.count - data.director.paper}` : HRD_TASKS.director.hint}
              href={listHref('director')} cta="บันทึกผล">
              {data.director.items.slice(0, 3).map(it => <ItemRow key={it.id} it={it} task="director" note={<>ออกเดินทาง {thaiDateShort(it.start_at)}{it.sign_mode === 'paper' && <Tag color="gold" style={{ marginInlineStart: 6, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>เดินเอกสาร</Tag>}</>} />)}
            </Shell>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Shell testId="task-actual" color={HRD_TASKS.actual.color} icon={ICON.actual} title={HRD_TASKS.actual.title} count={data.actual.count} unit="คำขอ"
              sub={data.actual.count ? `เดินทางกลับแล้ว ${data.actual.returned} · ยังไม่เดินทาง ${data.actual.count - data.actual.returned}` : HRD_TASKS.actual.hint}
              href={listHref('actual')} cta="บันทึกยอด">
              {data.actual.items.slice(0, 3).map(it => <ItemRow key={it.id} it={it} task="actual"
                note={<>{Date.parse(it.end_at) < now ? `กลับเมื่อ ${thaiDateShort(it.end_at)}` : `กลับ ${thaiDateShort(it.end_at)}`} · ประมาณการ {fmtMoney(it.total_amount)} บาท</>} />)}
            </Shell>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Shell testId="task-soon" color={HRD_TASKS.soon.color} icon={ICON.soon} title={HRD_TASKS.soon.title} count={data.soon.count} unit="คำขอ"
              sub={data.soon.count ? `ภายใน ${data.soon_days} วัน${data.soon.overdue ? ` · เลยวันเดินทางแล้ว ${data.soon.overdue}` : ''}` : HRD_TASKS.soon.hint}
              href={listHref('soon')} cta="ติดตามสายอนุมัติ">
              {data.soon.items.slice(0, 3).map(it => <ItemRow key={it.id} it={it} task="soon"
                note={<><span style={{ color: Date.parse(it.start_at) < now ? '#dc2626' : undefined }}>ออกเดินทาง {thaiDateShort(it.start_at)}</span>{it.waiting_for ? ` · รอ ${it.waiting_for}` : ''}</>} />)}
            </Shell>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Shell testId="task-budget" color={BUDGET_COLOR} icon={<FaCoins />} title={`งบประมาณปีงบ ${data.fiscal_year} ที่ต้องดู`}
              count={data.budgets.alerts.length + (data.budgets.no_active ? 1 : 0)} unit="เรื่อง"
              sub={`งบในปีงบนี้ ${data.budgets.count} รายการ`} href={`${TRAVEL_BASE}/budget`} cta="ไปหน้างบประมาณ">
              {data.budgets.no_active && (
                <Alert type="error" showIcon style={{ padding: '6px 10px', marginBottom: 6 }}
                  title={<span style={{ fontSize: 12 }}>ยังไม่มีงบที่เปิดใช้ในปีงบนี้ — บุคลากรเลือกงบตอนยื่นคำขอไม่ได้</span>} />
              )}
              {data.budgets.alerts.slice(0, 3).map(b => (
                <div key={b.id} style={{ padding: '6px 8px', fontSize: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: 600 }} ellipsis>{b.name}</Text>
                  <div style={{ color: '#dc2626', fontSize: 11 }}>
                    {b.remaining < 0 ? `เบิกจริงเกินวงเงิน ${fmtMoney(-b.remaining)} บาท` : `ถ้าเบิกตามประมาณการจะเกิน ${fmtMoney(-b.projected)} บาท`}
                  </div>
                  <div style={{ color: 'var(--app-text-3)', fontSize: 11 }}>วงเงิน {fmtMoney(b.amount)} · ยืนยันแล้ว {fmtMoney(b.spent)} · รอยืนยัน {fmtMoney(b.pending)}</div>
                </div>
              ))}
            </Shell>
          </Col>
        </Row>
      )}
      <style jsx global>{`
        .hrd-task-item:hover { background: var(--app-bg); }
      `}</style>
    </section>
  )
}
