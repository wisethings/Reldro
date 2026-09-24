"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { dismissOnboardingTour } from "@/lib/actions/tour";

type Step = { title: string; body: string; navHref?: string };

const ADMIN_STEPS: Step[] = [
  { title: "Welcome to Reldro", body: "This is your AI adoption operating system — here's a 30-second tour of where things live." },
  { title: "Overview", body: "Your organization's real AI adoption snapshot: fluency, workflow usage, and value captured — all computed from actual activity.", navHref: "/dashboard/overview" },
  { title: "Team", body: "Invite employees, see who's active, spot skill gaps, and check the reward leaderboard for who's applying AI the most.", navHref: "/dashboard/team" },
  { title: "Learn", body: "Employees get bite-sized lessons tied to real workflows. You can also create your own lessons for your team here.", navHref: "/dashboard/learn" },
  { title: "Workflows", body: "Browse AI-ready workflows for your industry and see where your organization has the highest-value opportunities.", navHref: "/dashboard/workflows" },
  { title: "You're set", body: "Explore at your own pace — every number you see is real, computed from your organization's actual data." },
];

const EMPLOYEE_STEPS: Step[] = [
  { title: "Welcome to Reldro", body: "This is where you build and show your AI skills at work — here's a quick tour." },
  { title: "AI Assessment", body: "Start here to see your AI fluency and get a personalized starting point.", navHref: "/dashboard/assessment" },
  { title: "Learn", body: "Short, practical lessons tied to your actual job — not generic AI training. Your manager may have added lessons made just for your team.", navHref: "/dashboard/learn" },
  { title: "Workflows", body: "Step-by-step AI processes for your role. Adopting one and checking off its steps is how you build a real track record.", navHref: "/dashboard/workflows" },
  { title: "Rewards", body: "You earn real points for learning, adopting workflows, and being recognized — redeemable for actual rewards, never for just logging in.", navHref: "/dashboard/rewards" },
];

function useHighlightRect(navHref: string | undefined, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active || !navHref) {
      setRect(null);
      return;
    }
    function measure() {
      const el = document.querySelector<HTMLElement>(`[data-tour-nav="${navHref}"]`);
      const r = el?.getBoundingClientRect();
      setRect(r && r.width > 0 ? r : null);
    }
    measure();
    const t1 = setTimeout(measure, 150);
    const t2 = setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measure);
    };
  }, [navHref, active]);

  return rect;
}

export function WelcomeTour({ role }: { role: Role }) {
  const steps = role === "COMPANY_ADMIN" ? ADMIN_STEPS : EMPLOYEE_STEPS;
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const current = steps[step];
  const rect = useHighlightRect(current.navHref, !dismissed);

  // Navigate to the page the current step is actually talking about.
  useEffect(() => {
    if (!dismissed && current.navHref) router.push(current.navHref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, dismissed]);

  if (dismissed) return null;

  function finish() {
    setDismissed(true);
    startTransition(() => dismissOnboardingTour());
  }

  const isLast = step === steps.length - 1;

  const card = (
    <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-600" : "bg-ink-100"}`} />
        ))}
      </div>
      <h2 className="text-lg font-semibold text-ink-900">{current.title}</h2>
      <p className="mt-2 text-sm text-ink-600">{current.body}</p>
      <div className="mt-6 flex items-center justify-between">
        <button onClick={finish} className="text-xs font-medium text-ink-500 hover:text-ink-800">
          Skip tour
        </button>
        <button
          onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          {isLast ? "Get started" : "Next"}
        </button>
      </div>
    </div>
  );

  if (!rect) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4">{card}</div>
    );
  }

  return (
    <>
      <div
        className="pointer-events-none fixed z-40 rounded-lg border-2 border-brand-500 transition-all duration-300"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
        }}
      />
      <div
        className="fixed z-50 px-4"
        style={{
          top: Math.max(16, Math.min(rect.top, window.innerHeight - 260)),
          left: Math.min(rect.right + 16, window.innerWidth - 400),
        }}
      >
        {card}
      </div>
    </>
  );
}
