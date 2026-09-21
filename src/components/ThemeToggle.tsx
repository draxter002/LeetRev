"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("leetrev_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("leetrev_theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div className={`h-8 w-8 rounded-full border border-ink/10 bg-ink/5 ${className}`} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className={`relative inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-ink/15 bg-paper/80 text-ink shadow-2xs backdrop-blur-xs transition-all hover:scale-105 hover:bg-ink/10 hover:border-ink/25 focus:outline-none focus:ring-2 focus:ring-teal/30 active:scale-95 ${className}`}
    >
      {theme === "light" ? (
        /* Moon Icon for Dark Mode */
        <svg
          className="h-4.5 w-4.5 text-ink transition-transform duration-300 hover:-rotate-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        /* Sun Icon for Light Mode */
        <svg
          className="h-4.5 w-4.5 text-amber-400 transition-transform duration-300 hover:rotate-45"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
