"use client";
import { useState, useMemo, useTransition } from "react";
import { fmtCzk, fmtUsd, fmtDate } from "@/lib/format";
import { inlineUpdatePricing } from "./actions";
import Link from "next/link";

export type PricingRow = {
  id: string;
  model: string;
  provider: string;
  fallbackProvider: string | null;
  serviceName: string;
  serviceCode: string;
  serviceColor: string;
  billingType: string;
  priceUsd: number | null;
  inputPriceUsd: number | null;
  outputPriceUsd: number | null;
  status: "active" | "inactive";
  updatedAt: string;
};

type Props = {
  pricings: PricingRow[];
  services: Array<{ code: string; name: string }>;
  providers: string[];
  fx: number;
  initialFilters: { service: string; provider: string; status: string; q: string };
};

export function PricingTable({ pricings, services, providers, fx, initialFilters }: Props) {
  const [service, setService] = useState(initialFilters.service);
  const [provider, setProvider] = useState(initialFilters.provider);
  const [status, setStatus] = useState(initialFilters.status || "active");
  const [q, setQ] = useState(initialFilters.q);

  // Build returnUrl with current filters so edit form can return to same view
  const returnUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (service) sp.set("service", service);
    if (provider) sp.set("provider", provider);
    if (status && status !== "active") sp.set("status", status);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return qs ? `/pricing?${qs}` : "/pricing";
  }, [service, provider, status, q]);

  const filtered = useMemo(() => {
    return pricings.filter((p) => {
      if (service && p.serviceCode !== service) return false;
      if (provider && p.provider !== provider) return false;
      if (status && status !== "all" && p.status !== status) return false;
      if (q && !`${p.model} ${p.provider}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [pricings, service, provider, status, q]);

  return (
    <>
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Služba</label>
            <select value={service} onChange={(e) => setService(e.target.value)} className="input">
              <option value="">Všechny</option>
              {services.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
              <option value="">Všichni</option>
              {providers.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="label">Hledat (model / provider)</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input w-full"
              placeholder="např. GPT 5 nebo Anthropic"
            />
          </div>
          <span className="text-xs text-muted">{filtered.length} záznamů</span>
        </div>
      </div>

      <div className="card overflow-auto max-h-[65vh] -mx-0">
        <table className="table">
          <thead>
            <tr>
              <th title="Název AI modelu">Model</th>
              <th title="Primární provider / dodavatel">Provider</th>
              <th title="Záložní provider pokud primární selže">Fallback</th>
              <th title="Služba (chat / video / grafika / audio / deep research / voice)">Služba</th>
              <th className="text-left" title="Hlavní cena v USD (per image, per second, per minute, per request)">Cena USD</th>
              <th className="text-left" title="Vstupní cena za 1M tokenů (jen chat / research modely)">Vstup USD</th>
              <th className="text-left" title="Výstupní cena za 1M tokenů (jen chat / research modely)">Výstup USD</th>
              <th className="text-left" title="Přepočet hlavní ceny na CZK podle aktuálního FX kurzu">CZK</th>
              <th title="Active = aktuálně používaný, Inactive = deaktivovaný">Status</th>
              <th title="Datum poslední úpravy záznamu">Upraveno</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <PricingRowItem key={p.id} row={p} fx={fx} returnUrl={returnUrl} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="text-center text-muted py-8">Žádné záznamy odpovídající filtru.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PricingRowItem({ row: p, fx, returnUrl }: { row: PricingRow; fx: number; returnUrl: string }) {
  const baseUsd = p.billingType === "token_io" ? (p.inputPriceUsd ?? 0) : (p.priceUsd ?? p.inputPriceUsd ?? 0);
  const czk = baseUsd * fx;
  const sixtyDaysAgo = Date.now() - 60 * 86_400_000;
  const isStale = new Date(p.updatedAt).getTime() < sixtyDaysAgo;

  return (
    <tr className={isStale ? "border-l-2 border-l-warn" : ""}>
      <td className="font-medium">{p.model}</td>
      <td className="text-muted">{p.provider}</td>
      <td className="text-muted text-xs">{p.fallbackProvider ?? "—"}</td>
      <td>
        <span className="badge" style={{ borderColor: `${p.serviceColor}55`, color: p.serviceColor }}>
          {p.serviceName}
        </span>
      </td>
      <td>
        <InlinePrice id={p.id} field="priceUsd" value={p.priceUsd} disabled={p.billingType === "token_io"} />
      </td>
      <td>
        <InlinePrice id={p.id} field="inputPriceUsd" value={p.inputPriceUsd} disabled={p.billingType !== "token_io"} />
      </td>
      <td>
        <InlinePrice id={p.id} field="outputPriceUsd" value={p.outputPriceUsd} disabled={p.billingType !== "token_io"} />
      </td>
      <td className="text-muted font-mono text-xs">{czk ? fmtCzk(czk) : "—"}</td>
      <td><StatusToggle id={p.id} status={p.status} /></td>
      <td className="text-xs text-muted">{fmtDate(p.updatedAt)}</td>
      <td><Link href={`/pricing/${p.id}?returnUrl=${encodeURIComponent(returnUrl)}`} className="text-accent text-xs hover:underline">edit</Link></td>
    </tr>
  );
}

function InlinePrice({ id, field, value, disabled }: { id: string; field: string; value: number | null; disabled?: boolean }) {
  const [v, setV] = useState<string>(value != null ? String(value) : "");
  const [isPending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  if (disabled) return <span className="text-muted/40">—</span>;

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
        className={`font-mono text-left hover:bg-panel2 px-1 rounded w-full ${isPending ? "opacity-50" : ""}`}
      >
        {value != null ? fmtUsd(value) : "—"}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type="number"
      step="0.0001"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setV(value != null ? String(value) : ""); setEditing(false); }
      }}
      className="input w-24 text-left font-mono"
    />
  );
}

function StatusToggle({ id, status }: { id: string; status: "active" | "inactive" }) {
  const [s, setS] = useState(status);
  const [isPending, start] = useTransition();
  return (
    <button
      onClick={() => {
        const next = s === "active" ? "inactive" : "active";
        setS(next);
        start(async () => { await inlineUpdatePricing(id, { status: next }); });
      }}
      className={`badge ${s === "active" ? "badge-good" : "badge-warn"} ${isPending ? "opacity-50" : ""}`}
    >
      {s}
    </button>
  );
}
