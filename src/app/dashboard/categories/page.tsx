"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  slugify,
} from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  FolderTree,
} from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types/database";

export default function CategoriesPage() {
  const { profile, loading: authLoading } = useUser();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    parent_id: "",
    icon: "",
  });

  const isAdmin = profile?.role === "logistics_officer";

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCategories(search || undefined);
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!authLoading) loadCategories();
  }, [authLoading, loadCategories]);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", slug: "", description: "", parent_id: "", icon: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      parent_id: cat.parent_id || "",
      icon: cat.icon || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          parent_id: formData.parent_id || undefined,
          icon: formData.icon || undefined,
        });
        toast.success("Category updated");
      } else {
        await createCategory({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          parent_id: formData.parent_id || undefined,
          icon: formData.icon || undefined,
        });
        toast.success("Category created");
      }
      setDialogOpen(false);
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this category? Assets in this category will not be affected.")) return;
    try {
      await deleteCategory(id);
      toast.success("Category deactivated");
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate category");
    }
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingCategory ? prev.slug : slugify(name),
    }));
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <FolderTree className="w-6 h-6 text-primary" />
            Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {categories.length} categories &bull; Manage equipment classifications
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="h-10 gap-2">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-10"
              />
            </div>
            <Button variant="outline" className="h-10 gap-2" onClick={handleSearch}>
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : categories.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <FolderTree className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">No categories found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Try a different search" : "Start by adding your first category"}
            </p>
            {isAdmin && !search && (
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreateDialog}>
                <Plus className="w-3 h-3 mr-1.5" /> Add Category
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{cat.name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground font-mono">{cat.slug}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(cat)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {cat.description && (
                  <p className="text-xs text-muted-foreground mb-2">{cat.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {cat.parent?.name || "Top Level"}
                  </Badge>
                  {cat.children?.length ? (
                    <Badge variant="outline" className="text-[10px]">
                      {cat.children.length} sub-categories
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update the category details below." : "Create a new equipment category."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Tactical Vests"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Slug *</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                placeholder="tactical-vests"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Parent Category</label>
              <Select
                value={formData.parent_id}
                onValueChange={(v) => setFormData((p) => ({ ...p, parent_id: v ?? "" }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="None (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Top Level)</SelectItem>
                  {categories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
              {editingCategory ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
