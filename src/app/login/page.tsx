import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginClient } from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect(user.role === "manager" ? "/manager" : "/app");
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
