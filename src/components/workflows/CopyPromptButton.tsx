"use client";

import { useState, useTransition } from "react";
import { logTemplateCopy } from "@/lib/actions/templates";
import { cn } from "@/components/ui/cn";

export function CopyPromptButton({
  prompt,
  workflowStepId,
  className,
}: {
  prompt: string;
  workflowStepId: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  function handleCopy() {
    navigator.clipboard?.writeText(prompt).catch(() => {});
    setCopied(true);
    startTransition(() => {
      logTemplateCopy(workflowStepId);
    });
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "shrink-0 rounded-full border border-ink-300 px-2.5 py-1 text-[11px] font-medium text-ink-700 hover:bg-surface-sunken",
        copied && "border-sage-deep text-sage-deep",
        className
      )}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
