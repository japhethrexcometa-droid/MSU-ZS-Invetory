"use client";

import { cn } from "@/lib/utils";
import { Check, Clock, X, Circle } from "lucide-react";

interface TimelineStep {
  label: string;
  date?: string;
  active: boolean;
  completed: boolean;
}

interface BorrowTimelineProps {
  status: string;
  createdDate?: string;
  approvedDate?: string;
  releasedDate?: string;
  returnedDate?: string;
}

export function BorrowTimeline({
  status,
  createdDate,
  approvedDate,
  releasedDate,
  returnedDate,
}: BorrowTimelineProps) {
  const isRejected = status === "rejected";
  const isLost = status === "lost" || status === "damaged";

  const steps: TimelineStep[] = [
    {
      label: "Request Submitted",
      date: createdDate,
      active: true,
      completed: true,
    },
    {
      label: isRejected ? "Rejected" : "Approved",
      date: approvedDate,
      active: !isRejected,
      completed: !!approvedDate,
    },
    {
      label: isLost ? "Lost / Damaged" : "Released",
      date: releasedDate,
      active: !isRejected,
      completed: !!releasedDate,
    },
    {
      label: "Returned",
      date: returnedDate,
      active: !isRejected && !isLost,
      completed: !!returnedDate,
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const showLine = !isLast;

        let stepIcon = (
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
              step.completed
                ? "bg-primary border-primary text-primary-foreground"
                : step.active
                ? "border-muted-foreground/30 bg-background"
                : "border-muted/30 bg-muted/10 text-muted-foreground/50"
            )}
          >
            {step.completed ? (
              <Check className="w-3.5 h-3.5" />
            ) : step.active ? (
              <Clock className="w-3.5 h-3.5" />
            ) : (
              <Circle className="w-3.5 h-3.5" />
            )}
          </div>
        );

        if (i === 1 && isRejected) {
          stepIcon = (
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-destructive bg-destructive/10">
              <X className="w-3.5 h-3.5 text-destructive" />
            </div>
          );
        }

        return (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              {stepIcon}
              {showLine && (
                <div
                  className={cn(
                    "w-0.5 h-8",
                    step.completed ? "bg-primary" : "bg-muted/30"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-6", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  step.completed
                    ? "text-foreground"
                    : step.active
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
                )}
              >
                {step.label}
                {isLost && i === 2 && " ⚠️"}
              </p>
              {step.date && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(step.date).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
