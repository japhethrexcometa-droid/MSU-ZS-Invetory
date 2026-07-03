"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import {
  fetchMaintenanceRecords,
  MAINTENANCE_TYPE_CONFIG,
  MAINTENANCE_STATUS_CONFIG,
  fetchUpcomingMaintenance,
} from "@/lib/maintenance";
import { formatDate, formatCurrency } from "@/lib/inventory";
import { NotifyAdminButton } from "@/components/shared/notify-admin-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 20;

export default function MaintenancePage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();

  const [records, setRecords] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [result, upcomingData] = await Promise.all([
        fetchMaintenanceRecords({
          search: search || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
        fetchUpcomingMaintenance(),
      ]);
      setRecords(result.data);
      setTotalCount(result.count);
      setUpcoming(upcomingData);
    } catch (error) {
      console.error("Failed to load maintenance records:", error);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, page]);

  useEffect(() => {
    if (!authLoading) loadRecords();
  }, [authLoading, loadRecords]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Wrench className="w-6 h-6 text-primary" />
            Maintenance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track equipment maintenance, repairs, and inspections
          </p>
        </div>
        
        <NotifyAdminButton 
          title="Maintenance Review Needed"
          message="Please review the current maintenance tasks and schedules."
          type="maintenance"
        />
      </div>

      {/* Upcoming Maintenance Alert */}
      {upcoming.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{upcoming.length} upcoming maintenance tasks</p>
              <p className="text-xs text-muted-foreground">Next: {upcoming[0]?.asset?.item_name} — {formatDate(upcoming[0]?.scheduled_date)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStatusFilter("scheduled")}>
              View All
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{records.filter((r) => r.status === "scheduled").length}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{records.filter((r) => r.status === "in_progress").length}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{records.filter((r) => r.status === "completed").length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search maintenance records..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setSearch(searchInput), setPage(1))}
                className="pl-9 h-10"
              />
            </div>
            <Button variant="outline" className="h-10" onClick={() => { setSearch(searchInput); setPage(1); }}>
              <Search className="w-4 h-4" />
            </Button>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? ""); setPage(1); }}>
              <SelectTrigger className="w-36 h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? ""); setPage(1); }}>
              <SelectTrigger className="w-36 h-10">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="calibration">Calibration</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Asset</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Description</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Scheduled</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <Wrench className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No maintenance records found</p>
                </td></tr>
              ) : (
                records.map((record: any) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/maintenance/${record.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{record.asset?.item_name || "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{record.asset?.asset_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={MAINTENANCE_TYPE_CONFIG[record.maintenance_type]?.variant as any || "outline"}>
                        {MAINTENANCE_TYPE_CONFIG[record.maintenance_type]?.label || record.maintenance_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{record.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{formatDate(record.scheduled_date)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={MAINTENANCE_STATUS_CONFIG[record.status]?.variant as any || "outline"}>
                        {MAINTENANCE_STATUS_CONFIG[record.status]?.label || record.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm">{formatCurrency(record.cost)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{totalCount} total</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
