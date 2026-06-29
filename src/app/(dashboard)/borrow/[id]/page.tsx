"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { fetchBorrowById, formatDateTime, generateReceiptData, isOverdue } from "@/lib/borrow";
import { BorrowStatusBadge } from "@/components/borrow/borrow-status-badge";
import { BorrowTimeline } from "@/components/borrow/borrow-timeline";
import {
  ApproveAction,
  RejectAction,
  ReleaseAction,
} from "@/components/borrow/borrow-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  User,
  CalendarDays,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
  Loader2,
  ChevronRight,
  Mail,
  AlertTriangle,
  DollarSign,
  Shield,
  QrCode,
  Printer,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ASSET_CONDITIONS } from "@/lib/constants";

export default function BorrowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [borrowId, setBorrowId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setBorrowId(p.id));
  }, [params]);

  if (!borrowId) return null;

  return <BorrowDetail borrowId={borrowId} />;
}

function BorrowDetail({ borrowId }: { borrowId: string }) {
  const router = useRouter();
  const { profile } = useUser();
  const supabase = createClient();

  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnCondition, setReturnCondition] = useState("good");
  const [returnNotes, setReturnNotes] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const isLogistics = profile?.role === "logistics_officer";
  const canApprove = profile?.role === "logistics_officer";
  const canRelease = profile?.role === "logistics_officer";

  const isMyTransaction = transaction?.borrower_id === profile?.id;
  const isBorrower = profile?.role === "rotc_officer" && isMyTransaction;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchBorrowById(borrowId);
        setTransaction(data);
      } catch (error) {
        toast.error("Failed to load transaction");
        router.push("/dashboard/borrow");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [borrowId, router]);

  const handleReturnOpen = () => {
    setReturnDialogOpen(true);
    // Calculate penalty
    const daysOverdue = Math.max(
      0,
      Math.ceil(
        (new Date().getTime() - new Date(transaction.expected_return_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    setPenaltyAmount(daysOverdue * 50);
  };

  const handleReturnSubmit = async () => {
    setSubmitting(true);
    try {
      const { processReturn } = await import("@/lib/borrow");
      await processReturn(borrowId, {
        verified_by: profile!.id,
        condition_after: returnCondition,
        return_notes: returnNotes,
        penalty_amount: penaltyAmount,
      });

      await (supabase as any).from("activity_log").insert({
        user_id: profile!.id,
        activity_type: "returned",
        description: `Return processed for transaction ${transaction.transaction_no}`,
        reference_type: "borrow",
        reference_id: borrowId,
      });

      toast.success("Return processed successfully!");
      setReturnDialogOpen(false);
      router.refresh();
      // Reload the transaction
      const data = await fetchBorrowById(borrowId);
      setTransaction(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to process return");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const data = await fetchBorrowById(borrowId);
      setTransaction(data);
    } catch (error) {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transaction) return null;

  const overdue =
    transaction.status === "released" && isOverdue(transaction.expected_return_date);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Link href="/dashboard/borrow" className="hover:text-foreground transition-colors">
          Borrow / Return
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium font-mono">{transaction.transaction_no}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight font-mono">{transaction.transaction_no}</h1>
              <BorrowStatusBadge status={transaction.status} className="text-sm px-3 py-1" />
              {overdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue
                </Badge>
              )}
              {penaltyAmount > 0 && (
                <Badge variant="secondary" className="gap-1 border-warning/30 text-warning bg-warning/10">
                  <DollarSign className="w-3 h-3" />
                  ₱{penaltyAmount.toFixed(2)} penalty
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action buttons based on status */}
          {canApprove && transaction.status === "pending" && (
            <>
              <ApproveAction transactionId={borrowId} onSuccess={handleRefresh} />
              <RejectAction transactionId={borrowId} onSuccess={handleRefresh} />
            </>
          )}
          {canRelease && transaction.status === "approved" && (
            <ReleaseAction transactionId={borrowId} onSuccess={handleRefresh} />
          )}
          {(canRelease || isBorrower) && transaction.status === "released" && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={handleReturnOpen}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Process Return
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Transaction Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <BorrowTimeline
                status={transaction.status}
                createdDate={transaction.created_at}
                approvedDate={transaction.status !== 'pending' ? transaction.updated_at : undefined}
                releasedDate={transaction.borrow_date}
                returnedDate={transaction.actual_return_date}
              />
            </CardContent>
          </Card>

          {/* Item Details */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Borrowed Item</CardTitle>
            </CardHeader>
            <CardContent>
              {transaction.asset && (
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/inventory/${transaction.asset.id}`}
                      className="text-lg font-semibold hover:text-primary transition-colors"
                    >
                      {transaction.asset.item_name}
                    </Link>
                    <p className="text-sm font-mono text-muted-foreground mt-0.5">
                      {transaction.asset.asset_id}
                    </p>
                    {transaction.asset.serial_number && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Serial: {transaction.asset.serial_number}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {transaction.asset.condition}
                      </Badge>
                      {transaction.asset.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {transaction.asset.category.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purpose */}
          {transaction.purpose && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Purpose</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{transaction.purpose}</p>
              </CardContent>
            </Card>
          )}

          {/* Condition Notes */}
          {(transaction.condition_before || transaction.condition_after || transaction.return_notes) && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Condition Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transaction.condition_before && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Condition Before</span>
                    <Badge variant="outline" className="capitalize">
                      {transaction.condition_before}
                    </Badge>
                  </div>
                )}
                {transaction.condition_after && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Condition After</span>
                    <Badge variant="outline" className="capitalize">
                      {transaction.condition_after}
                    </Badge>
                  </div>
                )}
                {transaction.return_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Return Notes</p>
                    <p className="text-sm">{transaction.return_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Return Receipt */}
          {(transaction.status === 'returned' || transaction.status === 'late') && (
            <Card className="border-border/50 border-success/20 bg-success/[0.02]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-success" />
                    Return Receipt
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-3 h-3" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 print:space-y-2" id="return-receipt">
                  <div className="text-center border-b border-border pb-3 mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      MSU-ZS ROTC Unit
                    </p>
                    <p className="text-lg font-bold font-mono mt-1">
                      RCT-{transaction.transaction_no}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.actual_return_date
                        ? formatDateTime(transaction.actual_return_date)
                        : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction No.</p>
                      <p className="font-medium font-mono">{transaction.transaction_no}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Item</p>
                      <p className="font-medium">{transaction.asset?.item_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Borrower</p>
                      <p className="font-medium">
                        {transaction.borrower?.first_name} {transaction.borrower?.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Asset ID</p>
                      <p className="font-medium font-mono">{transaction.asset?.asset_id || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Borrow Date</p>
                      <p className="font-medium">
                        {transaction.borrow_date
                          ? new Date(transaction.borrow_date).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Return</p>
                      <p className="font-medium">
                        {new Date(transaction.expected_return_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Condition (Before)</p>
                      <p className="font-medium capitalize">{transaction.condition_before || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Condition (After)</p>
                      <p className="font-medium capitalize">{transaction.condition_after || '—'}</p>
                    </div>
                  </div>
                  {transaction.penalty_amount > 0 && (
                    <div className="border-t border-border pt-3 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Penalty Amount</span>
                        <span className="font-bold text-destructive">
                          ₱{Number(transaction.penalty_amount).toFixed(2)}
                          {transaction.penalty_paid ? ' (Paid)' : ' (Unpaid)'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="text-center text-[10px] text-muted-foreground pt-2 border-t border-border mt-2">
                    This is a computer-generated receipt. No signature required.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Borrower Info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Borrower</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {transaction.borrower && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {transaction.borrower.first_name} {transaction.borrower.last_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {transaction.borrower.student_number || transaction.borrower.officer_id || transaction.borrower.email}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Borrow Date</span>
                <span>{transaction.borrow_date ? formatDateTime(transaction.borrow_date) : "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Return</span>
                <span className={overdue ? "text-destructive font-medium" : ""}>
                  {new Date(transaction.expected_return_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Return</span>
                <span>{transaction.actual_return_date ? formatDateTime(transaction.actual_return_date) : "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition (Before)</span>
                <span className="capitalize">{transaction.condition_before || "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition (After)</span>
                <span className="capitalize">{transaction.condition_after || "—"}</span>
              </div>
              {transaction.penalty_amount > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Penalty</span>
                    <span className="text-destructive font-medium">
                      ₱{transaction.penalty_amount.toFixed(2)}
                      {transaction.penalty_paid && " (Paid)"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Approval Chain */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Approval Chain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-muted-foreground">Requested by:</span>
                <span className="font-medium">
                  {transaction.borrower?.first_name} {transaction.borrower?.last_name}
                </span>
              </div>
              {transaction.approved_by_profile && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Approved by:</span>
                  <span className="font-medium">
                    {transaction.approved_by_profile.first_name} {transaction.approved_by_profile.last_name}
                  </span>
                </div>
              )}
              {transaction.released_by_profile && (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-accent" />
                  <span className="text-muted-foreground">Released by:</span>
                  <span className="font-medium">
                    {transaction.released_by_profile.first_name} {transaction.released_by_profile.last_name}
                  </span>
                </div>
              )}
              {transaction.verified_by_profile && (
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-success" />
                  <span className="text-muted-foreground">Return verified by:</span>
                  <span className="font-medium">
                    {transaction.verified_by_profile.first_name} {transaction.verified_by_profile.last_name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={(o) => { if (o) handleReturnOpen(); else setReturnDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Item Return</DialogTitle>
            <DialogDescription>
              Record the condition of the returned item and any penalties for late returns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Item Condition on Return</Label>
              <Select value={returnCondition} onValueChange={(v) => setReturnCondition(v ?? "good")}>
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
            <div className="space-y-2">
              <Label>Return Notes</Label>
              <Textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Any observations about the returned item..."
                rows={2}
              />
            </div>
            {penaltyAmount > 0 && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Late Return Penalty</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Item was due {formatDistanceToNow(new Date(transaction?.expected_return_date), { addSuffix: true })}.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Penalty Amount (₱50/day)</span>
                  <span className="font-bold text-destructive">₱{penaltyAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleReturnSubmit} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Processing...</>
              ) : (
                <><RotateCcw className="w-4 h-4 mr-1.5" /> Confirm Return</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
