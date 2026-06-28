"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { fetchBorrowTransactions, BORROW_STATUS_CONFIG, formatDateTime } from "@/lib/borrow";
import { BorrowStatusBadge } from "@/components/borrow/borrow-status-badge";
import { ApproveAction, RejectAction, ReleaseAction } from "@/components/borrow/borrow-actions";
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
  ArrowLeftRight,
  Plus,
  Search,
  SlidersHorizontal,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CalendarDays,
  User,
  Package,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { BORROW_STATUSES } from "@/lib/constants";

const PAGE_SIZE = 20;

export default function BorrowPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();
  const supabase = createClient();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const isOfficer =
    profile?.role === "system_administrator" ||
    profile?.role === "supply_officer" ||
    profile?.role === "rotc_commandant" ||
    profile?.role === "logistics_officer" ||
    profile?.role === "rotc_officer";

  const canApprove =
    profile?.role === "system_administrator" ||
    profile?.role === "rotc_commandant" ||
    profile?.role === "supply_officer";

  const canRelease =
    profile?.role === "system_administrator" || profile?.role === "supply_officer";

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchBorrowTransactions({
        search: search,
        status: statusFilter && statusFilter !== "__all__" ? statusFilter : undefined,
        borrowerId: !isOfficer ? profile?.id : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setTransactions(result.data);
      setTotalCount(result.count);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load borrow records");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, isOfficer, profile?.id]);

  useEffect(() => {
    if (!authLoading) {
      loadTransactions();
    }
  }, [authLoading, loadTransactions]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const countsByStatus = transactions.reduce(
    (acc: Record<string, number>, t: any) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pendingCount = transactions.filter((t: any) => t.status === "pending").length;

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
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            Borrow / Return
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} total transactions
            {pendingCount > 0 && ` · ${pendingCount} pending`}
          </p>
        </div>
        {!isOfficer && (
          <Button onClick={() => router.push("/dashboard/borrow/new")} className="h-10 gap-2">
            <Plus className="w-4 h-4" />
            New Borrow Request
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by transaction number, item name..."
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
                {statusFilter && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    1
                  </Badge>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-3 pt-2 max-w-xs">
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
                      {BORROW_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {BORROW_STATUS_CONFIG[s]?.label || s}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: totalCount, icon: Package, color: "text-primary" },
          { label: "Pending", value: countsByStatus["pending"] || 0, icon: Clock, color: "text-warning" },
          { label: "Active (Released)", value: countsByStatus["released"] || 0, icon: ArrowLeftRight, color: "text-accent" },
          { label: "Overdue / Lost", value: (countsByStatus["late"] || 0) + (countsByStatus["lost"] || 0), icon: AlertTriangle, color: "text-destructive" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions List */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Transaction</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Item</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Borrower</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Return Due</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading transactions...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ArrowLeftRight className="w-10 h-10 text-muted-foreground/30" />
                      <div>
                        <p className="text-sm font-medium">No transactions found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search || statusFilter
                            ? "Try adjusting your search or filters"
                            : isOfficer ? "No borrow requests yet" : "Submit your first borrow request"}
                        </p>
                      </div>
                      {!isOfficer && !search && !statusFilter && (
                        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/borrow/new")}>
                          <Plus className="w-3 h-3 mr-1.5" />
                          New Request
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((txn: any) => {
                  const isOverdue =
                    txn.status === "released" && new Date(txn.expected_return_date) < new Date();
                  return (
                    <tr
                      key={txn.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/borrow/${txn.id}`} className="block">
                          <p className="text-sm font-medium font-mono">{txn.transaction_no}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-tight">{txn.asset?.item_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{txn.asset?.asset_id || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm">
                            {txn.borrower?.first_name} {txn.borrower?.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BorrowStatusBadge status={txn.status} />
                          {isOverdue && (
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(txn.borrow_date || txn.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3 h-3 text-muted-foreground" />
                          <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {new Date(txn.expected_return_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/dashboard/borrow/${txn.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {canApprove && txn.status === "pending" && (
                            <div className="flex gap-1">
                              <ApproveAction transactionId={txn.id} onSuccess={loadTransactions} />
                            </div>
                          )}
                        </div>
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
              <span className="text-xs text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
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
