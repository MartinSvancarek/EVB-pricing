import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { addFx } from "../actions";

export const dynamic = "force-dynamic";

export default async function FxPage() {
  const rates = await prisma.fxRate.findMany({ orderBy: { date: "desc" }, take: 30 });
  return (
    <>
      <PageHeader title="Settings · FX kurz CZK/USD" subtitle="Manuální zadávání kurzu. Auto-fetch z ČNB ve v2." />
      <Section title="Přidat / přepsat kurz">
        <form action={addFx} className="flex gap-2 items-end">
          <div>
            <label className="label">Datum</label>
            <input type="date" name="date" required className="input" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">CZK / USD</label>
            <input type="number" step="0.001" name="rate" required className="input" defaultValue={23} />
          </div>
          <button className="btn-primary">Uložit</button>
        </form>
      </Section>
      <Section title="Historie (posledních 30)">
        <table className="table">
          <thead>
            <tr><th>Datum</th><th className="text-right">CZK / USD</th><th>Zdroj</th></tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.date)}</td>
                <td className="text-right font-mono">{r.czkPerUsd.toFixed(4)}</td>
                <td className="text-muted text-xs">{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}
