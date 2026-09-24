import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { destinationForRole } from "@/lib/auth/roleHome";

export default async function DashboardIndexPage() {
  const session = await requireSession();
  redirect(destinationForRole(session.role));
}
