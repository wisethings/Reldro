import { redirect } from "next/navigation";

// Reldro no longer has a public marketing site in this app - it's the
// product only. Anyone hitting the bare domain lands on login.
export default function RootPage() {
  redirect("/login");
}
