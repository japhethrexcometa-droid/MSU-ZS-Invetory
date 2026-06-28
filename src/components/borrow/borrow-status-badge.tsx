"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BORROW_STATUS_CONFIG } from "@/lib/borrow";

interface BorrowStatusBadgeProps {
  status: string;
  className?: string;
}

const dotColors: Record<string, string> = {
  pending: "bg-muted-foreground",
  approved: "bg-primary",
  released: "bg-accent",
  returned: "bg-success",
  late: "bg-destructive",
  lost: "bg-destructive",
  damaged: "bg-destructive",
  rejected: "bg-destructive",
};

export function BorrowStatusBadge({ status, className }: BorrowStatusBadgeProps) {
  const config = BORROW_STATUS_CONFIG[status] || {
    label: status,
    variant: "outline" as const,
  };

  return (
    <Badge
      variant={config.variant as any}
      className={cn("gap-1.5 px-2.5 py-1 text-xs font-medium capitalize", className)}
    >
      <span
        className={cn("inline-block w-1.5 h-1.5 rounded-full", dotColors[status] || "bg-current")}
      />
      {config.label}
    </Badge>
  );
}
