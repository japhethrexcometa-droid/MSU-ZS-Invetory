"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { notifyAdmin } from "@/lib/notifications";
import { useUser } from "@/hooks/useUser";

interface NotifyAdminButtonProps {
  title: string;
  message: string;
  type?: string;
  referenceType?: string;
  referenceId?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export function NotifyAdminButton({
  title,
  message,
  type,
  referenceType,
  referenceId,
  className,
  variant = "outline",
  size = "sm",
  children
}: NotifyAdminButtonProps) {
  const [loading, setLoading] = useState(false);
  const { profile } = useUser();

  // Only show button if user is ROTC officer (or we could show for anyone, but primarily for them)
  if (profile?.role === "logistics_officer") {
    return null;
  }

  const handleNotify = async () => {
    setLoading(true);
    try {
      await notifyAdmin({
        title,
        message,
        type,
        reference_type: referenceType,
        reference_id: referenceId,
      });
      toast.success("Admin has been notified");
    } catch (error) {
      console.error("Failed to notify admin", error);
      toast.error("Failed to notify admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleNotify}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Bell className="w-4 h-4 mr-2" />
      )}
      {children || "Notify Admin"}
    </Button>
  );
}
