import { createClient } from "@/lib/supabase/client";
import type { BorrowTransaction, Asset } from "@/types/database";

// Fetch borrow transactions with filters
export async function fetchBorrowTransactions(params: {
  search?: string;
  status?: string;
  assetId?: string;
  borrowerId?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}) {
  const supabase = createClient();
  const {
    search,
    status,
    assetId,
    borrowerId,
    page = 1,
    pageSize = 20,
    sortField = "created_at",
    sortOrder = "desc",
  } = params;

  let query = (supabase as any)
    .from("borrow_transactions")
    .select(
      `
      *,
      asset:asset_id(id, asset_id, item_name, image_url, is_radio, status),
      borrower:borrower_id(id, first_name, last_name, student_number, officer_id),
      approved_by_profile:approved_by(id, first_name, last_name),
      released_by_profile:released_by(id, first_name, last_name),
      verified_by_profile:verified_by(id, first_name, last_name)
    `,
      { count: "exact" }
    )
    .eq("is_deleted", false);

  if (search) {
    query = query.or(
      `transaction_no.ilike.%${search}%,asset.asset_id.ilike.%${search}%,asset.item_name.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("status", status);
  if (assetId) query = query.eq("asset_id", assetId);
  if (borrowerId) query = query.eq("borrower_id", borrowerId);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order(sortField, { ascending: sortOrder === "asc" }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as unknown as BorrowTransaction[], count: count || 0 };
}

// Fetch a single borrow transaction by ID
export async function fetchBorrowById(id: string) {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("borrow_transactions")
    .select(
      `
      *,
      asset:asset_id(*, category:category_id(*), location:location_id(*)),
      borrower:borrower_id(*),
      approved_by_profile:approved_by(id, first_name, last_name, email, role),
      released_by_profile:released_by(id, first_name, last_name, email, role),
      verified_by_profile:verified_by(id, first_name, last_name, email, role)
    `
    )
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error) throw error;
  return data as unknown as BorrowTransaction;
}

// Create a new borrow request
export async function createBorrowRequest(data: {
  asset_id: string;
  borrower_id: string;
  expected_return_date: string;
  purpose?: string;
}) {
  const supabase = createClient();

  const { data: transaction, error } = await (supabase as any)
    .from("borrow_transactions")
    .insert({
      asset_id: data.asset_id,
      borrower_id: data.borrower_id,
      expected_return_date: data.expected_return_date,
      purpose: data.purpose || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return transaction as unknown as BorrowTransaction;
}

// Approve a borrow request
export async function approveBorrowRequest(id: string, approvedById: string | null) {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("borrow_transactions")
    .update({
      status: "approved",
      approved_by: approvedById,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as BorrowTransaction;
}

// Reject a borrow request
export async function rejectBorrowRequest(id: string, approvedById: string | null) {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("borrow_transactions")
    .update({
      status: "rejected",
      approved_by: approvedById,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as BorrowTransaction;
}

// Release an item (after approval, supply officer releases physical item)
export async function releaseBorrowItem(
  id: string,
  releasedById: string | null,
  conditionBefore: string,
  borrowerSignature?: string,
  officerSignature?: string
) {
  const supabase = createClient();

  const { data: transaction, error } = await (supabase as any)
    .from("borrow_transactions")
    .update({
      status: "released",
      released_by: releasedById,
      condition_before: conditionBefore,
      borrow_date: new Date().toISOString(),
      borrower_signature: borrowerSignature || null,
      officer_signature: officerSignature || null,
    })
    .eq("id", id)
    .select("asset_id")
    .single();

  if (error) throw error;

  // Update asset status to borrowed
  await (supabase as any)
    .from("assets")
    .update({ status: "borrowed" })
    .eq("id", transaction.asset_id);

  return transaction;
}

// Process a return
export async function processReturn(
  id: string,
  data: {
    verified_by: string | null;
    condition_after: string;
    return_notes?: string;
    penalty_amount?: number;
    penalty_paid?: boolean;
  }
) {
  const supabase = createClient();

  const { data: transaction, error } = await (supabase as any)
    .from("borrow_transactions")
    .update({
      status: "returned",
      verified_by: data.verified_by,
      condition_after: data.condition_after,
      actual_return_date: new Date().toISOString(),
      return_notes: data.return_notes || null,
      penalty_amount: data.penalty_amount || 0,
      penalty_paid: data.penalty_paid || false,
    })
    .eq("id", id)
    .select("asset_id")
    .single();

  if (error) throw error;

  // Update asset status back to available
  await (supabase as any)
    .from("assets")
    .update({ status: "available" })
    .eq("id", transaction.asset_id);

  return transaction;
}

// Calculate penalty for late return
export function calculatePenalty(
  expectedReturnDate: string,
  actualReturnDate: string,
  penaltyPerDay: number = 50
): { days: number; amount: number } {
  const expected = new Date(expectedReturnDate);
  const actual = new Date(actualReturnDate);
  const diffTime = actual.getTime() - expected.getTime();
  const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  return { days, amount: days * penaltyPerDay };
}

// Generate receipt data for return
export function generateReceiptData(transaction: BorrowTransaction) {
  return {
    receiptNo: `RCT-${transaction.transaction_no}`,
    transactionNo: transaction.transaction_no,
    transactionId: transaction.id,
    itemName: (transaction as any).asset?.item_name || "",
    assetId: (transaction as any).asset?.asset_id || "",
    borrowerName: (transaction as any).borrower
      ? `${(transaction as any).borrower.first_name} ${(transaction as any).borrower.last_name}`
      : "",
    borrowDate: transaction.borrow_date,
    expectedReturn: transaction.expected_return_date,
    actualReturn: transaction.actual_return_date || new Date().toISOString(),
    conditionBefore: transaction.condition_before,
    conditionAfter: transaction.condition_after,
    penaltyAmount: transaction.penalty_amount || 0,
    penaltyPaid: transaction.penalty_paid,
    returnNotes: transaction.return_notes || "",
  };
}

// Borrow status config for badges
export const BORROW_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "secondary" },
  released: { label: "Released", variant: "default" },
  returned: { label: "Returned", variant: "secondary" },
  late: { label: "Late", variant: "destructive" },
  lost: { label: "Lost", variant: "destructive" },
  damaged: { label: "Damaged", variant: "destructive" },
  rejected: { label: "Rejected", variant: "destructive" },
};

// Format datetime for display
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Check if a transaction is overdue
export function isOverdue(expectedReturnDate: string): boolean {
  return new Date(expectedReturnDate) < new Date();
}

// Get available assets for borrowing (not deleted, not already borrowed)
export async function fetchAvailableAssets() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("assets")
    .select("id, asset_id, item_name, image_url, is_radio, status, condition, category:category_id(name)")
    .eq("is_deleted", false)
    .eq("status", "available")
    .order("item_name");

  if (error) throw error;
  return data;
}

// Report an item as lost from a borrow transaction
export async function reportLostFromBorrow(
  transactionId: string,
  data: {
    reporter_id: string;
    date_lost: string;
    location_lost?: string;
    description: string;
  }
) {
  const supabase = createClient();

  // Get the transaction to find the asset
  const { data: txn } = await (supabase as any)
    .from("borrow_transactions")
    .select("asset_id")
    .eq("id", transactionId)
    .single();

  if (!txn) throw new Error("Transaction not found");

  // Update borrow status to lost
  await (supabase as any)
    .from("borrow_transactions")
    .update({ status: "lost" })
    .eq("id", transactionId);

  // Update asset status to lost
  await (supabase as any)
    .from("assets")
    .update({ status: "lost" })
    .eq("id", txn.asset_id);

  // Create lost report
  const { data: report, error } = await (supabase as any)
    .from("lost_reports")
    .insert({
      asset_id: txn.asset_id,
      transaction_id: transactionId,
      reporter_id: data.reporter_id,
      date_lost: data.date_lost,
      location_lost: data.location_lost || null,
      description: data.description,
    })
    .select()
    .single();

  if (error) throw error;
  return report;
}

// Report damage from a borrow transaction
export async function reportDamageFromBorrow(
  transactionId: string,
  data: {
    reporter_id: string;
    damage_description: string;
    estimated_repair_cost?: number;
  }
) {
  const supabase = createClient();

  const { data: txn } = await (supabase as any)
    .from("borrow_transactions")
    .select("asset_id")
    .eq("id", transactionId)
    .single();

  if (!txn) throw new Error("Transaction not found");

  // Update borrow status to damaged
  await (supabase as any)
    .from("borrow_transactions")
    .update({ status: "damaged" })
    .eq("id", transactionId);

  // Update asset condition to damaged
  await (supabase as any)
    .from("assets")
    .update({ condition: "damaged" })
    .eq("id", txn.asset_id);

  // Create damage report
  const { data: report, error } = await (supabase as any)
    .from("damage_reports")
    .insert({
      asset_id: txn.asset_id,
      transaction_id: transactionId,
      reporter_id: data.reporter_id,
      damage_description: data.damage_description,
      estimated_repair_cost: data.estimated_repair_cost || null,
    })
    .select()
    .single();

  if (error) throw error;
  return report;
}
