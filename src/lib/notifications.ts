import { createClient } from "@/lib/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export async function fetchUnreadNotifications(userId: string) {
  const supabase = createClient() as any;
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data as Notification[];
}

export async function markAsRead(notificationId: string) {
  const supabase = createClient() as any;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllAsRead(userId: string) {
  const supabase = createClient() as any;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}

export async function notifyAdmin(params: {
  title: string;
  message: string;
  type?: string;
  reference_type?: string;
  reference_id?: string;
}) {
  const supabase = createClient() as any;
  
  // Find logistics officers
  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "logistics_officer")
    .eq("is_active", true);

  if (adminError) throw adminError;
  if (!admins || admins.length === 0) return;

  const notifications = admins.map((admin: any) => ({
    user_id: admin.id,
    title: params.title,
    message: params.message,
    type: params.type || 'system',
    reference_type: params.reference_type || null,
    reference_id: params.reference_id || null,
    is_read: false
  }));

  const { error } = await supabase
    .from("notifications")
    .insert(notifications);

  if (error) throw error;
}
