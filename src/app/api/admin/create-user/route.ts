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
        { error: "Only the Logistics Officer (S-4) can create accounts" },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { student_number, first_name, last_name, email, contact_number, role } = body;

    if (!student_number || !first_name || !last_name) {
      return NextResponse.json(
        { error: "Student ID, first name, and last name are required" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required to create an account" },
        { status: 400 }
      );
    }

    const validRole = role === "logistics_officer" ? "logistics_officer" : "rotc_officer";

    // 3. Create the user via service_role admin client using the ACTUAL email
    const adminSupabase = createAdminClient();

    const { data: authUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email: email.trim(),
      password: student_number.trim(), // Default password = Student ID
      email_confirm: true, // Auto-confirm (no email verification needed)
      user_metadata: {
        first_name,
        last_name,
        student_number: student_number.trim(),
        email: email.trim(),
        contact_number: contact_number || null,
      },
    });

    if (createError) throw createError;

    // 4. Auto-approve if creating a Logistics Officer (first admin flow)
    if (validRole === "logistics_officer" && authUser.user) {
      await (adminSupabase as any)
        .from("profiles")
        .update({
          role: "logistics_officer",
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", authUser.user.id);
    }

    return NextResponse.json({
      success: true,
      message: `Account created for ${first_name} ${last_name}`,
      user: {
        id: authUser.user?.id,
        student_number,
        role: validRole,
      },
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
