'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      router.replace(`/customers${params.toString() ? '?' + params.toString() : ''}`);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <input
      className="input"
      placeholder="전화번호 / 이름 검색"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      inputMode="search"
    />
  );
}
