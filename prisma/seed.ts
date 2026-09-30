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
