# Reldro for MSPs: Product Strategy and Redesign Brief

Prepared 29 Sep 2026. This is a strategy document. No product code was changed.

## How to read this brief

Every claim carries a label so you can tell what is known from what is proposed.

| Tag | Meaning |
|---|---|
| **[V]** | Verified in the Reldro codebase during this review. |
| **[M]** | Market evidence from an external source. Quality is stated. |
| **[A]** | Assumption. Not verified. Must be tested with customers. |
| **[R]** | Recommendation. A judgment, not a fact. |

**Evidence quality warning.** I could not open vendor pages (ConnectWise, Datto/Kaseya, resolvcmd, Channel Insider); the sandbox blocks those domains. Vendor-feature and survey claims below come from web-search result summaries. Many of the secondary sources are blogs written by companies that sell AI tools to MSPs (Rallied, Flamingo, Mizo, LTVplus, Thread). Treat them as directional. Nothing here is proof of demand.

---

## 1. Executive product thesis (one page)

**What Reldro is today [V].** A multi-tenant web app for company-wide AI adoption: assessments, opportunity scoring, workflow playbooks, tool library, templates, learning, rewards, analytics. Its tenancy is one organization with departments. It has no concept of a ticket, a client account, a PSA, retrieval over documents, or write-back to another system. Slack is the only real integration; the others create mock connections with random "records synced" numbers.

**The proposed repositioning.** Help MSP technicians handle recurring service-desk tickets more consistently, using approved knowledge, with a technician reviewing every suggestion.

**The uncomfortable finding [M].** The obvious first features are already shipped or bundled by the systems MSPs use every day:
- ConnectWise says Sidekick for PSA triages and categorizes tickets, summarizes them into a ticket note, suggests resolutions, and drafts customer replies. (Vendor page via search summary.)
- Autotask lists AI triage, routing, summarization, and suggested documentation, branded by Kaseya as "Kaseya Intelligence". (Vendor page via search summary.)
- HaloPSA is reported at about £69 per agent per month with AI features included. (Third-party pricing blog.)
- Several funded startups target MSP service desks (Thread, Pia, ZofiQ, Neo Agent, Helena, per one vendor-written landscape post).

So "AI summarizes the ticket and drafts a reply" is not a defensible wedge. Building it as the MVP would be a weak bet.

**Where a gap may remain [A].** Vendor AI is tied to that vendor's suite. It is unclear how well it handles (a) an MSP whose PSA, documentation, and chat tools come from different vendors, (b) knowledge that is stale, contradictory, or scattered, and (c) showing a manager, with inspectable data, whether the AI actually helped. These are hypotheses. Phase 0 exists to test them.

**Recommended bet [R].** One workflow: **guided ticket handling for a few recurring ticket types**. For each ticket in scope, Reldro finds the MSP's own approved procedure, shows it with citations and freshness, flags missing information, and drafts an internal note. The technician accepts, edits, rejects, or escalates. Corrections flow back into the knowledge, so the procedures improve. Managers see outcomes from PSA data, not from self-reported time saved.

**What must be true for this to work.**
1. MSPs have procedures or history worth retrieving. Documentation quality is the biggest unknown.
2. Technicians will use it inside their ticket flow without extra tabs.
3. A meaningful operational metric moves in a controlled comparison.
4. MSPs will pay a price that covers inference, integration, and support cost, when PSA vendors bundle similar AI.

**What I am not claiming.** No revenue, ROI, margin, retention, or labor-savings outcome is assumed. Each is a hypothesis with a test in sections 11.4 and 13.

**Decision requested.** Approve a 90-day discovery-and-pilot plan (section 14) with hard stop gates. Do not fund a broad rebuild before Gate 1.

---

## 2. Observed product facts vs. the walkthrough impressions

| Walkthrough observation | What the code shows | Status |
|---|---|---|
| Some integrations look like demo data | [V] `src/lib/actions/integrations.ts` creates a connection with `mockData: { recordsSynced: random 200–2200 }` unless Slack is configured. Slack has real OAuth and a digest post. | Confirmed for the code. Production configuration not checked. |
| Assistant returned an error | [V] The assistant (`src/lib/ai/assistant.ts`) answers a fixed set of intents from the org's own data; a model fallback runs only when an API key is set and has a catch block. | Error not reproduced. Cause unknown. Verify before acting. |
| Adoption/value measures inconsistent | [V] A code comment says earlier metrics were "frozen guesses" on a snapshot table, replaced by live computation for some views. Value is `estimated hours × org hourly rate` from opportunity estimates. Usage events are created only from in-app actions (template copies, workflow step completions). | Plausible cause found. Not audited page by page. |
| "Operating system for AI transformation" | [V] Usage is measured inside Reldro, not in the systems where work happens. | Confirmed. |

**Implication.** Reldro's current "adoption" and "value captured" numbers are estimates derived from in-app clicks. They are not operational outcomes. Any MSP-facing analytics must be rebuilt on PSA data. Existing labels such as "captured" should not be reused without a measurement method.

**Reusable assets [V].** Auth and roles, multi-tenant org model, audit log helper (`logAudit`), invites and admin management, a working Slack OAuth pattern, workflow objects with steps and "human checkpoint" flags, an admin ability to hide catalog content, and an idempotent SQL-patch migration approach.

**Missing entirely [V].** Client-account boundaries inside a tenant, ticket ingestion, document retrieval, citations, suggestion/decision records, PSA and documentation connectors, secret redaction, retention controls.

---

## 3. Target customer and buying group

### 3.1 Initial ideal customer profile

Starting hypotheses [A], to be tightened in Phase 0:

| Attribute | Starting hypothesis | Why |
|---|---|---|
| Size | About 30–150 employees; roughly 8–60 technicians | Below ~25 employees, ticket volume and repeatability are thin and buying is price-driven. Above ~250, custom internal systems and procurement slow pilots. |
| Ticket volume | Around 1,000+ tickets per month on a shared service desk (screening number, not a benchmark) | Enough volume for a comparison to show something. |
| Stack | One of a small set of PSAs plus a documentation tool Reldro supports | Integration cost dominates early. |
| Practice | Written procedures exist for common ticket types; a named owner for service quality | Retrieval needs something to retrieve. |
| Posture | Owner or service manager already tracks response time, reopen, or CSAT | A baseline exists. |
| Attitude | Will pilot AI with human review | Filters out blanket refusals. |

