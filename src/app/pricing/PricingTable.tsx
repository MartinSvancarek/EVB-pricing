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
  functionId: string;
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

type FnOption = { id: string; name: string; serviceName: string; serviceCode: string };

type Props = {
  pricings: PricingRow[];
  services: Array<{ code: string; name: string }>;
  providers: string[];
  functions: FnOption[];
  fx: number;
  initialFilters: { service: string; provider: string; status: string; q: string };
};

export function PricingTable({ pricings, services, providers, functions, fx, initialFilters }: Props) {
  const [service, setService] = useState(initialFilters.service);
  const [provider, setProvider] = useState(initialFilters.provider);
  const [status, setStatus] = useState(initialFilters.status || "active");
  const [q, setQ] = useState(initialFilters.q);

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

      <div className="card overflow-auto max-h-[65vh]">
        <table className="table">
          <thead>
            <tr>
              <th title="Název AI modelu">Model</th>
              <th title="Primární provider / dodavatel">Provider</th>
              <th title="Záložní provider pokud primární selže">Fallback</th>
              <th title="Služba (chat / video / grafika / audio / deep research / voice)">Služba</th>
              <th title="Hlavní cena v USD + CZK (per image, per second, per minute, per request)">Cena USD</th>
              <th title="Vstupní cena za 1M tokenů + CZK (jen chat / research modely)">Vstup USD</th>
              <th title="Výstupní cena za 1M tokenů + CZK (jen chat / research modely)">Výstup USD</th>
              <th title="Active = aktuálně používaný, Inactive = deaktivovaný">Status</th>
              <th title="Datum poslední úpravy záznamu">Upraveno</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <PricingRowItem key={p.id} row={p} fx={fx} returnUrl={returnUrl} providers={providers} functions={functions} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center text-muted py-8">Žádné záznamy odpovídající filtru.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PricingRowItem({ row: p, fx, returnUrl, providers, functions }: { row: PricingRow; fx: number; returnUrl: string; providers: string[]; functions: FnOption[] }) {
  const sixtyDaysAgo = Date.now() - 60 * 86_400_000;
  const isStale = new Date(p.updatedAt).getTime() < sixtyDaysAgo;

  return (
    <tr className={isStale ? "border-l-2 border-l-warn" : ""}>
      <td className="font-medium">{p.model}</td>
      <td>
        <InlineDropdown
          id={p.id}
          field="provider"
          value={p.provider}
          options={providers}
          allowNew
        />
      </td>
      <td>
        <InlineDropdown
          id={p.id}
          field="fallbackProvider"
          value={p.fallbackProvider ?? ""}
          options={providers}
          allowNew
          nullable
        />
      </td>
      <td>
        <InlineServiceDropdown id={p.id} functionId={p.functionId} functions={functions} />
      </td>
      <td>
        <InlinePrice id={p.id} field="priceUsd" value={p.priceUsd} disabled={p.billingType === "token_io"} fx={fx} />
      </td>
      <td>
        <InlinePrice id={p.id} field="inputPriceUsd" value={p.inputPriceUsd} disabled={p.billingType !== "token_io"} fx={fx} />
      </td>
      <td>
        <InlinePrice id={p.id} field="outputPriceUsd" value={p.outputPriceUsd} disabled={p.billingType !== "token_io"} fx={fx} />
      </td>
      <td>
        <InlineStatus id={p.id} status={p.status} />
      </td>
      <td className="text-xs text-muted">{fmtDate(p.updatedAt)}</td>
      <td><Link href={`/pricing/${p.id}?returnUrl=${encodeURIComponent(returnUrl)}`} className="text-accent text-xs hover:underline">edit</Link></td>
    </tr>
  );
}

// --- Inline Price with CZK in parentheses ---
function InlinePrice({ id, field, value, disabled, fx }: { id: string; field: string; value: number | null; disabled?: boolean; fx: number }) {
  const [v, setV] = useState<string>(value != null ? String(value) : "");
  const [isPending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  if (disabled) return <span className="text-muted/40">—</span>;

  const czk = value != null ? value * fx : null;

  function commit() {
    setEditing(false);
    const num = v === "" ? null : Math.round(Number(v) * 100) / 100;
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
        {value != null ? (
          <span>{fmtUsd(value)} <span className="text-muted text-xs">({fmtCzk(czk!)})</span></span>
        ) : "—"}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type="number"
      step="0.01"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setV(value != null ? String(value) : ""); setEditing(false); }
      }}
      className="input w-24 font-mono"
    />
  );
}

