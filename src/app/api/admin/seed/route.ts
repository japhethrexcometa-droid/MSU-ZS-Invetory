import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ⚠️ ONE-TIME SEED ENDPOINT — No authentication required
// After the admin account is successfully created, DELETE or comment out this file!
// Student ID: admin, Password: admin123
// This uses the proper Supabase Admin API (not raw SQL) to avoid trigger issues.
export async function GET() {
  try {
    const adminSupabase = createAdminClient();

    // Check if admin already exists
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(
      (u) => u.email === "admin@rotc.msuzs.local"
    );

    if (existingAdmin) {
      // Delete the old user completely — password hash from raw SQL is incompatible
      await adminSupabase.auth.admin.deleteUser(existingAdmin.id);

      // Also clean up any orphaned profile
      await (adminSupabase as any)
        .from("profiles")
        .delete()
        .eq("id", existingAdmin.id);
    }

    // Create fresh admin user via Supabase Admin API (proper password hashing)
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: "admin@rotc.msuzs.local",
      password: "admin123",
      email_confirm: true,
      user_metadata: {
        first_name: "System",
        last_name: "Administrator",
        student_number: "admin",
      },
    });

    if (error) throw error;

    if (data.user) {
      // Update the profile to Logistics Officer with full access
      const { error: updateError } = await (adminSupabase as any)
        .from("profiles")
        .update({
          role: "logistics_officer",
          is_approved: true,
          is_active: true,
          approved_at: new Date().toISOString(),
          student_number: "admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "✅ Logistics Officer (S-4) account created!",
      credentials: {
        student_id: "admin",
        password: "admin123",
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to seed admin account" },
      { status: 500 }
    );
  }
}
