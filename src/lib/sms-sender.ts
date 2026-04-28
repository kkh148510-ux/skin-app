import { getServerSupabase, AppointmentWithCustomer, AppSettings } from '@/lib/supabase';
import { sendAligoSMS, renderSmsTemplate } from '@/lib/aligo';
import { todayKST, formatTime } from '@/lib/date';

export type SendSummary = {
  date: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  details: Array<{ id: string; status: 'sent' | 'failed' | 'skipped'; reason?: string }>;
};

/**
 * 오늘 날짜 기준 예약들에 대해 문자 발송.
 * - status='reserved' && sms_enabled && sms_status='pending' 만 대상
 * - 중복 발송 방지는 sms_status 조건으로 보장
 */
export async function sendTodayReservationSMS(overrideDate?: string): Promise<SendSummary> {
  const sb = getServerSupabase();
  const date = overrideDate ?? todayKST();

  const { data: settingsRow } = await sb
    .from('app_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  const settings = (settingsRow ?? {
    shop_name: '피부관리실',
    shop_phone: '',
    sms_template:
      '[{{shop_name}}]\n{{customer_name}}님, 오늘 {{appointment_time}} 예약되어 있습니다.\n변경 문의: {{shop_phone}}',
  }) as AppSettings;

  const { data: list, error } = await sb
    .from('appointments')
    .select('*, customer:customers(*)')
    .eq('appointment_date', date)
    .eq('status', 'reserved')
    .eq('sms_enabled', true)
    .eq('sms_status', 'pending');
  if (error) throw new Error(error.message);

  const targets = (list ?? []) as AppointmentWithCustomer[];
  const summary: SendSummary = {
    date,
    total: targets.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  for (const appt of targets) {
    const phone = appt.customer?.phone_normalized ?? '';
    if (!phone) {
      await sb
        .from('appointments')
        .update({ sms_status: 'skipped' })
        .eq('id', appt.id);
      summary.skipped += 1;
      summary.details.push({ id: appt.id, status: 'skipped', reason: '전화번호 없음' });
      continue;
    }

    const message = renderSmsTemplate(settings.sms_template, {
      shop_name: settings.shop_name,
      shop_phone: settings.shop_phone,
      customer_name: appt.customer?.name ?? null,
      appointment_time: formatTime(appt.appointment_time),
      appointment_date: appt.appointment_date,
    });

    const result = await sendAligoSMS({ receiver: phone, message });

    await sb.from('sms_logs').insert({
      appointment_id: appt.id,
      customer_id: appt.customer_id,
      phone_normalized: phone,
      message,
      status: result.ok ? 'success' : 'failed',
      provider: 'aligo',
      provider_response: result.raw as object | null,
    });

    if (result.ok) {
      await sb
        .from('appointments')
        .update({ sms_status: 'sent', sms_sent_at: new Date().toISOString() })
        .eq('id', appt.id);
      summary.sent += 1;
      summary.details.push({ id: appt.id, status: 'sent' });
    } else {
      await sb
        .from('appointments')
        .update({ sms_status: 'failed' })
        .eq('id', appt.id);
      summary.failed += 1;
      summary.details.push({
        id: appt.id,
        status: 'failed',
        reason: result.errorMessage,
      });
    }
  }

  return summary;
}
