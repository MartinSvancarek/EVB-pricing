import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { addFx } from "../actions";
import { FxHistoryTable } from "./FxHistoryTable";

export const dynamic = "force-dynamic";

export default async function FxPage() {
  const rates = await prisma.fxRate.findMany({ orderBy: { date: "desc" } });
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
      <Section title="Historie kurzů">
        <FxHistoryTable rates={rates.map((r) => ({ id: r.id, date: r.date.toISOString(), czkPerUsd: r.czkPerUsd, source: r.source }))} />
      </Section>
    </>
  );
}
