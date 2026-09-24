import { toEmbedUrl } from "@/lib/videoEmbed";

export function StepMedia({ imageUrl, videoUrl, title }: { imageUrl: string | null; videoUrl: string | null; title: string }) {
  if (!imageUrl && !videoUrl) return null;
  const embedUrl = videoUrl ? toEmbedUrl(videoUrl) : null;

  return (
    <div className="mt-2 space-y-2">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="max-h-64 w-full rounded-lg border border-ink-200 object-cover" />
      )}
      {videoUrl &&
        (embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-ink-200">
            <iframe src={embedUrl} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={title} />
          </div>
        ) : (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-ink-200 px-4 py-2.5 text-xs font-medium text-orchid-deep hover:bg-ink-50"
          >
            Watch video ↗
          </a>
        ))}
    </div>
  );
}
