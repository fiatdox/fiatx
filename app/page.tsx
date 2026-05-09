'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaHospital,
  FaArrowRight,
} from 'react-icons/fa'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
        return
      }
      Cookies.set('auth_token', json.token, { expires: 7, sameSite: 'Lax' })
      Cookies.set('user_data', JSON.stringify(json.data), { expires: 7, sameSite: 'Lax' })
      router.push('/home')
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-200 selection:bg-emerald-500/30">
      {/* Decorative background — gradients & blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-emerald-600/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-teal-500/15 blur-[160px]" />
        <div className="absolute -bottom-32 left-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[140px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        {/* ============================ LEFT — BRAND PANEL ============================ */}
        <div className="relative hidden w-full overflow-hidden lg:flex lg:w-1/2 xl:w-3/5">
          <img
            src="https://images.unsplash.com/photo-1616243850909-f010afe8de3a?q=80&w=1200&auto=format&fit=crop"
            alt="Hospital"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-emerald-950/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

          {/* Content over image */}
          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 xl:p-16">
            {/* Brand mark */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-900/40">
                <FaHospital className="text-xl text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-bold tracking-wide text-white">PYHOS-ERP</div>
                <div className="text-xs text-emerald-300/70">Ministry Hospital Portal</div>
              </div>
            </div>

            {/* Hero text */}
            <div className="max-w-lg">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-emerald-300 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                Secure Access
              </div>
              <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight text-white xl:text-5xl">
                ระบบบริหาร<br />
                <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                  โรงพยาบาลอัจฉริยะ
                </span>
              </h1>
              <p className="text-base leading-relaxed text-slate-300/80">
                ศูนย์กลางการบริหารจัดการบุคลากร การเงิน พัสดุ และยุทธศาสตร์ทั้งหมดในที่เดียว — ออกแบบสำหรับเจ้าหน้าที่และผู้บริหารโรงพยาบาล
              </p>

              {/* Feature pills */}
              <div className="mt-8 flex flex-wrap gap-2">
                {['HR & Leave', 'Procurement', 'Finance', 'Strategy', 'IT Support'].map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 backdrop-blur"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FaShieldAlt className="text-emerald-400" />
              เข้ารหัสด้วย TLS 1.3 · รับรองโดยกระทรวงสาธารณสุข
            </div>
          </div>
        </div>

        {/* ============================ RIGHT — LOGIN PANEL ============================ */}
        <div className="flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:w-1/2 lg:px-10 xl:w-2/5 xl:px-16">
          <div className="w-full max-w-md">
            {/* Mobile-only branding */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-900/40">
                <FaHospital className="text-lg text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-bold tracking-wide text-white">PYHOS-ERP</div>
                <div className="text-[11px] text-emerald-300/70">Ministry Hospital Portal</div>
              </div>
            </div>

            {/* Glass card */}
            <div className="relative rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
              {/* corner glow */}
              <div className="pointer-events-none absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

              <div className="mb-7 text-center">
                <h2 className="mb-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  เข้าสู่ระบบ
                </h2>
                <p className="text-sm text-slate-400">
                  ยินดีต้อนรับกลับ — กรุณาลงชื่อเข้าใช้
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleLogin}>
                {/* Username */}
                <div>
                  <label htmlFor="username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    ชื่อผู้ใช้งาน
                  </label>
                  <div className="group relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500 transition-colors group-focus-within:text-emerald-400">
                      <FaUser className="text-sm" />
                    </span>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      placeholder="เช่น somchai.j"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full rounded-xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    รหัสผ่าน
                  </label>
                  <div className="group relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500 transition-colors group-focus-within:text-emerald-400">
                      <FaLock className="text-sm" />
                    </span>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-12 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition-colors hover:text-emerald-400"
                      aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Row: remember + forgot */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      name="remember-me"
                      className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-emerald-500 accent-emerald-500 focus:ring-emerald-500/40"
                    />
                    <span className="text-xs">จดจำฉันไว้</span>
                  </label>
                  <Link
                    href="#"
                    className="text-xs font-medium text-emerald-300/90 transition hover:text-emerald-200"
                  >
                    ลืมรหัสผ่าน?
                  </Link>
                </div>

                {/* Error message */}
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:shadow-emerald-700/40 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                  {!loading && <FaArrowRight className="text-xs transition-transform group-hover:translate-x-0.5" />}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  หรือ
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Helper card */}
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3 text-center">
                <p className="text-xs text-slate-400">
                  ยังไม่มีบัญชี?{' '}
                  <a href="#" className="font-medium text-emerald-300 hover:text-emerald-200">
                    ติดต่อผู้ดูแลระบบ
                  </a>
                </p>
              </div>
            </div>

            {/* Bottom legal */}
            <div className="mt-6 text-center text-[11px] text-slate-500">
              © {new Date().getFullYear()} PYHOS-ERP · กระทรวงสาธารณสุข
              <span className="mx-2">·</span>
              <a href="#" className="hover:text-slate-300">นโยบายความเป็นส่วนตัว</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
