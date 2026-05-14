import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Kpi, Section } from "@/components/ui";
import { fmtCzk, fmtDate, fmtUsd } from "@/lib/format";
import { currentFx } from "@/lib/analytics";
import { Plus } from "lucide-react";
import { InlinePriceCell, StatusToggle } from "./InlineCells";

export const dynamic = "force-dynamic";

const BILLING_LABELS: Record<string, string> = {
  token_io: "Token I/O",
  token_unit: "Token unit",
  image: "Image",
  audio_second: "Audio s",
  video_second: "Video s",
  request: "Request",
  minute: "Minute",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; provider?: string; model?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [services, pricingsAll, fx] = await Promise.all([
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.modelPricing.findMany({
      include: { function: { include: { service: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    currentFx(),
  ]);

  const providers = [...new Set(pricingsAll.map((p) => p.provider))].sort();
  const models = [...new Set(pricingsAll.map((p) => p.model))].sort();

  const filtered = pricingsAll.filter((p) => {
    if (sp.service && p.function.service.code !== sp.service) return false;
    if (sp.provider && p.provider !== sp.provider) return false;
    if (sp.model && p.model !== sp.model) return false;
    if (sp.status && sp.status !== "all" && p.status !== sp.status) return false;
    if (sp.q && !`${p.function.name} ${p.model} ${p.provider}`.toLowerCase().includes(sp.q.toLowerCase())) return false;
    return true;
  });

  const activeCount = pricingsAll.filter((p) => p.status === "active").length;
  const inactiveCount = pricingsAll.length - activeCount;
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const recentlyUpdated = pricingsAll.filter((p) => p.updatedAt.getTime() >= sevenDaysAgo).length;
  const sixtyDaysAgo = Date.now() - 60 * 86_400_000;

  return (
    <>
      <PageHeader
        title="Pricing"
        subtitle="Centrální správa cen modelů a funkcí. Inline editace cen, markupu i statusu."
        actions={
          <Link href="/pricing/new" className="btn-primary">
            <Plus size={14} /> Nová cena
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Kpi label="Aktivní záznamy" value={activeCount} />
        <Kpi label="Inactive" value={inactiveCount} />
        <Kpi label="Upraveno (7 dní)" value={recentlyUpdated} />
        <Link href="/settings/fx">
          <Kpi label="FX kurz" value={fx ? `${fx.toFixed(3)}` : "—"} sub="CZK / USD" />
        </Link>
      </div>

      <Section title="Filtry">
        <form className="flex flex-wrap gap-2 items-end" method="get">
          <div>
            <label className="label">Služba</label>
            <select name="service" defaultValue={sp.service ?? ""} className="input">
              <option value="">Všechny</option>
              {services.map((s) => (
                <option key={s.id} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Provider</label>
            <select name="provider" defaultValue={sp.provider ?? ""} className="input">
              <option value="">Všichni</option>
              {providers.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Model</label>
            <select name="model" defaultValue={sp.model ?? ""} className="input">
              <option value="">Všechny</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={sp.status ?? "active"} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="label">Hledat (funkce / model)</label>
            <input name="q" defaultValue={sp.q ?? ""} className="input w-full" placeholder="např. gpt-4o" />
          </div>
          <button className="btn-primary">Použít</button>
          <Link href="/pricing" className="btn">Reset</Link>
        </form>
      </Section>

      <Section title={`Tabulka cen (${filtered.length})`}>
        <div className="overflow-auto max-h-[60vh] -mx-4 px-4">
          <table className="table">
            <thead>
              <tr>
                <th>Služba</th>
                <th>Funkce</th>
                <th>Provider</th>
                <th>Model</th>
                <th>Účtování</th>
                <th className="text-right">Vstup USD</th>
                <th className="text-right">Výstup USD</th>
                <th className="text-right">Jednotka USD</th>
                <th className="text-right">CZK (přepočet)</th>
                <th className="text-right">Markup</th>
                <th>Status</th>
                <th>Upraveno</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isStale = p.updatedAt.getTime() < sixtyDaysAgo;
                const baseUsd =
                  p.billingType === "token_io"
                    ? (p.inputPriceUsd ?? 0)
                    : (p.unitPriceUsd ?? 0);
                const czk = fx ? baseUsd * fx : null;
                return (
                  <tr key={p.id} className={isStale ? "border-l-2 border-l-warn" : ""}>
                    <td>
                      <span
                        className="badge"
                        style={{ borderColor: `${p.function.service.color}55`, color: p.function.service.color }}
                      >
                        {p.function.service.name}
                      </span>
                    </td>
                    <td>{p.function.name}</td>
                    <td className="text-muted">{p.provider}</td>
                    <td className="font-mono text-xs">{p.model}</td>
                    <td className="text-xs">{BILLING_LABELS[p.billingType] ?? p.billingType}</td>
                    <td className="text-right">
                      <InlinePriceCell id={p.id} field="inputPriceUsd" value={p.inputPriceUsd} disabled={p.billingType !== "token_io"} />
                    </td>
                    <td className="text-right">
                      <InlinePriceCell id={p.id} field="outputPriceUsd" value={p.outputPriceUsd} disabled={p.billingType !== "token_io"} />
                    </td>
                    <td className="text-right">
                      <InlinePriceCell id={p.id} field="unitPriceUsd" value={p.unitPriceUsd} disabled={p.billingType === "token_io"} />
                    </td>
                    <td className="text-right text-muted font-mono">{czk != null ? fmtCzk(czk) : "—"}</td>
                    <td className="text-right">
                      <InlinePriceCell id={p.id} field="markupCoefficient" value={p.markupCoefficient} step="0.01" />
                    </td>
                    <td><StatusToggle id={p.id} status={p.status as "active" | "inactive"} /></td>
                    <td className="text-xs text-muted">{fmtDate(p.updatedAt)}</td>
                    <td>
                      <Link href={`/pricing/${p.id}`} className="text-accent text-xs hover:underline">edit</Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="text-center text-muted py-8">Žádné záznamy.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
