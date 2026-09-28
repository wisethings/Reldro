"use client";

import { useState, useTransition } from "react";
import { addRewardCatalogItem, setRewardCatalogItemActive } from "@/lib/actions/rewards";
import type { RewardCategory } from "@prisma/client";
import { Field, Input, Select } from "@/components/ui/Field";

const CATEGORIES: RewardCategory[] = ["GIFT_CARD", "LEARNING_CREDIT", "MERCHANDISE", "PTO", "DONATION", "EXPERIENCE", "CUSTOM"];

type Item = { id: string; name: string; description: string; category: RewardCategory; pointCost: number; active: boolean };

export function RewardCatalogAdmin({ items }: { items: Item[] }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RewardCategory>("CUSTOM");
  const [pointCost, setPointCost] = useState(500);

  return (
    <div className="space-y-4">
      <div className="divide-y divide-ink-200 rounded-lg border border-ink-200">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm text-ink-800">
                {item.name} <span className="text-xs text-ink-400">· {item.pointCost} pts</span>
              </p>
              <p className="text-xs text-ink-500">{item.description}</p>
            </div>
            <button
              onClick={() =>
                startTransition(async () => {
                  await setRewardCatalogItemActive(item.id, !item.active);
                })
              }
              className="rounded-full border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 hover:border-brand-500"
            >
              {item.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="p-4 text-sm text-ink-500">No reward items yet.</p>}
      </div>

      <div className="space-y-3 rounded-lg border border-ink-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Add reward</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Reward name" />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as RewardCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ").toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Point cost">
            <Input type="number" min={1} value={pointCost} onChange={(e) => setPointCost(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        </Field>
        <button
          disabled={pending || !name.trim()}
          onClick={() =>
            startTransition(async () => {
              await addRewardCatalogItem({ name, description, category, pointCost });
              setName("");
              setDescription("");
              setPointCost(500);
            })
          }
          className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-40"
        >
          Add reward
        </button>
      </div>
    </div>
  );
}
