'use client'
// ประเมินความเสี่ยงทรัพย์สินงาน IT (Asset Risk Assessment) — โอกาสเกิด × ผลกระทบ (5×5) รายครุภัณฑ์คอมพิวเตอร์
// ครุภัณฑ์: GET /api/v1/it/assets (ทะเบียน V3 + V2) · ผลประเมิน: /api/v1/it/asset-risks (เพิ่มแถวทุกครั้ง แถวล่าสุด = ผลปัจจุบัน)
// ครุภัณฑ์ที่ยังไม่ประเมิน แสดง "ค่าที่ระบบเสนอ" จากอายุใช้งาน ประวัติซ่อม ชนิดอุปกรณ์ และหน่วยงาน (suggestRisk) — ใช้จัดลำดับว่าควรประเมินอะไรก่อน
// ระดับ: 1–3 ต่ำ · 4–8 ปานกลาง · 9–14 สูง · 15–25 สูงมาก · ไม่ยอมรับความเสี่ยงต้องมีแผนจัดการ · สูงมากยอมรับไม่ได้ (backend ตรวจซ้ำ)
// เฉพาะเจ้าหน้าที่ IT (menuAccess + proxy.ts + backend requireRoles)
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Checkbox, Col, ConfigProvider, DatePicker, Empty, Form, Input, Modal, Progress, Result, Row, Segmented, Select, Space, Table, Tag, Timeline, Tooltip, Typography, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ClearOutlined, HomeOutlined, ReloadOutlined, SearchOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, AlertOutlined } from '@ant-design/icons'
import { FaFileExcel, FaMicrochip, FaShieldAlt } from 'react-icons/fa'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import EChart from '@/app/components/EChart'
import { StatCard } from '@/app/components/StatCard'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { PALETTES } from '@/app/lib/chartKit'
import {
  AGE_LABEL, AGE_TAG, DEFAULT_THREATS, IMPACT_LABEL, KIND_LABEL, LEVEL_COLOR, LEVEL_LABEL, LIKELIHOOD_LABEL, RISK_LEVELS, SOURCE_LABEL, THREATS, THREAT_LABEL, TREATMENTS, TREATMENT_LABEL,
  ageState, ageText, ageYears, levelOf, lifeEnd, suggestRisk, thDate, type AgeState, type Asset, type Kind, type RiskLevel, type RiskRow,
} from '../assetShared'

const { Title, Text } = Typography

interface Item {
  asset: Asset; risk: RiskRow | null; likelihood: number; impact: number; score: number; level: RiskLevel
  suggested: ReturnType<typeof suggestRisk>; overdue: boolean; reviewDue: boolean
  age: number | null; ageSt: AgeState
}
const todayStr = dayjs().format('YYYY-MM-DD')
const levelTag = (level: RiskLevel, score: number) => <Tag color={RISK_LEVELS.find(l => l.key === level)!.tag} style={{ margin: 0, fontWeight: 600 }}>{score} · {LEVEL_LABEL[level]}</Tag>
const ageTag = (st: AgeState) => <Tag color={AGE_TAG[st]} style={{ margin: 0, fontSize: 11.5 }}>{AGE_LABEL[st]}</Tag>
const lifeEndText = (a: Asset) => { const e = lifeEnd(a); return e ? e.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' }

// ── อายุครุภัณฑ์ ใช้ประกอบการตัดสินใจ (โอกาสเกิด / จัดหาทดแทน) ──
const AgePanel = ({ item }: { item: Item }) => {
  const { asset: a, age, ageSt } = item
  const pct = age != null && a.life_years ? Math.round((age / a.life_years) * 100) : null
  const remain = age != null && a.life_years ? a.life_years - age : null
  const color = { expired: '#dc2626', soon: '#ea580c', ok: '#16a34a', unknown: '#94a3b8' }[ageSt]
  const cell = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
    <Col xs={12} md={6}><Text type="secondary" style={{ fontSize: 12 }}>{label}</Text><div style={{ fontWeight: 600 }}>{value}</div>{sub && <div style={{ fontSize: 12 }}>{sub}</div>}</Col>)
  return (
    <div data-testid="age-panel" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--app-border-strong)', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><b>อายุครุภัณฑ์</b>{ageTag(ageSt)}</div>
      <Row gutter={[12, 8]}>
        {cell('ใช้งานมาแล้ว', ageText(age), <Text type="secondary">ได้รับ {thDate(a.receive)}{a.fy ? ` · ปีงบ ${a.fy}` : ''}</Text>)}
        {cell('อายุการใช้งานตามทะเบียน', a.life_years ? `${a.life_years} ปี` : 'ไม่ระบุ')}
        {cell(remain != null && remain < 0 ? 'ครบอายุเมื่อ' : 'ครบอายุ', lifeEndText(a),
          remain == null ? undefined : remain < 0 ? <Text type="danger">เกินมาแล้ว {ageText(-remain)}</Text> : <Text type="secondary">เหลืออีก {ageText(remain)}</Text>)}
        {cell('ประวัติแจ้งซ่อม', `${a.repairs.toLocaleString('th-TH')} ครั้ง`,
          a.open_repairs ? <Text type="warning">ค้างซ่อม {a.open_repairs} รายการ</Text> : a.last_repair ? <Text type="secondary">ล่าสุด {thDate(a.last_repair)}</Text> : undefined)}
      </Row>
      {pct != null && <Tooltip title={`ใช้ไปแล้ว ${pct}% ของอายุการใช้งาน`}>
        <Progress percent={Math.min(100, pct)} format={() => <span style={{ color }}>{pct}%</span>} status={ageSt === 'expired' ? 'exception' : 'normal'} strokeColor={color} size="small" style={{ margin: '8px 0 0' }} aria-label="สัดส่วนอายุที่ใช้ไป" />
      </Tooltip>}
    </div>
  )
}

