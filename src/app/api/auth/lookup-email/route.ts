import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lookupEmailSchema, validateOrThrow } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = validateOrThrow(lookupEmailSchema, body);
    const adminSupabase = createAdminClient();

    // Case 1: Look up email by student_number (for login)
    if (parsed.student_number) {
      const { data, error } = await (adminSupabase as any)
        .from("profiles")
        .select("email")
        .eq("student_number", body.student_number.trim())
        .maybeSingle();

      if (error) throw error;
      if (!data || !data.email) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ email: data.email });
    }

    // Case 2: Look up profile by user_id (for approval check after login)
    if (parsed.user_id) {
      const { data, error } = await (adminSupabase as any)
        .from("profiles")
        .select("is_approved, role, first_name, last_name, student_number")
        .eq("id", parsed.user_id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(data);
    }

    // Fallback (shouldn't reach here due to refine check, but guard just in case)
    return NextResponse.json(
      { error: "Provide student_number or user_id" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Lookup error:", error);
    return NextResponse.json(
      { error: "Failed to look up account" },
      { status: 500 }
    );
  }
}
