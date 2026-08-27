'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Tag, theme, Select,
  Button, Drawer, Form, Input, InputNumber, DatePicker, Space, Table,
  Divider, Popconfirm, Empty, Row, Col, Radio, Switch, Upload, Image as AntImage,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  HomeOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { FaGift } from 'react-icons/fa'
import dayjs from 'dayjs'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import {
  apiMeta, apiListForms, apiGetForm, apiCreateForm, apiUpdateForm, apiDeleteForm, apiSubmitForm,
  apiUploadImages, apiDeleteImage, donationImageUrl,
  STATUS_LABEL,
  type DonationForm, type DonationItem, type DonationMeta, type DonationType,
} from '../donationShared'

const { Title, Text } = Typography
const { TextArea } = Input

type ItemDraft = DonationItem & { _key: string }
// crypto.randomUUID มีเฉพาะ secure context (HTTPS/localhost) — fallback สำหรับเข้าผ่าน http://<ip>
const genKey = (): string =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
const newItemDraft = (): ItemDraft => ({ _key: genKey(), item_name: '', item_qty: 1, item_unit: '' })

const PageContent = () => {
  const { message } = App.useApp()

  const [meta, setMeta] = useState<DonationMeta | null>(null)
  const [list, setList] = useState<DonationForm[]>([])
  const [loading, setLoading] = useState(true)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [items, setItems] = useState<ItemDraft[]>([newItemDraft()])
  const [donationType, setDonationType] = useState<DonationType>('new')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [form] = Form.useForm()
  const selectedMajor = Form.useWatch('major_id', form)

  const reload = async () => {
    try {
      const j = await apiListForms('mine')
      setList(j.data ?? [])
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  useEffect(() => {
    Promise.all([
      apiMeta().then(j => setMeta(j.data)).catch(() => {}),
      reload(),
    ]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setDonationType('new')
    setItems([newItemDraft()])
    form.resetFields()
    form.setFieldsValue({ donation_type: 'new', submitted_date: dayjs() })
    setEditorOpen(true)
  }

  const openEdit = async (id: number) => {
    try {
      const j = await apiGetForm(id)
      const f: DonationForm = j.data
      setEditingId(f.id)
      setDonationType(f.donation_type)
      setItems((f.items ?? []).map(it => ({ ...it, _key: String(it.id) })))
      form.setFieldsValue({
        donor_name: f.donor_name, donor_address: f.donor_address, donor_phone: f.donor_phone, donor_purpose: f.donor_purpose,
        major_id: f.major_id ?? undefined, submajor_id: f.submajor_id ?? undefined, donation_type: f.donation_type,
        used_exterior_condition: f.used_exterior_condition, used_tested_working: f.used_tested_working,
        used_estimated_age_years: f.used_estimated_age_years, used_condition_notes: f.used_condition_notes,
        used_acknowledged_by: f.used_acknowledged_by,
        used_acknowledged_date: f.used_acknowledged_date ? dayjs(f.used_acknowledged_date) : undefined,
        submitted_date: f.submitted_date ? dayjs(f.submitted_date) : dayjs(),
      })
      setEditorOpen(true)
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const addItem = () => setItems(prev => [...prev, newItemDraft()])
  const removeItem = (key: string) => setItems(prev => prev.filter(it => it._key !== key))
  const updateItem = (key: string, patch: Partial<ItemDraft>) =>
    setItems(prev => prev.map(it => it._key === key ? { ...it, ...patch } : it))

  type FormValues = {
    donor_name: string; donor_address?: string; donor_phone?: string; donor_purpose?: string
    major_id: number; submajor_id?: number; submitted_date?: dayjs.Dayjs
    used_exterior_condition?: string; used_tested_working?: boolean; used_estimated_age_years?: number
    used_condition_notes?: string; used_acknowledged_by?: string; used_acknowledged_date?: dayjs.Dayjs
  }

  const buildPayload = (values: FormValues) => ({
    donor_name: values.donor_name,
    donor_address: values.donor_address,
    donor_phone: values.donor_phone,
    donor_purpose: values.donor_purpose,
    major_id: values.major_id,
    submajor_id: values.submajor_id ?? null,
    donation_type: donationType,
    submitted_date: (values.submitted_date ?? dayjs()).format('YYYY-MM-DD'),
    used_exterior_condition: donationType === 'used' ? values.used_exterior_condition : undefined,
    used_tested_working: donationType === 'used' ? values.used_tested_working : undefined,
    used_estimated_age_years: donationType === 'used' ? values.used_estimated_age_years : undefined,
    used_condition_notes: donationType === 'used' ? values.used_condition_notes : undefined,
    used_acknowledged_by: donationType === 'used' ? values.used_acknowledged_by : undefined,
    used_acknowledged_date: donationType === 'used' && values.used_acknowledged_date ? values.used_acknowledged_date.format('YYYY-MM-DD') : undefined,
    items: items.map(it => ({
      id: it.id, item_name: it.item_name, item_brand_model: it.item_brand_model, item_qty: it.item_qty,
      item_unit: it.item_unit, item_est_value: it.item_est_value, item_condition_general: it.item_condition_general,
    })),
  })

  const saveDraft = async () => {
    const values = await form.validateFields()
    if (items.length === 0 || items.some(it => !it.item_name || !it.item_unit)) {
      message.error('กรุณากรอกชื่อครุภัณฑ์และหน่วยนับให้ครบทุกรายการ')
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload(values)
      const j = editingId ? await apiUpdateForm(editingId, payload) : await apiCreateForm(payload)
      const id = editingId ?? j.data.id
      message.success('บันทึกร่างเรียบร้อย')
      await openEdit(id)
      await reload()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const doSubmit = async () => {
    if (!editingId) return
    setSubmitting(true)
    try {
      await apiSubmitForm(editingId)
      message.success('ส่งเรื่องให้คณะกรรมการพิจารณาเรียบร้อย')
      setEditorOpen(false)
      await reload()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const doDelete = async (id: number) => {
    try {
      await apiDeleteForm(id)
      message.success('ลบร่างเรียบร้อย')
      await reload()
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const handleUpload = async (item: ItemDraft, files: File[]) => {
    if (!editingId || !item.id) {
      message.warning('กรุณาบันทึกร่างก่อน แล้วจึงเพิ่มรูปภาพได้')
      return
    }
    setUploadingKey(item._key)
    try {
      await apiUploadImages(editingId, item.id, files)
      await openEdit(editingId)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setUploadingKey(null)
    }
  }

  const handleDeleteImage = async (item: ItemDraft, imageId: number) => {
    if (!editingId || !item.id) return
    try {
      await apiDeleteImage(editingId, item.id, imageId)
      await openEdit(editingId)
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const columns: ColumnsType<DonationForm> = [
    { title: 'เลขที่ฟอร์ม', dataIndex: 'form_code', width: 150,
      render: (v: string) => <Text style={{ color: '#a855f7', fontWeight: 600 }}>{v}</Text> },
    { title: 'ผู้บริจาค', dataIndex: 'donor_name' },
    { title: 'หน่วยงานปลายทาง', dataIndex: 'receiving_department' },
    { title: 'ประเภท', dataIndex: 'donation_type', width: 90,
      render: (v: DonationType) => <Tag color={v === 'new' ? 'blue' : 'gold'}>{v === 'new' ? 'ของใหม่' : 'ของใช้แล้ว'}</Tag> },
    { title: 'จำนวนรายการ', dataIndex: 'item_count', width: 100, align: 'center' as const },
    { title: 'สถานะ', dataIndex: 'status', width: 170,
      render: (v: DonationForm['status']) => <Tag color={STATUS_LABEL[v].color}>{STATUS_LABEL[v].label}</Tag> },
    { title: 'วันที่สร้าง', dataIndex: 'created_at', width: 120,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    {
      title: 'การจัดการ', width: 140, align: 'center' as const,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r.id)} />
          {r.status === 'draft' && (
            <Popconfirm title="ลบร่างนี้?" onConfirm={() => doDelete(r.id)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const editingForm = useMemo(() => list.find(f => f.id === editingId), [list, editingId])
  const isDraft = !editingId || editingForm?.status === 'draft'

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: 'งานทั่วไป' },
          { title: 'ขอรับบริจาคครุภัณฑ์' },
        ]} />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FaGift style={{ fontSize: 26, color: '#a855f7' }} />
            <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>แบบขอรับบริจาคครุภัณฑ์</Title>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: '#a855f7', borderColor: '#a855f7' }}>สร้างแบบฟอร์มใหม่</Button>
        </div>

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }}
          styles={{ body: { padding: 0 } }}>
          <Table<DonationForm>
            columns={columns} dataSource={list} rowKey="id" loading={loading} size="small"
            pagination={{ pageSize: 10 }} scroll={{ x: 1000 }}
            locale={{ emptyText: <Empty description="ยังไม่มีแบบฟอร์มที่เคยกรอก" /> }}
          />
        </Card>
      </div>

      <Drawer
        title={editingId ? `แก้ไขแบบฟอร์ม ${editingForm?.form_code ?? ''}` : 'สร้างแบบฟอร์มขอรับบริจาคครุภัณฑ์'}
        open={editorOpen} onClose={() => setEditorOpen(false)} size={880} destroyOnHidden
        extra={
          <Space>
            <Button onClick={saveDraft} loading={saving} disabled={!isDraft}>บันทึกร่าง</Button>
            {editingId && isDraft && (
              <Button type="primary" icon={<SendOutlined />} onClick={doSubmit} loading={submitting}
                style={{ background: '#22c55e', borderColor: '#22c55e' }}>
                ส่งให้กรรมการพิจารณา
              </Button>
            )}
          </Space>
        }
      >
        {!isDraft && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
            <Tag color={STATUS_LABEL[editingForm!.status].color}>{STATUS_LABEL[editingForm!.status].label}</Tag>
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>ฟอร์มนี้ถูกส่งไปแล้ว แก้ไขไม่ได้ (ดูได้อย่างเดียว)</Text>
          </div>
        )}

        <Form form={form} layout="vertical" disabled={!isDraft}>
          <Divider style={{ margin: '0 0 16px' }}>ข้อมูลผู้กรอกแบบฟอร์ม</Divider>
          <Form.Item label="วันที่กรอก" name="submitted_date">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Divider style={{ margin: '0 0 16px' }}>ข้อมูลผู้บริจาค</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ชื่อ-นามสกุล/หน่วยงานผู้บริจาค" name="donor_name" rules={[{ required: true, message: 'กรุณาระบุ' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="เบอร์โทรศัพท์" name="donor_phone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="ที่อยู่" name="donor_address">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item label="วัตถุประสงค์การบริจาค" name="donor_purpose">
            <TextArea rows={2} />
          </Form.Item>

          <Divider style={{ margin: '0 0 16px' }}>หน่วยงานปลายทาง</Divider>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="กลุ่มงาน (Major)" name="major_id" rules={[{ required: true, message: 'กรุณาเลือกกลุ่มงาน' }]}>
                <Select
                  placeholder="เลือกกลุ่มงาน"
                  optionFilterProp="label"
                  onChange={() => form.setFieldValue('submajor_id', undefined)}
                  options={(meta?.majors ?? []).map(m => ({ value: m.major_id, label: m.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="งาน/หน่วยงานย่อย (Submajor)" name="submajor_id">
                <Select
                  showSearch optionFilterProp="label" allowClear
                  placeholder={selectedMajor ? 'เลือกงานย่อย (ถ้ามี)' : 'เลือกกลุ่มงานก่อน'}
                  disabled={!selectedMajor}
                  options={(meta?.submajors ?? []).filter(s => s.major_id === selectedMajor).map(s => ({ value: s.submajor_id, label: s.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '0 0 16px' }}>ประเภทการบริจาค</Divider>
          <Form.Item label="ประเภทการบริจาค" name="donation_type" rules={[{ required: true }]}>
            <Radio.Group value={donationType} onChange={e => setDonationType(e.target.value)}>
              <Radio value="new">ของใหม่</Radio>
              <Radio value="used">ของใช้แล้ว</Radio>
            </Radio.Group>
          </Form.Item>

          {donationType === 'new' && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              จะส่งต่อฝ่ายพัสดุออกทะเบียนครุภัณฑ์และคิดค่าเสื่อม
            </Text>
          )}

          {donationType === 'used' && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="สภาพภายนอก" name="used_exterior_condition" rules={[{ required: true, message: 'กรุณาเลือก' }]}>
                    <Select options={(meta?.used_exterior_conditions ?? ['ดีมาก', 'ดี', 'พอใช้', 'ทรุดโทรม']).map(c => ({ value: c, label: c }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="อายุการใช้งานโดยประมาณ (ปี)" name="used_estimated_age_years">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="ทดลองใช้งาน/เปิดเครื่องแล้ว" name="used_tested_working" valuePropName="checked" rules={[{ required: true }]}>
                <Switch checkedChildren="ทดลองแล้ว" unCheckedChildren="ยังไม่ทดลอง" />
              </Form.Item>
              <Form.Item label="รายละเอียดสภาพเพิ่มเติม" name="used_condition_notes">
                <TextArea rows={2} />
              </Form.Item>

              <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <Text style={{ color: '#ef4444', fontSize: 13 }}>
                  หากครุภัณฑ์ชิ้นนี้ชำรุดเสียหายในภายหลัง การซ่อมแซมจะไม่เข้าเงื่อนไขการซ่อมบำรุงตามหลักเกณฑ์ของโรงพยาบาล หน่วยงานผู้ใช้งานเป็นผู้รับผิดชอบเอง
                </Text>
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="ผู้บริจาค/หน่วยงานรับทราบเงื่อนไข" name="used_acknowledged_by" rules={[{ required: true, message: 'กรุณาระบุ' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="วันที่รับทราบ" name="used_acknowledged_date" rules={[{ required: true, message: 'กรุณาระบุ' }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>

        <Divider>รายการครุภัณฑ์</Divider>
        {items.map((it, idx) => (
          <Card key={it._key} size="small" className="mb-3"
            style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}
            title={<span style={{ fontSize: 13 }}>รายการที่ {idx + 1}</span>}
            extra={isDraft && items.length > 1 && (
              <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeItem(it._key)} />
            )}
          >
            <Row gutter={12}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>ชื่อครุภัณฑ์ *</Text>
                  <Input disabled={!isDraft} value={it.item_name} onChange={e => updateItem(it._key, { item_name: e.target.value })} />
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>ยี่ห้อ/รุ่น/Serial No.</Text>
                  <Input disabled={!isDraft} value={it.item_brand_model ?? ''} onChange={e => updateItem(it._key, { item_brand_model: e.target.value })} />
                </div>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>จำนวน *</Text>
                  <InputNumber style={{ width: '100%' }} disabled={!isDraft} min={1} value={it.item_qty}
                    onChange={v => updateItem(it._key, { item_qty: v ?? 1 })} />
                </div>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>หน่วยนับ *</Text>
                  <Input disabled={!isDraft} value={it.item_unit} placeholder="เครื่อง/ชิ้น/ชุด" onChange={e => updateItem(it._key, { item_unit: e.target.value })} />
                </div>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>มูลค่าโดยประมาณ (บาท)</Text>
                  <InputNumber style={{ width: '100%' }} disabled={!isDraft} min={0} value={it.item_est_value ?? undefined}
                    onChange={v => updateItem(it._key, { item_est_value: v })} />
                </div>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>สภาพทั่วไป</Text>
                  <Input disabled={!isDraft} value={it.item_condition_general ?? ''} onChange={e => updateItem(it._key, { item_condition_general: e.target.value })} />
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '8px 0' }} />
            <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>รูปภาพครุภัณฑ์ (อย่างน้อย 1 รูป, jpg/png ไม่เกิน 5MB)</Text>
            <div className="flex flex-wrap gap-2 mt-2">
              {(it.images ?? []).map(img => (
                <div key={img.id} style={{ position: 'relative' }}>
                  <AntImage src={donationImageUrl(img.id)} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 6 }} />
                  {isDraft && (
                    <Button size="small" danger type="primary" shape="circle" icon={<DeleteOutlined />}
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, minWidth: 20 }}
                      onClick={() => handleDeleteImage(it, img.id)} />
                  )}
                </div>
              ))}
              {isDraft && (
                <Upload
                  multiple accept="image/jpeg,image/png"
                  showUploadList={false}
                  disabled={!it.id || uploadingKey === it._key}
                  beforeUpload={(file, fileList) => { handleUpload(it, fileList); return false }}
                >
                  <Button icon={<UploadOutlined />} loading={uploadingKey === it._key} disabled={!it.id}>
                    {it.id ? 'เพิ่มรูป' : 'บันทึกร่างก่อน'}
                  </Button>
                </Upload>
              )}
            </div>
          </Card>
        ))}
        {isDraft && (
          <Button block icon={<PlusOutlined />} onClick={addItem} style={{ marginBottom: 16 }}>เพิ่มรายการครุภัณฑ์</Button>
        )}
      </Drawer>
    </div>
  )
}

export default function DonationRequestPage() {
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
