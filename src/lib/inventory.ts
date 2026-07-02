import { createClient } from "@/lib/supabase/client";
import type { Asset } from "@/types/database";
import {
  createAssetSchema,
  updateAssetSchema,
  validateOrThrow,
} from "@/lib/validations";

// Fetch all inventory items with optional filters
export async function fetchInventory(params: {
  search?: string;
  categoryId?: string;
  status?: string;
  condition?: string;
  locationId?: string;
  isRadio?: boolean;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}) {
  const supabase = createClient();
  const {
    search,
    categoryId,
    status,
    condition,
    locationId,
    isRadio,
    page = 1,
    pageSize = 20,
    sortField = "created_at",
    sortOrder = "desc",
  } = params;

  let query = supabase
    .from("assets")
    .select(
      `
      *,
      category:category_id(id, name, slug),
      location:location_id(id, building, room),
      assigned_officer:assigned_officer_id(id, first_name, last_name)
    `,
      { count: "exact" }
    )
    .eq("is_deleted", false);

  // Apply filters
  if (search) {
    query = query.or(
      `item_name.ilike.%${search}%,serial_number.ilike.%${search}%,asset_id.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`
    );
  }
  if (categoryId) query = query.eq("category_id", categoryId);
  if (status) query = query.eq("status", status);
  if (condition) query = query.eq("condition", condition);
  if (locationId) query = query.eq("location_id", locationId);
  if (isRadio !== undefined) query = query.eq("is_radio", isRadio);

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order(sortField, { ascending: sortOrder === "asc" })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as unknown as Asset[], count: count || 0 };
}

// Fetch a single asset by ID
export async function fetchAssetById(id: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("assets")
    .select(
      `
      *,
      category:category_id(*),
      location:location_id(*),
      assigned_officer:assigned_officer_id(id, first_name, last_name, email, role),
      documents:asset_documents(*)
    `
    )
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error) throw error;
  return data as unknown as Asset;
}

// Create a new asset
export async function createAsset(raw: Record<string, unknown>) {
  const data = validateOrThrow(createAssetSchema, raw);
  const supabase = createClient();

  const { data: asset, error } = await (supabase as any)
    .from("assets")
    .insert({
      item_name: data.item_name,
      category_id: data.category_id || null,
      description: data.description || null,
      brand: data.brand || null,
      model: data.model || null,
      serial_number: data.serial_number || null,
      property_number: data.property_number || null,
      supplier: data.supplier || null,
      purchase_date: data.purchase_date || null,
      purchase_cost: data.purchase_cost || null,
      funding_source: data.funding_source || null,
      location_id: data.location_id || null,
      assigned_officer_id: data.assigned_officer_id || null,
      condition: data.condition,
      status: data.status,
      image_url: data.image_url || null,
      qr_code: data.qr_code || null,
      warranty_expiry: data.warranty_expiry || null,
      useful_life_months: data.useful_life_months || null,
      is_radio: data.is_radio || false,
      radio_frequency: data.radio_frequency || null,
      battery_status: data.battery_status || null,
      remarks: data.remarks || null,
    })
    .select()
    .single();

  if (error) throw error;
  return asset as unknown as Asset;
}

// Update an existing asset
export async function updateAsset(id: string, raw: Record<string, unknown>) {
  const data = validateOrThrow(updateAssetSchema, raw);
  const supabase = createClient();

  const { data: asset, error } = await (supabase as any)
    .from("assets")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return asset as unknown as Asset;
}

// Soft-delete an asset
export async function deleteAsset(id: string) {
  const supabase = createClient();

  const { error } = await (supabase as any)
    .from("assets")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

// Fetch all categories
export async function fetchCategories() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data;
}

// Fetch all locations
export async function fetchLocations() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true)
    .order("building");

  if (error) throw error;
  return data;
}

// Status badge configuration
export const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "accent" }
> = {
  available: { label: "Available", variant: "success" },
  borrowed: { label: "Borrowed", variant: "accent" },
  maintenance: { label: "Maintenance", variant: "warning" },
  lost: { label: "Lost", variant: "destructive" },
  disposed: { label: "Disposed", variant: "default" },
};

export const CONDITION_CONFIG: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "destructive" }
> = {
  excellent: { label: "Excellent", variant: "success" },
  good: { label: "Good", variant: "default" },
  fair: { label: "Fair", variant: "warning" },
  poor: { label: "Poor", variant: "destructive" },
  damaged: { label: "Damaged", variant: "destructive" },
};

// Generate QR code data URL
export function generateQrData(assetId: string, itemName: string): string {
  // This creates a data URL for the QR code - the actual QR is rendered client-side
  return JSON.stringify({
    id: assetId,
    name: itemName,
    system: "MSUZS-ROTC",
    version: 1,
  });
}

// Format currency (PHP)
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

// Format date
export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
