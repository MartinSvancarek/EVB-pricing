import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "EVB Pricing – interní admin",
  description: "Interní nástroj pro správu AI pricingu, nákladů a simulací",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <div className="min-h-screen flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 p-6 overflow-auto">{children}</main>
            <footer className="px-6 py-3 text-xs text-muted border-t border-border">
              EVB Pricing · MVP ·{" "}
              <Link href="https://github.com/MartinSvancarek/EVB-pricing" className="hover:text-accent">
                repo
              </Link>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
