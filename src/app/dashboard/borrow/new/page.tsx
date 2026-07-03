"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { createBorrowRequest } from "@/lib/borrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Loader2,
  Package,
  ArrowLeftRight,
  ChevronRight,
  CalendarDays,
  Search,
  QrCode,
  Radio,
} from "lucide-react";

export default function NewBorrowRequestPage() {
  const router = useRouter();
  const { profile } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const [form, setForm] = useState({
    asset_id: "",
    expected_return_date: "",
    purpose: "",
  });

  // Calculate default return date (14 days from now)
  const getDefaultReturnDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!form.expected_return_date) {
      setForm((prev) => ({ ...prev, expected_return_date: getDefaultReturnDate() }));
    }
  }, []);

  // Load available assets
  useEffect(() => {
    const loadAssets = async () => {
      setAssetsLoading(true);
      try {
        const { data, error } = await supabase
          .from("assets")
          .select("id, asset_id, item_name, image_url, is_radio, condition, serial_number, category:category_id(name)")
          .eq("is_deleted", false)
          .eq("status", "available")
          .order("item_name");

        if (error) throw error;
        setAvailableAssets(data || []);
      } catch (error) {
        console.error("Failed to load assets:", error);
      } finally {
        setAssetsLoading(false);
      }
    };
    loadAssets();
  }, [supabase]);

  const filteredAssets = availableAssets.filter(
    (a) =>
      !assetSearch ||
      a.item_name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.asset_id.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.serial_number?.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const handleSelectAsset = (asset: any) => {
    setSelectedAsset(asset);
    setForm((prev) => ({ ...prev, asset_id: asset.id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_id) {
      toast.error("Please select an item to borrow");
      return;
    }
    if (!form.expected_return_date) {
      toast.error("Please set an expected return date");
      return;
    }

    setLoading(true);
    try {
      const transaction = await createBorrowRequest({
        asset_id: form.asset_id,
        borrower_id: profile!.id,
        expected_return_date: new Date(form.expected_return_date).toISOString(),
        purpose: form.purpose || undefined,
      });

      // Log activity
      await (supabase as any).from("activity_log").insert({
        user_id: profile!.id,
        activity_type: "borrowed",
        description: `Borrow request created for: ${selectedAsset?.item_name || "item"}`,
        reference_type: "borrow",
        reference_id: transaction.id,
      });

      toast.success("Borrow request submitted for approval!");
      router.push(`/dashboard/borrow/${transaction.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create borrow request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/borrow" className="hover:text-foreground transition-colors">
              Borrow / Return
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">New Request</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">New Borrow Request</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Select Item */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Select Item to Borrow
              </CardTitle>
              <CardDescription>Choose from available inventory items</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item name, asset ID, or serial number..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>

              {/* Asset List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {assetsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {assetSearch ? "No matching items found" : "No items available for borrowing"}
                    </p>
                  </div>
                ) : (
                  filteredAssets.map((asset) => (
                    <button
                      type="button"
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedAsset?.id === asset.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {asset.is_radio ? (
                            <Radio className="w-5 h-5 text-primary" />
                          ) : (
                            <Package className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{asset.item_name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                            {asset.asset_id}
                            {asset.serial_number ? ` · ${asset.serial_number}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              asset.condition === "excellent"
                                ? "border-success/30 text-success"
                                : asset.condition === "good"
                                ? "border-primary/30 text-primary"
                                : "border-warning/30 text-warning"
                            }`}
                          >
                            {asset.condition}
                          </Badge>
                          {asset.category && (
                            <p className="text-[10px] text-muted-foreground mt-1">{asset.category.name}</p>
                          )}
                        </div>
                        {selectedAsset?.id === asset.id && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedAsset && (
                <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                  <QrCode className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium">Selected Item</p>
                    <p className="text-sm font-semibold">{selectedAsset.item_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{selectedAsset.asset_id}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Borrow Details */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
                Borrow Details
              </CardTitle>
              <CardDescription>Set the terms of your borrowing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expected_return_date">
                    Expected Return Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="expected_return_date"
                    type="date"
                    value={form.expected_return_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, expected_return_date: e.target.value }))}
                    min={new Date().toISOString().split("T")[0]}
                    required
                    className="h-11"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Default is 14 days from today
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <div className="h-11 flex items-center px-3 rounded-lg border border-border bg-muted/20">
                    {form.expected_return_date ? (
                      <span className="text-sm text-muted-foreground">
                        {Math.ceil(
                          (new Date(form.expected_return_date).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        days
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Select a date</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Borrowing</Label>
                <Textarea
                  id="purpose"
                  placeholder="e.g., For field training exercise, For communication during event..."
                  value={form.purpose}
                  onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card className="border-border/50 bg-muted/10">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Terms & Conditions</p>
              <ul className="text-[11px] text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  I understand that I am fully responsible for the item while in my possession
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  I will return the item in the same condition it was received
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Late returns may incur penalties as per ROTC Unit policy
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Any damage or loss must be reported immediately
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center gap-3 justify-end pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 gap-2 px-6"
              disabled={loading || !selectedAsset}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
