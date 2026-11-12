'use client'
// ประวัติการไปราชการรายบุคคลในปีงบ — งาน HRD ใช้ประกอบการพิจารณาอนุญาตให้ไปราชการ
// นับเฉพาะคำขอที่ไม่ยกเลิก ทั้งที่เป็นผู้ขอและผู้ร่วมเดินทาง (คำขอที่ยกเลิกแสดงในรายการแต่ไม่นับ)
import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Descriptions, Drawer, Empty, Row, Select, Skeleton, Table, Tag, Typography } from 'antd'
import { FilePdfOutlined } from '@ant-design/icons'
import { ApprovalSteps, StatusBadge } from './TravelStatus'
import { travelApi } from './travelShared'
import { LODGING_MODES, requestBudgetType, MEMO, SIGN_MODE_LABEL, VEHICLE_MODES, fmtMoney, requestNo, thaiDateTime, tripRange, type TravelRequest, type TravelerRow } from './travelCalc'

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

/** ข้อมูลรายละเอียดการขออนุมัติ (งาน HRD) — ข้อมูลคำขอ ค่าใช้จ่าย ลำดับการลงนาม และผู้เดินทางพร้อมจำนวนครั้งในปีงบ (กดชื่อดูประวัติ) */
export const RequestTravelersDrawer = ({ requestId, onClose, onOpenPdf }: { requestId: number; onClose: () => void; onOpenPdf?: (id: number) => void }) => {
  const [d, setD] = useState<TravelRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [person, setPerson] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    travelApi<TravelRequest>(`requests/${requestId}`).then(x => { if (alive) setD(x) }).catch(e => { if (alive) setError((e as Error).message) })
    return () => { alive = false }
  }, [requestId])
  return (
    <Drawer open onClose={onClose} size={720} title={`ข้อมูลรายละเอียดการขออนุมัติ · ${requestNo(requestId)}`} rootClassName="travel-history-drawer"
      extra={d && onOpenPdf ? <Button size="small" icon={<FilePdfOutlined />} onClick={() => onOpenPdf(d.id)}>บันทึกข้อความ</Button> : null}>
      {error ? <Empty description={error} /> : !d ? <Skeleton active /> : <>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{d.subject}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{d.purpose}{d.memo_no ? ` · ที่ ${MEMO.docPrefix}${d.memo_no}` : ''}</Text>
          </div>
          <StatusBadge r={d} />
        </div>
        {d.status !== 'submitted' && (d.status === 'rejected' ? d.reject_reason : d.cancel_reason) && (
          <Alert type={d.status === 'rejected' ? 'error' : 'warning'} showIcon style={{ marginBottom: 12 }}
            title={`${d.status === 'rejected' ? 'เหตุผลที่ไม่อนุมัติ' : 'เหตุผลที่ยกเลิก'}: ${d.status === 'rejected' ? d.reject_reason : d.cancel_reason}`} />
        )}
        <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }} data-testid="request-detail" items={[
          { key: 'n', label: 'ผู้ขอ', span: 'filled', children: <>{d.requester_name}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{[d.requester_position, d.requester_unit].filter(Boolean).join(' · ')}</div></> },
          { key: 'l', label: 'สถานที่', span: 'filled', children: d.location },
          { key: 'st', label: 'ออกเดินทาง', children: thaiDateTime(d.start_at) },
          { key: 'en', label: 'กลับถึง', children: thaiDateTime(d.end_at) },
          { key: 'a', label: 'เบี้ยเลี้ยง', children: `${d.allowance_days} วัน${d.overnight ? ' · พักแรม' : ''}` },
          { key: 'lo', label: 'ที่พัก', children: d.lodging_mode === 'none' ? 'ไม่เบิก' : `${LODGING_MODES.find(x => x.value === d.lodging_mode)?.label ?? ''} · ${d.lodging_rooms} ห้อง ${d.lodging_nights} คืน` },
          { key: 'v', label: 'พาหนะ', span: 'filled', children: vehicleText(d) },
          { key: 'c', label: 'ค่าใช้จ่าย', span: 'filled', children: <>
            {costRows(d).map(([k, v]) => <div key={k} style={rowCss}><span>{k}</span><span>{fmtMoney(v)}</span></div>)}
            <div style={{ ...rowCss, fontWeight: 700, borderTop: '1px solid var(--app-border)', marginTop: 4, paddingTop: 4 }}><span>รวมประมาณการ</span><span>{fmtMoney(d.total_amount)} บาท</span></div>
            {d.actual_amount != null && <div style={{ ...rowCss, color: 'var(--app-text-2)' }}><span>เบิกจ่ายจริง (การเงินยืนยัน)</span><span>{fmtMoney(d.actual_amount)} บาท</span></div>}
          </> },
          { key: 'b', label: 'งบประมาณ', span: 'filled', children: `${requestBudgetType(d)} · ${d.budget_name}` },
          { key: 'cr', label: 'ยื่นเมื่อ', span: 'filled', children: `${thaiDateTime(d.created_at)} · ${SIGN_MODE_LABEL[d.sign_mode]}` },
        ]} />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>ลำดับการลงนาม</div>
        <ApprovalSteps r={d} />
        <div style={{ fontWeight: 600, margin: '8px 0 2px' }}>ผู้เดินทางและประวัติในปีงบ {d.fiscal_year}</div>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{tripRange(d.start_at, d.end_at)} · จำนวนครั้งไม่นับคำขอนี้ · กดชื่อเพื่อดูประวัติ</Text>
        <Table<TravelerRow> size="small" rowKey="user_id" pagination={false} dataSource={d.travelers ?? []} scroll={{ x: 'max-content' }}
          columns={[
            { title: 'ผู้เดินทาง', dataIndex: 'name', render: (n: string, t) => <><a onClick={() => setPerson(t.user_id)}>{n}</a>{t.is_requester && <Tag style={{ marginLeft: 6 }}>ผู้ขอ</Tag>}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{t.position ?? ''}</div></> },
            { title: 'ไปแล้วก่อนครั้งนี้', dataIndex: 'prior_trips', width: 120, align: 'center', render: (v: number) => <b>{v}</b> },
            { title: 'ทั้งปีงบ (ไม่รวมครั้งนี้)', dataIndex: 'fy_trips', width: 150, align: 'center' },
            { title: '', width: 90, align: 'right', render: (_: unknown, t) => <a onClick={() => setPerson(t.user_id)}>ดูประวัติ</a> },
          ]} />
        {person && d.fiscal_year ? <TravelHistoryDrawer key={person} userId={person} fiscalYear={d.fiscal_year} onClose={() => setPerson(null)} /> : null}
      </>}
    </Drawer>
  )
}

