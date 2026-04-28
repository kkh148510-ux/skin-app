# 오늘예약장부

피부관리실 원장 개인용 예약장부 PWA. 모바일 브라우저에서 사용.

- **기술**: Next.js 14 (App Router) · React · Tailwind · Supabase · 알리고 SMS
- **배포**: Vercel 무료 플랜 (도메인 없이 기본 URL 사용)

## 1. 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev
```

브라우저에서 http://localhost:3000 접속.

## 2. Supabase 세팅 (무료)

1. https://supabase.com/ 에서 새 프로젝트 생성.
2. Project Settings → API 에서 다음 값 복사.
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (사용하지 않지만 형식상 입력)
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (서버에서만 사용)
3. SQL Editor 에서 `supabase/schema.sql` 내용을 붙여넣고 실행.
4. 기본 매장 정보(`app_settings`) 레코드 1개가 자동 생성되어 있습니다. 가게명/가게 전화를 업데이트:

```sql
update public.app_settings
set shop_name = '우리 관리실',
    shop_phone = '010-0000-0000';
```

## 3. 알리고 SMS (무료 크레딧 제공)

1. https://smartsms.aligo.in 가입 후 API 키 발급.
2. 발신번호 사전 등록 필수 (휴대폰 번호).
3. `.env.local` 에 값 입력.
   - `ALIGO_USER_ID` 아이디
   - `ALIGO_API_KEY` API 키
   - `ALIGO_SENDER` 등록된 발신번호 (숫자만)
4. 테스트 시에는 임시로 `ALIGO_TEST_MODE=Y` 를 추가하면 실제 발송 없이 API 호출만 검증 가능.

## 4. Vercel 배포

1. 이 폴더를 GitHub 에 올리고 Vercel 에 새 프로젝트로 import.
2. Vercel Environment Variables 에 `.env.local` 의 값을 모두 입력.
3. `vercel.json` 의 cron 설정이 자동 적용되어, 매일 **UTC 23:00 = KST 08:00** 에
   `/api/cron/send-reservation-sms` 가 실행됩니다.
4. Vercel 이 cron 요청에 자동으로 `Authorization: Bearer $CRON_SECRET` 헤더를
   붙여주므로 환경변수 `CRON_SECRET` 을 반드시 설정하세요 (임의의 긴 문자열).

## 5. 크론 수동 테스트

브라우저나 curl 로 직접 호출해서 동작 확인 가능:

```
https://<배포주소>/api/cron/send-reservation-sms?secret=<CRON_SECRET>
```

또는 과거/미래 날짜를 지정:

```
.../api/cron/send-reservation-sms?secret=XXX&date=2026-04-24
```

응답의 `summary.sent / failed / skipped` 로 결과 확인.

## 6. 홈 화면 추가 (PWA)

1. 배포된 URL 을 모바일 Safari / Chrome 에서 열기.
2. 공유 → 홈 화면에 추가.
3. 아이콘으로 실행하면 주소창 없는 앱 형태로 동작.

## 7. 주요 파일 안내

```
src/
  app/
    page.tsx                            # 오늘 화면
    actions.ts                          # 예약/고객 Server Actions
    appointments/new/page.tsx           # 예약 추가
    appointments/[id]/page.tsx          # 예약 변경
    customers/page.tsx                  # 고객 검색 리스트
    customers/new/page.tsx              # 고객 수동 추가
    customers/[id]/page.tsx             # 고객 상세/메모/방문기록
    api/cron/send-reservation-sms/route.ts  # Vercel Cron
  components/                           # UI 컴포넌트
  lib/
    phone.ts       # 전화번호 정규화/검증/포맷
    date.ts        # KST 날짜 유틸
    supabase.ts    # 서버 전용 Supabase 클라이언트
    aligo.ts       # 알리고 SMS 호출
    sms-sender.ts  # 오늘 예약 일괄 발송 로직 (수동 재발송 분리용)
supabase/schema.sql                     # DB 스키마
vercel.json                             # 크론 스케줄
```

## 8. 설계 포인트

- **고객 고유값은 전화번호.** `customers.phone_normalized` 에 UNIQUE.
- **이름은 선택 입력.** 없으면 `미등록 고객`.
- **중복 고객 방지.** 예약 저장 시 같은 번호가 있으면 기존 고객 재사용.
- **이름 승격.** 이름 비어있던 기존 고객에게 이름이 들어오면 자동 업데이트.
- **중복 문자 방지.** `sms_status='pending'` 인 예약만 발송 대상.
- **RLS.** anon 키 노출 없이 모든 DB 접근을 Server Actions → service_role 경유.

## 9. 추후 확장 여지 (코드 구조만 열어둠)

- 수동 재발송: `src/lib/sms-sender.ts` 의 `sendTodayReservationSMS()` 를 단일 예약
  ID 기반으로 리팩터링하면 OK. 현재 조건(`sms_status='pending'`) 을 풀어주는 옵션만
  추가하면 됨.
- 설정 화면: `app_settings` 테이블에 이미 `sms_send_time`, `sms_template` 등이 있음.
- 통계/매출: 1차 버전 범위 밖.