Market-size context [M, low quality, sources disagree]: one estimate says 40,000–50,000 US MSPs; another says 100,000+ solution providers. One size-band estimate puts about 70% of MSPs under 50 employees and roughly 5,000–8,000 in the 26–100 band. Treat these as order-of-magnitude only; no registry exists.

**Poor initial targets.**
- **Very small MSPs (under ~20 staff).** Little repeatable volume; the owner is often the best technician; buying is price-sensitive and bundle-driven.
- **Large MSPs with heavy custom tooling.** Long security reviews, in-house automation teams, custom PSA fields, and strong incentives to build.
- **MSPs whose main value is project or security work.** The service desk is not their center of gravity.
- **MSPs with no usable documentation and no appetite to write any.** Retrieval has nothing to work with. Reldro could still help create it, but that is a different (slower) product.
- **Heavily regulated end-client bases** (some healthcare, government). Data-boundary reviews will delay pilots. Come back later.

### 3.2 Roles

| Role | Goals | Likely objections | Purchase criteria | Reasons to reject |
|---|---|---|---|---|
| **Economic buyer** (owner, CEO, COO, head of service delivery) | Protect margin and client retention; handle growth without proportional hiring; avoid a security incident | "My PSA vendor already has AI." "What does this cost per tech?" "Does this expose client data?" | Visible effect on metrics they already track; low setup effort; predictable price; security answers they can repeat to clients | No measurable change; vendor overlap; added tool sprawl; unclear liability |
| **Champion** (service desk manager, ops lead, automation lead) | Consistent quality across technicians; faster onboarding of new hires; less escalation noise | "Will techs actually use it?" "Who maintains the knowledge?" | Works in the ticket; easy to configure without code; clear scorecard | Extra admin work; techs ignore it; wrong answers embarrass the desk |
| **Daily users** (technicians, coordinators) | Fewer interruptions; quick correct answers; avoid blame for AI mistakes | "It slows me down." "It's wrong sometimes." "Is this monitoring me?" | Faster than searching; correct citations; easy to dismiss; no surveillance feel | Extra clicks; hallucinations; being scored on acceptance rates |
| **Technical/security reviewers** (IT, security, privacy, client-account owners) | Client isolation; least privilege; audit trail; contractual clarity on subprocessors | "Where does ticket text go?" "Can one client's data appear for another?" | Documented data flows, access control by client, audit logs, retention/deletion, subprocessor list | Any shared-index design without proof; broad OAuth scopes; no deletion story |

**Buying dynamics [A].** In smaller MSPs the owner is buyer, champion, and security reviewer at once. A short, low-cost pilot may be feasible. In larger MSPs the champion runs the pilot but the economic buyer and security reviewer each have veto power.

---

## 4. Ranked vertical options

The question asks for a ranked list of verticals. The ranking uses structural criteria (repeatable work, integration surface, measurable outcomes, buyer speed, competition, risk). Evidence for everything below MSP is thin; treat ranks 2–5 as untested.

| Rank | Vertical | Why it ranks here | Main reason it could be wrong |
|---|---|---|---|
| 1 | **MSP service desks** | Recurring ticket work; outcomes already recorded in PSAs; owners can buy quickly; technicians share procedures; PSAs have APIs and marketplaces [M, vendor material] | Crowded with vendor AI and startups; price anchors are low (HaloPSA bundles AI); MSPs are high-value attack targets [M, CISA] |
| 2 | **Internal IT service desks at 200–2,000-employee companies** | Same ticket shape; less multi-client complexity | ServiceNow/Freshservice-class incumbents with AI; longer sales cycles [A] |
| 3 | **MSSP/SOC alert triage** | High pain and repeatable enrichment steps | Higher risk, more competition, autonomy pressure, tougher trust bar [A] |
| 4 | **Insurance agencies/brokerages (existing demo persona)** | Reldro already has demo content (claims, underwriting) | Reldro's current insurance material is seed data, not customer evidence; systems of record are fragmented [V for seed data, A for market] |
| 5 | **Professional-services back office (accounting, legal ops)** | Repeatable intake and document work | Not tested; highly varied workflows; less measurable [A] |

**Rank 1 rationale in one line [R].** MSPs are the only option where the workflow, the system of record, and the outcome metrics are all standardized and reachable through APIs. The price of that is the most direct competition from platform vendors.

---

## 5. Product definition

### 5.1 Ticket lifecycle

1. **Ticket arrives** in the MSP's PSA. Reldro reads it (read-only).
2. **Context.** Reldro builds a short factual summary: what the customer reported, what was already tried, relevant recent tickets for the same client and device.
3. **Retrieve approved knowledge** the technician is allowed to see for that client, plus the MSP's shared procedures. Each result shows source, last-updated date, and owner.
4. **Propose next steps:** missing questions, diagnostic checklist from the cited procedure, and an optional draft note.
5. **Technician decision:** accept, edit, reject with a reason, or escalate. Nothing is sent or changed without this step.
6. **Write-back** limited to an internal ticket note and an optional custom field (for example "AI-assisted: yes/no" and decision) so outcomes can be measured. No customer-visible text is sent by Reldro in the MVP.
7. **Learning loop.** Edits and rejection reasons become proposed knowledge corrections, routed to the document owner for approval. Unapproved changes never enter retrieval.
8. **Manager view** shows workflow adoption and outcomes from PSA data.

### 5.2 Behavior when the AI is uncertain

Do not show a probability score. Models are poorly calibrated, and technicians would misread a "78%". Use three states based on retrieval evidence and rules:

| State | Trigger | What the technician sees | How work continues |
|---|---|---|---|
| **Grounded** | At least one approved, fresh source clearly matches the ticket type and symptoms | Steps with citations, freshness dates, and a "why this source" line | Normal review |
| **Partial** | Related sources exist but do not cover the situation, or a source is stale, or two sources disagree | Related sources listed, disagreement or staleness flagged, no prescriptive command text | Technician chooses; the choice creates a knowledge-review task |
| **No source** | Nothing relevant, unsupported ticket type, or a required integration is down | Plain statement of what was searched, a generic intake checklist for the ticket category, and the MSP's escalation rule | Ticket proceeds normally; a "gap" record feeds the knowledge backlog |

Rules [R]:
- Never present a command, registry edit, or configuration change without a citation.
- Never claim certainty. Phrase as "the approved procedure says…".
- If retrieved sources conflict, show both. Never merge them silently.
- Make dismissal cost one click and do not penalize it in reporting.

### 5.3 Workflow candidates compared

Scores are my judgment (1 = poor, 5 = strong) and should be replaced by interview evidence.

