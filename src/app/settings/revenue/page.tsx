import { prisma } from "@/lib/db";
import { PageHeader, Section } from "@/components/ui";
import { fmtCzk, fmtDate } from "@/lib/format";
import { addRevenue } from "../actions";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const items = await prisma.revenue.findMany({ orderBy: { periodStart: "desc" } });
  const today = new Date();
  const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const lastOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Settings · Revenue" subtitle="Měsíční obrat CZK – jmenovatel pro výpočet cost ratio." />
      <Section title="Přidat / přepsat měsíc">
        <form action={addRevenue} className="flex gap-2 items-end">
          <div>
            <label className="label">Od</label>
            <input type="date" name="start" required defaultValue={firstOfMonth} className="input" />
          </div>
          <div>
            <label className="label">Do</label>
            <input type="date" name="end" required defaultValue={lastOfMonth} className="input" />
          </div>
          <div>
            <label className="label">Částka CZK</label>
            <input type="number" step="1" name="amount" required defaultValue={4500000} className="input w-40" />
          </div>
          <button className="btn-primary">Uložit</button>
        </form>
      </Section>
      <Section title={`Historie (${items.length})`}>
        <table className="table">
          <thead>
            <tr><th>Od</th><th>Do</th><th className="text-right">CZK</th><th>Pozn.</th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.periodStart)}</td>
                <td>{fmtDate(r.periodEnd)}</td>
                <td className="text-right font-mono">{fmtCzk(r.amountCzk)}</td>
                <td className="text-xs text-muted">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}
