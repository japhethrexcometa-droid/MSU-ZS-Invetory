"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Radio,
  ArrowLeftRight,
  RotateCcw,
  AlertTriangle,
  Wrench,
  FileText,
  Users,
  Settings,
  Shield,
  BarChart3,
  Search,
  Activity,
  BookOpen,
  Siren,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/database";
import { INSTITUTION_SHORT } from "@/lib/constants";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean; // Only visible to Logistics Officer
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Inventory", href: "/dashboard/inventory", icon: Package },
  { title: "Categories", href: "/dashboard/categories", icon: BookOpen },
  { title: "Locations", href: "/dashboard/locations", icon: Search },
  { title: "Borrow / Return", href: "/dashboard/borrow", icon: ArrowLeftRight },
  { title: "Returns", href: "/dashboard/returns", icon: RotateCcw },
  { title: "Radio Tracking", href: "/dashboard/radios", icon: Radio },
  { title: "Lost & Damaged", href: "/dashboard/lost-damaged", icon: AlertTriangle },
  { title: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
  { title: "Reports", href: "/dashboard/reports", icon: FileText },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Audit Trail", href: "/dashboard/audit-log", icon: Activity, adminOnly: true },
  { title: "Users", href: "/dashboard/users", icon: Users, adminOnly: true },
  { title: "System Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  role?: UserRole;
  isCollapsed?: boolean;
}

export function Sidebar({ role, isCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const isLogistics = role === "logistics_officer";

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isLogistics
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar/95 backdrop-blur-xl shadow-lg transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          isCollapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg military-gradient shrink-0">
          <Shield className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground leading-tight">
              ROTC Inventory
            </span>
            <span className="text-[10px] text-sidebar-foreground/60 leading-tight">
              {INSTITUTION_SHORT}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-sm font-normal transition-all duration-200",
                    isCollapsed ? "px-2" : "px-3",
                    isActive
                      ? "bg-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/30 hover:text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
                  {!isCollapsed && <span>{item.title}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!isCollapsed && (
        <div className="border-t border-sidebar-border p-4">
          <p className="text-[10px] text-sidebar-foreground/40 text-center">
            v1.0.0 &bull; MSU-ZS ROTC Unit
          </p>
        </div>
      )}
    </aside>
  );
}
