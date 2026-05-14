import clsx from "clsx";

export function Kpi({
  label,
  value,
  sub,
  status,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  status?: "good" | "warn" | "bad" | "unknown";
  tooltip?: string;
}) {
  return (
    <div className="kpi" title={tooltip}>
      <div className="kpi-label">{label}</div>
      <div
        className={clsx(
          "kpi-value",
          status === "good" && "text-good",
          status === "warn" && "text-warn",
          status === "bad" && "text-bad",
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
