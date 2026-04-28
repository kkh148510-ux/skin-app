import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAF7F2',
        card: '#FFFFFF',
        primary: '#C98F7A',
        'primary-dark': '#B67B66',
        text: '#2B211D',
        muted: '#7A6A62',
        // 완료 / 긍정
        ok: '#3E9B5F',
        'ok-bg': '#DDF0E3',
        // 에러 / 취소
        err: '#C04545',
        'err-bg': '#FADADA',
        // 오전 (파랑)
        am: '#3B82C4',
        'am-bg': '#DCECF7',
        // 오후 (주황)
        pm: '#D17A33',
        'pm-bg': '#FAE5D0',
        // 공휴일 (강한 빨강)
        holiday: '#D8352F',
        'holiday-bg': '#FBDCDC',
        border: '#ECE4DC',
      },
      fontFamily: {
        sans: [
          '"Pretendard"',
          '"Apple SD Gothic Neo"',
          '"Malgun Gothic"',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
