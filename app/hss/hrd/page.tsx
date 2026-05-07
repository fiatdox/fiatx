'use client'
import React, { useEffect, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Row, Col, Card, theme,
  Statistic, Progress, Tag, Space, Divider, Table
} from 'antd'
import {
  HomeOutlined, FundOutlined, AimOutlined, ReadOutlined,
  CompassOutlined, TrophyOutlined, RiseOutlined, TeamOutlined
} from '@ant-design/icons'
import { FaGraduationCap } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import Link from 'next/link'
import {
  loadStrategies, loadGoals, loadTrainings,
  formatCompactTHB, getPillarMeta, getStatusMeta, getCompetencyMeta,
  goalAchievement, budgetUtilization, type Strategy, type Goal, type TrainingCourse,
  DEFAULT_STRATEGIES, DEFAULT_GOALS, DEFAULT_TRAININGS
} from './data'

const { Title, Text } = Typography

const HRDHub = () => {
  const [hydrated, setHydrated] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>(DEFAULT_STRATEGIES)
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS)
  const [trainings, setTrainings] = useState<TrainingCourse[]>(DEFAULT_TRAININGS)

  useEffect(() => {
    setStrategies(loadStrategies())
    setGoals(loadGoals())
    setTrainings(loadTrainings())
    setHydrated(true)
  }, [])

  const totalStrategies = strategies.length
  const activeStrategies = strategies.filter(s => s.status === 'in_progress' || s.status === 'approved').length
  const totalStrategyBudget = strategies.reduce((s, x) => s + x.budget, 0)

  const totalGoals = goals.length
  const avgAchievement = goals.length
    ? Math.round(goals.reduce((s, g) => s + goalAchievement(g), 0) / goals.length)
    : 0

  const totalTrainings = trainings.length
  const totalSeatsPlanned = trainings.reduce((s, t) => s + t.seatsPlanned, 0)
  const totalSeatsActual = trainings.reduce((s, t) => s + t.seatsActual, 0)
  const seatsFillPct = totalSeatsPlanned ? Math.round((totalSeatsActual / totalSeatsPlanned) * 100) : 0
  const totalBudgetPlanned = trainings.reduce((s, t) => s + t.budgetPlanned, 0)
  const totalBudgetSpent = trainings.reduce((s, t) => s + t.budgetSpent, 0)
  const budgetUsedPct = budgetUtilization(totalBudgetPlanned, totalBudgetSpent)

  const upcoming = [...trainings]
    .filter(t => t.status === 'approved' || t.status === 'in_progress')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5)

  const menuItems = [
    {
      title: 'ยุทธศาสตร์การพัฒนาบุคลากร',
      subtitle: 'HR Development Strategy',
      icon: <CompassOutlined className="text-4xl text-purple-400" />,
      description: 'กรอบยุทธศาสตร์ 5 เสาหลักในการพัฒนาทรัพยากรบุคคลของโรงพยาบาล สอดคล้องกับวิสัยทัศน์และเป้าหมายระยะ 5 ปี',
      href: '/hss/hrd/strategy',
      color: 'from-purple-500/20 to-purple-600/5',
      stats: [
        { label: 'ยุทธศาสตร์', value: totalStrategies },
        { label: 'กำลังดำเนินการ', value: activeStrategies }
      ]
    },
    {
      title: 'เป้าหมายของการพัฒนาบุคลากร',
      subtitle: 'Development Goals & KPIs',
      icon: <AimOutlined className="text-4xl text-emerald-400" />,
      description: 'เป้าหมายเชิงปริมาณ/คุณภาพรายปีงบประมาณ พร้อม Baseline และความคืบหน้าเทียบเป้า',
      href: '/hss/hrd/goals',
      color: 'from-emerald-500/20 to-emerald-600/5',
      stats: [
        { label: 'เป้าหมาย', value: totalGoals },
        { label: 'บรรลุเฉลี่ย', value: `${avgAchievement}%` }
      ]
    },
    {
      title: 'แผนพัฒนาอบรมสมรรถนะบุคลากร',
      subtitle: 'Competency Training Plan',
      icon: <ReadOutlined className="text-4xl text-amber-400" />,
      description: 'แผนหลักสูตรอบรมประจำปี จำแนกตามสมรรถนะ กลุ่มเป้าหมาย งบประมาณ และผลการประเมิน',
      href: '/hss/hrd/training-plan',
      color: 'from-amber-500/20 to-amber-600/5',
      stats: [
        { label: 'หลักสูตร', value: totalTrainings },
        { label: 'ที่นั่งจริง/แผน', value: `${seatsFillPct}%` }
      ]
    },
  ]

  const upcomingCols = [
    {
      title: 'รหัส', dataIndex: 'code', width: 90,
      render: (v: string) => <Text style={{ color: '#a855f7', fontWeight: 600 }}>{v}</Text>
    },
    {
      title: 'หลักสูตร', dataIndex: 'name',
      render: (v: string, r: TrainingCourse) => {
        const cm = getCompetencyMeta(r.competencyType)
        return (
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{v}</div>
            <Tag color={cm.color} style={{ marginTop: 4, borderColor: cm.color, color: '#fff', background: cm.color + 'cc' }}>{cm.label}</Tag>
          </div>
        )
      }
    },
    {
      title: 'ช่วงเวลา', width: 200,
      render: (_: unknown, r: TrainingCourse) => (
        <Text style={{ color: '#94a3b8' }}>
          {new Date(r.startDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
          {' → '}
          {new Date(r.endDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
        </Text>
      )
    },
    {
      title: 'สถานะ', dataIndex: 'status', width: 130,
      render: (v: TrainingCourse['status']) => {
        const sm = getStatusMeta(v)
        return <Tag color={sm.color}>{sm.label}</Tag>
      }
    },
    {
      title: 'ที่นั่ง', width: 120, align: 'center' as const,
      render: (_: unknown, r: TrainingCourse) => (
        <Text style={{ color: '#cbd5e1' }}>{r.seatsActual}/{r.seatsPlanned}</Text>
      )
    },
  ]

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200">
        <Navbar />
        <div className="p-6 md:p-12" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-purple-500/30">
      <Navbar />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-amber-600/5 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-12 w-full">
        <Breadcrumb
          items={[
            { href: '/', title: <span className="text-slate-500 hover:text-purple-400 transition-colors"><HomeOutlined /> หน้าหลัก</span> },
            { title: <span className="text-slate-100 font-medium"><FundOutlined /> งานพัฒนาระบบบริการ</span> },
            { title: <span className="text-slate-100 font-medium"><FaGraduationCap style={{ display: 'inline-block', verticalAlign: '-2px' }} /> งานพัฒนาบุคลากรและการศึกษา</span> },
          ]}
          className="mb-10 text-xs uppercase tracking-widest"
        />

        <div className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-1 h-10 bg-linear-to-b from-purple-600 to-amber-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
            <div>
              <Title level={1} className="text-slate-100 m-0 font-black! tracking-tighter uppercase">
                Human Resource Development
              </Title>
              <Text className="text-slate-400 text-sm mt-1 block font-medium opacity-80 uppercase tracking-widest">
                ระบบพัฒนาบุคลากรและการศึกษา · Center for People Excellence
              </Text>
            </div>
          </div>
          <div className="max-w-3xl border-l border-slate-800 ml-5 pl-5 py-1">
            <Text className="text-slate-400 text-sm italic">
              ระบบบริหารและพัฒนาทรัพยากรบุคคลแบบมืออาชีพสำหรับโรงพยาบาลขนาดใหญ่ — ครอบคลุมยุทธศาสตร์การพัฒนา 5 เสาหลัก, เป้าหมายเชิงตัวชี้วัด, และแผนการอบรมพัฒนาสมรรถนะตามมาตรฐาน HA / MOPH
            </Text>
          </div>
        </div>

        {/* KPI Strip */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-slate-900/60 border-slate-800/50 backdrop-blur-md" styles={{ body: { padding: 18 } }}>
              <Space size={12} align="start">
                <div className="p-3 rounded-xl bg-purple-500/15">
                  <CompassOutlined style={{ fontSize: 22, color: '#a855f7' }} />
                </div>
                <div>
                  <Text className="text-slate-400 text-xs uppercase tracking-wider">ยุทธศาสตร์</Text>
                  <Statistic value={totalStrategies} suffix={<span className="text-xs text-slate-500">เรื่อง</span>}
                    styles={{ content: { color: '#a855f7', fontWeight: 800, fontSize: 26 } }} />
                  <Text className="text-xs text-slate-500">งบกรอบรวม {formatCompactTHB(totalStrategyBudget)}</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-slate-900/60 border-slate-800/50 backdrop-blur-md" styles={{ body: { padding: 18 } }}>
              <Space size={12} align="start">
                <div className="p-3 rounded-xl bg-emerald-500/15">
                  <TrophyOutlined style={{ fontSize: 22, color: '#10b981' }} />
                </div>
                <div>
                  <Text className="text-slate-400 text-xs uppercase tracking-wider">บรรลุเป้าเฉลี่ย</Text>
                  <Statistic value={avgAchievement} suffix="%"
                    styles={{ content: { color: '#10b981', fontWeight: 800, fontSize: 26 } }} />
                  <Progress percent={avgAchievement} size="small" strokeColor="#10b981" showInfo={false} />
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-slate-900/60 border-slate-800/50 backdrop-blur-md" styles={{ body: { padding: 18 } }}>
              <Space size={12} align="start">
                <div className="p-3 rounded-xl bg-amber-500/15">
                  <TeamOutlined style={{ fontSize: 22, color: '#f59e0b' }} />
                </div>
                <div>
                  <Text className="text-slate-400 text-xs uppercase tracking-wider">ที่นั่งอบรม</Text>
                  <Statistic value={totalSeatsActual} suffix={<span className="text-xs text-slate-500">/ {totalSeatsPlanned}</span>}
                    styles={{ content: { color: '#f59e0b', fontWeight: 800, fontSize: 26 } }} />
                  <Progress percent={seatsFillPct} size="small" strokeColor="#f59e0b" showInfo={false} />
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-slate-900/60 border-slate-800/50 backdrop-blur-md" styles={{ body: { padding: 18 } }}>
              <Space size={12} align="start">
                <div className="p-3 rounded-xl bg-blue-500/15">
                  <RiseOutlined style={{ fontSize: 22, color: '#3b82f6' }} />
                </div>
                <div>
                  <Text className="text-slate-400 text-xs uppercase tracking-wider">งบเบิกจ่าย</Text>
                  <Statistic value={budgetUsedPct} suffix="%"
                    styles={{ content: { color: '#3b82f6', fontWeight: 800, fontSize: 26 } }} />
                  <Text className="text-xs text-slate-500">{formatCompactTHB(totalBudgetSpent)} / {formatCompactTHB(totalBudgetPlanned)}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 3 Module Cards */}
        <Row gutter={[24, 24]} className="mb-10">
          {menuItems.map((item, idx) => (
            <Col xs={24} md={8} key={idx}>
              <Link href={item.href}>
                <Card
                  hoverable
                  className="h-full bg-slate-900/40 backdrop-blur-xl border-slate-800/50 hover:border-purple-500/50 transition-all duration-500 group overflow-hidden shadow-2xl"
                  styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column', padding: '2rem' } }}
                >
                  <div className={`absolute inset-0 bg-linear-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                  <div className="relative z-10 flex-1">
                    <div className="mb-6 p-4 bg-slate-800/50 rounded-2xl w-fit group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner group-hover:bg-purple-900/20">
                      {item.icon}
                    </div>
                    <Title level={4} className="mb-1 text-slate-100 group-hover:text-white transition-colors font-bold! tracking-tight leading-tight">
                      {item.title}
                    </Title>
                    <Text className="text-purple-400 text-[10px] font-bold uppercase tracking-widest block mb-3">
                      {item.subtitle}
                    </Text>
                    <Text className="text-slate-500 group-hover:text-slate-300 text-xs leading-relaxed transition-colors block font-medium mb-5">
                      {item.description}
                    </Text>
                    <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.06)' }} />
                    <div className="flex items-center justify-between">
                      {item.stats.map((s, i) => (
                        <div key={i}>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
                          <div className="text-lg font-bold text-slate-100">{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        {/* Upcoming Trainings */}
        <Card
          className="bg-slate-900/40 backdrop-blur-xl border-slate-800/50"
          styles={{ body: { padding: '20px 24px' } }}
          title={
            <Space>
              <ReadOutlined style={{ color: '#a855f7' }} />
              <span className="text-slate-100">หลักสูตรอบรมที่กำลังจะเริ่ม / กำลังดำเนินการ</span>
            </Space>
          }
        >
          <Table
            dataSource={upcoming}
            columns={upcomingCols}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{ emptyText: 'ยังไม่มีหลักสูตรในแผน' }}
          />
        </Card>

        {/* Strategy Pillars Quick View */}
        <div className="mt-8">
          <Title level={5} className="text-slate-300 mb-4 uppercase tracking-wider">เสาหลักยุทธศาสตร์การพัฒนาบุคลากร</Title>
          <Row gutter={[12, 12]}>
            {strategies.map(s => {
              const pm = getPillarMeta(s.pillar)
              const sm = getStatusMeta(s.status)
              return (
                <Col xs={24} sm={12} md={8} lg={Math.floor(24 / Math.max(strategies.length, 1)) || 5} key={s.id}>
                  <Card
                    className="bg-slate-900/40 border-slate-800/50 hover:border-slate-700 transition-colors h-full"
                    styles={{ body: { padding: 16 } }}
                  >
                    <Tag color={pm.color} style={{ borderColor: pm.color, color: '#fff', background: pm.color + 'cc', marginBottom: 8 }}>
                      {s.code}
                    </Tag>
                    <div className="text-slate-200 text-sm font-semibold leading-snug mb-2 line-clamp-2">{s.name}</div>
                    <Text className="text-slate-500 text-xs block mb-2 line-clamp-2">{s.vision}</Text>
                    <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.06)' }} />
                    <div className="flex items-center justify-between">
                      <Tag color={sm.color}>{sm.label}</Tag>
                      <Text className="text-xs text-slate-500">{formatCompactTHB(s.budget)}</Text>
                    </div>
                  </Card>
                </Col>
              )
            })}
          </Row>
        </div>
      </div>

      <style jsx global>{`
        .ant-breadcrumb-separator { color: #1e293b !important; margin: 0 12px; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

export default function HRDPage() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#a855f7',
          borderRadius: 12,
          fontFamily: 'var(--font-sarabun)',
          colorBgBase: '#020617',
          colorBorder: 'rgba(255,255,255,0.08)'
        }
      }}
    >
      <App>
        <HRDHub />
      </App>
    </ConfigProvider>
  )
}
