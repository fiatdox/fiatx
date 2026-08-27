'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import {
  Card, Form, Input, Button, Typography, Alert, Space, Tag, Skeleton, Result,
} from 'antd'
import {
  UserOutlined, IdcardOutlined, SafetyCertificateOutlined,
  CheckCircleFilled, CloseCircleFilled, ArrowLeftOutlined, LoadingOutlined,
} from '@ant-design/icons'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import Swal from 'sweetalert2'

const { Title, Text, Paragraph } = Typography

// กติกาต้องตรงกับ src/utils/usernamePolicy.ts ฝั่ง backend (backend เป็นด่านตัดสินจริง)
const USERNAME_RULES = [
  { key: 'len',   label: 'ยาว 4-50 ตัวอักษร',                    test: (v: string) => v.length >= 4 && v.length <= 50 },
  { key: 'chars', label: 'ใช้ได้เฉพาะ a-z A-Z 0-9 . _ -',        test: (v: string) => /^[a-zA-Z0-9._-]*$/.test(v) },
  { key: 'notid', label: 'ไม่เป็นตัวเลข 13 หลัก (เลขบัตรประชาชน)', test: (v: string) => !/^\d{13}$/.test(v) },
]

type Status = {
  weak: boolean
  inScope: boolean
  warn: boolean
  required: boolean
  mode: 'off' | 'warn' | 'force'
  username: string
}

