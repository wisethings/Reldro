"use client";

import { useState, useTransition } from "react";
import { redeemReward } from "@/lib/actions/rewards";

export function RedeemButton({ rewardItemId, pointCost, balance }: { rewardItemId: string; pointCost: number; balance: number }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canAfford = balance >= pointCost;

  if (done) return <p className="text-xs font-medium text-sage-deep">Redeemed</p>;

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        disabled={!canAfford}
        className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-40"
      >
        {canAfford ? "Redeem" : `${pointCost - balance} pts short`}
      </button>
    );
  }

  return (
    <div className="space-y-1.5 text-right">
      <p className="text-xs text-ink-600">Remaining balance: {(balance - pointCost).toLocaleString()}</p>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await redeemReward(rewardItemId);
                setDone(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Something went wrong");
                setConfirming(false);
              }
            })
          }
          className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-40"
        >
          {pending ? "Redeeming…" : "Confirm"}
        </button>
        <button onClick={() => setConfirming(false)} className="rounded-full px-3 py-1.5 text-xs text-ink-500 hover:text-ink-800">
          Cancel
        </button>
      </div>
    </div>
  );
}
