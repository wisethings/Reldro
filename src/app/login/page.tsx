import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Logo height={30} />
        </Link>
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink-900">Log in</h1>
          <p className="mt-1 text-xs text-ink-500">Report hazards and incidents, coordinate the response, and close the loop.</p>
          <div className="mt-5">
            <LoginForm />
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-ink-500">
          Filed a report without your name?{" "}
          <Link href="/follow-up" className="font-medium text-orchid-deep underline-offset-2 hover:underline">Check on it with your case code</Link>
        </p>
      </div>
    </div>
  );
}
