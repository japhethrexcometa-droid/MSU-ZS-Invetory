"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Radio,
  AlertTriangle,
  RotateCcw,
  Wrench,
  FileText,
  Settings,
  Users,
  BarChart3,
} from "lucide-react";
import type { UserRole } from "@/types/database";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Inventory", href: "/dashboard/inventory", icon: Package },
  { title: "Borrow", href: "/dashboard/borrow", icon: ArrowLeftRight },
  { title: "Returns", href: "/dashboard/returns", icon: RotateCcw },
  { title: "Radios", href: "/dashboard/radios", icon: Radio },
  { title: "Issues", href: "/dashboard/lost-damaged", icon: AlertTriangle },
  { title: "Maint.", href: "/dashboard/maintenance", icon: Wrench },
  { title: "Reports", href: "/dashboard/reports", icon: FileText },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Users", href: "/dashboard/users", icon: Users, adminOnly: true },
  { title: "Profile", href: "/dashboard/settings", icon: Settings },
];

interface MobileBottomNavProps {
  role?: UserRole;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const isLogistics = role === "logistics_officer";

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isLogistics
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1 overflow-x-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 min-w-0 flex-1",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200",
                  isActive && "bg-primary/10"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight text-center truncate w-full",
                  isActive ? "opacity-100" : "opacity-70"
                )}
              >
                {item.title}
              </span>
              {isActive && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
