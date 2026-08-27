'use client'
import React, { useEffect, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Tag, theme, Button, Drawer,
  Form, Input, Radio, Space, Table, Tabs, Divider, Empty, Image as AntImage, Descriptions,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { HomeOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { FaUserShield } from 'react-icons/fa'
import dayjs from 'dayjs'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import {
  apiListForms, apiGetForm, apiCommitteeReview, donationImageUrl,
  STATUS_LABEL, fmtTHB, type DonationForm,
} from '../donationShared'

const { Title, Text } = Typography
const { TextArea } = Input

const PageContent = () => {
  const { message } = App.useApp()

  const [pending, setPending] = useState<DonationForm[]>([])
  const [history, setHistory] = useState<DonationForm[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<DonationForm | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const reload = async () => {
    try {
      const [p, h] = await Promise.all([apiListForms('committee-pending'), apiListForms('committee-history')])
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
      setDetail(j.data)
      form.resetFields()
      setDetailOpen(true)
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const submitVote = async () => {
    if (!detail) return
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      const j = await apiCommitteeReview(detail.id, values.decision, values.comment)
      message.success(`บันทึกมติเรียบร้อย${j.data.form_status !== 'pending_approval' ? ` — สรุปผล: ${STATUS_LABEL[j.data.form_status as DonationForm['status']].label}` : ''}`)
      setDetailOpen(false)
      await reload()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const cols = (showVoteButton: boolean): ColumnsType<DonationForm> => [
    { title: 'เลขที่ฟอร์ม', dataIndex: 'form_code', width: 150, render: (v: string) => <Text style={{ color: '#a855f7', fontWeight: 600 }}>{v}</Text> },
    { title: 'ผู้บริจาค', dataIndex: 'donor_name' },
    { title: 'หน่วยงานปลายทาง', dataIndex: 'receiving_department' },
    { title: 'จำนวนรายการ', dataIndex: 'item_count', width: 100, align: 'center' as const },
    { title: 'สถานะ', dataIndex: 'status', width: 170, render: (v: DonationForm['status']) => <Tag color={STATUS_LABEL[v].color}>{STATUS_LABEL[v].label}</Tag> },
    { title: 'วันที่ส่ง', dataIndex: 'created_at', width: 120, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    {
      title: '', width: 120, align: 'center' as const,
      render: (_, r) => (
        <Button size="small" type={showVoteButton ? 'primary' : 'default'} icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>
          {showVoteButton ? 'พิจารณา' : 'ดูรายละเอียด'}
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
          { title: 'พิจารณาอนุมัติบริจาค' },
        ]} />

        <div className="flex items-center gap-3 mb-6">
          <FaUserShield style={{ fontSize: 24, color: '#a855f7' }} />
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>คณะกรรมการรับบริจาคครุภัณฑ์ — พิจารณาอนุมัติ</Title>
        </div>

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }} styles={{ body: { padding: 12 } }}>
          <Tabs
            defaultActiveKey="pending"
            items={[
              {
                key: 'pending',
                label: `รายการรออนุมัติ (${pending.length})`,
                children: <Table columns={cols(true)} dataSource={pending} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
                  locale={{ emptyText: <Empty description="ไม่มีรายการรอพิจารณา" /> }} />,
              },
              {
                key: 'history',
                label: `ประวัติที่เคยพิจารณา (${history.length})`,
                children: <Table columns={cols(false)} dataSource={history} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
                  locale={{ emptyText: <Empty description="ยังไม่เคยพิจารณา" /> }} />,
              },
            ]}
          />
        </Card>
      </div>

      <Drawer title={detail ? `${detail.form_code} — ${detail.donor_name}` : ''} open={detailOpen} onClose={() => setDetailOpen(false)} size={820} destroyOnHidden>
        {detail && (
          <>
            <Space wrap className="mb-4">
              <Tag color={STATUS_LABEL[detail.status].color}>{STATUS_LABEL[detail.status].label}</Tag>
              <Tag color={detail.donation_type === 'new' ? 'blue' : 'gold'}>{detail.donation_type === 'new' ? 'ของใหม่' : 'ของใช้แล้ว'}</Tag>
            </Space>

            <Descriptions size="small" column={2} bordered labelStyle={{ width: 150, color: 'var(--app-text-2)' }}>
              <Descriptions.Item label="ผู้บริจาค" span={2}>{detail.donor_name}</Descriptions.Item>
              <Descriptions.Item label="ที่อยู่">{detail.donor_address || '-'}</Descriptions.Item>
              <Descriptions.Item label="เบอร์โทร">{detail.donor_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="วัตถุประสงค์" span={2}>{detail.donor_purpose || '-'}</Descriptions.Item>
              <Descriptions.Item label="หน่วยงานปลายทาง" span={2}>{detail.receiving_department}</Descriptions.Item>
              <Descriptions.Item label="ผู้กรอกแบบฟอร์ม" span={2}>{detail.submitted_by_name} — {detail.submitted_by_position}</Descriptions.Item>
              {detail.donation_type === 'used' && (
                <>
                  <Descriptions.Item label="สภาพภายนอก">{detail.used_exterior_condition}</Descriptions.Item>
                  <Descriptions.Item label="ทดลองใช้งานแล้ว">{detail.used_tested_working ? 'ใช่' : 'ไม่ใช่'}</Descriptions.Item>
                  <Descriptions.Item label="อายุใช้งานโดยประมาณ">{detail.used_estimated_age_years ? `${detail.used_estimated_age_years} ปี` : '-'}</Descriptions.Item>
                  <Descriptions.Item label="รายละเอียดสภาพ">{detail.used_condition_notes || '-'}</Descriptions.Item>
                  <Descriptions.Item label="ผู้รับทราบเงื่อนไข" span={2}>{detail.used_acknowledged_by} ({detail.used_acknowledged_date})</Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Divider>รายการครุภัณฑ์</Divider>
            {(detail.items ?? []).map(it => (
              <Card key={it.id} size="small" className="mb-2" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                <div className="flex justify-between mb-2">
                  <Text strong>{it.item_name}</Text>
                  <Text type="secondary">{it.item_qty} {it.item_unit}</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {it.item_brand_model && `ยี่ห้อ/รุ่น: ${it.item_brand_model} • `}
                  {it.item_est_value != null && `มูลค่าโดยประมาณ: ${fmtTHB(it.item_est_value)} • `}
                  {it.item_condition_general && `สภาพ: ${it.item_condition_general}`}
                </Text>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(it.images ?? []).map(img => (
                    <AntImage key={img.id} src={donationImageUrl(img.id)} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 6 }} />
                  ))}
                </div>
              </Card>
            ))}

            {(detail.committee_reviews ?? []).length > 0 && (
              <>
                <Divider>มติกรรมการที่ลงแล้ว</Divider>
                {detail.committee_reviews!.map(r => (
                  <div key={r.id} className="mb-2 p-2 rounded" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                    <div className="flex justify-between">
                      <Text strong>{r.committee_name} <Text type="secondary" style={{ fontSize: 12 }}>({r.committee_position})</Text></Text>
                      <Tag color={r.decision === 'approved' ? 'success' : 'error'}>{r.decision === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}</Tag>
                    </div>
                    <Text style={{ fontSize: 13 }}>{r.comment}</Text>
                  </div>
                ))}
              </>
            )}

            {detail.status === 'pending_approval' && !detail.my_review && (
              <>
                <Divider>ลงมติของท่าน</Divider>
                <Form form={form} layout="vertical">
                  <Form.Item label="มติ" name="decision" rules={[{ required: true, message: 'กรุณาเลือกมติ' }]}>
                    <Radio.Group>
                      <Radio.Button value="approved"><CheckCircleOutlined /> อนุมัติ</Radio.Button>
                      <Radio.Button value="rejected"><CloseCircleOutlined /> ไม่อนุมัติ</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="ความเห็น" name="comment" rules={[{ required: true, message: 'กรุณากรอกความเห็น' }]}>
                    <TextArea rows={3} placeholder="ระบุความเห็นประกอบมติ" />
                  </Form.Item>
                  <Button type="primary" block onClick={submitVote} loading={submitting}
                    style={{ background: '#a855f7', borderColor: '#a855f7' }}>บันทึกมติ</Button>
                </Form>
              </>
            )}
            {detail.my_review && (
              <>
                <Divider>มติของท่าน</Divider>
                <Tag color={detail.my_review.decision === 'approved' ? 'success' : 'error'}>
                  {detail.my_review.decision === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}
                </Tag>
                <Text style={{ display: 'block', marginTop: 4 }}>{detail.my_review.comment}</Text>
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  )
}

export default function DonationReviewPage() {
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
