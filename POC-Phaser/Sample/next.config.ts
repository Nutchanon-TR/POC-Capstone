import type { NextConfig } from 'next';

const config: NextConfig = {
  // Sample เป็นแอปเดี่ยว จึงไม่ต้องให้ Next ไล่หา workspace root จากโปรเจกต์ข้างเคียง
  turbopack: { root: process.cwd() },
};

export default config;
