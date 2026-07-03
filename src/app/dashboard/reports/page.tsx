"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Loader2,
  Download,
  FileSpreadsheet,
  FileBarChart,
  Shield,
  Printer,
  Package,
  ArrowLeftRight,
  Users,
  AlertTriangle,
  PhilippinePeso,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ReportType = "inventory" | "borrows" | "users" | "lost-damaged" | "maintenance" | "locations";

const REPORT_CONFIG: Record<ReportType, { title: string; description: string; icon: any }> = {
  inventory: { title: "Inventory Report", description: "Complete asset inventory with status and condition", icon: Package },
  borrows: { title: "Borrow / Return Report", description: "All borrow transactions with penalties", icon: ArrowLeftRight },
  users: { title: "Users Report", description: "User accounts with roles and status", icon: Users },
  "lost-damaged": { title: "Lost & Damaged Report", description: "Lost and damage incident reports", icon: AlertTriangle },
  maintenance: { title: "Maintenance Report", description: "Maintenance records and costs", icon: FileBarChart },
  locations: { title: "Locations Report", description: "Storage locations and asset counts", icon: Building2 },
};

export default function ReportsPage() {
  const { profile, loading: authLoading } = useUser();
  const supabase = createClient();

  const [selectedReport, setSelectedReport] = useState<ReportType>("inventory");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);

  const isAdmin = profile?.role === "logistics_officer";

  const fetchReportData = async (): Promise<any[]> => {
    switch (selectedReport) {
      case "inventory": {
        const { data } = await (supabase as any)
          .from("assets")
          .select("asset_id, item_name, category:category_id(name), status, condition, brand, model, serial_number, purchase_cost, location:location_id(building, room)")
          .eq("is_deleted", false)
          .order("item_name");
        return (data || []).map((a: any) => ({
          "Asset ID": a.asset_id,
          "Item Name": a.item_name,
          Category: a.category?.name || "",
          Status: a.status,
          Condition: a.condition,
          Brand: a.brand || "",
          Model: a.model || "",
          "Serial Number": a.serial_number || "",
          "Purchase Cost": a.purchase_cost || 0,
          Location: a.location ? `${a.location.building}${a.location.room ? ` - ${a.location.room}` : ""}` : "",
        }));
      }
      case "borrows": {
        const { data } = await (supabase as any)
          .from("borrow_transactions")
          .select("transaction_no, asset:asset_id(item_name), borrower:borrower_id(first_name, last_name), status, borrow_date, expected_return_date, actual_return_date, penalty_amount, penalty_paid")
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });
        return (data || []).map((b: any) => ({
          "Transaction #": b.transaction_no,
          Item: b.asset?.item_name || "",
          Borrower: b.borrower ? `${b.borrower.first_name} ${b.borrower.last_name}` : "",
          Status: b.status,
          "Borrow Date": b.borrow_date ? new Date(b.borrow_date).toLocaleDateString() : "",
          "Expected Return": b.expected_return_date ? new Date(b.expected_return_date).toLocaleDateString() : "",
          "Actual Return": b.actual_return_date ? new Date(b.actual_return_date).toLocaleDateString() : "",
          "Penalty (₱)": b.penalty_amount || 0,
          "Penalty Paid": b.penalty_paid ? "Yes" : "No",
        }));
      }
      case "users": {
        const { data } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, role, student_number, is_active, is_approved")
          .order("last_name");
        return (data || []).map((u: any) => ({
          Name: `${u.first_name} ${u.last_name}`,
          Email: u.email,
          Role: u.role,
          "Student #": u.student_number || "",
          Active: u.is_active ? "Yes" : "No",
          Approved: u.is_approved ? "Yes" : "No",
        }));
      }
      case "lost-damaged": {
        const [lost, damaged] = await Promise.all([
          (supabase as any).from("lost_reports").select("report_no, asset:asset_id(item_name), description, date_lost, replacement_status, created_at"),
          (supabase as any).from("damage_reports").select("report_no, asset:asset_id(item_name), damage_description, estimated_repair_cost, repair_status, created_at"),
        ]);
        return [
          ...(lost.data || []).map((r: any) => ({
            "Report #": r.report_no,
            Type: "Lost",
            Item: r.asset?.item_name || "",
            Description: r.description,
            "Date": new Date(r.date_lost).toLocaleDateString(),
            Status: r.replacement_status,
          })),
          ...(damaged.data || []).map((r: any) => ({
            "Report #": r.report_no,
            Type: "Damaged",
            Item: r.asset?.item_name || "",
            Description: r.damage_description,
            "Est. Cost": r.estimated_repair_cost || 0,
            Status: r.repair_status,
          })),
        ];
      }
      case "maintenance": {
        const { data } = await (supabase as any)
          .from("maintenance_records")
          .select("asset:asset_id(item_name), maintenance_type, description, scheduled_date, completed_date, status, cost, health_score")
          .order("created_at", { ascending: false });
        return (data || []).map((m: any) => ({
          Item: m.asset?.item_name || "",
          Type: m.maintenance_type,
          Description: m.description,
          "Scheduled": m.scheduled_date || "",
          Completed: m.completed_date || "",
          Status: m.status,
          "Cost (₱)": m.cost || 0,
          "Health Score": m.health_score || "",
        }));
      }
      case "locations": {
        const { data } = await (supabase as any)
          .from("locations")
          .select("building, room, cabinet, shelf, description");
        return (data || []).map((l: any) => ({
          Building: l.building,
          Room: l.room || "",
          Cabinet: l.cabinet || "",
          Shelf: l.shelf || "",
          Description: l.description || "",
        }));
      }
      default:
        return [];
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setPreview(null);
    try {
      const data = await fetchReportData();
      setPreview(data);
      toast.success(`Report generated: ${data.length} records`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportExcel = () => {
    if (!preview || preview.length === 0) {
      toast.error("No data to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(preview);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${selectedReport}-report.xlsx`);
    toast.success("Excel file downloaded");
  };

  const handlePrint = () => {
    window.print();
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and export system reports
        </p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(REPORT_CONFIG).map(([key, config]) => {
              if (key === "users" && !isAdmin) return null;
              
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedReport(key as ReportType)}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    selectedReport === key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{config.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />}
              {generating ? "Generating..." : "Generate Report"}
            </Button>
            {preview && preview.length > 0 && (
              <>
                <Button variant="outline" onClick={handleExportExcel} className="gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel
                </Button>
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Badge variant="secondary" className="ml-auto">
                  {preview.length} records
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && preview.length > 0 && (
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              {REPORT_CONFIG[selectedReport].title} — Preview
            </CardTitle>
            <CardDescription>Showing first 50 of {preview.length} records</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/10">
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} className="px-4 py-2 text-xs whitespace-nowrap">
                        {val?.toString() || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
