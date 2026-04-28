-- Supabase 스키마
-- Supabase 프로젝트 > SQL Editor 에 붙여넣어 1회 실행하세요.

create extension if not exists "pgcrypto";

-- 1. customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone_normalized text unique not null,
  phone_display text,
  name text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_phone on public.customers (phone_normalized);
create index if not exists idx_customers_name on public.customers (name);

-- 2. appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  treatment text,
  memo text,
  status text not null default 'reserved'
    check (status in ('reserved','completed','cancelled','no_show')),
  sms_enabled boolean not null default true,
  sms_status text not null default 'pending'
    check (sms_status in ('pending','sent','failed','skipped')),
  sms_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_date on public.appointments (appointment_date);
create index if not exists idx_appointments_customer on public.appointments (customer_id);
create index if not exists idx_appointments_day_status on public.appointments (appointment_date, status);

-- 3. sms_logs
create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  phone_normalized text not null,
  message text not null,
  status text not null check (status in ('success','failed')),
  provider text not null default 'aligo',
  provider_response jsonb,
  sent_at timestamptz not null default now()
);

create index if not exists idx_sms_logs_appt on public.sms_logs (appointment_id);
create index if not exists idx_sms_logs_sent_at on public.sms_logs (sent_at desc);

-- 4. app_settings (단일 레코드로 운영)
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null default '피부관리실',
  shop_phone text not null default '',
  sms_send_time text not null default '08:00',
  sms_template text not null default
    '[{{shop_name}}]' || chr(10) ||
    '{{customer_name}}님, 오늘 {{appointment_time}} 예약되어 있습니다.' || chr(10) ||
    '변경 문의: {{shop_phone}}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 기본 설정 1건 삽입
insert into public.app_settings (shop_name, shop_phone)
select '피부관리실', ''
where not exists (select 1 from public.app_settings);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated on public.appointments;
create trigger trg_appointments_updated before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_app_settings_updated on public.app_settings;
create trigger trg_app_settings_updated before update on public.app_settings
  for each row execute function public.set_updated_at();

-- RLS: 개인용 앱이므로 서비스 롤 키로만 접근한다.
-- 공개 anon 접근을 원천 차단하기 위해 RLS 켜고 정책은 두지 않음.
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.sms_logs enable row level security;
alter table public.app_settings enable row level security;
