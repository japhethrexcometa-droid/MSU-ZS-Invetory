"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchRadioBorrowHistory, formatDateTime } from "@/lib/radio";
import { BorrowStatusBadge } from "@/components/borrow/borrow-status-badge";
import { Loader2, History, User, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { BorrowTransaction } from "@/types/database";

interface RadioBorrowHistoryProps {
  assetId: string;
}

export function RadioBorrowHistory({ assetId }: RadioBorrowHistoryProps) {
  const [history, setHistory] = useState<BorrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchRadioBorrowHistory(assetId);
        setHistory(data);
      } catch (error) {
        console.error("Failed to load borrow history:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium">No borrowing history</p>
        <p className="text-xs text-muted-foreground mt-1">This radio has not been borrowed yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((txn: any) => (
        <Link
          key={txn.id}
          href={`/dashboard/borrow/${txn.id}`}
          className="flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-muted/20 transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                {txn.borrower?.first_name} {txn.borrower?.last_name}
              </p>
              <span className="text-[10px] text-muted-foreground">
                · {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {txn.transaction_no}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <BorrowStatusBadge status={txn.status} className="text-[10px] h-5" />
              {txn.expected_return_date && (
                <span className="text-[10px] text-muted-foreground">
                  Due: {new Date(txn.expected_return_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