| Candidate | Frequency | Measurable impact | Ease | Data availability | Risk (5 = low risk) | Differentiation | Notes |
|---|---|---|---|---|---|---|---|
| Ticket summarization + categorization | 5 | 3 | 4 | 5 | 4 | **1** | Already shipped by ConnectWise/Autotask/Halo [M]. Table stakes, not a wedge. |
| Missing-information detection + follow-up questions | 5 | 4 | 4 | 4 | 4 | 3 | Reduces back-and-forth; measurable through touches and time to first useful response. |
| Knowledge / similar-ticket retrieval with citations | 5 | 4 | 3 | **2–4 (depends on doc quality)** | 3 | 3 | Value depends on documentation quality. Vendors do "smart suggestions" [M]; citation and freshness handling may differ [A]. |
| Customer update drafting | 4 | 3 | 4 | 4 | **2** | 1 | Customer-facing text is a trust risk; vendors already draft replies [M]. |
| Technician troubleshooting checklists | 4 | 4 | 3 | 3 | 3 | 3 | Strong if derived from the MSP's own procedures. |
| Escalation recommendations | 3 | 3 | 3 | 3 | 2 | 2 | Wrong advice has consequences; needs a rules backbone. |
| Resolution documentation | 5 | 3 | 4 | 5 | 4 | 3 | Natural feed for the knowledge loop. Halo can already draft KB articles from ticket actions [M, vendor guide via search]. |
| Routine onboarding/account/device setup | 4 | 4 | 2 | 3 | **1–2** | 2 | Acts on customer systems; crowded by automation vendors (Pia, Rewst) [M]. Out for MVP. |

### 5.4 Recommendation: one workflow

**MVP workflow [R]: "Guided handling for recurring ticket types."**

Scope: the top three to five recurring ticket categories, chosen from each pilot MSP's own history in Phase 0. Combines missing-information detection, cited retrieval of the MSP's own procedure, and a technician-facing checklist. Resolution documentation is a supporting step that feeds the knowledge loop, not a second product.

Why it wins on the criteria:
- **Frequency.** Every ticket in a category is a chance to use it.
- **Measurable.** Time to first useful response, touches per ticket, reopen and escalation rates all live in the PSA.
- **Difficulty.** Medium. Retrieval and citations are well-understood; document ingestion and permissions are the hard parts.
- **Data.** The MSP already owns tickets and docs.
- **Risk.** Internal-facing, human-reviewed, no external actions.
- **Differentiation.** Moderate and unproven. Vendors do generic suggestions; a citation-first, freshness-aware, correction-driven loop is the claim to test [A].

Not in MVP: customer-facing drafts, autonomous actions, onboarding automation, routing. Each fails on risk or differentiation.

---

## 6. Product scope

### 6.1 Capability table

| Tier | Capability |
|---|---|
| **MVP** | One PSA connector (read tickets, notes, categories, resolutions; write internal note and one custom field). One documentation source (read-only, per-client scoping). Client-account model with permissioning. Ticket panel: summary, missing questions, cited procedure, checklist, draft internal note. Accept/edit/reject/escalate with reasons. Audit log of retrievals, suggestions, decisions, write-backs. Knowledge correction queue with owner approval. Manager scorecard from PSA data with visible assumptions. Admin settings: enabled ticket categories, allowed/disallowed AI actions, retention. SSO. |
| **Next** (only after repeat usage and a measured effect) | Second PSA. Second documentation source. Microsoft Teams surface. Customer-update drafts behind approval. Technician-coaching from accepted/edited patterns. Similar-ticket clustering to propose new procedures. Expanded ticket categories. |
| **Later** | Read-only RMM/device context. Cross-MSP anonymized benchmarks (only with contractual consent). Partner/vendor marketplace distribution. Limited, pre-approved low-risk actions with strong proof (see 8.3). |
| **Remove, hide, or defer** | See 6.2. |

### 6.2 Assessment of every existing area

| Area | Decision | Reasoning (buyer value, technician adoption, recurring use, complexity, cost to maintain) |
|---|---|---|
| **AI assessment** | **Remove from the initial experience.** Repurpose the idea as an onboarding "service-desk readiness check" built from real PSA and documentation data. | A company-wide maturity survey has no daily use and no technician value. A data-based readiness check has clear buyer value at setup only. |
| **Opportunity prioritization** | **Redesign.** Keep the impact-versus-effort concept, replace inputs with real ticket categories (volume, repeatability, documentation coverage). | This is the best-reusable idea in the product. Today's inputs are estimates [V]; real PSA data makes it credible and gives the pilot its scope. |
| **Workflow playbooks** | **Redesign into "handling guides."** Versioned, owned, with review dates, per ticket category; reuse steps and human-checkpoint fields. | This is the core knowledge object for the MVP. Existing structure fits; content model needs owner/freshness and client scoping. |
| **Initiatives** | **Hide/defer.** | Program tracking for company-wide adoption. Does not help ticket work. Maintenance cost without recurring use. |
| **Tool library** | **Hide/defer.** Replace with a plain "Connected systems" admin list. | An AI-tool governance catalog is a different buyer problem. |
| **Integrations** | **Redesign as the product's backbone.** Remove or clearly label mock connections. Reuse the Slack OAuth pattern. | Without real PSA/doc connections there is no product. Fake connections damage trust. |
| **Templates** | **Defer to Next.** Fold into approved response snippets for internal notes and, later, customer updates. | Useful, but not the promise. |
| **Learning** | **Defer.** Later: short coaching triggered by a technician's own edited or rejected suggestions. | A separate course catalog competes for attention with ticket work and is costly to maintain. Just-in-time coaching has better adoption logic, but needs evidence. |
| **Rewards** | **Remove.** | Gamified points for "AI usage" can push technicians to click rather than help, and can be read as surveillance. Adoption should come from usefulness. Nontrivial maintenance cost. |
| **Expert Help** | **Remove from the product; deliver as a paid pilot service.** | A marketplace for outside specialists is off-mission. Setup help is better handled by Reldro staff during the pilot, which also teaches the team what to productize. |
| **Analytics** | **Redesign** into the scorecard in section 10. Drop estimated-value tiles unless an inspectable method exists. | Managers need PSA-based outcomes. Current numbers are in-app proxies [V]. |
| **Team management** | **Retain and redesign.** Users from SSO/PSA sync; roles; client-access assignments. | Administrators need it. Adds per-client permissions. |
| **Generic AI assistant** | **Remove.** Replace with a ticket-scoped, source-grounded panel. | A general chat assistant answering adoption questions has no role in ticket handling [V]. A general chatbot is what technicians already have. |

