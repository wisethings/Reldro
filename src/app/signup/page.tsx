import { redirect } from "next/navigation";

// Reldro is sales-led: organizations are provisioned by a platform admin
// after a demo request, not through self-service signup. Keep this route
// alive as a redirect so old links/bookmarks land somewhere useful.
export default function SignupPage() {
  redirect("/demo");
}
