// branchMapper: prevod BranchDto na BranchViewModel.
// Zodpovednost: fallback logika pre rating, texty, obrazky a offers.
// Vstup/Vystup: mapBranchDtoToViewModel pripraveny pre UI komponenty.

import type { ImageSourcePropType } from "react-native";
import type { BranchDto, BranchViewModel } from "../models";
import type { DiscoverCategory } from "../../interfaces";
import { formatTitleFromId, getRatingForId } from "../normalizers";
import { canonicalOrFallbackId, normalizeId } from "../utils/id";
import { getMockBranchSearchMetadata } from "../search/mockBranchSearchMetadata";
import {
  mergeBranchImages,
  toBranchOverride,
  toNonEmptyString,
  toUriImage,
  type MapperContext,
} from "./context";

// Mapper pre prevod BranchDto na BranchViewModel.
const clampRating = (value: number) => Math.min(5, Math.max(0, value));

const parseRating = (value?: number | null) => {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return clampRating(value as number);
};

const formatDistanceKm = (distanceKm?: number | null) => {
  if (!Number.isFinite(distanceKm)) {
    return undefined;
  }
  return `${(distanceKm as number).toFixed(1)} km`;
};

const resolveBranchPrimaryImage = (
  dto: BranchDto,
  category: DiscoverCategory,
  context: MapperContext,
  overrideImage?: ImageSourcePropType
): ImageSourcePropType => {
  if (overrideImage) {
    return overrideImage;
  }

  const uriImage = toUriImage(dto.imageUrl);
  if (uriImage) {
    return uriImage;
  }

  return context.resolveBranchPlaceholderImage(category);
};

const resolveBranchGallery = (
  dto: BranchDto,
  category: DiscoverCategory,
  context: MapperContext,
  primaryImage: ImageSourcePropType,
  overrideImages?: ImageSourcePropType[]
): ImageSourcePropType[] => {
  if (overrideImages && overrideImages.length > 0) {
    return overrideImages;
  }

  const remoteGallery = (dto.imageUrls ?? [])
    .map((item) => toUriImage(item))
    .filter((item): item is ImageSourcePropType => Boolean(item));

  if (remoteGallery.length > 0) {
    return mergeBranchImages(primaryImage, remoteGallery);
  }

  return mergeBranchImages(
    primaryImage,
    context.resolveBranchGalleryImages(category)
  );
};

const resolveOffers = (
  context: MapperContext,
  offersKeys?: string[] | null,
  overrideOffers?: string[]
) => {
  if (overrideOffers && overrideOffers.length > 0) {
    return overrideOffers;
  }

  if (!offersKeys || offersKeys.length === 0) {
    return undefined;
  }

  return offersKeys
    .map((offerKey) => context.translateKey(offerKey))
    .filter((offer): offer is string => Boolean(offer));
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

export const mapBranchDtoToViewModel = (
  dto: BranchDto,
  context: MapperContext
): BranchViewModel => {
  const resolvedId = toNonEmptyString(dto.id) ?? canonicalOrFallbackId(dto.title, "branch");
  const canonicalId = normalizeId(resolvedId);
  const override = toBranchOverride(context.resolveOverride(resolvedId));
  const fallbackCategory = context.resolveCategory(context.defaultBranch.category ?? "Fitness");

  const category = context.resolveCategory(
    override.category ?? dto.category ?? context.defaultBranch.category,
    fallbackCategory
  );

  const title =
    override.title ??
    toNonEmptyString(dto.title) ??
    formatTitleFromId(resolvedId);

  const rating =
    parseRating(override.rating as number | undefined) ??
    parseRating(dto.rating) ??
    getRatingForId(canonicalId || resolvedId);

  const distance =
    override.distance ??
    toNonEmptyString(dto.distance) ??
    formatDistanceKm(dto.distanceKm) ??
    context.defaultBranch.distance;

  const hours =
    override.hours ??
    toNonEmptyString(dto.hours) ??
    context.defaultBranch.hours;

  const primaryImage = resolveBranchPrimaryImage(dto, category, context, override.image);
  const images = resolveBranchGallery(dto, category, context, primaryImage, override.images);

  const discount =
    override.discount ??
    context.translateKey(dto.discountKey) ??
    context.defaultBranch.discount;

  const offers = resolveOffers(context, dto.offersKeys, override.offers) ?? context.defaultBranch.offers;

  const coordinates =
    override.coordinates ??
    (Array.isArray(dto.coordinates) &&
    Number.isFinite(dto.coordinates[0]) &&
    Number.isFinite(dto.coordinates[1])
      ? [dto.coordinates[0], dto.coordinates[1]]
      : undefined);
  const mockSearchMetadata = getMockBranchSearchMetadata(resolvedId, category, title);

  const searchTags =
    toSearchStringArray(override.searchTags) ??
    toSearchStringArray(dto.searchTags) ??
    toSearchStringArray(mockSearchMetadata.searchTags) ??
    toSearchStringArray(context.defaultBranch.searchTags);

  const searchMenuItems =
    toSearchStringArray(override.searchMenuItems) ??
    toSearchStringArray(dto.searchMenuItems) ??
    toSearchStringArray(mockSearchMetadata.searchMenuItems) ??
    toSearchStringArray(context.defaultBranch.searchMenuItems);

  const searchAliases =
    toSearchStringArray(override.searchAliases) ??
    toSearchStringArray(dto.searchAliases) ??
    toSearchStringArray(mockSearchMetadata.searchAliases) ??
    toSearchStringArray(context.defaultBranch.searchAliases);

  return {
    ...context.defaultBranch,
    ...override,
    id: resolvedId,
    title,
    image: primaryImage,
    images,
    coordinates,
    category,
    rating,
    distance,
    hours,
    discount,
    offers,
    moreCount: override.moreCount ?? dto.moreCount ?? context.defaultBranch.moreCount,
    badgeVariant: override.badgeVariant ?? dto.badgeVariant ?? context.defaultBranch.badgeVariant,
    address: override.address ?? dto.address ?? context.defaultBranch.address,
    phone: override.phone ?? dto.phone ?? context.defaultBranch.phone,
    email: override.email ?? dto.email ?? context.defaultBranch.email,
    website: override.website ?? dto.website ?? context.defaultBranch.website,
    searchTags,
    searchMenuItems,
    searchAliases,
  };
};
