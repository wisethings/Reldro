import { loginAsDemo } from "@/lib/actions/demo";

const demoAccounts = [
  { email: "admin@havenbrook.com", label: "Company admin", desc: "CIO, Havenbrook" },
  { email: "priya.shah@havenbrook.com", label: "Employee", desc: "Marketing manager" },
  { email: "maya@reldro-specialists.com", label: "AI specialist", desc: "Expert-help specialist" },
  { email: "platform@reldro.com", label: "Platform admin", desc: "Reldro internal admin" },
];

export function DemoLoginPanel() {
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4">
      <p className="text-xs font-medium text-ink-600">Explore with demo data</p>
      <p className="mt-0.5 text-xs text-ink-500">
        Skip credentials and see Reldro populated with a realistic organization.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {demoAccounts.map((acc) => (
          <form key={acc.email} action={loginAsDemo.bind(null, acc.email)}>
            <button
              type="submit"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-left text-xs hover:border-brand-400 hover:bg-brand-50"
            >
              <span className="block font-medium text-ink-800">{acc.label}</span>
              <span className="block text-ink-500">{acc.desc}</span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
