// 한국 시간(KST, UTC+9) 기준 날짜 유틸

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstNow(): Date {
  return new Date(Date.now() + KST_OFFSET_MS);
}

/** YYYY-MM-DD (KST 기준) */
export function todayKST(): string {
  const d = kstNow();
  return d.toISOString().slice(0, 10);
}

/** offset 일만큼 더한 KST 날짜 문자열 */
export function addDaysKST(baseDate: string, days: number): string {
  const [y, m, d] = baseDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

const WEEK_KR = ['일', '월', '화', '수', '목', '금', '토'];

/** "2026년 4월 24일 금요일" 형식 */
export function formatKoreanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const w = WEEK_KR[dt.getUTCDay()];
  return `${y}년 ${m}월 ${d}일 ${w}요일`;
}

/** 요일 한 글자: 월, 화, ... */
export function dayOfWeekKR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return WEEK_KR[dt.getUTCDay()];
}

/** 해당 날짜가 속한 주의 월요일(YYYY-MM-DD) 반환 */
export function mondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=일, 1=월, ... 6=토
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

/** startDate 로부터 N일의 날짜 배열 */
export function daysFrom(startDate: string, count: number): string[] {
  const arr: string[] = [];
  for (let i = 0; i < count; i++) arr.push(addDaysKST(startDate, i));
  return arr;
}

/** "MM/DD" */
export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

/** "HH:MM:SS" -> "HH:MM" */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/** "HH:MM(:SS)" -> "오후 1:30" (한국식 12시간제) */
export function formatTimeKorean(time: string): string {
  const [hStr, mStr] = time.slice(0, 5).split(':');
  const h = Number(hStr);
  const m = mStr ?? '00';
  if (h === 0) return `오전 12:${m}`;
  if (h < 12) return `오전 ${h}:${m}`;
  if (h === 12) return `오후 12:${m}`;
  return `오후 ${h - 12}:${m}`;
}
