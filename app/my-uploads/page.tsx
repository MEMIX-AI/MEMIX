import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Uploads management merged into the profile page's "All Assets" tab (see
// components/MyUploadCard.tsx) — this route now just forwards a signed-in
// wallet to its own profile instead of duplicating that UI.
export default async function MyUploadsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  redirect(`/u/${user.walletAddress}`);
}
