"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { fetchReturns, fetchReturnsStats } from "@/lib/returns";
import { formatDateTime } from "@/lib/borrow";
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
  RotateCcw,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  PhilippinePeso,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 20;

export default function ReturnsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();

  const [returns, setReturns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const [result, statsData] = await Promise.all([
        fetchReturns({ search, status: statusFilter || undefined, page, pageSize: PAGE_SIZE }),
        fetchReturnsStats(),
      ]);
      setReturns(result.data);
      setTotalCount(result.count);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load returns:", error);
      toast.error("Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (!authLoading) loadReturns();
  }, [authLoading, loadReturns]);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <RotateCcw className="w-6 h-6 text-primary" />
          Returns & Receipts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Completed and late returns with penalty tracking
        </p>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReturns}</p>
                <p className="text-xs text-muted-foreground">Total Returns</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.onTime}</p>
                <p className="text-xs text-muted-foreground">On Time</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.late}</p>
                <p className="text-xs text-muted-foreground">Late Returns</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <PhilippinePeso className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">₱{stats.totalPenalties.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Penalties</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search returns..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-10"
              />
            </div>
            <Button variant="outline" className="h-10" onClick={handleSearch}><Search className="w-4 h-4" /></Button>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? ""); setPage(1); }}>
              <SelectTrigger className="w-36 h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="returned">On Time</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Transaction</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Item</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Borrower</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Returned</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Penalty</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : returns.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <RotateCcw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No returns found</p>
                </td></tr>
              ) : (
                returns.map((ret: any) => (
                  <tr key={ret.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/borrow/${ret.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono font-medium">{ret.transaction_no}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{ret.asset?.item_name || "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{ret.asset?.asset_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{ret.borrower ? `${ret.borrower.first_name} ${ret.borrower.last_name}` : "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ret.status === "late" ? "destructive" : "secondary"}>
                        {ret.status === "late" ? "Late" : "On Time"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{ret.actual_return_date ? formatDateTime(ret.actual_return_date) : "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium">
                        {ret.penalty_amount ? `₱${ret.penalty_amount.toLocaleString()}` : "—"}
                      </span>
                      {ret.penalty_paid && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px]">Paid</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <Button key={i} variant={page === i + 1 ? "default" : "ghost"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(i + 1)}>
                  {i + 1}
                </Button>
              ))}
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
