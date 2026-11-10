'use client'
// หน้าแรกงานยุทธศาสตร์และแผนงาน — ภาพรวมโครงการยุทธศาสตร์ (Roadmap) + ตัวชี้วัด (KPI) แล้วพาไปหน้าย่อย
// ข้อมูลยังเป็นตัวอย่าง: แผนโครงการเก็บใน localStorage ของเบราว์เซอร์ (grant-charts/data.ts) · KPI อยู่ใน kpis/data.ts
import React, { useEffect, useMemo, useState } from 'react'
import { Typography, Row, Col, Card, Statistic, Progress, Tag, Space, Table, Alert, Empty, Tooltip } from 'antd'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import {
  HomeOutlined, FundOutlined, ProjectOutlined, DotChartOutlined, CompassOutlined, RiseOutlined,
  WalletOutlined, TrophyOutlined, AlertOutlined, ArrowRightOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import Link from 'next/link'
import {
  DEFAULT_TASKS, MISSION_OPTIONS, loadTasks, getMissionMeta, getStatusMeta, budgetUtilization, type Task,
} from './grant-charts/data'
import { kpiData, getAchievePct, achieveLevel, latestPeriod, type KPI } from './kpis/data'

const { Title, Text } = Typography

const DAY = 86_400_000
const compactTHB = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ล้านบาท`
    : `${n.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท`
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

/** ความคืบหน้าที่ควรเป็นตามเวลาที่ผ่านไป (0–100) */
const expectedProgress = (t: Task, now: number) => {
  const s = Date.parse(t.start), e = Date.parse(t.end)
  if (!(e > s)) return now >= e ? 100 : 0
  return Math.round(Math.min(1, Math.max(0, (now - s) / (e - s))) * 100)
}
type Watch = { task: Task; reason: 'overdue' | 'behind' | 'on_hold'; expected: number; lateDays: number }
const REASON: Record<Watch['reason'], { label: string; color: string }> = {
  overdue: { label: 'เลยกำหนด', color: 'error' },
  behind: { label: 'ช้ากว่าแผน', color: 'warning' },
  on_hold: { label: 'ระงับชั่วคราว', color: 'orange' },
}
const CLOSED = new Set(['completed', 'cancelled'])

const StrategyHub = () => {
  // อ่าน localStorage หลัง mount (ค่าเริ่มต้น = ข้อมูลตัวอย่าง เหมือนฝั่ง server → ไม่เกิด hydration mismatch)
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS)
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    void Promise.resolve().then(() => { setTasks(loadTasks()); setNow(Date.now()) })
  }, [])

  const projects = useMemo(() => tasks.filter(t => t.type === 'project'), [tasks])
  const open = projects.filter(p => !CLOSED.has(p.status ?? ''))
  const inProgress = projects.filter(p => p.status === 'in_progress').length
  const approved = projects.reduce((n, p) => n + (p.budgetApproved ?? 0), 0)
  const spent = projects.reduce((n, p) => n + (p.budgetSpent ?? 0), 0)
  const spentPct = budgetUtilization(spent, approved)
  const avgProgress = open.length ? Math.round(open.reduce((n, p) => n + (p.progress ?? 0), 0) / open.length) : 0

  // โครงการ/งานที่ต้องติดตาม — เลยกำหนด · ช้ากว่าแผนเกิน 15% · ระงับชั่วคราว
  const watch = useMemo<Watch[]>(() => {
    if (now == null) return []
    return tasks
      .filter(t => t.type !== 'milestone' && !CLOSED.has(t.status ?? ''))
      .map(t => {
        const expected = expectedProgress(t, now), progress = t.progress ?? 0
        const lateDays = Math.floor((now - Date.parse(t.end)) / DAY)
        const reason: Watch['reason'] | null = t.status === 'on_hold' ? 'on_hold'
          : lateDays > 0 && progress < 100 ? 'overdue'
          : expected - progress > 15 ? 'behind' : null
        return reason ? { task: t, reason, expected, lateDays } : null
      })
      .filter((w): w is Watch => !!w)
      .sort((a, b) => (a.reason === 'overdue' ? 0 : 1) - (b.reason === 'overdue' ? 0 : 1) || (b.expected - (b.task.progress ?? 0)) - (a.expected - (a.task.progress ?? 0)))
  }, [tasks, now])

  // KPI ไตรมาสล่าสุด
  const { fy, quarter } = latestPeriod()
  const latestKpis = kpiData.filter(k => k.fiscalYear === fy && k.quarter === quarter)
  const met = latestKpis.filter(k => getAchievePct(k) >= 100).length
  const kpiMissed = latestKpis.filter(k => getAchievePct(k) < 100).sort((a, b) => getAchievePct(a) - getAchievePct(b))

  // ภาพรวมรายกลุ่มภารกิจ (เฉพาะกลุ่มที่มีโครงการ)
  const byMission = MISSION_OPTIONS.map(m => {
    const ps = projects.filter(p => p.mission === m.value)
    return {
      ...m, count: ps.length,
      progress: ps.length ? Math.round(ps.reduce((n, p) => n + (p.progress ?? 0), 0) / ps.length) : 0,
      budget: ps.reduce((n, p) => n + (p.budgetApproved ?? 0), 0),
    }
  }).filter(m => m.count > 0)

  const parentName = (t: Task) => t.parent ? tasks.find(x => x.id === t.parent)?.text : null

  const modules = [
    {
      title: 'แผนโครงการยุทธศาสตร์', subtitle: 'Project Roadmap', href: '/hss/strategy/grant-charts',
      icon: <ProjectOutlined />, tone: '#a855f7',
      description: 'แผนภูมิ Gantt ของโครงการยุทธศาสตร์ ความคืบหน้า งบประมาณ และผู้รับผิดชอบ',
      stats: [{ label: 'โครงการ', value: projects.length }, { label: 'กำลังดำเนินการ', value: inProgress }, { label: 'ต้องติดตาม', value: watch.length }],
    },
    {
      title: 'ตัวชี้วัดความสำเร็จ', subtitle: 'KPI Dashboard', href: '/hss/strategy/kpis',
      icon: <DotChartOutlined />, tone: '#10b981',
      description: 'ผลตัวชี้วัดรายไตรมาสของแต่ละหน่วยงาน เทียบค่าเป้าหมาย พร้อมแนวโน้ม',
      stats: [{ label: `ตัวชี้วัด Q${quarter}/${fy}`, value: latestKpis.length }, { label: 'บรรลุเป้า', value: met }, { label: 'ยังไม่บรรลุ', value: latestKpis.length - met }],
    },
    {
      title: 'แผนปฏิบัติการประจำปี', subtitle: 'Planning', href: null,
      icon: <CompassOutlined />, tone: '#3b82f6',
      description: 'วิสัยทัศน์ พันธกิจ ประเด็นยุทธศาสตร์ และแผนปฏิบัติการรายปีงบประมาณ', stats: [],
    },
    {
      title: 'รายงานผลการดำเนินงาน', subtitle: 'Annual Report', href: null,
      icon: <RiseOutlined />, tone: '#f59e0b',
      description: 'รายงานผลการดำเนินงานประจำปีและบทสรุปสำหรับผู้บริหาร', stats: [],
    },
  ]

  const watchCols = [
    {
      title: 'โครงการ / งาน', key: 'name',
      render: (_: unknown, w: Watch) => (
        <div style={{ minWidth: 200 }}>
          <div style={{ fontWeight: 500 }}>{w.task.text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {w.task.code ?? ''}{parentName(w.task) ? `${w.task.code ? ' · ' : ''}ภายใต้ ${parentName(w.task)}` : ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'กลุ่มภารกิจ', key: 'mission', width: 170, responsive: ['lg' as const],
      render: (_: unknown, w: Watch) => { const m = getMissionMeta(w.task.mission); return <Tag color={m.color} style={{ whiteSpace: 'normal' }}>{m.label.replace('กลุ่มภารกิจด้าน', '').replace('กลุ่มภารกิจ', '')}</Tag> },
    },
    {
      title: 'ความคืบหน้า / ควรเป็น', key: 'progress', width: 190,
      render: (_: unknown, w: Watch) => (
        <Tooltip title={`ทำได้ ${w.task.progress ?? 0}% · ตามเวลาควรได้ ${w.expected}%`}>
          <Progress percent={w.task.progress ?? 0} success={{ percent: 0 }} size="small"
            strokeColor={w.reason === 'overdue' ? '#ef4444' : '#f59e0b'} format={p => `${p}% / ${w.expected}%`} />
        </Tooltip>
      ),
    },
    {
      title: 'สิ้นสุด', key: 'end', width: 130,
      render: (_: unknown, w: Watch) => (
        <div>
          <div>{shortDate(w.task.end)}</div>
          {w.lateDays > 0 && <Text type="danger" style={{ fontSize: 12 }}>เลยมา {w.lateDays.toLocaleString('th-TH')} วัน</Text>}
        </div>
      ),
    },
    { title: 'สถานะ', key: 'reason', width: 120, render: (_: unknown, w: Watch) => <Tag color={REASON[w.reason].color}>{REASON[w.reason].label}</Tag> },
  ]

  const tile = (icon: React.ReactNode, tone: string, label: string, value: React.ReactNode, suffix: React.ReactNode, foot: React.ReactNode) => (
    <Card className="bg-app-surface/60 border-app-border h-full" styles={{ body: { padding: 18 } }}>
      <Space size={12} align="start">
        <div className="p-3 rounded-xl" style={{ background: `${tone}22`, color: tone, fontSize: 22, lineHeight: 1 }}>{icon}</div>
        <div>
          <Text className="text-app-text-2 text-xs">{label}</Text>
          <Statistic value={value as number} suffix={suffix} styles={{ content: { color: tone, fontWeight: 800, fontSize: 26 } }} />
          {foot}
        </div>
      </Space>
    </Card>
  )

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-4 md:p-10 w-full">
        <Breadcrumb
          items={[
            { href: '/home', title: <span><HomeOutlined /> หน้าหลัก</span> },
            { title: <span>พัฒนาระบบบริการและสนับสนุนบริการสุขภาพ</span> },
            { title: <span><FundOutlined /> งานยุทธศาสตร์และแผนงาน</span> },
          ]}
          className="mb-6"
        />

        <div className="mb-6 flex items-center gap-4">
          <div className="w-1 h-12 bg-linear-to-b from-purple-600 to-emerald-500 rounded-full" />
          <div>
            <Title level={2} style={{ margin: 0 }}>งานยุทธศาสตร์และแผนงาน</Title>
            <Text type="secondary">ติดตามโครงการตามแผนยุทธศาสตร์ งบประมาณ และตัวชี้วัดความสำเร็จของโรงพยาบาลในหน้าเดียว</Text>
          </div>
        </div>

        <Alert type="info" showIcon className="mb-6" data-testid="sample-notice"
          title="ข้อมูลในหน้านี้เป็นข้อมูลตัวอย่าง"
          description="ยังไม่ได้เชื่อมฐานข้อมูล — แผนโครงการที่แก้ไขจะเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น และตัวชี้วัดเป็นชุดตัวอย่าง" />

        {/* ตัวเลขสรุป */}
        <Row gutter={[16, 16]} className="mb-6" data-testid="summary">
          <Col xs={24} sm={12} xl={6}>
            {tile(<ProjectOutlined />, '#a855f7', 'โครงการยุทธศาสตร์', projects.length, <span className="text-xs text-app-text-3">โครงการ</span>,
              <Text className="text-xs text-app-text-3">กำลังดำเนินการ {inProgress} · ต้องติดตาม {watch.length} รายการ</Text>)}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {tile(<ClockCircleOutlined />, '#3b82f6', 'ความคืบหน้าเฉลี่ย (ยังไม่ปิด)', avgProgress, '%',
              <Progress percent={avgProgress} size="small" strokeColor="#3b82f6" showInfo={false} style={{ width: 160 }} />)}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {tile(<WalletOutlined />, '#f59e0b', 'เบิกจ่ายงบที่อนุมัติ', spentPct, '%',
              <Text className="text-xs text-app-text-3">{compactTHB(spent)} จาก {compactTHB(approved)}</Text>)}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {tile(<TrophyOutlined />, '#10b981', `KPI บรรลุเป้า ไตรมาส ${quarter}/${fy}`, met, <span className="text-xs text-app-text-3">/ {latestKpis.length} ตัว</span>,
              <Progress percent={latestKpis.length ? Math.round(met / latestKpis.length * 100) : 0} size="small" strokeColor="#10b981" showInfo={false} style={{ width: 160 }} />)}
          </Col>
        </Row>

        {/* เมนูระบบย่อย */}
        <Row gutter={[16, 16]} className="mb-6">
          {modules.map(m => {
            const body = (
              <Card hoverable={!!m.href} data-testid="module-card"
                className={`h-full bg-app-surface/40 border-app-border ${m.href ? 'strategy-card' : 'opacity-70'}`}
                styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column', padding: 20 } }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-3 rounded-xl" style={{ background: `${m.tone}22`, color: m.tone, fontSize: 24, lineHeight: 1 }}>{m.icon}</div>
                  {m.href ? <ArrowRightOutlined className="strategy-card-arrow" style={{ color: m.tone }} /> : <Tag>อยู่ระหว่างพัฒนา</Tag>}
                </div>
                <Title level={5} style={{ margin: 0 }}>{m.title}</Title>
                <Text style={{ color: m.tone, fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>{m.subtitle.toUpperCase()}</Text>
                <Text type="secondary" style={{ fontSize: 13, marginTop: 8, flex: 1 }}>{m.description}</Text>
                {m.stats.length > 0 && (
                  <div className="flex gap-5 mt-4 pt-3 border-t border-app-border">
                    {m.stats.map(s => (
                      <div key={s.label}>
                        <div className="text-[11px] text-app-text-3">{s.label}</div>
                        <div className="text-lg font-bold">{s.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
            return <Col xs={24} sm={12} xl={6} key={m.title}>{m.href ? <Link href={m.href} className="block h-full">{body}</Link> : body}</Col>
          })}
        </Row>

        <Row gutter={[16, 16]}>
          {/* ต้องติดตาม */}
          <Col xs={24} xl={16}>
            <Card className="bg-app-surface/40 border-app-border h-full" data-testid="watch-list"
              title={<Space><AlertOutlined style={{ color: '#ef4444' }} />โครงการและงานที่ต้องติดตาม</Space>}
              extra={<Link href="/hss/strategy/grant-charts" style={{ whiteSpace: 'nowrap' }}>ดูแผนทั้งหมด <ArrowRightOutlined /></Link>}
              styles={{ body: { padding: 0 }, title: { whiteSpace: 'normal' } }}>
              <Table<Watch> rowKey={w => w.task.id} dataSource={watch.slice(0, 8)} columns={watchCols} pagination={false} size="small"
                scroll={{ x: 640 }} loading={now == null}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ทุกโครงการเป็นไปตามแผน" /> }} />
              <div className="px-4 py-2 text-xs text-app-text-3">
                เลยกำหนด = เลยวันสิ้นสุดแต่ยังไม่ถึง 100% · ช้ากว่าแผน = ความคืบหน้าต่ำกว่าที่ควรเป็นตามเวลาเกิน 15%
                {watch.length > 8 ? ` · แสดง 8 จาก ${watch.length} รายการ` : ''}
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              {/* KPI ที่ยังไม่บรรลุ */}
              <Card className="bg-app-surface/40 border-app-border" data-testid="kpi-missed"
                title={<Space><DotChartOutlined style={{ color: '#10b981' }} />{`KPI ที่ยังไม่บรรลุ · ไตรมาส ${quarter}/${fy}`}</Space>}
                extra={<Link href="/hss/strategy/kpis" style={{ whiteSpace: 'nowrap' }}>ทั้งหมด</Link>}
                styles={{ title: { whiteSpace: 'normal' } }}>
                {kpiMissed.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="บรรลุเป้าทุกตัว" /> : (
                  <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    {kpiMissed.map((k: KPI) => {
                      const pct = getAchievePct(k), lv = achieveLevel(pct)
                      return (
                        <div key={k.id}>
                          <div className="flex justify-between gap-2">
                            <Text style={{ fontSize: 13 }}>{k.kpiName}</Text>
                            <Tag color={lv.tagColor} style={{ marginInlineEnd: 0, height: 'fit-content' }}>{lv.label}</Tag>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{k.department} · ได้ {k.actual.toLocaleString('th-TH')} จากเป้า {k.target.toLocaleString('th-TH')} {k.unit}</Text>
                          <Progress percent={Math.min(pct, 100)} size="small" strokeColor={lv.color} format={() => `${pct}%`} />
                        </div>
                      )
                    })}
                  </Space>
                )}
              </Card>

              {/* รายกลุ่มภารกิจ */}
              <Card className="bg-app-surface/40 border-app-border" title="ความคืบหน้ารายกลุ่มภารกิจ" data-testid="by-mission">
                {byMission.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีโครงการ" /> : (
                  <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                    {byMission.map(m => (
                      <div key={m.value}>
                        <div className="flex justify-between gap-2">
                          <Text style={{ fontSize: 13 }}>{m.label}</Text>
                          <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{m.count} โครงการ · {compactTHB(m.budget)}</Text>
                        </div>
                        <Progress percent={m.progress} size="small" strokeColor={m.color} />
                      </div>
                    ))}
                  </Space>
                )}
              </Card>
            </Space>
          </Col>
        </Row>

        <div className="mt-4 text-xs text-app-text-3">
          สถานะโครงการ: {['in_progress', 'approved', 'on_hold', 'completed'].map(s => {
            const n = projects.filter(p => p.status === s).length
            return n ? <Tag key={s} color={getStatusMeta(s as Task['status']).color} style={{ marginInlineStart: 6 }}>{getStatusMeta(s as Task['status']).label} {n}</Tag> : null
          })}
        </div>
      </div>

      <style jsx global>{`
        .strategy-card { transition: border-color .2s, transform .2s; }
        .strategy-card:hover { transform: translateY(-2px); }
        .strategy-card-arrow { opacity: .4; transition: opacity .2s, transform .2s; }
        .strategy-card:hover .strategy-card-arrow { opacity: 1; transform: translateX(3px); }
      `}</style>
    </div>
  )
}

export default function StrategyPage() {
  return (
    <AppThemeProvider colorPrimary="#6B21A8">
      <StrategyHub />
    </AppThemeProvider>
  )
}
