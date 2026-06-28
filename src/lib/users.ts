import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export async function fetchUsers(params: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = createClient();
  const { search, role, status, page = 1, pageSize = 20 } = params;

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%,officer_id.ilike.%${search}%`
    );
  }
  if (role) query = query.eq("role", role);
  if (status === "approved") query = query.eq("is_approved", true);
  if (status === "pending") query = query.eq("is_approved", false);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as unknown as Profile[], count: count || 0 };
}

export async function fetchUserById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Profile;
}

export async function updateUser(
  id: string,
  data: Partial<{
    role: string;
    is_active: boolean;
    is_approved: boolean;
    approved_by: string;
    first_name: string;
    last_name: string;
    contact_number: string;
  }>
) {
  const supabase = createClient();
  const { data: user, error } = await (supabase as any)
    .from("profiles")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return user;
}

export async function approveUser(id: string, approvedById: string) {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("profiles")
    .update({
      is_approved: true,
      approved_by: approvedById,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUsersStats() {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("role, is_active, is_approved");

  if (error) throw error;

  const users: Array<{ role: string; is_active: boolean; is_approved: boolean }> = data || [];

  return {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    pendingApproval: users.filter((u) => !u.is_approved).length,
    officers: users.filter(
      (u) =>
        u.role !== "student_cadet" && u.role !== "system_administrator"
    ).length,
    cadets: users.filter((u) => u.role === "student_cadet").length,
    admins: users.filter((u) => u.role === "system_administrator").length,
  };
}

export const USER_ROLE_CONFIG: Record<string, { label: string; description: string }> = {
  system_administrator: { label: "System Administrator", description: "Full system access" },
  rotc_commandant: { label: "ROTC Commandant", description: "Oversee all operations" },
  supply_officer: { label: "Supply Officer", description: "Manage inventory and supplies" },
  logistics_officer: { label: "Logistics Officer", description: "Handle logistics" },
  property_custodian: { label: "Property Custodian", description: "Manage property records" },
  rotc_officer: { label: "ROTC Officer", description: "Approve borrow requests" },
  student_cadet: { label: "Student Cadet", description: "Borrow equipment" },
};
