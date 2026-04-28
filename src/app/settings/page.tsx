import Link from 'next/link';
import { getServerSupabase, AppSettings } from '@/lib/supabase';
import SettingsForm from '@/components/SettingsForm';

export const dynamic = 'force-dynamic';

const DEFAULT_TEMPLATE =
  '[{{shop_name}}]\n{{customer_name}}님, 오늘 {{appointment_time}} 예약되어 있습니다.\n변경 문의: {{shop_phone}}';

export default async function SettingsPage() {
  const sb = getServerSupabase();
  const { data: settings } = await sb
    .from('app_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  const s = (settings ?? {
    shop_name: '',
    shop_phone: '',
    sms_template: DEFAULT_TEMPLATE,
  }) as AppSettings;

  return (
    <main className="px-4 pt-6">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted text-2xl leading-none">
          ←
        </Link>
        <h1 className="text-xl font-bold">설정</h1>
      </header>

      <SettingsForm
        initialShopName={s.shop_name ?? ''}
        initialShopPhone={s.shop_phone ?? ''}
        initialTemplate={s.sms_template ?? DEFAULT_TEMPLATE}
      />
    </main>
  );
}
