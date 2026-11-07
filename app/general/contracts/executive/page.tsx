'use client'
// หน้าจอผู้บริหาร: ดูวันหมดประกันของทุกสัญญา อ่านอย่างเดียว ไม่มียอดเงิน
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Card, Empty, Segmented, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { FaCalendarCheck } from 'react-icons/fa'
import dayjs from 'dayjs'
import { api, cardStyle, ContractPage, fmtDate, RETURN_STATUS, WORK_TYPES } from '../contractShared'

const { Text } = Typography

type View = 'active' | 'near' | 'ended' | 'unset' | 'closed'

/* eslint-disable @typescript-eslint/no-explicit-any */
const stateOf = (r: any): View => {
  if (r.status === 'returned') return 'closed'
  if (!r.warranty_end_date) return 'unset'
  if (r.due_state === 'overdue') return 'ended'
  return r.due_state === 'near' ? 'near' : 'active'
}

const StateTag = ({ row }: { row: any }) => {
  switch (stateOf(row)) {
    case 'closed': return <Tag color="default" icon={<CheckCircleOutlined />}>คืนหลักประกันแล้ว</Tag>
    case 'unset': return <Tag>ยังไม่ตั้งวันหมดประกัน</Tag>
    case 'ended': return <Tag color="error" icon={<ExclamationCircleOutlined />}>หมดประกันแล้ว</Tag>
    case 'near': return <Tag color="warning" icon={<ClockCircleOutlined />}>ใกล้หมดประกัน</Tag>
    default: return <Tag color="success" icon={<CheckCircleOutlined />}>อยู่ในประกัน</Tag>
  }
}

const daysLeft = (t: string) => dayjs(t).startOf('day').diff(dayjs().startOf('day'), 'day')

const ExecutiveContent = () => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View | 'all'>('all')

  const load = useCallback(async () => {
    try { setRows(await api('warranty-board')) }
    catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const count = (v: View) => rows.filter(r => stateOf(r) === v).length
  const shown = useMemo(() => view === 'all' ? rows : rows.filter(r => stateOf(r) === view), [rows, view])

  const columns: ColumnsType<any> = [
    { title: 'เลขที่สัญญา', dataIndex: 'contract_no', width: 150 },
    { title: 'โครงการ', dataIndex: 'project_name', render: (v: string, r: any) => <><div>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.vendor_name}{r.owner_major_name ? ` · ${r.owner_major_name}` : ''}</Text></> },
    { title: 'ประเภท', dataIndex: 'work_type', width: 90, render: (v: string) => WORK_TYPES[v] },
    { title: 'วันตรวจรับ', dataIndex: 'accepted_date', width: 110, render: fmtDate },
    {
      title: 'วันหมดประกัน', dataIndex: 'warranty_end_date', width: 180,
      render: (v: string | null, r: any) => {
        if (!v) return '—'
        const left = daysLeft(v)
        return <><Text strong>{fmtDate(v)}</Text>{r.status === 'active' && left >= 0 && <Text type="secondary" style={{ fontSize: 12 }}> (อีก {left.toLocaleString('th-TH')} วัน)</Text>}</>
      },
    },
    {
      title: 'สถานะ', width: 220,
      render: (_: unknown, r: any) => <><StateTag row={r} />{r.return_status && <Tag color={RETURN_STATUS[r.return_status]?.color}>{RETURN_STATUS[r.return_status]?.label}</Tag>}</>,
    },
  ]

  return (
    <Card style={cardStyle} styles={{ body: { padding: 12 } }}>
      <div className="mb-3" style={{ overflowX: 'auto' }}>
        <Segmented value={view} onChange={v => setView(v as View | 'all')} options={[
          { value: 'all', label: `ทั้งหมด (${rows.length})` },
          { value: 'near', label: `ใกล้หมดประกัน (${count('near')})` },
          { value: 'ended', label: `หมดประกันแล้ว (${count('ended')})` },
          { value: 'active', label: `อยู่ในประกัน (${count('active')})` },
          { value: 'unset', label: `ยังไม่ตั้ง (${count('unset')})` },
          { value: 'closed', label: `คืนแล้ว (${count('closed')})` },
        ]} />
      </div>
      <Table size="small" rowKey="id" loading={loading} columns={columns} dataSource={shown} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description="ไม่มีสัญญา" /> }} />
    </Card>
  )
}

export default function ExecutiveContractsPage() {
  return (
    <ContractPage screen="executive" title="ผู้บริหาร — วันหมดประกัน" icon={<FaCalendarCheck />} subtitle="วันหมดประกันที่เจ้าหน้าที่พัสดุตั้งไว้ ดูได้อย่างเดียว">
      {() => <ExecutiveContent />}
    </ContractPage>
  )
}
