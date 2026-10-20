'use client';

import { ConfigProvider } from 'antd';
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#b96a2d',
          colorText: '#51391f',
          colorTextSecondary: '#8b6b43',
          colorBorder: '#d9bd89',
          colorBgContainer: '#fffaf0',
          colorBgElevated: '#fffaf0',
          borderRadius: 6,
          fontFamily: 'Tahoma, Arial, sans-serif',
          controlHeight: 38,
        },
        components: { Button: { primaryShadow: 'none' } },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
