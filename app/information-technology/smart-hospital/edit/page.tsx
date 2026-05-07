'use client'
import React, { useEffect, useState } from 'react'
import {
  Card, Typography, ConfigProvider, Breadcrumb, Row, Col, Tabs, Table,
  InputNumber, Button, Space, Tag, Progress, Divider, Popconfirm, theme, App
} from 'antd'
import {
  HomeOutlined, DesktopOutlined, SaveOutlined, RollbackOutlined,
  DashboardOutlined, ReloadOutlined
} from '@ant-design/icons'
import { FaHospitalAlt } from 'react-icons/fa'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import {
  defaultDimensions, dimensionTotals, loadDimensions, saveDimensions,
  type AssessItem, type Dimension
} from '../data'

const { Title, Text } = Typography

const statusColor = (pct: number) => {
  if (pct >= 80) return '#22c55e'
  if (pct >= 60) return '#84cc16'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

const PageContent = () => {
  const { message, modal } = App.useApp()
  const [dims, setDims] = useState<Dimension[]>(defaultDimensions)
  const [dirty, setDirty] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDims(loadDimensions())
    setHydrated(true)
  }, [])

  const updateItem = (dimKey: string, itemKey: string, patch: Partial<AssessItem>) => {
    setDims(prev => prev.map(d => d.key !== dimKey ? d : {
      ...d,
      items: d.items.map(it => it.key !== itemKey ? it : { ...it, ...patch })
    }))
    setDirty(true)
  }

  const handleSave = () => {
    saveDimensions(dims)
    setDirty(false)
    message.success('บันทึกคะแนนเรียบร้อยแล้ว — แสดงผลในหน้า Dashboard ได้ทันที')
  }

  const handleReset = () => {
    modal.confirm({
      title: 'ยืนยันการรีเซ็ตคะแนน',
      content: 'จะคืนค่าคะแนนทั้งหมดเป็นค่าเริ่มต้น ข้อมูลที่แก้ไขจะหายไป',
      okText: 'รีเซ็ต',
      okButtonProps: { danger: true },
      cancelText: 'ยกเลิก',
      onOk: () => {
        setDims(defaultDimensions)
        saveDimensions(defaultDimensions)
        setDirty(false)
        message.success('รีเซ็ตคะแนนเรียบร้อยแล้ว')
      }
    })
  }

  const handleReload = () => {
    setDims(loadDimensions())
    setDirty(false)
    message.info('โหลดข้อมูลล่าสุดที่บันทึกไว้แล้ว')
  }

  const renderTable = (d: Dimension) => {
    const columns = [
      {
        title: 'ลำดับ', dataIndex: 'no', width: 80,
        render: (v: string) => <Tag color={d.color} style={{ borderColor: d.color, color: '#fff', background: d.color + 'cc' }}>{v}</Tag>
      },
      {
        title: 'หัวข้อประเมิน', dataIndex: 'name',
        render: (v: string) => <Text style={{ color: '#e2e8f0' }}>{v}</Text>
      },
      {
        title: 'คะแนนเต็ม', dataIndex: 'maxScore', width: 130, align: 'center' as const,
        render: (v: number, r: AssessItem) => (
          <InputNumber
            min={0} max={9999} value={v}
            onChange={(val) => updateItem(d.key, r.key, { maxScore: Number(val) || 0 })}
            style={{ width: 100 }}
          />
        )
      },
      {
        title: 'คะแนนที่ได้', dataIndex: 'earnedScore', width: 130, align: 'center' as const,
        render: (v: number, r: AssessItem) => (
          <InputNumber
            min={0} max={r.maxScore} value={v} step={0.5}
            onChange={(val) => updateItem(d.key, r.key, { earnedScore: Number(val) || 0 })}
            style={{ width: 100 }}
            status={v > r.maxScore ? 'error' : undefined}
          />
        )
      },
      {
        title: 'คะแนนจำเป็น', dataIndex: 'requiredMax', width: 130, align: 'center' as const,
        render: (v: number, r: AssessItem) => (
          <InputNumber
            min={0} max={r.maxScore} value={v}
            onChange={(val) => updateItem(d.key, r.key, { requiredMax: Number(val) || 0 })}
            style={{ width: 100 }}
          />
        )
      },
      {
        title: 'จำเป็นที่ได้', dataIndex: 'requiredEarned', width: 130, align: 'center' as const,
        render: (v: number, r: AssessItem) => (
          <InputNumber
            min={0} max={r.requiredMax} value={v} step={0.5}
            onChange={(val) => updateItem(d.key, r.key, { requiredEarned: Number(val) || 0 })}
            style={{ width: 100 }}
            status={v > r.requiredMax ? 'error' : undefined}
          />
        )
      },
      {
        title: 'ความคืบหน้า', width: 220, align: 'center' as const,
        render: (_: unknown, r: AssessItem) => {
          const pct = r.maxScore > 0 ? Math.round((r.earnedScore / r.maxScore) * 100) : 0
          return (
            <div className="flex items-center gap-2">
              <Progress percent={pct} size="small" strokeColor={statusColor(pct)} style={{ flex: 1 }} />
              <Text strong style={{ color: statusColor(pct), minWidth: 40 }}>{pct}%</Text>
            </div>
          )
        }
      },
    ]
    return <Table dataSource={d.items} columns={columns} rowKey="key" pagination={false} size="small" bordered />
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-slate-200">
        <Navbar /><div className="p-6 md:p-8" />
      </div>
    )
  }

  const totals = dims.map(dimensionTotals)
  const grand = {
    max: totals.reduce((s, t) => s + t.max, 0),
    earned: totals.reduce((s, t) => s + t.earned, 0),
  }
  const grandPct = grand.max > 0 ? Math.round((grand.earned / grand.max) * 100) : 0

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/information-technology', title: <><DesktopOutlined /> งานคอมพิวเตอร์ฯ</> },
            { href: '/information-technology/smart-hospital/dashboard', title: 'Smart Hospital' },
            { title: 'แก้ไขคะแนนประเมิน' },
          ]}
          className="mb-6"
        />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl" style={{ color: '#a855f7' }}><FaHospitalAlt /></span>
            <div>
              <Title level={2} style={{ color: '#a855f7', margin: 0 }}>แก้ไขคะแนน Smart Hospital</Title>
              <Text type="secondary">สำหรับเจ้าหน้าที่ IT — ปรับปรุงคะแนนประเมินทั้ง 4 ด้าน</Text>
            </div>
          </div>
          <Space wrap>
            <Link href="/information-technology/smart-hospital/dashboard">
              <Button icon={<DashboardOutlined />}>ไปหน้า Dashboard</Button>
            </Link>
            <Button icon={<ReloadOutlined />} onClick={handleReload} disabled={!dirty}>ยกเลิกการแก้ไข</Button>
            <Popconfirm
              title="รีเซ็ตทั้งหมด?"
              description="คืนค่าเป็นข้อมูลตัวอย่างเริ่มต้น"
              okText="รีเซ็ต" cancelText="ยกเลิก" okButtonProps={{ danger: true }}
              onConfirm={handleReset}
            >
              <Button danger icon={<RollbackOutlined />}>รีเซ็ตค่าเริ่มต้น</Button>
            </Popconfirm>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!dirty}>
              บันทึก {dirty && <span style={{ marginLeft: 4 }}>•</span>}
            </Button>
          </Space>
        </div>

        {/* Summary banner */}
        <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={6}>
              <Text type="secondary">รวมคะแนนทุกด้าน</Text>
              <Title level={3} style={{ margin: '4px 0', color: statusColor(grandPct) }}>
                {grand.earned} / {grand.max}
              </Title>
              <Progress percent={grandPct} strokeColor={statusColor(grandPct)} />
            </Col>
            {dims.map((d, i) => {
              const t = totals[i]
              return (
                <Col xs={12} md={4} key={d.key}>
                  <Tag color={d.color} style={{ borderColor: d.color, color: '#fff', background: d.color + 'cc' }}>ด้าน {d.no}</Tag>
                  <div className="mt-1"><Text style={{ color: '#e2e8f0' }}>{d.short}</Text></div>
                  <Text strong style={{ color: statusColor(t.pct), fontSize: 20 }}>{t.pct}%</Text>
                  <div><Text type="secondary" className="text-xs">{t.earned}/{t.max}</Text></div>
                  <Progress percent={t.pct} size="small" strokeColor={d.color} showInfo={false} />
                </Col>
              )
            })}
          </Row>
          {dirty && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Text type="warning">⚠ มีการแก้ไขที่ยังไม่ได้บันทึก — กดปุ่ม &quot;บันทึก&quot; เพื่อแสดงผลในหน้า Dashboard</Text>
            </>
          )}
        </Card>

        <Card variant="borderless" style={{ borderRadius: 12 }}>
          <Tabs
            type="card"
            items={dims.map((d, i) => {
              const t = totals[i]
              return {
                key: d.key,
                label: (
                  <Space>
                    <Tag color={d.color} style={{ borderColor: d.color, color: '#fff', background: d.color + 'cc', margin: 0 }}>{d.no}</Tag>
                    <span>{d.short}</span>
                    <Tag color={statusColor(t.pct) === '#22c55e' ? 'success' : statusColor(t.pct) === '#ef4444' ? 'error' : 'warning'}>
                      {t.pct}%
                    </Tag>
                  </Space>
                ),
                children: (
                  <div>
                    <div className="mb-3">
                      <Title level={5} style={{ margin: 0, color: d.color }}>{d.no}. {d.name}</Title>
                      <Text type="secondary">
                        คะแนนรวม: <b style={{ color: statusColor(t.pct) }}>{t.earned} / {t.max}</b> ({t.pct}%) ·
                        คะแนนจำเป็น: <b>{t.reqEarned} / {t.reqMax}</b>
                      </Text>
                    </div>
                    {renderTable(d)}
                  </div>
                )
              }
            })}
          />
        </Card>
      </div>
    </div>
  )
}

export default function SmartHospitalEditPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6B21A8', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
