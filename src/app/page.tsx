import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  redirect(user.role === "manager" ? "/manager" : "/app");
}