// --- Inline Dropdown for provider / fallback ---
function InlineDropdown({ id, field, value, options, allowNew, nullable }: {
  id: string; field: string; value: string; options: string[]; allowNew?: boolean; nullable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [isPending, start] = useTransition();
  const [addingNew, setAddingNew] = useState(false);
  const [newVal, setNewVal] = useState("");

  function commit(newValue: string) {
    setEditing(false);
    setAddingNew(false);
    const final = nullable && newValue === "" ? null : newValue;
    if (final === value || (final === null && value === "")) return;
    setV(newValue);
    start(async () => {
      await inlineUpdatePricing(id, { [field]: final } as any);
    });
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`text-left hover:bg-panel2 px-1 rounded w-full text-sm ${isPending ? "opacity-50" : ""} ${!value ? "text-muted" : "text-muted"}`}
      >
        {v || "—"}
      </button>
    );
  }

  if (addingNew) {
    return (
      <input
        autoFocus
        value={newVal}
        onChange={(e) => setNewVal(e.target.value)}
        onBlur={() => { if (newVal.trim()) commit(newVal.trim()); else { setAddingNew(false); setEditing(false); } }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && newVal.trim()) commit(newVal.trim());
          if (e.key === "Escape") { setAddingNew(false); setEditing(false); }
        }}
        placeholder="Nový provider"
        className="input w-28 text-xs"
      />
    );
  }

  return (
    <select
      autoFocus
      value={v}
      onChange={(e) => {
        if (e.target.value === "__new__") { setAddingNew(true); return; }
        commit(e.target.value);
      }}
      onBlur={() => setEditing(false)}
      className="input text-xs w-28"
    >
      {nullable && <option value="">— žádný —</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      {allowNew && <option value="__new__">+ Nový…</option>}
    </select>
  );
}

// --- Inline Service Dropdown ---
function InlineServiceDropdown({ id, functionId, functions }: { id: string; functionId: string; functions: FnOption[] }) {
  const [editing, setEditing] = useState(false);
  const [fnId, setFnId] = useState(functionId);
  const [isPending, start] = useTransition();

  const current = functions.find((f) => f.id === fnId);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`text-left hover:bg-panel2 px-1 rounded w-full ${isPending ? "opacity-50" : ""}`}
      >
        <span className="badge" style={{ borderColor: current ? `${getServiceColor(current.serviceCode)}55` : undefined }}>
          {current?.serviceName ?? "—"}
        </span>
      </button>
    );
  }

  return (
    <select
      autoFocus
      value={fnId}
      onChange={(e) => {
        const newFnId = e.target.value;
        setFnId(newFnId);
        setEditing(false);
        start(async () => {
          await inlineUpdatePricing(id, { functionId: newFnId });
        });
      }}
      onBlur={() => setEditing(false)}
      className="input text-xs w-32"
    >
      {functions.map((f) => <option key={f.id} value={f.id}>{f.serviceName} · {f.name}</option>)}
    </select>
  );
}

// --- Inline Status Dropdown ---
function InlineStatus({ id, status }: { id: string; status: "active" | "inactive" }) {
  const [editing, setEditing] = useState(false);
  const [s, setS] = useState(status);
  const [isPending, start] = useTransition();

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`badge ${s === "active" ? "badge-good" : "badge-warn"} ${isPending ? "opacity-50" : ""}`}
      >
        {s}
      </button>
    );
  }

  return (
    <select
      autoFocus
      value={s}
      onChange={(e) => {
        const next = e.target.value as "active" | "inactive";
        setS(next);
        setEditing(false);
        start(async () => {
          await inlineUpdatePricing(id, { status: next });
        });
      }}
      onBlur={() => setEditing(false)}
      className="input text-xs"
    >
      <option value="active">active</option>
      <option value="inactive">inactive</option>
    </select>
  );
}

// Helper - we don't have color in the function data, use a simple lookup
function getServiceColor(code: string): string {
  const colors: Record<string, string> = {
    chat: "#6366f1",
    video: "#f59e0b",
    graphics: "#10b981",
    audio: "#ec4899",
    deep_research: "#8b5cf6",
    voice: "#06b6d4",
  };
  return colors[code] ?? "#6b7280";
}
