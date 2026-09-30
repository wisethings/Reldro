/** The loading indicator. Sizes itself to the surrounding text (1em-ish) and takes the text colour. */
export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`spinner ${className}`} />;
}
