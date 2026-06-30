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

    const promoteToAdmin = async (userId: string) => {
      const { error } = await (adminSupabase as any)
        .from("profiles")
        .update({
          role: "logistics_officer",
          is_approved: true,
          is_active: true,
          student_number: "admin",
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) throw error;
    };

    if (existingAuthUser) {
      // Admin auth user exists — promote profile
      await promoteToAdmin(existingAuthUser.id);
      return NextResponse.json({
        success: true,
        message: "✅ Your account is now Logistics Officer (S-4)!",
        credentials: { student_id: "admin", password: "admin123" },
      });
    }

    // Create fresh admin via Supabase Auth Admin API (no manual hashing)
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
    if (data.user) await promoteToAdmin(data.user.id);

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
