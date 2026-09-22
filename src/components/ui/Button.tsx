import Link from "next/link";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-oxblood text-ink-inverse hover:bg-[#45181B] border border-transparent",
  secondary: "bg-white text-ink-900 hover:bg-surface-sunken border border-ink-300",
  accent: "bg-coral text-oxblood hover:brightness-95 border border-transparent",
  ghost: "bg-transparent text-ink-900 hover:bg-surface-sunken border border-transparent",
  danger: "bg-danger text-white hover:brightness-95 border border-danger",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-4 py-1.5 rounded-full",
  md: "text-sm px-5 py-2 rounded-full",
  lg: "text-sm px-6 py-2.5 rounded-full",
};

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orchid-deep",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: BaseProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orchid-deep",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </Link>
  );
}
