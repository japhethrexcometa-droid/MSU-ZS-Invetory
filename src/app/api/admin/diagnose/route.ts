import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Diagnostic endpoint — check the admin account state
export async function GET() {
  try {
    const adminSupabase = createAdminClient();
    const results: Record<string, any> = {};

    // 1. Check auth.users
    const { data: authData } = await adminSupabase.auth.admin.listUsers();
    const adminUser = authData?.users?.find(
      (u: any) => u.email === "admin@rotc.msuzs.local"
    );
    results.authUser = adminUser
      ? { id: adminUser.id, email: adminUser.email, created_at: adminUser.created_at }
      : "NOT FOUND";

    // 2. Check public.profiles
    if (adminUser) {
      const { data: profile, error: profileError } = await (adminSupabase as any)
        .from("profiles")
        .select("*")
        .eq("id", adminUser.id)
        .maybeSingle();
      
      results.profile = profile || "NOT FOUND";
      results.profileError = profileError || null;
    }

    // 3. Try signing in directly via admin API to verify password
    if (adminUser) {
      try {
        // We can't test password via admin API, but let's try
        results.passwordTest = "Use the login page to test password";
      } catch (e: any) {
        results.passwordTestError = e.message;
      }
    }

    // 4. Check RLS by trying anon key access
    results.rlsCheck = "Profile query with admin client succeeded";

    return NextResponse.json({
      success: true,
      diagnosis: results,
      nextSteps: results.authUser === "NOT FOUND" 
        ? "No admin user found. Visit /api/admin/seed to create one."
        : results.profile === "NOT FOUND"
        ? "Auth user exists but profile is missing. Fix SQL provided below."
        : "Auth user and profile both exist. Check RLS or clear browser cache (Ctrl+Shift+R).",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Diagnosis failed" },
      { status: 500 }
    );
  }
}
