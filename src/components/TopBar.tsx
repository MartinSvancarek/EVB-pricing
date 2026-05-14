import { prisma } from "@/lib/db";
import { trackingCoverage, currentFx } from "@/lib/analytics";
import { fmtPct } from "@/lib/format";
import { AlertTriangle, DollarSign, User } from "lucide-react";
import Link from "next/link";

export async function TopBar() {
  const [fx, coverage, anyUser] = await Promise.all([
    currentFx(),
    trackingCoverage(),
    prisma.user.findFirst({ where: { role: "admin" } }),
  ]);

  const incomplete = coverage.coverage < 1;

  return (
    <header className="h-14 px-6 border-b border-border bg-panel flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/settings/fx" className="badge hover:border-accent/50">
          <DollarSign size={12} /> FX:&nbsp;
          <span className="font-mono">{fx ? `${fx.toFixed(3)} CZK/USD` : "není zadán"}</span>
        </Link>
        {incomplete && (
          <Link href="/settings/data-sources" className="badge badge-warn">
            <AlertTriangle size={12} /> Tracking incomplete · {fmtPct(coverage.coverage, 0)} pokrytí
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 grid place-items-center">
            <User size={14} className="text-accent" />
          </div>
          <div className="leading-tight">
            <div className="text-xs">{anyUser?.name ?? "Anonymous"}</div>
            <div className="text-[10px] text-muted">{anyUser?.role ?? "admin"}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
