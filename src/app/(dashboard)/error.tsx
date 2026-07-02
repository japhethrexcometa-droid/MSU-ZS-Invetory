"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCcw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while loading this page.
            {error.digest && (
              <span className="block mt-1 text-xs text-muted-foreground/60 font-mono">
                Error ID: {error.digest}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="gap-2">
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
