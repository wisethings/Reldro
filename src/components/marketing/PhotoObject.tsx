const EDGE_CLASS = {
  right: "torn-right",
  bottom: "torn-bottom",
  left: "torn-left",
  none: "",
} as const;

const TONE_BG = {
  sage: "bg-sage",
  olive: "bg-olive-soft",
  orchid: "bg-orchid-soft",
  bone: "bg-bone",
  none: "",
} as const;

/**
 * Renders a portrait as a physical object placed on the page - an offset
 * color panel behind it (standing in for a paper backing), a torn edge on
 * one side instead of a rounded card corner, and an optional caption chip -
 * rather than a photo inside a bordered, shadowed "image card."
 */
export function PhotoObject({
  src,
  alt,
  edge = "right",
  rotate = "",
  tone = "sage",
  caption,
  className = "",
}: {
  src: string;
  alt: string;
  edge?: keyof typeof EDGE_CLASS;
  rotate?: string;
  tone?: keyof typeof TONE_BG;
  caption?: { name: string; role: string };
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {tone !== "none" && <div aria-hidden className={`absolute inset-0 translate-x-4 translate-y-4 ${TONE_BG[tone]}`} />}
      <div className={`relative overflow-hidden ${EDGE_CLASS[edge]} ${rotate}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
      {caption && (
        <div className="absolute -bottom-5 left-5 max-w-[calc(100%-2.5rem)] bg-white px-3.5 py-2 shadow-card sm:left-8">
          <p className="text-xs font-medium text-ink-900">{caption.name}</p>
          <p className="text-[11px] text-ink-500">{caption.role}</p>
        </div>
      )}
    </div>
  );
}
