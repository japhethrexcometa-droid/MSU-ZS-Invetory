import { createClient } from "@/lib/supabase/client";
import type { BorrowTransaction } from "@/types/database";

export async function fetchReturns(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = createClient();
  const { search, status, page = 1, pageSize = 20 } = params;

  let query = (supabase as any)
    .from("borrow_transactions")
    .select(
      `
      *,
      asset:asset_id(id, asset_id, item_name, image_url, status, condition),
      borrower:borrower_id(id, first_name, last_name, student_number),
      verified_by_profile:verified_by(id, first_name, last_name)
    `,
      { count: "exact" }
    )
    .in("status", ["returned", "late"])
    .order("updated_at", { ascending: false });

  if (search) {
    query = query.or(
      `transaction_no.ilike.%${search}%,asset.item_name.ilike.%${search}%,asset.asset_id.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("status", status);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as unknown as BorrowTransaction[], count: count || 0 };
}

export async function fetchReturnsStats() {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("borrow_transactions")
    .select("status, penalty_amount, penalty_paid")
    .in("status", ["returned", "late"]);

  if (error) throw error;

  const returns: Array<{ status: string; penalty_amount: number | null; penalty_paid: boolean }> = data || [];

  return {
    totalReturns: returns.length,
    onTime: returns.filter((r) => r.status === "returned").length,
    late: returns.filter((r) => r.status === "late").length,
    totalPenalties: returns.reduce((sum, r) => sum + (r.penalty_amount || 0), 0),
    collectedPenalties: returns
      .filter((r) => r.penalty_paid)
      .reduce((sum, r) => sum + (r.penalty_amount || 0), 0),
  };
}
