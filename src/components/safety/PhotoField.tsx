"use client";

import { useRef, useState } from "react";

const MAX_DIMENSION = 1024;

function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that photo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like an image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Couldn't process that photo."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Up to 3 photos, downsized in the browser (fast on cellular). Submitted as repeated hidden inputs under `name`. */
export function PhotoField({ name = "attachment", label = "Add photos", max = 3 }: { name?: string; label?: string; max?: number }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files) return;
    setError(null);
    setBusy(true);
    try {
      const next = [...photos];
      for (const f of Array.from(files)) {
        if (next.length >= max) break;
        if (!f.type.startsWith("image/")) continue;
        next.push(await compress(f));
      }
      setPhotos(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {photos.map((p, i) => (
        <input key={i} type="hidden" name={name} value={p} />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-lg border border-ink-200 object-cover" />
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < max && (
          <>
            {/* A hidden input opened by a button: a visually-hidden focusable input makes the browser scroll the app frame when the picker opens. */}
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex h-20 min-w-[5rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-ink-300 px-3 text-center text-xs font-medium text-ink-600 hover:bg-ink-50 disabled:opacity-60"
            >
              {busy ? "Adding…" : label}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              tabIndex={-1}
              onChange={(e) => {
                void add(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
