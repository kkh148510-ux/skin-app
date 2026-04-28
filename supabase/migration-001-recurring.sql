-- 정기예약 기능을 위한 컬럼 추가
-- Supabase > SQL Editor 에서 1회만 실행하세요.

alter table public.customers
  add column if not exists regular_active boolean not null default false,
  add column if not exists regular_dows text not null default '',
  add column if not exists regular_time time,
  add column if not exists regular_treatment text;

-- 의미:
--   regular_active     : 정기예약 사용 여부 (켜짐/꺼짐)
--   regular_dows       : 정기 요일들. 콤마 구분. 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
--                       예) '1,3,5' = 매주 월·수·금
--   regular_time       : 정기 예약 시간 (HH:MM)
--   regular_treatment  : 정기 관리 종목 (콤마 구분)
