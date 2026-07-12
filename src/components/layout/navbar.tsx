"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import { fetchUnreadNotifications, markAsRead, markAllAsRead } from "@/lib/notifications";
import type { Notification } from "@/lib/notifications";
import {
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Menu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ROLES } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

interface NavbarProps {
  profile: Profile | null;
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu?: () => void;
}

export function Navbar({ profile, isCollapsed, onToggleSidebar, onOpenMobileMenu }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  // Removed unused state variable

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      if (profile?.id) {
        setIsLoading(true);
        try {
          const data = await fetchUnreadNotifications(profile.id);
          const safeData = data || [];
          setNotifications(safeData);
          setUnreadCount(safeData.length);
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
          toast.error('Failed to load notifications');
          setNotifications([]);
          setUnreadCount(0);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadNotifications();
  }, [profile?.id]);

  const handleNotificationClick = async (notif: Notification) => {
    try {
      await markAsRead(notif.id);
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      toast.success('Notification marked as read');

      // Route to relevant page if applicable (prevent navigation for now to test)
      // if (notif.reference_id) {
      //   switch (notif.reference_type) {
      //     case "borrow_request":
      //       router.push(`/dashboard/borrow/${notif.reference_id}`);
      //       break;
      //     case "maintenance":
      //       router.push("/dashboard/maintenance");
      //       break;
      //     case "lost_report":
      //     case "damage_report":
      //       router.push("/dashboard/lost-damaged");
      //       break;
      //   }
      // }
    } catch (e) {
      console.error(e);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  const initials =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`
      : "U";

  const roleLabel = profile?.role ? ROLES[profile.role as UserRole] || profile.role : "User";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-4 glass-nav shadow-sm px-4 transition-all duration-300",
        "ml-0 md:ml-16 lg:ml-64"
      )}
    >
      {/* Sidebar Toggle — desktop only */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="h-9 w-9 shrink-0 hidden md:inline-flex"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobileMenu}
        className="h-9 w-9 shrink-0 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory, users, or transactions..."
            className="pl-9 h-9 bg-muted/50 border-muted focus-visible:bg-background"
          />
        </div>
      </div>

      <div className="flex-1 md:hidden" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 relative"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-md z-50">
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="h-px bg-border mb-2" />
                {isLoading ? (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    No new notifications
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div key={notif.id}>
                        <div 
                          className="p-3 cursor-pointer hover:bg-accent rounded-md"
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="text-sm font-medium">{notif.title}</div>
                          <div className="text-xs text-muted-foreground">{notif.message}</div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {new Date(notif.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {notifications.length > 0 && (
                  <>
                    <div className="h-px bg-border mt-2 mb-2" />
                    <button
                      className="w-full text-center text-sm font-medium text-primary py-2 hover:underline"
                      onClick={async () => {
                        if (profile?.id) {
                          try {
                            await markAllAsRead(profile.id);
                            setNotifications([]);
                            setUnreadCount(0);
                            toast.success('All notifications marked as read');
                          } catch (error) {
                            console.error('Failed to mark all as read:', error);
                            toast.error('Failed to mark all as read');
                          }
                        }
                      }}
                    >
                      Mark all as read
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile?.profile_image || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-sm font-medium leading-tight">
                {profile?.first_name} {profile?.last_name}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {roleLabel}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>
                  {profile?.first_name} {profile?.last_name}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {profile?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
