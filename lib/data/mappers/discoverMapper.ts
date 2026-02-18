// discoverMapper: spolocne derivacie pre Discover data flow.
// Zodpovednost: grouping markerov a fallback branch model z markerov.
// Vstup/Vystup: helpery pre skupiny markerov a odvodene branch listy.

import type { BranchViewModel, MarkerViewModel } from "../models";
import { formatTitleFromId } from "../normalizers";
import { canonicalOrFallbackId, normalizeId } from "../utils/id";
import { getMockBranchSearchMetadata } from "../search/mockBranchSearchMetadata";
import { toBranchOverride, type MapperContext } from "./context";
import type { DiscoverCategory } from "../../interfaces";

// Shared derivacie pre Discover flow (grouping + fallback branch).
export interface GroupedMarkerBucket {
  id: string;
  lng: number;
  lat: number;
  items: MarkerViewModel[];
}

// Preferuj nazov z markera, inak fallback z ID.
const toMarkerTitle = (marker: MarkerViewModel) => {
  const title = marker.title?.trim();
  if (title && title.length > 0) {
    return title;
  }
  return formatTitleFromId(marker.id);
};

// Deterministicka fallback vzdialenost pre odvodenu pobocku.
const getDerivedDistance = (id: string) => {
  const canonical = canonicalOrFallbackId(id, "branch");
  let hash = 0;
  for (let index = 0; index < canonical.length; index += 1) {
    hash = (hash * 31 + canonical.charCodeAt(index)) >>> 0;
  }
  const value = 0.6 + (hash % 26) / 10;
  return `${value.toFixed(1)} km`;
};

const toSearchStringArray = (value?: string[] | null): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => item.length > 0);

  if (normalized.length === 0) {
    return undefined;
  }

  return Array.from(new Set(normalized));
};

// Zoskupi markery podla groupId, inak podla zaokruhlenych suradnic.
export const groupMarkersByLocation = (markers: MarkerViewModel[]): GroupedMarkerBucket[] => {
  const grouped = new Map<string, GroupedMarkerBucket>();

  markers.forEach((marker) => {
    const lng = marker.coord?.lng;
    const lat = marker.coord?.lat;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return;
    }

    const fallbackKey = `${lng.toFixed(6)}:${lat.toFixed(6)}`;
    const key = marker.groupId ?? fallbackKey;

    if (!grouped.has(key)) {
      grouped.set(key, { id: key, lng, lat, items: [marker] });
      return;
    }

    grouped.get(key)?.items.push(marker);
  });

  return Array.from(grouped.values());
};

// Postavi fallback branch model, ked backend branch chyba.
export const buildBranchFromMarkerViewModel = (
  marker: MarkerViewModel,
  context: MapperContext
): BranchViewModel => {
  const markerId = canonicalOrFallbackId(marker.id, "branch");
  const override = toBranchOverride(context.resolveOverride(marker.id));

  const category = context.resolveCategory(
    override.category ?? (marker.category === "Multi" ? undefined : marker.category),
    (context.defaultBranch.category as DiscoverCategory | undefined) ?? "Fitness"
  );

  const title =
    override.title ??
    toMarkerTitle(marker);

  const image =
    override.image ??
    context.resolveBranchPlaceholderImage(category);

  const gallery =
    override.images && override.images.length > 0
      ? override.images
      : [image, ...context.resolveBranchGalleryImages(category)];

  const normalizedRating = Number.isFinite(marker.rating)
    ? Math.min(5, Math.max(0, marker.rating))
    : context.defaultBranch.rating;
  const mockSearchMetadata = getMockBranchSearchMetadata(marker.id, category, title);

  const searchAliases = toSearchStringArray([
    ...(override.searchAliases ?? []),
    ...(mockSearchMetadata.searchAliases ?? []),
    marker.id,
    markerId,
    title,
  ]);

  return {
    ...context.defaultBranch,
    ...override,
    id: marker.id,
    title,
    image,
    images: gallery,
    coordinates: [marker.coord.lng, marker.coord.lat],
    category,
    rating: override.rating ?? normalizedRating,
    distance: override.distance ?? getDerivedDistance(markerId),
    hours: override.hours ?? context.defaultBranch.hours,
    searchTags:
      toSearchStringArray(override.searchTags) ??
      toSearchStringArray(mockSearchMetadata.searchTags) ??
      toSearchStringArray(context.defaultBranch.searchTags),
    searchMenuItems:
      toSearchStringArray(override.searchMenuItems) ??
      toSearchStringArray(mockSearchMetadata.searchMenuItems) ??
      toSearchStringArray(context.defaultBranch.searchMenuItems),
    searchAliases,
  };
};

// Doplni len ne-duplicitne branch items odvodene z markerov.
export const appendDerivedBranchesFromMarkers = (
  branches: BranchViewModel[],
  markers: MarkerViewModel[],
  buildBranchFromMarker: (marker: MarkerViewModel) => BranchViewModel
): BranchViewModel[] => {
  const existing = new Set(
    branches.map((branch) => normalizeId(branch.id ?? branch.title))
  );

  const extras: BranchViewModel[] = [];
  markers.forEach((marker) => {
    if (marker.category === "Multi") {
      return;
    }

    const markerKey = normalizeId(marker.id);
    if (existing.has(markerKey)) {
      return;
    }

    const branch = buildBranchFromMarker(marker);
    const branchKey = normalizeId(branch.id ?? branch.title);
    if (existing.has(branchKey)) {
      return;
    }

    existing.add(branchKey);
    extras.push(branch);
  });

  return [...branches, ...extras];
};
