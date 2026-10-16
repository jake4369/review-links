import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
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

      {children}
    </div>
  );
}
