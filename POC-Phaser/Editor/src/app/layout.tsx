import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';
import './editor-theme.css';

export const metadata: Metadata = {
  title: 'Map Studio · Connecta',
  description: 'สร้างแมปบนกริดและส่งออก TMJ TSJ PNG สำหรับ Tiled และเกมอื่น',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <AntdRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
