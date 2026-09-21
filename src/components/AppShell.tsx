"use client";

import { useQuery } from "@tanstack/react-query";
import { AppNav } from "./AppNav";
import { AutoPlatformSync } from "./AutoPlatformSync";
import { fetchProfile } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  return (
    <div className="flex min-h-full flex-col">
      <AutoPlatformSync profile={profileQuery.data} />
      <AppNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10 md:pt-8">
        {children}
      </main>
    </div>
  );
}
