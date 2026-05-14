'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Card, Typography, ConfigProvider, Breadcrumb, Row, Col, Tag,
  Statistic, Progress, Divider, Space, Button, theme, Empty
} from 'antd'
import {
  HomeOutlined, DesktopOutlined, EditOutlined, ReloadOutlined,
  TrophyOutlined, CheckCircleOutlined, WarningOutlined
} from '@ant-design/icons'
import { FaHospitalAlt } from 'react-icons/fa'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import EChart from '../../../components/EChart'
import { defaultDimensions, dimensionTotals, loadDimensions, type Dimension } from '../data'

const { Title, Text } = Typography

const statusColor = (pct: number) => {
  if (pct >= 80) return '#22c55e'
  if (pct >= 60) return '#84cc16'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

const statusTag = (pct: number) => {
  if (pct >= 80) return { label: 'ดีเยี่ยม', color: 'success' as const }
  if (pct >= 60) return { label: 'ดี', color: 'processing' as const }
  if (pct >= 40) return { label: 'พอใช้', color: 'warning' as const }
  return { label: 'ต้องปรับปรุง', color: 'error' as const }
}

const PageContent = () => {
  const [dims, setDims] = useState<Dimension[]>(defaultDimensions)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDims(loadDimensions())
    setHydrated(true)
  }, [])

  const totals = useMemo(() => dims.map(dimensionTotals), [dims])

  const overall = useMemo(() => {
    const max = totals.reduce((s, t) => s + t.max, 0)
    const earned = totals.reduce((s, t) => s + t.earned, 0)
    const reqMax = totals.reduce((s, t) => s + t.reqMax, 0)
    const reqEarned = totals.reduce((s, t) => s + t.reqEarned, 0)
    return {
      max, earned, reqMax, reqEarned,
      pct: max > 0 ? Math.round((earned / max) * 100) : 0,
      reqPct: reqMax > 0 ? Math.round((reqEarned / reqMax) * 100) : 0,
    }
  }, [totals])

  const itemCount = dims.reduce((s, d) => s + d.items.length, 0)
  const goodCount = dims.flatMap(d => d.items).filter(i => i.maxScore > 0 && (i.earnedScore / i.maxScore) >= 0.8).length
  const riskCount = dims.flatMap(d => d.items).filter(i => i.maxScore > 0 && (i.earnedScore / i.maxScore) < 0.4).length

  const gaugeOption = useMemo(() => ({
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 100,
      progress: { show: true, width: 18, roundCap: true, itemStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [{ offset: 0, color: '#6B21A8' }, { offset: 1, color: '#a855f7' }] } } },
      pointer: { show: false },
      axisLine: { lineStyle: { width: 18, color: [[1, '#1e293b']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      anchor: { show: false },
      title: { show: true, offsetCenter: [0, '70%'], fontSize: 13, color: '#94a3b8' },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, '0%'],
        fontSize: 42,
        fontWeight: 700,
        color: '#e2e8f0',
        formatter: (v: number) => `${Math.round(v)}%`
      },
      data: [{ value: overall.pct, name: `${overall.earned} / ${overall.max} คะแนน` }]
    }]
  }), [overall])

  const dimBarOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' },
      formatter: (params: { dataIndex: number }[] | { dataIndex: number }) => {
        const p = Array.isArray(params) ? params[0] : params
        const t = totals[p.dataIndex]
        const d = dims[p.dataIndex]
        return `<b>${d.short}</b><br/>${d.name}<br/>คะแนน: <b>${t.earned}</b> / ${t.max} (${t.pct}%)<br/>คะแนนจำเป็น: <b>${t.reqEarned}</b> / ${t.reqMax}`
      }
    },
    grid: { left: 60, right: 30, top: 30, bottom: 50 },
    xAxis: {
      type: 'category',
      data: dims.map(d => `ด้าน ${d.no}\n${d.short}`),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#cbd5e1', fontSize: 12, lineHeight: 16 }
    },
    yAxis: {
      type: 'value', max: 100, name: 'ร้อยละ',
      nameTextStyle: { color: '#94a3b8' },
      axisLabel: { color: '#94a3b8', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#1e293b' } }
    },
    series: [{
      type: 'bar', barWidth: 48,
      data: totals.map((t, i) => ({
        value: t.pct,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: dims[i].color }, { offset: 1, color: dims[i].color + '55' }] }
        }
      })),
      label: { show: true, position: 'top', color: '#e2e8f0', formatter: '{c}%' },
      markLine: {
        symbol: 'none', silent: true,
        lineStyle: { color: '#22c55e', type: 'dashed' },
        data: [{ yAxis: 80, label: { color: '#22c55e', formatter: 'เป้าหมาย 80%' } }]
      }
    }]
  }), [dims, totals])

  const reqStackOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' },
      formatter: (params: { dataIndex: number; seriesName: string; value: number }[]) => {
        const i = params[0].dataIndex
        const d = dims[i]
        const t = totals[i]
        const gap = t.reqMax - t.reqEarned
        return `<b>${d.short}</b> (ด้าน ${d.no})<br/>คะแนนจำเป็นที่ได้: <b style="color:#22c55e">${t.reqEarned}</b><br/>ส่วนที่ขาด: <b style="color:#ef4444">${gap}</b><br/>คะแนนจำเป็นเต็ม: <b>${t.reqMax}</b><br/>ความสำเร็จ: <b>${t.reqPct}%</b>`
      }
    },
    legend: { data: ['คะแนนจำเป็นที่ได้', 'ส่วนที่ขาด'], bottom: 0, textStyle: { color: '#cbd5e1' } },
    grid: { left: 50, right: 30, top: 30, bottom: 50 },
    xAxis: {
      type: 'category',
      data: dims.map(d => `ด้าน ${d.no}\n${d.short}`),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#cbd5e1', fontSize: 12, lineHeight: 16 }
    },
    yAxis: {
      type: 'value', name: 'คะแนน',
      nameTextStyle: { color: '#94a3b8' },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } }
    },
    series: [
      {
        name: 'คะแนนจำเป็นที่ได้', type: 'bar', stack: 'req', barWidth: 44,
        itemStyle: { color: '#22c55e', borderRadius: [0, 0, 0, 0] },
        label: { show: true, color: '#fff', fontWeight: 700, formatter: (p: { value: number }) => p.value > 0 ? String(p.value) : '' },
        data: totals.map(t => t.reqEarned)
      },
      {
        name: 'ส่วนที่ขาด', type: 'bar', stack: 'req',
        itemStyle: { color: '#ef4444', borderRadius: [6, 6, 0, 0] },
        label: { show: true, color: '#fff', fontWeight: 700, formatter: (p: { value: number }) => p.value > 0 ? `-${p.value}` : '' },
        data: totals.map(t => t.reqMax - t.reqEarned)
      }
    ]
  }), [dims, totals])

  const reqGapItems = useMemo(() => {
    return dims.flatMap(d => d.items.map(it => ({
      dim: d, item: it,
      gap: it.requiredMax - it.requiredEarned,
      pct: it.requiredMax > 0 ? Math.round((it.requiredEarned / it.requiredMax) * 100) : 100
    })))
      .filter(x => x.item.requiredMax > 0 && x.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 10)
  }, [dims])

  const reqGapOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' },
      formatter: (params: { dataIndex: number }[] | { dataIndex: number }) => {
        const p = Array.isArray(params) ? params[0] : params
        const x = reqGapItems[p.dataIndex]
        return `<b>${x.item.no} ${x.item.name}</b><br/>ด้าน: ${x.dim.short}<br/>จำเป็นที่ได้: <b>${x.item.requiredEarned}</b> / ${x.item.requiredMax}<br/>ส่วนที่ขาด: <b style="color:#ef4444">${x.gap}</b> คะแนน (${x.pct}%)`
      }
    },
    grid: { left: 8, right: 80, top: 10, bottom: 10, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } }
    },
    yAxis: {
      type: 'category', inverse: true,
      data: reqGapItems.map(x => `${x.item.no} ${x.item.name.length > 26 ? x.item.name.slice(0, 26) + '…' : x.item.name}`),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#cbd5e1', fontSize: 11 }
    },
    series: [{
      type: 'bar', barWidth: 16,
      data: reqGapItems.map(x => ({
        value: x.gap,
        itemStyle: { color: x.dim.color, borderRadius: [0, 4, 4, 0] }
      })),
      label: {
        show: true, position: 'right', color: '#e2e8f0',
        formatter: (p: { dataIndex: number; value: number }) => {
          const x = reqGapItems[p.dataIndex]
          return `ขาด ${p.value} (${x.pct}%)`
        }
      }
    }]
  }), [reqGapItems])

  const radarOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' },
    },
    legend: {
      data: ['ผลการประเมิน', 'คะแนนจำเป็น'],
      bottom: 0, textStyle: { color: '#cbd5e1' }
    },
    radar: {
      indicator: dims.map(d => ({ name: `ด้าน ${d.no} ${d.short}`, max: 100 })),
      splitArea: { areaStyle: { color: ['rgba(168,85,247,0.04)', 'rgba(168,85,247,0.08)'] } },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#334155' } },
      axisName: { color: '#cbd5e1' }
    },
    series: [{
      type: 'radar',
      data: [
        {
          name: 'ผลการประเมิน',
          value: totals.map(t => t.pct),
          areaStyle: { color: 'rgba(168,85,247,0.35)' },
          lineStyle: { color: '#a855f7', width: 2 },
          itemStyle: { color: '#a855f7' }
        },
        {
          name: 'คะแนนจำเป็น',
          value: totals.map(t => t.reqPct),
          areaStyle: { color: 'rgba(34,197,94,0.18)' },
          lineStyle: { color: '#22c55e', width: 2, type: 'dashed' },
          itemStyle: { color: '#22c55e' }
        }
      ]
    }]
  }), [dims, totals])

  const dimItemOption = (d: Dimension) => {
    const items = d.items
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#e2e8f0' },
        formatter: (params: { dataIndex: number }[] | { dataIndex: number }) => {
          const p = Array.isArray(params) ? params[0] : params
          const it = items[p.dataIndex]
          const pct = it.maxScore > 0 ? Math.round((it.earnedScore / it.maxScore) * 100) : 0
          return `<b>${it.no} ${it.name}</b><br/>คะแนน: <b>${it.earnedScore}</b> / ${it.maxScore} (${pct}%)<br/>จำเป็น: ${it.requiredEarned} / ${it.requiredMax}`
        }
      },
      grid: { left: 8, right: 60, top: 10, bottom: 10, containLabel: true },
      xAxis: {
        type: 'value', max: 100,
        axisLabel: { color: '#94a3b8', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      yAxis: {
        type: 'category',
        data: items.map(i => `${i.no}`),
        inverse: true,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      series: [{
        type: 'bar', barWidth: 14,
        data: items.map(i => {
          const pct = i.maxScore > 0 ? Math.round((i.earnedScore / i.maxScore) * 100) : 0
          return {
            value: pct,
            itemStyle: { color: statusColor(pct), borderRadius: [0, 4, 4, 0] }
          }
        }),
        label: {
          show: true, position: 'right', color: '#cbd5e1',
          formatter: (p: { dataIndex: number; value: number }) => {
            const it = items[p.dataIndex]
            return `${it.earnedScore}/${it.maxScore}`
          }
        }
      }]
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8"><Empty description="กำลังโหลด..." /></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/information-technology', title: <><DesktopOutlined /> งานคอมพิวเตอร์ฯ</> },
            { title: 'Smart Hospital — Dashboard' },
          ]}
          className="mb-6"
        />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl" style={{ color: '#a855f7' }}><FaHospitalAlt /></span>
            <div>
              <Title level={2} style={{ color: '#a855f7', margin: 0 }}>Smart Hospital — แบบประเมินภาพรวม</Title>
              <Text type="secondary">มาตรฐานการพัฒนาโรงพยาบาลอัจฉริยะ 4 ด้าน — Dashboard</Text>
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => setDims(loadDimensions())}>โหลดใหม่</Button>
            <Link href="/information-technology/smart-hospital/edit">
              <Button type="primary" icon={<EditOutlined />}>แก้ไขคะแนนประเมิน</Button>
            </Link>
          </Space>
        </div>

        {/* KPI Row */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12} lg={6}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: `4px solid ${statusColor(overall.pct)}` }}>
              <Statistic
                title={<Text type="secondary">ภาพรวมคะแนนประเมิน</Text>}
                value={overall.pct}
                suffix="%"
                prefix={<TrophyOutlined style={{ color: statusColor(overall.pct) }} />}
                styles={{ content: { color: statusColor(overall.pct), fontSize: 32 } }}
              />
              <Progress percent={overall.pct} strokeColor={statusColor(overall.pct)} showInfo={false} className="mt-2" />
              <Text type="secondary" className="text-xs">{overall.earned} / {overall.max} คะแนน</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #22c55e' }}>
              <Statistic
                title={<Text type="secondary">คะแนนจำเป็น (Mandatory)</Text>}
                value={overall.reqPct}
                suffix="%"
                prefix={<CheckCircleOutlined style={{ color: '#22c55e' }} />}
                styles={{ content: { color: '#22c55e', fontSize: 32 } }}
              />
              <Progress percent={overall.reqPct} strokeColor="#22c55e" showInfo={false} className="mt-2" />
              <Text type="secondary" className="text-xs">{overall.reqEarned} / {overall.reqMax} คะแนน</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
              <Statistic
                title={<Text type="secondary">หัวข้อที่ทำได้ดี (≥80%)</Text>}
                value={goodCount}
                suffix={`/ ${itemCount}`}
                prefix={<CheckCircleOutlined style={{ color: '#3b82f6' }} />}
                styles={{ content: { color: '#3b82f6', fontSize: 32 } }}
              />
              <Progress percent={Math.round((goodCount / itemCount) * 100)} strokeColor="#3b82f6" showInfo={false} className="mt-2" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #ef4444' }}>
              <Statistic
                title={<Text type="secondary">หัวข้อต้องปรับปรุง (&lt;40%)</Text>}
                value={riskCount}
                suffix={`/ ${itemCount}`}
                prefix={<WarningOutlined style={{ color: '#ef4444' }} />}
                styles={{ content: { color: '#ef4444', fontSize: 32 } }}
              />
              <Progress percent={Math.round((riskCount / itemCount) * 100)} strokeColor="#ef4444" showInfo={false} className="mt-2" />
            </Card>
          </Col>
        </Row>

        {/* Charts Row */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={8}>
            <Card variant="borderless" style={{ borderRadius: 12 }}>
              <Title level={5} style={{ margin: 0, color: '#a855f7' }}>ภาพรวม Smart Hospital</Title>
              <Text type="secondary" className="text-xs">คะแนนรวมจาก 4 ด้าน</Text>
              <EChart option={gaugeOption} height={300} />
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card variant="borderless" style={{ borderRadius: 12 }}>
              <Title level={5} style={{ margin: 0, color: '#a855f7' }}>คะแนนแต่ละด้าน (ร้อยละ)</Title>
              <Text type="secondary" className="text-xs">เปรียบเทียบความก้าวหน้าในแต่ละด้าน เทียบเป้าหมาย 80%</Text>
              <EChart option={dimBarOption} height={300} />
            </Card>
          </Col>
        </Row>

        {/* Mandatory Analysis Row */}
        <Title level={4} style={{ color: '#22c55e', marginTop: 16 }}>
          คะแนนจำเป็น (Mandatory) — จุดที่ต้องพัฒนา
        </Title>
        <Text type="secondary" className="block mb-3">
          วิเคราะห์ส่วนที่ขาดจากเกณฑ์คะแนนจำเป็น เพื่อระบุหัวข้อที่ควรเร่งพัฒนา
        </Text>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={10}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #22c55e' }}>
              <Title level={5} style={{ margin: 0, color: '#22c55e' }}>คะแนนจำเป็น vs ส่วนที่ขาด — รายด้าน</Title>
              <Text type="secondary" className="text-xs">เขียวคือคะแนนจำเป็นที่ทำได้แล้ว · แดงคือส่วนที่ขาด</Text>
              <EChart option={reqStackOption} height={340} />
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card variant="borderless" style={{ borderRadius: 12, borderLeft: '4px solid #ef4444' }}>
              <Title level={5} style={{ margin: 0, color: '#ef4444' }}>
                Top 10 หัวข้อที่ขาดคะแนนจำเป็นมากที่สุด
              </Title>
              <Text type="secondary" className="text-xs">เรียงตามจำนวนคะแนนจำเป็นที่ยังขาด — ใช้เป็นรายการ priority พัฒนา</Text>
              {reqGapItems.length === 0 ? (
                <div className="py-12 text-center">
                  <Text type="success" strong>🎉 ครบตามเกณฑ์คะแนนจำเป็นทุกข้อแล้ว</Text>
                </div>
              ) : (
                <EChart option={reqGapOption} height={Math.max(280, reqGapItems.length * 32 + 30)} />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={12}>
            <Card variant="borderless" style={{ borderRadius: 12 }}>
              <Title level={5} style={{ margin: 0, color: '#a855f7' }}>Radar — เปรียบเทียบ 4 ด้าน</Title>
              <Text type="secondary" className="text-xs">คะแนนที่ได้ vs คะแนนจำเป็น (Mandatory)</Text>
              <EChart option={radarOption} height={360} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card variant="borderless" style={{ borderRadius: 12 }}>
              <Title level={5} style={{ margin: 0, color: '#a855f7' }}>สรุปคะแนนแต่ละด้าน</Title>
              <Divider style={{ margin: '12px 0' }} />
              <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                {dims.map((d, i) => {
                  const t = totals[i]
                  const tag = statusTag(t.pct)
                  return (
                    <div key={d.key}>
                      <div className="flex items-center justify-between mb-1">
                        <Space>
                          <Tag color={d.color} style={{ borderColor: d.color, color: '#fff', background: d.color + 'cc' }}>ด้าน {d.no}</Tag>
                          <Text strong style={{ color: '#e2e8f0' }}>{d.short}</Text>
                          <Tag color={tag.color}>{tag.label}</Tag>
                        </Space>
                        <Text strong style={{ color: statusColor(t.pct) }}>{t.pct}%</Text>
                      </div>
                      <Progress
                        percent={t.pct}
                        strokeColor={{ '0%': d.color, '100%': d.color + 'aa' }}
                        showInfo={false}
                      />
                      <Text type="secondary" className="text-xs">
                        {t.earned} / {t.max} คะแนน · จำเป็น {t.reqEarned}/{t.reqMax}
                      </Text>
                    </div>
                  )
                })}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Per-Dimension Detail Charts */}
        <Title level={4} style={{ color: '#a855f7', marginTop: 24 }}>รายละเอียดแต่ละด้าน</Title>
        <Row gutter={[16, 16]}>
          {dims.map((d, i) => {
            const t = totals[i]
            return (
              <Col xs={24} lg={12} key={d.key}>
                <Card
                  variant="borderless"
                  style={{ borderRadius: 12, borderTop: `3px solid ${d.color}` }}
                  title={
                    <div className="flex items-center justify-between">
                      <Space>
                        <Tag color={d.color} style={{ borderColor: d.color, color: '#fff', background: d.color + 'cc' }}>ด้าน {d.no}</Tag>
                        <Text strong style={{ color: '#e2e8f0' }}>{d.short}</Text>
                      </Space>
                      <Text strong style={{ color: statusColor(t.pct) }}>{t.pct}%</Text>
                    </div>
                  }
                >
                  <Text type="secondary" className="text-xs">{d.name}</Text>
                  <EChart option={dimItemOption(d)} height={Math.max(220, d.items.length * 30 + 40)} />
                </Card>
              </Col>
            )
          })}
        </Row>
      </div>
    </div>
  )
}

export default function SmartHospitalDashboardPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6B21A8', borderRadius: 8 } }}>
      <PageContent />
    </ConfigProvider>
  )
}
