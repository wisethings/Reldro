"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { ProvisionOrgForm } from "@/components/platform-admin/ProvisionOrgForm";
import { setDemoRequestStatus } from "@/lib/actions/platform-admin";
import type { DemoRequestStatus } from "@prisma/client";

const STATUS_TONE: Record<DemoRequestStatus, "neutral" | "brand" | "green" | "amber" | "red"> = {
  NEW: "amber",
  CONTACTED: "brand",
  CONVERTED: "green",
  DECLINED: "neutral",
};

export function DemoRequestRow({
  id,
  name,
  email,
  companyName,
  companySize,
  message,
  status,
  createdAt,
}: {
  id: string;
  name: string;
  email: string;
  companyName: string;
  companySize: string | null;
  message: string | null;
  status: DemoRequestStatus;
  createdAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink-900">{companyName}</p>
            <Badge tone={STATUS_TONE[status]}>{status.toLowerCase()}</Badge>
          </div>
          <p className="text-xs text-ink-500">
            {name} · {email} {companySize && `· ${companySize} employees`}
          </p>
          {message && <p className="mt-1 text-xs text-ink-600">"{message}"</p>}
          <p className="mt-1 text-[11px] text-ink-400">{createdAt}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {status === "NEW" && (
            <button
              onClick={() => startTransition(() => setDemoRequestStatus(id, "CONTACTED"))}
              disabled={pending}
              className="rounded-full border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 hover:border-brand-500"
            >
              Mark contacted
            </button>
          )}
          {status !== "CONVERTED" && status !== "DECLINED" && (
            <button
              onClick={() => startTransition(() => setDemoRequestStatus(id, "DECLINED"))}
              disabled={pending}
              className="rounded-full border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 hover:border-brand-500"
            >
              Decline
            </button>
          )}
          {status !== "CONVERTED" && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-full bg-brand-700 px-3 py-1 text-xs font-medium text-white hover:bg-brand-800"
            >
              {open ? "Cancel" : "Create workspace"}
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-4">
          <ProvisionOrgForm
            demoRequestId={id}
            defaultCompanyName={companyName}
            defaultAdminName={name}
            defaultAdminEmail={email}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
