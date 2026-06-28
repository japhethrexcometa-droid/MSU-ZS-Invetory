"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { fetchDashboardStats, fetchMonthlyBorrows } from "@/lib/analytics";
import { formatCurrency } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Users,
  AlertTriangle,
  Loader2,
  Radio,
  TrendingUp,
  Activity,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();
  const supabase = createClient();

  const [stats, setStats] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingBorrows, setPendingBorrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const loadDashboard = async () => {
      try {
        const [s, m] = await Promise.all([
          fetchDashboardStats(),
          fetchMonthlyBorrows(6),
        ]);
        setStats(s);
        setMonthlyData(m);

        // Recent activity
        const { data: activity } = await (supabase as any)
          .from("activity_log")
          .select("*, user:user_id(first_name, last_name, role)")
          .order("created_at", { ascending: false })
          .limit(10);
        setRecentActivity(activity || []);

        // Pending borrows
        const { data: pending } = await (supabase as any)
          .from("borrow_transactions")
          .select("*, borrower:borrower_id(first_name, last_name), asset:asset_id(item_name)")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);
        setPendingBorrows(pending || []);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [authLoading, supabase]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {profile?.first_name} — here&apos;s your ROTC Unit overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {profile?.role?.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/inventory" className="block">
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalAssets || 0}</p>
                <p className="text-xs text-muted-foreground">Total Assets</p>
                <p className="text-[10px] text-muted-foreground">{stats?.availableAssets || 0} available</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/borrow" className="block">
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalBorrows || 0}</p>
                <p className="text-xs text-muted-foreground">Borrow Transactions</p>
                <p className="text-[10px] text-muted-foreground">{stats?.activeBorrows || 0} active</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/users" className="block">
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Registered Users</p>
                <p className="text-[10px] text-muted-foreground">{stats?.pendingApprovals || 0} pending approval</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/radios" className="block">
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.radioCount || 0}</p>
                <p className="text-xs text-muted-foreground">Radio Equipment</p>
                <p className="text-[10px] text-muted-foreground">Tracked items</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Second Row - Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            <div>
              <p className="text-lg font-bold">{stats?.availableAssets || 0}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-accent shrink-0" />
            <div>
              <p className="text-lg font-bold">{stats?.borrowedAssets || 0}</p>
              <p className="text-xs text-muted-foreground">Borrowed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="w-5 h-5 text-warning shrink-0" />
            <div>
              <p className="text-lg font-bold">{stats?.maintenanceAssets || 0}</p>
              <p className="text-xs text-muted-foreground">Maintenance</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-lg font-bold">{stats?.lostAssets || 0}</p>
              <p className="text-xs text-muted-foreground">Lost</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Borrow Trend (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="returned" fill="#22c55e" name="Returned" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals & Alerts */}
        <div className="space-y-4">
          {/* Pending Borrows */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" />
                Pending Requests
                {pendingBorrows.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">{pendingBorrows.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingBorrows.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No pending requests</p>
              ) : (
                pendingBorrows.slice(0, 4).map((pb: any) => (
                  <div
                    key={pb.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/borrow/${pb.id}`)}
                  >
                    <div>
                      <p className="text-xs font-medium">{pb.asset?.item_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {pb.borrower?.first_name} {pb.borrower?.last_name}
                      </p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                ))
              )}
              {pendingBorrows.length > 0 && (
                <Link href="/dashboard/borrow" className="block text-xs text-primary text-center pt-1 hover:underline">
                  View all borrows
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Asset Value</span>
                <span className="text-sm font-bold">{formatCurrency(stats?.totalValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pending Approvals</span>
                <span className="text-sm font-bold">{stats?.pendingApprovals || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Incidents (Lost/Damaged)</span>
                <span className="text-sm font-bold">{(stats?.totalLostReports || 0) + (stats?.totalDamageReports || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Scheduled Maintenance</span>
                <span className="text-sm font-bold">{stats?.scheduledMaintenance || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Activity
            </CardTitle>
            <Link href="/dashboard/audit-log">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No recent activity recorded
            </p>
          ) : (
            <div className="space-y-0">
              {recentActivity.map((act: any) => (
                <div
                  key={act.id}
                  className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    act.activity_type === "created" ? "bg-success" :
                    act.activity_type === "borrowed" || act.activity_type === "returned" ? "bg-accent" :
                    act.activity_type === "lost" || act.activity_type === "damaged" ? "bg-destructive" :
                    "bg-primary"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      <span className="font-medium">
                        {act.user?.first_name} {act.user?.last_name}
                      </span>
                      <span className="text-muted-foreground"> {act.activity_type} </span>
                      <span className="font-medium">{act.description}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(act.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
