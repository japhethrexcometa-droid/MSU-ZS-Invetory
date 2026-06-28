"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Menu, Shield, LayoutDashboard, Package, ArrowLeftRight, Radio, AlertTriangle, Wrench, FileText } from "lucide-react";
import { INSTITUTION_SHORT } from "@/lib/constants";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Inventory", href: "/dashboard/inventory", icon: Package },
  { title: "Borrow / Return", href: "/dashboard/borrow", icon: ArrowLeftRight },
  { title: "Radio Tracking", href: "/dashboard/radios", icon: Radio },
  { title: "Lost & Damaged", href: "/dashboard/lost-damaged", icon: AlertTriangle },
  { title: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
  { title: "Reports", href: "/dashboard/reports", icon: FileText },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="md:hidden flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted transition-colors">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
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
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
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
