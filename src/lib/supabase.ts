import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type Customer = {
  id: string;
  phone_normalized: string;
  phone_display: string | null;
  name: string | null;
  memo: string | null;
  regular_active: boolean;
  regular_dows: string; // '1,3' 등
  regular_time: string | null; // 'HH:MM:SS'
  regular_treatment: string | null;
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  customer_id: string;
  appointment_date: string;
  appointment_time: string;
  treatment: string | null;
  memo: string | null;
  status: 'reserved' | 'completed' | 'cancelled' | 'no_show';
  sms_enabled: boolean;
  sms_status: 'pending' | 'sent' | 'failed' | 'skipped';
  sms_sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentWithCustomer = Appointment & { customer: Customer };

export type AppSettings = {
  id: string;
  shop_name: string;
  shop_phone: string;
  sms_send_time: string;
  sms_template: string;
};

let cached: SupabaseClient | null = null;

/** 서버 전용 Supabase 클라이언트 (service role). 브라우저에서 호출하면 안 됨. */
export function getServerSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 확인 필요.',
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
