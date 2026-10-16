import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  // Verify the authenticated user's JWT.
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  return (
    <div>
      {/* Account navigation */}
      <nav className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">
            ReviewBranch
          </span>

          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-slate-600 transition hover:text-red-600"
            >
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      {children}
    </div>
  );
}
