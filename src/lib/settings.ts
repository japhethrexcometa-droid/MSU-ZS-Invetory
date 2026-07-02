import { createClient } from "@/lib/supabase/client";
import type { SystemSetting } from "@/types/database";
import {
  updateSettingSchema,
  createSettingSchema,
  logActivitySchema,
  validateOrThrow,
} from "@/lib/validations";

export async function fetchSettings() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .order("key");

  if (error) throw error;
  return data as unknown as SystemSetting[];
}

export async function fetchSetting(key: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("key", key)
    .single();

  if (error) throw error;
  return data as unknown as SystemSetting;
}

export async function updateSetting(key: string, value: unknown, updatedBy?: string) {
  validateOrThrow(updateSettingSchema, { key, value, updatedBy });
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("system_settings")
    .update({
      value: typeof value === "string" ? value : JSON.stringify(value),
      updated_by: updatedBy || null,
    })
    .eq("key", key)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as SystemSetting;
}

export async function createSetting(raw: Record<string, unknown>) {
  const data = validateOrThrow(createSettingSchema, raw);
  const supabase = createClient();
  const { data: setting, error } = await (supabase as any)
    .from("system_settings")
    .insert({
      key: data.key,
      value: typeof data.value === "string" ? data.value : JSON.stringify(data.value),
      description: data.description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return setting as unknown as SystemSetting;
}

// ─── Activity Log ─────────────────────────────────────────

export async function fetchActivityLog(limit = 50) {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("activity_log")
    .select(
      `
      *,
      user:user_id(id, first_name, last_name, role, profile_image)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function logActivity(raw: Record<string, unknown>) {
  const data = validateOrThrow(logActivitySchema, raw);
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("activity_log")
    .insert({
      user_id: data.user_id,
      activity_type: data.activity_type,
      description: data.description,
      reference_type: data.reference_type || null,
      reference_id: data.reference_id || null,
      metadata: data.metadata || null,
    });

  if (error) throw error;
}
