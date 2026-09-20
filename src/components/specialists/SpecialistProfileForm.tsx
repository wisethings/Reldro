"use client";

import { useActionState } from "react";
import { updateSpecialistProfile } from "@/lib/actions/specialist";
import type { Specialist } from "@prisma/client";

export function SpecialistProfileForm({ specialist }: { specialist: Specialist }) {
  const [state, formAction, pending] = useActionState(updateSpecialistProfile, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Profile updated.</p>}
      <div>
        <label className="block text-xs font-medium text-ink-600">Headline</label>
        <input
          name="headline"
          defaultValue={specialist.headline}
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Bio</label>
        <textarea
          name="bio"
          defaultValue={specialist.bio}
          rows={4}
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-600">Hourly rate ($)</label>
          <input
            name="hourlyRate"
            type="number"
            defaultValue={specialist.hourlyRate ?? ""}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Location</label>
          <input
            name="location"
            defaultValue={specialist.location ?? ""}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Availability</label>
        <select
          name="availability"
          defaultValue={specialist.availability}
          className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm"
        >
          <option>Available now</option>
          <option>2 weeks out</option>
          <option>Booked</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
