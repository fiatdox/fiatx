'use client'
// ตัวแก้ไขเนื้อหารายงานผลการเดินทาง (tiptap) — ตัวหนา/เอียง/ขีดเส้นใต้ ขนาดตัวอักษร รายการ จัดแนว
// เก็บเป็น JSON (ไม่ใช่ HTML) · ชนิดที่ใช้ได้ต้องตรงกับที่ backend กรอง (hrdTravelReportController.cleanDoc)
import React from 'react'
import { EditorContent, useEditor, useEditorState, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import { Button, Divider, Select, Tooltip } from 'antd'
import { REPORT_BASE_PT, REPORT_FONT_SIZES, SARABUN_SCALE } from './reportShared'
import { AlignCenterOutlined, AlignLeftOutlined, AlignRightOutlined, BoldOutlined, ItalicOutlined, OrderedListOutlined, RedoOutlined, UnderlineOutlined, UndoOutlined, UnorderedListOutlined } from '@ant-design/icons'

const Tool = ({ title, active, onClick, icon, disabled }: { title: string; active?: boolean; onClick: () => void; icon: React.ReactNode; disabled?: boolean }) => (
  <Tooltip title={title}>
    <Button size="small" type={active ? 'primary' : 'text'} icon={icon} onClick={onClick} disabled={disabled} aria-label={title} aria-pressed={!!active} />
  </Tooltip>
)

export const ReportEditor = ({ value, onChange, editable = true }: { value: JSONContent; onChange?: (v: JSONContent) => void; editable?: boolean }) => {
  // โหลดผ่าน next/dynamic ssr:false เสมอ (ไม่มี hydration) — สร้าง editor ทันทีตอน render แรก ให้แถบเครื่องมืออ่านสถานะได้ตั้งแต่ต้น
  const editor = useEditor({
    immediatelyRender: true,
    editable,
    extensions: [
      // ปิดชนิดที่ backend ไม่รับ (หัวเรื่อง อ้างอิง โค้ด เส้นคั่น ขีดฆ่า ลิงก์)
      StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, code: false, horizontalRule: false, strike: false, link: false }),
      TextStyle, FontSize,
      TextAlign.configure({ types: ['paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange?.(e.getJSON()),
    editorProps: { attributes: { class: 'report-editor-content', 'aria-label': 'เนื้อหารายงานผลการเดินทาง', role: 'textbox', 'aria-multiline': 'true' } },
  })
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => e ? {
      bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'),
      bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'),
      size: (e.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      align: (['center', 'right', 'justify'].find(a => e.isActive({ textAlign: a })) ?? 'left'),
      undo: e.can().undo(), redo: e.can().redo(),
    } : null,
  }) ?? { bold: false, italic: false, underline: false, bullet: false, ordered: false, size: '', align: 'left', undo: false, redo: false }
  if (!editor) return <div className="report-editor" style={{ minHeight: 320 }} />
  const c = () => editor.chain().focus()
  return (
    <div className="report-editor" data-testid="report-editor">
      {editable && (
        <div className="report-toolbar" role="toolbar" aria-label="จัดรูปแบบข้อความ">
          <Tool title="ตัวหนา (Ctrl+B)" icon={<BoldOutlined />} active={st.bold} onClick={() => c().toggleBold().run()} />
          <Tool title="ตัวเอียง (Ctrl+I)" icon={<ItalicOutlined />} active={st.italic} onClick={() => c().toggleItalic().run()} />
          <Tool title="ขีดเส้นใต้ (Ctrl+U)" icon={<UnderlineOutlined />} active={st.underline} onClick={() => c().toggleUnderline().run()} />
          <Divider orientation="vertical" />
          <Select size="small" value={st.size} style={{ width: 150 }} aria-label="ขนาดตัวอักษร" popupMatchSelectWidth={false}
            onChange={(v: string) => (v ? c().setFontSize(v).run() : c().unsetFontSize().run())}
            options={[{ value: '', label: `ขนาดปกติ (${REPORT_BASE_PT})` }, ...REPORT_FONT_SIZES.map(s => ({ value: s, label: `ขนาด ${s.replace('pt', '')}` }))]} />
          <Divider orientation="vertical" />
          <Tool title="รายการแบบจุด" icon={<UnorderedListOutlined />} active={st.bullet} onClick={() => c().toggleBulletList().run()} />
          <Tool title="รายการแบบลำดับเลข" icon={<OrderedListOutlined />} active={st.ordered} onClick={() => c().toggleOrderedList().run()} />
          <Divider orientation="vertical" />
          <Tool title="ชิดซ้าย" icon={<AlignLeftOutlined />} active={st.align === 'left'} onClick={() => c().setTextAlign('left').run()} />
          <Tool title="กึ่งกลาง" icon={<AlignCenterOutlined />} active={st.align === 'center'} onClick={() => c().setTextAlign('center').run()} />
          <Tool title="ชิดขวา" icon={<AlignRightOutlined />} active={st.align === 'right'} onClick={() => c().setTextAlign('right').run()} />
          <Tool title="เต็มบรรทัด" icon={<span style={{ fontWeight: 700, fontSize: 12 }}>≡</span>} active={st.align === 'justify'} onClick={() => c().setTextAlign('justify').run()} />
          <Divider orientation="vertical" />
          <Tool title="เลิกทำ (Ctrl+Z)" icon={<UndoOutlined />} disabled={!st.undo} onClick={() => c().undo().run()} />
          <Tool title="ทำซ้ำ (Ctrl+Y)" icon={<RedoOutlined />} disabled={!st.redo} onClick={() => c().redo().run()} />
        </div>
      )}
      <EditorContent editor={editor} />
      <style jsx global>{`
        .report-editor { border: 1px solid var(--app-border-strong); border-radius: 10px; background: var(--app-surface); }
        .report-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; padding: 6px 8px; border-bottom: 1px solid var(--app-border); position: sticky; top: 64px; background: var(--app-surface); z-index: 2; border-radius: 10px 10px 0 0; }
        .report-editor-content { min-height: 440px; padding: 12px 16px; outline: none; font-size: ${REPORT_BASE_PT}pt; line-height: 1.6; color: var(--app-text); zoom: ${SARABUN_SCALE}; }
        .report-editor-content:focus-visible { box-shadow: inset 0 0 0 2px #a855f766; }
        .report-editor-content p { margin: 0 0 4px; }
        .report-editor-content ul, .report-editor-content ol { padding-left: 28px; margin: 0 0 4px; }
        .report-editor-content ul { list-style: disc; }
        .report-editor-content ol { list-style: decimal; }
        .report-editor-content ul ul { list-style: circle; }
      `}</style>
    </div>
  )
}
