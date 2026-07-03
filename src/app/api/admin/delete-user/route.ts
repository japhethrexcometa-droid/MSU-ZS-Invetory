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
        { error: "Only the Logistics Officer (S-4) can delete users" },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 3. Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // 4. Deactivate the user via service_role admin client
    const adminSupabase = createAdminClient();

    // First check the user exists and get their info
    const { data: targetProfile, error: profileError } = await (adminSupabase as any)
      .from("profiles")
      .select("id, first_name, last_name, is_active, role")
      .eq("id", userId)
      .single();

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deleting another logistics officer
    if (targetProfile.role === "logistics_officer") {
      return NextResponse.json(
        { error: "Cannot delete another Logistics Officer (S-4)" },
        { status: 403 }
      );
    }

    // 5. Update profile to deactivate
    const { error: updateError } = await (adminSupabase as any)
      .from("profiles")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    // 6. Also revoke the user's auth sessions by updating their password to random
    // This ensures they can't log in even if they try to bypass the is_active check
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      { password: randomPassword }
    );

    if (authError) {
      console.error("Failed to revoke auth sessions:", authError);
      // Continue anyway - the profile deactivation is the main gate
    }

    return NextResponse.json({
      success: true,
      message: `${targetProfile.first_name} ${targetProfile.last_name} has been deactivated and can no longer log in.`,
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
