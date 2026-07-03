"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { fetchRadioById, fetchRadioTrackingHistory, formatDate, formatDateTime, BATTERY_CONFIG } from "@/lib/radio";
import { RadioStatusBadge, BatteryBadge } from "@/components/radio/radio-status-badge";
import { RadioBorrowHistory } from "@/components/radio/radio-borrow-history";
import { RadioAssignDialog } from "@/components/radio/radio-assign-dialog";
import { RadioReturnDialog } from "@/components/radio/radio-return-dialog";
import { ConditionBadge } from "@/components/inventory/status-badge";
import { QRDisplay } from "@/components/inventory/qr-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Radio,
  Loader2,
  ChevronRight,
  FileText,
  History,
  Wrench,
  MapPin,
  User,
  Calendar,
  Activity,
  AlertTriangle,
  Shield,
  Package,
  BatteryMedium,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RadioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [radioId, setRadioId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setRadioId(p.id));
  }, [params]);

  if (!radioId) return null;

  return <RadioDetail radioId={radioId} />;
}

function RadioDetail({ radioId }: { radioId: string }) {
  const router = useRouter();
  const { profile } = useUser();
  const supabase = createClient();

  const [radio, setRadio] = useState<any>(null);
  const [trackingHistory, setTrackingHistory] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [refreshing, setRefreshing] = useState(false);

  const canManage = profile?.role === "logistics_officer";

  // Find active tracking record (no return date)
  const activeTracking = trackingHistory.find((t: any) => !t.return_date);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchRadioById(radioId);
        setRadio(data);

        const history = await fetchRadioTrackingHistory(radioId);
        setTrackingHistory(history);
      } catch (error) {
        toast.error("Failed to load radio details");
        router.push("/dashboard/radios");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [radioId, router]);

  // Load officers for assign dialog
  useEffect(() => {
    const loadOfficers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role")
        .eq("is_active", true)
        .order("first_name");
      if (data) setOfficers(data);
    };
    loadOfficers();
  }, [supabase]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchRadioById(radioId);
      setRadio(data);
      const history = await fetchRadioTrackingHistory(radioId);
      setTrackingHistory(history);
    } catch (error) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkMaintenance = async () => {
    if (!confirm("Mark this radio for maintenance? This will change its status to 'Maintenance'.")) return;

    try {
      const { markRadioMaintenance } = await import("@/lib/radio");
      await markRadioMaintenance(radioId, {
        description: "Marked for maintenance from radio tracking",
        maintenance_type: "repair",
      });
      toast.success("Radio marked for maintenance");
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark for maintenance");
    }
  };

  const handleReportLost = async () => {
    if (!confirm("Are you sure you want to report this radio as lost? This will change its status permanently.")) return;

    try {
      const { reportRadioLost } = await import("@/lib/radio");
      await reportRadioLost({
        asset_id: radioId,
        reporter_id: profile!.id,
        date_lost: new Date().toISOString().split("T")[0],
        description: "Reported lost from radio tracking module",
        tracking_id: activeTracking?.id,
      });
      toast.success("Radio reported as lost");
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to report as lost");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!radio) return null;

  const needsBatteryAttention =
    radio.battery_status === "low" || radio.battery_status === "critical" || radio.battery_status === "dead";
  const qrValue = radio.qr_code || JSON.stringify({ id: radio.id, asset_id: radio.asset_id, name: radio.item_name, system: "MSUZS-ROTC" });
  const isRadioBorrowed = radio.status === "borrowed";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Link href="/dashboard/radios" className="hover:text-foreground transition-colors">
          Radio Tracking
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{radio.item_name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Radio className="w-7 h-7 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{radio.item_name}</h1>
              <RadioStatusBadge status={radio.status} className="text-sm px-3 py-1" />
              {needsBatteryAttention && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Low Battery
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-1">{radio.asset_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage && isRadioBorrowed && activeTracking && (
            <RadioReturnDialog
              assetId={radioId}
              trackingId={activeTracking.id}
              assetName={radio.item_name}
              onSuccess={handleRefresh}
            />
          )}
          {canManage && !isRadioBorrowed && radio.status === "available" && (
            <RadioAssignDialog
              assetId={radioId}
              assetName={radio.item_name}
              officers={officers}
              onSuccess={handleRefresh}
            />
          )}
          {canManage && isRadioBorrowed && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={handleReportLost}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Report Lost
            </Button>
          )}
          {canManage && radio.status !== "maintenance" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleMarkMaintenance}
            >
              <Wrench className="w-3.5 h-3.5" />
              Maintenance
            </Button>
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
                Radio Details
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-2">
                <Activity className="w-4 h-4" />
                Assignment History
              </TabsTrigger>
              <TabsTrigger value="borrow-history" className="gap-2">
                <History className="w-4 h-4" />
                Borrow History
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-6 space-y-6">
              {/* Radio-specific Info */}
              <Card className="border-border/50 border-accent/20">
                <CardHeader className="bg-accent/5 rounded-t-xl">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Radio className="w-4 h-4 text-accent" />
                    Radio Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <DetailRow
                      icon={BatteryMedium}
                      label="Battery Status"
                      value={
                        <div className="flex items-center gap-2">
                          <BatteryBadge batteryStatus={radio.battery_status} className="text-sm" />
                          {needsBatteryAttention && (
                            <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Replace Soon
                            </Badge>
                          )}
                        </div>
                      }
                    />
                    <DetailRow icon={Radio} label="Frequency" value={radio.radio_frequency || "—"} />
                    <DetailRow
                      icon={Shield}
                      label="Status"
                      value={<RadioStatusBadge status={radio.status} />}
                    />
                    <DetailRow icon={Shield} label="Condition" value={<ConditionBadge condition={radio.condition} />} />
                    {radio.brand && <DetailRow icon={Package} label="Brand" value={radio.brand} />}
                    {radio.model && <DetailRow icon={Package} label="Model" value={radio.model} />}
                    <DetailRow icon={FileText} label="Serial Number" value={radio.serial_number || "—"} />
                    <DetailRow icon={FileText} label="Property Number" value={radio.property_number || "—"} />
                  </div>
                </CardContent>
              </Card>

              {/* Location & Assignment */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Location & Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <DetailRow
                      icon={MapPin}
                      label="Storage Location"
                      value={
                        radio.location
                          ? `${radio.location.building}${radio.location.room ? `, ${radio.location.room}` : ""}`
                          : "—"
                      }
                    />
                    <DetailRow
                      icon={User}
                      label="Assigned Officer"
                      value={
                        radio.assigned_officer
                          ? `${radio.assigned_officer.first_name} ${radio.assigned_officer.last_name}`
                          : "—"
                      }
                    />
                    {activeTracking && (
                      <>
                        <DetailRow
                          icon={User}
                          label="Current Holder"
                          value={
                            activeTracking.current_holder
                              ? `${activeTracking.current_holder.first_name} ${activeTracking.current_holder.last_name}`
                              : "—"
                          }
                        />
                        <DetailRow icon={Calendar} label="Issued Date" value={formatDate(activeTracking.issue_date)} />
                        {activeTracking.location && (
                          <DetailRow icon={MapPin} label="Area of Use" value={activeTracking.location} />
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Procurement Info */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Procurement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <DetailRow icon={User} label="Supplier" value={radio.supplier || "—"} />
                    <DetailRow icon={Calendar} label="Purchase Date" value={formatDate(radio.purchase_date)} />
                    <DetailRow icon={Calendar} label="Warranty Expiry" value={formatDate(radio.warranty_expiry)} />
                  </div>
                </CardContent>
              </Card>

              {/* Remarks */}
              {radio.remarks && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Remarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{radio.remarks}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Assignment History Tab */}
            <TabsContent value="tracking" className="mt-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Assignment History</CardTitle>
                  <CardDescription>
                    Record of all radio assignments and returns
                    {trackingHistory.length > 0 && ` · ${trackingHistory.length} entries`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trackingHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No assignment history</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assign this radio to begin tracking
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trackingHistory.map((entry: any) => (
                        <div
                          key={entry.id}
                          className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                            !entry.return_date
                              ? "border-accent/20 bg-accent/[0.03]"
                              : "border-border/50"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                              !entry.return_date ? "bg-accent" : "bg-muted-foreground/30"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {entry.current_holder
                                  ? `${entry.current_holder.first_name} ${entry.current_holder.last_name}`
                                  : "Unknown"}
                              </p>
                              {!entry.return_date && (
                                <Badge variant="outline" className="text-[10px] h-5 border-accent/30 text-accent">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Issued: {formatDate(entry.issue_date)}
                              </span>
                              {entry.return_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Returned: {formatDate(entry.return_date)}
                                </span>
                              )}
                              {entry.frequency && (
                                <span>Freq: {entry.frequency}</span>
                              )}
                              {entry.battery_status && (
                                <span>Battery: {entry.battery_status}</span>
                              )}
                            </div>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-1.5 italic">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Borrow History Tab */}
            <TabsContent value="borrow-history" className="mt-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Borrowing History</CardTitle>
                  <CardDescription>Past borrow and return transactions for this radio</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioBorrowHistory assetId={radioId} />
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
                Scan to view radio details
              </p>
            </CardContent>
          </Card>

          {/* Active Assignment */}
          {activeTracking && (
            <Card className="border-border/50 border-accent/20 bg-accent/[0.02]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                  Current Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">
                    {activeTracking.current_holder?.first_name} {activeTracking.current_holder?.last_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Since {formatDate(activeTracking.issue_date)}</span>
                </div>
                {activeTracking.location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{activeTracking.location}</span>
                  </div>
                )}
                {activeTracking.frequency && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Radio className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono">{activeTracking.frequency}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Summary */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <RadioStatusBadge status={radio.status} />
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition</span>
                <span className="capitalize font-medium">{radio.condition}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Battery</span>
                <BatteryBadge batteryStatus={radio.battery_status} />
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-mono text-xs">{radio.radio_frequency || "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-xs">{formatDistanceToNow(new Date(radio.created_at), { addSuffix: true })}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-xs">{formatDistanceToNow(new Date(radio.updated_at), { addSuffix: true })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {canManage && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-9 text-sm"
                  onClick={() => router.push(`/dashboard/inventory/${radioId}/edit`)}
                >
                  <Package className="w-3.5 h-3.5" />
                  Edit Details
                </Button>
                {!isRadioBorrowed && radio.status === "available" && (
                  <RadioAssignDialog
                    assetId={radioId}
                    assetName={radio.item_name}
                    officers={officers}
                    onSuccess={handleRefresh}
                  />
                )}
                {isRadioBorrowed && activeTracking && (
                  <RadioReturnDialog
                    assetId={radioId}
                    trackingId={activeTracking.id}
                    assetName={radio.item_name}
                    onSuccess={handleRefresh}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Radio Image */}
          {radio.image_url && (
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Photo</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <img
                  src={radio.image_url}
                  alt={radio.item_name}
                  className="w-full h-48 object-cover"
                />
              </CardContent>
            </Card>
          )}
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
