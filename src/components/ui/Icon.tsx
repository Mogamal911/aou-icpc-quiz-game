import React from 'react';

const paths = {
  history: <><path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7M12 7v5l3 2" /></>,
  expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  questions: <><path d="M8 3h11v14H8zM5 7H3v14h12v-2M11 7h5M11 11h5" /></>,
  play: <path d="m8 4 12 8-12 8z" />,
  monitor: <><rect x="3" y="3" width="18" height="13" rx="2" /><path d="M12 16v5M8 21h8" /></>,
  edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  code: <path d="m7 6-6 6 6 6m10-12 6 6-6 6M14 3l-4 18" />,
  text: <path d="M4 4h16M12 4v16M8 20h8" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  users: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 3 5v3" /></>,
  trophy: <><path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H3v3a4 4 0 0 0 5 4m8-7h5v3a4 4 0 0 1-5 4M12 13v6M7 21h10M9 19h6" /></>,
  logout: <><path d="M9 3H3v18h6M9 12h12m-5-5 5 5-5 5" /></>,
  alert: <><path d="m12 3 10 18H2L12 3ZM12 9v5M12 17v.1" /></>,
  save: <><path d="M4 3h13l4 4v14H3V3zM8 3v6h8V3M7 21v-8h10v8" /></>,
};

export function Icon({ name, size = 18, className = '' }: {
  name: keyof typeof paths; size?: number; className?: string;
}) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>{paths[name]}</svg>;
}
