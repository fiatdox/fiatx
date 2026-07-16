'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  ConfigProvider,
  App,
  theme,
  Table,
  Select,
  Tag,
  Card,
  Tooltip,
  Typography,
  Divider,
  Row,
  Col,
  Button,
  Spin,
  Empty,
} from 'antd'
import { FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaPrint, FaPlus, FaChartBar } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { StatCard, gBtn } from '@/app/components/StatCard'
import EChart from '@/app/components/EChart'

const { Title, Text } = Typography

interface RiskItem {
  key: string
  item_id: number
  category: string
  subItem: string
  probability: number | null
  impact: number | null
}

interface AssessmentHeader {
  assessment_id: number
  assessment_code: string
  assessment_year: number
  assessment_round: number
  department: string | null
  assessed_by: string | null
  status: string
}

const SCALE_OPTIONS = [
  { value: 1, label: '1 – ต่ำมาก' },
  { value: 2, label: '2 – ต่ำ' },
  { value: 3, label: '3 – ปานกลาง' },
  { value: 4, label: '4 – สูง' },
  { value: 5, label: '5 – สูงมาก' },
]

function getRiskScore(p: number | null, i: number | null): number | null {
  if (p === null || i === null) return null
  return p * i
}

function getRiskLevel(score: number | null): { label: string; color: string; bg: string } {
  if (score === null) return { label: 'ยังไม่ประเมิน', color: 'var(--app-text-3)', bg: 'var(--app-surface)' }
  if (score >= 17) return { label: 'สูงมาก – เร่งด่วน', color: '#ef4444', bg: '#450a0a' }
  if (score >= 9) return { label: 'สูง – ต้องจัดการ', color: '#f97316', bg: '#431407' }
  if (score >= 4) return { label: 'ปานกลาง', color: '#eab308', bg: '#422006' }
  return { label: 'ต่ำ – ยังไม่เร่งด่วน', color: '#22c55e', bg: '#052e16' }
}

function getMatrixColor(impact: number, probability: number): string {
  const score = impact * probability
  if (score >= 17) return '#7f1d1d'
  if (score >= 9) return '#7c2d12'
  if (score >= 4) return '#713f12'
  return '#14532d'
}

function getMatrixTextColor(impact: number, probability: number): string {
  const score = impact * probability
  if (score >= 17) return '#fca5a5'
  if (score >= 9) return '#fb923c'
  if (score >= 4) return '#fde047'
  return '#86efac'
}

const LEVEL_DATA = [
  { level: 1, label: 'ต่ำมาก',  pDesc: 'แทบไม่น่าจะเกิดขึ้น หรือ < 1 ครั้ง/ปี',      iDesc: 'ไม่มีผลกระทบต่อการให้บริการ หรือน้อยมาก', bg: '#14532d', color: '#22c55e' },
  { level: 2, label: 'ต่ำ',      pDesc: 'อาจเกิดขึ้นได้บ้าง อย่างน้อยเดือนละ 1 ครั้ง',   iDesc: 'มีผลกระทบต่อการให้บริการในบางจุด',         bg: '#365314', color: '#84cc16' },
  { level: 3, label: 'ปานกลาง', pDesc: 'มีจุดอ่อนพอควร เดือนละหลายครั้ง',            iDesc: 'มีผลกระทบต่อการให้บริการ 1-2 แผนก',        bg: '#713f12', color: '#eab308' },
  { level: 4, label: 'สูง',      pDesc: 'มีจุดอ่อนมาก เกิดบ่อย เดือนละหลายครั้ง',       iDesc: 'มีผลกระทบต่อการให้บริการ 3-4 แผนก',        bg: '#7c2d12', color: '#f97316' },
  { level: 5, label: 'สูงมาก',  pDesc: 'มีจุดอ่อนรอบด้าน พบทุกสัปดาห์',              iDesc: 'กระทบวงกว้าง อาจเกิดอันตรายต่อผู้ป่วย',     bg: '#7f1d1d', color: '#ef4444' },
] as const

