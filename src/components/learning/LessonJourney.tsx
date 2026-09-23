const STEPS = ["Concept", "Example", "Practice"] as const;

/** Lightweight inline-SVG stepper - same real-SVG approach as ScoreRing, not a static image. */
export function LessonJourney({ activeIndex }: { activeIndex: number }) {
  return (
    <svg viewBox="0 0 300 40" className="h-8 w-full max-w-xs" role="img" aria-label="Lesson steps: concept, example, practice">
      {STEPS.map((step, i) => {
        const cx = 30 + i * 120;
        const done = i < activeIndex;
        const active = i === activeIndex;
        const fill = done || active ? "#8A4A7E" : "#E6E1D3";
        const textFill = done || active ? "#2A0A0C" : "#8A8478";
        return (
          <g key={step}>
            {i > 0 && (
              <line x1={cx - 120 + 10} y1="10" x2={cx - 10} y2="10" stroke={i <= activeIndex ? "#8A4A7E" : "#E6E1D3"} strokeWidth="2" />
            )}
            <circle cx={cx} cy="10" r="6" fill={fill} />
            <text x={cx} y="30" textAnchor="middle" fontSize="9" fill={textFill} fontWeight={active ? 600 : 400}>
              {step}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
