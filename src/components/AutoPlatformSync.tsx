"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncSubmissions } from "@/lib/api";
import { useToast } from "@/components/Toast";
import type { Profile } from "@/lib/types";

interface AutoPlatformSyncProps {
  profile: Profile | null | undefined;
}

// Throttle interval between auto-sync runs (3 minutes)
const AUTO_SYNC_COOLDOWN_MS = 3 * 60 * 1000;

export function AutoPlatformSync({ profile }: AutoPlatformSyncProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Only run if the user is authenticated and profile is loaded
    if (!profile?.id || hasAttemptedRef.current) return;

    // Check when the last sync ran in this browser session
    const lastSyncStr = sessionStorage.getItem("leetrev_last_platform_sync");
    const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    const now = Date.now();

    // If synced recently in this tab, skip to avoid API throttling
    if (now - lastSyncTime < AUTO_SYNC_COOLDOWN_MS) {
      return;
    }

    hasAttemptedRef.current = true;
    sessionStorage.setItem("leetrev_last_platform_sync", String(now));

    // Run the multi-platform submissions lookup in the background
    syncSubmissions()
      .then((data) => {
        if (data.ok && data.addedCount > 0) {
          const platformNames = data.platformsChecked?.map((p) => {
            switch (p) {
              case "leetcode": return "LeetCode";
              case "codeforces": return "Codeforces";
              case "atcoder": return "AtCoder";
              case "codechef": return "CodeChef";
              case "geeksforgeeks": return "GeeksforGeeks";
              default: return p;
            }
          }).join(" & ") || "your platforms";

          toast(
            `✨ Found ${data.addedCount} new submission${data.addedCount === 1 ? "" : "s"} on ${platformNames}! Added to your revision queue.`,
            "success"
          );

          // Invalidate React Query caches to instantly update revision queue & solved lists
          queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
          queryClient.invalidateQueries({ queryKey: ["problems"] });
          queryClient.invalidateQueries({ queryKey: ["pending-revisions"] });
          queryClient.invalidateQueries({ queryKey: ["user-streaks"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
      })
      .catch((err) => {
        console.warn("[AutoPlatformSync] Background sync check notice:", err?.message);
      });
  }, [profile, queryClient, toast]);

  return null;
}
