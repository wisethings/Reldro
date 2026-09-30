import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const STACK = ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Open Sans", "Helvetica Neue", "sans-serif"];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

test("Inter is the only typeface, first in the stack, with every fallback kept", () => {
  const tw = readFileSync("tailwind.config.ts", "utf8");
  const line = tw.split("\n").find((l) => l.trim().startsWith("sans:")) ?? "";
  const names = [...line.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((n) => n !== "var(--font-inter)");
  assert.deepEqual(names, STACK);
  assert.ok(line.includes('"var(--font-inter)"'), "the loaded Inter font comes first");
  assert.ok(!/fontFamily:[\s\S]*display:/.test(tw), "no second font family in the Tailwind theme");
});

test("no other font families are loaded or referenced", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.ok(!/Inter_Tight|Parkinsans|next\/font\/google.*(?!Inter)\b(Roboto|Poppins|Lora)/.test(layout));
  const offenders: string[] = [];
  for (const f of walk("src")) {
    const text = readFileSync(f, "utf8");
    if (f.endsWith("email.ts")) continue; // email clients get the same stack inline
    if (/font-mono|font-display|font-wordmark|font-serif|--font-inter-tight|--font-parkinsans/.test(text)) offenders.push(f);
  }
  assert.deepEqual(offenders, []);
});
