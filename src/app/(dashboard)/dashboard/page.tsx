"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import {
  Package,
  ClipboardList,
  AlertTriangle,
  Wrench,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Radio,
  Clock,
  CheckCircle2,
  Loader2,
  Shield,
  Activity,
  BarChart3,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Stat card component
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
  variant = "default",
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  variant?: "default" | "success" | "warning" | "destructive" | "accent";
}) {
  const variants = {
    default: "from-primary/10 to-transparent border-primary/20",
    success: "from-success/10 to-transparent border-success/20",
    warning: "from-warning/10 to-transparent border-warning/20",
    destructive: "from-destructive/10 to-transparent border-destructive/20",
    accent: "from-accent/10 to-transparent border-accent/20",
  };

  const iconVariants = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    accent: "text-accent",
  };

  return (
    <Card className="relative overflow-hidden border-border/50 transition-all duration-200 hover:shadow-md hover:border-border/80 group">
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          variants[variant]
        )}
      />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {(description || trend) && (
              <div className="flex items-center gap-2">
                {trend && (
                  <span
                    className={cn(
                      "inline-flex items-center text-xs font-medium",
                      trendUp ? "text-success" : "text-destructive"
                    )}
                  >
                    {trendUp ? (
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                    )}
                    {trend}
                  </span>
                )}
                {description && (
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              "p-3 rounded-xl bg-background/80 border border-border/50 group-hover:scale-110 transition-transform duration-200",
              iconVariants[variant]
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Recent activity item
function ActivityItem({
  user,
  action,
  item,
  time,
  type,
}: {
  user: string;
  action: string;
  item: string;
  time: string;
  type: "borrow" | "return" | "lost" | "maintenance" | "created";
}) {
  const typeStyles = {
    borrow: "bg-accent/10 text-accent border-accent/20",
    return: "bg-success/10 text-success border-success/20",
    lost: "bg-destructive/10 text-destructive border-destructive/20",
    maintenance: "bg-warning/10 text-warning border-warning/20",
    created: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className="flex items-start gap-3 py-3 group">
      <div
        className={cn(
          "mt-0.5 w-2 h-2 rounded-full shrink-0",
          type === "borrow" && "bg-accent",
          type === "return" && "bg-success",
          type === "lost" && "bg-destructive",
          type === "maintenance" && "bg-warning",
          type === "created" && "bg-primary"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{user}</span>
          {" "}
          <span className="text-muted-foreground">{action}</span>
          {" "}
          <span className="font-medium">{item}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
      </div>
      <Badge
        variant="outline"
        className={cn("text-[10px] capitalize", typeStyles[type])}
      >
        {type}
      </Badge>
    </div>
  );
}

export default function DashboardPage() {
  const { profile, loading: authLoading } = useUser();
  const [stats, setStats] = useState({
    totalAssets: 0,
    available: 0,
    borrowed: 0,
    maintenance: 0,
    lost: 0,
    overdue: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch asset statistics
        const { count: totalAssets } = await supabase
          .from("assets")
          .select("*", { count: "exact", head: true })
          .eq("is_deleted", false);

        const { count: available } = await supabase
          .from("assets")
          .select("*", { count: "exact", head: true })
          .eq("status", "available")
          .eq("is_deleted", false);

        const { count: borrowed } = await supabase
          .from("assets")
          .select("*", { count: "exact", head: true })
          .eq("status", "borrowed")
          .eq("is_deleted", false);

        const { count: maintenance } = await supabase
          .from("assets")
          .select("*", { count: "exact", head: true })
          .eq("status", "maintenance")
          .eq("is_deleted", false);

        const { count: lost } = await supabase
          .from("assets")
          .select("*", { count: "exact", head: true })
          .eq("status", "lost")
          .eq("is_deleted", false);

        // Get recent activities
        const { data: activities } = await supabase
          .from("activity_log")
          .select("*, user:user_id(first_name, last_name)")
          .order("created_at", { ascending: false })
          .limit(10);

        setStats({
          totalAssets: totalAssets || 0,
          available: available || 0,
          borrowed: borrowed || 0,
          maintenance: maintenance || 0,
          lost: lost || 0,
          overdue: 0,
        });
        setRecentActivities(activities || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchDashboardData();
    }
  }, [authLoading, supabase]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {profile?.first_name || "User"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentDate} &bull; {currentTime}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-xs gap-2">
            <Shield className="w-3 h-3" />
            MSU-ZS ROTC Unit
          </Badge>
          <Badge className="px-3 py-1.5 text-xs gap-2 bg-primary/10 text-primary hover:bg-primary/20">
            <Activity className="w-3 h-3" />
            All Systems Operational
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Assets"
          value={stats.totalAssets}
          icon={Package}
          trend="+12 this month"
          trendUp
          variant="default"
        />
        <StatCard
          title="Available"
          value={stats.available}
          icon={CheckCircle2}
          description={`${stats.totalAssets > 0 ? Math.round((stats.available / stats.totalAssets) * 100) : 0}% of total`}
          variant="success"
        />
        <StatCard
          title="Borrowed"
          value={stats.borrowed}
          icon={ClipboardList}
          variant="accent"
        />
        <StatCard
          title="Under Maintenance"
          value={stats.maintenance}
          icon={Wrench}
          variant="warning"
        />
        <StatCard
          title="Lost"
          value={stats.lost}
          icon={AlertTriangle}
          variant="destructive"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={Clock}
          variant="destructive"
        />
      </div>

      {/* Charts Section (Placeholder - Will be populated with Recharts) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest actions across the system</CardDescription>
              </div>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px] pr-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    user={
                      activity.user
                        ? `${activity.user.first_name} ${activity.user.last_name}`
                        : "System"
                    }
                    action={activity.description}
                    item=""
                    time={formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                    })}
                    type={activity.activity_type as any}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Activity className="w-8 h-8 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Activity will appear as you use the system
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Actions & Info */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">System Overview</CardTitle>
                <CardDescription>Quick stats and shortcuts</CardDescription>
              </div>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                  <Radio className="w-4 h-4" />
                  Radios
                </div>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Tracked devices</p>
              </div>
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-2 text-sm font-medium text-accent mb-1">
                  <Users className="w-4 h-4" />
                  Users
                </div>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Active accounts</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Inventory Health</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Available Rate</span>
                  <span className="font-medium">
                    {stats.totalAssets > 0
                      ? Math.round((stats.available / stats.totalAssets) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-500"
                    style={{
                      width: `${
                        stats.totalAssets > 0
                          ? (stats.available / stats.totalAssets) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Borrow Rate</span>
                  <span className="font-medium">
                    {stats.totalAssets > 0
                      ? Math.round((stats.borrowed / stats.totalAssets) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{
                      width: `${
                        stats.totalAssets > 0
                          ? (stats.borrowed / stats.totalAssets) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Loss Rate</span>
                  <span className="font-medium">
                    {stats.totalAssets > 0
                      ? Math.round((stats.lost / stats.totalAssets) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-destructive transition-all duration-500"
                    style={{
                      width: `${
                        stats.totalAssets > 0
                          ? (stats.lost / stats.totalAssets) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2">
              <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Add Item", href: "/dashboard/inventory/new", icon: Package },
                  { label: "Borrow", href: "/dashboard/borrow", icon: ClipboardList },
                  { label: "View Reports", href: "/dashboard/reports", icon: TrendingUp },
                  { label: "Radios", href: "/dashboard/radios", icon: Radio },
                ].map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border/50"
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </a>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts placeholder */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Monthly Borrowing Trends</CardTitle>
              <CardDescription>
                Equipment borrowing activity over time
              </CardDescription>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center rounded-xl bg-muted/30 border border-border/50">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Charts will be rendered with Recharts</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Data will populate as transactions are recorded
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


