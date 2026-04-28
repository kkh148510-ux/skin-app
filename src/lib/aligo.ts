// 알리고 SMS API 연동
// https://smartsms.aligo.in/admin/api/spec.html

function aligoByteLen(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    n += s.charCodeAt(i) > 0x007f ? 2 : 1;
  }
  return n;
}

export type AligoSendResult = {
  ok: boolean;
  raw: unknown;
  errorMessage?: string;
};

export async function sendAligoSMS(params: {
  receiver: string; // 숫자만 (01012345678)
  message: string;
}): Promise<AligoSendResult> {
  const userId = process.env.ALIGO_USER_ID;
  const apiKey = process.env.ALIGO_API_KEY;
  const sender = process.env.ALIGO_SENDER;

  if (!userId || !apiKey || !sender) {
    return {
      ok: false,
      raw: null,
      errorMessage: '알리고 환경변수가 설정되지 않았습니다.',
    };
  }

  const msg = params.message ?? '';
  // 알리고는 EUC-KR 기준 바이트 (한글 1자 = 2바이트). 90바이트 초과면 LMS.
  const msgType = aligoByteLen(msg) > 90 ? 'LMS' : 'SMS';

  const body = new URLSearchParams({
    user_id: userId,
    key: apiKey,
    sender,
    receiver: params.receiver,
    msg,
    msg_type: msgType,
    testmode_yn: process.env.ALIGO_TEST_MODE === 'Y' ? 'Y' : 'N',
  });

  try {
    const res = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });
    const json = (await res.json()) as { result_code?: string | number; message?: string };
    const code = Number(json.result_code ?? 0);
    const ok = code === 1;
    return {
      ok,
      raw: json,
      errorMessage: ok ? undefined : json.message ?? `알리고 오류 (code: ${code})`,
    };
  } catch (err) {
    return {
      ok: false,
      raw: null,
      errorMessage: err instanceof Error ? err.message : '알리고 호출 실패',
    };
  }
}

export function renderSmsTemplate(
  template: string,
  vars: {
    shop_name: string;
    shop_phone: string;
    customer_name: string | null;
    appointment_time: string; // HH:MM
    appointment_date: string; // YYYY-MM-DD
  },
): string {
  const name = vars.customer_name && vars.customer_name.trim() ? vars.customer_name : '고객';
  return template
    .replace(/{{\s*shop_name\s*}}/g, vars.shop_name)
    .replace(/{{\s*shop_phone\s*}}/g, vars.shop_phone)
    .replace(/{{\s*customer_name\s*}}/g, name)
    .replace(/{{\s*appointment_time\s*}}/g, vars.appointment_time)
    .replace(/{{\s*appointment_date\s*}}/g, vars.appointment_date);
}
