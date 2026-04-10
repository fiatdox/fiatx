'use client'
import React, { useMemo, useState } from 'react'
import { ConfigProvider, App, Typography, Breadcrumb, Card, Row, Col, Progress, Tag, theme, Badge, Select } from 'antd'
import { HomeOutlined, FundOutlined, ProjectOutlined, InfoCircleOutlined, CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'
import "@svar-ui/react-gantt/all.css"
import Navbar from '@/app/components/Navbar'

// Dynamically import Gantt to avoid SSR hydration mismatch
const Gantt = dynamic(() => import("@svar-ui/react-gantt").then((mod) => mod.Gantt), { 
  ssr: false, 
  loading: () => <div className="w-full h-[650px] bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Initializing Gantt Engine...</div>
})
const GanttTooltip = dynamic(() => import("@svar-ui/react-gantt").then((mod) => mod.Tooltip), { ssr: false })

const { Title, Text } = Typography

// --- Color Logic ---
// 0%       → Red    (#ef4444)
// 1–39%    → Yellow (#f59e0b)
// 40–99%   → Blue   (#3b82f6)
// 100%     → Green  (#10b981)
const getProgressColor = (progress: number) => {
  if (progress === 100) return { fill: '#10b981', shadow: 'rgba(16,185,129,0.35)', label: 'เสร็จสิ้น', tagColor: 'success' }
  if (progress === 0)   return { fill: '#ef4444', shadow: 'rgba(239,68,68,0.35)',   label: 'ยังไม่เริ่ม',  tagColor: 'error' }
  if (progress < 40)    return { fill: '#f59e0b', shadow: 'rgba(245,158,11,0.35)', label: 'ล่าช้า',      tagColor: 'warning' }
  return                       { fill: '#3b82f6', shadow: 'rgba(59,130,246,0.35)', label: 'กำลังดำเนิน', tagColor: 'processing' }
}

// --- Mock Project Data ---
const MOCK_TASKS_DATA = [
  // แผนที่ 1: ยุทธศาสตร์ดิจิทัล
  { id: "1", text: "ยุทธศาสตร์ดิจิทัล (Digital Transformation)", start: new Date(2026, 0, 1), end: new Date(2026, 5, 30), progress: 70, type: "project", mission: "admin" },
  { id: "11", text: "อัปเกรดระบบข้อมูลผู้ป่วย (HIS)", start: new Date(2026, 0, 1), end: new Date(2026, 2, 15), progress: 100, type: "task", parent: "1", mission: "admin" },
  { id: "12", text: "พัฒนาระบบคิวออนไลน์ (Smart Queue)", start: new Date(2026, 2, 16), end: new Date(2026, 4, 15), progress: 60, type: "task", parent: "1", mission: "admin" },
  { id: "13", text: "เชื่อมต่อข้อมูลสุขภาพ (HIE API)", start: new Date(2026, 4, 16), end: new Date(2026, 5, 30), progress: 10, type: "task", parent: "1", mission: "admin" },

  // แผนที่ 2: โรงพยาบาลสีเขียว
  { id: "2", text: "โรงพยาบาลสีเขียว (Green Hospital)", start: new Date(2026, 1, 1), end: new Date(2026, 8, 30), progress: 45, type: "project", mission: "primary" },
  { id: "21", text: "ติดตั้ง Solar Rooftop อาคารผู้ป่วย", start: new Date(2026, 1, 1), end: new Date(2026, 2, 28), progress: 100, type: "task", parent: "2", mission: "primary" },
  { id: "22", text: "ปรับปรุงระบบบำบัดน้ำเสีย", start: new Date(2026, 3, 1), end: new Date(2026, 6, 15), progress: 25, type: "task", parent: "2", mission: "primary" },
  { id: "23", text: "รณรงค์ลดพลาสติกทางการแพทย์", start: new Date(2026, 2, 15), end: new Date(2026, 8, 30), progress: 15, type: "task", parent: "2", mission: "primary" },

  // แผนที่ 3: ศูนย์ความเป็นเลิศ
  { id: "3", text: "ยกระดับคุณภาพบริการ (Service Excellence)", start: new Date(2026, 2, 1), end: new Date(2026, 11, 20), progress: 30, type: "project", mission: "tertiary" },
  { id: "31", text: "ก่อสร้างศูนย์รังสีรักษาและมะเร็ง", start: new Date(2026, 2, 1), end: new Date(2026, 8, 30), progress: 50, type: "task", parent: "3", mission: "tertiary" },
  { id: "32", text: "จัดซื้อเครื่องฉายรังสีเร่งอนุภาค", start: new Date(2026, 7, 1), end: new Date(2026, 9, 30), progress: 0, type: "task", parent: "3", mission: "tertiary" },
  { id: "33", text: "อบรมแพทย์และนักรังสีเทคนิค", start: new Date(2026, 8, 15), end: new Date(2026, 10, 30), progress: 0, type: "task", parent: "3", mission: "tertiary" },
  { id: "34", text: "เปิดศูนย์มะเร็งครบวงจร (Milestone)", start: new Date(2026, 11, 15), end: new Date(2026, 11, 15), type: "milestone", parent: "3", mission: "tertiary" }
]

const MOCK_LINKS_DATA = [
  { id: "l1", source: "11", target: "12", type: 0 },
  { id: "l2", source: "12", target: "13", type: 0 },
  { id: "l3", source: "21", target: "22", type: 0 },
  { id: "l4", source: "31", target: "32", type: 0 },
  { id: "l5", source: "32", target: "34", type: 0 },
  { id: "l6", source: "33", target: "34", type: 0 }
]

// --- Summary Stats ---
const computeStats = (taskData: any[]) => {
  const t = taskData.filter(x => x.type !== 'milestone' && typeof x.progress === 'number')
  const done     = t.filter(x => x.progress === 100).length
  const notStart = t.filter(x => x.progress === 0).length
  const slow     = t.filter(x => x.progress > 0 && x.progress < 40).length
  const active   = t.filter(x => x.progress >= 40 && x.progress < 100).length
  return { done, notStart, slow, active, total: t.length }
}

const GanttPageContent = () => {
  const [selectedMission, setSelectedMission] = useState<string>('all')

  const filteredTasksData = useMemo(() => {
    if (selectedMission === 'all') return MOCK_TASKS_DATA;
    return MOCK_TASKS_DATA.filter(t => (t as any).mission === selectedMission);
  }, [selectedMission]);

  const tasks = useMemo(() => filteredTasksData.map(t => ({
    ...t,
    css: t.type === 'milestone' ? '' : `task-color-${t.id}`
  })), [filteredTasksData])

  const links = useMemo(() => {
    const taskIds = new Set(filteredTasksData.map(t => t.id));
    return MOCK_LINKS_DATA.filter(l => taskIds.has(l.source) && taskIds.has(l.target));
  }, [filteredTasksData])

  // Dynamic CSS: one rule per task using the 4-state color logic
  const dynamicTaskStyles = useMemo(() => {
    return tasks.map(t => {
      if (t.type === 'milestone' || typeof t.progress === 'undefined') return ''
      const { fill, shadow } = getProgressColor(t.progress)
      return `
        .task-color-${t.id} {
          --wx-gantt-task-fill-color: ${fill} !important;
          --wx-gantt-project-fill-color: ${fill} !important;
          box-shadow: 0 4px 12px ${shadow} !important;
        }
      `
    }).join('\n')
  }, [tasks])

  const scales = useMemo(() => [
    { id: "month", unit: "month" as const, step: 1, format: "%F %Y" },
    { id: "week",  unit: "week"  as const, step: 1, format: "Week %W" },
  ], [])

  const columns = useMemo(() => [
    { id: "text",     name: "text",     label: "Project / Task", width: 300, min_width: 200, tree: true },
    { id: "progress", name: "progress", label: "%",    width: 60,  align: "center" as const, template: (v: number) => `${v ?? 0}%` },
    { id: "duration", name: "duration", label: "Days", width: 70,  align: "center" as const },
  ], [])

  const stats = useMemo(() => computeStats(filteredTasksData), [filteredTasksData])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      <Navbar />

      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[-8%]  w-[28%] h-[28%] bg-blue-300/20   blur-[130px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-emerald-300/20 blur-[130px] rounded-full" />
        <div className="absolute top-[60%] left-[40%]  w-[20%] h-[20%] bg-amber-200/15  blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-10 max-w-[1600px] mx-auto">

        {/* ── Header ── */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { href: '/', title: <span className="text-slate-500 hover:text-blue-600 transition-colors"><HomeOutlined /> หน้าหลัก</span> },
              { title: <span className="text-slate-500"><FundOutlined /> งานยุทธศาสตร์</span> },
              { title: <span className="text-slate-900 font-bold">Project Roadmap</span> },
            ]}
            className="mb-4 text-xs uppercase tracking-tighter"
          />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <ProjectOutlined />
              </div>
              <div>
                <Title level={2} className="text-slate-900 m-0 font-black! tracking-tight uppercase">Hospital Roadmaps 2026</Title>
                <Text className="text-slate-500 text-sm">ติดตามความคืบหน้าโครงการยุทธศาสตร์และงบประมาณประจำปี</Text>
              </div>
            </div>

            {/* ── Quick Stats Cards ── */}
            <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2">
              {/* Done */}
              <Card className="border-emerald-200 bg-emerald-50/80 backdrop-blur-md min-w-[130px] shadow-sm" styles={{ body: { padding: '12px 16px' } }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">เสร็จสิ้น</span>
                </div>
                <div className="text-2xl font-black text-emerald-700">{stats.done}<span className="text-sm text-emerald-500 ml-1 font-semibold">/{stats.total}</span></div>
              </Card>

              {/* Active */}
              <Card className="border-blue-200 bg-blue-50/80 backdrop-blur-md min-w-[130px] shadow-sm" styles={{ body: { padding: '12px 16px' } }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">กำลังดำเนิน</span>
                </div>
                <div className="text-2xl font-black text-blue-700">{stats.active}<span className="text-sm text-blue-400 ml-1 font-semibold">/{stats.total}</span></div>
              </Card>

              {/* Slow */}
              <Card className="border-amber-200 bg-amber-50/80 backdrop-blur-md min-w-[130px] shadow-sm" styles={{ body: { padding: '12px 16px' } }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">ความก้าวหน้าต่ำ</span>
                </div>
                <div className="text-2xl font-black text-amber-700">{stats.slow}<span className="text-sm text-amber-400 ml-1 font-semibold">/{stats.total}</span></div>
              </Card>

              {/* Not Started */}
              <Card className="border-red-200 bg-red-50/80 backdrop-blur-md min-w-[130px] shadow-sm" styles={{ body: { padding: '12px 16px' } }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider">ยังไม่เริ่ม</span>
                </div>
                <div className="text-2xl font-black text-red-700">{stats.notStart}<span className="text-sm text-red-400 ml-1 font-semibold">/{stats.total}</span></div>
              </Card>
            </div>
          </div>
        </div>

        {/* ── Legend Bar ── */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/70 border border-slate-200 rounded-xl backdrop-blur-sm items-center shadow-sm">
          <div className="flex items-center gap-2 mr-2">
            <Tag icon={<SyncOutlined spin />} className="font-bold border-0 bg-blue-50 text-blue-600">Gantt View</Tag>
            <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hidden sm:inline">Timeline Visualization</Text>
          </div>
          <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block" />

          {/* Mission Filter */}
          <Select
            value={selectedMission}
            onChange={setSelectedMission}
            options={[
              { value: 'all', label: '🟢 ทั้งหมด (All Missions)' },
              { value: 'admin', label: 'กลุ่มภารกิจอำนวยการ' },
              { value: 'primary', label: 'กลุ่มภารกิจบริการปฐมภูมิฯ' },
              { value: 'tertiary', label: 'กลุ่มภารกิจระดับตติยภูมิ (Excellence)' }
            ]}
            className="w-full sm:w-[260px]"
            popupMatchSelectWidth={false}
          />

          <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block" />

          {/* Color legend */}
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="text-slate-600">100% — เสร็จสิ้น</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
              <span className="text-slate-600">40–99% — กำลังดำเนิน</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              <span className="text-slate-600">&lt;40% — ความก้าวหน้าต่ำ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
              <span className="text-slate-600">0% — ยังไม่เริ่ม</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full text-[10px] border border-slate-200 cursor-help group">
            <InfoCircleOutlined className="group-hover:text-blue-600 transition-colors" />
            <span className="group-hover:text-slate-700">Double click tasks to edit details</span>
          </div>
        </div>

        {/* ── Gantt Card ── */}
        <Card
          className="bg-white border-slate-200 overflow-hidden shadow-xl rounded-2xl p-0 gantt-card text-slate-800"
          styles={{ body: { padding: 0 } }}
        >
          {/* Inject Dynamic Colors */}
          <style dangerouslySetInnerHTML={{ __html: dynamicTaskStyles }} />

          <div className="gantt-wrapper p-2" style={{ height: "650px", width: "100%" }}>
            {/* @ts-ignore */}
            <Gantt
              tasks={tasks}
              links={links}
              scales={scales}
              columns={columns}
            >
              <GanttTooltip
                content={({ data: task }: any) => {
                  const progress = task.progress ?? 0
                  const { fill, label, tagColor } = getProgressColor(progress)
                  return (
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xl min-w-[290px]">
                      {/* Title row */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: fill }} />
                        <div>
                          <div className="font-bold text-slate-800 text-[13px] leading-tight mb-1">{task.text}</div>
                          <Tag color={tagColor} className="text-[10px] font-bold border-0">{label}</Tag>
                        </div>
                      </div>

                      {/* Dates */}
                      {task.type !== 'milestone' && (
                        <div className="grid grid-cols-2 gap-4 mb-3 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">วันที่เริ่ม</div>
                            <div className="text-xs font-semibold text-slate-700">{task.start ? new Date(task.start).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">กำหนดเสร็จ</div>
                            <div className="text-xs font-semibold text-slate-700">{task.end ? new Date(task.end).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-'}</div>
                          </div>
                        </div>
                      )}

                      {/* Milestone */}
                      {task.type === 'milestone' && (
                        <div className="mb-3 bg-red-50 rounded-lg p-2.5 border border-red-100">
                          <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-0.5">วันสำคัญ (Milestone)</div>
                          <div className="text-xs font-bold text-red-700">{task.start ? new Date(task.start).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-'}</div>
                        </div>
                      )}

                      {/* Progress bar */}
                      {typeof task.progress === 'number' && (
                        <div className="mt-2">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Progress</span>
                            <span className="text-xs font-black" style={{ color: fill }}>{task.progress}%</span>
                          </div>
                          <Progress
                            percent={task.progress}
                            size="small"
                            showInfo={false}
                            strokeColor={fill}
                            trailColor="#e2e8f0"
                            className="m-0"
                          />
                        </div>
                      )}
                    </div>
                  )
                }}
              />
            </Gantt>
          </div>
        </Card>

        {/* ── Global Gantt Overrides ── */}
        <style jsx global>{`
          .gantt-wrapper {
            --wx-gantt-task-fill-color: #3b82f6;
            --wx-gantt-task-border-color: rgba(59,130,246,0.4);
            --wx-gantt-task-font-color: #ffffff;
            --wx-gantt-project-fill-color: #3b82f6;
            --wx-gantt-milestone-color: #ef4444;
            --wx-gantt-link-color: #94a3b8;
            --wx-gantt-grid-border-color: #e2e8f0;
            --wx-gantt-main-font-family: inherit;
            --wx-gantt-main-color: #475569;
          }

          .wx-header, .wx-scale, .wx-scale-cell {
            background-color: #f8fafc !important;
            color: #475569 !important;
            font-weight: 700;
          }

          .wx-body-cell, .wx-cell {
            color: #334155;
            border-bottom: 1px solid #e2e8f0 !important;
            border-right: 1px solid #e2e8f0 !important;
          }

          .wx-task {
            border-radius: 8px !important;
            overflow: visible !important;
          }

          .wx-task-content {
            font-weight: 600 !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
            font-size: 11px !important;
            padding: 0 12px !important;
            overflow: visible !important;
            white-space: nowrap !important;
            position: absolute;
            z-index: 10;
          }

          .wx-task-progress {
            border-radius: 8px !important;
          }

          .wx-link {
            filter: drop-shadow(0 0 3px rgba(148,163,184,0.5));
          }

          .ant-breadcrumb-separator { color: #cbd5e1 !important; margin: 0 12px; }
        `}</style>
      </div>
    </div>
  )
}

const ProjectGanttPage = () => (
  <ConfigProvider
    theme={{
      algorithm: theme.defaultAlgorithm,
      token: {
        colorPrimary: '#3b82f6',
        borderRadius: 12,
        fontFamily: 'var(--font-sarabun)',
        colorBgBase: '#ffffff',
        colorBorder: '#e2e8f0',
      },
    }}
  >
    <App>
      <GanttPageContent />
    </App>
  </ConfigProvider>
)

export default ProjectGanttPage