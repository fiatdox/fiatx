'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  App, Typography, Breadcrumb, Card, Tag, Select,
  Button, Modal, Form, Input, InputNumber, DatePicker, Space, Table, Drawer,
  Descriptions, Progress, Divider, Popconfirm, Timeline, Empty, Statistic, Row, Col,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  HomeOutlined, FundOutlined, ProjectOutlined, InfoCircleOutlined,
  SyncOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  RiseOutlined, ReloadOutlined, DollarOutlined, FlagOutlined, TeamOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import EChart from '@/app/components/EChart'
import {
  loadTasks, saveTasks, loadLinks, resetAll,
  DEFAULT_TASKS, DEFAULT_LINKS,
  MISSION_OPTIONS, STATUS_OPTIONS, PRIORITY_OPTIONS,
  DEPARTMENT_OPTIONS, KPI_OPTIONS,
  formatTHB, budgetUtilization,
  getProgressColor, getStatusMeta, getMissionMeta, getPriorityMeta,
  type Task, type LinkRow, type TaskType, type Mission, type ProjectStatus,
  type Priority, type ProgressLogEntry,
} from './data'

const { Title, Text } = Typography
const { TextArea } = Input

const DAY = 86400000

type FormShape = {
  type: TaskType
  text: string
  code?: string
  parent?: string
  mission: Mission
  status?: ProjectStatus
  priority?: Priority
  range: [Dayjs, Dayjs]
  progress?: number
  owner?: string
  ownerPosition?: string
  department?: string
  contact?: string
  budgetRequested?: number
  budgetApproved?: number
  budgetSpent?: number
  budgetSource?: string
  kpiCode?: string
  description?: string
  expectedOutcome?: string
  vendor?: string
  riskNote?: string
}

const computeStats = (taskData: Task[]) => {
  const t = taskData.filter(x => x.type !== 'milestone' && typeof x.progress === 'number')
  const done     = t.filter(x => (x.progress ?? 0) >= 100).length
  const notStart = t.filter(x => (x.progress ?? 0) <= 0).length
  const slow     = t.filter(x => (x.progress ?? 0) > 0 && (x.progress ?? 0) < 40).length
  const active   = t.filter(x => (x.progress ?? 0) >= 40 && (x.progress ?? 0) < 100).length
  return { done, notStart, slow, active, total: t.length }
}

const sumBudget = (tasks: Task[]) => {
  const projects = tasks.filter(t => t.type === 'project')
  const requested = projects.reduce((s, p) => s + (p.budgetRequested ?? 0), 0)
  const approved  = projects.reduce((s, p) => s + (p.budgetApproved  ?? 0), 0)
  const spent     = projects.reduce((s, p) => s + (p.budgetSpent     ?? 0), 0)
  return { requested, approved, spent }
}

const newId = () => Math.random().toString(36).slice(2, 10)

