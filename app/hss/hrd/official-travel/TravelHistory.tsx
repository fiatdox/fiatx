'use client'
// ประวัติการไปราชการรายบุคคลในปีงบ — งาน HRD ใช้ประกอบการพิจารณาอนุญาตให้ไปราชการ
// นับเฉพาะคำขอที่ไม่ยกเลิก ทั้งที่เป็นผู้ขอและผู้ร่วมเดินทาง (คำขอที่ยกเลิกแสดงในรายการแต่ไม่นับ)
import React, { useEffect, useState } from 'react'
import { Card, Col, Drawer, Empty, Row, Select, Skeleton, Table, Tag, Typography } from 'antd'
import { travelApi } from './travelShared'
import { fmtMoney, requestNo, tripRange } from './travelCalc'

const { Text } = Typography

interface HistoryRow {
  id: number; subject: string; purpose: string; location: string; start_at: string; end_at: string; status: 'submitted' | 'rejected' | 'cancelled'
  requester_name: string; allowance_days: number; allowance: number; is_requester: boolean; total_amount: number; actual_amount: number | null; traveler_count: number
}
interface History {
  fiscal_year: number; person: { id: number; name: string; position: string | null; unit: string | null }
  summary: { trips: number; days: number; allowance: number; past: number; upcoming: number; cancelled: number; rejected?: number }
  rows: HistoryRow[]
}

const Tile = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
  <Card size="small" style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: '10px 12px' } }}>
    <div style={{ fontSize: 12, color: 'var(--app-text-2)' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>{value} {unit && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--app-text-3)' }}>{unit}</span>}</div>
  </Card>
)

/** ผู้เดินทางของคำขอหนึ่ง พร้อมจำนวนครั้งในปีงบ — กดชื่อเพื่อดูประวัติ (งาน HRD ใช้ตรวจก่อนอนุญาต) */
export const RequestTravelersDrawer = ({ requestId, onClose }: { requestId: number; onClose: () => void }) => {
  const [d, setD] = useState<{ id: number; subject: string; start_at: string; end_at: string; fiscal_year: number; travelers: { user_id: number; name: string; position: string | null; is_requester: boolean; prior_trips: number; fy_trips: number }[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [person, setPerson] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    travelApi<NonNullable<typeof d>>(`requests/${requestId}`).then(x => { if (alive) setD(x) }).catch(e => { if (alive) setError((e as Error).message) })
    return () => { alive = false }
  }, [requestId])
  return (
    <Drawer open onClose={onClose} size={640} title={`ตรวจประวัติผู้เดินทาง · ${requestNo(requestId)}`} rootClassName="travel-history-drawer">
      {error ? <Empty description={error} /> : !d ? <Skeleton active /> : <>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 500 }}>{d.subject}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{tripRange(d.start_at, d.end_at)} · ปีงบ {d.fiscal_year} · ไม่นับคำขอนี้</Text>
        </div>
        <Table size="small" rowKey="user_id" pagination={false} dataSource={d.travelers} scroll={{ x: 'max-content' }}
          columns={[
            { title: 'ผู้เดินทาง', dataIndex: 'name', render: (n: string, t) => <><a onClick={() => setPerson(t.user_id)}>{n}</a>{t.is_requester && <Tag style={{ marginLeft: 6 }}>ผู้ขอ</Tag>}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{t.position ?? ''}</div></> },
            { title: 'ไปแล้วก่อนครั้งนี้', dataIndex: 'prior_trips', width: 120, align: 'center', render: (v: number) => <b>{v}</b> },
            { title: 'ทั้งปีงบ (ไม่รวมครั้งนี้)', dataIndex: 'fy_trips', width: 150, align: 'center' },
            { title: '', width: 90, align: 'right', render: (_: unknown, t) => <a onClick={() => setPerson(t.user_id)}>ดูประวัติ</a> },
          ]} />
        {person && <TravelHistoryDrawer key={person} userId={person} fiscalYear={d.fiscal_year} onClose={() => setPerson(null)} />}
      </>}
    </Drawer>
  )
}