// ── หน้าต่างประเมิน ──
const AssessModal = ({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<RiskRow[] | null>(null)
  const { asset: a, risk: r, suggested: sg } = item
  const L = Form.useWatch('likelihood', form) ?? item.likelihood
  const I = Form.useWatch('impact', form) ?? item.impact
  const treatment = Form.useWatch('treatment', form)
  useEffect(() => {
    fetch(`/api/v1/it/asset-risks/history?asset_key=${encodeURIComponent(a.key)}`).then(x => x.json()).then(j => setHistory(j.success ? j.data : [])).catch(() => setHistory([]))
  }, [a.key])
  const initial = {
    likelihood: r?.likelihood ?? sg.likelihood, impact: r?.impact ?? sg.impact,
    threats: r?.threats ?? DEFAULT_THREATS[a.kind], controls: r?.controls ?? '', treatment: r?.treatment ?? (sg.likelihood * sg.impact >= 9 ? (a.status_group === 'repair' || sg.likelihood >= 3 ? 'replace' : 'mitigate') : 'accept'),
    treatment_plan: r?.treatment_plan ?? '', owner_name: r?.owner_name ?? '', notes: r?.notes ?? '',
    due_date: r?.due_date ? dayjs(r.due_date) : null, next_review: r?.next_review ? dayjs(r.next_review) : dayjs().add(1, 'year'),
  }
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const res = await fetch('/api/v1/it/asset-risks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_key: a.key, asset_name: a.name, asset_kind: a.kind, department: a.department,
          likelihood: v.likelihood, impact: v.impact, suggested_likelihood: sg.likelihood, suggested_impact: sg.impact,
          threats: v.threats ?? [], controls: v.controls, treatment: v.treatment, treatment_plan: v.treatment_plan, owner_name: v.owner_name, notes: v.notes,
          due_date: v.due_date ? v.due_date.format('YYYY-MM-DD') : null, next_review: v.next_review ? v.next_review.format('YYYY-MM-DD') : null,
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) {
        if (j.field) form.setFields([{ name: j.field, errors: [j.message] }])
        throw new Error(j.message || 'บันทึกไม่สำเร็จ')
      }
      message.success(`บันทึกผลประเมิน ${a.noid} แล้ว (คะแนน ${j.data.score})`)
      onSaved()
    } catch (e) { message.error((e as Error).message) } finally { setSaving(false) }
  }
  const scale = (labels: string[]) => [1, 2, 3, 4, 5].map(n => ({ value: n, label: <Tooltip title={labels[n]}><span style={{ padding: '0 6px' }}>{n}</span></Tooltip> }))
  return (
    <Modal open title={<span><FaShieldAlt style={{ marginRight: 8, color: '#dc2626' }} />ประเมินความเสี่ยง {a.noid}</span>} onCancel={onClose} onOk={save} okText="บันทึกผลประเมิน" cancelText="ยกเลิก"
      confirmLoading={saving} width={760} destroyOnHidden>
      <div style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--app-bg)', marginBottom: 12, fontSize: 13 }}>
        <b>{a.name ?? '-'}</b>{a.model ? ` · ${a.model}` : ''}<br />
        <Text type="secondary">{KIND_LABEL[a.kind]} · {a.department ?? 'ไม่ระบุหน่วยงาน'} · {SOURCE_LABEL[a.source]} · สถานะ {a.status ?? '-'}</Text>
      </div>
      <AgePanel item={item} />
      <Alert type="info" showIcon style={{ marginBottom: 12 }} title={<>ระบบเสนอ: โอกาส <b>{sg.likelihood}</b> × ผลกระทบ <b>{sg.impact}</b> = <b>{sg.likelihood * sg.impact}</b> ({LEVEL_LABEL[levelOf(sg.likelihood * sg.impact)]})</>}
        description={<ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>{[...sg.likelihoodReasons.map(x => `โอกาส: ${x}`), ...sg.impactReasons.map(x => `ผลกระทบ: ${x}`)].map(x => <li key={x}>{x}</li>)}</ul>} />
      <Form form={form} layout="vertical" initialValues={initial} requiredMark={false}>
        <Row gutter={16}>
          <Col xs={24} md={9}><Form.Item name="likelihood" label={`โอกาสเกิด: ${LIKELIHOOD_LABEL[L]}`} rules={[{ required: true }]}><Segmented block options={scale(LIKELIHOOD_LABEL)} aria-label="โอกาสเกิด" /></Form.Item></Col>
          <Col xs={24} md={9}><Form.Item name="impact" label={`ผลกระทบ: ${IMPACT_LABEL[I]}`} rules={[{ required: true }]}><Segmented block options={scale(IMPACT_LABEL)} aria-label="ผลกระทบ" /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="ระดับความเสี่ยง"><div data-testid="modal-score" style={{ paddingTop: 4 }}>{levelTag(levelOf(L * I), L * I)}</div></Form.Item></Col>
        </Row>
        <Form.Item name="threats" label="ภัยคุกคามที่เกี่ยวข้อง">
          <Checkbox.Group style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 4 }} options={THREATS.map(t => ({ value: t.key, label: t.label }))} />
        </Form.Item>
        <Form.Item name="controls" label="มาตรการควบคุมที่มีอยู่"><Input.TextArea rows={2} maxLength={2000} placeholder="เช่น ต่อ UPS, สำรองข้อมูลทุกวัน, มีเครื่องสำรอง, ติดตั้ง antivirus" /></Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={10}>
            <Form.Item name="treatment" label="แนวทางจัดการ" dependencies={['likelihood', 'impact']} rules={[{ required: true, message: 'กรุณาเลือกแนวทางจัดการ' },
              { validator: (_, v) => v === 'accept' && L * I >= 15 ? Promise.reject(new Error('ความเสี่ยงสูงมากยอมรับไม่ได้ ต้องเลือกแนวทางจัดการ')) : Promise.resolve() }]}>
              <Select aria-label="แนวทางจัดการ" options={TREATMENTS.map(t => ({ value: t.key, label: <span>{t.label} <Text type="secondary" style={{ fontSize: 12 }}>— {t.hint}</Text></span> }))} optionLabelProp="title"
                optionRender={o => o.label} labelRender={o => TREATMENT_LABEL[String(o.value)]} />
            </Form.Item>
          </Col>
          <Col xs={24} md={14}><Form.Item name="owner_name" label="ผู้รับผิดชอบ"><Input maxLength={150} placeholder="เช่น หัวหน้างานเทคโนโลยีสารสนเทศ" /></Form.Item></Col>
        </Row>
        <Form.Item name="treatment_plan" label="แผนการจัดการความเสี่ยง" rules={[{ required: treatment !== 'accept', message: 'กรุณาระบุแผน (ยกเว้นยอมรับความเสี่ยง)' }]}>
          <Input.TextArea rows={2} maxLength={2000} placeholder="ทำอะไร เมื่อไร งบเท่าไร" />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={12}><Form.Item name="due_date" label="กำหนดดำเนินการเสร็จ"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          <Col xs={12}><Form.Item name="next_review" label="วันทบทวนครั้งถัดไป"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
        </Row>
        <Form.Item name="notes" label="หมายเหตุ"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
      </Form>
      <div style={{ fontWeight: 600, margin: '4px 0 8px' }}>ประวัติการประเมิน</div>
      {history === null ? <Text type="secondary">กำลังโหลด…</Text> : history.length === 0 ? <Text type="secondary">ยังไม่เคยประเมิน</Text> :
        <Timeline items={history.map(h => ({
          color: LEVEL_COLOR.light[levelOf(h.score)],
          content: <div style={{ fontSize: 12.5 }}>{levelTag(levelOf(h.score), h.score)} <Text type="secondary">{dayjs(h.assessed_at).format('DD/MM/YYYY HH:mm')} · {h.assessed_by_name ?? '-'}</Text>
            <div>{TREATMENT_LABEL[h.treatment]}{h.treatment_plan ? `: ${h.treatment_plan}` : ''}</div></div>,
        }))} />}
    </Modal>
  )
}

