"use client";
import { useState, useTransition } from "react";
import { inlineUpdatePricing } from "./actions";
import { fmtUsd } from "@/lib/format";

type Field = "inputPriceUsd" | "outputPriceUsd" | "unitPriceUsd" | "markupCoefficient";

export function InlinePriceCell({
  id,
  field,
  value,
  step = "0.0001",
  disabled = false,
}: {
  id: string;
  field: Field;
  value: number | null;
  step?: string;
  disabled?: boolean;
}) {
  const [v, setV] = useState<string>(value != null ? String(value) : "");
  const [isPending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  if (disabled) return <span className="text-muted/50">—</span>;

  function commit() {
    setEditing(false);
    const num = v === "" ? null : Number(v);
    if (num === value) return;
    start(async () => {
      await inlineUpdatePricing(id, { [field]: num } as any);
    });
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`font-mono text-right hover:bg-panel2 px-1 rounded w-full ${isPending ? "opacity-50" : ""}`}
      >
        {field === "markupCoefficient"
          ? value != null ? `${Number(value).toFixed(2)}×` : "1.00×"
          : value != null ? fmtUsd(value) : "—"}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type="number"
      step={step}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setV(value != null ? String(value) : "");
          setEditing(false);
        }
      }}
      className="input w-24 text-right font-mono"
    />
  );
}

export function StatusToggle({ id, status }: { id: string; status: "active" | "inactive" }) {
  const [s, setS] = useState(status);
  const [isPending, start] = useTransition();
  return (
    <button
      onClick={() => {
        const next = s === "active" ? "inactive" : "active";
        setS(next);
        start(async () => {
          await inlineUpdatePricing(id, { status: next });
        });
      }}
      className={`badge ${s === "active" ? "badge-good" : "badge-warn"} ${isPending ? "opacity-50" : ""}`}
    >
      {s}
    </button>
  );
}
