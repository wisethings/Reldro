"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { btnPrimary, btnSecondary } from "./FormParts";

type Ask = { title: string; body: ReactNode; confirmLabel: string; destructive?: boolean; onConfirm: () => void };

/**
 * The one confirmation step for every destructive or hard-to-undo action, instead of the browser's native confirm().
 * `ask({...})` opens it; render `dialog` once in the component.
 */
export function useConfirm() {
  const [state, setState] = useState<Ask | null>(null);
  const close = () => setState(null);
  const dialog = state ? (
    <Modal title={state.title} onClose={close}>
      <div className="max-w-md space-y-4">
        <div className="text-sm text-ink-700">{state.body}</div>
        <div className="flex gap-2">
          <button
            autoFocus
            onClick={() => { const go = state.onConfirm; close(); go(); }}
            className={state.destructive ? "rounded-full bg-danger px-5 py-2 text-sm font-medium text-white hover:opacity-90" : btnPrimary}
          >
            {state.confirmLabel}
          </button>
          <button type="button" onClick={close} className={btnSecondary}>Cancel</button>
        </div>
      </div>
    </Modal>
  ) : null;
  return { ask: setState as (a: Ask) => void, dialog };
}
