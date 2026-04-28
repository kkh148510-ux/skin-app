import Link from 'next/link';
import { getServerSupabase, AppointmentWithCustomer } from '@/lib/supabase';
import { addDaysKST, formatKoreanDate, formatTimeKorean, todayKST } from '@/lib/date';
import TodayList from '@/components/TodayList';

export const dynamic = 'force-dynamic';

async function fetchDay(date: string): Promise<AppointmentWithCustomer[]> {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('appointments')
    .select('*, customer:customers(*)')
    .eq('appointment_date', date)
    .order('appointment_time', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AppointmentWithCustomer[];
}

export default async function DayPage({
  params,
}: {
  params: { date: string };
}) {
  const date = params.date;
  const today = todayKST();

  let appointments: AppointmentWithCustomer[] = [];
  let loadError: string | null = null;
  try {
    appointments = await fetchDay(date);
  } catch (e) {
    loadError = e instanceof Error ? e.message : '예약을 불러오지 못했습니다.';
  }

  const active = appointments.filter((a) => a.status !== 'cancelled');
  const smsDone = active.filter((a) => a.sms_status === 'sent').length;
  const smsWaiting = active.filter(
    (a) => a.sms_enabled && a.sms_status === 'pending',
  ).length;

  const yesterday = addDaysKST(date, -1);
  const tomorrow = addDaysKST(date, 1);

  return (
    <main className="px-4 pt-6">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-muted text-2xl leading-none">
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold">
            {date === today ? '오늘 예약' : '예약'}
          </h1>
          <p className="mt-0.5 text-muted text-xs">{formatKoreanDate(date)}</p>
        </div>
      </header>

      <div className="card mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">전체</p>
          <p className="text-xl font-bold">{active.length}건</p>
        </div>
        <div className="text-right text-sm">
          <p>
            <span className="text-ok font-semibold">문자완료 {smsDone}</span>
          </p>
          <p className="text-muted">대기 {smsWaiting}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Link href={`/day/${yesterday}`} className="chip flex-1">
          어제
        </Link>
        <Link
          href={`/day/${today}`}
          className={`chip flex-1 ${date === today ? 'chip-active' : ''}`}
        >
          오늘
        </Link>
        <Link href={`/day/${tomorrow}`} className="chip flex-1">
          내일
        </Link>
      </div>

      {loadError ? (
        <div className="card text-err text-sm">{loadError}</div>
      ) : active.length === 0 ? (
        <div className="card text-center text-muted py-12">
          예약이 없습니다.
        </div>
      ) : (
        <TodayList
          appointments={active.map((a) => ({
            id: a.id,
            time: formatTimeKorean(a.appointment_time),
            name: a.customer?.name ?? null,
            phone: a.customer?.phone_normalized ?? '',
            treatment: a.treatment,
            status: a.status,
            sms_status: a.sms_status,
            sms_enabled: a.sms_enabled,
          }))}
        />
      )}

      <Link
        href={`/appointments/new?d=${date}`}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 btn-primary shadow-lg px-6"
        style={{ boxShadow: '0 8px 24px rgba(201,143,122,0.35)' }}
      >
        + 예약 추가
      </Link>
    </main>
  );
}
