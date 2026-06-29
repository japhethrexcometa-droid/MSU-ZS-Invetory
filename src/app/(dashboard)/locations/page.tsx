"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  formatLocation,
} from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type { Location } from "@/types/database";

export default function LocationsPage() {
  const { profile, loading: authLoading } = useUser();
  const supabase = createClient();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    building: "",
    room: "",
    cabinet: "",
    shelf: "",
    description: "",
  });

  const isAdmin = profile?.role === "logistics_officer";

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLocations(search || undefined);
      setLocations(data);
    } catch (error) {
      console.error("Failed to load locations:", error);
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!authLoading) loadLocations();
  }, [authLoading, loadLocations]);

  const handleSearch = () => setSearch(searchInput);

  const openCreateDialog = () => {
    setEditingLocation(null);
    setFormData({ building: "", room: "", cabinet: "", shelf: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (loc: Location) => {
    setEditingLocation(loc);
    setFormData({
      building: loc.building,
      room: loc.room || "",
      cabinet: loc.cabinet || "",
      shelf: loc.shelf || "",
      description: loc.description || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.building) {
      toast.error("Building name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, {
          building: formData.building,
          room: formData.room || undefined,
          cabinet: formData.cabinet || undefined,
          shelf: formData.shelf || undefined,
          description: formData.description || undefined,
        });
        toast.success("Location updated");
      } else {
        await createLocation({
          building: formData.building,
          room: formData.room || undefined,
          cabinet: formData.cabinet || undefined,
          shelf: formData.shelf || undefined,
          description: formData.description || undefined,
        });
        toast.success("Location created");
      }
      setDialogOpen(false);
      loadLocations();
    } catch (error: any) {
      toast.error(error.message || "Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this location? Inventory items at this location will not be affected.")) return;
    try {
      await deleteLocation(id);
      toast.success("Location deactivated");
      loadLocations();
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate location");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            Locations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locations.length} locations &bull; Manage storage locations
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="h-10 gap-2">
            <Plus className="w-4 h-4" />
            Add Location
          </Button>
        )}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by building, room, cabinet..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-10"
              />
            </div>
            <Button variant="outline" className="h-10 gap-2" onClick={handleSearch}>
              <Search className="w-4 h-4" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : locations.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">No locations found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Try a different search" : "Start by adding your first location"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <Card key={loc.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{loc.building}</CardTitle>
                      {loc.room && (
                        <p className="text-[11px] text-muted-foreground">Room: {loc.room}</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(loc)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(loc.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loc.description && (
                  <p className="text-xs text-muted-foreground mb-2">{loc.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {loc.cabinet && <Badge variant="secondary" className="text-[10px]">Cabinet: {loc.cabinet}</Badge>}
                  {loc.shelf && <Badge variant="outline" className="text-[10px]">Shelf: {loc.shelf}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
            <DialogDescription>
              {editingLocation ? "Update the location details below." : "Define a new storage location."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Building *</label>
              <Input value={formData.building} onChange={(e) => setFormData((p) => ({ ...p, building: e.target.value }))} placeholder="e.g., ROTC Building" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Room</label>
                <Input value={formData.room} onChange={(e) => setFormData((p) => ({ ...p, room: e.target.value }))} placeholder="e.g., Room 101" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cabinet</label>
                <Input value={formData.cabinet} onChange={(e) => setFormData((p) => ({ ...p, cabinet: e.target.value }))} placeholder="e.g., Cabinet A" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Shelf</label>
              <Input value={formData.shelf} onChange={(e) => setFormData((p) => ({ ...p, shelf: e.target.value }))} placeholder="e.g., Shelf 3" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
              <Textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={2} placeholder="Optional description" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
              className="inline-flex"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              {editingLocation ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
