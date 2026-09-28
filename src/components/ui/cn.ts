import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * clsx alone just concatenates class strings - two conflicting utilities
 * (e.g. a shared component's own `px-3 py-2` and a caller's override
 * `py-1.5`) both end up in the class list, and which one actually wins
 * depends on Tailwind's generated CSS order, not the order they appear
 * here. twMerge resolves that deterministically (the later one in the
 * argument list wins), which matters once components accept a `className`
 * override on top of their own base styling.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
