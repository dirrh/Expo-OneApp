/**
 * dto: Modelový súbor dto obsahuje typy pre dátový kontrakt alebo UI view model.
 *
 * Prečo: Typy v dto tvoria stabilnú zmluvu medzi datasource vrstvou a prezentačným kódom.
 */

import type { DiscoverCategory } from "../../interfaces";

// Typy pre backend kontrakt (DTO vrstva).
export type DataSourceMode = "mock" | "api" | "supabase";

export interface BranchMenuItemDto {
  id?: string | null;
  name?: string | null;
  details?: string | null;
  price?: string | null;
  groupTitle?: string | null;
}

export interface BranchDto {
  id: string;
  title?: string | null;
  category?: DiscoverCategory | null;
  rating?: number | null;
  distance?: string | null;
  distanceKm?: number | null;
  hours?: string | null;
  discountKey?: string | null;
  offersKeys?: string[] | null;
  menuItems?: BranchMenuItemDto[] | null;
  menuLabelMode?: "menu" | "pricelist" | null;
  badgeVariant?: "more" | "all" | null;
  moreCount?: number | null;
  coordinates?: [number, number] | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  imageKey?: string | null;
  imageKeys?: string[] | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  searchTags?: string[] | null;
  searchMenuItems?: string[] | null;
  searchAliases?: string[] | null;
  labelPriority?: number | null;
}

export interface MarkerDto {
  id: string;
  title?: string | null;
  labelPriority?: number | null;
  markerSpriteUrl?: string | null;
  markerSpriteKey?: string | null;
  coord: { lng: number; lat: number };
  groupId?: string | null;
  groupCount?: number | null;
  iconKey?: string | null;
  iconUrl?: string | null;
  rating?: number | null;
  ratingFormatted?: string | null;
  category: DiscoverCategory | "Multi";
}
