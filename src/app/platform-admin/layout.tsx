import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { logout } from "@/lib/actions/auth";

const NAV = [
  { href: "/platform-admin", label: "Overview" },
  { href: "/platform-admin/organizations", label: "Organizations" },
  { href: "/platform-admin/requests", label: "Expert help requests" },
  { href: "/platform-admin/specialists", label: "Specialists" },
  { href: "/platform-admin/workflows", label: "Workflow templates" },
];

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["PLATFORM_ADMIN"]);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-ink-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold">Reldro · Platform Admin</span>
            <nav className="flex gap-4">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-xs text-ink-200 hover:text-white">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logout}>
            <button className="rounded-md border border-ink-700 px-2.5 py-1 text-xs text-ink-200 hover:bg-ink-900">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
