import Link from 'next/link';
import { getServerSupabase, AppointmentWithCustomer, AppSettings } from '@/lib/supabase';
import { todayKST, addDaysKST, formatKoreanDate, formatTimeKorean } from '@/lib/date';
import { renderSmsTemplate } from '@/lib/aligo';
import SmsRow from '@/components/SmsRow';

export const dynamic = 'force-dynamic';

const DEFAULT_TEMPLATE =
  '[{{shop_name}}]\n{{customer_name}}님, 오늘 {{appointment_time}} 예약되어 있습니다.\n변경 문의: {{shop_phone}}';

async function fetchData(date: string) {
  const sb = getServerSupabase();

  const [{ data: settingsRow }, { data: appts }] = await Promise.all([
    sb.from('app_settings').select('*').limit(1).maybeSingle(),
    sb
      .from('appointments')
      .select('*, customer:customers(*)')
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .eq('sms_enabled', true)
      .order('appointment_time', { ascending: true }),
  ]);

  const settings = (settingsRow ?? {
    shop_name: '피부관리실',
    shop_phone: '',
    sms_template: DEFAULT_TEMPLATE,
  }) as AppSettings;

  return {
    settings,
    appts: (appts ?? []) as AppointmentWithCustomer[],
  };
}

export default async function SmsPage({
  searchParams,
}: {
  searchParams: { d?: string };
}) {
  const today = todayKST();
  const date = searchParams.d ?? today;
  const { settings, appts } = await fetchData(date);

  // 미발송 위로, 발송완료 아래로
  const sortedAppts = [...appts].sort((a, b) => {
    const aSent = a.sms_status === 'sent' ? 1 : 0;
    const bSent = b.sms_status === 'sent' ? 1 : 0;
    if (aSent !== bSent) return aSent - bSent;
    return a.appointment_time.localeCompare(b.appointment_time);
  });

  const pendingCount = appts.filter((a) => a.sms_status !== 'sent').length;
  const sentCount = appts.filter((a) => a.sms_status === 'sent').length;

  const yesterday = addDaysKST(date, -1);
  const tomorrow = addDaysKST(date, 1);

  const settingsIncomplete = !settings.shop_name || !settings.shop_phone;

  return (
    <main className="px-4 pt-6">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-muted text-2xl leading-none">
          ←
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">📩 문자 발송</h1>
          <p className="text-xs text-muted mt-0.5">{formatKoreanDate(date)}</p>
        </div>
        <Link
          href="/settings"
          className="text-2xl leading-none text-muted hover:text-text"
          aria-label="설정"
        >
          ⚙
        </Link>
      </header>

      {settingsIncomplete ? (
        <Link
          href="/settings"
          className="card mb-4 block bg-holiday-bg border-holiday/30 text-holiday"
        >
          <p className="font-semibold">⚠ 매장 정보를 먼저 설정하세요</p>
          <p className="text-xs mt-1">매장 이름·전화번호를 설정해야 문자 본문이 완성돼요. 탭하기 →</p>
        </Link>
      ) : null}

      <div className="card mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-holiday font-semibold">미발송</p>
          <p className="text-2xl font-bold text-holiday">{pendingCount}건</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-ok font-semibold">발송완료</p>
          <p className="text-2xl font-bold text-ok">{sentCount}건</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Link href={`/sms?d=${yesterday}`} className="chip flex-1">
          어제
        </Link>
        <Link
          href={`/sms?d=${today}`}
          className={`chip flex-1 ${date === today ? 'chip-active' : ''}`}
        >
          오늘
        </Link>
        <Link href={`/sms?d=${tomorrow}`} className="chip flex-1">
          내일
        </Link>
      </div>

      {sortedAppts.length === 0 ? (
        <div className="card text-center text-muted py-12">
          이 날 보낼 문자가 없습니다.
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedAppts.map((a) => {
            const message = renderSmsTemplate(settings.sms_template, {
              shop_name: settings.shop_name,
              shop_phone: settings.shop_phone,
              customer_name: a.customer?.name ?? null,
              appointment_time: formatTimeKorean(a.appointment_time),
              appointment_date: a.appointment_date,
            });
            return (
              <SmsRow
                key={a.id}
                id={a.id}
                name={a.customer?.name ?? null}
                phone={a.customer?.phone_normalized ?? ''}
                time={formatTimeKorean(a.appointment_time)}
                treatment={a.treatment}
                message={message}
                initialSent={a.sms_status === 'sent'}
              />
            );
          })}
        </ul>
      )}
    </main>
  );
}
