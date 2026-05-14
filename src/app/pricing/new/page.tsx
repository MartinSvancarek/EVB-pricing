import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { savePricing } from "../actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewPricingPage() {
  const functions = await prisma.function.findMany({ include: { service: true }, orderBy: { name: "asc" } });
  return <PricingForm functions={functions} initial={null} />;
}

export function PricingForm({
  functions,
  initial,
}: {
  functions: Awaited<ReturnType<typeof prisma.function.findMany>>;
  initial: any;
}) {
  return (
    <>
      <PageHeader
        title={initial ? "Editace ceny" : "Nová cena"}
        subtitle="Definujte pricing pro model × provider."
        actions={<Link href="/pricing" className="btn">Zpět</Link>}
      />
      <form action={savePricing} className="card max-w-3xl space-y-4">
        {initial && <input type="hidden" name="id" defaultValue={initial.id} />}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Model</label>
            <input name="model" required defaultValue={initial?.model ?? ""} className="input w-full" />
          </div>
          <div>
            <label className="label">Provider</label>
            <input name="provider" required defaultValue={initial?.provider ?? ""} className="input w-full" />
          </div>
          <div>
            <label className="label">Fallback provider</label>
            <input name="fallbackProvider" defaultValue={initial?.fallbackProvider ?? ""} className="input w-full" placeholder="nepovinné" />
          </div>
          <div>
            <label className="label">Služba (funkce)</label>
            <select name="functionId" required defaultValue={initial?.functionId ?? ""} className="input w-full">
              <option value="" disabled>— vyberte —</option>
              {functions.map((f: any) => (
                <option key={f.id} value={f.id}>{f.service.name} · {f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Typ účtování</label>
            <select name="billingType" required defaultValue={initial?.billingType ?? "token_io"} className="input w-full">
              <option value="token_io">token_io (vstup + výstup)</option>
              <option value="token_unit">token_unit (jedna cena)</option>
              <option value="image">image</option>
              <option value="audio_second">audio_second</option>
              <option value="video_second">video_second</option>
              <option value="request">request</option>
              <option value="minute">minute</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={initial?.status ?? "active"} className="input w-full">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div>
            <label className="label">Cena USD (hlavní)</label>
            <input type="number" step="0.000001" name="priceUsd" defaultValue={initial?.priceUsd ?? ""} className="input w-full" placeholder="per image / second / request" />
          </div>
          <div>
            <label className="label">Vstupní cena USD (1M tokenů)</label>
            <input type="number" step="0.000001" name="inputPriceUsd" defaultValue={initial?.inputPriceUsd ?? ""} className="input w-full" />
          </div>
          <div>
            <label className="label">Výstupní cena USD (1M tokenů)</label>
            <input type="number" step="0.000001" name="outputPriceUsd" defaultValue={initial?.outputPriceUsd ?? ""} className="input w-full" />
          </div>
          <div>
            <label className="label">Jednotka (label)</label>
            <input name="unitLabel" defaultValue={initial?.unitLabel ?? ""} className="input w-full" placeholder="např. 1M tokens, 1 image" />
          </div>
        </div>
        <div>
          <label className="label">Interní poznámka</label>
          <textarea name="internalNote" defaultValue={initial?.internalNote ?? ""} className="input w-full min-h-20" />
        </div>
        <input type="hidden" name="markupCoefficient" value={initial?.markupCoefficient ?? "1"} />
        <div className="flex gap-2">
          <button className="btn-primary">Uložit</button>
          <Link href="/pricing" className="btn">Zrušit</Link>
        </div>
      </form>
    </>
  );
}
