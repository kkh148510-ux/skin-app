import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase, AppointmentWithCustomer } from '@/lib/supabase';
import EditAppointmentForm from '@/components/EditAppointmentForm';

export const dynamic = 'force-dynamic';

export default async function EditAppointmentPage({
  params,
}: {
  params: { id: string };
}) {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('appointments')
    .select('*, customer:customers(*)')
    .eq('id', params.id)
    .maybeSingle();
  if (error || !data) notFound();
  const appt = data as AppointmentWithCustomer;

  return (
    <main className="px-4 pt-6">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-muted text-2xl leading-none">
          ←
        </Link>
        <h1 className="text-xl font-bold">예약 변경</h1>
      </header>

      <div className="card mb-4">
        <p className="text-base font-semibold">
          {appt.customer?.name ?? '미등록 고객'}
        </p>
        <p className="text-sm text-muted">
          {appt.customer?.phone_normalized ?? ''}
        </p>
      </div>

      <EditAppointmentForm
        id={appt.id}
        initialDate={appt.appointment_date}
        initialTime={appt.appointment_time.slice(0, 5)}
        initialTreatment={appt.treatment ?? ''}
        initialMemo={appt.memo ?? ''}
        initialSmsEnabled={appt.sms_enabled}
        initialStatus={appt.status}
      />
    </main>
  );
}
