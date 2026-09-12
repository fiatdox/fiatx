'use client'
import React, { useState, useEffect, useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Alert, App,
  Button, Space, Table, Row, Col, Select, Statistic, Tabs, Modal, Spin, Tag, Tooltip, InputNumber, Input,
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, ReloadOutlined, PrinterOutlined, FilePdfOutlined, SearchOutlined,
} from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { FaChartPie } from 'react-icons/fa'
import Cookies from 'js-cookie'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { currentFyBE, money } from '../depreciation/calc'
import { summarizeByCategory, type AssetDetailRow, type Basis, type CategoryRow, type YearAsset } from './summary'
import type { AnnualDepreciationData } from '@/app/components/AnnualDepreciationPDF'

const { Title, Text } = Typography

// โหลด PDFViewer เฉพาะฝั่งเบราว์เซอร์ — @react-pdf/renderer ทำงานกับ SSR ไม่ได้
const AnnualDepreciationPDFViewer = dynamic(() => import('@/app/components/AnnualDepreciationPDF'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Spin size="large" />
      <Text type="secondary">กำลังสร้างรายงาน...</Text>
    </div>
  ),
})

const BASIS_LABEL: Record<Basis, string> = {
  daily: 'เกณฑ์รายวัน (ตามปีงบประมาณ)',
  gfmis: 'เกณฑ์นับเดือน (GFMIS)',
}

const int = (v: number) => v.toLocaleString('th-TH')

export interface DepreciationSummaryViewProps {
  /** endpoint ข้อมูลดิบ เช่น /api/v1/equipment/depreciation-year */
  apiPath: string
  /** ข้อความต่อท้ายหัวข้อ เช่น '(V3)' */
  titleSuffix: string
  /** ชื่อแหล่งข้อมูล แสดงใต้หัวข้อ */
  sourceLabel: string
}

