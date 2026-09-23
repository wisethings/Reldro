"use client";

import { useState, useTransition } from "react";
import { updatePointsRule } from "@/lib/actions/rewards";

type Rule = { id: string; key: string; label: string; points: number; enabled: boolean; monthlyCap: number | null };

function RuleRow({ rule }: { rule: Rule }) {
  const [points, setPoints] = useState(rule.points);
  const [enabled, setEnabled] = useState(rule.enabled);
  const [monthlyCap, setMonthlyCap] = useState<string>(rule.monthlyCap?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updatePointsRule(rule.id, {
        points,
        enabled,
        monthlyCap: monthlyCap.trim() === "" ? null : Math.max(1, parseInt(monthlyCap, 10)),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3">
      <div className="min-w-[180px] flex-1">
        <p className="text-sm text-ink-800">{rule.label}</p>
        <p className="text-[11px] text-ink-400">{rule.key}</p>
      </div>
      <label className="flex items-center gap-1 text-xs text-ink-600">
        Points
        <input
          type="number"
          min={0}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-16 rounded-lg border border-ink-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-ink-600">
        Monthly cap
        <input
          type="number"
          min={1}
          placeholder="None"
          value={monthlyCap}
          onChange={(e) => setMonthlyCap(e.target.value)}
          className="w-16 rounded-lg border border-ink-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-ink-600">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enabled
      </label>
      <button
        onClick={save}
        disabled={pending}
        className="rounded-full border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 hover:border-brand-500 disabled:opacity-50"
      >
        {saved ? "Saved" : pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export function PointsRulesTable({ rules }: { rules: Rule[] }) {
  return (
    <div className="divide-y divide-ink-200">
      {rules.map((r) => (
        <RuleRow key={r.id} rule={r} />
      ))}
    </div>
  );
}
