"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { fetchInventory, STATUS_CONFIG, formatDate, formatCurrency } from "@/lib/inventory";
import { StatusBadge, ConditionBadge } from "@/components/inventory/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Package,
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Radio,
  ChevronLeft,
  ChevronRight,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Asset } from "@/types/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ASSET_STATUSES } from "@/lib/constants";

const PAGE_SIZE = 20;

export default function InventoryPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();
  const supabase = createClient();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin =
    profile?.role === "logistics_officer";

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchInventory({
        search: search,
        status: statusFilter && statusFilter !== "__all__" ? statusFilter : undefined,
        condition: conditionFilter && conditionFilter !== "__all__" ? conditionFilter : undefined,
        categoryId: categoryFilter && categoryFilter !== "__all__" ? categoryFilter : undefined,
        page,
        pageSize: PAGE_SIZE,
        sortField,
        sortOrder,
      });
      setAssets(result.data);
      setTotalCount(result.count);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, conditionFilter, categoryFilter, page, sortField, sortOrder]);

  useEffect(() => {
    if (!authLoading) {
      loadAssets();
    }
  }, [authLoading, loadAssets]);

  // Load categories for filter
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (data) setCategories(data);
    };
    loadCategories();
  }, [supabase]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset? This action can be undone by an administrator.")) return;

    setDeletingId(id);
    try {
      const { error } = await (supabase as any)
        .from("assets")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Asset deleted");
      loadAssets();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete asset");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
            <Package className="w-6 h-6 text-primary" />
            Inventory Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} total assets &bull; {assets.filter((a) => a.status === "available").length} available
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push("/dashboard/inventory/new")} className="h-10 gap-2">
            <Plus className="w-4 h-4" />
            Add New Asset
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, serial number, brand, model..."
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
                {(statusFilter || categoryFilter || conditionFilter) && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {(statusFilter ? 1 : 0) + (categoryFilter ? 1 : 0) + (conditionFilter ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filter Pills */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? ""); setPage(1); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Statuses</SelectItem>
                      {ASSET_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_CONFIG[s]?.label || s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                  <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v ?? ""); setPage(1); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Condition</label>
                  <Select value={conditionFilter} onValueChange={(v) => { setConditionFilter(v ?? ""); setPage(1); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Conditions</SelectItem>
                      {["excellent", "good", "fair", "poor", "damaged"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
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

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Asset ID / Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Category
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
                  Cost
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Created
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading inventory...</p>
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="w-10 h-10 text-muted-foreground/30" />
                      <div>
                        <p className="text-sm font-medium">No assets found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search || statusFilter || categoryFilter || conditionFilter
                            ? "Try adjusting your search or filters"
                            : "Start by adding your first asset"}
                        </p>
                      </div>
                      {isAdmin && !search && !statusFilter && !categoryFilter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push("/dashboard/inventory/new")}
                        >
                          <Plus className="w-3 h-3 mr-1.5" />
                          Add Asset
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/inventory/${asset.id}`}
                        className="flex items-start gap-3"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          {asset.is_radio ? (
                            <Radio className="w-4 h-4 text-primary" />
                          ) : (
                            <Package className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">
                            {asset.item_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            {asset.asset_id}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {asset.category?.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ConditionBadge condition={asset.condition} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {asset.location
                          ? `${asset.location.building}${asset.location.room ? `, ${asset.location.room}` : ""}`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium">
                        {formatCurrency(asset.purchase_cost)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/inventory/${asset.id}`)}>
                            <Eye className="w-3.5 h-3.5 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/inventory/${asset.id}/edit`)}>
                                <Pencil className="w-3.5 h-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(asset.id)}
                                disabled={deletingId === asset.id}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
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
