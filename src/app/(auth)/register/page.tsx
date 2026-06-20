import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth";
import { RegisterForm } from "@/components/auth/register-form";

/**
 * `/register` — Server Component.
 *
 * If the user already has a valid session, redirect to the dashboard
 * immediately (server-side, zero client JS). Otherwise delegate to the
 * `<RegisterForm>` Client Component.
 */
export default async function RegisterPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return <RegisterForm />;
}