---

## 7. Integration strategy

Vendors named here are **candidates to validate** with target MSPs. None are claimed to be connected today [V: only Slack has any real integration code].

### 7.1 Requirements per category

| Category | Candidates (validate) | Read | Write back | Permissions | Sync/error behavior | Stale/conflicting data | If disconnected | MVP? |
|---|---|---|---|---|---|---|---|---|
| **PSA/ticketing** | ConnectWise PSA, Autotask, HaloPSA | Tickets, notes, categories, priority, client, resolution, time entries, technician IDs | Internal note; one custom "AI-assisted" field with decision | Dedicated API user, least-privilege role scoped to boards/queues in scope; no delete rights | Webhook plus periodic reconciliation; retry with backoff; show last-sync time; queue writes | PSA is source of truth for ticket state; Reldro suggestions are marked "based on ticket as of [time]" and refreshed on change | Panel shows "PSA not connected. Suggestions may be out of date." Read-only history; no write-back; no error swallowing | **Yes (exactly one)** |
| **Documentation/KB** | IT Glue, Hudu, SharePoint/Confluence | Articles, SOPs, checklists, asset notes, per-client scoping metadata, updated dates | None in MVP. Propose changes only inside Reldro; owner applies them | Read-only key; exclude password/secret vault objects entirely | Full initial import, then incremental; deletion propagates; show doc age | Show last-updated and owner; flag docs older than a per-type threshold; if two sources disagree, show both | Retrieval limited to last synced copy, clearly labeled with its sync time | **Yes (exactly one)** |
| **Collaboration** | Microsoft Teams, Slack | Nothing beyond the notification payload | Notifications to the manager (weekly scorecard, integration failures) | Minimal bot scopes; no channel history | Best effort; failures logged | n/a | Fall back to in-app and email | Slack notifications: reuse [V]. Teams: Next |
| **Identity/access/audit** | Entra ID (SSO, SCIM), Okta, SIEM export | User/group membership | Audit events export | Standard OIDC/SAML; SCIM optional | Deprovision on removal | n/a | Local admin break-glass with MFA; alert | SSO **yes**; SIEM export Next |
| **RMM/monitoring** | NinjaOne, Datto RMM, ConnectWise Automate | Device and alert context (read-only) | None | Read-only tokens | n/a | n/a | Feature hidden | **Later** |

### 7.2 Sequence [R]
1. Prototype offline on exported, sanitized ticket and doc samples from design partners. No live integration.
2. One PSA read connection, then internal-note write-back. Pick the PSA most common among the first three design partners.
3. One documentation source, read-only.
4. SSO, then Slack/Teams notifications.
5. Only then a second PSA.

