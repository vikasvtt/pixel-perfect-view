import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  UploadCloud,
  FileSearch,
  MessagesSquare,
  GitCompareArrows,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/analysis", label: "Analysis", icon: FileSearch },
  { to: "/assistant", label: "Assistant", icon: MessagesSquare },
  { to: "/compare", label: "Compare", icon: GitCompareArrows },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground"
      >
        Skip to main content
      </a>
      <aside className="relative z-20 hidden w-60 shrink-0 flex-col gap-8 border-r border-border p-5 md:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-accent font-display text-lg font-bold text-accent-foreground">
            L
          </div>
          <div className="font-display text-[15px] font-bold tracking-tight">
            LegalEase<span className="text-accent"> AI</span>
          </div>
        </Link>

        <nav className="flex flex-col gap-1.5 text-[13px]">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "bg-secondary text-foreground font-medium" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-accent/30 bg-glass/70 p-4">
          <div className="eyebrow text-accent/80">Sample workspace</div>
          <div className="mt-1 font-display text-sm font-semibold">Demo data only</div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            General information, not legal advice.
          </p>
        </div>
      </aside>

      <main id="main-content" tabIndex={-1} className="relative min-w-0 flex-1 outline-none">
        <div className="pointer-events-none absolute -top-24 -left-16 size-[520px] rounded-full bg-cyan/15 blur-[130px] aura" />
        <div className="pointer-events-none absolute top-40 right-0 size-[460px] rounded-full bg-violet/20 blur-[140px] aura2" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-40 w-[560px] -rotate-[18deg] bg-gradient-to-r from-cyan/25 via-accent/20 to-violet/25 blur-2xl" />
        <div className="beam-grid pointer-events-none absolute inset-0" />

        <nav className="relative z-10 flex gap-1 overflow-x-auto border-b border-border px-4 py-3 text-[12px] md:hidden">
          {nav.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "bg-secondary text-foreground font-medium" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="shrink-0 rounded-lg px-3 py-1.5"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="relative z-10 max-w-[1120px] p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
      LegalEase AI provides general information to help you understand documents in plain language.
      It is not a law firm and this is not legal advice. Always confirm important decisions with a
      licensed professional.
    </p>
  );
}

export function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const map = {
    low: "bg-success/15 text-success",
    medium: "bg-warning/15 text-warning",
    high: "bg-destructive/20 text-destructive",
  } as const;
  const icon = { low: "●", medium: "▲", high: "■" } as const;
  return (
    <span
      aria-label={`${risk} risk`}
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[risk]}`}
    >
      <span aria-hidden>{icon[risk]} {risk}</span>
    </span>
  );
}
