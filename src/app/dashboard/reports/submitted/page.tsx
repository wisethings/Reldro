import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireViewer } from "@/lib/safety/context";

export default async function ReportSubmittedPage({ searchParams }: { searchParams: Promise<{ n?: string; anon?: string }> }) {
  await requireViewer();
  const { n, anon } = await searchParams;
  const ref = n ? `SR-${String(parseInt(n, 10) || 0).padStart(4, "0")}` : null;
  const anonymous = anon === "1";

  return (
    <div className="mx-auto max-w-md space-y-5 p-6 text-center">
      <CheckCircle2 size={48} className="mx-auto text-sage-deep" />
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Thanks. Your report was sent.</h1>
        {ref && <p className="mt-1 text-sm text-ink-500">Reference {ref}</p>}
      </div>
      <p className="text-sm text-ink-600">
        {anonymous
          ? "It was filed anonymously, so it won't appear in your list and you won't get updates. The safety team can still act on it."
          : "The safety team has been routed this report. You can follow what happens next under My reports."}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/dashboard/reports/new" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800">Report another</Link>
        <Link href="/dashboard/overview" className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50">Back to home</Link>
      </div>
      <p className="text-xs text-ink-400">If someone still needs help, call your emergency number now.</p>
    </div>
  );
}
