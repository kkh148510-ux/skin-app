'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhone } from '@/lib/phone';
import { updateAppSettings } from '@/app/actions';

export default function SettingsForm({
  initialShopName,
  initialShopPhone,
  initialTemplate,
}: {
  initialShopName: string;
  initialShopPhone: string;
  initialTemplate: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shopName, setShopName] = useState(initialShopName);
  const [shopPhone, setShopPhone] = useState(initialShopPhone);
  const [template, setTemplate] = useState(initialTemplate);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // 템플릿 미리보기
  const preview = template
    .replace(/{{\s*shop_name\s*}}/g, shopName || '매장명')
    .replace(/{{\s*shop_phone\s*}}/g, shopPhone || '010-0000-0000')
    .replace(/{{\s*customer_name\s*}}/g, '홍길동')
    .replace(/{{\s*appointment_time\s*}}/g, '오후 2:00')
    .replace(/{{\s*appointment_date\s*}}/g, '2026-04-24');

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateAppSettings({
        shop_name: shopName,
        shop_phone: shopPhone,
        sms_template: template,
      });
      if (!r.ok) {
        setMsg({ kind: 'err', text: r.error });
        return;
      }
      setMsg({ kind: 'ok', text: '저장되었습니다.' });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section>
        <label className="block text-sm font-semibold mb-2">매장 이름</label>
        <input
          className="input"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="예: 윤지 피부관리실"
        />
      </section>

      <section>
        <label className="block text-sm font-semibold mb-2">매장 전화번호</label>
        <input
          className="input"
          inputMode="numeric"
          value={shopPhone}
          onChange={(e) => setShopPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
        />
        <p className="text-xs text-muted mt-1">고객이 변경 문의할 때 받을 번호</p>
      </section>

      <section>
        <label className="block text-sm font-semibold mb-2">문자 템플릿</label>
        <textarea
          className="input py-3"
          rows={5}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
        <div className="mt-2 rounded-xl bg-bg/60 border border-border p-3 text-xs space-y-0.5 text-muted">
          <p>치환 가능한 값:</p>
          <p>
            <code className="text-text">{'{{shop_name}}'}</code> · 매장 이름
          </p>
          <p>
            <code className="text-text">{'{{shop_phone}}'}</code> · 매장 전화
          </p>
          <p>
            <code className="text-text">{'{{customer_name}}'}</code> · 고객 이름 (없으면 '고객')
          </p>
          <p>
            <code className="text-text">{'{{appointment_time}}'}</code> · 예약 시간
          </p>
          <p>
            <code className="text-text">{'{{appointment_date}}'}</code> · 예약 날짜
          </p>
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold mb-2">미리보기</p>
        <div className="rounded-2xl bg-am-bg/40 border-2 border-am/30 p-4 text-sm whitespace-pre-wrap shadow-sm">
          {preview}
        </div>
      </section>

      {msg ? (
        <p className={`text-sm ${msg.kind === 'err' ? 'text-err' : 'text-ok'}`}>
          {msg.text}
        </p>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="btn-primary w-full"
      >
        {pending ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}
