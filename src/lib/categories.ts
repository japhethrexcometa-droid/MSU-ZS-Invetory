import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database";
import {
  createCategorySchema,
  updateCategorySchema,
  validateOrThrow,
} from "@/lib/validations";

export async function fetchCategories(search?: string) {
  const supabase = createClient();
  let query = supabase
    .from("categories")
    .select("*, parent:parent_id(id, name), children:categories(id, name)")
    .order("name");

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Category[];
}

export async function fetchCategoryById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*, parent:parent_id(id, name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Category;
}

export async function createCategory(raw: Record<string, unknown>) {
  const data = validateOrThrow(createCategorySchema, raw);
  const supabase = createClient();
  const { data: category, error } = await (supabase as any)
    .from("categories")
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      parent_id: data.parent_id || null,
      icon: data.icon || null,
    })
    .select()
    .single();

  if (error) throw error;
  return category as unknown as Category;
}

export async function updateCategory(id: string, raw: Record<string, unknown>) {
  const data = validateOrThrow(updateCategorySchema, raw);
  const supabase = createClient();
  const { data: category, error } = await (supabase as any)
    .from("categories")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return category as unknown as Category;
}

export async function deleteCategory(id: string) {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("categories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
