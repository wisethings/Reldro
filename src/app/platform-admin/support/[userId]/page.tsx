import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { markSupportReadByStaff } from "@/lib/actions/support";
import { SupportReplyForm } from "@/components/platform-admin/SupportReplyForm";

export const dynamic = "force-dynamic";

export default async function SupportThreadPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, organization: { select: { name: true, isDemo: true } } } });
  if (!user) notFound();
  await markSupportReadByStaff(userId);
  const messages = await prisma.supportMessage.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, take: 300 });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/platform-admin/support" className="inline-flex items-center gap-1 text-xs font-medium text-orchid-deep hover:text-oxblood"><ChevronLeft size={14} aria-hidden /> Support inbox</Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{user.name}</h1>
        <p className="text-sm text-ink-500">{user.organization?.name ?? "No organization"} · {user.email}{user.organization?.isDemo ? " · Sample workspace" : ""}</p>
      </div>
      <div className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
        {messages.length === 0 && <p className="text-sm text-ink-500">No messages.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.fromStaff ? "items-end" : "items-start"}`}>
            <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${m.fromStaff ? "rounded-br-md bg-orchid-soft text-ink-900" : "rounded-bl-md bg-ink-50 text-ink-900 ring-1 ring-ink-200"}`}>{m.body}</p>
            <span className="mt-0.5 px-1 text-xs text-ink-500">{m.fromStaff ? m.senderName : user.name} · {m.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC</span>
          </div>
        ))}
      </div>
      <SupportReplyForm userId={userId} />
    </div>
  );
}
