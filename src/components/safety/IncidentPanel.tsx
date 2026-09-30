import Link from "next/link";
import { AlertTriangle, ClipboardList, Search } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { incidentStatusInfo } from "@/lib/safety/pack";
import { SeverityBadge } from "./ui";
import { LocalTime } from "./LocalTime";
import { IncidentComposer, IncidentDetailsForm, ResponderManager } from "./IncidentControls";

type Person = { id: string; name: string };

/**
 * The shared incident workspace header: one place for the situation, lead, next action, team and
 * links to the investigation and corrective actions of the same report. It is a mode of the
 * report page, not a second record of the event.
 */
export function IncidentPanel(props: {
  reportId: string;
  severity: string;
  severityConfirmed: boolean;
  siteName: string | null;
  locationNote: string;
  incident: { status: string; summary: string; nextAction: string; nextActionDueAt: Date | null; openedAt: Date; openedBy: string; leadId: string | null; standDownReason: string };
  openedByName: string | null;
  leadName: string | null;
  responders: { employeeId: string; name: string; role: string }[];
  people: Person[];
  canRun: boolean;
  canContribute: boolean;
  isSafetyTeam: boolean;
  investigation: { id: string; status: string; accessible: boolean; factors: string[] } | null;
  actionCounts: { open: number; overdue: number; verified: number; total: number };
}) {
  const { incident: inc } = props;
  const st = incidentStatusInfo(inc.status);
  const resolved = inc.status === "RESOLVED";
  const nextOverdue = !resolved && inc.nextActionDueAt !== null && inc.nextActionDueAt.getTime() < Date.now();

  return (
    <section aria-labelledby="incident-heading" className="space-y-4 rounded-2xl border-2 border-coral bg-white p-0 shadow-card">
      <Card className="border-0 shadow-none">
        <CardHeader
          icon={<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-soft text-danger"><AlertTriangle size={18} aria-hidden /></span>}
          title="Incident response"
          subtitle={<>Opened <LocalTime value={inc.openedAt} /> {inc.openedBy === "RULE" ? "by an escalation rule your company set up" : props.openedByName ? `by ${props.openedByName}` : "by the safety team"}</>}
          action={<Badge tone={st.tone}>{st.label}</Badge>}
        />
        <CardBody className="space-y-5">
          <h2 id="incident-heading" className="sr-only">Incident response workspace</h2>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-500">Response lead</dt>
              <dd className="font-medium text-ink-900">{props.leadName ?? <span className="text-danger">No lead yet</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Seriousness</dt>
              <dd className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={props.severity} suggested={!props.severityConfirmed} />
                {!props.severityConfirmed && <span className="text-[11px] text-ink-500">Waiting for a responder to confirm</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Where</dt>
              <dd className="text-ink-900">{props.siteName ?? "Site not specified"}{props.locationNote ? <span className="block text-xs text-ink-500">{props.locationNote}</span> : null}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Next action</dt>
              <dd className="text-ink-900">
                {resolved ? "None. Response resolved." : inc.nextAction || <span className="text-ink-500">Not set</span>}
                {!resolved && inc.nextActionDueAt && (
                  <span className={`block text-xs ${nextOverdue ? "font-medium text-danger" : "text-ink-500"}`}>{nextOverdue ? "Overdue since " : "By "}<LocalTime value={inc.nextActionDueAt} /></span>
                )}
              </dd>
            </div>
          </dl>

          <div>
            <p className="text-xs font-medium text-ink-500">Where things stand</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-800">{inc.summary || <span className="text-ink-500">No summary yet.</span>}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-200 p-3 text-sm">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500"><Search size={13} aria-hidden /> Investigation</p>
              {props.investigation ? (
                props.investigation.accessible ? (
                  <>
                    <Link href={`/dashboard/investigations/${props.investigation.id}`} className="mt-1 inline-block font-medium text-orchid-deep hover:text-oxblood">
                      {props.investigation.status === "COMPLETE" ? "Complete" : props.investigation.status === "IN_REVIEW" ? "In review" : "Open"} · view workspace →
                    </Link>
                    {props.investigation.factors.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1" aria-label="Contributing factors chosen by the investigator">
                        {props.investigation.factors.map((f) => <li key={f} className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-ink-700">{f}</li>)}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-ink-700">{props.investigation.status === "COMPLETE" ? "Complete" : "Under way"}. Details are limited to the safety team and the investigation lead.</p>
                )
              ) : (
                <p className="mt-1 text-ink-600">{props.canRun || props.isSafetyTeam ? "Not opened. Open an investigation from the report when it needs a closer review." : "Not opened."}</p>
              )}
            </div>
            <a href="#actions" className="rounded-xl border border-ink-200 p-3 text-sm hover:bg-ink-50">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500"><ClipboardList size={13} aria-hidden /> Corrective actions</p>
              <p className="mt-1 text-ink-800">
                {props.actionCounts.total === 0
                  ? "None yet"
                  : `${props.actionCounts.open} open${props.actionCounts.overdue ? `, ${props.actionCounts.overdue} overdue` : ""} · ${props.actionCounts.verified} verified`}
              </p>
            </a>
          </div>

          {props.canRun && !resolved && (
            <details className="rounded-lg border border-ink-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-ink-800">Update the summary, next action, and lead</summary>
              <div className="mt-3">
                <IncidentDetailsForm
                  reportId={props.reportId}
                  status={inc.status}
                  summary={inc.summary}
                  nextAction={inc.nextAction}
                  nextActionDueAtIso={inc.nextActionDueAt ? inc.nextActionDueAt.toISOString() : null}
                  leadId={inc.leadId}
                  people={props.people}
                />
              </div>
            </details>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-ink-900">Response team</p>
            <ResponderManager reportId={props.reportId} responders={props.responders} people={props.people} canEdit={props.canRun && !resolved} />
          </div>

          {props.canContribute && !resolved && (
            <div className="border-t border-ink-200 pt-4">
              <p className="mb-2 text-sm font-semibold text-ink-900">Add to the timeline</p>
              <IncidentComposer reportId={props.reportId} isSafetyTeam={props.isSafetyTeam} />
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
