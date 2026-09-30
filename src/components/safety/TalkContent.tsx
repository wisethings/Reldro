/**
 * Talk text is stored as plain lines ("Why it matters", "Key points", bullets, and so on). This gives it structure on
 * screen: quiet small-caps section labels, comfortable paragraphs and tidy bullet lists, in a readable column.
 */
type Block = { heading: string | null; paragraphs: string[]; bullets: string[] };

const isHeading = (line: string, hasMore: boolean) => hasMore && line.length <= 32 && !/[.:!?]$/.test(line.trim()) && !/^[•\-*]\s/.test(line.trim());

export function parseTalk(content: string): Block[] {
  return content
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((raw) => raw.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0))
    .filter((lines) => lines.length > 0)
    .map((lines) => {
      const heading = isHeading(lines[0], lines.length > 1) ? lines[0].trim() : null;
      const body = heading ? lines.slice(1) : lines;
      const bullets = body.filter((l) => /^\s*[•\-*]\s+/.test(l)).map((l) => l.replace(/^\s*[•\-*]\s+/, ""));
      const paragraphs = body.filter((l) => !/^\s*[•\-*]\s+/.test(l)).map((l) => l.trim());
      return { heading, paragraphs, bullets };
    });
}

export function TalkContent({ content }: { content: string }) {
  const blocks = parseTalk(content);
  return (
    <div className="space-y-3.5">
      {blocks.map((b, i) => (
        <section key={i}>
          {b.heading && <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">{b.heading}</h3>}
          {b.paragraphs.map((p, j) => (
            <p key={j} className={`text-sm leading-relaxed ${/^sign-off/i.test(p) ? "mt-1 text-ink-600" : "text-ink-800"}`}>{p}</p>
          ))}
          {b.bullets.length > 0 && (
            <ul className="mt-0.5 space-y-1 text-sm leading-relaxed text-ink-800">
              {b.bullets.map((t, j) => (
                <li key={j} className="flex gap-2.5"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-400" />{t}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
