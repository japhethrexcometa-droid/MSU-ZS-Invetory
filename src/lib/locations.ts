import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/types/database";

export async function fetchLocations(search?: string) {
  const supabase = createClient();
  let query = supabase
    .from("locations")
    .select("*")
    .order("building");

  if (search) {
    query = query.or(
      `building.ilike.%${search}%,room.ilike.%${search}%,cabinet.ilike.%${search}%,shelf.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Location[];
}

export async function fetchLocationById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Location;
}

export async function createLocation(data: {
  building: string;
  room?: string;
  cabinet?: string;
  shelf?: string;
  description?: string;
}) {
  const supabase = createClient();
  const { data: location, error } = await (supabase as any)
    .from("locations")
    .insert({
      building: data.building,
      room: data.room || null,
      cabinet: data.cabinet || null,
      shelf: data.shelf || null,
      description: data.description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return location as unknown as Location;
}

export async function updateLocation(
  id: string,
  data: Partial<{
    building: string;
    room: string;
    cabinet: string;
    shelf: string;
    description: string;
    is_active: boolean;
  }>
) {
  const supabase = createClient();
  const { data: location, error } = await (supabase as any)
    .from("locations")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return location as unknown as Location;
}

export async function deleteLocation(id: string) {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("locations")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}

export function formatLocation(location: Location | null): string {
  if (!location) return "—";
  const parts = [location.building];
  if (location.room) parts.push(location.room);
  if (location.cabinet) parts.push(`Cabinet ${location.cabinet}`);
  if (location.shelf) parts.push(`Shelf ${location.shelf}`);
  return parts.join(" > ");
}
