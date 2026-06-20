import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth";
import { LoginForm } from "@/components/auth/login-form";

/**
 * `/login` — Server Component.
 *
 * If the user already has a valid session, redirect to the dashboard
 * immediately (server-side, zero client JS). Otherwise delegate to the
 * `<LoginForm>` Client Component that handles `useActionState`, toasts,
 * and the post-login client-side redirect.
 */
export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
