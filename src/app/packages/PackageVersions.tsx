"use client";
import { useState, useTransition } from "react";
import { savePackageVersion, loadPackageVersion, deletePackageVersion } from "./actions";
import { fmtDate } from "@/lib/format";
import { useRouter } from "next/navigation";

type Version = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
};

export function PackageVersions({ versions, activeVersionId }: { versions: Version[]; activeVersionId: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleSave() {
    if (!name.trim()) { setMsg("Zadejte název verze."); return; }
    start(async () => {
      try {
        await savePackageVersion(name, desc);
        setName("");
        setDesc("");
        setMsg("Verze uložena.");
        router.refresh();
      } catch (e: any) { setMsg(e.message ?? "Chyba."); }
    });
  }

  function handleLoad(id: string, versionName: string) {
    if (!confirm(`Načíst verzi „${versionName}"? Přepíše aktuální hodnoty balíčků.`)) return;
    start(async () => {
      try {
        await loadPackageVersion(id);
        setMsg(`Verze „${versionName}" načtena.`);
        router.refresh();
      } catch (e: any) { setMsg(e.message ?? "Chyba."); }
    });
  }

  function handleDelete(id: string, versionName: string) {
    if (!confirm(`Smazat verzi „${versionName}"?`)) return;
    start(async () => {
      try {
        await deletePackageVersion(id);
        setMsg(`Verze „${versionName}" smazána.`);
        router.refresh();
      } catch (e: any) { setMsg(e.message ?? "Chyba."); }
    });
  }

  return (
    <div className="card mt-4">
      <h3 className="text-sm font-semibold mb-3">Verze balíčků</h3>

      {/* Save new version */}
      <div className="flex gap-2 items-end mb-4">
        <div className="flex-1">
          <label className="label">Název verze</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="např. Květen 2026" />
        </div>
        <div className="flex-1">
          <label className="label">Popis (volitelný)</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input w-full" placeholder="" />
        </div>
        <button onClick={handleSave} disabled={isPending} className="btn-primary whitespace-nowrap">
          {isPending ? "Ukládám…" : "Uložit aktuální stav"}
        </button>
      </div>
      {msg && <p className="text-xs text-muted mb-3">{msg}</p>}

      {/* Versions list */}
      {versions.length === 0 ? (
        <p className="text-xs text-muted">Zatím žádné uložené verze.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Název</th>
              <th>Popis</th>
              <th>Vytvořeno</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className={v.id === activeVersionId ? "bg-accent/5 border-l-2 border-l-accent" : ""}>
                <td className="font-medium">
                  {v.name}
                  {v.id === activeVersionId && <span className="ml-2 text-xs text-accent">(aktivní)</span>}
                </td>
                <td className="text-xs text-muted">{v.description ?? "—"}</td>
                <td className="text-xs text-muted">{fmtDate(v.createdAt)}</td>
                <td className="flex gap-2">
                  {v.id !== activeVersionId && (
                    <>
                      <button onClick={() => handleLoad(v.id, v.name)} disabled={isPending} className="btn text-xs">Načíst</button>
                      <button onClick={() => handleDelete(v.id, v.name)} disabled={isPending} className="btn text-xs text-bad border-bad/30 hover:bg-bad/10">Smazat</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