const GanttPageContent = () => {
  const { message } = App.useApp()

  const [hydrated, setHydrated] = useState(false)
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS)
  const [links, setLinks] = useState<LinkRow[]>(DEFAULT_LINKS)
  const [selectedMission, setSelectedMission] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Modal/Drawer state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editorType, setEditorType] = useState<TaskType>('project')
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressTargetId, setProgressTargetId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const [form] = Form.useForm<FormShape>()
  const [progressForm] = Form.useForm<{ progress: number; note: string; reportedBy: string; budgetSpentDelta?: number }>()
  const watchedType = Form.useWatch('type', form)

  useEffect(() => {
    setTasks(loadTasks())
    setLinks(loadLinks())
    setHydrated(true)
  }, [])

  const persistTasks = (next: Task[]) => {
    setTasks(next)
    saveTasks(next)
  }

  // ── Filtered data
  const filteredTasks = useMemo(() => {
    let t = tasks
    if (selectedMission !== 'all') t = t.filter(x => x.mission === selectedMission)
    if (selectedStatus !== 'all')  t = t.filter(x => x.status === selectedStatus)
    return t
  }, [tasks, selectedMission, selectedStatus])

  const filteredLinks = useMemo(() => {
    const ids = new Set(filteredTasks.map(t => t.id))
    return links.filter(l => ids.has(l.source) && ids.has(l.target))
  }, [links, filteredTasks])

  const stats = useMemo(() => computeStats(filteredTasks), [filteredTasks])
  const budget = useMemo(() => sumBudget(filteredTasks), [filteredTasks])

  const projectChoices = useMemo(
    () => tasks.filter(t => t.type === 'project').map(t => ({ value: t.id, label: t.text })),
    [tasks]
  )

  // ── Form handlers
  const openCreate = (type: TaskType) => {
    setEditingId(null)
    setEditorType(type)
    form.resetFields()
    form.setFieldsValue({
      type,
      mission: 'admin',
      status: 'draft',
      priority: 'medium',
      progress: type === 'milestone' ? undefined : 0,
      range: [dayjs(), dayjs().add(30, 'day')],
    })
    setEditorOpen(true)
  }

  const openEdit = (id: string) => {
    const t = tasks.find(x => x.id === id)
    if (!t) return
    setEditingId(id)
    setEditorType(t.type)
    form.resetFields()
    form.setFieldsValue({
      type: t.type,
      text: t.text,
      code: t.code,
      parent: t.parent,
      mission: t.mission,
      status: t.status ?? 'draft',
      priority: t.priority ?? 'medium',
      range: [dayjs(t.start), dayjs(t.end)],
      progress: t.progress,
      owner: t.owner,
      ownerPosition: t.ownerPosition,
      department: t.department,
      contact: t.contact,
      budgetRequested: t.budgetRequested,
      budgetApproved: t.budgetApproved,
      budgetSpent: t.budgetSpent,
      budgetSource: t.budgetSource,
      kpiCode: t.kpiCode,
      description: t.description,
      expectedOutcome: t.expectedOutcome,
      vendor: t.vendor,
      riskNote: t.riskNote,
    })
    setEditorOpen(true)
  }

  const submitEditor = async () => {
    const values = await form.validateFields()
    const kpi = KPI_OPTIONS.find(k => k.code === values.kpiCode)
    const start = values.range[0].toISOString()
    const end = (values.type === 'milestone' ? values.range[0] : values.range[1]).toISOString()

    const base: Task = {
      id: editingId ?? newId(),
      text: values.text,
      code: values.code,
      type: values.type,
      parent: values.type === 'project' ? undefined : values.parent,
      mission: values.mission,
      start, end,
      progress: values.type === 'milestone' ? undefined : (values.progress ?? 0),
      status: values.status,
      priority: values.priority,
      owner: values.owner,
      ownerPosition: values.ownerPosition,
      department: values.department,
      contact: values.contact,
      budgetRequested: values.budgetRequested,
      budgetApproved: values.budgetApproved,
      budgetSpent: values.budgetSpent,
      budgetSource: values.budgetSource,
      kpiCode: values.kpiCode,
      kpiName: kpi?.name,
      kpiTarget: kpi?.target,
      description: values.description,
      expectedOutcome: values.expectedOutcome,
      vendor: values.vendor,
      riskNote: values.riskNote,
      progressLog: editingId ? tasks.find(t => t.id === editingId)?.progressLog ?? [] : [],
      documents: editingId ? tasks.find(t => t.id === editingId)?.documents : [],
      team:      editingId ? tasks.find(t => t.id === editingId)?.team : [],
    }

    const next = editingId
      ? tasks.map(t => t.id === editingId ? base : t)
      : [...tasks, base]
    persistTasks(next)
    setEditorOpen(false)
    message.success(editingId ? 'อัปเดตข้อมูลสำเร็จ' : 'เพิ่มรายการสำเร็จ')
  }

  const handleDelete = (id: string) => {
    const next = tasks.filter(t => t.id !== id && t.parent !== id)
    persistTasks(next)
    message.success('ลบรายการเรียบร้อย')
  }

  // ── Progress quick-update
  const openProgress = (id: string) => {
    const t = tasks.find(x => x.id === id)
    if (!t) return
    setProgressTargetId(id)
    progressForm.resetFields()
    progressForm.setFieldsValue({ progress: t.progress ?? 0, note: '', reportedBy: t.owner ?? '' })
    setProgressOpen(true)
  }

  const submitProgress = async () => {
    if (!progressTargetId) return
    const values = await progressForm.validateFields()
    const next = tasks.map(t => {
      if (t.id !== progressTargetId) return t
      const log: ProgressLogEntry = {
        id: newId(),
        date: new Date().toISOString(),
        progress: values.progress,
        note: values.note,
        reportedBy: values.reportedBy,
        budgetSpentDelta: values.budgetSpentDelta,
      }
      return {
        ...t,
        progress: values.progress,
        progressLog: [...(t.progressLog ?? []), log],
        budgetSpent: (t.budgetSpent ?? 0) + (values.budgetSpentDelta ?? 0),
      }
    })
    persistTasks(next)
    setProgressOpen(false)
    message.success('บันทึกความคืบหน้าเรียบร้อย')
  }

  // ── Detail drawer
  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }
  const detailTask = tasks.find(t => t.id === detailId)

  // ── Reset
  const handleReset = () => {
    Modal.confirm({
      title: 'รีเซ็ตข้อมูลทั้งหมด?',
      content: 'จะคืนค่าเป็นข้อมูลตัวอย่าง — ข้อมูลที่แก้ไขจะถูกลบ',
      okText: 'รีเซ็ต', okButtonProps: { danger: true }, cancelText: 'ยกเลิก',
      onOk: () => {
        resetAll()
        setTasks(DEFAULT_TASKS)
        setLinks(DEFAULT_LINKS)
        message.success('รีเซ็ตเรียบร้อย')
      },
    })
  }

  // ──────────────────────────────────────────────────────────────────────
  // ECharts Gantt option
  // ──────────────────────────────────────────────────────────────────────
  const ganttOption = useMemo(() => {
    const ordered = filteredTasks
    if (!ordered.length) {
      return { backgroundColor: 'transparent', title: { text: 'ไม่มีข้อมูล', textStyle: { color: 'var(--app-text-2)' }, left: 'center', top: 'middle' } }
    }
    const categories = ordered.map(t => t.text)
    const idToIdx = new Map(ordered.map((t, i) => [t.id, i]))

    const minTime = Math.min(...ordered.map(t => new Date(t.start).getTime()))
    const maxTime = Math.max(...ordered.map(t => new Date(t.end).getTime()))

    const barData = ordered.map((t, i) => ({
      value: [
        i,
        new Date(t.start).getTime(),
        new Date(t.end).getTime(),
        t.progress ?? 0,
        t.type,
        t.text,
        t.id,
      ],
    }))

    const linkData = filteredLinks.map(l => {
      const src = ordered.find(t => t.id === l.source)
      const tgt = ordered.find(t => t.id === l.target)
      if (!src || !tgt) return null
      return {
        value: [
          idToIdx.get(l.source),
          new Date(src.end).getTime(),
          idToIdx.get(l.target),
          new Date(tgt.start).getTime(),
        ],
      }
    }).filter(Boolean) as { value: number[] }[]

    return {
      backgroundColor: 'transparent',
      animationDuration: 600,
      grid: { top: 60, bottom: 30, left: 320, right: 30 },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.96)',
        borderColor: 'rgba(148,163,184,0.3)',
        borderWidth: 1,
        textStyle: { color: 'var(--app-text)' },
        formatter: (p: { seriesName: string; value?: (string | number)[] }) => {
          if (p.seriesName !== 'tasks' || !p.value) return ''
          const [, s, e, prog, type, text] = p.value as [number, number, number, number, TaskType, string, string]
          const start = new Date(s).toLocaleDateString('th-TH', { dateStyle: 'medium' })
          const end   = new Date(e).toLocaleDateString('th-TH', { dateStyle: 'medium' })
          if (type === 'milestone') {
            return `
              <div style="font-weight:700;color:#f8fafc">${text}</div>
              <div style="color:#fca5a5;font-size:11px">📍 Milestone — ${start}</div>
            `
          }
          const c = getProgressColor(prog)
          return `
            <div style="font-weight:700;margin-bottom:6px;color:#f8fafc">${text}</div>
            <div style="font-size:11px;color:#94a3b8">เริ่ม: <b style="color:#cbd5e1">${start}</b></div>
            <div style="font-size:11px;color:#94a3b8">สิ้นสุด: <b style="color:#cbd5e1">${end}</b></div>
            <div style="margin-top:6px;color:${c.fill};font-weight:700">ความคืบหน้า ${prog}% — ${c.label}</div>
          `
        },
      },
      xAxis: {
        type: 'time', position: 'top',
        min: minTime - DAY * 7, max: maxTime + DAY * 7,
        splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.12)' } },
        axisLine: { lineStyle: { color: 'var(--app-text-3)' } },
        axisLabel: { color: 'var(--app-text-2)', fontSize: 11, fontWeight: 600 },
      },
      yAxis: {
        type: 'category', data: categories, inverse: true,
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.06)' } },
        axisLabel: {
          color: 'var(--app-text)', fontSize: 12, width: 300, overflow: 'truncate',
          formatter: (v: string, i: number) => {
            const t = ordered[i]
            if (t.type === 'project')   return `{p|■} ${v}`
            if (t.type === 'milestone') return `{m|◆} ${v}`
            return `   {s|·} ${v}`
          },
          rich: {
            p: { color: '#a855f7', fontSize: 14, fontWeight: 700 },
            m: { color: '#ef4444', fontSize: 14, fontWeight: 700 },
            s: { color: 'var(--app-text-3)', fontSize: 12 },
          },
        },
      },
      series: [
        {
          name: 'links', type: 'custom', z: 1, silent: true,
          renderItem: (_p: unknown, api: { value: (i: number) => number; coord: (v: [number, number]) => [number, number] }) => {
            const p1 = api.coord([api.value(1), api.value(0)])
            const p2 = api.coord([api.value(3), api.value(2)])
            const elbow = p1[0] + 12
            return {
              type: 'polyline',
              shape: { points: [[p1[0], p1[1]], [elbow, p1[1]], [elbow, p2[1]], [p2[0] - 4, p2[1]]] },
              style: { stroke: 'rgba(148,163,184,0.55)', lineWidth: 1.2, lineDash: [3, 3], fill: 'transparent' },
            }
          },
          encode: { x: [1, 3], y: [0, 2] },
          data: linkData,
        },
        {
          name: 'tasks', type: 'custom', z: 2,
          renderItem: (
            _p: unknown,
            api: {
              value: (i: number) => string | number
              coord: (v: [number, number]) => [number, number]
              size: (v: [number, number]) => [number, number]
            }
          ) => {
            const catIdx = api.value(0) as number
            const start = api.coord([api.value(1) as number, catIdx])
            const end   = api.coord([api.value(2) as number, catIdx])
            const progress = api.value(3) as number
            const type = api.value(4) as TaskType
            const cellH = api.size([0, 1])[1]
            const barH = cellH * 0.55

            if (type === 'milestone') {
              const r = Math.min(barH * 0.75, 18)
              return {
                type: 'polygon',
                shape: { points: [[start[0], start[1] - r], [start[0] + r, start[1]], [start[0], start[1] + r], [start[0] - r, start[1]]] },
                style: { fill: '#ef4444', stroke: '#fecaca', lineWidth: 2, shadowBlur: 12, shadowColor: 'rgba(239,68,68,0.55)' },
              }
            }

            const c = getProgressColor(progress)
            const isProject = type === 'project'
            const baseColor = isProject ? '#a855f7' : c.fill
            const x = start[0]
            const y = start[1] - barH / 2
            const w = Math.max(end[0] - start[0], 2)
            const progW = (w * progress) / 100

            const children: unknown[] = [
              { type: 'rect', shape: { x, y, width: w, height: barH, r: 4 }, style: { fill: 'rgba(148,163,184,0.18)', stroke: baseColor + '99', lineWidth: 1 } },
              { type: 'rect', shape: { x, y, width: progW, height: barH, r: 4 }, style: { fill: baseColor, shadowBlur: 10, shadowColor: baseColor + '70' } },
              { type: 'rect', shape: { x, y, width: w, height: barH, r: 4 }, style: { fill: 'transparent', stroke: baseColor, lineWidth: isProject ? 2 : 1.4 } },
            ]
            if (w > 70) {
              children.push({
                type: 'text',
                style: {
                  x: x + 8, y: start[1], text: `${progress}%`,
                  fill: '#ffffff', fontSize: 10, fontWeight: 700,
                  textVerticalAlign: 'middle', textShadowBlur: 3, textShadowColor: 'rgba(0,0,0,0.5)',
                },
              })
            }
            return { type: 'group', children }
          },
          encode: { x: [1, 2], y: 0 },
          data: barData,
          markLine: {
            silent: true, symbol: 'none',
            label: { show: true, formatter: 'Today', color: '#fbbf24', fontSize: 10, fontWeight: 700, position: 'insideEndTop' },
            lineStyle: { color: '#fbbf24', width: 1.5, type: 'dashed' },
            data: [{ xAxis: Date.now() }],
          },
        },
      ],
    }
  }, [filteredTasks, filteredLinks])

  const heightPx = Math.max(420, filteredTasks.length * 38 + 100)

  // ──────────────────────────────────────────────────────────────────────
  // Table columns
  // ──────────────────────────────────────────────────────────────────────
  const columns: ColumnsType<Task> = [
    {
      title: 'รหัส', dataIndex: 'code', width: 130,
      render: (v?: string) => v ? <Text style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'รายการ', dataIndex: 'text',
      render: (_: string, r: Task) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color={r.type === 'project' ? 'purple' : r.type === 'milestone' ? 'red' : 'blue'} style={{ margin: 0 }}>
              {r.type === 'project' ? 'โครงการ' : r.type === 'milestone' ? 'Milestone' : 'กิจกรรม'}
            </Tag>
            <Text style={{ color: 'var(--app-text)', fontWeight: 600 }}>{r.text}</Text>
          </div>
          {r.kpiCode && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              <FlagOutlined /> {r.kpiCode} · {r.kpiName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'ผู้รับผิดชอบ', width: 200,
      render: (_, r) => (
        <div>
          <div style={{ color: 'var(--app-text)' }}>{r.owner ?? '-'}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.department ?? ''}</Text>
        </div>
      ),
    },
    {
      title: 'สถานะ', dataIndex: 'status', width: 130,
      render: (v?: ProjectStatus) => {
        const m = getStatusMeta(v)
        return <Tag color={m.color}>{m.label}</Tag>
      },
    },
    {
      title: 'งบ (อนุมัติ/เบิก)', width: 200, align: 'right' as const,
      render: (_, r) => {
        if (r.type !== 'project') return <Text type="secondary">-</Text>
        const pct = budgetUtilization(r.budgetSpent, r.budgetApproved)
        return (
          <div>
            <div style={{ color: 'var(--app-text)', fontSize: 12 }}>{formatTHB(r.budgetApproved)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Progress percent={pct} size="small" showInfo={false} strokeColor={pct > 90 ? '#ef4444' : '#3b82f6'} style={{ flex: 1, margin: 0 }} />
              <Text style={{ fontSize: 11, color: 'var(--app-text-2)', minWidth: 36, textAlign: 'right' }}>{pct}%</Text>
            </div>
          </div>
        )
      },
    },
    {
      title: 'ความคืบหน้า', dataIndex: 'progress', width: 160,
      render: (v: number | undefined, r) => {
        if (r.type === 'milestone') return <Tag color="red">Milestone</Tag>
        const pct = v ?? 0
        const c = getProgressColor(pct)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Progress percent={pct} size="small" showInfo={false} strokeColor={c.fill} style={{ flex: 1, margin: 0 }} />
            <Text strong style={{ color: c.fill, minWidth: 36 }}>{pct}%</Text>
          </div>
        )
      },
    },
    {
      title: 'การจัดการ', width: 200, align: 'center' as const, fixed: 'right' as const,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)} />
          <Button size="small" icon={<RiseOutlined />} onClick={() => openProgress(r.id)} disabled={r.type === 'milestone'} />
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r.id)} />
          <Popconfirm title="ลบรายการนี้?" description="หากลบโครงการ กิจกรรมในโครงการจะถูกลบด้วย" onConfirm={() => handleDelete(r.id)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text">
        <Navbar />
        <div className="p-6 md:p-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text pb-12 relative overflow-hidden">
      <Navbar />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[10%] left-[-8%] w-[28%] h-[28%] bg-blue-500/15 blur-[140px] rounded-full" />
        <div className="absolute bottom-[8%] right-[-6%] w-[30%] h-[30%] bg-emerald-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-[55%] left-[40%] w-[22%] h-[22%] bg-purple-500/15 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-10 w-full">

        {/* ── Header ── */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { href: '/', title: <span className="text-app-text-2 hover:text-blue-400 transition-colors"><HomeOutlined /> หน้าหลัก</span> },
              { title: <span className="text-app-text-2"><FundOutlined /> งานยุทธศาสตร์</span> },
              { title: <span className="text-app-text font-bold">Project Roadmap</span> },
            ]}
            className="mb-4 text-xs uppercase tracking-tighter"
          />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl shadow-[0_0_24px_rgba(59,130,246,0.45)]">
                <ProjectOutlined />
              </div>
              <div>
                <Title level={2} style={{ color: 'var(--app-text)', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }} className="uppercase">
                  Hospital Roadmaps 2026
                </Title>
                <Text className="text-app-text-2 text-sm">แผนยุทธศาสตร์โครงการ ประจำปีงบประมาณ 2569 — โรงพยาบาลขนาดใหญ่</Text>
              </div>
            </div>

            <Space wrap>
              <Button icon={<PlusOutlined />} type="primary" onClick={() => openCreate('project')}>เพิ่มโครงการ</Button>
              <Button icon={<PlusOutlined />} onClick={() => openCreate('task')}>เพิ่มกิจกรรม</Button>
              <Button icon={<PlusOutlined />} onClick={() => openCreate('milestone')}>เพิ่ม Milestone</Button>
              <Button icon={<ReloadOutlined />} danger onClick={handleReset}>รีเซ็ตข้อมูล</Button>
            </Space>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} md={6}>
            <Card variant="borderless" className="bg-app-surface/60 border border-app-border">
              <Statistic title={<span className="text-app-text-2">โครงการทั้งหมด</span>}
                value={filteredTasks.filter(t => t.type === 'project').length}
                prefix={<ProjectOutlined style={{ color: '#a855f7' }} />}
                styles={{ content: { color: '#a855f7', fontWeight: 800 } }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card variant="borderless" className="bg-app-surface/60 border border-app-border">
              <Statistic title={<span className="text-app-text-2">งบที่อนุมัติ (รวม)</span>}
                value={budget.approved} suffix="฿"
                prefix={<DollarOutlined style={{ color: '#22c55e' }} />}
                styles={{ content: { color: '#22c55e', fontWeight: 800, fontSize: 22 } }}
                formatter={(v) => Number(v).toLocaleString('th-TH')}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card variant="borderless" className="bg-app-surface/60 border border-app-border">
              <Statistic title={<span className="text-app-text-2">เบิกจ่ายแล้ว</span>}
                value={budget.spent} suffix="฿"
                prefix={<DollarOutlined style={{ color: '#3b82f6' }} />}
                styles={{ content: { color: '#3b82f6', fontWeight: 800, fontSize: 22 } }}
                formatter={(v) => Number(v).toLocaleString('th-TH')}
              />
              <Progress percent={budgetUtilization(budget.spent, budget.approved)} size="small" showInfo={false} strokeColor="#3b82f6" />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card variant="borderless" className="bg-app-surface/60 border border-app-border">
              <Statistic title={<span className="text-app-text-2">% เสร็จสิ้น</span>}
                value={stats.total ? Math.round((stats.done / stats.total) * 100) : 0} suffix="%"
                prefix={<RiseOutlined style={{ color: '#10b981' }} />}
                styles={{ content: { color: '#10b981', fontWeight: 800 } }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>{stats.done} / {stats.total} กิจกรรม</Text>
            </Card>
          </Col>
        </Row>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-app-surface/60 border border-app-border rounded-xl backdrop-blur-sm items-center shadow-lg">
          <Tag icon={<SyncOutlined spin />} className="font-bold border-0" color="processing">ECharts Gantt</Tag>
          <div className="h-4 w-px bg-app-surface mx-1 hidden sm:block" />

          <Select
            value={selectedMission} onChange={setSelectedMission}
            options={[{ value: 'all', label: '🟢 ทุกกลุ่มภารกิจ' }, ...MISSION_OPTIONS.map(m => ({ value: m.value, label: m.label }))]}
            className="w-full sm:w-[280px]" popupMatchSelectWidth={false}
          />

          <Select
            value={selectedStatus} onChange={setSelectedStatus}
            options={[{ value: 'all', label: 'ทุกสถานะ' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))]}
            className="w-full sm:w-[180px]" popupMatchSelectWidth={false}
          />

          <div className="ml-auto flex items-center gap-2 text-app-text-2 bg-app-surface/60 px-3 py-1.5 rounded-full text-[10px] border border-app-border">
            <InfoCircleOutlined />
            <span>ใช้ตารางด้านล่างเพื่อแก้ไข / อัปเดตความคืบหน้า / ดูรายละเอียดเต็ม</span>
          </div>
        </div>

        {/* ── Gantt ── */}
        <Card variant="borderless" className="bg-app-surface/50 border border-app-border backdrop-blur-md rounded-2xl shadow-2xl mb-6"
          styles={{ body: { padding: 12 } }}>
          <EChart option={ganttOption} height={heightPx} />
        </Card>

        {/* ── Table ── */}
        <Card variant="borderless" className="bg-app-surface/50 border border-app-border backdrop-blur-md rounded-2xl shadow-2xl"
          title={<span className="text-app-text font-bold"><FileTextOutlined /> รายการโครงการและกิจกรรม</span>}
          styles={{ body: { padding: 12 } }}>
          <Table<Task>
            columns={columns}
            dataSource={filteredTasks}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: <Empty description="ไม่มีข้อมูล" /> }}
          />
        </Card>

        <style jsx global>{`
          .ant-breadcrumb-separator { color: var(--app-text-3) !important; margin: 0 12px; }
        `}</style>
      </div>

      {/* ═════════════ Modal: Create / Edit ═════════════ */}
      <Modal
        title={
          <span>
            {editingId ? <EditOutlined /> : <PlusOutlined />}{' '}
            {editingId ? 'แก้ไข' : 'เพิ่ม'} {editorType === 'project' ? 'โครงการ' : editorType === 'milestone' ? 'Milestone' : 'กิจกรรม'}
          </span>
        }
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={submitEditor}
        okText="บันทึก" cancelText="ยกเลิก"
        width={880} destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="ประเภท" name="type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'project',   label: 'โครงการ' },
                    { value: 'task',      label: 'กิจกรรม' },
                    { value: 'milestone', label: 'Milestone' },
                  ]}
                  onChange={(v) => setEditorType(v)}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="รหัส" name="code">
                <Input placeholder="HOS-2026-XXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ชื่อรายการ" name="text" rules={[{ required: true, message: 'กรุณาระบุชื่อ' }]}>
                <Input placeholder="ชื่อโครงการ / กิจกรรม / Milestone" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="กลุ่มภารกิจ" name="mission" rules={[{ required: true }]}>
                <Select options={MISSION_OPTIONS.map(m => ({ value: m.value, label: m.label }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              {watchedType !== 'project' && (
                <Form.Item label="โครงการแม่ (Parent)" name="parent" rules={[{ required: true, message: 'กรุณาเลือกโครงการ' }]}>
                  <Select options={projectChoices} placeholder="เลือกโครงการ" />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={watchedType === 'milestone' ? 24 : 12}>
              <Form.Item
                label={watchedType === 'milestone' ? 'วันที่ Milestone' : 'ช่วงเวลาดำเนินการ'}
                name="range" rules={[{ required: true }]}
              >
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            {watchedType !== 'milestone' && (
              <Col span={12}>
                <Form.Item label="ความคืบหน้า (%)" name="progress">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Divider style={{ margin: '8px 0 16px' }}>ผู้รับผิดชอบ</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="ผู้รับผิดชอบหลัก" name="owner">
                <Input prefix={<TeamOutlined />} placeholder="ชื่อ-นามสกุล" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ตำแหน่ง" name="ownerPosition">
                <Input placeholder="ตำแหน่ง" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="เบอร์ติดต่อ" name="contact">
                <Input placeholder="เบอร์โทร / อีเมล" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="กลุ่มงาน / หน่วยงาน" name="department">
                <Select showSearch options={DEPARTMENT_OPTIONS.map(d => ({ value: d, label: d }))} placeholder="เลือกกลุ่มงาน" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="สถานะ" name="status">
                <Select options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="ลำดับความสำคัญ" name="priority">
                <Select options={PRIORITY_OPTIONS.map(p => ({ value: p.value, label: p.label }))} />
              </Form.Item>
            </Col>
          </Row>

          {watchedType === 'project' && (
            <>
              <Divider style={{ margin: '8px 0 16px' }}>งบประมาณ</Divider>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="งบที่ขอ (บาท)" name="budgetRequested">
                    <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="งบที่อนุมัติ" name="budgetApproved">
                    <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="เบิกจ่ายแล้ว" name="budgetSpent">
                    <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="แหล่งเงิน" name="budgetSource">
                    <Input placeholder="เช่น งบ 2569 / เงินบำรุง" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '8px 0 16px' }}>ตัวชี้วัด (KPI)</Divider>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item label="KPI ที่เกี่ยวข้อง" name="kpiCode">
                    <Select
                      allowClear placeholder="เลือก KPI ที่โครงการนี้สนับสนุน"
                      options={KPI_OPTIONS.map(k => ({ value: k.code, label: `${k.code} — ${k.name} (เป้า ${k.target})` }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Divider style={{ margin: '8px 0 16px' }}>รายละเอียด</Divider>
          <Form.Item label="คำอธิบาย" name="description">
            <TextArea rows={2} placeholder="คำอธิบายโครงการ / ขอบเขต" />
          </Form.Item>
          {watchedType === 'project' && (
            <Form.Item label="ผลลัพธ์ที่คาดหวัง" name="expectedOutcome">
              <TextArea rows={2} placeholder="ผลลัพธ์ / Outcome ที่คาดว่าจะได้" />
            </Form.Item>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ผู้รับจ้าง / Vendor" name="vendor">
                <Input placeholder="ชื่อบริษัท (ถ้ามี)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ความเสี่ยง / อุปสรรค" name="riskNote">
                <Input placeholder="ปัญหาที่พบ" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ═════════════ Modal: Quick Progress Update ═════════════ */}
      <Modal
        title={<><RiseOutlined /> บันทึกความคืบหน้า</>}
        open={progressOpen} onCancel={() => setProgressOpen(false)} onOk={submitProgress}
        okText="บันทึก" cancelText="ยกเลิก" destroyOnHidden
      >
        <Form form={progressForm} layout="vertical" className="mt-2">
          <Form.Item label="% ความคืบหน้า ณ ปัจจุบัน" name="progress" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="งบที่เบิกเพิ่ม (บาท)" name="budgetSpentDelta" tooltip="จะถูกบวกเข้ายอดเบิกจ่ายของโครงการ (เว้นว่างได้)">
            <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item label="หมายเหตุ / ผลการดำเนินงาน" name="note" rules={[{ required: true, message: 'กรุณาระบุหมายเหตุ' }]}>
            <TextArea rows={3} placeholder="ผลการดำเนินงาน / สิ่งที่เสร็จในรอบนี้" />
          </Form.Item>
          <Form.Item label="รายงานโดย" name="reportedBy" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* ═════════════ Drawer: Detail ═════════════ */}
      <Drawer
        title={detailTask ? <span><FileTextOutlined /> {detailTask.text}</span> : 'รายละเอียด'}
        open={detailOpen} onClose={() => setDetailOpen(false)} size={680}
        extra={
          detailTask ? (
            <Space>
              <Button icon={<RiseOutlined />} onClick={() => { setDetailOpen(false); openProgress(detailTask.id) }} disabled={detailTask.type === 'milestone'}>อัปเดต</Button>
              <Button icon={<EditOutlined />} type="primary" onClick={() => { setDetailOpen(false); openEdit(detailTask.id) }}>แก้ไข</Button>
            </Space>
          ) : null
        }
      >
        {detailTask && (
          <>
            <Space wrap className="mb-4">
              {detailTask.code && <Tag color="blue">{detailTask.code}</Tag>}
              <Tag color={getMissionMeta(detailTask.mission).value === 'admin' ? 'purple' : 'cyan'}>{getMissionMeta(detailTask.mission).label}</Tag>
              <Tag color={getStatusMeta(detailTask.status).color}>{getStatusMeta(detailTask.status).label}</Tag>
              <Tag color={getPriorityMeta(detailTask.priority).color}>ลำดับความสำคัญ: {getPriorityMeta(detailTask.priority).label}</Tag>
            </Space>

            {detailTask.type !== 'milestone' && (
              <Card variant="borderless" className="mb-4 bg-app-surface/40">
                <div className="flex items-center justify-between mb-2">
                  <Text strong>ความคืบหน้าโดยรวม</Text>
                  <Text strong style={{ color: getProgressColor(detailTask.progress ?? 0).fill, fontSize: 22 }}>
                    {detailTask.progress ?? 0}%
                  </Text>
                </div>
                <Progress percent={detailTask.progress ?? 0} strokeColor={getProgressColor(detailTask.progress ?? 0).fill} />
              </Card>
            )}

            <Descriptions bordered column={1} size="small" labelStyle={{ width: 160, fontWeight: 600 }}>
              <Descriptions.Item label="ผู้รับผิดชอบ">
                {detailTask.owner ?? '-'} {detailTask.ownerPosition && <Text type="secondary">— {detailTask.ownerPosition}</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="กลุ่มงาน">{detailTask.department ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="ติดต่อ">{detailTask.contact ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="ระยะเวลา">
                {dayjs(detailTask.start).format('DD/MM/YYYY')}
                {detailTask.type !== 'milestone' && ` — ${dayjs(detailTask.end).format('DD/MM/YYYY')}`}
              </Descriptions.Item>
              {detailTask.kpiCode && (
                <Descriptions.Item label="KPI">
                  <Tag color="gold">{detailTask.kpiCode}</Tag> {detailTask.kpiName}<br/>
                  <Text type="secondary">เป้าหมาย: {detailTask.kpiTarget}</Text>
                </Descriptions.Item>
              )}
              {detailTask.type === 'project' && (
                <>
                  <Descriptions.Item label="งบที่ขอ">{formatTHB(detailTask.budgetRequested)}</Descriptions.Item>
                  <Descriptions.Item label="งบที่อนุมัติ">{formatTHB(detailTask.budgetApproved)}</Descriptions.Item>
                  <Descriptions.Item label="เบิกจ่ายแล้ว">
                    <div className="flex items-center gap-2">
                      <span>{formatTHB(detailTask.budgetSpent)}</span>
                      <Tag color={budgetUtilization(detailTask.budgetSpent, detailTask.budgetApproved) > 90 ? 'red' : 'blue'}>
                        {budgetUtilization(detailTask.budgetSpent, detailTask.budgetApproved)}%
                      </Tag>
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="แหล่งเงิน">{detailTask.budgetSource ?? '-'}</Descriptions.Item>
                </>
              )}
              {detailTask.vendor && <Descriptions.Item label="ผู้รับจ้าง">{detailTask.vendor}</Descriptions.Item>}
              {detailTask.description && <Descriptions.Item label="คำอธิบาย">{detailTask.description}</Descriptions.Item>}
              {detailTask.expectedOutcome && <Descriptions.Item label="ผลลัพธ์ที่คาดหวัง">{detailTask.expectedOutcome}</Descriptions.Item>}
              {detailTask.riskNote && <Descriptions.Item label="ความเสี่ยง"><Text type="warning">{detailTask.riskNote}</Text></Descriptions.Item>}
              {detailTask.team?.length ? <Descriptions.Item label="ทีมงาน">{detailTask.team.join(', ')}</Descriptions.Item> : null}
              {detailTask.documents?.length ? (
                <Descriptions.Item label="เอกสารแนบ">
                  {detailTask.documents.map(d => <Tag key={d} icon={<FileTextOutlined />}>{d}</Tag>)}
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            {detailTask.progressLog?.length ? (
              <>
                <Divider>ประวัติการอัปเดตความคืบหน้า</Divider>
                <Timeline
                  items={detailTask.progressLog.map(log => ({
                    color: getProgressColor(log.progress).fill,
                    children: (
                      <div>
                        <div className="flex justify-between">
                          <Text strong>{dayjs(log.date).format('DD MMM YYYY')}</Text>
                          <Tag color={getProgressColor(log.progress).tagColor}>{log.progress}%</Tag>
                        </div>
                        <div style={{ color: 'var(--app-text-2)' }}>{log.note}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          โดย {log.reportedBy}
                          {log.budgetSpentDelta ? ` · เบิก ${formatTHB(log.budgetSpentDelta)}` : ''}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              </>
            ) : null}
          </>
        )}
      </Drawer>
    </div>
  )
}

const ProjectGanttPage = () => (
  <AppThemeProvider colorPrimary="#3b82f6">
      <GanttPageContent />
    </AppThemeProvider>
)

export default ProjectGanttPage
