"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const ranges = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "30 dní" },
  { value: "mtd", label: "MTD" },
  { value: "ytd", label: "YTD" },
];

export function PeriodSelector({ defaultRange = "month" }: { defaultRange?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const current = params.get("range") ?? defaultRange;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function set(range: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("range", range);
    sp.delete("from");
    sp.delete("to");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function setCustom(field: "from" | "to", v: string) {
    const sp = new URLSearchParams(params.toString());
    sp.delete("range");
    if (v) sp.set(field, v);
    else sp.delete(field);
    router.push(`${pathname}?${sp.toString()}`);
  }

  const isCustom = !!(from || to);

  return (
    <div className="flex items-center gap-2">
      <div className="flex border border-border rounded overflow-hidden">
        {ranges.map((r) => (
          <button
            key={r.value}
            onClick={() => set(r.value)}
            className={`px-2.5 py-1.5 text-xs ${
              !isCustom && current === r.value ? "bg-accent/20 text-accent" : "bg-panel2 hover:bg-panel"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={from}
        onChange={(e) => setCustom("from", e.target.value)}
        className="input text-xs"
      />
      <span className="text-xs text-muted">–</span>
      <input
        type="date"
        value={to}
        onChange={(e) => setCustom("to", e.target.value)}
        className="input text-xs"
      />
    </div>
  );
}
