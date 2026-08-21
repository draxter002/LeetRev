"use client";

import { AppNav } from "./AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <AppNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10 md:pt-8">
        {children}
      </main>
    </div>
  );
}
