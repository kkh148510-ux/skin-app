'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhone } from '@/lib/phone';
import { markSmsSent, unmarkSms } from '@/app/actions';

type Props = {
  id: string;
  name: string | null;
  phone: string; // 숫자만
  time: string; // HH:MM
  treatment: string | null;
  message: string;
  initialSent: boolean;
};

export default function SmsRow({
  id,
  name,
  phone,
  time,
  treatment,
  message,
  initialSent,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(initialSent);

  function send() {
    if (!phone) {
      alert('전화번호가 없는 고객입니다.');
      return;
    }
    // 폰 SMS 앱 열기
    const url = `sms:${phone}?body=${encodeURIComponent(message)}`;
    window.location.href = url;

    // 발송했다고 가정하고 표시 (취소시엔 [되돌리기] 버튼으로)
    setSent(true);
    start(async () => {
      const r = await markSmsSent(id);
      if (!r.ok) {
        alert(r.error);
        setSent(false);
        return;
      }
      router.refresh();
    });
  }

  function undo() {
    setSent(false);
    start(async () => {
      const r = await unmarkSms(id);
      if (!r.ok) {
        alert(r.error);
        setSent(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li
      className={`card border-2 ${
        sent ? 'border-ok/40 bg-ok-bg/20 opacity-70' : 'border-holiday/40 bg-holiday-bg/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-lg font-bold tabular-nums">{time}</span>
            <span className="text-base font-semibold truncate">
              {name ?? '미등록 고객'}
            </span>
          </div>
          <p className="text-sm text-muted">{formatPhone(phone)}</p>
          {treatment ? <p className="text-xs text-muted mt-0.5">{treatment}</p> : null}
        </div>
        {sent ? (
          <span className="pill bg-ok text-white font-semibold shrink-0">✓ 발송완료</span>
        ) : (
          <span className="pill bg-holiday text-white font-semibold shrink-0">
            미발송
          </span>
        )}
      </div>

      <div className="rounded-lg bg-bg/60 border border-border p-3 text-sm whitespace-pre-wrap mb-3">
        {message}
      </div>

      {sent ? (
        <button
          type="button"
          onClick={undo}
          disabled={pending}
          className="btn-ghost w-full text-sm"
        >
          되돌리기 (재발송 가능하게)
        </button>
      ) : (
        <button
          type="button"
          onClick={send}
          disabled={pending}
          className="btn-primary w-full text-base"
        >
          📩 문자 보내기
        </button>
      )}
    </li>
  );
}
