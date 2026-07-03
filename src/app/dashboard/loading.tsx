import { Loader2, Shield } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
          <div className="relative w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    </div>
  );
}
