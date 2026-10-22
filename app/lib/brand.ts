// สีและลายของแถบหัวระบบ — ใช้ทั้ง Navbar และ skeleton ระหว่างโหลดหน้า
// แยกไว้ในไฟล์ธรรมดา (ไม่ใช่ 'use client') ให้ loading.tsx ที่เป็น Server Component import ได้
// ค่าต้องตรงกัน ไม่งั้นแถบหัวจะเปลี่ยนสีวูบตอนหน้าจริงขึ้นแทน skeleton

/** ลายดาวพื้นหลัง (โปร่งใสมากเพื่อให้เข้ากับธีมมืด) — วางทับ gradient ด้วย background-blend-mode: overlay */
export const STAR_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cg fill='white' fill-opacity='0.05'%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(20,40) rotate(15) scale(1.2)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(120,30) rotate(-25) scale(0.8)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(180,90) rotate(45) scale(1.5)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(40,160) rotate(-10) scale(0.6)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(130,180) rotate(60) scale(1.1)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(210,190) rotate(-40) scale(0.9)'/%3E%3C/g%3E%3C/svg%3E")`

/** Gradient หลัก (slate-950 → emerald-950 → teal-600) — สอดคล้องกับ blob ที่หน้า Login */
export const HEADER_GRADIENT = 'linear-gradient(90deg, #020617 0%, #0f172a 30%, #064e3b 75%, #0d9488 110%)'
