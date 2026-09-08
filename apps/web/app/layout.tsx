import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VIMES | Phiếu nhập kho',
  description: 'Nhập và lưu phiếu nhập kho',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
