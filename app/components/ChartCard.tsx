'use client'
// การ์ดกราฟที่สลับเป็นตารางได้ — ทุกกราฟต้องอ่านค่าได้โดยไม่ต้องชี้เมาส์ (แนวทาง dataviz)
// ใช้ร่วมกันใน HR Dashboard และ Dashboard บันทึกกิจกรรม IT
import React, { useState } from 'react'
import { Card, Segmented, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { EChartsCoreOption } from 'echarts'
import EChart, { type ChartTheme } from './EChart'

export type ChartTableRow = { key: string } & Record<string, React.ReactNode>

export default function ChartCard({ title, note, extra, option, height, theme, columns, rows, onChartClick }: {
  title: React.ReactNode
  note?: React.ReactNode
  /** ตัวควบคุมเพิ่มเติมข้างปุ่มสลับกราฟ/ตาราง */
  extra?: React.ReactNode
  option: EChartsCoreOption
  height: number
  theme: ChartTheme
  columns: ColumnsType<ChartTableRow>
  rows: ChartTableRow[]
  onChartClick?: (params: { name: string; dataIndex: number; seriesName?: string }) => void
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <Card
      title={title}
      style={{ borderRadius: 14, height: '100%' }}
      extra={(
        <div className="flex items-center gap-2">
          {extra}
          <Segmented
            size="small" value={view} onChange={v => setView(v as 'chart' | 'table')}
            options={[{ label: 'กราฟ', value: 'chart' }, { label: 'ตาราง', value: 'table' }]}
          />
        </div>
      )}
    >
      {note}
      {view === 'chart'
        ? <EChart option={option} height={height} theme={theme} showToolbar onClick={onChartClick} />
        : <Table<ChartTableRow> size="small" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 'max-content', y: height }} />}
    </Card>
  )
}
