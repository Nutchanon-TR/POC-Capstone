import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';

export const metadata: Metadata = {
  title: 'Connecta Lab | Phaser playground',
  description: 'เดินสำรวจแมปจริง เปิดคอมพิวเตอร์ และเรียนรู้สถาปัตยกรรม Next.js + Phaser ทีละส่วน',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
