'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { updateCustomer } from '@/app/actions';

export default function CustomerEditForm({
  id,
  initialName,
  initialPhone,
  initialMemo,
}: {
  id: string;
  initialName: string;
  initialPhone: string;
  initialMemo: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [memo, setMemo] = useState(initialMemo);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  function save() {
    setMsg(null);
    if (!isValidPhone(phone)) {
      setMsg({ kind: 'err', text: '전화번호를 정확히 입력하세요.' });
      return;
    }
    start(async () => {
      const r = await updateCustomer(id, {
        name: name || null,
        phone: normalizePhone(phone),
        memo: memo || null,
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
    <div className="space-y-3">
      <section>
        <label className="block text-sm text-muted mb-1.5">이름</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="미등록"
        />
      </section>
      <section>
        <label className="block text-sm text-muted mb-1.5">전화번호</label>
        <input
          className="input"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
        />
      </section>
      <section>
        <label className="block text-sm text-muted mb-1.5">메모</label>
        <textarea
          className="input py-3"
          rows={3}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 홍조 있음 / 압 약하게"
        />
      </section>
      {msg ? (
        <p className={msg.kind === 'err' ? 'text-err text-sm' : 'text-ok text-sm'}>
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
