"use client";

import type { ReactNode } from "react";

type PackingAppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

const NavIcon = ({ children, label }: { children: ReactNode; label: string }) => (
  <button
    type="button"
    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#647BEF]"
    aria-label={label}
  >
    {children}
  </button>
);

export const PackingAppShell = ({ sidebar, children }: PackingAppShellProps) => {
  return (
    <div className="flex min-h-screen bg-[#f1f5f9] text-[#3D4C6A]">
      <aside
        className="flex w-14 shrink-0 flex-col items-center border-r border-slate-800/20 bg-[#2B3244] py-4"
        aria-label="Основная навигация"
      >
        <NavIcon label="Главная">
          <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </NavIcon>
        <NavIcon label="Упаковка">
          <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </NavIcon>
        <NavIcon label="Задачи">
          <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </NavIcon>
        <NavIcon label="Команда">
          <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </NavIcon>
      </aside>

      <aside
        className="flex w-[min(260px,36vw)] shrink-0 flex-col border-r border-slate-200/90 bg-[#ECEEEF] sm:w-[260px]"
        aria-label="Контекст и заказы"
      >
        {sidebar}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
};
