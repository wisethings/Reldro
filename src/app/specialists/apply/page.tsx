import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SpecialistApplicationForm } from "@/components/specialists/SpecialistApplicationForm";

export default function SpecialistApplyPage() {
  return (
    <div className="min-h-screen bg-ink-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Link href="/login" className="mb-8 flex items-center justify-center gap-2">
          <Logo height={28} />
        </Link>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-ink-900 sm:text-3xl">Become a Reldro specialist</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink-600">
            Reldro matches companies who need hands-on help implementing AI with specialists who've done it before.
            Tell us about your background below and we'll reach out about active requests that fit.
          </p>
        </div>
        <SpecialistApplicationForm />
      </div>
    </div>
  );
}
