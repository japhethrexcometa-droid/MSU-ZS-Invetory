"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { returnRadio } from "@/lib/radio";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { BATTERY_LEVELS } from "@/lib/radio";
import { ASSET_CONDITIONS } from "@/lib/constants";

interface RadioReturnDialogProps {
  assetId: string;
  trackingId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function RadioReturnDialog({ assetId, trackingId, assetName, onSuccess }: RadioReturnDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    battery_status: "medium",
    condition: "good",
    notes: "",
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await returnRadio({
        asset_id: assetId,
        tracking_id: trackingId,
        battery_status: form.battery_status,
        condition: form.condition,
        notes: form.notes || undefined,
      });

      // Log activity
      await (supabase as any).from("activity_log").insert({
        activity_type: "returned",
        description: `Radio returned: ${assetName}`,
        reference_type: "asset",
        reference_id: assetId,
        metadata: { action: "return_radio", condition: form.condition, battery: form.battery_status },
      });

      toast.success("Radio return processed!");
      setOpen(false);
      setForm({ battery_status: "medium", condition: "good", notes: "" });
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to process return");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex">
        <Button variant="default" className="gap-1.5 h-9">
          <RotateCcw className="w-3.5 h-3.5" />
          Process Return
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            Return Radio: {assetName}
          </DialogTitle>
          <DialogDescription>
            Record the condition and battery status of the returned radio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Battery Status</Label>
              <Select
                value={form.battery_status}
                onValueChange={(v) => setForm((prev) => ({ ...prev, battery_status: v ?? "medium" }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BATTERY_LEVELS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b.charAt(0).toUpperCase() + b.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={form.condition}
                onValueChange={(v) => setForm((prev) => ({ ...prev, condition: v ?? "good" }))}
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
          </div>
          <div className="space-y-2">
            <Label>Return Notes</Label>
            <Textarea
              placeholder="Any issues or observations with the returned radio..."
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
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
