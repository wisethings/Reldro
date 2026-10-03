import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { SCHEMA_SQL } from "../src/lib/schema-sql";
import { getPack } from "../src/lib/safety/pack";

/**
 * Demo data for the Frontline Safety Operations product: "Havenbrook", a
 * fictional mid-size commercial electrical contractor. Every person, report
 * and number here is invented. Running this WIPES the database's
 * organizations and users first (it is meant for demo/dev environments).
 */

const DEMO_PASSWORD = "Demo1234!";
const day = 86400_000;
const daysAgo = (n: number, hour = 9) => {
  const d = new Date(Date.now() - n * day);
  d.setHours(hour, 15, 0, 0);
  return d;
};
const daysFromNow = (n: number) => new Date(Date.now() + n * day);

/**
 * The certification catalog for a workspace, with requirements, and links existing records to it. Safe to call on a workspace
 * that already has records: it only adds the catalog and fills in details on records that match by name.
 */
export async function seedCertificationCatalog(orgId: string, crewIds: Record<string, string>, siteIds: Record<string, string>, verifierUserId: string | null) {
  const defs: { name: string; category: string; issuingBody: string; months: number | null; scope: "NONE" | "ALL" | "SELECTED"; sites?: string[]; crews?: string[]; prefix: string }[] = [
    { name: "OSHA 10", category: "Safety training", issuingBody: "OSHA", months: null, scope: "ALL", prefix: "O10" },
    { name: "First aid / CPR", category: "Medical", issuingBody: "American Red Cross", months: 24, scope: "SELECTED", sites: ["lakeshore", "riverside"], prefix: "FA" },
    { name: "Aerial lift", category: "Equipment operation", issuingBody: "Employer evaluation", months: 36, scope: "SELECTED", crews: ["Prewire Crew"], prefix: "AL" },
    { name: "Fall protection", category: "Safety training", issuingBody: "OSHA authorized trainer", months: 36, scope: "SELECTED", sites: ["lakeshore"], prefix: "FP" },
    { name: "Forklift", category: "Equipment operation", issuingBody: "Employer evaluation", months: 36, scope: "SELECTED", crews: ["Fabrication Shop"], prefix: "FK" },
    { name: "Electrical safety (NFPA 70E)", category: "Electrical", issuingBody: "NFPA", months: 36, scope: "SELECTED", crews: ["Service & Maintenance"], prefix: "E70" },
    { name: "OSHA 30", category: "Safety training", issuingBody: "OSHA", months: null, scope: "NONE", prefix: "O30" },
    { name: "Confined space", category: "Safety training", issuingBody: "OSHA authorized trainer", months: 12, scope: "NONE", prefix: "CS" },
  ];
  for (const d of defs) {
    const type = await prisma.certificationType.upsert({
      where: { organizationId_name: { organizationId: orgId, name: d.name } },
      update: {},
      create: {
        organizationId: orgId,
        name: d.name,
        category: d.category,
        issuingBody: d.issuingBody,
        validityMonths: d.months,
        requiredScope: d.scope,
        requiredSiteIds: (d.sites ?? []).map((k) => siteIds[k]).filter(Boolean),
        requiredCrewIds: (d.crews ?? []).map((k) => crewIds[k]).filter(Boolean),
      },
    });
    // Most required people already hold it; leave a realistic handful without.
    if (d.scope !== "NONE") {
      const siteSet = new Set((d.sites ?? []).map((k) => siteIds[k]));
      const crewSet = new Set((d.crews ?? []).map((k) => crewIds[k]));
      const staff = await prisma.employee.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" }, select: { id: true, siteId: true, departmentId: true } });
      const required = staff.filter((e) => d.scope === "ALL" || (e.siteId && siteSet.has(e.siteId)) || (e.departmentId && crewSet.has(e.departmentId)));
      const held = new Set((await prisma.qualification.findMany({ where: { organizationId: orgId, name: d.name }, select: { employeeId: true } })).map((r) => r.employeeId));
      for (const [i, e] of required.filter((x) => !held.has(x.id)).entries()) {
        if (i % 7 === 6) continue;
        const issued = -(120 + ((i * 53) % 500));
        await prisma.qualification.create({ data: { organizationId: orgId, employeeId: e.id, name: d.name, issuedOn: daysFromNow(issued), expiresOn: d.months ? daysFromNow(issued + d.months * 30) : null } });
      }
    }
    const records = await prisma.qualification.findMany({ where: { organizationId: orgId, name: d.name }, orderBy: { createdAt: "asc" } });
    for (const [i, r] of records.entries()) {
      await prisma.qualification.update({
        where: { id: r.id },
        data: {
          typeId: type.id,
          issuingBody: d.issuingBody,
          certificateNumber: r.certificateNumber || `${d.prefix}-${String(48200 + i * 37).padStart(6, "0")}`,
          ...(verifierUserId && i % 3 !== 2 && !r.verifiedAt ? { verifiedAt: daysAgo(30 + i * 5), verifiedById: verifierUserId } : {}),
        },
      });
    }
  }
}

async function ensureSchema() {
  // Same idempotent patch the app applies on boot, so this works against a fresh or older database.
  const statements = SCHEMA_SQL.split(";\n").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (e) {
      const m = String(e);
      if (!m.includes("42710") && !m.includes("42P07")) throw e;
    }
  }
}

async function clearDatabase() {
  // Seeding wipes every organization and user. Never do that to a database that holds a real customer workspace.
  const real = await prisma.organization.count({ where: { isDemo: false } });
  if (real > 0 && process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error(
      `Refusing to seed: this database has ${real} workspace${real === 1 ? "" : "s"} not marked as sample data. ` +
        `Seeding deletes all organizations and users. If this is a throwaway database, set ALLOW_DESTRUCTIVE_SEED=true and run again.`
    );
  }
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Organization", "User" RESTART IDENTITY CASCADE`);
}

