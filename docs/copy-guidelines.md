# Copy guidelines

How Reldro's interface text is written. Follow these when you add or change a screen, an email, an error
message or an AI draft. Where privacy or AI is involved, the text must match what the code does; see
`docs/incident-response-and-privacy.md`.

## Voice

Clear, calm, respectful, practical, trustworthy, non-punitive. Professional and human, not legalistic and
not casual. Say what the person can do and what happens next. Mention urgency when it exists, without alarm.

## Rules

- Sentence case for headings, buttons and labels. Short sentences. Active voice, concrete verbs: report,
  review, assign, inspect, verify, close.
- No exclamation marks, except a genuine urgent safety instruction.
- Avoid "here", "below", "as soon as", and "something" where a specific word fits.
- Explain an unfamiliar safety term the first time it appears (for example, "near miss: an event that could
  have caused harm but did not").
- Never imply Reldro guarantees safety, prevents injuries, or certifies compliance. Do not call a site,
  worker or process "safe", "clear" or "compliant".
- Never ask a worker to decide root cause or technical seriousness. Responders confirm seriousness.
- Investigations look at conditions, not fault.

## Product terms (use them consistently)

| Term | Meaning | Not the same as |
|---|---|---|
| Report | A concern or event a worker submits | incident, investigation |
| Incident | An event, including an injury, illness or near miss | report |
| Incident response | The shared workspace a team uses to coordinate on an incident | investigation |
| Investigation | A structured review of an incident or concern | report |
| Corrective action | A tracked fix or follow-up task | "action" on its own (only in the phone tab bar, where space is tight) |
| Inspection | A scheduled or completed workplace check | investigation |

Report types shown to workers: Hazard, Near miss, Injury or illness, Equipment issue, Other concern.
Corrective action statuses: Proposed, Open, In progress, Ready to verify, Verified, Cancelled. "Overdue"
is shown next to the due date rather than as a status, because an overdue item is still open.

## Privacy copy

Three options, worded from what is stored (see `PRIVACY_OPTIONS` in `ReportForm.tsx`):

1. **Share my name with my supervisor and the safety team.**
2. **Share my name with the safety team only.** The supervisor sees "Name not shared". The name is still
   stored and visible to company admins and safety leads.
3. **Submit without my name.** No reporter is stored; the audit log records no user. The reporter gets a
   private case code for replies. The text says that what they write, photos, site and time could still
   identify them.

Do not describe (2) as anonymous. Do not say "you will not get updates" for (3): two-way follow-up with the
case code exists.

## AI copy

Label every AI or checklist-generated draft ("AI-assisted draft" or "Draft from built-in checklists") and
tell people to review and edit it. List what a draft was built from. Never say AI determines a root cause,
assesses safety, or certifies compliance. Say who sends anything consequential: a person does.

## Where the words live

- Vocabulary and status labels: `src/lib/safety/pack.ts`
- Screen text: the page and component files under `src/app/dashboard` and `src/components/safety`
- Server messages: `src/lib/actions/safety*.ts`
- Email: `src/lib/email.ts`, `src/lib/safety/incident.ts`
- Timeline event wording is stored with each event, so changing it affects new events only.
