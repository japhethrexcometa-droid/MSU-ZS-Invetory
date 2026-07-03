"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { fetchAssetById, formatCurrency, formatDate, deleteAsset } from "@/lib/inventory";
import { StatusBadge, ConditionBadge } from "@/components/inventory/status-badge";
import { QRDisplay } from "@/components/inventory/qr-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Package,
  Radio,
  QrCode,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Tag,
  Building,
  FileText,
  History,
  AlertTriangle,
  Wrench,
  Loader2,
  Shield,
  ChevronRight,
  Download,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Asset } from "@/types/database";

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [assetId, setAssetId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setAssetId(p.id));
  }, [params]);

  if (!assetId) return null;

  return <AssetDetail assetId={assetId} />;
}

function AssetDetail({ assetId }: { assetId: string }) {
  const router = useRouter();
  const { profile } = useUser();
  const supabase = createClient();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  const isAdmin =
    profile?.role === "logistics_officer";

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAssetById(assetId);
        setAsset(data);
      } catch (error) {
        toast.error("Failed to load asset");
        router.push("/dashboard/inventory");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assetId, router]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await deleteAsset(assetId);
      toast.success("Asset deleted");
      router.push("/dashboard/inventory");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!asset) return null;

  const qrValue = asset.qr_code || JSON.stringify({ id: asset.id, asset_id: asset.asset_id, name: asset.item_name, system: "MSUZS-ROTC" });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/inventory" className="hover:text-foreground transition-colors">
              Inventory
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{asset.item_name}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {asset.is_radio ? (
                <Radio className="w-6 h-6 text-primary" />
              ) : (
                <Package className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{asset.item_name}</h1>
              <p className="text-sm text-muted-foreground font-mono">{asset.asset_id}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={asset.status} className="text-sm px-3 py-1.5" />
          <ConditionBadge condition={asset.condition} className="text-sm px-3 py-1.5" />
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push(`/dashboard/inventory/${asset.id}/edit`)}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details" className="gap-2">
                <FileText className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-2">
                <Wrench className="w-4 h-4" />
                Maintenance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6 space-y-6">
              {/* Basic Info */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailRow icon={Tag} label="Category" value={asset.category?.name || "—"} />
                    <DetailRow icon={FileText} label="Description" value={asset.description || "—"} />
                    <DetailRow icon={Package} label="Brand" value={asset.brand || "—"} />
                    <DetailRow icon={Package} label="Model" value={asset.model || "—"} />
                    <DetailRow icon={QrCode} label="Serial Number" value={asset.serial_number || "—"} />
                    <DetailRow icon={QrCode} label="Property Number" value={asset.property_number || "—"} />
                  </div>
                </CardContent>
              </Card>

              {/* Procurement */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Procurement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailRow icon={User} label="Supplier" value={asset.supplier || "—"} />
                    <DetailRow icon={Calendar} label="Purchase Date" value={formatDate(asset.purchase_date)} />
                    <DetailRow icon={DollarSign} label="Purchase Cost" value={formatCurrency(asset.purchase_cost)} />
                    <DetailRow icon={DollarSign} label="Funding Source" value={asset.funding_source || "—"} />
                    <DetailRow icon={Calendar} label="Warranty Expiry" value={formatDate(asset.warranty_expiry)} />
                    <DetailRow icon={Calendar} label="Useful Life" value={asset.useful_life_months ? `${asset.useful_life_months} months` : "—"} />
                  </div>
                </CardContent>
              </Card>

              {/* Location & Assignment */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Location & Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailRow
                      icon={MapPin}
                      label="Location"
                      value={
                        asset.location
                          ? `${asset.location.building}${asset.location.room ? `, ${asset.location.room}` : ""}`
                          : "—"
                      }
                    />
                    <DetailRow
                      icon={User}
                      label="Assigned Officer"
                      value={
                        asset.assigned_officer
                          ? `${asset.assigned_officer.first_name} ${asset.assigned_officer.last_name}`
                          : "—"
                      }
                    />
                    <DetailRow icon={Building} label="Status" value={<StatusBadge status={asset.status} />} />
                    <DetailRow icon={Shield} label="Condition" value={<ConditionBadge condition={asset.condition} />} />
                  </div>
                </CardContent>
              </Card>

              {/* Radio Details */}
              {asset.is_radio && (
                <Card className="border-border/50 border-accent/20">
                  <CardHeader className="bg-accent/5 rounded-t-xl">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Radio className="w-4 h-4 text-accent" />
                      Radio Tracking Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      <DetailRow icon={Radio} label="Frequency" value={asset.radio_frequency || "—"} />
                      <DetailRow icon={Radio} label="Battery Status" value={asset.battery_status || "—"} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Remarks */}
              {asset.remarks && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Remarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{asset.remarks}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Borrowing History</CardTitle>
                  <CardDescription>All borrow and return transactions for this asset</CardDescription>
                </CardHeader>
                <CardContent>
                  <AssetHistory assetId={asset.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="mt-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Maintenance Records</CardTitle>
                  <CardDescription>Scheduled and completed maintenance</CardDescription>
                </CardHeader>
                <CardContent>
                  <AssetMaintenance assetId={asset.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* QR Code */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium">QR Code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <QRDisplay value={qrValue} size={160} />
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Scan to view asset details
              </p>
            </CardContent>
          </Card>

          {/* Asset Image */}
          {asset.image_url && (
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Photo</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <img
                  src={asset.image_url}
                  alt={asset.item_name}
                  className="w-full h-48 object-cover"
                />
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDistanceToNow(new Date(asset.updated_at), { addSuffix: true })}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function AssetHistory({ assetId }: { assetId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("borrow_transactions")
        .select("*, borrower:borrower_id(first_name, last_name)")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setHistory(data);
      setLoading(false);
    };
    load();
  }, [assetId, supabase]);

  if (loading) return <Loader2 className="w-5 h-5 animate-spin mx-auto" />;

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No borrowing history</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((txn) => (
        <div key={txn.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <div className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">
                {txn.borrower?.first_name} {txn.borrower?.last_name}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {txn.status} &bull; {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
            </p>
          </div>
          <StatusBadge status={txn.status} />
        </div>
      ))}
    </div>
  );
}

function AssetMaintenance({ assetId }: { assetId: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("maintenance_records")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setRecords(data);
      setLoading(false);
    };
    load();
  }, [assetId, supabase]);

  if (loading) return <Loader2 className="w-5 h-5 animate-spin mx-auto" />;

  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <Wrench className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No maintenance records</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <div className="w-2 h-2 rounded-full bg-warning mt-2 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium capitalize">{record.maintenance_type}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{record.description}</p>
            {record.health_score !== null && (
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${record.health_score}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{record.health_score}%</span>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground capitalize">{record.status}</span>
        </div>
      ))}
    </div>
  );
}
