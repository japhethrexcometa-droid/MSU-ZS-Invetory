"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch("/api/auth/lookup-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.is_approved) {
            const p: Profile = {
              id: user.id,
              email: user.email ?? "",
              first_name: data.first_name ?? "",
              last_name: data.last_name ?? "",
              middle_name: null,
              role: data.role ?? "rotc_officer",
              student_number: data.student_number ?? null,
              officer_id: null,
              contact_number: null,
              profile_image: null,
              is_active: true,
              is_approved: true,
              approved_by: null,
              approved_at: null,
              last_login_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setProfile(p);
          }
        }
      } catch (e) {
        console.error("Profile lookup failed:", e);
      }

      setLoading(false);
    };

    getProfile();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background">
        <div className="max-w-md text-center space-y-6 p-4 md:p-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Account Pending Approval</h1>
            <p className="text-sm text-muted-foreground">
              Your account is waiting for approval from the <strong>Logistics Officer (S-4)</strong>.
              You&apos;ll be able to access the system once approved.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p>📋 What to expect:</p>
            <ul className="text-left space-y-1">
              <li>• The Logistics Officer reviews new accounts daily</li>
              <li>• Once approved, you can log in with your Student ID</li>
              <li>• Contact the Logistics Officer if urgent</li>
            </ul>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <Sidebar role={profile.role} isCollapsed={isCollapsed} />
      </div>
      {/* Mobile Navigation Sheet */}
      <div className="md:hidden">
        <MobileNav role={profile.role} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      </div>
      <Navbar
        profile={profile}
        isCollapsed={isCollapsed}
        onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          "ml-0",
          "md:ml-16 lg:ml-64"
        )}
      >
        <div className="p-3 md:p-6 lg:p-8 pb-20 md:pb-8 animate-page-in">{children}</div>
      </main>
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav role={profile.role} />
    </div>
  );
}
