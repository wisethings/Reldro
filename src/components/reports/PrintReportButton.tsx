"use client";

export function PrintReportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
    >
      Download as PDF
    </button>
  );
}
