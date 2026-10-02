import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      footer={
        <>
          Submitted a report without your name?{" "}
          <Link href="/follow-up" className="font-medium text-orchid-deep transition-colors duration-150 hover:text-oxblood focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
            Use your case code to check for updates
          </Link>
        </>
      }
    >
      <h1 className="text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-900">Sign in</h1>
      <div className="mt-7">
        <LoginForm />
      </div>
    </AuthShell>
  );
}