interface ScaleBarChartProps {
  title: string
  items: RiskItem[]
  field: 'probability' | 'impact'
  descKey: 'pDesc' | 'iDesc'
}

function ScaleBarChart({ title, items, field, descKey }: ScaleBarChartProps) {
  const counts = LEVEL_DATA.map(lvl => items.filter(i => i[field] === lvl.level).length)
  const totalAssessed = counts.reduce((a, b) => a + b, 0)
  const avg = totalAssessed > 0
    ? (counts.reduce((sum, c, i) => sum + c * LEVEL_DATA[i].level, 0) / totalAssessed).toFixed(1)
    : '–'

  return (
    <Card
      title={<span style={{ color: 'var(--app-text)', fontSize: 13 }}>{title}</span>}
      style={{ background: 'var(--app-surface)', border: '1px solid #334155', height: '100%' }}
      styles={{ header: { background: 'var(--app-bg)', borderBottom: '1px solid #334155', padding: '8px 16px' }, body: { padding: '12px 14px' } }}
    >
      {[...LEVEL_DATA].reverse().map(lvl => {
        const count = items.filter(i => i[field] === lvl.level).length
        const widthPct = lvl.level * 20
        const active = count > 0

        return (
          <Tooltip key={lvl.level} title={lvl[descKey]} placement="left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'default' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 4,
                background: lvl.bg, color: lvl.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 11,
                border: `1px solid ${lvl.color}`, flexShrink: 0,
              }}>{lvl.level}</div>

              <div style={{
                flex: 1, height: 22, background: 'var(--app-bg)',
                borderRadius: 4, overflow: 'hidden', position: 'relative',
                border: '1px solid #1e293b',
              }}>
                <div style={{
                  width: `${widthPct}%`, height: '100%',
                  background: `linear-gradient(90deg, ${lvl.bg} 0%, ${lvl.color}55 100%)`,
                  borderRight: `2px solid ${lvl.color}`,
                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                  transition: 'width .3s ease',
                  boxShadow: active ? `0 0 12px ${lvl.color}40` : 'none',
                }}>
                  <span style={{ color: 'var(--app-text)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {lvl.label}
                  </span>
                </div>
              </div>

              <div style={{
                minWidth: 26, padding: '2px 6px',
                background: active ? lvl.bg : 'var(--app-surface)',
                border: `1px solid ${active ? lvl.color : 'var(--app-border-strong)'}`,
                color: active ? lvl.color : 'var(--app-text-3)',
                borderRadius: 4, fontSize: 11, fontWeight: 700, textAlign: 'center',
                transition: 'all .2s ease',
              }}>{count}</div>
            </div>
          </Tooltip>
        )
      })}

      {/* Footer: distribution + summary */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #334155' }}>
        <div style={{
          display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden',
          background: 'var(--app-bg)', marginBottom: 6,
        }}>
          {totalAssessed === 0 ? (
            <div style={{ flex: 1, background: 'var(--app-surface)' }} />
          ) : (
            LEVEL_DATA.map((lvl, i) => {
              const pct = (counts[i] / totalAssessed) * 100
              return pct > 0 ? (
                <Tooltip key={lvl.level} title={`ระดับ ${lvl.level} (${lvl.label}): ${counts[i]} รายการ (${pct.toFixed(0)}%)`}>
                  <div style={{ width: `${pct}%`, background: lvl.color, transition: 'width .3s ease' }} />
                </Tooltip>
              ) : null
            })
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--app-text-2)' }}>
          <span>ประเมินแล้ว <strong style={{ color: 'var(--app-text)' }}>{totalAssessed}</strong> รายการ</span>
          <span>เฉลี่ย: <strong style={{ color: 'var(--app-text)' }}>{avg}</strong></span>
        </div>
      </div>
    </Card>
  )
}

interface MasterItem {
  item_id: number
  category_id: number
  item_code: string
  item_name_th: string
  is_summary: boolean
  sort_order: number
}

interface DetailItem {
  detail_id: number
  item_id: number
  category_no?: number
  category_name_th?: string
  item_code: string
  item_name_th: string
  is_summary: boolean
  probability: number | null
  impact: number | null
}

const PageContent = () => {
  const { message } = App.useApp()
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  const [items, setItems] = useState<RiskItem[]>([])
  const [assessment, setAssessment] = useState<AssessmentHeader | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const listRes = await fetch('/api/v1/it/risk/assessments?limit=1')
      const listJson = await listRes.json()
      const latest = listJson?.data?.[0]

      if (latest) {
        const detailRes = await fetch(`/api/v1/it/risk/assessments/${latest.assessment_id}`)
        const detailJson = await detailRes.json()
        const header = detailJson?.data?.header as AssessmentHeader | undefined
        const detailItems = (detailJson?.data?.items ?? []) as DetailItem[]

        if (header) setAssessment(header)
        setItems(
          detailItems.map(it => ({
            key: it.item_code,
            item_id: it.item_id,
            category: it.category_name_th ?? '',
            subItem: it.item_name_th,
            probability: it.probability,
            impact: it.impact,
          })),
        )
      } else {
        // ยังไม่มีรอบประเมิน — โหลด master items มาแสดงแบบยังไม่ประเมิน
        const masterRes = await fetch('/api/v1/it/risk/master')
        const masterJson = await masterRes.json()
        const masterItems = (masterJson?.data?.items ?? []) as MasterItem[]
        setAssessment(null)
        setItems(
          masterItems.map(it => ({
            key: it.item_code,
            item_id: it.item_id,
            category: '',
            subItem: it.item_name_th,
            probability: null,
            impact: null,
          })),
        )
      }
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateAssessment = async () => {
    setCreating(true)
    try {
      const thaiYear = new Date().getFullYear() + 543
      const stamp = Date.now().toString().slice(-4)
      const res = await fetch('/api/v1/it/risk/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_code: `RISK-${thaiYear}-${stamp}`,
          assessment_year: thaiYear,
          assessment_round: 1,
          department: 'งานเทคโนโลยีสารสนเทศ',
          assessed_date: new Date().toISOString().slice(0, 10),
        }),
      })
      const json = await res.json()
      if (json?.success) {
        message.success('สร้างรอบประเมินใหม่สำเร็จ')
        await loadData()
      } else {
        message.error(json?.error?.message || 'สร้างไม่สำเร็จ')
      }
    } catch {
      message.error('สร้างรอบประเมินไม่สำเร็จ')
    } finally {
      setCreating(false)
    }
  }

  const updateItem = async (
    key: string,
    item_id: number,
    field: 'probability' | 'impact',
    value: number,
  ) => {
    setItems(prev => prev.map(it => (it.key === key ? { ...it, [field]: value } : it)))

    if (!assessment) {
      message.warning('กรุณาสร้างรอบประเมินก่อนบันทึกคะแนน')
      return
    }

    const current = items.find(it => it.key === key)
    const payload = {
      probability: field === 'probability' ? value : current?.probability ?? null,
      impact: field === 'impact' ? value : current?.impact ?? null,
    }

    try {
      const res = await fetch(
        `/api/v1/it/risk/assessments/${assessment.assessment_id}/items/${item_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) throw new Error()
    } catch {
      message.error('บันทึกไม่สำเร็จ')
    }
  }

  const assessed = useMemo(
    () => items.filter(i => i.probability !== null && i.impact !== null),
    [items],
  )
  const highRisk = useMemo(
    () => assessed.filter(i => (getRiskScore(i.probability, i.impact) ?? 0) >= 17),
    [assessed],
  )

  const matrixDots = useMemo(
    () =>
      assessed.map(i => ({
        key: i.key,
        label: i.subItem,
        p: i.probability!,
        impact: i.impact!,
        score: getRiskScore(i.probability, i.impact)!,
      })),
    [assessed],
  )

  const categoryChartOption = useMemo(() => {
    const CATEGORY_SHORT = [
      'Hardware', 'System SW', 'Apps', 'Connect', 'Op Error',
      'Data/Privacy', 'Future Dev', 'Vendor', 'Hacking',
      'Environment', 'Patient', 'Other',
    ]
    const TARGET = 30

    const pctByCategory: number[] = Array.from({ length: 12 }, (_, idx) => {
      const catNo = idx + 1
      const inCat = items.filter(it => {
        const itCat = parseInt(it.key.split('.')[0], 10)
        return itCat === catNo && it.probability !== null && it.impact !== null
      })
      if (inCat.length === 0) return 0
      const avgScore = inCat.reduce((s, it) => s + it.probability! * it.impact!, 0) / inCat.length
      return Math.round((avgScore / 25) * 100)
    })

    return {
      backgroundColor: 'transparent',
      grid: { left: 56, right: 70, top: 28, bottom: 56 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--app-bg)',
        borderColor: 'var(--app-border-strong)',
        textStyle: { color: 'var(--app-text)' },
        formatter: (params: { dataIndex: number; value: number }[]) => {
          const p = params[0]
          const catNo = p.dataIndex + 1
          const inCat = items.filter(it => {
            const itCat = parseInt(it.key.split('.')[0], 10)
            return itCat === catNo && it.probability !== null && it.impact !== null
          })
          return `<b>หมวด ${catNo}: ${CATEGORY_SHORT[p.dataIndex]}</b><br/>` +
                 `คะแนนเฉลี่ย: <b>${p.value}%</b> ของ 25<br/>` +
                 `ประเมินแล้ว: ${inCat.length} รายการ`
        },
      },
      xAxis: {
        type: 'category',
        data: CATEGORY_SHORT.map((s, i) => `ด้าน ${i + 1}\n${s}`),
        axisLine: { lineStyle: { color: 'var(--app-border-strong)' } },
        axisTick: { show: false },
        axisLabel: { color: 'var(--app-text-2)', fontSize: 11, interval: 0, lineHeight: 14 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: 'ร้อยละ',
        nameTextStyle: { color: 'var(--app-text-3)', fontSize: 10, padding: [0, 0, 6, -30] },
        axisLine: { show: false },
        axisLabel: { color: 'var(--app-text-2)', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'var(--app-surface)', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          barWidth: '46%',
          data: pctByCategory.map(v => {
            const base =
              v === 0 ? 'var(--app-border-strong)' :
              v <= 30 ? '#22c55e' :
              v <= 50 ? '#eab308' :
              v <= 70 ? '#f97316' :
              '#ef4444'
            return {
              value: v,
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: base },
                    { offset: 1, color: base + '55' },
                  ],
                },
                borderRadius: [6, 6, 0, 0],
                shadowColor: base,
                shadowBlur: v === 0 ? 0 : 10,
              },
            }
          }),
          label: {
            show: true,
            position: 'top',
            color: 'var(--app-text)',
            fontWeight: 'bold',
            fontSize: 12,
            formatter: '{c}%',
          },
          markLine: {
            symbol: ['none', 'none'],
            silent: true,
            lineStyle: { type: 'dashed', color: '#a78bfa', width: 2 },
            label: {
              color: '#a78bfa',
              fontWeight: 'bold',
              fontSize: 11,
              formatter: `เป้าหมาย ≤ ${TARGET}%`,
              position: 'insideEndTop',
            },
            data: [{ yAxis: TARGET }],
          },
        },
      ],
    }
  }, [items])

  const columns = [
    {
      title: 'รายการความเสี่ยง',
      dataIndex: 'subItem',
      key: 'subItem',
      width: '40%',
      render: (text: string, record: RiskItem) => (
        <Text
          style={{
            color: record.key.includes('.') ? 'var(--app-text)' : 'var(--app-text)',
            fontWeight: record.key.includes('.') ? 400 : 600,
          }}
        >
          {text}
        </Text>
      ),
    },
    {
      title: 'โอกาสเกิด (P)',
      dataIndex: 'probability',
      key: 'probability',
      width: '20%',
      render: (_: unknown, record: RiskItem) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          placeholder="เลือก 1-5"
          value={record.probability}
          options={SCALE_OPTIONS}
          onChange={v => updateItem(record.key, record.item_id, 'probability', v)}
        />
      ),
    },
    {
      title: 'ผลกระทบ (I)',
      dataIndex: 'impact',
      key: 'impact',
      width: '20%',
      render: (_: unknown, record: RiskItem) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          placeholder="เลือก 1-5"
          value={record.impact}
          options={SCALE_OPTIONS}
          onChange={v => updateItem(record.key, record.item_id, 'impact', v)}
        />
      ),
    },
    {
      title: 'คะแนน (P×I)',
      key: 'score',
      width: '20%',
      render: (_: unknown, record: RiskItem) => {
        const score = getRiskScore(record.probability, record.impact)
        const level = getRiskLevel(score)
        if (score === null) return <Text style={{ color: 'var(--app-text-3)' }}>–</Text>
        return (
          <Tag
            style={{
              background: level.bg,
              borderColor: level.color,
              color: level.color,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {score} – {level.label}
          </Tag>
        )
      },
    },
  ]

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <FaShieldAlt size={28} color="#7c3aed" />
          <Title level={3} style={{ color: 'var(--app-text)', margin: 0 }}>
            แบบประเมินความเสี่ยงระบบเทคโนโลยีสารสนเทศ
          </Title>
        </div>
        <Text style={{ color: 'var(--app-text-2)' }}>
          TMI Risk Analysis Worksheet — Hospital IT Risk Management (ISO/IEC 27001:2013)
        </Text>
        <Text style={{ color: 'var(--app-text-3)', display: 'block', marginTop: 2 }}>
          คะแนนความเสี่ยง = โอกาสเกิด (P) × ผลกระทบ (I) &nbsp;|&nbsp; ≥17 เร่งด่วน &nbsp;|&nbsp; 9–16 ต้องจัดการ &nbsp;|&nbsp; 4–8 ปานกลาง &nbsp;|&nbsp; 1–3 ต่ำ
        </Text>

        {/* Assessment info banner */}
        <div style={{
          marginTop: 12, padding: '10px 16px', background: 'var(--app-bg)',
          border: '1px solid #334155', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          {assessment ? (
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <Tag color="purple" style={{ fontSize: 13, padding: '2px 10px', margin: 0 }}>
                {assessment.assessment_code}
              </Tag>
              <Text style={{ color: 'var(--app-text)' }}>
                ปี {assessment.assessment_year} / รอบที่ {assessment.assessment_round}
              </Text>
              {assessment.department && (
                <Text style={{ color: 'var(--app-text-2)' }}>• {assessment.department}</Text>
              )}
              <Tag style={{ background: 'var(--app-surface)', borderColor: 'var(--app-text-3)', color: 'var(--app-text-2)' }}>
                สถานะ: {assessment.status}
              </Tag>
            </div>
          ) : (
            <Text style={{ color: '#fbbf24' }}>
              ⚠ ยังไม่มีรอบประเมิน — กรุณาสร้างรอบใหม่เพื่อเริ่มบันทึกคะแนน
            </Text>
          )}
          <Button
            icon={<FaPlus />}
            size="small"
            loading={creating}
            onClick={handleCreateAssessment}
            style={gBtn('#7c3aed', '#a855f7')}
            className="transition-all duration-200 hover:-translate-y-px hover:brightness-110"
          >
            สร้างรอบประเมินใหม่
          </Button>
        </div>

        <Divider style={{ borderColor: 'var(--app-border-strong)', margin: '16px 0' }} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" />
          </div>
        ) : items.length === 0 ? (
          <Empty description={<span style={{ color: 'var(--app-text-2)' }}>ไม่พบข้อมูล</span>} />
        ) : (
          <>
            {/* Risk Matrix + Scale Reference */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>

              {/* Risk Matrix — 2/4 cols */}
              <Col xs={24} md={12}>
                <Card
                  title={
                    <div className="flex items-center gap-2">
                      <FaExclamationTriangle color="#eab308" />
                      <span style={{ color: 'var(--app-text)' }}>แผนผังประเมินความเสี่ยง (Risk Matrix)</span>
                    </div>
                  }
                  style={{ background: 'var(--app-surface)', border: '1px solid #334155', height: '100%' }}
                  styles={{ header: { background: 'var(--app-bg)', borderBottom: '1px solid #334155' } }}
                >
                  <div style={{ overflowX: 'auto' }}>
                    <div>
                      <div style={{ display: 'flex', marginBottom: 2, marginLeft: 96 }}>
                        <div style={{ width: 18 }} />
                        {[1, 2, 3, 4, 5].map(p => (
                          <div key={p} style={{ width: 58, textAlign: 'center', color: 'var(--app-text-2)', fontSize: 11, fontWeight: 600 }}>
                            {p}
                            <div style={{ fontSize: 9, color: 'var(--app-text-3)' }}>
                              {['ต่ำมาก', 'ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก'][p - 1]}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'var(--app-text-2)', fontWeight: 600, fontSize: 11, textAlign: 'center', width: 14 }}>
                          ผลกระทบ (Impact)
                        </div>
                        <div>
                          {[5, 4, 3, 2, 1].map(imp => (
                            <div key={imp} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                              <div style={{ width: 80, textAlign: 'right', paddingRight: 6, color: 'var(--app-text-2)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                                {imp} {['ต่ำมาก', 'ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก'][imp - 1]}
                              </div>
                              {[1, 2, 3, 4, 5].map(prob => {
                                const score = imp * prob
                                const bg = getMatrixColor(imp, prob)
                                const textColor = getMatrixTextColor(imp, prob)
                                const dotsHere = matrixDots.filter(d => d.p === prob && d.impact === imp)
                                return (
                                  <Tooltip
                                    key={prob}
                                    title={dotsHere.length > 0 ? dotsHere.map(d => `${d.label} (${d.score})`).join('\n') : `คะแนน ${score}`}
                                  >
                                    <div style={{
                                      width: 58, height: 48, background: bg, border: '1px solid #334155',
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'default', position: 'relative', borderRadius: 3,
                                    }}>
                                      <span style={{ color: textColor, fontWeight: 700, fontSize: 13 }}>{score}</span>
                                      {dotsHere.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', position: 'absolute', bottom: 2 }}>
                                          {dotsHere.slice(0, 4).map((_d, idx) => (
                                            <div key={idx} style={{
                                              width: 8, height: 8, borderRadius: '50%', background: '#fff', opacity: 0.85,
                                              border: `1px solid ${textColor}`, fontSize: 6, color: '#000',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }} />
                                          ))}
                                          {dotsHere.length > 4 && <span style={{ color: textColor, fontSize: 8 }}>+{dotsHere.length - 4}</span>}
                                        </div>
                                      )}
                                    </div>
                                  </Tooltip>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', color: 'var(--app-text-2)', fontWeight: 600, fontSize: 11, marginTop: 6, marginLeft: 96 }}>
                        โอกาสเกิด (Probability)
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                      {[
                        { label: '17–25 สูงมาก – เร่งด่วน', bg: '#7f1d1d', color: '#fca5a5' },
                        { label: '9–16 สูง – ต้องจัดการ', bg: '#7c2d12', color: '#fb923c' },
                        { label: '4–8 ปานกลาง', bg: '#713f12', color: '#fde047' },
                        { label: '1–3 ต่ำ – ไม่เร่งด่วน', bg: '#14532d', color: '#86efac' },
                      ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 12, height: 12, background: l.bg, border: `1px solid ${l.color}`, borderRadius: 2, flexShrink: 0 }} />
                          <Text style={{ color: l.color, fontSize: 11 }}>{l.label}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>

              {/* Probability — 1/4 cols */}
              <Col xs={24} md={6}>
                <ScaleBarChart
                  title="เกณฑ์โอกาสเกิด (P)"
                  items={items}
                  field="probability"
                  descKey="pDesc"
                />
              </Col>

              {/* Impact — 1/4 cols */}
              <Col xs={24} md={6}>
                <ScaleBarChart
                  title="เกณฑ์ผลกระทบ (I)"
                  items={items}
                  field="impact"
                  descKey="iDesc"
                />
              </Col>
            </Row>

            {/* Summary Cards */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={12} sm={6}>
                <StatCard accent="slate" isDark={isDark} label="ทั้งหมด" suffix="รายการ" value={items.length} icon={<FaChartBar />} />
              </Col>
              <Col xs={12} sm={6}>
                <StatCard accent="violet" isDark={isDark} label="ประเมินแล้ว" suffix="รายการ" value={assessed.length} icon={<FaShieldAlt />} />
              </Col>
              <Col xs={12} sm={6}>
                <StatCard accent="rose" isDark={isDark} label="เสี่ยงสูง (≥17)" suffix="รายการ" value={highRisk.length} icon={<FaExclamationTriangle />} />
              </Col>
              <Col xs={12} sm={6}>
                <StatCard accent="emerald" isDark={isDark} label="ความเสี่ยงต่ำ (≤3)" suffix="รายการ"
                  value={assessed.filter(i => (getRiskScore(i.probability, i.impact) ?? 99) <= 3).length}
                  icon={<FaCheckCircle />} />
              </Col>
            </Row>

            {/* Risk Exposure by Category Chart */}
            <Card
              title={
                <div>
                  <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaChartBar />
                    คะแนนความเสี่ยงเฉลี่ยต่อหมวด (Risk Exposure %)
                  </div>
                  <div style={{ color: 'var(--app-text-2)', fontSize: 11, fontWeight: 400, marginTop: 2 }}>
                    คะแนนเฉลี่ย (P × I) ต่อหมวด เทียบสูงสุด 25 • เป้าหมาย ≤ 30%
                  </div>
                </div>
              }
              style={{ background: 'var(--app-surface)', border: '1px solid #334155', marginBottom: 24 }}
              styles={{ header: { background: 'var(--app-bg)', borderBottom: '1px solid #334155' }, body: { padding: '8px 8px 4px' } }}
            >
              <EChart option={categoryChartOption} height={320} showToolbar />
            </Card>

            {/* Assessment Table */}
            <Card
              title={<span style={{ color: 'var(--app-text)' }}>ตารางประเมินความเสี่ยง</span>}
              style={{ background: 'var(--app-surface)', border: '1px solid #334155', marginBottom: 32 }}
              styles={{ header: { background: 'var(--app-bg)', borderBottom: '1px solid #334155' } }}
              extra={
                <Button
                  icon={<FaPrint />}
                  size="small"
                  style={{ background: '#6B21A8', border: 'none', color: '#fff' }}
                  onClick={() => window.print()}
                >
                  พิมพ์
                </Button>
              }
            >
              <Table
                dataSource={items}
                columns={columns}
                rowKey="key"
                pagination={false}
                size="small"
                rowClassName={(record) =>
                  !record.key.includes('.') ? 'risk-category-row' : ''
                }
                style={{ background: 'transparent' }}
              />
            </Card>
          </>
        )}
      </div>

      <style jsx global>{`
        .risk-category-row td {
          background: #0f172a !important;
          border-top: 2px solid #6B21A8 !important;
        }
        .ant-table {
          background: transparent !important;
        }
        .ant-table-thead > tr > th {
          background: #0f172a !important;
          color: #94a3b8 !important;
          border-bottom: 1px solid #334155 !important;
        }
        .ant-table-tbody > tr > td {
          background: #1e293b !important;
          border-bottom: 1px solid #1e293b !important;
          color: #cbd5e1 !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #263148 !important;
        }
        .ant-select-selector {
          background: #0f172a !important;
          border-color: #475569 !important;
          color: #cbd5e1 !important;
        }
        .ant-select-arrow {
          color: #64748b !important;
        }
      `}</style>
    </div>
  )
}

export default function Page() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#6B21A8', borderRadius: 8 },
    }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
