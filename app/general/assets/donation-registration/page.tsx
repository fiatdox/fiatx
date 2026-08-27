'use client'
import React, { useEffect, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Tag, theme, Button, Drawer,
  Input, InputNumber, DatePicker, Space, Table, Tabs, Divider, Empty, Image as AntImage, Descriptions,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { HomeOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons'
import { FaWarehouse } from 'react-icons/fa'
import dayjs from 'dayjs'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import {
  apiListForms, apiGetForm, apiRegisterForm, donationImageUrl,
  STATUS_LABEL, fmtTHB, type DonationForm,
} from '../donationShared'

const { Title, Text } = Typography

type RegDraft = {
  id: number
  asset_registration_no?: string
  depreciation_start_date?: string
  useful_life_years?: number
  custodian_department?: string
}

const PageContent = () => {
  const { message } = App.useApp()

  const [pending, setPending] = useState<DonationForm[]>([])
  const [history, setHistory] = useState<DonationForm[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<DonationForm | null>(null)
  const [regItems, setRegItems] = useState<RegDraft[]>([])
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    try {
      const [p, h] = await Promise.all([apiListForms('procurement-pending'), apiListForms('procurement-history')])
      setPending(p.data ?? [])
      setHistory(h.data ?? [])
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  useEffect(() => {
    Promise.all([reload()]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openDetail = async (id: number) => {
    try {
      const j = await apiGetForm(id)
      const f: DonationForm = j.data
      setDetail(f)
      setRegItems((f.items ?? []).map(it => ({
        id: it.id!,
        asset_registration_no: it.asset_registration_no ?? undefined,
        depreciation_start_date: it.depreciation_start_date ?? undefined,
        useful_life_years: it.useful_life_years ?? undefined,
        custodian_department: it.custodian_department ?? f.receiving_department,
      })))
      setDetailOpen(true)
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const updateReg = (id: number, patch: Partial<RegDraft>) =>
    setRegItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))

  const saveRegistration = async () => {
    if (!detail) return
    if (detail.donation_type === 'new') {
      for (const it of regItems) {
        if (!it.asset_registration_no || !it.depreciation_start_date || !it.useful_life_years) {
          message.error('กรุณากรอกเลขทะเบียน วันที่เริ่มคิดค่าเสื่อม และอายุการใช้งานให้ครบทุกรายการ')
          return
        }
      }
    }
    setSaving(true)
    try {
      await apiRegisterForm(detail.id, regItems)
      message.success('บันทึกขึ้นทะเบียนเรียบร้อย')
      setDetailOpen(false)
      await reload()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const cols = (showRegisterButton: boolean): ColumnsType<DonationForm> => [
    { title: 'เลขที่ฟอร์ม', dataIndex: 'form_code', width: 150, render: (v: string) => <Text style={{ color: '#a855f7', fontWeight: 600 }}>{v}</Text> },
    { title: 'ผู้บริจาค', dataIndex: 'donor_name' },
    { title: 'หน่วยงานปลายทาง', dataIndex: 'receiving_department' },
    { title: 'ประเภท', dataIndex: 'donation_type', width: 90, render: (v: DonationForm['donation_type']) => <Tag color={v === 'new' ? 'blue' : 'gold'}>{v === 'new' ? 'ของใหม่' : 'ของใช้แล้ว'}</Tag> },
    { title: 'จำนวนรายการ', dataIndex: 'item_count', width: 100, align: 'center' as const },
    { title: 'วันที่อนุมัติ', dataIndex: 'approval_date', width: 120, render: (v?: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    {
      title: '', width: 140, align: 'center' as const,
      render: (_, r) => (
        <Button size="small" type={showRegisterButton ? 'primary' : 'default'} icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>
          {showRegisterButton ? 'ขึ้นทะเบียน' : 'ดูรายละเอียด'}
        </Button>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: 'งานทั่วไป' },
          { title: 'ขึ้นทะเบียนครุภัณฑ์บริจาค' },
        ]} />

        <div className="flex items-center gap-3 mb-6">
          <FaWarehouse style={{ fontSize: 24, color: '#a855f7' }} />
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>ฝ่ายพัสดุ — ขึ้นทะเบียนครุภัณฑ์รับบริจาค</Title>
        </div>

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }} styles={{ body: { padding: 12 } }}>
          <Tabs
            defaultActiveKey="pending"
            items={[
              {
                key: 'pending',
                label: `รายการรอขึ้นทะเบียน (${pending.length})`,
                children: <Table columns={cols(true)} dataSource={pending} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
                  locale={{ emptyText: <Empty description="ไม่มีรายการรอขึ้นทะเบียน" /> }} />,
              },
              {
                key: 'history',
                label: `ประวัติการขึ้นทะเบียน (${history.length})`,
                children: <Table columns={cols(false)} dataSource={history} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
                  locale={{ emptyText: <Empty description="ยังไม่มีประวัติ" /> }} />,
              },
            ]}
          />
        </Card>
      </div>

      <Drawer title={detail ? `${detail.form_code} — ${detail.donor_name}` : ''} open={detailOpen} onClose={() => setDetailOpen(false)} size={860} destroyOnHidden
        extra={detail?.status === 'pending_registration' && (
          <Button type="primary" icon={<SaveOutlined />} onClick={saveRegistration} loading={saving}
            style={{ background: '#22c55e', borderColor: '#22c55e' }}>บันทึกขึ้นทะเบียน</Button>
        )}
      >
        {detail && (
          <>
            <Space wrap className="mb-4">
              <Tag color={STATUS_LABEL[detail.status].color}>{STATUS_LABEL[detail.status].label}</Tag>
              <Tag color={detail.donation_type === 'new' ? 'blue' : 'gold'}>{detail.donation_type === 'new' ? 'ของใหม่' : 'ของใช้แล้ว'}</Tag>
            </Space>

            <Descriptions size="small" column={2} bordered labelStyle={{ width: 150, color: 'var(--app-text-2)' }} className="mb-4">
              <Descriptions.Item label="ผู้บริจาค" span={2}>{detail.donor_name}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงานปลายทาง" span={2}>{detail.receiving_department}</Descriptions.Item>
              <Descriptions.Item label="วันที่สรุปผลอนุมัติ" span={2}>{detail.approval_date ? dayjs(detail.approval_date).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
            </Descriptions>

            <Divider>มติ + ความเห็นคณะกรรมการ</Divider>
            {(detail.committee_reviews ?? []).map(r => (
              <div key={r.id} className="mb-2 p-2 rounded" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                <div className="flex justify-between">
                  <Text strong>{r.committee_name} <Text type="secondary" style={{ fontSize: 12 }}>({r.committee_position})</Text></Text>
                  <Tag color={r.decision === 'approved' ? 'success' : 'error'}>{r.decision === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}</Tag>
                </div>
                <Text style={{ fontSize: 13 }}>{r.comment}</Text>
              </div>
            ))}

            <Divider>รายการครุภัณฑ์ — {detail.donation_type === 'new' ? 'กรอกข้อมูลขึ้นทะเบียน' : 'ไม่ออกทะเบียน (ของใช้แล้ว)'}</Divider>
            {(detail.items ?? []).map(it => {
              const reg = regItems.find(r => r.id === it.id)
              return (
                <Card key={it.id} size="small" className="mb-3" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                  <div className="flex justify-between mb-2">
                    <Text strong>{it.item_name}</Text>
                    <Text type="secondary">{it.item_qty} {it.item_unit}</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    {it.item_brand_model && `ยี่ห้อ/รุ่น: ${it.item_brand_model} • `}
                    {it.item_est_value != null && `มูลค่าโดยประมาณ: ${fmtTHB(it.item_est_value)}`}
                  </Text>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(it.images ?? []).map(img => (
                      <AntImage key={img.id} src={donationImageUrl(img.id)} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 6 }} />
                    ))}
                  </div>

                  {detail.status !== 'pending_registration' ? (
                    <Descriptions size="small" column={2} bordered labelStyle={{ color: 'var(--app-text-2)', width: 140 }}>
                      <Descriptions.Item label="เลขทะเบียน">{it.asset_registration_no || '-'}</Descriptions.Item>
                      {detail.donation_type === 'new' ? (
                        <>
                          <Descriptions.Item label="วันที่เริ่มคิดค่าเสื่อม">{it.depreciation_start_date ? dayjs(it.depreciation_start_date).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                          <Descriptions.Item label="อายุการใช้งาน">{it.useful_life_years ? `${it.useful_life_years} ปี` : '-'}</Descriptions.Item>
                          <Descriptions.Item label="หน่วยงานผู้ครอบครอง">{it.custodian_department || '-'}</Descriptions.Item>
                        </>
                      ) : (
                        <Descriptions.Item label="หมายเหตุเงื่อนไข">{it.repair_condition_note || '-'}</Descriptions.Item>
                      )}
                    </Descriptions>
                  ) : detail.donation_type === 'new' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>เลขทะเบียนครุภัณฑ์ *</Text>
                        <Input value={reg?.asset_registration_no ?? ''} placeholder="ปีงบ-หน่วยงาน-ลำดับ"
                          onChange={e => updateReg(it.id!, { asset_registration_no: e.target.value })} />
                      </div>
                      <div>
                        <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>วันที่เริ่มคิดค่าเสื่อมราคา *</Text>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY"
                          value={reg?.depreciation_start_date ? dayjs(reg.depreciation_start_date) : undefined}
                          onChange={d => updateReg(it.id!, { depreciation_start_date: d ? d.format('YYYY-MM-DD') : undefined })} />
                      </div>
                      <div>
                        <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>อายุการใช้งานตามเกณฑ์ (ปี) *</Text>
                        <InputNumber style={{ width: '100%' }} min={1} value={reg?.useful_life_years}
                          onChange={v => updateReg(it.id!, { useful_life_years: v ?? undefined })} />
                      </div>
                      <div>
                        <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>หน่วยงานผู้ครอบครองทรัพย์สิน</Text>
                        <Input value={reg?.custodian_department ?? ''} onChange={e => updateReg(it.id!, { custodian_department: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      เลขทะเบียน: <Text strong>ไม่ออกทะเบียน</Text> — จะบันทึกหมายเหตุเงื่อนไขการซ่อมอัตโนมัติเมื่อกดบันทึก
                    </Text>
                  )}
                </Card>
              )
            })}
          </>
        )}
      </Drawer>
    </div>
  )
}

export default function DonationRegistrationPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#a855f7', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
