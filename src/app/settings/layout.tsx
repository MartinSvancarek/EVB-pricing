import Link from "next/link";

const tabs = [
  { href: "/settings/fx", label: "FX" },
  { href: "/settings/revenue", label: "Revenue" },
  { href: "/settings/users", label: "Users" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex gap-1 border border-border rounded overflow-hidden mb-4 w-fit">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="px-3 py-1.5 text-sm bg-panel2 hover:bg-panel">
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </>
  );
}
