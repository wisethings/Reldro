"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ProvisionOrgForm } from "@/components/platform-admin/ProvisionOrgForm";

const btn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors";

/** The page header for Organizations: title and count on the left, Export and Create together on the right, and the create form opening below as its own panel so the header never reflows. */
export function OrganizationsHeader({ count }: { count: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Organizations</h1>
          <p className="mt-0.5 text-sm text-ink-500">{count} organization{count === 1 ? "" : "s"} on Reldro.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/platform-admin/export/organizations" download className={`${btn} border border-ink-300 bg-white text-ink-800 hover:bg-surface-hover`}>
            <Download size={15} aria-hidden />
            Export CSV
          </a>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`${btn} bg-brand-700 text-white hover:bg-brand-800`}>
            <Plus size={15} aria-hidden />
            Create organization
          </button>
        </div>
      </div>
      {open && (
        <div className="step-in">
          <ProvisionOrgForm onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
