'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ConfigProvider, theme, App, Card, Rate, Input, Button, Select, Checkbox,
  Typography, Spin, Result, Divider, Tag,
} from 'antd'
import {
  FaHospital, FaTools, FaRegSmileBeam, FaRegClock, FaShieldAlt,
} from 'react-icons/fa'

const { TextArea } = Input
const { Title, Text, Paragraph } = Typography

const TEAL = '#0d9488'

// แต่ละ "ด้าน" อ้างอิงตามขั้นตอนการติดตามงานซ่อม เพื่อให้รู้ว่าความล่าช้าเกิดที่ขั้นไหน
interface Aspect {
  key: string
  title: string
  desc: string
  optional?: boolean   // ด้านที่อาจไม่มีในบางคำร้อง (เช่น ไม่ต้องสั่งซื้ออะไหล่)
}

const ASPECTS: Aspect[] = [
  { key: 'reception',   title: 'การรับเรื่อง / ตอบรับการแจ้งซ่อม', desc: 'ความรวดเร็วในการรับงานหลังแจ้งซ่อม' },
  { key: 'diagnosis',   title: 'การวินิจฉัยและดำเนินการซ่อม',      desc: 'ความรวดเร็วและความคืบหน้าในการซ่อม' },
  { key: 'procurement', title: 'การจัดซื้ออะไหล่ (PR / PO)',         desc: 'กรณีต้องสั่งซื้ออะไหล่ — ความรวดเร็วของขั้นตอนจัดซื้อ', optional: true },
  { key: 'tracking',    title: 'การติดตามและแจ้งความคืบหน้า',       desc: 'ได้รับการแจ้งสถานะ/ความคืบหน้าอย่างสม่ำเสมอ' },
  { key: 'quality',     title: 'คุณภาพและผลลัพธ์ของงานซ่อม',        desc: 'อุปกรณ์กลับมาใช้งานได้ดีตามต้องการ' },
  { key: 'service',     title: 'ความสุภาพและการบริการของเจ้าหน้าที่', desc: 'มารยาทและการให้บริการของทีมช่าง' },
]

// ตัวเลือก "ขั้นตอนที่ล่าช้าที่สุด" — ช่วยระบุจุดที่เป็นปัญหา
const SLOWEST_OPTIONS = [
  { value: 'none',        label: 'ไม่มี — รวดเร็วทุกขั้นตอน' },
  { value: 'reception',   label: 'การรับเรื่อง / ตอบรับช้า' },
  { value: 'diagnosis',   label: 'การวินิจฉัย / ลงมือซ่อมช้า' },
  { value: 'procurement', label: 'การจัดซื้ออะไหล่ (PR/PO) ช้า' },
  { value: 'tracking',    label: 'การแจ้งความคืบหน้าช้า / ไม่ได้รับการติดตาม' },
  { value: 'delivery',    label: 'การรอรับของ / รับอะไหล่ช้า' },
]

const RATE_DESC = ['ควรปรับปรุง', 'พอใช้', 'ปานกลาง', 'ดี', 'ดีมาก']

interface RepairSummary {
  code?: string
  device_name?: string
  department?: string
  resolved_date?: string
}

