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

// ระดับความเสี่ยง 4 ขั้น — โทนมืด (เข้ม ทึบ) vs โทนสว่าง (พาสเทลสดใส ตัวหนังสือเข้ม อ่านง่ายบนพื้นขาว)
const RISK_LEVEL_PALETTE = {
  critical: { dark: { bg: '#450a0a', color: '#ef4444' }, light: { bg: '#fee2e2', color: '#b91c1c' } },
  high:     { dark: { bg: '#431407', color: '#f97316' }, light: { bg: '#ffedd5', color: '#c2410c' } },
  medium:   { dark: { bg: '#422006', color: '#eab308' }, light: { bg: '#fef9c3', color: '#a16207' } },
  low:      { dark: { bg: '#052e16', color: '#22c55e' }, light: { bg: '#dcfce7', color: '#15803d' } },
} as const

function getRiskLevel(score: number | null, isDark: boolean): { label: string; color: string; bg: string } {
  if (score === null) return { label: 'ยังไม่ประเมิน', color: 'var(--app-text-3)', bg: 'var(--app-surface)' }
  const mode = isDark ? 'dark' : 'light'
  if (score >= 17) return { label: 'สูงมาก – เร่งด่วน', ...RISK_LEVEL_PALETTE.critical[mode] }
  if (score >= 9) return { label: 'สูง – ต้องจัดการ', ...RISK_LEVEL_PALETTE.high[mode] }
  if (score >= 4) return { label: 'ปานกลาง', ...RISK_LEVEL_PALETTE.medium[mode] }
  return { label: 'ต่ำ – ยังไม่เร่งด่วน', ...RISK_LEVEL_PALETTE.low[mode] }
}

// สีในตาราง Risk Matrix (5×5) — โทนมืดเข้มทึบ vs โทนสว่างพาสเทล
const MATRIX_PALETTE = {
  critical: { dark: { bg: '#7f1d1d', text: '#fca5a5' }, light: { bg: '#fecaca', text: '#991b1b' } },
  high:     { dark: { bg: '#7c2d12', text: '#fb923c' }, light: { bg: '#fed7aa', text: '#9a3412' } },
  medium:   { dark: { bg: '#713f12', text: '#fde047' }, light: { bg: '#fef08a', text: '#854d0e' } },
  low:      { dark: { bg: '#14532d', text: '#86efac' }, light: { bg: '#bbf7d0', text: '#166534' } },
} as const

function getMatrixColor(impact: number, probability: number, isDark: boolean): string {
  const score = impact * probability
  const mode = isDark ? 'dark' : 'light'
  if (score >= 17) return MATRIX_PALETTE.critical[mode].bg
  if (score >= 9) return MATRIX_PALETTE.high[mode].bg
  if (score >= 4) return MATRIX_PALETTE.medium[mode].bg
  return MATRIX_PALETTE.low[mode].bg
}

function getMatrixTextColor(impact: number, probability: number, isDark: boolean): string {
  const score = impact * probability
  const mode = isDark ? 'dark' : 'light'
  if (score >= 17) return MATRIX_PALETTE.critical[mode].text
  if (score >= 9) return MATRIX_PALETTE.high[mode].text
  if (score >= 4) return MATRIX_PALETTE.medium[mode].text
  return MATRIX_PALETTE.low[mode].text
}