/** Same formula as src/lib/safety/followUp.ts (that module is server-only, so the seed can't import it). */
function followUpHash(code: string) {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return crypto.createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:followup:${normalized}`).digest("hex");
}
export const DEMO_FOLLOW_UP_CODE = "PLAY-SAFE-2026";

type Person = { key: string; name: string; email: string; title: string; crew: string; site: string | null; supervisor?: boolean; safetyLead?: boolean };

const PEOPLE: Person[] = [
  { key: "maria", name: "Maria Delgado", email: "maria.delgado@havenbrook.com", title: "Safety Manager", crew: "Office", site: "shop", safetyLead: true },
  { key: "kevin", name: "Kevin Park", email: "kevin.park@havenbrook.com", title: "Site Safety Coordinator", crew: "Office", site: "lakeshore", safetyLead: true },
  { key: "tom", name: "Tom Brennan", email: "tom.brennan@havenbrook.com", title: "General Foreman", crew: "Prewire Crew", site: "riverside", supervisor: true },
  { key: "danielle", name: "Danielle Okafor", email: "danielle.okafor@havenbrook.com", title: "Foreman", crew: "Service & Maintenance", site: "lakeshore", supervisor: true },
  { key: "luis", name: "Luis Ortega", email: "luis.ortega@havenbrook.com", title: "Shop Supervisor", crew: "Fabrication Shop", site: "shop", supervisor: true },
  { key: "priya", name: "Priya Shah", email: "priya.shah@havenbrook.com", title: "Journeyman Electrician", crew: "Prewire Crew", site: "riverside" },
  { key: "marcus", name: "Marcus Bennett", email: "marcus.bennett@havenbrook.com", title: "Journeyman Electrician", crew: "Prewire Crew", site: "riverside" },
  { key: "sofia", name: "Sofia Rossi", email: "sofia.rossi@havenbrook.com", title: "Apprentice Electrician", crew: "Prewire Crew", site: "riverside" },
  { key: "james", name: "James Coleman", email: "james.coleman@havenbrook.com", title: "Journeyman Electrician", crew: "Prewire Crew", site: "riverside" },
  { key: "wei", name: "Wei Zhang", email: "wei.zhang@havenbrook.com", title: "Electrician", crew: "Service & Maintenance", site: "lakeshore" },
  { key: "isabella", name: "Isabella Ferreira", email: "isabella.ferreira@havenbrook.com", title: "Apprentice Electrician", crew: "Service & Maintenance", site: "lakeshore" },
  { key: "noah", name: "Noah Park", email: "noah.park@havenbrook.com", title: "Journeyman Electrician", crew: "Service & Maintenance", site: "lakeshore" },
  { key: "fatima", name: "Fatima Haddad", email: "fatima.haddad@havenbrook.com", title: "Fire Alarm Technician", crew: "Service & Maintenance", site: "lakeshore" },
  { key: "liam", name: "Liam O'Brien", email: "liam.obrien@havenbrook.com", title: "Fabricator", crew: "Fabrication Shop", site: "shop" },
  { key: "aiko", name: "Aiko Tanaka", email: "aiko.tanaka@havenbrook.com", title: "Fabricator", crew: "Fabrication Shop", site: "shop" },
  { key: "daniel", name: "Daniel Silva", email: "daniel.silva@havenbrook.com", title: "Warehouse Lead", crew: "Fabrication Shop", site: "shop" },
  { key: "grace", name: "Grace Murphy", email: "grace.murphy@havenbrook.com", title: "Electrician", crew: "Prewire Crew", site: "northgate" },
  { key: "mateo", name: "Mateo Alvarez", email: "mateo.alvarez@havenbrook.com", title: "Apprentice Electrician", crew: "Prewire Crew", site: "northgate" },
];

export async function seedDatabase() {
  console.log("Preparing schema…");
  await ensureSchema();
  console.log("Clearing organizations and users…");
  await clearDatabase();
  const pack = getPack();
  const hash = await hashPassword(DEMO_PASSWORD);

  await prisma.user.create({ data: { email: "platform@reldro.com", name: "Reldro Platform Team", passwordHash: hash, role: "PLATFORM_ADMIN" } });

  const org = await prisma.organization.create({
    data: {
      name: "Havenbrook Electrical",
      industry: "Commercial electrical contracting",
      size: "62",
      revenueRange: "$10M-$50M",
      geography: "Chicago metro and Northern Indiana",
      businessModel: "Design-build and bid-build electrical contractor",
      goals: [],
      onboardingDone: true,
      onboardingStep: 1,
      isDemo: true,
      emergencyInstructions: "Call 911 first, then the site superintendent (fictional line 555-0142). Muster at the north gate. Do not move an injured person unless they are in immediate danger.",
    },
  });
  await prisma.user.create({ data: { email: "admin@havenbrook.com", name: "Jordan Cole", passwordHash: hash, role: "COMPANY_ADMIN", organizationId: org.id, lastLoginAt: daysAgo(0) } });

  const crewNames = ["Prewire Crew", "Service & Maintenance", "Fabrication Shop", "Office"];
  const crews = Object.fromEntries(await Promise.all(crewNames.map(async (name) => [name, await prisma.department.create({ data: { organizationId: org.id, name } })])));

  const siteDefs = [
    { key: "riverside", name: "Riverside Medical Center, Level 3 buildout", address: "1200 River Rd, Chicago IL", kind: "JOBSITE" },
    { key: "lakeshore", name: "Lakeshore Tower retrofit", address: "455 N Lake Shore Dr, Chicago IL", kind: "JOBSITE" },
    { key: "shop", name: "Havenbrook fabrication shop", address: "88 Industrial Way, Gary IN", kind: "SHOP" },
    { key: "northgate", name: "Northgate distribution center fit-out", address: "9100 Northgate Pkwy, Hammond IN", kind: "JOBSITE" },
  ];
  const sites: Record<string, string> = {};
  for (const s of siteDefs) sites[s.key] = (await prisma.site.create({ data: { organizationId: org.id, name: s.name, address: s.address, kind: s.kind } })).id;

  const emp: Record<string, string> = {};
  const userOf: Record<string, string> = {};
  for (const p of PEOPLE) {
    const u = await prisma.user.create({ data: { email: p.email, name: p.name, passwordHash: hash, role: "EMPLOYEE", organizationId: org.id, lastLoginAt: daysAgo(1) } });
    const e = await prisma.employee.create({
      data: { userId: u.id, organizationId: org.id, departmentId: crews[p.crew].id, jobTitle: p.title, siteId: p.site ? sites[p.site] : null, isDepartmentAdmin: Boolean(p.supervisor), isSafetyLead: Boolean(p.safetyLead), hireDate: daysAgo(200 + Math.floor(Math.random() * 900)) },
    });
    emp[p.key] = e.id;
    userOf[p.key] = u.id;
  }
  // Two newly invited people who have not logged in yet.
  for (const p of [{ name: "Ryan Kowalski", email: "ryan.kowalski@havenbrook.com", title: "Apprentice Electrician" }]) {
    const u = await prisma.user.create({ data: { email: p.email, name: p.name, passwordHash: hash, role: "EMPLOYEE", organizationId: org.id } });
    await prisma.employee.create({ data: { userId: u.id, organizationId: org.id, departmentId: crews["Prewire Crew"].id, jobTitle: p.title, siteId: sites.riverside } });
  }

  await prisma.site.update({ where: { id: sites.riverside }, data: { safetyLeadId: emp.maria } });
  await prisma.site.update({ where: { id: sites.lakeshore }, data: { safetyLeadId: emp.kevin } });
  await prisma.site.update({ where: { id: sites.shop }, data: { safetyLeadId: emp.maria } });
  // Northgate deliberately has no safety lead yet: reports there show up as unassigned.

  await prisma.escalationRule.createMany({
    data: [
      { organizationId: org.id, minSeverity: "CRITICAL", respondWithinHours: 1, escalateToId: emp.kevin, ownerId: emp.maria, openIncident: true },
      { organizationId: org.id, minSeverity: "HIGH", respondWithinHours: 4, escalateToId: emp.maria },
      { organizationId: org.id, minSeverity: "MEDIUM", category: "ELECTRICAL", respondWithinHours: 12, escalateToId: emp.maria },
      { organizationId: org.id, minSeverity: "LOW", respondWithinHours: 48, escalateToId: emp.maria },
    ],
  });

  // ---- Reports ----------------------------------------------------------
  type R = {
    n: number; type: string; category: string; severity: string; title: string; description: string; site: string; ago: number; by: string | null;
    owner?: string | null; status: string; privacy?: string; injury?: boolean; immediate?: string; acked?: boolean; ai?: boolean;
  };
  const reports: R[] = [
    { n: 1, type: "NEAR_MISS", category: "LADDERS_LIFTS", severity: "HIGH", title: "Stepladder slipped on wet floor while pulling wire", description: "Pulling MC cable at the ceiling in corridor 3B. The floor had been mopped and the stepladder feet slid about a foot. I grabbed the door frame and didn't fall. Nobody was hurt.", site: "riverside", ago: 6, by: "sofia", owner: "maria", status: "INVESTIGATING", acked: true, immediate: "Stopped work in the corridor, moved to a platform ladder." },
    { n: 2, type: "HAZARD", category: "FALLS", severity: "CRITICAL", title: "Unprotected floor opening at level 3 shaft", description: "The temporary cover over the shaft opening near grid C4 was missing this morning. It looks like another trade moved it. Opening is about 3 feet by 4 feet.", site: "riverside", ago: 41, by: "priya", owner: "maria", status: "CLOSED", acked: true, immediate: "Barricaded with tape and posted a person until the cover was replaced." },
    { n: 3, type: "INJURY", category: "TOOLS", severity: "MEDIUM", title: "Cut hand on conduit bender edge", description: "Deburring 1-1/2 inch EMT at the bender station. Hand slipped on a sharp edge, 2 inch cut on my left palm. Cleaned it and put on a bandage from the shop kit, went to urgent care for stitches.", site: "shop", ago: 25, by: "liam", owner: "maria", status: "CLOSED", injury: true, acked: true },
    { n: 4, type: "EQUIPMENT", category: "ELECTRICAL", severity: "HIGH", title: "Frayed extension cord and no GFCI on temporary power", description: "Extension cord powering the drills on the north side has a frayed jacket near the plug and the temporary panel doesn't have a GFCI on that circuit.", site: "lakeshore", ago: 3, by: "wei", owner: "kevin", status: "ACTIONS_OPEN", acked: true, immediate: "Tagged the cord out and swapped for a new one." },
    { n: 5, type: "CONCERN", category: "ENVIRONMENT", severity: "LOW", title: "No shade or water station on the roof today", description: "It's hot on the roof staging area. We have a couple of water jugs but no shaded spot to take a break. A few of us are getting headaches by afternoon.", site: "lakeshore", ago: 2, by: "isabella", owner: "kevin", status: "ASSIGNED", acked: false },
    { n: 6, type: "NEAR_MISS", category: "STRUCK_BY", severity: "MEDIUM", title: "Tool dropped from scaffold landing near walkway", description: "A drill fell about 12 feet from the second scaffold level and landed a few feet from where two of us were working. No tool lanyard was in use.", site: "riverside", ago: 12, by: "marcus", owner: "maria", status: "ACTIONS_OPEN", acked: true },
    { n: 7, type: "HAZARD", category: "ELECTRICAL", severity: "HIGH", title: "Lockout tags missing on panel LP-3", description: "Panel LP-3 was being worked on but there were no lockout tags or locks on the main breaker when I walked past. I don't know if it was energized.", site: "riverside", ago: 9, by: "priya", owner: "maria", status: "INVESTIGATING", privacy: "CONFIDENTIAL", acked: true },
    { n: 8, type: "CONCERN", category: "FALLS", severity: "MEDIUM", title: "Feeling pushed to skip setting up fall protection to hit schedule", description: "We were told the harness setup was slowing us down and to just be careful for the short tasks near the edge. I don't feel comfortable but I don't want to say who.", site: "lakeshore", ago: 15, by: null, owner: "kevin", status: "ACTIONS_OPEN", privacy: "ANONYMOUS", acked: true },
    { n: 9, type: "HAZARD", category: "HOUSEKEEPING", severity: "MEDIUM", title: "Cords and scrap across the main walkway", description: "Extension cords and cut conduit scraps are across the main walkway on level 5. Someone is going to trip.", site: "lakeshore", ago: 20, by: "noah", owner: "kevin", status: "CLOSED", acked: true },
    { n: 10, type: "HAZARD", category: "HOUSEKEEPING", severity: "MEDIUM", title: "Debris and cords blocking egress route again", description: "Same issue as last month. The stair landing on level 4 is stacked with boxes and cords.", site: "lakeshore", ago: 10, by: "danielle", owner: "kevin", status: "ACTIONS_OPEN", acked: true },
    { n: 11, type: "NEAR_MISS", category: "HOUSEKEEPING", severity: "LOW", title: "Tripped over cord but caught myself", description: "Caught my foot on a cord in the corridor on level 5 and stumbled. Didn't fall.", site: "lakeshore", ago: 5, by: "fatima", owner: "kevin", status: "ASSIGNED", acked: true },
    { n: 12, type: "NEAR_MISS", category: "FALLS", severity: "MEDIUM", title: "Almost stepped into uncovered floor sleeve", description: "A core-drilled sleeve near the corridor wall was uncovered. I almost stepped in it carrying conduit.", site: "riverside", ago: 18, by: "james", owner: "maria", status: "CLOSED", acked: true },
    { n: 13, type: "HAZARD", category: "PPE", severity: "MEDIUM", title: "No safety glasses available for new hires at the trailer", description: "The PPE cabinet at the trailer has no safety glasses left. The new apprentices are using their own sunglasses.", site: "northgate", ago: 4, by: "mateo", owner: null, status: "NEW", acked: false },
    { n: 14, type: "EQUIPMENT", category: "TOOLS", severity: "MEDIUM", title: "Bandsaw guard missing in fab shop", description: "The blade guard on the horizontal bandsaw is off and lying next to the saw.", site: "shop", ago: 8, by: "aiko", owner: "maria", status: "ACTIONS_OPEN", acked: true },
    { n: 15, type: "HAZARD", category: "CHEMICALS_DUST", severity: "HIGH", title: "Cutting concrete dry with no dust control", description: "Another trade was dry-cutting concrete for a penetration near our work area with no water and no respirators. Lots of dust in the air.", site: "northgate", ago: 1, by: "grace", owner: null, status: "NEW", acked: false, ai: true },
    { n: 16, type: "NEAR_MISS", category: "VEHICLES", severity: "MEDIUM", title: "Van backed toward laydown area without a spotter", description: "A van backed up toward the material laydown while two people were unloading and nobody was spotting.", site: "shop", ago: 30, by: "daniel", owner: "maria", status: "CLOSED", acked: true },
  ];
  const created: Record<number, string> = {};
  for (const r of reports) {
    const createdAt = daysAgo(r.ago, 8 + (r.n % 8));
    const routedOwner = r.owner ? emp[r.owner] : null;
    const rule = await prisma.escalationRule.findFirst({ where: { organizationId: org.id, minSeverity: r.severity } });
    const respondHours = rule?.respondWithinHours ?? (r.severity === "LOW" ? 48 : r.severity === "MEDIUM" ? 48 : 4);
    const rep = await prisma.safetyReport.create({
      data: {
        organizationId: org.id, number: r.n, type: r.type, category: r.category, severity: r.severity, title: r.title, description: r.description,
        siteId: sites[r.site], occurredAt: createdAt, status: r.status, privacy: r.privacy ?? "NAMED", injuryInvolved: Boolean(r.injury), immediateAction: r.immediate ?? "",
        reporterId: r.by && r.privacy !== "ANONYMOUS" ? emp[r.by] : null, ownerId: routedOwner, respondBy: new Date(createdAt.getTime() + respondHours * 3600_000),
        acknowledgedAt: r.acked ? new Date(createdAt.getTime() + 2 * 3600_000) : null, aiAssisted: Boolean(r.ai), closedAt: r.status === "CLOSED" ? new Date(createdAt.getTime() + 12 * day) : null, createdAt,
      },
    });
    created[r.n] = rep.id;
    const ev = [
      { type: "CREATED", message: r.privacy === "ANONYMOUS" ? "Report submitted without a name." : "Report submitted.", actorName: r.privacy === "NAMED" && r.by ? PEOPLE.find((p) => p.key === r.by)?.name ?? "" : "", at: createdAt },
      { type: "ASSIGNED", message: routedOwner ? `Assigned to ${PEOPLE.find((p) => emp[p.key] === routedOwner)?.name} as the site's safety lead.` : "No owner matched. Waiting for the safety team to assign an owner.", actorName: "", at: new Date(createdAt.getTime() + 1000) },
    ];
    if (r.acked) ev.push({ type: "ACKNOWLEDGED", message: "Report acknowledged.", actorName: PEOPLE.find((p) => emp[p.key] === routedOwner)?.name ?? "", at: new Date(createdAt.getTime() + 2 * 3600_000) });
    if (r.ai) ev.push({ type: "AI_DRAFT", message: "The reporter used an AI draft and reviewed the details before submitting.", actorName: "", at: new Date(createdAt.getTime() + 2000) });
    await prisma.reportEvent.createMany({ data: ev.map((e) => ({ reportId: rep.id, type: e.type, message: e.message, actorName: e.actorName, createdAt: e.at })) });
  }

  // ---- Investigations ----------------------------------------------------
  const inv1 = await prisma.investigation.create({
    data: {
      reportId: created[1], organizationId: org.id, leadId: emp.maria, status: "OPEN", openedAt: daysAgo(5),
      facts: "Corridor 3B was mopped at about 7:30. Ladder is a 6 ft fiberglass stepladder with rubber feet, feet look worn. No wet-floor sign was up at the corridor entry.",
      sequenceNotes: "Cleaning crew mopped the corridor before the shift. Electrician set up the stepladder near the door frame and began pulling MC cable. Ladder feet slid; electrician grabbed the frame.",
      contributingFactors: ["Site layout, access or housekeeping", "Coordination with other trades"],
    },
  });
  await prisma.investigationQuestion.createMany({
    data: [
      { investigationId: inv1.id, text: "When did the cleaning crew finish and who told the electricians?", answer: "Cleaning finished around 7:30 per the crew lead. No message went to our foreman.", aiDrafted: false },
      { investigationId: inv1.id, text: "When were the ladder feet last inspected?", answer: "", aiDrafted: true },
      { investigationId: inv1.id, text: "Was a platform ladder available for this task?", answer: "", aiDrafted: true },
    ],
  });
  await prisma.investigationStatement.create({ data: { investigationId: inv1.id, providedBy: "Apprentice electrician (reporter)", content: "I didn't see the floor was wet until I was up the ladder. The floor looked dry from the door.", addedByName: "Maria Delgado" } });

  const inv3 = await prisma.investigation.create({
    data: {
      reportId: created[3], organizationId: org.id, leadId: emp.maria, status: "COMPLETE", openedAt: daysAgo(24), completedAt: daysAgo(14),
      facts: "Burr on cut EMT end was sharp. The deburring tool was worn and a cut-resistant glove was available but not required at the bender station.",
      sequenceNotes: "Fabricator cut 1-1/2 in EMT, then deburred by hand with a worn reamer. Hand contacted the burr while turning the piece.",
      contributingFactors: ["Equipment condition or availability", "PPE availability or suitability", "Procedure missing, unclear or not followed in practice"],
      rootCauseNotes: "The station had no defined deburring step, the reamer was past its useful life, and cut-resistant gloves weren't part of the station's PPE requirements. The fix is to standardize the step and equipment at the station.",
      lessonText: "Deburr every cut end with a sharp tool before handling, and replace worn deburring tools. Cut-resistant gloves are now required at bending and cutting stations.",
      shareLesson: true,
    },
  });
  await prisma.investigationStatement.create({ data: { investigationId: inv3.id, providedBy: "Fabricator (injured worker)", content: "It happened fast when I was turning the piece. I didn't think to grab gloves.", addedByName: "Maria Delgado" } });
  await prisma.investigation.create({ data: { reportId: created[7], organizationId: org.id, leadId: emp.maria, status: "IN_REVIEW", openedAt: daysAgo(8), facts: "Lockout was performed on the breaker but tags fell off; the lock remained. Electrician verified de-energized before starting.", contributingFactors: ["Procedure missing, unclear or not followed in practice"] } });

  // ---- Corrective actions ------------------------------------------------
  type A = { n: number; report?: number; title: string; description?: string; priority: string; status: string; owner?: string; due: number; proposedBy?: string; note?: string };
  const actions: A[] = [
    { n: 1, report: 2, title: "Replace shaft cover with a bolted, marked cover", priority: "CRITICAL", status: "VERIFIED", owner: "tom", due: -35, note: "Installed a plywood cover screwed to the deck and marked with warning paint." },
    { n: 2, report: 3, title: "Replace worn deburring tools and standardize deburr step at bender station", priority: "MEDIUM", status: "VERIFIED", owner: "luis", due: -15, note: "New reamers issued and the step added to the station card." },
    { n: 3, report: 3, title: "Require cut-resistant gloves at cutting and bending stations", priority: "MEDIUM", status: "COMPLETED", owner: "luis", due: -5, note: "Glove dispenser installed at the station; signage posted." },
    { n: 4, report: 1, title: "Add wet-floor coordination with cleaning crew to the daily huddle", priority: "HIGH", status: "IN_PROGRESS", owner: "tom", due: 3 },
    { n: 5, report: 1, title: "Inspect and replace worn ladder feet across the Riverside fleet", priority: "HIGH", status: "APPROVED", owner: "tom", due: -4 },
    { n: 6, report: 4, title: "Install GFCI protection on all temporary power circuits", priority: "HIGH", status: "IN_PROGRESS", owner: "danielle", due: 2 },
    { n: 7, report: 6, title: "Require tool lanyards above 6 feet and post at scaffold access", priority: "MEDIUM", status: "APPROVED", owner: "tom", due: 9 },
    { n: 8, report: 8, title: "Reinforce that fall protection is never skipped for schedule, in a talk with all foremen", priority: "HIGH", status: "PROPOSED", owner: "kevin", due: 7, proposedBy: "kevin" },
    { n: 9, report: 10, title: "Assign a daily housekeeping walk on level 4 and 5 and remove stacked material from the stair landing", priority: "MEDIUM", status: "APPROVED", owner: "danielle", due: -6 },
    { n: 10, report: 14, title: "Reinstall bandsaw guard and tag out saw until inspected", priority: "HIGH", status: "IN_PROGRESS", owner: "luis", due: -1 },
    { n: 11, title: "Restock safety glasses at Northgate trailer", priority: "MEDIUM", status: "PROPOSED", owner: undefined, due: 5, proposedBy: "grace" },
  ];
  for (const a of actions) {
    const owner = a.owner ? emp[a.owner] : null;
    await prisma.correctiveAction.create({
      data: {
        organizationId: org.id, number: a.n, reportId: a.report ? created[a.report] : null, title: a.title, description: a.description ?? "", priority: a.priority, status: a.status,
        ownerId: owner, dueDate: daysFromNow(a.due), proposedById: a.proposedBy ? emp[a.proposedBy] : emp.maria, approvedById: a.status === "PROPOSED" ? null : emp.maria, approvedAt: a.status === "PROPOSED" ? null : daysAgo(20),
        completionNotes: a.note ?? "", completedAt: ["COMPLETED", "VERIFIED"].includes(a.status) ? daysAgo(10) : null, verifiedById: a.status === "VERIFIED" ? emp.maria : null, verifiedAt: a.status === "VERIFIED" ? daysAgo(8) : null,
        createdAt: daysAgo(Math.max(1, 30 - a.n)),
      },
    });
  }

  // ---- Incident responses (sample) -----------------------------------------
  // Everything except the two newest reports has had its seriousness confirmed by a responder.
  await prisma.safetyReport.updateMany({ where: { organizationId: org.id, number: { notIn: [15, 16] } }, data: { severityConfirmedAt: daysAgo(1), severityConfirmedById: emp.maria } });

  // A resolved response that a rule opened automatically (report 2: the unprotected shaft opening).
  const rep2 = await prisma.safetyReport.findUniqueOrThrow({ where: { id: created[2] } });
  const inc2 = await prisma.incidentResponse.create({
    data: {
      organizationId: org.id, reportId: rep2.id, status: "RESOLVED", leadId: emp.maria, openedBy: "RULE", openedAt: rep2.createdAt, resolvedAt: daysAgo(38),
      summary: "Temporary shaft cover was missing at grid C4. The opening was barricaded and watched until a fixed cover went in.",
      closeoutSummary: "The shaft opening was found uncovered on the morning shift, barricaded within minutes and watched until a bolted cover was installed the same afternoon. Nobody was hurt. The crew lead confirmed with the other trades who had moved the cover. A permanent action (a bolted, painted cover) was created and later verified. Level 3 covers are now checked in the daily huddle.",
    },
  });
  await prisma.incidentResponder.create({ data: { incidentId: inc2.id, employeeId: emp.kevin, role: "Alerted by rule" } });
  await prisma.reportEvent.createMany({
    data: [
      { reportId: rep2.id, type: "INCIDENT", message: "Incident workspace opened automatically by an escalation rule (Life-threatening suggested). Severity is still a suggestion until a responder confirms it.", createdAt: new Date(rep2.createdAt.getTime() + 2000) },
      { reportId: rep2.id, type: "DECISION", message: "Keep level 3 shaft area closed to all trades until a fixed cover is in.", actorName: "Maria Delgado", actorId: emp.maria, createdAt: new Date(rep2.createdAt.getTime() + 25 * 60_000) },
      { reportId: rep2.id, type: "UPDATE", message: "Barricade and spotter in place. Superintendent has told the other trades.", actorName: "Tom Brennan", actorId: emp.tom, createdAt: new Date(rep2.createdAt.getTime() + 50 * 60_000) },
      { reportId: rep2.id, type: "INCIDENT", message: "Incident response resolved. No corrective actions are open.", actorName: "Maria Delgado", actorId: emp.maria, createdAt: daysAgo(38) },
    ],
  });

  // An active response opened by hand: report 17, a fall from a scaffold with a clinic visit.
  const c17 = daysAgo(1, 7);
  const rep17 = await prisma.safetyReport.create({
    data: {
      organizationId: org.id, number: 17, type: "INJURY", category: "LADDERS_LIFTS", severity: "HIGH", title: "Worker fell about 6 feet from scaffold access ladder",
      description: "Coming down the access ladder on the east scaffold, my foot missed the rung and I fell about six feet to the slab. I was helped up and my ankle hurts. A foreman drove me to the clinic.",
      siteId: sites.lakeshore, locationNote: "East scaffold, level 2 access", occurredAt: c17, status: "ASSIGNED", privacy: "CONFIDENTIAL", injuryInvolved: true,
      immediateAction: "Work stopped at the east scaffold. Area barricaded.", reporterId: emp.fatima, ownerId: emp.kevin, respondBy: new Date(c17.getTime() + 4 * 3600_000), acknowledgedAt: new Date(c17.getTime() + 20 * 60_000),
      severityConfirmedAt: new Date(c17.getTime() + 90 * 60_000), severityConfirmedById: emp.maria, createdAt: c17,
    },
  });
  const at = (min: number) => new Date(c17.getTime() + min * 60_000);
  const inc17 = await prisma.incidentResponse.create({
    data: {
      organizationId: org.id, reportId: rep17.id, status: "ACTIVE", leadId: emp.kevin, openedBy: "MANUAL", openedById: emp.maria, openedAt: at(45),
      summary: "One worker was hurt in a fall from the east scaffold access ladder and was taken to a clinic by a foreman. The scaffold bay is barricaded. The other trades on level 2 have been told.",
      nextAction: "Have a competent person inspect the east scaffold and the access ladder before anyone uses them again.", nextActionDueAt: new Date(Date.now() + 5 * 3600_000),
    },
  });
  await prisma.incidentResponder.createMany({ data: [{ incidentId: inc17.id, employeeId: emp.danielle, role: "Supervisor" }, { incidentId: inc17.id, employeeId: emp.maria, role: "Safety" }] });
  await prisma.reportEvent.createMany({
    data: [
      { reportId: rep17.id, type: "CREATED", message: "Report submitted. The reporter's name is shared with the safety team only.", createdAt: c17 },
      { reportId: rep17.id, type: "ASSIGNED", message: "Assigned to Kevin Park as the site's safety lead.", createdAt: at(0.5) },
      { reportId: rep17.id, type: "ACKNOWLEDGED", message: "Report acknowledged.", actorName: "Kevin Park", actorId: emp.kevin, createdAt: at(20) },
      { reportId: rep17.id, type: "INCIDENT", message: "Incident workspace opened: Injury, scaffold, other trades affected.", actorName: "Maria Delgado", actorId: emp.maria, createdAt: at(45) },
      { reportId: rep17.id, type: "INCIDENT", message: "Sample workspace: no email is sent.", createdAt: at(46) },
      { reportId: rep17.id, type: "UPDATE", message: "East scaffold barricaded and tagged out. Level 2 crews told to use the west stair.", actorName: "Danielle Okafor", actorId: emp.danielle, createdAt: at(60) },
      { reportId: rep17.id, type: "DECISION", message: "The east scaffold stays closed until a competent person has inspected it and the access ladder.", actorName: "Kevin Park", actorId: emp.kevin, createdAt: at(75) },
      { reportId: rep17.id, type: "COMMENT", message: "Clinic visit details and any work restrictions are recorded by HR. Keep out of the shared timeline.", actorName: "Maria Delgado", actorId: emp.maria, restricted: true, createdAt: at(100) },
      { reportId: rep17.id, type: "MESSAGE_TO_REPORTER", message: "Thanks for reporting this. Kevin is leading the follow-up. Is there anything about the ladder or the scaffold that you noticed before the fall?", actorName: "Kevin Park", actorId: emp.kevin, toReporter: true, createdAt: at(120) },
      { reportId: rep17.id, type: "STATUS", message: "Severity confirmed as Serious.", actorName: "Maria Delgado", actorId: emp.maria, createdAt: at(90) },
    ],
  });
  await prisma.correctiveAction.create({
    data: { organizationId: org.id, number: 12, reportId: rep17.id, title: "Inspect east scaffold and access ladder before reuse; replace worn rungs or ladder", priority: "HIGH", status: "IN_PROGRESS", ownerId: emp.danielle, dueDate: daysFromNow(1), proposedById: emp.kevin, approvedById: emp.maria, approvedAt: at(80), createdAt: at(80) },
  });

  // An anonymous report with a private case code and a reply from the safety team.
  const c18 = daysAgo(3, 14);
  const rep18 = await prisma.safetyReport.create({
    data: {
      organizationId: org.id, number: 18, type: "CONCERN", category: "PPE", severity: "MEDIUM", title: "Crew told to skip lockout on small panel jobs",
      description: "On the smaller panel jobs the foreman has said we can skip the lock and tags if it's quick. A few of us aren't comfortable with that.",
      siteId: sites.northgate, occurredAt: c18, status: "NEW", privacy: "ANONYMOUS", reporterId: null, ownerId: null, respondBy: new Date(c18.getTime() + 48 * 3600_000),
      followUpHash: followUpHash(DEMO_FOLLOW_UP_CODE), createdAt: c18,
    },
  });
  await prisma.reportEvent.createMany({
    data: [
      { reportId: rep18.id, type: "CREATED", message: "Report submitted without a name.", createdAt: c18 },
      { reportId: rep18.id, type: "ASSIGNED", message: "No owner matched. Waiting for the safety team to assign an owner.", createdAt: new Date(c18.getTime() + 1000) },
      { reportId: rep18.id, type: "MESSAGE_TO_REPORTER", message: "Thank you for raising this. Lockout is required on all panel work, whatever the size. Can you tell us roughly how often this has been said, and on which type of job?", actorName: "Maria Delgado", actorId: emp.maria, toReporter: true, createdAt: daysAgo(2, 9) },
    ],
  });

  // ---- Inspections -------------------------------------------------------
  const tpls: Record<string, string> = {};
  for (const t of pack.inspectionTemplates) {
    tpls[t.kind] = (await prisma.inspectionTemplate.create({ data: { organizationId: org.id, name: t.name, kind: t.kind, frequencyDays: t.frequencyDays, items: t.items.map((it, i) => ({ id: `i${i + 1}`, label: it.label, critical: Boolean(it.critical) })) } })).id;
  }
  const tplItems = pack.inspectionTemplates[0].items.map((it, i) => ({ itemId: `i${i + 1}`, label: it.label, critical: Boolean(it.critical) }));
  await prisma.inspection.create({
    data: {
      organizationId: org.id, templateId: tpls.SITE_INSPECTION, siteId: sites.riverside, assigneeId: emp.tom, dueDate: daysAgo(7), status: "COMPLETED", completedById: emp.tom, completedAt: daysAgo(7),
      results: tplItems.map((it, i) => ({ ...it, result: i === 1 ? "FAIL" : "PASS", note: i === 1 ? "Level 3 shaft edge needs a second toe board." : "" })),
    },
  });
  await prisma.inspection.create({ data: { organizationId: org.id, templateId: tpls.SITE_INSPECTION, siteId: sites.riverside, assigneeId: emp.tom, dueDate: daysFromNow(0) } });
  await prisma.inspection.create({ data: { organizationId: org.id, templateId: tpls.SITE_INSPECTION, siteId: sites.lakeshore, assigneeId: emp.danielle, dueDate: daysAgo(2) } });
  await prisma.inspection.create({ data: { organizationId: org.id, templateId: tpls.READINESS, siteId: sites.northgate, assigneeId: emp.maria, dueDate: daysFromNow(3) } });
  await prisma.inspection.create({ data: { organizationId: org.id, templateId: tpls.SITE_INSPECTION, siteId: sites.shop, assigneeId: emp.luis, dueDate: daysFromNow(5) } });

  // ---- Toolbox talks and acknowledgements -------------------------------
  const talks = [
    { title: "Ladder setup and inspection", topic: "Ladders", scheduledFor: daysAgo(3), siteId: null as string | null, ai: false, content: "Why it matters\nLadder incidents are among our most frequent near misses.\n\nKey points\n• Inspect feet, rails and rungs before every use.\n• Set the base one foot out for every four feet of height.\n• Check the floor: no wet or slick surfaces.\n• Three points of contact at all times.\n\nDiscussion\n• What ladders on our site have worn feet?\n• Where is a platform ladder a better choice?" },
    { title: "Heat illness: water, rest and shade", topic: "Heat", scheduledFor: daysAgo(1), siteId: sites.lakeshore, ai: true, content: "Why it matters\nHot roof and staging work raises the risk of heat illness.\n\nKey points (from the approved heat-illness procedure)\n• Water within reach; drink before you are thirsty.\n• Short rest breaks in shade.\n• Watch a coworker for confusion, dizziness or stopping sweating.\n\nSign-off: Everyone attending confirms they heard and understood the points above." },
    { title: "Lockout/tagout refresher", topic: "LOTO", scheduledFor: daysAgo(12), siteId: null, ai: false, content: "Every energized circuit gets a lock and a tag from the person doing the work. Verify de-energized with a tester before starting. Tags fall off, so the lock is what protects you." },
  ];
  const allEmp = await prisma.employee.findMany({ where: { organizationId: org.id } });
  for (const t of talks) {
    const talk = await prisma.toolboxTalk.create({ data: { organizationId: org.id, title: t.title, topic: t.topic, content: t.content, siteId: t.siteId, scheduledFor: t.scheduledFor, aiDrafted: t.ai, createdByName: "Maria Delgado" } });
    const audience = allEmp.filter((e) => !t.siteId || e.siteId === t.siteId);
    const take = t.title.startsWith("Lockout") ? audience : audience.slice(0, Math.ceil(audience.length * 0.6));
    for (const e of take) if (e.id !== emp.priya || t.title.startsWith("Lockout")) await prisma.talkAcknowledgement.create({ data: { talkId: talk.id, employeeId: e.id } });
  }

  // ---- Qualifications ----------------------------------------------------
  const quals: { who: string; name: string; issued: number; expires: number | null }[] = [
    { who: "priya", name: "OSHA 30", issued: -700, expires: null },
    { who: "priya", name: "Aerial lift", issued: -700, expires: 20 },
    { who: "marcus", name: "First aid / CPR", issued: -680, expires: -12 },
    { who: "marcus", name: "OSHA 30", issued: -900, expires: null },
    { who: "sofia", name: "OSHA 10", issued: -200, expires: null },
    { who: "tom", name: "OSHA 30", issued: -1200, expires: null },
    { who: "tom", name: "Fall protection", issued: -300, expires: 200 },
    { who: "liam", name: "Forklift", issued: -340, expires: 25 },
    { who: "danielle", name: "First aid / CPR", issued: -400, expires: 300 },
    { who: "wei", name: "Electrical safety (NFPA 70E)", issued: -350, expires: 380 },
  ];
  for (const q of quals) await prisma.qualification.create({ data: { organizationId: org.id, employeeId: emp[q.who], name: q.name, issuedOn: daysFromNow(q.issued), expiresOn: q.expires === null ? null : daysFromNow(q.expires) } });


  // ---- Ninety days of history so every screen has something real to show ------------------------
  const nameOf = (k: string) => PEOPLE.find((x) => x.key === k)?.name ?? "";
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
  const siteOwnerKey: Record<string, string | null> = { riverside: "maria", lakeshore: "kevin", shop: "maria", northgate: null };
  const crewAt: Record<string, string[]> = {
    riverside: ["priya", "marcus", "sofia", "james"],
    lakeshore: ["wei", "isabella", "noah", "fatima"],
    shop: ["liam", "aiko", "daniel"],
    northgate: ["grace", "mateo"],
  };
  // [type, category, severity, title, description, site, hours ago, injury?]
  type H = [string, string, string, string, string, string, number, boolean?];
  const history: H[] = [
    ["HAZARD", "HOUSEKEEPING", "MEDIUM", "Scrap conduit piled at the base of the north stair", "Cut conduit and wire spools are stacked on the bottom three steps of the north stair. People are stepping around them carrying material.", "riverside", 2200],
    ["NEAR_MISS", "STRUCK_BY", "MEDIUM", "Unsecured conduit bundle slid off a cart", "A bundle of 3/4 inch EMT slid off the material cart while it was pushed over the threshold. It landed next to my foot.", "lakeshore", 2050],
    ["EQUIPMENT", "TOOLS", "MEDIUM", "Damaged cord on the hammer drill", "The cord jacket is cracked near the strain relief and copper is showing. I tagged it out and returned it to the crib.", "shop", 1900],
    ["HAZARD", "PPE", "LOW", "Hearing protection dispenser empty", "The earplug dispenser by the fab shop door has been empty since Monday.", "shop", 1750],
    ["INJURY", "MANUAL_HANDLING", "MEDIUM", "Strained back lifting a wire reel", "Lifted a full 500 ft reel from the floor to the cart without help and felt a pull in my lower back. Took ibuprofen and finished the shift.", "riverside", 1600, true],
    ["HAZARD", "FALLS", "HIGH", "Guardrail removed at level 4 slab edge", "A section of temporary guardrail on the east slab edge was taken down for a concrete pour and not put back.", "lakeshore", 1500],
    ["NEAR_MISS", "VEHICLES", "MEDIUM", "Forklift and pedestrian crossed paths at the dock door", "A forklift came through the dock door as two of us were walking out. No horn and no spotter.", "shop", 1420],
    ["CONCERN", "ENVIRONMENT", "LOW", "Rooftop crew had no shade during heat advisory", "It was over 90 degrees. We had water but no shade and no scheduled breaks on the roof.", "lakeshore", 1330],
    ["HAZARD", "ELECTRICAL", "HIGH", "Exposed energized terminals in temporary panel", "The cover on the temporary distribution panel is missing and the lugs are exposed at knee height.", "riverside", 1240],
    ["EQUIPMENT", "LADDERS_LIFTS", "MEDIUM", "Scissor lift alarm not sounding", "The descent alarm on the 19 ft scissor lift did not sound when lowering. Lift tagged out.", "northgate", 1150],
    ["NEAR_MISS", "FALLS", "HIGH", "Stepped through an uncovered floor sleeve", "Carrying pipe, my foot went into an uncovered core-drilled sleeve up to the knee. I caught myself on the wall.", "riverside", 1060],
    ["HAZARD", "CHEMICALS_DUST", "MEDIUM", "Dust from cutting block with no water or vacuum", "Masons are cutting block dry in the corridor we use for pulling wire. The air is thick with dust.", "northgate", 980],
    ["CONCERN", "MANUAL_HANDLING", "LOW", "Heavy transformer moved by hand", "A crew is walking a dry-type transformer across the floor with a pry bar because the dolly is missing.", "shop", 900],
    ["INJURY", "TOOLS", "MEDIUM", "Metal shaving in eye while grinding", "Got a shaving in my left eye while grinding a support bracket. Flushed it at the eyewash and it was fine after.", "shop", 820, true],
    ["HAZARD", "HOUSEKEEPING", "MEDIUM", "Cords across the main corridor again", "Temporary power cords cross the corridor at knee height with no covers or tape.", "lakeshore", 740],
    ["NEAR_MISS", "LADDERS_LIFTS", "MEDIUM", "Ladder shifted while pulling cable overhead", "The feet slid a few inches on the sealed concrete. I had a second person footing it, so nothing happened.", "riverside", 660],
    ["EQUIPMENT", "FIRE", "LOW", "Fire extinguisher tag out of date", "The extinguisher at the north trailer shows its last inspection as two years ago.", "northgate", 590],
    ["HAZARD", "VEHICLES", "MEDIUM", "No traffic control at the laydown entrance", "Delivery trucks are backing into the laydown area while crews are unloading. There is no flagger.", "northgate", 520],
    ["NEAR_MISS", "ELECTRICAL", "HIGH", "Nearly cut a live cable while chasing a wall", "A cable we did not know was in the wall was exposed by the saw. It was later found to be energized.", "lakeshore", 450],
    ["CONCERN", "PPE", "LOW", "New hires asking about glove sizes", "Two apprentices said the gloves in the crib are all large and they are slipping off.", "riverside", 380],
    ["HAZARD", "FALLS", "MEDIUM", "Missing toe board on level 3 scaffold", "The scaffold outside the east window has no toe board on the top platform. Tools could fall.", "lakeshore", 300],
    ["EQUIPMENT", "TOOLS", "MEDIUM", "Chop saw guard sticking", "The blade guard on the chop saw in the shop does not return fully. Tagged out.", "shop", 240],
    ["HAZARD", "HOUSEKEEPING", "LOW", "Water pooling near the temporary panel", "A slow leak from the level above is pooling on the floor under the temporary panel.", "riverside", 170],
    ["NEAR_MISS", "STRUCK_BY", "MEDIUM", "Dropped bolt from overhead work", "A hanger bolt fell about ten feet from a lift and hit the floor beside a coworker.", "northgate", 118],
    ["CONCERN", "ENVIRONMENT", "LOW", "Cold morning start, icy walkway to the trailer", "The path from the parking area to the trailer was icy. Nobody fell, but it was close.", "riverside", 76],
    ["HAZARD", "ELECTRICAL", "MEDIUM", "GFCI tripping and being bypassed", "Someone is plugging a saw into a different circuit because this GFCI keeps tripping.", "lakeshore", 53],
    ["EQUIPMENT", "LADDERS_LIFTS", "MEDIUM", "Stepladder rung cracked", "A rung on the 8 ft fiberglass stepladder is cracked. It is still in circulation.", "shop", 30],
    ["HAZARD", "CHEMICALS_DUST", "MEDIUM", "Solvent cans left open in the fab area", "Two cans of cleaning solvent were left open beside the bender and the smell is strong.", "shop", 21],
    ["NEAR_MISS", "VEHICLES", "MEDIUM", "Pickup nearly hit a worker at the gate", "A pickup pulled through the gate as a worker was carrying conduit across. Driver had not seen him.", "northgate", 9],
    ["CONCERN", "HOUSEKEEPING", "LOW", "Break area has no place to wash hands", "There is no hand wash station at the north break area, just a water cooler.", "riverside", 4],
    ["HAZARD", "FALLS", "HIGH", "Open floor hole covered with loose plywood", "The cover over the new floor penetration is unfastened plywood that shifts when stepped on.", "lakeshore", 2.5],
  ];
  let nextRep = 19;
  let nextAct = 13;
  const generated: { id: string; n: number; site: string; h: H; status: string; ownerKey: string | null }[] = [];
  for (const h of history) {
    const [type, category, severity, title, description, site, ago, injury] = h;
    const createdAt = hoursAgo(ago);
    const ownerKey = siteOwnerKey[site];
    const reporterKey = crewAt[site][nextRep % crewAt[site].length];
    const old = ago > 24 * 21;
    const recent = ago <= 96;
    const status = old ? "CLOSED" : recent ? (ownerKey ? (nextRep % 3 === 0 ? "NEW" : "ASSIGNED") : "NEW") : ownerKey ? (nextRep % 2 ? "ACTIONS_OPEN" : "INVESTIGATING") : "NEW";
    const acked = ownerKey && status !== "NEW" ? new Date(createdAt.getTime() + (60 + (nextRep % 4) * 45) * 60_000) : null;
    const respondBy = new Date(createdAt.getTime() + (severity === "HIGH" ? 4 : 48) * 3600_000);
    const rep = await prisma.safetyReport.create({
      data: {
        organizationId: org.id, number: nextRep, type, category, severity, title, description, siteId: sites[site], occurredAt: new Date(createdAt.getTime() - 3600_000),
        status, privacy: nextRep % 7 === 0 ? "CONFIDENTIAL" : "NAMED", injuryInvolved: Boolean(injury), reporterId: emp[reporterKey], ownerId: ownerKey ? emp[ownerKey] : null, respondBy, acknowledgedAt: acked,
        severityConfirmedAt: recent ? null : new Date(createdAt.getTime() + 2 * 3600_000), severityConfirmedById: recent ? null : emp.maria, aiAssisted: nextRep % 5 === 0,
        closedAt: status === "CLOSED" ? new Date(createdAt.getTime() + 9 * day) : null, createdAt,
      },
    });
    const conf = nextRep % 7 === 0;
    const evs: { type: string; message: string; actorName?: string; actorId?: string | null; at: Date }[] = [
      { type: "CREATED", message: conf ? "Report submitted. The reporter's name is shared with the safety team only." : "Report submitted.", actorName: conf ? "" : nameOf(reporterKey), actorId: conf ? null : emp[reporterKey], at: createdAt },
      { type: "ASSIGNED", message: ownerKey ? `Assigned to ${nameOf(ownerKey)} as the site's safety lead.` : "No owner matched. Waiting for the safety team to assign an owner.", at: new Date(createdAt.getTime() + 1000) },
    ];
    if (acked && ownerKey) evs.push({ type: "ACKNOWLEDGED", message: "Report acknowledged.", actorName: nameOf(ownerKey), actorId: emp[ownerKey], at: acked });
    if (status === "CLOSED" && ownerKey) evs.push({ type: "STATUS", message: "Status set to Closed.", actorName: nameOf(ownerKey), actorId: emp[ownerKey], at: new Date(createdAt.getTime() + 9 * day) });
    await prisma.reportEvent.createMany({ data: evs.map((e) => ({ reportId: rep.id, type: e.type, message: e.message, actorName: e.actorName ?? "", actorId: e.actorId ?? null, createdAt: e.at })) });
    generated.push({ id: rep.id, n: nextRep, site, h, status, ownerKey });
    nextRep++;
  }

  // Corrective actions, investigations and follow-up on the generated reports.
  const fix: Record<string, string> = {
    HOUSEKEEPING: "Assign a daily housekeeping walk and clear the area", STRUCK_BY: "Require tool lanyards and barricade below overhead work", TOOLS: "Inspect and replace damaged tools; add a monthly tool check",
    PPE: "Restock PPE and add the item to the weekly crib check", MANUAL_HANDLING: "Provide a cart or lifting aid and review team lifts at the huddle", FALLS: "Replace missing guardrail or cover with a secured, marked one",
    VEHICLES: "Add a flagger and a marked walking route at the entrance", ELECTRICAL: "Restore covers, verify GFCI protection, and lock out until inspected", LADDERS_LIFTS: "Tag out and replace the equipment; inspect the rest of the fleet",
    ENVIRONMENT: "Add shade, water and scheduled breaks to the daily plan", CHEMICALS_DUST: "Provide wet cutting or vacuum and review the exposure plan with the crew", FIRE: "Inspect all extinguishers and update the tags",
  };
  const ownerPool = ["tom", "danielle", "luis", "kevin", "maria"];
  for (const g of generated) {
    const [, category, severity, title, , site, ago] = g.h;
    if (g.n % 5 === 4) continue; // some reports need no corrective action
    const closed = g.status === "CLOSED";
    const owner = site === "shop" ? "luis" : site === "lakeshore" ? "danielle" : site === "riverside" ? "tom" : ownerPool[g.n % ownerPool.length];
    const status = closed ? "VERIFIED" : g.status === "NEW" ? "PROPOSED" : g.n % 3 === 0 ? "COMPLETED" : g.n % 3 === 1 ? "IN_PROGRESS" : "APPROVED";
    const createdAt = hoursAgo(Math.max(1, ago - 6));
    const due = closed ? new Date(createdAt.getTime() + 7 * day) : new Date(Date.now() + (g.n % 4 === 0 ? -3 : (g.n % 5) + 1) * day);
    const verifiedAt = status === "VERIFIED" ? new Date(createdAt.getTime() + 8 * day) : null;
    await prisma.correctiveAction.create({
      data: {
        organizationId: org.id, number: nextAct++, reportId: g.id, title: `${fix[category] ?? "Fix the condition reported"}`.slice(0, 150), description: `Follow-up to: ${title}.`,
        priority: severity, status, ownerId: emp[owner], dueDate: due, proposedById: g.ownerKey ? emp[g.ownerKey] : emp.maria, approvedById: status === "PROPOSED" ? null : emp.maria, approvedAt: status === "PROPOSED" ? null : new Date(createdAt.getTime() + 3600_000),
        completionNotes: ["COMPLETED", "VERIFIED"].includes(status) ? "Done and photographed. Crew briefed at the next huddle." : "", completedAt: ["COMPLETED", "VERIFIED"].includes(status) ? new Date(createdAt.getTime() + 6 * day) : null,
        verifiedById: status === "VERIFIED" ? emp.maria : null, verifiedAt, createdAt,
      },
    });
    if (status === "VERIFIED") await prisma.reportEvent.create({ data: { reportId: g.id, type: "ACTION", message: `Corrective action A-${nextAct - 1} verified.`, actorName: "Maria Delgado", actorId: emp.maria, createdAt: verifiedAt! } });
    else if (!closed) await prisma.reportEvent.create({ data: { reportId: g.id, type: "ACTION", message: `Corrective action A-${nextAct - 1} ${status === "PROPOSED" ? "proposed" : status === "COMPLETED" ? "marked done. Waiting for verification" : "approved"}.`, actorName: g.ownerKey ? nameOf(g.ownerKey) : "Maria Delgado", actorId: emp[g.ownerKey ?? "maria"], createdAt: hoursAgo(Math.max(0.5, ago - 8)) } });
  }
  // Completed investigations (with two shared lessons) on older serious or repeated reports.
  const invTargets = generated.filter((g) => ["CLOSED"].includes(g.status) && g.ownerKey && ["HIGH", "MEDIUM"].includes(g.h[2])).slice(0, 5);
  for (const [i, g] of invTargets.entries()) {
    const [, category, , title] = g.h;
    await prisma.investigation.create({
      data: {
        reportId: g.id, organizationId: org.id, leadId: emp[g.ownerKey!], status: "COMPLETE", openedAt: hoursAgo(g.h[6] - 24), completedAt: hoursAgo(g.h[6] - 24 * 9),
        facts: `Reviewed the area and spoke with the crew about: ${title}. The condition was present for at least one shift before it was reported.`,
        sequenceNotes: "The condition developed during normal work. No one owned the check for it, and the task plan did not mention it.",
        contributingFactors: [pack.contributingFactors[(i + 1) % pack.contributingFactors.length], pack.contributingFactors[(i + 5) % pack.contributingFactors.length]],
        rootCauseNotes: "The investigator found no owner for the daily check and an unclear handoff between trades. The fix is to name an owner and add the check to the daily huddle.",
        lessonText: i < 3 ? `${fix[category] ?? "Look for this condition before starting work"}. Speak up early if you see it, and check again after another trade has worked in the area.` : "",
        shareLesson: i < 3,
      },
    });
    await prisma.reportEvent.create({ data: { reportId: g.id, type: "INVESTIGATION", message: "Investigation marked complete.", actorName: nameOf(g.ownerKey!), actorId: emp[g.ownerKey!], createdAt: hoursAgo(g.h[6] - 24 * 9) } });
  }
  // Two investigations still under way on recent reports.
  for (const g of generated.filter((x) => x.status === "INVESTIGATING" && x.ownerKey).slice(0, 2)) {
    await prisma.investigation.create({ data: { reportId: g.id, organizationId: org.id, leadId: emp[g.ownerKey!], status: "OPEN", openedAt: hoursAgo(g.h[6] - 6), facts: `Walked the area with the foreman. Photos taken. ${g.h[3]}.`, contributingFactors: [pack.contributingFactors[2]] } });
    await prisma.reportEvent.create({ data: { reportId: g.id, type: "INVESTIGATION", message: "Investigation opened.", actorName: nameOf(g.ownerKey!), actorId: emp[g.ownerKey!], createdAt: hoursAgo(g.h[6] - 6) } });
  }

  // Weekly inspections for eight weeks at every site, with the odd failed item.
  const siteInspTpl = tpls.SITE_INSPECTION;
  const inspAssignee: Record<string, string> = { riverside: "tom", lakeshore: "danielle", shop: "luis", northgate: "grace" };
  for (const site of Object.keys(sites)) {
    for (let w = 2; w <= 9; w++) {
      const doneAt = new Date(Date.now() - (w * 7 - (site.length % 3)) * day);
      const failIdx = (w + site.length) % 5 === 0 ? (w % 7) + 1 : -1;
      const results = tplItems.map((it, i) => ({ ...it, result: i === failIdx ? "FAIL" : "PASS", note: i === failIdx ? "Found during the walk. Reported to the foreman." : "" }));
      const insp = await prisma.inspection.create({
        data: { organizationId: org.id, templateId: siteInspTpl, siteId: sites[site], assigneeId: emp[inspAssignee[site]], dueDate: doneAt, status: "COMPLETED", completedById: emp[inspAssignee[site]], completedAt: doneAt, results, notes: failIdx >= 0 ? "One item needs follow-up." : "", createdAt: new Date(doneAt.getTime() - 7 * day) },
      });
      if (failIdx >= 0) {
        await prisma.correctiveAction.create({
          data: { organizationId: org.id, number: nextAct++, inspectionId: insp.id, title: `Fix: ${tplItems[failIdx].label}`.slice(0, 150), description: `Found during the weekly walk at ${siteDefs.find((d) => d.key === site)?.name}.`, priority: tplItems[failIdx].critical ? "HIGH" : "MEDIUM", status: w > 5 ? "VERIFIED" : "IN_PROGRESS", ownerId: emp[inspAssignee[site]], dueDate: new Date(doneAt.getTime() + 7 * day), proposedById: emp[inspAssignee[site]], approvedById: emp.maria, approvedAt: doneAt, completedAt: w > 5 ? new Date(doneAt.getTime() + 5 * day) : null, verifiedById: w > 5 ? emp.maria : null, verifiedAt: w > 5 ? new Date(doneAt.getTime() + 6 * day) : null, completionNotes: w > 5 ? "Fixed and rechecked." : "", createdAt: doneAt },
        });
      }
    }
  }
  // Readiness checks and observations that were completed recently.
  for (const [k, who, siteK, ago] of [[tpls.READINESS, "maria", "northgate", 3], [tpls.READINESS, "kevin", "lakeshore", 6], [tpls.OBSERVATION, "tom", "riverside", 1], [tpls.OBSERVATION, "luis", "shop", 2]] as const) {
    const tpl = await prisma.inspectionTemplate.findUniqueOrThrow({ where: { id: k } });
    const items = (tpl.items as { id: string; label: string; critical?: boolean }[]).map((it) => ({ itemId: it.id, label: it.label, critical: Boolean(it.critical), result: "PASS", note: "" }));
    await prisma.inspection.create({ data: { organizationId: org.id, templateId: k, siteId: sites[siteK], assigneeId: emp[who], dueDate: daysAgo(ago), status: "COMPLETED", completedById: emp[who], completedAt: daysAgo(ago), results: items } });
  }

  // Toolbox talks every week with realistic acknowledgement rates.
  const talkTopics = ["Heat illness and hydration", "Housekeeping and trip hazards", "Lockout tagout refresher", "Working near overhead lifts", "Temporary power and GFCIs", "Silica dust and wet cutting", "Hand and finger safety", "Vehicle and pedestrian separation"];
  const everyone = await prisma.employee.findMany({ where: { organizationId: org.id }, select: { id: true, siteId: true } });
  for (const [i, topic] of talkTopics.entries()) {
    const when = daysAgo(9 + i * 7);
    const talk = await prisma.toolboxTalk.create({
      data: { organizationId: org.id, title: topic, topic, content: `Why it matters\n${topic} came up in recent reports and site walks.\n\nKey points\n• Check the area before starting.\n• Speak up if something looks wrong.\n• Ask your foreman if the plan does not cover it.\n\nDiscussion\n• Where have you seen this on our sites?`, siteId: null, scheduledFor: when, aiDrafted: i % 3 === 0, createdByName: i % 2 ? "Maria Delgado" : "Tom Brennan" },
    });
    const takers = everyone.filter((e, idx) => (idx + i) % 6 !== 0);
    await prisma.talkAcknowledgement.createMany({ data: takers.map((e) => ({ talkId: talk.id, employeeId: e.id, acknowledgedAt: new Date(when.getTime() + 3600_000) })), skipDuplicates: true });
  }

  // More qualifications: a few current, some expiring soon, one expired.
  const extraQuals: [string, string, number, number | null][] = [
    ["james", "OSHA 10", -400, null], ["james", "Aerial lift", -300, 45], ["wei", "First aid / CPR", -600, 18], ["isabella", "OSHA 10", -150, null], ["noah", "Aerial lift", -700, 9],
    ["fatima", "Electrical safety (NFPA 70E)", -330, 35], ["liam", "OSHA 10", -500, null], ["aiko", "Forklift", -730, -6], ["daniel", "Forklift", -200, 160], ["daniel", "First aid / CPR", -400, 320],
    ["grace", "OSHA 30", -800, null], ["mateo", "OSHA 10", -90, null], ["sofia", "First aid / CPR", -350, 12], ["luis", "OSHA 30", -1000, null], ["luis", "Fall protection", -280, 85], ["danielle", "OSHA 30", -900, null],
    ["kevin", "OSHA 30", -1100, null], ["kevin", "First aid / CPR", -250, 110], ["maria", "OSHA 30", -1300, null], ["maria", "Confined space", -200, 25],
  ];
  for (const [who, name, issued, expires] of extraQuals) await prisma.qualification.create({ data: { organizationId: org.id, employeeId: emp[who], name, issuedOn: daysFromNow(issued), expiresOn: expires === null ? null : daysFromNow(expires) } });

  // ---- Demo login profiles -----------------------------------------------------------------
  // The people a demo signs in as (safety manager, foremen, electricians) each get their own history:
  // reports they filed in every state, corrective actions assigned to them, follow-ups, and recent sign-ins.
  type PR = { by: string; type: string; category: string; severity: string; title: string; description: string; site: string; hours: number; status: string; note?: string; injury?: boolean; privacy?: string };
  const personal: PR[] = [
    { by: "priya", type: "HAZARD", category: "ELECTRICAL", severity: "MEDIUM", title: "Temporary lighting string hung from a sprinkler pipe", description: "The string lights on level 3 are zip-tied to a sprinkler branch line. The cord jacket is scuffed where it rubs the pipe.", site: "riverside", hours: 26, status: "ASSIGNED" },
    { by: "priya", type: "NEAR_MISS", category: "STRUCK_BY", severity: "MEDIUM", title: "Cart with wire reels rolled down the ramp", description: "A cart loaded with reels started rolling on the loading ramp when the brake did not hold. Two of us stopped it.", site: "riverside", hours: 24 * 16, status: "CLOSED", note: "Ramp chocks added and cart brakes replaced." },
    { by: "priya", type: "CONCERN", category: "PPE", severity: "LOW", title: "Safety glasses fog up under the dust mask", description: "Several of us are pushing glasses up to see. A fog-resistant option would help.", site: "riverside", hours: 24 * 34, status: "CLOSED", note: "Anti-fog glasses stocked at the trailer." },
    { by: "fatima", type: "EQUIPMENT", category: "TOOLS", severity: "MEDIUM", title: "Meter leads cracked on the fire alarm test kit", description: "The insulation on the red test lead is cracked near the probe tip. Pulled it from the kit.", site: "lakeshore", hours: 24 * 6, status: "ACTIONS_OPEN" },
    { by: "fatima", type: "CONCERN", category: "HOUSEKEEPING", severity: "LOW", title: "Stair landing used as a staging area", description: "Boxes of devices are stacked on the level 3 landing between deliveries.", site: "lakeshore", hours: 24 * 27, status: "CLOSED", note: "Staging moved to a marked area." },
    { by: "marcus", type: "NEAR_MISS", category: "FALLS", severity: "HIGH", title: "Harness lanyard caught on rebar while moving between bays", description: "Moving between bays my lanyard caught and pulled me back. I unclipped safely but it could have gone the other way.", site: "riverside", hours: 24 * 3, status: "INVESTIGATING" },
    { by: "wei", type: "HAZARD", category: "ELECTRICAL", severity: "MEDIUM", title: "Panel directory missing on the level 5 distribution board", description: "There is no circuit directory and several breakers are unlabeled.", site: "lakeshore", hours: 24 * 5, status: "ACTIONS_OPEN" },
    { by: "liam", type: "EQUIPMENT", category: "TOOLS", severity: "LOW", title: "Wire stripper handle cracked in the shop", description: "The rubber grip has split on one of the benchtop strippers.", site: "shop", hours: 24 * 11, status: "CLOSED", note: "Replaced and added to the monthly tool check." },
    { by: "tom", type: "HAZARD", category: "HOUSEKEEPING", severity: "MEDIUM", title: "Prewire staging blocks the second exit on level 2", description: "Material staged for tomorrow narrows the second exit to under a foot. Moved it, but the plan needs a staging area.", site: "riverside", hours: 24 * 2, status: "ASSIGNED" },
    { by: "danielle", type: "CONCERN", category: "ENVIRONMENT", severity: "LOW", title: "Heat advisory: adjust rooftop start times", description: "Crews on the Lakeshore roof are hitting heat limits by 1 pm. Suggest earlier starts this week.", site: "lakeshore", hours: 24 * 8, status: "CLOSED", note: "Start times moved up by two hours during advisories." },
  ];
  const personalIds: Record<string, string> = {};
  for (const pr of personal) {
    const createdAt = hoursAgo(pr.hours);
    const closed = pr.status === "CLOSED";
    const ownerKey = siteOwnerKey[pr.site];
    const acked = ownerKey ? new Date(createdAt.getTime() + 90 * 60_000) : null;
    const rep = await prisma.safetyReport.create({
      data: {
        organizationId: org.id, number: nextRep, type: pr.type, category: pr.category, severity: pr.severity, title: pr.title, description: pr.description, siteId: sites[pr.site],
        occurredAt: new Date(createdAt.getTime() - 3600_000), status: pr.status, privacy: pr.privacy ?? "NAMED", injuryInvolved: Boolean(pr.injury), reporterId: emp[pr.by], ownerId: ownerKey ? emp[ownerKey] : null,
        respondBy: new Date(createdAt.getTime() + 48 * 3600_000), acknowledgedAt: acked, severityConfirmedAt: pr.hours > 48 ? new Date(createdAt.getTime() + 3 * 3600_000) : null, severityConfirmedById: pr.hours > 48 ? emp.maria : null,
        closedAt: closed ? new Date(createdAt.getTime() + 8 * day) : null, createdAt,
      },
    });
    const evs: { type: string; message: string; actorName?: string; actorId?: string | null; at: Date }[] = [
      { type: "CREATED", message: "Report submitted.", actorName: nameOf(pr.by), actorId: emp[pr.by], at: createdAt },
      { type: "ASSIGNED", message: ownerKey ? `Assigned to ${nameOf(ownerKey)} as the site's safety lead.` : "No owner matched. Waiting for the safety team to assign an owner.", at: new Date(createdAt.getTime() + 1000) },
    ];
    if (acked && ownerKey) evs.push({ type: "ACKNOWLEDGED", message: "Report acknowledged.", actorName: nameOf(ownerKey), actorId: emp[ownerKey], at: acked });
    if (ownerKey && pr.hours > 48 && !closed) evs.push({ type: "MESSAGE_TO_REPORTER", message: "Thanks for flagging this. We are looking at it and will update you here. If you notice anything else, add it to this report.", actorName: nameOf(ownerKey), actorId: emp[ownerKey], at: new Date(createdAt.getTime() + 5 * 3600_000) });
    if (closed && ownerKey) {
      evs.push({ type: "ACTION", message: "Corrective action verified.", actorName: nameOf(ownerKey), actorId: emp[ownerKey], at: new Date(createdAt.getTime() + 7 * day) });
      evs.push({ type: "STATUS", message: `Status set to Closed. ${pr.note ?? ""}`.trim(), actorName: nameOf(ownerKey), actorId: emp[ownerKey], at: new Date(createdAt.getTime() + 8 * day) });
    }
    await prisma.reportEvent.createMany({ data: evs.map((e) => ({ reportId: rep.id, type: e.type, message: e.message, actorName: e.actorName ?? "", actorId: e.actorId ?? null, createdAt: e.at })) });
    personalIds[pr.title] = rep.id;
    nextRep++;
  }

  // Corrective actions assigned to the demo people, in every state, some due soon and one overdue.
  const ownedActions: { owner: string; title: string; status: string; priority: string; due: number; report?: string; note?: string }[] = [
    { owner: "priya", title: "Re-route temporary lighting off the sprinkler line and use listed hangers", status: "IN_PROGRESS", priority: "MEDIUM", due: 3, report: "Temporary lighting string hung from a sprinkler pipe" },
    { owner: "priya", title: "Add chocks and a brake check to the material cart routine", status: "APPROVED", priority: "MEDIUM", due: 9 },
    { owner: "fatima", title: "Replace the cracked test leads and add a lead check to the kit sign-out", status: "APPROVED", priority: "MEDIUM", due: 1, report: "Meter leads cracked on the fire alarm test kit" },
    { owner: "fatima", title: "Post a staging map for device deliveries on level 3", status: "COMPLETED", priority: "LOW", due: -2, note: "Map posted at the delivery door and reviewed at the huddle." },
    { owner: "marcus", title: "Walk each bay with the foreman and mark lanyard anchor points", status: "IN_PROGRESS", priority: "HIGH", due: 2, report: "Harness lanyard caught on rebar while moving between bays" },
    { owner: "wei", title: "Label every breaker and post a directory on the level 5 board", status: "IN_PROGRESS", priority: "MEDIUM", due: 5, report: "Panel directory missing on the level 5 distribution board" },
    { owner: "noah", title: "Inspect all ladders on the Lakeshore floors and tag out the damaged ones", status: "APPROVED", priority: "HIGH", due: -1 },
    { owner: "liam", title: "Add a weekly grip and handle check to the shop tool board", status: "VERIFIED", priority: "LOW", due: -8, note: "Check added and first week logged." },
    { owner: "tom", title: "Mark a staging area on the level 2 plan and brief every crew", status: "IN_PROGRESS", priority: "MEDIUM", due: 0, report: "Prewire staging blocks the second exit on level 2" },
    { owner: "danielle", title: "Post the scaffold tag-out status at each access point", status: "APPROVED", priority: "HIGH", due: 1 },
    { owner: "maria", title: "Review the site emergency plans for all four sites", status: "IN_PROGRESS", priority: "MEDIUM", due: 14 },
    { owner: "kevin", title: "Run a competent-person scaffold refresher for Lakeshore foremen", status: "PROPOSED", priority: "MEDIUM", due: 12 },
  ];
  for (const a of ownedActions) {
    const done = ["COMPLETED", "VERIFIED"].includes(a.status);
    await prisma.correctiveAction.create({
      data: {
        organizationId: org.id, number: nextAct++, reportId: a.report ? personalIds[a.report] : null, title: a.title, description: "", priority: a.priority, status: a.status, ownerId: emp[a.owner], dueDate: daysFromNow(a.due),
        proposedById: emp.maria, approvedById: a.status === "PROPOSED" ? null : emp.maria, approvedAt: a.status === "PROPOSED" ? null : daysAgo(6), completionNotes: a.note ?? "",
        completedAt: done ? daysAgo(3) : null, verifiedById: a.status === "VERIFIED" ? emp.maria : null, verifiedAt: a.status === "VERIFIED" ? daysAgo(2) : null, createdAt: daysAgo(8),
      },
    });
  }

  // A response that is winding down at Riverside, led by Tom, so a foreman's login has a live workspace too.
  const monitored = generated.find((g) => g.h[3].startsWith("Exposed energized terminals"));
  if (monitored) {
    const rep = await prisma.safetyReport.findUniqueOrThrow({ where: { id: monitored.id } });
    const inc = await prisma.incidentResponse.create({
      data: {
        organizationId: org.id, reportId: rep.id, status: "MONITORING", leadId: emp.tom, openedBy: "MANUAL", openedById: emp.maria, openedAt: new Date(rep.createdAt.getTime() + 2 * 3600_000),
        summary: "Exposed lugs in a temporary panel at knee height. The panel is de-energized and locked out, and a new cover is on order.",
        nextAction: "Confirm the new cover is fitted and the panel re-energized with a test.", nextActionDueAt: new Date(Date.now() + 26 * 3600_000),
      },
    });
    await prisma.incidentResponder.createMany({ data: [{ incidentId: inc.id, employeeId: emp.maria, role: "Safety" }, { incidentId: inc.id, employeeId: emp.marcus, role: "Electrician on the panel" }] });
    const t0 = rep.createdAt.getTime();
    await prisma.reportEvent.createMany({
      data: [
        { reportId: rep.id, type: "INCIDENT", message: "Incident workspace opened: Exposed energized parts, temporary power.", actorName: "Maria Delgado", actorId: emp.maria, createdAt: new Date(t0 + 2 * 3600_000) },
        { reportId: rep.id, type: "UPDATE", message: "Panel locked out and tagged. Crews on level 2 moved to the west feed.", actorName: "Tom Brennan", actorId: emp.tom, createdAt: new Date(t0 + 3 * 3600_000) },
        { reportId: rep.id, type: "DECISION", message: "The panel stays locked out until the new cover is fitted and a second electrician has checked it.", actorName: "Maria Delgado", actorId: emp.maria, createdAt: new Date(t0 + 4 * 3600_000) },
      ],
    });
  }

  // A believable activity log: setup, invites, settings, and day-to-day safety work over the last two months.
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: "admin@havenbrook.com" } });
  const actorUserId = async (k: string) => (await prisma.employee.findUniqueOrThrow({ where: { id: emp[k] } })).userId;
  const actors = { admin: adminUser.id, maria: await actorUserId("maria"), kevin: await actorUserId("kevin"), tom: await actorUserId("tom"), danielle: await actorUserId("danielle"), luis: await actorUserId("luis") };
  const logPlan: [keyof typeof actors | null, string, string, number][] = [
    ["admin", "safety.settings_changed", "Organization", 24 * 58], ["admin", "employee.invited", "User", 24 * 57], ["admin", "employee.invited", "User", 24 * 57 - 1], ["admin", "admin.invited", "User", 24 * 56],
    ["admin", "employee.made_department_lead", "Employee", 24 * 55], ["admin", "employee.made_department_lead", "Employee", 24 * 55 - 2], ["maria", "safety.settings_changed", "EscalationRule", 24 * 52], ["maria", "safety.settings_changed", "EscalationRule", 24 * 52 - 1],
    ["admin", "invite.resent", "User", 24 * 44], ["admin", "account.profile_updated", "User", 24 * 41], ["maria", "safety.inspection_completed", "Inspection", 24 * 37], ["kevin", "safety.inspection_completed", "Inspection", 24 * 30],
    ["maria", "safety.investigation_updated", "Investigation", 24 * 24], ["luis", "safety.action_updated", "CorrectiveAction", 24 * 21], ["tom", "safety.action_updated", "CorrectiveAction", 24 * 20], ["maria", "safety.report_updated", "SafetyReport", 24 * 18],
    ["admin", "safety.settings_changed", "Organization", 24 * 15], ["maria", "safety.exported", "Export", 24 * 14], ["danielle", "safety.inspection_completed", "Inspection", 24 * 12], ["admin", "employee.invited", "User", 24 * 11],
    ["maria", "safety.report_updated", "SafetyReport", 24 * 9], ["kevin", "safety.report_updated", "SafetyReport", 24 * 8], ["tom", "safety.action_updated", "CorrectiveAction", 24 * 7], ["maria", "safety.investigation_updated", "Investigation", 24 * 6],
    ["admin", "account.password_changed", "User", 24 * 5], ["luis", "safety.action_updated", "CorrectiveAction", 24 * 4], ["maria", "safety.report_updated", "SafetyReport", 24 * 3], ["kevin", "safety.report_updated", "SafetyReport", 30],
    ["admin", "safety.settings_changed", "Organization", 26], ["maria", "safety.action_updated", "CorrectiveAction", 20], ["tom", "safety.report_updated", "SafetyReport", 9], ["danielle", "safety.action_updated", "CorrectiveAction", 5],
    ["maria", "safety.report_updated", "SafetyReport", 3], [null, "account.locked", "User", 24 * 26],
  ];
  await prisma.auditLog.createMany({ data: logPlan.map(([who, action, entityType, hrs]) => ({ organizationId: org.id, userId: who ? actors[who] : null, action, entityType, createdAt: hoursAgo(hrs) })) });

  // Sign-in times that look like a team in daily use.
  const lastSeen: Record<string, number> = { "admin@havenbrook.com": 0.4, "maria.delgado@havenbrook.com": 0.2, "kevin.park@havenbrook.com": 1.5, "tom.brennan@havenbrook.com": 0.8, "danielle.okafor@havenbrook.com": 2, "luis.ortega@havenbrook.com": 5, "priya.shah@havenbrook.com": 3, "fatima.haddad@havenbrook.com": 6, "marcus.bennett@havenbrook.com": 9, "wei.zhang@havenbrook.com": 12, "sofia.rossi@havenbrook.com": 26, "james.coleman@havenbrook.com": 30, "noah.park@havenbrook.com": 50, "liam.obrien@havenbrook.com": 8 };
  for (const [email, h] of Object.entries(lastSeen)) await prisma.user.update({ where: { email }, data: { lastLoginAt: hoursAgo(h) } });
  // One more renewal each so every worker login has something to renew.
  for (const [who, name, issued, expires] of [["fatima", "First aid / CPR", -700, 14], ["tom", "First aid / CPR", -690, 21], ["marcus", "Aerial lift", -700, 11], ["wei", "OSHA 10", -400, null]] as [string, string, number, number | null][]) {
    await prisma.qualification.create({ data: { organizationId: org.id, employeeId: emp[who], name, issuedOn: daysFromNow(issued), expiresOn: expires === null ? null : daysFromNow(expires) } });
  }

  const certVerifier = await prisma.user.findUnique({ where: { email: "admin@havenbrook.com" }, select: { id: true } });
  await seedCertificationCatalog(org.id, Object.fromEntries(Object.entries(crews).map(([k, c]) => [k, (c as { id: string }).id])), sites, certVerifier?.id ?? null);

  await prisma.subscription.create({ data: { organizationId: org.id, tier: "GROWTH", status: "ACTIVE", seats: 75, pricePerMonth: 900, currentPeriodEnd: daysFromNow(20) } }).catch(() => {});

  console.log("Done. Demo password for all seeded accounts:", DEMO_PASSWORD);
  console.log("  Platform admin: platform@reldro.com");
  console.log("  Company admin:  admin@havenbrook.com");
  console.log("  Safety manager: maria.delgado@havenbrook.com");
  console.log("  Supervisor:     tom.brennan@havenbrook.com");
  console.log("  Employee:       priya.shah@havenbrook.com");
  console.log(`  Anonymous follow-up demo code (at /follow-up): ${DEMO_FOLLOW_UP_CODE}`);
}

if (typeof require !== "undefined" && require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
