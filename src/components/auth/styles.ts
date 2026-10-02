/** Sign-in controls: a light grey fill that turns white on focus, 10px corners, 44px tall, 150ms transitions. */
export const authLabel = "block text-[13px] font-medium leading-none text-ink-600";

export const authInput =
  "block h-11 w-full rounded-[10px] border border-oxblood/[0.12] bg-surface-muted px-3.5 text-[16px] text-ink-900 outline-none " +
  "transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-ink-300/80 sm:text-[15px] " +
  "hover:border-oxblood/25 focus:border-brand-500 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:bg-white aria-[invalid=true]:focus:ring-danger/15 disabled:cursor-not-allowed disabled:opacity-60";

export const authButton =
  "flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-brand-700 px-4 text-[15px] font-medium text-white " +
  "transition-[background-color,transform,opacity] duration-150 hover:bg-brand-800 active:translate-y-px active:bg-oxblood " +
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-700";
