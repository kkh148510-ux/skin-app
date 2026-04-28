'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase';
import { isValidPhone, normalizePhone, formatPhone } from '@/lib/phone';

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

/** 전화번호로 고객 찾기 (자동완성용) */
export async function findCustomerByPhone(phone: string): Promise<ActionResult<{
  id: string;
  name: string | null;
  memo: string | null;
} | null>> {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) return { ok: true, data: null };
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('customers')
    .select('id, name, memo')
    .eq('phone_normalized', normalized)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? null };
}

/** 예약 생성 (+ 고객 자동 등록/업데이트) */
export async function createAppointment(input: {
  phone: string;
  name?: string | null;
  appointment_date: string;
  appointment_time: string;
  treatment?: string | null;
  memo?: string | null;
  sms_enabled: boolean;
}): Promise<ActionResult<{ id: string }>> {
  const phone = normalizePhone(input.phone);
  if (!isValidPhone(phone)) return { ok: false, error: '유효한 전화번호를 입력하세요.' };
  if (!input.appointment_date) return { ok: false, error: '날짜를 선택하세요.' };
  if (!input.appointment_time) return { ok: false, error: '시간을 선택하세요.' };

  const name = input.name && input.name.trim() ? input.name.trim() : null;

  const sb = getServerSupabase();

  // 1. 고객 조회
  const { data: existing, error: findErr } = await sb
    .from('customers')
    .select('id, name')
    .eq('phone_normalized', phone)
    .maybeSingle();
  if (findErr) return { ok: false, error: findErr.message };

  let customerId: string;
  if (existing) {
    customerId = existing.id;
    // 이름이 비어있던 기존 고객에 이름이 새로 들어오면 업데이트
    if (!existing.name && name) {
      await sb.from('customers').update({ name }).eq('id', customerId);
    }
  } else {
    const { data: created, error: insErr } = await sb
      .from('customers')
      .insert({
        phone_normalized: phone,
        phone_display: formatPhone(phone),
        name,
      })
      .select('id')
      .single();
    if (insErr || !created) return { ok: false, error: insErr?.message ?? '고객 생성 실패' };
    customerId = created.id;
  }

  // 2. 예약 생성
  const { data: appt, error: apptErr } = await sb
    .from('appointments')
    .insert({
      customer_id: customerId,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      treatment: input.treatment?.trim() || null,
      memo: input.memo?.trim() || null,
      status: 'reserved',
      sms_enabled: input.sms_enabled,
      sms_status: input.sms_enabled ? 'pending' : 'skipped',
    })
    .select('id')
    .single();
  if (apptErr || !appt) return { ok: false, error: apptErr?.message ?? '예약 생성 실패' };

  revalidatePath('/');
  revalidatePath('/customers');
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, data: { id: appt.id } };
}

/** 예약 수정 */
export async function updateAppointment(
  id: string,
  input: {
    appointment_date?: string;
    appointment_time?: string;
    treatment?: string | null;
    memo?: string | null;
    sms_enabled?: boolean;
  },
): Promise<ActionResult<null>> {
  const sb = getServerSupabase();
  const patch: Record<string, unknown> = {};
  if (input.appointment_date) patch.appointment_date = input.appointment_date;
  if (input.appointment_time) patch.appointment_time = input.appointment_time;
  if (input.treatment !== undefined) patch.treatment = input.treatment?.trim() || null;
  if (input.memo !== undefined) patch.memo = input.memo?.trim() || null;
  if (input.sms_enabled !== undefined) patch.sms_enabled = input.sms_enabled;

  const { error } = await sb.from('appointments').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true, data: null };
}

/** 예약 상태 변경 */
export async function setAppointmentStatus(
  id: string,
  status: 'reserved' | 'completed' | 'cancelled' | 'no_show',
): Promise<ActionResult<null>> {
  const sb = getServerSupabase();
  const patch: Record<string, unknown> = { status };
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  const { error } = await sb.from('appointments').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true, data: null };
}

