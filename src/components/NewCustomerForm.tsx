'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { createCustomer } from '@/app/actions';

export default function NewCustomerForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    if (!isValidPhone(phone)) {
      setErr('전화번호를 정확히 입력하세요.');
      return;
    }
    start(async () => {
      const r = await createCustomer({
        phone: normalizePhone(phone),
        name: name || null,
        memo: memo || null,
      });
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      router.push(`/customers/${r.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section>
        <label className="block text-sm text-muted mb-1.5">전화번호</label>
        <input
          className="input"
          inputMode="numeric"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
        />
      </section>
      <section>
        <label className="block text-sm text-muted mb-1.5">이름 (선택)</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </section>
      <section>
        <label className="block text-sm text-muted mb-1.5">메모 (선택)</label>
        <textarea
          className="input py-3"
          rows={3}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </section>
      {err ? <p className="text-err text-sm">{err}</p> : null}
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
