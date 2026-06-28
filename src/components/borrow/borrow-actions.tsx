"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { approveBorrowRequest, rejectBorrowRequest, releaseBorrowItem, processReturn, calculatePenalty } from "@/lib/borrow";
import { ASSET_CONDITIONS } from "@/lib/constants";

interface ApproveActionProps {
  transactionId: string;
  onSuccess?: () => void;
}

export function ApproveAction({ transactionId, onSuccess }: ApproveActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveBorrowRequest(transactionId, null);
      toast.success("Borrow request approved");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex">
        <Button variant="default" size="sm" className="gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Borrow Request</DialogTitle>
          <DialogDescription>
            Confirm approval of this borrow request. The item can then be released to the borrower.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Approving...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm Approval</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RejectActionProps {
  transactionId: string;
  onSuccess?: () => void;
}

export function RejectAction({ transactionId, onSuccess }: RejectActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleReject = async () => {
    setLoading(true);
    try {
      await rejectBorrowRequest(transactionId, null);
      toast.success("Borrow request rejected");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex">
        <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <XCircle className="w-3.5 h-3.5" />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Borrow Request</DialogTitle>
          <DialogDescription>
            This will reject the borrow request. The borrower will be notified.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Rejecting...</>
            ) : (
              <><XCircle className="w-4 h-4 mr-1.5" /> Confirm Rejection</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReleaseActionProps {
  transactionId: string;
  onSuccess?: () => void;
}

export function ReleaseAction({ transactionId, onSuccess }: ReleaseActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState("good");

  const handleRelease = async () => {
    setLoading(true);
    try {
      await releaseBorrowItem(transactionId, null, condition);
      toast.success("Item released to borrower");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to release");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex">
        <Button variant="default" size="sm" className="gap-1.5">
          <Send className="w-3.5 h-3.5" />
          Release Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release Item to Borrower</DialogTitle>
          <DialogDescription>
            Record the item's condition before releasing it to the borrower.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Item Condition Before Release</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v ?? "good")}>
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
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRelease} disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Releasing...</>
            ) : (
              <><Send className="w-4 h-4 mr-1.5" /> Confirm Release</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReturnActionProps {
  transactionId: string;
  expectedReturnDate: string;
  onSuccess?: () => void;
}

export function ReturnAction({
  transactionId,
  expectedReturnDate,
  onSuccess,
}: ReturnActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [condition, setCondition] = useState("good");
  const [returnNotes, setReturnNotes] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [penaltyPaid, setPenaltyPaid] = useState(false);
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    const penalty = calculatePenalty(expectedReturnDate, new Date().toISOString());
    setPenaltyAmount(penalty.amount);
  };

  const handleReturn = async () => {
    setLoading(true);
    try {
      await processReturn(transactionId, {
        verified_by: null,
        condition_after: condition,
        return_notes: returnNotes,
        penalty_amount: penaltyAmount,
        penalty_paid: penaltyPaid,
      });
      toast.success("Return processed successfully");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to process return");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) handleOpen(); else setOpen(false); }}>
      <DialogTrigger className="inline-flex">
        <Button variant="default" size="sm" className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" />
          Process Return
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Item Return</DialogTitle>
          <DialogDescription>
            Check the condition of the returned item and record any penalties.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Item Condition on Return</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v ?? "good")}>
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
                    The item was returned past the expected return date.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Penalty Amount</span>
                <span className="font-bold text-destructive">
                  ₱{penaltyAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleReturn} disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Processing...</>
            ) : (
              <><RotateCcw className="w-4 h-4 mr-1.5" /> Confirm Return</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
