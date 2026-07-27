'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const TABS: Array<{ href: string; label: string; icon: ReactNode }> = [
  {
    href: '/',
    label: 'Басты',
    icon: <path d="M3 11l9-8 9 8v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  },
  {
    href: '/dauys',
    label: 'Дауыс',
    icon: <path d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.5 12C19 16.4 12 21 12 21z" />,
  },
  {
    href: '/bilet',
    label: 'Билет',
    icon: <path d="M3 9a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z" />,
  },
  {
    href: '/otinim',
    label: 'Өтінім',
    icon: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />,
  },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          className={`tab${isActive(pathname, tab.href) ? ' active' : ''}`}
          href={tab.href}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {tab.icon}
          </svg>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
