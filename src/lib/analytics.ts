import { createClient } from "@/lib/supabase/client";

export async function fetchDashboardStats() {
  const supabase = createClient();

  // Fetch all data in parallel
  const [assetsRes, borrowsRes, profilesRes, lostRes, damageRes, maintenanceRes] = await Promise.all([
    (supabase as any).from("assets").select("id, status, condition, is_radio, purchase_cost").eq("is_deleted", false),
    (supabase as any).from("borrow_transactions").select("id, status").eq("is_deleted", false),
    (supabase as any).from("profiles").select("id, role, is_active, is_approved"),
    (supabase as any).from("lost_reports").select("id"),
    (supabase as any).from("damage_reports").select("id"),
    (supabase as any).from("maintenance_records").select("id, status"),
  ]);

  const assets = assetsRes.data || [];
  const borrows = borrowsRes.data || [];
  const profiles = profilesRes.data || [];
  const lost = lostRes.data || [];
  const damage = damageRes.data || [];
  const maintenance = maintenanceRes.data || [];

  const totalValue = assets.reduce(
    (sum: number, a: any) => sum + (a.purchase_cost || 0),
    0
  );

  return {
    // Assets
    totalAssets: assets.length,
    availableAssets: assets.filter((a: any) => a.status === "available").length,
    borrowedAssets: assets.filter((a: any) => a.status === "borrowed").length,
    maintenanceAssets: assets.filter((a: any) => a.status === "maintenance").length,
    lostAssets: assets.filter((a: any) => a.status === "lost").length,
    totalValue,
    radioCount: assets.filter((a: any) => a.is_radio).length,

    // Borrows
    totalBorrows: borrows.length,
    pendingBorrows: borrows.filter((b: any) => b.status === "pending").length,
    activeBorrows: borrows.filter((b: any) => ["approved", "released"].includes(b.status)).length,
    completedBorrows: borrows.filter((b: any) => ["returned", "late"].includes(b.status)).length,

    // Users
    totalUsers: profiles.length,
    activeUsers: profiles.filter((p: any) => p.is_active).length,
    pendingApprovals: profiles.filter((p: any) => !p.is_approved).length,

    // Reports
    totalLostReports: lost.length,
    totalDamageReports: damage.length,

    // Maintenance
    scheduledMaintenance: maintenance.filter((m: any) => m.status === "scheduled").length,
    inProgressMaintenance: maintenance.filter((m: any) => m.status === "in_progress").length,
  };
}

export async function fetchMonthlyBorrows(months = 6) {
  const supabase = createClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data, error } = await (supabase as any)
    .from("borrow_transactions")
    .select("created_at, status")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Group by month
  const monthly: Record<string, { total: number; returned: number; late: number }> = {};

  for (const txn of data || []) {
    const month = new Date(txn.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
    if (!monthly[month]) {
      monthly[month] = { total: 0, returned: 0, late: 0 };
    }
    monthly[month].total++;
    if (txn.status === "returned") monthly[month].returned++;
    if (txn.status === "late") monthly[month].late++;
  }

  return Object.entries(monthly).map(([month, counts]) => ({
    month,
    ...counts,
  }));
}

export async function fetchCategoryDistribution() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("assets")
    .select("category:category_id(name)")
    .eq("is_deleted", false);

  if (error) throw error;

  const distribution: Record<string, number> = {};
  for (const item of (data || []) as any[]) {
    const name = item.category?.name || "Uncategorized";
    distribution[name] = (distribution[name] || 0) + 1;
  }

  return Object.entries(distribution)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function fetchStatusDistribution() {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("assets")
    .select("status")
    .eq("is_deleted", false);

  if (error) throw error;

  const distribution: Record<string, number> = {};
  for (const item of data || []) {
    distribution[item.status] = (distribution[item.status] || 0) + 1;
  }

  return Object.entries(distribution)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}
