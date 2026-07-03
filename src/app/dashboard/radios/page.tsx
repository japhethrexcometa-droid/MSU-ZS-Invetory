"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { fetchRadios, fetchRadioStats, formatDate, BATTERY_CONFIG, RADIO_STATUS_CONFIG } from "@/lib/radio";
import { RadioStatusBadge, BatteryBadge } from "@/components/radio/radio-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Radio,
  Plus,
  Search,
  SlidersHorizontal,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  BatteryMedium,
  Wrench,
  FileText,
  Shield,
  MapPin,
  Activity,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Asset } from "@/types/database";

const PAGE_SIZE = 20;

export default function RadiosPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();
  const supabase = createClient();

  const [radios, setRadios] = useState<Asset[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [batteryFilter, setBatteryFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    maintenance: 0,
    lost: 0,
    lowBattery: 0,
    needsService: 0,
  });

  const canManage = profile?.role === "logistics_officer";

  const loadRadios = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRadios({
        search: search,
        status: statusFilter && statusFilter !== "__all__" ? statusFilter : undefined,
        batteryStatus: batteryFilter && batteryFilter !== "__all__" ? batteryFilter : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setRadios(result.data);
      setTotalCount(result.count);
    } catch (error) {
      console.error("Failed to fetch radios:", error);
      toast.error("Failed to load radio inventory");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, batteryFilter, page]);

  useEffect(() => {
    if (!authLoading) {
      loadRadios();
      loadStats();
    }
  }, [authLoading, loadRadios]);

  const loadStats = async () => {
    try {
      const s = await fetchRadioStats();
      setStats(s);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Battery level order for display
  const batteryFilterOptions = ["full", "high", "medium", "low", "critical", "dead"];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Radio className="w-6 h-6 text-primary" />
            Radio Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total} total radios &bull; {stats.available} available &bull; {stats.lowBattery} low battery
          </p>
        </div>
        {canManage && (
          <Button onClick={() => router.push("/dashboard/inventory/new")} className="h-10 gap-2">
            <Plus className="w-4 h-4" />
            Add New Radio
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Radio, color: "text-primary" },
          { label: "Available", value: stats.available, icon: Shield, color: "text-success" },
          { label: "Assigned", value: stats.assigned, icon: Users, color: "text-accent" },
          { label: "Maintenance", value: stats.maintenance, icon: Wrench, color: "text-warning" },
          { label: "Lost", value: stats.lost, icon: AlertTriangle, color: "text-destructive" },
          { label: "Low Battery", value: stats.lowBattery, icon: BatteryMedium, color: "text-warning" },
          { label: "Needs Service", value: stats.needsService, icon: Activity, color: "text-destructive" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-3 flex flex-col items-center gap-1 text-center">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-lg font-bold leading-tight">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, asset ID, serial, frequency..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-10"
                />
              </div>
              <Button variant="outline" className="h-10 gap-2" onClick={handleSearch}>
                <Search className="w-4 h-4" />
                Search
              </Button>
              <Button
                variant={showFilters ? "default" : "outline"}
                className="h-10 gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {(statusFilter || batteryFilter) && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {(statusFilter ? 1 : 0) + (batteryFilter ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 max-w-lg">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => { setStatusFilter(v ?? ""); setPage(1); }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Statuses</SelectItem>
                      {Object.entries(RADIO_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Battery Level</label>
                  <Select
                    value={batteryFilter}
                    onValueChange={(v) => { setBatteryFilter(v ?? ""); setPage(1); }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Levels</SelectItem>
                      {batteryFilterOptions.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b.charAt(0).toUpperCase() + b.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Radio Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Radio / Asset ID
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Frequency
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Battery
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Condition
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Location
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Updated
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading radios...</p>
                  </td>
                </tr>
              ) : radios.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Radio className="w-10 h-10 text-muted-foreground/30" />
                      <div>
                        <p className="text-sm font-medium">No radios found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search || statusFilter || batteryFilter
                            ? "Try adjusting your search or filters"
                            : "No radios have been added to the inventory yet"}
                        </p>
                      </div>
                      {canManage && !search && !statusFilter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push("/dashboard/inventory/new")}
                        >
                          <Plus className="w-3 h-3 mr-1.5" />
                          Add Radio
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                radios.map((radio) => {
                  const batteryConfig = radio.battery_status ? BATTERY_CONFIG[radio.battery_status] : null;
                  const needsAttention =
                    radio.battery_status === "low" ||
                    radio.battery_status === "critical" ||
                    radio.battery_status === "dead";
                  return (
                    <tr
                      key={radio.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/radios/${radio.id}`}
                          className="flex items-start gap-3"
                        >
                          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Radio className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-tight">{radio.item_name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                              {radio.asset_id}
                              {radio.serial_number && ` · ${radio.serial_number}`}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-muted-foreground">
                          {radio.radio_frequency || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BatteryBadge batteryStatus={radio.battery_status} />
                          {needsAttention && (
                            <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RadioStatusBadge status={radio.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            radio.condition === "excellent" || radio.condition === "good"
                              ? "border-success/20 text-success"
                              : radio.condition === "fair"
                              ? "border-warning/20 text-warning"
                              : "border-destructive/20 text-destructive"
                          }`}
                        >
                          {radio.condition}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {radio.location
                            ? `${radio.location.building}${radio.location.room ? `, ${radio.location.room}` : ""}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(radio.updated_at), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => router.push(`/dashboard/radios/${radio.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
