"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Section, Kpi } from "@/components/ui";
import { fmtCzk, fmtNumber, fmtPct } from "@/lib/format";
import { CompareBarChart } from "@/components/charts";
import { ratioStatus } from "@/lib/calc";
import { saveScenario } from "./actions";
import { useRouter, usePathname } from "next/navigation";

export type BaselineRow = {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceColor: string;
  actualCostCzk: number;
  actualUsage: number;
  actualSharePercent: number;
  costPerUnit: number;
  hasData: boolean;
};

type LoadedScenario = {
  name: string;
  description: string | null;
  totalTokens: number;
  revenue: number;
  fx: number;
  shares: Record<string, number>;
} | null;

export function SimulationClient({
  baseline,
  defaults,
  costWeights,
  loadedScenario,
}: {
  baseline: BaselineRow[];
  defaults: { totalTokensAssumption: number; revenueCzkAssumption: number; fx: number };
  costWeights: Record<string, number>;
  loadedScenario: LoadedScenario;
}) {
  const router = useRouter();
  const [totalTokens, setTotalTokens] = useState(loadedScenario?.totalTokens ?? defaults.totalTokensAssumption);
  const [revenue, setRevenue] = useState(loadedScenario?.revenue ?? defaults.revenueCzkAssumption);
  const [fx, setFx] = useState(loadedScenario?.fx ?? defaults.fx);
  const [actualShares, setActualShares] = useState<Record<string, number>>(
    Object.fromEntries(baseline.map((b) => [b.serviceId, b.actualSharePercent])),
  );
  const [shares, setShares] = useState<Record<string, number>>(
    loadedScenario?.shares ?? Object.fromEntries(baseline.map((b) => [b.serviceId, b.actualSharePercent])),
  );
  const [name, setName] = useState(loadedScenario?.name ?? "");
  const [desc, setDesc] = useState(loadedScenario?.description ?? "");
  const [isPending, start] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const justSaved = useRef(false);

  const STORAGE_KEY = "evb_simulation_draft";

  // Restore from localStorage on mount (only if no loaded scenario)
  useEffect(() => {
    if (loadedScenario) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.totalTokens) setTotalTokens(draft.totalTokens);
      if (draft.revenue) setRevenue(draft.revenue);
      if (draft.fx) setFx(draft.fx);
      if (draft.actualShares) setActualShares(draft.actualShares);
      if (draft.shares) setShares(draft.shares);
      if (draft.name) setName(draft.name);
      if (draft.desc) setDesc(draft.desc);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ totalTokens, revenue, fx, actualShares, shares, name, desc }));
    } catch {}
  }, [totalTokens, revenue, fx, actualShares, shares, name, desc]);

  // Determine if state is "dirty" (differs from defaults)
  const isDirty = useMemo(() => {
    const defaultSharesObj = Object.fromEntries(baseline.map((b) => [b.serviceId, b.actualSharePercent]));
    const sharesChanged = Object.keys(shares).some((k) => shares[k] !== defaultSharesObj[k]);
    const actualChanged = Object.keys(actualShares).some((k) => actualShares[k] !== defaultSharesObj[k]);
    return sharesChanged || actualChanged || name.trim() !== "" || desc.trim() !== "";
  }, [shares, actualShares, baseline, name, desc]);

  // Warn on browser close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !justSaved.current) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept Next.js client-side navigation
  const pathname = usePathname();
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (justSaved.current || !isDirty) return;
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http") || href === pathname) return;
      // Internal navigation with unsaved changes
      e.preventDefault();
      e.stopPropagation();
      pendingHref.current = href;
      setShowLeaveDialog(true);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty, pathname]);

  const confirmLeave = useCallback(() => {
    setShowLeaveDialog(false);
    localStorage.removeItem(STORAGE_KEY);
    if (pendingHref.current) {
      router.push(pendingHref.current);
      pendingHref.current = null;
    }
  }, [router]);

  const cancelLeave = useCallback(() => {
    setShowLeaveDialog(false);
    pendingHref.current = null;
  }, []);

  const sumActualShare = Object.values(actualShares).reduce((s, v) => s + (Number(v) || 0), 0);
  const sumShare = Object.values(shares).reduce((s, v) => s + (Number(v) || 0), 0);
  const actualTotalCzk = baseline.reduce((s, b) => s + b.actualCostCzk, 0);

  const sim = useMemo(() => {
    const totalUsage = baseline.reduce((s, b) => s + b.actualUsage, 0);
    // Weighted cost model: each service has a different cost per share point
    const actualWeightedSum = baseline.reduce((s, b) => {
      const w = costWeights[b.serviceCode] ?? 1;
      const share = Number(actualShares[b.serviceId] ?? 0);
      return s + share * w;
    }, 0);
    const simWeightedSum = baseline.reduce((s, b) => {
      const w = costWeights[b.serviceCode] ?? 1;
      const share = Number(shares[b.serviceId] ?? 0);
      return s + share * w;
    }, 0);
    const costPerWeightedUnit = actualWeightedSum > 0 ? actualTotalCzk / actualWeightedSum : 0;

    return baseline.map((b) => {
      const w = costWeights[b.serviceCode] ?? 1;
      const actualShare = Number(actualShares[b.serviceId] ?? 0);
      const simShare = Number(shares[b.serviceId] ?? 0);
      const actualCost = costPerWeightedUnit * actualShare * w;
      const simCost = costPerWeightedUnit * simShare * w;
      const actualTokens = totalUsage * (actualShare / 100);
      const simTokens = totalUsage * (simShare / 100);
      return { ...b, actualShare, share: simShare, actualCost, simCost, delta: simCost - actualCost, actualTokens, simTokens };
    });
  }, [baseline, shares, actualShares, actualTotalCzk, costWeights]);

  const simTotal = sim.reduce((s, r) => s + r.simCost, 0);
  const actualRatio = revenue > 0 ? actualTotalCzk / revenue : null;
  const simRatio = revenue > 0 ? simTotal / revenue : null;
  const deltaPp = actualRatio != null && simRatio != null ? (simRatio - actualRatio) * 100 : null;

  const chartData = sim.map((r) => ({
    name: r.serviceName,
    current: Math.round(r.actualCost),
    simulated: Math.round(r.simCost),
  }));

  function handleSave() {
    if (!name.trim()) { setSavedMsg("Zadejte název scénáře."); return; }
    if (Math.abs(sumShare - 100) > 1) { setSavedMsg(`Suma % musí být 100. Aktuálně: ${sumShare}`); return; }
    start(async () => {
      try {
        await saveScenario({
          name, description: desc,
          totalTokensAssumption: totalTokens,
          revenueCzkAssumption: revenue,
          fxRate: fx,
          shares: baseline.map((b) => ({ serviceId: b.serviceId, sharePercent: Number(shares[b.serviceId] ?? 0) })),
        });
        justSaved.current = true;
        localStorage.removeItem(STORAGE_KEY);
        setSavedMsg("Scénář uložen.");
        setTimeout(() => router.push("/simulation/scenarios"), 600);
      } catch (e: any) { setSavedMsg(e.message ?? "Chyba."); }
    });
  }

  function reset() {
    setActualShares(Object.fromEntries(baseline.map((b) => [b.serviceId, b.actualSharePercent])));
    setShares(Object.fromEntries(baseline.map((b) => [b.serviceId, b.actualSharePercent])));
    setTotalTokens(defaults.totalTokensAssumption);
    setRevenue(defaults.revenueCzkAssumption);
    setFx(defaults.fx);
    setName("");
    setDesc("");
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: Inputs */}
      <div>
        <Section title="Globální předpoklady">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="label" title="Celkový předpokládaný objem tokenů za období simulace">Tokeny (období)</label>
              <input type="number" value={totalTokens} onChange={(e) => setTotalTokens(Number(e.target.value))} className="input w-full" />
            </div>
            <div>
              <label className="label" title="Celkový obrat v CZK za období – slouží jako jmenovatel cost ratio">Obrat CZK</label>
              <input type="number" value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} className="input w-full" />
            </div>
            <div>
              <label className="label" title="FX kurz pro přepočet – snapshot z Settings">FX (CZK/USD)</label>
              <input type="number" step="0.01" value={fx} onChange={(e) => setFx(Number(e.target.value))} className="input w-full" />
            </div>
          </div>
        </Section>

        <Section title="Alokace nákladů po službách" actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">Výchozí hodnoty z reálných nákladů za 30 dní</span>
            <button onClick={reset} className="btn text-xs">Reset</button>
          </div>
        }>
          <table className="table">
            <thead>
              <tr>
                <th title="Interní služba (chat, video, grafika, …)">Služba</th>
                <th title="Aktuální % podíl na celkových nákladech">Aktuální %</th>
                <th title="Vaše simulované %. Suma musí být 100.">Simulované %</th>
                <th title="Rozdíl: simulované − aktuální (v procentních bodech)">Δ pp</th>
              </tr>
            </thead>
            <tbody>
              {baseline.map((b) => {
                const actualV = Number(actualShares[b.serviceId] ?? 0);
                const simV = Number(shares[b.serviceId] ?? 0);
                const delta = simV - actualV;
                return (
                  <tr key={b.serviceId}>
                    <td>
                      <span className="badge" style={{ borderColor: `${b.serviceColor}55`, color: b.serviceColor }}>
                        {b.serviceName}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0} max={100} step={1}
                        value={actualV}
                        onChange={(e) => setActualShares({ ...actualShares, [b.serviceId]: Math.round(Number(e.target.value)) })}
                        className="input w-16 font-mono"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0} max={100} step={1}
                        value={simV}
                        onChange={(e) => setShares({ ...shares, [b.serviceId]: Math.round(Number(e.target.value)) })}
                        className="input w-16 font-mono"
                      />
                    </td>
                    <td className={`font-mono ${delta > 0 ? "text-warn" : delta < 0 ? "text-good" : "text-muted"}`}>
                      {delta >= 0 ? "+" : ""}{delta}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td>Suma</td>
                <td className={`font-mono ${Math.abs(sumActualShare - 100) > 1 ? "text-bad" : "text-good"}`}>
                  {sumActualShare} %
                </td>
                <td className={`font-mono ${Math.abs(sumShare - 100) > 1 ? "text-bad" : "text-good"}`}>
                  {sumShare} %
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="Uložit scénář">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Název</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="např. Video 35 %" />
            </div>
            <div>
              <label className="label">Popis</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input w-full" />
            </div>
          </div>
          <div className="flex gap-2 mt-3 items-center">
            <button onClick={handleSave} disabled={isPending} className="btn-primary">{isPending ? "Ukládám…" : "Uložit scénář"}</button>
            <button onClick={reset} className="btn">Reset</button>
            {savedMsg && <span className="text-xs text-muted">{savedMsg}</span>}
          </div>
        </Section>
      </div>

      {/* RIGHT: Results */}
      <div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Kpi label="Cost ratio – aktuální" value={actualRatio != null ? fmtPct(actualRatio) : "—"} status={ratioStatus(actualRatio)} />
          <Kpi
            label="Cost ratio – simulované"
            value={simRatio != null ? fmtPct(simRatio) : "—"}
            sub={deltaPp != null ? `Δ ${deltaPp >= 0 ? "+" : ""}${deltaPp.toFixed(1)} pp` : undefined}
            status={ratioStatus(simRatio)}
          />
          <Kpi label="Náklady aktuální" value={fmtCzk(actualTotalCzk)} />
          <Kpi
            label="Náklady simulované"
            value={fmtCzk(simTotal)}
            sub={`Δ ${simTotal - actualTotalCzk >= 0 ? "+" : ""}${fmtCzk(simTotal - actualTotalCzk)}`}
            status={simTotal - actualTotalCzk > 0 ? "bad" : "good"}
          />
        </div>

        <Section title="Porovnání: aktuální vs. simulované (CZK)">
          <CompareBarChart data={chartData} />
        </Section>

        <Section title="Dopad na služby">
          <table className="table">
            <thead>
              <tr>
                <th title="Služba">Služba</th>
                <th title="Aktuální tokeny/jednotky">Akt. tokeny</th>
                <th title="Simulované tokeny/jednotky">Sim. tokeny</th>
                <th title="Aktuální náklady za období v CZK">Aktuální CZK</th>
                <th title="Simulované náklady po změně alokace">Simulované CZK</th>
                <th title="Absolutní rozdíl v CZK">Δ CZK</th>
                <th title="Relativní změna v %">Δ %</th>
              </tr>
            </thead>
            <tbody>
              {sim.map((r) => (
                <tr key={r.serviceId}>
                  <td>
                    <span className="badge" style={{ borderColor: `${r.serviceColor}55`, color: r.serviceColor }}>
                      {r.serviceName}
                    </span>
                  </td>
                  <td className="font-mono text-muted">{fmtNumber(r.actualTokens, { compact: true })}</td>
                  <td className="font-mono">{fmtNumber(r.simTokens, { compact: true })}</td>
                  <td className="font-mono">{fmtCzk(r.actualCost)}</td>
                  <td className="font-mono">{fmtCzk(r.simCost)}</td>
                  <td className={`font-mono ${r.delta > 0 ? "text-bad" : r.delta < 0 ? "text-good" : "text-muted"}`}>
                    {r.delta >= 0 ? "+" : ""}{fmtCzk(r.delta)}
                  </td>
                  <td className={`font-mono ${r.delta > 0 ? "text-bad" : r.delta < 0 ? "text-good" : "text-muted"}`}>
                    {r.actualCost > 0 ? fmtPct((r.simCost - r.actualCost) / r.actualCost, 1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>

    {/* Unsaved changes dialog */}
    {showLeaveDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-panel border border-border rounded-lg p-6 max-w-sm w-full shadow-xl">
          <h3 className="text-lg font-semibold mb-2">Neuložená simulace</h3>
          <p className="text-sm text-muted mb-4">Máte neuložené změny v simulaci. Chcete odejít bez uložení?</p>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelLeave} className="btn">Zůstat</button>
            <button onClick={confirmLeave} className="btn text-bad border-bad/30 hover:bg-bad/10">Odejít</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
