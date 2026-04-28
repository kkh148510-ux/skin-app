'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setAppointmentStatus } from '@/app/actions';

type Props = {
  id: string;
  time: string; // "HH:MM" 24h
  name: string | null;
  treatment: string | null;
  status: 'reserved' | 'completed' | 'cancelled' | 'no_show';
  smsStatus: 'pending' | 'sent' | 'failed' | 'skipped';
};

export default function WeekAppointmentRow({
  id,
  time,
  name,
  treatment,
  status,
  smsStatus,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [hidden, setHidden] = useState(false);

  const hour = Number(time.slice(0, 2));
  const minute = time.slice(3, 5);
  const isAM = hour < 12;
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('이 예약을 취소하시겠어요?')) return;
    start(async () => {
      const r = await setAppointmentStatus(id, 'cancelled');
      if (!r.ok) {
        alert(r.error);
        return;
      }
      setHidden(true);
      router.refresh();
    });
  }

  if (hidden) return null;

  const rowBg = isAM ? 'bg-am-bg/40 border-am/20' : 'bg-pm-bg/40 border-pm/20';
  const label = isAM ? 'text-am' : 'text-pm';

  return (
    <li className="flex items-stretch gap-2">
      <Link
        href={`/appointments/${id}`}
        className={`flex-1 flex items-center gap-3 py-3 px-3 rounded-xl border-2 ${rowBg} hover:brightness-95 ${
          status === 'completed' ? 'opacity-50' : ''
        }`}
      >
        <span
          className={`text-sm font-bold min-w-[36px] ${label}`}
        >
          {isAM ? '오전' : '오후'}
        </span>
        <span className={`font-bold tabular-nums min-w-[60px] text-lg ${label}`}>
          {h12}:{minute}
        </span>
        <span className="flex-1 truncate text-base">
          <span className="font-semibold">{name ?? '미등록'}</span>
          {treatment ? <span className="text-muted"> · {treatment}</span> : null}
        </span>
        {status === 'completed' ? (
          <span className="pill bg-ok text-white font-semibold">완료</span>
        ) : smsStatus === 'sent' ? (
          <span className="pill bg-ok-bg text-ok font-semibold">문자✓</span>
        ) : smsStatus === 'failed' ? (
          <span className="pill bg-err text-white font-semibold">실패</span>
        ) : (
          <span className="pill bg-border/50 text-muted">대기</span>
        )}
      </Link>
      <button
        type="button"
        onClick={handleCancel}
        disabled={pending}
        aria-label="예약 취소"
        className="shrink-0 w-12 rounded-xl bg-err text-white font-bold text-lg hover:bg-err/90 disabled:opacity-50"
      >
        {pending ? '...' : '✕'}
      </button>
    </li>
  );
}
