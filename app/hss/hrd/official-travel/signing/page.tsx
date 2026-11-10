'use client'
// ตั้งค่าการลงนาม (เดินทางไปราชการ) — ADMIN / HRD
//   ลงนามในระบบ: ผู้ขอ + หัวหน้ากลุ่มงาน + หัวหน้ากลุ่มภารกิจ ลงนามด้วยลายเซ็นในบัญชี · ผอ. เซ็นจริง
//   เดินเอกสาร:  ยื่นในระบบ พิมพ์บันทึกข้อความไปเซ็นจริงทุกช่อง · งาน HRD บันทึกผลตามเอกสาร
//   โหมดของผู้ขอ = ตั้งที่กลุ่มงาน → ตั้งที่กลุ่มภารกิจ → ค่าเริ่มต้น · มีผลกับคำขอที่ยื่น/แก้ไขหลังจากนี้
import React, { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Empty, Input, Modal, Result, Segmented, Select, Table, Tag, Typography } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'
import { FaSignature } from 'react-icons/fa'
import { TRAVEL_COLOR, TRAVEL_MENU, TravelApiError, TravelShell, travelApi } from '../travelShared'
import { SIGN_MODE_LABEL, type SignMode } from '../travelCalc'

const { Title, Text } = Typography

interface MajorRow { id: number; name: string; people: number; mode: SignMode | null }
interface MissionRow { id: number; name: string; mode: SignMode | null; majors: MajorRow[] }
interface SignData { default_mode: SignMode; missions: MissionRow[]; orphan_majors: MajorRow[]; no_major: number }
interface LogRow { id: number; unit_type: 'default' | 'mission' | 'major'; unit_id: number; unit_name: string | null; before: SignMode | null; after: SignMode | null; changed_at: string; changed_by_name: string | null }
type UnitType = 'mission' | 'major'
interface Row { key: string; type: UnitType; id: number; name: string; people: number; mode: SignMode | null; inherited: SignMode; inheritFrom: string; group: string }

const INHERIT = 'inherit'
const ALL = 'all', ORPHAN = 'orphan'
const MODE_DESC: Record<SignMode, string> = {
  esign: 'ผู้ขอและหัวหน้ากลุ่มงาน/กลุ่มภารกิจลงนามด้วยลายเซ็นในบัญชี (ต้องตั้งลายเซ็นก่อน) · ผู้อำนวยการลงนามจริงบนบันทึกข้อความ',
  paper: 'ยื่นในระบบแล้วพิมพ์บันทึกข้อความไปลงนามจริงทุกช่อง · งานพัฒนาทรัพยากรบุคคลบันทึกผลตามเอกสารที่ลงนามแล้ว',
}
const fmtDateTime = (v: string) => new Date(v).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
const modeTag = (m: SignMode) => <Tag color={m === 'esign' ? 'purple' : 'gold'} style={{ margin: 0 }}>{SIGN_MODE_LABEL[m]}</Tag>
const UNIT_LABEL = { default: 'ค่าเริ่มต้น', mission: 'กลุ่มภารกิจ', major: 'กลุ่มงาน' } as const