const PageContent = ({ apiPath, titleSuffix, sourceLabel }: DepreciationSummaryViewProps) => {
  const { message } = App.useApp()

  const thisFy = currentFyBE()
  const [fy, setFy] = useState<number>(thisFy)
  const [residual, setResidual] = useState(1)
  const [assets, setAssets] = useState<YearAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [basis, setBasis] = useState<Basis>('daily')
  const [pdfOpen, setPdfOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // ตัวกรองของตารางรายตัว
  const [detailSearch, setDetailSearch] = useState('')
  const [detailCat, setDetailCat] = useState<string | null>(null)

  // ผู้พิมพ์ = คนที่กำลังใช้งานอยู่ (คุกกี้ user_data.name = pname+fname+lname)
  const preparedBy = useMemo(() => {
    try {
      const u = JSON.parse(Cookies.get('user_data') || '{}')
      return { name: (u?.name as string) ?? '', position: (u?.position_name as string) ?? '' }
    } catch { return { name: '', position: '' } }
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const json = await (await fetch(`${apiPath}?fy=${fy}`)).json()
        if (!alive) return
        if (json?.success && Array.isArray(json.data)) setAssets(json.data)
        else { setAssets([]); setLoadError(json?.message || 'ดึงข้อมูลไม่สำเร็จ') }
      } catch {
        if (alive) { setAssets([]); setLoadError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [fy, reloadKey, apiPath])

  // คำนวณทั้งสองเกณฑ์ไว้เลย สลับแท็บจะได้ไม่ต้องรอคำนวณใหม่
  const daily = useMemo(() => summarizeByCategory(assets, fy, 'daily', residual), [assets, fy, residual])
  const gfmis = useMemo(() => summarizeByCategory(assets, fy, 'gfmis', residual), [assets, fy, residual])
  const current = basis === 'gfmis' ? gfmis : daily

  const fyCE = fy - 543
  const periodLabel = `1 ต.ค. ${fy - 1} – 30 ก.ย. ${fy}`

  const reportData: AnnualDepreciationData | null = useMemo(() => {
    if (!current.rows.length) return null
    const fmt = (r: CategoryRow) => ({
      category: r.category,
      count: int(r.count),
      cost: money(r.cost),
      opening: money(r.opening),
      expense: money(r.expense),
      closing: money(r.closing),
      nbv: money(r.nbv),
    })
    return {
      orgName: 'โรงพยาบาลพะเยา',
      registryLabel: sourceLabel,
      fiscalYear: String(fy),
      periodLabel,
      basisLabel: BASIS_LABEL[basis],
      rows: current.rows.map(fmt),
      total: fmt(current.total),
      preparedBy: preparedBy.name,
      preparedByPosition: preparedBy.position,
    }
  }, [current, fy, basis, periodLabel, preparedBy, sourceLabel])

  // ปีงบให้เลือก: ย้อนหลัง 10 ปี ถึงล่วงหน้า 1 ปี
  const fyOptions = useMemo(() => {
    const out: { value: number; label: string }[] = []
    for (let y = thisFy + 1; y >= thisFy - 10; y--) {
      out.push({ value: y, label: `ปีงบประมาณ ${y}${y === thisFy ? ' (ปีปัจจุบัน)' : ''}` })
    }
    return out
  }, [thisFy])

  const columns = [
    {
      title: 'หมวดครุภัณฑ์', dataIndex: 'category', key: 'category',
      render: (v: string, r: CategoryRow) => (
        <Space size={6}>
          <span style={{ fontWeight: 600 }}>{v}</span>
          {r.assetcatid == null && <Tag color="warning">ไม่ระบุ</Tag>}
        </Space>
      ),
    },
    {
      title: 'จำนวน (รายการ)', dataIndex: 'count', key: 'count', width: 120, align: 'right' as const,
      sorter: (a: CategoryRow, b: CategoryRow) => a.count - b.count,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{int(v)}</span>,
    },
    {
      title: 'ราคาทุนรวม', dataIndex: 'cost', key: 'cost', width: 150, align: 'right' as const,
      sorter: (a: CategoryRow, b: CategoryRow) => a.cost - b.cost,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: 'สะสมยกมาต้นปี', dataIndex: 'opening', key: 'opening', width: 150, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: 'ค่าเสื่อมประจำปี', dataIndex: 'expense', key: 'expense', width: 150, align: 'right' as const,
      sorter: (a: CategoryRow, b: CategoryRow) => a.expense - b.expense,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>{money(v)}</span>,
    },
    {
      title: 'สะสมปลายปี', dataIndex: 'closing', key: 'closing', width: 150, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: 'มูลค่าสุทธิปลายปี', dataIndex: 'nbv', key: 'nbv', width: 150, align: 'right' as const,
      sorter: (a: CategoryRow, b: CategoryRow) => a.nbv - b.nbv,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(v)}</span>,
    },
  ]

  const detailColumns = [
    {
      title: 'เลขครุภัณฑ์', dataIndex: 'noid', key: 'noid', width: 150, fixed: 'left' as const,
      render: (v: string) => <code style={{ color: '#a78bfa' }}>{v}</code>,
    },
    { title: 'รายการ', dataIndex: 'names', key: 'names', width: 280, ellipsis: true },
    { title: 'หมวดครุภัณฑ์', dataIndex: 'category', key: 'category', width: 170, ellipsis: true },
    {
      title: 'วันที่รับ', dataIndex: 'receive', key: 'receive', width: 110,
      render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v || '-'}</span>,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.receive.localeCompare(b.receive),
    },
    {
      title: 'ราคาทุน', dataIndex: 'cost', key: 'cost', width: 130, align: 'right' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.cost - b.cost,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: 'สะสมยกมา', dataIndex: 'opening', key: 'opening', width: 130, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: `ค่าเสื่อมปีงบ ${fy}`, dataIndex: 'expense', key: 'expense', width: 140, align: 'right' as const,
      defaultSortOrder: 'descend' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.expense - b.expense,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>{money(v)}</span>,
    },
    {
      title: 'สะสมปลายปี', dataIndex: 'closing', key: 'closing', width: 140, align: 'right' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.closing - b.closing,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: (
        <Tooltip title={`ค่าเสื่อมที่ยังคิดได้อีก จนมูลค่าสุทธิเหลือ ${money(residual)} บาท`}>
          <span style={{ cursor: 'help' }}>คงเหลือจนถึง {money(residual)} บาท</span>
        </Tooltip>
      ),
      dataIndex: 'remaining', key: 'remaining', width: 170, align: 'right' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.remaining - b.remaining,
      render: (v: number) => v <= 0
        ? <Tag color="default">คิดครบแล้ว</Tag>
        : <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{money(v)}</span>,
    },
    {
      title: 'มูลค่าสุทธิปลายปี', dataIndex: 'nbv', key: 'nbv', width: 150, align: 'right' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.nbv - b.nbv,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(v)}</span>,
    },
  ]

  const detailTableFor = (key: Basis) => {
    const all = (key === 'gfmis' ? gfmis : daily).details
    const q = detailSearch.trim().toLowerCase()
    const rows = all.filter(r =>
      (!detailCat || r.category === detailCat) &&
      (!q || r.noid.toLowerCase().includes(q) || r.names.toLowerCase().includes(q)))

    const sum = (f: (r: AssetDetailRow) => number) => rows.reduce((t, r) => t + f(r), 0)

    return (
      <>
        <Space wrap size={12} className="mb-3">
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--app-text-2)' }} />}
            placeholder="ค้นหาเลขครุภัณฑ์ หรือชื่อรายการ..."
            value={detailSearch}
            onChange={e => setDetailSearch(e.target.value)}
            allowClear
            style={{ width: 320 }}
          />
          <Select
            placeholder="ทุกหมวดครุภัณฑ์"
            value={detailCat}
            onChange={v => setDetailCat(v ?? null)}
            allowClear
            style={{ width: 240 }}
            options={(key === 'gfmis' ? gfmis : daily).rows.map(c => ({
              value: c.category, label: `${c.category} (${int(c.count)})`,
            }))}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            แสดง {int(rows.length)} จาก {int(all.length)} รายการ · ค่าเสื่อมปีนี้รวม {money(sum(r => r.expense))} บาท
          </Text>
        </Space>

        <Table
          dataSource={rows}
          rowKey="key"
          size="small"
          loading={loading}
          columns={detailColumns}
          scroll={{ x: 1600 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100, 200],
            showTotal: (t, r) => `${r[0]}-${r[1]} จาก ${int(t)} รายการ`,
          }}
        />
      </>
    )
  }

  const tableFor = (key: Basis) => {
    const r = key === 'gfmis' ? gfmis : daily
    return (
      <>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic title="ครุภัณฑ์ที่ยังคิดค่าเสื่อม" value={r.total.count} suffix="รายการ" />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic title="ราคาทุนรวม" value={r.total.cost} precision={2} suffix="บาท" />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title={`ค่าเสื่อมประจำปี ${fy}`}
                value={r.total.expense}
                precision={2}
                suffix="บาท"
                styles={{ content: { color: '#f59e0b' } }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title="มูลค่าสุทธิปลายปี"
                value={r.total.nbv}
                precision={2}
                suffix="บาท"
                styles={{ content: { color: '#10b981' } }}
              />
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={r.rows}
          rowKey="key"
          size="small"
          loading={loading}
          pagination={false}
          scroll={{ x: 1050 }}
          columns={columns}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: 'rgba(255, 101, 0, 0.08)' }}>
                <Table.Summary.Cell index={0}><Text strong>รวมทั้งสิ้น</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{int(r.total.count)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{money(r.total.cost)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{money(r.total.opening)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{money(r.total.expense)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{money(r.total.closing)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(r.total.nbv)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        <div style={{
          borderTop: '1px solid var(--app-border)',
          margin: '24px 0 12px', paddingTop: 16,
          color: 'var(--app-text-3)', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          รายการครุภัณฑ์ที่นับเข้ารายงาน
        </div>
        {detailTableFor(key)}
      </>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 20px 48px' }}>
        <Breadcrumb className="mb-6" items={[
          { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
          { title: 'งานพัสดุ' },
          { title: `สรุปค่าเสื่อมราคาประจำปี ${titleSuffix}` },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <FaChartPie style={{ fontSize: 26, color: '#FF6500' }} />
          <Title level={3} style={{ margin: 0 }}>สรุปค่าเสื่อมราคาประจำปี {titleSuffix}</Title>
        </div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
          ค่าเสื่อมราคาประจำปีแยกตามหมวดครุภัณฑ์ · ข้อมูลจาก{sourceLabel}
        </Text>

        <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 14 } }}>
          <Space wrap size={16} align="center">
            <Space size={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>ปีงบประมาณ</Text>
              <Select value={fy} onChange={setFy} style={{ width: 210 }} options={fyOptions} />
            </Space>

            <span style={{ borderLeft: '1px solid var(--app-border)', height: 20 }} />

            <Space size={8}>
              <Tooltip title="มูลค่าที่คงไว้เมื่อคิดค่าเสื่อมครบอายุการใช้งาน ตามระเบียบพัสดุคือ 1 บาท">
                <Text type="secondary" style={{ fontSize: 12, cursor: 'help' }}>ราคาซาก (?)</Text>
              </Tooltip>
              <InputNumber
                size="small" min={0} value={residual}
                onChange={v => setResidual(Number(v ?? 0))}
                style={{ width: 90 }}
              />
            </Space>

            <span style={{ borderLeft: '1px solid var(--app-border)', height: 20 }} />

            <Text type="secondary" style={{ fontSize: 12 }}>
              ช่วงปีงบ {periodLabel} (ค.ศ. {fyCE - 1}/{fyCE})
            </Text>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => { setReloadKey(k => k + 1); message.info('กำลังโหลดข้อมูลใหม่') }}
              disabled={loading}
            >
              โหลดใหม่
            </Button>
          </Space>
        </Card>

        {loadError && (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="ดึงข้อมูลครุภัณฑ์ไม่สำเร็จ"
            description={loadError}
          />
        )}

        {!loading && !loadError && assets.length === 0 && (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            title={`ปีงบประมาณ ${fy} ไม่มีครุภัณฑ์ที่ยังคิดค่าเสื่อมราคา`}
          />
        )}

        {current.skipped > 0 && (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            title={`มี ${int(current.skipped)} รายการที่คิดค่าเสื่อมครบแล้วก่อนปีงบ ${fy} จึงไม่นับในรายงานนี้`}
            description="รายงานนับเฉพาะครุภัณฑ์ที่ยังมีค่าเสื่อมเกิดขึ้นจริงในปีงบที่เลือก"
          />
        )}

        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
          <Tabs
            activeKey={basis}
            onChange={k => setBasis(k as Basis)}
            tabBarExtraContent={
              <Tooltip title={reportData ? 'พิมพ์รายงานสรุปตามเกณฑ์ของแท็บนี้' : 'ยังไม่มีข้อมูลให้พิมพ์'}>
                <Button icon={<PrinterOutlined />} onClick={() => setPdfOpen(true)} disabled={!reportData}>
                  พิมพ์รายงาน
                </Button>
              </Tooltip>
            }
            items={[
              { key: 'daily', label: BASIS_LABEL.daily, children: tableFor('daily') },
              { key: 'gfmis', label: BASIS_LABEL.gfmis, children: tableFor('gfmis') },
            ]}
          />
        </Card>
      </div>

      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#FF6500' }} />
            <span>สรุปค่าเสื่อมราคาประจำปี {fy} {titleSuffix} · {BASIS_LABEL[basis]}</span>
          </Space>
        }
        open={pdfOpen}
        onCancel={() => setPdfOpen(false)}
        footer={null}
        width="92%"
        styles={{ body: { padding: '16px 0 0', display: 'flex', flexDirection: 'column', minHeight: 600 } }}
        destroyOnHidden
      >
        {reportData && <AnnualDepreciationPDFViewer data={reportData} />}
      </Modal>
    </div>
  )
}

export default function DepreciationSummaryView(props: DepreciationSummaryViewProps) {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <App>
        <PageContent {...props} />
      </App>
    </ConfigProvider>
  )
}
