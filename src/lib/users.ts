import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import {
  updateUserSchema,
  approveUserSchema,
  createOfficerAccountSchema,
  resetPasswordSchema,
  validateOrThrow,
} from "@/lib/validations";

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

export async function updateUser(id: string, raw: Record<string, unknown>) {
  const data = validateOrThrow(updateUserSchema, raw);
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
  validateOrThrow(approveUserSchema, { id, approvedById });
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

/**
 * Reject a pending user — sets is_active to false so they show as "Rejected"
 * and cannot log in. The admin can still reactivate them later if needed.
 */
export async function rejectUser(id: string) {
  if (!id) throw new Error("User ID is required");
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("profiles")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Permanently delete/deactivate a user via the server API.
 * This uses service_role to also revoke auth sessions.
 */
export async function deleteUser(userId: string) {
  if (!userId) throw new Error("User ID is required");
  const supabase = createClient();

  const response = await fetch("/api/admin/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to delete user");
  return result;
}

export async function fetchUsersStats() {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("role, is_active, is_approved");

  if (error) throw error;

  const users: Array<{ role: string; is_active: boolean; is_approved: boolean }> = data || [];

  const logisticsOfficers = users.filter((u) => u.role === "logistics_officer");
  const rotcOfficers = users.filter((u) => u.role === "rotc_officer");

  return {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    pendingApproval: users.filter((u) => !u.is_approved && u.is_active).length,
    rejected: users.filter((u) => !u.is_approved && !u.is_active).length,
    deactivated: users.filter((u) => u.is_approved && !u.is_active).length,
    approved: users.filter((u) => u.is_approved).length,
    logistics_officer: logisticsOfficers.length,
    rotc_officer: rotcOfficers.length,
  };
}

export async function createOfficerAccount(raw: Record<string, unknown>) {
  const data = validateOrThrow(createOfficerAccountSchema, raw);
  const supabase = createClient();

  // Create via server API route (needs service_role)
  const response = await fetch("/api/admin/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to create account");
  return result;
}

export async function resetUserPassword(userId: string, studentNumber: string) {
  validateOrThrow(resetPasswordSchema, { userId, password: studentNumber });
  const supabase = createClient();

  const response = await fetch("/api/admin/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password: studentNumber }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to reset password");
  return result;
}

export const USER_ROLE_CONFIG: Record<string, { label: string; description: string; color: string }> = {
  logistics_officer: {
    label: "Logistics Officer (S-4)",
    description: "Full system access — manage users, inventory, settings, and approvals",
    color: "destructive",
  },
  rotc_officer: {
    label: "ROTC Officer",
    description: "Borrow equipment, report issues, view inventory",
    color: "default",
  },
};
