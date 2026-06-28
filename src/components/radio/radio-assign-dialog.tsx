"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { assignRadio } from "@/lib/radio";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Radio } from "lucide-react";
import { BATTERY_LEVELS } from "@/lib/radio";

interface RadioAssignDialogProps {
  assetId: string;
  assetName: string;
  officers: Array<{ id: string; first_name: string; last_name: string; role: string }>;
  onSuccess?: () => void;
}

export function RadioAssignDialog({ assetId, assetName, officers, onSuccess }: RadioAssignDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    current_holder_id: "",
    frequency: "",
    battery_status: "full",
    location: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!form.current_holder_id) {
      toast.error("Please select who this radio is being assigned to");
      return;
    }

    setSubmitting(true);
    try {
      const tracking = await assignRadio({
        asset_id: assetId,
        current_holder_id: form.current_holder_id,
        frequency: form.frequency || undefined,
        battery_status: form.battery_status,
        location: form.location || undefined,
        notes: form.notes || undefined,
      });

      // Log activity
      await (supabase as any).from("activity_log").insert({
        activity_type: "updated",
        description: `Radio assigned: ${assetName}`,
        reference_type: "asset",
        reference_id: assetId,
        metadata: { action: "assign_radio", holder_id: form.current_holder_id },
      });

      toast.success(`Radio assigned successfully!`);
      setOpen(false);
      setForm({ current_holder_id: "", frequency: "", battery_status: "full", location: "", notes: "" });
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign radio");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex">
        <Button className="gap-1.5 h-9">
          <Radio className="w-3.5 h-3.5" />
          Assign Radio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            Assign Radio: {assetName}
          </DialogTitle>
          <DialogDescription>
            Record who this radio is being issued to and its current status.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Assign To <span className="text-destructive">*</span></Label>
            <Select
              value={form.current_holder_id}
              onValueChange={(v) => setForm((prev) => ({ ...prev, current_holder_id: v ?? "" }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select officer or cadet..." />
              </SelectTrigger>
              <SelectContent>
                {officers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.first_name} {o.last_name} ({o.role.replace("_", " ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Input
                placeholder="e.g., 142.500 MHz"
                value={form.frequency}
                onChange={(e) => setForm((prev) => ({ ...prev, frequency: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Battery Status</Label>
              <Select
                value={form.battery_status}
                onValueChange={(v) => setForm((prev) => ({ ...prev, battery_status: v ?? "full" }))}
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
          </div>
          <div className="space-y-2">
            <Label>Location / Area of Use</Label>
            <Input
              placeholder="e.g., Field training area, Office..."
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Any additional notes about this assignment..."
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Assigning...</>
            ) : (
              <><Radio className="w-4 h-4 mr-1.5" /> Confirm Assignment</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
