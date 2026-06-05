import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { ThemeModeProvider } from "./components/ThemeProvider";

const sarabun = Sarabun({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบบริหารโรงพยาบาลอัจฉริยะ",
  description: "ระบบบริหารโรงพยาบาลอัจฉริยะเป็นแพลตฟอร์มที่ช่วยให้โรงพยาบาลสามารถจัดการและดำเนินงานได้อย่างมีประสิทธิภาพ โดยมีฟีเจอร์ต่าง ๆ เช่น การจัดการผู้ป่วย การจัดการบุคลากร การจัดการทรัพยากร และการวิเคราะห์ข้อมูล เพื่อช่วยให้โรงพยาบาลสามารถให้บริการที่ดีที่สุดแก่ผู้ป่วยได้อย่างมีประสิทธิภาพ",
};

// ตั้งค่า data-theme ก่อน paint เพื่อกันจอกระพริบ (FOUC) — default = dark
const themeInitScript = `(function(){try{var m=localStorage.getItem('app-theme');if(m!=='light'&&m!=='dark'){m='dark';}document.documentElement.setAttribute('data-theme',m);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${sarabun.variable} antialiased min-h-screen`}>
        <ThemeModeProvider>{children}</ThemeModeProvider>
      </body>
    </html>
  );
}