/** 고객 수정 */
export async function updateCustomer(
  id: string,
  input: { name?: string | null; phone?: string; memo?: string | null },
): Promise<ActionResult<null>> {
  const sb = getServerSupabase();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name?.trim() || null;
  if (input.memo !== undefined) patch.memo = input.memo?.trim() || null;
  if (input.phone !== undefined) {
    const n = normalizePhone(input.phone);
    if (!isValidPhone(n)) return { ok: false, error: '유효한 전화번호를 입력하세요.' };
    patch.phone_normalized = n;
    patch.phone_display = formatPhone(n);
  }
  const { error } = await sb.from('customers').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/customers/${id}`);
  revalidatePath('/customers');
  return { ok: true, data: null };
}

/** 문자 발송 완료 표시 (수동 발송용) */
export async function markSmsSent(id: string): Promise<ActionResult<null>> {
  const sb = getServerSupabase();
  const { error } = await sb
    .from('appointments')
    .update({ sms_status: 'sent', sms_sent_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  // 로그도 같이 (수동 발송 기록)
  const { data: appt } = await sb
    .from('appointments')
    .select('customer_id, customer:customers(phone_normalized)')
    .eq('id', id)
    .maybeSingle();
  const phone =
    (appt?.customer as { phone_normalized?: string } | null)?.phone_normalized ?? '';
  await sb.from('sms_logs').insert({
    appointment_id: id,
    customer_id: appt?.customer_id,
    phone_normalized: phone,
    message: '(수동 발송)',
    status: 'success',
    provider: 'manual',
  });

  revalidatePath('/');
  revalidatePath('/sms');
  return { ok: true, data: null };
}

/** 발송 표시 되돌리기 */
export async function unmarkSms(id: string): Promise<ActionResult<null>> {
  const sb = getServerSupabase();
  const { error } = await sb
    .from('appointments')
    .update({ sms_status: 'pending', sms_sent_at: null })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  revalidatePath('/sms');
  return { ok: true, data: null };
}

/** 매장 설정 업데이트 */
export async function updateAppSettings(input: {
  shop_name?: string;
  shop_phone?: string;
  sms_template?: string;
}): Promise<ActionResult<null>> {
  const sb = getServerSupabase();
  const { data: row } = await sb.from('app_settings').select('id').limit(1).maybeSingle();
  if (!row) {
    const { error } = await sb.from('app_settings').insert({
      shop_name: input.shop_name ?? '피부관리실',
      shop_phone: input.shop_phone ?? '',
      sms_template:
        input.sms_template ??
        '[{{shop_name}}]\n{{customer_name}}님, 오늘 {{appointment_time}} 예약되어 있습니다.\n변경 문의: {{shop_phone}}',
    });
    if (error) return { ok: false, error: error.message };
  } else {
    const patch: Record<string, unknown> = {};
    if (input.shop_name !== undefined) patch.shop_name = input.shop_name;
    if (input.shop_phone !== undefined) patch.shop_phone = input.shop_phone;
    if (input.sms_template !== undefined) patch.sms_template = input.sms_template;
    const { error } = await sb.from('app_settings').update(patch).eq('id', row.id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/sms');
  revalidatePath('/settings');
  return { ok: true, data: null };
}

/** 빈 고객 추가 (고객 화면에서 사용) */
export async function createCustomer(input: {
  phone: string;
  name?: string | null;
  memo?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const phone = normalizePhone(input.phone);
  if (!isValidPhone(phone)) return { ok: false, error: '유효한 전화번호를 입력하세요.' };
  const sb = getServerSupabase();

  const { data: existing } = await sb
    .from('customers')
    .select('id')
    .eq('phone_normalized', phone)
    .maybeSingle();
  if (existing) return { ok: true, data: { id: existing.id } };

  const { data, error } = await sb
    .from('customers')
    .insert({
      phone_normalized: phone,
      phone_display: formatPhone(phone),
      name: input.name?.trim() || null,
      memo: input.memo?.trim() || null,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? '고객 생성 실패' };
  revalidatePath('/customers');
  return { ok: true, data: { id: data.id } };
}