const rowCss: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12 }
const vehicleText = (r: TravelRequest) => {
  const m = VEHICLE_MODES.find(v => v.value === r.vehicle_mode)?.label ?? r.vehicle_mode
  const extra = r.vehicle_mode === 'bus' || r.vehicle_mode === 'plane' ? r.route_text : r.vehicle_mode === 'other' ? r.vehicle_other
    : [r.vehicle_name, r.vehicle_plate, r.distance_km ? `${r.distance_km} กม.` : null].filter(Boolean).join(' · ')
  return extra ? `${m} · ${extra}` : m
}
const costRows = (r: TravelRequest) => ([
  ['ค่าเบี้ยเลี้ยง', r.allowance_amount], ['ค่าเช่าที่พัก', r.lodging_amount], ['ค่าพาหนะ', r.transport_amount],
  ['แท็กซี่ขาไป (สถานี → ที่พัก)', r.taxi_go_amount ?? 0], ['แท็กซี่ขากลับ (ที่พัก → สถานี)', r.taxi_back_amount ?? 0], ['บ้าน ↔ สถานี ไป-กลับ', r.home_station_amount ?? 0],
  ['ค่าลงทะเบียน', r.registration_amount], ['ค่าน้ำมัน', r.fuel_amount], ['ค่าทางด่วน', r.toll_amount],
  [r.other_desc ? `อื่น ๆ (${r.other_desc})` : 'อื่น ๆ', r.other_amount],
] as [string, number][]).filter(([, v]) => Number(v) > 0)

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
