import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const adminSupabase = createAdminClient();

    // Case 1: Look up email by student_number (for login)
    if (body.student_number && typeof body.student_number === "string") {
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
    if (body.user_id && typeof body.user_id === "string") {
      const { data, error } = await (adminSupabase as any)
        .from("profiles")
        .select("is_approved, role, first_name, last_name, student_number")
        .eq("id", body.user_id)
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
