import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * First-weeks checklist for company admins: each step links to where it is done and ticks itself once the
 * data exists. It disappears when everything is done, so an established workspace never sees it.
 */
export async function GetStarted({ organizationId }: { organizationId: string }) {
  const [org, sites, people, inspections, talks] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { emergencyInstructions: true } }),
    prisma.site.findMany({ where: { organizationId, active: true }, select: { safetyLeadId: true } }),
    prisma.employee.count({ where: { organizationId } }),
    prisma.inspection.count({ where: { organizationId, status: "COMPLETED" } }),
    prisma.toolboxTalk.count({ where: { organizationId } }),
  ]);

  const steps = [
    { done: sites.length > 0, title: "Add a site", detail: "Reports, inspections and actions are organized by site.", href: "/dashboard/sites", cta: "Sites" },
    { done: Boolean(org?.emergencyInstructions.trim()), title: "Add your emergency instructions", detail: "Reporters see them on the report form.", href: "/dashboard/settings", cta: "Settings" },
    { done: people > 0, title: "Invite your team", detail: "Each person gets an email with a temporary password.", href: "/dashboard/training?tab=people", cta: "People" },
    { done: sites.length > 0 && sites.every((s) => s.safetyLeadId), title: "Name a safety lead for each site", detail: "They receive new reports by default.", href: "/dashboard/sites", cta: "Sites" },
    { done: inspections > 0, title: "Complete your first inspection", detail: "Use one of the starter checklists.", href: "/dashboard/inspections", cta: "Inspections" },
    { done: talks > 0, title: "Share a toolbox talk", detail: "Crews acknowledge it in the app.", href: "/dashboard/training", cta: "Talks" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <section aria-labelledby="get-started" className="surface mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink-100 px-4 py-3 sm:px-5">
        <div>
          <h2 id="get-started" className="text-sm font-semibold text-ink-900">Get started</h2>
          <p className="text-xs text-ink-500">{doneCount} of {steps.length} done. Finish these and your team is running on Reldro.</p>
        </div>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Setup progress">
          <div className="h-full rounded-full bg-sage-deep transition-[width] duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>
      <ul className="divide-y divide-ink-100">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Link href={s.href} className="group flex items-center gap-3 px-4 py-2.5 outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 sm:px-5">
              <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${s.done ? "border-sage-deep bg-sage-deep text-white" : i === nextIndex ? "border-brand-700 text-brand-700" : "border-ink-300 text-transparent"}`}>
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${s.done ? "text-ink-500 line-through decoration-ink-300" : "font-medium text-ink-900"}`}>{s.title}</span>
                {!s.done && <span className="block truncate text-xs text-ink-500">{s.detail}</span>}
              </span>
              {!s.done && (
                <span className={`flex shrink-0 items-center gap-0.5 text-xs font-medium ${i === nextIndex ? "text-orchid-deep" : "text-ink-500"} group-hover:text-oxblood`}>
                  {i === nextIndex ? "Next" : s.cta}
                  <ChevronRight size={14} aria-hidden />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
