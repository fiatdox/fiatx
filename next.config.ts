import type { NextConfig } from "next";

// ค่าเริ่มต้นไม่มี basePath ทั้ง dev และ production (เปิด :5555 ตรงๆ)
// ถ้าต้องรันหลัง reverse proxy ใต้ path ให้ตั้ง NEXT_PUBLIC_BASE_PATH=/exp ก่อน build
// ค่านี้ฝังตอน build — เปลี่ยนแล้วต้อง next build ใหม่
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["192.168.1.53"],
};

export default nextConfig;
