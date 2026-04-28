'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const path = usePathname() ?? '/';
  const isToday =
    path === '/' ||
    path.startsWith('/appointments') ||
    path.startsWith('/day') ||
    path.startsWith('/sms');
  const isCustomers = path.startsWith('/customers');

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="mx-auto max-w-md grid grid-cols-2">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-3 text-xs font-medium transition-colors ${
            isToday ? 'text-primary' : 'text-muted'
          }`}
        >
          <span
            className={`text-2xl leading-none mb-1 transition-transform ${
              isToday ? 'scale-110' : ''
            }`}
          >
            📅
          </span>
          <span className={isToday ? 'font-bold' : ''}>오늘</span>
        </Link>
        <Link
          href="/customers"
          className={`flex flex-col items-center justify-center py-3 text-xs font-medium transition-colors ${
            isCustomers ? 'text-primary' : 'text-muted'
          }`}
        >
          <span
            className={`text-2xl leading-none mb-1 transition-transform ${
              isCustomers ? 'scale-110' : ''
            }`}
          >
            👤
          </span>
          <span className={isCustomers ? 'font-bold' : ''}>고객</span>
        </Link>
      </div>
    </nav>
  );
}
