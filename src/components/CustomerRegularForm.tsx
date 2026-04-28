'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateCustomerRegular,
  createRecurringAppointments,
} from '@/app/actions';

const TREATMENTS = ['등관리', '복부', '하체', '전신', '얼굴', '등뒤태', '기타'];
const DOWS = [
  { v: 1, label: '월' },
  { v: 2, label: '화' },
  { v: 3, label: '수' },
  { v: 4, label: '목' },
  { v: 5, label: '금' },
  { v: 6, label: '토', color: 'text-am' },
  { v: 0, label: '일', color: 'text-holiday' },
];

const TIMES_AM = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const TIMES_PM = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00',
];

function label12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (h < 12) return `${h}:${String(m).padStart(2, '0')}`;
  if (h === 12) return `12:${String(m).padStart(2, '0')}`;
  return `${h - 12}:${String(m).padStart(2, '0')}`;
}

export default function CustomerRegularForm({
  customerId,
  initial,
}: {
  customerId: string;
  initial: {
    active: boolean;
    dows: string;
    time: string | null;
    treatment: string | null;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [active, setActive] = useState(initial.active);
  const [dows, setDows] = useState<number[]>(
    initial.dows
      ? initial.dows
          .split(',')
          .map((d) => Number(d.trim()))
          .filter((d) => !Number.isNaN(d))
      : [],
  );
  const [time, setTime] = useState(initial.time?.slice(0, 5) ?? '');
  const [treatments, setTreatments] = useState<string[]>(
    initial.treatment
      ? initial.treatment.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
  );
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [savedHash, setSavedHash] = useState(
    JSON.stringify({ active: initial.active, dows: initial.dows, time: initial.time?.slice(0, 5) ?? '', treatment: initial.treatment ?? '' }),
  );

  const currentHash = JSON.stringify({
    active,
    dows: dows.slice().sort().join(','),
    time,
    treatment: treatments.join(', '),
  });
  const dirty = currentHash !== savedHash;

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateCustomerRegular(customerId, {
        regular_active: active,
        regular_dows: dows.slice().sort().join(','),
        regular_time: time ? time + ':00' : null,
        regular_treatment: treatments.length > 0 ? treatments.join(', ') : null,
      });
      if (!r.ok) {
        setMsg({ kind: 'err', text: r.error });
        return;
      }
      setMsg({ kind: 'ok', text: '저장되었습니다.' });
      setSavedHash(currentHash);
      router.refresh();
    });
  }

  function generate(weeks: number) {
    if (dirty) {
      setMsg({ kind: 'err', text: '먼저 [저장] 후 자동 생성을 누르세요.' });
      return;
    }
    setMsg(null);
    start(async () => {
      const r = await createRecurringAppointments(customerId, weeks);
      if (!r.ok) {
        setMsg({ kind: 'err', text: r.error });
        return;
      }
      const { created, skipped } = r.data;
      setMsg({
        kind: 'ok',
        text: `${weeks}주치 처리: 생성 ${created}건${skipped > 0 ? ` / 중복 ${skipped}건 건너뜀` : ''}`,
      });
      router.refresh();
    });
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold">정기 예약</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-5 w-5 accent-[#C98F7A]"
          />
          <span className="text-sm font-medium">사용</span>
        </label>
      </div>

      {!active ? (
        <p className="text-sm text-muted">
          이 고객을 매주 같은 요일·시간에 자동 예약하려면 위 체크박스를 켜세요.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted mb-1.5">요일 (복수 선택)</p>
            <div className="flex gap-1.5 flex-wrap">
              {DOWS.map((d) => {
                const sel = dows.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() =>
                      setDows((prev) =>
                        prev.includes(d.v)
                          ? prev.filter((x) => x !== d.v)
                          : [...prev, d.v],
                      )
                    }
                    className={`chip min-w-[44px] ${sel ? 'chip-active' : ''} ${
                      !sel && d.color ? d.color : ''
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-1.5">시간</p>
            <p className="text-[10px] text-muted mb-1">오전</p>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {TIMES_AM.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={`chip text-sm ${time === t ? 'chip-active' : ''}`}
                >
                  {label12h(t)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted mb-1">오후</p>
            <div className="grid grid-cols-4 gap-1.5">
              {TIMES_PM.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={`chip text-sm ${time === t ? 'chip-active' : ''}`}
                >
                  {label12h(t)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-1.5">관리 (복수 선택)</p>
            <div className="flex flex-wrap gap-1.5">
              {TREATMENTS.map((t) => {
                const sel = treatments.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setTreatments((prev) =>
                        prev.includes(t)
                          ? prev.filter((x) => x !== t)
                          : [...prev, t],
                      )
                    }
                    className={`chip text-sm ${sel ? 'chip-active' : ''}`}
                  >
                    {sel ? '✓ ' : ''}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {msg ? (
        <p className={`text-sm mt-3 ${msg.kind === 'err' ? 'text-err' : 'text-ok'}`}>
          {msg.text}
        </p>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="btn-primary w-full mt-4"
      >
        {pending ? '저장 중...' : dirty ? '저장' : '저장됨'}
      </button>

      {active && !dirty ? (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted mb-2 font-semibold">자동 생성</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => generate(4)}
              disabled={pending}
              className="btn-ghost text-sm"
            >
              4주
            </button>
            <button
              type="button"
              onClick={() => generate(8)}
              disabled={pending}
              className="btn-ghost text-sm"
            >
              8주
            </button>
            <button
              type="button"
              onClick={() => generate(12)}
              disabled={pending}
              className="btn-ghost text-sm"
            >
              12주
            </button>
          </div>
          <p className="text-[11px] text-muted mt-2">
            내일부터 N주 사이의 해당 요일에 예약을 자동 생성. 같은 시간에 이미 예약 있으면 자동으로 건너뜀.
          </p>
        </div>
      ) : null}
    </section>
  );
}
