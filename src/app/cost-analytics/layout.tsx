import Link from "next/link";
import { Suspense } from "react";
import { PeriodSelector } from "@/components/PeriodSelector";

export const dynamic = "force-dynamic";

const tabs = [
  { href: "/cost-analytics/cost", label: "Cost (USD/CZK)" },
  { href: "/cost-analytics/usage", label: "Usage (tokeny)" },
];

export default function CostLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 border border-border rounded overflow-hidden">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className="px-3 py-1.5 text-sm bg-panel2 hover:bg-panel">
              {t.label}
            </Link>
          ))}
        </div>
        <Suspense fallback={<div className="text-xs text-muted">…</div>}>
          <PeriodSelector />
        </Suspense>
      </div>
      {children}
    </>
  );
}
