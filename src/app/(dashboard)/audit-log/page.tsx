"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { fetchAuditLogs, fetchAuditStats, formatAuditAction, formatEntityType } from "@/lib/audit";
import { Button } from "@/components/ui/button";
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
  Activity,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 30;

export default function AuditLogPage() {
  const { profile, loading: authLoading } = useUser();

  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const isAdmin = profile?.role === "system_administrator";

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [result, statsData] = await Promise.all([
        fetchAuditLogs({
          entityType: entityFilter || undefined,
          action: actionFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
        fetchAuditStats(),
      ]);
      setLogs(result.data);
      setTotalCount(result.count);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [entityFilter, actionFilter, page]);

  useEffect(() => {
    if (!authLoading) loadLogs();
  }, [authLoading, loadLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">Access Restricted</p>
          <p className="text-xs text-muted-foreground mt-1">Only System Administrators can view the audit trail.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          Audit Trail
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comprehensive activity log for all system changes
        </p>
      </div>

      {/* Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary shrink-0" />
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Events</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                <span className="text-success text-xs font-bold">+</span>
              </div>
              <div><p className="text-2xl font-bold">{stats.creates}</p><p className="text-xs text-muted-foreground">Created</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <span className="text-warning text-xs font-bold">~</span>
              </div>
              <div><p className="text-2xl font-bold">{stats.updates}</p><p className="text-xs text-muted-foreground">Updated</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <span className="text-destructive text-xs font-bold">-</span>
              </div>
              <div><p className="text-2xl font-bold">{stats.deletes}</p><p className="text-xs text-muted-foreground">Deleted</p></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v ?? ""); setPage(1); }}>
              <SelectTrigger className="w-44 h-10"><SelectValue placeholder="Entity Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Entities</SelectItem>
                <SelectItem value="assets">Assets</SelectItem>
                <SelectItem value="borrow_transactions">Borrow Transactions</SelectItem>
                <SelectItem value="categories">Categories</SelectItem>
                <SelectItem value="profiles">User Profiles</SelectItem>
                <SelectItem value="locations">Locations</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v ?? ""); setPage(1); }}>
              <SelectTrigger className="w-36 h-10"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground self-center ml-auto">{totalCount} events</p>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Timestamp</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Action</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Entity</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center">
                  <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No audit logs found</p>
                </td></tr>
              ) : (
                logs.map((log: any) => (
                  <>
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {log.user ? `${log.user.first_name} ${log.user.last_name}` : "System"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={log.action === "CREATE" ? "default" : log.action === "UPDATE" ? "secondary" : "destructive"} className="text-[10px]">
                          {formatAuditAction(log.action)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{formatEntityType(log.entity_type)}</span>
                        {log.entity_id && (
                          <span className="text-xs text-muted-foreground font-mono ml-2">#{log.entity_id.slice(0, 8)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowDetails(showDetails === log.id ? null : log.id)}
                        >
                          {showDetails === log.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                      </td>
                    </tr>
                    {showDetails === log.id && (log.old_values || log.new_values) && (
                      <tr key={`${log.id}-details`} className="bg-muted/10">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-4">
                            {log.old_values && (
                              <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Previous Values</p>
                                <pre className="text-[11px] font-mono bg-muted/30 rounded p-2 max-h-32 overflow-y-auto">
                                  {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">New Values</p>
                                <pre className="text-[11px] font-mono bg-muted/30 rounded p-2 max-h-32 overflow-y-auto">
                                  {JSON.stringify(log.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
