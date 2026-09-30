// Post-deploy check. Usage: npm run smoke -- https://app.reldro.com
const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const checks = [
  ["/api/health", (r, b) => r.status === 200 && b.includes('"status":"ok"'), "health check reports ok"],
  ["/login", (r) => r.status === 200, "login page loads"],
  ["/follow-up", (r) => r.status === 200, "anonymous follow-up page loads"],
  ["/dashboard/overview", (r) => [200, 302, 303, 307, 308].includes(r.status), "dashboard redirects to login when signed out"],
];
let failed = 0;
for (const [path, ok, label] of checks) {
  try {
    const res = await fetch(base + path, { redirect: "manual" });
    const body = await res.text();
    const pass = ok(res, body);
    console.log(`${pass ? "PASS" : "FAIL"} ${label} (${res.status})`);
    if (!pass) failed++;
  } catch (e) {
    console.log(`FAIL ${label} (${e.message})`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
