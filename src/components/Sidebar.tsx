"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Tags,
  BarChart3,
  FlaskConical,
  Settings,
} from "lucide-react";
import clsx from "clsx";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pricing", label: "Pricing", icon: Tags },
  { href: "/cost-analytics/cost", label: "Cost analytics", icon: BarChart3 },
  { href: "/simulation", label: "Simulation", icon: FlaskConical },
  { href: "/settings/fx", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-panel border-r border-border flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-accent/20 border border-accent/40 grid place-items-center text-accent font-bold">
            E
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">EVB Pricing</div>
            <div className="text-[10px] text-muted uppercase tracking-wide">interní admin</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map((it) => {
          const active =
            pathname === it.href ||
            (it.href !== "/dashboard" && pathname.startsWith(it.href.split("/").slice(0, 2).join("/")));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors",
                active
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "text-text/80 hover:bg-panel2 hover:text-text border border-transparent",
              )}
            >
              <Icon size={16} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