const ChangeUsernameContent = () => {
  const router = useRouter()
  const [form] = Form.useForm()
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [value, setValue] = useState('')

  // ── ตรวจชื่อซ้ำกับ backend ขณะพิมพ์ ────────────────────────────────────────
  // null = ยังไม่ได้ตรวจ/กำลังพิมพ์อยู่ · ตรวจเฉพาะเมื่อผ่านกติกาหน้าเว็บครบแล้ว จะได้ไม่ยิงถี่เปล่าๆ
  type Avail = { available: boolean; message: string }
  const [avail, setAvail] = useState<Avail | null>(null)
  const [checking, setChecking] = useState(false)
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastChecked = useRef('')

  useEffect(() => () => { if (checkTimer.current) clearTimeout(checkTimer.current) }, [])

  useEffect(() => {
    fetch('/api/v1/users/me/username-status')
      .then(r => r.json())
      .then(j => setStatus(j?.success ? j.data : null))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  const passed = useMemo(
    () => USERNAME_RULES.filter(r => r.test(value)).map(r => r.key),
    [value],
  )
  const rulesOk = value.length > 0 && passed.length === USERNAME_RULES.length
  const allOk = rulesOk && avail?.available === true && !checking

  // debounce 400ms — ผู้ใช้พิมพ์รัวๆ ไม่ควรยิงทุกตัวอักษร
  const runCheck = (raw: string) => {
    const v = raw.trim()
    setValue(v)
    setAvail(null)
    if (checkTimer.current) clearTimeout(checkTimer.current)
    if (!v || USERNAME_RULES.some(r => !r.test(v))) { setChecking(false); return }
    setChecking(true)
    checkTimer.current = setTimeout(async () => {
      try {
        const j = await fetch(`/api/v1/users/me/username-check?username=${encodeURIComponent(v)}`)
          .then(r => r.json())
        lastChecked.current = v
        setAvail(j?.success ? j.data : null)
      } catch {
        setAvail(null)   // ตรวจไม่ได้ = ไม่สรุปว่าใช้ได้ ปล่อยให้ backend ตัดสินตอนกดบันทึก
      } finally {
        setChecking(false)
      }
    }, 400)
  }

  const handleFinish = async (values: { username: string }) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/users/me/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        // ชื่อถูกคนอื่นแย่งไประหว่างที่กรอกอยู่ — สะท้อนกลับไปที่ช่องกรอกด้วย ไม่ใช่แค่ popup
        if (res.status === 409) {
          lastChecked.current = values.username.trim()
          setAvail({ available: false, message: json.message })
          form.validateFields(['username']).catch(() => { /* ตั้งใจให้ขึ้น error ที่ช่องกรอก */ })
        }
        Swal.fire({
          title: 'ตั้งชื่อผู้ใช้ใหม่ไม่สำเร็จ',
          text: json.message || 'กรุณาลองใหม่อีกครั้ง',
          icon: 'error',
          background: 'var(--app-surface)', color: 'var(--app-text)', confirmButtonColor: '#006a5a',
        })
        return
      }

      // backend ออก token ใหม่ให้ (ของเดิมยังถือชื่อเก่า + ธงบังคับเปลี่ยน) — ต้องเก็บทับทันที
      const COOKIE_HOURS = 8 / 24
      if (json.token) Cookies.set('auth_token', json.token, { expires: COOKIE_HOURS, sameSite: 'Lax' })
      const raw = Cookies.get('user_data')
      if (raw) {
        try {
          const u = JSON.parse(raw)
          u.username = json.data.username
          Cookies.set('user_data', JSON.stringify(u), { expires: COOKIE_HOURS, sameSite: 'Lax' })
        } catch { /* ไม่สำคัญพอจะบล็อกผู้ใช้ */ }
      }

      await Swal.fire({
        title: 'เปลี่ยนชื่อผู้ใช้เรียบร้อย',
        html: `ครั้งต่อไปให้เข้าสู่ระบบด้วยชื่อผู้ใช้ <b>${json.data.username}</b><br>รหัสผ่านยังเป็นตัวเดิม`,
        icon: 'success',
        background: 'var(--app-surface)', color: 'var(--app-text)', confirmButtonColor: '#006a5a',
      })
      router.push('/home')
    } catch {
      Swal.fire({
        title: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', icon: 'error',
        background: 'var(--app-surface)', color: 'var(--app-text)', confirmButtonColor: '#006a5a',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl"><Skeleton active paragraph={{ rows: 6 }} /></Card>
      </div>
    )
  }

  // ชื่อผู้ใช้ไม่ได้เป็นเลขบัตรอยู่แล้ว — ไม่มีอะไรต้องทำ
  if (status && !status.weak) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <Result
            status="success"
            title="ชื่อผู้ใช้ของคุณปลอดภัยอยู่แล้ว"
            subTitle={<>ชื่อผู้ใช้ปัจจุบัน: <b>{status.username}</b> — ไม่ได้ใช้เลขบัตรประชาชน</>}
            extra={<Button type="primary" onClick={() => router.push('/home')}>กลับหน้าหลัก</Button>}
          />
        </Card>
      </div>
    )
  }

  const forced = status?.required === true

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Card
          className="border-0 overflow-hidden mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(6,106,90,0.25), rgba(16,185,129,0.08) 60%, transparent)',
            borderLeft: '4px solid #006a5a',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 64, height: 64, background: 'rgba(6,106,90,0.25)' }}>
              <IdcardOutlined style={{ fontSize: 32, color: '#34d399' }} />
            </div>
            <div className="flex-1">
              <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>ตั้งชื่อผู้ใช้ใหม่</Title>
              <Text type="secondary" style={{ color: 'var(--app-text-2)' }}>
                ชื่อผู้ใช้ปัจจุบันของคุณคือเลขบัตรประชาชน
              </Text>
            </div>
          </div>
        </Card>

        <Alert
          type={forced ? 'warning' : 'info'}
          showIcon
          className="mb-5"
          title={forced
            ? 'ต้องตั้งชื่อผู้ใช้ใหม่ก่อนจึงจะใช้งานระบบต่อได้'
            : 'แนะนำให้เปลี่ยนชื่อผู้ใช้'}
          description={
            <Paragraph style={{ color: 'var(--app-text-2)', marginBottom: 0, fontSize: 13 }}>
              เลขบัตรประชาชนเป็นข้อมูลที่ผู้อื่นรู้ได้ไม่ยาก การใช้เป็นชื่อผู้ใช้เท่ากับเปิดเผยครึ่งหนึ่ง
              ของข้อมูลที่ใช้เข้าสู่ระบบ<br />
              การเปลี่ยนชื่อผู้ใช้<b>ไม่กระทบรหัสผ่านและข้อมูลการทำงานของคุณ</b> — ครั้งต่อไปเพียงเข้าสู่ระบบด้วยชื่อใหม่
            </Paragraph>
          }
        />

        <Card
          title={<Space><UserOutlined style={{ color: '#34d399' }} /><span>ชื่อผู้ใช้ใหม่</span></Space>}
          styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}
        >
          <Form form={form} layout="vertical" onFinish={handleFinish} autoComplete="off">
            <Form.Item
              label={<span className="text-app-text-2">ชื่อผู้ใช้ใหม่</span>}
              name="username"
              rules={[
                { required: true, message: 'กรุณากรอกชื่อผู้ใช้ใหม่' },
                {
                  validator: (_, v: string) => {
                    const s = String(v ?? '').trim()
                    if (!s) return Promise.resolve()
                    const bad = USERNAME_RULES.filter(r => !r.test(s)).map(r => r.label)
                    if (bad.length) return Promise.reject(new Error(bad.join(' · ')))
                    // ชื่อซ้ำ — backend เป็นคนตอบ (หน้าเว็บรู้เองไม่ได้)
                    if (s === lastChecked.current && avail && !avail.available)
                      return Promise.reject(new Error(avail.message))
                    return Promise.resolve()
                  },
                },
              ]}
              extra="แนะนำให้ใช้ชื่อภาษาอังกฤษที่จำง่าย เช่น somchai.j หรือ s.jaidee"
            >
              <Input
                size="large"
                prefix={<UserOutlined className="text-app-text-3" />}
                suffix={
                  checking ? <LoadingOutlined style={{ color: 'var(--app-text-3)' }} />
                    : avail?.available ? <CheckCircleFilled style={{ color: '#22c55e' }} />
                      : avail ? <CloseCircleFilled style={{ color: '#ef4444' }} />
                        : <span />
                }
                placeholder="เช่น somchai.j"
                autoFocus
                onChange={e => runCheck(e.target.value)}
              />
            </Form.Item>

            {/* ผลตรวจชื่อซ้ำจาก backend */}
            {rulesOk && (checking || avail) && (
              <div className="-mt-2 mb-3">
                {checking ? (
                  <Text style={{ color: 'var(--app-text-3)', fontSize: 13 }}>
                    <LoadingOutlined /> กำลังตรวจสอบว่าชื่อนี้ถูกใช้แล้วหรือยัง…
                  </Text>
                ) : avail?.available ? (
                  <Tag color="green" icon={<CheckCircleFilled />}>{avail.message}</Tag>
                ) : (
                  <Tag color="red" icon={<CloseCircleFilled />}>{avail?.message}</Tag>
                )}
              </div>
            )}

            <ul className="list-none p-0 mt-0 mb-4 space-y-2">
              {USERNAME_RULES.map(r => {
                const ok = passed.includes(r.key)
                return (
                  <li key={r.key} className="flex items-center gap-2">
                    {ok && value
                      ? <CheckCircleFilled style={{ color: '#22c55e' }} />
                      : <CloseCircleFilled style={{ color: 'var(--app-text-3)' }} />}
                    <Text style={{ color: ok && value ? '#86efac' : 'var(--app-text-2)', fontSize: 13 }}>{r.label}</Text>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap gap-2 justify-end">
              {!forced && (
                <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => router.push('/home')}>
                  ไว้ทีหลัง
                </Button>
              )}
              <Button
                type="primary" size="large" htmlType="submit"
                loading={submitting} disabled={!allOk}
                icon={<SafetyCertificateOutlined />}
              >
                บันทึกชื่อผู้ใช้ใหม่
              </Button>
            </div>
          </Form>

          {forced && (
            <div className="mt-4 text-center">
              <Tag color="orange">ยังใช้เมนูอื่นไม่ได้จนกว่าจะตั้งชื่อผู้ใช้ใหม่</Tag>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function ChangeUsernamePage() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <ChangeUsernameContent />
    </AppThemeProvider>
  )
}
