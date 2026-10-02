import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/**
 * Frame for the sign-in page: warm page, centred column, logo close above a quiet card, and one secondary line below.
 * Spacing runs on a 4px grid (logo 20px above the card, secondary line 20px below it) and the column is narrower than the
 * viewport on phones with a 16px gutter.
 */
export function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-ink-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="w-full max-w-[480px]">
        <Link href="/" aria-label="Reldro" className="mb-5 flex justify-center">
          <Logo height={28} />
        </Link>
        <div className="rounded-[14px] border border-oxblood/[0.09] bg-white p-6 shadow-[0_1px_2px_rgba(42,10,12,0.04)] sm:p-8">{children}</div>
        {footer && <p className="mt-5 text-balance px-2 text-center text-[13px] leading-[1.45] text-ink-500">{footer}</p>}
      </div>
    </main>
  );
}
