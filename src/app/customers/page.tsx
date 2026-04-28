import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase';
import { formatPhone, normalizePhone } from '@/lib/phone';
import { formatShortDate } from '@/lib/date';
import CustomerSearch from '@/components/CustomerSearch';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  name: string | null;
  phone_normalized: string;
  last_visit_date: string | null;
  last_reserved_date: string | null;
};

async function search(q: string): Promise<Row[]> {
  const sb = getServerSupabase();
  const qNum = normalizePhone(q);
  const qName = q.trim();

  let builder = sb
    .from('customers')
    .select('id, name, phone_normalized')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (qNum && qNum.length >= 3) {
    builder = builder.ilike('phone_normalized', `%${qNum}%`);
  } else if (qName) {
    builder = builder.ilike('name', `%${qName}%`);
  }

  const { data: customers, error } = await builder;
  if (error) throw new Error(error.message);
  const list = customers ?? [];
  if (list.length === 0) return [];

  const ids = list.map((c) => c.id);
  const { data: appts } = await sb
    .from('appointments')
    .select('customer_id, appointment_date, status')
    .in('customer_id', ids)
    .order('appointment_date', { ascending: false });

  const lastVisit: Record<string, string> = {};
  const lastReserved: Record<string, string> = {};
  for (const a of appts ?? []) {
    if (a.status === 'completed' && !lastVisit[a.customer_id]) {
      lastVisit[a.customer_id] = a.appointment_date as string;
    }
    if (!lastReserved[a.customer_id]) {
      lastReserved[a.customer_id] = a.appointment_date as string;
    }
  }

  return list.map((c) => ({
    id: c.id,
    name: c.name,
    phone_normalized: c.phone_normalized,
    last_visit_date: lastVisit[c.id] ?? null,
    last_reserved_date: lastReserved[c.id] ?? null,
  }));
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? '').trim();
  let rows: Row[] = [];
  let loadError: string | null = null;
  try {
    rows = await search(q);
  } catch (e) {
    loadError = e instanceof Error ? e.message : '불러오기 실패';
  }

  return (
    <main className="px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">고객</h1>
      </header>

      <CustomerSearch initial={q} />

      {loadError ? (
        <div className="card text-err text-sm mt-4">{loadError}</div>
      ) : rows.length === 0 ? (
        <div className="card text-muted text-center py-12 mt-4">
          {q ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
        </div>
      ) : (
        <ul className="space-y-3 mt-4">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`} className="card block">
                <p className="text-base font-semibold">
                  {c.name ?? '미등록 고객'}
                </p>
                <p className="text-sm text-muted mt-0.5">
                  {formatPhone(c.phone_normalized)}
                </p>
                <p className="text-xs text-muted mt-1">
                  {c.last_visit_date
                    ? `최근방문 ${formatShortDate(c.last_visit_date)}`
                    : c.last_reserved_date
                      ? `최근예약 ${formatShortDate(c.last_reserved_date)}`
                      : '방문 없음'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/customers/new"
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 btn-primary shadow-lg px-6"
        style={{ boxShadow: '0 8px 24px rgba(201,143,122,0.35)' }}
      >
        + 고객 추가
      </Link>
    </main>
  );
}
