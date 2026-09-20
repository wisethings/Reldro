import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { DemoLoginPanel } from "@/components/auth/DemoLoginPanel";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-700 text-sm font-bold text-white">
            R
          </span>
          <span className="text-base font-semibold text-ink-900">Reldro</span>
        </Link>
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink-900">Log in</h1>
          <p className="mt-1 text-sm text-ink-500">Welcome back to your AI adoption workspace.</p>
          <div className="mt-5">
            <LoginForm />
          </div>
          <p className="mt-4 text-center text-xs text-ink-500">
            No account?{" "}
            <Link href="/signup" className="font-medium text-brand-700 hover:text-brand-800">
              Create your organization
            </Link>
          </p>
        </div>
        <div className="mt-4">
          <DemoLoginPanel />
        </div>
      </div>
    </div>
  );
}
