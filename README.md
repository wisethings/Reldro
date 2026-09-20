# Reldro

Reldro is an AI adoption platform for companies: it helps organizations assess
where they stand on AI, discover high-value opportunities, train employees on
real workflows, implement changes (with vetted specialists when needed), and
measure the resulting adoption and ROI.

The product is built around one loop — **Assess → Discover → Learn →
Implement → Measure → Optimize** — and every major screen reinforces it.

## Tech stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19** + TypeScript
- **PostgreSQL** + **Prisma** ORM
- **Tailwind CSS** for styling
- **Recharts** for charts
- Custom session auth (signed JWT cookie via `jose`, `bcryptjs` for password hashing) — no third-party auth provider
- A small model-provider abstraction (`src/lib/ai/provider.ts`) so OpenAI/Anthropic can be added later without touching feature code; the in-product "Reldro assistant" is primarily a rule-based engine that queries the org's real Prisma data (`src/lib/ai/assistant.ts`) rather than a raw LLM wrapper

## Getting started

```bash
cp .env.example .env      # then set DATABASE_URL / AUTH_SECRET
npm install
npm run db:push           # create tables from prisma/schema.prisma
npm run db:seed           # populate a realistic demo org (Northstar Consumer Group)
npm run dev
```

The app needs a running PostgreSQL instance reachable at `DATABASE_URL`. Locally:

```bash
createdb reldro
```

### Demo accounts

Seeding creates a demo password for every account: **`Demo1234!`**

| Role | Email |
| --- | --- |
| Company admin | `admin@northstarcg.com` |
| Employee | `priya.shah@northstarcg.com` |
| AI specialist | `maya@reldro-specialists.com` |
| Platform admin | `platform@reldro.com` |

The login page also has one-click "demo login" buttons for each of these.

## Architecture notes

- **Multi-tenancy**: every org-scoped table carries `organizationId`, and all
  queries filter by the session's `organizationId` (see
  `src/lib/auth/guards.ts`). No cross-tenant reads are possible through the
  UI/action layer.
- **RBAC**: four roles (`COMPANY_ADMIN`, `EMPLOYEE`, `SPECIALIST`,
  `PLATFORM_ADMIN`) are enforced via `requireRole`/`requireSession` guards in
  Server Components and Server Actions, plus route-level protection in
  `src/proxy.ts` (Next 16's replacement for `middleware.ts`).
- **Scoring models** (`src/lib/scoring.ts`): the AI Adoption Score,
  employee AI Fluency score, and opportunity prioritization/effort scores are
  transparent weighted formulas with the weights defined in one place, so they
  can be replaced with a more sophisticated model later without touching call
  sites.
- **Integrations**: modeled as a global `Integration` catalog +
  per-org `IntegrationConnection` rows. For the MVP, "connecting" an
  integration just flips a status flag and stores mock sync metadata — it's
  built so a real OAuth/sync job can populate the same tables later.
- **Billing**: `Subscription`/`Invoice`/`MarketplaceTransaction` models and UI
  exist, but no payment processor is wired up — this is intentionally left as
  a Stripe integration point.
- **AI simulations**: scored by a transparent rubric
  (`src/lib/ai/simulationEvaluator.ts`) that looks for reasoning signals in
  the employee's written response, rather than a model call — reproducible
  and explainable for a demo environment.

## Project structure

```
prisma/schema.prisma      Full data model (40 models incl. orgs, assessments,
                           workflows, opportunities, learning, marketplace,
                           projects, analytics, billing)
prisma/seed.ts             Realistic demo data for "Northstar Consumer Group"
src/app/                   Routes (marketing site, auth, onboarding wizard,
                           /dashboard/*, /platform-admin/*)
src/components/            UI kit + feature components, grouped by area
src/lib/actions/           Server Actions (mutations)
src/lib/queries/           Shared read queries
src/lib/ai/                Model-provider abstraction + rule-based assistant
src/lib/scoring.ts         Adoption/fluency/opportunity scoring formulas
src/lib/matching.ts        Specialist-matching engine
```

## Known MVP scope

Priorities followed the brief's P0/P1 list: the full core loop, marketplace,
and project workspace are implemented; integrations are UI + mock data only,
the AI assistant is rule-based rather than LLM-backed by default (a real
provider can be enabled via `AI_PROVIDER`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`
in `.env`), and payment processing is not implemented.
