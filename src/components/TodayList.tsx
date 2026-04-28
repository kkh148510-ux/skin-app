'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatPhone } from '@/lib/phone';
import { setAppointmentStatus } from '@/app/actions';

type Row = {
  id: string;
  time: string;
  name: string | null;
  phone: string;
  treatment: string | null;
  status: 'reserved' | 'completed' | 'cancelled' | 'no_show';
  sms_status: 'pending' | 'sent' | 'failed' | 'skipped';
  sms_enabled: boolean;
};

function SmsBadge({ status, enabled }: { status: Row['sms_status']; enabled: boolean }) {
  if (!enabled) return <span className="pill bg-border/40 text-muted">문자끔</span>;
  if (status === 'sent')
    return <span className="pill bg-ok-bg text-ok">문자완료</span>;
  if (status === 'failed')
    return <span className="pill bg-err-bg text-err">문자실패</span>;
  if (status === 'skipped')
    return <span className="pill bg-border/40 text-muted">문자건너뜀</span>;
  return <span className="pill bg-primary/10 text-primary">문자대기</span>;
}

export default function TodayList({ appointments }: { appointments: Row[] }) {
  return (
    <ul className="space-y-3">
      {appointments.map((a) => (
        <AppointmentRow key={a.id} row={a} />
      ))}
    </ul>
  );
}

function AppointmentRow({ row }: { row: Row }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(row.status === 'completed');
  const [err, setErr] = useState<string | null>(null);

  function complete() {
    setErr(null);
    start(async () => {
      const r = await setAppointmentStatus(row.id, 'completed');
      if (!r.ok) setErr(r.error);
      else setDone(true);
    });
  }

  return (
    <li className={`card ${done ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xl font-bold tabular-nums">{row.time}</span>
            <span className="text-base font-medium truncate">
              {row.name ?? '미등록 고객'}
            </span>
          </div>
          <p className="text-sm text-muted">{formatPhone(row.phone)}</p>
          {row.treatment ? (
            <p className="text-sm mt-1">{row.treatment}</p>
          ) : null}
          <div className="mt-2 flex gap-1.5 flex-wrap">
            <SmsBadge status={row.sms_status} enabled={row.sms_enabled} />
            {done ? <span className="pill bg-ok-bg text-ok">방문완료</span> : null}
          </div>
        </div>
      </div>

      {err ? <p className="text-err text-xs mt-2">{err}</p> : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={complete}
          disabled={pending || done}
          className={`btn ${done ? 'btn-ghost text-muted' : 'btn-ok'} text-sm`}
        >
          {done ? '완료됨' : pending ? '처리중' : '완료'}
        </button>
        <Link
          href={`/appointments/${row.id}`}
          className="btn-ghost text-sm"
        >
          변경
        </Link>
        <a href={`tel:${row.phone}`} className="btn-primary text-sm">
          전화
        </a>
      </div>
    </li>
  );
}
