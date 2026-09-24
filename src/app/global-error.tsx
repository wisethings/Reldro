"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-ink-100 font-sans text-ink-900 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <div>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-ink-500">Please try again.</p>
          </div>
          <button
            onClick={() => reset()}
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
