"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import {
  Menu,
  Shield,
  LayoutDashboard,
  Package,
  BookOpen,
  Search,
  ArrowLeftRight,
  RotateCcw,
  Radio,
  AlertTriangle,
  Wrench,
  FileText,
  BarChart3,
  Activity,
  Users,
  Settings,
} from "lucide-react";
import { INSTITUTION_SHORT } from "@/lib/constants";
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

interface MobileNavProps {
  role?: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

export function MobileNav({ role, isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const [internalOpen, setInternalOpen] = useState(false);
  const isLogistics = role === "logistics_officer";

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isOpen !== undefined) {
      if (!v) onClose?.();
    } else {
      setInternalOpen(v);
    }
  };

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isLogistics
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">ROTC Inventory</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {INSTITUTION_SHORT}
            </span>
          </div>
        </div>
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="flex flex-col gap-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 text-sm font-normal",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
