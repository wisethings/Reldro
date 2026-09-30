"use client";

import { useMemo } from "react";
import { Combobox } from "./Combobox";
import { controlClass } from "./controls";

export type PersonOpt = { id: string; name: string; hint?: string };

type CommonProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

/**
 * Every "choose a person" field in the product. A searchable picker (type a name or a job title), never a long list, with an
 * optional first choice such as "Anyone at the site" or "Nobody" pinned at the top.
 */
export function PersonSelect({ people, emptyLabel, placeholder = "Choose a person…", ...rest }: CommonProps & { people: PersonOpt[]; emptyLabel?: string; placeholder?: string }) {
  const options = useMemo(() => people.map((p) => ({ value: p.id, label: p.name, hint: p.hint })), [people]);
  const pinned = useMemo(() => (emptyLabel ? [{ value: "", label: emptyLabel }] : []), [emptyLabel]);
  return <Combobox {...rest} options={options} pinned={pinned} placeholder={placeholder} noun="person" searchPlaceholder="Search by name or job title" />;
}

const NATIVE_LIMIT = 12;

/**
 * For other lists (sites, crews, qualification types): a normal select while the list is short (best on phones), a searchable
 * picker once it could get long.
 */
export function AdaptiveSelect({
  options,
  emptyLabel,
  pinned: pinnedProp,
  placeholder,
  noun = "option",
  variant = "field",
  alwaysSearch = false,
  ...rest
}: CommonProps & { options: { value: string; label: string; hint?: string }[]; emptyLabel?: string; /** Fixed choices shown first (overrides emptyLabel). */ pinned?: { value: string; label: string }[]; placeholder?: string; noun?: string; variant?: "field" | "toolbar" | "bare"; alwaysSearch?: boolean }) {
  const pinned = useMemo(() => pinnedProp ?? (emptyLabel ? [{ value: "", label: emptyLabel }] : []), [pinnedProp, emptyLabel]);
  if (alwaysSearch || options.length > NATIVE_LIMIT) {
    return <Combobox {...rest} options={options} pinned={pinned} placeholder={placeholder} noun={noun} variant={variant} />;
  }
  const { value, defaultValue, onChange, className = "", ...native } = rest;
  const shape =
    variant === "bare" ? "min-w-0 flex-1 truncate bg-transparent py-1 pl-2 text-base sm:text-xs text-ink-800 outline-none focus:bg-surface-muted disabled:opacity-60"
    : variant === "toolbar" ? "h-10 min-w-0 rounded-lg border border-ink-300 bg-white px-2 text-base text-ink-800 outline-none hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 md:h-8 md:text-xs"
    : controlClass;
  return (
    <select
      {...native}
      {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? "" })}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={`${shape} ${className}`}
    >
      {pinned.length > 0 ? pinned.map((o) => <option key={`p${o.value}`} value={o.value}>{o.label}</option>) : placeholder ? <option value="" disabled={native.required}>{placeholder}</option> : null}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
