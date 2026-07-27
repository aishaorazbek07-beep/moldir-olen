import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Backdrop } from '@/components/Backdrop';
import { SiteHeader } from '@/components/SiteHeader';
import { TabBar } from '@/components/TabBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Мөлдір өлең - 2-маусым | Ұлттық поэзиялық жоба',
  description:
    'Мөлдір өлең - ұлттық поэзиялық жоба. Дауыс беріңіз, кешке билет алыңыз, 2-маусымға өтінім тапсырыңыз.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#120731',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="kk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prata&family=Inter:wght@400;500;600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Оболочка живёт здесь, поэтому при переходах фон и анимация не перезапускаются */}
        <Backdrop />
        <SiteHeader />
        {children}
        <footer>
          <span className="serif">Мөлдір өлең</span>
          Қазақстан Жазушылар одағының қолдауымен
          <br />© 2026 · Барлық құқықтар қорғалған
        </footer>
        <TabBar />
      </body>
    </html>
  );
}
