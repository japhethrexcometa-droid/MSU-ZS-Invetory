"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { fetchSettings, updateSetting } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Loader2,
  Save,
  Building2,
  CalendarClock,
  PhilippinePeso,
  Bell,
  Shield,
  RefreshCw,
  Server,
} from "lucide-react";
import { toast } from "sonner";

interface SettingRow {
  id: string;
  key: string;
  value: any;
  description: string | null;
}

export default function SettingsPage() {
  const { profile, loading: authLoading } = useUser();

  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const isAdmin = profile?.role === "logistics_officer";

  useEffect(() => {
    if (authLoading) return;
    const loadSettings = async () => {
      try {
        const data = await fetchSettings();
        setSettings(data);
        const values: Record<string, string> = {};
        data.forEach((s) => {
          values[s.key] = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
        });
        setEditValues(values);
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [authLoading]);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await updateSetting(key, editValues[key]);
      toast.success(`Setting "${key}" updated`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update setting");
    } finally {
      setSaving(null);
    }
  };

  const getSettingIcon = (key: string) => {
    const icons: Record<string, any> = {
      institution_name: Building2,
      unit_name: Building2,
      penalty_per_day: PhilippinePeso,
      max_borrow_days: CalendarClock,
      enable_notifications: Bell,
      auto_overdue_check: RefreshCw,
    };
    const Icon = icons[key] || Server;
    return Icon;
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      institution_name: "Full name of the educational institution",
      unit_name: "Official ROTC unit designation",
      penalty_per_day: "Daily late return fee in Philippine Pesos (₱)",
      max_borrow_days: "Maximum number of days for equipment borrowing",
      enable_notifications: "Toggle email and in-app notifications",
      auto_overdue_check: "Automatically detect and flag overdue items",
    };
    return descriptions[key] || "";
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            System Settings
          </h1>
          {!isAdmin && <Badge variant="secondary">Read Only</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure system-wide parameters and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.map((setting) => {
          const Icon = getSettingIcon(setting.key);
          return (
            <Card key={setting.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold capitalize">
                      {setting.key.replace(/_/g, " ")}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {setting.description || getSettingDescription(setting.key)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={editValues[setting.key] || ""}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                    className="flex-1"
                    disabled={!isAdmin}
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSave(setting.key)}
                    disabled={!isAdmin || saving === setting.key}
                  >
                    {saving === setting.key ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
