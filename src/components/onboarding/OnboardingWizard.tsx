"use client";

import { useMemo, useState, useTransition } from "react";
import {
  INDUSTRIES,
  COMPANY_SIZES,
  REVENUE_RANGES,
  GEOGRAPHIES,
  BUSINESS_MODELS,
  AI_GOALS,
  DEPARTMENT_OPTIONS,
  INTEGRATION_CATALOG,
} from "@/lib/data/catalog";
import { ORG_ASSESSMENT_QUESTIONS, LIKERT_LABELS, likertToScore } from "@/lib/data/assessment-questions";
import { computeOrgAdoptionScore, maturityBand, ORG_MATURITY_LABELS, type OrgMaturityCategory } from "@/lib/scoring";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { ScoreRing } from "@/components/ui/Progress";

const TOTAL_STEPS = 6;

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckGrid({
  options,
  selected,
  onToggle,
  columns = 2,
}: {
  options: { key: string; label: string; sub?: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  columns?: number;
}) {
  return (
    <div className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
      {options.map((o) => {
        const active = selected.includes(o.key);
        return (
          <button
            type="button"
            key={o.key}
            onClick={() => onToggle(o.key)}
            className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
              active ? "border-brand-600 bg-brand-50 text-orchid-deep" : "border-ink-200 text-ink-700 hover:border-ink-300"
            }`}
          >
            <span className="block font-medium">{o.label}</span>
            {o.sub && <span className="block text-xs text-ink-500">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function OnboardingWizard({ companyName }: { companyName: string }) {
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();

  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [revenueRange, setRevenueRange] = useState("");
  const [geography, setGeography] = useState("");
  const [businessModel, setBusinessModel] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [integrationKeys, setIntegrationKeys] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>(["Marketing", "Sales", "Operations"]);
  const [responses, setResponses] = useState<Record<string, number>>({});

  const toggle = (list: string[], setList: (v: string[]) => void, key: string) => {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  const breakdown = useMemo(() => {
    const byCategory: Record<OrgMaturityCategory, number[]> = {
      literacy: [],
      usage: [],
      workflowIntegration: [],
      governance: [],
      measurement: [],
      leadershipAdoption: [],
    };
    for (const q of ORG_ASSESSMENT_QUESTIONS) {
      const val = responses[q.key];
      if (val !== undefined) byCategory[q.category].push(likertToScore(val));
    }
    return Object.fromEntries(
      (Object.keys(byCategory) as OrgMaturityCategory[]).map((cat) => {
        const values = byCategory[cat];
        const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
        return [cat, avg];
      })
    ) as Record<OrgMaturityCategory, number>;
  }, [responses]);

  const overallScore = useMemo(() => computeOrgAdoptionScore(breakdown), [breakdown]);
  const band = maturityBand(overallScore);
  const assessmentComplete = ORG_ASSESSMENT_QUESTIONS.every((q) => responses[q.key] !== undefined);

  function next() {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function finish() {
    startTransition(() => {
      completeOnboarding({
        industry,
        size,
        revenueRange,
        geography,
        businessModel,
        goals,
        integrationKeys,
        departments,
        responses: Object.entries(responses).map(([key, value]) => ({ key, score: likertToScore(value) })),
      });
    });
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <div className="mb-6 flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? "bg-brand-600" : "bg-ink-100"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Tell us about {companyName}</h2>
            <p className="mt-1 text-sm text-ink-500">This shapes which workflows and specialists we recommend.</p>
          </div>
          <Select label="Industry" value={industry} onChange={setIndustry} options={INDUSTRIES} />
          <Select label="Company size (employees)" value={size} onChange={setSize} options={COMPANY_SIZES} />
          <Select label="Annual revenue" value={revenueRange} onChange={setRevenueRange} options={REVENUE_RANGES} />
          <Select label="Primary geography" value={geography} onChange={setGeography} options={GEOGRAPHIES} />
          <Select label="Business model" value={businessModel} onChange={setBusinessModel} options={BUSINESS_MODELS} />
          <div className="flex justify-end pt-2">
            <button
              onClick={next}
              disabled={!industry || !size || !revenueRange || !geography || !businessModel}
              className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">What are you trying to accomplish with AI?</h2>
            <p className="mt-1 text-sm text-ink-500">Select all that apply.</p>
          </div>
          <CheckGrid
            options={AI_GOALS.map((g) => ({ key: g, label: g }))}
            selected={goals}
            onToggle={(k) => toggle(goals, setGoals, k)}
          />
          <StepNav onBack={back} onNext={next} nextDisabled={goals.length === 0} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">What tools does your company use?</h2>
            <p className="mt-1 text-sm text-ink-500">
              For your MVP workspace these connect as demo integrations — no live data is pulled yet.
            </p>
          </div>
          <CheckGrid
            options={INTEGRATION_CATALOG.map((i) => ({ key: i.key, label: i.name, sub: i.category }))}
            selected={integrationKeys}
            onToggle={(k) => toggle(integrationKeys, setIntegrationKeys, k)}
            columns={3}
          />
          <StepNav onBack={back} onNext={next} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">What departments do you have?</h2>
            <p className="mt-1 text-sm text-ink-500">We'll tailor opportunities and learning to each one.</p>
          </div>
          <CheckGrid
            options={DEPARTMENT_OPTIONS.map((d) => ({ key: d, label: d }))}
            selected={departments}
            onToggle={(k) => toggle(departments, setDepartments, k)}
          />
          <StepNav onBack={back} onNext={next} nextDisabled={departments.length === 0} />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">AI maturity assessment</h2>
            <p className="mt-1 text-sm text-ink-500">Rate how much you agree with each statement for your organization today.</p>
          </div>
          <div className="max-h-[420px] space-y-5 overflow-y-auto pr-1 scrollbar-thin">
            {ORG_ASSESSMENT_QUESTIONS.map((q) => (
              <div key={q.key}>
                <p className="text-sm text-ink-800">{q.text}</p>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {LIKERT_LABELS.map((label, idx) => {
                    const value = idx + 1;
                    const active = responses[q.key] === value;
                    return (
                      <button
                        key={label}
                        type="button"
                        title={label}
                        onClick={() => setResponses((r) => ({ ...r, [q.key]: value }))}
                        className={`rounded-md border py-2 text-[11px] font-medium ${
                          active ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 text-ink-500 hover:border-ink-300"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <StepNav onBack={back} onNext={next} nextDisabled={!assessmentComplete} nextLabel="See my score" />
        </div>
      )}

      {step === 6 && (
        <div className="space-y-6 text-center">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Your AI Adoption Score</h2>
            <p className="mt-1 text-sm text-ink-500">This is your starting point — Reldro will help you move it.</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreRing value={overallScore} size={120} label="/ 100" />
            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">{band.label}</span>
            <p className="max-w-sm text-xs text-ink-500">{band.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-left sm:grid-cols-3">
            {(Object.keys(breakdown) as OrgMaturityCategory[]).map((cat) => (
              <div key={cat} className="rounded-lg bg-ink-50 px-3 py-2">
                <p className="text-[11px] text-ink-500">{ORG_MATURITY_LABELS[cat]}</p>
                <p className="text-sm font-semibold text-ink-900">{breakdown[cat]}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={back} className="rounded-lg border border-ink-300 px-5 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50">
              Back
            </button>
            <button
              onClick={finish}
              disabled={pending}
              className="rounded-full bg-brand-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {pending ? "Setting up your workspace…" : "Go to my dashboard"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex justify-between pt-2">
      <button onClick={onBack} className="rounded-lg border border-ink-300 px-5 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50">
        Back
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}
