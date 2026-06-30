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
    const { data: existingUser } = await adminSupabase.auth.admin.listUsers();

    const adminExists = existingUser?.users?.some(
      (u) => u.email === "admin@rotc.msuzs.local"
    );

    if (adminExists) {
      // Ensure the profile is correct
      const { data: existingProfile } = await (adminSupabase as any)
        .from("profiles")
        .select("id, role, is_approved")
        .eq("student_number", "admin")
        .single();

      if (!existingProfile) {
        // Find the user ID
        const adminUser = existingUser?.users?.find(
          (u) => u.email === "admin@rotc.msuzs.local"
        );
        if (adminUser) {
          await (adminSupabase as any).from("profiles").upsert({
            id: adminUser.id,
            student_number: "admin",
            first_name: "System",
            last_name: "Administrator",
            email: "admin@rotc.msuzs.local",
            role: "logistics_officer",
            is_approved: true,
            is_active: true,
            approved_at: new Date().toISOString(),
            created_at: adminUser.created_at,
            updated_at: new Date().toISOString(),
          });
        }
      } else if (!existingProfile.is_approved || existingProfile.role !== "logistics_officer") {
        await (adminSupabase as any)
          .from("profiles")
          .update({
            role: "logistics_officer",
            is_approved: true,
            is_active: true,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("student_number", "admin");
      }

      return NextResponse.json({
        success: true,
        message: "Admin account already exists — profile has been verified and corrected.",
        credentials: {
          student_id: "admin",
          password: "admin123",
        },
      });
    }

    // Create admin user via Supabase Admin API (proper flow)
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
      await (adminSupabase as any)
        .from("profiles")
        .update({
          role: "logistics_officer",
          is_approved: true,
          is_active: true,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);
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
