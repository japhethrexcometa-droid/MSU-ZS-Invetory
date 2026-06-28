"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/useUser";
import { fetchAssetById, updateAsset } from "@/lib/inventory";
import { ImageUpload } from "@/components/inventory/image-upload";
import { StatusBadge, ConditionBadge } from "@/components/inventory/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  Package,
  Radio,
  QrCode,
  ChevronRight,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { ASSET_CONDITIONS } from "@/lib/constants";
import type { Asset } from "@/types/database";

export default function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [assetId, setAssetId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setAssetId(p.id));
  }, [params]);

  if (!assetId) return null;

  return <EditAssetForm assetId={assetId} />;
}

function EditAssetForm({ assetId }: { assetId: string }) {
  const router = useRouter();
  const { profile } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [asset, setAsset] = useState<Asset | null>(null);

  const [form, setForm] = useState({
    item_name: "",
    category_id: "",
    description: "",
    brand: "",
    model: "",
    serial_number: "",
    property_number: "",
    supplier: "",
    purchase_date: "",
    purchase_cost: "",
    funding_source: "",
    location_id: "",
    assigned_officer_id: "",
    condition: "good",
    status: "available",
    image_url: "",
    warranty_expiry: "",
    useful_life_months: "",
    is_radio: false,
    radio_frequency: "",
    battery_status: "",
    remarks: "",
  });

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const [assetData, catRes, locRes, offRes] = await Promise.all([
          fetchAssetById(assetId),
          supabase.from("categories").select("*").eq("is_active", true).order("name"),
          supabase.from("locations").select("*").eq("is_active", true).order("building"),
          supabase
            .from("profiles")
            .select("id, first_name, last_name, role")
            .in("role", ["system_administrator", "supply_officer", "logistics_officer", "property_custodian", "rotc_officer", "rotc_commandant"] as any)
            .eq("is_active", true),
        ]);

        setAsset(assetData);
        if (catRes.data) setCategories(catRes.data);
        if (locRes.data) setLocations(locRes.data);
        if (offRes.data) setOfficers(offRes.data);

        // Populate form
        setForm({
          item_name: assetData.item_name,
          category_id: assetData.category_id || "",
          description: assetData.description || "",
          brand: assetData.brand || "",
          model: assetData.model || "",
          serial_number: assetData.serial_number || "",
          property_number: assetData.property_number || "",
          supplier: assetData.supplier || "",
          purchase_date: assetData.purchase_date || "",
          purchase_cost: assetData.purchase_cost?.toString() || "",
          funding_source: assetData.funding_source || "",
          location_id: assetData.location_id || "",
          assigned_officer_id: assetData.assigned_officer_id || "",
          condition: assetData.condition || "good",
          status: assetData.status || "available",
          image_url: assetData.image_url || "",
          warranty_expiry: assetData.warranty_expiry || "",
          useful_life_months: assetData.useful_life_months?.toString() || "",
          is_radio: assetData.is_radio || false,
          radio_frequency: assetData.radio_frequency || "",
          battery_status: assetData.battery_status || "",
          remarks: assetData.remarks || "",
        });
      } catch (error) {
        toast.error("Failed to load asset");
        router.push("/dashboard/inventory");
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [assetId, supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_name.trim()) {
      toast.error("Item name is required");
      return;
    }

    setLoading(true);
    try {
      const updateData: Record<string, any> = {
        item_name: form.item_name,
        category_id: form.category_id && form.category_id !== "none" ? form.category_id : null,
        description: form.description || null,
        brand: form.brand || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        property_number: form.property_number || null,
        supplier: form.supplier || null,
        purchase_date: form.purchase_date || null,
        purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
        funding_source: form.funding_source || null,
        location_id: form.location_id && form.location_id !== "none" ? form.location_id : null,
        assigned_officer_id: form.assigned_officer_id && form.assigned_officer_id !== "none" ? form.assigned_officer_id : null,
        condition: form.condition,
        status: form.status,
        image_url: form.image_url || null,
        warranty_expiry: form.warranty_expiry || null,
        useful_life_months: form.useful_life_months ? parseInt(form.useful_life_months) : null,
        is_radio: form.is_radio,
        radio_frequency: form.radio_frequency || null,
        battery_status: form.battery_status || null,
        remarks: form.remarks || null,
      };

      const result = await updateAsset(assetId, updateData);

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: profile!.id,
        activity_type: "updated",
        description: `Updated asset: ${form.item_name}`,
        reference_type: "asset",
        reference_id: assetId,
      } as any);

      toast.success("Asset updated successfully!");
      router.push(`/dashboard/inventory/${assetId}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update asset");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
            <Link href="/dashboard/inventory" className="hover:text-foreground transition-colors">
              Inventory
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/dashboard/inventory/${assetId}`} className="hover:text-foreground transition-colors">
              {asset.item_name}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">Edit</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Edit Asset</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={form.status} />
          <ConditionBadge condition={form.condition} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Same form fields as the create page, pre-filled */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Basic Information
              </CardTitle>
              <CardDescription>Edit the fundamental details of the asset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="item_name">
                    Item Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="item_name"
                    value={form.item_name}
                    onChange={(e) => updateField("item_name", e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => updateField("category_id", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Input
                    value={form.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identification */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" />
                Identification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Property Number</Label>
                  <Input
                    value={form.property_number}
                    onChange={(e) => updateField("property_number", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Radio toggle */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary" />
                    Radio Tracking
                  </CardTitle>
                </div>
                <Badge
                  variant={form.is_radio ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => updateField("is_radio", !form.is_radio)}
                >
                  {form.is_radio ? "Radio Enabled" : "Not a Radio"}
                </Badge>
              </div>
            </CardHeader>
            {form.is_radio && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Input
                      value={form.radio_frequency}
                      onChange={(e) => updateField("radio_frequency", e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Battery Status</Label>
                    <Select
                      value={form.battery_status}
                      onValueChange={(v) => updateField("battery_status", v)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Procurement */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Procurement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input
                    value={form.supplier}
                    onChange={(e) => updateField("supplier", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost (PHP)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.purchase_cost}
                    onChange={(e) => updateField("purchase_cost", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Funding Source</Label>
                  <Input
                    value={form.funding_source}
                    onChange={(e) => updateField("funding_source", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Warranty Expiry</Label>
                  <Input
                    type="date"
                    value={form.warranty_expiry}
                    onChange={(e) => updateField("warranty_expiry", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Useful Life (months)</Label>
                  <Input
                    type="number"
                    value={form.useful_life_months}
                    onChange={(e) => updateField("useful_life_months", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Storage Location</Label>
                  <Select
                    value={form.location_id}
                    onValueChange={(v) => updateField("location_id", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.building}
                          {loc.room ? ` - ${loc.room}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigned Officer</Label>
                  <Select
                    value={form.assigned_officer_id}
                    onValueChange={(v) => updateField("assigned_officer_id", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {officers.map((off) => (
                        <SelectItem key={off.id} value={off.id}>
                          {off.first_name} {off.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Status & Condition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => updateField("status", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="borrowed">Borrowed</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="disposed">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={form.condition}
                    onValueChange={(v) => updateField("condition", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Image */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => updateField("image_url", url)}
              />
            </CardContent>
          </Card>

          {/* Remarks */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.remarks}
                onChange={(e) => updateField("remarks", e.target.value)}
                rows={3}
              />
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
            <Button type="submit" className="h-11 gap-2 px-6" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
