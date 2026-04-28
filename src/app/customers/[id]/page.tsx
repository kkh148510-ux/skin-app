import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase';
import { formatPhone } from '@/lib/phone';
import { formatShortDate, formatTimeKorean } from '@/lib/date';
import CustomerEditForm from '@/components/CustomerEditForm';
import CustomerRegularForm from '@/components/CustomerRegularForm';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const sb = getServerSupabase();
  const { data: customer } = await sb
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (!customer) notFound();

  const { data: appts } = await sb
    .from('appointments')
    .select('id, appointment_date, appointment_time, treatment, status')
    .eq('customer_id', params.id)
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false })
    .limit(30);

  return (
    <main className="px-4 pt-6">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/customers" className="text-muted text-2xl leading-none">
          ←
        </Link>
        <h1 className="text-xl font-bold">고객 상세</h1>
      </header>

      <CustomerEditForm
        id={customer.id}
        initialName={customer.name ?? ''}
        initialPhone={formatPhone(customer.phone_normalized)}
        initialMemo={customer.memo ?? ''}
      />

      <section className="mt-6">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/appointments/new?phone=${customer.phone_normalized}&name=${encodeURIComponent(
              customer.name ?? '',
            )}`}
            className="btn-primary"
          >
            예약잡기
          </Link>
          <a href={`tel:${customer.phone_normalized}`} className="btn-ghost">
            전화걸기
          </a>
        </div>
      </section>

      <section className="mt-6">
        <CustomerRegularForm
          customerId={customer.id}
          initial={{
            active: customer.regular_active ?? false,
            dows: customer.regular_dows ?? '',
            time: customer.regular_time ?? null,
            treatment: customer.regular_treatment ?? null,
          }}
        />
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold mb-2">방문기록</h2>
        {!appts || appts.length === 0 ? (
          <div className="card text-muted text-sm py-6 text-center">
            기록이 없습니다.
          </div>
        ) : (
          <ul className="space-y-2">
            {appts.map((a) => (
              <li key={a.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {formatShortDate(a.appointment_date as string)}{' '}
                    {formatTimeKorean(a.appointment_time as string)}
                  </p>
                  {a.treatment ? (
                    <p className="text-xs text-muted">{a.treatment}</p>
                  ) : null}
                </div>
                <StatusPill status={a.status as string} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'completed')
    return <span className="pill bg-ok-bg text-ok">완료</span>;
  if (status === 'cancelled')
    return <span className="pill bg-border/40 text-muted">취소</span>;
  if (status === 'no_show')
    return <span className="pill bg-err-bg text-err">노쇼</span>;
  return <span className="pill bg-primary/10 text-primary">예약</span>;
}
