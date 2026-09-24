"use client";

import { useState } from "react";

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Couldn't process that image."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageAttachField({ name, label }: { name: string; label: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setPending(true);
    try {
      const dataUri = await compressImage(file);
      setPreview(dataUri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't process that image.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      <p className="text-[11px] text-ink-400">Optional — a screenshot or diagram to illustrate this lesson.</p>
      <div className="mt-1 space-y-2">
        <input type="hidden" name={name} value={preview ?? ""} />
        {preview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Lesson attachment preview" className="max-h-40 rounded-lg border border-ink-200" />
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-xs text-white hover:bg-ink-700"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/*"
            disabled={pending}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-full file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-700 hover:file:bg-ink-200"
          />
        )}
        {pending && <p className="text-xs text-ink-400">Processing image…</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
