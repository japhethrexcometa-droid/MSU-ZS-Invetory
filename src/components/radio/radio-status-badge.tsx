"use client";

import { cn } from "@/lib/utils";
import { RADIO_STATUS_CONFIG, BATTERY_CONFIG } from "@/lib/radio";
import { Badge } from "@/components/ui/badge";
import {
  BatteryFull,
  BatteryCharging,
  BatteryWarning,
  BatteryMedium,
  BatteryLow,
  X,
} from "lucide-react";

interface RadioStatusBadgeProps {
  status: string;
  className?: string;
}

export function RadioStatusBadge({ status, className }: RadioStatusBadgeProps) {
  const config = RADIO_STATUS_CONFIG[status];
  if (!config) {
    return <Badge variant="outline" className={className}>{status}</Badge>;
  }
  return (
    <Badge variant={config.variant as any} className={cn("capitalize", className)}>
      {config.label}
    </Badge>
  );
}

interface BatteryBadgeProps {
  batteryStatus: string | null;
  className?: string;
}

export function BatteryBadge({ batteryStatus, className }: BatteryBadgeProps) {
  if (!batteryStatus) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const config = BATTERY_CONFIG[batteryStatus];
  const BatteryIcon = getBatteryIconComponent(batteryStatus);

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", config?.color || "text-muted-foreground", className)}>
      <BatteryIcon className="w-3.5 h-3.5" />
      <span className="capitalize">{config?.label || batteryStatus}</span>
    </div>
  );
}

function getBatteryIconComponent(status: string) {
  switch (status) {
    case "full":
      return BatteryFull;
    case "high":
      return BatteryCharging;
    case "medium":
      return BatteryMedium;
    case "low":
      return BatteryWarning;
    case "critical":
      return BatteryLow;
    case "dead":
      return X;
    default:
      return BatteryMedium;
  }
}
