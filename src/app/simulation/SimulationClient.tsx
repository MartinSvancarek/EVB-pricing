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

export function SimulationClient({
  baseline,
  defaults,
}: {
  baseline: BaselineRow[];
  defaults: { totalTokensAssumption: number; revenueCzkAssumption: number; fx: number };
}) {
  const router = useRouter();
  const [totalTokens, setTotalTokens] = useState(defaults.totalTokensAssumption);
  const [revenue, setRevenue] = useState(defaults.revenueCzkAssumption);
  const [fx, setFx] = useState(defaults.fx);
  const [shares, setShares] = useState<Record<string, number>>(
    Object.fromEntries(baseline.map((b) => [b.serviceId, +b.actualSharePercent.toFixed(2)])),
  );
  const [manualCpt, setManualCpt] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPending, start] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const sumShare = Object.values(shares).reduce((s, v) => s + (Number(v) || 0), 0);

  const actualTotalCzk = baseline.reduce((s, b) => s + b.actualCostCzk, 0);

  const sim = useMemo(() => {
    return baseline.map((b) => {
      const share = Number(shares[b.serviceId] ?? 0);
      const simUsage = totalTokens * (share / 100);
      const cpt = b.hasData ? b.costPerUnit : Number(manualCpt[b.serviceId] ?? 0);
      const simCost = simUsage * cpt;
      return {
        ...b,
        share,
        simUsage,
        simCost,
        delta: simCost - b.actualCostCzk,
        cpt,
      };
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
    if (!name.trim()) {
      setSavedMsg("Zadejte název scénáře.");
      return;
    }
    if (Math.abs(sumShare - 100) > 0.01) {
      setSavedMsg(`Suma % musí být 100. Aktuálně: ${sumShare.toFixed(2)}`);
      return;
    }
    start(async () => {
      try {
        await saveScenario({
          name,
          description: desc,
          totalTokensAssumption: totalTokens,
          revenueCzkAssumption: revenue,
          fxRate: fx,
          shares: baseline.map((b) => ({ serviceId: b.serviceId, sharePercent: Number(shares[b.serviceId] ?? 0) })),
        });
        setSavedMsg("Scénář uložen.");
        setTimeout(() => router.push("/simulation/scenarios"), 600);
      } catch (e: any) {
        setSavedMsg(e.message ?? "Chyba.");
      }
    });
  }

  function reset() {
    setShares(Object.fromEntries(baseline.map((b) => [b.serviceId, +b.actualSharePercent.toFixed(2)])));
    setTotalTokens(defaults.totalTokensAssumption);
    setRevenue(defaults.revenueCzkAssumption);
    setFx(defaults.fx);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <Section title="Vstupy">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="label">Předpokládané tokeny (období)</label>
              <input
                type="number"
                value={totalTokens}
                onChange={(e) => setTotalTokens(Number(e.target.value))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Obrat CZK</label>
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">FX (CZK/USD)</label>
              <input
                type="number"
                step="0.01"
                value={fx}
                onChange={(e) => setFx(Number(e.target.value))}
                className="input w-full"
              />
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Služba</th>
                <th className="text-right">Aktuální %</th>
                <th className="text-right">Simulované %</th>
                <th className="text-right">Δ pp</th>
                <th className="text-right">CZK / jednotka</th>
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
                    <td className="text-right text-muted font-mono">{b.actualSharePercent.toFixed(2)} %</td>
                    <td className="text-right">
                      <input
                        type="number"
                        step="0.5"
                        value={v}
                        onChange={(e) => setShares({ ...shares, [b.serviceId]: Number(e.target.value) })}
                        className="input w-20 text-right font-mono"
                      />
                    </td>
                    <td className={`text-right font-mono ${delta > 0 ? "text-warn" : delta < 0 ? "text-good" : "text-muted"}`}>
                      {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
                    </td>
                    <td className="text-right">
                      {b.hasData ? (
                        <span className="font-mono text-muted">{b.costPerUnit.toFixed(6)}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="zadejte"
                          value={manualCpt[b.serviceId] ?? ""}
                          onChange={(e) => setManualCpt({ ...manualCpt, [b.serviceId]: Number(e.target.value) })}
                          className="input w-24 text-right font-mono"
                          title="Služba nemá tracking. Zadejte odhad CZK/jednotka."
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td>Suma</td>
                <td className="text-right text-muted">100.00 %</td>
                <td className={`text-right font-mono ${Math.abs(sumShare - 100) > 0.01 ? "text-bad" : "text-good"}`}>
                  {sumShare.toFixed(2)} %
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="Uložit jako scénář">
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
            <button onClick={handleSave} disabled={isPending} className="btn-primary">
              {isPending ? "Ukládám…" : "Uložit scénář"}
            </button>
            <button onClick={reset} className="btn">Reset</button>
            {savedMsg && <span className="text-xs text-muted">{savedMsg}</span>}
          </div>
        </Section>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Kpi
            label="Cost ratio – aktuální"
            value={actualRatio != null ? fmtPct(actualRatio) : "—"}
            status={ratioStatus(actualRatio)}
          />
          <Kpi
            label="Cost ratio – simulované"
            value={simRatio != null ? fmtPct(simRatio) : "—"}
            sub={deltaPp != null ? `Δ ${deltaPp >= 0 ? "+" : ""}${deltaPp.toFixed(2)} pp` : undefined}
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

        <Section title="Náklady CZK – aktuální vs. simulované">
          <CompareBarChart data={chartData} />
        </Section>

        <Section title="Dopad na služby">
          <table className="table">
            <thead>
              <tr>
                <th>Služba</th>
                <th className="text-right">Aktuální CZK</th>
                <th className="text-right">Simulované CZK</th>
                <th className="text-right">Δ CZK</th>
                <th className="text-right">Δ %</th>
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
                  <td className="text-right font-mono">{fmtCzk(r.actualCostCzk)}</td>
                  <td className="text-right font-mono">{fmtCzk(r.simCost)}</td>
                  <td className={`text-right font-mono ${r.delta > 0 ? "text-bad" : r.delta < 0 ? "text-good" : "text-muted"}`}>
                    {r.delta >= 0 ? "+" : ""}{fmtCzk(r.delta)}
                  </td>
                  <td className={`text-right font-mono ${r.delta > 0 ? "text-bad" : r.delta < 0 ? "text-good" : "text-muted"}`}>
                    {r.actualCostCzk > 0 ? fmtPct((r.simCost - r.actualCostCzk) / r.actualCostCzk, 1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
