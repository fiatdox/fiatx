'use client'
// ─── PDF บนมือถือ ────────────────────────────────────────────────────────────
// Chrome บน Android ไม่มีตัวแสดง PDF ในหน้า — iframe (รวม PDFViewer ของ react-pdf) จะว่างเปล่า
// หน้าที่แสดง PDF ใช้ canInlinePdf() เลือกระหว่างฝังในหน้า กับปุ่มบันทึก/แชร์ไฟล์ให้แอปในเครื่องเปิดและสั่งพิมพ์

/** เบราว์เซอร์แสดง PDF ในหน้าได้ไหม — navigator.pdfViewerEnabled บอกตรง ๆ (Chrome 94+, Safari 16.4+) เบราว์เซอร์เก่าเดาจาก UA */
export const canInlinePdf = () => {
  if (typeof navigator === 'undefined') return true
  const nav = navigator as Navigator & { pdfViewerEnabled?: boolean }
  if (/Android/i.test(nav.userAgent)) return false
  if (typeof nav.pdfViewerEnabled === 'boolean') return nav.pdfViewerEnabled
  return !/Mobi/i.test(nav.userAgent)
}

/** บันทึกไฟล์ลงเครื่อง — Android แสดงแถบ "ดาวน์โหลดแล้ว · เปิด" ให้เปิดด้วยแอป PDF แล้วสั่งพิมพ์ได้ */
export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** แชร์ไฟล์ผ่านเมนูแชร์ของเครื่อง (LINE / Drive / แอปพิมพ์) — false = เบราว์เซอร์ไม่รองรับหรือผู้ใช้ยกเลิก */
export const canShareFile = (file: File) =>
  typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

export const shareFile = async (file: File, title: string) => {
  if (!canShareFile(file)) return false
  try {
    await navigator.share({ files: [file], title })
    return true
  } catch {
    return false
  }
}
