import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");

  if (
    typeof tokenHash !== "string" ||
    !tokenHash ||
    type !== "recovery"
  ) {
    return NextResponse.redirect(
      new URL("/forgot-password?recovery=failed", request.url),
      303,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/forgot-password?recovery=failed", request.url),
      303,
    );
  }

  return NextResponse.redirect(
    new URL("/reset-password", request.url),
    303,
  );
}
