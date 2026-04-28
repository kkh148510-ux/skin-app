import Link from 'next/link';
import { getServerSupabase, AppointmentWithCustomer } from '@/lib/supabase';
import {
  todayKST,
  addDaysKST,
  mondayOfWeek,
  daysFrom,
  dayOfWeekKR,
  formatShortDate,
  formatTimeKorean,
} from '@/lib/date';
import { formatPhone } from '@/lib/phone';
import { getHolidayName } from '@/lib/holidays';
import WeekAppointmentRow from '@/components/WeekAppointmentRow';

export const dynamic = 'force-dynamic';

async function fetchRange(startDate: string, endDate: string): Promise<AppointmentWithCustomer[]> {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('appointments')
    .select('*, customer:customers(*)')
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AppointmentWithCustomer[];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { w?: string; d?: string };
}) {
  const today = todayKST();
  const base = searchParams.d ?? searchParams.w ?? today;
  const weekStart = mondayOfWeek(base);
  const weekEnd = addDaysKST(weekStart, 4);
  // 월~금 + 토/일 중 공휴일만 포함
  const days = daysFrom(weekStart, 7).filter((d) => {
    const dow = dayOfWeekKR(d);
    const isWeekend = dow === '토' || dow === '일';
    const isHoliday = !!getHolidayName(d);
    return !isWeekend || isHoliday;
  });

  let appts: AppointmentWithCustomer[] = [];
  let loadError: string | null = null;
  try {
    appts = await fetchRange(weekStart, weekEnd);
  } catch (e) {
    loadError = e instanceof Error ? e.message : '예약을 불러오지 못했습니다.';
  }

  const active = appts.filter((a) => a.status !== 'cancelled');
  const byDay = new Map<string, AppointmentWithCustomer[]>();
  for (const d of days) byDay.set(d, []);
  for (const a of active) {
    byDay.get(a.appointment_date)?.push(a);
  }

  const totalActive = active.length;
  const totalSent = active.filter((a) => a.sms_status === 'sent').length;
  const totalPending = active.filter(
    (a) => a.sms_enabled && a.sms_status === 'pending',
  ).length;

  // 오늘 미발송 문자 개수 (홈에 큰 알림 띄우기 위한 것)
  const todayPending = active.filter(
    (a) =>
      a.appointment_date === today &&
      a.sms_enabled &&
      a.sms_status !== 'sent',
  ).length;

  const prevWeek = addDaysKST(weekStart, -7);
  const nextWeek = addDaysKST(weekStart, 7);
  const thisWeekStart = mondayOfWeek(today);

  return (
    <main className="px-4 pt-6">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">이번 주</h1>
          <p className="mt-1 text-muted text-sm tabular-nums">
            {formatShortDate(weekStart)} ~ {formatShortDate(weekEnd)}
          </p>
        </div>
        <Link
          href="/settings"
          className="w-11 h-11 rounded-full bg-white border border-border flex items-center justify-center text-xl text-muted hover:text-text"
          aria-label="설정"
        >
          ⚙
        </Link>
      </header>

      {todayPending > 0 ? (
        <Link
          href={`/sms?d=${today}`}
          className="block mb-4 rounded-2xl p-4 bg-primary text-white shadow-md active:scale-[0.99]"
          style={{ boxShadow: '0 8px 20px -4px rgba(201,143,122,0.5)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold opacity-90 uppercase tracking-wider">
                오늘 보낼 문자
              </p>
              <p className="text-2xl font-bold mt-0.5">📩 {todayPending}건</p>
            </div>
            <span className="text-3xl">→</span>
          </div>
        </Link>
      ) : null}

      <div className="card mb-3 flex items-center justify-between">
        <div>
          <p className="section-title">이번주 예약</p>
          <p className="text-2xl font-bold mt-0.5">{totalActive}<span className="text-base font-medium text-muted">건</span></p>
        </div>
        <div className="flex gap-3">
          <div className="text-center px-3">
            <p className="text-xs font-semibold text-ok uppercase tracking-wider">완료</p>
            <p className="text-lg font-bold text-ok mt-0.5">{totalSent}</p>
          </div>
          <div className="text-center px-3 border-l border-border">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">대기</p>
            <p className="text-lg font-bold text-muted mt-0.5">{totalPending}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <Link href={`/?w=${prevWeek}`} className="chip flex-1">
          ← 지난주
        </Link>
        <Link
          href={`/?w=${thisWeekStart}`}
          className={`chip flex-1 ${weekStart === thisWeekStart ? 'chip-active' : ''}`}
        >
          이번주
        </Link>
        <Link href={`/?w=${nextWeek}`} className="chip flex-1">
          다음주 →
        </Link>
      </div>

      {loadError ? (
        <div className="card text-err text-sm">{loadError}</div>
      ) : (
        <ul className="space-y-4">
          {days.map((d) => (
            <DayBlock
              key={d}
              date={d}
              isToday={d === today}
              appointments={byDay.get(d) ?? []}
            />
          ))}
        </ul>
      )}

      <Link
        href={`/appointments/new?d=${today}`}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 btn-primary px-7 text-base"
        style={{ boxShadow: '0 12px 28px -4px rgba(201,143,122,0.55)' }}
      >
        + 예약 추가
      </Link>
    </main>
  );
}

function DayBlock({
  date,
  isToday,
  appointments,
}: {
  date: string;
  isToday: boolean;
  appointments: AppointmentWithCustomer[];
}) {
  const dow = dayOfWeekKR(date);
  const count = appointments.length;
  const holiday = getHolidayName(date);

  const cardTone = isToday
    ? 'ring-2 ring-primary'
    : holiday
      ? 'bg-holiday-bg/20 border-holiday/30'
      : '';

  return (
    <li className={`card p-5 ${cardTone}`}>
      <Link href={`/day/${date}`} className="block">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span
              className={`text-3xl font-bold ${holiday ? 'text-holiday' : ''}`}
            >
              {dow}
            </span>
            <span
              className={`text-lg tabular-nums ${
                holiday ? 'text-holiday' : 'text-muted'
              }`}
            >
              {formatShortDate(date)}
            </span>
            {isToday ? (
              <span className="pill bg-primary/15 text-primary text-sm px-3 py-1 font-semibold">
                오늘
              </span>
            ) : null}
            {holiday ? (
              <span className="pill bg-holiday-bg text-holiday text-sm px-3 py-1 font-semibold border border-holiday/30">
                🔴 {holiday}
              </span>
            ) : null}
          </div>
          <span className="text-base text-muted font-medium">
            {count === 0 ? (holiday ? '휴무' : '없음') : `${count}건`}
          </span>
        </div>
      </Link>

      {count === 0 ? null : (
        <ul className="space-y-2 mt-1">
          {appointments.map((a) => (
            <WeekAppointmentRow
              key={a.id}
              id={a.id}
              time={a.appointment_time.slice(0, 5)}
              name={a.customer?.name ?? null}
              treatment={a.treatment}
              status={a.status}
              smsStatus={a.sms_status}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
