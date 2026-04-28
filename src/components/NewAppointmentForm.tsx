'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhone, normalizePhone, isValidPhone } from '@/lib/phone';
import { todayKST, addDaysKST, dayOfWeekKR } from '@/lib/date';
import { getHolidayName } from '@/lib/holidays';
import { createAppointment, findCustomerByPhone } from '@/app/actions';
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

export default function NewAppointmentForm({
  initialDate,
  initialPhone,
  initialName,
}: {
  initialDate: string;
  initialPhone: string;
  initialName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [phone, setPhone] = useState(formatPhone(initialPhone));
  const [name, setName] = useState(initialName);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('');
  const [treatment, setTreatment] = useState('');
  const [memo, setMemo] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const today = todayKST();
  const tomorrow = addDaysKST(today, 1);

  // 전화번호가 유효할 때 기존 고객 자동 조회
  useEffect(() => {
    const n = normalizePhone(phone);
    if (!isValidPhone(n)) {
      setHint(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await findCustomerByPhone(n);
      if (cancelled) return;
      if (r.ok && r.data) {
        if (r.data.name && !name) setName(r.data.name);
        setHint(`기존 고객${r.data.name ? ` · ${r.data.name}` : ''}`);
      } else {
        setHint('새 고객으로 등록됩니다');
      }
    })();
    return () => {
      cancelled = true;
    };
    // name 의 변화로 무한루프 방지하기 위해 phone 만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  function onPhoneChange(v: string) {
    setPhone(formatPhone(v));
  }

  function onSubmit() {
    setErr(null);
    if (!isValidPhone(phone)) {
      setErr('전화번호를 정확히 입력하세요. (010으로 시작)');
      return;
    }
    if (!date) {
      setErr('날짜를 선택하세요.');
      return;
    }
    if (!time) {
      setErr('시간을 선택하세요.');
      return;
    }
    start(async () => {
      const r = await createAppointment({
        phone: normalizePhone(phone),
        name: name || null,
        appointment_date: date,
        appointment_time: time + ':00',
        treatment: treatment || null,
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

  return (
    <div className="space-y-5">
      <section>
        <label className="block text-sm text-muted mb-1.5">전화번호</label>
        <input
          className="input"
          inputMode="numeric"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </section>

      <section>
        <label className="block text-sm text-muted mb-1.5">이름 (선택)</label>
        <input
          className="input"
          placeholder="선택 입력"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </section>

      <section>
        <label className="block text-sm text-muted mb-1.5">날짜</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setDate(today)}
            className={`chip flex-1 ${date === today ? 'chip-active' : ''}`}
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => setDate(tomorrow)}
            className={`chip flex-1 ${date === tomorrow ? 'chip-active' : ''}`}
          >
            내일
          </button>
        </div>
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
        <label className="block text-sm text-muted mb-1.5">관리 (선택)</label>
        <div className="flex flex-wrap gap-2">
          {TREATMENTS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTreatment(treatment === t ? '' : t)}
              className={`chip ${treatment === t ? 'chip-active' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="block text-sm text-muted mb-1.5">메모 (선택)</label>
        <textarea
          className="input py-3"
          rows={2}
          placeholder="선택 입력"
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
        onClick={onSubmit}
        disabled={pending}
        className="btn-primary w-full text-base"
      >
        {pending ? '저장 중...' : '예약 저장'}
      </button>
    </div>
  );
}
