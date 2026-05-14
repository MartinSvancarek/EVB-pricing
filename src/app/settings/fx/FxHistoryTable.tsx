"use client";
import { useState, useTransition } from "react";
import { fmtDate } from "@/lib/format";
import { addFx } from "../actions";

type FxRow = { id: string; date: string; czkPerUsd: number; source: string };

export function FxHistoryTable({ rates }: { rates: FxRow[] }) {
  return (
    <table className="table">
      <thead>
        <tr><th>Datum</th><th>CZK / USD</th><th>Zdroj</th></tr>
      </thead>
      <tbody>
        {rates.map((r) => (
          <FxRowItem key={r.id} row={r} />
        ))}
      </tbody>
    </table>
  );
}

function FxRowItem({ row }: { row: FxRow }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(row.czkPerUsd));
  const [isPending, start] = useTransition();

  function commit() {
    setEditing(false);
    const num = Number(v);
    if (!isFinite(num) || num <= 0 || num === row.czkPerUsd) return;
    const fd = new FormData();
    fd.set("date", row.date.slice(0, 10));
    fd.set("rate", String(num));
    start(async () => {
      await addFx(fd);
    });
  }

  return (
    <tr>
      <td>{fmtDate(row.date)}</td>
      <td>
        {editing ? (
          <input
            autoFocus
            type="number"
            step="0.001"
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") { setV(String(row.czkPerUsd)); setEditing(false); }
            }}
            className="input w-24 font-mono"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`font-mono hover:bg-panel2 px-1 rounded ${isPending ? "opacity-50" : ""}`}
          >
            {row.czkPerUsd.toFixed(4)}
          </button>
        )}
      </td>
      <td className="text-muted text-xs">{row.source}</td>
    </tr>
  );
}
