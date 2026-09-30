import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_confirmation_link", request.url)
    );
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  });

  if (error) {
    console.error("Email verification failed:", error.message);

    return NextResponse.redirect(
      new URL("/login?error=verification_failed", request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/login?verified=true", request.url)
  );
}