function SurveyContent() {
  const params = useParams<{ token: string }>()
  const token = params?.token
  const { message } = App.useApp()

  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [done, setDone] = useState(false)
  const [summary, setSummary] = useState<RepairSummary | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [naAspects, setNaAspects] = useState<Record<string, boolean>>({})
  const [slowest, setSlowest] = useState<string | undefined>(undefined)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    fetch(`/api/satisfaction/${token}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!active) return
        if (!res.ok || json.ok === false) { setInvalid(true); return }
        if (json.submitted) { setDone(true); return }
        setSummary(json.summary ?? null)
      })
      .catch(() => active && setInvalid(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [token])

  // คะแนนเฉลี่ยจากด้านที่ให้คะแนน (ไม่นับด้านที่กดว่าไม่เกี่ยวข้อง)
  const overall = useMemo(() => {
    const vals = ASPECTS.filter(a => !naAspects[a.key]).map(a => ratings[a.key]).filter(Boolean) as number[]
    if (!vals.length) return 0
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
  }, [ratings, naAspects])

  const handleSubmit = async () => {
    // ต้องให้คะแนนครบทุกด้านที่ไม่ได้กดว่าไม่เกี่ยวข้อง
    const missing = ASPECTS.filter(a => !naAspects[a.key] && !ratings[a.key])
    if (missing.length) {
      message.warning('กรุณาให้คะแนนทุกด้านก่อนส่งแบบประเมิน')
      return
    }
    setSubmitting(true)
    const payload = {
      ratings: Object.fromEntries(
        ASPECTS.map(a => [a.key, naAspects[a.key] ? null : (ratings[a.key] ?? null)])
      ),
      overall,
      slowest_phase: slowest ?? null,
      comment: comment.trim() || null,
    }
    try {
      const res = await fetch(`/api/satisfaction/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.ok === false || json.success === false) {
        message.error(json.message ?? 'บันทึกแบบประเมินไม่สำเร็จ')
        return
      }
      setDone(true)
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Spin size="large" /></div>
  }

  if (invalid) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <Result
          status="warning"
          title="ลิงก์ไม่ถูกต้องหรือหมดอายุ"
          subTitle="ลิงก์แบบประเมินนี้ใช้งานไม่ได้แล้ว กรุณาติดต่อเจ้าหน้าที่ IT เพื่อขอลิงก์ใหม่"
        />
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <Result
          icon={<FaRegSmileBeam style={{ fontSize: 56, color: TEAL }} />}
          title="ขอบคุณสำหรับการประเมิน"
          subTitle="ความคิดเห็นของท่านจะถูกนำไปพัฒนาการบริการให้ดียิ่งขึ้น"
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* หัวกระดาษ */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, margin: '0 auto 12px',
            display: 'grid', placeItems: 'center',
            background: `linear-gradient(135deg, ${TEAL}, #14b8a6)`, color: '#fff', fontSize: 26,
          }}>
            <FaHospital />
          </div>
          <Title level={3} style={{ margin: 0 }}>แบบประเมินความพึงพอใจ</Title>
          <Text type="secondary">งานซ่อมบำรุงคอมพิวเตอร์และระบบสารสนเทศ</Text>
        </div>

        {/* ข้อมูลคำร้อง (ถ้ามีจาก backend) */}
        {summary && (summary.code || summary.device_name) && (
          <Card size="small" style={{ marginBottom: 16, borderColor: `${TEAL}44` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: TEAL, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FaTools /> {summary.device_name ?? 'งานซ่อม'}
              </span>
              {summary.code && <Tag color="cyan" style={{ margin: 0 }}>{summary.code}</Tag>}
              {summary.department && <Text type="secondary">· {summary.department}</Text>}
              {summary.resolved_date && <Text type="secondary">· เสร็จเมื่อ {summary.resolved_date}</Text>}
            </div>
          </Card>
        )}

        <Card style={{ borderColor: `${TEAL}33` }}>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
            กรุณาให้คะแนนความพึงพอใจในแต่ละขั้นตอนของการให้บริการ (1 = ควรปรับปรุง, 5 = ดีมาก)
          </Paragraph>

          {ASPECTS.map((a, i) => (
            <div key={a.key}>
              {i > 0 && <Divider style={{ margin: '14px 0' }} />}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: '1 1 260px' }}>
                  <div style={{ fontWeight: 600 }}>{i + 1}. {a.title}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{a.desc}</Text>
                  {a.optional && (
                    <div style={{ marginTop: 4 }}>
                      <Checkbox
                        checked={!!naAspects[a.key]}
                        onChange={(e) => {
                          setNaAspects(p => ({ ...p, [a.key]: e.target.checked }))
                          if (e.target.checked) setRatings(p => { const n = { ...p }; delete n[a.key]; return n })
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>ไม่มีขั้นตอนนี้ / ไม่เกี่ยวข้อง</Text>
                      </Checkbox>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', minWidth: 170 }}>
                  <Rate
                    disabled={!!naAspects[a.key]}
                    value={ratings[a.key] ?? 0}
                    onChange={(v) => setRatings(p => ({ ...p, [a.key]: v }))}
                  />
                  <div style={{ fontSize: 11, color: TEAL, height: 16 }}>
                    {ratings[a.key] ? RATE_DESC[ratings[a.key] - 1] : (naAspects[a.key] ? 'ข้ามด้านนี้' : '')}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Divider style={{ margin: '18px 0' }} />

          {/* ขั้นตอนที่ล่าช้าที่สุด */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaRegClock style={{ color: TEAL }} /> ขั้นตอนที่ท่านรู้สึกว่าล่าช้าที่สุด
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="เลือกขั้นตอน (ถ้ามี)"
              allowClear
              value={slowest}
              onChange={setSlowest}
              options={SLOWEST_OPTIONS}
            />
          </div>

          {/* ความเห็นเพิ่มเติม */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>ข้อเสนอแนะเพิ่มเติม</div>
            <TextArea
              rows={3}
              maxLength={500}
              showCount
              placeholder="ความประทับใจ หรือสิ่งที่อยากให้ปรับปรุง..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* สรุปคะแนนเฉลี่ย */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderRadius: 10, background: `${TEAL}14`, marginBottom: 16,
          }}>
            <Text strong>คะแนนเฉลี่ยรวม</Text>
            <span style={{ color: TEAL, fontWeight: 700, fontSize: 18 }}>
              {overall ? `${overall.toFixed(1)} / 5` : '—'}
            </span>
          </div>

          <Button
            type="primary" block size="large"
            loading={submitting}
            onClick={handleSubmit}
            style={{ background: TEAL, borderColor: TEAL }}
          >
            ส่งแบบประเมิน
          </Button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FaShieldAlt /> แบบประเมินนี้เข้าถึงผ่านลิงก์เข้ารหัสเฉพาะคำร้องของท่าน
            </Text>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function SatisfactionSurveyPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: TEAL, borderRadius: 8 } }}>
      <App>
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
          <SurveyContent />
        </div>
      </App>
    </ConfigProvider>
  )
}
