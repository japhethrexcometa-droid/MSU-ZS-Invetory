"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import {
  fetchDashboardStats,
  fetchMonthlyBorrows,
  fetchCategoryDistribution,
  fetchStatusDistribution,
} from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart3,
  Loader2,
  TrendingUp,
  Package,
  ArrowLeftRight,
  Users,
  AlertTriangle,
  PhilippinePeso,
  Shield,
  Radio,
  Wrench,
  PieChart,
  Activity,
} from "lucide-react";
import { formatCurrency } from "@/lib/inventory";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7", "#06b6d4", "#f97316"];

export default function AnalyticsPage() {
  const { profile, loading: authLoading } = useUser();

  const [stats, setStats] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "logistics_officer";

  useEffect(() => {
    if (authLoading) return;
    const loadData = async () => {
      try {
        const [s, m, c, st] = await Promise.all([
          fetchDashboardStats(),
          fetchMonthlyBorrows(6),
          fetchCategoryDistribution(),
          fetchStatusDistribution(),
        ]);
        setStats(s);
        setMonthlyData(m);
        setCategoryData(c.slice(0, 10));
        setStatusData(st);
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [authLoading]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">Access Restricted</p>
          <p className="text-xs text-muted-foreground mt-1">Only Commandants and Administrators can view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          Analytics Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Key metrics and trends across the system
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats?.totalAssets || 0}</p>
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="text-[10px] text-muted-foreground">{formatCurrency(stats?.totalValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-accent shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats?.totalBorrows || 0}</p>
              <p className="text-xs text-muted-foreground">Total Borrows</p>
              <p className="text-[10px] text-muted-foreground">{stats?.activeBorrows || 0} active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-success shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="text-[10px] text-muted-foreground">{stats?.activeUsers || 0} active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-2xl font-bold">{(stats?.totalLostReports || 0) + (stats?.totalDamageReports || 0)}</p>
              <p className="text-xs text-muted-foreground">Incidents</p>
              <p className="text-[10px] text-muted-foreground">{stats?.totalLostReports || 0} lost</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Radio className="w-5 h-5 text-warning shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats?.radioCount || 0}</p>
              <p className="text-xs text-muted-foreground">Radios</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="w-5 h-5 text-secondary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{(stats?.scheduledMaintenance || 0) + (stats?.inProgressMaintenance || 0)}</p>
              <p className="text-xs text-muted-foreground">Maintenance Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <PhilippinePeso className="w-5 h-5 text-warning shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats?.pendingApprovals || 0}</p>
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="w-5 h-5 text-success shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats?.availableAssets || 0}</p>
              <p className="text-xs text-muted-foreground">Available Assets</p>
              <p className="text-[10px] text-muted-foreground">{((stats?.availableAssets / stats?.totalAssets) * 100 || 0).toFixed(0)}% of total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Borrow Trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Monthly Borrow Trend
            </CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="returned" fill="#22c55e" name="Returned" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" fill="#ef4444" name="Late" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Asset Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                    label={(entry: any) => `${entry.status}: ${entry.count}`}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={140} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Count">
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Borrow vs Return Summary */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm">Available Assets</span>
                </div>
                <span className="text-sm font-bold">{stats?.availableAssets || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-sm">Borrowed Assets</span>
                </div>
                <span className="text-sm font-bold">{stats?.borrowedAssets || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm">In Maintenance</span>
                </div>
                <span className="text-sm font-bold">{stats?.maintenanceAssets || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm">Lost Assets</span>
                </div>
                <span className="text-sm font-bold">{stats?.lostAssets || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-secondary" />
                  <span className="text-sm">Pending Borrows</span>
                </div>
                <span className="text-sm font-bold">{stats?.pendingBorrows || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
