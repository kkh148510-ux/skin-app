import { NextRequest, NextResponse } from 'next/server';
import { sendTodayReservationSMS } from '@/lib/sms-sender';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Vercel Cron: 매일 UTC 23:00 (= KST 08:00) 실행.
 * vercel.json 참고.
 *
 * 보안:
 *  - Vercel Cron 은 요청 헤더 `Authorization: Bearer <CRON_SECRET>` 자동 포함.
 *  - 수동 테스트 시에는 `?secret=CRON_SECRET` 쿼리로도 허용.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not set' }, { status: 500 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const fromHeader = auth === `Bearer ${secret}`;
  const fromQuery = req.nextUrl.searchParams.get('secret') === secret;
  if (!fromHeader && !fromQuery) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const override = req.nextUrl.searchParams.get('date') || undefined;
  try {
    const summary = await sendTodayReservationSMS(override);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'unknown error' },
      { status: 500 },
    );
  }
}
