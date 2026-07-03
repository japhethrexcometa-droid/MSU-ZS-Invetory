"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/useUser";
import { ImageUpload } from "@/components/inventory/image-upload";
import { createAsset } from "@/lib/inventory";
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
  Shield,
  Radio,
  QrCode,
  Package,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ASSET_CONDITIONS } from "@/lib/constants";

export default function NewAssetPage() {
  const router = useRouter();
  const { profile } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [showQR, setShowQR] = useState(true);

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

  // Load reference data
  useEffect(() => {
    const loadData = async () => {
      const [catRes, locRes, offRes] = await Promise.all([
        supabase.from("categories").select("*").eq("is_active", true).order("name"),
        supabase.from("locations").select("*").eq("is_active", true).order("building"),
        supabase
          .from("profiles")
          .select("id, first_name, last_name, role")
          .in("role", ["logistics_officer", "rotc_officer"] as any)
          .eq("is_active", true),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (locRes.data) setLocations(locRes.data);
      if (offRes.data) setOfficers(offRes.data);
    };
    loadData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_name.trim()) {
      toast.error("Item name is required");
      return;
    }

    setLoading(true);
    try {
      const asset = await createAsset({
        item_name: form.item_name,
        category_id: form.category_id || undefined,
        description: form.description || undefined,
        brand: form.brand || undefined,
        model: form.model || undefined,
        serial_number: form.serial_number || undefined,
        property_number: form.property_number || undefined,
        supplier: form.supplier || undefined,
        purchase_date: form.purchase_date || undefined,
        purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : undefined,
        funding_source: form.funding_source || undefined,
        location_id: form.location_id || undefined,
        assigned_officer_id: form.assigned_officer_id || undefined,
        condition: form.condition,
        status: form.status,
        image_url: form.image_url || undefined,
        warranty_expiry: form.warranty_expiry || undefined,
        useful_life_months: form.useful_life_months ? parseInt(form.useful_life_months) : undefined,
        is_radio: form.is_radio,
        radio_frequency: form.radio_frequency || undefined,
        battery_status: form.battery_status || undefined,
        remarks: form.remarks || undefined,
      });

      // Update QR code with the actual asset ID
      const finalQrData = JSON.stringify({
        id: asset.id,
        asset_id: asset.asset_id,
        name: form.item_name,
        system: "MSUZS-ROTC",
      });

      await (supabase as any).from("assets").update({ qr_code: finalQrData }).eq("id", asset.id);

      // Log activity
      await (supabase as any).from("activity_log").insert({
        user_id: profile!.id,
        activity_type: "created",
        description: `Created asset: ${form.item_name}`,
        reference_type: "asset",
        reference_id: asset.id,
      });

      toast.success("Asset created successfully!");
      router.push(`/dashboard/inventory/${asset.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create asset");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin =
    profile?.role === "logistics_officer";

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
            <span className="text-foreground font-medium">New Asset</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Register New Asset</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Basic Information
              </CardTitle>
              <CardDescription>Enter the fundamental details of the asset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="item_name">
                    Item Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="item_name"
                    placeholder="e.g., Combat Helmet, Communication Radio"
                    value={form.item_name}
                    onChange={(e) => updateField("item_name", e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => updateField("category_id", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the asset"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="e.g., Motorola, Browning"
                    value={form.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="e.g., XTS-5000, M9"
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
                Identification & Tracking
              </CardTitle>
              <CardDescription>Serial numbers, property tags, and QR code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    placeholder="Unique serial number"
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_number">Property Number</Label>
                  <Input
                    id="property_number"
                    placeholder="Government property number"
                    value={form.property_number}
                    onChange={(e) => updateField("property_number", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* QR Code Preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
                <div className="p-2 bg-white rounded-lg">
                  <QRCodeSVG
                    value={JSON.stringify({ name: form.item_name || "New Asset", system: "MSUZS-ROTC" })}
                    size={80}
                    level="M"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">QR Code</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A QR code will be automatically generated for this asset.
                    The QR code will be available for printing after creation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Radio-Specific Fields */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary" />
                    Radio Tracking
                  </CardTitle>
                  <CardDescription>Enable if this is a communication radio</CardDescription>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="radio_frequency">Frequency</Label>
                    <Input
                      id="radio_frequency"
                      placeholder="e.g., 150.000 MHz"
                      value={form.radio_frequency}
                      onChange={(e) => updateField("radio_frequency", e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="battery_status">Battery Status</Label>
                    <Select
                      value={form.battery_status}
                      onValueChange={(v) => updateField("battery_status", v)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select status" />
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

          {/* Procurement Details */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Procurement Details</CardTitle>
              <CardDescription>Purchase information and funding source</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    placeholder="Supplier name"
                    value={form.supplier}
                    onChange={(e) => updateField("supplier", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_cost">Purchase Cost (PHP)</Label>
                  <Input
                    id="purchase_cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.purchase_cost}
                    onChange={(e) => updateField("purchase_cost", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funding_source">Funding Source</Label>
                  <Input
                    id="funding_source"
                    placeholder="e.g., MOOE, GAA, Donation"
                    value={form.funding_source}
                    onChange={(e) => updateField("funding_source", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                  <Input
                    id="warranty_expiry"
                    type="date"
                    value={form.warranty_expiry}
                    onChange={(e) => updateField("warranty_expiry", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="useful_life_months">Useful Life (months)</Label>
                  <Input
                    id="useful_life_months"
                    type="number"
                    placeholder="e.g., 60"
                    value={form.useful_life_months}
                    onChange={(e) => updateField("useful_life_months", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location & Assignment */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Location & Assignment</CardTitle>
              <CardDescription>Where the asset is stored and who is responsible</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Storage Location</Label>
                  <Select
                    value={form.location_id}
                    onValueChange={(v) => updateField("location_id", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.building}
                          {loc.room ? ` - ${loc.room}` : ""}
                          {loc.cabinet ? ` / ${loc.cabinet}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_officer">Assigned Officer</Label>
                  <Select
                    value={form.assigned_officer_id}
                    onValueChange={(v) => updateField("assigned_officer_id", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select officer" />
                    </SelectTrigger>
                    <SelectContent>
                      {officers.map((off) => (
                        <SelectItem key={off.id} value={off.id}>
                          {off.first_name} {off.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status & Condition */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Status & Condition</CardTitle>
              <CardDescription>Current state and physical condition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => updateField("status", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select status" />
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
                  <Label htmlFor="condition">Condition</Label>
                  <Select
                    value={form.condition}
                    onValueChange={(v) => updateField("condition", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select condition" />
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
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Photos</CardTitle>
              <CardDescription>Upload an image of the asset</CardDescription>
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
              <CardDescription>Additional notes or comments</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="remarks"
                placeholder="Any additional information..."
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
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Asset
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