// เกณฑ์อ้างอิงระดับ P/I (แถบสเกล) — bg/color แยกตามโหมด
const LEVEL_DATA_BASE = [
  { level: 1, label: 'ต่ำมาก',  pDesc: 'แทบไม่น่าจะเกิดขึ้น หรือ < 1 ครั้ง/ปี',      iDesc: 'ไม่มีผลกระทบต่อการให้บริการ หรือน้อยมาก',
    dark: { bg: '#14532d', color: '#22c55e' }, light: { bg: '#dcfce7', color: '#15803d' } },
  { level: 2, label: 'ต่ำ',      pDesc: 'อาจเกิดขึ้นได้บ้าง อย่างน้อยเดือนละ 1 ครั้ง',   iDesc: 'มีผลกระทบต่อการให้บริการในบางจุด',
    dark: { bg: '#365314', color: '#84cc16' }, light: { bg: '#ecfccb', color: '#4d7c0f' } },
  { level: 3, label: 'ปานกลาง', pDesc: 'มีจุดอ่อนพอควร เดือนละหลายครั้ง',            iDesc: 'มีผลกระทบต่อการให้บริการ 1-2 แผนก',
    dark: { bg: '#713f12', color: '#eab308' }, light: { bg: '#fef9c3', color: '#a16207' } },
  { level: 4, label: 'สูง',      pDesc: 'มีจุดอ่อนมาก เกิดบ่อย เดือนละหลายครั้ง',       iDesc: 'มีผลกระทบต่อการให้บริการ 3-4 แผนก',
    dark: { bg: '#7c2d12', color: '#f97316' }, light: { bg: '#ffedd5', color: '#c2410c' } },
  { level: 5, label: 'สูงมาก',  pDesc: 'มีจุดอ่อนรอบด้าน พบทุกสัปดาห์',              iDesc: 'กระทบวงกว้าง อาจเกิดอันตรายต่อผู้ป่วย',
    dark: { bg: '#7f1d1d', color: '#ef4444' }, light: { bg: '#fee2e2', color: '#b91c1c' } },
] as const

function getLevelData(isDark: boolean) {
  const mode = isDark ? 'dark' : 'light'
  return LEVEL_DATA_BASE.map(l => ({ level: l.level, label: l.label, pDesc: l.pDesc, iDesc: l.iDesc, ...l[mode] }))
}

interface ScaleBarChartProps {
  title: string
  items: RiskItem[]
  field: 'probability' | 'impact'
  descKey: 'pDesc' | 'iDesc'
  isDark: boolean
}

