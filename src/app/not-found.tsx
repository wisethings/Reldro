import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink-50 px-6 text-center">
      <Logo height={28} />
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Page not found</h1>
        <p className="mt-2 text-sm text-ink-500">The page you're looking for doesn't exist or you don't have access to it.</p>
      </div>
      <Link href="/dashboard" className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
        Back to dashboard
      </Link>
    </div>
  );
}
