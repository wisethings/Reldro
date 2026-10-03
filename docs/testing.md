# Testing and stability

## What runs automatically
`.github/workflows/ci.yml` runs on every push and pull request:

1. Type check (`npm run typecheck`)
2. Unit tests (`npm test`): who can see which reports, confidential and anonymous reporters, restricted notes, severity suggestions, photo rules
3. A production build
4. Post-deploy checks (`npm run smoke -- <url>`)
5. Browser tests (`npm run test:e2e`): every role opens every page on a phone and a desktop with no errors or sideways scrolling, the report form, the anonymous case code and follow-up, the support email link, staff two-factor sign-in, workspace seats and suspension, admin-only pages, and confidential reporter privacy

## Run them locally
```
cp .env.example .env            # set DATABASE_URL and AUTH_SECRET
npx prisma db push
ALLOW_DESTRUCTIVE_SEED=true npx tsx prisma/seed.ts
npm run build && npx next start -p 3100 &
npm test
npm run test:e2e
```
The browser tests expect the sample workspace from `prisma/seed.ts`. Set `CHROMIUM_PATH` if your Chromium is not where Playwright looks.

## After a deploy
```
npm run smoke -- https://app.reldro.com
```
`GET /api/health` reports whether the database is reachable and whether the schema is current. Point an uptime monitor (UptimeRobot, Better Stack) at it and alert on anything other than `"status":"ok"`.

## Email
`GET /api/admin/email-test?secret=SEED_SECRET&to=you@company.com` sends one real test email and says what is wrong if it fails (missing key, unverified domain, testing-mode restriction).

## Known limits
- The schema is applied by a script that runs at start-up (`src/lib/schema-sql.ts`, `src/lib/runMigration.ts`). It is idempotent and the health endpoint shows if it is behind. Proper migration files need a way to reach the Netlify database at build time, which it does not offer.
- Photos are stored in the database as small compressed images (at most 1024 px, 3 to 4 per entry). Move them to object storage before photo volume grows.
- The database goes idle when unused. `.github/workflows/keep-warm.yml` pings it during working hours only.
