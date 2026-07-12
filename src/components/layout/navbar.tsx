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
  Package,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Info,
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
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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

  // Helper functions for notification display
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'borrow_request':
      case 'borrow_approved':
      case 'borrow_rejected':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'late_return':
      case 'lost_item':
      case 'damaged_item':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'new_equipment':
      case 'account_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
        <div className="relative" ref={dropdownRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 relative"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-200">
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
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div key={notif.id}>
                        <div 
                          className="p-3 cursor-pointer hover:bg-accent rounded-md transition-colors"
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex items-start gap-2">
                            <div className="shrink-0 mt-0.5">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{notif.title}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{notif.message}</div>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {formatNotificationTime(notif.created_at)}
                              </div>
                            </div>
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
                      className="w-full text-center text-sm font-medium text-primary py-2 hover:underline transition-colors"
                      onClick={async () => {
                        if (profile?.id) {
                          try {
                            await markAllAsRead(profile.id);
                            setNotifications([]);
                            setUnreadCount(0);
                            setIsDropdownOpen(false);
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
