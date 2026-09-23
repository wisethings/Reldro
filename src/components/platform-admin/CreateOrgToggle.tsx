"use client";

import { useState } from "react";
import { ProvisionOrgForm } from "@/components/platform-admin/ProvisionOrgForm";

export function CreateOrgToggle() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800"
      >
        Create organization
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
      <ProvisionOrgForm onDone={() => setOpen(false)} />
      <button onClick={() => setOpen(false)} className="mt-3 text-xs text-ink-500 hover:text-ink-800">
        Cancel
      </button>
    </div>
  );
}
