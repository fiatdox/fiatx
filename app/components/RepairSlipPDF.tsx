'use client'
import { Document, Page, Text, View, StyleSheet, Font, PDFViewer } from '@react-pdf/renderer'

// ─── Font ─────────────────────────────────────────────────────────────────────
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun/Sarabun-Thin.ttf',              fontWeight: 100 },
    { src: '/fonts/Sarabun/Sarabun-ThinItalic.ttf',        fontWeight: 100, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-ExtraLight.ttf',        fontWeight: 200 },
    { src: '/fonts/Sarabun/Sarabun-ExtraLightItalic.ttf',  fontWeight: 200, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-Light.ttf',             fontWeight: 300 },
    { src: '/fonts/Sarabun/Sarabun-LightItalic.ttf',       fontWeight: 300, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-Regular.ttf',           fontWeight: 400 },
    { src: '/fonts/Sarabun/Sarabun-Italic.ttf',            fontWeight: 400, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-Medium.ttf',            fontWeight: 500 },
    { src: '/fonts/Sarabun/Sarabun-MediumItalic.ttf',      fontWeight: 500, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-SemiBold.ttf',          fontWeight: 600 },
    { src: '/fonts/Sarabun/Sarabun-SemiBoldItalic.ttf',    fontWeight: 600, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-Bold.ttf',              fontWeight: 700 },
    { src: '/fonts/Sarabun/Sarabun-BoldItalic.ttf',        fontWeight: 700, fontStyle: 'italic' },
    { src: '/fonts/Sarabun/Sarabun-ExtraBold.ttf',         fontWeight: 800 },
    { src: '/fonts/Sarabun/Sarabun-ExtraBoldItalic.ttf',   fontWeight: 800, fontStyle: 'italic' },
  ],
})
Font.registerHyphenationCallback(word => [word])

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RepairSlipData {
  id: string
  requestDate: string
  status: string
  statusLabel: string
  requesterName: string
  position?: string
  department: string
  phone: string
  equipmentTypeLabel: string
  deviceBrand: string
  assetNo?: string
  deviceSerial?: string
  deviceLocation?: string
  problemCategoryLabel: string
  priorityLabel: string
  symptom: string
  assignedTo?: string
  resolvedDate?: string
  resolvedNote?: string
  prNote?: string
  prDate?: string
  replacementNote?: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 8,
    padding: '0.9cm 1.1cm',
    color: '#000',
    backgroundColor: '#fff',
  },

  // ── Header band ──────────────────────────────────────────────────────────
  headerBand: {
    backgroundColor: '#4c1d95',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 12px',
    marginBottom: 0,
    borderRadius: '4px 4px 0 0',
  },
  hospName: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  hospSub:  { fontSize: 6.5, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  docTitle: { fontSize: 10, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  docSub:   { fontSize: 7, color: '#ddd6fe', textAlign: 'right', marginTop: 2 },

  // ── Info grid (top bordered block) ────────────────────────────────────────
  infoBlock: {
    border: '1px solid #000',
    borderTop: 'none',
    padding: '4px 7px 3px',
    marginBottom: 0,
  },
  iRow: {
    flexDirection: 'row',
    borderBottom: '0.4px solid #bbb',
    paddingVertical: 2.5,
    alignItems: 'flex-end',
  },
  iRowLast: { borderBottom: 'none' },
  lbl: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    flexShrink: 0,
    marginRight: 2,
  },
  val: {
    color: '#000',
    flex: 1,
    borderBottom: '0.4px solid #333',
    paddingBottom: 1,
    marginRight: 8,
    minHeight: 10,
  },
  symptomLabel: { fontWeight: 'bold', marginBottom: 2 },
  symptomBox: {
    border: '0.5px solid #666',
    padding: '3px 5px',
    minHeight: 30,
    borderRadius: 2,
    marginBottom: 3,
  },

  // ── Two-column middle section ─────────────────────────────────────────────
  twoCol: {
    flexDirection: 'row',
    border: '1px solid #000',
    borderTop: 'none',
  },
  leftPane: {
    flex: 5,
    borderRight: '1px solid #000',
    padding: '4px 7px',
  },
  rightPane: {
    flex: 5,
    padding: '4px 7px',
  },
  paneTitle: {
    fontWeight: 'bold',
    backgroundColor: '#ede9fe',
    color: '#3b0764',
    padding: '2px 5px',
    marginBottom: 5,
    borderRadius: 2,
  },

  // Steps
  stepRow: { flexDirection: 'row', marginBottom: 3.5, alignItems: 'flex-start' },
  stepNum: { fontWeight: 'bold', width: 10, flexShrink: 0 },
  stepTxt: { flex: 1, lineHeight: 1.3 },
  stepDone: { color: '#4c1d95', fontWeight: 'bold' },
  stepPend: { color: '#999' },

  // Checkboxes
  cbRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  cbBox:      { marginRight: 4, fontWeight: 'bold', width: 14 },
  cbLbl:      { color: '#111' },
  cbLblOn:    { fontWeight: 'bold' },

  // Sub-label + dotted box
  subLbl: { fontWeight: 'bold', color: '#374151', marginTop: 4, marginBottom: 2 },
  noteBox: {
    border: '0.5px solid #999',
    padding: '3px 5px',
    minHeight: 24,
    borderRadius: 2,
  },
  noteBoxRed: { borderColor: '#fca5a5', color: '#7f1d1d' },

  // ── Acceptance section ────────────────────────────────────────────────────
  acceptBlock: {
    border: '1px solid #000',
    borderTop: 'none',
    padding: '4px 7px 3px',
  },
  acceptTitle: {
    fontWeight: 'bold',
    borderBottom: '0.4px solid #bbb',
    paddingBottom: 2,
    marginBottom: 4,
  },
  acceptRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, gap: 14 },

  // ── Director section ──────────────────────────────────────────────────────
  dirBlock: {
    border: '1px solid #000',
    borderTop: 'none',
    padding: '4px 7px 5px',
  },
  dirTitle: {
    fontWeight: 'bold',
    borderBottom: '0.4px solid #bbb',
    paddingBottom: 2,
    marginBottom: 4,
  },
  dirRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4, gap: 4 },
  dirLine: {
    flex: 1,
    borderBottom: '0.5px dashed #555',
    fontSize: 8,
    paddingBottom: 1,
    minHeight: 11,
  },
  dirDottedLine: {
    borderBottom: '0.5px dashed #555',
    marginTop: 5,
    height: 12,
  },
  dirSigBox: { alignItems: 'center', marginTop: 10 },
  dirSigLine: { borderBottom: '0.5px dashed #555', width: '70%', height: 36, marginBottom: 4 },
  dirName: { color: '#222', textAlign: 'center' },
  dirPost: { color: '#555', textAlign: 'center', marginTop: 1 },

  // ── Signatures ────────────────────────────────────────────────────────────
  sigBlock: {
    border: '1px solid #000',
    borderTop: 'none',
    flexDirection: 'row',
    padding: '6px 10px 4px',
    gap: 10,
  },
  sigBox: { flex: 1, alignItems: 'center' },
  sigLine: { borderBottom: '0.5px solid #333', width: '75%', height: 28, marginBottom: 4 },
  sigLbl: { color: '#222', textAlign: 'center' },
  sigSub: { color: '#555', textAlign: 'center', marginTop: 2 },

  footNote: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
    borderTop: '0.4px dashed #ccc',
    paddingTop: 3,
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CB({ on, label, color }: { on: boolean; label: string; color?: string }) {
  const c = on ? (color ?? '#4c1d95') : '#222'
  return (
    <View style={s.cbRow}>
      <Text style={[s.cbBox, { color: c }]}>{on ? '[✓]' : '[  ]'}</Text>
      <Text style={[on ? s.cbLblOn : s.cbLbl, { color: c }]}>{label}</Text>
    </View>
  )
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <View style={s.iRow}>{children}</View>
}

// ─── Document ─────────────────────────────────────────────────────────────────
function RepairSlipDocument({ data }: { data: RepairSlipData }) {
  const printDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  // ── Step active flags ──
  const inProgress    = ['in_progress', 'waiting_pr', 'recommend_replacement', 'completed'].includes(data.status)
  const hasPR         = !!data.prNote || data.status === 'waiting_pr'
  const hasReplacement = !!data.replacementNote || data.status === 'recommend_replacement'
  const isCompleted   = data.status === 'completed'

  const steps: { text: string; done: boolean }[] = [
    { text: `รับแจ้งซ่อม — วันที่ ${data.requestDate}`,                                                done: true },
    { text: `มอบหมายงาน: ${data.assignedTo ?? '......................................'}`,                  done: !!data.assignedTo },
    { text: 'ตรวจสอบและวินิจฉัยอุปกรณ์',                                                                done: inProgress },
    { text: 'ดำเนินการซ่อมแซม',                                                                          done: ['in_progress', 'waiting_pr', 'completed'].includes(data.status) },
    { text: `รออะไหล่ / ออกใบ PR${data.prDate ? ` — ${data.prDate}` : ''}`,                             done: hasPR },
    { text: 'แนะนำจัดซื้ออุปกรณ์ทดแทน',                                                                 done: hasReplacement },
    { text: `ซ่อมแซมเสร็จสมบูรณ์${data.resolvedDate ? ` — ${data.resolvedDate}` : ''}`,                  done: isCompleted },
    { text: 'ส่งคืนและรับมอบอุปกรณ์',                                                                    done: isCompleted },
  ]

  // ── Repair type checkboxes ──
  const isPRType      = hasPR && !isCompleted || (data.status === 'waiting_pr')
  const isReplacType  = hasReplacement
  const isInternalRep = !isPRType && !isReplacType && data.status !== 'pending' && data.status !== 'cancelled'
  const isExternal    = false

  // ── Acceptance state ──
  const done    = isCompleted
  const ongoing = ['pending', 'in_progress', 'waiting_pr'].includes(data.status)
  const needRep = data.status === 'recommend_replacement'

  return (
    <Document title={`ใบแจ้งซ่อม ${data.id}`}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerBand}>
          <View>
            <Text style={s.hospName}>โรงพยาบาล</Text>
            <Text style={s.hospSub}>กรมการแพทย์ · กระทรวงสาธารณสุข</Text>
          </View>
          <View>
            <Text style={s.docTitle}>ใบแจ้งซ่อมคอมพิวเตอร์และอุปกรณ์ IT</Text>
            <Text style={s.docSub}>งานคอมพิวเตอร์และเทคโนโลยีสารสนเทศ  |  เลขที่ {data.id}</Text>
          </View>
        </View>

        {/* ── Info grid ── */}
        <View style={s.infoBlock}>
          <FieldRow>
            <Text style={s.lbl}>ส่งซ่อม:</Text>
            <Text style={[s.val, { flex: 2 }]}>{data.deviceBrand || '—'}</Text>
            <Text style={s.lbl}>ประเภทอุปกรณ์:</Text>
            <Text style={s.val}>{data.equipmentTypeLabel}</Text>
            <Text style={s.lbl}>วันที่แจ้ง:</Text>
            <Text style={[s.val, { marginRight: 0 }]}>{data.requestDate}</Text>
          </FieldRow>
          <FieldRow>
            <Text style={s.lbl}>ผู้แจ้งซ่อม:</Text>
            <Text style={[s.val, { flex: 2 }]}>{data.requesterName}</Text>
            <Text style={s.lbl}>ตำแหน่ง:</Text>
            <Text style={s.val}>{data.position ?? '—'}</Text>
            <Text style={s.lbl}>เบอร์ภายใน:</Text>
            <Text style={[s.val, { marginRight: 0 }]}>{data.phone}</Text>
          </FieldRow>
          <FieldRow>
            <Text style={s.lbl}>หน่วยงาน:</Text>
            <Text style={[s.val, { flex: 2 }]}>{data.department}</Text>
            <Text style={s.lbl}>สถานที่ติดตั้ง:</Text>
            <Text style={[s.val, { flex: 2, marginRight: 0 }]}>{data.deviceLocation ?? '—'}</Text>
          </FieldRow>
          <FieldRow>
            <Text style={s.lbl}>เลขครุภัณฑ์:</Text>
            <Text style={s.val}>{data.assetNo ?? '—'}</Text>
            <Text style={s.lbl}>Serial No.:</Text>
            <Text style={s.val}>{data.deviceSerial ?? '—'}</Text>
            <Text style={s.lbl}>หมวดหมู่ปัญหา:</Text>
            <Text style={s.val}>{data.problemCategoryLabel}</Text>
            <Text style={s.lbl}>ความเร่งด่วน:</Text>
            <Text style={[s.val, { marginRight: 0 }]}>{data.priorityLabel}</Text>
          </FieldRow>

          {/* Symptom */}
          <View style={{ paddingVertical: 3 }}>
            <Text style={s.symptomLabel}>ลักษณะอาการที่ชำรุด / เสียหาย:</Text>
            <Text style={s.symptomBox}>{data.symptom}</Text>
          </View>

          {/* Inspector */}
          <View style={[s.iRow, s.iRowLast]}>
            <Text style={s.lbl}>ผลการตรวจสอบ (เจ้าหน้าที่ IT):</Text>
            <Text style={[s.val, { flex: 2 }]}>
              {data.assignedTo ? `ตรวจสอบและรับผิดชอบโดย  ${data.assignedTo}` : '...............................................................................'}
            </Text>
            <Text style={s.lbl}>สถานะ:</Text>
            <Text style={[s.val, { marginRight: 0, fontWeight: 'bold', color: '#4c1d95' }]}>{data.statusLabel}</Text>
          </View>
        </View>

        {/* ── Two columns ── */}
        <View style={s.twoCol}>

          {/* Left: Steps */}
          <View style={s.leftPane}>
            <Text style={s.paneTitle}>(1) ขั้นตอนการดำเนินงานซ่อมแซม</Text>
            {steps.map((step, i) => (
              <View key={i} style={s.stepRow}>
                <Text style={[s.stepNum, step.done ? s.stepDone : s.stepPend]}>{i + 1}.</Text>
                <Text style={[s.stepTxt, step.done ? s.stepDone : s.stepPend]}>{step.text}</Text>
              </View>
            ))}
            <Text style={[s.subLbl, { marginTop: 8 }]}>สิ่งที่ขอรับการสนับสนุน / ต้องดำเนินการเพิ่มเติม:</Text>
            <Text style={s.noteBox}>
              {data.prNote
                ? data.prNote
                : data.replacementNote
                  ? data.replacementNote
                  : '—'}
            </Text>
          </View>

          {/* Right: Repair type + results */}
          <View style={s.rightPane}>
            <Text style={s.paneTitle}>(2) ประเภทการดำเนินการ / ผลการซ่อม</Text>

            <Text style={[s.subLbl, { marginTop: 0 }]}>ประเภทการดำเนินการ:</Text>
            <CB on={isInternalRep} label="ซ่อมแซมภายในหน่วยงาน" color="#1e6b3a" />
            <CB on={isPRType}      label="ออก PR / PO สั่งซื้ออะไหล่" color="#b45309" />
            <CB on={isReplacType}  label="แนะนำจัดซื้ออุปกรณ์ทดแทน" color="#991b1b" />
            <CB on={isExternal}    label="ส่งซ่อมภายนอกหน่วยงาน" />

            <View style={{ borderTop: '0.4px solid #ccc', marginTop: 5, paddingTop: 5 }}>
              <Text style={s.subLbl}>ใบ PR / รายการอะไหล่:</Text>
              <Text style={[s.noteBox, data.prNote ? { borderColor: '#f97316' } : {}]}>
                {data.prNote ?? '—'}
              </Text>
              {data.prDate ? (
                <View style={[s.iRow, { marginTop: 3, borderBottom: 'none' }]}>
                  <Text style={s.lbl}>วันที่ออก PR:</Text>
                  <Text style={[s.val, { marginRight: 0 }]}>{data.prDate}</Text>
                </View>
              ) : null}
            </View>

            {data.resolvedNote ? (
              <View style={{ marginTop: 5 }}>
                <Text style={s.subLbl}>รายละเอียดการซ่อมแซม:</Text>
                <Text style={s.noteBox}>{data.resolvedNote}</Text>
              </View>
            ) : null}

            {data.replacementNote ? (
              <View style={{ marginTop: 5 }}>
                <Text style={[s.subLbl, { color: '#991b1b' }]}>⚠ รายละเอียดแนะนำจัดซื้อทดแทน:</Text>
                <Text style={[s.noteBox, s.noteBoxRed]}>{data.replacementNote}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Acceptance ── */}
        <View style={s.acceptBlock}>
          <Text style={s.acceptTitle}>การตรวจรับงาน</Text>
          <View style={s.acceptRow}>
            <CB on={done}    label="ซ่อมเสร็จเรียบร้อย"       color="#166534" />
            <CB on={ongoing} label="ยังอยู่ระหว่างดำเนินการ"  color="#1e40af" />
            <CB on={needRep} label="แนะนำจัดซื้อทดแทน"        color="#991b1b" />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <Text style={[s.lbl, { flexShrink: 0 }]}>วันที่ตรวจรับ:</Text>
              <Text style={[s.val, { marginRight: 0 }]}>{data.resolvedDate ?? '..............................'}</Text>
            </View>
          </View>
          {data.replacementNote ? (
            <View style={[s.iRow, { borderBottom: 'none' }]}>
              <Text style={[s.lbl, { color: '#7f1d1d' }]}>หมายเหตุ:</Text>
              <Text style={[s.val, { marginRight: 0, color: '#7f1d1d' }]}>{data.replacementNote}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Director ── */}
        <View style={s.dirBlock}>
          <Text style={s.dirTitle}>ความเห็นและคำสั่งผู้อำนวยการ</Text>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <CB on={false} label="อนุมัติให้ซ่อม" />
            <CB on={false} label="อนุมัติให้ซื้อทดแทน" />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', flex: 1, gap: 3 }}>
              <Text style={[s.cbBox, { color: '#222' }]}>[  ]</Text>
              <Text style={[s.cbLbl, { flexShrink: 0 }]}>อนุมัติให้จ้าง</Text>
              <Text style={[s.dirLine, { flex: 1 }]} />
              <Text style={[s.cbLbl, { flexShrink: 0 }]}>ซ่อม</Text>
            </View>
          </View>
          <View style={{ marginTop: 5 }}>
            <Text style={[s.lbl, { marginBottom: 3 }]}>ความเห็น:</Text>
            <View style={s.dirDottedLine} />
            <View style={s.dirDottedLine} />
            <View style={s.dirDottedLine} />
          </View>
          <View style={s.dirSigBox}>
            <View style={s.dirSigLine} />
            <Text style={s.dirName}>(นายธวัชชัย กอบแก้ว)</Text>
            <Text style={s.dirPost}>ผู้อำนวยการโรงพยาบาลพะเยา</Text>
            <Text style={[s.dirPost, { marginTop: 1 }]}>วันที่ ....../....../......</Text>
          </View>
        </View>

        {/* ── Signatures ── */}
        <View style={s.sigBlock}>
          {[
            { label: 'ลงชื่อผู้แจ้งซ่อม',              sub: data.requesterName },
            { label: 'ลงชื่อเจ้าหน้าที่ IT ผู้รับงาน', sub: data.assignedTo ?? '.....................................' },
            { label: 'ลงชื่อหัวหน้างาน IT',             sub: '.....................................' },
          ].map((sig, i) => (
            <View key={i} style={s.sigBox}>
              <View style={s.sigLine} />
              <Text style={s.sigLbl}>{sig.label}</Text>
              <Text style={s.sigSub}>({sig.sub})</Text>
              <Text style={s.sigSub}>วันที่ ....../....../......</Text>
            </View>
          ))}
        </View>

        <Text style={s.footNote}>
          เอกสารนี้จัดทำโดยระบบอัตโนมัติ · พิมพ์เมื่อ {printDate} · PYHOS-EXP ระบบแจ้งซ่อม IT
        </Text>

      </Page>
    </Document>
  )
}

// ─── Default export: PDFViewer wrapper ────────────────────────────────────────
export default function RepairSlipPDFViewer({ data }: { data: RepairSlipData }) {
  return (
    <PDFViewer width="100%" showToolbar style={{ border: 'none', flex: 1, minHeight: 580 } as any}>
      <RepairSlipDocument data={data} />
    </PDFViewer>
  )
}
