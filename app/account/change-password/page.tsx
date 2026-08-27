'use client'
import React, { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import {
  Card, Form, Input, Button, Breadcrumb, Typography,
  Row, Col, Progress, Tag, Space, Avatar, Divider, Alert
} from 'antd'
import {
  HomeOutlined, LockOutlined, KeyOutlined, EyeInvisibleOutlined, EyeTwoTone,
  SafetyCertificateOutlined, CheckCircleFilled, CloseCircleFilled, UserOutlined,
  ClockCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

type PasswordRule = {
  key: string
  label: string
  test: (v: string) => boolean
}

const rules: PasswordRule[] = [
  { key: 'len',     label: 'อย่างน้อย 8 ตัวอักษร',         test: (v) => v.length >= 8 },
  { key: 'upper',   label: 'มีตัวอักษรพิมพ์ใหญ่ (A-Z)',     test: (v) => /[A-Z]/.test(v) },
  { key: 'lower',   label: 'มีตัวอักษรพิมพ์เล็ก (a-z)',      test: (v) => /[a-z]/.test(v) },
  { key: 'number',  label: 'มีตัวเลข (0-9)',                test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'มีอักขระพิเศษ (!@#$%^&*)',      test: (v) => /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]/.test(v) },
]

const ChangePasswordContent = () => {
  const router = useRouter()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [userData, setUserData] = useState<{ name?: string; position_name?: string; major_name?: string }>({})
  // สถานะอายุรหัสผ่าน — คำนวณจากวันที่เปลี่ยนล่าสุดฝั่ง backend
  type PwdStatus = {
    expired: boolean; shouldWarn: boolean
    ageDays: number | null; daysLeft: number | null; changedAt: string | null
    policy_enabled: boolean; expiry_days: number
  }
  const [pwdStatus, setPwdStatus] = useState<PwdStatus | null>(null)

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (raw) { try { setUserData(JSON.parse(raw)) } catch { /* ignore */ } }
    fetch('/api/v1/users/me/password-status')
      .then(r => r.json())
      .then(j => setPwdStatus(j?.success ? j.data : null))
      .catch(() => setPwdStatus(null))
  }, [])

  const passedRules = useMemo(
    () => rules.filter(r => r.test(newPassword)).map(r => r.key),
    [newPassword]
  )
  const strengthPercent = (passedRules.length / rules.length) * 100

  const strengthMeta = useMemo(() => {
    if (!newPassword) return { label: 'ยังไม่ได้ป้อน', color: 'var(--app-text-3)' }
    if (passedRules.length <= 2) return { label: 'อ่อนแอ',   color: '#ef4444' }
    if (passedRules.length === 3) return { label: 'ปานกลาง', color: '#f59e0b' }
    if (passedRules.length === 4) return { label: 'แข็งแรง', color: '#22c55e' }
    return { label: 'แข็งแรงมาก', color: '#10b981' }
  }, [newPassword, passedRules])

  const matchState = useMemo(() => {
    if (!confirmPassword) return null
    return confirmPassword === newPassword
  }, [newPassword, confirmPassword])

  const handleFinish = async (values: { current: string; password: string; confirm: string }) => {
    if (passedRules.length < rules.length) {
      Swal.fire({
        title: 'รหัสผ่านยังไม่ปลอดภัยเพียงพอ',
        text: 'กรุณาตั้งรหัสผ่านให้ครบทุกเงื่อนไข',
        icon: 'warning',
        background: 'var(--app-surface)',
        color: 'var(--app-text)',
        confirmButtonColor: '#006a5a',
      })
      return
    }

    const raw = Cookies.get('user_data')
    const userId = raw ? JSON.parse(raw)?.id : null
    if (!userId) {
      Swal.fire({ title: 'ไม่พบข้อมูลผู้ใช้', icon: 'error', background: 'var(--app-surface)', color: 'var(--app-text)', confirmButtonColor: '#006a5a' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${userId}/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: values.current, new_password: values.password }),
      })
      const json = await res.json()
      if (!res.ok) {
        Swal.fire({
          title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
          text: json.message || 'กรุณาตรวจสอบรหัสผ่านปัจจุบันอีกครั้ง',
          icon: 'error',
          background: 'var(--app-surface)',
          color: 'var(--app-text)',
          confirmButtonColor: '#006a5a',
        })
        return
      }
      await Swal.fire({
        title: 'เปลี่ยนรหัสผ่านสำเร็จ',
        text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        icon: 'success',
        background: 'var(--app-surface)',
        color: 'var(--app-text)',
        confirmButtonColor: '#006a5a',
      })
      Cookies.remove('auth_token')
      Cookies.remove('user_data')
      Cookies.remove('user_type_id')
      router.push('/')
    } catch {
      Swal.fire({ title: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', icon: 'error', background: 'var(--app-surface)', color: 'var(--app-text)', confirmButtonColor: '#006a5a' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <Breadcrumb
          className="mb-4"
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: 'บัญชีผู้ใช้' },
            { title: 'เปลี่ยนรหัสผ่าน' },
          ]}
        />

        {/* นโยบายอายุรหัสผ่าน — คิดจากจำนวนวันนับจากวันเปลี่ยนล่าสุด */}
        {pwdStatus?.policy_enabled && (
          <Alert
            type={pwdStatus.expired ? 'warning' : pwdStatus.shouldWarn ? 'info' : 'success'}
            showIcon className="mb-4"
            title={
              pwdStatus.expired
                ? `รหัสผ่านนี้ใช้งานมาแล้ว ${pwdStatus.ageDays ?? 0} วัน — เกินกำหนด ${pwdStatus.expiry_days} วันตามนโยบาย`
                : `รหัสผ่านนี้ใช้งานมาแล้ว ${pwdStatus.ageDays ?? 0} วัน — ครบกำหนดเปลี่ยนในอีก ${pwdStatus.daysLeft} วัน`
            }
            description={
              pwdStatus.changedAt
                ? `เปลี่ยนรหัสผ่านล่าสุดเมื่อ ${dayjs(pwdStatus.changedAt).format('D MMMM ')}${dayjs(pwdStatus.changedAt).year() + 543}`
                : 'ยังไม่เคยตั้งรหัสผ่านด้วยตนเอง — แนะนำให้ตั้งรหัสของท่านเอง'
            }
          />
        )}

        {/* Header banner */}
        <Card
          className="mt-4 mb-6 border-0 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(6,106,90,0.25), rgba(16,185,129,0.08) 60%, transparent)',
            borderLeft: '4px solid #006a5a',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{ width: 64, height: 64, background: 'rgba(6,106,90,0.25)' }}
            >
              <LockOutlined style={{ fontSize: 32, color: '#34d399' }} />
            </div>
            <div className="flex-1">
              <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>เปลี่ยนรหัสผ่าน</Title>
              <Text type="secondary" style={{ color: 'var(--app-text-2)' }}>
                ตั้งรหัสผ่านใหม่ที่คาดเดายาก เพื่อความปลอดภัยของบัญชีของคุณ
              </Text>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1">
              <Tag color="green" icon={<SafetyCertificateOutlined />} className="!m-0">
                ปลอดภัยด้วยการเข้ารหัส
              </Tag>
              <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>
                <ClockCircleOutlined /> เปลี่ยนล่าสุด: {dayjs().subtract(45, 'day').format('DD/MM/YYYY')}
              </Text>
            </div>
          </div>
        </Card>

        <Row gutter={[20, 20]} className='mt-6'>
          {/* Left: form */}
          <Col xs={24} lg={15}>
            <Card
              title={<Space><KeyOutlined style={{ color: '#34d399' }} /><span>ฟอร์มเปลี่ยนรหัสผ่าน</span></Space>}
              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                autoComplete="off"
                requiredMark="optional"
              >
                <Form.Item
                  label={<span className="text-app-text-2">รหัสผ่านปัจจุบัน</span>}
                  name="current"
                  rules={[{ required: true, message: 'กรุณากรอกรหัสผ่านปัจจุบัน' }]}
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined className="text-app-text-3" />}
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                    iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="text-app-text-2">รหัสผ่านใหม่</span>}
                  name="password"
                  rules={[{ required: true, message: 'กรุณากรอกรหัสผ่านใหม่' }]}
                >
                  <Input.Password
                    size="large"
                    prefix={<KeyOutlined className="text-app-text-3" />}
                    placeholder="ตั้งรหัสผ่านใหม่ที่คาดเดายาก"
                    onChange={(e) => setNewPassword(e.target.value)}
                    iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  />
                </Form.Item>

                {/* Strength meter */}
                <div className="mb-4 -mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>ความแข็งแรงของรหัสผ่าน</Text>
                    <Text style={{ color: strengthMeta.color, fontSize: 12, fontWeight: 600 }}>
                      {strengthMeta.label}
                    </Text>
                  </div>
                  <Progress
                    percent={strengthPercent}
                    showInfo={false}
                    strokeColor={strengthMeta.color}
                    railColor="var(--app-border-strong)"
                    size="small"
                  />
                </div>

                <Form.Item
                  label={<span className="text-app-text-2">ยืนยันรหัสผ่านใหม่</span>}
                  name="confirm"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'กรุณายืนยันรหัสผ่านใหม่' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve()
                        return Promise.reject(new Error('รหัสผ่านยืนยันไม่ตรงกัน'))
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    size="large"
                    prefix={<KeyOutlined className="text-app-text-3" />}
                    placeholder="กรอกซ้ำรหัสผ่านใหม่อีกครั้ง"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  />
                </Form.Item>

                {matchState !== null && (
                  <div className="mb-4 -mt-2">
                    {matchState ? (
                      <Tag color="green" icon={<CheckCircleFilled />}>รหัสผ่านตรงกัน</Tag>
                    ) : (
                      <Tag color="red" icon={<CloseCircleFilled />}>รหัสผ่านยังไม่ตรงกัน</Tag>
                    )}
                  </div>
                )}

                <Divider style={{ borderColor: 'var(--app-surface)', margin: '12px 0 16px' }} />

                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    size="large"
                    onClick={() => {
                      form.resetFields()
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                  >
                    ล้างข้อมูล
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    loading={submitting}
                    icon={<SafetyCertificateOutlined />}
                  >
                    บันทึกรหัสผ่านใหม่
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>

          {/* Right: rules + tips */}
          <Col xs={24} lg={9}>
            <Card
              title={<Space><InfoCircleOutlined style={{ color: '#34d399' }} /><span>เงื่อนไขรหัสผ่าน</span></Space>}
              styles={{ header: { borderBottom: '1px solid var(--app-border-strong)' } }}
              className="mb-5"
            >
              <ul className="list-none p-0 m-0 space-y-2">
                {rules.map((r) => {
                  const ok = passedRules.includes(r.key)
                  return (
                    <li key={r.key} className="flex items-center gap-2">
                      {ok ? (
                        <CheckCircleFilled style={{ color: '#22c55e' }} />
                      ) : (
                        <CloseCircleFilled style={{ color: 'var(--app-text-3)' }} />
                      )}
                      <Text style={{ color: ok ? '#86efac' : 'var(--app-text-2)' }}>{r.label}</Text>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card
              styles={{ body: { padding: 16 } }}
              className="mb-5"
              style={{ background: 'rgba(6,106,90,0.08)', borderColor: 'rgba(6,106,90,0.35)' }}
            >
              <div className="flex items-start gap-3">
                <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#006a5a' }} />
                <div className="flex-1">
                  <Text style={{ color: 'var(--app-text)', fontWeight: 600 }}>{userData.name || '—'}</Text>
                  <div>
                    <Text type="secondary" style={{ color: 'var(--app-text-2)', fontSize: 12 }}>
                      {[userData.position_name, userData.major_name].filter(Boolean).join(' · ')}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>

            <Alert
              type="info"
              showIcon
              title="คำแนะนำเพื่อความปลอดภัย"
              description={
                <Paragraph style={{ color: 'var(--app-text-2)', marginBottom: 0, fontSize: 13 }}>
                  • ห้ามใช้รหัสผ่านซ้ำกับระบบอื่น<br />
                  • ไม่ควรเปิดเผยรหัสผ่านกับผู้อื่น<br />
                  • แนะนำให้เปลี่ยนรหัสผ่านทุก ๆ 90 วัน<br />
                  • หลีกเลี่ยงข้อมูลส่วนตัว เช่น วันเกิด เบอร์โทร
                </Paragraph>
              }
              style={{ background: 'rgba(30,41,59,0.6)', borderColor: 'var(--app-surface)' }}
            />
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default function ChangePasswordPage() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <ChangePasswordContent />
    </AppThemeProvider>
  )
}