### 7.3 Where the surface lives
Technicians should not open a separate app [R]. Options to test in Phase 0: an embedded panel in the PSA (depends on each vendor's extension support [A]); a browser side-panel keyed to the ticket ID; a Teams bot. The winner is whichever avoids tab-switching. If none avoids it, adoption risk is high and that should be treated as a stop signal.

---

## 8. Trust, security, and human review

An MSP holds credentials and remote access into many client environments. Government agencies warn that compromised MSPs can be used to attack their customers [M, CISA advisory AA22-131A, primary source]. Security reviewers will treat any new vendor with access to tickets and documentation as part of that risk. These are core requirements, not later work.

### 8.1 Requirements

| Area | Requirement |
|---|---|
| **Tenant separation** | Each MSP is a separate tenant. Inside a tenant, a first-class **Client** entity. Every ticket, document, chunk, embedding, and suggestion carries `tenant_id` and `client_id`. [V] Reldro today only separates by organization and department. Client-level separation is new work. |
| **Access control** | Role-based (admin, manager, technician) plus client-level assignment. Retrieval filters by the technician's client access before ranking, not after. Shared MSP-wide procedures are a separate scope. |
| **Least privilege** | Dedicated service accounts. No write scopes beyond an internal note and one field. No delete. Secrets vault objects excluded from ingestion. |
| **Audit** | Log each retrieval (what, for whom, which ticket), suggestion shown, decision, edit, write-back, admin change, and export. Exportable. [V] An audit-log mechanism exists and can be extended. |
| **Retention/deletion** | Configurable retention for ticket text and derived data. Client offboarding deletes that client's chunks, embeddings, and suggestions. Deletion is verified and logged. |
| **Sensitive data** | Detect and redact credentials, API keys, MFA codes, and obvious personal identifiers in ticket text before sending to a model. Do not index password fields. Provide a client-level "do not process" flag. Regulated data classes (health, payment) blocked until a compliance review says otherwise. |
| **Model provider** | Written subprocessor list; no training on customer data; short or zero provider retention; data-region choice where required. |
| **Human approval** | Nothing that changes a customer system or communicates externally happens without a named human's action. MVP writes only an internal note the technician approved. |
| **Evidence** | Every troubleshooting statement links to a source and shows its date. Unsupported statements are labeled or not shown. |
| **Conflict/low confidence** | The three states in 5.2. |
| **Tenant AI policy** | Admin toggles: enabled ticket categories, disabled categories, allowed suggestion types, whether drafts can be generated, retention period. |

### 8.2 Threats specific to this product [M]
- **Indirect prompt injection.** Ticket free text, emails, and documents are untrusted input. Security guidance (OWASP, Huntress, academic work) describes agents that read private data, process untrusted content, and can communicate externally as the dangerous combination. [R] The MVP removes the third element: no external communication, no tool execution, text output only. Ticket content is treated as data, never as instructions.
- **Cross-client leakage.** The failure that would end an MSP's willingness to use the product. Requires permission-filtered retrieval and explicit red-team tests where a technician without access to Client B searches for Client B's facts.
- **Stale or wrong documentation presented as authority.** Mitigated by freshness display and owner-approval of changes, but not eliminated.
- **Over-trust.** Technicians may accept suggestions without reading. Track acceptance without edits on high-impact categories as a review signal, not a performance score.

### 8.3 What must be proven before any autonomy
No autonomous remediation, privileged changes, or unattended customer messages in the MVP. Before proposing any:
1. At least two quarters of production data showing high accepted-without-edit rates *and* low reopen and escalation rates for the specific action.
2. A named, narrow, reversible, low-privilege action class agreed with the customer.
3. Customer-configured allow list, per-client opt-in, and a kill switch.
4. Independent security assessment, including red-team on injection and cross-client leakage.
5. Contract language covering liability and audit access.

---

## 9. Workflows and user experience

Design principle [R]: the technician's ticket is the center. Everything else is configuration or reporting.

### 9.1 Flows

**1. MSP setup and integration (admin).**
1. Sign up; connect SSO.
2. Connect the PSA with a dedicated API user. Reldro shows the exact permissions requested and a test-connection result.
3. Connect one documentation source; choose which spaces/folders are eligible; secret objects are excluded automatically and the exclusion is shown.
4. Reldro imports 90 days of ticket history (configurable) and reports coverage: categories found, volume per category, documentation matches per category.
5. Admin reviews the readiness check (the redesigned opportunity view) and picks three to five categories.

**2. Connect and permission client accounts (admin).**
1. Clients are pulled from the PSA. Admin marks each client as included, excluded, or "do not process".
2. Admin assigns technicians to client groups (or maps PSA teams).
3. A preview shows what a chosen technician can and cannot see. It should be testable before go-live.

**3. Select the first workflow and define its boundaries (manager).**
1. Pick ticket categories from the ranked list.
2. For each: review or attach the handling guide, set required-questions list, and choose allowed suggestion types.
3. Set an escalation rule ("if X then escalate to Y").
4. Turn on for a pilot group of technicians.

**4. Technician handles a ticket.**
1. Opens the ticket in the PSA; Reldro panel shows summary, state (Grounded/Partial/No source), missing questions, cited steps, draft internal note.
2. Technician works normally. The panel updates as the ticket changes.
3. On closing, Reldro offers a resolution note for one-click approval or edit.

**5. Accept, edit, reject, escalate.**
- **Accept**: writes the internal note. **Edit**: writes the edited version and stores the diff. **Reject**: one click plus optional reason (wrong / outdated / not relevant / unsafe). **Escalate**: follows the configured rule and includes cited context.
- All four are logged. None is shown to managers by individual name in the MVP scorecard, to reduce the "being monitored" reaction [R]. Check this with technicians.

**6. Correct or update knowledge.**
1. A reject or a heavy edit creates a "proposed correction" with the ticket context.
2. The document owner reviews: apply to source system, dismiss, or mark source outdated.
3. Approved changes are re-ingested. Unapproved changes are never retrieved.

**7. Manager reviews analytics.** Weekly scorecard (section 10) with drill-down to sample tickets, assumption panel, and a data-quality banner if integrations were degraded.

**8. Integration failures and unsupported tickets.**
- Integration down: banner on panel and admin alert; suggestions labeled with data age; write-back queued or disabled with a plain message.
- Unsupported category or ticket type: panel says so and shows no suggestions, records the gap for the manager.
- Model failure: the panel shows "Assistance unavailable" and the technician continues with no blocked ticket.

### 9.2 Who sees which controls

| Control | Admin | Manager | Technician |
|---|---|---|---|
| Connect systems, SSO, retention, client "do not process" | ✓ | – | – |
| Enable categories, guides, escalation rules, allowed actions | ✓ | ✓ | – |
| Client access mapping | ✓ | view | – |
| Scorecard and audit log | ✓ | scorecard, limited log | own history |
| Suggestion panel and decisions | – | ✓ (as technician) | ✓ |
| Knowledge correction approval | ✓ | ✓ (assigned owner) | propose only |

Managers configure with forms, checklists, and a guide editor, not code or prompts. No AI training is required for technicians. The panel should be usable on day one.

---

## 10. Measurement and business case

### 10.1 Four levels, kept separate

| Level | Meaning | Example |
|---|---|---|
| Usage | Did people open it? | Panel views |
| Workflow adoption | Was it used where intended? | % of eligible tickets with a decision recorded |
| Operational outcome | Did work change in the PSA? | Time to first useful response |
| Estimated financial value | What might it be worth? | Labor hours × cost, shown as an estimate with inputs |

Only the last is a projection, and it is always labeled "estimate".

### 10.2 Pilot scorecard

| Measure | Definition | Data source | Limitations |
|---|---|---|---|
| Eligible-ticket coverage | Tickets in enabled categories that received a suggestion / all such tickets | PSA + Reldro log | Depends on correct category assignment |
| Technician decision rates | Accept / edit / reject / escalate as % of shown suggestions | Reldro | Acceptance is not correctness; can rise from over-trust |
| Weekly active technicians | Pilot technicians with ≥1 decision in a week | Reldro | Usage only |
| Time to first useful response | Ticket creation to first note or customer response that is not automated | PSA timestamps | "Useful" needs a rule (e.g., first human note); after-hours and queue rules distort |
| Time to resolution | Creation to closed | PSA | Skewed by ticket mix, waiting-on-customer time; use category-level medians |
| Touches per ticket | Human notes or actions per ticket | PSA | Depends on how technicians log work |
| Reopen rate | Tickets reopened within N days | PSA | Lags; short pilots undercount |
| Escalation rate and quality | % escalated; % of escalations needing follow-up questions | PSA | Policy changes shift it |
| Knowledge retrieval success | % of suggestions where technician marks the source helpful, or ticket closes citing a retrieved article | Reldro + PSA | Self-reported and noisy |
| Knowledge health | Docs flagged outdated / conflicting; proposed corrections approved | Reldro | Depends on owner engagement |
| CSAT, where available | Survey scores on pilot vs. comparison tickets | PSA / survey tool | Low response; skew toward extremes |
| Integration reliability | Sync success rate, write-back failures, latency | Reldro | Only the part Reldro observes |
| Labor effort or cost per ticket | Logged time per ticket × loaded rate | PSA time entries | Many MSPs under-log time; only trust if the customer says logging is reliable |
| Model cost per ticket | Inference plus processing cost | Reldro billing | Needed to know margin |

### 10.3 Financial value
Show it as `estimate = (median minutes saved on comparison-verified categories) × eligible tickets × loaded technician cost`. Each input is editable and visible. Do not call it "captured" unless a comparison design supports the minutes-saved figure. Show a confidence range and the comparison used. Default to "not enough evidence yet" when data is thin.

---

## 11. Commercial model and go-to-market

### 11.1 Pricing models compared

| Model | Pros | Cons | Fit |
|---|---|---|---|
| Platform fee + per-technician seat | Familiar to MSPs (PSA/RMM are priced per tech); predictable | Seat ceiling vs. bundled PSA AI; discourages adding techs to the pilot | Good baseline |
| Per-ticket or per-eligible-workflow volume | Tracks value and cost | Penalizes broader use; MSPs dislike metered surprise; volume swings | Poor for adoption |
| Base fee + add-ons (workflows, client count) | Room to expand | Complex; may feel like nickel-and-diming | Later, once multiple workflows exist |

Price anchors [M, low quality]:
- HaloPSA is reported at about £69 per agent per month with AI included.
- One review site says ConnectWise PSA is about $25–35 per technician per month; PSA plus RMM combined $150–200+ per technician per month.
- ConnectWise Sidekick has no published price (quote-based).
- Benchmarks such as "best-in-class about 30 minutes per ticket" and "labor is 48% of operating expenses" appear in vendor/advisor blogs and need checking against Service Leadership Index primary data.

### 11.2 Initial pricing hypothesis (needs willingness-to-pay testing) [R]
- **Paid pilot:** fixed fee, for example $3,000–$6,000 for about 8 weeks including setup, credited against year one if the MSP converts.
- **Subscription:** a platform fee plus a per-active-technician monthly price, with **no ticket metering** and a generous fair-use limit. Starting range to test: platform $300–$800 per month, technician $20–$50 per month.

Rationale: a seat price is familiar and tied to technician count, and no metering avoids penalizing usage. The range sits below what a full PSA seat costs because the buyer will compare it with "AI already in my PSA". These are guesses. Test with Gabor-Granger and Van Westendorp questions in Phase 0 interviews, then real quotes. **Unknown:** inference and support cost per tenant. Measure in the pilot; pricing cannot be finalized without it.

### 11.3 Go-to-market
- **Buyer and champion.** Owner or head of service delivery buys; service desk manager champions.
- **Sales motion.** Founder-led. Start with warm MSP networks, peer groups, and PSA/doc-vendor communities [A]. One conversation, one data-review call, one pilot agreement.
- **Pilot structure.** See 11.4.
- **Onboarding scope.** Connect PSA and docs, choose categories, review 5–10 handling guides, train managers (1 hour), technicians get a short walkthrough only.
- **Implementation burden to measure.** Hours of Reldro staff time and customer time per onboarding. Target is a steady decline across pilots [A].
- **Renewal and expansion signals.** Weekly active technicians stay stable after novelty fades; corrections continue to be approved; manager opens the scorecard unprompted; customer asks for another category or client group.
- **Path to expansion.** More categories, then more service-desk teams, then more workflows (Next tier), then a second integration.
- **Productize vs. services.** Productize: connectors, permission model, ingestion, guide editor, scorecard. Paid services during pilots: guide authoring, knowledge cleanup, category selection, custom mapping. Watch which services repeat; productize only those.

### 11.4 Paid pilot design

| Element | Design |
|---|---|
| Duration | 2 weeks setup and baseline, 6–8 weeks live |
| Baseline | 8–12 weeks of prior PSA history per enabled category, plus 2 weeks concurrent |
| Comparison | Staggered rollout: technicians or queues are split into two groups, with the second group starting later; or category-matched comparison where randomization is not feasible. Compare medians within category, adjusting for ticket priority. |
| Sample warning | 8–60 technicians and a few thousand tickets means wide uncertainty. Report intervals and direction consistency, not p-values. Extend the live period if volumes are low. |
| Customer participation | Named champion (about 2 hrs/week), a security contact for one review, technician feedback sessions (biweekly), knowledge owner for corrections |
| Success criteria (proposed starting points, agreed in writing before launch) | (1) Weekly active use by most pilot technicians by week 4; (2) at least one primary operational metric (chosen with the customer, e.g., time to first useful response or touches per ticket) improves in the comparison, with no worsening in reopen rate or CSAT; (3) zero cross-client exposure events; (4) technicians rate usefulness above a threshold set jointly; (5) the customer says it is worth paying for at a stated price |
| Renewal decision | A dated meeting: review scorecard, assumptions, and open issues; sign, extend, or end. No auto-conversion. |

I am not supplying benchmark targets such as "reduces resolution time by X%". None has been shown for this product.

---

## 12. Competitive and strategic analysis

| Alternative | What it does well | Why an MSP may prefer it | Gap that may remain | What Reldro must prove |
|---|---|---|---|---|
| **PSA/ticketing automation** (ConnectWise, Autotask, HaloPSA) | Native summarization, triage, suggested resolutions, reply drafts, already in the workflow and login [M] | Already paid for; no new vendor or security review | Multi-tool stacks; visible knowledge freshness/conflicts; independent audit; MSPs unhappy with their PSA's AI [A] | Measurably better than the PSA's own AI on the MSP's tickets, on the MSP's data |
| **RMM and vendor AI features** | Device and alert context; automation | Bundled; actions on endpoints | Weak on human procedure quality and ticket guidance [A] | Complementary value, or avoid the space |
| **General-purpose AI used by technicians** (ChatGPT, Copilot) | Flexible, cheap, familiar | Zero setup | No client isolation, no audit, no MSP procedures, data-leak risk [M, Huntress] | Show the safety and consistency gap on real tickets, and that it is worth a subscription |
| **Documentation/KB products** (IT Glue, Hudu) | System of record; added AI features such as SOP generation [M, vendor/blog] | Already hold the knowledge | They may add retrieval themselves. Ticket-time assistance and outcome measurement may not be their focus [A] | Speed and quality of the correction loop; work across doc tools |
| **Internal scripts and automation** (including Rewst-type platforms) | Precise, controlled, cheap for known tasks | Full control, no vendor | Poor at unstructured or novel tickets; requires builder time | Handle the ambiguous middle, not the automatable end |
| **Consultants / managed AI services** | Bespoke work; accountability | Human judgment | Cost, no scale, dependence | Repeatable setup with lower cost |
| **MSP-specific AI startups** (Thread, Pia, ZofiQ, others) [M] | Purpose-built for MSP desks; some already write back to PSAs | Focused product and MSP credibility | Autonomy-oriented, or intake-focused; a technician-assist knowledge loop may be less served [A] | Clear reason to add another vendor |

**Differentiation is not because it uses AI.** Every option above uses AI.

### Defensibility: possible sources vs. established moat

| Possible source | Status |
|---|---|
| Better integration into the service workflow | *Possible.* Depends on delivery surface and PSA depth. No moat until it beats PSA-native placement. |
| Customer-approved operational knowledge | *Possible.* Curated, owner-approved, cited knowledge is harder to copy than a model, but the source docs live in the customer's tools and the customer can leave. |
| Workflow configuration and audit history | *Possible.* Creates switching cost once used; does not create demand. |
| Cross-customer benchmarks | *Speculative.* Requires consent, anonymization, enough MSPs, and comparable data. Not before Phase 3. |
| Reliable outcome data | *Possible and most plausible.* A trusted, inspectable measurement of AI's effect is scarce. Only valuable if the numbers hold up under scrutiny. |
| Distribution via MSP channels/vendors | *Possible.* Marketplaces and peer groups can shorten sales cycles; dependence on a platform that competes is a risk. |

**No moat is established today.** The claim to test is that the *combination* of cited knowledge, correction loop, and inspectable outcomes is hard for a PSA vendor to prioritize.

---

## 13. Roadmap and decision gates

### Phase 0 — Discovery (weeks 1–4)
- **Hypothesis.** A meaningful share of MSPs have recurring ticket types, usable documentation, a buyer with budget, and an unmet need that PSA-native AI does not solve.
- **Deliverables.** 16–20 interviews (about 6 owners, 6 service desk managers, 5 technicians, 3 security/privacy reviewers); 8 observed ticket-handling sessions; anonymized ticket and documentation samples from 3–4 MSPs; **an offline "concierge test"**: run retrieval and suggestions over the samples and have technicians grade them blind against their own answers; willingness-to-pay data; documented objections; a technician-surface test (panel vs. side-panel vs. Teams).
- **Evidence required to proceed (Gate 1).** At least 3 MSPs agree to a paid pilot in principle; technicians grade a majority of suggestions as useful *and safe* on their own tickets (threshold agreed beforehand); documentation coverage is adequate for at least three ticket categories per MSP; a viable delivery surface exists; no disqualifying security requirement.
- **Stop or change if.** Documentation is too poor to retrieve from; buyers say "our PSA does this"; technicians reject the surface; security reviewers require SOC 2 or client-level contracts before any pilot and the timeline is unacceptable.
- **Risks.** Interview bias (friendly MSPs); paying customers say yes but not pay; sample too small.

### Phase 1 — Paid workflow pilot (weeks 5–12, overlapping)
- **Hypothesis.** One workflow, with human review, produces an observable operational improvement in real environments.
- **Deliverables.** Smallest version: one PSA connector, one doc source, client permissions, ticket panel, decision logging, correction queue, scorecard. 2–3 pilots.
- **Evidence required (Gate 2).** Section 11.4 criteria met at 2 of 3 pilots, zero security incidents, documented setup hours.
- **Stop or change if.** Technicians stop using it after week 3; metrics are flat or worse; setup takes far more effort than the value justifies; cross-client leakage occurs (stop and fix before continuing).
- **Risks.** Underpowered comparison; integration delays; novelty effect; pilot MSP not representative.

### Phase 2 — Repeatability (months 4–6)
- **Hypothesis.** A different MSP can deploy the workflow with low effort and sustained use.
- **Deliverables.** Self-serve onboarding for the chosen PSA/doc pair; productized guide templates; onboarding time tracked; 3–5 new MSPs.
- **Evidence required (Gate 3).** Setup effort declines across cohorts; weekly active use stays stable at week 8+; at least some paid conversions at the tested price; model and support costs support a positive gross margin at that price.
- **Stop or change if.** Every deployment needs custom work; usage decays; price cannot cover cost.
- **Risks.** Services dependence; support burden; PSA API changes.

### Phase 3 — Expansion (month 7+)
- **Hypothesis.** Customers who see value will adopt more categories, teams, or workflows.
- **Deliverables.** Only items justified by customer evidence: second PSA, customer-update drafts behind approval, Teams surface, added analytics.
- **Evidence required.** Expansion requests from paying customers, not from internal preference.
- **Stop or change if.** Expansion demand does not appear; a competitor's bundled feature closes the gap.

**Do not begin a broad rebuild before Gate 1.**

---

## 14. 90-day plan

| Weeks | Activity | Output | Gate |
|---|---|---|---|
| 1–2 | Recruit MSPs; run first 8 interviews; secure sample data under NDA | Interview notes; data-sharing agreements | – |
| 3–4 | Finish interviews; 8 ticket-handling observations; concierge test on exported data; WTP questions | Findings memo; graded suggestion set | **Gate 1 (end wk 4)** |
| 5–6 | Sign 2–3 paid pilots; build thin connector + panel + permission model behind a feature flag; security review with each MSP; baseline data pull | Working slice; baselines | – |
| 7–10 | Live pilot; weekly technician check-ins; fix defects; track setup hours and costs | Weekly scorecards | Mid-pilot checkpoint (wk 9) |
| 11–12 | Finish comparison; renewal meetings | Pilot reports; go/no-go on Phase 2 | **Gate 2 (end wk 12)** |

Note that a live period of about six weeks is short. Reopen and CSAT lag; extend if needed.

---

## 15. Top risks, assumptions, and disconfirming evidence

| # | Risk or assumption | What would disprove it |
|---|---|---|
| 1 | PSA-native AI is good enough for most MSPs | Interviewees say they use and like it; technicians cannot name a gap |
| 2 | Documentation is good enough to retrieve from | Concierge test shows low usefulness; owners say docs are stale or missing |
| 3 | Technicians will use it in the ticket | Usage drops after week 3; they say they prefer ChatGPT or their PSA |
| 4 | Operational metrics move | Flat or worse in the comparison |
| 5 | MSPs will pay a price that covers cost | WTP well below inference + support cost; buyers expect it bundled |
| 6 | Security can be satisfied at MSP scale | Reviewers demand certifications or contract terms Reldro cannot meet in the timeline |
| 7 | Cross-client isolation can be enforced reliably | A red-team test shows leakage |
| 8 | Prompt injection through tickets can be contained | Successful injection changes output beyond text |
| 9 | Setup effort can shrink | Each deployment needs custom mapping |
| 10 | Reldro can build fast enough | Integration work consumes the pilot window |
| 11 | The existing platform is a helpful base | Reuse turns out to be small; a separate slice is cleaner |
| 12 | Survey enthusiasm about MSP AI adoption reflects real buying | Interviewees "use AI" but do not pay for another tool |

Surveys cited in search results (for example, reports that a majority of MSPs use AI or have deployed it on the service desk) are secondary summaries, and I could not read the primary documents. Adoption of AI tools does not establish demand for a *new* vendor.

---

## 16. Positioning and homepage message

**Positioning statement (draft).** For MSP service-desk managers who need consistent ticket handling across technicians, Reldro is a technician-assist layer that finds the right approved procedure for the ticket, shows where it came from, and flags what's missing, while your PSA and documentation stay where they are. Unlike PSA-native AI, [claim to be validated: it works across your tools and shows you what changed in your own ticket data].

**Homepage message (draft, publish only what is true at launch).**
- **Headline:** Consistent answers on every ticket, from your own procedures.
- **Subhead:** Reldro shows your technicians the right approved steps, cites the source, and asks for what's missing. They review everything. Your PSA stays the system of record.
- **Three points (each must be shippable when published):**
  1. *Your knowledge, cited.* Every suggestion links to the article it came from, with its date.
  2. *Technician in control.* Accept, edit, reject, or escalate. Nothing is sent or changed without a person.
  3. *Results you can inspect.* See response times, reopens, and escalations from your PSA data, with the assumptions shown.
- **Do not include** claims of time saved, revenue, or ROI. Do not list integrations that are not live.

---

## 17. Proposed screen-by-screen change plan (before any implementation)

Principle [R]: the smallest coherent change, behind a feature flag for a new "MSP mode" organization type. Existing screens are hidden, not deleted, until the pilot decides.

### Phase 0 (no product code needed)
- An offline evaluation script and spreadsheets for the concierge test.
- A landing/interest page is optional and should not list unverified capabilities.

### Phase 1 changes

| Current route | Change |
|---|---|
| `/dashboard/overview` | Replace with **Service Desk Overview** (coverage, weekly active technicians, scorecard summary, integration health). |
| `/dashboard/assessment` | Hide. Replace with **Readiness Check** shown at setup. |
| `/dashboard/opportunities` (+ matrix) | Redesign as **Ticket Categories**: volume, repeatability, documentation coverage, impact/effort from real data. |
| `/dashboard/workflows` (+ manage) | Redesign as **Handling Guides**: owner, version, review date, client scope, category. Reuse steps and checkpoints. |
| **new** `/dashboard/tickets` and `/dashboard/tickets/[id]` | **Ticket panel** (summary, state, missing questions, cited steps, draft note, decisions). Also the embedded/side-panel version, if the delivery-surface test supports it. |
| **new** `/dashboard/knowledge` | Sources, freshness, conflicts, proposed corrections queue. |
| `/dashboard/integrations` and `/tools` | Redesign as **Connections** (real state, last sync, permissions requested, test button). Remove mock connect. Hide the tool library. |
| `/dashboard/analytics`, `/roi` | Merge into **Scorecard** (section 10), with an assumptions drawer. |
| `/dashboard/team`, `/my-team` | Keep for admin; add client-access mapping, SSO/SCIM sync. |
| `/dashboard/settings` | Add AI policy (allowed categories/actions, retention, "do not process" clients). Keep audit log. Keep invite and admin management. |
| `/dashboard/templates` | Hide (Next). |
| `/dashboard/learn`, `/rewards`, `/initiatives`, `/expert-help`, specialist routes | Hide from MSP mode. |
| AI assistant widget | Remove in MSP mode; replaced by the ticket-scoped panel. |
| `/dashboard/account` | Keep (profile, password). |

### Data-model additions (proposed)
`Client`, `TicketMirror` (minimal fields only), `KnowledgeSource`, `KnowledgeItem` and chunks with `tenant_id` + `client_id`, `Suggestion`, `SuggestionDecision`, `CorrectionProposal`, real `IntegrationConnection` state and sync log, extended audit event types. All existing content models stay untouched.

### Build order
1. Client model and permission-filtered retrieval, with cross-client red-team tests, before any UI.
2. One PSA read connector and an internal-note write-back.
3. One doc connector.
4. Ticket panel and decision logging.
5. Scorecard from PSA data.
6. Correction queue.

### Explicitly not done in this brief
No code, schema, or configuration was changed. The mock-integration behavior [V] should be labeled or disabled for any customer-facing demo regardless of this strategy, because it currently presents random "records synced" numbers.

---

## Sources

Quality notes in brackets. Vendor and affiliate blogs are directional. I could not open vendor pages directly; the vendor descriptions below are from search-result summaries of these pages.

- ConnectWise Sidekick for PSA: https://www.connectwise.com/platform/ai/sidekick-psa [vendor marketing]
- ConnectWise Sidekick overview and pricing notes: https://www.connectwise.com/platform/ai; https://superops.com/connectwise-pricing-guide [competitor blog]
- Autotask PSA AI (Datto/Kaseya): https://www.datto.com/products/autotask-psa/ai/ [vendor marketing]
- HaloPSA AI guide: https://usehalo.com/halopsa/guides/2137 [vendor documentation]; pricing: https://rallied.ai/blog/halopsa-pricing-what-msps-actually-pay/ [seller of AI tools; directional]
- MSP AI service-desk landscape: https://resolvcmd.com/blog/msp-ai-service-desk-landscape-2026/ [vendor-authored]; Thread and Pia: https://www.getthread.com/service-magic-blog/thread-x-pia-from-ai-conversation-to-fully-automated-resolution; https://pia.ai/ [vendor sites]
- MSP AI adoption reporting: https://www.channelinsider.com/ai/msp-ai-revenue-growth-2026/; https://www.kaseya.com/press-release/ai-emerges-as-the-key-to-scaling-msp-operations-as-growth-gets-harder/ [survey summaries; primary documents not read]
- MSP market size and distribution: https://www.msplaunchpad.com/blog-posts/msp-market-statistics; https://scoop.market.us/managed-services-statistics/ [secondary, low quality, estimates disagree]
- MSP profitability and pricing benchmarks: https://www.connectwise.com/resources/sli-annual-profitability-report-exec-summary [Service Leadership Index, the strongest source here for benchmarks, but only a summary was seen]; https://www.flamingo.run/blog/msp-pricing-models [vendor blog]
- Help-desk KPI definitions: https://www.connectwise.com/blog/msp-kpis; https://www.infrassist.com/blog/helpdesk-kpis/ [practitioner/vendor blogs]
- IT documentation and AI: https://rallied.ai/blog/best-it-documentation-software-msp/ [seller of AI tools]
- MSP security: https://www.cisa.gov/news-events/cybersecurity-advisories/aa22-131a [primary government source, strong]
- Prompt injection and agent risk: https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html [OWASP, strong]; https://arxiv.org/pdf/2506.01055 [preprint]; https://www.huntress.com/generative-ai-guide/data-leakage-through-ai-prompts [vendor]

### Open evidence gaps to close in Phase 0
- Primary-source figures for MSP AI adoption and service-desk economics.
- Current PSA extension capabilities and API terms for embedding a panel.
- Real documentation coverage and quality at target MSPs.
- Willingness to pay when PSA-bundled AI is a comparison.
- Whether the "AI budget line" exists at MSPs of this size.
