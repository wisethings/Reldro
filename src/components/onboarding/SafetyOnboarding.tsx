"use client";

import { useActionState, useRef, useState } from "react";
import { Check, ClipboardCheck, Siren } from "lucide-react";
import { completeSafetyOnboarding } from "@/lib/actions/safetySettings";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { btnGhost, btnPrimary } from "@/components/ui/FormParts";
import { cn } from "@/components/ui/cn";

type Starter = { name: string; cadence: string | null; items: number };

const STEPS = [
  { label: "Your site", title: "Where will crews report from?", description: "Reports, inspections and corrective actions are organized by site. You can add more sites later." },
  { label: "Emergency plan", title: "What should someone do first in an emergency?", description: "Every reporter sees this on the report form, right under the standard message about calling the local emergency number." },
  { label: "Checklists", title: "Start with the standard checklists?", description: "Ready-made checklists your team can use from day one. Edit or delete any of them later." },
] as const;

const EXAMPLE = "Call 911, then the site superintendent. Muster at the north gate. Do not move an injured person unless they are in immediate danger.";

export function SafetyOnboarding({ companyName, starters }: { companyName: string; starters: Starter[] }) {
  const [state, formAction, pending] = useActionState(completeSafetyOnboarding, undefined);
  const [step, setStep] = useState(0);
  const [siteName, setSiteName] = useState("");
  const [address, setAddress] = useState("");
  const [emergency, setEmergency] = useState("");
  const [starter, setStarter] = useState(true);
  const [tried, setTried] = useState(false);
  const last = step === STEPS.length - 1;
  const siteError = tried && !siteName.trim() ? "Enter a name for your first site." : undefined;
  const topRef = useRef<HTMLDivElement>(null);

  function go(to: number) {
    setStep(to);
    // Keep the top of the card in view when the step changes on a phone.
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }
  function next() {
    if (step === 0 && !siteName.trim()) {
      setTried(true);
      return;
    }
    go(Math.min(step + 1, STEPS.length - 1));
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Enter on a middle step moves forward; only the last step actually submits.
        if (!last) {
          e.preventDefault();
          next();
        }
      }}
      onKeyDown={(e) => {
        // A text field's Enter would otherwise do nothing on the first steps (there is no submit button yet).
        if (e.key === "Enter" && !last && (e.target as HTMLElement).tagName === "INPUT") {
          e.preventDefault();
          next();
        }
      }}
      className="space-y-5"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Welcome, {companyName}</h1>
        <p className="mt-1 text-sm text-ink-600">Three quick steps to get reports a place to land. You can change everything later.</p>
      </div>

      <ol className="flex items-center" aria-label="Setup progress">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.label} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")} aria-current={active ? "step" : undefined}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => go(i)}
                className="group flex items-center gap-2 rounded-full py-1 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-200",
                    done ? "bg-sage-deep text-white" : active ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-500",
                  )}
                >
                  {done ? <Check size={14} strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                <span className={cn("text-xs font-medium transition-colors", active ? "text-ink-900" : "hidden text-ink-500 sm:inline")}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span aria-hidden className={cn("mx-2 h-px flex-1 transition-colors duration-300 sm:mx-3", done ? "bg-sage-deep" : "bg-ink-200")} />}
            </li>
          );
        })}
      </ol>

      <div ref={topRef} className="expand-panel scroll-mt-4 overflow-hidden">
        <div className="border-b border-ink-100 px-4 py-4 sm:px-6">
          <p className="text-xs font-medium text-ink-500">Step {step + 1} of {STEPS.length}</p>
          <h2 className="mt-0.5 text-base font-semibold text-ink-900">{STEPS[step].title}</h2>
          <p className="mt-1 text-sm text-ink-600">{STEPS[step].description}</p>
        </div>

        {state?.error && <div className="px-4 pt-4 sm:px-6"><Alert tone="error">{state.error}</Alert></div>}

        {/* Every step stays mounted so one submit carries all the answers; only the active one is shown. */}
        <div className="px-4 py-5 sm:px-6">
          <div hidden={step !== 0} className="step-in space-y-4">
            <Field label="Jobsite, shop or yard name" required error={siteError}>
              <Input name="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="e.g. Bayside Tower, electrical package" autoComplete="off" />
            </Field>
            <Field label="Address" optional>
              <Input name="address" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" />
            </Field>
          </div>

          <div hidden={step !== 1} className="step-in space-y-4">
            <Field label="Your instructions" optional hint="Reldro does not contact emergency services, so this should reflect your own plan.">
              <Textarea name="emergencyInstructions" value={emergency} onChange={(e) => setEmergency(e.target.value.slice(0, 600))} rows={4} maxLength={600} placeholder="e.g. Call 911, then the site superintendent at your site's number. Muster at the north gate." />
            </Field>
            <div className="flex items-center justify-between gap-3 text-xs text-ink-500">
              <button type="button" onClick={() => setEmergency(EXAMPLE)} className="font-medium text-orchid-deep hover:text-oxblood">Use an example</button>
              <span className="tabular-nums">{emergency.length}/600</span>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">What reporters will see</p>
              <div role="note" className="flex gap-3 rounded-lg border-l-4 border-danger bg-coral-soft/60 px-4 py-3 text-sm text-ink-900">
                <Siren size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />
                <div>
                  <p className="font-semibold">If anyone is in immediate danger or needs urgent medical help, call your local emergency number or follow your site's emergency procedure now.</p>
                  {emergency.trim() ? <p className="mt-1 break-words text-ink-800">Your company's instructions: {emergency.trim()}</p> : <p className="mt-1 text-ink-500">Your instructions will appear here.</p>}
                  <p className="mt-1 text-xs text-ink-700">Do not wait to submit this report. Submitting a report does not call emergency services or send anyone to help.</p>
                </div>
              </div>
            </div>
          </div>

          <div hidden={step !== 2} className="step-in space-y-5">
            <label className={cn("block cursor-pointer rounded-xl border p-4 transition-colors duration-150", starter ? "border-brand-500 bg-orchid-soft/40" : "border-ink-200 bg-white hover:bg-surface-hover")}>
              <input type="checkbox" name="starterTemplates" checked={starter} onChange={(e) => setStarter(e.target.checked)} className="peer sr-only" />
              <span className="flex items-start gap-3">
                <span aria-hidden className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors", starter ? "border-brand-700 bg-brand-700 text-white" : "border-ink-300 bg-white text-transparent")}>
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">Add the standard starter checklists</span>
                  <span className="mt-0.5 block text-xs text-ink-600">{starters.length} checklists, ready to schedule.</span>
                  <ul className="mt-3 space-y-2">
                    {starters.map((t) => (
                      <li key={t.name} className="flex items-center gap-2.5 rounded-lg bg-white/80 px-3 py-2 text-sm text-ink-800 ring-1 ring-inset ring-ink-100">
                        <ClipboardCheck size={15} className="shrink-0 text-orchid-deep" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{t.name}</span>
                        <span className="shrink-0 text-xs text-ink-500">{t.cadence ?? "As needed"} · {t.items} items</span>
                      </li>
                    ))}
                  </ul>
                </span>
              </span>
            </label>

            <dl className="divide-y divide-ink-100 rounded-xl border border-ink-200 text-sm">
              {[
                { label: "First site", value: siteName.trim() || "Not set", step: 0 },
                { label: "Emergency plan", value: emergency.trim() ? "Added" : "Standard message only", step: 1 },
                { label: "Checklists", value: starter ? `${starters.length} starter checklists` : "None for now", step: 2 },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-ink-500">{r.label}</dt>
                  <dd className="flex min-w-0 items-center gap-3">
                    <span className="truncate font-medium text-ink-900">{r.value}</span>
                    {r.step < 2 && <button type="button" onClick={() => go(r.step)} className="shrink-0 text-xs font-medium text-orchid-deep hover:text-oxblood">Edit</button>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-ink-500">Until you name a safety lead for a site (under People and Sites), new reports show up on your Overview as unassigned, so nothing waits unseen.</p>
          </div>
        </div>

        <div className="card-footer flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
          {step > 0 ? <button type="button" onClick={() => go(step - 1)} className={btnGhost}>Back</button> : <span />}
          {/* Distinct keys so React swaps the node: reusing one button and flipping it to type=submit mid-click would submit the form early. */}
          {last ? (
            <button key="finish" type="submit" disabled={pending} className={btnPrimary}>{pending ? <><Spinner /> Setting up…</> : "Finish setup"}</button>
          ) : (
            <button key="continue" type="button" onClick={next} className={btnPrimary}>Continue</button>
          )}
        </div>
      </div>
    </form>
  );
}
