"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, CONDITION_CONFIG } from "@/lib/inventory";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    variant: "default" as const,
  };

  const dotColors: Record<string, string> = {
    available: "bg-success",
    borrowed: "bg-accent",
    maintenance: "bg-warning",
    lost: "bg-destructive",
    disposed: "bg-muted-foreground",
  };

  return (
    <Badge
      variant={config.variant as any}
      className={cn("gap-1.5 px-2.5 py-1 text-xs font-medium capitalize", className)}
    >
      <span className={cn("inline-block w-1.5 h-1.5 rounded-full", dotColors[status] || "bg-current")} />
      {config.label}
    </Badge>
  );
}

interface ConditionBadgeProps {
  condition: string;
  className?: string;
}

export function ConditionBadge({ condition, className }: ConditionBadgeProps) {
  const config = CONDITION_CONFIG[condition] || {
    label: condition,
    variant: "default" as const,
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs capitalize",
        condition === "excellent" && "border-success/30 text-success bg-success/5",
        condition === "good" && "border-primary/30 text-primary bg-primary/5",
        condition === "fair" && "border-warning/30 text-warning bg-warning/5",
        condition === "poor" && "border-destructive/30 text-destructive bg-destructive/5",
        condition === "damaged" && "border-destructive/50 text-destructive bg-destructive/10",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
