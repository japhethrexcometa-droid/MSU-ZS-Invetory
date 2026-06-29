"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { fetchLostReportById, fetchDamageReportById, updateLostReport, updateDamageReport, LOST_STATUS_CONFIG, DAMAGE_STATUS_CONFIG } from "@/lib/lost-damaged";
import { formatDate } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  AlertTriangle,
  User,
  Package,
  FileText,
  ShieldAlert,
  Hammer,
} from "lucide-react";
import { toast } from "sonner";

export default function LostDamagedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();
  const supabase = createClient();

  const [report, setReport] = useState<any>(null);
  const [reportType, setReportType] = useState<"lost" | "damage">("lost");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lost-specific fields
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [replacementStatus, setReplacementStatus] = useState("pending");
  const [officerRemarks, setOfficerRemarks] = useState("");

  // Damage-specific fields
  const [repairStatus, setRepairStatus] = useState("pending");
  const [actualCost, setActualCost] = useState("");
  const [assignedTechnician, setAssignedTechnician] = useState("");
  const [repairNotes, setRepairNotes] = useState("");

  const isLogistics = profile?.role === "logistics_officer";

  useEffect(() => {
    if (authLoading || !params.id) return;

    const loadReport = async () => {
      setLoading(true);
      try {
        // Try to fetch as lost report first
        try {
          const data = await fetchLostReportById(params.id as string);
          setReport(data);
          setReportType("lost");
          setInvestigationNotes(data.investigation_notes || "");
          setReplacementStatus(data.replacement_status || "pending");
          setOfficerRemarks(data.officer_remarks || "");
          return;
        } catch {
          // Try as damage report
          const data = await fetchDamageReportById(params.id as string);
          setReport(data);
          setReportType("damage");
          setRepairStatus(data.repair_status || "pending");
          setActualCost(data.actual_repair_cost?.toString() || "");
          setAssignedTechnician(data.assigned_technician || "");
          setRepairNotes(data.repair_notes || "");
        }
      } catch (error) {
        console.error("Failed to load report:", error);
        toast.error("Report not found");
        router.push("/dashboard/lost-damaged");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [params.id, authLoading, router]);

  const handleUpdateLost = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await updateLostReport(report.id, {
        investigation_notes: investigationNotes,
        replacement_status: replacementStatus,
        officer_remarks: officerRemarks,
      });
      toast.success("Lost report updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDamage = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await updateDamageReport(report.id, {
        repair_status: repairStatus,
        actual_repair_cost: actualCost ? parseFloat(actualCost) : undefined,
        assigned_technician: assignedTechnician || undefined,
        repair_notes: repairNotes,
      });
      toast.success("Damage report updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" className="gap-2" onClick={() => router.push("/dashboard/lost-damaged")}>
        <ArrowLeft className="w-4 h-4" /> Back to Reports
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          {reportType === "lost" ? (
            <ShieldAlert className="w-6 h-6 text-destructive" />
          ) : (
            <Hammer className="w-6 h-6 text-destructive" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {reportType === "lost" ? report.report_no : report.report_no}
          </h1>
          <p className="text-sm text-muted-foreground">
            {reportType === "lost" ? "Lost Report" : "Damage Report"}
          </p>
        </div>
        <Badge
          variant={(reportType === "lost"
            ? LOST_STATUS_CONFIG[report.replacement_status]
            : DAMAGE_STATUS_CONFIG[report.repair_status]
          )?.variant as any || "outline"}
          className="ml-auto"
        >
          {(reportType === "lost"
            ? LOST_STATUS_CONFIG[report.replacement_status]
            : DAMAGE_STATUS_CONFIG[report.repair_status]
          )?.label || "Unknown"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{reportType === "lost" ? report.description : report.damage_description}</p>

              {reportType === "lost" && report.location_lost && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Location Lost</p>
                  <p className="text-sm font-medium">{report.location_lost}</p>
                </div>
              )}

              {reportType === "damage" && (
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Estimated Repair Cost</p>
                    <p className="text-sm font-medium">
                      {report.estimated_repair_cost ? `₱${report.estimated_repair_cost.toLocaleString()}` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Actual Repair Cost</p>
                    <p className="text-sm font-medium">
                      {report.actual_repair_cost ? `₱${report.actual_repair_cost.toLocaleString()}` : "Pending"}
                    </p>
                  </div>
                </div>
              )}

              {reportType === "damage" && report.assigned_technician && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Assigned Technician</p>
                  <p className="text-sm font-medium">{report.assigned_technician}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Officer Actions */}
          {isLogistics && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Officer Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportType === "lost" ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Investigation Notes</label>
                      <Textarea
                        value={investigationNotes}
                        onChange={(e) => setInvestigationNotes(e.target.value)}
                        rows={3}
                        placeholder="Enter investigation findings..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Replacement Status</label>
                      <Select value={replacementStatus} onValueChange={(v) => setReplacementStatus(v ?? "")}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="ordered">Replacement Ordered</SelectItem>
                          <SelectItem value="received">Replacement Received</SelectItem>
                          <SelectItem value="not_applicable">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Officer Remarks</label>
                      <Textarea
                        value={officerRemarks}
                        onChange={(e) => setOfficerRemarks(e.target.value)}
                        rows={2}
                        placeholder="Additional remarks..."
                      />
                    </div>
                    <Button onClick={handleUpdateLost} disabled={saving}>
                      {saving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                      Update Lost Report
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Repair Status</label>
                        <Select value={repairStatus} onValueChange={(v) => setRepairStatus(v ?? "")}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="irreparable">Irreparable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Actual Repair Cost (₱)</label>
                        <Input
                          type="number"
                          value={actualCost}
                          onChange={(e) => setActualCost(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Assigned Technician</label>
                      <Input
                        value={assignedTechnician}
                        onChange={(e) => setAssignedTechnician(e.target.value)}
                        placeholder="Technician name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Repair Notes</label>
                      <Textarea
                        value={repairNotes}
                        onChange={(e) => setRepairNotes(e.target.value)}
                        rows={3}
                        placeholder="Notes on the repair..."
                      />
                    </div>
                    <Button onClick={handleUpdateDamage} disabled={saving}>
                      {saving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                      Update Damage Report
                    </Button>
                  </>
                )}
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
                Item Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href={`/dashboard/inventory/${report.asset_id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors -mx-2"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{report.asset?.item_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{report.asset?.asset_id}</p>
                </div>
              </Link>
              <div className="border-t border-border pt-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={report.asset?.status === "lost" ? "destructive" : "secondary"} className="mt-1">
                    {report.asset?.status || "Unknown"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Reported By
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">
                {report.reporter ? `${report.reporter.first_name} ${report.reporter.last_name}` : "—"}
              </p>
              {report.reporter?.student_number && (
                <p className="text-xs text-muted-foreground font-mono">{report.reporter.student_number}</p>
              )}
              <div className="border-t border-border pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Date Lost</span>
                  <span>{formatDate(report.date_lost)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(report.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {reportType === "lost" && report.investigating_officer && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-sm">Investigating Officer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {report.investigating_officer.first_name} {report.investigating_officer.last_name}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
