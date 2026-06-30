import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ⚠️ ONE-TIME SEED ENDPOINT — No authentication required.
// After the admin account is created, DELETE or disable this file.
// Uses the Supabase Auth Admin API (no manual hashing).
// Student ID: admin  |  Password: admin123
// Email: japhethrex.cometa@msubuug.edu.ph (your real active email)
export async function GET() {
  try {
    const adminSupabase = createAdminClient();

    // Check if admin already exists in auth.users
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(
      (u: any) => u.email === "japhethrex.cometa@msubuug.edu.ph"
    );

    const createOrUpdateProfile = async (userId: string) => {
      // Upsert profile to ensure it exists with correct data
      const { error } = await (adminSupabase as any)
        .from("profiles")
        .upsert({
          id: userId,
          student_number: "admin",
          first_name: "System",
          last_name: "Administrator",
          email: "japhethrex.cometa@msubuug.edu.ph",
          role: "logistics_officer",
          is_approved: true,
          is_active: true,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
    };

    if (existingAuthUser) {
      // Delete the existing auth user entirely to get a clean slate
      const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(existingAuthUser.id);
      if (deleteError) throw deleteError;

      await (adminSupabase as any)
        .from("profiles")
        .delete()
        .eq("id", existingAuthUser.id);
    }

    // Create fresh auth user
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: "japhethrex.cometa@msubuug.edu.ph",
      password: "admin123",
      email_confirm: true,
      user_metadata: {
        first_name: "System",
        last_name: "Administrator",
        student_number: "admin",
        email: "japhethrex.cometa@msubuug.edu.ph",
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("User creation returned no user");

    // Explicitly confirm email (redundant with email_confirm above, but ensures it works)
    const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(
      data.user.id,
      { email_confirm: true }
    );
    if (confirmError) throw confirmError;

    // Create/update the profile
    await createOrUpdateProfile(data.user.id);

    return NextResponse.json({
      success: true,
      message: "✅ Logistics Officer (S-4) account created!",
      credentials: { student_id: "admin", password: "admin123" },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to setup admin account" },
      { status: 500 }
    );
  }
}