function ScaleBarChart({ title, items, field, descKey, isDark }: ScaleBarChartProps) {
  const LEVEL_DATA = getLevelData(isDark)
  const counts = LEVEL_DATA.map(lvl => items.filter(i => i[field] === lvl.level).length)
  const totalAssessed = counts.reduce((a, b) => a + b, 0)
  const avg = totalAssessed > 0
    ? (counts.reduce((sum, c, i) => sum + c * LEVEL_DATA[i].level, 0) / totalAssessed).toFixed(1)
    : '–'

  return (
    <Card
      title={<span style={{ color: 'var(--app-text)', fontSize: 13 }}>{title}</span>}
      style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', height: '100%' }}
      styles={{ header: { background: 'var(--app-bg)', borderBottom: '1px solid var(--app-border-strong)', padding: '8px 16px' }, body: { padding: '12px 14px' } }}
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
                border: '1px solid var(--app-border-strong)',
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
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--app-border-strong)' }}>
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
    // ECharts วาดบน canvas — var(--app-*) ใช้ไม่ได้ ต้องเป็นค่าสีจริงตามโหมด
    const cAxis  = isDark ? '#e2e8f0' : '#334155'
    const cMuted = isDark ? '#64748b' : '#94a3b8'
    const cGrid  = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.22)'
    const cSplit = isDark ? 'rgba(148,163,184,0.10)' : 'rgba(100,116,139,0.14)'

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
        axisLine: { lineStyle: { color: cGrid } },
        axisTick: { show: false },
        axisLabel: { color: cMuted, fontSize: 11, interval: 0, lineHeight: 14 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: 'ร้อยละ',
        nameTextStyle: { color: cMuted, fontSize: 10, padding: [0, 0, 6, -30] },
        axisLine: { show: false },
        axisLabel: { color: cMuted, formatter: '{value}%' },
        splitLine: { lineStyle: { color: cSplit, type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          barWidth: '46%',
          data: pctByCategory.map(v => {
            const base =
              v === 0 ? '#64748b' :
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
            color: cAxis,
            fontWeight: 'bold',
            fontSize: 12,
            formatter: '{c}%',
          },
          markLine: {
            symbol: ['none', 'none'],
            silent: true,
            lineStyle: { type: 'dashed', color: '#7c3aed', width: 2 },
            label: {
              color: '#7c3aed',
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
  }, [items, isDark])

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
        const level = getRiskLevel(score, isDark)
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
          border: '1px solid var(--app-border-strong)', borderRadius: 8,
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
                  style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', height: '100%' }}
                  styles={{ header: { background: 'var(--app-bg)', borderBottom: '1px solid var(--app-border-strong)' } }}
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
                                const bg = getMatrixColor(imp, prob, isDark)
                                const textColor = getMatrixTextColor(imp, prob, isDark)
                                const dotsHere = matrixDots.filter(d => d.p === prob && d.impact === imp)
                                return (
                                  <Tooltip
                                    key={prob}
                                    title={dotsHere.length > 0 ? dotsHere.map(d => `${d.label} (${d.score})`).join('\n') : `คะแนน ${score}`}
                                  >
                                    <div style={{
                                      width: 58, height: 48, background: bg, border: '1px solid var(--app-border-strong)',
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
                        { label: '17–25 สูงมาก – เร่งด่วน', ...MATRIX_PALETTE.critical[isDark ? 'dark' : 'light'] },
                        { label: '9–16 สูง – ต้องจัดการ', ...MATRIX_PALETTE.high[isDark ? 'dark' : 'light'] },
                        { label: '4–8 ปานกลาง', ...MATRIX_PALETTE.medium[isDark ? 'dark' : 'light'] },
                        { label: '1–3 ต่ำ – ไม่เร่งด่วน', ...MATRIX_PALETTE.low[isDark ? 'dark' : 'light'] },
                      ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 12, height: 12, background: l.bg, border: `1px solid ${l.text}`, borderRadius: 2, flexShrink: 0 }} />
                          <Text style={{ color: l.text, fontSize: 11 }}>{l.label}</Text>
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
                  isDark={isDark}
                />
              </Col>

              {/* Impact — 1/4 cols */}
              <Col xs={24} md={6}>
                <ScaleBarChart
                  title="เกณฑ์ผลกระทบ (I)"
                  items={items}
                  field="impact"
                  descKey="iDesc"
                  isDark={isDark}
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
                  <div style={{ color: isDark ? '#a78bfa' : '#7c3aed', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaChartBar />
                    คะแนนความเสี่ยงเฉลี่ยต่อหมวด (Risk Exposure %)
                  </div>
                  <div style={{ color: 'var(--app-text-2)', fontSize: 11, fontWeight: 400, marginTop: 2 }}>
                    คะแนนเฉลี่ย (P × I) ต่อหมวด เทียบสูงสุด 25 • เป้าหมาย ≤ 30%
                  </div>
                </div>
              }
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', marginBottom: 24 }}
              styles={{ header: { background: 'var(--app-bg)', borderBottom: '1px solid var(--app-border-strong)' }, body: { padding: '8px 8px 4px' } }}
            >
              <EChart option={categoryChartOption} height={320} showToolbar />
            </Card>

            {/* Assessment Table */}
            <Card
              title={<span style={{ color: 'var(--app-text)' }}>ตารางประเมินความเสี่ยง</span>}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)', marginBottom: 32 }}
              styles={{ header: { background: 'var(--app-bg)', borderBottom: '1px solid var(--app-border-strong)' } }}
              extra={
                <Button
                  icon={<FaPrint />}
                  size="small"
                  style={gBtn('#7c3aed', '#a855f7')}
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
        /* แถวหมวดหมู่ (แถวสรุป ไม่มีจุด "." ใน key) — เน้นด้วยเส้นบนสีม่วง ปรับตามธีมผ่าน CSS var */
        .risk-category-row td {
          background: var(--app-bg) !important;
          border-top: 2px solid #7c3aed !important;
        }
        .ant-table {
          background: transparent !important;
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