export const TravelHistoryDrawer =({ userId, fiscalYear, onClose }: { userId: number; fiscalYear: number; onClose: () => void }) => {
  const [fy, setFy] = useState(fiscalYear)
  const [h, setH] = useState<History | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    travelApi<History>(`requests/travel-history?user_id=${userId}&fiscal_year=${fy}`)
      .then(x => { if (alive) { setH(x); setError(null) } })
      .catch(e => { if (alive) setError((e as Error).message) })
    return () => { alive = false }
  }, [userId, fy])
  const [now] = useState(() => Date.now())
  return (
    <Drawer open onClose={onClose} size={760} title={h ? `ประวัติการไปราชการ · ${h.person.name}` : 'ประวัติการไปราชการ'}
      extra={<Select value={fy} onChange={x => { setFy(x); setH(null) }} style={{ width: 150 }} aria-label="ปีงบประมาณ"
        options={[fiscalYear + 1, fiscalYear, fiscalYear - 1, fiscalYear - 2].map(y => ({ value: y, label: `ปีงบ ${y}` }))} />}
      styles={{ body: { paddingTop: 12 } }} rootClassName="travel-history-drawer">
      {error ? <Empty description={error} /> : !h ? <Skeleton active /> : <>
        <Text type="secondary" style={{ display: 'block', marginBottom: 10 }}>{[h.person.position, h.person.unit].filter(Boolean).join(' · ') || '—'}</Text>
        <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
          <Col xs={12} sm={6}><Tile label={`ปีงบ ${h.fiscal_year} ไปราชการ`} value={h.summary.trips} unit="ครั้ง" /></Col>
          <Col xs={12} sm={6}><Tile label="จำนวนวัน (เบี้ยเลี้ยง)" value={h.summary.days} unit="วัน" /></Col>
          <Col xs={12} sm={6}><Tile label="เบี้ยเลี้ยงของคนนี้" value={fmtMoney(h.summary.allowance)} unit="บาท" /></Col>
          <Col xs={12} sm={6}><Tile label="ไปแล้ว / กำลังจะไป" value={`${h.summary.past} / ${h.summary.upcoming}`} unit="ครั้ง" /></Col>
        </Row>
        {(h.summary.cancelled > 0 || (h.summary.rejected ?? 0) > 0) && <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
          มีคำขอที่{[h.summary.cancelled > 0 && `ยกเลิก ${h.summary.cancelled}`, (h.summary.rejected ?? 0) > 0 && `ไม่อนุมัติ ${h.summary.rejected}`].filter(Boolean).join(' · ')} รายการ (แสดงในตาราง ไม่นับจำนวนครั้ง)
        </Text>}
        <Table<HistoryRow> size="small" rowKey="id" pagination={false} dataSource={h.rows} scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`ปีงบ ${h.fiscal_year} ยังไม่เคยไปราชการ`} /> }}
          rowClassName={r => r.status !== 'submitted' ? 'travel-row-cancelled' : ''}
          columns={[
            { title: 'วันที่', dataIndex: 'start_at', width: 120, render: (_: string, r) => <><div>{tripRange(r.start_at, r.end_at)}</div><Text type="secondary" style={{ fontSize: 11 }}>{requestNo(r.id)}</Text></> },
            { title: 'เรื่อง', dataIndex: 'subject', render: (v: string, r) => <><div>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.location}</Text></> },
            { title: 'บทบาท', dataIndex: 'is_requester', width: 110, render: (v: boolean, r) => v ? <Tag color="purple">ผู้ขอ</Tag> : <><Tag>ร่วมเดินทาง</Tag><div style={{ fontSize: 11, color: 'var(--app-text-3)' }}>{r.requester_name}</div></> },
            { title: 'วัน', dataIndex: 'allowance_days', width: 56, align: 'center' },
            {
              title: 'สถานะ', width: 120, align: 'center',
              render: (_: unknown, r) => r.status === 'cancelled' ? <Tag>ยกเลิก</Tag>
                : r.status === 'rejected' ? <Tag color="error">ไม่อนุมัติ</Tag>
                : new Date(r.end_at).getTime() >= now ? <Tag color="blue">กำลังจะไป</Tag>
                : r.actual_amount != null ? <Tag color="success">เบิกแล้ว</Tag> : <Tag color="gold">รอยืนยันยอด</Tag>,
            },
          ]} />
      </>}
      <style jsx global>{`
        .travel-row-cancelled td { color: var(--app-text-3) !important; text-decoration: line-through; }
        .travel-history-drawer .ant-drawer-content-wrapper { max-width: 100vw; }
      `}</style>
    </Drawer>
  )
}
