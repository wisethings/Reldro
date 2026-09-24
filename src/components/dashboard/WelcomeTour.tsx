"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { dismissOnboardingTour } from "@/lib/actions/tour";

type Step = { title: string; body: string };

const ADMIN_STEPS: Step[] = [
  { title: "Welcome to Reldro", body: "This is your AI adoption operating system — here's a 30-second tour of where things live." },
  { title: "Overview", body: "Your organization's real AI adoption snapshot: fluency, workflow usage, and value captured — all computed from actual activity." },
  { title: "Team", body: "Invite employees, see who's active, spot skill gaps, and check the reward leaderboard for who's applying AI the most." },
  { title: "Learn", body: "Employees get bite-sized lessons tied to real workflows. You can also create your own lessons for your team — look for \"Create a lesson for your team.\"" },
  { title: "Workflows & Opportunities", body: "Browse AI-ready workflows for your industry and see where your organization has the highest-value opportunities to adopt AI." },
  { title: "You're set", body: "Explore at your own pace — every number you see is real, computed from your organization's actual data." },
];

const EMPLOYEE_STEPS: Step[] = [
  { title: "Welcome to Reldro", body: "This is where you build and show your AI skills at work — here's a quick tour." },
  { title: "Take your assessment", body: "Start with the AI Skills Assessment to see your fluency and get a personalized starting point." },
  { title: "Learn", body: "Short, practical lessons tied to your actual job — not generic AI training. Your manager may have added lessons made just for your team." },
  { title: "Workflows", body: "Step-by-step AI processes for your role. Adopting one and checking off its steps is how you build a real track record." },
  { title: "Rewards", body: "You earn real points for learning, adopting workflows, and being recognized — redeemable for actual rewards, never for just logging in." },
];

export function WelcomeTour({ role }: { role: Role }) {
  const steps = role === "COMPANY_ADMIN" ? ADMIN_STEPS : EMPLOYEE_STEPS;
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();

  if (dismissed) return null;

  function finish() {
    setDismissed(true);
    startTransition(() => dismissOnboardingTour());
  }

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4">
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
    </div>
  );
}
