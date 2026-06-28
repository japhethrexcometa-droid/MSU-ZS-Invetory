"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { fetchMaintenanceById, updateMaintenanceRecord, MAINTENANCE_TYPE_CONFIG, MAINTENANCE_STATUS_CONFIG } from "@/lib/maintenance";
import { formatDate, formatCurrency } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Wrench,
  Package,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

export default function MaintenanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  const [healthScore, setHealthScore] = useState("");
  const [nextMaintenance, setNextMaintenance] = useState("");
  const [completedDate, setCompletedDate] = useState("");

  const isAdmin = profile?.role === "system_administrator" || profile?.role === "supply_officer";

  useEffect(() => {
    if (authLoading || !params.id) return;
    const loadRecord = async () => {
      try {
        const data = await fetchMaintenanceById(params.id as string);
        setRecord(data);
        setStatus(data.status);
        setNotes(data.notes || "");
        setCost(data.cost?.toString() || "");
        setHealthScore(data.health_score?.toString() || "");
        setNextMaintenance(data.next_maintenance_date || "");
        setCompletedDate(data.completed_date || "");
      } catch (error) {
        toast.error("Failed to load record");
        router.push("/dashboard/maintenance");
      } finally {
        setLoading(false);
      }
    };
    loadRecord();
  }, [params.id, authLoading, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMaintenanceRecord(record.id, {
        status,
        notes: notes || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        health_score: healthScore ? parseInt(healthScore) : undefined,
        next_maintenance_date: nextMaintenance || undefined,
        completed_date: completedDate || undefined,
      });
      toast.success("Record updated");
      setEditMode(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!record) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="gap-2" onClick={() => router.push("/dashboard/maintenance")}>
        <ArrowLeft className="w-4 h-4" /> Back to Maintenance
      </Button>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wrench className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Maintenance Record</h1>
            <Badge variant={MAINTENANCE_STATUS_CONFIG[record.status]?.variant as any || "outline"}>
              {MAINTENANCE_STATUS_CONFIG[record.status]?.label || record.status}
            </Badge>
            <Badge variant={MAINTENANCE_TYPE_CONFIG[record.maintenance_type]?.variant as any || "outline"}>
              {MAINTENANCE_TYPE_CONFIG[record.maintenance_type]?.label || record.maintenance_type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Created {formatDate(record.created_at)}</p>
        </div>
        {isAdmin && (
          <Button variant={editMode ? "default" : "outline"} onClick={() => editMode ? handleSave() : setEditMode(true)} disabled={saving}>
            {saving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
            {editMode ? "Save Changes" : "Edit"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                {editMode ? (
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                ) : (
                  <p className="text-sm">{record.description}</p>
                )}
              </div>

              {editMode ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                      <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cost (₱)</label>
                      <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Health Score (0-100)</label>
                      <Input type="number" min={0} max={100} value={healthScore} onChange={(e) => setHealthScore(e.target.value)} placeholder="e.g. 85" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Completed Date</label>
                      <Input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Next Maintenance Date</label>
                    <Input type="date" value={nextMaintenance} onChange={(e) => setNextMaintenance(e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Scheduled Date</p>
                      <p className="text-sm font-medium">{formatDate(record.scheduled_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Completed Date</p>
                      <p className="text-sm font-medium">{formatDate(record.completed_date)}</p>
                    </div>
                  </div>
                  {(record.cost || record.health_score !== null) && (
                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                      {record.cost && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Cost</p>
                          <p className="text-sm font-medium">{formatCurrency(record.cost)}</p>
                        </div>
                      )}
                      {record.health_score !== null && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Health Score</p>
                          <p className="text-sm font-medium">{record.health_score}/100</p>
                        </div>
                      )}
                    </div>
                  )}
                  {record.next_maintenance_date && (
                    <div className="border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground mb-1">Next Maintenance</p>
                      <p className="text-sm font-medium">{formatDate(record.next_maintenance_date)}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {record.notes && !editMode && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{record.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Asset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors -mx-2 cursor-pointer" onClick={() => router.push(`/dashboard/inventory/${record.asset_id}`)}>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{record.asset?.item_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{record.asset?.asset_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div>
                  <p className="text-xs font-medium">Created</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(record.created_at)}</p>
                </div>
              </div>
              {record.scheduled_date && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <div>
                    <p className="text-xs font-medium">Scheduled</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(record.scheduled_date)}</p>
                  </div>
                </div>
              )}
              {record.completed_date && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <div>
                    <p className="text-xs font-medium">Completed</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(record.completed_date)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
