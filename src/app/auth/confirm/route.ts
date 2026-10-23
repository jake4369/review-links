import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "email") {
    return NextResponse.redirect(
      new URL("/login?confirmation=failed", request.url),
    );
  }

  const target = new URL("/confirm-email", request.url);
  target.searchParams.set("token_hash", tokenHash);
  target.searchParams.set("type", "email");

  return NextResponse.redirect(target);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");

  if (
    typeof tokenHash !== "string" ||
    !tokenHash ||
    type !== "email"
  ) {
    return NextResponse.redirect(
      new URL("/login?confirmation=failed", request.url),
      303,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/login?confirmation=failed", request.url),
      303,
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard", request.url),
    303,
  );
}
