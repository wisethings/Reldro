import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { logout } from "@/lib/actions/auth";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "/platform-admin", label: "Overview" },
  { href: "/platform-admin/organizations", label: "Organizations" },
  { href: "/platform-admin/demo-requests", label: "Demo requests" },
  { href: "/platform-admin/product-updates", label: "Product updates" },
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
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Logo inverse height={20} />
                <span className="text-xs text-ink-200">Platform Admin</span>
              </div>
              <form action={logout} className="md:hidden">
                <button className="rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-200 hover:bg-ink-900">Log out</button>
              </form>
            </div>
            <nav className="flex gap-4 overflow-x-auto pb-1 md:pb-0">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="shrink-0 text-xs text-ink-200 hover:text-white">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logout} className="hidden md:block">
            <button className="rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-200 hover:bg-ink-900">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
