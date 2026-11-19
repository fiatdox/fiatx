'use client'
// รายงานผลการเดินทางไปราชการ — ผู้บริหารดูภาพรวม (ADMIN/HRD/ผอ. เห็นทั้งหมด · หัวหน้าในสายเห็นของคำขอในสาย · ผู้เดินทางเห็นของตน)
import React, { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Empty, Input, Segmented, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FileTextOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { TRAVEL_BASE, TRAVEL_COLOR, TravelShell, travelApi } from '../travelShared'
import { isNoClaim, requestDates, requestNo, thaiDateTime } from '../travelCalc'

const { Title, Text } = Typography

interface Row {
  id: number; request_id: number; memo_no: string | null; status: 'draft' | 'submitted'; submitted_at: string | null; updated_at: string; preview: string
  subject: string; purpose: string; location: string; start_at: string; end_at: string; cost_mode: string | null; trip_dates: string[] | null
  requester_name: string; requester_unit: string | null; traveler_count: number
}
interface Resp { rows: Row[]; total: number; sees_all: boolean }

const fyNow = () => { const d = new Date(); return d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0) }
const PAGE = 20

const ReportsContent = () => {
  const { message } = App.useApp()
  const [fy, setFy] = useState<number>(fyNow())
  const [status, setStatus] = useState<'submitted' | 'draft' | 'all'>('submitted')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ fiscal_year: String(fy), limit: String(PAGE), offset: String((page - 1) * PAGE) })
      if (status !== 'all') qs.set('status', status)
      if (search) qs.set('search', search)
      setData(await travelApi<Resp>(`reports?${qs}`))
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [fy, status, search, page, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  // ค้นหาหลังหยุดพิมพ์
  useEffect(() => { const t = setTimeout(() => { setSearch(q.trim()); setPage(1) }, 350); return () => clearTimeout(t) }, [q])

  const columns: ColumnsType<Row> = [
    {
      title: 'เรื่อง', key: 'subject', render: (_: unknown, r) => <>
        <Link href={`${TRAVEL_BASE}/report?id=${r.request_id}`} style={{ fontWeight: 600 }}>{r.subject}</Link>
        <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{r.purpose} · {r.location}</div>
        {r.preview && <div className="rep-preview">{r.preview}</div>}
      </>,
    },
    { title: 'ผู้รายงาน', key: 'who', width: 200, responsive: ['md'], render: (_: unknown, r) => <>{r.requester_name}<div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{r.requester_unit ?? ''}{r.traveler_count > 1 ? ` · ${r.traveler_count} คน` : ''}</div></> },
    { title: 'วันเดินทาง', key: 'd', width: 150, responsive: ['sm'], render: (_: unknown, r) => <>{requestDates(r)}{isNoClaim(r) && <div><Tag color="green" style={{ margin: 0, fontSize: 11 }}>ไม่เบิก</Tag></div>}</> },
    {
      title: 'สถานะ', key: 's', width: 150, render: (_: unknown, r) => <>
        <Tag color={r.status === 'submitted' ? 'green' : 'gold'} style={{ margin: 0 }}>{r.status === 'submitted' ? 'ส่งแล้ว' : 'ร่าง'}</Tag>
        <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{thaiDateTime(r.submitted_at ?? r.updated_at)}</div>
      </>,
    },
    { title: '', key: 'a', width: 90, align: 'right', render: (_: unknown, r) => <Link href={`${TRAVEL_BASE}/report?id=${r.request_id}`}><Button size="small" icon={<FileTextOutlined />} aria-label={`เปิดรายงาน ${requestNo(r.request_id)}`}>เปิด</Button></Link> },
  ]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileTextOutlined /></div>
        <div style={{ flex: '1 1 320px' }}>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>รายงานผลการเดินทางไปราชการ</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>{data?.sees_all ? 'รายงานของทุกกลุ่มงาน' : 'รายงานของท่าน และของคำขอที่ท่านเป็นหัวหน้าในสาย'} · ผู้เดินทางเขียนรายงานได้จากหน้ารายการคำขอ</Text>
        </div>
      </div>
      <Card size="small" style={{ borderRadius: 14 }}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Select value={fy} onChange={v => { setFy(v); setPage(1) }} style={{ width: 140 }} aria-label="ปีงบประมาณ"
            options={[0, 1, 2, 3].map(i => fyNow() - i).map(y => ({ value: y, label: `ปีงบ ${y}` }))} />
          <Segmented value={status} onChange={v => { setStatus(v as typeof status); setPage(1) }}
            options={[{ value: 'submitted', label: 'ส่งแล้ว' }, { value: 'draft', label: 'ร่าง' }, { value: 'all', label: 'ทั้งหมด' }]} />
          <Input allowClear prefix={<SearchOutlined />} placeholder="ค้นหาเรื่อง สถานที่ ชื่อ หรือเนื้อหา" value={q} onChange={e => setQ(e.target.value)} style={{ width: 300 }} aria-label="ค้นหารายงาน" />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>โหลดใหม่</Button>
        </Space>
        <Table<Row> size="small" rowKey="id" columns={columns} dataSource={data?.rows ?? []} loading={loading} scroll={{ x: 'max-content' }}
          pagination={{ current: page, pageSize: PAGE, total: data?.total ?? 0, onChange: setPage, showTotal: t => `${t.toLocaleString('th-TH')} รายงาน`, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีรายงานตามตัวกรอง" /> }} />
      </Card>
      <style jsx global>{`
        .rep-preview { font-size: 12.5px; color: var(--app-text-2); margin-top: 4px; max-width: 640px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line; }
      `}</style>
    </>
  )
}

export default function TravelReportsPage() {
  return <TravelShell current="รายงานผลการเดินทางไปราชการ"><ReportsContent /></TravelShell>
}
