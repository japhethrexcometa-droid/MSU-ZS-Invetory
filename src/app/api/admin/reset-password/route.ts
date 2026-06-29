import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // 1. Verify the requester is a Logistics Officer
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "logistics_officer") {
      return NextResponse.json(
        { error: "Only the Logistics Officer (S-4) can reset passwords" },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json(
        { error: "User ID and new password are required" },
        { status: 400 }
      );
    }

    // 3. Update the password via service_role admin client
    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: "Password has been reset to the user's Student ID",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
