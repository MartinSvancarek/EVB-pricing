"use client";
import { useMemo, useState, useTransition } from "react";
import { Section, Kpi } from "@/components/ui";
import { fmtCzk, fmtNumber, fmtPct } from "@/lib/format";
import { CompareBarChart } from "@/components/charts";
import { ratioStatus } from "@/lib/calc";
import { saveScenario } from "./actions";
import { useRouter } from "next/navigation";

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
  loadedScenario,
}: {
  baseline: BaselineRow[];
  defaults: { totalTokensAssumption: number; revenueCzkAssumption: number; fx: number };
  loadedScenario: LoadedScenario;
}) {
  const router = useRouter();
  const [totalTokens, setTotalTokens] = useState(loadedScenario?.totalTokens ?? defaults.totalTokensAssumption);
  const [revenue, setRevenue] = useState(loadedScenario?.revenue ?? defaults.revenueCzkAssumption);
  const [fx, setFx] = useState(loadedScenario?.fx ?? defaults.fx);
  const [shares, setShares] = useState<Record<string, number>>(
    loadedScenario?.shares ?? Object.fromEntries(baseline.map((b) => [b.serviceId, b.actualSharePercent])),
  );
  const [manualCpt, setManualCpt] = useState<Record<string, number>>(() => {
    // Auto-fill CPT for services without data using average from services that have data
    const withData = baseline.filter((b) => b.hasData && b.costPerUnit > 0);
    const avgCpt = withData.length > 0 ? withData.reduce((s, b) => s + b.costPerUnit, 0) / withData.length : 0;
    const initial: Record<string, number> = {};
    for (const b of baseline) {
      if (!b.hasData) initial[b.serviceId] = avgCpt;
    }
    return initial;
  });
  const [name, setName] = useState(loadedScenario?.name ?? "");
  const [desc, setDesc] = useState(loadedScenario?.description ?? "");
  const [isPending, start] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [simulated, setSimulated] = useState(!!loadedScenario);

  const sumShare = Object.values(shares).reduce((s, v) => s + (Number(v) || 0), 0);
  const actualTotalCzk = baseline.reduce((s, b) => s + b.actualCostCzk, 0);

  const sim = useMemo(() => {
    return baseline.map((b) => {
      const share = Number(shares[b.serviceId] ?? 0);
      const simUsage = totalTokens * (share / 100);
      const cpt = b.hasData ? b.costPerUnit : Number(manualCpt[b.serviceId] ?? 0);
      const simCost = simUsage * cpt;
      return { ...b, share, simUsage, simCost, delta: simCost - b.actualCostCzk, cpt };
    });
  }, [baseline, shares, totalTokens, manualCpt]);

  const simTotal = sim.reduce((s, r) => s + r.simCost, 0);
  const actualRatio = revenue > 0 ? actualTotalCzk / revenue : null;
  const simRatio = revenue > 0 ? simTotal / revenue : null;
  const deltaPp = actualRatio != null && simRatio != null ? (simRatio - actualRatio) * 100 : null;

  const chartData = sim.map((r) => ({
    name: r.serviceName,
    current: Math.round(r.actualCostCzk),
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
        setSavedMsg("Scénář uložen.");
        setTimeout(() => router.push("/simulation/scenarios"), 600);
      } catch (e: any) { setSavedMsg(e.message ?? "Chyba."); }
    });
  }

  function reset() {
    setShares(Object.fromEntries(baseline.map((b) => [b.serviceId, b.actualSharePercent])));
    setTotalTokens(defaults.totalTokensAssumption);
    setRevenue(defaults.revenueCzkAssumption);
    setFx(defaults.fx);
    setName("");
    setDesc("");
  }

  return (
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
                <th title="Aktuální % podíl na celkových nákladech (z reálných dat za 30 dní)">Aktuální %</th>
                <th title="Vaše simulované %. Suma musí být 100.">Simulované %</th>
                <th title="Rozdíl: simulované − aktuální (v procentních bodech)">Δ pp</th>
                <th title="Průměrný náklad CZK na 1 token/jednotku. U služeb bez trackingu zadejte ručně.">CZK/jednotka</th>
              </tr>
            </thead>
            <tbody>
              {baseline.map((b) => {
                const v = Number(shares[b.serviceId] ?? 0);
                const delta = v - b.actualSharePercent;
                return (
                  <tr key={b.serviceId}>
                    <td>
                      <span className="badge" style={{ borderColor: `${b.serviceColor}55`, color: b.serviceColor }}>
                        {b.serviceName}
                      </span>
                    </td>
                    <td className="font-mono">{b.actualSharePercent} %</td>
                    <td>
                      <input
                        type="number"
                        min={0} max={100} step={1}
                        value={v}
                        onChange={(e) => setShares({ ...shares, [b.serviceId]: Math.round(Number(e.target.value)) })}
                        className="input w-16 font-mono"
                      />
                    </td>
                    <td className={`font-mono ${delta > 0 ? "text-warn" : delta < 0 ? "text-good" : "text-muted"}`}>
                      {delta >= 0 ? "+" : ""}{delta}
                    </td>
                    <td>
                      {b.hasData ? (
                        <span className="font-mono text-muted">{b.costPerUnit.toFixed(6)}</span>
                      ) : (
                        <input
                          type="number" step="0.0001" placeholder="zadejte"
                          value={manualCpt[b.serviceId] ?? ""}
                          onChange={(e) => setManualCpt({ ...manualCpt, [b.serviceId]: Number(e.target.value) })}
                          className="input w-24 font-mono"
                          title="Služba nemá tracking – zadejte odhad CZK/jednotka"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td>Suma</td>
                <td>100 %</td>
                <td className={`font-mono ${Math.abs(sumShare - 100) > 1 ? "text-bad" : "text-good"}`}>
                  {sumShare} %
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </Section>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSimulated(true)}
            className="btn-primary text-base px-5 py-2"
            disabled={Math.abs(sumShare - 100) > 1}
          >
            Simulovat
          </button>
          {Math.abs(sumShare - 100) > 1 && <span className="text-xs text-bad self-center">Suma % musí být 100</span>}
        </div>

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
      {simulated && (
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
                  <td className="font-mono">{fmtCzk(r.actualCostCzk)}</td>
                  <td className="font-mono">{fmtCzk(r.simCost)}</td>
                  <td className={`font-mono ${r.delta > 0 ? "text-bad" : r.delta < 0 ? "text-good" : "text-muted"}`}>
                    {r.delta >= 0 ? "+" : ""}{fmtCzk(r.delta)}
                  </td>
                  <td className={`font-mono ${r.delta > 0 ? "text-bad" : r.delta < 0 ? "text-good" : "text-muted"}`}>
                    {r.actualCostCzk > 0 ? fmtPct((r.simCost - r.actualCostCzk) / r.actualCostCzk, 1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
      )}
    </div>
  );
}
