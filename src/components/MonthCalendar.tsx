'use client';

import { useState } from 'react';
import { getHolidayName } from '@/lib/holidays';
import { todayKST } from '@/lib/date';

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function ym(y: number, m: number) {
  return `${y}-${pad(m)}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

export default function MonthCalendar({ value, onChange }: Props) {
  const today = todayKST();
  const initial = value || today;
  const [viewY, setViewY] = useState(Number(initial.slice(0, 4)));
  const [viewM, setViewM] = useState(Number(initial.slice(5, 7)));

  function prevMonth() {
    if (viewM === 1) {
      setViewY(viewY - 1);
      setViewM(12);
    } else {
      setViewM(viewM - 1);
    }
  }
  function nextMonth() {
    if (viewM === 12) {
      setViewY(viewY + 1);
      setViewM(1);
    } else {
      setViewM(viewM + 1);
    }
  }

  // 1일의 요일 (0=일, 6=토)
  const firstDow = new Date(Date.UTC(viewY, viewM - 1, 1)).getUTCDay();
  const totalDays = daysInMonth(viewY, viewM);

  // 앞쪽 빈칸 개수 (일요일 시작)
  const cells: Array<{ day: number; date: string } | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, date: `${viewY}-${pad(viewM)}-${pad(d)}` });
  }
  // 6주 완성(42칸)
  while (cells.length < 42) cells.push(null);

  const headerLabels = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="rounded-xl border border-border bg-white p-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="w-10 h-10 rounded-lg hover:bg-bg text-lg"
          aria-label="이전 달"
        >
          ‹
        </button>
        <p className="text-lg font-bold">
          {viewY}년 {viewM}월
        </p>
        <button
          type="button"
          onClick={nextMonth}
          className="w-10 h-10 rounded-lg hover:bg-bg text-lg"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {/* 요일 행 */}
      <div className="grid grid-cols-7 text-center text-xs font-semibold mb-1">
        {headerLabels.map((d, i) => (
          <div
            key={d}
            className={
              i === 0 ? 'text-holiday' : i === 6 ? 'text-am' : 'text-muted'
            }
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c) return <div key={idx} className="aspect-square" />;
          const dow = idx % 7; // 0=일, 6=토
          const isSun = dow === 0;
          const isSat = dow === 6;
          const holiday = getHolidayName(c.date);
          const isToday = c.date === today;
          const isSelected = c.date === value;

          let base = '';
          if (isSelected) {
            base = 'bg-primary text-white border-primary font-bold';
          } else if (isToday) {
            base = 'bg-primary/10 text-primary border-primary font-bold';
          } else if (holiday || isSun) {
            base = 'text-holiday hover:bg-holiday-bg/40 border-transparent';
          } else if (isSat) {
            base = 'text-am hover:bg-am-bg/40 border-transparent';
          } else {
            base = 'hover:bg-bg border-transparent';
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(c.date)}
              className={`aspect-square rounded-lg border text-sm tabular-nums flex flex-col items-center justify-center ${base}`}
              title={holiday ?? ''}
            >
              <span className={`${isSelected || isToday ? '' : ''}`}>
                {c.day}
              </span>
              {holiday && !isSelected ? (
                <span className="text-[9px] leading-none text-holiday font-semibold truncate max-w-full px-0.5">
                  {holiday.length > 3 ? holiday.slice(0, 3) : holiday}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-am inline-block" /> 토
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-holiday inline-block" /> 일·공휴일
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" /> 선택/오늘
        </span>
      </div>
    </div>
  );
}
