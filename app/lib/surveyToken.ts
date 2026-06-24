// ────────────────────────────────────────────────────────────────────────────
// surveyToken.ts — โทเค็นเข้ารหัสสำหรับลิงก์แบบประเมินความพึงพอใจ (server-only)
//
// ใช้ AES-256-GCM:
//   • เข้ารหัส (confidentiality)  → ผู้ใช้เดา/ไล่ไอดีคำร้องไม่ได้ (กัน IDOR / enumeration)
//   • auth tag (integrity)        → แก้ไขโทเค็นแม้ 1 บิตก็ถอดรหัสไม่ผ่าน (กัน tampering)
//   • exp ใน payload              → ลิงก์หมดอายุ (กัน replay ระยะยาว)
//
// secret มาจาก env (SURVEY_SECRET) เท่านั้น — ไม่เคยถูกส่งออกไปฝั่ง client
// ไฟล์นี้ import 'crypto' ของ Node จึงต้องถูกเรียกใช้จาก route handler / server เท่านั้น
// ────────────────────────────────────────────────────────────────────────────
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const RAW_SECRET = process.env.SURVEY_SECRET ?? ''

if (!RAW_SECRET && process.env.NODE_ENV === 'production') {
  // กันพลาดบน production — ถ้าไม่ตั้ง secret โทเค็นจะใช้คีย์ dev ที่ใครก็เดาได้
  console.warn('[surveyToken] ⚠️  ไม่ได้ตั้งค่า SURVEY_SECRET — โทเค็นแบบประเมินจะไม่ปลอดภัย')
}

// derive คีย์ 32 ไบต์จาก secret (scrypt + salt คงที่ของแอป)
const KEY = scryptSync(RAW_SECRET || 'pyhos-dev-insecure-secret', 'pyhos-survey-key-v1', 32)

const IV_LEN = 12   // GCM nonce 96-bit
const TAG_LEN = 16  // GCM auth tag 128-bit
const DEFAULT_TTL_DAYS = 90

interface TokenPayload {
  id: number   // repair request id
  exp: number  // epoch ms ที่หมดอายุ
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

/** สร้างโทเค็นเข้ารหัสจากไอดีคำร้อง */
export function encodeSurveyToken(id: number, ttlDays = DEFAULT_TTL_DAYS): string {
  const payload: TokenPayload = { id, exp: Date.now() + ttlDays * 86_400_000 }
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // โครงสร้าง: [iv(12)][tag(16)][ciphertext(n)]
  return b64url(Buffer.concat([iv, tag, enc]))
}

/** ถอดรหัสโทเค็น — คืน null ถ้าโทเค็นปลอม/ถูกแก้ไข/หมดอายุ */
export function decodeSurveyToken(token: string): { id: number } | null {
  try {
    const packed = fromB64url(token)
    if (packed.length < IV_LEN + TAG_LEN + 1) return null
    const iv = packed.subarray(0, IV_LEN)
    const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN)
    const enc = packed.subarray(IV_LEN + TAG_LEN)
    const decipher = createDecipheriv('aes-256-gcm', KEY, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
    const obj = JSON.parse(dec) as Partial<TokenPayload>
    if (typeof obj.id !== 'number' || !Number.isInteger(obj.id) || obj.id <= 0) return null
    if (typeof obj.exp !== 'number' || Date.now() > obj.exp) return null
    return { id: obj.id }
  } catch {
    // auth tag ไม่ผ่าน / base64 พัง / JSON พัง → ถือว่าโทเค็นไม่ถูกต้อง
    return null
  }
}
