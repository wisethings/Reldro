"use client";

import { useEffect, useRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { controlClass } from "./Field";
import { cn } from "./cn";

/** A textarea that starts at a small, deliberate height and grows with what is typed, up to `maxRows`. */
export function AutoTextarea({ minRows = 3, maxRows = 14, className, onChange, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number; maxRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, line * minRows + 14), line * maxRows + 14)}px`;
  };
  useEffect(fit, [rest.value, minRows, maxRows]);
  return <textarea ref={ref} rows={minRows} {...rest} onChange={(e) => { onChange?.(e); fit(); }} className={cn(controlClass, "resize-none leading-relaxed", className)} />;
}
