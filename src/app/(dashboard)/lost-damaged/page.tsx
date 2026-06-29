"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import {
  fetchLostReports,
  fetchDamageReports,
  LOST_STATUS_CONFIG,
  DAMAGE_STATUS_CONFIG,
} from "@/lib/lost-damaged";
import { formatDate } from "@/lib/inventory";
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
  AlertTriangle,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Hammer,
} from "lucide-react";

const PAGE_SIZE = 20;

export default function LostDamagedPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();

  const [activeTab, setActiveTab] = useState("lost");

  // Lost state
  const [lostReports, setLostReports] = useState<any[]>([]);
  const [lostCount, setLostCount] = useState(0);
  const [lostLoading, setLostLoading] = useState(true);
  const [lostPage, setLostPage] = useState(1);
  const [lostSearch, setLostSearch] = useState("");
  const [lostSearchInput, setLostSearchInput] = useState("");
  const [lostStatusFilter, setLostStatusFilter] = useState("");

  // Damage state
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [damageCount, setDamageCount] = useState(0);
  const [damageLoading, setDamageLoading] = useState(true);
  const [damagePage, setDamagePage] = useState(1);
  const [damageSearch, setDamageSearch] = useState("");
  const [damageSearchInput, setDamageSearchInput] = useState("");
  const [damageStatusFilter, setDamageStatusFilter] = useState("");

  const isLogistics = profile?.role === "logistics_officer";

  const loadLostReports = useCallback(async () => {
    setLostLoading(true);
    try {
      const result = await fetchLostReports({
        search: lostSearch || undefined,
        status: lostStatusFilter || undefined,
        page: lostPage,
        pageSize: PAGE_SIZE,
      });
      setLostReports(result.data);
      setLostCount(result.count);
    } catch (error) {
      console.error("Failed to load lost reports:", error);
    } finally {
      setLostLoading(false);
    }
  }, [lostSearch, lostStatusFilter, lostPage]);

  const loadDamageReports = useCallback(async () => {
    setDamageLoading(true);
    try {
      const result = await fetchDamageReports({
        search: damageSearch || undefined,
        status: damageStatusFilter || undefined,
        page: damagePage,
        pageSize: PAGE_SIZE,
      });
      setDamageReports(result.data);
      setDamageCount(result.count);
    } catch (error) {
      console.error("Failed to load damage reports:", error);
    } finally {
      setDamageLoading(false);
    }
  }, [damageSearch, damageStatusFilter, damagePage]);

  useEffect(() => {
    if (!authLoading) {
      loadLostReports();
      loadDamageReports();
    }
  }, [authLoading, loadLostReports, loadDamageReports]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          Lost & Damaged Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track lost items and damage incidents
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lost" className="gap-2">
            <ShieldAlert className="w-4 h-4" />
            Lost Reports ({lostCount})
          </TabsTrigger>
          <TabsTrigger value="damage" className="gap-2">
            <Hammer className="w-4 h-4" />
            Damage Reports ({damageCount})
          </TabsTrigger>
        </TabsList>

        {/* Lost Reports Tab */}
        <TabsContent value="lost" className="space-y-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search lost reports..."
                    value={lostSearchInput}
                    onChange={(e) => setLostSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (setLostSearch(lostSearchInput), setLostPage(1))}
                    className="pl-9 h-10"
                  />
                </div>
                <Button variant="outline" className="h-10" onClick={() => { setLostSearch(lostSearchInput); setLostPage(1); }}>
                  <Search className="w-4 h-4" />
                </Button>
                <Select value={lostStatusFilter} onValueChange={(v) => { setLostStatusFilter(v ?? ""); setLostPage(1); }}>
                  <SelectTrigger className="w-44 h-10">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="ordered">Replacement Ordered</SelectItem>
                    <SelectItem value="received">Replacement Received</SelectItem>
                    <SelectItem value="not_applicable">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Report #</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Item</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Reporter</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date Lost</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {lostLoading ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
                  ) : lostReports.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center">
                      <ShieldAlert className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No lost reports found</p>
                    </td></tr>
                  ) : (
                    lostReports.map((report: any) => (
                      <tr
                        key={report.id}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/lost-damaged/${report.id}`)}
                      >
                        <td className="px-4 py-3"><span className="text-sm font-mono font-medium">{report.report_no}</span></td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{report.asset?.item_name || "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{report.asset?.asset_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{report.reporter ? `${report.reporter.first_name} ${report.reporter.last_name}` : "—"}</span>
                        </td>
                        <td className="px-4 py-3"><span className="text-sm">{formatDate(report.date_lost)}</span></td>
                        <td className="px-4 py-3">
                          <Badge variant={LOST_STATUS_CONFIG[report.replacement_status]?.variant as any || "outline"}>
                            {LOST_STATUS_CONFIG[report.replacement_status]?.label || report.replacement_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {Math.ceil(lostCount / PAGE_SIZE) > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">{lostCount} total</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={lostPage <= 1} onClick={() => setLostPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={lostPage >= Math.ceil(lostCount / PAGE_SIZE)} onClick={() => setLostPage((p) => Math.min(Math.ceil(lostCount / PAGE_SIZE), p + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Damage Reports Tab */}
        <TabsContent value="damage" className="space-y-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search damage reports..."
                    value={damageSearchInput}
                    onChange={(e) => setDamageSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (setDamageSearch(damageSearchInput), setDamagePage(1))}
                    className="pl-9 h-10"
                  />
                </div>
                <Button variant="outline" className="h-10" onClick={() => { setDamageSearch(damageSearchInput); setDamagePage(1); }}>
                  <Search className="w-4 h-4" />
                </Button>
                <Select value={damageStatusFilter} onValueChange={(v) => { setDamageStatusFilter(v ?? ""); setDamagePage(1); }}>
                  <SelectTrigger className="w-44 h-10">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="irreparable">Irreparable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Report #</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Item</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Reporter</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Est. Cost</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {damageLoading ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
                  ) : damageReports.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-16 text-center">
                      <Hammer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No damage reports found</p>
                    </td></tr>
                  ) : (
                    damageReports.map((report: any) => (
                      <tr
                        key={report.id}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/lost-damaged/${report.id}`)}
                      >
                        <td className="px-4 py-3"><span className="text-sm font-mono font-medium">{report.report_no}</span></td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{report.asset?.item_name || "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{report.asset?.asset_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{report.reporter ? `${report.reporter.first_name} ${report.reporter.last_name}` : "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{report.estimated_repair_cost ? `₱${report.estimated_repair_cost.toLocaleString()}` : "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={DAMAGE_STATUS_CONFIG[report.repair_status]?.variant as any || "outline"}>
                            {DAMAGE_STATUS_CONFIG[report.repair_status]?.label || report.repair_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