const SigningContent = () => {
  const { message } = App.useApp()
  const [data, setData] = useState<SignData | null>(null)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<LogRow[] | null | undefined>(undefined)
  // ตัวกรอง: กลุ่มภารกิจ (all / mission_id / orphan) · โหมดที่ใช้จริง · ค้นชื่อกลุ่ม
  const [missionFilter, setMissionFilter] = useState<string>(ALL)
  const [modeFilter, setModeFilter] = useState<string>(ALL)
  const [q, setQ] = useState('')
  const onError = useCallback((e: unknown) => {
    if (e instanceof TravelApiError && e.status === 403) setDenied(true)
    else message.error((e as Error).message)
  }, [message])
  const load = useCallback(async () => {
    try { setData(await travelApi<SignData>('sign-modes')) } catch (e) { onError(e) }
  }, [onError])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const save = async (key: string, unit_type: 'default' | UnitType, unit_id: number, mode: SignMode | null, name: string) => {
    setBusy(key)
    try {
      const r = await travelApi<{ changed: boolean }>('sign-modes', 'PUT', { unit_type, unit_id, mode })
      if (r.changed) message.success(`${name}: ${mode ? SIGN_MODE_LABEL[mode] : 'ใช้ตามระดับบน'} — มีผลกับคำขอที่ยื่นหลังจากนี้`)
      await load()
    } catch (e) { onError(e) } finally { setBusy(null) }
  }
  const openLog = async () => {
    setLog(null)
    try { setLog(await travelApi<LogRow[]>('sign-modes/log')) } catch (e) { onError(e); setLog([]) }
  }

  if (denied) return <Result status="403" title="ไม่มีสิทธิ์ตั้งค่าการลงนาม" subTitle="เฉพาะผู้ดูแลระบบและเจ้าหน้าที่งานพัฒนาทรัพยากรบุคคล (HRD)" />

  const def = data?.default_mode ?? 'esign'
  const majorRow = (m: MajorRow, parentMode: SignMode, parentName: string, group: string): Row => ({
    key: `major-${m.id}`, type: 'major', id: m.id, name: m.name, people: m.people, mode: m.mode, inherited: parentMode, inheritFrom: parentName, group,
  })
  // ตารางแบน: กลุ่มภารกิจ ตามด้วยกลุ่มงานข้างใต้ (group = ตัวกรองกลุ่มภารกิจที่แถวนี้อยู่)
  const allRows: Row[] = data ? [
    ...data.missions.flatMap(mi => {
      const eff = mi.mode ?? def
      const majors = mi.majors.map(m => majorRow(m, eff, 'กลุ่มภารกิจ', String(mi.id)))
      return [{
        key: `mission-${mi.id}`, type: 'mission' as const, id: mi.id, name: mi.name, people: majors.reduce((n, c) => n + c.people, 0),
        mode: mi.mode, inherited: def, inheritFrom: 'ค่าเริ่มต้น', group: String(mi.id),
      }, ...majors]
    }),
    ...data.orphan_majors.map(m => majorRow(m, def, 'ค่าเริ่มต้น', ORPHAN)),
  ] : []
  const missionName = new Map(data?.missions.map(mi => [String(mi.id), mi.name]) ?? [])
  const query = q.trim().toLowerCase()
  const rows = allRows.filter(r => (missionFilter === ALL || r.group === missionFilter)
    && (modeFilter === ALL || (r.mode ?? r.inherited) === modeFilter)
    && (!query || r.name.toLowerCase().includes(query)))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 22, background: `${TRAVEL_COLOR}1a`, color: TRAVEL_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FaSignature />
        </div>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>ตั้งค่าการลงนาม</Title>
          <Text style={{ color: 'var(--app-text-2)' }}>เลือกรายกลุ่มว่าคำขอไปราชการลงนามด้วยลายเซ็นในระบบ หรือเดินเอกสารให้เซ็นเอง ทุกการเปลี่ยนเก็บประวัติไว้</Text>
        </div>
      </div>

      <Card title="ค่าเริ่มต้น" style={{ borderRadius: 14, marginBottom: 16 }} loading={!data} extra={<Button icon={<HistoryOutlined />} onClick={openLog}>ประวัติ</Button>}>
        <Segmented value={def} disabled={busy !== null} data-testid="default-mode"
          onChange={v => save('default', 'default', 0, v as SignMode, 'ค่าเริ่มต้น')}
          options={(['esign', 'paper'] as const).map(m => ({ value: m, label: SIGN_MODE_LABEL[m] }))} />
        <div className="sign-mode-desc">
          {(['esign', 'paper'] as const).map(m => (
            <div key={m} className={m === def ? 'on' : ''}><b>{SIGN_MODE_LABEL[m]}</b> — {MODE_DESC[m]}</div>
          ))}
        </div>
        <Text type="secondary" style={{ fontSize: 12.5 }}>ใช้กับทุกกลุ่มที่ไม่ได้ตั้งไว้เอง · กลุ่มงานที่ไม่ได้ตั้งใช้ตามกลุ่มภารกิจของตัวเอง · คำขอที่ยื่นแล้วใช้โหมด ณ วันยื่น (แก้ไขคำขอแล้วคิดใหม่)</Text>
      </Card>

      <Card title="รายกลุ่ม" style={{ borderRadius: 14 }} loading={!data} styles={{ body: { padding: '8px 12px 12px' } }}>
        {data && <>
          <div className="sign-mode-filters" data-testid="sign-mode-filters">
            <Select value={missionFilter} onChange={setMissionFilter} showSearch optionFilterProp="label" aria-label="กรองกลุ่มภารกิจ" popupMatchSelectWidth={false}
              options={[
                { value: ALL, label: 'ทุกกลุ่มภารกิจ' },
                ...data.missions.map(mi => ({ value: String(mi.id), label: mi.name })),
                ...(data.orphan_majors.length ? [{ value: ORPHAN, label: 'กลุ่มงานที่ไม่อยู่ในกลุ่มภารกิจ' }] : []),
              ]} />
            <Select value={modeFilter} onChange={setModeFilter} aria-label="กรองโหมดที่ใช้จริง" popupMatchSelectWidth={false}
              options={[{ value: ALL, label: 'ทุกโหมด' }, { value: 'esign', label: `ใช้ ${SIGN_MODE_LABEL.esign}` }, { value: 'paper', label: `ใช้ ${SIGN_MODE_LABEL.paper}` }]} />
            <Input.Search value={q} onChange={e => setQ(e.target.value)} allowClear placeholder="ค้นชื่อกลุ่ม" aria-label="ค้นชื่อกลุ่ม" />
            <Text type="secondary" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }} data-testid="sign-mode-count">แสดง {rows.length} จาก {allRows.length} กลุ่ม</Text>
          </div>
          <Table<Row> size="small" rowKey="key" dataSource={rows} pagination={{ pageSize: 30, hideOnSinglePage: true, showSizeChanger: false }} scroll={{ x: 'max-content' }}
            data-testid="sign-mode-table" rowClassName={r => r.type === 'mission' ? 'sign-mode-mission' : ''}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={allRows.length ? 'ไม่พบกลุ่มตามตัวกรอง' : 'ยังไม่มีกลุ่มภารกิจ/กลุ่มงานที่เปิดใช้'} /> }}
            columns={[
              {
                title: 'กลุ่ม', dataIndex: 'name',
                render: (n: string, r) => <>
                  <span style={{ fontWeight: r.type === 'mission' ? 600 : 400 }}>{n}</span>
                  <div style={{ fontSize: 11.5, color: 'var(--app-text-3)' }}>
                    {UNIT_LABEL[r.type]}{r.type === 'major' && missionFilter === ALL && <> · {missionName.get(r.group) ?? 'ไม่อยู่ในกลุ่มภารกิจ'}</>}
                  </div>
                </>,
              },
              { title: 'บุคลากร', dataIndex: 'people', align: 'right', width: 90, render: (n: number) => `${n.toLocaleString('th-TH')} คน` },
              {
                title: 'การตั้งค่า', width: 260, render: (_: unknown, r) => (
                  <Select value={r.mode ?? INHERIT} loading={busy === r.key} disabled={busy !== null} style={{ width: '100%', minWidth: 220 }} popupMatchSelectWidth={false}
                    aria-label={`โหมดการลงนามของ ${r.name}`}
                    onChange={v => save(r.key, r.type, r.id, v === INHERIT ? null : v as SignMode, r.name)}
                    options={[
                      { value: INHERIT, label: `ตาม${r.inheritFrom} (${SIGN_MODE_LABEL[r.inherited]})` },
                      { value: 'esign', label: SIGN_MODE_LABEL.esign },
                      { value: 'paper', label: SIGN_MODE_LABEL.paper },
                    ]} />
                ),
              },
              { title: 'ใช้จริง', width: 120, align: 'center', render: (_: unknown, r) => modeTag(r.mode ?? r.inherited) },
            ]}
            footer={() => <Text type="secondary" style={{ fontSize: 12.5 }}>
              จำนวนบุคลากร = ผู้ที่ปฏิบัติงานอยู่ตามสังกัดกลุ่มงาน · ไม่ได้สังกัดกลุ่มงาน {data.no_major.toLocaleString('th-TH')} คน → ตามกลุ่มภารกิจของตัวเอง หรือค่าเริ่มต้น
            </Text>} />
        </>}
      </Card>

      <Modal title="ประวัติการตั้งค่าการลงนาม" open={log !== undefined} onCancel={() => setLog(undefined)} footer={null} width={720} destroyOnHidden>
        <Table<LogRow> size="small" rowKey="id" loading={log === null} dataSource={log ?? []} pagination={{ pageSize: 15, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีประวัติ" /> }}
          columns={[
            { title: 'วันที่', dataIndex: 'changed_at', render: fmtDateTime, width: 130 },
            {
              title: 'รายการ', render: (_: unknown, l) => <>
                {UNIT_LABEL[l.unit_type]}{l.unit_type !== 'default' && <> <b>{l.unit_name}</b></>}: {l.before ? SIGN_MODE_LABEL[l.before] : 'ตามระดับบน'} → <b>{l.after ? SIGN_MODE_LABEL[l.after] : 'ตามระดับบน'}</b>
              </>,
            },
            { title: 'ผู้แก้ไข', dataIndex: 'changed_by_name', render: (v: string | null) => v ?? '—', width: 150 },
          ]} />
      </Modal>

      <style jsx global>{`
        .sign-mode-desc { display: grid; gap: 6px; margin: 12px 0 8px; font-size: 13px; color: var(--app-text-3); line-height: 1.6; }
        .sign-mode-desc .on { color: var(--app-text); }
        .sign-mode-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 4px 0 12px; }
        .sign-mode-filters > .ant-select:first-child { flex: 1 1 260px; max-width: 360px; }
        .sign-mode-filters > .ant-select:nth-child(2) { flex: 0 1 180px; }
        .sign-mode-filters > .ant-input-search { flex: 1 1 200px; max-width: 280px; }
        .sign-mode-mission > td { background: color-mix(in srgb, ${TRAVEL_COLOR} 6%, transparent); }
      `}</style>
    </>
  )
}

export default function TravelSigningPage() {
  return (
    <TravelShell current={TRAVEL_MENU[5].title}>
      <SigningContent />
    </TravelShell>
  )
}