const PageContent = ({ isDark }: { isDark: boolean }) => {
  const { message } = App.useApp()
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [risks, setRisks] = useState<RiskRow[]>([])
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [level, setLevel] = useState<RiskLevel | null>(null)
  const [kind, setKind] = useState<Kind | null>(null)
  const [dept, setDept] = useState<string | null>(null)
  const [assessed, setAssessed] = useState<'all' | 'yes' | 'no' | 'due'>('all')
  const [ageF, setAgeF] = useState<AgeState | null>(null)
  const [cell, setCell] = useState<[number, number] | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const P = PALETTES[isDark ? 'dark' : 'light']
  const LC = LEVEL_COLOR[isDark ? 'dark' : 'light']

  // ?q=<เลขครุภัณฑ์> จากหน้าทะเบียนทรัพย์สิน
  // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านค่าจาก URL ครั้งเดียวตอนเปิดหน้า
  useEffect(() => { const v = new URLSearchParams(window.location.search).get('q'); if (v) setQ(v) }, [])
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ra, rr] = await Promise.all([fetch('/api/v1/it/assets'), fetch('/api/v1/it/asset-risks')])
      if (ra.status === 403 || rr.status === 403) { setDenied(true); return }
      const [ja, jr] = await Promise.all([ra.json(), rr.json()])
      if (!ja.success) throw new Error(ja.message || 'โหลดทะเบียนครุภัณฑ์ไม่สำเร็จ')
      if (!jr.success) throw new Error(jr.message || 'โหลดผลประเมินไม่สำเร็จ')
      setAssets(ja.data); setRisks(jr.data)
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  // ประเมินเฉพาะครุภัณฑ์ที่ยังถือครองอยู่ (ที่ขายทอดตลาด/ตัดออกจากทะเบียนแล้วไม่มีความเสี่ยงต่อบริการ)
  const items = useMemo<Item[]>(() => {
    const rmap = new Map(risks.map(r => [r.asset_key, r]))
    return (assets ?? []).filter(a => a.status_group !== 'disposed').map(a => {
      const risk = rmap.get(a.key) ?? null
      const suggested = suggestRisk(a)
      const likelihood = risk?.likelihood ?? suggested.likelihood, impact = risk?.impact ?? suggested.impact, score = likelihood * impact
      return { asset: a, risk, likelihood, impact, score, level: levelOf(score), suggested, age: ageYears(a.receive), ageSt: ageState(a),
        overdue: !!risk?.due_date && risk.treatment !== 'accept' && risk.due_date < todayStr,
        reviewDue: !!risk?.next_review && risk.next_review <= todayStr }
    })
  }, [assets, risks])
  // ชุดที่กรองทุกอย่างยกเว้นช่องใน matrix — matrix นับจากชุดนี้ ช่องอื่นจึงยังเห็นจำนวนตอนเลือกช่อง
  const noCell = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter(it => (!level || it.level === level) && (!kind || it.asset.kind === kind) && (!dept || (it.asset.department ?? 'ไม่ระบุหน่วยงาน') === dept) && (!ageF || it.ageSt === ageF)
      && (assessed === 'all' || (assessed === 'yes' ? !!it.risk : assessed === 'no' ? !it.risk : it.overdue || it.reviewDue))
      && (!s || [it.asset.noid, it.asset.name, it.asset.model, it.asset.department, it.asset.location, it.risk?.owner_name].some(v => v?.toLowerCase().includes(s))))
      .sort((x, y) => y.score - x.score || Number(!!x.risk) - Number(!!y.risk) || x.asset.noid.localeCompare(y.asset.noid))
  }, [items, q, level, kind, dept, assessed, ageF])
  const filtered = useMemo(() => cell ? noCell.filter(it => it.likelihood === cell[0] && it.impact === cell[1]) : noCell, [noCell, cell])
  const active = !!(q.trim() || level || kind || dept || cell || ageF || assessed !== 'all')
  const clear = () => { setQ(''); setLevel(null); setKind(null); setDept(null); setCell(null); setAgeF(null); setAssessed('all') }

  const n = (f: (it: Item) => boolean) => items.filter(f).length
  const stats = { veryHigh: n(it => it.level === 'very_high'), high: n(it => it.level === 'high'), assessed: n(it => !!it.risk), due: n(it => it.overdue || it.reviewDue) }

  // ── Risk matrix 5×5 (จากชุดที่กรอง ยกเว้นตัวกรองช่อง) ──
  const counts = new Map<string, number>()
  for (const it of noCell) counts.set(`${it.likelihood}-${it.impact}`, (counts.get(`${it.likelihood}-${it.impact}`) ?? 0) + 1)
  const matrixData = [1, 2, 3, 4, 5].flatMap(l => [1, 2, 3, 4, 5].map(i => {
    const c = counts.get(`${l}-${i}`) ?? 0, sc = l * i, sel = cell?.[0] === l && cell?.[1] === i
    return { value: [i - 1, l - 1, c, sc], itemStyle: { opacity: c ? 0.92 : 0.22, borderColor: sel ? P.text : P.surface, borderWidth: sel ? 3 : 2, borderRadius: 6 } }
  }))
  const matrixOption = {
    backgroundColor: 'transparent',
    tooltip: { backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text },
      formatter: (p: { value: number[] }) => { const [i, l, c] = p.value; const sc = (l + 1) * (i + 1); return `โอกาส ${l + 1} (${LIKELIHOOD_LABEL[l + 1]}) × ผลกระทบ ${i + 1} (${IMPACT_LABEL[i + 1]})<br/>คะแนน ${sc} · ${LEVEL_LABEL[levelOf(sc)]}<br/><b>${c.toLocaleString('th-TH')}</b> รายการ${c ? '<br/><i>กดเพื่อกรอง</i>' : ''}` } },
    // heatmap ต้องมี visualMap — ใช้ระบายสีตามคะแนน (มิติที่ 4) แบบซ่อนไว้ คำอธิบายสีอยู่ใต้กราฟ
    visualMap: { show: false, type: 'piecewise', dimension: 3, pieces: RISK_LEVELS.map(l => ({ min: l.min, max: l.key === 'very_high' ? 25 : RISK_LEVELS[RISK_LEVELS.indexOf(l) - 1].min - 1, color: LC[l.key] })) },
    grid: { left: 8, right: 8, top: 8, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: ['1', '2', '3', '4', '5'], name: 'ผลกระทบ →', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: P.muted }, axisLabel: { color: P.text }, axisTick: { show: false }, axisLine: { show: false }, splitArea: { show: false } },
    yAxis: { type: 'category', data: ['1', '2', '3', '4', '5'], name: 'โอกาสเกิด →', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: P.muted }, axisLabel: { color: P.text }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{ type: 'heatmap', data: matrixData, cursor: 'pointer',
      label: { show: true, color: '#fff', fontSize: 13, fontWeight: 700, formatter: (p: { value: number[] }) => p.value[2] ? p.value[2].toLocaleString('th-TH') : '' },
      emphasis: { itemStyle: { borderColor: P.text, borderWidth: 2 } } }],
  }
  // ระดับความเสี่ยงแยกชนิดอุปกรณ์ (แท่งซ้อน สีตามระดับ)
  const kinds = (Object.keys(KIND_LABEL) as Kind[]).map(k => ({ k, list: filtered.filter(it => it.asset.kind === k) })).filter(x => x.list.length)
    .sort((a, b) => b.list.filter(x => x.score >= 9).length - a.list.filter(x => x.score >= 9).length || b.list.length - a.list.length)
  const kindOption = {
    backgroundColor: 'transparent',
    legend: { bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: P.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text } },
    grid: { left: 8, right: 16, top: 8, bottom: 32, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, axisLabel: { color: P.muted, fontSize: 11 }, splitLine: { lineStyle: { color: P.grid } } },
    yAxis: { type: 'category', inverse: true, data: kinds.map(x => KIND_LABEL[x.k]), axisLabel: { color: P.text, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: P.grid } } },
    series: [...RISK_LEVELS].reverse().map(l => ({ name: l.label, type: 'bar', stack: 'k', barMaxWidth: 16, data: kinds.map(x => x.list.filter(it => it.level === l.key).length),
      itemStyle: { color: LC[l.key], borderColor: P.surface, borderWidth: 1 } })),
  }

  const columns: ColumnsType<Item> = [
    { title: 'ครุภัณฑ์', key: 'asset', width: 280, fixed: 'left', render: (_: unknown, it) => <>
      <div style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{it.asset.noid} <Tag style={{ fontSize: 10.5, marginLeft: 4 }} color={it.asset.source === 'v3' ? 'blue' : undefined}>{SOURCE_LABEL[it.asset.source]}</Tag></div>
      <div>{it.asset.name ?? '-'}</div><Text type="secondary" style={{ fontSize: 12 }}>{KIND_LABEL[it.asset.kind]}</Text></> },
    { title: 'หน่วยงาน', key: 'dept', width: 200, render: (_: unknown, it) => <>{it.asset.department ?? '-'}{it.asset.location && <div><Text type="secondary" style={{ fontSize: 12 }}>{it.asset.location}</Text></div>}</> },
    { title: 'อายุครุภัณฑ์', key: 'age', width: 150, sorter: (a, b) => (a.age ?? -1) - (b.age ?? -1),
      render: (_: unknown, it) => <>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{ageText(it.age)}{it.asset.life_years ? <Text type="secondary" style={{ fontWeight: 400 }}> / {it.asset.life_years} ปี</Text> : null}</div>
        <Tooltip title={`ได้รับ ${thDate(it.asset.receive)} · ครบอายุ ${lifeEndText(it.asset)} · แจ้งซ่อม ${it.asset.repairs} ครั้ง`}>{ageTag(it.ageSt)}</Tooltip></> },
    { title: 'โอกาส × ผลกระทบ', key: 'li', width: 130, align: 'center', render: (_: unknown, it) => <span style={{ fontWeight: 600 }}>{it.likelihood} × {it.impact}</span> },
    { title: 'ระดับความเสี่ยง', key: 'score', width: 160, sorter: (a, b) => a.score - b.score,
      render: (_: unknown, it) => <>{levelTag(it.level, it.score)}<div style={{ marginTop: 4 }}>{it.risk ? <Text type="success" style={{ fontSize: 11.5 }}><CheckCircleOutlined /> ประเมินแล้ว</Text>
        : <Tooltip title={[...it.suggested.likelihoodReasons, ...it.suggested.impactReasons].join(' · ')}><Text type="secondary" style={{ fontSize: 11.5 }}>ระบบเสนอ (ยังไม่ประเมิน)</Text></Tooltip>}</div></> },
    { title: 'แนวทาง / แผน', key: 'plan', width: 260, render: (_: unknown, it) => it.risk ? <>
      <Tag style={{ margin: 0 }}>{TREATMENT_LABEL[it.risk.treatment]}</Tag>{it.risk.treatment_plan && <div style={{ fontSize: 12.5, marginTop: 2 }}>{it.risk.treatment_plan}</div>}
      {it.risk.threats.length > 0 && <Text type="secondary" style={{ fontSize: 11.5 }}>{it.risk.threats.map(t => THREAT_LABEL[t] ?? t).join(', ')}</Text>}</> : <Text type="secondary">-</Text> },
    { title: 'ผู้รับผิดชอบ / กำหนด', key: 'owner', width: 190, render: (_: unknown, it) => it.risk ? <>
      <div style={{ fontSize: 12.5 }}>{it.risk.owner_name ?? '-'}</div>
      {it.risk.due_date && <div style={{ fontSize: 12 }}>{it.overdue ? <Text type="danger"><AlertOutlined /> เลยกำหนด {thDate(it.risk.due_date)}</Text> : <Text type="secondary">เสร็จ {thDate(it.risk.due_date)}</Text>}</div>}
      {it.risk.next_review && <div style={{ fontSize: 12 }}>{it.reviewDue ? <Text type="warning"><ClockCircleOutlined /> ถึงรอบทบทวน</Text> : <Text type="secondary">ทบทวน {thDate(it.risk.next_review)}</Text>}</div>}</> : <Text type="secondary">-</Text> },
    { title: 'ประเมินล่าสุด', key: 'at', width: 150, render: (_: unknown, it) => it.risk ? <><div style={{ fontSize: 12.5 }}>{dayjs(it.risk.assessed_at).format('DD/MM/YYYY')}</div><Text type="secondary" style={{ fontSize: 11.5 }}>{it.risk.assessed_by_name}{(it.risk.times ?? 1) > 1 ? ` · ${it.risk.times} ครั้ง` : ''}</Text></> : <Text type="secondary">-</Text> },
    { title: '', key: 'act', width: 110, fixed: 'right', align: 'center', render: (_: unknown, it) => <Button size="small" type={it.risk ? 'default' : 'primary'} icon={<FaShieldAlt />} onClick={() => setEditing(it)} aria-label={`ประเมิน ${it.asset.noid}`}>{it.risk ? 'ประเมินใหม่' : 'ประเมิน'}</Button> },
  ]

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered.map(it => ({
      'ทะเบียน': SOURCE_LABEL[it.asset.source], 'เลขครุภัณฑ์': it.asset.noid, 'ชื่อครุภัณฑ์': it.asset.name ?? '', 'ชนิดอุปกรณ์': KIND_LABEL[it.asset.kind], 'หน่วยงาน': it.asset.department ?? '',
      'วันที่ได้รับ': it.asset.receive ?? '', 'อายุใช้งาน (ปี)': it.age == null ? '' : Math.round(it.age * 10) / 10, 'อายุการใช้งานตามทะเบียน (ปี)': it.asset.life_years ?? '',
      'สถานะอายุ': AGE_LABEL[it.ageSt], 'แจ้งซ่อม (ครั้ง)': it.asset.repairs, 'โอกาสเกิด': it.likelihood, 'ผลกระทบ': it.impact, 'คะแนน': it.score, 'ระดับ': LEVEL_LABEL[it.level],
      'ที่มา': it.risk ? 'ประเมินแล้ว' : 'ระบบเสนอ', 'ภัยคุกคาม': it.risk?.threats.map(t => THREAT_LABEL[t] ?? t).join(', ') ?? '', 'มาตรการที่มีอยู่': it.risk?.controls ?? '',
      'แนวทางจัดการ': it.risk ? TREATMENT_LABEL[it.risk.treatment] : '', 'แผนการจัดการ': it.risk?.treatment_plan ?? '', 'ผู้รับผิดชอบ': it.risk?.owner_name ?? '',
      'กำหนดเสร็จ': it.risk?.due_date ?? '', 'ทบทวนครั้งถัดไป': it.risk?.next_review ?? '', 'ผู้ประเมิน': it.risk?.assessed_by_name ?? '', 'วันที่ประเมิน': it.risk ? dayjs(it.risk.assessed_at).format('YYYY-MM-DD') : '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'Asset Risk Register')
    XLSX.writeFile(wb, `ทะเบียนความเสี่ยงทรัพย์สิน IT-${todayStr}.xlsx`, { compression: true })
  }

  if (denied) return <Result status="403" title="ไม่มีสิทธิ์เข้าถึง" subTitle="การประเมินความเสี่ยงทรัพย์สินเปิดให้เฉพาะเจ้าหน้าที่งานคอมพิวเตอร์และผู้ดูแลระบบ" />
  const deptOpts = [...new Set(items.map(it => it.asset.department ?? 'ไม่ระบุหน่วยงาน'))].sort((a, b) => a.localeCompare(b, 'th')).map(d => ({ value: d, label: d }))

  return (
    <>
      <Card style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #f97316 100%)', border: 'none', borderRadius: 16, marginBottom: 20 }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}><FaShieldAlt className="text-2xl text-white" /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>ประเมินความเสี่ยงทรัพย์สินงาน IT</Title>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14 }}>โอกาสเกิด × ผลกระทบ (5×5) รายครุภัณฑ์คอมพิวเตอร์ที่ถือครองอยู่ · บันทึกแผนจัดการ ผู้รับผิดชอบ และรอบทบทวน</Text>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>โหลดใหม่</Button>
            <Button icon={<FaFileExcel />} onClick={exportExcel} disabled={!filtered.length}>Excel ({filtered.length.toLocaleString('th-TH')})</Button>
          </Space>
        </div>
      </Card>

      {!assets ? <Card loading style={{ borderRadius: 16 }} /> : <>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} lg={6}><StatCard accent="rose" isDark={isDark} label="ความเสี่ยงสูงมาก (15–25)" value={stats.veryHigh.toLocaleString('th-TH')} suffix="รายการ" icon={<AlertOutlined />} onClick={() => { clear(); setLevel('very_high') }}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>กดเพื่อดูรายการ</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="amber" isDark={isDark} label="ความเสี่ยงสูง (9–14)" value={stats.high.toLocaleString('th-TH')} suffix="รายการ" icon={<WarningOutlined />} onClick={() => { clear(); setLevel('high') }}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>กดเพื่อดูรายการ</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="emerald" isDark={isDark} label="ประเมินแล้ว" value={stats.assessed.toLocaleString('th-TH')} suffix={`/ ${items.length.toLocaleString('th-TH')}`} icon={<CheckCircleOutlined />} onClick={() => { clear(); setAssessed('yes') }}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>{items.length ? `${Math.round(stats.assessed / items.length * 100)}% ของที่ถือครอง · ที่เหลือใช้ค่าระบบเสนอ` : '-'}</Text>} /></Col>
          <Col xs={12} lg={6}><StatCard accent="violet" isDark={isDark} label="เลยกำหนด / ถึงรอบทบทวน" value={stats.due.toLocaleString('th-TH')} suffix="รายการ" icon={<ClockCircleOutlined />} onClick={() => { clear(); setAssessed('due') }}
            footer={<Text type="secondary" style={{ fontSize: 12 }}>แผนเลยกำหนดเสร็จ หรือถึงวันทบทวน</Text>} /></Col>
        </Row>

        <Card style={{ borderRadius: 16, marginBottom: 16 }} styles={{ body: { padding: 12 } }}>
          <div className="risk-filters">
            <Input allowClear prefix={<SearchOutlined />} placeholder="ค้นหาเลขครุภัณฑ์ ชื่อ หน่วยงาน ผู้รับผิดชอบ…" value={q} onChange={e => setQ(e.target.value)} aria-label="ค้นหา" />
            <Select allowClear placeholder="ทุกระดับความเสี่ยง" value={level ?? undefined} onChange={v => setLevel(v ?? null)} aria-label="ระดับความเสี่ยง"
              options={RISK_LEVELS.map(l => ({ value: l.key, label: `${l.label} (${l.range})` }))} />
            <Select value={assessed} onChange={setAssessed} aria-label="สถานะการประเมิน"
              options={[{ value: 'all', label: 'ทั้งประเมินแล้วและยังไม่ประเมิน' }, { value: 'yes', label: 'ประเมินแล้ว' }, { value: 'no', label: 'ยังไม่ประเมิน (ระบบเสนอ)' }, { value: 'due', label: 'เลยกำหนด / ถึงรอบทบทวน' }]} popupMatchSelectWidth={false} />
            <Select allowClear placeholder="ทุกชนิดอุปกรณ์" value={kind ?? undefined} onChange={v => setKind(v ?? null)} aria-label="ชนิดอุปกรณ์" options={(Object.keys(KIND_LABEL) as Kind[]).map(k => ({ value: k, label: KIND_LABEL[k] }))} />
            <Select allowClear showSearch placeholder="ทุกหน่วยงาน" value={dept ?? undefined} onChange={v => setDept(v ?? null)} aria-label="หน่วยงาน" options={deptOpts} popupMatchSelectWidth={false} />
            <Select allowClear placeholder="ทุกช่วงอายุครุภัณฑ์" value={ageF ?? undefined} onChange={v => setAgeF(v ?? null)} aria-label="อายุครุภัณฑ์" popupMatchSelectWidth={false}
              options={(['expired', 'soon', 'ok', 'unknown'] as AgeState[]).map(s => ({ value: s, label: `${AGE_LABEL[s]} (${items.filter(it => it.ageSt === s).length.toLocaleString('th-TH')})` }))} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13 }} data-testid="risk-count">แสดง <b>{filtered.length.toLocaleString('th-TH')}</b> รายการ เรียงตามคะแนนความเสี่ยง</Text>
            {cell && <Tag closable onClose={() => setCell(null)} color="processing">ช่องโอกาส {cell[0]} × ผลกระทบ {cell[1]}</Tag>}
            {active && <Button size="small" type="link" icon={<ClearOutlined />} onClick={clear}>ล้างตัวกรอง</Button>}
          </div>
        </Card>

        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={10}>
            <Card title="Risk Matrix (โอกาส × ผลกระทบ)" size="small" style={{ borderRadius: 16, height: '100%' }} extra={<Text type="secondary" style={{ fontSize: 12 }}>กดช่องเพื่อกรอง</Text>}>
              <EChart theme={isDark ? 'dark' : 'light'} height={320} option={matrixOption} onClick={p => { const v = (matrixData[p.dataIndex]?.value) as number[] | undefined; if (v && v[2]) setCell([v[1] + 1, v[0] + 1]) }} />
              <Space size={12} wrap style={{ fontSize: 12, color: 'var(--app-text-2)' }}>
                {RISK_LEVELS.map(l => <span key={l.key}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: LC[l.key], marginRight: 6 }} />{l.label} {l.range}</span>)}
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card title="ระดับความเสี่ยงแยกตามชนิดอุปกรณ์" size="small" style={{ borderRadius: 16, height: '100%' }}>
              {kinds.length ? <EChart theme={isDark ? 'dark' : 'light'} height={Math.max(260, kinds.length * 30 + 60)} option={kindOption} onClick={p => { const k = kinds[p.dataIndex]; if (k) setKind(k.k) }} />
                : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีรายการตามตัวกรอง" />}
              <Text type="secondary" style={{ fontSize: 12 }}>ค่าระบบเสนอ: โอกาสจากอายุใช้งานเทียบอายุตามทะเบียนและประวัติแจ้งซ่อม · ผลกระทบจากชนิดอุปกรณ์และหน่วยงานที่ต้องให้บริการต่อเนื่อง</Text>
            </Card>
          </Col>
        </Row>

        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 12 } }}>
          <Table size="small" rowKey={it => it.asset.key} dataSource={filtered} columns={columns} scroll={{ x: 1650 }} loading={loading}
            pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100], showTotal: t => `${t.toLocaleString('th-TH')} รายการ` }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่พบรายการตามตัวกรอง" /> }} />
        </Card>
      </>}

      {editing && <AssessModal key={editing.asset.key} item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      <style jsx global>{`
        .risk-filters { display: grid; grid-template-columns: 2fr repeat(5, minmax(0, 1fr)); gap: 8px; }
        @media (max-width: 1199px) { .risk-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 575px) { .risk-filters { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
    </>
  )
}

export default function ItAssetRiskPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#b91c1c', borderRadius: 8 } }}>
      <App>
        <div className="min-h-screen w-full bg-app-bg text-app-text">
          <Navbar />
          <div className="p-4 md:p-8 max-w-[1500px] mx-auto">
            <Breadcrumb className="mb-4" items={[
              { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
              { title: <><FaMicrochip className="inline mr-1" /> งานคอมพิวเตอร์ฯ</> },
              { href: '/information-technology/assets', title: 'ทะเบียนทรัพย์สินงาน IT' },
              { title: 'ประเมินความเสี่ยงทรัพย์สิน' },
            ]} />
            <PageContent isDark={isDark} />
          </div>
        </div>
      </App>
    </ConfigProvider>
  )
}
