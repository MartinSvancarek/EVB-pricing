"use client";
import { useState, useTransition } from "react";
import { updatePackageField } from "./actions";

type Pkg = {
  id: string;
  code: string;
  name: string;
  monthlyPriceCzk: number | null;
  yearlyPriceCzk: number | null;
  monthlyInYearly: number | null;
  twoYearPriceCzk: number | null;
  threeYearPriceCzk: number | null;
  credits: number;
  imageLimit: number | null;
  videoLimit: number | null;
  isCustom: boolean;
};

type Props = {
  regular: Pkg[];
  enterpriseMin: Pkg | null;
  enterpriseMax: Pkg | null;
};

const rows: { key: string; label: string; field: keyof Pkg }[] = [
  { key: "monthly", label: "Měsíční cena s DPH (v Kč)", field: "monthlyPriceCzk" },
  { key: "yearly", label: "Roční cena s DPH (v Kč)", field: "yearlyPriceCzk" },
  { key: "monthlyInYearly", label: "Měsíční cena u ročního balíčku s DPH (v Kč)", field: "monthlyInYearly" },
  { key: "twoYear", label: "Balíček na 2 roky s DPH (v Kč)", field: "twoYearPriceCzk" },
  { key: "threeYear", label: "Balíček na 3 roky s DPH (v Kč)", field: "threeYearPriceCzk" },
  { key: "credits", label: "Počet kreditů v balíčku", field: "credits" },
  { key: "imageLimit", label: "Omezení generování Obrázky*", field: "imageLimit" },
  { key: "videoLimit", label: "Omezení generování Videa*", field: "videoLimit" },
];

function fmtNum(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("cs-CZ");
}

export function PackagesTable({ regular, enterpriseMin, enterpriseMax }: Props) {
  // Columns: Enterprise (min) | Enterprise (max) | then regular in reverse sortOrder (premium first)
  const regularReversed = [...regular].sort((a, b) => b.credits - a.credits);

  const columns: { pkg: Pkg; label: string }[] = [];
  if (enterpriseMin) columns.push({ pkg: enterpriseMin, label: "Enterprise (min)" });
  if (enterpriseMax) columns.push({ pkg: enterpriseMax, label: "Enterprise (max)" });
  for (const p of regularReversed) {
    columns.push({ pkg: p, label: p.name });
  }

  return (
    <div className="card overflow-auto">
      <p className="text-xs text-muted mb-3">
        Enterprise balíček má nastavitelný rozsah — hodnoty min/max definují hranice custom nabídky. Kliknutím na hodnotu ji můžete upravit.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th className="min-w-[280px]">Typ balíčku</th>
            {columns.map((c) => (
              <th key={c.pkg.id} className="min-w-[120px]">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="text-sm">{row.label}</td>
              {columns.map((c) => (
                <td key={c.pkg.id}>
                  <EditableCell
                    pkgId={c.pkg.id}
                    field={row.field as string}
                    value={(c.pkg as any)[row.field]}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted mt-3">
        * Omezení generování obrázků a videí jsou informativní hodnoty pro uživatele.
      </p>
    </div>
  );
}

function EditableCell({ pkgId, field, value }: { pkgId: string; field: string; value: number | null }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value != null ? String(value) : "");
  const [isPending, start] = useTransition();

  function commit() {
    setEditing(false);
    const num = v === "" ? null : Number(v);
    if (num === value) return;
    start(async () => {
      await updatePackageField(pkgId, field, num);
    });
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`font-mono text-sm text-left hover:bg-panel2 px-2 py-0.5 rounded w-full ${isPending ? "opacity-50" : ""}`}
      >
        {fmtNum(value)}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type="number"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setV(value != null ? String(value) : ""); setEditing(false); }
      }}
      className="input w-28 font-mono"
    />
  );
}
