// @react-pdf/pdfkit (pdfkit ฉบับที่ react-pdf ใช้) ไม่มีไฟล์ type มาให้
// ประกาศเฉพาะเมธอดที่รายงานครุภัณฑ์แยกตามหน่วยงานเรียกใช้
declare module '@react-pdf/pdfkit' {
  interface PDFDocumentOptions {
    autoFirstPage?: boolean
    compress?: boolean
    displayTitle?: boolean
    lang?: string
    info?: Record<string, string | Date>
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions)
    on(event: 'data', listener: (chunk: Uint8Array) => void): this
    on(event: 'end', listener: () => void): this
    on(event: 'error', listener: (err: unknown) => void): this
    registerFont(name: string, src: ArrayBuffer | Uint8Array): this
    font(name: string): this
    fontSize(size: number): this
    text(text: string, x: number, y: number, options?: { lineBreak?: boolean }): this
    addPage(options?: { size?: [number, number]; margin?: number }): this
    rect(x: number, y: number, w: number, h: number): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    stroke(): this
    fill(color?: string): this
    fillColor(color: string): this
    strokeColor(color: string): this
    lineWidth(w: number): this
    end(): void
  }

  export default PDFDocument
}
