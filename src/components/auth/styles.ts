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

/** Surface used by the quieter public pages (sign-in, case-code lookup). */
export const authCard = "rounded-[14px] border border-oxblood/[0.09] bg-white shadow-[0_1px_2px_rgba(42,10,12,0.04)]";

/** Secondary guidance under a control. */
export const authHint = "text-[13px] leading-[1.45] text-ink-500";

/** 48px primary button for the longer public forms; a light neutral fill when it cannot be used yet. */
export const authButtonLg =
  "flex h-[48px] w-full items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-medium " +
  "transition-[background-color,color,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 " +
  "bg-brand-700 text-white hover:bg-brand-800 active:translate-y-px active:bg-oxblood " +
  "disabled:cursor-not-allowed disabled:hover:bg-brand-700 disabled:active:translate-y-0";
export const authButtonIdle = "!bg-ink-100 !text-ink-400 hover:!bg-ink-100";
