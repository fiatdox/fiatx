import type { NextConfig } from "next";

// รันหลัง reverse proxy ใต้ path (เช่น https://โดเมน/exp) → build production จะใช้ "/exp" อัตโนมัติ
// dev ไม่ใส่ basePath (เปิด localhost:5555 ตรงๆ) ถ้าอยากทดสอบแบบมี basePath ให้ตั้ง NEXT_PUBLIC_BASE_PATH=/exp
// ค่านี้ฝังตอน build — เปลี่ยนแล้วต้อง next build ใหม่
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.NODE_ENV === "production" ? "/exp" : "");

const nextConfig: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["192.168.1.53"],
};

export default nextConfig;
