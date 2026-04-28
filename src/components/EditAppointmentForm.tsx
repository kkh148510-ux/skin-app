'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAppointmentStatus, updateAppointment } from '@/app/actions';
import { dayOfWeekKR } from '@/lib/date';
import { getHolidayName } from '@/lib/holidays';
import MonthCalendar from '@/components/MonthCalendar';

const TIMES_AM = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const TIMES_PM = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00',
];

function DateStatus({ date }: { date: string }) {
  if (!date) return null;
  const holiday = getHolidayName(date);
  const dow = dayOfWeekKR(date);
  const isWeekend = dow === '토' || dow === '일';
  if (holiday) {
    return (
      <p className="mt-2 rounded-xl bg-holiday-bg border border-holiday/30 text-holiday text-sm px-3 py-2 font-semibold">
        ⚠ 공휴일 ({holiday}) — 휴무일 수 있음
      </p>
    );
  }
  if (isWeekend) {
    return (
      <p className="mt-2 rounded-xl bg-err-bg border border-err/30 text-err text-sm px-3 py-2 font-semibold">
        ⚠ 주말 ({dow}요일) — 휴무일 수 있음
      </p>
    );
  }
  return null;
}

function label12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (h < 12) return `${h}:${String(m).padStart(2, '0')}`;
  if (h === 12) return `12:${String(m).padStart(2, '0')}`;
  return `${h - 12}:${String(m).padStart(2, '0')}`;
}

const TREATMENTS = ['등관리', '복부', '하체', '전신', '얼굴', '등뒤태', '기타'];

export default function EditAppointmentForm({
  id,
  initialDate,
  initialTime,
  initialTreatment,
  initialMemo,
  initialSmsEnabled,
  initialStatus,
}: {
  id: string;
  initialDate: string;
  initialTime: string;
  initialTreatment: string;
  initialMemo: string;
  initialSmsEnabled: boolean;
  initialStatus: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [treatments, setTreatments] = useState<string[]>(
    initialTreatment
      ? initialTreatment.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
  );
  const [memo, setMemo] = useState(initialMemo);
  const [smsEnabled, setSmsEnabled] = useState(initialSmsEnabled);
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    start(async () => {
      const r = await updateAppointment(id, {
        appointment_date: date,
        appointment_time: time + ':00',
        treatment: treatments.length > 0 ? treatments.join(', ') : null,
        memo: memo || null,
        sms_enabled: smsEnabled,
      });
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      router.push(`/?d=${date}`);
      router.refresh();
    });
  }

  function cancel() {
    if (!confirm('예약을 취소하시겠어요?')) return;
    start(async () => {
      const r = await setAppointmentStatus(id, 'cancelled');
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      router.push('/');
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section>
        <label className="block text-sm text-muted mb-1.5">날짜</label>
        <MonthCalendar value={date} onChange={setDate} />
        <DateStatus date={date} />
      </section>

      <section>
        <label className="block text-sm text-muted mb-1.5">시간</label>

        <p className="text-xs text-muted mb-1.5">오전</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {TIMES_AM.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTime(t)}
              className={`chip ${time === t ? 'chip-active' : ''}`}
            >
              {label12h(t)}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted mb-1.5">오후</p>
        <div className="grid grid-cols-4 gap-2">
          {TIMES_PM.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTime(t)}
              className={`chip ${time === t ? 'chip-active' : ''}`}
            >
              {label12h(t)}
            </button>
          ))}
        </div>

        <input
          type="time"
          className="input mt-3"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </section>

      <section>
        <label className="block text-sm text-muted mb-1.5">
          관리 (복수 선택 가능)
        </label>
        <div className="flex flex-wrap gap-2">
          {TREATMENTS.map((t) => {
            const active = treatments.includes(t);
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
                className={`chip ${active ? 'chip-active' : ''}`}
              >
                {active ? '✓ ' : ''}
                {t}
              </button>
            );
          })}
        </div>
        {treatments.length > 0 ? (
          <p className="text-xs text-muted mt-1.5">
            선택됨: {treatments.join(', ')}
          </p>
        ) : null}
      </section>

      <section>
        <label className="block text-sm text-muted mb-1.5">메모</label>
        <textarea
          className="input py-3"
          rows={3}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </section>

      <label className="flex items-center gap-2 card cursor-pointer">
        <input
          type="checkbox"
          checked={smsEnabled}
          onChange={(e) => setSmsEnabled(e.target.checked)}
          className="h-5 w-5 accent-[#C98F7A]"
        />
        <span className="text-sm">당일 아침 문자 발송</span>
      </label>

      {err ? <p className="text-err text-sm">{err}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="btn-primary w-full"
      >
        {pending ? '저장 중...' : '저장'}
      </button>

      {initialStatus !== 'cancelled' ? (
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="btn-danger w-full"
        >
          예약 취소
        </button>
      ) : (
        <p className="text-muted text-sm text-center">이미 취소된 예약입니다.</p>
      )}
    </div>
  );
}
