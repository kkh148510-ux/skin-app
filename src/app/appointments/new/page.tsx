import { todayKST } from '@/lib/date';
import NewAppointmentForm from '@/components/NewAppointmentForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NewAppointmentPage({
  searchParams,
}: {
  searchParams: { d?: string; phone?: string; name?: string; customerId?: string };
}) {
  const initialDate = searchParams.d ?? todayKST();
  return (
    <main className="px-4 pt-6">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-muted text-2xl leading-none">
          ←
        </Link>
        <h1 className="text-xl font-bold">예약 추가</h1>
      </header>
      <NewAppointmentForm
        initialDate={initialDate}
        initialPhone={searchParams.phone ?? ''}
        initialName={searchParams.name ?? ''}
      />
    </main>
  );
}
