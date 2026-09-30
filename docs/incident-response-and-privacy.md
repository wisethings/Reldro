# Incident response and reporter privacy

How the incident workspace and the reporting privacy options actually work in the code. Written so
product copy can be checked against it. If you change behavior, change this file too.

Reldro is not an emergency service. Nothing in the product calls, alerts or dispatches emergency
services, and the report form says so.

## One record per event

- A **report** (`SafetyReport`) is the intake record for everything.
- An **incident response** (`IncidentResponse`, one row per report) is a *mode* of that report for
  events that need a coordinated response. It is not a second record of the same event. It adds a
  lead, responders, a situation summary, a next action, and a closeout.
- **Investigations** and **corrective actions** hang off the same report. Failed inspection items
  become actions and can be filed as hazard reports (`SafetyReport.inspectionId`); the item's action
  moves onto that report so the hazard has one home.
- Minor reports never get an incident row. A hazard can be just a report plus an action.

## Opening an incident response

| How | Who | Result |
|---|---|---|
| By hand ("Open an incident response" on the report) | Safety team (company admin or safety lead) | Lead defaults to the report owner; responders are added afterwards |
| By an escalation rule with "Also open an incident response" ticked | Configured by a company admin in Settings | Opens when a new report matches; lead = the rule's "Assign to", the rule's escalation contact is added as a responder |

Rules only see a **suggested** seriousness, computed from the report kind and the words used
(`suggestSeverity` in `src/lib/safety/pack.ts`). The reporter never chooses seriousness. A responder
confirms or changes it (`SafetyReport.severityConfirmedAt`); until then every screen labels it
"suggested". A responder can **stand an incident down** with a reason, which keeps the report
as a normal report and keeps the history.

Notifications: named responders get an email with the reference, site and a link, and no report
details, **only if** `RESEND_API_KEY` is configured and the workspace is not a sample workspace.
Otherwise the timeline records "No email sent…" and responders see the incident on their Overview.
There is no SMS or push.

## Who can see and do what

| | Safety team | Response lead | Responder | Supervisor of the site | Owner | Reporter only |
|---|---|---|---|---|---|---|
| See the report | yes | yes | yes | yes | yes | own report |
| See the incident workspace | yes | yes | yes | read-only | yes | no |
| Edit summary, next action, lead, team, closeout | yes | yes | no | no | no | no |
| Post updates, decisions, notes, photos | yes | yes | yes | no | yes | no |
| Read "safety team only" entries | yes | no | no | no | no | no |
| Message the reporter | yes | yes | no | no | yes | n/a |
| Investigation details and statements | yes | if named lead | no | no | no | no |

Timeline visibility (`visibleEvents` in `src/lib/safety/access.ts`): restricted entries are safety
team only; a reporter who is only the reporter sees the plain progress steps, messages addressed to
them, and their own replies, not internal working notes.

## What each privacy option really stores

| Option shown to the reporter | `privacy` | `reporterId` | Who can see the name |
|---|---|---|---|
| My supervisor and the safety team | `NAMED` | saved | supervisor of the site, safety team |
| Only the safety team | `CONFIDENTIAL` | saved | safety team (company admins and safety leads). Supervisors see "Withheld" |
| Anonymous | `ANONYMOUS` | **not saved** | nobody |

For anonymous reports specifically:

- No employee id is stored on the report or its timeline events.
- The audit log entry for the report is written **without a user id** (`auditAnonymous`).
- The reporter gets a private case code (12 characters, ~60 bits) **once**, in the response to the
  form (never in a URL). Only a salted SHA-256 hash is stored (`followUpHash`).
- With the code, at `/follow-up` (no login), the reporter sees a short list of progress steps and
  messages addressed to them, and can reply. The page shows no staff names and no internal notes.
  Lookups and replies are rate limited by IP.
- Photos are re-encoded in the browser, which drops embedded location data.

What we **cannot** promise, and the form says so: what the reporter writes, the photos, and details
like the site and time can identify them, especially at a small site. Hosting or network logs sit
outside the app. Anyone holding the case code can read the replies. A lost code cannot be recovered.

Free text is exported to CSV as written; the export omits reporter names.

## AI boundaries (enforced in `src/lib/safety/ai.ts`)

Drafts only, labeled "AI-assisted draft" or "Draft from built-in checklists", always editable, with
the records they were built from listed under "Built from". Used for: structuring a report from
typed or dictated text, summarizing a timeline, suggesting investigation questions and missing
information, drafting a closeout summary, drafting a de-identified lesson, summarizing themes, and
outlining a toolbox talk from company-approved text.

Not done by AI: assigning fault or a root cause, deciding a site or process is safe or compliant,
closing or verifying actions, opening or resolving an incident, sending messages to the reporter or
anyone else. Each of those is a person's click. The lesson draft is built only from the topic, the
investigator's selected factors, and action titles, then scrubbed of known employee names. Restricted
(safety-team-only) timeline entries are never given to the closeout draft.

If a model provider is configured (`AI_PROVIDER` plus a key), the text of the report or timeline
being drafted is sent to that provider. With none configured, the built-in checklists run locally.

## Sample workspace

`Organization.isDemo` marks the sample workspace (Havenbrook Electrical). Every screen shows a banner,
no email is sent, and the seed refuses to run against a database that holds a workspace not marked as
sample data unless `ALLOW_DESTRUCTIVE_SEED=true`. The seed adds: an active incident response with a
timeline, a resolved rule-opened one, an anonymous report with the code `PLAY-SAFE-2026`, an overdue
and a verified action, completed and scheduled inspections with a failed item, and qualifications
that are current, expiring and expired.

## Not built / simulated

- No integrations. Email is the only outbound channel and only when configured.
- No SMS, push, on-call rotation, or automatic escalation timers. "Overdue" is computed when a page loads.
- Photos are stored inline in the database (compressed). No documents, video or audio uploads.
- The pack has construction categories and inspection templates only. Site types are configurable
  in the pack; other industries need their own pack, not a schema change.
- No regulatory logic (OSHA recordability, reporting deadlines). Nothing certifies compliance.
